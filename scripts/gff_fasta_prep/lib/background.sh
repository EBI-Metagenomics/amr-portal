#!/usr/bin/env bash

gff_fasta_prep_maybe_detach() {
  local base_dir="$1"
  local run_background="$2"
  local log_file="$3"
  local entrypoint="$4"

  if [[ "$run_background" -ne 1 || "${GFF_FASTA_PREP_DETACHED:-}" == "1" ]]; then
    return 0
  fi

  log_file="${log_file:-${base_dir}/prepare_gff_fasta_indexes.log}"
  local pid_file="${base_dir}/prepare_gff_fasta_indexes.pid"

  nohup env GFF_FASTA_PREP_DETACHED=1 "$entrypoint" "$base_dir" >>"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$pid_file"

  log "Started in background (PID $pid)"
  log "Log: $log_file"
  log "PID file: $pid_file"
  log "Monitor: tail -f $log_file"
  exit 0
}
