#!/usr/bin/env bash

# List annotation GFFs (e.g. ERZ25201620_annotations.gff.gz). Sibling AMRFinder
# TSVs such as ERZ25201620_amrfinderplus.tsv.gz are not matched.
gff_fasta_prep_find_annotation_gffs() {
  local base_dir="$1"
  find "$base_dir" -type f -name "*_annotations.gff.gz"
}
