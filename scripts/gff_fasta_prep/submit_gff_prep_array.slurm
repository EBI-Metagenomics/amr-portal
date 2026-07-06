#!/bin/bash
#SBATCH --job-name=gff-fasta-prep
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --time=02:00:00
#SBATCH --output=logs/gff-prep-%A_%a.log
#
# Each array task processes CHUNK_SIZE genomes (default 500), so a few hundred
# tasks cover a very large list without exceeding MaxArraySize.
#
# Submit from scripts/gff_fasta_prep (required so SLURM_SUBMIT_DIR is correct):
#   cd scripts/gff_fasta_prep
#   ./generate_gff_file_list.sh --genomes-dir /path/to/genomes -o gff_files.lst
#   mkdir -p logs
#   N=$(wc -l < gff_files.lst)
#   CHUNK=500
#   TASKS=$(( (N + CHUNK - 1) / CHUNK ))
#   JOB_ID=$(sbatch --parsable --export=ALL,CHUNK_SIZE=$CHUNK \
#              --array=1-${TASKS}%50 submit_gff_prep_array.slurm)
#   ./summarize_pilot_metrics.sh logs/gff-prep-metrics.tsv "$JOB_ID"
#
# Override paths at submit time if needed:
#   sbatch --export=ALL,GFF_LIST=/path/gff_files.lst,CONDA_ENV=gff-tools,CHUNK_SIZE=500 \
#     --array=1-340%50 submit_gff_prep_array.slurm

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
# Genomes processed per array task. Tasks are cheap-per-genome, so batch them.
CHUNK_SIZE="${CHUNK_SIZE:-500}"
# --- end configure ---

if ! [[ "$CHUNK_SIZE" =~ ^[0-9]+$ ]] || [[ "$CHUNK_SIZE" -lt 1 ]]; then
    echo "CHUNK_SIZE must be a positive integer (got: $CHUNK_SIZE)" >&2
    exit 1
fi

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

if [[ -z "${SLURM_ARRAY_TASK_ID:-}" ]]; then
    echo "SLURM_ARRAY_TASK_ID is not set. Submit as an array job from ${SCRIPT_DIR}:" >&2
    echo "  N=\$(wc -l < gff_files.lst)" >&2
    echo "  TASKS=\$(( (N + ${CHUNK_SIZE} - 1) / ${CHUNK_SIZE} ))" >&2
    echo "  sbatch --export=ALL,CHUNK_SIZE=${CHUNK_SIZE} --array=1-\${TASKS}%50 submit_gff_prep_array.slurm" >&2
    exit 1
fi

# This task handles lines [start_line, end_line] of the work list.
start_line=$(( (SLURM_ARRAY_TASK_ID - 1) * CHUNK_SIZE + 1 ))
end_line=$(( SLURM_ARRAY_TASK_ID * CHUNK_SIZE ))

mapfile -t CHUNK_FILES < <(sed -n "${start_line},${end_line}p" "$GFF_LIST")

if [[ "${#CHUNK_FILES[@]}" -eq 0 ]]; then
    echo "No files in lines ${start_line}-${end_line} for task ${SLURM_ARRAY_TASK_ID}; exiting."
    exit 0
fi

# Conda activation (Codon / EBI HPC — adjust if your site differs)
if command -v mitload >/dev/null 2>&1; then
    mitload miniconda
fi
# shellcheck disable=SC1091
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate "$CONDA_ENV"

PREPARE_SCRIPT="${SCRIPT_DIR}/prepare_gff_fasta_indexes.sh"

echo "Task ${SLURM_ARRAY_TASK_ID}: processing ${#CHUNK_FILES[@]} genomes (lines ${start_line}-${end_line})"

task_exit=0
processed=0
failed=0
for gff_file in "${CHUNK_FILES[@]}"; do
    [[ -n "$gff_file" ]] || continue
    set +e
    gff_fasta_prep_run_with_metrics "$PREPARE_SCRIPT" "$gff_file" "$METRICS_FILE" "$FAILED_LIST"
    rc=$?
    set -e
    processed=$(( processed + 1 ))
    if [[ "$rc" -ne 0 ]]; then
        failed=$(( failed + 1 ))
        task_exit=1
    fi
done

echo "Task ${SLURM_ARRAY_TASK_ID}: ${processed} genomes done, ${failed} failed"
echo "Metrics recorded in ${METRICS_FILE}"
if [[ "$failed" -ne 0 ]]; then
    echo "Failed paths appended to ${FAILED_LIST}" >&2
fi
# Non-zero exit if any genome in the chunk failed, so the task shows as FAILED.
exit "$task_exit"
