import * as THREE from 'three';

export interface ButterflyEntity {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  baseY: number;
  baseX: number;
  baseZ: number;
  phase: number;
  speed: number;
  radiusX: number;
  radiusZ: number;
  wingSpeed: number;
  color: string;
}

export class AtmosphericSystem {
  scene: THREE.Scene;
  dustParticles: THREE.Points | null = null;
  glowingHearts: THREE.Group | null = null;
  petals: THREE.Group | null = null;
  butterflies: ButterflyEntity[] = [];
  butterflyCount = 18;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initDust();
    this.initPetals();
    this.initGlowingHearts();
    this.initButterflies();
  }

  // 1. Magic Golden & Pink Fairy Dust
  initDust() {
    const count = 380;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const romanticPalette = [
      new THREE.Color(0xFFE8EE), // Soft pink
      new THREE.Color(0xFFD1DC), // Pastel rose
      new THREE.Color(0xFFF0BD), // Warm fairy gold
      new THREE.Color(0xFFFFFF), // Shimmer white
      new THREE.Color(0xE8BCC6), // Blush
    ];

    for (let i = 0; i < count; i++) {
      // Scaled to the 764x1080 book world coordinate system (-2500 to 2500)
      positions[i * 3] = (Math.random() - 0.5) * 4500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000 + 300;

      const col = romanticPalette[Math.floor(Math.random() * romanticPalette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 16,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  // 2. Realistic Organic Curved Rose & Cherry Blossom Petals
  initPetals() {
    this.petals = new THREE.Group();
    const petalCount = 45;

    // Build real organic teardrop / cherry blossom petal curve with subtle notch
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0); // Petal base / stem point
    petalShape.bezierCurveTo(8, 12, 18, 26, 16, 42); // Right outer curve
    petalShape.bezierCurveTo(14, 54, 4, 60, 0, 56);   // Top curve with gentle dip
    petalShape.bezierCurveTo(-4, 60, -14, 54, -16, 42);// Top left notch
    petalShape.bezierCurveTo(-18, 26, -8, 12, 0, 0);  // Left curve returning to base

    const basePetalGeo = new THREE.ShapeGeometry(petalShape, 12);
    basePetalGeo.center();

    // Give 3D cup curvature to the petal so it doesn't look flat
    const pos = basePetalGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Cup depression along center line (y) and curl along edges
      const cupZ = Math.sin((y / 30) * Math.PI) * 5 - (Math.abs(x) / 18) * 4;
      pos.setZ(i, cupZ);
    }
    basePetalGeo.computeVertexNormals();

    const petalColors = [0xFFA6BA, 0xFFC2CD, 0xF9B4C4, 0xFFD8E2, 0xEFA0B0];

    for (let i = 0; i < petalCount; i++) {
      const col = petalColors[i % petalColors.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });

      const mesh = new THREE.Mesh(basePetalGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 3600,
        Math.random() * 2200 - 600,
        Math.random() * 1600 - 200
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      const scale = 0.5 + Math.random() * 0.4;
      mesh.scale.set(scale, scale, scale);

      mesh.userData = {
        speedY: 1.0 + Math.random() * 1.5,
        speedX: (Math.random() - 0.5) * 1.2,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedZ: (Math.random() - 0.5) * 0.02,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.02,
      };
      this.petals.add(mesh);
    }

    this.scene.add(this.petals);
  }

  // 3. Floating Tiny Glowing Hearts
  initGlowingHearts() {
    this.glowingHearts = new THREE.Group();
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, -6, -12, -6, -12, 6);
    heartShape.bezierCurveTo(-12, 16, 0, 24, 0, 30);
    heartShape.bezierCurveTo(0, 24, 12, 16, 12, 6);
    heartShape.bezierCurveTo(12, -6, 0, -6, 0, 0);

    const heartGeo = new THREE.ShapeGeometry(heartShape);
    heartGeo.center();

    const heartColors = [0xFF6B8B, 0xFFA0B4, 0xFFD1DC, 0xFF85A1];

    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: heartColors[i % heartColors.length],
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(heartGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 3200,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 1200 + 300
      );
      mesh.scale.set(0.6 + Math.random() * 0.5, -(0.6 + Math.random() * 0.5), 1);
      mesh.userData = {
        baseY: mesh.position.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.02,
      };
      this.glowingHearts.add(mesh);
    }
    this.scene.add(this.glowingHearts);
  }

  // 4. Realistic Ornate 3D Butterflies with forewings, hindwings, antenna, body, and glowing wing patterns
  initButterflies() {
    // 1. Forewing (Cánh trên: rộng, vuốt nhọn kiêu sa)
    const forewingShape = new THREE.Shape();
    forewingShape.moveTo(0, 0);
    forewingShape.bezierCurveTo(8, 15, 20, 38, 48, 48); // Top arched ridge
    forewingShape.bezierCurveTo(58, 42, 54, 26, 42, 12); // Outer scalloped margin
    forewingShape.bezierCurveTo(32, 0, 16, -6, 0, 0);

    const forewingGeo = new THREE.ShapeGeometry(forewingShape, 12);
    // Offset pivot to body hinge
    forewingGeo.translate(6, 4, 0);

    // 2. Hindwing (Cánh dưới: tròn lượn sóng)
    const hindwingShape = new THREE.Shape();
    hindwingShape.moveTo(0, 0);
    hindwingShape.bezierCurveTo(10, -4, 28, -8, 34, -22); // Outer bulb
    hindwingShape.bezierCurveTo(30, -36, 14, -42, 0, -28); // Lower rounded curve
    hindwingShape.bezierCurveTo(-4, -18, -2, -6, 0, 0);

    const hindwingGeo = new THREE.ShapeGeometry(hindwingShape, 12);
    hindwingGeo.translate(4, -4, 0);

    // Procedural Butterfly Wing Texture Canvas with veins and iridescent borders
    const createWingTexture = (baseColor: string, patternColor: string): THREE.CanvasTexture => {
      const cvs = document.createElement('canvas');
      cvs.width = 256;
      cvs.height = 256;
      const ctx = cvs.getContext('2d')!;

      // Base gradient
      const grad = ctx.createRadialGradient(40, 128, 10, 128, 128, 140);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.4, baseColor);
      grad.addColorStop(0.85, patternColor);
      grad.addColorStop(1, '#682535');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Delicate veins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      for (let angle = -0.6; angle <= 0.6; angle += 0.22) {
        ctx.beginPath();
        ctx.moveTo(30, 128);
        const endX = 30 + Math.cos(angle) * 180;
        const endY = 128 + Math.sin(angle) * 140;
        ctx.quadraticCurveTo(100, 128 + angle * 50, endX, endY);
        ctx.stroke();
      }

      // Fairy dots on margin
      ctx.fillStyle = '#FFFFFF';
      for (let d = 0; d < 12; d++) {
        const dotX = 180 + Math.random() * 50;
        const dotY = 50 + d * 14;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const butterflyThemes = [
      { base: '#FFA6BA', border: '#D45D79' },
      { base: '#FFE2E8', border: '#E87A90' },
      { base: '#F9D5A7', border: '#D48B54' },
      { base: '#E8BCC6', border: '#A64B62' },
      { base: '#FFB8D0', border: '#C84B70' },
      { base: '#FDE2E8', border: '#E295A8' },
    ];

    for (let i = 0; i < this.butterflyCount; i++) {
      const bGroup = new THREE.Group();
      const theme = butterflyThemes[i % butterflyThemes.length];
      const wingTexture = createWingTexture(theme.base, theme.border);

      const wingMat = new THREE.MeshStandardMaterial({
        map: wingTexture,
        roughness: 0.4,
        metalness: 0.15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });

      // Left wing assembly (forewing + hindwing)
      const leftWingGroup = new THREE.Group();
      const leftFore = new THREE.Mesh(forewingGeo, wingMat);
      const leftHind = new THREE.Mesh(hindwingGeo, wingMat);
      leftWingGroup.add(leftFore);
      leftWingGroup.add(leftHind);

      // Right wing assembly
      const rightWingGroup = new THREE.Group();
      const rightFore = new THREE.Mesh(forewingGeo, wingMat);
      const rightHind = new THREE.Mesh(hindwingGeo, wingMat);
      rightWingGroup.add(rightFore);
      rightWingGroup.add(rightHind);
      rightWingGroup.scale.x = -1;

      bGroup.add(leftWingGroup);
      bGroup.add(rightWingGroup);

      // Detailed Slender Butterfly Body (Head, Thorax, Abdomen)
      const bodyGroup = new THREE.Group();

      // Thorax / Abdomen
      const abdomenGeo = new THREE.CylinderGeometry(1.4, 0.6, 26, 8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x4A1523,
        roughness: 0.6,
        metalness: 0.2,
      });
      const abdomenMesh = new THREE.Mesh(abdomenGeo, bodyMat);
      abdomenMesh.rotation.x = Math.PI / 2;
      bodyGroup.add(abdomenMesh);

      // Head
      const headGeo = new THREE.SphereGeometry(2.2, 8, 8);
      const headMesh = new THREE.Mesh(headGeo, bodyMat);
      headMesh.position.set(0, 0, 13);
      bodyGroup.add(headMesh);

      // Curved Antennas
      const antennaMat = new THREE.MeshBasicMaterial({ color: 0x38161E });
      const leftAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 4), antennaMat);
      leftAntenna.position.set(2.5, 3, 18);
      leftAntenna.rotation.set(Math.PI / 3, 0, Math.PI / 6);

      const rightAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 4), antennaMat);
      rightAntenna.position.set(-2.5, 3, 18);
      rightAntenna.rotation.set(Math.PI / 3, 0, -Math.PI / 6);

      bodyGroup.add(leftAntenna);
      bodyGroup.add(rightAntenna);

      bGroup.add(bodyGroup);

      const scale = 0.55 + Math.random() * 0.45;
      bGroup.scale.set(scale, scale, scale);

      const startAngle = (i / this.butterflyCount) * Math.PI * 2;
      const radiusX = 850 + Math.random() * 1100;
      const radiusZ = 600 + Math.random() * 900;
      const baseY = (Math.random() - 0.5) * 1200;

      const bEntity: ButterflyEntity = {
        group: bGroup,
        leftWing: leftWingGroup as any,
        rightWing: rightWingGroup as any,
        baseY,
        baseX: (Math.random() - 0.5) * 400,
        baseZ: 200 + Math.random() * 400,
        phase: startAngle,
        speed: 0.0016 + Math.random() * 0.002,
        radiusX,
        radiusZ,
        wingSpeed: 4.5 + Math.random() * 2.0,
        color: theme.base,
      };

      bGroup.position.set(
        Math.cos(startAngle) * radiusX,
        baseY,
        Math.sin(startAngle) * radiusZ + bEntity.baseZ
      );

      this.butterflies.push(bEntity);
      this.scene.add(bGroup);
    }
  }

  update(time: number, mouseParallax: { x: number; y: number }) {
    // 1. Dust motion
    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.8;
        pos[i * 3] += Math.cos(time * 0.3 + i) * 0.5 + mouseParallax.x * 0.4;
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Petals floating down with natural leaf fluttering
    if (this.petals) {
      this.petals.children.forEach((mesh) => {
        mesh.userData.wobblePhase += mesh.userData.wobbleSpeed;
        mesh.position.y -= mesh.userData.speedY * 0.4;
        mesh.position.x += Math.sin(mesh.userData.wobblePhase) * 1.5 + mesh.userData.speedX * 0.3;
        mesh.position.z += Math.cos(mesh.userData.wobblePhase) * 0.8;

        mesh.rotation.x += mesh.userData.rotSpeedX;
        mesh.rotation.y += Math.sin(mesh.userData.wobblePhase) * 0.02;
        mesh.rotation.z += mesh.userData.rotSpeedZ;

        if (mesh.position.y < -1200) {
          mesh.position.y = 1400;
          mesh.position.x = (Math.random() - 0.5) * 3600;
        }
      });
    }

    // 3. Floating Hearts bobbing
    if (this.glowingHearts) {
      this.glowingHearts.children.forEach((mesh) => {
        mesh.userData.phase += mesh.userData.speed;
        mesh.position.y = mesh.userData.baseY + Math.sin(mesh.userData.phase) * 60;
        mesh.rotation.z = Math.sin(mesh.userData.phase * 0.7) * 0.2;
      });
    }

    // 4. Butterflies dancing & wing flapping
    this.butterflies.forEach((b) => {
      b.phase += b.speed;
      const flap = Math.sin(time * b.wingSpeed);

      b.leftWing.rotation.y = flap * 0.75;
      b.rightWing.rotation.y = -flap * 0.75;

      const nextX = b.baseX + Math.cos(b.phase) * b.radiusX;
      const nextZ = b.baseZ + Math.sin(b.phase * 0.9) * b.radiusZ;
      const nextY = b.baseY + Math.sin(b.phase * 2) * 160;

      const dx = nextX - b.group.position.x;
      const dz = nextZ - b.group.position.z;
      const targetAngle = Math.atan2(dx, dz);

      b.group.position.x = nextX;
      b.group.position.z = nextZ;
      b.group.position.y = nextY;
      b.group.rotation.y = targetAngle + Math.PI / 2;
      b.group.rotation.z = Math.sin(b.phase) * 0.2;
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
    if (this.glowingHearts) {
      this.glowingHearts.children.forEach((h) => {
        const m = h as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      this.scene.remove(this.glowingHearts);
    }
    this.butterflies.forEach((b) => {
      this.scene.remove(b.group);
    });
  }
}
