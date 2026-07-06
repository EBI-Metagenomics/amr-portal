#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/cli.sh
source "${SCRIPT_DIR}/lib/cli.sh"
# shellcheck source=lib/background.sh
source "${SCRIPT_DIR}/lib/background.sh"
# shellcheck source=lib/discovery.sh
source "${SCRIPT_DIR}/lib/discovery.sh"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"
# shellcheck source=lib/process.sh
source "${SCRIPT_DIR}/lib/process.sh"

gff_fasta_prep_parse_args "$(basename "$0")" "$@"

if [[ -n "$GFF_FASTA_PREP_GFF_FILE" ]]; then
  gff_fasta_prep_process_annotation_gff "$GFF_FASTA_PREP_GFF_FILE"
  log "Done."
  exit 0
fi

gff_fasta_prep_maybe_detach \
  "$GFF_FASTA_PREP_BASE_DIR" \
  "$GFF_FASTA_PREP_RUN_BACKGROUND" \
  "$GFF_FASTA_PREP_LOG_FILE" \
  "${SCRIPT_DIR}/$(basename "$0")"

log "Scanning $GFF_FASTA_PREP_BASE_DIR for $ANNOTATION_GFF_GLOB"

while IFS= read -r file; do
  gff_fasta_prep_process_annotation_gff "$file"
done < <(gff_fasta_prep_find_annotation_gffs "$GFF_FASTA_PREP_BASE_DIR")

log "Done."
