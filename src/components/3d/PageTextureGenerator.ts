import * as THREE from 'three';

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

    // Subtle leather grain texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1360;
      ctx.fillRect(x, y, 2, 2);
    }

    // 2. Gilded Double Frame
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

    // 3. Typography
    ctx.fillStyle = '#D4AF37';
    ctx.font = '24px Montserrat, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('A JOURNEY OF LOVE', 512, 280);

    // Center Gold Ring Emblem
    ctx.beginPath();
    ctx.arc(512, 440, 70, 0, Math.PI * 2);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#E8BCC6';
    ctx.font = '54px serif';
    ctx.fillText('❤', 512, 458);

    // Main Title
    ctx.fillStyle = '#F4EDE2';
    ctx.font = 'bold 72px "Cormorant Garamond", Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(title, 512, 620);

    // Subtitle
    ctx.fillStyle = '#E8BCC6';
    ctx.font = 'italic 52px "Alex Brush", cursive, serif';
    ctx.fillText(subtitle, 512, 700);

    // Date
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

    // Rich Wine Leather
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1360);
    gradient.addColorStop(0, '#38161E');
    gradient.addColorStop(0.5, '#280F15');
    gradient.addColorStop(1, '#1A070B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1360);

    // Leather grain
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1360;
      ctx.fillRect(x, y, 2, 2);
    }

    // Gilded Frame
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 944, 1280);

    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 904, 1240);
    ctx.setLineDash([]);

    // Center Gold Emblem
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
    imageSrc?: string;
    imageCaption?: string;
    secondaryImageSrc?: string;
    secondaryImageCaption?: string;
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

      // Subtle paper fibers & vignette
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
      const headerX = params.side === 'left' ? 100 : 924;
      ctx.fillText(params.chapter ? params.chapter.toUpperCase() : 'LOVE JOURNEY', headerX, 100);

      // Thin separator line
      ctx.strokeStyle = 'rgba(201, 154, 154, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(100, 120);
      ctx.lineTo(924, 120);
      ctx.stroke();

      // 3. Title & Quote
      if (params.title) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#292522';
        ctx.font = 'bold 44px "Cormorant Garamond", Georgia, serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(params.title, 100, 190);
      }

      if (params.quote) {
        ctx.fillStyle = '#94384F';
        ctx.font = 'italic 32px "Alex Brush", cursive';
        ctx.fillText(`"${params.quote}"`, 100, 245);
      }

      // 4. Text Lines
      if (params.textLines && params.textLines.length > 0) {
        ctx.fillStyle = '#474039';
        ctx.font = '24px "Cormorant Garamond", Georgia, serif';
        let lineY = params.quote ? 300 : 250;
        params.textLines.forEach((line) => {
          ctx.fillText(line, 100, lineY);
          lineY += 38;
        });
      }

      const completeRendering = () => {
        // Handwriting note
        if (params.handwriting) {
          ctx.fillStyle = '#38161E';
          ctx.font = 'italic 36px "Alex Brush", cursive';
          ctx.textAlign = params.side === 'left' ? 'right' : 'center';
          const hX = params.side === 'left' ? 900 : 512;
          ctx.fillText(params.handwriting, hX, 1230);
        }

        // Page Number
        ctx.fillStyle = '#8A7E71';
        ctx.font = '22px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`— ${params.pageNumber} —`, 512, 1315);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      // Helper function to draw a single Polaroid frame
      const drawPolaroid = (
        img: HTMLImageElement,
        x: number,
        y: number,
        w: number,
        h: number,
        caption?: string,
        rotationDeg: number = 0
      ) => {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);

        // Shadow & Card
        ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.shadowColor = 'transparent';

        // Draw image clipped inside
        const imgPadding = 18;
        const imgH = h - 70;
        ctx.drawImage(img, -w / 2 + imgPadding, -h / 2 + imgPadding, w - imgPadding * 2, imgH - imgPadding);

        // Washi Tape
        ctx.fillStyle = 'rgba(235, 225, 205, 0.82)';
        ctx.fillRect(-60, -h / 2 - 12, 120, 24);

        // Caption
        if (caption) {
          ctx.fillStyle = '#4A1523';
          ctx.font = 'italic 26px "Alex Brush", cursive';
          ctx.textAlign = 'center';
          ctx.fillText(caption, 0, h / 2 - 24);
        }

        ctx.restore();
      };

      // Handle dual or single images
      if (params.imageSrc && params.secondaryImageSrc) {
        let loaded = 0;
        const img1 = new Image();
        const img2 = new Image();
        img1.crossOrigin = 'anonymous';
        img2.crossOrigin = 'anonymous';

        const checkBoth = () => {
          loaded++;
          if (loaded === 2) {
            // Draw dual polaroids vertically stacked with slight rotation
            const startY = params.textLines ? 480 : 280;
            drawPolaroid(img1, 212, startY, 560, 420, params.imageCaption, -1.5);
            drawPolaroid(img2, 252, startY + 440, 560, 420, params.secondaryImageCaption, 1.8);
            completeRendering();
          }
        };

        img1.onload = checkBoth;
        img1.onerror = checkBoth;
        img2.onload = checkBoth;
        img2.onerror = checkBoth;

        img1.src = params.imageSrc;
        img2.src = params.secondaryImageSrc;
      } else if (params.imageSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const frameX = 182;
          const frameY = params.textLines ? 520 : 270;
          const frameW = 660;
          const frameH = 740;
          drawPolaroid(img, frameX, frameY, frameW, frameH, params.imageCaption, 0);
          completeRendering();
        };
        img.onerror = () => completeRendering();
        img.src = params.imageSrc;
      } else {
        completeRendering();
      }
    });
  }
}
