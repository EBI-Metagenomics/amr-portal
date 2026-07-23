#!/bin/bash
#SBATCH --job-name=delete-amrfinder-tsv
#SBATCH --partition=datamover
#SBATCH --cpus-per-task=1
#SBATCH --mem=2G
#SBATCH --time=04:00:00
#SBATCH --output=logs/delete-amrfinder-tsv-%j.log
#
# Delete sibling *_amrfinderplus.tsv(.gz) files from a genome tree on /nfs/ftp.
#
# IMPORTANT: /nfs/ftp/public is only mounted on Codon *datamover* nodes
# (hl-codon-dm-*), not on regular compute nodes (hl-codon-cn-*). This script
# therefore targets --partition=datamover.
#
# Submit from scripts/gff_fasta_prep (on a datamover login host such as
# hl-codon-dm-02):
#   mkdir -p logs
#
#   # 1. Dry-run first (lists matches only)
#   sbatch --export=ALL,GENOMES_DIR=/nfs/ftp/public/.../amr_portal/genomes \
#     submit_delete_amrfinderplus_tsv.slurm
#
#   # 2. Actually delete after reviewing the log
#   sbatch --export=ALL,GENOMES_DIR=/nfs/ftp/public/.../amr_portal/genomes,DELETE=1 \
#     submit_delete_amrfinderplus_tsv.slurm
#
# Or run interactively on the datamover login node (no sbatch needed):
#   ./delete_amrfinderplus_tsv.sh /nfs/ftp/public/.../amr_portal/genomes
#   ./delete_amrfinderplus_tsv.sh /nfs/ftp/public/.../amr_portal/genomes --delete --yes
#
# Optional: longer wall time if the tree is huge:
#   sbatch --time=12:00:00 --mem=4G \
#     --export=ALL,GENOMES_DIR=/path/to/genomes,DELETE=1 \
#     submit_delete_amrfinderplus_tsv.slurm

set -euo pipefail

SCRIPT_DIR="${SCRIPT_DIR:-${SLURM_SUBMIT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}}"
cd "$SCRIPT_DIR"
mkdir -p logs

GENOMES_DIR="${GENOMES_DIR:-}"
DELETE="${DELETE:-0}"

# Trim trailing whitespace / CR that can sneak in via --export
GENOMES_DIR="${GENOMES_DIR%"${GENOMES_DIR##*[![:space:]]}"}"
# Normalise trailing slash for clearer logs (keep root "/")
if [[ "$GENOMES_DIR" != "/" ]]; then
  GENOMES_DIR="${GENOMES_DIR%/}"
fi

if [[ -z "$GENOMES_DIR" ]]; then
  echo "GENOMES_DIR is required. Example:" >&2
  echo "  sbatch --export=ALL,GENOMES_DIR=/path/to/copied/genomes submit_delete_amrfinderplus_tsv.slurm" >&2
  exit 1
fi

echo "Host: $(hostname)"
echo "Job: ${SLURM_JOB_ID:-local}"
echo "GENOMES_DIR=$GENOMES_DIR"
echo "DELETE=$DELETE"
echo "Started: $(date -Is)"

if [[ ! -d "$GENOMES_DIR" ]]; then
  echo "Not a directory on this host: $GENOMES_DIR" >&2
  echo "Diagnostics:" >&2
  echo "  exists?  $([[ -e "$GENOMES_DIR" ]] && echo yes || echo no)" >&2
  echo "  symlink? $([[ -L "$GENOMES_DIR" ]] && echo yes || echo no)" >&2
  echo "  parent:  $(dirname "$GENOMES_DIR")" >&2
  ls -la "$(dirname "$GENOMES_DIR")" 2>&1 | head -n 40 >&2 || true
  echo >&2
  echo "If this path works on the login node but not here, the filesystem may not be" >&2
  echo "mounted on compute nodes. Prefer the copied/project path used for JBrowse prep," >&2
  echo "or request an interactive node that can see the same mount:" >&2
  echo "  srun --pty bash" >&2
  echo "  ls -ld $GENOMES_DIR" >&2
  exit 1
fi

DELETE_SCRIPT="${SCRIPT_DIR}/delete_amrfinderplus_tsv.sh"
if [[ ! -x "$DELETE_SCRIPT" ]]; then
  echo "Missing or not executable: $DELETE_SCRIPT" >&2
  exit 1
fi

if [[ "$DELETE" == "1" || "$DELETE" == "true" || "$DELETE" == "yes" ]]; then
  echo "Mode: delete"
  "$DELETE_SCRIPT" "$GENOMES_DIR" --delete --yes
else
  echo "Mode: dry-run (set DELETE=1 to remove files)"
  "$DELETE_SCRIPT" "$GENOMES_DIR"
fi

echo "Finished: $(date -Is)"
