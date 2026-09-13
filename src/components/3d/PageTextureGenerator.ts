import * as THREE from 'three';

/**
 * Creates high-res 1024x1360 Canvas texture for book covers and inside pages.
 * Incorporates authentic paper fibers, watercolor edges, elegant serif typography,
 * polaroid frames, and handwritten notes.
 */
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

    // Hint
    ctx.fillStyle = 'rgba(244, 237, 226, 0.7)';
    ctx.font = 'italic 26px "Cormorant Garamond", serif';
    ctx.fillText('Chạm để mở cuốn sổ', 512, 1150);

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
        ctx.font = 'bold 46px "Cormorant Garamond", Georgia, serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(params.title, 100, 200);
      }

      if (params.quote) {
        ctx.fillStyle = '#94384F';
        ctx.font = 'italic 34px "Alex Brush", cursive';
        ctx.fillText(`"${params.quote}"`, 100, 260);
      }

      // 4. Text Lines
      if (params.textLines && params.textLines.length > 0) {
        ctx.fillStyle = '#474039';
        ctx.font = '26px "Cormorant Garamond", Georgia, serif';
        let lineY = params.quote ? 320 : 260;
        params.textLines.forEach((line) => {
          ctx.fillText(line, 100, lineY);
          lineY += 42;
        });
      }

      // 5. Draw Polaroid Photo if provided
      const completeRendering = () => {
        // Handwriting note
        if (params.handwriting) {
          ctx.fillStyle = '#38161E';
          ctx.font = 'italic 38px "Alex Brush", cursive';
          ctx.textAlign = params.side === 'left' ? 'right' : 'center';
          const hX = params.side === 'left' ? 900 : 512;
          ctx.fillText(params.handwriting, hX, 1220);
        }

        // Page Number
        ctx.fillStyle = '#8A7E71';
        ctx.font = '22px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`— ${params.pageNumber} —`, 512, 1310);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };

      if (params.imageSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw Polaroid Frame
          const frameX = 212;
          const frameY = params.textLines ? 540 : 280;
          const frameW = 600;
          const frameH = 680;

          // Shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
          ctx.shadowBlur = 24;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.shadowColor = 'transparent';

          // Image inside
          ctx.drawImage(img, frameX + 24, frameY + 24, frameW - 48, frameH - 120);

          // Masking tape on top
          ctx.fillStyle = 'rgba(235, 225, 205, 0.85)';
          ctx.fillRect(frameX + frameW / 2 - 80, frameY - 14, 160, 32);

          // Caption under polaroid
          if (params.imageCaption) {
            ctx.fillStyle = '#4A1523';
            ctx.font = 'italic 30px "Alex Brush", cursive';
            ctx.textAlign = 'center';
            ctx.fillText(params.imageCaption, frameX + frameW / 2, frameY + frameH - 40);
          }

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
