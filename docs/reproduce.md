# Reproduce

The pipeline runs end-to-end from a set of hand-authored JSON vocabularies to a [HuggingFace-ready dataset](https://huggingface.co/datasets/EthnicErotic/pose-catalog) (CSV + JSONL). The same JSON vocabularies seed the [live catalog](https://ethnicerotic.com/poses/methodology) and this dataset export, so the two never diverge. Archived releases have a [concept DOI](https://doi.org/10.5281/zenodo.21439174), which always resolves to the latest version.

## Scripts

| Path | Purpose |
|---|---|
| `scripts/fetch-wikidata-positions.mjs` | Fetch CC0 *sex position* (Q8394) items from Wikidata SPARQL as a naming/QID anchor |
| `scripts/build-keypoints.mjs` | Compose per-participant COCO-17 keypoints from base posture + placement transform; run directly to verify all poses |
| `scripts/pose-row.mjs` | Shared mapping from a seed entry to a flat serving row (single source of truth for row shape) |
| `scripts/build-pose-dataset.mjs` | Export the vocabularies as the HuggingFace dataset (CSV + JSONL + manifest) |
| `scripts/render-pose-contact-sheet.mjs` | Dev tool: render every pose's composed skeletons to a standalone HTML contact sheet for visual verification |

## Pipeline

The build is a short, deterministic, database-free chain:

1. **Anchor names against Wikidata (CC0).** `fetch-wikidata-positions.mjs` queries the *sex position* class (Q8394) via SPARQL and writes `pose-vocabularies/wikidata-positions.json`: a reference list of QIDs, labels, and aliases. Descriptions and keypoints are **not** copied from Wikidata; this is a naming anchor only.
2. **Author the catalog.** Positions, attributes, aliases, historical-source mappings, and participant placements are hand-authored in `pose-vocabularies/poses.seed.json` against the four controlled-vocabulary facets. All prose is original.
3. **Compose keypoints.** `build-keypoints.mjs` turns each participant's `{ base_posture, placement }` into scene-space COCO-17 keypoints (a flat `[x, y, v] × 17` array), applying `flip_x → scale → rotate → translate` about the skeleton centroid, plus optional per-joint scene-space overrides for articulation the rigid transform can't express.
4. **Verify visually.** `render-pose-contact-sheet.mjs` renders every composed skeleton to an HTML contact sheet so placements can be eyeballed before release.
5. **Export.** `build-pose-dataset.mjs` reads the vocabularies and writes ten dataset configurations (CSV + JSONL) plus a `manifest.json` with row counts and provenance, under `huggingface-pose-dataset/`.
6. **Upload.** `hf upload EthnicErotic/pose-catalog ./huggingface-pose-dataset --repo-type=dataset --exclude="UPLOAD.md"`.

The same JSON vocabularies seed the live catalog's serving database (via idempotent boot DDL, not shown here) and this dataset export, so the two never diverge.

## Quick start

### Prerequisites

- **Node.js 18+** (the scripts use only Node built-ins and the global `fetch`; there are no npm dependencies).
- **Hugging Face CLI** (`hf`), authenticated with a WRITE token, only for the final upload step.

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

## Reproducibility notes

- **Determinism.** Given the same `pose-vocabularies/` inputs, the dataset export is byte-identical except for the ISO-8601 `generated_at` timestamp in `manifest.json`. There is no model, no temperature, and no network dependency in the export step.
- **Keypoints are schematic, not observed.** Every keypoint is an *idealised template* composed from a base posture and a rigid placement transform. They are **not** motion-captured or image-derived, and multi-participant registration is approximate. They are intended as pose-conditioning priors and structural references, not ground-truth annotations.
- **Wikidata anchors are CC0.** QIDs, labels, and aliases come from Wikidata structured data (CC0) and carry no attribution constraint. `fetch-wikidata-positions.mjs` sends a descriptive User-Agent with contact info per Wikimedia's SPARQL etiquette.
- **No share-alike prose is copied.** Taxonomy *structure* is referenced, but no CC BY-SA article text (Wikipedia, etc.) is copied. All descriptions, provenance summaries, and artwork readings are original editorial, which is what keeps the dataset's outbound **CC BY 4.0** licence valid.
- **The historical layers are text-only.** `historical-sources.json` and `historical-works.json` record titles, dates, holding institutions, accession numbers, and position mappings: all facts of the public record. No image bytes are stored or served. Work→position `depicts` links exist **only** where the work's own catalog description names the arrangement, and each was adversarially re-verified; corrections found during fact-checking are preserved in `note` fields rather than smoothed over.
