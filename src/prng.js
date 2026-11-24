// Deterministic PRNG & Cinematic Easing Math Utilities
// Zero Math.random() anywhere in the application.

export function createPRNG(seed = 0xC4010001) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(x, lo = 0, hi = 1) {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function window01(t, start, end) {
  return clamp((t - start) / (end - start), 0, 1);
}

export function easeOutExpo(x) {
  const u = clamp(x, 0, 1);
  return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);
}

export function easeInOutCubic(x) {
  const u = clamp(x, 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

export function easeOutCubic(x) {
  const u = clamp(x, 0, 1);
  return 1 - Math.pow(1 - u, 3);
}

export function easeInOutQuart(x) {
  const u = clamp(x, 0, 1);
  return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2;
}

/**
 * Snappy magnetic overshoot -> micro-settle easing for horological parts locking home.
 * Hits 1.0 cleanly at u=1 with a crisp mechanical seat feel.
 */
export function easeMagneticSnap(x, overshoot = 0.045) {
  const u = clamp(x, 0, 1);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  // Fast expo-out approach up to u=0.82, subtle overshoot and crisp magnetic lock
  const base = 1 - Math.pow(2, -9.5 * u);
  const bump = Math.sin(u * Math.PI * 1.45) * Math.exp(-4.8 * u) * overshoot * 3.2;
  // Smoothly blend to exact 1 at u=1
  const tail = smoothstep(0.88, 1.0, u);
  return lerp(base + bump, 1.0, tail);
}
