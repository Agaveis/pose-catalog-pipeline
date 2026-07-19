# A Structured Catalog of Named Erotic Positions with COCO-17 Keypoint Templates and Cross-Cultural Provenance: Construction, Schema, and Release

**Ethnic Erotic**
https://ethnicerotic.com
admin@ethnicerotic.com

**DOI:** [10.5281/zenodo.21439174](https://doi.org/10.5281/zenodo.21439174)
**Dataset:** https://huggingface.co/datasets/EthnicErotic/pose-catalog
**Code:** https://github.com/Agaveis/pose-catalog-pipeline
**License:** CC BY 4.0 (data) · Apache 2.0 (code)
**Version:** 1.0 (2026-07-19)

---

## Abstract

We release the **Erotic Pose Catalog**, a public, machine-readable dataset of **104 named erotic positions** (solo and multi-person) that unifies three layers of information that have historically lived apart: a **structured attribute vocabulary** (position family, arrangement, penetration type, facing, dynamics, support surface, apparent participant composition, and on-camera presentation), an **idealised COCO-17 keypoint template per participant**, and a **cross-cultural provenance layer** that maps modern positions back to the historical sources and erotic-art traditions that first recorded them. The dataset contains **no images and no personal data** — only text metadata and schematic keypoint coordinates — and is released under CC BY 4.0. Positions are anchored to Wikidata items (CC0) for stable identifiers, but all descriptions and mappings are original editorial. Keypoints are composed deterministically from 17 canonical base-posture skeletons via a documented placement grammar; they are schematic templates intended as pose-conditioning priors, not observations. The provenance layer records 59 attested (position × source) links across 22 historical sources, and a companion index catalogs 87 museum-attested erotic artworks with per-work verification-confidence grades. We document the construction pipeline, schema, coverage statistics, and limitations, and release the full pipeline as open code. Intended uses include content tagging and search for adult media, taxonomy and cross-vocabulary synonym research, culturally-grounded curation, and pose conditioning for controllable image generation. The dataset documents adults only and must not be used to identify individuals or for any non-consensual application.

---

## 1. Introduction

Two mature bodies of structured data describe human bodies in space, and neither covers intimate positions. **Human-pose datasets** — COCO Keypoints (Lin et al., 2014), MPII Human Pose (Andriluka et al., 2014), PoseTrack — provide precise joint coordinates but carry no named-position semantics and, by construction and content policy, exclude sexual poses. **Named-position references** — Wikipedia's "List of sex positions", Wikidata's *sex position* class (Q8394) — provide names and prose but no geometry and only the coarsest structure. A third body of work, **adult-content machine learning** (e.g., NPDI, LSPD), operates at the binary "explicit / not" or anatomy-detection level and carries no position vocabulary at all. A researcher, a content-tagging system, or a controllable-generation pipeline that wants to reason about *which named position this is* and *what its participants' bodies are doing* has nowhere to look.

We address this with a small, deliberately hand-curated dataset that puts all three layers behind one schema:

1. **A controlled-vocabulary attribute layer** across four facets (structure, participant composition, presentation, and a keypoint schema), authored against explicit dimension definitions rather than an emergent tag folksonomy.
2. **A geometry layer**: for each participant in each position, an idealised COCO-17 keypoint template, composed deterministically from a shared set of base-posture skeletons and a documented placement transform.
3. **A provenance layer**: where a modern position is attested in a historical sex manual or a documented erotic-art tradition, we record the historical name, source, culture, era, and region — tying, for example, "missionary" to the Kama Sutra's *Samputa* and the Su Nü Jing's "Dragon Turns."

Unlike vision-LLM or crowd-annotated datasets, this catalog has **no inference cost and no annotation labor to reproduce**: the source of truth is version-controlled JSON, and the entire dataset is produced by a deterministic transform that runs in seconds with no database and no API keys.

### Contributions

1. A publicly-released, machine-readable catalog of 104 named erotic positions unifying structured attributes, COCO-17 keypoint geometry, and cross-cultural provenance under one schema.
2. A documented, deterministic keypoint-composition grammar (base posture + rigid placement transform + scene-space overrides) that produces valid COCO-17 templates for arbitrary multi-participant arrangements.
3. A conservative, adversarially-verified provenance and historical-artwork layer that connects the modern vocabulary to its documented antecedents across seven sex manuals and fifteen erotic-art traditions, released as open data and open code.

---

## 2. Related Work

**Human-pose keypoint formats.** The COCO 17-keypoint layout (Lin et al., 2014) is the de-facto interchange format for 2D human pose, used by MPII (Andriluka et al., 2014) and by real-time estimators such as OpenPose (Cao et al., 2019). We adopt COCO-17 verbatim — nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles — so that the catalog's keypoint templates are directly consumable by any tool built for that format. Our contribution is not a new estimator or a new annotation of images; it is a set of *named, semantically-labelled* schematic skeletons in that format.

**Controllable generation from pose.** Pose-conditioned image generation — ControlNet (Zhang et al., 2023) and related OpenPose-conditioned pipelines — takes a keypoint skeleton as a structural constraint. Such systems need a source of plausible skeletons for the pose they intend to render; for intimate multi-person poses, no such source exists. The catalog's per-participant COCO-17 templates are designed to serve exactly this role as priors.

**Structured knowledge anchors.** We anchor position names to Wikidata (Vrandečić & Krötzsch, 2014) items under the *sex position* class (Q8394). Wikidata structured data is CC0, so QIDs, labels, and multilingual aliases are reusable without attribution constraint. We use these as stable identifiers and synonym seeds only; no prose is copied.

**Historical and art-historical scholarship.** The provenance layer draws on the established literature of historical erotic manuals and art: the Kama Sutra (Vātsyāyana; Doniger & Kakar trans., 2002), the Chinese "bedchamber" manuals surveyed by van Gulik (1961), al-Nafzawi's Perfumed Garden, Japanese shunga (Screech, 1999), and pre-Columbian Moche erotic ceramics (Weismantel, 2004), among others. We use this literature to attest position→source mappings; we do not reproduce copyrighted translations or images.

**Distribution.** The release uses HuggingFace Datasets (Lhoest et al., 2021), which provides a standardized loading interface and is indexed by dataset search engines.

---

## 3. Dataset Construction

The pipeline runs end-to-end from hand-authored JSON vocabularies to six output configurations (CSV + JSONL). Each stage is deterministic, source-attributed, and re-runnable, and none requires a database or an API key.

### 3.1 Controlled vocabularies

Four facet files define the attribute space:

- **Structure** (`pose-structure.json`) — position family, arrangement, penetration type, facing, dynamics, support surface.
- **Participant composition** (`participant-composition.json`) — participant count and apparent on-camera composition code.
- **Presentation** (`presentation.json`) — camera framing, prevalence, difficulty, intensity tier.
- **Keypoint schema** (`keypoint-schema.json`) — the transform grammar used to compose keypoints (§3.3).

Together these define **17 dimensions with 111 defined values**. Every attribute value in a position entry references one of these defined values, so the vocabulary is closed and auditable rather than emergent.

### 3.2 Position authoring

Positions are authored in `poses.seed.json`, one entry per named position. Each entry carries a slug, display name, aliases, an optional Wikidata QID, its facet attribute values, an optional list of historical-source mappings, an original prose description, and one or more participant records. Names are anchored where possible to Wikidata's Q8394 class via `fetch-wikidata-positions.mjs`, which queries the SPARQL endpoint for items that are an instance, subclass, or part of *sex position* and writes their QIDs, labels, and English aliases as a CC0 reference list. The QID and aliases are reused; descriptions are written originally.

### 3.3 Keypoint composition

Each participant references a **base posture** (one of 17 canonical COCO-17 skeletons in `keypoint-base-skeletons.json`, drawn in profile view) and a **placement transform**. `build-keypoints.mjs` composes the two into scene-space COCO-17 keypoints — a flat array of 51 numbers (`[x, y, v]` per joint, coordinates normalized to `[0, 1]` with origin at top-left, `v ∈ {0, 1, 2}` for unlabelled/occluded/visible). The transform is applied in a fixed order:

> `flip_x` → `scale` (about centroid) → `rotate_deg` (about centroid) → `translate`

`flip_x` mirrors the x-axis and swaps the left/right joint labels so anatomy stays correct after mirroring. Where the rigid transform cannot express a position's articulation — wrapped legs, bracing arms, an arched back — a participant may carry **scene-space per-joint overrides** that replace the composed coordinate outright. Running `build-keypoints.mjs` directly verifies that every position composes to a valid 51-value COCO-17 array for every participant; `render-pose-contact-sheet.mjs` renders all composed skeletons to an HTML contact sheet for visual verification before release.

### 3.4 Provenance layer

Where a modern position is attested in a historical source, `poses.seed.json` records a `{source, name, note}` mapping whose `source` id resolves against `historical-sources.json`, a registry of **22 sources**: seven sex manuals (Kama Sutra, Ananga Ranga, Su Nü Jing, Dongxuanzi, Shijūhatte, Perfumed Garden, Ars Amatoria) and fifteen erotic-art traditions (from Old Babylonian plaques and Attic symposium pottery through Moche ceramics, Khajuraho and Konark sculpture, Persian and Mughal miniatures, Chinese spring-palace albums, and shunga). Each source carries culture, era, language, and a region tag. The registry documents two traditions (Oceanic carving, African figure sculpture) as **honest negatives**: no confirmed two-person position depiction exists in those corpora, and they are recorded as such rather than omitted.

### 3.5 Historical-works index

`historical-works.json` is a text-only index of **87 museum-attested erotic artworks** across 13 traditions. Each work carries a title, date, holding institution (with accession numbers where public), medium, a position-relevant description, a significance reading, and a **verification-confidence grade**: `high` (independently confirmed against a primary source; 49 works), `medium` (core facts confirmed; 32), or `low` (key facts unconfirmed; 6). Corrections found during fact-checking — misattributions, misdatings, positions misdescribed in secondary literature — are preserved in a `note` field rather than smoothed over. A work is linked to a catalog position (`depicts`) **only** where the work's own catalog description names the arrangement; every such link was adversarially re-verified.

### 3.6 Export

`build-pose-dataset.mjs` reads the vocabularies and writes six configurations (CSV + matching JSONL) plus a `manifest.json` recording schema version, generation timestamp, and per-config row counts. No database connection is used; the same JSON files that seed the live catalog's serving database seed this export, so the two cannot diverge.

---

## 4. Schema

The release contains six configurations, each a separate `config_name` under HuggingFace's `datasets` API:

| Config | Rows | Description |
|---|---|---|
| `poses` | 104 | One row per named position |
| `keypoints` | 219 | One row per (position × participant) |
| `pose_dimensions` | 17 | Flat controlled vocabulary (111 values) |
| `base_skeletons` | 17 | Canonical base-posture COCO-17 skeletons |
| `provenance` | 59 | One row per (position × historical source) |
| `works` | 87 | One row per attested historical artwork |

**`poses` columns:** `id, slug, name, aliases, wikidata_qid, kama_sutra_name, position_family, primary_act, arrangement, penetration_type, facing, dynamics, support_surface, participant_count, composition_code, n_participants, source_medium, camera_framing, difficulty, prevalence, intensity_tier, historical_sources, description, wiki_url, canonical_url`.

**`keypoints` columns:** `pose_id, pose_slug, pose_name, participant_index, role, base_posture, placement, keypoints_coco`. The `keypoints_coco` field is the flat 51-value COCO-17 array; the JSONL variant additionally provides a named `joints` object. `placement` is the transform (`translate`, `scale`, `rotate_deg`, `flip_x`) applied to the base posture.

**`provenance` columns:** `pose_id, pose_slug, pose_name, source_id, source_title, source_author, source_culture, source_era, source_language, source_region, historical_name, note, pose_canonical_url`.

**`works` columns:** `work_id, tradition_id, tradition_title, source_id, region, iso_countries, name, confidence, date, holding, medium, description, significance, note, source_ref, depicts`.

Full column definitions are in the dataset card.

---

## 5. Coverage and Statistics

| Metric | Value |
|---|---|
| Named positions | 104 |
| Participant keypoint templates | 219 |
| Controlled-vocabulary dimensions | 17 (111 defined values) |
| Base-posture skeletons | 17 |
| Historical sources (manuals + art traditions) | 22 (7 + 15) |
| Provenance links (position × source) | 59, across 26 positions and 6 world regions |
| Museum-attested artworks indexed | 87 across 13 traditions |
| Artwork verification grades (high / medium / low) | 49 / 32 / 6 |
| Verified work → position links | 14 |

The 104 positions span the solo-display, missionary, rear-entry, on-top, side-lying, seated, standing/carry, oral, manual/non-penetrative, and multi-partner families. Coverage is deliberately weighted toward positions that are both commonly named in adult media and structurally distinct; near-duplicate variants that differ only in a minor limb placement are folded into a parent entry's description rather than given separate rows.

---

## 6. Limitations and Biases

### 6.1 Keypoints are schematic, not observed

Every keypoint is an idealised template composed from a base posture and a rigid transform, not a motion-capture or image-derived annotation. Multi-participant registration — how two skeletons align in contact — is approximate. The templates are appropriate as pose-conditioning priors and structural references; they are **not** ground-truth pose annotations and should not be used to evaluate a pose estimator's accuracy.

### 6.2 Composition codes describe presentation, not identity

`composition_code` (e.g., MF, MMF, FFM) describes the *apparent on-camera presentation* of a position as it is conventionally staged and shot. It implies nothing about the identity, gender, or orientation of any real person, and must not be read as such.

### 6.3 Qualitative editorial estimates

`prevalence`, `difficulty`, and `intensity_tier` are qualitative editorial estimates, not measurements. They reflect the catalog authors' reading of how commonly a position appears and how physically demanding it is, and different curators would draw some lines differently.

### 6.4 Provenance is conservative and record-biased

Provenance mappings are recorded only where a source attests them; **absence of a mapping is not evidence that a position is unattested** in a tradition. The historical record is itself biased: it over-represents traditions with surviving manuals and durable art media (stone, ceramic, woodblock) and under-represents oral cultures and perishable media. The two honest-negative traditions (§3.4) make this explicit. The art-historical record also skews toward the collections of major museums, which is itself a colonial-era acquisition artifact.

### 6.5 English and industry vernacular

Names and aliases lean on English-language and adult-industry/booru vernacular. Positions well-documented in non-English traditions may carry names that do not translate cleanly; the historical-source `historical_name` field partially mitigates this but does not fully capture multilingual naming.

---

## 7. Intended Uses

We describe the use cases the dataset is designed to support, and those it explicitly is not.

### 7.1 Content tagging and search

The structured attributes and controlled vocabulary support consistent, machine-readable tagging and faceted search of adult media by named position and its structural properties, decoupled from any single site's folksonomy.

### 7.2 Taxonomy and cross-vocabulary research

The Wikidata anchors, aliases, and closed controlled vocabulary support synonym mapping across position references and cross-vocabulary reconciliation, and the provenance layer supports cross-cultural study of erotic vocabulary and its historical continuity.

### 7.3 Pose conditioning for controllable generation

The per-participant COCO-17 templates provide plausible skeleton priors for pose-conditioned image generation (§2) of named positions, for which no other structured source exists.

### 7.4 Culturally-grounded curation and education

The provenance and works layers support culturally-grounded curation and educational and art-historical reference, tying modern positions to their documented antecedents.

### 7.5 NOT for identification or non-consensual use

The dataset carries no personal data and documents adults only. It must **not** be used to identify or profile individuals, and it must **not** be used in any application involving minors or any non-consensual context. These are use restrictions, stated in the dataset card's out-of-scope section.

---

## 8. Ethical Considerations

**No images, no personal data.** The dataset is entirely text metadata and schematic coordinates. It contains no image bytes and no personal data, and it does not increase any individual's discoverability.

**Historical facts, original prose.** The provenance and works layers record titles, dates, holdings, and accession numbers — facts of the public record — with original editorial descriptions. No copyrighted translations or images are reproduced. The conservative `depicts`-linking rule and the preservation of fact-checking corrections are deliberate hedges against the confident-but-wrong claims common in secondary erotic-art literature.

**Adults only.** Every entry documents adults. The dataset is tagged `not-for-all-audiences` and gated behind a content-warning interstitial on the host platform.

**Adult-content brand.** The publishing organization operates an adult-creator platform alongside the catalog. The dataset itself is text-only and released under CC BY 4.0 specifically to permit reuse and re-hosting under different attribution should adopters prefer.

---

## 9. Reproducibility

All construction code is open-sourced under Apache 2.0 at https://github.com/Agaveis/pose-catalog-pipeline. The repository contains the vocabularies, the composition and export scripts, and the verification tooling.

| Stage | Script |
|---|---|
| Wikidata CC0 name/QID anchor fetch | `scripts/fetch-wikidata-positions.mjs` |
| Keypoint composition + verification | `scripts/build-keypoints.mjs` |
| Serving-row mapping (shared) | `scripts/pose-row.mjs` |
| Dataset export (six configs) | `scripts/build-pose-dataset.mjs` |
| Visual verification (contact sheet) | `scripts/render-pose-contact-sheet.mjs` |

The export is deterministic: identical `pose-vocabularies/` inputs produce byte-identical outputs modulo the manifest timestamp. There is no model, no temperature, and no network dependency in the export step. Replication requires only Node.js 18+; the final upload step additionally requires the HuggingFace CLI authenticated to a writable dataset repository.

---

## 10. Future Work

**Scale.** The 104-position v1 is a curated core, not an exhaustive enumeration. The vocabulary and composition grammar support arbitrary extension; adding a position is an edit to `poses.seed.json` and a regeneration.

**Keypoint fidelity.** The schematic templates could be refined toward observation by aligning them to consenting-adult reference imagery or motion capture, which would upgrade them from priors to annotations for pose-estimation use.

**Provenance breadth.** Additional attested traditions and works can be added as the art-historical reading deepens, subject to the same conservative `depicts`-linking rule and verification-confidence grading.

**Second-source diversification.** As with the sibling PhenotypeCatalog release, the catalog's attribute structure is source-agnostic; future work may attach observed (rather than schematic) pose data from a permissively-licensed source, carried under an explicit provenance column.

---

## References

Andriluka, M., Pishchulin, L., Gehler, P., & Schiele, B. (2014). 2D Human Pose Estimation: New Benchmark and State of the Art Analysis. *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, 3686–3693. (MPII Human Pose.)

Cao, Z., Hidalgo, G., Simon, T., Wei, S.-E., & Sheikh, Y. (2019). OpenPose: Realtime Multi-Person 2D Pose Estimation Using Part Affinity Fields. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 43(1), 172–186.

Doniger, W., & Kakar, S. (trans.) (2002). *Vātsyāyana Mallanaga: Kamasutra*. Oxford University Press.

van Gulik, R. H. (1961). *Sexual Life in Ancient China: A Preliminary Survey of Chinese Sex and Society from ca. 1500 B.C. till 1644 A.D.* E. J. Brill.

Lhoest, Q., Villanova del Moral, A., Jernite, Y., et al. (2021). Datasets: A Community Library for Natural Language Processing. *Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing: System Demonstrations*, 175–184.

Lin, T.-Y., Maire, M., Belongie, S., et al. (2014). Microsoft COCO: Common Objects in Context. *Proceedings of the European Conference on Computer Vision (ECCV)*, 740–755.

Screech, T. (1999). *Sex and the Floating World: Erotic Images in Japan, 1700–1820*. Reaktion Books.

Vrandečić, D., & Krötzsch, M. (2014). Wikidata: A Free Collaborative Knowledgebase. *Communications of the ACM*, 57(10), 78–85.

Weismantel, M. (2004). Moche Sex Pots: Reproduction and Temporality in Ancient South America. *American Anthropologist*, 106(3), 495–505.

Zhang, L., Rao, A., & Agrawala, M. (2023). Adding Conditional Control to Text-to-Image Diffusion Models. *Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)*, 3836–3847. (ControlNet.)

---
