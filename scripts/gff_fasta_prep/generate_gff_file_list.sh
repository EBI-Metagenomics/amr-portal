#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/discovery.sh
source "${SCRIPT_DIR}/lib/discovery.sh"

GENOMES_DIR=""
OUTPUT_FILE="gff_files.lst"

usage() {
    cat <<EOF
Usage:
  $(basename "$0") --genomes-dir <path> [--output <file>]
  $(basename "$0") <genomes_dir> [output_file]

Recursively find *_annotations.gff.gz under <genomes_dir> and write a sorted
list (one path per line) for SLURM array submission.

Options:
  -d, --genomes-dir <path>   Root directory to search (required)
  -o, --output <file>        Output list file (default: gff_files.lst)

Examples:
  $(basename "$0") --genomes-dir /data/amr_portal/genomes
  $(basename "$0") --genomes-dir /data/amr_portal/genomes -o gff_files.lst
  $(basename "$0") /data/amr_portal/genomes gff_files.lst
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--genomes-dir)
            shift
            GENOMES_DIR="${1:?Missing path after $1}"
            shift
            ;;
        -o|--output)
            shift
            OUTPUT_FILE="${1:?Missing path after $1}"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [[ -z "$GENOMES_DIR" ]]; then
                GENOMES_DIR="$1"
            elif [[ "$OUTPUT_FILE" == "gff_files.lst" ]]; then
                OUTPUT_FILE="$1"
            else
                echo "Unexpected argument: $1" >&2
                usage >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$GENOMES_DIR" ]]; then
    echo "Missing genomes directory." >&2
    usage >&2
    exit 1
fi

if [[ ! -d "$GENOMES_DIR" ]]; then
    echo "Not a directory: $GENOMES_DIR" >&2
    exit 1
fi

count="$(gff_fasta_prep_write_annotation_gff_list "$GENOMES_DIR" "$OUTPUT_FILE")"
echo "Wrote $count paths to $OUTPUT_FILE"
