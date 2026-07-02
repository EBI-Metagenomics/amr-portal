#!/usr/bin/env bash

gff_fasta_prep_split_gff_and_fasta() {
  local source_gff="$1"
  local temp_gff="$2"
  local fasta="$3"

  gunzip -c "$source_gff" | awk -v gff="$temp_gff" -v fasta="$fasta" '
    /^##FASTA$/ {f=1; next}
    !f {print > gff}
    f  {print > fasta}
  '
}

gff_fasta_prep_sort_and_bgzf_gff() {
  local temp_gff="$1"
  local final_gff="$2"

  {
    grep '^#' "$temp_gff" || true
    grep -v '^#' "$temp_gff" | sort -k1,1 -k4,4n
  } | bgzip -c >"$final_gff"
}

gff_fasta_prep_index_gff() {
  local final_gff="$1"
  tabix -p gff -C "$final_gff"
}

gff_fasta_prep_compress_and_index_fasta() {
  local fasta="$1"
  bgzip -c "$fasta" >"${fasta}.gz"
  samtools faidx "${fasta}.gz"
}

gff_fasta_prep_process_annotation_gff() {
  local file="$1"

  local dir filename gff_base assembly temp_gff final_gff fasta
  dir="$(dirname "$file")"
  filename="$(basename "$file")"
  gff_base="${filename%.gff.gz}"
  assembly="$(gff_fasta_prep_assembly_from_gff "$gff_base")"
  temp_gff="${dir}/${gff_base}.tmp.gff"
  final_gff="${dir}/${gff_base}.gff.gz"
  fasta="${dir}/${assembly}.fasta"

  log "Processing $file"

  if gff_fasta_prep_is_already_processed "$final_gff" "$fasta"; then
    log "Skipping ${gff_base}; indexed files already exist"
    return 0
  fi

  gff_fasta_prep_split_gff_and_fasta "$file" "$temp_gff" "$fasta"
  gff_fasta_prep_sort_and_bgzf_gff "$temp_gff" "$final_gff"
  gff_fasta_prep_index_gff "$final_gff"
  gff_fasta_prep_compress_and_index_fasta "$fasta"
  rm -f "$temp_gff" "$fasta"

  log "Created:"
  log "  $final_gff"
  log "  ${final_gff}.csi"
  log "  ${fasta}.gz"
  log "  ${fasta}.gz.fai"
}
