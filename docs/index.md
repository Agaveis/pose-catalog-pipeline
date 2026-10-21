# pose-catalog-pipeline

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21439174.svg)](https://doi.org/10.5281/zenodo.21439174)


Reproducibility code for the **Erotic Pose Catalog**: a public, machine-readable dataset of **219 named erotic positions** (solo and multi-person) with structured attributes, historical/cultural provenance, an index of museum-attested erotic artworks, and an **idealised COCO-17 keypoint template per participant**.

**v2 adds the layers that make it executable rather than only descriptive:** a motion layer (action beats, tempo, camera moves), three context axes (wardrobe, scene, expression), and an **interoperability crosswalk** mapping every position into the folksonomy that open adult checkpoints were trained on, into structured knowledge bases, and onto attested historical names.

- **Dataset (CC BY 4.0):** <https://huggingface.co/datasets/EthnicErotic/pose-catalog>
- **Methodology paper:** the [methodology page](methodology.md) documents the **v1** position and keypoint methodology. The v2 layers (action, context, crosswalk, bindings) are specified in the vocabulary files themselves and summarized in the dataset card; they are not yet written up in the paper.
- **Archived release (DOI):** <https://doi.org/10.5281/zenodo.21439174> (concept DOI, always resolves to the latest version) · v2.0.0: <https://doi.org/10.5281/zenodo.21868961>
- **Live source catalog:** <https://ethnicerotic.com/poses>
- **How the catalog was built:** <https://ethnicerotic.com/poses/methodology>
- **Historical timeline:** <https://ethnicerotic.com/poses/history>

> **Adults only (18+).** This repository and the dataset it builds document adult sexual positions for research, content-tagging, and creative-tooling use. They contain **no images and no personal data**: only text metadata and schematic keypoint coordinates. The dataset is tagged `not-for-all-audiences`.

The pipeline runs end-to-end from a set of hand-authored JSON vocabularies to a HuggingFace-ready dataset (CSV + JSONL across ten configurations). It needs **no database and no API keys**: the source of truth is version-controlled JSON, and every stage is deterministic and re-runnable.
