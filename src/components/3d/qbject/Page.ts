import * as THREE from 'three';

export interface PageParams {
  textureUrls: {
    front: string;
    back: string;
    edgeTop?: string;
    edgeBottom?: string;
    edgeLeft?: string;
    edgeRight?: string;
  };
  width: number;
  height: number;
  thickness?: number;
  rootThickness?: number;
  isCover?: boolean;
  isFrontCover?: boolean;
  edgeColor?: number;
  textureLoader?: THREE.TextureLoader;
}

export function approach(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

export function cosineInterpolate(a: number, b: number, t: number): number {
  const ft = t * Math.PI;
  const f = (1 - Math.cos(ft)) * 0.5;
  return a * (1 - f) + b * f;
}

export function vectorToRadians(v: THREE.Vector2): number {
  return Math.atan2(v.y, v.x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function rotateY(point: THREE.Vector3, pivot: THREE.Vector3, angle: number): THREE.Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - pivot.x;
  const dz = point.z - pivot.z;
  return new THREE.Vector3(
    cos * dx - sin * dz + pivot.x,
    point.y,
    sin * dx + cos * dz + pivot.z
  );
}

export class Page {
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
  private isFrontCover: boolean;
  private hasTurnProgressUpdated = false;

  constructor(
    pageParams: {
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
  ) {
    this.width = pageParams.width;
    this.height = pageParams.height;
    this.thickness = pageParams.thickness || 2;
    this.rootThickness = pageParams.rootThickness || 4;
    this.isCover = !!pageParams.isCover;
    this.edgeColor = pageParams.edgeColor || 0xffffff;
    this.isFrontCover = !!pageParams.isFrontCover;

    if (this.isCover) {
      this.zSegments = 1;
    }

    const _color = (hex: number) => ({
      color: new THREE.Color(hex),
    });

    const materials = [
      new THREE.MeshStandardMaterial({ map: pageParams.backTexture, vertexColors: !this.isCover }),
      new THREE.MeshStandardMaterial({ map: pageParams.frontTexture, vertexColors: !this.isCover }),
      new THREE.MeshStandardMaterial(_color(this.edgeColor)),
      new THREE.MeshStandardMaterial(_color(this.edgeColor)),
      new THREE.MeshStandardMaterial(_color(this.edgeColor)),
      new THREE.MeshStandardMaterial(_color(this.edgeColor)),
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
        coord.z = cosineInterpolate(0, 2, coord.z / 2);
        uv.setXY(i, coord.x > 0.5 ? 1 - coord.z : coord.z, coord.y);
      }

      this.vertexRelCoords[i] = coord;

      const darken = clamp(Math.pow(1 - coord.z, 4) - 0.6, 0, 1);
      colors[i * 3] = 1 - darken;
      colors[i * 3 + 1] = 1 - darken;
      colors[i * 3 + 2] = 1 - darken;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    uv.needsUpdate = true;
  }

  public getCurve() {
    if (this.isCover) {
      const backShift = this.rootThickness;
      const leftShift = (this.rootThickness / 2) * (this.isFrontCover ? 1 : -1);
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
      const maxHeight = isRight ? this.elevationRight : this.elevationLeft;

      const p2baseElevation = 30;
      const p2elev = eFactorSin * (maxHeight + p2baseElevation) * 2;
      const p34elev = eFactorCos * maxHeight;

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
    let straightenTarget = this.turnProgress;
    if (this.bendingEnabled) {
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

      const pos = curve.getPointAt(relCoord.z * (1 / curveStretch));
      const direction = vectorToRadians(curve.getTangentAt(relCoord.z)) + Math.PI / 2;

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

  public destroy() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material[]).forEach((m) => m.dispose());
    this.pivot.remove(this.mesh);
  }
}
