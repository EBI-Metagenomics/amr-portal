#!/usr/bin/env bash

GFF_FASTA_PREP_BASE_DIR=""
GFF_FASTA_PREP_RUN_BACKGROUND=0
GFF_FASTA_PREP_LOG_FILE=""

gff_fasta_prep_usage() {
    local script_name="$1"
    cat <<EOF
Usage: ${script_name} <genomes_base_dir> [--background [log_file]]

Prepare annotation GFF/FASTA indexes for the gene viewer.

  --background  Run detached with nohup (survives SSH disconnect).
                Log defaults to <genomes_base_dir>/prepare_gff_fasta_indexes.log

Examples:
  ${script_name} /data/genomes
  ${script_name} /data/genomes --background
  ${script_name} /data/genomes --background /data/genomes/prep.log
EOF
}

gff_fasta_prep_parse_args() {
    local script_name="$1"
    shift

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --background)
                GFF_FASTA_PREP_RUN_BACKGROUND=1
                shift
                if [[ $# -gt 0 && "$1" != --* ]]; then
                    GFF_FASTA_PREP_LOG_FILE="$1"
                    shift
                fi
                ;;
            -h|--help)
                gff_fasta_prep_usage "$script_name"
                exit 0
                ;;
            *)
                if [[ -z "$GFF_FASTA_PREP_BASE_DIR" ]]; then
                    GFF_FASTA_PREP_BASE_DIR="$1"
                else
                    echo "Unexpected argument: $1" >&2
                    gff_fasta_prep_usage "$script_name" >&2
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$GFF_FASTA_PREP_BASE_DIR" ]]; then
        gff_fasta_prep_usage "$script_name" >&2
        exit 1
    fi

    if [[ ! -d "$GFF_FASTA_PREP_BASE_DIR" ]]; then
        echo "Not a directory: $GFF_FASTA_PREP_BASE_DIR" >&2
        exit 1
    fi
}
