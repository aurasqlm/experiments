// Pure Deterministic 44.1kHz Stereo PCM Soundtrack Synthesizer (Zero external assets, zero OfflineAudioContext hangs!)
// Synthesizes the full 20.00s soundtrack in ~40ms directly into Float32 stereo channels.
// Works identically in every browser (Web Audio AudioBuffer) AND in Node.js (WAV export for MP4 rendering).

const DURATION_SEC = 20.3;

export function synthesizeSoundtrackPCM(sampleRate = 44100) {
  const totalSamples = Math.floor(sampleRate * DURATION_SEC);
  const L = new Float32Array(totalSamples);
  const R = new Float32Array(totalSamples);
  const wetL = new Float32Array(totalSamples);
  const wetR = new Float32Array(totalSamples);
  const TWO_PI = Math.PI * 2;

  const panGains = (pan) => {
    const p = Math.max(-1, Math.min(1, pan));
    const ang = (p + 1) * 0.25 * Math.PI;
    return [Math.cos(ang), Math.sin(ang)];
  };

  // Helper: add damped modal sine/triangle burst to dry + optional wet reverb send
  const addTone = (startSec, durSec, freqStart, freqEnd, amp, pan = 0, wetSend = 0, attackSec = 0.001, shape = 0) => {
    const i0 = Math.max(0, Math.floor(startSec * sampleRate));
    const len = Math.floor(durSec * sampleRate);
    const i1 = Math.min(totalSamples, i0 + len);
    const atkSamples = Math.max(1, Math.floor(attackSec * sampleRate));
    const [gL, gR] = panGains(pan);
    const decayRate = 6.5 / Math.max(0.004, durSec);
    let phase = 0;

    for (let i = i0; i < i1; i++) {
      const k = i - i0;
      const t = k / sampleRate;
      const u = k / Math.max(1, len);
      const f = freqStart + (freqEnd - freqStart) * u;
      phase += (TWO_PI * f) / sampleRate;

      const env = (k < atkSamples ? k / atkSamples : 1.0) * Math.exp(-t * decayRate);
      let s = Math.sin(phase);
      if (shape === 1) {
        // Warm triangle harmonic blend
        s = s * 0.78 + Math.sin(phase * 3) * 0.14;
      } else if (shape === 2) {
        // Low-passed brass saw blend
        s = s * 0.65 + Math.sin(phase * 2) * 0.26 + Math.sin(phase * 3) * 0.11;
      }
      const v = s * amp * env;
      L[i] += v * gL;
      R[i] += v * gR;
      if (wetSend > 0) {
        wetL[i] += v * gL * wetSend;
        wetR[i] += v * gR * wetSend;
      }
    }
  };

  // Crisp dry horological metallic click / magnetic micro-snap
  const addMetalClick = (time, { gain = 0.22, pitchScale = 1.0, pan = 0, heavy = false } = {}) => {
    const modes = heavy ? [820, 1940, 3420, 5680] : [2350, 4120, 6780, 9420];
    const decays = heavy ? [0.052, 0.038, 0.026, 0.017] : [0.028, 0.020, 0.014, 0.010];
    for (let m = 0; m < modes.length; m++) {
      const f = modes[m] * pitchScale;
      const a = (gain * (heavy ? 0.34 : 0.28)) / (m * 0.55 + 1);
      addTone(time, decays[m], f, f * 0.94, a, pan, 0.10, 0.0007, m % 2);
    }
    // Magnetic detent body thud
    addTone(
      time,
      heavy ? 0.068 : 0.030,
      (heavy ? 185 : 310) * pitchScale,
      heavy ? 60 : 112,
      gain * (heavy ? 0.62 : 0.28),
      pan,
      0.06,
      0.001,
      0
    );
  };

  // Authentic 4 Hz (8 beats/sec) Swiss lever escapement dual-impulse tick-tock
  const addEscapementBeat = (time, isTick, vol) => {
    const pan = isTick ? -0.15 : 0.15;
    const f1 = isTick ? 5420 : 4860;
    const f2 = isTick ? 8840 : 7920;
    addTone(time, 0.009, f1, f1 * 0.96, vol * 0.55, pan, 0.06, 0.0004, 1);
    addTone(time + 0.0032, 0.009, f2, f2 * 0.96, vol * 0.85, pan, 0.06, 0.0004, 1);
  };

  // Minimalist luxury felt-piano / harp harmonic note
  const addLuxuryNote = (time, freq, dur = 2.8, amp = 0.095, pan = 0) => {
    const hs = [1, 2, 3, 4.01];
    const ws = [1.0, 0.34, 0.11, 0.035];
    for (let i = 0; i < hs.length; i++) {
      addTone(time, dur / (i * 0.6 + 1), freq * hs[i], freq * hs[i], amp * ws[i], pan, 0.45, 0.012, 0);
    }
  };

  // =========================================================================
  // 1. DEEP VELVET OBSIDIAN SUB-BASS DRONE (0.00 -> 20.00s)
  // =========================================================================
  {
    let p1 = 0;
    let p2 = 0;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const fadeIn = Math.min(1, t / 1.1);
      const fadeOut = t > 19.4 ? Math.max(0, 1 - (t - 19.4) / 0.7) : 1;
      const swell = 0.12 + 0.05 * Math.max(0, Math.min(1, (t - 8.5) / 9.5));
      p1 += (TWO_PI * 36.71) / sampleRate;
      p2 += (TWO_PI * 73.42) / sampleRate;
      const v = (Math.sin(p1) * 0.72 + Math.sin(p2) * 0.28) * swell * fadeIn * fadeOut;
      L[i] += v;
      R[i] += v;
    }
  }

  // =========================================================================
  // 2. FRAME-LOCKED MECHANICAL CLICKS & MAGNETIC SNAPS
  // =========================================================================
  // Shot 01: Iconic first jewel seat click at 1.24s
  addMetalClick(1.24, { gain: 0.28, pitchScale: 1.05, pan: 0, heavy: false });

  // Shot 02: 6 Involute Gears seating
  const gearSeats = [
    { t: 3.18, p: 0.85, pan: -0.22, heavy: true },
    { t: 3.35, p: 0.96, pan: 0.0, heavy: true },
    { t: 3.65, p: 1.06, pan: 0.22, heavy: false },
    { t: 3.82, p: 1.02, pan: -0.28, heavy: false },
    { t: 3.92, p: 1.15, pan: 0.26, heavy: false },
    { t: 4.18, p: 1.28, pan: 0.14, heavy: false },
  ];
  for (const gs of gearSeats) addMetalClick(gs.t, { gain: 0.24, pitchScale: gs.p, pan: gs.pan, heavy: gs.heavy });

  // Shot 02: 3 Upper Skeleton Bridges + 8 micro screws
  addMetalClick(4.65, { gain: 0.26, pitchScale: 0.82, pan: -0.15, heavy: true });
  addMetalClick(4.82, { gain: 0.25, pitchScale: 0.88, pan: 0.18, heavy: true });
  addMetalClick(4.98, { gain: 0.24, pitchScale: 0.92, pan: -0.20, heavy: true });
  for (let i = 0; i < 8; i++) {
    addMetalClick(4.78 + i * 0.058, {
      gain: 0.11,
      pitchScale: 1.35 + i * 0.04,
      pan: (i % 2 === 0 ? -1 : 1) * 0.25,
    });
  }

  // Shot 03: Tourbillon carriage, bridge, balance, pallet & ignition lock at 6.50s
  addMetalClick(5.88, { gain: 0.22, pitchScale: 1.0, heavy: true });
  addMetalClick(6.02, { gain: 0.20, pitchScale: 1.12, pan: 0.05 });
  addMetalClick(6.14, { gain: 0.22, pitchScale: 1.22, pan: -0.05 });
  addMetalClick(6.32, { gain: 0.18, pitchScale: 1.38, pan: 0.10 });
  addMetalClick(6.50, { gain: 0.30, pitchScale: 1.18, heavy: true });

  // Shot 04: Titanium Case, Bezel, & 8 Bezel Screws
  addMetalClick(9.62, { gain: 0.34, pitchScale: 0.72, heavy: true });
  addMetalClick(10.22, { gain: 0.30, pitchScale: 0.84, heavy: true });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TWO_PI + Math.PI / 8;
    addMetalClick(10.50 + i * 0.11, {
      gain: 0.18,
      pitchScale: 1.24 + (i % 3) * 0.06,
      pan: Math.cos(ang) * 0.35,
    });
  }

  // Shot 05: Dial Ring, Hands, & Crown Push (13.20s) + hand-sweep ratchet ticks
  addMetalClick(12.24, { gain: 0.25, pitchScale: 0.92, heavy: true });
  addMetalClick(12.56, { gain: 0.18, pitchScale: 1.26, pan: -0.08 });
  addMetalClick(12.80, { gain: 0.19, pitchScale: 1.36, pan: 0.08 });
  addMetalClick(13.00, { gain: 0.16, pitchScale: 1.52, pan: 0.0 });
  addMetalClick(13.18, { gain: 0.22, pitchScale: 1.05, pan: 0.32 });
  addMetalClick(13.22, { gain: 0.34, pitchScale: 0.88, pan: 0.32, heavy: true });
  for (let i = 0; i < 12; i++) {
    addMetalClick(13.26 + i * 0.048, {
      gain: 0.065 * (1 - i / 14),
      pitchScale: 1.6 + i * 0.05,
      pan: 0.15,
    });
  }

  // Shot 06: Sapphire Crystal Seal (15.00s) — click + crystalline F#maj9 glass harmonic chime
  addMetalClick(15.00, { gain: 0.20, pitchScale: 1.42 });
  const chimeFreqs = [739.99, 1108.73, 1661.22, 1864.66, 2959.96];
  const chimeAmps = [0.14, 0.11, 0.072, 0.052, 0.030];
  const chimeDurs = [2.6, 2.2, 1.8, 1.5, 1.1];
  for (let i = 0; i < chimeFreqs.length; i++) {
    addTone(15.00, chimeDurs[i], chimeFreqs[i], chimeFreqs[i], chimeAmps[i], (i - 2) * 0.18, 0.55, 0.008, 0);
  }

  // Shot 07: Articulated Titanium Bracelet cascading snaps
  for (let i = 0; i < 6; i++) {
    addMetalClick(16.46 + i * 0.14, {
      gain: 0.22 - i * 0.015,
      pitchScale: 0.86 + i * 0.055,
      pan: i % 2 === 0 ? -0.24 : 0.24,
      heavy: i < 2,
    });
  }

  // =========================================================================
  // 3. AUTHENTIC 4 Hz (8 BEATS/SEC) SWISS ESCAPEMENT TICK-TOCK (6.50 -> 20.00s)
  // =========================================================================
  let beatIdx = 0;
  for (let bt = 6.50; bt < 19.95; bt += 0.125) {
    const vol = bt < 8.50 ? 0.13 : bt < 16.00 ? 0.056 : 0.044;
    addEscapementBeat(bt, beatIdx % 2 === 0, vol);
    beatIdx++;
  }

  // =========================================================================
  // 4. MINIMALIST LUXURY CINEMA SCORE (8.55s -> 18.00s Resolve)
  // =========================================================================
  const scoreNotes = [
    { t: 8.55, f: 293.66, d: 3.4, a: 0.085, p: -0.22 },
    { t: 9.85, f: 440.00, d: 3.2, a: 0.080, p: 0.20 },
    { t: 11.20, f: 329.63, d: 3.0, a: 0.075, p: -0.15 },
    { t: 12.15, f: 587.33, d: 3.0, a: 0.072, p: 0.24 },
    { t: 13.22, f: 659.25, d: 3.4, a: 0.082, p: 0.12 },
    { t: 14.10, f: 440.00, d: 3.2, a: 0.072, p: -0.22 },
    { t: 16.15, f: 369.99, d: 3.0, a: 0.085, p: -0.18 },
    { t: 16.95, f: 554.37, d: 3.0, a: 0.078, p: 0.22 },
  ];
  for (const n of scoreNotes) addLuxuryNote(n.t, n.f, n.d, n.a, n.p);

  // Shot 08 (17.95s): Warm Low-Brass + Piano Luxury Resolve Chord
  const brassFreqs = [73.42, 110.0, 146.83, 185.0];
  brassFreqs.forEach((f, idx) => {
    addTone(17.95, 2.3, f, f, 0.065 / (idx * 0.35 + 1), (idx - 1.5) * 0.14, 0.42, 0.35, 2);
  });
  addLuxuryNote(18.00, 146.83, 2.3, 0.11, 0.0);
  addLuxuryNote(18.02, 293.66, 2.3, 0.095, -0.2);
  addLuxuryNote(18.06, 440.00, 2.2, 0.085, 0.2);
  addLuxuryNote(18.12, 659.25, 2.1, 0.072, 0.05);

  // =========================================================================
  // 5. FAST STEREO MULTI-TAP VELVET HALL REVERB + SOFT MASTER LIMITER
  // =========================================================================
  const tapsL = [
    [Math.floor(0.037 * sampleRate), 0.36],
    [Math.floor(0.083 * sampleRate), 0.28],
    [Math.floor(0.149 * sampleRate), 0.22],
    [Math.floor(0.241 * sampleRate), 0.16],
    [Math.floor(0.379 * sampleRate), 0.11],
  ];
  const tapsR = [
    [Math.floor(0.043 * sampleRate), 0.36],
    [Math.floor(0.097 * sampleRate), 0.28],
    [Math.floor(0.163 * sampleRate), 0.22],
    [Math.floor(0.263 * sampleRate), 0.16],
    [Math.floor(0.409 * sampleRate), 0.11],
  ];

  // Add feedback damping tail into wet buffers + mix into master with soft tanh limiting & clean end fade
  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < totalSamples; i++) {
    let rL = 0;
    let rR = 0;
    for (let t = 0; t < tapsL.length; t++) {
      const idxL = i - tapsL[t][0];
      const idxR = i - tapsR[t][0];
      if (idxL >= 0) rL += wetL[idxL] * tapsL[t][1];
      if (idxR >= 0) rR += wetR[idxR] * tapsR[t][1];
    }
    lpL = lpL * 0.65 + rL * 0.35;
    lpR = lpR * 0.65 + rR * 0.35;
    wetL[i] += lpL * 0.42;
    wetR[i] += lpR * 0.42;

    const sec = i / sampleRate;
    const endFade = sec > 19.65 ? Math.max(0, 1 - (sec - 19.65) / 0.45) : 1.0;
    L[i] = Math.tanh((L[i] + lpL * 0.62) * 1.08) * 0.92 * endFade;
    R[i] = Math.tanh((R[i] + lpR * 0.62) * 1.08) * 0.92 * endFade;
  }

  return { sampleRate, left: L, right: R, length: totalSamples };
}

/**
 * Wraps the instant synthesized Float32 PCM directly into a Web Audio AudioBuffer.
 */
export function buildAudioBuffer(audioCtx) {
  const pcm = synthesizeSoundtrackPCM(44100);
  const buf = audioCtx.createBuffer(2, pcm.length, pcm.sampleRate);
  buf.getChannelData(0).set(pcm.left);
  buf.getChannelData(1).set(pcm.right);
  return buf;
}
