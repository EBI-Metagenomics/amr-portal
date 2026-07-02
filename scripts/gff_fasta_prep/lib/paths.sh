#!/usr/bin/env bash

gff_fasta_prep_assembly_from_gff() {
  local gff_base="$1"
  echo "${gff_base%_annotations}"
}

gff_fasta_prep_is_already_processed() {
  local final_gff="$1"
  local fasta="$2"
  [[ -f "${final_gff}.csi" && -f "${fasta}.gz.fai" ]]
}
