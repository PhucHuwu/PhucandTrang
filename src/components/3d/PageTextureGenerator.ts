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
  static createCoverTexture(title: string, subtitle: string, date: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1360;
    const ctx = canvas.getContext('2d')!;

    // 1. Rich Wine / Burgundy Leather background
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1360);
    gradient.addColorStop(0, '#38161E');
    gradient.addColorStop(0.5, '#280F15');
    gradient.addColorStop(1, '#1A070B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1360);

    // Leather grain
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1360, 2, 2);
    }

    // Gilded Frame
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 944, 1280);

    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 904, 1240);
    ctx.setLineDash([]);

    // Corner Ornaments
    ctx.fillStyle = '#D4AF37';
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', 80, 90);
    ctx.fillText('✦', 944, 90);
    ctx.fillText('✦', 80, 1280);
    ctx.fillText('✦', 944, 1280);

    // Typography
    ctx.fillStyle = '#D4AF37';
    ctx.font = '24px Montserrat, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('A JOURNEY OF LOVE', 512, 280);

    // Center Emblem
    ctx.beginPath();
    ctx.arc(512, 440, 70, 0, Math.PI * 2);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#E8BCC6';
    ctx.font = '54px serif';
    ctx.fillText('❤', 512, 458);

    ctx.fillStyle = '#F4EDE2';
    ctx.font = 'bold 72px "Cormorant Garamond", Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(title, 512, 620);

    ctx.fillStyle = '#E8BCC6';
    ctx.font = 'italic 52px "Alex Brush", cursive, serif';
    ctx.fillText(subtitle, 512, 700);

    ctx.fillStyle = '#B49A6A';
    ctx.font = '24px Montserrat, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(date, 512, 820);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static createBackCoverTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1360;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 1024, 1360);
    gradient.addColorStop(0, '#38161E');
    gradient.addColorStop(0.5, '#280F15');
    gradient.addColorStop(1, '#1A070B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1360);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1360, 2, 2);
    }

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 944, 1280);

    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 904, 1240);
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(512, 600, 60, 0, Math.PI * 2);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', 512, 612);

    ctx.fillStyle = '#E8BCC6';
    ctx.font = 'italic 48px "Alex Brush", cursive, serif';
    ctx.fillText('Forever & Always', 512, 730);

    ctx.fillStyle = '#B49A6A';
    ctx.font = '22px Montserrat, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('TO BE CONTINUED...', 512, 800);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
    side: 'left' | 'right';
  }): Promise<THREE.CanvasTexture> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1360;
      const ctx = canvas.getContext('2d')!;

      // 1. Vintage Paper Background
      ctx.fillStyle = '#F9F5EC';
      ctx.fillRect(0, 0, 1024, 1360);

      const vGrad = ctx.createRadialGradient(512, 680, 200, 512, 680, 800);
      vGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      vGrad.addColorStop(1, 'rgba(180, 154, 106, 0.12)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, 1024, 1360);

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
        ctx.font = 'italic 26px "Alex Brush", cursive';
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
          ctx.font = 'italic 32px "Alex Brush", cursive';
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

        // Polaroid Frame Shadow & Paper Card
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
        ctx.shadowColor = 'transparent';

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
          ctx.font = 'italic 19px "Alex Brush", cursive';
          ctx.textAlign = 'center';
          ctx.fillText(caption, 0, cardH / 2 - 13);
        }

        ctx.restore();
      };

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
            vCtx.fillText('▶ Video Kỷ Niệm', 200, 155);

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
    });
  }
}
