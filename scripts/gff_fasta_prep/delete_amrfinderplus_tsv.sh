#!/usr/bin/env bash
# Delete AMRFinderPlus TSV files from a genome/FTP directory tree.
#
# JBrowse only needs the annotation GFF (+ FASTA); the portal already
# publishes AMRFinder TSVs via FTP, so keeping sibling
# *_amrfinderplus.tsv(.gz) next to prepared genome folders is redundant.
#
# Usage:
#   ./delete_amrfinderplus_tsv.sh /path/to/ftp/genomes           # dry-run (default)
#   ./delete_amrfinderplus_tsv.sh /path/to/ftp/genomes --delete  # actually delete
#   ./delete_amrfinderplus_tsv.sh /path/to/ftp/genomes --delete --yes

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: delete_amrfinderplus_tsv.sh <directory> [--delete] [--yes]

Recursively find and remove *_amrfinderplus.tsv and *_amrfinderplus.tsv.gz
under <directory>.

  --delete   Perform deletion (default is dry-run: list files only)
  --yes      Skip the confirmation prompt when deleting
  -h, --help Show this help

Examples:
  ./delete_amrfinderplus_tsv.sh /nfs/ftp/genomes
  ./delete_amrfinderplus_tsv.sh /nfs/ftp/genomes --delete --yes
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

ROOT_DIR=""
DO_DELETE=0
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --delete)
      DO_DELETE=1
      shift
      ;;
    --yes)
      ASSUME_YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$ROOT_DIR" ]]; then
        echo "Unexpected argument: $1" >&2
        usage >&2
        exit 1
      fi
      ROOT_DIR="$1"
      shift
      ;;
  esac
done

if [[ -z "$ROOT_DIR" ]]; then
  usage >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR" ]]; then
  echo "Not a directory: $ROOT_DIR" >&2
  exit 1
fi

ROOT_DIR="$(cd "$ROOT_DIR" && pwd)"

mapfile -t FILES < <(
  find "$ROOT_DIR" -type f \( \
    -name '*_amrfinderplus.tsv' -o \
    -name '*_amrfinderplus.tsv.gz' \
  \) | LC_ALL=C sort
)

COUNT="${#FILES[@]}"

if [[ "$COUNT" -eq 0 ]]; then
  echo "No *_amrfinderplus.tsv(.gz) files found under $ROOT_DIR"
  exit 0
fi

echo "Found $COUNT AMRFinderPlus TSV file(s) under $ROOT_DIR"
for file in "${FILES[@]}"; do
  printf '  %s\n' "$file"
done

if [[ "$DO_DELETE" -eq 0 ]]; then
  echo
  echo "Dry-run only. Re-run with --delete to remove these files."
  exit 0
fi

if [[ "$ASSUME_YES" -eq 0 ]]; then
  echo
  read -r -p "Delete these $COUNT file(s)? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *)
      echo "Aborted."
      exit 1
      ;;
  esac
fi

DELETED=0
FAILED=0
for file in "${FILES[@]}"; do
  if rm -f -- "$file"; then
    DELETED=$((DELETED + 1))
  else
    echo "Failed to delete: $file" >&2
    FAILED=$((FAILED + 1))
  fi
done

echo "Deleted $DELETED file(s)."
if [[ "$FAILED" -gt 0 ]]; then
  echo "Failed to delete $FAILED file(s)." >&2
  exit 1
fi
