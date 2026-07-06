#!/usr/bin/env bash

GFF_FASTA_PREP_BASE_DIR=""
GFF_FASTA_PREP_GFF_FILE=""
GFF_FASTA_PREP_RUN_BACKGROUND=0
GFF_FASTA_PREP_LOG_FILE=""

gff_fasta_prep_usage() {
    local script_name="$1"
    cat <<EOF
Usage:
  ${script_name} <genomes_base_dir> [--background [log_file]]
  ${script_name} --gff-file <path/to/ACCESSION_annotations.gff.gz>

Prepare annotation GFF/FASTA indexes for the gene viewer.

Modes:
  <genomes_base_dir>  Scan recursively for *_annotations.gff.gz and process each.
  --gff-file          Process a single annotation GFF (for SLURM array tasks).

Options:
  --background  Run detached with nohup (directory mode only; survives SSH disconnect).
                Log defaults to <genomes_base_dir>/prepare_gff_fasta_indexes.log

Examples:
  ${script_name} /data/genomes
  ${script_name} /data/genomes --background
  ${script_name} --gff-file /data/genomes/ERZ/252/016/ERZ25201620/ERZ25201620_annotations.gff.gz
EOF
}

gff_fasta_prep_parse_args() {
    local script_name="$1"
    shift

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --gff-file)
                shift
                if [[ $# -eq 0 ]]; then
                    echo "Missing path after --gff-file" >&2
                    gff_fasta_prep_usage "$script_name" >&2
                    exit 1
                fi
                GFF_FASTA_PREP_GFF_FILE="$1"
                shift
                ;;
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
                if [[ -n "$GFF_FASTA_PREP_GFF_FILE" ]]; then
                    echo "Unexpected argument with --gff-file: $1" >&2
                    gff_fasta_prep_usage "$script_name" >&2
                    exit 1
                fi
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

    if [[ -n "$GFF_FASTA_PREP_GFF_FILE" && -n "$GFF_FASTA_PREP_BASE_DIR" ]]; then
        echo "Use either --gff-file or <genomes_base_dir>, not both." >&2
        gff_fasta_prep_usage "$script_name" >&2
        exit 1
    fi

    if [[ -z "$GFF_FASTA_PREP_GFF_FILE" && -z "$GFF_FASTA_PREP_BASE_DIR" ]]; then
        gff_fasta_prep_usage "$script_name" >&2
        exit 1
    fi

    if [[ -n "$GFF_FASTA_PREP_GFF_FILE" ]]; then
        if [[ "$GFF_FASTA_PREP_RUN_BACKGROUND" -eq 1 ]]; then
            echo "--background is not supported with --gff-file (use sbatch for cluster runs)." >&2
            exit 1
        fi
        if [[ ! -f "$GFF_FASTA_PREP_GFF_FILE" ]]; then
            echo "Not a file: $GFF_FASTA_PREP_GFF_FILE" >&2
            exit 1
        fi
        gff_fasta_prep_validate_annotation_gff_path "$GFF_FASTA_PREP_GFF_FILE"
        return 0
    fi

    if [[ ! -d "$GFF_FASTA_PREP_BASE_DIR" ]]; then
        echo "Not a directory: $GFF_FASTA_PREP_BASE_DIR" >&2
        exit 1
    fi
}
