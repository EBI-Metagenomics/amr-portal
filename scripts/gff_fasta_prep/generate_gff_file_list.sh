#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/discovery.sh
source "${SCRIPT_DIR}/lib/discovery.sh"

usage() {
    cat <<EOF
Usage: $(basename "$0") <genomes_base_dir> [output_file]

Write a sorted list of *_annotations.gff.gz paths (one per line).
Default output file: gff_files.lst in the current directory.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

BASE_DIR="${1:?$(usage >&2; exit 1)}"
OUTPUT_FILE="${2:-gff_files.lst}"

if [[ ! -d "$BASE_DIR" ]]; then
    echo "Not a directory: $BASE_DIR" >&2
    exit 1
fi

count="$(gff_fasta_prep_write_annotation_gff_list "$BASE_DIR" "$OUTPUT_FILE")"
echo "Wrote $count paths to $OUTPUT_FILE"
