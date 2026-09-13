import * as THREE from "three";
import {
	approach,
	cosineInterpolate,
	vectorToRadians,
	lerp,
	clamp,
} from "./util";

export default class Page {
	public textureUrls;
	public width: number;
	public height: number;
	public thickness: number;
	public rootThickness: number;
	public elevationLeft = 0;
	public elevationRight = 0;
	public isCover = false;
	public edgeColor = 0xffffff;

	public mesh: THREE.Mesh;
	public pivot: THREE.Group;

	public turnProgress: number = 0;
	public turnProgressLag: number = 0;
	private xSegments = 1;
	private ySegments = 1;
	private zSegments = 20;
	private vertexRelCoords: THREE.Vector3[] = [];
	public bendingEnabled: boolean = true;
	private textureLoader: THREE.TextureLoader;
	private isFrontCover: boolean;
	private hasTurnProgressUpdated = false;

	constructor(pageParams: PageParams) {
		this.textureUrls = pageParams.textureUrls;
		this.width = pageParams.width;
		this.height = pageParams.height;
		this.thickness = pageParams.thickness || 2;
		this.rootThickness = pageParams.rootThickness || 4;
		this.isCover = !!pageParams.isCover;
		this.edgeColor = pageParams.edgeColor || 0xffffff;
		this.textureLoader = pageParams.textureLoader;
		this.isFrontCover = pageParams.isFrontCover;

		if (this.isCover) {
			this.zSegments = 1;
		}

		// Load front and back textures
		const _texture = (url: string) => {
			const texture = this.textureLoader.load(url);
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.minFilter = THREE.LinearFilter;
			texture.generateMipmaps = false;
			// texture.anisotropy = 16;
			return { map: texture, vertexColors: !this.isCover };
		};
		const _color = (hex: number) => ({
			color: new THREE.Color(hex),
		});

		const textures: Record<
			string,
			{ map?: THREE.Texture; color?: THREE.Color }
		> = {
			front: _texture(this.textureUrls.front),
			back: _texture(this.textureUrls.back),
			edgeTop: _color(this.edgeColor),
			edgeBottom: _color(this.edgeColor),
			edgeLeft: _color(this.edgeColor),
			edgeRight: _color(this.edgeColor),
		};

		if (this.textureUrls.edgeTB) {
			textures.edgeTop = _texture(this.textureUrls.edgeTB);
			textures.edgeBottom = _texture(this.textureUrls.edgeTB);
		}
		if (this.textureUrls.edgeLR) {
			textures.edgeLeft = _texture(this.textureUrls.edgeLR);
			textures.edgeRight = _texture(this.textureUrls.edgeLR);
		}

		const materials = [
			new THREE.MeshStandardMaterial(textures.back),
			new THREE.MeshStandardMaterial(textures.front),
			new THREE.MeshStandardMaterial(textures.edgeTop),
			new THREE.MeshStandardMaterial(textures.edgeBottom),
			new THREE.MeshStandardMaterial(textures.edgeRight),
			new THREE.MeshStandardMaterial(textures.edgeLeft),
		];

		const geometry = new THREE.BoxGeometry(
			this.thickness,
			this.height,
			this.width,
			this.xSegments,
			this.ySegments,
			this.zSegments,
		);

		this.mesh = new THREE.Mesh(geometry, materials);
		this.mesh.receiveShadow = true;
		this.mesh.castShadow = true;
		// this.mesh = new THREE.Mesh(
		// 	geometry,
		// 	new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
		// );

		this.pivot = new THREE.Group();
		this.pivot.add(this.mesh);

		const position = geometry.attributes.position;
		const uv = geometry.attributes.uv;

		const colors = new Float32Array(position.count * 3);

		for (let i = 0; i < position.count; i++) {
			const coord = new THREE.Vector3(
				position.getX(i) / this.thickness + 0.5,
				position.getY(i) / this.height + 0.5,
				position.getZ(i) / this.width + 0.5,
			);

			if (!this.isCover) {
				// increase vertex density closer to the spine for better bending
				coord.z = cosineInterpolate(0, 2, coord.z / 2);
				uv.setXY(i, coord.x > 0.5 ? 1 - coord.z : coord.z, coord.y);
			}

			this.vertexRelCoords[i] = coord;

			// apply artificial ambient occlusion using vertex colors
			const darken = clamp((1 - coord.z) ** 4 - 0.6, 0, 1);
			colors[i * 3] = 1 - darken; // Red channel
			colors[i * 3 + 1] = 1 - darken; // Green channel
			colors[i * 3 + 2] = 1 - darken; // Blue channel
		}

		// Add the colors attribute to the geometry
		geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

		uv.needsUpdate = true;
	}

	public getCurve() {
		if (this.isCover) {
			const backShift = this.rootThickness;
			const leftShift =
				(this.rootThickness / 2) * (this.isFrontCover ? 1 : -1);
			const angle = (-this.turnProgress + 1) * (Math.PI / 2);

			const direction = new THREE.Vector2(
				Math.cos(angle),
				Math.sin(angle),
			);

			const perpendicular = new THREE.Vector2(-direction.y, direction.x);

			const p0 = new THREE.Vector2()
				.addScaledVector(direction, -backShift)
				.addScaledVector(perpendicular, leftShift);

			const p2 = new THREE.Vector2()
				.addScaledVector(direction, this.width - backShift)
				.addScaledVector(perpendicular, leftShift);

			const p1 = new THREE.Vector2()
				.addVectors(p0, p2)
				.multiplyScalar(0.5);

			return new THREE.QuadraticBezierCurve(p0, p1, p2);
		} else {
			const piProgress = Math.abs(this.turnProgress) * (Math.PI / 2);
			const eFactorSin = Math.sin(piProgress);
			const eFactorCos = -Math.cos(piProgress) + 1;

			const isRight = this.turnProgress > 0;
			const maxHeight = isRight
				? this.elevationRight
				: this.elevationLeft;

			// elevation of the second control point
			const p2baseElevation = 30;
			const p2elev = eFactorSin * (maxHeight + p2baseElevation) * 2;
			// elevation of the 3rd and the 4th control points
			const p34elev = eFactorCos * maxHeight;

			// calculates positions for the 3rd and the 4th control points
			const calcP34 = (tp: number, dist: number) =>
				new THREE.Vector2(
					Math.sin(tp * (Math.PI / 2)) * dist,
					Math.cos(tp * (Math.PI / 2)) * dist + p34elev,
				);

			const p0 = new THREE.Vector2();
			const p1 = new THREE.Vector2(0, p2elev);
			const p2 = calcP34(this.turnProgress, this.width * 0.5);
			const p3 = calcP34(this.turnProgressLag, this.width);

			return new THREE.CubicBezierCurve(p0, p1, p2, p3);
		}
	}

	public update(dt: number) {
		// straighten
		let straightenTarget = this.turnProgress;
		if (this.bendingEnabled) {
			// gravity bend
			straightenTarget = clamp(straightenTarget * 1.1, -1, 1);
		}
		this.turnProgressLag = approach(
			this.turnProgressLag,
			straightenTarget,
			this.bendingEnabled ? 5 : 25,
			dt,
		);

		const curve = this.getCurve();
		const curveStretch = Math.max(curve.getLength() / this.width, 1);

		const position = this.mesh.geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			const relCoord = this.vertexRelCoords[i];

			// const pos = curve.getPoint(relCoord.z * (1 / curveStretch));
			const pos = curve.getPointAt(relCoord.z * (1 / curveStretch));

			// TODO: get direction from previous point?
			// const direction =
			// 	vectorToRadians(curve.getTangent(relCoord.z)) + Math.PI / 2;
			const direction =
				vectorToRadians(curve.getTangentAt(relCoord.z)) + Math.PI / 2;

			const thickness = lerp(
				this.rootThickness,
				this.thickness,
				relCoord.z,
			);

			const sign = -Math.sign(relCoord.x - 0.5);
			const newX = pos.x + Math.cos(direction) * (thickness / 2) * sign;
			const newZ = pos.y + Math.sin(direction) * (thickness / 2) * sign;
			position.setX(i, newX);
			position.setZ(i, newZ);
		}

		position.needsUpdate = true;
		// TODO: calculate normals manually?
		this.mesh.geometry.computeVertexNormals();
		this.mesh.geometry.computeBoundingSphere();

		this.hasTurnProgressUpdated = true;
	}

	public needsUpdate() {
		if (!this.hasTurnProgressUpdated) return true;
		return (
			(this.turnProgress !== 1 &&
				this.turnProgress !== -1 &&
				this.turnProgress !== 0) ||
			this.turnProgress !== this.turnProgressLag
		);
	}

	public setTurnProgress(turnProgress: number) {
		if (turnProgress === this.turnProgress) return;

		if (!this.bendingEnabled) {
			const delta = turnProgress - this.turnProgress;
			this.turnProgressLag += delta;
		}

		this.turnProgress = turnProgress;
		this.hasTurnProgressUpdated = false;
	}

	public setElevation(elevationLeft: number, elevationRight: number) {
		if (this.isCover) return;
		this.elevationLeft = elevationLeft;
		this.elevationRight = elevationRight;
	}

	public getElevation() {
		const turnProgress = this.turnProgress + 1 / 2;
		return lerp(this.elevationLeft, this.elevationRight, turnProgress);
	}

	public getPageAreaCorners(area: PageArea, backside = false) {
		const top = area.top;
		const bottom = area.top + area.height;
		let left = area.left;
		let right = area.left + area.width;
		if (backside) [left, right] = [1 - left, 1 - right];

		const curve = this.getCurve();
		const curveStretch = Math.max(curve.getLength() / this.width, 1);
		const unstretch = 1 / curveStretch;

		const [lx, lz] = curve.getPointAt(left * unstretch);
		const [rx, rz] = curve.getPointAt(right * unstretch);

		const ty = (top - 0.5) * -this.height;
		const by = (bottom - 0.5) * -this.height;

		const cornerTL = new THREE.Vector3(lx, ty, lz);
		const cornerTR = new THREE.Vector3(rx, ty, rz);
		const cornerBL = new THREE.Vector3(lx, by, lz);
		const cornerBR = new THREE.Vector3(rx, by, rz);

		// Transform corners to global space
		this.pivot.localToWorld(cornerTL);
		this.pivot.localToWorld(cornerTR);
		this.pivot.localToWorld(cornerBL);
		this.pivot.localToWorld(cornerBR);

		return [cornerTL, cornerTR, cornerBL, cornerBR];
	}
}
