// CHRONO // 01 — 20.00s 60fps 16:9 Pure-Code 3D Luxury Watch Commercial
// Entrypoint, Cinema Presentation Shell, Non-Blocking Audio Sync & Deterministic Time Controller

import * as THREE from 'three';
import { createProceduralTextures } from './textures.js';
import { buildStudioEnvironment, createStudioLights } from './studio.js';
import { buildWatchAssembly } from './watchGeometry.js';
import { createPostProcessing } from './postfx.js';
import { createTimelineController, DURATION } from './timeline.js';
import { buildAudioBuffer } from './audio.js';
import { clamp } from './prng.js';

function boot() {
  const stage = document.getElementById('stage');
  const canvasWrap = document.getElementById('canvas-wrap');
  const playOverlay = document.getElementById('play-overlay');
  const playBtn = document.getElementById('play-btn');
  const scrubTrack = document.getElementById('scrub-track');
  const scrubFill = document.getElementById('scrub-fill');
  const timeLabel = document.getElementById('time-label');
  const hudBar = document.getElementById('hud-bar');

  const lockupEl = document.getElementById('hero-lockup');
  const titleEl = document.getElementById('hero-title');
  const ruleEl = document.getElementById('hero-rule');
  const tagEl = document.getElementById('hero-tag');

  // 1. WebGL2 Renderer (HDR linear internal pipeline; ACES + sRGB handled in CinemaGradePass)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x06070A, 1);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  canvasWrap.appendChild(renderer.domElement);

  // 2. Scene, Camera, Procedural PMREM Studio Light Tent & Watch CAD Assembly
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070A);

  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 60);
  const envMap = buildStudioEnvironment(renderer);
  scene.environment = envMap;

  const textures = createProceduralTextures();
  const watch = buildWatchAssembly(textures);
  scene.add(watch.watchRoot);
  scene.add(watch.plinth.plinthGroup);

  const lights = createStudioLights(scene);

  const getStageSize = () => {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(180, Math.round(rect.height));
    return { w, h };
  };

  const initSize = getStageSize();
  renderer.setSize(initSize.w, initSize.h, false);
  const postfx = createPostProcessing(
    renderer,
    scene,
    camera,
    Math.round(initSize.w * dpr),
    Math.round(initSize.h * dpr)
  );

  // Typography update callback (pure function of t from timeline.js)
  const updateTypography = ({ titleAlpha, tagAlpha, lineScale }) => {
    const visible = titleAlpha > 0.002 || tagAlpha > 0.002;
    lockupEl.style.opacity = visible ? '1' : '0';
    titleEl.style.opacity = titleAlpha.toFixed(4);
    titleEl.style.transform = `translate3d(0, ${((1 - titleAlpha) * 10).toFixed(2)}px, 0)`;
    ruleEl.style.transform = `scaleX(${lineScale.toFixed(4)})`;
    ruleEl.style.opacity = (lineScale * 0.85).toFixed(4);
    tagEl.style.opacity = tagAlpha.toFixed(4);
    tagEl.style.transform = `translate3d(0, ${((1 - tagAlpha) * 7).toFixed(2)}px, 0)`;
  };

  const timeline = createTimelineController({
    camera,
    watch,
    lights,
    postfx,
    onTypographyUpdate: updateTypography,
  });

  // 3. Resize Observer
  const handleResize = () => {
    const { w, h } = getStageSize();
    renderer.setSize(w, h, false);
    postfx.resize(Math.round(w * dpr), Math.round(h * dpr));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    drawFrame(currentTime);
  };
  window.addEventListener('resize', handleResize);

  // 4. Instant Non-Blocking Web Audio Engine (never freezes video playback!)
  let audioCtx = null;
  let soundtrackBuffer = null;
  let activeSource = null;

  function ensureAudioContext() {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      if (!soundtrackBuffer) {
        soundtrackBuffer = buildAudioBuffer(audioCtx);
      }
      return audioCtx;
    } catch (_) {
      return null;
    }
  }

  function stopAudioSource() {
    if (activeSource) {
      try {
        activeSource.stop();
        activeSource.disconnect();
      } catch (_) {}
      activeSource = null;
    }
  }

  function startAudioAt(offsetSec) {
    stopAudioSource();
    const ctx = ensureAudioContext();
    if (!ctx || !soundtrackBuffer) return;

    const launch = () => {
      if (!isPlaying) return;
      stopAudioSource();
      const liveOffset = clamp(currentTime, 0, DURATION - 0.02);
      try {
        const src = ctx.createBufferSource();
        src.buffer = soundtrackBuffer;
        src.connect(ctx.destination);
        src.start(0, liveOffset);
        activeSource = src;
      } catch (_) {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(launch).catch(() => {});
    } else {
      launch();
    }
  }

  // 5. Playback & Deterministic Scrubbing State
  let currentTime = 0.0;
  let isPlaying = false;
  let playAnchorPerf = 0;
  let playAnchorTime = 0;

  function formatTime(sec) {
    const s = clamp(sec, 0, DURATION);
    const whole = Math.floor(s);
    const frac = Math.floor((s - whole) * 100);
    return `00:${String(whole).padStart(2, '0')}.${String(frac).padStart(2, '0')}`;
  }

  function updateHUD(t) {
    const pct = (clamp(t, 0, DURATION) / DURATION) * 100;
    scrubFill.style.width = `${pct.toFixed(3)}%`;
    timeLabel.textContent = `${formatTime(t)} / 00:20.00`;
  }

  function drawFrame(t) {
    currentTime = clamp(t, 0, DURATION);
    timeline.renderAt(currentTime);
    postfx.composer.render();
    updateHUD(currentTime);
  }

  function playFrom(startSec = currentTime) {
    const target = startSec >= DURATION - 0.04 ? 0.0 : clamp(startSec, 0, DURATION);
    playOverlay.classList.add('hidden');
    stage.classList.remove('initial-paused');

    // Start video playback IMMEDIATELY with zero async blocking!
    currentTime = target;
    playAnchorTime = target;
    playAnchorPerf = performance.now();
    isPlaying = true;
    drawFrame(target);

    // Unlock and start synchronized stereo soundtrack non-blockingly
    startAudioAt(target);
  }

  function pause() {
    if (!isPlaying) return;
    isPlaying = false;
    stopAudioSource();
    drawFrame(currentTime);
  }

  function togglePlay() {
    if (isPlaying) pause();
    else playFrom(currentTime);
  }

  function seekTo(sec, keepPlaying = false) {
    const target = clamp(sec, 0, DURATION);
    playOverlay.classList.add('hidden');
    stage.classList.remove('initial-paused');
    currentTime = target;
    playAnchorTime = target;
    playAnchorPerf = performance.now();
    drawFrame(target);
    if (keepPlaying && isPlaying) {
      startAudioAt(target);
    } else if (!keepPlaying) {
      isPlaying = false;
      stopAudioSource();
    }
  }

  // Deterministic seek hooks for automated capture & inspection
  window.__setTime = (sec) => {
    const num = Number(sec);
    if (!Number.isFinite(num)) return currentTime;
    hudBar.classList.add('capture-hidden');
    seekTo(num, false);
    return currentTime;
  };
  window.__play = () => playFrom(currentTime);
  window.__pause = () => pause();

  // 6. Minimal Cinema Controls
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playFrom(currentTime >= DURATION - 0.04 ? 0.0 : currentTime);
  });

  // Also allow clicking anywhere on the initial play overlay to start cleanly
  playOverlay.addEventListener('click', () => {
    playFrom(0.0);
  });

  // Hover scrub bar dragging
  let isScrubbing = false;
  let wasPlayingBeforeScrub = false;

  const scrubFromClientX = (clientX) => {
    const rect = scrubTrack.getBoundingClientRect();
    const u = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    seekTo(u * DURATION, false);
  };

  scrubTrack.addEventListener('pointerdown', (e) => {
    isScrubbing = true;
    wasPlayingBeforeScrub = isPlaying;
    scrubTrack.setPointerCapture(e.pointerId);
    scrubFromClientX(e.clientX);
  });

  scrubTrack.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    scrubFromClientX(e.clientX);
  });

  const endScrub = (e) => {
    if (!isScrubbing) return;
    isScrubbing = false;
    try {
      scrubTrack.releasePointerCapture(e.pointerId);
    } catch (_) {}
    if (wasPlayingBeforeScrub) {
      playFrom(currentTime);
    }
  };
  scrubTrack.addEventListener('pointerup', endScrub);
  scrubTrack.addEventListener('pointercancel', endScrub);

  // Keyboard shortcuts: Space (play/pause), R (replay), Left/Right (±0.25s)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      hudBar.classList.remove('capture-hidden');
      togglePlay();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      hudBar.classList.remove('capture-hidden');
      playFrom(0.0);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      hudBar.classList.remove('capture-hidden');
      seekTo(currentTime - 0.25, false);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      hudBar.classList.remove('capture-hidden');
      seekTo(currentTime + 0.25, false);
    }
  });

  // 7. URL ?t= Parameter Support
  const params = new URLSearchParams(window.location.search);
  const queryT = params.get('t');
  if (queryT !== null && queryT !== '' && Number.isFinite(Number(queryT))) {
    hudBar.classList.add('capture-hidden');
    seekTo(Number(queryT), false);
  } else {
    timeline.renderAt(1.45);
    postfx.composer.render();
    currentTime = 0.0;
    updateHUD(0.0);
    stage.classList.add('initial-paused');
  }

  // 8. Rock-Solid 60fps Monotonic Master Loop (never freezes even if browser suspends audio)
  function tick() {
    requestAnimationFrame(tick);
    if (!isPlaying) return;

    const nextT = playAnchorTime + (performance.now() - playAnchorPerf) / 1000.0;
    if (nextT >= DURATION) {
      drawFrame(DURATION);
      isPlaying = false;
      stopAudioSource();
      return;
    }

    drawFrame(nextT);
  }

  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
