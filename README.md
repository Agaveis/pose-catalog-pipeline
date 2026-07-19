<!-- DOI badge is added here once the Zenodo archive is minted from the first GitHub release:
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXXX) -->

# pose-catalog-pipeline

Reproducibility code for the **Erotic Pose Catalog** — a public, machine-readable dataset of **104 named erotic positions** (solo and multi-person) with structured attributes, historical/cultural provenance, an index of museum-attested erotic artworks, and an **idealised COCO-17 keypoint template per participant**.

- **Dataset (CC BY 4.0):** https://huggingface.co/datasets/EthnicErotic/pose-catalog
- **Methodology paper:** [`paper/methodology-v1.md`](paper/methodology-v1.md)
- **Live source catalog:** https://ethnicerotic.com/poses
- **How the catalog was built:** https://ethnicerotic.com/poses/methodology
- **Historical timeline:** https://ethnicerotic.com/poses/history

> **Adults only (18+).** This repository and the dataset it builds document adult sexual positions for research, content-tagging, and creative-tooling use. They contain **no images and no personal data** — only text metadata and schematic keypoint coordinates. The dataset is tagged `not-for-all-audiences`.

The pipeline runs end-to-end from a set of hand-authored JSON vocabularies to a HuggingFace-ready dataset (CSV + JSONL across six configurations). It needs **no database and no API keys** — the source of truth is version-controlled JSON, and every stage is deterministic and re-runnable.

## Why this exists

Named-position knowledge and pose *geometry* have never lived in the same place:

- **Human-pose datasets** (COCO Keypoints, MPII, PoseTrack) give joint coordinates but **no named positions**, and none cover intimate poses.
- **Named-position references** (Wikipedia's "List of sex positions", Wikidata's *sex position* Q8394) give names and prose but **no geometry** and only coarse structure.
- **Adult ML datasets** (NPDI, LSPD) are **binary or anatomy-level**, with no position labels.

This catalog is the bridge: a clean **named-position → structured-attributes → COCO-17 keypoint template** mapping, decoupled from any single tag folksonomy, plus a documented cross-cultural provenance layer tying modern positions back to the historical sources (Kama Sutra, Su Nü Jing, Perfumed Garden, shunga, Moche ceramics, …) that first recorded them.

## What's in this repo

| Path | Purpose |
|---|---|
| `pose-vocabularies/poses.seed.json` | The canonical source: one entry per named position (attributes, aliases, Wikidata QID, historical sources, description, participant placements) |
| `pose-vocabularies/pose-structure.json` | Controlled vocabulary for the structural facet (position family, arrangement, penetration type, facing, dynamics, support surface) |
| `pose-vocabularies/participant-composition.json` | Controlled vocabulary for apparent participant composition |
| `pose-vocabularies/presentation.json` | Controlled vocabulary for on-camera presentation (camera framing, prevalence, difficulty, intensity tier) |
| `pose-vocabularies/keypoint-schema.json` | The transform grammar (`flip_x → scale → rotate_deg → translate`) for composing keypoints |
| `pose-vocabularies/keypoint-base-skeletons.json` | The 17 canonical base-posture COCO-17 skeletons |
| `pose-vocabularies/historical-sources.json` | Registry of 22 historical sources (7 sex manuals + 15 erotic-art traditions), each with culture/era/language/region |
| `pose-vocabularies/historical-works.json` | Text-only index of 87 museum-attested erotic artworks across 13 traditions, with verification confidence grades |
| `pose-vocabularies/wikidata-positions.json` | CC0 Wikidata QID/label/alias anchor list (regenerable, see below) |
| `scripts/fetch-wikidata-positions.mjs` | Fetch CC0 *sex position* (Q8394) items from Wikidata SPARQL as a naming/QID anchor |
| `scripts/build-keypoints.mjs` | Compose per-participant COCO-17 keypoints from base posture + placement transform; run directly to verify all poses |
| `scripts/pose-row.mjs` | Shared mapping from a seed entry to a flat serving row (single source of truth for row shape) |
| `scripts/build-pose-dataset.mjs` | Export the vocabularies as the HuggingFace dataset (CSV + JSONL + manifest) |
| `scripts/render-pose-contact-sheet.mjs` | Dev tool: render every pose's composed skeletons to a standalone HTML contact sheet for visual verification |

## Pipeline

The build is a short, deterministic, database-free chain:

1. **Anchor names against Wikidata (CC0).** `fetch-wikidata-positions.mjs` queries the *sex position* class (Q8394) via SPARQL and writes `pose-vocabularies/wikidata-positions.json` — a reference list of QIDs, labels, and aliases. Descriptions and keypoints are **not** copied from Wikidata; this is a naming anchor only.
2. **Author the catalog.** Positions, attributes, aliases, historical-source mappings, and participant placements are hand-authored in `pose-vocabularies/poses.seed.json` against the four controlled-vocabulary facets. All prose is original.
3. **Compose keypoints.** `build-keypoints.mjs` turns each participant's `{ base_posture, placement }` into scene-space COCO-17 keypoints (a flat `[x, y, v] × 17` array), applying `flip_x → scale → rotate → translate` about the skeleton centroid, plus optional per-joint scene-space overrides for articulation the rigid transform can't express.
4. **Verify visually.** `render-pose-contact-sheet.mjs` renders every composed skeleton to an HTML contact sheet so placements can be eyeballed before release.
5. **Export.** `build-pose-dataset.mjs` reads the vocabularies and writes six dataset configurations (CSV + JSONL) plus a `manifest.json` with row counts and provenance, under `huggingface-pose-dataset/`.
6. **Upload.** `hf upload EthnicErotic/pose-catalog ./huggingface-pose-dataset --repo-type=dataset --exclude="UPLOAD.md"`.

The same JSON vocabularies seed the live catalog's serving database (via idempotent boot DDL, not shown here) and this dataset export, so the two never diverge.

## Quick start

### Prerequisites

- **Node.js 18+** (the scripts use only Node built-ins and the global `fetch`; there are no npm dependencies).
- **Hugging Face CLI** (`hf`), authenticated with a WRITE token — only for the final upload step.

### Run

```bash
git clone https://github.com/Agaveis/pose-catalog-pipeline.git
cd pose-catalog-pipeline

# (optional) refresh the CC0 Wikidata anchor list
npm run fetch-wikidata

# verify every pose composes to a valid COCO-17 skeleton (51 values/participant)
npm run verify-keypoints

# (optional) render the visual contact sheet for eyeballing placements
npm run contact-sheet          # → pose-contact-sheet.html

# build the HuggingFace dataset (CSV + JSONL + manifest)
npm run build                  # → huggingface-pose-dataset/

# upload to HuggingFace (needs `hf auth login` with a WRITE token first)
hf upload EthnicErotic/pose-catalog ./huggingface-pose-dataset --repo-type=dataset --exclude="UPLOAD.md"
```

## Cost and runtime

Unlike vision-LLM datasets, this pipeline has **no inference cost** — it is a deterministic transform over local JSON.

| Stage | Time | Cost |
|---|---|---|
| Wikidata SPARQL anchor fetch | ~5 sec | $0 |
| Keypoint composition + verification | <1 sec | $0 |
| Contact-sheet render | <1 sec | $0 |
| Dataset export (six configs) | <1 sec | $0 |
| HuggingFace upload | ~10 sec | $0 |

Total: seconds of wall time, $0, end-to-end.

## Reproducibility notes

- **Determinism.** Given the same `pose-vocabularies/` inputs, the dataset export is byte-identical except for the ISO-8601 `generated_at` timestamp in `manifest.json`. There is no model, no temperature, and no network dependency in the export step.
- **Keypoints are schematic, not observed.** Every keypoint is an *idealised template* composed from a base posture and a rigid placement transform. They are **not** motion-captured or image-derived, and multi-participant registration is approximate. They are intended as pose-conditioning priors and structural references, not ground-truth annotations.
- **Wikidata anchors are CC0.** QIDs, labels, and aliases come from Wikidata structured data (CC0) and carry no attribution constraint. `fetch-wikidata-positions.mjs` sends a descriptive User-Agent with contact info per Wikimedia's SPARQL etiquette.
- **No share-alike prose is copied.** Taxonomy *structure* is referenced, but no CC BY-SA article text (Wikipedia, etc.) is copied. All descriptions, provenance summaries, and artwork readings are original editorial, which is what keeps the dataset's outbound **CC BY 4.0** licence valid.
- **The historical layers are text-only.** `historical-sources.json` and `historical-works.json` record titles, dates, holding institutions, accession numbers, and position mappings — all facts of the public record. No image bytes are stored or served. Work→position `depicts` links exist **only** where the work's own catalog description names the arrangement, and each was adversarially re-verified; corrections found during fact-checking are preserved in `note` fields rather than smoothed over.

## Data outputs

`build-pose-dataset.mjs` writes six configurations (CSV + matching JSONL) under `huggingface-pose-dataset/data/`:

| Config | Rows | Description |
|---|---|---|
| `poses` | 104 | One row per named position: structure, composition, presentation, aliases, Wikidata anchor, historical sources, description, canonical URL |
| `keypoints` | 219 | One row per (pose × participant): base posture, placement transform, composed COCO-17 keypoints |
| `pose_dimensions` | 17 | Flat controlled vocabulary: every dimension across four facets (111 defined values), with citations |
| `base_skeletons` | 17 | The canonical base-posture skeletons the keypoints are composed from |
| `provenance` | 59 | One row per (position × historical source): historical name, source title/author, culture, era, language, region — across 22 sources |
| `works` | 87 | One row per attested historical artwork: title, date, holding + accession, medium, description, significance, verification confidence, and `depicts` links |

See the [dataset card](https://huggingface.co/datasets/EthnicErotic/pose-catalog) for full column definitions and limitations.

## Sample position pages

The dataset rows reference back to the live catalog at ethnicerotic.com. A few example destinations:

- https://ethnicerotic.com/poses/missionary
- https://ethnicerotic.com/poses/cowgirl
- https://ethnicerotic.com/poses/reverse-cowgirl
- https://ethnicerotic.com/poses/doggy-style
- https://ethnicerotic.com/poses/spooning
- https://ethnicerotic.com/poses/sixty-nine
- https://ethnicerotic.com/poses/lotus
- https://ethnicerotic.com/poses/prone-bone

Each page renders the position's structured attributes, its composed COCO-17 skeleton diagram, and — where attested — its historical provenance across the source manuals and erotic-art traditions. The full taxonomy is at https://ethnicerotic.com/poses/taxonomy.

## Limitations

- **Keypoints are schematic templates**, not observations; multi-participant registration is approximate.
- **`composition_code`** (MMF/FFM/…) describes *apparent on-camera presentation* only and implies nothing about identity or orientation.
- Prevalence and difficulty ratings are qualitative editorial estimates.
- Provenance mappings are conservative (attested only); absence of a mapping is not evidence a position is unattested in a tradition.

See the dataset card and the methodology paper for the full discussion.

## License

Code in this repository: [Apache License 2.0](LICENSE).
The dataset itself: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — see the [dataset card](https://huggingface.co/datasets/EthnicErotic/pose-catalog) for details.
Wikidata anchors (`wikidata_qid`, labels, aliases) are CC0.

## Citation

If you use this code or the resulting dataset, please cite:

```bibtex
@misc{pose_catalog_pipeline_2026,
  title         = {pose-catalog-pipeline: named erotic positions with structured attributes and COCO-17 keypoint templates},
  author        = {{Ethnic Erotic}},
  year          = {2026},
  publisher     = {Zenodo},
  version       = {v1.0.0},
  howpublished  = {\url{https://github.com/Agaveis/pose-catalog-pipeline}},
  note          = {DOI pending Zenodo archive; Dataset: \url{https://huggingface.co/datasets/EthnicErotic/pose-catalog}}
}

@misc{ethnicerotic_pose_catalog_2026,
  title         = {Erotic Pose Catalog: named positions with COCO-17 keypoint templates},
  author        = {{Ethnic Erotic}},
  year          = {2026},
  publisher     = {Hugging Face},
  url           = {https://huggingface.co/datasets/EthnicErotic/pose-catalog},
  note          = {Code: \url{https://github.com/Agaveis/pose-catalog-pipeline}; Source: \url{https://ethnicerotic.com/poses}}
}
```

## Contact

- Issues / contributions: https://github.com/Agaveis/pose-catalog-pipeline/issues
- Dataset feedback: https://huggingface.co/datasets/EthnicErotic/pose-catalog/discussions
- Live catalog: https://ethnicerotic.com/poses
