import * as THREE from 'three';

export interface PageMediaItem {
  src: string;
  caption?: string;
  isVideo?: boolean;
}

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

    // Leather texture grain
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
      vGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
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
      spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
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
      let curY = 165;
      if (params.title) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#292522';
        ctx.font = 'bold 40px "Cormorant Garamond", Georgia, serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(params.title, 80, curY);
        curY += 45;
      }

      if (params.quote) {
        ctx.fillStyle = '#94384F';
        ctx.font = 'italic 28px "Alex Brush", cursive';
        ctx.fillText(`"${params.quote}"`, 80, curY);
        curY += 40;
      }

      // 4. Text Lines
      if (params.textLines && params.textLines.length > 0) {
        ctx.fillStyle = '#474039';
        ctx.font = '22px "Cormorant Garamond", Georgia, serif';
        params.textLines.forEach((line) => {
          ctx.fillText(line, 80, curY);
          curY += 32;
        });
        curY += 15;
      }

      const completeRendering = () => {
        if (params.handwriting) {
          ctx.fillStyle = '#38161E';
          ctx.font = 'italic 34px "Alex Brush", cursive';
          ctx.textAlign = params.side === 'left' ? 'right' : 'center';
          const hX = params.side === 'left' ? 920 : 512;
          ctx.fillText(params.handwriting, hX, 1245);
        }

        ctx.fillStyle = '#8A7E71';
        ctx.font = '22px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`— ${params.pageNumber} —`, 512, 1315);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      const drawPolaroid = (
        img: HTMLImageElement | HTMLCanvasElement,
        x: number,
        y: number,
        w: number,
        h: number,
        caption?: string,
        rotationDeg: number = 0,
        isVideo: boolean = false
      ) => {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);

        // Shadow & Card
        ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.shadowColor = 'transparent';

        // Image area
        const padding = 14;
        const bottomArea = 48;
        const imgW = w - padding * 2;
        const imgH = h - padding * 2 - bottomArea;

        // Draw image clipped inside
        ctx.drawImage(img, -w / 2 + padding, -h / 2 + padding, imgW, imgH);

        // If Video: draw sweet video badge overlay
        if (isVideo) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.beginPath();
          ctx.arc(0, (-h / 2 + padding + imgH / 2), 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(-6, (-h / 2 + padding + imgH / 2) - 10);
          ctx.lineTo(12, (-h / 2 + padding + imgH / 2));
          ctx.lineTo(-6, (-h / 2 + padding + imgH / 2) + 10);
          ctx.closePath();
          ctx.fill();
        }

        // Washi tape on top
        ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
        ctx.fillRect(-45, -h / 2 - 8, 90, 18);

        // Caption
        if (caption) {
          ctx.fillStyle = '#4A1523';
          ctx.font = 'italic 20px "Alex Brush", cursive';
          ctx.textAlign = 'center';
          ctx.fillText(caption, 0, h / 2 - 16);
        }

        ctx.restore();
      };

      const mediaItems = params.media || [];
      if (mediaItems.length === 0) {
        completeRendering();
        return;
      }

      // Load all media
      let loadedCount = 0;
      const loadedElements: Array<{ elem: HTMLImageElement | HTMLCanvasElement; item: PageMediaItem }> = [];

      mediaItems.forEach((item, idx) => {
        if (item.isVideo) {
          // For video, generate a clean frame canvas placeholder
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
          if (loadedCount === mediaItems.length) {
            renderMediaGrid();
          }
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            loadedElements[idx] = { elem: img, item };
            loadedCount++;
            if (loadedCount === mediaItems.length) {
              renderMediaGrid();
            }
          };
          img.onerror = () => {
            // fallback canvas if load fails
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
            if (loadedCount === mediaItems.length) {
              renderMediaGrid();
            }
          };
          img.src = item.src;
        }
      });

      const renderMediaGrid = () => {
        const count = loadedElements.length;
        const availableTop = curY + 10;
        const availableHeight = 1200 - availableTop;

        if (count === 1) {
          const el = loadedElements[0];
          drawPolaroid(el.elem, 172, availableTop + 20, 680, availableHeight - 40, el.item.caption, 0, el.item.isVideo);
        } else if (count === 2) {
          const cardH = (availableHeight - 40) / 2;
          const cardW = 600;
          const leftX = (1024 - cardW) / 2;
          drawPolaroid(loadedElements[0].elem, leftX, availableTop, cardW, cardH, loadedElements[0].item.caption, -1.2, loadedElements[0].item.isVideo);
          drawPolaroid(loadedElements[1].elem, leftX + 15, availableTop + cardH + 15, cardW, cardH, loadedElements[1].item.caption, 1.5, loadedElements[1].item.isVideo);
        } else if (count === 3) {
          // 1 top center, 2 bottom side-by-side
          const topH = availableHeight * 0.46;
          const topW = 540;
          const topX = (1024 - topW) / 2;
          drawPolaroid(loadedElements[0].elem, topX, availableTop, topW, topH, loadedElements[0].item.caption, 0.8, loadedElements[0].item.isVideo);

          const btmW = 420;
          const btmH = availableHeight * 0.44;
          const btmY = availableTop + topH + 20;
          drawPolaroid(loadedElements[1].elem, 75, btmY, btmW, btmH, loadedElements[1].item.caption, -1.8, loadedElements[1].item.isVideo);
          drawPolaroid(loadedElements[2].elem, 525, btmY, btmW, btmH, loadedElements[2].item.caption, 2.0, loadedElements[2].item.isVideo);
        } else if (count >= 4) {
          // 2x2 Grid
          const cardW = 410;
          const cardH = (availableHeight - 35) / 2;
          const x1 = 80;
          const x2 = 530;
          const y1 = availableTop;
          const y2 = availableTop + cardH + 20;

          drawPolaroid(loadedElements[0].elem, x1, y1, cardW, cardH, loadedElements[0].item.caption, -1.2, loadedElements[0].item.isVideo);
          drawPolaroid(loadedElements[1].elem, x2, y1, cardW, cardH, loadedElements[1].item.caption, 1.5, loadedElements[1].item.isVideo);
          drawPolaroid(loadedElements[2].elem, x1, y2, cardW, cardH, loadedElements[2].item.caption, 1.8, loadedElements[2].item.isVideo);
          drawPolaroid(loadedElements[3].elem, x2, y2, cardW, cardH, loadedElements[3].item.caption, -1.5, loadedElements[3].item.isVideo);
        }

        completeRendering();
      };
    });
  }
}
