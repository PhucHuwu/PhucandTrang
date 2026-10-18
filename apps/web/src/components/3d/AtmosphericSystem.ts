import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const noise = new ImprovedNoise();

export interface ButterflyEntity {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: THREE.Vector3;
  home: THREE.Vector3;
  wingPhase: number;
  size: number;
  seed: number;
}

// Wing motion follows klevron/threejs-toys "butterflies": a single subdivided quad per butterfly,
// wings bent in the vertex shader by a wave travelling from the body to the wing tips,
// steered by a noise flow field and pulled back towards a home area.
const WING_SEGMENTS = 8;
const WING_DISPLACEMENT = 1.25;
const WING_VARIANTS = [
  { inner: '#FFF0F3', outer: '#F28FA8', border: '#6E2A3E' },
  { inner: '#FFF6DF', outer: '#F0B25C', border: '#55311D' },
  { inner: '#F7EDFF', outer: '#B78BE0', border: '#432762' },
  { inner: '#FFF0E6', outer: '#F4A58A', border: '#663024' },
  { inner: '#FFFFFF', outer: '#EED6C2', border: '#7E5F4C' },
  { inner: '#EEF8FF', outer: '#8DC3EC', border: '#22476A' },
];
const FLIGHT = {
  homeRadiusInner: 220,
  homeRadiusOuter: 420,
  noiseScale: 1 / 220,
  noiseAccel: 90,
  attractAccel: 260,
  maxSpeed: 150,
  minSpeed: 45,
};

function bezierPoint(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Top-down butterfly sprites (head towards the top), one 256px cell per colour variant. */
function createButterflyAtlas(): THREE.CanvasTexture {
  const cell = 256;
  const canvas = document.createElement('canvas');
  canvas.width = cell * WING_VARIANTS.length;
  canvas.height = cell;
  const ctx = canvas.getContext('2d')!;

  // Left-side wing outlines as cubic segments; the right side is mirrored.
  const fore = [
    [[122, 112], [100, 70], [50, 28], [20, 38]],
    [[20, 38], [6, 60], [18, 110], [44, 130]],
    [[44, 130], [70, 140], [100, 136], [122, 128]],
  ];
  const hind = [
    [[122, 130], [90, 132], [52, 140], [44, 170]],
    [[44, 170], [36, 206], [70, 234], [96, 222]],
    [[96, 222], [112, 212], [120, 180], [124, 150]],
  ];
  const tracePath = (segments: number[][][]) => {
    const path = new Path2D();
    path.moveTo(segments[0][0][0], segments[0][0][1]);
    for (const [, c1, c2, end] of segments) path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
    path.closePath();
    return path;
  };
  const forePath = tracePath(fore);
  const hindPath = tracePath(hind);

  const drawWing = (path: Path2D, segments: number[][][], variant: typeof WING_VARIANTS[number]) => {
    ctx.save();
    ctx.clip(path);

    const gradient = ctx.createRadialGradient(122, 128, 6, 122, 128, 125);
    gradient.addColorStop(0, variant.inner);
    gradient.addColorStop(0.55, variant.outer);
    gradient.addColorStop(1, variant.outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cell, cell);

    // Veins radiating from the wing root
    ctx.strokeStyle = variant.border;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.6;
    for (let t = 0.1; t < 1; t += 0.16) {
      for (const segment of segments.slice(0, 2)) {
        const [x, y] = bezierPoint(segment[0], segment[1], segment[2], segment[3], t);
        ctx.beginPath();
        ctx.moveTo(122, 128);
        ctx.quadraticCurveTo((122 + x) / 2, (128 + y) / 2 + 6, x, y);
        ctx.stroke();
      }
    }

    // Dark margin with pale spots
    ctx.globalAlpha = 1;
    ctx.lineWidth = 16;
    ctx.stroke(path);
    ctx.fillStyle = 'rgba(255, 250, 240, 0.9)';
    for (const segment of segments.slice(0, 2)) {
      for (let t = 0.12; t < 0.95; t += 0.14) {
        const [x, y] = bezierPoint(segment[0], segment[1], segment[2], segment[3], t);
        const dx = 122 - x;
        const dy = 128 - y;
        const len = Math.hypot(dx, dy) || 1;
        ctx.beginPath();
        ctx.arc(x + (dx / len) * 4, y + (dy / len) * 4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  WING_VARIANTS.forEach((variant, index) => {
    ctx.save();
    ctx.translate(index * cell, 0);
    for (const mirrored of [false, true]) {
      ctx.save();
      if (mirrored) {
        ctx.translate(cell, 0);
        ctx.scale(-1, 1);
      }
      drawWing(hindPath, hind, variant);
      drawWing(forePath, fore, variant);
      ctx.restore();
    }

    ctx.fillStyle = '#2E1E19';
    ctx.beginPath();
    ctx.ellipse(128, 140, 5, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(128, 96, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2E1E19';
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(128 + side * 2, 90);
      ctx.quadraticCurveTo(128 + side * 8, 64, 128 + side * 22, 50);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(128 + side * 22, 50, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class AtmosphericSystem {
  scene: THREE.Scene;
  dustParticles: THREE.Points | null = null;
  glowingHearts: THREE.Group | null = null;
  petals: THREE.Group | null = null;
  butterflies: ButterflyEntity[] = [];
  butterflyMesh: THREE.InstancedMesh | null = null;
  private wingPhaseAttribute: THREE.InstancedBufferAttribute | null = null;
  private readonly instanceMatrix = new THREE.Matrix4();
  private readonly rotationMatrix = new THREE.Matrix4();
  private readonly instanceQuaternion = new THREE.Quaternion();
  private readonly instanceScale = new THREE.Vector3();
  private readonly cameraFacingUp = new THREE.Vector3(0, 0, 1);
  private readonly origin = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
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

  // 4. Butterflies: one instanced, shader-bent quad per butterfly (after klevron/threejs-toys)
  initButterflies() {
    const count = this.butterflyCount;
    if (count <= 0) return;

    // Wings span x in [-1, 1], body runs along z with the head at +z (texture top), flapping displaces y.
    const geometry = new THREE.PlaneGeometry(2, 2, WING_SEGMENTS, WING_SEGMENTS).rotateX(Math.PI / 2);
    const wingPhases = new Float32Array(count);
    const atlasIndexes = new Float32Array(count);
    for (let i = 0; i < count; i++) atlasIndexes[i] = i % WING_VARIANTS.length;
    this.wingPhaseAttribute = new THREE.InstancedBufferAttribute(wingPhases, 1);
    this.wingPhaseAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aWingPhase', this.wingPhaseAttribute);
    geometry.setAttribute('aAtlasIndex', new THREE.InstancedBufferAttribute(atlasIndexes, 1));

    const material = new THREE.MeshBasicMaterial({
      map: createButterflyAtlas(),
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });
    material.onBeforeCompile = (shader) => {
      shader.defines = {
        ...shader.defines,
        WINGS_DX: (2 / WING_SEGMENTS).toFixed(10),
        WINGS_DZ: (2 / WING_SEGMENTS).toFixed(10),
        WING_DISPLACEMENT: WING_DISPLACEMENT.toFixed(10),
        ATLAS_COUNT: WING_VARIANTS.length.toFixed(10),
      };
      shader.vertexShader = `
        attribute float aWingPhase;
        attribute float aAtlasIndex;
      ${shader.vertexShader}`
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          vMapUv.x = (aAtlasIndex + vMapUv.x) / ATLAS_COUNT;`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
          float dx = abs(transformed.x);
          if (dx > 0.0) {
            // Wave travels from the body to the tips and from head to tail
            float sdx = smoothstep(0.0, 1.0 + WINGS_DX, dx);
            float sdz = smoothstep(0.0, 2.0 + WINGS_DZ, transformed.z + 1.0);
            transformed.y = sin(aWingPhase - sdx + sdz) * sdx * WING_DISPLACEMENT;
          }`,
        );
    };

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    this.butterflyMesh = mesh;

    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      const nearBook = i % 3 !== 2;
      const home = new THREE.Vector3(
        side * (nearBook ? 640 + Math.random() * 200 : 980 + Math.random() * 260),
        (Math.random() - 0.5) * 1100,
        nearBook ? 200 + Math.random() * 160 : 260 + Math.random() * 260,
      );
      const position = home.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 80),
      );
      const angle = Math.random() * Math.PI * 2;
      const velocity = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(FLIGHT.minSpeed * 1.5);

      this.butterflies.push({
        position,
        velocity,
        heading: velocity.clone().normalize(),
        home,
        wingPhase: Math.random() * Math.PI * 2,
        size: 18 + Math.random() * 10,
        seed: Math.random() * 100,
      });
    }

    this.writeButterflyInstances();
    this.scene.add(mesh);
  }

  private stepButterflies(dt: number, time: number) {
    const t = time * 0.12;
    for (const b of this.butterflies) {
      const p = b.position;
      const s = FLIGHT.noiseScale;

      // Smooth wandering flow field
      this.scratch.set(
        noise.noise(p.x * s, p.y * s, t + b.seed),
        noise.noise(p.x * s + 31.7, p.y * s, t + b.seed),
        noise.noise(p.x * s, p.y * s + 57.3, t + b.seed) * 0.35,
      );
      b.velocity.addScaledVector(this.scratch, FLIGHT.noiseAccel * dt * 2);

      // Soft pull back towards the butterfly's home area
      this.scratch.subVectors(b.home, p);
      const distance = this.scratch.length();
      const pull = THREE.MathUtils.smoothstep(distance, FLIGHT.homeRadiusInner, FLIGHT.homeRadiusOuter);
      if (distance > 0) b.velocity.addScaledVector(this.scratch.normalize(), pull * FLIGHT.attractAccel * dt);

      // Keep flight mostly parallel to the screen so the wings stay readable
      b.velocity.z = THREE.MathUtils.clamp(b.velocity.z, -FLIGHT.minSpeed * 0.5, FLIGHT.minSpeed * 0.5);

      const speed = b.velocity.length();
      if (speed > FLIGHT.maxSpeed) b.velocity.multiplyScalar(FLIGHT.maxSpeed / speed);
      else if (speed < FLIGHT.minSpeed && speed > 0) b.velocity.multiplyScalar(FLIGHT.minSpeed / speed);

      p.addScaledVector(b.velocity, dt);

      // Bank smoothly towards the flight direction instead of snapping
      this.scratch.copy(b.velocity).normalize();
      b.heading.lerp(this.scratch, 1 - Math.exp(-3 * dt)).normalize();

      // Faster flight -> faster flaps, with a brief glide now and then
      const speedRatio = THREE.MathUtils.clamp(b.velocity.length() / FLIGHT.maxSpeed, 0, 1);
      const glide = THREE.MathUtils.smoothstep(Math.sin(time * 0.5 + b.seed), 0.75, 0.95);
      b.wingPhase = (b.wingPhase + dt * (5 + speedRatio * 9) * (1 - glide * 0.8)) % (Math.PI * 2);
    }
    this.writeButterflyInstances();
  }

  private writeButterflyInstances() {
    const mesh = this.butterflyMesh;
    const phases = this.wingPhaseAttribute;
    if (!mesh || !phases) return;

    this.butterflies.forEach((b, i) => {
      // Forward (+z of the wing quad) along the heading, back of the wings facing the camera (+z world)
      this.rotationMatrix.lookAt(b.heading, this.origin, this.cameraFacingUp);
      this.instanceQuaternion.setFromRotationMatrix(this.rotationMatrix);
      this.instanceScale.setScalar(b.size);
      this.instanceMatrix.compose(b.position, this.instanceQuaternion, this.instanceScale);
      mesh.setMatrixAt(i, this.instanceMatrix);
      phases.setX(i, b.wingPhase);
    });
    mesh.instanceMatrix.needsUpdate = true;
    phases.needsUpdate = true;
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

    // 4. Butterflies wandering along the noise field
    if (dt > 0) this.stepButterflies(dt, time);
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
    if (this.butterflyMesh) {
      const material = this.butterflyMesh.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
      this.butterflyMesh.geometry.dispose();
      this.butterflyMesh.dispose();
      this.scene.remove(this.butterflyMesh);
      this.butterflyMesh = null;
    }
    this.butterflies = [];
  }
}
