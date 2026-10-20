import * as THREE from "three";
import Page from "../page";

export type BookDimensions = {
	pageWidth: number;
	pageHeight: number;
	pageThickness: number;
	pageRootThickness: number;
	coverThickness: number;
	coverMarginX: number;
	coverMarginY: number;
	pageEdgeColor: number;
};

export function createRenderer(pixelRatio: number, viewport: { width: number; height: number }) {
	const renderer = new THREE.WebGLRenderer();
	// const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	// renderer.toneMapping = THREE.ACESFilmicToneMapping;
	// renderer.toneMappingExposure = 1.2;
	// Phones report DPR 3+; rendering the scene (and its soft shadows) at that density is too heavy
	renderer.setPixelRatio(pixelRatio);
	renderer.setSize(viewport.width, viewport.height);
	return renderer;
}

export function enableRendererShadows(renderer: THREE.WebGLRenderer) {
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.domElement.classList.add("flipbook-canvas");
}

export function createWrapperLink(containerEl: HTMLElement, canvas: HTMLCanvasElement) {
	const wrapperLinkEl = document.createElement("a");
	wrapperLinkEl.draggable = false;
	wrapperLinkEl.classList.add("wrapper-link");
	wrapperLinkEl.setAttribute("target", "_blank");
	wrapperLinkEl.setAttribute("rel", "noopener noreferrer");
	containerEl.appendChild(wrapperLinkEl);
	wrapperLinkEl.appendChild(canvas);
	return wrapperLinkEl;
}

export function createPages(
	dims: BookDimensions,
	textureUrls: FlipBookParams["textureUrls"],
	textureLoader: THREE.TextureLoader,
): Page[] {
	const pages: Page[] = [];
	const totalPages = Math.ceil(textureUrls.pages.length / 2);
	for (let i = 0; i < totalPages; i++) {
		const isCover = i === 0 || i === totalPages - 1;
		const width = isCover
			? dims.pageWidth + dims.coverMarginX + dims.coverThickness
			: dims.pageWidth;
		const height = isCover
			? dims.pageHeight + dims.coverMarginY * 2
			: dims.pageHeight;

		const edgeTextures: Record<string, string> = {};
		if (isCover) {
			if (textureUrls.coverEdgeLR) edgeTextures.edgeLR = textureUrls.coverEdgeLR;
			if (textureUrls.coverEdgeTB) edgeTextures.edgeTB = textureUrls.coverEdgeTB;
		}

		const page = new Page({
			textureUrls: {
				front: textureUrls.pages[i * 2],
				back: textureUrls.pages[i * 2 + 1],
				...edgeTextures,
			},
			width,
			height,
			thickness: isCover ? dims.coverThickness : dims.pageThickness,
			rootThickness: isCover
				? dims.coverThickness
				: dims.pageRootThickness,
			isCover,
			isFrontCover: i === 0,
			edgeColor: dims.pageEdgeColor,
			textureLoader,
		});
		pages.push(page);
	}
	return pages;
}

export function createLights(scene: THREE.Scene) {
	const ambientLight = new THREE.AmbientLight();
	scene.add(ambientLight);

	const spotLight = new THREE.SpotLight();
	spotLight.castShadow = true;
	spotLight.shadow.bias = -0.0001;
	scene.add(spotLight);

	return { ambientLight, spotLight };
}

export function createSpineMesh(
	dims: BookDimensions,
	spineWidth: number,
	spineZ: number,
	textureUrls: FlipBookParams["textureUrls"],
	textureLoader: THREE.TextureLoader,
) {
	const _texture = (url?: string) => {
		if (!url) {
			return { color: new THREE.Color(0xF7D6DE) };
		}
		const texture = textureLoader.load(url);
		texture.colorSpace = THREE.SRGBColorSpace;
		return { map: texture };
	};

	const textures = {
		spineInner: _texture(textureUrls.spineInner),
		spineOuter: _texture(textureUrls.spineOuter),
		spineEdgeLR: _texture(textureUrls.spineEdgeLR),
		spineEdgeTB: _texture(textureUrls.spineEdgeTB),
	};
	const spineMaterials = [
		new THREE.MeshStandardMaterial(textures.spineEdgeLR), // right face
		new THREE.MeshStandardMaterial(textures.spineEdgeLR), // left face
		new THREE.MeshStandardMaterial(textures.spineEdgeTB), // top face
		new THREE.MeshStandardMaterial(textures.spineEdgeTB), // bottom face
		new THREE.MeshStandardMaterial(textures.spineInner), // front face
		new THREE.MeshStandardMaterial(textures.spineOuter), // back face
	];
	const spineGeometry = new THREE.BoxGeometry(
		spineWidth,
		dims.pageHeight + dims.coverMarginY * 2,
		dims.coverThickness,
	);
	const spineMesh = new THREE.Mesh(spineGeometry, spineMaterials);
	spineMesh.receiveShadow = true;
	spineMesh.castShadow = true;
	spineMesh.position.z = spineZ;
	spineMesh.renderOrder = 99;
	return spineMesh;
}

/** Adds every page pivot to the group and lays the inner pages out along the spine. */
export function placePages(
	pages: Page[],
	group: THREE.Group,
	dims: BookDimensions,
	spineWidth: number,
	spineZ: number,
) {
	const spinePlacementStart = -spineWidth / 2;
	let spinePlacementShift = 0;
	pages.forEach((page, index) => {
		group.add(page.pivot);

		if (page.isCover) {
			page.pivot.position.z = dims.coverThickness;
			page.pivot.position.x =
				(spineWidth / 2) * (index ? 1 : -1);
		} else {
			const elevationLeft =
				spinePlacementShift + page.rootThickness / 2;
			const elevationRight = spineWidth - elevationLeft;
			const elevationMultiplier = 0.7;
			page.setElevation(
				elevationLeft * elevationMultiplier,
				elevationRight * elevationMultiplier,
			);

			page.pivot.position.z = spineZ + dims.coverThickness / 2;
			page.pivot.position.x =
				spinePlacementStart +
				spinePlacementShift +
				page.rootThickness / 2;
			spinePlacementShift += page.rootThickness;
		}
	});
}

export function createDeskMesh(deskUrl: string | undefined, textureLoader: THREE.TextureLoader) {
	const deskGeometry = new THREE.PlaneGeometry(5216, 1956, 1, 1);
	const deskMaterial = deskUrl
		? new THREE.MeshStandardMaterial({
				map: (() => {
					const t = textureLoader.load(deskUrl);
					t.colorSpace = THREE.SRGBColorSpace;
					return t;
				})(),
		  })
		: new THREE.MeshStandardMaterial({ color: 0x1F1218, roughness: 0.92 });
	const deskMesh = new THREE.Mesh(deskGeometry, deskMaterial);
	deskMesh.receiveShadow = true;
	deskMesh.castShadow = true;
	deskMesh.renderOrder = 100;
	return deskMesh;
}

/** Disposes every geometry, material and material texture reachable from the scene. */
export function disposeSceneResources(scene: THREE.Scene) {
	const geometries = new Set<THREE.BufferGeometry>();
	const materials = new Set<THREE.Material>();
	const textures = new Set<THREE.Texture>();
	scene.traverse(object => {
		const mesh = object as THREE.Mesh;
		if (mesh.geometry) geometries.add(mesh.geometry);
		if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
			materials.add(material);
			for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
		}
	});
	textures.forEach(texture => texture.dispose());
	materials.forEach(material => material.dispose());
	geometries.forEach(geometry => geometry.dispose());
}

export function resolveDimensions(params: FlipBookParams): BookDimensions {
	return {
		pageWidth: params.pageWidth,
		pageHeight: params.pageHeight,
		pageThickness: params.pageThickness || 2,
		pageRootThickness: params.pageRootThickness || 4,
		coverThickness: params.coverThickness || 5,
		coverMarginX: params.coverMarginX || 8,
		coverMarginY: params.coverMarginY || 8,
		pageEdgeColor: params.pageEdgeColor,
	};
}
