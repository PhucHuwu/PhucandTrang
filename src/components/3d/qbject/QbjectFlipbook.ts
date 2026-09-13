import * as THREE from 'three';
import { QbjectPage } from './QbjectPage';
import { SlidingNumber, clamp } from './util';

export class QbjectFlipbook {
  public group: THREE.Group;
  public pages: QbjectPage[] = [];
  public spineMesh: THREE.Mesh;
  public progress = new SlidingNumber(0, 0.12, 5);

  public pageWidth = 2.2;
  public pageHeight = 3.0;
  public totalPages = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // Realistic rounded leather spine
    const spineGeo = new THREE.CylinderGeometry(0.12, 0.12, this.pageHeight + 0.1, 16, 1, true, -Math.PI / 2, Math.PI);
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x2A1015,
      roughness: 0.65,
      metalness: 0.1,
    });
    this.spineMesh = new THREE.Mesh(spineGeo, spineMat);
    this.spineMesh.rotation.y = Math.PI / 2;
    this.spineMesh.position.set(0, 0, -0.05);
    this.group.add(this.spineMesh);
  }

  public addPages(pageDefinitions: { frontTexture: THREE.Texture; backTexture: THREE.Texture; isCover?: boolean }[]) {
    this.totalPages = pageDefinitions.length;

    pageDefinitions.forEach((def, index) => {
      const isFrontCover = index === 0;
      const isBackCover = index === this.totalPages - 1;
      const isCover = isFrontCover || isBackCover;

      const page = new QbjectPage({
        frontTexture: def.frontTexture,
        backTexture: def.backTexture,
        width: this.pageWidth,
        height: this.pageHeight,
        isCover,
        isFrontCover,
        thickness: isCover ? 0.024 : 0.008,
        rootThickness: isCover ? 0.024 : 0.016,
      });

      // Layered Z elevation on shelf
      page.elevationLeft = 0.04 + index * 0.006;
      page.elevationRight = 0.04 + (this.totalPages - index) * 0.006;

      page.pivot.position.set(0, 0, 0);
      this.group.add(page.pivot);
      this.pages.push(page);
    });
  }

  public setPageIndex(targetIndex: number) {
    this.progress.setTarget(clamp(targetIndex, 0, this.totalPages));
  }

  public update(dt: number) {
    this.progress.update(dt);
    const currentProg = this.progress.value;

    this.pages.forEach((page, index) => {
      // Map progress to turn progress: 1 = right (unturned), -1 = left (turned)
      const pageTurn = clamp((index + 1 - currentProg), -1, 1);
      page.turnProgress = pageTurn;
      page.update(dt);
    });
  }

  public destroy() {
    this.pages.forEach((p) => p.destroy());
    this.spineMesh.geometry.dispose();
    (this.spineMesh.material as THREE.Material).dispose();
  }
}
