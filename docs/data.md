# Data

The dataset (CC BY 4.0) is published at [EthnicErotic/pose-catalog](https://huggingface.co/datasets/EthnicErotic/pose-catalog). The dataset rows reference back to the live catalog at [ethnicerotic.com](https://ethnicerotic.com/poses/crosswalk). Archived releases have a [concept DOI](https://doi.org/10.5281/zenodo.21439174), which always resolves to the latest version.

## Data outputs

`build-pose-dataset.mjs` writes six configurations (CSV + matching JSONL) under `huggingface-pose-dataset/data/`:

| Config | Rows | Description |
|---|---|---|
| `poses` | 104 | One row per named position: structure, composition, presentation, aliases, Wikidata anchor, historical sources, description, canonical URL |
| `keypoints` | 219 | One row per (pose × participant): base posture, placement transform, composed COCO-17 keypoints |
| `pose_dimensions` | 17 | Flat controlled vocabulary: every dimension across four facets (111 defined values), with citations |
| `base_skeletons` | 17 | The canonical base-posture skeletons the keypoints are composed from |
| `provenance` | 59 | One row per (position × historical source): historical name, source title/author, culture, era, language, region; across 22 sources |
| `works` | 87 | One row per attested historical artwork: title, date, holding + accession, medium, description, significance, verification confidence, and `depicts` links |

See the [dataset card](https://huggingface.co/datasets/EthnicErotic/pose-catalog) for full column definitions and limitations.

## Vocabulary files

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
| `pose-vocabularies/action-dynamics.json` | **v2** The motion layer: 22 action beats, 6 tempi, 14 camera moves, loop types, contact continuity. Beats and camera moves carry a clinical mechanical gloss for video prompting |
| `pose-vocabularies/wardrobe-state.json` | **v2** Coverage, disarray and garment class, kept as separate axes so they recombine |
| `pose-vocabularies/scene-setting.json` | **v2** Location, lighting, production mode and time of day |
| `pose-vocabularies/expression-gaze.json` | **v2** Gaze target, facial affect and mouth state as three independent axes |
| `pose-vocabularies/interop-crosswalk.json` | **v2** Namespace registry and record schema for the crosswalk |
| `pose-vocabularies/crosswalk-rows.json` | **v2** The populated crosswalk: 194 mappings across three namespaces, with the loss written down |
| `pose-vocabularies/action-beat-join.json` | **v2** Which action beats each position physically admits, and which is characteristic |
| `pose-vocabularies/context-tag-bindings.json` | **v2** Folksonomy tags for the context axes: 79 of 88 values bind, 9 honestly have none |
| `pose-vocabularies/render-bindings.json` | **v2** Model-family prompt-language schema, control-map contract, and the multi-figure conditioning contract |
| `pose-vocabularies/render-bindings-solo.json` | **v2** Prompt bindings for the 11 solo positions across three families. The other 93 are deliberately unbound |
| `pose-vocabularies/positions-index.json` | **v2** Compact name and structure index, generated from the seed, for consumers that do not need the full record |

## Why this exists

Named-position knowledge and pose *geometry* have never lived in the same place:

- **Human-pose datasets** (COCO Keypoints, MPII, PoseTrack) give joint coordinates but **no named positions**, and none cover intimate poses.
- **Named-position references** (Wikipedia's "List of sex positions", Wikidata's *sex position* Q8394) give names and prose but **no geometry** and only coarse structure.
- **Adult ML datasets** (NPDI, LSPD) are **binary or anatomy-level**, with no position labels.

This catalog is the bridge: a clean **named-position → structured-attributes → COCO-17 keypoint template** mapping, decoupled from any single tag folksonomy, plus a documented cross-cultural provenance layer tying modern positions back to the historical sources (Kama Sutra, Su Nü Jing, Perfumed Garden, shunga, Moche ceramics, …) that first recorded them.

### And, as of v2, the join table

There is no shared identifier for a named sexual position. The image-board folksonomy that open adult checkpoints learned from organises by act and by body part, so its coverage of named positions is uneven and full of sense collisions (`lotus_position` is cross-legged meditation; `piledriver_(wrestling)` sits beside `piledriver_(sex)`). Structured knowledge bases cover only a minority. Commercial generators each ship a private dropdown with no exported identifiers.

The `crosswalk` config is the mapping, and it is deliberately honest about its own limits:

- **85 of 104** folksonomy mappings are `broader` than the position they map. Each carries a concrete statement of the feature it discards and a count of sibling positions sharing the same tag.
- **61 of 104** positions have no exact or close identifier in any machine-readable external vocabulary. For those, this catalog is the only precise record.
- Every tag was checked against the live tag API for existence, category and deprecation. Deprecated tags are excluded even when they carry six-figure post counts.
- Wiki sense-checks are documented for **46 of 104** rows, not all of them, so this is not verified end to end and does not claim to be.

## Limitations

- **Keypoints are schematic templates**, not observations; multi-participant registration is approximate.
- **`composition_code`** (MMF/FFM/…) describes *apparent on-camera presentation* only and implies nothing about identity or orientation.
- Prevalence and difficulty ratings are qualitative editorial estimates.
- Provenance mappings are conservative (attested only); absence of a mapping is not evidence a position is unattested in a tradition.

See the dataset card and the methodology paper for the full discussion.
