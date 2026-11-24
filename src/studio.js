// Procedural PMREM Watch-Photography Studio Light Tent & Dynamic Specular Sweep Rig
// Pitch-black negative fill + long overhead crisp white softbox strips + warm rose-gold rim kicker + cool fill.

import * as THREE from 'three';

function createSoftboxTexture(hexCore = '#ffffff', hexEdge = '#b8cce8') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
  g.addColorStop(0.0, hexCore);
  g.addColorStop(0.52, hexCore);
  g.addColorStop(0.82, hexEdge);
  g.addColorStop(1.0, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an ultra-high-contrast horological studio PMREM environment map.
 * Carefully engineered negative fill zones prevent washed-out grey metal.
 */
export function buildStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x020305);

  const whiteSoftTex = createSoftboxTexture('#F8FAFF', '#C5D2E6');
  const warmSoftTex = createSoftboxTexture('#FFF2DC', '#D6A56C');
  const coolSoftTex = createSoftboxTexture('#DCEBFF', '#466AA8');

  const addPanel = (w, h, color, intensity, pos, lookAt, map = whiteSoftTex) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      map,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    envScene.add(mesh);
    return mesh;
  };

  // 1. Primary overhead long luxury softbox strip (liquid-mercury bevel reflections without flat blowout)
  addPanel(14, 1.9, 0xF5F7FA, 2.85, [0, 8.2, 4.2], [0, 0, 0], whiteSoftTex);

  // 2. Secondary diagonal key softbox ribbon (upper-left crisp edge reflection across sapphire & hands)
  addPanel(10.5, 1.3, 0xF5F7FA, 2.35, [-6.2, 5.4, 5.8], [0, 0, 0], whiteSoftTex);

  // 3. Warm 18k champagne-gold rim kicker (right-back edge to fire up rose-gold involute gears)
  addPanel(3.4, 10.5, 0xFFE3BC, 2.55, [8.2, 1.4, 2.2], [0, 0, 0], warmSoftTex);

  // 4. Subtle cool architectural steel fill (left flank, keeps Grade-5 titanium sculptural)
  addPanel(4.2, 9.0, 0x99BAEE, 1.25, [-8.4, -1.5, 3.6], [0, 0, 0], coolSoftTex);

  // 5. Crisp low front horizon reflection strip (lights underside bevels of lugs & dauphine hands)
  addPanel(10.5, 0.95, 0xE4ECF8, 1.55, [0.5, -6.4, 6.2], [0, 0, 0], whiteSoftTex);

  // 6. Sharp specular pinpoint kicker behind top-right (catches chamfered edges & ruby facets)
  addPanel(1.1, 1.1, 0xFFFFFF, 3.8, [5.4, 6.0, 5.6], [0, 0, 0], whiteSoftTex);

  // 7. Rear silhouette rim strip (for exhibition caseback & bracelet edge contour)
  addPanel(12.0, 1.8, 0xDCE6F5, 2.1, [0, 3.5, -8.2], [0, 0, 0], whiteSoftTex);

  // 8. Very quiet dark floor bounce so bottom facets aren't dead black
  addPanel(16, 16, 0x0E121A, 0.35, [0, -9.0, 0], [0, 0, 0], whiteSoftTex);

  const envRT = pmrem.fromScene(envScene, 0.025);
  pmrem.dispose();
  whiteSoftTex.dispose();
  warmSoftTex.dispose();
  coolSoftTex.dispose();

  return envRT.texture;
}

/**
 * Dynamic studio lighting rig whose positions and intensities are pure functions of time t.
 */
export function createStudioLights(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Primary sweeping key light (white crisp softbox feel)
  const keyLight = new THREE.DirectionalLight(0xF5F7FA, 1.65);
  keyLight.position.set(3.8, 5.8, 7.8);
  group.add(keyLight);

  // Warm rose-gold rim kicker
  const warmRim = new THREE.DirectionalLight(0xFFD9AA, 1.55);
  warmRim.position.set(6.8, 1.4, -2.2);
  group.add(warmRim);

  // Cool architectural fill from left-front
  const coolFill = new THREE.DirectionalLight(0x9BBCEB, 0.85);
  coolFill.position.set(-6.5, -1.8, 4.5);
  group.add(coolFill);

  // Controlled sweeping specular accent light (positioned further back to avoid flat-plane hotspots!)
  const sweepLight = new THREE.PointLight(0xFFFFFF, 1.8, 28, 1.4);
  sweepLight.position.set(-5.0, 3.6, 6.2);
  group.add(sweepLight);

  // Subtle warm movement cavity light so recessed rose-gold involute gears gleam cleanly
  const movementLight = new THREE.PointLight(0xFFE0B8, 1.05, 14, 1.6);
  movementLight.position.set(0.3, -0.5, 4.4);
  group.add(movementLight);

  // Dedicated scanning rim light for Shot 07 silhouette reveal
  const scanRimLight = new THREE.PointLight(0xE8F1FF, 0.0, 16, 1.4);
  scanRimLight.position.set(0, -4.0, -2.8);
  group.add(scanRimLight);

  // Very quiet obsidian ambient floor (never washes out shadows)
  const hemi = new THREE.HemisphereLight(0x2A3242, 0x040508, 0.24);
  group.add(hemi);

  return {
    group,
    keyLight,
    warmRim,
    coolFill,
    sweepLight,
    movementLight,
    scanRimLight,
    hemi,
  };
}
