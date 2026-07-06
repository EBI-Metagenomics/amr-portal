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

gff_fasta_prep_find_time_bin() {
  local candidate
  for candidate in ${TIME_BIN:-} /usr/bin/time /bin/time; do
    [[ -n "$candidate" && -x "$candidate" ]] || continue
    printf '%s' "$candidate"
    return 0
  done
  if command -v gtime >/dev/null 2>&1; then
    printf '%s' "gtime"
    return 0
  fi
  return 1
}

gff_fasta_prep_time_supports_format() {
  local time_bin="$1"
  "$time_bin" -f 'wall_sec=%e' true -o /dev/null 2>/dev/null
}

gff_fasta_prep_parse_time_verbose() {
  local verbose_file="$1"
  local elapsed_line rss_line elapsed rss

  wall_sec=""
  maxrss_kb=""

  elapsed_line="$(grep -E 'Elapsed \(wall clock\) time' "$verbose_file" | head -n1 || true)"
  rss_line="$(grep -E 'Maximum resident set size' "$verbose_file" | head -n1 || true)"

  if [[ -n "$elapsed_line" ]]; then
    elapsed="$(sed -n 's/.*):[[:space:]]*//p' <<<"$elapsed_line" | tr -d ' ')"
    if [[ "$elapsed" =~ ^([0-9]+):([0-9]{2}):([0-9]{2})$ ]]; then
      wall_sec="$((10#${BASH_REMATCH[1]} * 3600 + 10#${BASH_REMATCH[2]} * 60 + 10#${BASH_REMATCH[3]}))"
    elif [[ "$elapsed" =~ ^([0-9]+):([0-9]{2})(\.[0-9]+)?$ ]]; then
      wall_sec="$(awk -v m="${BASH_REMATCH[1]}" -v s="${BASH_REMATCH[2]}${BASH_REMATCH[3]:-}" 'BEGIN { printf "%.1f", m * 60 + s }')"
    fi
  fi

  if [[ -n "$rss_line" ]]; then
    rss="$(sed -n 's/.*):[[:space:]]*//p' <<<"$rss_line" | awk '{print $1}')"
    if [[ "$rss" =~ ^[0-9]+$ ]]; then
      maxrss_kb="$rss"
    fi
  fi
}

# Run prepare script once; record wall time and MaxRSS when GNU time is available.
gff_fasta_prep_run_with_metrics() {
  local prepare_script="$1"
  local gff_file="$2"
  local metrics_file="$3"
  local failed_list="${4:-}"

  local array_job_id="${SLURM_ARRAY_JOB_ID:-local}"
  local array_task_id="${SLURM_ARRAY_TASK_ID:-0}"
  local time_bin time_file verbose_file stdout_file

  local command_output=""
  local exit_code=0
  wall_sec=""
  maxrss_kb=""

  time_file="$(mktemp)"
  verbose_file="$(mktemp)"
  stdout_file="$(mktemp)"

  if time_bin="$(gff_fasta_prep_find_time_bin)"; then
    set +e
    if gff_fasta_prep_time_supports_format "$time_bin"; then
      command_output="$(
        "$time_bin" -f 'wall_sec=%e maxrss_kb=%M' -o "$time_file" \
          "$prepare_script" --gff-file "$gff_file" 2>&1
      )"
      exit_code=$?
      wall_sec="$(sed -n 's/^wall_sec=//p' "$time_file" | head -n1)"
      maxrss_kb="$(sed -n 's/^maxrss_kb=//p' "$time_file" | head -n1)"
    else
      "$time_bin" -v "$prepare_script" --gff-file "$gff_file" >"$stdout_file" 2>"$verbose_file"
      exit_code=$?
      command_output="$(cat "$stdout_file")"
      gff_fasta_prep_parse_time_verbose "$verbose_file"
    fi
    set -e
  fi

  if [[ -z "$wall_sec" ]]; then
    local start_ts end_ts
    start_ts="$(date +%s)"
    set +e
    command_output="$("$prepare_script" --gff-file "$gff_file" 2>&1)"
    exit_code=$?
    set -e
    end_ts="$(date +%s)"
    wall_sec="$((end_ts - start_ts))"
    if [[ -z "$time_bin" ]]; then
      echo "Warning: GNU time not found; recorded wall_sec only (no MaxRSS)." >&2
    else
      echo "Warning: could not parse GNU time output; recorded wall_sec only (no MaxRSS)." >&2
    fi
  fi

  rm -f "$time_file" "$verbose_file" "$stdout_file"
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
