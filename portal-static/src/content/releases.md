---
title: Release notes
header_title: Release notes
layout: "layouts/documentation.njk"
tags: usage

---

# Release notes

## 2026-07

- A subset of 347,082 genomes has been re-annotated using the **Full** mode of mettannotator, which includes InterProScan, UniFIRE and SanntiS annotations.
- Columns in the **AMR genotypes** and **Combined phenotypes and genotypes** tables across the portal, Parquet files, and DuckDB have been updated:

| Change | Previous name | New name |
| --- | --- | --- |
| Added | — | Annotation tool version |
| Added | — | Annotation tool mode |
| Removed | Evidence type | — |
| Renamed | Evidence accession | HMM evidence accession |
| Renamed | Evidence description | HMM evidence description |
| Added | — | Amrfinderplus method |
| Added | — | Reference accession |
| Added | — | Reference name |
| Added | — | Reference sequence coverage |
| Added | — | Reference sequence identity |

**Annotation tool version** and **Annotation tool mode** indicate the mettannotator version and mode (**Fast** or **Full**) used for each genome.

- Antibiotic names are now assigned more consistently to genotypes produced by AMRFinderPlus, where available. This results in an additional 113,082 genotypes with an assigned antibiotic name.
- A search functionality has been added to the portal.
- Annotations can now be viewed in a genome browser via the **View in Browser** button.
- Documentation has been updated to reflect the schema changes above and the new portal features.
- A table detailing mandatory fields for AMR data submission has been added to the AMR submission guide.

## 2025-12

- 32,000 new genomes introduced to genotypes
- Links available on **AMR genotypes** and **Combined phenotypes and genotypes** to annotation records

## 2025-11

- First release of data and site
