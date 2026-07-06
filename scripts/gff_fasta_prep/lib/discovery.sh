#!/usr/bin/env bash

ANNOTATION_GFF_GLOB='*_annotations.gff.gz'

# List annotation GFFs (e.g. ERZ25201620_annotations.gff.gz). Sibling AMRFinder
# TSVs such as ERZ25201620_amrfinderplus.tsv.gz are not matched.
gff_fasta_prep_find_annotation_gffs() {
  local base_dir="$1"
  find "$base_dir" -type f -name "$ANNOTATION_GFF_GLOB"
}

gff_fasta_prep_validate_annotation_gff_path() {
  local file="$1"
  local filename
  filename="$(basename "$file")"

  if [[ "$filename" != *"_annotations.gff.gz" ]]; then
    echo "Expected filename matching *${ANNOTATION_GFF_GLOB}: $file" >&2
    exit 1
  fi
}

gff_fasta_prep_write_annotation_gff_list() {
  local base_dir="$1"
  local output_file="$2"
  gff_fasta_prep_find_annotation_gffs "$base_dir" | LC_ALL=C sort >"$output_file"
  wc -l <"$output_file"
}
