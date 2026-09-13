import * as THREE from 'three';
import { Page, rotateY } from './Page';
import SlidingNumber from './SlidingNumber';
import SwipeHandler, { Swipe } from './SwipeHandler';

export class QbjectFlipbook {
  public group: THREE.Group;
  public pages: Page[] = [];
  public spineMesh: THREE.Mesh;
  public progress = new SlidingNumber(0, 0.1, 4);

  public pageWidth = 764;
  public pageHeight = 1080;
  public pageThickness = 1;
  public pageRootThickness = 5;
  public coverThickness = 5;
  public coverMarginX = 8;
  public coverMarginY = 10;
  public spineWidth: number;
  public spineZ: number;

  private swipeHandler?: SwipeHandler;

  constructor(scene: THREE.Scene, containerEl?: HTMLElement) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.spineWidth = 6 * this.pageRootThickness;
    this.spineZ = -this.coverThickness / 2;

    const spineGeo = new THREE.BoxGeometry(
      this.spineWidth,
      this.pageHeight + this.coverMarginY * 2,
      this.coverThickness
    );
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x38161E,
      roughness: 0.65,
      metalness: 0.1,
    });
    this.spineMesh = new THREE.Mesh(spineGeo, spineMat);
    this.spineMesh.receiveShadow = true;
    this.spineMesh.castShadow = true;
    this.spineMesh.position.z = this.spineZ;
    this.spineMesh.renderOrder = 99;
    this.group.add(this.spineMesh);

    if (containerEl) {
      this.initSwipeHandler(containerEl);
    }
  }

  public addPages(pageDefinitions: { frontTexture: THREE.Texture; backTexture: THREE.Texture; isCover?: boolean }[]) {
    const totalPages = pageDefinitions.length;
    this.spineWidth = totalPages * this.pageRootThickness;

    pageDefinitions.forEach((def, index) => {
      const isFrontCover = index === 0;
      const isBackCover = index === totalPages - 1;
      const isCover = isFrontCover || isBackCover;
      const width = isCover ? this.pageWidth + this.coverMarginX + this.coverThickness : this.pageWidth;
      const height = isCover ? this.pageHeight + this.coverMarginY * 2 : this.pageHeight;

      const page = new Page({
        frontTexture: def.frontTexture,
        backTexture: def.backTexture,
        width,
        height,
        thickness: isCover ? this.coverThickness : this.pageThickness,
        rootThickness: isCover ? this.coverThickness : this.pageRootThickness,
        isCover,
        isFrontCover,
        edgeColor: 0xb1a283,
      });

      this.pages.push(page);
    });

    let spinePlacementStart = -this.spineWidth / 2;
    let spinePlacementShift = 0;
    this.pages.forEach((page, index) => {
      this.group.add(page.pivot);

      if (page.isCover) {
        page.pivot.position.z = this.coverThickness;
        page.pivot.position.x = (this.spineWidth / 2) * (index ? 1 : -1);
      } else {
        const elevationLeft = spinePlacementShift + page.rootThickness / 2;
        const elevationRight = this.spineWidth - elevationLeft;
        const elevationMultiplier = 0.7;
        page.setElevation(
          elevationLeft * elevationMultiplier,
          elevationRight * elevationMultiplier
        );

        page.pivot.position.z = this.spineZ + this.coverThickness / 2;
        page.pivot.position.x = spinePlacementStart + spinePlacementShift + page.rootThickness / 2;
        spinePlacementShift += page.rootThickness;
      }
    });

    this.progress.setMin(0);
    this.progress.setMax(this.pages.length);
    this.update(0.016);
  }

  public initSwipeHandler(el: HTMLElement) {
    this.swipeHandler = new SwipeHandler(el);

    this.swipeHandler.on('swipeMove', (swipe: Swipe) => {
      const deltaX = swipe.x - swipe.prevX;
      if (!deltaX) return;

      const progressDelta = -deltaX / (window.innerWidth * 0.45);

      if (!this.progress.locked) {
        this.progress.lock();

        if (progressDelta > 0) {
          this.progress.setMin(this.progress.getValue());
          this.progress.setMax(this.progress.getValue() + 1);
        } else {
          this.progress.setMin(this.progress.getValue() - 1);
          this.progress.setMax(this.progress.getValue());
        }

        if (this.progress.minValue < 0) {
          this.progress.setMin(0);
          this.progress.setMax(1);
        } else if (this.progress.maxValue > this.pages.length) {
          this.progress.setMin(this.pages.length - 1);
          this.progress.setMax(this.pages.length);
        }
      }

      this.progress.nudge(progressDelta);
    });

    this.swipeHandler.on('swipeEnd', () => {
      this.progress.unlock();
      const current = this.progress.getValue();
      const nearest = Math.round(current);
      this.turnToPage(nearest);
    });
  }

  public turnToPage(index: number) {
    this.progress.unlock();
    this.progress.setMin(0);
    this.progress.setMax(this.pages.length);
    this.progress.setValue(index);
  }

  public nudgePage(delta: number) {
    this.progress.unlock();
    const target = Math.max(0, Math.min(this.pages.length, Math.round(this.progress.getValue() + delta)));
    this.progress.setValue(target);
  }

  public update(dt: number) {
    this.progress.update(dt);
    const val = this.progress.getValue();

    const bookOpenFactor = Math.min(val, this.pages.length - val, 1);

    this.pages.forEach((page, index) => {
      let tp;
      if (index >= val) {
        tp = bookOpenFactor;
      } else if (index < Math.floor(val)) {
        tp = -bookOpenFactor;
      } else {
        if (page.isCover) {
          tp = index ? bookOpenFactor : -bookOpenFactor;
        } else {
          tp = (val % 1) * -2 + 1;
        }
      }

      page.setTurnProgress(tp);
      page.bendingEnabled = val >= 1 && val <= this.pages.length - 1;
      page.mesh.renderOrder = Math.abs(val - 0.5 - index);

      if (page.needsUpdate()) {
        page.update(dt);
      }
    });

    let bookAngle = 0;
    if (val < 1) {
      bookAngle = 1 - val;
    } else if (val > this.pages.length - 1) {
      bookAngle = this.pages.length - 1 - val;
    }
    bookAngle *= Math.PI / 2;
    this.group.rotation.y = bookAngle;

    const pivot = new THREE.Vector3(this.spineWidth / 2, 0, this.coverThickness);
    if (bookAngle < 0) {
      pivot.x = -pivot.x;
    }
    const newPoint = rotateY(new THREE.Vector3(0, 0, 0), pivot, -bookAngle);
    this.group.position.x = newPoint.x;
    this.group.position.z = newPoint.z;
  }

  public destroy() {
    this.pages.forEach((p) => p.destroy());
    this.spineMesh.geometry.dispose();
    (this.spineMesh.material as THREE.Material).dispose();
  }
}
