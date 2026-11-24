// Custom GLSL Cinema Post-Processing Pipeline
// Multisampled HDR render target -> Restrained Specular-Only UnrealBloomPass -> Custom ACES Filmic +
// Micro Corner Chromatic Aberration + Optical Vignette + Deterministic Fine Film Grain.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const CinemaGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uExposure: { value: 1.05 },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uExposure;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Exact ACES Filmic Tone Mapping (Stephen Hill RRT + ODT fit)
    vec3 ACESFilm(vec3 x) {
      const mat3 ACESInputMat = mat3(
        0.59719, 0.07600, 0.02840,
        0.35458, 0.90834, 0.13383,
        0.04823, 0.01566, 0.83777
      );
      const mat3 ACESOutputMat = mat3(
        1.60475, -0.10208, -0.00327,
       -0.53108,  1.10813, -0.07276,
       -0.07367, -0.00605,  1.07602
      );
      x = ACESInputMat * x;
      vec3 a = x * (x + 0.0245786) - 0.000090537;
      vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
      x = a / b;
      return clamp(ACESOutputMat * x, 0.0, 1.0);
    }

    // Deterministic high-frequency hash for ultra-fine cinema film grain (zero Math.random)
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      // Micro optical chromatic aberration strictly near frame corners (keeps center macro razor sharp!)
      vec2 caOffset = centered * r2 * 0.0042;
      float r = texture2D(tDiffuse, vUv + caOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - caOffset).b;
      vec3 hdr = vec3(r, g, b) * uExposure;

      // Subtle luxury contrast curve & ACES Filmic tone mapping
      vec3 col = ACESFilm(hdr);

      // Subtle optical lens vignette (keeps pure obsidian #06070A borders velvety deep)
      float vig = 1.0 - smoothstep(0.24, 0.92, r2 * 1.42) * 0.38;
      col *= vig;

      // Ultra-fine cinema film grain (quantized to 60fps time steps, zero random flicker)
      float frameIdx = floor(uTime * 60.0);
      float grain = hash12(gl_FragCoord.xy + vec2(frameIdx * 17.31, frameIdx * 43.17)) - 0.5;
      col += grain * 0.008;

      // Linear -> sRGB encoding
      col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPostProcessing(renderer, scene, camera, width, height) {
  // Multisampled HalfFloat HDR render target for silky anti-aliased metallic chamfers
  // Optional ?msaa=0 query flag allows fast software-WebGL offline MP4 rendering
  const params = new URLSearchParams(window.location.search);
  const samples = params.get('msaa') === '0' ? 0 : 4;
  const rt = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples,
  });

  const composer = new EffectComposer(renderer, rt);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Restrained specular-only bloom (strictly crisp pinpoint metallic & ruby glints, NEVER hazy!)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.13, // strength: refined micro-glint only
    0.20, // radius: tight crisp specular halo
    1.75  // threshold: only true high-HDR glints bloom
  );
  composer.addPass(bloomPass);

  const gradePass = new ShaderPass(CinemaGradeShader);
  gradePass.uniforms.uResolution.value.set(width, height);
  composer.addPass(gradePass);

  function resize(w, h) {
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    gradePass.uniforms.uResolution.value.set(w, h);
  }

  return {
    composer,
    bloomPass,
    gradePass,
    resize,
  };
}
