import * as THREE from 'three';

export interface ButterflyEntity {
  group: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
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
  butterflyCount = 12;
  private configuredButterflyCount?: number;
  private configuredPetalCount?: number;
  private configuredDustCount?: number;
  private compact = typeof window !== 'undefined' && window.innerWidth < 768;
  private reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private lastTime: number | undefined;
  private motionTime = 0;

  constructor(
    scene: THREE.Scene,
    options?: {
      butterflyCount?: number;
      petalCount?: number;
      dustCount?: number;
    }
  ) {
    this.scene = scene;
    this.configuredButterflyCount = options?.butterflyCount;
    this.configuredPetalCount = options?.petalCount;
    this.configuredDustCount = options?.dustCount;

    this.butterflyCount =
      this.configuredButterflyCount ?? (this.compact ? 6 : 12);
    this.initDust();
    this.initPetals();
    this.initButterflies();
  }

  // 1. Magic Golden & Pink Fairy Dust
  initDust() {
    const count = this.configuredDustCount ?? (this.compact ? 35 : 90);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64;
    spriteCanvas.height = 64;
    const spriteContext = spriteCanvas.getContext('2d')!;
    const spriteGradient = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    spriteGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    spriteGradient.addColorStop(0.25, 'rgba(255,245,220,0.45)');
    spriteGradient.addColorStop(1, 'rgba(255,255,255,0)');
    spriteContext.fillStyle = spriteGradient;
    spriteContext.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    const romanticPalette = [
      new THREE.Color(0xFFE8EE), // Soft pink
      new THREE.Color(0xFFD1DC), // Pastel rose
      new THREE.Color(0xFFF0BD), // Warm fairy gold
      new THREE.Color(0xFFFFFF), // Shimmer white
      new THREE.Color(0xE8BCC6), // Blush
    ];

    for (let i = 0; i < count; i++) {
      // Scaled to the 764x1080 book world coordinate system (-2500 to 2500)
      const side = Math.random() < 0.5 ? -1 : 1;
      positions[i * 3] = side * (900 + Math.random() * 1400);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000 + 300;

      const col = romanticPalette[Math.floor(Math.random() * romanticPalette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 5,
      map: sprite,
      alphaTest: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  // 2. Realistic Organic Curved Rose & Cherry Blossom Petals
  initPetals() {
    this.petals = new THREE.Group();
    const petalCount = this.configuredPetalCount ?? (this.compact ? 16 : 34);

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
      const side = Math.random() < 0.5 ? -1 : 1;
      mesh.position.set(
        side * (i % 3 === 0 ? 150 + Math.random() * 550 : 650 + Math.random() * 650),
        Math.random() * 2200 - 600,
        100 + Math.random() * 500
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      const scale = 0.5 + Math.random() * 0.4;
      mesh.scale.set(scale, scale, scale);

      mesh.userData = {
        nearBook: i % 3 === 0,
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
    forewingGeo.translate(0.8, 3, 0);

    // 2. Hindwing (Cánh dưới: tròn lượn sóng)
    const hindwingShape = new THREE.Shape();
    hindwingShape.moveTo(0, 0);
    hindwingShape.bezierCurveTo(10, -4, 28, -8, 34, -22); // Outer bulb
    hindwingShape.bezierCurveTo(30, -36, 14, -42, 0, -28); // Lower rounded curve
    hindwingShape.bezierCurveTo(-4, -18, -2, -6, 0, 0);

    const hindwingGeo = new THREE.ShapeGeometry(hindwingShape, 12);
    hindwingGeo.translate(0.8, -2, -0.3);

    // ShapeGeometry uses world coordinates as UVs; normalize each wing once.
    for (const geometry of [forewingGeo, hindwingGeo]) {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      const positions = geometry.attributes.position;
      const uv = geometry.attributes.uv;
      for (let v = 0; v < positions.count; v++) {
        uv.setXY(v,
          (positions.getX(v) - bounds.min.x) / (bounds.max.x - bounds.min.x),
          (positions.getY(v) - bounds.min.y) / (bounds.max.y - bounds.min.y));
      }
      uv.needsUpdate = true;
    }

    // Procedural Butterfly Wing Texture Canvas with veins and iridescent borders
    const createWingTexture = (baseColor: string, patternColor: string): THREE.CanvasTexture => {
      const cvs = document.createElement('canvas');
      cvs.width = 256;
      cvs.height = 256;
      const ctx = cvs.getContext('2d')!;

      // Base gradient
      const grad = ctx.createRadialGradient(40, 128, 10, 128, 128, 140);
      grad.addColorStop(0, '#998773');
      grad.addColorStop(0.4, baseColor);
      grad.addColorStop(0.85, patternColor);
      grad.addColorStop(1, '#645648');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Delicate veins
      ctx.strokeStyle = 'rgba(89, 72, 53, 0.22)';
      ctx.lineWidth = 0.9;
      for (let angle = -0.6; angle <= 0.6; angle += 0.22) {
        ctx.beginPath();
        ctx.moveTo(30, 128);
        const endX = 30 + Math.cos(angle) * 180;
        const endY = 128 + Math.sin(angle) * 140;
        ctx.quadraticCurveTo(100, 128 + angle * 50, endX, endY);
        ctx.stroke();
      }

      // Fairy dots on margin
      ctx.fillStyle = 'rgba(255, 244, 218, 0.65)';
      for (let d = 0; d < 12; d++) {
        const dotX = 205 + Math.sin(d * Math.PI / 11) * 20;
        const dotY = 50 + d * 14;
        ctx.beginPath();
        ctx.ellipse(dotX, dotY, 2.2, 3.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const butterflyThemes = [
      { base: '#F0DFC0', border: '#AB8F69' },
      { base: '#EBDDCB', border: '#AD9882' },
      { base: '#DEC8A1', border: '#9D805E' },
      { base: '#E6D0C7', border: '#AF9486' },
      { base: '#EFE5CF', border: '#B9A583' },
      { base: '#E9DDC6', border: '#AD9878' },
    ];

    for (let i = 0; i < this.butterflyCount; i++) {
      const bGroup = new THREE.Group();
      const theme = butterflyThemes[i % butterflyThemes.length];
      const wingTexture = createWingTexture(theme.base, theme.border);

      const wingMat = new THREE.MeshStandardMaterial({
        map: wingTexture,
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: false,
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
        color: 0x615347,
        roughness: 1,
        metalness: 0,
      });
      const abdomenMesh = new THREE.Mesh(abdomenGeo, bodyMat);
      abdomenMesh.position.y = -5;
      bodyGroup.add(abdomenMesh);

      // Head
      const headGeo = new THREE.SphereGeometry(2.2, 8, 8);
      const headMesh = new THREE.Mesh(headGeo, bodyMat);
      headMesh.position.set(0, 13, 0);
      bodyGroup.add(headMesh);

      // Curved Antennas
      const antennaMat = new THREE.MeshBasicMaterial({ color: 0x38161E });
      const leftAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 4), antennaMat);
      leftAntenna.position.set(3.5, 21, 0);
      leftAntenna.rotation.z = -Math.PI / 6;

      const rightAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 4), antennaMat);
      rightAntenna.position.set(-3.5, 21, 0);
      rightAntenna.rotation.z = Math.PI / 6;

      bodyGroup.add(leftAntenna);
      bodyGroup.add(rightAntenna);

      bGroup.add(bodyGroup);

      const scale = 0.4 + Math.random() * 0.2;
      bGroup.scale.set(scale, scale, scale);

      const startAngle = (i / this.butterflyCount) * Math.PI * 2;
      const nearBook = i % 3 !== 2;
      const radiusX = nearBook ? 180 + Math.random() * 120 : 100 + Math.random() * 170;
      const radiusZ = 80 + Math.random() * 120;
      const baseY = (Math.random() - 0.5) * 1200;

      const bEntity: ButterflyEntity = {
        group: bGroup,
        leftWing: leftWingGroup,
        rightWing: rightWingGroup,
        baseY,
        baseX: (i % 2 ? -1 : 1) * (nearBook ? 620 + Math.random() * 220 : 1000 + Math.random() * 260),
        baseZ: nearBook ? 180 + Math.random() * 180 : 250 + Math.random() * 350,
        phase: startAngle,
        speed: 0.0016 + Math.random() * 0.002,
        radiusX,
        radiusZ,
        wingSpeed: 8 + Math.random() * 3,
        color: theme.base,
      };

      bGroup.position.set(
        bEntity.baseX + Math.cos(startAngle) * radiusX,
        baseY + Math.sin(startAngle * 2) * 160,
        Math.sin(startAngle * 0.9) * radiusZ + bEntity.baseZ
      );

      this.butterflies.push(bEntity);
      this.scene.add(bGroup);
    }
  }

  update(time: number, mouseParallax: { x: number; y: number }) {
    if (this.reducedMotion) return;
    const elapsed = this.lastTime === undefined ? 0 : time - this.lastTime;
    this.lastTime = time;
    // Discard background-tab gaps rather than jumping across the scene.
    const dt = elapsed > 0.25 ? 0 : Math.max(0, elapsed);
    const frame = dt * 60;
    this.motionTime += dt;
    time = this.motionTime;
    // 1. Dust motion
    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.8 * frame;
        pos[i * 3] += (Math.cos(time * 0.3 + i) * 0.5 + mouseParallax.x * 0.4) * frame;
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Petals floating down with natural leaf fluttering
    if (this.petals) {
      this.petals.children.forEach((mesh) => {
        mesh.userData.wobblePhase += mesh.userData.wobbleSpeed * frame;
        mesh.position.y -= mesh.userData.speedY * 0.4 * frame;
        mesh.position.x += (Math.sin(mesh.userData.wobblePhase) * 1.5 + mesh.userData.speedX * 0.3) * frame;
        mesh.position.z += Math.cos(mesh.userData.wobblePhase) * 0.8 * frame;

        mesh.rotation.x += mesh.userData.rotSpeedX * frame;
        mesh.rotation.y += Math.sin(mesh.userData.wobblePhase) * 0.02 * frame;
        mesh.rotation.z += mesh.userData.rotSpeedZ * frame;

        if (mesh.position.y < -1200) {
          mesh.position.y = 1400;
          const side = Math.random() < 0.5 ? -1 : 1;
          mesh.position.x = side * (mesh.userData.nearBook ? 150 + Math.random() * 550 : 650 + Math.random() * 650);
          mesh.position.z = 100 + Math.random() * 500;
        }
      });
    }

    // 3. Floating Hearts bobbing
    if (this.glowingHearts) {
      this.glowingHearts.children.forEach((mesh) => {
        mesh.userData.phase += mesh.userData.speed * frame;
        mesh.position.y = mesh.userData.baseY + Math.sin(mesh.userData.phase) * 60;
        mesh.rotation.z = Math.sin(mesh.userData.phase * 0.7) * 0.2;
      });
    }

    // 4. Butterflies dancing & wing flapping
    this.butterflies.forEach((b) => {
      b.phase += b.speed * frame;
      const glide = THREE.MathUtils.smoothstep(Math.sin(time * 0.65 + b.baseY), 0.55, 0.9);
      const flap = 0.2 + (0.5 + 0.5 * Math.sin(time * b.wingSpeed + b.baseY)) * (1 - glide) * 0.95;

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
      // Head follows the projected flight tangent; never spin broadside abruptly.
      const vx = -Math.sin(b.phase) * b.radiusX;
      const vy = Math.cos(b.phase * 2) * 320;
      const heading = Math.atan2(-vx, vy);
      const difference = Math.atan2(Math.sin(heading - b.group.rotation.z), Math.cos(heading - b.group.rotation.z));
      b.group.rotation.z += difference * (1 - Math.exp(-1.5 * dt));
      b.group.rotation.y = Math.sin(b.phase * 0.9) * 0.22;
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
