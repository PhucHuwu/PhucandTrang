import * as THREE from 'three';

export interface PageMediaItem {
  src: string;
  caption?: string;
  isVideo?: boolean;
}

export type PageLayoutType = 
  | 'auto'
  | 'single-hero'       // 1 ảnh lớn tràn viền trang nhã (3:4 hoặc 9:16)
  | 'dual-stacked'      // 2 ảnh ngang/vuông xếp trên dưới
  | 'dual-columns'      // 2 ảnh dọc thanh mảnh đứng cạnh nhau
  | 'asymmetric-featured' // 1 ảnh lớn chủ đạo + 2 ảnh nhỏ bên cạnh
  | 'scrapbook-trio'    // 3 ảnh so le phong cách dán ảnh scrapbook
  | 'quad-gallery'      // Lưới 4 ảnh polaroid thanh lịch
  | 'diagonal-duo';     // 2 ảnh góc nghiêng đè nhẹ nghệ thuật

export class PageTextureGenerator {
  static createCoverTexture(photoSrc: string): Promise<THREE.CanvasTexture> {
    return new Promise(async (resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1360;
      const ctx = canvas.getContext('2d')!;

      // Ensure custom font 2.otf (SVN-Housttely Signature) is fully loaded in browser
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.load('60px "SVN-Housttely Signature"');
          await document.fonts.load('60px "Coldwell Bridges"');
          await document.fonts.ready;
        } catch (err) {
          console.log('Font load check:', err);
        }
      }

      // Calculate days together from 2022-10-20 to today
      const startDate = new Date('2022-10-20T00:00:00').getTime();
      const now = new Date().getTime();
      const daysTogether = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));

      const renderCover = (img?: HTMLImageElement) => {
        if (img) {
          // Draw full photo cover with object-fit: cover
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const srcRatio = srcW / srcH;
          const destRatio = 1024 / 1360;

          let sX = 0, sY = 0, sW = srcW, sH = srcH;
          if (srcRatio > destRatio) {
            sW = srcH * destRatio;
            sX = (srcW - sW) / 2;
          } else {
            sH = srcW / destRatio;
            sY = (srcH - sH) / 2;
          }
          ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 1024, 1360);
        } else {
          // Fallback background
          const grad = ctx.createLinearGradient(0, 0, 1024, 1360);
          grad.addColorStop(0, '#FFE8EE');
          grad.addColorStop(1, '#F7D6DE');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1024, 1360);
        }

        // Ultra-smooth seamless feathering vignette directly under text cluster (zero visible borders)
        ctx.save();
        const textVignette = ctx.createRadialGradient(200, 840, 0, 200, 840, 480);
        textVignette.addColorStop(0, 'rgba(10, 5, 8, 0.65)');
        textVignette.addColorStop(0.25, 'rgba(10, 5, 8, 0.45)');
        textVignette.addColorStop(0.55, 'rgba(10, 5, 8, 0.20)');
        textVignette.addColorStop(0.8, 'rgba(10, 5, 8, 0.06)');
        textVignette.addColorStop(1, 'rgba(10, 5, 8, 0.0)');
        ctx.fillStyle = textVignette;
        ctx.fillRect(0, 380, 680, 880);
        ctx.restore();

        // 1. "CHÚNG MÌNH" Title with exact font public/font/2.otf ("SVN-Housttely Signature")
        ctx.save();
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'normal 60px "SVN-Housttely Signature", "Coldwell Bridges", cursive, serif';
        ctx.letterSpacing = '1px';
        ctx.fillText('Chúng Mình', 70, 780);

        // Subtle rose-gold accent line
        ctx.strokeStyle = '#F0B6C3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(70, 850);
        ctx.lineTo(340, 850);
        ctx.stroke();

        // 2. Love Counter: Days together from 20.10.2022
        ctx.fillStyle = '#FFE5B4'; // Warm champagne gold
        ctx.font = 'bold 32px "Montserrat", sans-serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(`${daysTogether.toLocaleString()} NGÀY`, 70, 900);

        ctx.fillStyle = 'rgba(255, 245, 247, 0.85)';
        ctx.font = 'italic 24px "Dancing Script", cursive';
        ctx.fillText('Bên nhau từ ngày 20.10.2022', 70, 930);

        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => renderCover(img);
      img.onerror = () => renderCover();
      img.src = photoSrc;
    });
  }

  static createBackCoverTexture(photoSrc: string, isInside: boolean = false): Promise<THREE.CanvasTexture> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1360;
      const ctx = canvas.getContext('2d')!;

      const renderBack = (img?: HTMLImageElement) => {
        if (img) {
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const srcRatio = srcW / srcH;
          const destRatio = 1024 / 1360;

          let sX = 0, sY = 0, sW = srcW, sH = srcH;
          if (srcRatio > destRatio) {
            sW = srcH * destRatio;
            sX = (srcW - sW) / 2;
          } else {
            sH = srcW / destRatio;
            sY = (srcH - sH) / 2;
          }
          ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 1024, 1360);
        } else {
          ctx.fillStyle = '#1A1215';
          ctx.fillRect(0, 0, 1024, 1360);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => renderBack(img);
      img.onerror = () => renderBack();
      img.src = photoSrc;
    });
  }

  // Subtle, elegant paper grain & fine pulp texture (delicate, natural, not overwhelming)
  static applyPaperGrainTexture(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number = 0.035) {
    ctx.save();

    // 1. Soft organic fiber speckles (chấm nhỏ li ti nhẹ nhàng)
    ctx.fillStyle = `rgba(140, 115, 100, ${intensity * 1.0})`;
    for (let i = 0; i < 1800; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const rw = Math.random() * 1.8 + 0.5;
      const rh = Math.random() * 1.2 + 0.5;
      ctx.fillRect(rx, ry, rw, rh);
    }

    // 2. Very fine pulp hairs (sợi tơ giấy mảnh bay nhẹ)
    ctx.strokeStyle = `rgba(130, 105, 90, ${intensity * 0.8})`;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 180; i++) {
      const fx = Math.random() * width;
      const fy = Math.random() * height;
      const length = Math.random() * 12 + 4;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(angle) * length, fy + Math.sin(angle) * length);
      ctx.stroke();
    }

    // 3. Very subtle paper highlights
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.7})`;
    for (let i = 0; i < 1500; i++) {
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.0, 1.0);
    }

    ctx.restore();
  }

  static createInsidePageTexture(params: {
    pageNumber: number;
    chapter?: string;
    title?: string;
    quote?: string;
    textLines?: string[];
    handwriting?: string;
    media?: PageMediaItem[];
    layout?: PageLayoutType;
    backgroundSrc?: string;
    side: 'left' | 'right';
  }): Promise<THREE.CanvasTexture> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1360;
      const ctx = canvas.getContext('2d')!;
      const usesBackground = Boolean(params.backgroundSrc);

      // Pages with their own image use it as the full background. Plain pages retain
      // the journal's ivory paper color and wash.
      if (!params.backgroundSrc) {
        ctx.fillStyle = '#F9F5EC';
        ctx.fillRect(0, 0, 1024, 1360);

        const vGrad = ctx.createRadialGradient(512, 680, 200, 512, 680, 800);
        vGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        vGrad.addColorStop(1, 'rgba(180, 154, 106, 0.12)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, 1024, 1360);
      }

      // Spine shadow gradient on inner edge
      const spineGrad = ctx.createLinearGradient(
        params.side === 'left' ? 1024 : 0,
        0,
        params.side === 'left' ? 900 : 124,
        0
      );
      spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
      spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(params.side === 'left' ? 880 : 0, 0, 144, 1360);

      // 2. Header
      ctx.fillStyle = '#C99A9A';
      ctx.font = 'bold 20px Montserrat, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.textAlign = params.side === 'left' ? 'left' : 'right';
      const headerX = params.side === 'left' ? 80 : 944;
      ctx.fillText(params.chapter ? params.chapter.toUpperCase() : 'LOVE JOURNEY', headerX, 85);

      ctx.strokeStyle = 'rgba(201, 154, 154, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 105);
      ctx.lineTo(944, 105);
      ctx.stroke();

      // 3. Title & Quote
      let curY = 160;
      if (params.title) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#292522';
        ctx.font = 'bold 38px "Cormorant Garamond", Georgia, serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(params.title, 80, curY);
        curY += 42;
      }

      if (params.quote) {
        ctx.fillStyle = '#94384F';
        ctx.font = 'italic 26px "Dancing Script", "Playfair Display", Georgia, cursive';
        ctx.fillText(`"${params.quote}"`, 80, curY);
        curY += 38;
      }

      // 4. Text Lines
      if (params.textLines && params.textLines.length > 0) {
        ctx.fillStyle = '#474039';
        ctx.font = '22px "Cormorant Garamond", Georgia, serif';
        params.textLines.forEach((line) => {
          ctx.fillText(line, 80, curY);
          curY += 30;
        });
        curY += 10;
      }

      const completeRendering = () => {
        if (params.handwriting) {
          ctx.fillStyle = '#38161E';
          ctx.font = 'italic 32px "Dancing Script", "Playfair Display", Georgia, cursive';
          ctx.textAlign = params.side === 'left' ? 'right' : 'center';
          const hX = params.side === 'left' ? 920 : 512;
          ctx.fillText(params.handwriting, hX, 1250);
        }

        ctx.fillStyle = '#8A7E71';
        ctx.font = '22px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`— ${params.pageNumber} —`, 512, 1315);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      const drawBackground = (background?: HTMLImageElement) => {
        if (!background) return;
        const srcW = background.naturalWidth || background.width;
        const srcH = background.naturalHeight || background.height;
        const srcRatio = srcW / srcH;
        const destRatio = 1024 / 1360;
        let sx = 0;
        let sy = 0;
        let sw = srcW;
        let sh = srcH;
        if (srcRatio > destRatio) {
          sw = srcH * destRatio;
          sx = (srcW - sw) / 2;
        } else {
          sh = srcW / destRatio;
          sy = (srcH - sh) / 2;
        }

        // Build the background and header fade on an offscreen layer. The finished
        // layer can then be placed behind text without darkening the typography.
        const backgroundLayer = document.createElement('canvas');
        backgroundLayer.width = 1024;
        backgroundLayer.height = 1360;
        const backgroundContext = backgroundLayer.getContext('2d')!;
        backgroundContext.drawImage(background, sx, sy, sw, sh, 0, 0, 1024, 1360);

        // Dedicated reading zone for chapter label, title, quote and opening copy.
        // It fades out before the scrapbook composition begins.
        const headerFade = backgroundContext.createLinearGradient(0, 0, 0, 470);
        headerFade.addColorStop(0, 'rgba(249, 245, 236, 0.92)');
        headerFade.addColorStop(0.28, 'rgba(249, 245, 236, 0.78)');
        headerFade.addColorStop(0.66, 'rgba(249, 245, 236, 0.38)');
        headerFade.addColorStop(1, 'rgba(249, 245, 236, 0)');
        backgroundContext.fillStyle = headerFade;
        backgroundContext.fillRect(0, 0, 1024, 470);

        // A gentle inner-edge fade keeps the page gutter readable without a hard bar.
        const gutterFade = backgroundContext.createLinearGradient(
          params.side === 'left' ? 1024 : 0,
          0,
          params.side === 'left' ? 810 : 214,
          0
        );
        gutterFade.addColorStop(0, 'rgba(249, 245, 236, 0.28)');
        gutterFade.addColorStop(1, 'rgba(249, 245, 236, 0)');
        backgroundContext.fillStyle = gutterFade;
        backgroundContext.fillRect(0, 0, 1024, 1360);

        // This runs after the page copy, so destination-over places the prepared
        // layer beneath every typography and scrapbook item.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(backgroundLayer, 0, 0);
        ctx.restore();
      };

      /**
       * Draws Polaroid Card with STRICT 100% Aspect Ratio Preservation (Contain Mode inside Matte Card)
       * ZERO Stretching, ZERO Distortion!
       */
      const drawAdaptivePolaroid = (
        source: HTMLImageElement | HTMLCanvasElement,
        boxX: number,
        boxY: number,
        boxW: number,
        boxH: number,
        caption?: string,
        rotationDeg: number = 0,
        isVideo: boolean = false
      ) => {
        const srcW = (source as HTMLImageElement).naturalWidth || source.width || 400;
        const srcH = (source as HTMLImageElement).naturalHeight || source.height || 300;
        const srcRatio = srcW / srcH;

        // Calculate card dimensions that natively hug the photo aspect ratio
        const padding = 14;
        const captionSpace = caption ? 38 : 22;
        
        // Available space inside bounding box for photo
        const maxImgW = boxW - padding * 2;
        const maxImgH = boxH - padding * 2 - captionSpace;

        let finalImgW = maxImgW;
        let finalImgH = finalImgW / srcRatio;

        if (finalImgH > maxImgH) {
          finalImgH = maxImgH;
          finalImgW = finalImgH * srcRatio;
        }

        // Exact outer Polaroid Card size
        const cardW = Math.round(finalImgW + padding * 2);
        const cardH = Math.round(finalImgH + padding * 2 + captionSpace);
        
        // Center the card within the assigned bounding box
        const cardX = boxX + (boxW - cardW) / 2;
        const cardY = boxY + (boxH - cardH) / 2;

        ctx.save();
        ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);

        // Natural Card Border (No fake heavy drop shadow, blends flat and organically onto parchment)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        // Thin delicate frame line to ground the photo naturally on the page
        ctx.strokeStyle = 'rgba(180, 160, 140, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

        // Draw Image directly with exact dimensions
        const imgX = -cardW / 2 + padding;
        const imgY = -cardH / 2 + padding;
        ctx.drawImage(source, 0, 0, srcW, srcH, imgX, imgY, finalImgW, finalImgH);

        // If Video: badge overlay
        if (isVideo) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.beginPath();
          ctx.arc(0, imgY + finalImgH / 2, 22, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(-5, imgY + finalImgH / 2 - 9);
          ctx.lineTo(10, imgY + finalImgH / 2);
          ctx.lineTo(-5, imgY + finalImgH / 2 + 9);
          ctx.closePath();
          ctx.fill();
        }

        // Washi tape on top
        ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
        ctx.fillRect(-38, -cardH / 2 - 7, 76, 16);

        // Caption text
        if (caption) {
          ctx.fillStyle = '#4A1523';
          ctx.font = 'italic 20px "Dancing Script", "Playfair Display", Georgia, cursive';
          ctx.textAlign = 'center';
          ctx.fillText(caption, 0, cardH / 2 - 13);
        }

        ctx.restore();
      };

      const beginRendering = () => {
      const mediaItems = params.media || [];
      if (mediaItems.length === 0) {
        completeRendering();
        return;
      }

      let loadedCount = 0;
      const loadedElements: Array<{ elem: HTMLImageElement | HTMLCanvasElement; item: PageMediaItem }> = [];

      mediaItems.forEach((item, idx) => {
        if (item.isVideo) {
          const vImg = new Image();
          vImg.crossOrigin = 'anonymous';
          vImg.onload = () => {
            loadedElements[idx] = { elem: vImg, item };
            loadedCount++;
            if (loadedCount === mediaItems.length) renderDynamicLayout();
          };
          vImg.onerror = () => {
            const vCanvas = document.createElement('canvas');
            vCanvas.width = 400;
            vCanvas.height = 300;
            const vCtx = vCanvas.getContext('2d')!;
            vCtx.fillStyle = '#2A181E';
            vCtx.fillRect(0, 0, 400, 300);
            vCtx.fillStyle = '#E8BCC6';
            vCtx.font = '22px Montserrat, sans-serif';
            vCtx.textAlign = 'center';
            vCtx.fillText('Video Kỷ Niệm', 200, 155);

            loadedElements[idx] = { elem: vCanvas, item };
            loadedCount++;
            if (loadedCount === mediaItems.length) renderDynamicLayout();
          };
          vImg.src = item.src;
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            loadedElements[idx] = { elem: img, item };
            loadedCount++;
            if (loadedCount === mediaItems.length) renderDynamicLayout();
          };
          img.onerror = () => {
            const errCanvas = document.createElement('canvas');
            errCanvas.width = 300;
            errCanvas.height = 300;
            const eCtx = errCanvas.getContext('2d')!;
            eCtx.fillStyle = '#EFE9DE';
            eCtx.fillRect(0, 0, 300, 300);
            eCtx.fillStyle = '#8A7E71';
            eCtx.font = '16px serif';
            eCtx.textAlign = 'center';
            eCtx.fillText('Khoảnh khắc đôi mình', 150, 150);

            loadedElements[idx] = { elem: errCanvas, item };
            loadedCount++;
            if (loadedCount === mediaItems.length) renderDynamicLayout();
          };
          img.src = item.src;
        }
      });

      // RENDER SPECIFIC AND DIVERSE LAYOUTS PER PAGE
      const renderDynamicLayout = () => {
        const count = loadedElements.length;
        const availableTop = curY + 12;
        const availableHeight = 1205 - availableTop;
        const layout = params.layout || 'auto';

        // 1. Single Hero Layout (Trang chân dung hoặc ảnh ngang tráng lệ)
        if (count === 1 || layout === 'single-hero') {
          const el = loadedElements[0];
          drawAdaptivePolaroid(el.elem, 70, availableTop, 884, availableHeight, el.item.caption, 0, el.item.isVideo);
        }
        
        // 2. Dual Stacked Layout (2 ảnh ngang/vuông xếp trên dưới)
        else if (layout === 'dual-stacked') {
          const halfH = (availableHeight - 20) / 2;
          drawAdaptivePolaroid(loadedElements[0].elem, 80, availableTop, 864, halfH, loadedElements[0].item.caption, -1.2, loadedElements[0].item.isVideo);
          drawAdaptivePolaroid(loadedElements[1].elem, 80, availableTop + halfH + 20, 864, halfH, loadedElements[1].item.caption, 1.4, loadedElements[1].item.isVideo);
        }

        // 3. Dual Columns Layout (2 ảnh dọc đứng cạnh nhau)
        else if (layout === 'dual-columns') {
          const halfW = (884 - 24) / 2;
          drawAdaptivePolaroid(loadedElements[0].elem, 70, availableTop, halfW, availableHeight, loadedElements[0].item.caption, -1.5, loadedElements[0].item.isVideo);
          drawAdaptivePolaroid(loadedElements[1].elem, 70 + halfW + 24, availableTop, halfW, availableHeight, loadedElements[1].item.caption, 1.8, loadedElements[1].item.isVideo);
        }

        // 4. Diagonal Duo Layout (2 ảnh góc chéo xếp so le nghệ thuật)
        else if (layout === 'diagonal-duo') {
          const w = 580;
          const h = availableHeight * 0.58;
          drawAdaptivePolaroid(loadedElements[0].elem, 70, availableTop, w, h, loadedElements[0].item.caption, -2.5, loadedElements[0].item.isVideo);
          drawAdaptivePolaroid(loadedElements[1].elem, 1024 - w - 70, availableTop + availableHeight - h, w, h, loadedElements[1].item.caption, 2.2, loadedElements[1].item.isVideo);
        }

        // 5. Asymmetric Featured (1 ảnh lớn + 2 ảnh nhỏ)
        else if (layout === 'asymmetric-featured' && count >= 3) {
          const topH = availableHeight * 0.52;
          drawAdaptivePolaroid(loadedElements[0].elem, 80, availableTop, 864, topH, loadedElements[0].item.caption, 0.6, loadedElements[0].item.isVideo);
          
          const btmW = (864 - 20) / 2;
          const btmH = availableHeight * 0.44;
          const btmY = availableTop + topH + 18;
          drawAdaptivePolaroid(loadedElements[1].elem, 80, btmY, btmW, btmH, loadedElements[1].item.caption, -1.8, loadedElements[1].item.isVideo);
          drawAdaptivePolaroid(loadedElements[2].elem, 80 + btmW + 20, btmY, btmW, btmH, loadedElements[2].item.caption, 1.9, loadedElements[2].item.isVideo);
        }

        // 6. Scrapbook Trio (3 ảnh đan xen)
        else if (layout === 'scrapbook-trio' && count >= 3) {
          const cardW = 540;
          const cardH = availableHeight * 0.46;
          drawAdaptivePolaroid(loadedElements[0].elem, 70, availableTop, cardW, cardH, loadedElements[0].item.caption, -2.0, loadedElements[0].item.isVideo);
          drawAdaptivePolaroid(loadedElements[1].elem, 1024 - cardW - 70, availableTop + 140, cardW, cardH, loadedElements[1].item.caption, 2.5, loadedElements[1].item.isVideo);
          drawAdaptivePolaroid(loadedElements[2].elem, 160, availableTop + availableHeight - cardH, cardW + 80, cardH, loadedElements[2].item.caption, -1.0, loadedElements[2].item.isVideo);
        }

        // 7. Quad Gallery Grid (4 ảnh polaroid thanh lịch)
        else if (count >= 4) {
          const colW = (884 - 20) / 2;
          const rowH = (availableHeight - 20) / 2;
          drawAdaptivePolaroid(loadedElements[0].elem, 70, availableTop, colW, rowH, loadedElements[0].item.caption, -1.5, loadedElements[0].item.isVideo);
          drawAdaptivePolaroid(loadedElements[1].elem, 70 + colW + 20, availableTop, colW, rowH, loadedElements[1].item.caption, 1.8, loadedElements[1].item.isVideo);
          drawAdaptivePolaroid(loadedElements[2].elem, 70, availableTop + rowH + 20, colW, rowH, loadedElements[2].item.caption, 1.6, loadedElements[2].item.isVideo);
          drawAdaptivePolaroid(loadedElements[3].elem, 70 + colW + 20, availableTop + rowH + 20, colW, rowH, loadedElements[3].item.caption, -1.7, loadedElements[3].item.isVideo);
        }

        // Fallback auto logic
        else if (count === 2) {
          const isLandscape = ((loadedElements[0].elem as HTMLImageElement).naturalWidth || 400) > ((loadedElements[0].elem as HTMLImageElement).naturalHeight || 300);
          if (isLandscape) {
            const halfH = (availableHeight - 20) / 2;
            drawAdaptivePolaroid(loadedElements[0].elem, 80, availableTop, 864, halfH, loadedElements[0].item.caption, -1.0, loadedElements[0].item.isVideo);
            drawAdaptivePolaroid(loadedElements[1].elem, 80, availableTop + halfH + 20, 864, halfH, loadedElements[1].item.caption, 1.2, loadedElements[1].item.isVideo);
          } else {
            const halfW = (884 - 20) / 2;
            drawAdaptivePolaroid(loadedElements[0].elem, 70, availableTop, halfW, availableHeight, loadedElements[0].item.caption, -1.5, loadedElements[0].item.isVideo);
            drawAdaptivePolaroid(loadedElements[1].elem, 70 + halfW + 20, availableTop, halfW, availableHeight, loadedElements[1].item.caption, 1.8, loadedElements[1].item.isVideo);
          }
        } else if (count === 3) {
          const topH = availableHeight * 0.5;
          drawAdaptivePolaroid(loadedElements[0].elem, 80, availableTop, 864, topH, loadedElements[0].item.caption, 0.8, loadedElements[0].item.isVideo);
          const btmW = (864 - 20) / 2;
          const btmH = availableHeight * 0.46;
          drawAdaptivePolaroid(loadedElements[1].elem, 80, availableTop + topH + 18, btmW, btmH, loadedElements[1].item.caption, -1.8, loadedElements[1].item.isVideo);
          drawAdaptivePolaroid(loadedElements[2].elem, 80 + btmW + 20, availableTop + topH + 18, btmW, btmH, loadedElements[2].item.caption, 2.0, loadedElements[2].item.isVideo);
        }

        completeRendering();
      };
      };

      if (params.backgroundSrc) {
        const background = new Image();
        background.crossOrigin = 'anonymous';
        background.onload = () => {
          drawBackground(background);
          beginRendering();
        };
        background.onerror = () => beginRendering();
        background.src = params.backgroundSrc;
      } else {
        beginRendering();
      }
    });
  }
}
