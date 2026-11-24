// Procedural High-DPI PBR Surface Textures (Zero external images)
// Generates linear brushed titanium, radial brushed gears, Côtes de Genève ribs,
// engine-turned perlage, and 2048x2048 skeleton dial chapter ring artwork.

import * as THREE from 'three';
import { createPRNG } from './prng.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = false, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Fine linear brushed metal (hairline Grade-5 Titanium grain).
 * Returns paired bump + roughness maps.
 */
function createLinearBrush(size = 512, seed = 101) {
  const rand = createPRNG(seed);
  const cBump = makeCanvas(size, size);
  const ctxB = cBump.getContext('2d');
  const cRough = makeCanvas(size, size);
  const ctxR = cRough.getContext('2d');

  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);
  ctxR.fillStyle = '#404040';
  ctxR.fillRect(0, 0, size, size);

  // Fine continuous micro-scratches along X
  for (let i = 0; i < 4200; i++) {
    const y = rand() * size;
    const x = rand() * size;
    const len = 40 + rand() * (size * 0.7);
    const v = Math.floor(96 + rand() * 64);
    const a = 0.14 + rand() * 0.25;
    ctxB.strokeStyle = `rgba(${v},${v},${v},${a})`;
    ctxB.lineWidth = 0.6 + rand() * 1.1;
    ctxB.beginPath();
    ctxB.moveTo(x, y);
    ctxB.lineTo(x + len, y + (rand() - 0.5) * 0.6);
    ctxB.stroke();
    if (x + len > size) {
      ctxB.beginPath();
      ctxB.moveTo(x - size, y);
      ctxB.lineTo(x + len - size, y);
      ctxB.stroke();
    }

    const rv = Math.floor(42 + rand() * 48);
    ctxR.strokeStyle = `rgba(${rv},${rv},${rv},${a * 0.9})`;
    ctxR.lineWidth = 0.7 + rand() * 1.1;
    ctxR.beginPath();
    ctxR.moveTo(x, y);
    ctxR.lineTo(x + len, y);
    ctxR.stroke();
  }

  return {
    bump: toTexture(cBump, { repeat: [2, 2] }),
    roughness: toTexture(cRough, { repeat: [2, 2] }),
  };
}

/**
 * Circular / radial brushed satin metal for involute gears and chatons.
 */
function createRadialBrush(size = 512, seed = 202) {
  const rand = createPRNG(seed);
  const cBump = makeCanvas(size, size);
  const ctxB = cBump.getContext('2d');
  const cRough = makeCanvas(size, size);
  const ctxR = cRough.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);
  ctxR.fillStyle = '#3c3c3c';
  ctxR.fillRect(0, 0, size, size);

  // Subtle anisotropic star-burst sheen baked into roughness
  for (let i = 0; i < 180; i++) {
    const ang = (i / 180) * Math.PI * 2;
    const mod = 0.5 + 0.5 * Math.cos(ang * 2);
    const rv = Math.floor(38 + mod * 38);
    ctxR.strokeStyle = `rgba(${rv},${rv},${rv},0.16)`;
    ctxR.lineWidth = 6;
    ctxR.beginPath();
    ctxR.moveTo(cx, cy);
    ctxR.lineTo(cx + Math.cos(ang) * size * 0.72, cy + Math.sin(ang) * size * 0.72);
    ctxR.stroke();
  }

  // Concentric lathe turning rings
  for (let i = 0; i < 650; i++) {
    const r = 4 + rand() * (size * 0.52);
    const a0 = rand() * Math.PI * 2;
    const span = 0.8 + rand() * 3.8;
    const v = Math.floor(88 + rand() * 82);
    ctxB.strokeStyle = `rgba(${v},${v},${v},${0.16 + rand() * 0.25})`;
    ctxB.lineWidth = 0.6 + rand() * 1.1;
    ctxB.beginPath();
    ctxB.arc(cx, cy, r, a0, a0 + span);
    ctxB.stroke();

    const rv = Math.floor(36 + rand() * 44);
    ctxR.strokeStyle = `rgba(${rv},${rv},${rv},0.18)`;
    ctxR.lineWidth = 0.8;
    ctxR.beginPath();
    ctxR.arc(cx, cy, r, a0, a0 + span);
    ctxR.stroke();
  }

  return {
    bump: toTexture(cBump, { repeat: [1, 1] }),
    roughness: toTexture(cRough, { repeat: [1, 1] }),
  };
}

/**
 * Côtes de Genève (Geneva Stripes) horological bridge finishing.
 */
function createCotesDeGeneve(size = 512, seed = 303) {
  const rand = createPRNG(seed);
  const cBump = makeCanvas(size, size);
  const ctxB = cBump.getContext('2d');
  const cRough = makeCanvas(size, size);
  const ctxR = cRough.getContext('2d');

  const stripes = 8;
  const sw = size / stripes;

  for (let s = 0; s < stripes; s++) {
    const x0 = s * sw;
    // Asymmetric cylindrical rib gradient across each stripe
    const gradB = ctxB.createLinearGradient(x0, 0, x0 + sw, 0);
    gradB.addColorStop(0.0, '#444444');
    gradB.addColorStop(0.08, '#c2c2c2');
    gradB.addColorStop(0.5, '#969696');
    gradB.addColorStop(0.92, '#5a5a5a');
    gradB.addColorStop(1.0, '#303030');
    ctxB.fillStyle = gradB;
    ctxB.fillRect(x0, 0, sw, size);

    const gradR = ctxR.createLinearGradient(x0, 0, x0 + sw, 0);
    gradR.addColorStop(0.0, '#5a5a5a');
    gradR.addColorStop(0.18, '#2c2c2c');
    gradR.addColorStop(0.55, '#464646');
    gradR.addColorStop(0.92, '#282828');
    gradR.addColorStop(1.0, '#606060');
    ctxR.fillStyle = gradR;
    ctxR.fillRect(x0, 0, sw, size);

    // Curved abrasive wheel arcs inside each vertical stripe
    ctxB.save();
    ctxB.beginPath();
    ctxB.rect(x0, 0, sw, size);
    ctxB.clip();
    for (let y = -sw; y < size + sw; y += 3.2) {
      const v = Math.floor(110 + (rand() - 0.5) * 44);
      ctxB.strokeStyle = `rgba(${v},${v},${v},0.22)`;
      ctxB.lineWidth = 0.9;
      ctxB.beginPath();
      ctxB.arc(x0 + sw * 0.5, y + sw * 0.85, sw * 1.05, Math.PI * 1.18, Math.PI * 1.82);
      ctxB.stroke();
    }
    ctxB.restore();
  }

  return {
    bump: toTexture(cBump, { repeat: [1.5, 1.5] }),
    roughness: toTexture(cRough, { repeat: [1.5, 1.5] }),
  };
}

/**
 * Engine-turned Perlage (overlapping micro circular graining) for the mainplate.
 */
function createPerlage(size = 512, seed = 404) {
  const rand = createPRNG(seed);
  const cBump = makeCanvas(size, size);
  const ctxB = cBump.getContext('2d');
  const cRough = makeCanvas(size, size);
  const ctxR = cRough.getContext('2d');

  ctxB.fillStyle = '#787878';
  ctxB.fillRect(0, 0, size, size);
  ctxR.fillStyle = '#484848';
  ctxR.fillRect(0, 0, size, size);

  const step = 28;
  const rMax = 20;
  for (let row = -1; row <= size / step + 1; row++) {
    for (let col = -1; col <= size / step + 1; col++) {
      const cx = col * step + (row % 2 === 0 ? 0 : step * 0.5);
      const cy = row * (step * 0.78);
      for (let r = 2; r <= rMax; r += 2.2) {
        const shade = Math.floor(105 + Math.sin(r * 0.7) * 32 + (rand() - 0.5) * 18);
        ctxB.strokeStyle = `rgba(${shade},${shade},${shade},0.34)`;
        ctxB.lineWidth = 1.0;
        ctxB.beginPath();
        ctxB.arc(cx, cy, r, 0, Math.PI * 2);
        ctxB.stroke();

        const rs = Math.floor(42 + (r / rMax) * 36);
        ctxR.strokeStyle = `rgba(${rs},${rs},${rs},0.22)`;
        ctxR.lineWidth = 1.1;
        ctxR.beginPath();
        ctxR.arc(cx, cy, r, 0, Math.PI * 2);
        ctxR.stroke();
      }
    }
  }

  return {
    bump: toTexture(cBump, { repeat: [2, 2] }),
    roughness: toTexture(cRough, { repeat: [2, 2] }),
  };
}

/**
 * High-DPI 2048x2048 Skeleton Dial Chapter Ring Texture (color + alpha/emissive crispness)
 * Drawn precisely in polar coordinates matching RingGeometry(1.48, 1.73).
 */
function createDialChapterRingTexture(size = 2048) {
  const cColor = makeCanvas(size, size);
  const ctx = cColor.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.495;
  const innerR = outerR * (1.48 / 1.73);

  // Dark satin-gunmetal titanium chapter ring base
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.clip();

  const baseGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  baseGrad.addColorStop(0.0, '#12151c');
  baseGrad.addColorStop(0.18, '#1a1f28');
  baseGrad.addColorStop(0.84, '#1d222c');
  baseGrad.addColorStop(1.0, '#101319');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric lathe lines on chapter ring
  for (let r = innerR; r < outerR; r += 3.5) {
    ctx.strokeStyle = r % 7 < 3.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Outer rose-gold hairline accent border
  ctx.strokeStyle = 'rgba(214, 165, 108, 0.72)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Inner chamfer metallic highlight ring
  ctx.strokeStyle = 'rgba(200, 206, 214, 0.55)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR + 6, 0, Math.PI * 2);
  ctx.stroke();

  // 300 precision 1/5th-second micro-ticks + 60 crisp minute ticks + 12 bold hour marks
  for (let i = 0; i < 300; i++) {
    const ang = (i / 300) * Math.PI * 2 - Math.PI / 2;
    const isHour = i % 25 === 0;
    const isMinute = i % 5 === 0;
    const rOuter = outerR - 18;
    const len = isHour ? 58 : isMinute ? 40 : 18;
    const rInner = rOuter - len;

    ctx.strokeStyle = isHour
      ? '#E8C18E'
      : isMinute
        ? '#E6ECF4'
        : 'rgba(200, 206, 214, 0.45)';
    ctx.lineWidth = isHour ? 7 : isMinute ? 4 : 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * rInner, cy + Math.sin(ang) * rInner);
    ctx.lineTo(cx + Math.cos(ang) * rOuter, cy + Math.sin(ang) * rOuter);
    ctx.stroke();
  }

  // Crisp minute numerals at 05, 10, ..., 60 on inner side of minute track
  ctx.fillStyle = '#D5DCE6';
  ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numR = innerR + 38;
  for (let h = 1; h <= 12; h++) {
    if (h === 12 || h === 6) continue; // Keep 12 & 6 ultra-clean for double index & tourbillon
    const ang = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const label = String(h * 5).padStart(2, '0');
    const x = cx + Math.cos(ang) * numR;
    const y = cy + Math.sin(ang) * numR;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  // Micro "SWISS MADE" at 6 o'clock outer edge
  ctx.fillStyle = 'rgba(214, 165, 108, 0.85)';
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  const swiss = 'CHRONO  //  01';
  const arcSpan = 0.24;
  for (let i = 0; i < swiss.length; i++) {
    const u = i / (swiss.length - 1) - 0.5;
    const a = -Math.PI / 2 + u * arcSpan;
    const r = innerR + 36;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(swiss[i], 0, 0);
    ctx.restore();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(cColor);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures() {
  return {
    linearBrush: createLinearBrush(512, 101),
    radialBrush: createRadialBrush(512, 202),
    cotes: createCotesDeGeneve(512, 303),
    perlage: createPerlage(512, 404),
    dialRing: createDialChapterRingTexture(2048),
  };
}
