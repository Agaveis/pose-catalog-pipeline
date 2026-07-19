#!/usr/bin/env node
// Compose per-participant COCO-17 keypoints for the Erotic Pose Catalog.
//
// A catalog participant references a base posture (pose-vocabularies/
// keypoint-base-skeletons.json) + a placement transform. This module turns
// that into scene-space COCO-17 keypoints: a flat [x,y,v, ...] array of 51
// numbers in COCO joint order.
//
// Transform order (see pose-vocabularies/keypoint-schema.json):
//   flip_x  →  scale (about centroid)  →  rotate_deg (about centroid)  →  translate
// flip_x mirrors x and swaps the left_/right_ joint labels so anatomy stays correct.
//
// Used by scripts/seed-poses.mjs and scripts/build-pose-dataset.mjs.
// Run directly to print composed keypoints for every seed pose (verification):
//   node scripts/build-keypoints.mjs

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOCAB_DIR = resolve(__dirname, '..', 'pose-vocabularies');

export const COCO_JOINTS = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
];

const LR_PAIRS = [
  ['left_eye', 'right_eye'], ['left_ear', 'right_ear'],
  ['left_shoulder', 'right_shoulder'], ['left_elbow', 'right_elbow'],
  ['left_wrist', 'right_wrist'], ['left_hip', 'right_hip'],
  ['left_knee', 'right_knee'], ['left_ankle', 'right_ankle'],
];

export function loadBaseSkeletons() {
  const raw = readFileSync(resolve(VOCAB_DIR, 'keypoint-base-skeletons.json'), 'utf8');
  return JSON.parse(raw).skeletons;
}

const round = (n) => Math.round(n * 1e4) / 1e4;

/**
 * Compose a participant into a COCO-17 flat array.
 * @param {object} participant  { base_posture, placement, joint_overrides? }
 *   joint_overrides: { [jointName]: [x, y, v] } — absolute SCENE-space values
 *   applied after the placement transform, for per-pose articulation the rigid
 *   transform can't express (wrapped legs, bracing arms, arched backs).
 * @param {object} skeletons    map from loadBaseSkeletons()
 * @returns {{ joints: object, flat: number[] }}
 */
export function composeParticipant(participant, skeletons) {
  const base = skeletons[participant.base_posture];
  if (!base) throw new Error(`Unknown base_posture: ${participant.base_posture}`);
  const p = participant.placement || {};
  const translate = p.translate || [0, 0];
  const scale = p.scale || [1, 1];
  const rotate = ((p.rotate_deg || 0) * Math.PI) / 180;
  const flip = !!p.flip_x;

  // Clone joints as { name: [x, y, v] }
  const j = {};
  for (const name of COCO_JOINTS) {
    const [x, y, v] = base[name];
    j[name] = [x, y, v];
  }

  // flip_x: mirror, then swap left/right labels
  if (flip) {
    for (const name of COCO_JOINTS) j[name][0] = 1 - j[name][0];
    for (const [l, r] of LR_PAIRS) {
      const tmp = j[l];
      j[l] = j[r];
      j[r] = tmp;
    }
  }

  // Centroid over visible/occluded joints (v > 0)
  let sx = 0, sy = 0, n = 0;
  for (const name of COCO_JOINTS) {
    if (j[name][2] > 0) { sx += j[name][0]; sy += j[name][1]; n++; }
  }
  const cx = n ? sx / n : 0.5;
  const cy = n ? sy / n : 0.5;

  const cos = Math.cos(rotate), sin = Math.sin(rotate);
  const overrides = participant.joint_overrides || {};
  for (const name of Object.keys(overrides)) {
    if (!COCO_JOINTS.includes(name)) throw new Error(`Unknown joint_overrides key: ${name}`);
  }
  const flat = [];
  const out = {};
  for (const name of COCO_JOINTS) {
    let [x, y, v] = j[name];
    // scale about centroid
    x = cx + (x - cx) * scale[0];
    y = cy + (y - cy) * scale[1];
    // rotate about centroid
    const dx = x - cx, dy = y - cy;
    x = cx + dx * cos - dy * sin;
    y = cy + dx * sin + dy * cos;
    // translate
    x = round(x + translate[0]);
    y = round(y + translate[1]);
    // scene-space per-joint override wins outright
    if (overrides[name]) {
      const [ox, oy, ov] = overrides[name];
      x = round(ox); y = round(oy); v = ov;
    }
    out[name] = [x, y, v];
    flat.push(x, y, v);
  }
  return { joints: out, flat };
}

/** Compose every participant of a pose. Returns array of { participant_index, role, base_posture, placement, keypoints_coco }. */
export function composePose(pose, skeletons) {
  return (pose.participants || []).map((part, i) => {
    const { flat } = composeParticipant(part, skeletons);
    return {
      participant_index: i,
      role: part.role || null,
      base_posture: part.base_posture,
      placement: part.placement || {},
      keypoints_coco: flat,
    };
  });
}

// ─── CLI: verify composition for every seed pose ──────────────────────
function main() {
  const skeletons = loadBaseSkeletons();
  const seed = JSON.parse(readFileSync(resolve(VOCAB_DIR, 'poses.seed.json'), 'utf8'));
  let participants = 0;
  for (const pose of seed.poses) {
    const composed = composePose(pose, skeletons);
    participants += composed.length;
    for (const c of composed) {
      if (c.keypoints_coco.length !== 51) {
        throw new Error(`${pose.slug} participant ${c.participant_index}: expected 51 numbers, got ${c.keypoints_coco.length}`);
      }
    }
    console.log(`✓ ${pose.slug.padEnd(22)} ${composed.length} participant(s)`);
  }
  console.log(`\n${seed.poses.length} poses, ${participants} participants, all COCO-17 (51 values) OK.`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-keypoints.mjs')) {
  main();
}
