import * as THREE from 'three';

/**
 * Creates high-contrast, tactile paper bump / roughness / texture maps
 * so that paper texture is physically rendered by Three.js lighting shader!
 */
export class PaperTextureManager {
  private static paperBumpMap: THREE.CanvasTexture | null = null;
  private static paperRoughnessMap: THREE.CanvasTexture | null = null;

  // 1. Procedural 3D Bump / Normal Texture for Paper
  static getPaperBumpMap(): THREE.CanvasTexture {
    if (this.paperBumpMap) return this.paperBumpMap;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base neutral gray
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Fine paper grain noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 48; // bump variation
      const val = Math.min(255, Math.max(0, 128 + noise));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    // Embossed fiber strokes in bump
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = Math.random() * 16 + 4;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 6);
    this.paperBumpMap = tex;
    return tex;
  }

  // 2. Paper Roughness Map
  static getPaperRoughnessMap(): THREE.CanvasTexture {
    if (this.paperRoughnessMap) return this.paperRoughnessMap;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#D0D0D0'; // High roughness
    ctx.fillRect(0, 0, 512, 512);

    // Speckles of different roughness
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      const v = Math.min(255, Math.max(0, 208 + n));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 6);
    this.paperRoughnessMap = tex;
    return tex;
  }
}
