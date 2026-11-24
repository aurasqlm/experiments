// Frame-Locked 44.1kHz Stereo Procedural Soundtrack Engine via OfflineAudioContext
// Zero external MP3/WAV assets. Pre-renders the full 20.00s soundtrack once on user click
// so every mechanical snap, 4 Hz escapement tick-tock, sapphire chime, and orchestral resolve
// locks sample-accurately to renderAt(t) and supports seamless scrubbing/seeking!

import { createPRNG } from './prng.js';

const SAMPLE_RATE = 44100;
const RENDER_LEN_SEC = 20.4;

/**
 * Generates a short deterministic stereo algorithmic hall impulse response for luxury spatial depth.
 */
function createLuxuryReverbIR(ctx, duration = 2.4, decay = 2.8) {
  const rand = createPRNG(0xA0D10001);
  const len = Math.floor(SAMPLE_RATE * duration);
  const buf = ctx.createBuffer(2, len, SAMPLE_RATE);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, decay);
      const white = rand() * 2 - 1;
      // Warm velvet low-pass damping on reverb tail
      lp = lp * 0.72 + white * 0.28;
      data[i] = lp * env * 0.45;
    }
  }
  return buf;
}

/**
 * Synthesizes a crisp, dry horological metallic click / magnetic snap at exact timestamp `time`.
 */
function scheduleMetalClick(ctx, dest, time, { gain = 0.22, pitchScale = 1.0, pan = 0, heavy = false } = {}) {
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(pan, time);
  panner.connect(dest);

  // 1. Short high-Q metallic modal partials (machined Grade-5 Titanium & hardened steel)
  const modes = heavy
    ? [820, 1940, 3420, 5680]
    : [2350, 4120, 6780, 9420];
  const decays = heavy ? [0.048, 0.036, 0.025, 0.016] : [0.026, 0.019, 0.014, 0.009];

  modes.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(f * pitchScale, time);
    osc.frequency.exponentialRampToValueAtTime(f * pitchScale * 0.94, time + decays[idx]);
    const amp = gain * (heavy ? 0.34 : 0.28) / (idx * 0.55 + 1);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(amp, time + 0.0009);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decays[idx]);
    osc.connect(g);
    g.connect(panner);
    osc.start(time);
    osc.stop(time + decays[idx] + 0.01);
  });

  // 2. Micro magnetic thud / mechanical detent body
  const bodyOsc = ctx.createOscillator();
  const bodyG = ctx.createGain();
  bodyOsc.type = 'sine';
  bodyOsc.frequency.setValueAtTime((heavy ? 185 : 310) * pitchScale, time);
  bodyOsc.frequency.exponentialRampToValueAtTime(heavy ? 62 : 115, time + (heavy ? 0.055 : 0.024));
  bodyG.gain.setValueAtTime(0.0001, time);
  bodyG.gain.linearRampToValueAtTime(gain * (heavy ? 0.65 : 0.30), time + 0.0012);
  bodyG.gain.exponentialRampToValueAtTime(0.0001, time + (heavy ? 0.065 : 0.028));
  bodyOsc.connect(bodyG);
  bodyG.connect(panner);
  bodyOsc.start(time);
  bodyOsc.stop(time + 0.08);
}

/**
 * Synthesizes an authentic Swiss 4 Hz (8 beats/sec) lever escapement tick-tock impulse pair.
 * Each beat has dual micro-transients: unlock impulse + pallet drop (~3.5ms apart).
 */
function scheduleEscapementBeat(ctx, dest, time, isTick, volume) {
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(isTick ? -0.14 : 0.14, time);
  panner.connect(dest);

  const f1 = isTick ? 5420 : 4860;
  const f2 = isTick ? 8840 : 7920;

  // Sub-impulse A (unlock) + Sub-impulse B (pallet lock 3.2ms later)
  for (let sub = 0; sub < 2; sub++) {
    const t0 = time + sub * 0.0032;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sub === 0 ? f1 : f2, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(volume * (sub === 0 ? 0.55 : 0.85), t0 + 0.0005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.0085);
    osc.connect(g);
    g.connect(panner);
    osc.start(t0);
    osc.stop(t0 + 0.012);
  }
}

/**
 * Synthesizes a crystalline harmonic sapphire glass seal chime at t = 15.00s.
 */
function scheduleSapphireSealChime(ctx, dryDest, wetDest, time) {
  // Pure luminous F#maj9 glass harmonic cluster (F#5, C#6, G#6, A#6, F#7)
  const freqs = [739.99, 1108.73, 1661.22, 1864.66, 2959.96];
  const amps = [0.16, 0.13, 0.08, 0.06, 0.035];
  const durs = [2.6, 2.2, 1.8, 1.5, 1.1];

  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime((idx - 2) * 0.18, time);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(amps[idx], time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + durs[idx]);
    osc.connect(g);
    g.connect(pan);
    pan.connect(dryDest);
    pan.connect(wetDest);
    osc.start(time);
    osc.stop(time + durs[idx] + 0.05);
  });
}

/**
 * Minimalist felt-piano / harp harmonic note for the luxury cinema score.
 */
function scheduleLuxuryNote(ctx, dryDest, wetDest, time, freq, dur = 2.6, amp = 0.10, panPos = 0) {
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(panPos, time);
  pan.connect(dryDest);
  pan.connect(wetDest);

  const harmonics = [1, 2, 3, 4.01];
  const weights = [1.0, 0.34, 0.12, 0.04];

  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * h, time);
    const decay = dur / (i * 0.65 + 1);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(amp * weights[i], time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(g);
    g.connect(pan);
    osc.start(time);
    osc.stop(time + decay + 0.05);
  });
}

/**
 * Pre-renders the entire 20.00s stereo soundtrack into a single AudioBuffer.
 */
export async function prerenderSoundtrack() {
  const ctx = new OfflineAudioContext(2, Math.floor(SAMPLE_RATE * RENDER_LEN_SEC), SAMPLE_RATE);

  // Master compressor/limiter bus for pristine studio dynamics
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.92, 0);
  // Gentle fade-out only at very end (19.65 -> 20.05)
  masterGain.gain.setValueAtTime(0.92, 19.60);
  masterGain.gain.linearRampToValueAtTime(0.0001, 20.15);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-10, 0);
  comp.ratio.setValueAtTime(3.0, 0);
  comp.attack.setValueAtTime(0.004, 0);
  comp.release.setValueAtTime(0.18, 0);

  masterGain.connect(comp);
  comp.connect(ctx.destination);

  // Reverb bus for luxury score & sapphire chime (mechanical clicks stay crisp & dry with tiny room glue)
  const convolver = ctx.createConvolver();
  convolver.buffer = createLuxuryReverbIR(ctx, 2.6, 2.7);
  const wetGain = ctx.createGain();
  wetGain.gain.setValueAtTime(0.36, 0);
  convolver.connect(wetGain);
  wetGain.connect(masterGain);

  const clickWetSend = ctx.createGain();
  clickWetSend.gain.setValueAtTime(0.07, 0);
  clickWetSend.connect(convolver);

  const clickBus = ctx.createGain();
  clickBus.gain.setValueAtTime(1.0, 0);
  clickBus.connect(masterGain);
  clickBus.connect(clickWetSend);

  // =========================================================================
  // 1. DEEP VELVET OBSIDIAN SUB-BASS DRONE & STUDIO ROOM TONE (0.00 -> 20.00s)
  // =========================================================================
  const sub1 = ctx.createOscillator();
  const sub2 = ctx.createOscillator();
  const subFilter = ctx.createBiquadFilter();
  const subGain = ctx.createGain();
  sub1.type = 'sine';
  sub2.type = 'triangle';
  sub1.frequency.setValueAtTime(36.71, 0); // D1 velvet obsidian sub
  sub2.frequency.setValueAtTime(73.42, 0); // D2 warm harmonic
  subFilter.type = 'lowpass';
  subFilter.frequency.setValueAtTime(95, 0);
  subFilter.frequency.linearRampToValueAtTime(140, 8.5);
  subFilter.frequency.linearRampToValueAtTime(220, 18.0);

  subGain.gain.setValueAtTime(0.0001, 0);
  subGain.gain.linearRampToValueAtTime(0.13, 1.2);
  subGain.gain.setValueAtTime(0.14, 8.5);
  subGain.gain.linearRampToValueAtTime(0.18, 17.8);
  subGain.gain.linearRampToValueAtTime(0.0001, 20.05);

  sub1.connect(subFilter);
  sub2.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(masterGain);
  sub1.start(0);
  sub2.start(0);
  sub1.stop(20.1);
  sub2.stop(20.1);

  // =========================================================================
  // 2. FRAME-LOCKED MECHANICAL CLICKS & MAGNETIC SNAPS
  // =========================================================================
  // Shot 01: First iconic central jewel click at 1.24s
  scheduleMetalClick(ctx, clickBus, 1.24, { gain: 0.28, pitchScale: 1.05, pan: 0, heavy: false });

  // Shot 02: 6 Involute Gears seating (exact seatEnd timestamps from watchGeometry.js)
  const gearSeats = [
    { t: 3.18, p: 0.85, pan: -0.22, heavy: true },
    { t: 3.35, p: 0.96, pan: 0.0,   heavy: true },
    { t: 3.65, p: 1.06, pan: 0.22,  heavy: false },
    { t: 3.82, p: 1.02, pan: -0.28, heavy: false },
    { t: 3.92, p: 1.15, pan: 0.26,  heavy: false },
    { t: 4.18, p: 1.28, pan: 0.14,  heavy: false },
  ];
  for (const gs of gearSeats) {
    scheduleMetalClick(ctx, clickBus, gs.t, { gain: 0.24, pitchScale: gs.p, pan: gs.pan, heavy: gs.heavy });
  }

  // Shot 02: 3 Upper Skeleton Bridges locking home
  scheduleMetalClick(ctx, clickBus, 4.65, { gain: 0.26, pitchScale: 0.82, pan: -0.15, heavy: true });
  scheduleMetalClick(ctx, clickBus, 4.82, { gain: 0.25, pitchScale: 0.88, pan: 0.18,  heavy: true });
  scheduleMetalClick(ctx, clickBus, 4.98, { gain: 0.24, pitchScale: 0.92, pan: -0.20, heavy: true });

  // Shot 02: Micro bridge screws crisp cascade (4.80 .. 5.24s)
  for (let i = 0; i < 8; i++) {
    scheduleMetalClick(ctx, clickBus, 4.78 + i * 0.058, {
      gain: 0.11,
      pitchScale: 1.35 + i * 0.04,
      pan: ((i % 2 === 0 ? -1 : 1) * 0.25),
    });
  }

  // Shot 03: Tourbillon carriage (5.88s), bridge (6.02s), balance (6.14s), pallet (6.32s), hairspring ignition lock (6.50s)
  scheduleMetalClick(ctx, clickBus, 5.88, { gain: 0.22, pitchScale: 1.0, heavy: true });
  scheduleMetalClick(ctx, clickBus, 6.02, { gain: 0.20, pitchScale: 1.12, pan: 0.05 });
  scheduleMetalClick(ctx, clickBus, 6.14, { gain: 0.22, pitchScale: 1.22, pan: -0.05 });
  scheduleMetalClick(ctx, clickBus, 6.32, { gain: 0.18, pitchScale: 1.38, pan: 0.10 });
  scheduleMetalClick(ctx, clickBus, 6.50, { gain: 0.30, pitchScale: 1.18, heavy: true });

  // Shot 04: Titanium Case embrace (9.62s), Bezel lock (10.22s), 8 Blued-Steel Bezel Screws
  scheduleMetalClick(ctx, clickBus, 9.62,  { gain: 0.34, pitchScale: 0.72, heavy: true });
  scheduleMetalClick(ctx, clickBus, 10.22, { gain: 0.30, pitchScale: 0.84, heavy: true });
  for (let i = 0; i < 8; i++) {
    const tScrew = 10.50 + i * 0.11;
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    scheduleMetalClick(ctx, clickBus, tScrew, {
      gain: 0.18,
      pitchScale: 1.24 + (i % 3) * 0.06,
      pan: Math.cos(ang) * 0.35,
    });
  }

  // Shot 05: Dial Ring (12.24s), Hour/Minute/Seconds Hands (12.56s, 12.80s, 13.00s)
  scheduleMetalClick(ctx, clickBus, 12.24, { gain: 0.25, pitchScale: 0.92, heavy: true });
  scheduleMetalClick(ctx, clickBus, 12.56, { gain: 0.18, pitchScale: 1.26, pan: -0.08 });
  scheduleMetalClick(ctx, clickBus, 12.80, { gain: 0.19, pitchScale: 1.36, pan: 0.08 });
  scheduleMetalClick(ctx, clickBus, 13.00, { gain: 0.16, pitchScale: 1.52, pan: 0.0 });

  // Shot 05: Iconic double-detent Knurled Crown Push at 13.20s + rapid micro hand-setting ticks!
  scheduleMetalClick(ctx, clickBus, 13.18, { gain: 0.22, pitchScale: 1.05, pan: 0.32 });
  scheduleMetalClick(ctx, clickBus, 13.22, { gain: 0.34, pitchScale: 0.88, pan: 0.32, heavy: true });
  for (let i = 0; i < 12; i++) {
    scheduleMetalClick(ctx, clickBus, 13.26 + i * 0.048, {
      gain: 0.065 * (1 - i / 14),
      pitchScale: 1.6 + i * 0.05,
      pan: 0.15,
    });
  }

  // Shot 06: Sapphire Crystal Seal (15.00s) — crisp subtle vacuum lock + luminous harmonic glass chime!
  scheduleMetalClick(ctx, clickBus, 15.00, { gain: 0.20, pitchScale: 1.42, heavy: false });
  scheduleSapphireSealChime(ctx, masterGain, convolver, 15.00);

  // Shot 07: Articulated Titanium Bracelet cascading magnetic link snaps (16.52 .. 17.25s)
  for (let i = 0; i < 6; i++) {
    const tLink = 16.46 + i * 0.14;
    scheduleMetalClick(ctx, clickBus, tLink, {
      gain: 0.22 - i * 0.015,
      pitchScale: 0.86 + i * 0.055,
      pan: (i % 2 === 0 ? -0.24 : 0.24),
      heavy: i < 2,
    });
  }

  // =========================================================================
  // 3. AUTHENTIC 4 Hz (8 BEATS/SEC) SWISS ESCAPEMENT TICK-TOCK (6.50 -> 20.00s)
  // =========================================================================
  const tickInterval = 0.125; // 8 beats/sec = 28,800 vph
  let beatIdx = 0;
  for (let bt = 6.50; bt < 19.95; bt += tickInterval) {
    // Prominent in Shot 03 macro (6.50–8.50s), refined understated luxury presence thereafter
    const vol = bt < 8.50 ? 0.135 : bt < 16.00 ? 0.058 : 0.046;
    scheduleEscapementBeat(ctx, clickBus, bt, beatIdx % 2 === 0, vol);
    beatIdx++;
  }

  // =========================================================================
  // 4. MINIMALIST LUXURY CINEMA SCORE (Entering quietly at 8.50s -> 18.00s Resolve)
  // =========================================================================
  // Sparse crystalline felt-piano / harp harmonics in D add9 / F#m atmospheric voicing
  const scoreNotes = [
    { t: 8.55,  f: 293.66, d: 3.4, a: 0.085, p: -0.22 }, // D4
    { t: 9.85,  f: 440.00, d: 3.2, a: 0.080, p:  0.20 }, // A4
    { t: 11.20, f: 329.63, d: 3.0, a: 0.075, p: -0.15 }, // E4
    { t: 12.15, f: 587.33, d: 3.0, a: 0.072, p:  0.24 }, // D5
    { t: 13.22, f: 659.25, d: 3.4, a: 0.082, p:  0.12 }, // E5 (crown push bloom)
    { t: 14.10, f: 440.00, d: 3.2, a: 0.072, p: -0.22 }, // A4
    { t: 16.15, f: 369.99, d: 3.0, a: 0.085, p: -0.18 }, // F#4
    { t: 16.95, f: 554.37, d: 3.0, a: 0.078, p:  0.22 }, // C#5
  ];
  for (const n of scoreNotes) {
    scheduleLuxuryNote(ctx, masterGain, convolver, n.t, n.f, n.d, n.a, n.p);
  }

  // Shot 08 (18.00s): Resonant Low-Brass + Warm Piano Luxury Resolve Chord (D2 + A2 + D3 + F#3 + A4 + E5)
  const resolveT = 17.95;
  const brassFreqs = [73.42, 110.0, 146.83, 185.0];
  brassFreqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, resolveT);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(240, resolveT);
    filt.frequency.linearRampToValueAtTime(520, resolveT + 0.65);
    filt.frequency.linearRampToValueAtTime(190, 20.0);

    g.gain.setValueAtTime(0.0001, resolveT);
    g.gain.linearRampToValueAtTime(0.055 / (idx * 0.35 + 1), resolveT + 0.38);
    g.gain.linearRampToValueAtTime(0.0001, 20.1);

    osc.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    g.connect(convolver);
    osc.start(resolveT);
    osc.stop(20.12);
  });

  // Shimmering piano triad resolve on top at 18.00s
  scheduleLuxuryNote(ctx, masterGain, convolver, 18.00, 146.83, 2.4, 0.11,  0.0);
  scheduleLuxuryNote(ctx, masterGain, convolver, 18.02, 293.66, 2.4, 0.095, -0.2);
  scheduleLuxuryNote(ctx, masterGain, convolver, 18.06, 440.00, 2.3, 0.085,  0.2);
  scheduleLuxuryNote(ctx, masterGain, convolver, 18.12, 659.25, 2.2, 0.072,  0.05);

  return ctx.startRendering();
}
