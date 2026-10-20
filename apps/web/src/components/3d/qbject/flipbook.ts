import * as THREE from "three";
import { scaleRectangle } from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Page from "./page";
import VideoOverlay from "./video-overlay";
import SlidingNumber from "./sliding-number";
import IntroOverlay from "./intro-overlay";
import { detectInitialTier, EFFECT_SHARE, FrameRateMonitor, QualityTier } from "./quality";
import {
	BookDimensions,
	createDeskMesh,
	createLights,
	createPages,
	createRenderer,
	createSpineMesh,
	createWrapperLink,
	enableRendererShadows,
	placePages,
	resolveDimensions,
} from "./flipbook/scene";
import { getTargetPixelRatio, getViewportSize, isVerticalLayout, resizeView, watchPixelRatio } from "./flipbook/viewport";
import { CameraPreset, computeBaseViewRect, computeCameraPos, tweenCamera } from "./flipbook/camera";
import { applyCameraSettings, applyLightingSettings, createDefaultSettings, SceneHelpers } from "./flipbook/settings";
import {
	applySwipeMove,
	bindTurnState,
	findActiveAreaAt,
	getBookOpenFactor,
	getFlipTarget,
	TurnState,
	updateBookRotation,
	updatePages,
} from "./flipbook/page-turning";
import { applyCursor, resolveCursor } from "./flipbook/input";
import { InputController } from "./flipbook/input-controller";
import { IntroHost, IntroPhase, playIntro } from "./flipbook/intro";
import { disposeGraphics, disposeHelpers, killFlipbookTweens } from "./flipbook/disposal";
import { applyNextFaceTexture, FaceTextureQueue, isFaceOnVisiblePage, prepareOpeningTextures } from "./flipbook/face-textures";
import { AnimationLoop } from "./flipbook/animation-loop";

export default class Flipbook {
	private containerEl: HTMLElement;
	private wrapperLinkEl: HTMLElement;
	private dims: BookDimensions;
	private textureUrls;
	private pageActiveAreas: PageActiveArea[] = [];
	public readonly settings: FlipbookSettings = createDefaultSettings();

	private pages: Page[] = [];
	private helpers: SceneHelpers = { spotLightHelper: null, spotShadowHelper: null, pageHelpers: [] };
	private group: THREE.Group;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private spineMesh: THREE.Mesh;
	private spotLight: THREE.SpotLight;
	private ambientLight: THREE.AmbientLight;
	private raycaster: THREE.Raycaster;
	private sceneMousePos: THREE.Vector2;

	private progress = new SlidingNumber(0, 0.1, 4);
	private spineWidth: number;
	private spineZ: number;

	private controls?: OrbitControls;

	private textureLoader: THREE.TextureLoader;
	private initCompleted: boolean = false;
	private videoOverlay: VideoOverlay;
	private introOverlay?: IntroOverlay;

	private focusedActiveArea: PageActiveArea | null = null;
	private isChangingFocus = false;
	// @remark, css values should be changed individually
	private CAMERA_SIDE_GRAVITY = 4;
	private cameraSideShift = new SlidingNumber(1, 0.2);
	private isVerticalMode = false;
	private input: InputController;
	private atmosphericSystem?: any;
	public get atmospheric() { return this.atmosphericSystem; }
	public set atmospheric(system: any) {
		this.atmosphericSystem = system;
		system?.setQuality?.(EFFECT_SHARE[this.quality.tier]);
	}
	// Weak / average / strong machines: picked from hardware hints, then adjusted from the measured frame rate
	private quality = new FrameRateMonitor(detectInitialTier(), tier => this.applyQuality(tier));
	public loadingProgress = 0;

	// if this code is running, means the scripts are already loaded
	private scriptProgressWeight = 0.4;

	private introPhase: IntroPhase = "LOADING";

	constructor(params: FlipBookParams) {
		this.containerEl = params.containerEl;
		this.dims = resolveDimensions(params);
		this.textureUrls = params.textureUrls;
		this.pageActiveAreas = params.pageActiveAreas || [];

		// Video elements are created lazily by VideoOverlay.open() so nothing downloads up front
		this.videoOverlay = new VideoOverlay(this.containerEl, () => {
			this.unfocusActiveArea();
		});

		const introEl = this.containerEl.querySelector(".intro-overlay");
		if (introEl) {
			this.introOverlay = new IntroOverlay(introEl as HTMLDivElement);
			this.introOverlay.onProgress(this.scriptProgressWeight);
		}

		this.loadingManager.onProgress = (
			_,
			itemsLoaded,
			itemsTotal,
		) => {
			if (this.disposed || this.introPhase !== "LOADING") return;

			const assetsProgress = itemsLoaded / itemsTotal;
			const overallProgress =
				this.scriptProgressWeight +
				assetsProgress * (1 - this.scriptProgressWeight);
			this.loadingProgress = overallProgress;
			this.introOverlay?.onProgress(overallProgress);
			if (overallProgress === 1) {
				this.loadingProgress = 1;
				this.playIntro();
			}
		};

		this.scene = new THREE.Scene();
		const viewport = this.getViewportSize();
		this.camera = new THREE.PerspectiveCamera(
			this.settings.cameraFov,
			viewport.width / viewport.height,
			1200,
			9000,
		);

		this.renderer = createRenderer(getTargetPixelRatio(this.quality.tier), viewport);
		this.lastViewport = { ...viewport, pixelRatio: this.renderer.getPixelRatio() };
		enableRendererShadows(this.renderer);
		this.wrapperLinkEl = createWrapperLink(this.containerEl, this.renderer.domElement);

		this.textureLoader = new THREE.TextureLoader(this.loadingManager);

		this.raycaster = new THREE.Raycaster();
		this.sceneMousePos = new THREE.Vector2();

		const dims = this.dims;

		// add pages
		this.pages.push(...createPages(dims, this.textureUrls, this.textureLoader));

		({ ambientLight: this.ambientLight, spotLight: this.spotLight } = createLights(this.scene));

		this.group = new THREE.Group();
		this.scene.add(this.group);

		// init spine
		this.spineWidth = (this.pages.length - 2) * this.dims.pageRootThickness;
		this.spineZ = this.dims.coverThickness / 2;

		// init spine mesh
		this.spineMesh = createSpineMesh(dims, this.spineWidth, this.spineZ, this.textureUrls, this.textureLoader);
		this.group.add(this.spineMesh);

		// init pages
		placePages(this.pages, this.group, dims, this.spineWidth, this.spineZ);

		const deskMesh = createDeskMesh(this.textureUrls.desk, this.textureLoader);
		this.scene.add(deskMesh);
		this.deskMesh = deskMesh;

		this.updateVerticalMode();
		this.applySettings(params.settings || {}, true);

		// event listeners
		if (typeof ResizeObserver !== "undefined") {
			this.resizeObserver = new ResizeObserver(this.resizeHandler);
			this.resizeObserver.observe(this.containerEl);
		} else {
			window.addEventListener("resize", this.resizeHandler, false);
		}
		this.watchPixelRatio();

		// process interactive areas
		this.input = new InputController({
			containerEl: this.containerEl,
			wrapperLinkEl: this.wrapperLinkEl,
			canvas: this.renderer.domElement,
			sceneMousePos: this.sceneMousePos,
			progress: this.progress,
			cameraSideShift: this.cameraSideShift,
			isDisposed: () => this.disposed,
			isIntroCompleted: () => this.introPhase === "COMPLETED",
			hasFocusedArea: () => Boolean(this.focusedActiveArea),
			isChangingFocus: () => this.isChangingFocus,
			isTurning: () => this.isTurning(),
			updateCursor: () => this.updateCursor(),
			onBookClick: pos => { this.onBookClick(pos); },
			onSwipeMove: swipe => applySwipeMove(this.turnState, swipe),
			unfocusActiveArea: () => { this.unfocusActiveArea(); },
			flipNext: () => { this.flipNext(); },
			flipPrev: () => { this.flipPrev(); },
		});

		bindTurnState(this.turnState);
	}

	private get turnState(): TurnState {
		return {
			progress: this.progress,
			cameraSideShift: this.cameraSideShift,
			pageCount: this.pages.length,
			isVerticalMode: () => this.isVerticalMode,
			isTurning: () => this.isTurning(),
			isShifting: () => this.isShifting(),
			getTurningPage: () => this.getTurningPage(),
		};
	}

	private updateCursor() {
		applyCursor(this.wrapperLinkEl, resolveCursor({
			isChangingFocus: this.isChangingFocus,
			focusedActiveArea: this.focusedActiveArea,
			isDragging: () =>
				(this.isTurning() || this.isShifting()) &&
				this.input.swipeHandler.isPointerDown(),
			getHoveredArea: () => this.getActiveAreaAt(this.sceneMousePos),
		}));
	}

	private getTurningPage(): number | null {
		if (!this.isTurning()) return null;
		return this.progress.minValue;
	}

	private isTurning() {
		return !this.progress.isSettled();
	}

	private isShifting() {
		return !this.cameraSideShift.isSettled() && !this.isTurning();
	}

	private runAnimation() {
		this.loop.start();
	}

	private disposed = false;
	private deskMesh: THREE.Mesh;
	private resizeObserver?: ResizeObserver;
	private pixelRatioQuery?: MediaQueryList;
	private lastViewport = { width: 0, height: 0, pixelRatio: 0 };
	// Plain objects animated by the intro; killed on destroy together with camera/light/settings tweens
	private tweenTargets = new Set<object>();
	private resizeHandler = () => this.onWindowResize();
	private pixelRatioHandler = () => {
		if (this.disposed) return;
		this.watchPixelRatio();
		this.onWindowResize();
	};
	private loop = new AnimationLoop({
		isDisposed: () => this.disposed,
		onHiddenFrame: () => this.quality.reset(),
		onFrame: dt => {
			this.update(dt);
			this.controls?.update?.();
		},
	});
	private loadingManager = new THREE.LoadingManager();
	public get isReady() { return this.introPhase === "COMPLETED" && this.initCompleted; }
	public destroy() {
		if (this.disposed) return;
		this.disposed = true;
		this.pendingFaceTextures.disposeAll();
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		window.removeEventListener("resize", this.resizeHandler);
		this.pixelRatioQuery?.removeEventListener("change", this.pixelRatioHandler);
		this.pixelRatioQuery = undefined;
		this.input?.detach();
		this.loop.stop();
		this.progress.destroy();
		this.cameraSideShift.destroy();
		this.videoOverlay.destroy();
		killFlipbookTweens({
			camera: this.camera,
			settings: this.settings,
			spotLight: this.spotLight,
			ambientLight: this.ambientLight,
			tweenTargets: this.tweenTargets,
		});
		this.atmosphericSystem?.destroy?.();
		this.atmosphericSystem = undefined;
		disposeHelpers(this.helpers);
		disposeGraphics(this.scene, this.spotLight, this.renderer);
		this.wrapperLinkEl.remove();
	}

	public setDeskColor(color: THREE.ColorRepresentation) {
		if (this.disposed) return;
		const material = this.deskMesh.material as THREE.MeshStandardMaterial;
		material.color = new THREE.Color(color);
	}

	private getViewportSize() {
		return getViewportSize(this.containerEl);
	}

	private watchPixelRatio() {
		this.pixelRatioQuery = watchPixelRatio(this.pixelRatioQuery, this.pixelRatioHandler);
	}

	/** Whether the face is on one of the pages that can currently be seen (top pages and the one turning). */
	public isFaceVisible(faceIndex: number): boolean {
		return isFaceOnVisiblePage(faceIndex, this.progress.getValue());
	}

	/** Drops a face back to a lightweight placeholder so its generated texture can be freed. */
	public releaseFaceTexture(faceIndex: number, placeholderUrl: string) {
		if (this.disposed) return;
		this.pendingFaceTextures.delete(faceIndex);
		const page = this.pages[Math.floor(faceIndex / 2)];
		if (!page) return;
		page.setSideTexture(faceIndex % 2 === 0 ? "front" : "back", placeholderUrl);
	}

	private update(dt: number) {
		if (!dt) return;
		this.initCompleted = true;

		if (
			!this.isChangingFocus &&
			!this.focusedActiveArea &&
			this.introPhase === "COMPLETED"
		) {
			const target = this.getCameraPos(this.getBaseViewRect());
			this.camera.position.copy(target.position);
			this.camera.quaternion.copy(target.rotation);
		}

		updatePages(this.pages, this.helpers.pageHelpers, this.progress, dt);

		// handle book rotation
		updateBookRotation(this.group, this.progress.getValue(), this.pages.length, this.spineWidth, this.dims.coverThickness);

		if (this.atmospheric) {
			this.atmospheric.update(performance.now() / 1000, this.sceneMousePos);
		}
		if (!this.focusedActiveArea || this.isChangingFocus) {
			this.render();
			// Only frames that actually render tell us how heavy the scene is
			if (this.introPhase === "COMPLETED") this.quality.sample(performance.now());
		} else {
			this.quality.reset();
		}
	}

	private applyQuality(tier: QualityTier) {
		if (this.disposed) return;
		const viewport = this.getViewportSize();
		this.renderer.setPixelRatio(getTargetPixelRatio(tier));
		this.renderer.setSize(viewport.width, viewport.height);
		this.lastViewport = { ...viewport, pixelRatio: this.renderer.getPixelRatio() };
		this.atmosphericSystem?.setQuality?.(EFFECT_SHARE[tier]);
		this.quality.reset();
	}

	private render() {
		this.flushFaceTexture();
		this.renderer.render(this.scene, this.camera);
	}

	private updateVerticalMode() {
		this.isVerticalMode = isVerticalLayout(this.dims.pageWidth, this.dims.pageHeight, this.getViewportSize());
		if (this.isVerticalMode) {
			this.cameraSideShift.gravity = this.CAMERA_SIDE_GRAVITY;
		} else {
			this.cameraSideShift.gravity = 0;
		}
	}

	private onWindowResize() {
		if (this.disposed) return;
		const viewport = this.getViewportSize();
		const pixelRatio = getTargetPixelRatio(this.quality.tier);
		const last = this.lastViewport;
		// ResizeObserver also reports the initial size on observe(); nothing to do then
		if (last.width === viewport.width && last.height === viewport.height && last.pixelRatio === pixelRatio) return;
		this.lastViewport = { ...viewport, pixelRatio };
		this.updateVerticalMode();
		resizeView(this.camera, this.renderer, viewport, pixelRatio);
		this.render();
	}

	public applySettings(
		newSettings: Partial<FlipbookSettings>,
		updateAll = false,
	) {
		Object.assign(this.settings, newSettings);
		if (updateAll) {
			newSettings = this.settings; // ensure all updates are triggered
		}

		applyCameraSettings(this.camera, this.settings, newSettings, () => { this.restoreCamera(); });

		applyLightingSettings(
			{
				scene: this.scene,
				spotLight: this.spotLight,
				ambientLight: this.ambientLight,
				pages: this.pages,
				helpers: this.helpers,
			},
			this.settings,
			newSettings,
		);
	}

	public getActiveAreaAt(scenePos: THREE.Vector2) {
		if (!this.initCompleted) return;
		if (this.isTurning()) return;
		if (this.isShifting()) return;

		return findActiveAreaAt(
			this.raycaster,
			this.camera,
			this.pages,
			this.progress.getValue(),
			this.pageActiveAreas,
			scenePos,
		);
	}

	private pendingFaceTextures = new FaceTextureQueue();

	public async prepareOpeningTextures(faceCount: number): Promise<void> {
		await prepareOpeningTextures(this.pages, this.renderer, faceCount, () => this.disposed);
	}

	public isTextureWorkSafe(): boolean {
		return !this.disposed && this.isReady && !this.isTurning() && !this.isShifting()
			&& !this.progress.locked && !this.isWatchingVideo();
	}

	public updateFaceTexture(faceIndex: number, url: string, directTexture?: THREE.Texture) {
		if (this.disposed) return;
		this.pendingFaceTextures.set(faceIndex, url, directTexture);
	}

	private flushFaceTexture() {
		if (!this.isTextureWorkSafe()) return;
		applyNextFaceTexture(this.pendingFaceTextures, this.pages, this.renderer);
	}

	public isWatchingVideo(): boolean {
		return Boolean(this.focusedActiveArea || this.isChangingFocus);
	}

	public flipNext() {
		return this.flipTo(1);
	}

	public flipPrev() {
		return this.flipTo(-1);
	}

	private flipTo(direction: 1 | -1) {
		if (this.isWatchingVideo() || this.isTurning()) return false;
		const target = getFlipTarget(this.progress.getValue(), this.pages.length, direction);
		if (target === null) return false;

		// Drive the turn naturally through progress sliding physics without hard locking
		this.progress.setMin(target);
		this.progress.setMax(target);
		return true;
	}

	public async watchArea(
		corners: THREE.Vector3[],
		preset: CameraPreset = "direct",
		duration = 0,
	) {
		const targetPos = this.getCameraPos(corners);
		await tweenCamera(this.camera, targetPos, preset, duration, () => this.disposed);
	}

	public getCameraPos(corners: THREE.Vector3[]) {
		return computeCameraPos(corners, this.camera);
	}

	public async restoreCamera(duration = 0) {
		await this.watchArea(this.getBaseViewRect(), "page-unzoom", duration);
	}

	public getBaseViewRect(
		overrideSettings: null | Partial<FlipbookSettings> = null,
	) {
		return computeBaseViewRect({
			pageWidth: this.dims.pageWidth,
			pageHeight: this.dims.pageHeight,
			isVerticalMode: this.isVerticalMode,
			// TODO: getBookOpenFactor
			bookOpenFactor: getBookOpenFactor(this.progress.getValue(), this.pages.length),
			cameraSideShift: this.cameraSideShift,
			settings: this.settings,
			overrideSettings,
		});
	}

	private async focusActiveArea(
		area: PageActiveArea,
		distanceMultiplier: number = 1,
	) {
		if (this.isChangingFocus) return;

		const page = this.pages[Math.floor(area.faceIndex / 2)];
		const isBackside = area.faceIndex % 2 === 1;
		const corners = page.getPageAreaCorners(area?.zoom || area, isBackside);

		this.focusedActiveArea = area;
		this.isChangingFocus = true;
		await this.watchArea(
			scaleRectangle(corners, distanceMultiplier),
			"page-zoom",
			1100,
		);
		if (this.disposed) return;
		this.isChangingFocus = false;

		this.updateCursor();
	}

	private async onBookClick(sceneMousePos: THREE.Vector2) {
		if (!this.isChangingFocus) {
			if (this.focusedActiveArea) {
				this.unfocusActiveArea();
			} else {
				// handle active area click
				const area = this.getActiveAreaAt(sceneMousePos);

				if (area?.video) {
					this.videoOverlay.open(area.video);
					this.focusActiveArea(area, 1.125);
				}

				if (area?.zoom) {
					this.focusActiveArea(area, 1.05);
				}
			}
		}

		this.updateCursor();
	}

	private async unfocusActiveArea() {
		if (this.isChangingFocus) return;

		this.focusedActiveArea = null;
		this.videoOverlay.close();

		this.isChangingFocus = true;
		await this.restoreCamera(1100);
		if (this.disposed) return;
		this.isChangingFocus = false;

		this.updateCursor();
	}

	private async playIntro() {
		await playIntro(this.introHost());
	}

	private introHost(): IntroHost {
		return {
			isDisposed: () => this.disposed,
			tweenTargets: this.tweenTargets,
			settings: this.settings,
			progress: this.progress,
			spotLight: this.spotLight,
			ambientLight: this.ambientLight,
			introOverlay: this.introOverlay,
			pages: this.pages,
			pageWidth: this.dims.pageWidth,
			pageHeight: this.dims.pageHeight,
			setIntroPhase: phase => { this.introPhase = phase; },
			getBaseViewRect: overrideSettings => this.getBaseViewRect(overrideSettings),
			watchArea: (corners, preset, duration) => this.watchArea(corners, preset, duration),
			restoreCamera: duration => this.restoreCamera(duration),
			applySettings: (newSettings, updateAll) => this.applySettings(newSettings, updateAll),
			update: dt => this.update(dt),
			runAnimation: () => this.runAnimation(),
			updateCursor: () => this.updateCursor(),
		};
	}
}
