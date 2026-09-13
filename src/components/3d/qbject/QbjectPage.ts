import * as THREE from 'three';
import {
  approach,
  cosineInterpolate,
  vectorToRadians,
  lerp,
  clamp,
} from './util';

export interface QbjectPageParams {
  frontTexture: THREE.Texture;
  backTexture: THREE.Texture;
  width: number;
  height: number;
  thickness?: number;
  rootThickness?: number;
  isCover?: boolean;
  isFrontCover?: boolean;
  edgeColor?: number;
}

export class QbjectPage {
  public width: number;
  public height: number;
  public thickness: number;
  public rootThickness: number;
  public isCover = false;
  public isFrontCover = false;
  public edgeColor = 0xF4EDE2;

  public mesh: THREE.Mesh;
  public pivot: THREE.Group;

  public turnProgress: number = 1; // 1 = closed on right, -1 = opened on left
  public turnProgressLag: number = 1;
  private xSegments = 1;
  private ySegments = 1;
  private zSegments = 24;
  private vertexRelCoords: THREE.Vector3[] = [];
  public bendingEnabled: boolean = true;

  public elevationLeft = 0.08;
  public elevationRight = 0.08;

  constructor(params: QbjectPageParams) {
    this.width = params.width;
    this.height = params.height;
    this.thickness = params.thickness || 0.008;
    this.rootThickness = params.rootThickness || 0.016;
    this.isCover = !!params.isCover;
    this.isFrontCover = !!params.isFrontCover;
    this.edgeColor = params.edgeColor || 0xF4EDE2;

    if (this.isCover) {
      this.zSegments = 1;
      this.thickness = 0.024;
      this.rootThickness = 0.024;
    }

    const edgeMat = new THREE.MeshStandardMaterial({
      color: this.isCover ? 0x2A1015 : 0xD8C5AA,
      roughness: 0.9,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: params.frontTexture,
      roughness: this.isCover ? 0.6 : 0.88,
      metalness: this.isCover ? 0.2 : 0.02,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: params.backTexture,
      roughness: this.isCover ? 0.6 : 0.88,
      metalness: this.isCover ? 0.2 : 0.02,
    });

    // BoxGeometry materials: [+x, -x, +y, -y, +z, -z]
    // In BoxGeometry, +z and -z are the largest front/back faces
    // params.frontTexture -> +z, params.backTexture -> -z
    const materials = [
      edgeMat, // +x (outer edge)
      edgeMat, // -x (inner spine edge)
      edgeMat, // +y (top edge)
      edgeMat, // -y (bottom edge)
      frontMat, // +z (front page / front cover facing viewer)
      backMat,  // -z (back page / inside cover)
    ];

    const geometry = new THREE.BoxGeometry(
      this.thickness,
      this.height,
      this.width,
      this.xSegments,
      this.ySegments,
      this.zSegments
    );

    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.pivot = new THREE.Group();
    this.pivot.add(this.mesh);

    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const colors = new Float32Array(position.count * 3);

    for (let i = 0; i < position.count; i++) {
      const coord = new THREE.Vector3(
        position.getX(i) / this.thickness + 0.5,
        position.getY(i) / this.height + 0.5,
        position.getZ(i) / this.width + 0.5
      );

      if (!this.isCover) {
        // Higher vertex density near spine for authentic bending curve
        coord.z = cosineInterpolate(0, 1, coord.z);
        uv.setXY(i, coord.x > 0.5 ? 1 - coord.z : coord.z, coord.y);
      }

      this.vertexRelCoords[i] = coord;

      // Artificial ambient occlusion darkening near spine groove
      const darken = clamp(Math.pow(1 - coord.z, 4) - 0.5, 0, 1);
      colors[i * 3] = 1 - darken * 0.4;
      colors[i * 3 + 1] = 1 - darken * 0.4;
      colors[i * 3 + 2] = 1 - darken * 0.4;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    uv.needsUpdate = true;
  }

  // Exact Bezier Curve deformation algorithm from the-book-of-qbject
  public getCurve(): THREE.CubicBezierCurve | THREE.QuadraticBezierCurve {
    if (this.isCover) {
      const backShift = this.rootThickness;
      const leftShift = (this.rootThickness / 2) * (this.isFrontCover ? 1 : -1);
      // turnProgress: 1 -> angle = 0 (resting flat on right)
      // turnProgress: -1 -> angle = PI (resting flat on left)
      const angle = (1 - this.turnProgress) * (Math.PI / 2);

      const direction = new THREE.Vector2(Math.sin(angle), Math.cos(angle));
      const perpendicular = new THREE.Vector2(-direction.y, direction.x);

      const p0 = new THREE.Vector2()
        .addScaledVector(direction, -backShift)
        .addScaledVector(perpendicular, leftShift);

      const p2 = new THREE.Vector2()
        .addScaledVector(direction, this.width - backShift)
        .addScaledVector(perpendicular, leftShift);

      const p1 = new THREE.Vector2().addVectors(p0, p2).multiplyScalar(0.5);

      return new THREE.QuadraticBezierCurve(p0, p1, p2);
    } else {
      const piProgress = Math.abs(this.turnProgress) * (Math.PI / 2);
      const eFactorSin = Math.sin(piProgress);
      const eFactorCos = -Math.cos(piProgress) + 1;

      const isRight = this.turnProgress > 0;
      const maxHeight = isRight ? this.elevationRight : this.elevationLeft;

      const p2baseElevation = 0.25;
      const p2elev = eFactorSin * (maxHeight + p2baseElevation) * 1.5;
      const p34elev = eFactorCos * maxHeight;

      const calcP34 = (tp: number, dist: number) =>
        new THREE.Vector2(
          Math.sin(tp * (Math.PI / 2)) * dist,
          Math.cos(tp * (Math.PI / 2)) * dist + p34elev
        );

      const p0 = new THREE.Vector2(0, 0);
      const p1 = new THREE.Vector2(0, p2elev);
      const p2 = calcP34(this.turnProgress, this.width * 0.5);
      const p3 = calcP34(this.turnProgressLag, this.width);

      return new THREE.CubicBezierCurve(p0, p1, p2, p3);
    }
  }

  public update(dt: number) {
    let straightenTarget = this.turnProgress;
    if (this.bendingEnabled && !this.isCover) {
      straightenTarget = clamp(straightenTarget * 1.15, -1, 1);
    }
    this.turnProgressLag = approach(
      this.turnProgressLag,
      straightenTarget,
      (this.bendingEnabled && !this.isCover) ? 6 : 28,
      dt
    );

    const curve = this.getCurve();
    const curveLength = curve.getLength();
    const curveStretch = curveLength > 0 ? Math.max(curveLength / this.width, 1) : 1;

    const position = this.mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const relCoord = this.vertexRelCoords[i];
      const t = clamp(relCoord.z * (1 / curveStretch), 0, 1);
      const pos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const direction = vectorToRadians(tangent) + Math.PI / 2;

      const thickness = lerp(this.rootThickness, this.thickness, relCoord.z);
      const halfThickness = thickness * (relCoord.x - 0.5);

      const finalZ = pos.y + Math.sin(direction) * halfThickness;
      const finalX = pos.x + Math.cos(direction) * halfThickness;

      if (!isNaN(finalX) && !isNaN(finalZ)) {
        position.setZ(i, finalZ);
        position.setX(i, finalX);
      }
    }

    position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();
  }

  public destroy() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material[]).forEach((m) => m.dispose());
    this.pivot.remove(this.mesh);
  }
}
