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
// Pastel watercolor butterflies generated for this site (same style as the foliage atlas),
// packed left to right into one strip, head towards the top and body centred in each 256px cell.
const BUTTERFLY_ATLAS_URL = '/butterflies/atlas.webp';
const BUTTERFLY_ATLAS_COUNT = 6;
// Watercolor blossoms (0-4) and autumn leaves (5-8), generated for this site, one 256px cell each.
const FOLIAGE_ATLAS_URL = '/foliage/atlas.webp';
const FOLIAGE_ATLAS_COUNT = 9;
// Sizes in world units; butterflies span 84-112, so petals stay well below that.
const FOLIAGE_KINDS = [
  { indexes: [2, 3], minSize: 28, maxSize: 38, fallSpeed: 42, sway: 60 }, // loose petals
  { indexes: [0, 1, 4], minSize: 38, maxSize: 50, fallSpeed: 50, sway: 45 }, // whole blossoms
  { indexes: [2, 3], minSize: 28, maxSize: 38, fallSpeed: 42, sway: 60 },
  { indexes: [5, 6, 7, 8], minSize: 54, maxSize: 70, fallSpeed: 64, sway: 75 }, // leaves
];

interface FoliageEntity {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
  fallSpeed: number;
  drift: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmount: number;
  nearBook: boolean;
}

const FLIGHT = {
  homeRadiusInner: 220,
  homeRadiusOuter: 420,
  noiseScale: 1 / 220,
  noiseAccel: 90,
  attractAccel: 260,
  maxSpeed: 150,
  minSpeed: 45,
};

export class AtmosphericSystem {
  scene: THREE.Scene;
  dustParticles: THREE.Points | null = null;
  glowingHearts: THREE.Group | null = null;
  foliageMesh: THREE.InstancedMesh | null = null;
  private foliage: FoliageEntity[] = [];
  private readonly shade = new THREE.Color();
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
  private activeButterflies = Infinity;
  private activeFoliage = Infinity;
  private activeDust = Infinity;

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

  // 2. Falling blossoms, petals and autumn leaves: one instanced, slightly curled quad each
  initPetals() {
    const count = this.configuredPetalCount ?? (this.compact ? 16 : 34);
    if (count <= 0) return;

    const geometry = new THREE.PlaneGeometry(1, 1, 4, 4);
    const atlasIndexes = new Float32Array(count);
    const curls = new Float32Array(count);

    const mesh = new THREE.InstancedMesh(geometry, undefined, count);
    mesh.visible = false;
    const atlas = new THREE.TextureLoader().load(FOLIAGE_ATLAS_URL, () => {
      if (this.foliageMesh === mesh) mesh.visible = true;
    });
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = 4;

    const material = new THREE.MeshBasicMaterial({
      map: atlas,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.4,
    });
    material.onBeforeCompile = (shader) => {
      shader.defines = { ...shader.defines, ATLAS_COUNT: FOLIAGE_ATLAS_COUNT.toFixed(10) };
      shader.vertexShader = `
        attribute float aAtlasIndex;
        attribute float aCurl;
      ${shader.vertexShader}`
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          vMapUv.x = (aAtlasIndex + vMapUv.x) / ATLAS_COUNT;`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
          // Cup the sprite so it reads as a real petal/leaf while tumbling
          transformed.z += aCurl * (transformed.x * transformed.x + transformed.y * transformed.y * 0.4);`,
        );
    };
    mesh.material = material;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    this.foliageMesh = mesh;

    for (let i = 0; i < count; i++) {
      const kind = FOLIAGE_KINDS[i % FOLIAGE_KINDS.length];
      const index = kind.indexes[Math.floor(Math.random() * kind.indexes.length)];
      atlasIndexes[i] = index;
      curls[i] = (Math.random() * 0.5 + 0.15) * (Math.random() < 0.5 ? -1 : 1);

      const nearBook = i % 3 === 0;
      const position = new THREE.Vector3();
      this.respawnFoliage(position, nearBook, Math.random() * 2200 - 600);
      this.foliage.push({
        position,
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        spin: new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.4),
        size: kind.minSize + Math.random() * (kind.maxSize - kind.minSize),
        fallSpeed: kind.fallSpeed * (0.8 + Math.random() * 0.5),
        drift: (Math.random() - 0.5) * 20,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.9 + Math.random() * 0.9,
        swayAmount: kind.sway * (0.7 + Math.random() * 0.6),
        nearBook,
      });
      mesh.setColorAt(i, this.shade.setScalar(1));
    }
    geometry.setAttribute('aAtlasIndex', new THREE.InstancedBufferAttribute(atlasIndexes, 1));
    geometry.setAttribute('aCurl', new THREE.InstancedBufferAttribute(curls, 1));

    this.writeFoliageInstances();
    this.scene.add(mesh);
  }

  private respawnFoliage(position: THREE.Vector3, nearBook: boolean, y: number) {
    const side = Math.random() < 0.5 ? -1 : 1;
    position.set(
      side * (nearBook ? 150 + Math.random() * 550 : 650 + Math.random() * 650),
      y,
      100 + Math.random() * 500,
    );
  }

  private stepFoliage(dt: number) {
    const count = Math.min(this.activeFoliage, this.foliage.length);
    for (let i = 0; i < count; i++) {
      const f = this.foliage[i];
      f.swayPhase += f.swaySpeed * dt;
      const sway = Math.sin(f.swayPhase);
      f.position.y -= f.fallSpeed * dt;
      f.position.x += (sway * f.swayAmount + f.drift) * dt;
      f.position.z += Math.cos(f.swayPhase) * f.swayAmount * 0.4 * dt;

      f.rotation.x += f.spin.x * dt;
      f.rotation.y += (f.spin.y + sway * 0.6) * dt;
      f.rotation.z += f.spin.z * dt;

      if (f.position.y < -1200) this.respawnFoliage(f.position, f.nearBook, 1400);
    }
    this.writeFoliageInstances();
  }

  private writeFoliageInstances() {
    const mesh = this.foliageMesh;
    if (!mesh) return;
    const count = Math.min(this.activeFoliage, this.foliage.length);
    for (let i = 0; i < count; i++) {
      const f = this.foliage[i];
      this.instanceQuaternion.setFromEuler(f.rotation);
      this.instanceScale.setScalar(f.size);
      this.instanceMatrix.compose(f.position, this.instanceQuaternion, this.instanceScale);
      mesh.setMatrixAt(i, this.instanceMatrix);
      // Fake lighting: darken as the sprite turns edge-on to the camera
      this.scratch.set(0, 0, 1).applyQuaternion(this.instanceQuaternion);
      mesh.setColorAt(i, this.shade.setScalar(0.72 + 0.28 * Math.abs(this.scratch.z)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
    for (let i = 0; i < count; i++) atlasIndexes[i] = i % BUTTERFLY_ATLAS_COUNT;
    this.wingPhaseAttribute = new THREE.InstancedBufferAttribute(wingPhases, 1);
    this.wingPhaseAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aWingPhase', this.wingPhaseAttribute);
    geometry.setAttribute('aAtlasIndex', new THREE.InstancedBufferAttribute(atlasIndexes, 1));

    const mesh = new THREE.InstancedMesh(geometry, undefined, count);
    // Stay hidden until the photos arrive, otherwise the quads render as solid squares
    mesh.visible = false;
    const atlas = new THREE.TextureLoader().load(BUTTERFLY_ATLAS_URL, () => {
      if (this.butterflyMesh === mesh) mesh.visible = true;
    });
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = 4;

    const material = new THREE.MeshBasicMaterial({
      map: atlas,
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
        ATLAS_COUNT: BUTTERFLY_ATLAS_COUNT.toFixed(10),
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

    mesh.material = material;
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
        size: 42 + Math.random() * 14,
        seed: Math.random() * 100,
      });
    }

    this.writeButterflyInstances();
    this.scene.add(mesh);
  }

  private stepButterflies(dt: number, time: number) {
    const t = time * 0.12;
    const count = Math.min(this.activeButterflies, this.butterflies.length);
    for (let i = 0; i < count; i++) {
      const b = this.butterflies[i];
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

    const count = Math.min(this.activeButterflies, this.butterflies.length);
    for (let i = 0; i < count; i++) {
      const b = this.butterflies[i];
      // Forward (+z of the wing quad) along the heading, back of the wings facing the camera (+z world)
      this.rotationMatrix.lookAt(b.heading, this.origin, this.cameraFacingUp);
      this.instanceQuaternion.setFromRotationMatrix(this.rotationMatrix);
      this.instanceScale.setScalar(b.size);
      this.instanceMatrix.compose(b.position, this.instanceQuaternion, this.instanceScale);
      mesh.setMatrixAt(i, this.instanceMatrix);
      phases.setX(i, b.wingPhase);
    }
    mesh.instanceMatrix.needsUpdate = true;
    phases.needsUpdate = true;
  }

  /** Scale how many of the configured butterflies / petals / dust particles are simulated and drawn. */
  setQuality(share: number) {
    const scaled = (total: number) => (total > 0 ? Math.max(1, Math.round(total * share)) : 0);
    this.activeButterflies = scaled(this.butterflies.length);
    if (this.butterflyMesh) this.butterflyMesh.count = this.activeButterflies;
    this.activeFoliage = scaled(this.foliage.length);
    if (this.foliageMesh) this.foliageMesh.count = this.activeFoliage;
    if (this.dustParticles) {
      const total = this.dustParticles.geometry.attributes.position.count;
      this.activeDust = scaled(total);
      this.dustParticles.geometry.setDrawRange(0, this.activeDust);
    }
  }

  update(time: number, mouseParallax: { x: number; y: number }) {
    if (this.reducedMotion) return;
    const elapsed = this.lastTime === undefined ? 0 : time - this.lastTime;
    this.lastTime = time;
    // Skip only real pauses (hidden tab); slow frames are clamped instead, otherwise
    // machines that regularly take >0.25s per frame would see everything frozen.
    const dt = elapsed > 1 ? 0 : THREE.MathUtils.clamp(elapsed, 0, 0.1);
    const frame = dt * 60;
    this.motionTime += dt;
    time = this.motionTime;
    // 1. Dust motion
    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position.array as Float32Array;
      const dustCount = Math.min(this.activeDust, pos.length / 3);
      for (let i = 0; i < dustCount; i++) {
        pos[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.8 * frame;
        pos[i * 3] += (Math.cos(time * 0.3 + i) * 0.5 + mouseParallax.x * 0.4) * frame;
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Blossoms and leaves tumbling down
    if (dt > 0) this.stepFoliage(dt);

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
      const material = this.dustParticles.material as THREE.PointsMaterial;
      material.map?.dispose();
      material.dispose();
      this.scene.remove(this.dustParticles);
      this.dustParticles = null;
    }
    if (this.foliageMesh) {
      const material = this.foliageMesh.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
      this.foliageMesh.geometry.dispose();
      this.foliageMesh.dispose();
      this.scene.remove(this.foliageMesh);
      this.foliageMesh = null;
    }
    this.foliage = [];
    if (this.glowingHearts) {
      this.glowingHearts.children.forEach((h) => {
        const m = h as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      this.scene.remove(this.glowingHearts);
      this.glowingHearts = null;
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
    this.wingPhaseAttribute = null;
  }
}
