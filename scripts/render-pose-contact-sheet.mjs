#!/usr/bin/env node
// Dev tool: render every seed pose's composed COCO-17 skeletons as a standalone
// HTML contact sheet for visual iteration. Mirrors PoseSkeleton.tsx rendering
// (bones + joints, per-participant color, occluded dimmed) with a joint-name
// hover title for debugging.
//
// Usage (from Sites/EE/nextjs-app/):
//   node scripts/render-pose-contact-sheet.mjs [out.html]
// Default output: pose-contact-sheet.html in the CWD (git-ignored scratch use).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBaseSkeletons, composePose, COCO_JOINTS } from './build-keypoints.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VOCAB_DIR = resolve(__dirname, '..', 'pose-vocabularies')
const OUT = process.argv[2] ? resolve(process.argv[2]) : resolve(process.cwd(), 'pose-contact-sheet.html')

const BONE_EDGES = [
  ['nose', 'left_eye'], ['nose', 'right_eye'],
  ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
]

const COLORS = ['#E6B34A', '#E0544E', '#5AA9E6', '#8E6FE0']
const ROLE_COLORS = { receiving: '#E6B34A', penetrating: '#E0544E', solo: '#E6B34A' }
const S = 100

function jointsFromFlat(flat) {
  const out = {}
  for (let i = 0; i < COCO_JOINTS.length; i++) {
    out[COCO_JOINTS[i]] = { x: flat[i * 3], y: flat[i * 3 + 1], v: flat[i * 3 + 2] }
  }
  return out
}

function svgForPose(pose, skeletons) {
  const composed = composePose(pose, skeletons)
  const parts = composed.map((c, pi) => {
    const j = jointsFromFlat(c.keypoints_coco)
    const color = (c.role && ROLE_COLORS[c.role]) || COLORS[pi % COLORS.length]
    const bones = BONE_EDGES.map(([a, b]) => {
      const ja = j[a], jb = j[b]
      if (!ja || !jb || ja.v === 0 || jb.v === 0) return ''
      const op = ja.v === 1 || jb.v === 1 ? 0.4 : 0.9
      return `<line x1="${ja.x * S}" y1="${ja.y * S}" x2="${jb.x * S}" y2="${jb.y * S}" opacity="${op}"/>`
    }).join('')
    const dots = COCO_JOINTS.map((name) => {
      const jt = j[name]
      if (!jt || jt.v === 0) return ''
      const r = jt.v === 2 ? 1.7 : 1.2
      const fill = jt.v === 2 ? color : 'transparent'
      return `<circle cx="${jt.x * S}" cy="${jt.y * S}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="0.8" opacity="${jt.v === 2 ? 1 : 0.5}"><title>${pose.slug} p${pi} ${name} (${jt.x.toFixed(2)},${jt.y.toFixed(2)})</title></circle>`
    }).join('')
    return `<g stroke="${color}" stroke-width="1.4" stroke-linecap="round">${bones}${dots}</g>`
  }).join('')
  const legend = composed.map((c, pi) => {
    const color = (c.role && ROLE_COLORS[c.role]) || COLORS[pi % COLORS.length]
    return `<span class="lg"><i style="background:${color}"></i>${c.role || 'p' + pi}·${c.base_posture}</span>`
  }).join(' ')
  return `<div class="card"><h3>${pose.name} <small>${pose.slug}</small></h3>
<svg viewBox="-8 -8 116 116">${'<rect x="-8" y="-8" width="116" height="116" fill="#0b0b0b"/>'}
<g stroke="#2a2a2a" stroke-width="0.3">${[0, 25, 50, 75, 100].map((t) => `<line x1="${t}" y1="0" x2="${t}" y2="100"/><line x1="0" y1="${t}" x2="100" y2="${t}"/>`).join('')}</g>
${parts}</svg>
<p>${legend}</p></div>`
}

const skeletons = loadBaseSkeletons()
const seed = JSON.parse(readFileSync(resolve(VOCAB_DIR, 'poses.seed.json'), 'utf8'))
const cards = seed.poses.map((p) => svgForPose(p, skeletons)).join('\n')

writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>Pose skeleton contact sheet</title>
<style>
body{background:#111;color:#ddd;font:14px system-ui;margin:16px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card{background:#181818;border:1px solid #333;border-radius:8px;padding:10px}
.card h3{margin:0 0 6px;font-size:14px;color:#fff}.card h3 small{color:#777;font-weight:400}
.card svg{width:100%;height:auto;border-radius:6px}
.card p{margin:6px 0 0;font-size:11px;color:#999}
.lg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
.lg{margin-right:10px}
</style>
<h1 style="font-size:18px">Pose skeleton contact sheet — ${seed.poses.length} poses</h1>
<div class="grid">${cards}</div>\n`, 'utf8')
console.log(`✓ Wrote ${OUT}`)
