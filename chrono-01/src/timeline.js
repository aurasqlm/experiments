// 100% Deterministic Time-Domain Director & Horological Physics Engine
// Every transform, gear angle, balance oscillation, light sweep, and shader uniform is a pure function of t in [0.00, 20.00].

import * as THREE from 'three';
import {
  clamp,
  lerp,
  smoothstep,
  smootherstep,
  window01,
  easeOutExpo,
  easeInOutCubic,
  easeOutCubic,
  easeMagneticSnap,
} from './prng.js';
import { GEAR_SPECS, TOURBILLON_POS } from './watchGeometry.js';

export const DURATION = 20.0;

// Reusable scratch objects (zero GC allocations during renderAt(t))
const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();

/**
 * Computes exact, smooth camera trajectory across the 8-shot luxury watch commercial storyboard.
 * Uses distinct cinematic cuts between shots with silky continuous motion inside each shot!
 */
function evaluateCameraAndWatchPose(t) {
  let pos = [0, 0, 8];
  let target = [0, 0, 0];
  let fov = 34;
  let watchRot = [0, 0, 0];
  let watchPos = [0, 0, 0];

  if (t < 2.50) {
    // Shot 01 (0.00–2.50s) — Obsidian Horizon & First Spark
    // Dramatic 3/4 macro angle gliding slowly across the bare skeleton mainplate
    const u = smootherstep(0.0, 2.50, t);
    pos = [lerp(-2.45, -1.65, u), lerp(-1.35, -0.78, u), lerp(4.65, 3.85, u)];
    target = [lerp(-0.18, 0.05, u), lerp(-0.10, 0.02, u), -0.10];
    fov = lerp(35, 32, u);
    watchRot = [lerp(-0.14, -0.06, u), lerp(0.22, 0.12, u), lerp(-0.08, -0.02, u)];
  } else if (t < 5.50) {
    // Shot 02 (2.50–5.50s) — The Gear Train Locks In
    // Macro low-angle push-in sweeping smoothly across the rising/dropping involute gears & bridges
    const u = window01(t, 2.50, 5.50);
    const ue = easeInOutCubic(u);
    pos = [lerp(2.25, -0.45, ue), lerp(-2.35, -0.95, ue), lerp(4.15, 3.30, ue)];
    target = [lerp(0.15, 0.0, ue), lerp(0.10, 0.06, ue), 0.02];
    fov = lerp(33, 30, ue);
    watchRot = [lerp(-0.16, -0.05, ue), lerp(-0.12, 0.08, ue), 0];
  } else if (t < 8.50) {
    // Shot 03 (5.50–8.50s) — Heartbeat Ignition (Balance Wheel Macro)
    // Extreme macro locked onto the 6 o'clock flying tourbillon aperture
    const u = window01(t, 5.50, 8.50);
    const ue = easeOutCubic(u);
    const pulseKick = t >= 6.50 ? Math.exp(-(t - 6.50) * 5.5) * 0.055 : 0;
    pos = [
      lerp(-0.92, 0.68, ue),
      TOURBILLON_POS.y + lerp(-0.88, -0.28, ue),
      lerp(2.38, 1.92, ue) - pulseKick,
    ];
    target = [TOURBILLON_POS.x + lerp(-0.04, 0.05, ue), TOURBILLON_POS.y + 0.03, 0.02];
    fov = lerp(29, 27, ue);
    watchRot = [lerp(-0.08, 0.02, ue), lerp(0.06, -0.06, ue), 0];
  } else if (t < 11.50) {
    // Shot 04 (8.50–11.50s) — Case & Lugs Embrace
    // Smooth orbital crane pull-back revealing the full sculpted titanium case, curved lugs & bezel screws
    const u = window01(t, 8.50, 11.50);
    const ue = easeInOutCubic(u);
    const angle = lerp(-0.74, 0.52, ue);
    const dist = lerp(5.9, 7.8, ue);
    pos = [
      Math.sin(angle) * dist * 0.78,
      lerp(-1.45, 1.35, ue),
      Math.cos(angle) * dist,
    ];
    target = [0, 0, 0.05];
    fov = lerp(34, 36, ue);
    watchRot = [lerp(-0.10, 0.04, ue), lerp(0.08, -0.08, ue), lerp(0.04, -0.03, ue)];
  } else if (t < 14.00) {
    // Shot 05 (11.50–14.00s) — Dial Ring, Hands & Crown Push
    // Side-to-front sweeping arc emphasizing 3 o'clock knurled crown push at 13.20s & 10:10 hand sweep
    const u = window01(t, 11.50, 14.00);
    const ue = easeInOutCubic(u);
    const crownKick = t >= 13.20 ? Math.exp(-(t - 13.20) * 7.0) * 0.06 : 0;
    pos = [
      lerp(4.65, 1.05, ue) - crownKick,
      lerp(-0.45, 0.42, ue),
      lerp(4.25, 5.95, ue),
    ];
    target = [lerp(0.50, 0.04, ue), lerp(0.0, 0.02, ue), 0.14];
    fov = lerp(33, 34, ue);
    watchRot = [lerp(-0.05, 0.03, ue), lerp(-0.18, -0.04, ue), 0];
  } else if (t < 16.00) {
    // Shot 06 (14.00–16.00s) — Sapphire Crystal Seal
    // Slow-motion top-angled macro glide watching the curved sapphire dome descend and seal at 15.00s
    const u = window01(t, 14.00, 16.00);
    const ue = smootherstep(0, 1, u);
    pos = [lerp(-1.85, 1.25, ue), lerp(2.85, 2.05, ue), lerp(5.15, 5.75, ue)];
    target = [0, -0.04, 0.30];
    fov = lerp(32.5, 34, ue);
    watchRot = [lerp(-0.12, -0.04, ue), lerp(0.08, -0.08, ue), 0];
  } else if (t < 17.75) {
    // Shot 07 (16.00–17.75s) — Integrated Bracelet Snap & Dramatic Silhouette
    // Fast whip-orbit to sculptural vertical hero angle as links cascade into place & rim light scans up
    const u = window01(t, 16.00, 17.75);
    const ue = easeOutExpo(u);
    const angle = lerp(-1.12, -0.34, ue);
    const dist = lerp(10.4, 9.6, ue);
    pos = [
      Math.sin(angle) * dist,
      lerp(-1.10, 0.35, ue),
      Math.cos(angle) * dist,
    ];
    target = [0, 0.0, -0.15];
    fov = 36;
    watchRot = [lerp(0.14, 0.06, ue), lerp(0.28, 0.12, ue), lerp(0.10, 0.03, ue)];
  } else {
    // Shot 08 (17.75–20.00s) — Hero Commercial Lockup
    // Poised, stately 3/4 luxury hero presentation shifted left-of-center with full bracelet silhouette above dark obsidian plinth
    const u = window01(t, 17.75, 20.00);
    const ue = easeOutCubic(u);
    const subtleFloat = Math.sin((t - 17.75) * 1.45) * 0.04;
    pos = [lerp(1.15, 1.58, ue), lerp(0.75, 0.62, ue), lerp(11.35, 10.65, ue)];
    // Target shifted right (+X) so watch sits gracefully in the left half against right-side architectural typography
    target = [lerp(1.38, 1.65, ue), lerp(-0.18, -0.15, ue), -0.18];
    fov = 34.5;
    watchPos = [-0.35, 0.16 + subtleFloat, 0];
    watchRot = [lerp(-0.08, -0.05, ue), lerp(0.26, 0.34, ue), lerp(-0.05, -0.03, ue)];
  }

  return { pos, target, fov, watchRot, watchPos };
}

/**
 * Evaluates all watch sub-assemblies, coupled gear kinematics, 4 Hz balance dynamics,
 * dynamic studio lighting, and shader uniforms deterministically at time t.
 */
export function createTimelineController({ camera, watch, lights, postfx, onTypographyUpdate }) {
  const gearMap = new Map();
  for (const g of watch.gears) gearMap.set(g.spec.id, g);

  const gearAngles = new Map();

  function renderAt(rawT) {
    const t = clamp(rawT, 0, DURATION);

    // 1. Camera & Master Watch Pose
    const pose = evaluateCameraAndWatchPose(t);
    _camPos.set(pose.pos[0], pose.pos[1], pose.pos[2]);
    _camTarget.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.position.copy(_camPos);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(_camTarget);

    watch.watchRoot.position.set(pose.watchPos[0], pose.watchPos[1], pose.watchPos[2]);
    watch.watchRoot.rotation.set(pose.watchRot[0], pose.watchRot[1], pose.watchRot[2]);

    // 2. Mainplate (visible from t=0.00; subtle majestic float-in scale settle in first 0.25s)
    const mpIn = easeOutCubic(window01(t, 0.0, 0.35));
    watch.mainplateGroup.visible = true;
    watch.mainplateGroup.scale.setScalar(lerp(0.985, 1.0, mpIn));

    // 3. Coupled Meshing Gear Train Kinematics
    // Before ignition (t < 6.50s): smooth assembly test spin once seated;
    // After ignition (t >= 6.50s): crisp 4 Hz (8 beats/sec) micro-stepped Swiss escapement drive!
    const activeTime = Math.max(0, t - 2.75);
    let centerAngle = 0;
    if (t < 6.50) {
      // Smooth mechanical spin-up during gear train assembly
      centerAngle = activeTime * 0.42;
    } else {
      const baseAtIgnite = (6.50 - 2.75) * 0.42;
      const dt = t - 6.50;
      // 8 beats per second stepped escapement motion blended smoothly with continuous rotation
      const beats = dt * 8.0;
      const steppedBeats = Math.floor(beats) + smoothstep(0.0, 0.32, beats - Math.floor(beats));
      centerAngle = baseAtIgnite + steppedBeats * 0.055;
    }

    // Exact tooth-into-valley phase-locked recursive gear rotation calculation!
    // Formula verified: theta_B = (alpha + PI) - (PI / Z_B) + (Z_A / Z_B) * (alpha - theta_A)
    gearAngles.clear();
    const computeGearAngle = (spec) => {
      if (gearAngles.has(spec.id)) return gearAngles.get(spec.id);
      if (!spec.parent) {
        gearAngles.set(spec.id, centerAngle);
        return centerAngle;
      }
      const parentEntry = gearMap.get(spec.parent);
      const parentAngle = computeGearAngle(parentEntry.spec);
      const alpha = spec.alphaFromParent;
      const ratio = parentEntry.spec.teeth / spec.teeth;
      const theta = (alpha + Math.PI) - (Math.PI / spec.teeth) + ratio * (alpha - parentAngle);
      gearAngles.set(spec.id, theta);
      return theta;
    };

    for (const g of watch.gears) {
      const { spec, group } = g;
      const u = window01(t, spec.seatStart, spec.seatEnd);
      if (u <= 0) {
        group.visible = false;
      } else {
        group.visible = true;
        const p = easeMagneticSnap(u, 0.04);
        // Drop cleanly along Z axis from above (+Z) or below (-Z) into exact Z seat
        const zOffset = (1 - p) * 2.15 * spec.dropDir;
        group.position.set(spec.x, spec.y, spec.z + zOffset);
        group.scale.setScalar(lerp(0.86, 1.0, smoothstep(0.0, 0.65, u)));

        const targetTheta = computeGearAngle(spec);
        // Spin smoothly into exact meshed phase as it seats, then lock 100% mechanically coupled!
        const entrySpin = (1 - smoothstep(0.0, 0.92, u)) * 0.85 * spec.dropDir;
        group.rotation.z = targetTheta + entrySpin;
      }
    }

    // 4. Upper Openworked Skeleton Bridges (drop in along +Z right after gears seat in Shot 02)
    for (const b of watch.bridges) {
      const u = window01(t, b.seatStart, b.seatEnd);
      if (u <= 0) {
        b.mesh.visible = false;
      } else {
        b.mesh.visible = true;
        const p = easeMagneticSnap(u, 0.03);
        b.mesh.position.z = (1 - p) * 1.95;
      }
    }

    // Tourbillon Arched Bridge seats cleanly in Shot 03 (5.60s -> 6.02s)
    const tbU = window01(t, 5.58, 6.02);
    if (tbU <= 0) {
      watch.tourbBridgeMesh.visible = false;
    } else {
      watch.tourbBridgeMesh.visible = true;
      const p = easeMagneticSnap(tbU, 0.035);
      watch.tourbBridgeMesh.position.set(TOURBILLON_POS.x, TOURBILLON_POS.y, (1 - p) * 1.35);
    }

    // 5. 12 Pigeon-Blood Ruby Jewel Bearings & Rose-Gold Chatons (InstancedMesh)
    for (let i = 0; i < watch.rubySpecs.length; i++) {
      const rs = watch.rubySpecs[i];
      const u = window01(t, rs.seatStart, rs.seatEnd);
      if (u <= 0) {
        _dummy.position.set(0, 0, -50);
        _dummy.scale.setScalar(0.0001);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        watch.chatonInst.setMatrixAt(i, _dummy.matrix);
        watch.rubyInst.setMatrixAt(i, _dummy.matrix);
      } else {
        const p = easeMagneticSnap(u, 0.045);
        const zOff = (1 - p) * 1.45;
        _dummy.position.set(rs.pos[0], rs.pos[1], rs.pos[2] + zOff);
        _dummy.scale.setScalar(rs.scale * lerp(0.75, 1.0, smoothstep(0.0, 0.6, u)));
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        watch.chatonInst.setMatrixAt(i, _dummy.matrix);
        // Ruby sits slightly proud of chaton center
        _dummy.position.z += 0.004;
        _dummy.updateMatrix();
        watch.rubyInst.setMatrixAt(i, _dummy.matrix);
      }
    }
    watch.chatonInst.instanceMatrix.needsUpdate = true;
    watch.rubyInst.instanceMatrix.needsUpdate = true;

    // 6. 14 Blued-Steel Movement Bridge Micro-Screws (InstancedMesh with threading twist!)
    for (let i = 0; i < watch.bridgeScrewSpecs.length; i++) {
      const bs = watch.bridgeScrewSpecs[i];
      const u = window01(t, bs.seatStart, bs.seatEnd);
      if (u <= 0) {
        _dummy.position.set(0, 0, -50);
        _dummy.scale.setScalar(0.0001);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        watch.movScrewInst.setMatrixAt(i, _dummy.matrix);
      } else {
        const p = easeMagneticSnap(u, 0.03);
        const zOff = (1 - p) * 1.15;
        _dummy.position.set(bs.pos[0], bs.pos[1], bs.pos[2] + zOff);
        _dummy.scale.setScalar(lerp(0.8, 1.0, smoothstep(0.0, 0.5, u)));
        // Crisp 360-degree screw-in spin as it seats!
        _dummy.rotation.set(0, 0, (1 - p) * Math.PI * 2.5 + i * 0.4);
        _dummy.updateMatrix();
        watch.movScrewInst.setMatrixAt(i, _dummy.matrix);
      }
    }
    watch.movScrewInst.instanceMatrix.needsUpdate = true;

    // 7. Shot 03: Live Flying Tourbillon, 4 Hz Balance Wheel, Breathing Hairspring & Pallet Fork
    const { cageGroup, balanceGroup, hairspringMesh, palletGroup } = watch.tourbillon;

    // Tourbillon carriage drops in from below (-Z) at 5.50 -> 5.88s
    const cageU = window01(t, 5.42, 5.88);
    cageGroup.visible = cageU > 0;
    if (cageU > 0) {
      const p = easeMagneticSnap(cageU, 0.035);
      cageGroup.position.z = -(1 - p) * 1.45;
      // Once ignited at 6.50s, tourbillon carriage rotates smoothly (1 RPM = 2*PI / 60 rad/s, enhanced subtly to 0.28 rad/s for dramatic commercial visibility)
      const spinT = Math.max(0, t - 6.50);
      cageGroup.rotation.z = -spinT * 0.26;
    }

    // Rose-gold Balance Wheel drops in from +Z at 5.72 -> 6.14s
    const balU = window01(t, 5.72, 6.14);
    balanceGroup.visible = balU > 0;
    let balancePhase = 0;
    let balanceAmp = 0;
    if (balU > 0) {
      const p = easeMagneticSnap(balU, 0.04);
      balanceGroup.position.z = (1 - p) * 1.25;
      if (t >= 6.50) {
        const dt = t - 6.50;
        // Crisp ignition ramp in 0.22s into full 4 Hz (28,800 vph) sinusoidal balance wheel oscillation!
        balanceAmp = smoothstep(0.0, 0.22, dt) * 2.15; // ±123 degrees!
        balancePhase = Math.sin(dt * 4.0 * Math.PI * 2.0);
        balanceGroup.rotation.z = balancePhase * balanceAmp;
      } else {
        balanceGroup.rotation.z = (1 - p) * 0.6;
      }
    }

    // Coiled Spiral Blued-Steel Hairspring spirals & unfurls into place (6.05s -> 6.50s), then breathes at 4 Hz!
    const hsU = window01(t, 6.04, 6.50);
    hairspringMesh.visible = hsU > 0;
    if (hsU > 0) {
      const p = easeOutExpo(hsU);
      hairspringMesh.position.z = (1 - p) * 0.72;
      const breath = t >= 6.50 ? 1.0 + balancePhase * 0.075 * smoothstep(6.50, 6.72, t) : lerp(0.18, 1.0, p);
      hairspringMesh.scale.set(breath, breath, 1.0);
      hairspringMesh.rotation.z = (1 - p) * Math.PI * 3.0 + balancePhase * 0.16 * (t >= 6.50 ? 1 : 0);
    }

    // Swiss Lever Pallet Fork snaps in at 5.98 -> 6.32s, rocks crisply at 4 Hz (8 beats/s) after 6.50s
    const palU = window01(t, 5.96, 6.32);
    palletGroup.visible = palU > 0;
    if (palU > 0) {
      const p = easeMagneticSnap(palU, 0.03);
      palletGroup.position.z = 0.015 + (1 - p) * 0.95;
      const baseAng = 0.36; // aimed cleanly between Escape Wheel C5 & Balance Roller
      const rock = t >= 6.50 ? Math.tanh(balancePhase * 3.2) * 0.20 * smoothstep(6.50, 6.68, t) : 0;
      palletGroup.rotation.z = baseAng + rock;
    }

    // 8. Shot 04: Sculpted Titanium Case, Curved Lugs, Chamfered Bezel & 8 Blued-Steel Bezel Screws
    const caseU = window01(t, 8.60, 9.62);
    watch.hardware.caseGroup.visible = caseU > 0;
    if (caseU > 0) {
      const p = easeMagneticSnap(caseU, 0.025);
      watch.hardware.caseGroup.position.z = -(1 - p) * 2.8;
      watch.hardware.caseGroup.scale.setScalar(lerp(1.16, 1.0, easeOutCubic(caseU)));
    }

    const bezelU = window01(t, 9.52, 10.22);
    watch.hardware.bezelGroup.visible = bezelU > 0;
    if (bezelU > 0) {
      const p = easeMagneticSnap(bezelU, 0.03);
      watch.hardware.bezelGroup.position.z = (1 - p) * 2.4;
      watch.hardware.bezelGroup.scale.setScalar(lerp(1.10, 1.0, easeOutCubic(bezelU)));
    }

    for (const bs of watch.hardware.bezelScrews) {
      const u = window01(t, bs.seatStart, bs.seatEnd);
      if (u <= 0) {
        bs.mesh.visible = false;
      } else {
        bs.mesh.visible = true;
        const p = easeMagneticSnap(u, 0.04);
        // Glide radially inward AND down onto the countersunk bezel pockets!
        const radOut = (1 - p) * 0.95;
        const zOut = (1 - p) * 0.90;
        bs.mesh.position.set(
          bs.targetPos.x + Math.cos(bs.ang) * radOut,
          bs.targetPos.y + Math.sin(bs.ang) * radOut,
          bs.targetPos.z + zOut
        );
        bs.mesh.rotation.z = bs.ang + Math.PI / 2 + (1 - p) * Math.PI * 2.0;
      }
    }

    // 9. Shot 05: Dial Chapter Ring, Faceted Dauphine Hands & Knurled Winding Crown Push (10:10 Pose!)
    const dialU = window01(t, 11.62, 12.24);
    watch.dialAndHands.dialRingGroup.visible = dialU > 0;
    if (dialU > 0) {
      const p = easeMagneticSnap(dialU, 0.03);
      watch.dialAndHands.dialRingGroup.position.z = (1 - p) * 1.85;
    }

    // Iconic 10:10 luxury watch hand angles:
    // 12 o'clock is rotZ = 0, clockwise is negative rotZ!
    // 10:10 -> Hour hand at 10 + 10/60 = 10.167h = -305 deg = +55 deg (+0.960 rad)
    // Minute hand at 10 min = -60 deg (-1.0472 rad)
    const sweepU = easeInOutCubic(window01(t, 13.20, 13.88));
    const hourAngleInit = -2.25;   // ~4:15 starting assembly pose
    const hourAngle1010 = (55 * Math.PI) / 180;
    const minAngleInit = 1.65;     // ~8:50 starting pose
    const minAngle1010 = (-60 * Math.PI) / 180;

    // Hour Hand seats 12.22 -> 12.56s
    const hU = window01(t, 12.22, 12.56);
    watch.dialAndHands.hourHandGroup.visible = hU > 0;
    if (hU > 0) {
      const p = easeMagneticSnap(hU, 0.035);
      watch.dialAndHands.hourHandGroup.position.z = (1 - p) * 1.45;
      watch.dialAndHands.hourHandGroup.rotation.z = lerp(hourAngleInit, hourAngle1010, sweepU);
    }

    // Minute Hand seats 12.46 -> 12.80s
    const mU = window01(t, 12.46, 12.80);
    watch.dialAndHands.minuteHandGroup.visible = mU > 0;
    if (mU > 0) {
      const p = easeMagneticSnap(mU, 0.035);
      watch.dialAndHands.minuteHandGroup.position.z = (1 - p) * 1.65;
      watch.dialAndHands.minuteHandGroup.rotation.z = lerp(minAngleInit, minAngle1010, sweepU);
    }

    // Blued-Steel Seconds Hand seats 12.68 -> 13.00s, sweeps to ~34s on crown push, then ticks live at 8 Hz!
    const sU = window01(t, 12.68, 13.00);
    watch.dialAndHands.secondHandGroup.visible = sU > 0;
    if (sU > 0) {
      const p = easeMagneticSnap(sU, 0.035);
      watch.dialAndHands.secondHandGroup.position.z = (1 - p) * 1.85;
      const secInit = -0.35;
      const secPoseBase = (-212 * Math.PI) / 180; // ~35s position balancing 10:10 hands nicely!
      // Live 8-beat/s stepped sweeping seconds once past 13.88s
      const liveSecT = Math.max(0, t - 13.88);
      const secBeats = liveSecT * 8.0;
      const steppedSec = (Math.floor(secBeats) + smoothstep(0, 0.35, secBeats - Math.floor(secBeats))) / 8.0;
      const liveAngle = -(steppedSec / 60.0) * Math.PI * 2.0;
      watch.dialAndHands.secondHandGroup.rotation.z = lerp(secInit, secPoseBase, sweepU) + liveAngle;
    }

    // Knurled Winding Crown slides in along -X (appears pulled-out from 11.50s, clicks home at 13.20s!)
    const crownAppear = window01(t, 11.45, 11.88);
    const crownPush = easeMagneticSnap(window01(t, 12.92, 13.22), 0.05);
    watch.hardware.crownGroup.visible = crownAppear > 0;
    if (crownAppear > 0) {
      const xPullOut = lerp(1.35, 0.36, easeOutCubic(crownAppear));
      const xSeat = lerp(xPullOut, 0.0, crownPush);
      watch.hardware.crownGroup.position.x = xSeat;
      // Subtle winding rotation while sliding in
      watch.hardware.crownGroup.rotation.x = crownAppear * 1.4 + crownPush * 0.65;
    }

    // 10. Shot 06: Domed Sapphire Crystal descends & seals at 15.00s with AR Ripple Wave
    const crysU = window01(t, 14.12, 15.00);
    watch.sapphire.crystalGroup.visible = crysU > 0;
    if (crysU > 0) {
      const p = easeOutCubic(crysU);
      watch.sapphire.crystalGroup.position.z = (1 - p) * 2.25;
      watch.sapphire.arUniforms.uOpacity.value = smoothstep(0.0, 0.25, crysU);
      watch.mats.sapphirePhysical.opacity = 0.11 * smoothstep(0.0, 0.25, crysU);
    }

    // Concentric blue-white AR seal wave rippling cleanly across sapphire crystal at t=15.00s -> 15.95s
    if (t >= 15.00 && t <= 16.05) {
      const wU = window01(t, 15.00, 15.98);
      watch.sapphire.arUniforms.uSealWave.value = easeOutCubic(wU) * 1.18;
      watch.sapphire.arUniforms.uSealOpacity.value = Math.sin(clamp(wU, 0, 1) * Math.PI) * 1.15;
    } else {
      watch.sapphire.arUniforms.uSealWave.value = -1.0;
      watch.sapphire.arUniforms.uSealOpacity.value = 0.0;
    }

    // Diagonal studio softbox glint sweep across sapphire dome in Shot 06 settle & Shot 08 hero lockup!
    if (t >= 17.85) {
      const gU = window01(t, 17.95, 19.65);
      watch.sapphire.arUniforms.uGlintSweep.value = lerp(-1.55, 1.55, easeInOutCubic(gU));
      watch.sapphire.arUniforms.uGlintStrength.value = Math.sin(clamp(gU, 0, 1) * Math.PI) * 0.92;
    } else if (t >= 15.05 && t < 16.05) {
      const gU = window01(t, 15.05, 16.00);
      watch.sapphire.arUniforms.uGlintSweep.value = lerp(-1.2, 1.2, gU);
      watch.sapphire.arUniforms.uGlintStrength.value = Math.sin(gU * Math.PI) * 0.45;
    } else {
      watch.sapphire.arUniforms.uGlintStrength.value = 0.0;
    }

    // 11. Shot 07: Articulated Titanium + Rose-Gold Link Bracelet Cascade
    const animateLinks = (links) => {
      for (const link of links) {
        const u = window01(t, link.seatStart, link.seatEnd);
        if (u <= 0) {
          link.group.visible = false;
        } else {
          link.group.visible = true;
          const p = easeMagneticSnap(u, 0.04);
          link.group.position.set(
            link.targetPos.x,
            link.targetPos.y + link.sign * (1 - p) * 1.35,
            link.targetPos.z - (1 - p) * 0.85
          );
          link.group.rotation.x = link.targetRotX + link.sign * (1 - p) * 0.45;
        }
      }
    };
    animateLinks(watch.bracelet.topLinks);
    animateLinks(watch.bracelet.bottomLinks);

    // 12. Shot 08: Sleek Dark Obsidian Mirror Plinth (fades & glides in smoothly during Shot 08)
    const plinthU = smoothstep(17.70, 18.25, t);
    watch.plinth.plinthGroup.visible = plinthU > 0.001;
    if (plinthU > 0.001) {
      watch.plinth.plinthGroup.position.set(-0.35, lerp(-5.2, -4.18, easeOutCubic(plinthU)), -0.35);
      watch.plinth.reflMat.uniforms.uOpacity.value = plinthU * 0.65;
    }

    // 13. Dynamic Studio Lighting Sweeps (Pure functions of t! Zero blown-out flat-surface fireballs.)
    if (t < 2.50) {
      // Shot 01: Dramatic near-black studio with ONE sweeping white softbox reflection gliding across mainplate
      const u = window01(t, 0.0, 2.50);
      lights.keyLight.intensity = lerp(0.50, 1.65, smoothstep(0.08, 0.88, u));
      lights.keyLight.position.set(lerp(-4.5, 4.2, easeInOutCubic(u)), 4.6, 7.2);
      lights.warmRim.intensity = lerp(0.25, 1.15, smoothstep(0.18, 0.90, u));
      lights.coolFill.intensity = lerp(0.15, 0.72, u);
      lights.hemi.intensity = 0.14;
      lights.sweepLight.position.set(lerp(-5.6, 5.6, easeInOutCubic(u)), lerp(3.8, -1.6, u), 5.6);
      lights.sweepLight.intensity = 2.8 * Math.sin(clamp(u, 0, 1) * Math.PI) + 0.8;
      lights.scanRimLight.intensity = 0;
    } else if (t < 5.50) {
      // Shot 02: Crisp horological macro studio lighting making rose-gold gears & rubies gleam
      const u = window01(t, 2.50, 5.50);
      lights.keyLight.intensity = 1.68;
      lights.keyLight.position.set(lerp(-3.5, 4.2, u), 5.8, 7.4);
      lights.warmRim.intensity = 1.75;
      lights.coolFill.intensity = 0.82;
      lights.hemi.intensity = 0.24;
      // Oblique grazing sweep so bevels sparkle WITHOUT hitting flat bridge normals dead-on!
      lights.sweepLight.position.set(lerp(-6.2, 6.2, u), lerp(4.2, 2.6, u), 6.2);
      lights.sweepLight.intensity = 1.65;
      lights.scanRimLight.intensity = 0;
    } else if (t < 8.50) {
      // Shot 03: Focused tourbillon macro lighting + subtle heartbeat glint pulse on ignition at 6.50s
      const u = window01(t, 5.50, 8.50);
      const igniteFlash = t >= 6.50 ? Math.exp(-(t - 6.50) * 6.5) * 1.45 : 0;
      lights.keyLight.intensity = 1.55;
      lights.keyLight.position.set(lerp(-3.2, 3.8, u), 5.2, 7.0);
      lights.warmRim.intensity = 1.85;
      lights.coolFill.intensity = 0.80;
      lights.hemi.intensity = 0.22;
      lights.sweepLight.position.set(lerp(-4.8, 4.8, u), TOURBILLON_POS.y + 3.6, 5.8);
      lights.sweepLight.intensity = 1.35 + igniteFlash;
      lights.scanRimLight.intensity = 0;
    } else if (t < 16.00) {
      // Shots 04–06: Balanced luxury studio tent with sweeping bevel & crystal glints
      const u = window01(t, 8.50, 16.00);
      const crownSpark = t >= 13.20 ? Math.exp(-(t - 13.20) * 9.0) * 1.6 : 0;
      const sealSpark = t >= 15.00 ? Math.exp(-(t - 15.00) * 5.0) * 1.5 : 0;
      lights.keyLight.intensity = 1.72;
      lights.keyLight.position.set(lerp(4.6, -3.6, u), 6.0, 7.6);
      lights.warmRim.intensity = 1.70;
      lights.coolFill.intensity = 0.88;
      lights.hemi.intensity = 0.24;
      lights.sweepLight.position.set(Math.sin(u * Math.PI * 2.0) * 6.5, 4.4, 6.4);
      lights.sweepLight.intensity = 1.45 + crownSpark + sealSpark;
      lights.scanRimLight.intensity = 0;
    } else if (t < 17.75) {
      // Shot 07: Dramatic bottom-to-top scanning rim-light strip accentuating bracelet & case silhouette!
      const u = window01(t, 16.00, 17.75);
      lights.keyLight.intensity = 1.45;
      lights.warmRim.intensity = 1.85;
      lights.coolFill.intensity = 0.72;
      lights.hemi.intensity = 0.18;
      lights.sweepLight.position.set(-4.5, lerp(-5.0, 5.0, u), 6.2);
      lights.sweepLight.intensity = 1.8;
      lights.scanRimLight.position.set(1.5, lerp(-5.5, 5.5, easeInOutCubic(u)), -2.6);
      lights.scanRimLight.intensity = 7.5 * Math.sin(clamp(u, 0, 1) * Math.PI) + 1.5;
    } else {
      // Shot 08: Stately luxury hero lockup lighting with slow liquid-mercury softbox glide
      const u = window01(t, 17.75, 20.00);
      lights.keyLight.intensity = 1.82;
      lights.keyLight.position.set(lerp(-4.2, 4.6, easeInOutCubic(u)), 6.2, 8.2);
      lights.warmRim.intensity = 1.82;
      lights.coolFill.intensity = 0.92;
      lights.hemi.intensity = 0.22;
      lights.sweepLight.position.set(lerp(-6.0, 5.5, easeInOutCubic(u)), 4.6, 6.8);
      lights.sweepLight.intensity = 1.65;
      lights.scanRimLight.intensity = 1.4;
      lights.scanRimLight.position.set(-3.5, 2.8, -3.0);
    }

    // 14. Post-Processing Uniforms (deterministic grain seed from t, gentle fade-in from obsidian at t=0)
    const introFade = smoothstep(0.0, 0.35, t);
    const outroHold = 1.0; // Hold cleanly crisp to 20.00s per storyboard!
    postfx.gradePass.uniforms.uTime.value = t;
    postfx.gradePass.uniforms.uExposure.value = lerp(0.18, 1.04, introFade) * outroHold;

    // 15. Shot 08 Architectural Typography State (pure function of t!)
    if (onTypographyUpdate) {
      const titleAlpha = smoothstep(18.02, 18.72, t);
      const tagAlpha = smoothstep(18.42, 19.12, t);
      const lineScale = easeOutCubic(window01(t, 18.05, 18.85));
      onTypographyUpdate({ titleAlpha, tagAlpha, lineScale, t });
    }
  }

  return { renderAt };
}
