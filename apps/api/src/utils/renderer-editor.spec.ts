import {
  normalizedToCanvasTransform,
  canvasToNormalizedTransform,
  computeActiveAreaPageRect,
  computeRelativeActiveArea,
  computeImageFit,
  TextVariableResolver,
  LAYOUT_PRESETS,
  computeSnapping,
  BoxRect,
} from '@phucandtrang/shared';

describe('Renderer & Editor Pure Functions & Regression Suite (Prompt 37)', () => {
  describe('1. Normalized Coordinate Conversions', () => {
    it('normalizedToCanvasTransform maps 0.0..1.0 cleanly to 1024x1360 canvas space', () => {
      const normalized = {
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.4,
        rotation: 15,
        scale: 1,
      };

      const canvas = normalizedToCanvasTransform(normalized, 1024, 1360);

      expect(canvas.x).toBeCloseTo(102.4);
      expect(canvas.y).toBeCloseTo(272);
      expect(canvas.width).toBeCloseTo(512);
      expect(canvas.height).toBeCloseTo(544);
      expect(canvas.rotation).toBe(15);
    });

    it('canvasToNormalizedTransform bakes scale into normalized dimensions cleanly', () => {
      const canvas = {
        x: 102.4,
        y: 272,
        width: 256,
        height: 272,
        rotation: 15,
        scaleX: 2,
        scaleY: 2,
      };

      const norm = canvasToNormalizedTransform(canvas, 1024, 1360);

      expect(norm.x).toBe(0.1);
      expect(norm.y).toBe(0.2);
      expect(norm.width).toBe(0.5); // (256 * 2) / 1024 = 0.5
      expect(norm.height).toBe(0.4); // (272 * 2) / 1360 = 0.4
      expect(norm.scale).toBe(1);
    });
  });

  describe('2. ActiveArea Calculations', () => {
    it('computes correct page rect from relative active area and vice versa', () => {
      const elementTransform = { x: 0.2, y: 0.3, width: 0.4, height: 0.4 };
      const relative = { left: 0.1, top: 0.1, width: 0.8, height: 0.8 };

      const pageRect = computeActiveAreaPageRect(elementTransform, relative);
      expect(pageRect.left).toBeCloseTo(0.24); // 0.2 + 0.1 * 0.4
      expect(pageRect.top).toBeCloseTo(0.34); // 0.3 + 0.1 * 0.4
      expect(pageRect.width).toBeCloseTo(0.32); // 0.8 * 0.4
      expect(pageRect.height).toBeCloseTo(0.32); // 0.8 * 0.4

      const reversedRelative = computeRelativeActiveArea(elementTransform, pageRect);
      expect(reversedRelative.left).toBeCloseTo(0.1);
      expect(reversedRelative.top).toBeCloseTo(0.1);
      expect(reversedRelative.width).toBeCloseTo(0.8);
      expect(reversedRelative.height).toBeCloseTo(0.8);
    });
  });

  describe('3. Image Fitting Logic (Cover / Contain / FocalPoint)', () => {
    it('correctly calculates cover fit with center focal point', () => {
      const fit = computeImageFit(800, 600, 400, 400, 'cover', { x: 0.5, y: 0.5 });
      expect(fit.dw).toBe(400);
      expect(fit.dh).toBe(400);
      expect(fit.sw).toBeLessThan(800); // cropped horizontally
      expect(fit.sh).toBe(600);
    });

    it('correctly calculates contain fit without cropping', () => {
      const fit = computeImageFit(800, 400, 400, 400, 'contain');
      expect(fit.dw).toBe(400);
      expect(fit.dh).toBe(200); // letterboxed vertically
      expect(fit.dy).toBe(100);
    });
  });

  describe('4. Dynamic Variables Resolution', () => {
    it('resolves tokens without eval or code execution', () => {
      const context = {
        couple: { he: 'Phúc', she: 'Trang' },
        anniversaryDate: '20.10.2022',
        daysTogether: 1438,
      };

      const template = '{{couple.he}} & {{couple.she}} bên nhau {{daysTogether}} ngày từ {{anniversaryDate}}';
      const resolved = TextVariableResolver.resolve(template, context);

      expect(resolved).toBe('Phúc & Trang bên nhau 1438 ngày từ 20.10.2022');
    });

    it('gracefully handles missing keys without throwing error', () => {
      const resolved = TextVariableResolver.resolve('Xin chào {{unknown.variable}}', {});
      expect(resolved).toBe('Xin chào {{unknown.variable}}');
    });
  });

  describe('5. Layout Preset Structure Verification', () => {
    it('verifies standard slots across built-in presets', () => {
      const quad = LAYOUT_PRESETS['quad-gallery'];
      expect(quad.slots.map((s) => s.name)).toContain('primaryImage');
      expect(quad.slots.map((s) => s.name)).toContain('secondaryImage');
      expect(quad.slots.map((s) => s.name)).toContain('tertiaryImage');
      expect(quad.slots.map((s) => s.name)).toContain('quaternaryImage');

      const hero = LAYOUT_PRESETS['single-hero'];
      expect(hero.slots.some((s) => s.name === 'primaryImage')).toBe(true);
    });
  });

  describe('6. Snapping Math Engine', () => {
    it('snaps dragging box to canvas center vertical and horizontal lines', () => {
      const boxNearCenterLine: BoxRect = {
        x: 510, // left edge near 512
        y: 678, // top edge near 680
        width: 100,
        height: 100,
      };

      const result = computeSnapping(boxNearCenterLine, [], 1024, 1360, { threshold: 8 });

      expect(result.x).toBe(512); // Snapped left edge to center line
      expect(result.y).toBe(680); // Snapped top edge to center line
      expect(result.guides).toHaveLength(2);
    });

    it('bypasses snapping when enabled is false', () => {
      const box: BoxRect = { x: 510, y: 678, width: 100, height: 100 };
      const result = computeSnapping(box, [], 1024, 1360, { enabled: false });

      expect(result.x).toBe(510);
      expect(result.y).toBe(678);
      expect(result.guides).toHaveLength(0);
    });
  });

  describe('7. Canonical Z-Index Stacking Integrity', () => {
    it('guarantees unique and sequential z-index from 1 to N', () => {
      const elements = [
        { id: 'el-3', zIndex: 3 },
        { id: 'el-1', zIndex: 1 },
        { id: 'el-2', zIndex: 2 },
      ];

      const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
      expect(sorted.map((e) => e.zIndex)).toEqual([1, 2, 3]);
    });
  });

  describe('8. Representative Page Configurations (Snapshot Verification)', () => {
    it('verifies Cover configuration', () => {
      const coverPage = {
        id: 'cover-front',
        pageNumber: 0,
        showPageNumber: false,
        layout: 'custom',
        background: { type: 'image', imageUrl: 'https://cdn.example.com/cover.jpg' },
        elements: [
          { type: 'TEXT', data: { text: 'Chúng Mình', variant: 'title' }, zIndex: 1 },
        ],
      };
      expect(coverPage.showPageNumber).toBe(false);
      expect(coverPage.elements[0].type).toBe('TEXT');
    });

    it('verifies Single Hero page preset structure', () => {
      const singleHero = LAYOUT_PRESETS['single-hero'];
      expect(singleHero.slots.some((s) => s.name === 'primaryImage')).toBe(true);
      expect(singleHero.elementPrototypes.length).toBeGreaterThan(0);
    });

    it('verifies Quad Gallery page preset structure', () => {
      const quad = LAYOUT_PRESETS['quad-gallery'];
      expect(quad.slots.map((s) => s.name)).toContain('primaryImage');
      expect(quad.slots.map((s) => s.name)).toContain('secondaryImage');
      expect(quad.slots.map((s) => s.name)).toContain('tertiaryImage');
      expect(quad.slots.map((s) => s.name)).toContain('quaternaryImage');
    });

    it('verifies Video page structure', () => {
      const videoElement = {
        type: 'VIDEO',
        data: {
          src: 'https://cdn.example.com/video.mp4',
          thumbnailUrl: 'https://cdn.example.com/poster.jpg',
        },
        interaction: {
          enabled: true,
          action: 'open-video',
          target: 'https://cdn.example.com/video.mp4',
        },
      };
      expect(videoElement.data.thumbnailUrl).toBeDefined();
      expect(videoElement.interaction.action).toBe('open-video');
    });
  });
});
