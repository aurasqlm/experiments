// CAD-Level Procedural Horological Watch Geometry for "CHRONO // 01"
// Grade-5 Titanium & 18k Rose-Gold Skeleton Tourbillon Mechanical Watch
// Zero external assets — every gear tooth, chamfer, bridge, screw, jewel, hand, and link is procedural.

import * as THREE from 'three';

export const GEAR_MODULE = 0.027;

// Mathematically exact meshing gear train layout (pitch circle distance = rA + rB)
// Every gear meshes tooth-into-valley with zero overlap against neighbors or the 6 o'clock tourbillon.
function buildGearTrainSpec() {
  const m = GEAR_MODULE;
  const r = (z) => (m * z) * 0.5;

  // Gear 2: Center Great Wheel (0, 0), 30T, 18k Rose Gold (r=0.405)
  const g2 = { id: 'center', teeth: 30, r: r(30), x: 0, y: 0, z: -0.02, spokes: 5, mat: 'roseGold', thickness: 0.034, parent: null, seatStart: 2.75, seatEnd: 3.35, dropDir: 1 };

  // Gear 1: Mainspring Barrel Wheel, 36T, Brushed Titanium + Rose Gold rim, upper-left (132 deg)
  const a1 = (132 * Math.PI) / 180;
  const d12 = r(30) + r(36);
  const g1 = { id: 'barrel', teeth: 36, r: r(36), x: Math.cos(a1) * d12, y: Math.sin(a1) * d12, z: -0.035, spokes: 6, mat: 'titaniumBrushed', accentRim: true, thickness: 0.044, parent: 'center', alphaFromParent: a1, seatStart: 2.55, seatEnd: 3.18, dropDir: -1 };

  // Gear 3: Third Intermediate Wheel, 24T, Brushed Titanium, upper-right (28 deg)
  const a3 = (28 * Math.PI) / 180;
  const d23 = r(30) + r(24);
  const g3 = { id: 'third', teeth: 24, r: r(24), x: Math.cos(a3) * d23, y: Math.sin(a3) * d23, z: -0.02, spokes: 4, mat: 'titaniumBrushed', thickness: 0.030, parent: 'center', alphaFromParent: a3, seatStart: 3.05, seatEnd: 3.65, dropDir: 1 };

  // Gear 4: Fourth / Seconds Drive Wheel, 20T, 18k Rose Gold, right flank (-72 deg from Gear 3)
  const a34 = (-72 * Math.PI) / 180;
  const d34 = r(24) + r(20);
  const g4 = { id: 'fourth', teeth: 20, r: r(20), x: g3.x + Math.cos(a34) * d34, y: g3.y + Math.sin(a34) * d34, z: -0.02, spokes: 5, mat: 'roseGold', thickness: 0.028, parent: 'third', alphaFromParent: a34, seatStart: 3.32, seatEnd: 3.92, dropDir: -1 };

  // Gear 5: Escape Wheel (Club-Tooth), 15T, Satin Rose Gold, feeding the tourbillon (-114 deg from Gear 4)
  const a45 = (-114 * Math.PI) / 180;
  const d45 = r(20) + r(15);
  const g5 = { id: 'escape', teeth: 15, r: r(15), x: g4.x + Math.cos(a45) * d45, y: g4.y + Math.sin(a45) * d45, z: -0.02, spokes: 3, mat: 'roseGoldPolished', isEscape: true, thickness: 0.024, parent: 'fourth', alphaFromParent: a45, seatStart: 3.58, seatEnd: 4.18, dropDir: 1 };

  // Gear 6: Winding / Auxiliary Ratchet Wheel, 26T, Satin Rose Gold, lower-left (202 deg from Center)
  const a6 = (202 * Math.PI) / 180;
  const d26 = r(30) + r(26);
  const g6 = { id: 'ratchet', teeth: 26, r: r(26), x: Math.cos(a6) * d26, y: Math.sin(a6) * d26, z: -0.02, spokes: 5, mat: 'roseGold', thickness: 0.032, parent: 'center', alphaFromParent: a6, seatStart: 3.20, seatEnd: 3.82, dropDir: 1 };

  return [g1, g2, g3, g4, g5, g6];
}

export const GEAR_SPECS = buildGearTrainSpec();
export const TOURBILLON_POS = new THREE.Vector3(0, -0.90, -0.02);

/**
 * Normalizes planar XY UVs to [0..1] around a radius so radial/Côtes/perlage textures map cleanly.
 */
function applyPlanarUVs(geo, scale = 1.0) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = 0.5 + (pos.getX(i) / (scale * 2));
    uv[i * 2 + 1] = 0.5 + (pos.getY(i) / (scale * 2));
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * Builds a true toothed involute-profile spur gear with chamfered rims and skeletonized spokes.
 */
function createInvoluteGearGeometry(teeth, mod, thickness, spokes = 5, isEscape = false) {
  const pitchR = (mod * teeth) * 0.5;
  const outerR = pitchR + mod * (isEscape ? 1.15 : 0.92);
  const rootR = Math.max(0.05, pitchR - mod * (isEscape ? 1.25 : 1.12));
  const rimInnerR = Math.max(0.04, rootR - mod * (isEscape ? 1.8 : 2.3));
  const hubOuterR = Math.min(rimInnerR * 0.45, Math.max(0.075, pitchR * 0.28));
  const boreR = Math.min(hubOuterR * 0.45, 0.042);

  const shape = new THREE.Shape();
  const pitchAngle = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const aCenter = i * pitchAngle;
    if (isEscape) {
      // Swiss club-tooth escape wheel profile (slender angled impulse teeth)
      const a0 = aCenter - pitchAngle * 0.42;
      const a1 = aCenter - pitchAngle * 0.14;
      const a2 = aCenter + pitchAngle * 0.08;
      const a3 = aCenter + pitchAngle * 0.24;
      const a4 = aCenter + pitchAngle * 0.34;
      const pts = [
        [Math.cos(a0) * rootR, Math.sin(a0) * rootR],
        [Math.cos(a1) * (rootR + (outerR - rootR) * 0.28), Math.sin(a1) * (rootR + (outerR - rootR) * 0.28)],
        [Math.cos(a2) * outerR, Math.sin(a2) * outerR],
        [Math.cos(a3) * (outerR * 0.97), Math.sin(a3) * (outerR * 0.97)],
        [Math.cos(a4) * rootR, Math.sin(a4) * rootR],
      ];
      if (i === 0) shape.moveTo(pts[0][0], pts[0][1]);
      else shape.lineTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k][0], pts[k][1]);
    } else {
      // True involute-approximated flank profile (root -> base -> pitch -> tip -> pitch -> base -> root)
      const halfTooth = pitchAngle * 0.245;
      const halfTip = pitchAngle * 0.125;
      const halfRoot = pitchAngle * 0.345;
      const midR = (rootR + pitchR) * 0.52;
      const upperR = (pitchR + outerR) * 0.55;

      const pts = [
        [aCenter - halfRoot, rootR],
        [aCenter - halfTooth * 1.12, midR],
        [aCenter - halfTooth, pitchR],
        [aCenter - (halfTooth + halfTip) * 0.5, upperR],
        [aCenter - halfTip, outerR],
        [aCenter + halfTip, outerR],
        [aCenter + (halfTooth + halfTip) * 0.5, upperR],
        [aCenter + halfTooth, pitchR],
        [aCenter + halfTooth * 1.12, midR],
        [aCenter + halfRoot, rootR],
      ];
      for (let k = 0; k < pts.length; k++) {
        const px = Math.cos(pts[k][0]) * pts[k][1];
        const py = Math.sin(pts[k][0]) * pts[k][1];
        if (i === 0 && k === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
    }
  }
  shape.closePath();

  // Central arbor bore
  const bore = new THREE.Path();
  bore.absarc(0, 0, boreR, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  // Skeletonized horological sector spoke cutouts
  if (rimInnerR - hubOuterR > 0.045 && spokes >= 3) {
    const spokeSpan = (Math.PI * 2) / spokes;
    const spokeHalfWidthAngle = Math.min(0.16, 0.036 / Math.max(0.12, hubOuterR));
    for (let s = 0; s < spokes; s++) {
      const a0 = s * spokeSpan + spokeHalfWidthAngle;
      const a1 = (s + 1) * spokeSpan - spokeHalfWidthAngle;
      const a0Out = s * spokeSpan + spokeHalfWidthAngle * 0.62;
      const a1Out = (s + 1) * spokeSpan - spokeHalfWidthAngle * 0.62;
      if (a1 - a0 < 0.14) continue;
      const hole = new THREE.Path();
      const segs = 10;
      for (let k = 0; k <= segs; k++) {
        const a = a0 + (a1 - a0) * (k / segs);
        const px = Math.cos(a) * hubOuterR;
        const py = Math.sin(a) * hubOuterR;
        if (k === 0) hole.moveTo(px, py);
        else hole.lineTo(px, py);
      }
      for (let k = segs; k >= 0; k--) {
        const a = a0Out + (a1Out - a0Out) * (k / segs);
        hole.lineTo(Math.cos(a) * rimInnerR, Math.sin(a) * rimInnerR);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  const bevel = Math.min(0.006, thickness * 0.2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.72,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -thickness * 0.5);
  applyPlanarUVs(geo, outerR);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a precision slotted micro-screw geometry (beveled head + genuine recessed slot + threaded shank).
 */
function createSlottedScrewGeometry(radius = 0.055, headH = 0.032) {
  const shape = new THREE.Shape();
  const slotHalfW = radius * 0.17;
  const aSlot = Math.asin(Math.min(0.95, slotHalfW / radius));

  // Build top semi-cylindrical half-moon D-shape? Even cleaner: extrude full circular head base + two raised D-lands for a crisp physical slot!
  // We'll merge base + two D-cap halves into one single BufferGeometry for InstancedMesh use!
  const baseGeo = new THREE.CylinderGeometry(radius * 0.96, radius * 0.88, headH * 0.55, 20);
  baseGeo.rotateX(Math.PI / 2);
  baseGeo.translate(0, 0, -headH * 0.25);

  const halfShape1 = new THREE.Shape();
  halfShape1.absarc(0, 0, radius, aSlot, Math.PI - aSlot, false);
  halfShape1.closePath();

  const halfShape2 = new THREE.Shape();
  halfShape2.absarc(0, 0, radius, Math.PI + aSlot, Math.PI * 2 - aSlot, false);
  halfShape2.closePath();

  const extrudeOpts = {
    depth: headH * 0.45,
    bevelEnabled: true,
    bevelThickness: headH * 0.14,
    bevelSize: radius * 0.08,
    bevelSegments: 2,
    curveSegments: 14,
  };
  const cap1 = new THREE.ExtrudeGeometry(halfShape1, extrudeOpts);
  const cap2 = new THREE.ExtrudeGeometry(halfShape2, extrudeOpts);

  return mergeSimpleGeometries([baseGeo, cap1, cap2]);
}

/**
 * Lightweight deterministic geometry merger (positions, normals, uvs) with zero external addon imports.
 */
function mergeSimpleGeometries(geos) {
  const normalized = geos.map((g) => {
    const nonIdx = g.index ? g.toNonIndexed() : g.clone();
    if (!nonIdx.attributes.normal) nonIdx.computeVertexNormals();
    if (!nonIdx.attributes.uv) {
      const c = nonIdx.attributes.position.count;
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c * 2), 2));
    }
    return nonIdx;
  });

  let totalVerts = 0;
  for (const g of normalized) totalVerts += g.attributes.position.count;

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);

  let offset = 0;
  for (const g of normalized) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const u = g.attributes.uv.array;
    pos.set(p, offset * 3);
    norm.set(n, offset * 3);
    uv.set(u, offset * 2);
    offset += g.attributes.position.count;
    g.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/**
 * Creates a faceted horological Dauphine hand with true diamond cross-section (4 crisp light-catching planes).
 */
function createDauphineHandGeometry(length, tailLen, maxWidth, ridgeHeight) {
  const tip = [0, length, 0.002];
  const tail = [0, -tailLen, 0.002];
  const left = [-maxWidth * 0.5, 0.04, 0];
  const right = [maxWidth * 0.5, 0.04, 0];
  const topPeak = [0, 0.04, ridgeHeight];
  const botPeak = [0, 0.04, -ridgeHeight * 0.45];

  const tris = [
    // Top 4 crisp diamond facets (split strictly down the central ridge for iconic half-lit luxury look)
    tip, left, topPeak,
    tip, topPeak, right,
    tail, topPeak, left,
    tail, right, topPeak,
    // Underside facets
    tip, botPeak, left,
    tip, right, botPeak,
    tail, left, botPeak,
    tail, botPeak, right,
  ];

  const positions = new Float32Array(tris.length * 3);
  for (let i = 0; i < tris.length; i++) {
    positions[i * 3] = tris[i][0];
    positions[i * 3 + 1] = tris[i][1];
    positions[i * 3 + 2] = tris[i][2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the Skeleton Titanium Mainplate with architectural openworked apertures.
 */
function createMainplateGeometry() {
  const outer = new THREE.Shape();
  outer.absarc(0, 0, 1.70, 0, Math.PI * 2, false);

  // 1. Large 6 o'clock Flying Tourbillon circular aperture
  const tourbHole = new THREE.Path();
  tourbHole.absarc(TOURBILLON_POS.x, TOURBILLON_POS.y, 0.54, 0, Math.PI * 2, true);
  outer.holes.push(tourbHole);

  // 2. Architectural triangular/arc skeleton cutouts around upper & side quadrants
  const addArcCutout = (rIn, rOut, a0, a1) => {
    const h = new THREE.Path();
    const segs = 16;
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (a1 - a0) * (i / segs);
      const x = Math.cos(a) * rIn;
      const y = Math.sin(a) * rIn;
      if (i === 0) h.moveTo(x, y);
      else h.lineTo(x, y);
    }
    for (let i = segs; i >= 0; i--) {
      const a = a0 + (a1 - a0) * (i / segs);
      h.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
    }
    h.closePath();
    outer.holes.push(h);
  };

  // Sculpted openworked windows carefully placed so pivot seats remain solid!
  addArcCutout(0.55, 1.44, 0.72, 1.46);   // 1 o'clock window
  addArcCutout(0.92, 1.48, 1.66, 2.02);   // 11 o'clock crescent
  addArcCutout(0.62, 1.46, 2.74, 3.24);   // 9 o'clock window
  addArcCutout(0.74, 1.44, -0.26, 0.20);  // 3 o'clock keyless window
  addArcCutout(0.86, 1.45, -2.56, -2.18); // 7:30 balance window

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.068,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 48,
  });
  geo.translate(0, 0, -0.23);
  applyPlanarUVs(geo, 1.72);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds 3 sculpted Openworked Upper Skeleton Bridges (Côtes de Genève titanium).
 */
function createSkeletonBridges(matCotes, matPolished) {
  const bridges = [];

  const extrudeBridge = (shape, depth = 0.042, zPos = 0.075) => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.010,
      bevelSegments: 3,
      curveSegments: 28,
    });
    geo.translate(0, 0, zPos);
    applyPlanarUVs(geo, 1.65);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, matCotes);
    return mesh;
  };

  // Bridge A: Upper-Left Barrel-to-Center sweeping architectural bridge
  const bA = new THREE.Shape();
  bA.moveTo(-1.54, 0.56);
  bA.quadraticCurveTo(-1.18, 1.38, -0.22, 1.56);
  bA.quadraticCurveTo(0.24, 1.48, 0.16, 1.02);
  bA.quadraticCurveTo(-0.08, 0.52, 0.17, 0.16);
  bA.quadraticCurveTo(0.22, -0.14, -0.16, -0.16);
  bA.quadraticCurveTo(-0.46, 0.24, -0.82, 0.34);
  bA.quadraticCurveTo(-1.30, 0.24, -1.54, 0.56);

  // Jewel/arbor clearance holes in Bridge A (at barrel C1 and center C2)
  const holeC1 = new THREE.Path();
  holeC1.absarc(GEAR_SPECS[0].x, GEAR_SPECS[0].y, 0.14, 0, Math.PI * 2, true);
  bA.holes.push(holeC1);
  const holeC2 = new THREE.Path();
  holeC2.absarc(0, 0, 0.12, 0, Math.PI * 2, true);
  bA.holes.push(holeC2);

  // Skeleton slot in Bridge A so you see the rose-gold barrel teeth gleaming through
  const slotA = new THREE.Path();
  slotA.absellipse(-0.36, 0.96, 0.22, 0.11, 0, Math.PI * 2, true, -0.55);
  bA.holes.push(slotA);
  bridges.push({ id: 'bridgeA', mesh: extrudeBridge(bA, 0.044, 0.072), seatStart: 4.10, seatEnd: 4.65 });

  // Bridge B: Right-Side Gear Train Y-Bridge (anchors Gear 3, Gear 4, Gear 5)
  const bB = new THREE.Shape();
  bB.moveTo(0.42, 0.78);
  bB.quadraticCurveTo(1.16, 0.88, 1.52, 0.36);
  bB.quadraticCurveTo(1.56, -0.24, 1.18, -0.68);
  bB.quadraticCurveTo(0.68, -0.94, 0.18, -0.84);
  bB.quadraticCurveTo(0.06, -0.64, 0.36, -0.50);
  bB.quadraticCurveTo(0.48, -0.24, 0.48, 0.16);
  bB.quadraticCurveTo(0.46, 0.44, 0.42, 0.78);

  const holeC3 = new THREE.Path();
  holeC3.absarc(GEAR_SPECS[2].x, GEAR_SPECS[2].y, 0.105, 0, Math.PI * 2, true);
  bB.holes.push(holeC3);
  const holeC4 = new THREE.Path();
  holeC4.absarc(GEAR_SPECS[3].x, GEAR_SPECS[3].y, 0.095, 0, Math.PI * 2, true);
  bB.holes.push(holeC4);
  const holeC5 = new THREE.Path();
  holeC5.absarc(GEAR_SPECS[4].x, GEAR_SPECS[4].y, 0.085, 0, Math.PI * 2, true);
  bB.holes.push(holeC5);

  // Skeletonized window inside Bridge B
  const slotB = new THREE.Path();
  slotB.absellipse(1.06, 0.05, 0.24, 0.12, 0, Math.PI * 2, true, 1.2);
  bB.holes.push(slotB);
  bridges.push({ id: 'bridgeB', mesh: extrudeBridge(bB, 0.040, 0.074), seatStart: 4.28, seatEnd: 4.82 });

  // Bridge C: Lower-Left Counterbalance Skeleton Bridge (anchors Gear 6)
  const bC = new THREE.Shape();
  bC.moveTo(-1.54, -0.18);
  bC.quadraticCurveTo(-1.46, -0.86, -0.92, -1.24);
  bC.quadraticCurveTo(-0.56, -1.22, -0.56, -0.88);
  bC.quadraticCurveTo(-0.58, -0.44, -0.64, -0.20);
  bC.quadraticCurveTo(-1.05, -0.02, -1.54, -0.18);

  const holeC6 = new THREE.Path();
  holeC6.absarc(GEAR_SPECS[5].x, GEAR_SPECS[5].y, 0.105, 0, Math.PI * 2, true);
  bC.holes.push(holeC6);
  bridges.push({ id: 'bridgeC', mesh: extrudeBridge(bC, 0.040, 0.072), seatStart: 4.46, seatEnd: 4.98 });

  // Tourbillon Arched Twin-Arm Bridge (horizontally spanning the 6 o'clock aperture)
  const tbShape = new THREE.Shape();
  tbShape.moveTo(-0.74, -0.10);
  tbShape.quadraticCurveTo(-0.34, -0.05, -0.14, -0.12);
  tbShape.absarc(0, 0, 0.145, -Math.PI * 0.72, -Math.PI * 0.28, false);
  tbShape.quadraticCurveTo(0.34, -0.05, 0.74, -0.10);
  tbShape.quadraticCurveTo(0.82, 0.0, 0.74, 0.10);
  tbShape.quadraticCurveTo(0.34, 0.05, 0.14, 0.12);
  tbShape.absarc(0, 0, 0.145, Math.PI * 0.28, Math.PI * 0.72, false);
  tbShape.quadraticCurveTo(-0.34, 0.05, -0.74, 0.10);
  tbShape.quadraticCurveTo(-0.82, 0.0, -0.74, -0.10);
  const tbHole = new THREE.Path();
  tbHole.absarc(0, 0, 0.075, 0, Math.PI * 2, true);
  tbShape.holes.push(tbHole);

  const tbGeo = new THREE.ExtrudeGeometry(tbShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 24,
  });
  tbGeo.translate(0, 0, 0.095);
  applyPlanarUVs(tbGeo, 0.85);
  tbGeo.computeVertexNormals();
  const tourbBridgeMesh = new THREE.Mesh(tbGeo, matPolished);
  tourbBridgeMesh.position.set(TOURBILLON_POS.x, TOURBILLON_POS.y, 0);

  return { bridges, tourbBridgeMesh };
}

/**
 * Builds the Sculpted Grade-5 Titanium Case Body, 4 Curved Integrated Lugs, Crown Guards,
 * Chamfered Bezel, Knurled Winding Crown, and Exhibition Caseback.
 */
function createCaseAndHardware(mats) {
  const caseGroup = new THREE.Group();

  // 1. Sculpted Case Middle (LatheGeometry rotated to align with Z axis)
  const caseProfile = [
    new THREE.Vector2(1.71, -0.36),
    new THREE.Vector2(1.94, -0.36),
    new THREE.Vector2(2.06, -0.26),
    new THREE.Vector2(2.12, -0.12),
    new THREE.Vector2(2.12,  0.14),
    new THREE.Vector2(2.06,  0.24),
    new THREE.Vector2(1.72,  0.24),
    new THREE.Vector2(1.70,  0.14),
    new THREE.Vector2(1.70, -0.26),
    new THREE.Vector2(1.71, -0.36),
  ];
  const caseLathe = new THREE.LatheGeometry(caseProfile, 96);
  caseLathe.rotateX(Math.PI / 2);
  caseLathe.computeVertexNormals();
  const caseBodyMesh = new THREE.Mesh(caseLathe, mats.titaniumBrushed);
  caseGroup.add(caseBodyMesh);

  // Polished upper & lower chamfered accent rings on the case body
  const chamferRingGeo = new THREE.TorusGeometry(2.075, 0.022, 16, 96);
  const upperChamfer = new THREE.Mesh(chamferRingGeo, mats.titaniumPolished);
  upperChamfer.position.z = 0.22;
  caseGroup.add(upperChamfer);

  const lowerChamfer = new THREE.Mesh(chamferRingGeo, mats.titaniumPolished);
  lowerChamfer.position.z = -0.26;
  caseGroup.add(lowerChamfer);

  // Exhibition sapphire caseback glass + titanium ring
  const backRingGeo = new THREE.RingGeometry(1.48, 1.72, 72);
  const backRing = new THREE.Mesh(backRingGeo, mats.titaniumCotes);
  backRing.position.z = -0.35;
  backRing.rotation.y = Math.PI;
  caseGroup.add(backRing);

  const backGlassGeo = new THREE.CircleGeometry(1.50, 64);
  const backGlass = new THREE.Mesh(backGlassGeo, mats.sapphirePhysical);
  backGlass.position.z = -0.355;
  backGlass.rotation.y = Math.PI;
  caseGroup.add(backGlass);

  // 2. 4 Sculpted Curved Integrated Lugs (tapered ergonomic curve extending at 12 & 6 o'clock)
  const lugSideShape = new THREE.Shape();
  lugSideShape.moveTo(1.86, 0.21);
  lugSideShape.quadraticCurveTo(2.34, 0.19, 2.74, 0.02);
  lugSideShape.quadraticCurveTo(2.86, -0.05, 2.82, -0.24);
  lugSideShape.quadraticCurveTo(2.68, -0.37, 2.48, -0.36);
  lugSideShape.quadraticCurveTo(2.20, -0.33, 1.86, -0.30);
  lugSideShape.closePath();

  const lugGeo = new THREE.ExtrudeGeometry(lugSideShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.028,
    bevelSegments: 3,
    curveSegments: 20,
  });
  lugGeo.translate(0, 0, -0.17);
  // Rotate so X->Y (radial out), Y->Z (thickness curve), Z->X (lug width)
  lugGeo.rotateY(-Math.PI / 2);
  lugGeo.rotateZ(Math.PI / 2);
  // Wait: let's transform explicitly via matrix for 100% predictability:
  // Original lugSideShape has: u = radial distance [1.86..2.86], v = Z height [-0.37..+0.21], extrude depth = width [-0.17..+0.17]
  const rawLug = new THREE.ExtrudeGeometry(lugSideShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.026,
    bevelSegments: 3,
    curveSegments: 20,
  });
  rawLug.translate(0, 0, -0.17);
  // Map (x, y, z) -> (z, x, y) so width is along X, radial extension along +Y, curve height along Z!
  const lPos = rawLug.attributes.position;
  for (let i = 0; i < lPos.count; i++) {
    const ox = lPos.getX(i);
    const oy = lPos.getY(i);
    const oz = lPos.getZ(i);
    // Subtle outer taper along radial ox
    const taper = 1.0 - Math.max(0, (ox - 1.9) / 1.1) * 0.24;
    lPos.setXYZ(i, oz * taper, ox, oy);
  }
  rawLug.computeVertexNormals();
  lugGeo.dispose();

  const lugPositions = [
    { x: -0.78, sy: 1, rotZ: 0.09 },
    { x:  0.78, sy: 1, rotZ: -0.09 },
    { x: -0.78, sy: -1, rotZ: -0.09 },
    { x:  0.78, sy: -1, rotZ: 0.09 },
  ];
  for (const lp of lugPositions) {
    const m = new THREE.Mesh(rawLug, mats.titaniumBrushed);
    m.position.set(lp.x, 0, 0);
    m.scale.set(1, lp.sy, 1);
    m.rotation.z = lp.rotZ;
    caseGroup.add(m);
  }

  // Polished rose-gold end-link bridge accents tucked between upper & lower lugs
  const endBridgeGeo = new THREE.BoxGeometry(1.16, 0.28, 0.24);
  const topEndBridge = new THREE.Mesh(endBridgeGeo, mats.titaniumCotes);
  topEndBridge.position.set(0, 2.18, -0.08);
  caseGroup.add(topEndBridge);
  const botEndBridge = new THREE.Mesh(endBridgeGeo, mats.titaniumCotes);
  botEndBridge.position.set(0, -2.18, -0.08);
  caseGroup.add(botEndBridge);

  // 3. Sculpted Twin Crown Guards flanking 3 o'clock (+X)
  const guardShape = new THREE.Shape();
  guardShape.moveTo(1.94, 0.54);
  guardShape.quadraticCurveTo(2.28, 0.44, 2.34, 0.24);
  guardShape.lineTo(2.14, 0.20);
  guardShape.lineTo(1.94, 0.22);
  guardShape.closePath();
  const guardGeo = new THREE.ExtrudeGeometry(guardShape, {
    depth: 0.30,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelSegments: 2,
  });
  guardGeo.translate(0, 0, -0.15);
  const upperGuard = new THREE.Mesh(guardGeo, mats.titaniumBrushed);
  caseGroup.add(upperGuard);
  const lowerGuard = new THREE.Mesh(guardGeo, mats.titaniumBrushed);
  lowerGuard.scale.y = -1;
  caseGroup.add(lowerGuard);

  // 4. Chamfered Titanium Bezel (animated separately in Shot 04!)
  const bezelGroup = new THREE.Group();
  const bezelProfile = [
    new THREE.Vector2(1.71, 0.23),
    new THREE.Vector2(2.07, 0.23),
    new THREE.Vector2(2.09, 0.29),
    new THREE.Vector2(1.98, 0.38),
    new THREE.Vector2(1.77, 0.38),
    new THREE.Vector2(1.71, 0.33),
    new THREE.Vector2(1.71, 0.23),
  ];
  const bezelGeo = new THREE.LatheGeometry(bezelProfile, 96);
  bezelGeo.rotateX(Math.PI / 2);
  bezelGeo.computeVertexNormals();
  const bezelMesh = new THREE.Mesh(bezelGeo, mats.titaniumBrushed);
  bezelGroup.add(bezelMesh);

  // Crisp polished inner bezel lip catching specular ring highlights
  const innerLipGeo = new THREE.TorusGeometry(1.745, 0.016, 14, 96);
  const innerLip = new THREE.Mesh(innerLipGeo, mats.titaniumPolished);
  innerLip.position.z = 0.368;
  bezelGroup.add(innerLip);

  // Outer rose-gold hairline gasket ring under the bezel
  const gasketGeo = new THREE.TorusGeometry(2.055, 0.015, 12, 96);
  const gasket = new THREE.Mesh(gasketGeo, mats.roseGoldPolished);
  gasket.position.z = 0.235;
  bezelGroup.add(gasket);

  // 8 Recessed circular countersunk screw pockets on the bezel top
  const pocketGeo = new THREE.CylinderGeometry(0.068, 0.064, 0.025, 20);
  pocketGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const pocket = new THREE.Mesh(pocketGeo, mats.titaniumPerlage);
    pocket.position.set(Math.cos(ang) * 1.885, Math.sin(ang) * 1.885, 0.372);
    bezelGroup.add(pocket);
  }

  // 5. 8 Blued-Steel Slotted Bezel Micro-Screws (individual meshes for crisp Shot 04 radial lock-in)
  const bezelScrewGeo = createSlottedScrewGeometry(0.056, 0.032);
  const bezelScrews = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const screw = new THREE.Mesh(bezelScrewGeo, mats.bluedSteel);
    const sx = Math.cos(ang) * 1.885;
    const sy = Math.sin(ang) * 1.885;
    screw.position.set(sx, sy, 0.382);
    // Align slots tangentially around the bezel like Audemars Piguet / haute horlogerie!
    screw.rotation.z = ang + Math.PI / 2;
    bezelScrews.push({
      mesh: screw,
      ang,
      targetPos: new THREE.Vector3(sx, sy, 0.382),
      seatStart: 10.22 + i * 0.11,
      seatEnd: 10.50 + i * 0.11,
    });
  }

  // 6. Precision Knurled Winding Crown (3 o'clock, animated sliding in at t=13.20s!)
  const crownGroup = new THREE.Group();
  const fluteCount = 24;
  const crownShape = new THREE.Shape();
  for (let i = 0; i < fluteCount * 2; i++) {
    const a = (i / (fluteCount * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? 0.245 : 0.218;
    if (i === 0) crownShape.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else crownShape.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  crownShape.closePath();
  const knurlGeo = new THREE.ExtrudeGeometry(crownShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  knurlGeo.rotateY(Math.PI / 2);
  const knurlMesh = new THREE.Mesh(knurlGeo, mats.titaniumBrushed);
  knurlMesh.position.x = 2.13;
  crownGroup.add(knurlMesh);

  // Winding stem tube
  const stemGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.42, 16);
  stemGeo.rotateZ(Math.PI / 2);
  const stemMesh = new THREE.Mesh(stemGeo, mats.titaniumPolished);
  stemMesh.position.x = 1.98;
  crownGroup.add(stemMesh);

  // Rose-gold accent collar on crown
  const collarGeo = new THREE.TorusGeometry(0.226, 0.022, 12, 32);
  collarGeo.rotateY(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, mats.roseGoldPolished);
  collarMesh.position.x = 2.18;
  crownGroup.add(collarMesh);

  // Domed cap & engraved emblem bar on crown face
  const capGeo = new THREE.CylinderGeometry(0.16, 0.21, 0.04, 24);
  capGeo.rotateZ(-Math.PI / 2);
  const capMesh = new THREE.Mesh(capGeo, mats.titaniumPolished);
  capMesh.position.x = 2.38;
  crownGroup.add(capMesh);

  const emblemGeo = new THREE.BoxGeometry(0.022, 0.16, 0.032);
  const emblem1 = new THREE.Mesh(emblemGeo, mats.roseGoldPolished);
  emblem1.position.x = 2.405;
  crownGroup.add(emblem1);
  const emblem2 = new THREE.Mesh(emblemGeo, mats.roseGoldPolished);
  emblem2.rotation.x = Math.PI / 2;
  emblem2.position.x = 2.405;
  crownGroup.add(emblem2);

  return { caseGroup, bezelGroup, bezelScrews, crownGroup };
}

/**
 * Builds the Live Flying Tourbillon, 4 Hz Oscillating Balance Wheel, Coiled Spiral Hairspring,
 * and Rocking Pallet Fork at 6 o'clock.
 */
function createTourbillonAssembly(mats) {
  const tourbillonRoot = new THREE.Group();
  tourbillonRoot.position.copy(TOURBILLON_POS);

  // 1. Tourbillon 3-Arm Sculpted Carriage (rotates smoothly 1 RPM once active)
  const cageGroup = new THREE.Group();
  const cageRingGeo = new THREE.TorusGeometry(0.425, 0.021, 14, 48);
  const cageRingUpper = new THREE.Mesh(cageRingGeo, mats.titaniumPolished);
  cageRingUpper.position.z = 0.045;
  cageGroup.add(cageRingUpper);

  const cageRingLower = new THREE.Mesh(cageRingGeo, mats.titaniumBrushed);
  cageRingLower.position.z = -0.045;
  cageGroup.add(cageRingLower);

  // 3 sculpted titanium carriage arms + vertical pillars
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const armGeo = new THREE.BoxGeometry(0.38, 0.030, 0.020);
    const arm = new THREE.Mesh(armGeo, mats.titaniumPolished);
    arm.position.set(Math.cos(a) * 0.225, Math.sin(a) * 0.225, 0.045);
    arm.rotation.z = a;
    cageGroup.add(arm);

    const pillarGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.10, 12);
    pillarGeo.rotateX(Math.PI / 2);
    const pillar = new THREE.Mesh(pillarGeo, mats.roseGoldPolished);
    pillar.position.set(Math.cos(a) * 0.408, Math.sin(a) * 0.408, 0);
    cageGroup.add(pillar);
  }

  // Central blued-steel tourbillon pointer cap
  const cageHub = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.12, 20).rotateX(Math.PI / 2), mats.titaniumPolished);
  cageGroup.add(cageHub);
  tourbillonRoot.add(cageGroup);

  // 2. Free-Sprung 18k Rose-Gold Balance Wheel (oscillates at 4 Hz!)
  const balanceGroup = new THREE.Group();
  const balRimProfile = [
    new THREE.Vector2(0.320, -0.024),
    new THREE.Vector2(0.384, -0.024),
    new THREE.Vector2(0.390,  0.000),
    new THREE.Vector2(0.384,  0.024),
    new THREE.Vector2(0.320,  0.024),
    new THREE.Vector2(0.315,  0.000),
    new THREE.Vector2(0.320, -0.024),
  ];
  const balRimGeo = new THREE.LatheGeometry(balRimProfile, 64);
  balRimGeo.rotateX(Math.PI / 2);
  balRimGeo.computeVertexNormals();
  const balRimMesh = new THREE.Mesh(balRimGeo, mats.roseGoldPolished);
  balanceGroup.add(balRimMesh);

  // 3 tapered balance spokes
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const spGeo = new THREE.BoxGeometry(0.33, 0.022, 0.016);
    const sp = new THREE.Mesh(spGeo, mats.roseGold);
    sp.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0);
    sp.rotation.z = a;
    balanceGroup.add(sp);
  }

  // 8 Micro Gold Inertia Timing Screws around outer balance rim (InstancedMesh!)
  const weightGeo = new THREE.CylinderGeometry(0.015, 0.013, 0.048, 10);
  const weightsInst = new THREE.InstancedMesh(weightGeo, mats.titaniumPolished, 8);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    dummy.position.set(Math.cos(a) * 0.402, Math.sin(a) * 0.402, 0);
    dummy.rotation.set(0, 0, a - Math.PI / 2);
    dummy.updateMatrix();
    weightsInst.setMatrixAt(i, dummy.matrix);
  }
  weightsInst.instanceMatrix.needsUpdate = true;
  balanceGroup.add(weightsInst);

  // Central balance staff & ruby shock jewel
  const staffMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.13, 18).rotateX(Math.PI / 2), mats.titaniumPolished);
  balanceGroup.add(staffMesh);
  tourbillonRoot.add(balanceGroup);

  // 3. Coiled Spiral Blued-Steel Hairspring (TubeGeometry along 5.5-turn Archimedean spiral)
  const spiralPts = [];
  const turns = 5.5;
  const totalPts = 220;
  for (let i = 0; i <= totalPts; i++) {
    const u = i / totalPts;
    const ang = u * turns * Math.PI * 2;
    const rad = 0.062 + u * 0.222;
    spiralPts.push(new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad, 0.024));
  }
  const spiralCurve = new THREE.CatmullRomCurve3(spiralPts);
  const hairspringGeo = new THREE.TubeGeometry(spiralCurve, 220, 0.0062, 6, false);
  const hairspringMesh = new THREE.Mesh(hairspringGeo, mats.bluedSteel);
  tourbillonRoot.add(hairspringMesh);

  // 4. Swiss Lever Pallet Fork with Twin Ruby Impulse Stones (bridges Escape Wheel C5 & Balance)
  const palletGroup = new THREE.Group();
  // Positioned squarely between Escape Wheel C5 (0.636, -0.655) and Tourbillon center (0, -0.90)
  palletGroup.position.set(0.41, 0.158, 0.015);
  const leverGeo = new THREE.BoxGeometry(0.24, 0.026, 0.018);
  const lever = new THREE.Mesh(leverGeo, mats.titaniumPolished);
  lever.position.x = -0.05;
  palletGroup.add(lever);

  const forkA = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.022, 0.018), mats.titaniumPolished);
  forkA.position.set(0.08, 0.045, 0);
  forkA.rotation.z = 0.65;
  palletGroup.add(forkA);

  const forkB = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.022, 0.018), mats.titaniumPolished);
  forkB.position.set(0.08, -0.045, 0);
  forkB.rotation.z = -0.65;
  palletGroup.add(forkB);

  // Tiny ruby pallet stones
  const stoneGeo = new THREE.BoxGeometry(0.036, 0.018, 0.022);
  const stone1 = new THREE.Mesh(stoneGeo, mats.ruby);
  stone1.position.set(0.115, 0.072, 0);
  stone1.rotation.z = 0.65;
  palletGroup.add(stone1);

  const stone2 = new THREE.Mesh(stoneGeo, mats.ruby);
  stone2.position.set(0.115, -0.072, 0);
  stone2.rotation.z = -0.65;
  palletGroup.add(stone2);

  tourbillonRoot.add(palletGroup);

  return {
    tourbillonRoot,
    cageGroup,
    balanceGroup,
    hairspringMesh,
    palletGroup,
  };
}

/**
 * Builds the Skeleton Dial Chapter Ring, 12 Applied Faceted Baton Indices, and Diamond-Faceted Dauphine Hands.
 */
function createDialAndHands(mats) {
  const dialRingGroup = new THREE.Group();

  // High-DPI metallic minute-track chapter ring
  const ringGeo = new THREE.RingGeometry(1.48, 1.73, 96, 1);
  const ringMesh = new THREE.Mesh(ringGeo, mats.dialRingMat);
  ringMesh.position.z = 0.195;
  dialRingGroup.add(ringMesh);

  // Raised chamfered metallic flange backing the chapter ring
  const flangeProfile = [
    new THREE.Vector2(1.48, 0.15),
    new THREE.Vector2(1.73, 0.15),
    new THREE.Vector2(1.73, 0.25),
    new THREE.Vector2(1.69, 0.25),
    new THREE.Vector2(1.69, 0.19),
    new THREE.Vector2(1.48, 0.19),
    new THREE.Vector2(1.48, 0.15),
  ];
  const flangeGeo = new THREE.LatheGeometry(flangeProfile, 96);
  flangeGeo.rotateX(Math.PI / 2);
  const flangeMesh = new THREE.Mesh(flangeGeo, mats.titaniumBrushed);
  dialRingGroup.add(flangeMesh);

  // 12 Applied Faceted Baton Hour Indices (double baton at 12 o'clock, sleek petite baton at 6)
  const indexShape = new THREE.Shape();
  indexShape.moveTo(-0.036, -0.145);
  indexShape.lineTo( 0.036, -0.145);
  indexShape.lineTo( 0.026,  0.145);
  indexShape.lineTo(-0.026,  0.145);
  indexShape.closePath();

  const indexGeo = new THREE.ExtrudeGeometry(indexShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.010,
    bevelSegments: 2,
  });

  const lumeGeo = new THREE.BoxGeometry(0.026, 0.21, 0.012);

  for (let h = 0; h < 12; h++) {
    const ang = (h / 12) * Math.PI * 2; // 0 = 12 o'clock (+Y)
    const rCenter = h === 6 ? 1.59 : 1.46;
    const holder = new THREE.Group();
    holder.rotation.z = -ang;

    if (h === 0) {
      // Iconic double baton at 12 o'clock
      for (const dx of [-0.052, 0.052]) {
        const b = new THREE.Mesh(indexGeo, mats.roseGoldPolished);
        b.position.set(dx, rCenter, 0.205);
        holder.add(b);
        const l = new THREE.Mesh(lumeGeo, mats.lume);
        l.position.set(dx, rCenter, 0.244);
        holder.add(l);
      }
    } else if (h === 6) {
      // Compact refined index at 6 o'clock to frame the flying tourbillon cleanly
      const b = new THREE.Mesh(indexGeo, mats.roseGoldPolished);
      b.scale.set(1.1, 0.42, 1);
      b.position.set(0, rCenter, 0.205);
      holder.add(b);
    } else {
      const b = new THREE.Mesh(indexGeo, h % 3 === 0 ? mats.roseGoldPolished : mats.titaniumPolished);
      b.scale.set(h % 3 === 0 ? 1.18 : 0.92, h % 3 === 0 ? 1.04 : 0.88, 1);
      b.position.set(0, rCenter, 0.205);
      holder.add(b);
      const l = new THREE.Mesh(lumeGeo, mats.lume);
      l.scale.set(0.85, h % 3 === 0 ? 0.96 : 0.78, 1);
      l.position.set(0, rCenter, 0.244);
      holder.add(l);
    }
    dialRingGroup.add(holder);
  }

  // Faceted Dauphine Hour Hand
  const hourHandGroup = new THREE.Group();
  const hourGeo = createDauphineHandGeometry(1.04, 0.22, 0.165, 0.032);
  const hourMesh = new THREE.Mesh(hourGeo, mats.roseGoldPolished);
  hourMesh.position.z = 0.252;
  hourHandGroup.add(hourMesh);
  const hourHub = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.042, 24).rotateX(Math.PI / 2), mats.roseGoldPolished);
  hourHub.position.z = 0.248;
  hourHandGroup.add(hourHub);

  // Faceted Dauphine Minute Hand
  const minuteHandGroup = new THREE.Group();
  const minGeo = createDauphineHandGeometry(1.48, 0.26, 0.138, 0.028);
  const minMesh = new THREE.Mesh(minGeo, mats.titaniumPolished);
  minMesh.position.z = 0.292;
  minuteHandGroup.add(minMesh);
  // Subtle rose-gold spine accent on minute hand
  const minLume = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.72, 0.010), mats.lume);
  minLume.position.set(0, 0.62, 0.312);
  minuteHandGroup.add(minLume);
  const minHub = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.080, 0.045, 24).rotateX(Math.PI / 2), mats.titaniumPolished);
  minHub.position.z = 0.288;
  minuteHandGroup.add(minHub);

  // Blued-Steel Counterweighted Sweeping Seconds Hand
  const secondHandGroup = new THREE.Group();
  const secNeedle = createDauphineHandGeometry(1.56, 0.42, 0.032, 0.012);
  const secMesh = new THREE.Mesh(secNeedle, mats.bluedSteel);
  secMesh.position.z = 0.326;
  secondHandGroup.add(secMesh);
  const secCounterRing = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.015, 10, 24), mats.bluedSteel);
  secCounterRing.position.set(0, -0.34, 0.326);
  secondHandGroup.add(secCounterRing);
  const secCap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.042, 20).rotateX(Math.PI / 2), mats.roseGoldPolished);
  secCap.position.z = 0.332;
  secondHandGroup.add(secCap);

  return {
    dialRingGroup,
    hourHandGroup,
    minuteHandGroup,
    secondHandGroup,
  };
}

/**
 * Builds the Domed Sapphire Crystal + Custom GLSL Anti-Reflective Fresnel & Seal-Wave Shader.
 */
function createSapphireCrystal(mats) {
  const crystalGroup = new THREE.Group();

  // Curved spherical cap dome LatheGeometry
  const pts = [];
  const R = 1.755;
  const domeHeight = 0.185;
  const segs = 28;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const rad = u * R;
    // Smooth spherical dome curve with crisp beveled outer edge seat
    const z = 0.365 + domeHeight * Math.cos(u * Math.PI * 0.5);
    pts.push(new THREE.Vector2(rad, z));
  }
  const domeGeo = new THREE.LatheGeometry(pts, 96);
  domeGeo.rotateX(Math.PI / 2);
  domeGeo.computeVertexNormals();

  // Physical clearcoat reflection layer (100% full-res transparent so gears stay razor sharp!)
  const physicalDome = new THREE.Mesh(domeGeo, mats.sapphirePhysical);
  crystalGroup.add(physicalDome);

  // Custom GLSL AR Sheen, Diagonal Softbox Glint Sweep, & Concentric Seal Ripple Wave
  const arUniforms = {
    uSealWave: { value: -1.0 },     // [0..1] expanding concentric ripple on crystal seal at t=15.0s
    uSealOpacity: { value: 0.0 },
    uGlintSweep: { value: -2.0 },   // [-1.8..+1.8] studio softbox reflection glide across crystal
    uGlintStrength: { value: 0.0 },
    uOpacity: { value: 1.0 },
  };

  const arMat = new THREE.ShaderMaterial({
    uniforms: arUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uSealWave;
      uniform float uSealOpacity;
      uniform float uGlintSweep;
      uniform float uGlintStrength;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float ndotv = clamp(abs(dot(N, V)), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 3.4);

        // Subtle blue-violet anti-reflective sapphire edge sheen
        vec3 arColor = vec3(0.26, 0.56, 1.0) * fresnel * 0.42;

        // Crisp bevel ring reflection near outer crystal edge
        float rNorm = length(vLocalPos.xy) / 1.755;
        float rimBand = smoothstep(0.90, 0.985, rNorm) * (1.0 - smoothstep(0.985, 1.0, rNorm));
        arColor += vec3(0.75, 0.88, 1.0) * rimBand * 0.34;

        // Diagonal studio softbox reflection ribbon gliding across sapphire dome
        float diag = (vLocalPos.x * 0.72 + vLocalPos.y * 0.69) / 1.75;
        float dBand = abs(diag - uGlintSweep);
        float ribbonCore = exp(-dBand * dBand * 42.0);
        float ribbonHalo = exp(-dBand * dBand * 7.5) * 0.22;
        vec3 glint = mix(vec3(0.78, 0.90, 1.0), vec3(1.0, 0.99, 0.97), ribbonCore) * (ribbonCore * 0.62 + ribbonHalo) * uGlintStrength;

        // Concentric blue-white seal ripple expanding outward at t=15.00s
        float waveDist = abs(rNorm - uSealWave);
        float waveRing = exp(-waveDist * waveDist * 140.0) * uSealOpacity;
        float waveTrail = exp(-waveDist * waveDist * 22.0) * 0.30 * uSealOpacity;
        vec3 sealCol = mix(vec3(0.24, 0.62, 1.0), vec3(0.94, 0.98, 1.0), waveRing) * (waveRing * 1.35 + waveTrail);

        vec3 total = (arColor + glint + sealCol) * uOpacity;
        float alpha = clamp(length(total), 0.0, 0.92);
        gl_FragColor = vec4(total, alpha);
      }
    `,
  });

  const arDome = new THREE.Mesh(domeGeo, arMat);
  arDome.position.z = 0.002;
  crystalGroup.add(arDome);

  return { crystalGroup, arUniforms };
}

/**
 * Builds the Articulated Tapered Grade-5 Titanium + Rose-Gold Link Bracelet (top & bottom).
 */
function createArticulatedBracelet(mats) {
  const topLinks = [];
  const bottomLinks = [];

  const linkCount = 6;

  // Create one articulated H-link + rose-gold center interlink row at a given taper width
  const buildLinkRow = (width, length) => {
    const row = new THREE.Group();
    const outerW = width * 0.29;
    const centerW = width * 0.36;

    const sideShape = new THREE.Shape();
    sideShape.moveTo(-outerW * 0.5, -length * 0.48);
    sideShape.lineTo( outerW * 0.5, -length * 0.48);
    sideShape.lineTo( outerW * 0.46,  length * 0.48);
    sideShape.lineTo(-outerW * 0.46,  length * 0.48);
    sideShape.closePath();

    const sideGeo = new THREE.ExtrudeGeometry(sideShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    sideGeo.translate(0, 0, -0.08);

    const leftLink = new THREE.Mesh(sideGeo, mats.titaniumBrushed);
    leftLink.position.x = -(centerW * 0.5 + outerW * 0.5 + 0.018);
    row.add(leftLink);

    const rightLink = new THREE.Mesh(sideGeo, mats.titaniumBrushed);
    rightLink.position.x = (centerW * 0.5 + outerW * 0.5 + 0.018);
    row.add(rightLink);

    // Sculpted satin 18k rose-gold center interlink catching luxury speculars
    const midShape = new THREE.Shape();
    midShape.moveTo(-centerW * 0.5, -length * 0.44);
    midShape.lineTo( centerW * 0.5, -length * 0.44);
    midShape.lineTo( centerW * 0.48,  length * 0.44);
    midShape.lineTo(-centerW * 0.48,  length * 0.44);
    midShape.closePath();

    const midGeo = new THREE.ExtrudeGeometry(midShape, {
      depth: 0.135,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    midGeo.translate(0, 0, -0.068);
    const midLink = new THREE.Mesh(midGeo, mats.roseGold);
    midLink.position.z = 0.012;
    row.add(midLink);

    return row;
  };

  // Place links along an ergonomic wrist curvature extending from y = ±2.52 outward and curving toward -Z
  const buildSide = (sign, arr) => {
    let curY = sign * 2.48;
    let curZ = -0.14;
    let pitch = 0.24; // initial downward curve angle in radians
    for (let i = 0; i < linkCount; i++) {
      const u = i / (linkCount - 1);
      const w = 1.48 - u * 0.34;
      const len = 0.42 - u * 0.03;
      const row = buildLinkRow(w, len);

      const step = len + 0.035;
      curY += sign * Math.cos(pitch) * step * 0.5;
      curZ -= Math.sin(pitch) * step * 0.5;

      const targetPos = new THREE.Vector3(0, curY, curZ);
      const targetRotX = sign * pitch;
      row.position.copy(targetPos);
      row.rotation.x = targetRotX;

      curY += sign * Math.cos(pitch) * step * 0.5;
      curZ -= Math.sin(pitch) * step * 0.5;
      pitch += 0.14;

      arr.push({
        group: row,
        targetPos,
        targetRotX,
        sign,
        index: i,
        seatStart: 16.12 + i * 0.14,
        seatEnd: 16.52 + i * 0.14,
      });
    }
  };

  buildSide(1, topLinks);
  buildSide(-1, bottomLinks);

  return { topLinks, bottomLinks };
}

/**
 * Builds the Shot 08 Obsidian Mirror Plinth (sleek luxury display pedestal with soft radial specular reflection).
 */
function createObsidianPlinth(textures) {
  const plinthGroup = new THREE.Group();

  // Deep pitch-obsidian mirror plinth (never bright grey!)
  const topGeo = new THREE.CylinderGeometry(7.2, 7.6, 0.36, 72);
  const topMat = new THREE.MeshPhysicalMaterial({
    color: 0x020305,
    metalness: 0.28,
    roughness: 0.22,
    roughnessMap: textures.radialBrush.roughness,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.16,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.y = -0.18;
  plinthGroup.add(topMesh);

  // Crisp subtle rose-gold hairline bevel ring embedded in the dark obsidian plinth
  const inlayGeo = new THREE.TorusGeometry(2.85, 0.009, 12, 96);
  inlayGeo.rotateX(Math.PI / 2);
  const inlayMat = new THREE.MeshStandardMaterial({
    color: 0x8C6942,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 0.85,
  });
  const inlay = new THREE.Mesh(inlayGeo, inlayMat);
  inlay.position.y = 0.002;
  plinthGroup.add(inlay);

  // Restrained soft mirror reflection glow directly beneath the watch on the obsidian surface
  const reflMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float d = length(p * vec2(1.0, 1.4));
        float softGlow = exp(-d * d * 4.5) * 0.14;
        float goldCore = exp(-d * d * 13.0) * 0.12;
        vec3 col = vec3(0.45, 0.52, 0.65) * softGlow + vec3(0.84, 0.65, 0.42) * goldCore;
        gl_FragColor = vec4(col, (softGlow + goldCore) * uOpacity);
      }
    `,
  });
  const reflPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), reflMat);
  reflPlane.rotation.x = -Math.PI / 2;
  reflPlane.position.y = 0.004;
  plinthGroup.add(reflPlane);

  plinthGroup.position.set(0, -4.15, 0);
  return { plinthGroup, reflMat };
}

/**
 * Master Watch Assembly Factory.
 * Returns the complete watch root + structured references to every animatable sub-assembly.
 */
export function buildWatchAssembly(textures) {
  const mats = {
    titaniumBrushed: new THREE.MeshStandardMaterial({
      color: 0xC8CED6,
      metalness: 0.94,
      roughness: 0.29,
      roughnessMap: textures.linearBrush.roughness,
      bumpMap: textures.linearBrush.bump,
      bumpScale: 0.005,
      envMapIntensity: 1.35,
    }),
    titaniumCotes: new THREE.MeshStandardMaterial({
      color: 0xB8C0CC,
      metalness: 0.94,
      roughness: 0.27,
      roughnessMap: textures.cotes.roughness,
      bumpMap: textures.cotes.bump,
      bumpScale: 0.010,
      envMapIntensity: 1.40,
    }),
    titaniumPerlage: new THREE.MeshStandardMaterial({
      color: 0x858E9D,
      metalness: 0.92,
      roughness: 0.31,
      roughnessMap: textures.perlage.roughness,
      bumpMap: textures.perlage.bump,
      bumpScale: 0.009,
      envMapIntensity: 1.30,
    }),
    titaniumPolished: new THREE.MeshStandardMaterial({
      color: 0xDCE3ED,
      metalness: 0.97,
      roughness: 0.11,
      envMapIntensity: 1.55,
    }),
    roseGold: new THREE.MeshStandardMaterial({
      color: 0xDDA86C,
      metalness: 0.96,
      roughness: 0.22,
      roughnessMap: textures.radialBrush.roughness,
      bumpMap: textures.radialBrush.bump,
      bumpScale: 0.004,
      envMapIntensity: 1.65,
    }),
    roseGoldPolished: new THREE.MeshStandardMaterial({
      color: 0xE8B980,
      metalness: 0.97,
      roughness: 0.12,
      envMapIntensity: 1.65,
    }),
    bluedSteel: new THREE.MeshPhysicalMaterial({
      color: 0x1B4FD8,
      metalness: 0.90,
      roughness: 0.16,
      clearcoat: 0.70,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.75,
    }),
    ruby: new THREE.MeshPhysicalMaterial({
      color: 0xC9184A,
      emissive: 0x26020C,
      emissiveIntensity: 0.35,
      metalness: 0.08,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
      ior: 1.77,
      envMapIntensity: 1.85,
    }),
    dialRingMat: new THREE.MeshStandardMaterial({
      map: textures.dialRing,
      metalness: 0.62,
      roughness: 0.30,
      envMapIntensity: 1.25,
    }),
    lume: new THREE.MeshStandardMaterial({
      color: 0xF5F7FA,
      emissive: 0xDCE6F5,
      emissiveIntensity: 0.22,
      roughness: 0.35,
      metalness: 0.1,
    }),
    sapphirePhysical: new THREE.MeshPhysicalMaterial({
      color: 0xEBF3FF,
      transparent: true,
      opacity: 0.11,
      roughness: 0.015,
      metalness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      reflectivity: 1.0,
      envMapIntensity: 2.6,
      depthWrite: false,
    }),
  };

  const watchRoot = new THREE.Group();

  // 1. Lower Skeleton Titanium Mainplate
  const mainplateGeo = createMainplateGeometry();
  const mainplateMesh = new THREE.Mesh(mainplateGeo, mats.titaniumPerlage);
  // Subtle polished outer mainplate bevel accent ring
  const mpRim = new THREE.Mesh(new THREE.TorusGeometry(1.69, 0.014, 12, 96), mats.titaniumPolished);
  mpRim.position.z = -0.16;
  const mainplateGroup = new THREE.Group();
  mainplateGroup.add(mainplateMesh, mpRim);
  watchRoot.add(mainplateGroup);

  // 2. Meshing 6-Gear Involute Train
  const gearsGroup = new THREE.Group();
  watchRoot.add(gearsGroup);

  const gears = GEAR_SPECS.map((spec) => {
    const gGroup = new THREE.Group();
    const gGeo = createInvoluteGearGeometry(spec.teeth, GEAR_MODULE, spec.thickness, spec.spokes, spec.isEscape);
    const gMesh = new THREE.Mesh(gGeo, mats[spec.mat]);
    gGroup.add(gMesh);

    // Optional rose-gold outer accent bevel ring on the mainspring barrel wheel
    if (spec.accentRim) {
      const rRim = new THREE.Mesh(new THREE.TorusGeometry(spec.r - 0.06, 0.016, 12, 64), mats.roseGoldPolished);
      rRim.position.z = spec.thickness * 0.52;
      gGroup.add(rRim);
    }

    // Chamfered central steel/gold pinion arbor
    const arborGeo = new THREE.CylinderGeometry(0.055, 0.062, spec.thickness + 0.075, 18);
    arborGeo.rotateX(Math.PI / 2);
    const arbor = new THREE.Mesh(arborGeo, mats.titaniumPolished);
    gGroup.add(arbor);

    gGroup.position.set(spec.x, spec.y, spec.z);
    gearsGroup.add(gGroup);

    return { spec, group: gGroup };
  });

  // 3. Upper Openworked Skeleton Bridges & Tourbillon Bridge
  const { bridges, tourbBridgeMesh } = createSkeletonBridges(mats.titaniumCotes, mats.titaniumPolished);
  for (const b of bridges) watchRoot.add(b.mesh);
  watchRoot.add(tourbBridgeMesh);

  // 4. 12 Recessed Pigeon-Blood Ruby Jewel Bearings + Chamfered 18k Rose-Gold Chatons (InstancedMesh!)
  const rubySpecs = [
    // 0: Center mainplate pivot jewel (drops in during Shot 01 at t=1.20s for the iconic first click!)
    { pos: [0, 0, 0.115], scale: 1.18, seatStart: 0.90, seatEnd: 1.24 },
    // 1..5: Gear train pivot jewels
    { pos: [GEAR_SPECS[0].x, GEAR_SPECS[0].y, 0.118], scale: 1.25, seatStart: 3.65, seatEnd: 4.02 },
    { pos: [GEAR_SPECS[2].x, GEAR_SPECS[2].y, 0.115], scale: 1.05, seatStart: 3.78, seatEnd: 4.15 },
    { pos: [GEAR_SPECS[3].x, GEAR_SPECS[3].y, 0.115], scale: 0.98, seatStart: 3.90, seatEnd: 4.26 },
    { pos: [GEAR_SPECS[4].x, GEAR_SPECS[4].y, 0.115], scale: 0.90, seatStart: 4.02, seatEnd: 4.38 },
    { pos: [GEAR_SPECS[5].x, GEAR_SPECS[5].y, 0.115], scale: 1.05, seatStart: 4.12, seatEnd: 4.48 },
    // 6: Tourbillon central cap jewel (seats with tourbillon bridge!)
    { pos: [TOURBILLON_POS.x, TOURBILLON_POS.y, 0.128], scale: 1.15, seatStart: 5.72, seatEnd: 6.08 },
    // 7..11: Auxiliary horological pivot & chaton accent jewels across bridges/mainplate
    { pos: [-0.26, 1.28, 0.116], scale: 0.86, seatStart: 4.32, seatEnd: 4.66 },
    { pos: [1.14, 0.44, 0.116], scale: 0.86, seatStart: 4.40, seatEnd: 4.74 },
    { pos: [1.12, -0.46, 0.116], scale: 0.84, seatStart: 4.48, seatEnd: 4.82 },
    { pos: [-1.26, -0.46, 0.116], scale: 0.84, seatStart: 4.56, seatEnd: 4.90 },
    { pos: [0.24, -0.50, 0.042], scale: 0.78, seatStart: 6.02, seatEnd: 6.32 }, // Pallet fork pivot ruby
  ];

  const chatonGeo = new THREE.TorusGeometry(0.068, 0.022, 12, 24);
  const rubyGeo = new THREE.CylinderGeometry(0.056, 0.050, 0.036, 20);
  rubyGeo.rotateX(Math.PI / 2);

  const chatonInst = new THREE.InstancedMesh(chatonGeo, mats.roseGoldPolished, rubySpecs.length);
  const rubyInst = new THREE.InstancedMesh(rubyGeo, mats.ruby, rubySpecs.length);
  watchRoot.add(chatonInst, rubyInst);

  // 5. 14 Blued-Steel Movement Bridge Micro-Screws (InstancedMesh!)
  const bridgeScrewSpecs = [
    { pos: [-1.34, 0.56, 0.122], seatStart: 4.52, seatEnd: 4.80 },
    { pos: [-0.94, 1.18, 0.122], seatStart: 4.56, seatEnd: 4.84 },
    { pos: [0.02, 1.38, 0.122],  seatStart: 4.60, seatEnd: 4.88 },
    { pos: [-0.14, -0.06, 0.122],seatStart: 4.64, seatEnd: 4.92 },
    { pos: [0.56, 0.68, 0.120],  seatStart: 4.68, seatEnd: 4.96 },
    { pos: [1.34, 0.30, 0.120],  seatStart: 4.72, seatEnd: 5.00 },
    { pos: [1.32, -0.28, 0.120], seatStart: 4.76, seatEnd: 5.04 },
    { pos: [0.84, -0.74, 0.120], seatStart: 4.80, seatEnd: 5.08 },
    { pos: [-1.36, -0.24, 0.120],seatStart: 4.84, seatEnd: 5.12 },
    { pos: [-1.02, -0.96, 0.120],seatStart: 4.88, seatEnd: 5.16 },
    { pos: [-0.66, -0.84, 0.120],seatStart: 4.92, seatEnd: 5.20 },
    { pos: [-0.66, -0.28, 0.120],seatStart: 4.96, seatEnd: 5.24 },
    // Tourbillon bridge twin anchor screws (seat in Shot 03!)
    { pos: [TOURBILLON_POS.x - 0.68, TOURBILLON_POS.y, 0.132], seatStart: 5.76, seatEnd: 6.10 },
    { pos: [TOURBILLON_POS.x + 0.68, TOURBILLON_POS.y, 0.132], seatStart: 5.82, seatEnd: 6.16 },
  ];
  const movScrewGeo = createSlottedScrewGeometry(0.044, 0.026);
  const movScrewInst = new THREE.InstancedMesh(movScrewGeo, mats.bluedSteel, bridgeScrewSpecs.length);
  watchRoot.add(movScrewInst);

  // 6. Tourbillon / Balance Wheel Assembly
  const tourbillon = createTourbillonAssembly(mats);
  watchRoot.add(tourbillon.tourbillonRoot);

  // 7. Case, Lugs, Bezel, 8 Bezel Screws, Knurled Winding Crown
  const hardware = createCaseAndHardware(mats);
  watchRoot.add(hardware.caseGroup);
  watchRoot.add(hardware.bezelGroup);
  for (const bs of hardware.bezelScrews) watchRoot.add(bs.mesh);
  watchRoot.add(hardware.crownGroup);

  // 8. Dial Chapter Ring, 12 Applied Indices, & Faceted Dauphine Hands
  const dialAndHands = createDialAndHands(mats);
  watchRoot.add(dialAndHands.dialRingGroup);
  watchRoot.add(dialAndHands.hourHandGroup);
  watchRoot.add(dialAndHands.minuteHandGroup);
  watchRoot.add(dialAndHands.secondHandGroup);

  // 9. Domed Sapphire Crystal & Custom AR Seal Shader
  const sapphire = createSapphireCrystal(mats);
  watchRoot.add(sapphire.crystalGroup);

  // 10. Articulated Tapered Titanium + Rose-Gold Link Bracelet
  const bracelet = createArticulatedBracelet(mats);
  for (const l of bracelet.topLinks) watchRoot.add(l.group);
  for (const l of bracelet.bottomLinks) watchRoot.add(l.group);

  // 11. Obsidian Mirror Plinth (external to watchRoot so watch can poise slightly above it in Shot 08)
  const plinth = createObsidianPlinth(textures);

  return {
    watchRoot,
    mats,
    mainplateGroup,
    gears,
    bridges,
    tourbBridgeMesh,
    rubySpecs,
    chatonInst,
    rubyInst,
    bridgeScrewSpecs,
    movScrewInst,
    tourbillon,
    hardware,
    dialAndHands,
    sapphire,
    bracelet,
    plinth,
  };
}
