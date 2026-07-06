#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [metrics_file] [slurm_job_id]

Summarize per-task wall time and memory from a pilot SLURM array run.

Arguments:
  metrics_file   TSV written by submit_gff_prep_array.slurm
                 (default: logs/gff-prep-metrics.tsv)
  slurm_job_id   Optional array job ID; if given, also prints sacct summary

Examples:
  $(basename "$0")
  $(basename "$0") logs/gff-prep-metrics.tsv 123456
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

METRICS_FILE="${1:-logs/gff-prep-metrics.tsv}"
SLURM_JOB_ID="${2:-}"

if [[ ! -f "$METRICS_FILE" ]]; then
  echo "Metrics file not found: $METRICS_FILE" >&2
  echo "Run a pilot array job first (see README)." >&2
  exit 1
fi

cd "$SCRIPT_DIR"

awk -F'\t' '
  NR == 1 { next }
  $9 == "failed" { failed++ }
  $9 == "skipped" { skipped++ }
  $9 == "processed" {
    processed++
    if ($5 ~ /^[0-9.]+$/) {
      wall[processed] = $5 + 0
      wall_sum += $5 + 0
    }
    if ($6 ~ /^[0-9]+$/) {
      rss[processed] = $6 + 0
      rss_sum += $6 + 0
      rss_count++
    }
  }
  END {
    total = processed + skipped + failed + 0
    print "=== Metrics from " FILENAME " ==="
    print "Tasks recorded:  " total
    print "  processed:     " processed + 0
    print "  skipped:       " skipped + 0
    print "  failed:        " failed + 0
    print ""

    if (processed == 0) {
      print "No processed tasks to summarize."
      exit 0
    }

    n_wall = 0
    for (i = 1; i <= processed; i++) {
      if (wall[i] != "") wall_vals[++n_wall] = wall[i]
    }
    n_rss = 0
    for (i = 1; i <= processed; i++) {
      if (rss[i] != "") rss_vals[++n_rss] = rss[i]
    }

  }
' "$METRICS_FILE" | sed '/^$/d'

# Percentiles and recommendations via awk (processed tasks only)
awk -F'\t' '
  function sort_num(arr, n,    i, j, tmp) {
    for (i = 2; i <= n; i++) {
      tmp = arr[i]
      j = i - 1
      while (j >= 1 && arr[j] > tmp) {
        arr[j + 1] = arr[j]
        j--
      }
      arr[j + 1] = tmp
    }
  }
  function pct(arr, n, p,    idx) {
    if (n == 0) return ""
    idx = int((p / 100) * n + 0.999999)
    if (idx < 1) idx = 1
    if (idx > n) idx = n
    return arr[idx]
  }
  NR == 1 { next }
  $9 == "processed" {
    if ($5 ~ /^[0-9.]+$/) wall[++n_wall] = $5 + 0
    if ($6 ~ /^[0-9]+$/) rss[++n_rss] = $6 + 0
  }
  END {
    if (n_wall == 0) exit 0

    sort_num(wall, n_wall)
    wall_avg = 0
    for (i = 1; i <= n_wall; i++) wall_avg += wall[i]
    wall_avg /= n_wall
    wall_p95 = pct(wall, n_wall, 95)
    wall_max = wall[n_wall]

    print "Wall time (processed tasks, seconds):"
    printf "  average:  %.1f\n", wall_avg
    printf "  p95:      %.1f\n", wall_p95
    printf "  max:      %.1f\n", wall_max
    print ""

    if (n_rss > 0) {
      sort_num(rss, n_rss)
      rss_avg = 0
      for (i = 1; i <= n_rss; i++) rss_avg += rss[i]
      rss_avg /= n_rss
      rss_p95 = pct(rss, n_rss, 95)
      rss_max = rss[n_rss]

      print "Peak memory MaxRSS (processed tasks):"
      printf "  average:  %.0f MB (%.1f GB)\n", rss_avg / 1024, rss_avg / 1024 / 1024
      printf "  p95:      %.0f MB (%.1f GB)\n", rss_p95 / 1024, rss_p95 / 1024 / 1024
      printf "  max:      %.0f MB (%.1f GB)\n", rss_max / 1024, rss_max / 1024 / 1024
      print ""

      mem_gb = int(rss_p95 * 1.25 / 1024 / 1024 + 0.999999)
      if (mem_gb < 1) mem_gb = 1
      time_min = int(wall_p95 * 1.5 / 60 + 0.999999)
      if (time_min < 1) time_min = 1

      print "Suggested sbatch settings (from p95 + headroom):"
      printf "  --mem=%dG\n", mem_gb
      printf "  --time=%d:00:00\n", time_min
      print "  --cpus-per-task=2"
    } else {
      time_min = int(wall_p95 * 1.5 / 60 + 0.999999)
      if (time_min < 1) time_min = 1
      print "Suggested sbatch settings (wall time only; MaxRSS not recorded):"
      printf "  --time=%d:00:00\n", time_min
      print "  --cpus-per-task=2"
      print "  --mem=16G   # set after MaxRSS is available from GNU time"
    }
  }
' "$METRICS_FILE"

if [[ -n "$SLURM_JOB_ID" ]]; then
  if ! command -v sacct >/dev/null 2>&1; then
    echo ""
    echo "sacct not available; skipping SLURM accounting summary."
    exit 0
  fi

  echo ""
  echo "=== SLURM sacct summary for job ${SLURM_JOB_ID} ==="
  sacct -j "$SLURM_JOB_ID" \
    --format=JobID,State,Elapsed,TotalCPU,MaxRSS,AllocCPUS,ExitCode \
    -P -n \
    | awk -F'|' '
        $1 ~ /^[0-9]+_[0-9]+$/ {
          state[$2]++
          if ($3 != "") { elapsed[++n] = $3 }
          if ($5 != "") {
            gsub(/[Kk]/, "", $5)
            if ($5 ~ /^[0-9]+$/) rss[++m] = $5
          }
          if ($4 != "") cpu[++c] = $4
        }
        END {
          print "Array tasks in accounting: " (n + 0)
          for (s in state) printf "  %s: %d\n", s, state[s]
          if (m > 0) {
            sum = 0
            for (i = 1; i <= m; i++) sum += rss[i]
            printf "  sacct MaxRSS avg: %.0f MB\n", sum / m / 1024
          }
        }
      '
  echo ""
  echo "Tip: compare sacct MaxRSS with the metrics TSV; use the higher p95 for --mem."
fi
