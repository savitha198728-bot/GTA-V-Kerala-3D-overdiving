import * as THREE from 'three';

function configureColorTexture(
  tex: THREE.CanvasTexture,
  maxAnisotropy: number,
  repeat = false,
): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createSkyTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 64;
  skyCanvas.height = 256;
  const ctx = skyCanvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#090b16');
  grad.addColorStop(0.45, '#1f2347');
  grad.addColorStop(0.75, '#833471');
  grad.addColorStop(0.92, '#ff6b6b');
  grad.addColorStop(1.0, '#feca57');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(skyCanvas);
  return configureColorTexture(tex, maxAnisotropy);
}

export function createBuildingTexture(
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#141926';
  ctx.fillRect(0, 0, 256, 512);

  // Subtle architectural horizontal mullion lines
  ctx.fillStyle = '#1e2538';
  for (let y = 0; y < 512; y += 36) {
    ctx.fillRect(0, y, 256, 3);
  }

  for (let y = 14; y < 498; y += 36) {
    for (let x = 14; x < 242; x += 36) {
      const lit = Math.random() > 0.36;
      if (lit) {
        ctx.fillStyle = Math.random() > 0.8 ? accentColor : '#ffeaa7';
      } else {
        ctx.fillStyle = '#0c101a';
      }
      ctx.fillRect(x, y, 22, 22);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  return configureColorTexture(tex, maxAnisotropy, true);
}

export function createAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1c202b';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = 20 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 12})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.repeat.set(28, 28);
  return configureColorTexture(tex, maxAnisotropy, true);
}

export function createSandTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e5c17d';
  ctx.fillRect(0, 0, 256, 256);

  // Wind-swept coastal sand ripples
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = 'rgba(210, 168, 102, 0.25)';
    ctx.fillRect(0, y, 256, 6);
  }
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle =
      Math.random() > 0.5
        ? 'rgba(255, 240, 200, 0.28)'
        : 'rgba(176, 134, 72, 0.24)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.repeat.set(6, 36);
  return configureColorTexture(tex, maxAnisotropy, true);
}

export function createBoardwalkTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(0, 0, 128, 256);

  for (let y = 0; y < 256; y += 16) {
    const shade = (y / 16) % 3;
    ctx.fillStyle =
      shade === 0 ? '#9c6b45' : shade === 1 ? '#835636' : '#744b2e';
    ctx.fillRect(0, y, 128, 14);
    ctx.fillStyle = '#3d2515';
    ctx.fillRect(0, y + 14, 128, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.repeat.set(2, 54);
  return configureColorTexture(tex, maxAnisotropy, true);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFaceTexture(
  skinHex: string,
  eyeHex: string,
  hasShades: boolean,
  beardStyle: string,
  hairHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = hairHex;
  ctx.fillRect(0, 0, 128, 26);

  ctx.fillStyle = hairHex;
  ctx.fillRect(24, 38, 28, 7);
  ctx.fillRect(76, 38, 28, 7);

  if (hasShades) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(18, 46, 38, 22);
    ctx.fillRect(72, 46, 38, 22);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(22, 49, 12, 4);
    ctx.fillRect(76, 49, 12, 4);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(56, 50, 16, 4);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(26, 48, 24, 15);
    ctx.fillRect(78, 48, 24, 15);
    ctx.fillStyle = eyeHex;
    ctx.fillRect(33, 49, 11, 13);
    ctx.fillRect(85, 49, 11, 13);
    ctx.fillStyle = '#000000';
    ctx.fillRect(36, 52, 5, 7);
    ctx.fillRect(88, 52, 5, 7);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(59, 56, 10, 22);

  if (beardStyle === 'goatee') {
    ctx.fillStyle = hairHex;
    ctx.fillRect(42, 84, 44, 34);
    ctx.fillStyle = skinHex;
    ctx.fillRect(50, 92, 28, 12);
  } else if (beardStyle === 'stubble') {
    ctx.fillStyle = 'rgba(20, 20, 25, 0.25)';
    ctx.fillRect(16, 82, 96, 46);
  }

  ctx.fillStyle = beardStyle === 'lipstick' ? '#ff2a85' : '#6d3b32';
  ctx.fillRect(46, 94, 36, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(50, 96, 28, 3);

  const tex = new THREE.CanvasTexture(c);
  return configureColorTexture(tex, maxAnisotropy);
}
