#!/bin/bash
#SBATCH --job-name=gff-fasta-prep
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --time=01:00:00
#SBATCH --output=logs/gff-prep-%A_%a.log
#
# Submit from scripts/gff_fasta_prep (required so SLURM_SUBMIT_DIR is correct):
#   cd scripts/gff_fasta_prep
#   ./generate_gff_file_list.sh --genomes-dir /path/to/genomes -o gff_files.lst
#   mkdir -p logs
#   JOB_ID=$(sbatch --parsable --array=1-100%20 submit_gff_prep_array.slurm)
#   ./summarize_pilot_metrics.sh logs/gff-prep-metrics.tsv "$JOB_ID"
#
# Override paths at submit time if needed:
#   sbatch --export=ALL,GFF_LIST=/path/gff_files.lst,CONDA_ENV=gff-tools \
#     --array=1-1000%50 submit_gff_prep_array.slurm

set -euo pipefail

# SLURM copies this script to /var/spool/slurmd/... — BASH_SOURCE points there.
# SLURM_SUBMIT_DIR is the directory you ran sbatch from.
SCRIPT_DIR="${SCRIPT_DIR:-${SLURM_SUBMIT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}}"
cd "$SCRIPT_DIR"

# --- configure (override with sbatch --export=ALL,VAR=value) ---
GFF_LIST="${GFF_LIST:-gff_files.lst}"
CONDA_ENV="${CONDA_ENV:-gff-tools}"
METRICS_FILE="${METRICS_FILE:-logs/gff-prep-metrics.tsv}"
FAILED_LIST="${FAILED_LIST:-logs/gff-prep-failed.lst}"
# --- end configure ---

gff_fasta_prep_resolve_path() {
  local path="$1"
  if [[ "$path" != /* ]]; then
    printf '%s/%s' "$SCRIPT_DIR" "$path"
  else
    printf '%s' "$path"
  fi
}

GFF_LIST="$(gff_fasta_prep_resolve_path "$GFF_LIST")"
METRICS_FILE="$(gff_fasta_prep_resolve_path "$METRICS_FILE")"
FAILED_LIST="$(gff_fasta_prep_resolve_path "$FAILED_LIST")"

mkdir -p "$(dirname "$METRICS_FILE")" "$(dirname "$FAILED_LIST")" logs

# shellcheck source=lib/metrics.sh
source "${SCRIPT_DIR}/lib/metrics.sh"

if [[ ! -f "$GFF_LIST" ]]; then
    echo "GFF list not found: $GFF_LIST" >&2
    echo "Run from ${SCRIPT_DIR}:" >&2
    echo "  ./generate_gff_file_list.sh --genomes-dir /path/to/genomes -o gff_files.lst" >&2
    exit 1
fi

if [[ -n "${SLURM_ARRAY_TASK_ID:-}" ]]; then
    GFF_FILE="$(sed -n "${SLURM_ARRAY_TASK_ID}p" "$GFF_LIST")"
    if [[ -z "$GFF_FILE" ]]; then
        echo "No file for array task ${SLURM_ARRAY_TASK_ID}; exiting."
        exit 0
    fi
else
    echo "SLURM_ARRAY_TASK_ID is not set. Submit as an array job from ${SCRIPT_DIR}:" >&2
    echo "  sbatch --array=1-\$(wc -l < gff_files.lst)%100 submit_gff_prep_array.slurm" >&2
    exit 1
fi

# Conda activation (Codon / EBI HPC — adjust if your site differs)
if command -v mitload >/dev/null 2>&1; then
    mitload miniconda
fi
# shellcheck disable=SC1091
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate "$CONDA_ENV"

PREPARE_SCRIPT="${SCRIPT_DIR}/prepare_gff_fasta_indexes.sh"

set +e
gff_fasta_prep_run_with_metrics "$PREPARE_SCRIPT" "$GFF_FILE" "$METRICS_FILE" "$FAILED_LIST"
exit_code=$?
set -e

echo "Metrics recorded in ${METRICS_FILE}"
if [[ "$exit_code" -ne 0 ]]; then
    echo "Task failed; path appended to ${FAILED_LIST}" >&2
fi
exit "$exit_code"
