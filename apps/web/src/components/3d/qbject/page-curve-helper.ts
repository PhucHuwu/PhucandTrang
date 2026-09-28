import * as THREE from "three";
import Page from "./page";

export default class PageCurveHelper {
	private line: THREE.Line;
	private controlPoints: THREE.Mesh[];
	private geometry: THREE.BufferGeometry;
	private material: THREE.LineBasicMaterial;
	private sphereGeometry: THREE.SphereGeometry;
	private sphereMaterial: THREE.MeshBasicMaterial;

	constructor(private page: Page) {
		this.geometry = new THREE.BufferGeometry();
		this.material = new THREE.LineBasicMaterial({ color: 0xff0000 });
		this.line = new THREE.Line(this.geometry, this.material);
		this.page.mesh.add(this.line);

		this.controlPoints = [];
		this.sphereGeometry = new THREE.SphereGeometry(15, 16, 16);
		this.sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
	}

	public update() {
		const curve = this.page.getCurve();

		// Create points from the curve
		const points2D = curve.getPoints(50); // Get 50 points along the curve

		// Map 2D points to 3D points (x, y -> x, 0, y)
		const points3D = points2D.map(pt => new THREE.Vector3(pt.x, 0, pt.y));

		// Update geometry with new points
		this.geometry.setFromPoints(points3D);

		// Update control points
		this.updateControlPoints(curve);
	}

	private updateControlPoints(
		curve: THREE.CubicBezierCurve | THREE.QuadraticBezierCurve,
	) {
		// Determine the control points
		const controlPoints =
			curve instanceof THREE.CubicBezierCurve
				? [curve.v0, curve.v1, curve.v2, curve.v3]
				: [curve.v0, curve.v1, curve.v2];

		// If more control points are needed, create and add them
		while (this.controlPoints.length < controlPoints.length) {
			const sphere = new THREE.Mesh(
				this.sphereGeometry,
				this.sphereMaterial,
			);
			this.page.mesh.add(sphere);
			this.controlPoints.push(sphere);
		}

		// Update positions of existing control points
		controlPoints.forEach((point, index) => {
			const position = new THREE.Vector3(point.x, 0, point.y);
			this.controlPoints[index].position.copy(position);
		});

		// Remove extra control points if any
		while (this.controlPoints.length > controlPoints.length) {
			const extraPoint = this.controlPoints.pop();
			if (extraPoint) {
				this.page.mesh.remove(extraPoint);
			}
		}
	}

	public destroy() {
		// Remove line from the page mesh
		this.page.mesh.remove(this.line);

		// Dispose geometry and material for the line
		this.geometry.dispose();
		this.material.dispose();

		// Remove and dispose control points
		this.controlPoints.forEach(controlPoint => {
			this.page.mesh.remove(controlPoint);
			controlPoint.geometry.dispose();
			(controlPoint.material as THREE.Material).dispose();
		});

		// Dispose geometries and materials specific to control points
		this.sphereGeometry.dispose();
		this.sphereMaterial.dispose();

		// Clear control points array
		this.controlPoints.length = 0;
	}
}
