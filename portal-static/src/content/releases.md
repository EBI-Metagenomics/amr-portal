---
title: Release notes
header_title: Release notes
layout: "layouts/documentation.njk"
tags: usage

---

# Release notes

## 2026-07

- A subset of 347,082 genomes has been re-annotated using the `Full` mode of mettannotator, which includes InterProScan, UniFIRE and SanntiS annotations.
- Columns in the `AMR genotypes` and `Combined phenotypes and genotypes` tables across the portal, Parquet files, and DuckDB have been updated as follows:
  - New columns, `Annotation tool version` and `Annotation tool mode`, have been added to indicate the mettannotator version and mode (`Fast` or `Full`) used for each genome.
  - The `Evidence type` column has been removed.
  - `Evidence accession` has been renamed to `HMM evidence accession`.
  - `Evidence description` has been renamed to `HMM evidence description`.
  - New columns added: `Amrfinderplus method`, `Reference accession`, `Reference name`, `Reference sequence coverage`, `Reference sequence identity`.
- Antibiotic names are now assigned more consistently to genotypes produced by AMRFinderPlus, where available. This results in an additional 113,082 genotypes with an assigned antibiotic name.
- A search functionality has been added to the portal.
- Annotations can now be viewed in a genome browser via the `View in Browser` button.
- Documentation has been updated to reflect the schema changes above and the new portal features.
- A table detailing mandatory fields for AMR data submission has been added to the AMR submission guide.

## 2025-12

- 32,000 new genomes introduced to genotypes
- Links available on "AMR genotypes" and "Combined phenotypes and genotypes" to annotation records

## 2025-11

- First release of data and site
