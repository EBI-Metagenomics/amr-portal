#!/usr/bin/env bash

GFF_FASTA_PREP_METRICS_HEADER=$'recorded_at\tarray_job_id\tarray_task_id\tgff_file\twall_sec\tmaxrss_kb\tmaxrss_mb\texit_code\tstatus'

gff_fasta_prep_metrics_init() {
  local metrics_file="$1"
  mkdir -p "$(dirname "$metrics_file")"
  if [[ ! -f "$metrics_file" ]]; then
    printf '%s\n' "$GFF_FASTA_PREP_METRICS_HEADER" >"$metrics_file"
  fi
}

gff_fasta_prep_metrics_infer_status() {
  local exit_code="$1"
  local command_output="$2"

  if [[ "$exit_code" -ne 0 ]]; then
    echo "failed"
    return
  fi
  if grep -q 'indexed files already exist' <<<"$command_output"; then
    echo "skipped"
    return
  fi
  echo "processed"
}

gff_fasta_prep_record_failure() {
  local failed_list="$1"
  local gff_file="$2"

  [[ -n "$failed_list" ]] || return 0
  {
    flock -x 201
    mkdir -p "$(dirname "$failed_list")"
    printf '%s\n' "$gff_file" >>"$failed_list"
  } 201>>"${failed_list}.lock"
}

gff_fasta_prep_metrics_record() {
  local metrics_file="$1"
  local array_job_id="$2"
  local array_task_id="$3"
  local gff_file="$4"
  local wall_sec="$5"
  local maxrss_kb="$6"
  local exit_code="$7"
  local status="$8"
  local maxrss_mb=""

  if [[ -n "$maxrss_kb" && "$maxrss_kb" =~ ^[0-9]+$ ]]; then
    maxrss_mb="$(awk -v kb="$maxrss_kb" 'BEGIN { printf "%.1f", kb / 1024 }')"
  fi

  {
    flock -x 200
    gff_fasta_prep_metrics_init "$metrics_file"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$(date '+%Y-%m-%d %H:%M:%S')" \
      "$array_job_id" \
      "$array_task_id" \
      "$gff_file" \
      "$wall_sec" \
      "$maxrss_kb" \
      "$maxrss_mb" \
      "$exit_code" \
      "$status" \
      >>"$metrics_file"
  } 200>>"${metrics_file}.lock"
}

# Run prepare script under GNU time and append one metrics row.
gff_fasta_prep_run_with_metrics() {
  local prepare_script="$1"
  local gff_file="$2"
  local metrics_file="$3"
  local failed_list="${4:-}"
  local time_bin="${TIME_BIN:-/usr/bin/time}"

  local array_job_id="${SLURM_ARRAY_JOB_ID:-local}"
  local array_task_id="${SLURM_ARRAY_TASK_ID:-0}"
  local time_file
  time_file="$(mktemp)"

  local command_output=""
  local exit_code=0
  local wall_sec=""
  local maxrss_kb=""

  if [[ -x "$time_bin" ]]; then
    set +e
    command_output="$(
      "$time_bin" -f 'wall_sec=%e maxrss_kb=%M' -o "$time_file" \
        "$prepare_script" --gff-file "$gff_file" 2>&1
    )"
    exit_code=$?
    set -e
    if [[ -f "$time_file" ]]; then
      wall_sec="$(sed -n 's/^wall_sec=//p' "$time_file" | head -n1)"
      maxrss_kb="$(sed -n 's/^maxrss_kb=//p' "$time_file" | head -n1)"
    fi
  else
    local start_ts end_ts
    start_ts="$(date +%s)"
    set +e
    command_output="$("$prepare_script" --gff-file "$gff_file" 2>&1)"
    exit_code=$?
    set -e
    end_ts="$(date +%s)"
    wall_sec="$((end_ts - start_ts))"
    echo "Warning: GNU time not found at $time_bin; wall_sec only (no MaxRSS)." >&2
  fi

  rm -f "$time_file"
  printf '%s\n' "$command_output"

  local status
  status="$(gff_fasta_prep_metrics_infer_status "$exit_code" "$command_output")"
  gff_fasta_prep_metrics_record \
    "$metrics_file" \
    "$array_job_id" \
    "$array_task_id" \
    "$gff_file" \
    "$wall_sec" \
    "$maxrss_kb" \
    "$exit_code" \
    "$status"

  if [[ "$status" == "failed" ]]; then
    gff_fasta_prep_record_failure "$failed_list" "$gff_file"
  fi

  return "$exit_code"
}
