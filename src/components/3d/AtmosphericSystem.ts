import * as THREE from 'three';

export interface ButterflyEntity {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  baseY: number;
  phase: number;
  speed: number;
  radiusX: number;
  radiusZ: number;
  targetX: number;
  targetZ: number;
  isResting: boolean;
  restTimer: number;
}

export class AtmosphericSystem {
  scene: THREE.Scene;
  dustParticles: THREE.Points | null = null;
  petals: THREE.Group | null = null;
  butterflies: ButterflyEntity[] = [];
  butterflyCount = 5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initDust();
    this.initPetals();
    this.initButterflies();
  }

  // 1. Paper dust & subtle warm light specks
  initDust() {
    const count = 75;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const warmPalette = [
      new THREE.Color(0xF9F5EC), // Warm cream
      new THREE.Color(0xD8C5AA), // Warm beige
      new THREE.Color(0xB49A6A), // Gold accent
      new THREE.Color(0xE8C7C7), // Soft pink
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 10 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;

      const col = warmPalette[Math.floor(Math.random() * warmPalette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  // 2. Gentle drifting rose petals
  initPetals() {
    this.petals = new THREE.Group();
    const petalCount = 12;
    const petalGeo = new THREE.PlaneGeometry(0.12, 0.16, 2, 2);
    // slight curve on petal
    const pos = petalGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, Math.sin(pos.getY(i) * 10) * 0.02);
    }
    petalGeo.computeVertexNormals();

    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xC99A9A, // Dusty rose
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < petalCount; i++) {
      const mesh = new THREE.Mesh(petalGeo, petalMat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData = {
        speedY: 0.008 + Math.random() * 0.012,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedZ: (Math.random() - 0.5) * 0.02,
      };
      this.petals.add(mesh);
    }

    this.scene.add(this.petals);
  }

  // 3. Ethereal 3D Butterflies with procedural wing flapping
  initButterflies() {
    // Wing shape geometry
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.1, 0.15, 0.25, 0.25, 0.35, 0.2);
    wingShape.bezierCurveTo(0.4, 0.1, 0.3, -0.05, 0.2, -0.12);
    wingShape.bezierCurveTo(0.1, -0.18, 0.02, -0.05, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.center();
    // Offset pivot to wing base
    wingGeo.translate(0.16, 0, 0);

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xE8C7C7,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < this.butterflyCount; i++) {
      const bGroup = new THREE.Group();

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.x = -1;

      bGroup.add(leftWing);
      bGroup.add(rightWing);

      // Body
      const bodyGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4);
      const bodyMat = new THREE.MeshBasicMaterial({ color: 0x3A302B });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.rotation.x = Math.PI / 2;
      bGroup.add(bodyMesh);

      const scale = 0.5 + Math.random() * 0.35;
      bGroup.scale.set(scale, scale, scale);

      const startAngle = (i / this.butterflyCount) * Math.PI * 2;
      const bEntity: ButterflyEntity = {
        group: bGroup,
        leftWing,
        rightWing,
        baseY: 1.5 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        radiusX: 2.5 + Math.random() * 3,
        radiusZ: 2.0 + Math.random() * 2.5,
        targetX: 0,
        targetZ: 0,
        isResting: false,
        restTimer: 0,
      };

      bGroup.position.set(
        Math.cos(startAngle) * bEntity.radiusX,
        bEntity.baseY,
        Math.sin(startAngle) * bEntity.radiusZ
      );

      this.butterflies.push(bEntity);
      this.scene.add(bGroup);
    }
  }

  update(time: number, mouseParallax: { x: number; y: number }) {
    // 1. Dust motion
    if (this.dustParticles) {
      const positions = this.dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.002;
        positions[i * 3] += Math.cos(time * 0.3 + i) * 0.001 + mouseParallax.x * 0.0005;
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Petals floating down
    if (this.petals) {
      this.petals.children.forEach((mesh) => {
        mesh.position.y -= mesh.userData.speedY;
        mesh.rotation.x += mesh.userData.rotSpeedX;
        mesh.rotation.z += mesh.userData.rotSpeedZ;

        if (mesh.position.y < -3) {
          mesh.position.y = 8;
          mesh.position.x = (Math.random() - 0.5) * 14;
        }
      });
    }

    // 3. Butterflies flight & wing flapping
    this.butterflies.forEach((b, idx) => {
      b.phase += b.speed;
      const flap = Math.sin(time * 18 + b.phase * 2);

      b.leftWing.rotation.y = flap * 0.65;
      b.rightWing.rotation.y = -flap * 0.65;

      // Flight path along ellipse with gentle elevation variation
      const nextX = Math.cos(b.phase) * b.radiusX;
      const nextZ = Math.sin(b.phase * 0.8) * b.radiusZ;
      const nextY = b.baseY + Math.sin(b.phase * 1.5) * 0.45;

      // Orient toward flight direction
      const dx = nextX - b.group.position.x;
      const dz = nextZ - b.group.position.z;
      const targetAngle = Math.atan2(dx, dz);

      b.group.position.x = nextX;
      b.group.position.z = nextZ;
      b.group.position.y = nextY;
      b.group.rotation.y = targetAngle + Math.PI / 2;
      b.group.rotation.z = Math.sin(b.phase) * 0.15;
    });
  }

  destroy() {
    if (this.dustParticles) {
      this.dustParticles.geometry.dispose();
      (this.dustParticles.material as THREE.Material).dispose();
      this.scene.remove(this.dustParticles);
    }
    if (this.petals) {
      this.petals.children.forEach((p) => {
        const m = p as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      this.scene.remove(this.petals);
    }
    this.butterflies.forEach((b) => {
      this.scene.remove(b.group);
    });
  }
}
