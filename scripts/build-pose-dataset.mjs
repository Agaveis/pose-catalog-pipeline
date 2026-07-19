#!/usr/bin/env node
// Export the Erotic Pose Catalog as a HuggingFace-compatible dataset.
//
// Source of truth is pose-vocabularies/ (poses.seed.json + the vocab JSONs +
// base skeletons) — the same files the site DB is seeded from — so this export
// needs no database connection.
//
// Outputs (under huggingface-pose-dataset/):
//   data/poses.csv            + .jsonl  — one row per named position
//   data/keypoints.csv        + .jsonl  — one row per (pose × participant), COCO-17
//   data/pose_dimensions.csv  + .jsonl  — flat controlled-vocabulary (one row/dimension)
//   data/base_skeletons.jsonl           — 10 canonical base-posture templates
//   data/vocabularies.jsonl             — full nested vocab schemas (4 facets)
//   manifest.json                       — counts + provenance
//
// Usage (from Sites/EE/nextjs-app/):
//   node scripts/build-pose-dataset.mjs
// Then upload (see huggingface-pose-dataset/UPLOAD.md):
//   hf upload EthnicErotic/pose-catalog ./huggingface-pose-dataset --repo-type=dataset

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBaseSkeletons, composePose, COCO_JOINTS } from './build-keypoints.mjs'
import { SITE_URL } from './pose-row.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const VOCAB_DIR = resolve(ROOT, 'pose-vocabularies')
const OUT_ROOT = resolve(ROOT, 'huggingface-pose-dataset')
const OUT_DIR = resolve(OUT_ROOT, 'data')
const SCHEMA_VERSION = 1

const readJson = (name) => JSON.parse(readFileSync(resolve(VOCAB_DIR, name), 'utf8'))

function htmlToText(html) {
  if (!html) return ''
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim()
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function writeCsv(path, rows, columns) {
  const header = columns.join(',')
  const body = rows.map((row) => columns.map((c) => csvEscape(row[c])).join(',')).join('\n')
  writeFileSync(path, header + '\n' + body + '\n', 'utf8')
}

function writeJsonl(path, rows) {
  writeFileSync(path, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
}

const pipe = (arr) => (Array.isArray(arr) ? arr.filter(Boolean).join('|') : (arr || ''))

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const skeletons = loadBaseSkeletons()
  const seed = readJson('poses.seed.json')

  const VOCAB_FILES = ['pose-structure.json', 'participant-composition.json', 'presentation.json', 'keypoint-schema.json']
  const vocabs = VOCAB_FILES.map(readJson)
  const historicalRegistry = readJson('historical-sources.json')
  const sourcesById = Object.fromEntries(historicalRegistry.sources.map((s) => [s.id, s]))
  const worksRegistry = readJson('historical-works.json')
  const traditionsById = Object.fromEntries(worksRegistry.traditions.map((t) => [t.id, t]))

  // ─── poses + keypoints ────────────────────────────────────────────
  const poseRowsCsv = []
  const poseRowsJsonl = []
  const kpRowsCsv = []
  const kpRowsJsonl = []
  const provRowsCsv = []
  const provRowsJsonl = []

  seed.poses.forEach((p, i) => {
    const id = i + 1
    const canonical_url = `${SITE_URL}/poses/${p.slug}`
    const wiki_url = p.wikidata_qid ? `https://www.wikidata.org/wiki/${p.wikidata_qid}` : ''
    const descriptionText = htmlToText(p.description)
    const composed = composePose(p, skeletons)

    const common = {
      id,
      slug: p.slug,
      name: p.name,
      wikidata_qid: p.wikidata_qid || '',
      kama_sutra_name: p.kama_sutra_name || '',
      position_family: p.position_family || '',
      primary_act: p.primary_act || '',
      arrangement: p.arrangement || '',
      penetration_type: p.penetration_type || '',
      facing: p.facing || '',
      dynamics: p.dynamics || '',
      support_surface: p.support_surface || '',
      participant_count: p.participant_count || '',
      composition_code: p.composition_code || '',
      n_participants: composed.length,
      source_medium: p.source_medium || '',
      difficulty: p.difficulty || '',
      prevalence: p.prevalence || '',
      intensity_tier: p.intensity_tier || '',
      description: descriptionText,
      wiki_url,
      canonical_url,
    }
    const hist = Array.isArray(p.historical_sources) ? p.historical_sources : []
    poseRowsCsv.push({ ...common, aliases: pipe(p.aliases), camera_framing: pipe(p.camera_framing), historical_sources: hist.length ? JSON.stringify(hist) : '' })
    poseRowsJsonl.push({ ...common, aliases: p.aliases || [], camera_framing: p.camera_framing || [], historical_sources: hist })

    // Provenance config: one flat row per (pose × historical source).
    for (const h of hist) {
      const src = sourcesById[h.source]
      if (!src) throw new Error(`${p.slug}: unknown historical source id "${h.source}"`)
      const prow = {
        pose_id: id,
        pose_slug: p.slug,
        pose_name: p.name,
        source_id: src.id,
        source_title: src.title,
        source_author: src.author,
        source_culture: src.culture,
        source_era: src.era,
        source_language: src.language,
        source_region: src.region_slug.replace(/-region$/, '').replace(/-/g, ' '),
        historical_name: h.name,
        note: h.note || '',
        pose_canonical_url: canonical_url,
      }
      provRowsCsv.push(prow)
      provRowsJsonl.push(prow)
    }

    for (const k of composed) {
      const baseCommon = {
        pose_id: id,
        pose_slug: p.slug,
        pose_name: p.name,
        participant_index: k.participant_index,
        role: k.role || '',
        base_posture: k.base_posture || '',
      }
      kpRowsCsv.push({
        ...baseCommon,
        placement: JSON.stringify(k.placement),
        keypoints_coco: JSON.stringify(k.keypoints_coco),
      })
      // JSONL: nested placement + both flat array and named joints.
      const joints = {}
      for (let j = 0; j < COCO_JOINTS.length; j++) {
        const b = j * 3
        joints[COCO_JOINTS[j]] = [k.keypoints_coco[b], k.keypoints_coco[b + 1], k.keypoints_coco[b + 2]]
      }
      kpRowsJsonl.push({ ...baseCommon, placement: k.placement, keypoints_coco: k.keypoints_coco, joints })
    }
  })

  const POSE_COLS = [
    'id', 'slug', 'name', 'aliases', 'wikidata_qid', 'kama_sutra_name',
    'position_family', 'primary_act', 'arrangement', 'penetration_type', 'facing', 'dynamics', 'support_surface',
    'participant_count', 'composition_code', 'n_participants',
    'source_medium', 'camera_framing', 'difficulty', 'prevalence', 'intensity_tier',
    'historical_sources', 'description', 'wiki_url', 'canonical_url',
  ]
  writeCsv(resolve(OUT_DIR, 'poses.csv'), poseRowsCsv, POSE_COLS)
  writeJsonl(resolve(OUT_DIR, 'poses.jsonl'), poseRowsJsonl)

  const PROV_COLS = ['pose_id', 'pose_slug', 'pose_name', 'source_id', 'source_title', 'source_author', 'source_culture', 'source_era', 'source_language', 'source_region', 'historical_name', 'note', 'pose_canonical_url']
  writeCsv(resolve(OUT_DIR, 'provenance.csv'), provRowsCsv, PROV_COLS)
  writeJsonl(resolve(OUT_DIR, 'provenance.jsonl'), provRowsJsonl)
  writeJsonl(resolve(OUT_DIR, 'historical_sources.jsonl'), historicalRegistry.sources)

  const KP_COLS = ['pose_id', 'pose_slug', 'pose_name', 'participant_index', 'role', 'base_posture', 'placement', 'keypoints_coco']
  writeCsv(resolve(OUT_DIR, 'keypoints.csv'), kpRowsCsv, KP_COLS)
  writeJsonl(resolve(OUT_DIR, 'keypoints.jsonl'), kpRowsJsonl)

  // ─── pose_dimensions (flat controlled vocab) ──────────────────────
  const dimRows = []
  for (const v of vocabs) {
    for (const d of v.dimensions || []) {
      const values = Array.isArray(d.values) ? d.values : []
      dimRows.push({
        facet: v.atlas_category || '',
        facet_display: v.display_name || '',
        dimension_id: d.id || '',
        dimension_name: d.display_name || '',
        dimension_type: d.type || '',
        scale: d.scale || '',
        scale_citation: d.scale_citation || '',
        description: d.description || '',
        value_count: values.length,
        value_ids: values.map((x) => x.id).filter(Boolean).join('|'),
        license: v.license || '',
        version: v.version || '',
      })
    }
  }
  const DIM_COLS = ['facet', 'facet_display', 'dimension_id', 'dimension_name', 'dimension_type', 'scale', 'scale_citation', 'description', 'value_count', 'value_ids', 'license', 'version']
  writeCsv(resolve(OUT_DIR, 'pose_dimensions.csv'), dimRows, DIM_COLS)
  writeJsonl(resolve(OUT_DIR, 'pose_dimensions.jsonl'), dimRows)

  // ─── historical works (text-only artwork index) ───────────────────
  const workRows = worksRegistry.works.map((w) => {
    const t = traditionsById[w.tradition_id]
    if (!t) throw new Error(`work ${w.id}: unknown tradition ${w.tradition_id}`)
    return {
      work_id: w.id,
      tradition_id: t.id,
      tradition_title: t.title,
      source_id: t.source_id,
      region: t.region_slug.replace(/-region$/, '').replace(/-/g, ' '),
      iso_countries: t.iso_countries,
      name: w.name,
      confidence: w.confidence,
      date: w.date,
      holding: w.holding,
      medium: w.medium,
      description: w.description,
      significance: w.significance,
      note: w.note,
      source_ref: w.source_ref,
      depicts: Array.isArray(w.depicts) ? w.depicts.join('|') : '',
    }
  })
  const WORK_COLS = ['work_id', 'tradition_id', 'tradition_title', 'source_id', 'region', 'iso_countries', 'name', 'confidence', 'date', 'holding', 'medium', 'description', 'significance', 'note', 'source_ref', 'depicts']
  writeCsv(resolve(OUT_DIR, 'works.csv'), workRows, WORK_COLS)
  writeJsonl(resolve(OUT_DIR, 'works.jsonl'), workRows)

  // ─── base skeletons + full nested vocab ───────────────────────────
  const baseRows = Object.entries(skeletons).map(([posture, joints]) => ({ posture, joints }))
  writeJsonl(resolve(OUT_DIR, 'base_skeletons.jsonl'), baseRows)
  writeJsonl(resolve(OUT_DIR, 'vocabularies.jsonl'), vocabs)

  // ─── manifest ─────────────────────────────────────────────────────
  const manifest = {
    generated_at: new Date().toISOString(),
    source: SITE_URL,
    schema_version: SCHEMA_VERSION,
    license: 'CC-BY-4.0',
    counts: {
      poses: poseRowsCsv.length,
      keypoint_participants: kpRowsCsv.length,
      dimensions: dimRows.length,
      dimension_values: dimRows.reduce((n, d) => n + d.value_count, 0),
      base_skeletons: baseRows.length,
      vocabularies: vocabs.length,
      provenance_links: provRowsCsv.length,
      historical_sources: historicalRegistry.sources.length,
      historical_works: workRows.length,
    },
  }
  writeFileSync(resolve(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  console.log(`✓ poses: ${manifest.counts.poses}`)
  console.log(`✓ keypoint participants: ${manifest.counts.keypoint_participants}`)
  console.log(`✓ dimensions: ${manifest.counts.dimensions} (${manifest.counts.dimension_values} values)`)
  console.log(`✓ base skeletons: ${manifest.counts.base_skeletons} · vocabularies: ${manifest.counts.vocabularies}`)
  console.log(`✓ provenance: ${manifest.counts.provenance_links} links across ${manifest.counts.historical_sources} historical sources`)
  console.log(`✓ historical works: ${manifest.counts.historical_works}`)
  console.log(`\nOutput: ${OUT_ROOT}`)
  console.log('Next: hf upload EthnicErotic/pose-catalog ./huggingface-pose-dataset --repo-type=dataset')
}

main()
