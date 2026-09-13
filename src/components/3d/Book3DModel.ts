import * as THREE from 'three';

export interface BookMeshes {
  bookRoot: THREE.Group;
  spine: THREE.Mesh;
  backCover: THREE.Mesh;
  frontCover: THREE.Group;
  leftPageStack: THREE.Mesh;
  rightPageStack: THREE.Mesh;
  flipperPage: THREE.Mesh;
}

export class Book3DModel {
  scene: THREE.Scene;
  group: THREE.Group;
  frontCoverPivot: THREE.Group;
  flipperPivot: THREE.Group;
  flipperMesh: THREE.Mesh;
  flipperGeo: THREE.PlaneGeometry;
  
  // Dimensions
  pageWidth = 3.6;
  pageHeight = 4.8;
  coverThickness = 0.08;
  stackThickness = 0.16;
  spineRadius = 0.22;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.frontCoverPivot = new THREE.Group();
    this.flipperPivot = new THREE.Group();

    // 1. Materials (Tactile Paper, Vintage Leather & Gilded Details)
    const coverMaterial = new THREE.MeshStandardMaterial({
      color: 0x3A2127, // Deep rich wine/rosewood leather
      roughness: 0.72,
      metalness: 0.05,
    });

    const pagePaperMaterial = new THREE.MeshStandardMaterial({
      color: 0xF4EDE2, // Vintage warm paper
      roughness: 0.88,
      metalness: 0.02,
    });

    const pageEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xD8C5AA, // Layered paper edge texture
      roughness: 0.95,
    });

    const goldAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xB49A6A, // Vintage warm gold
      roughness: 0.35,
      metalness: 0.65,
    });

    // 2. Spine
    const spineGeo = new THREE.CylinderGeometry(
      this.spineRadius,
      this.spineRadius,
      this.pageHeight + 0.15,
      16,
      1,
      true,
      -Math.PI / 2,
      Math.PI
    );
    const spine = new THREE.Mesh(spineGeo, coverMaterial);
    spine.rotation.y = Math.PI / 2;
    this.group.add(spine);

    // Spine gold ornament bands
    for (let i = -1.8; i <= 1.8; i += 1.2) {
      const ringGeo = new THREE.TorusGeometry(this.spineRadius + 0.005, 0.015, 8, 24, Math.PI);
      const ring = new THREE.Mesh(ringGeo, goldAccentMaterial);
      ring.position.y = i;
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = Math.PI / 2;
      this.group.add(ring);
    }

    // 3. Back Cover (Rigid bottom base)
    const coverGeo = new THREE.BoxGeometry(this.pageWidth + 0.1, this.pageHeight + 0.15, this.coverThickness);
    const backCover = new THREE.Mesh(coverGeo, coverMaterial);
    backCover.position.set(0, -this.stackThickness - this.coverThickness / 2, 0);
    // Left & Right spread covers
    const leftCover = backCover.clone();
    leftCover.position.x = -this.pageWidth / 2 - this.spineRadius;
    const rightCover = backCover.clone();
    rightCover.position.x = this.pageWidth / 2 + this.spineRadius;
    this.group.add(leftCover);
    this.group.add(rightCover);

    // 4. Page Stacks (Left & Right solid blocks of paper)
    const stackGeo = new THREE.BoxGeometry(this.pageWidth, this.pageHeight, this.stackThickness);
    const stackMaterials = [
      pageEdgeMaterial, // right
      pageEdgeMaterial, // left
      pageEdgeMaterial, // top
      pageEdgeMaterial, // bottom
      pagePaperMaterial, // front (reading surface)
      pageEdgeMaterial, // back
    ];

    const leftStack = new THREE.Mesh(stackGeo, stackMaterials);
    leftStack.position.set(-this.pageWidth / 2 - this.spineRadius, -this.stackThickness / 2, 0);

    const rightStack = new THREE.Mesh(stackGeo, stackMaterials);
    rightStack.position.set(this.pageWidth / 2 + this.spineRadius, -this.stackThickness / 2, 0);

    this.group.add(leftStack);
    this.group.add(rightStack);

    // 5. Front Cover (Rotates when opening book)
    const frontCoverMesh = new THREE.Mesh(coverGeo, coverMaterial);
    frontCoverMesh.position.set(this.pageWidth / 2, 0, this.coverThickness / 2);

    // Gold emblem on front cover
    const emblemGeo = new THREE.RingGeometry(0.35, 0.42, 32);
    const emblem = new THREE.Mesh(emblemGeo, goldAccentMaterial);
    emblem.position.set(this.pageWidth / 2, 0.4, this.coverThickness / 2 + 0.01);
    this.frontCoverPivot.add(emblem);

    this.frontCoverPivot.position.set(-this.spineRadius, this.stackThickness, 0);
    this.frontCoverPivot.add(frontCoverMesh);
    this.group.add(this.frontCoverPivot);

    // 6. Subdivided Flipper Page with dynamic Curvature Deformation
    const segmentsX = 24;
    const segmentsY = 16;
    this.flipperGeo = new THREE.PlaneGeometry(this.pageWidth, this.pageHeight, segmentsX, segmentsY);
    // Pivot at spine edge (x = 0)
    this.flipperGeo.translate(this.pageWidth / 2, 0, 0);

    const flipperMat = new THREE.MeshStandardMaterial({
      color: 0xF4EDE2,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    this.flipperMesh = new THREE.Mesh(this.flipperGeo, flipperMat);
    this.flipperPivot.position.set(this.spineRadius, 0.01, 0);
    this.flipperPivot.add(this.flipperMesh);
    this.flipperPivot.visible = false; // Hidden when resting
    this.group.add(this.flipperPivot);

    // Add entire book to scene
    this.scene.add(this.group);
  }

  // Set opening angle: 0 = fully closed, 1 = fully open spread
  setCoverOpenProgress(progress: number) {
    // 0: closed on top of right page (angle 0)
    // 1: swung completely to left (angle -PI)
    const angle = -Math.PI * Math.min(1, Math.max(0, progress));
    this.frontCoverPivot.rotation.y = angle;
    // Cover rests under left stack when fully open
    this.frontCoverPivot.visible = progress < 0.99;
  }

  // Dynamic Page Flip with realistic curling deformation
  setPageFlipProgress(progress: number, direction: 'forward' | 'backward' = 'forward') {
    if (progress <= 0 || progress >= 1) {
      this.flipperPivot.visible = false;
      return;
    }

    this.flipperPivot.visible = true;

    // Flip angle from 0 (resting right) to -Math.PI (resting left)
    const flipAngle = direction === 'forward'
      ? -Math.PI * progress
      : -Math.PI * (1 - progress);

    this.flipperPivot.rotation.y = flipAngle;

    // Vertex deformation (curling paper effect based on sine wave of rotation angle)
    const positions = this.flipperGeo.attributes.position;
    const count = positions.count;
    const midCurl = Math.sin(progress * Math.PI); // Max at 50% flip

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      // More deformation toward the outer free edge of page (x -> pageWidth)
      const normalizedX = x / this.pageWidth;
      const wave = Math.sin(normalizedX * Math.PI * 0.8) * midCurl * 0.45;
      const cornerCurl = Math.pow(normalizedX, 2) * (y / this.pageHeight) * midCurl * 0.25;

      positions.setZ(i, wave + cornerCurl);
    }
    positions.needsUpdate = true;
    this.flipperGeo.computeVertexNormals();
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
