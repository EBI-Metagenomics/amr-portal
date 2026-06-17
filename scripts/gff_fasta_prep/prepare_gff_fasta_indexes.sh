#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${1:?Usage: $0 <genomes_base_dir>}"

find "$BASE_DIR" -type f -name "*.gff.gz" | while read -r file; do
    echo "Processing $file"

    dir="$(dirname "$file")"

    filename="$(basename "$file")"

    # Keep original GFF name
    gff_base="${filename%.gff.gz}"

    # Extract assembly accession for FASTA
    assembly="$(echo "$filename" | sed -E 's/^((GCA|GCF)_[0-9]+\.[0-9]+).*/\1/')"

    temp_gff="${dir}/${gff_base}.tmp.gff"

    final_gff="${dir}/${gff_base}.gff.gz"
    fasta="${dir}/${assembly}.fasta"

    # Skip if already created
    if [[ -f "${final_gff}.csi" && -f "${fasta}.gz.fai" ]]; then
        echo "Skipping $base; indexed files already exist"
        continue
    fi

    # Split GFF annotations and appended FASTA
    gunzip -c "$file" | awk -v gff="$temp_gff" -v fasta="$fasta" '
    /^##FASTA$/ {f=1; next}
    !f {print > gff}
    f  {print > fasta}
    '

    # Sort GFF and compress as BGZF using final name
    {
        grep '^#' "$temp_gff" || true
        grep -v '^#' "$temp_gff" | sort -k1,1 -k4,4n
    } | bgzip -c > "$final_gff"

    # Create CSI index
    tabix -p gff -C "$final_gff"

    # Compress FASTA and index
    bgzip -c "$fasta" > "${fasta}.gz"
    samtools faidx "${fasta}.gz"

    # Cleanup
    rm -f "$temp_gff" "$fasta"

    echo "Created:"
    echo "  $final_gff"
    echo "  ${final_gff}.csi"
    echo "  ${fasta}.gz"
    echo "  ${fasta}.gz.fai"
    echo
done