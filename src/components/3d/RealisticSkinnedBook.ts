import * as THREE from 'three';

export interface PageDefinition {
  frontTexture: THREE.Texture;
  backTexture: THREE.Texture;
  isCover?: boolean;
}

export class RealisticSkinnedBook {
  scene: THREE.Scene;
  group: THREE.Group;
  pages: THREE.SkinnedMesh[] = [];
  pageBones: THREE.Bone[][] = [];
  targetRotations: number[] = [];
  currentRotations: number[] = [];

  pageWidth = 2.4;
  pageHeight = 3.2;
  pageDepth = 0.006;
  segments = 24;
  segmentWidth: number;
  totalPages = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.segmentWidth = this.pageWidth / this.segments;
    this.scene.add(this.group);
  }

  createGeometry(): THREE.BoxGeometry {
    const geo = new THREE.BoxGeometry(
      this.pageWidth,
      this.pageHeight,
      this.pageDepth,
      this.segments,
      2
    );
    geo.translate(this.pageWidth / 2, 0, 0);

    const position = geo.attributes.position;
    const vertex = new THREE.Vector3();
    const skinIndexes: number[] = [];
    const skinWeights: number[] = [];

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      const x = vertex.x;
      const skinIndex = Math.max(0, Math.min(this.segments - 1, Math.floor(x / this.segmentWidth)));
      const skinWeight = (x % this.segmentWidth) / this.segmentWidth;

      skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
      skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndexes, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return geo;
  }

  initPages(pageDefs: PageDefinition[]) {
    this.totalPages = pageDefs.length;
    const baseGeo = this.createGeometry();

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xD8C5AA,
      roughness: 0.9,
    });

    pageDefs.forEach((def, index) => {
      // 1. Bones hierarchy for continuous curvature
      const bones: THREE.Bone[] = [];
      for (let i = 0; i <= this.segments; i++) {
        const bone = new THREE.Bone();
        if (i === 0) {
          bone.position.x = 0;
        } else {
          bone.position.x = this.segmentWidth;
        }
        if (i > 0) {
          bones[i - 1].add(bone);
        }
        bones.push(bone);
      }

      const skeleton = new THREE.Skeleton(bones);

      // Materials: right, left, top, bottom, front, back
      const materials: THREE.Material[] = [
        edgeMaterial,
        edgeMaterial,
        edgeMaterial,
        edgeMaterial,
        new THREE.MeshStandardMaterial({
          map: def.frontTexture,
          roughness: def.isCover ? 0.65 : 0.88,
          metalness: def.isCover ? 0.15 : 0.02,
        }),
        new THREE.MeshStandardMaterial({
          map: def.backTexture,
          roughness: def.isCover ? 0.65 : 0.88,
          metalness: def.isCover ? 0.15 : 0.02,
        }),
      ];

      const mesh = new THREE.SkinnedMesh(baseGeo, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.add(bones[0]);
      mesh.bind(skeleton);

      // Layering along Z to avoid z-fighting
      mesh.position.z = -index * 0.008;

      this.group.add(mesh);
      this.pages.push(mesh);
      this.pageBones.push(bones);
      this.targetRotations.push(0); // 0 = closed right, -PI = opened left
      this.currentRotations.push(0);
    });
  }

  // Target page: how many pages have been turned to the left
  setPageTurnProgress(openedPageIndex: number) {
    for (let i = 0; i < this.totalPages; i++) {
      if (i < openedPageIndex) {
        this.targetRotations[i] = -Math.PI; // Flipped to left
      } else {
        this.targetRotations[i] = 0; // Resting on right
      }
    }
  }

  update(delta: number) {
    for (let p = 0; p < this.totalPages; p++) {
      // Smooth damp rotation
      const targetRot = this.targetRotations[p];
      this.currentRotations[p] += (targetRot - this.currentRotations[p]) * 0.12;
      const currentRot = this.currentRotations[p];

      // Realistic curling deformation along bones
      const bones = this.pageBones[p];
      const isTurning = Math.abs(currentRot - targetRot) > 0.01;
      const turningFactor = Math.sin(Math.abs(currentRot));

      for (let b = 0; b < bones.length; b++) {
        if (b === 0) {
          bones[0].rotation.y = currentRot;
        } else {
          // Curving strength increases towards middle and tips during turning
          const curve = isTurning ? Math.sin((b / bones.length) * Math.PI) * turningFactor * 0.045 : 0;
          bones[b].rotation.y = curve;
        }
      }
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.pages.forEach((p) => {
      p.geometry.dispose();
      (p.material as THREE.Material[]).forEach((m) => m.dispose());
    });
  }
}
