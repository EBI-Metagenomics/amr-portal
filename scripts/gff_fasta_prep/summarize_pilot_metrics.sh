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
  slurm_job_id   Array job ID; strongly recommended — used for sacct fallback
                 when the metrics TSV has no timing/memory columns

Examples:
  $(basename "$0")
  $(basename "$0") logs/gff-prep-metrics.tsv 63333733
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

METRICS_FILE="${1:-logs/gff-prep-metrics.tsv}"
SLURM_JOB_ID="${2:-}"

if [[ "$METRICS_FILE" != /* ]]; then
  METRICS_FILE="${SCRIPT_DIR}/${METRICS_FILE}"
fi

if [[ ! -f "$METRICS_FILE" ]]; then
  echo "Metrics file not found: $METRICS_FILE" >&2
  echo "If the pilot job failed immediately, check logs/gff-prep-<jobid>_*.log for errors." >&2
  exit 1
fi

cd "$SCRIPT_DIR"

SACCT_DUMP=""
if [[ -n "${SACCT_FILE:-}" && -f "$SACCT_FILE" ]]; then
  SACCT_DUMP="$SACCT_FILE"
elif [[ -n "$SLURM_JOB_ID" ]] && command -v sacct >/dev/null 2>&1; then
  SACCT_DUMP="$(mktemp)"
  if ! sacct -j "$SLURM_JOB_ID" \
    --format=JobID,State,Elapsed,TotalCPU,MaxRSS,AllocCPUS,ExitCode \
    -P -n >"$SACCT_DUMP" 2>/dev/null; then
    rm -f "$SACCT_DUMP"
    SACCT_DUMP=""
  fi
fi

export METRICS_FILE SACCT_DUMP

python3 - <<'PY'
import os
import re
import statistics
import sys

metrics_file = os.environ["METRICS_FILE"]
sacct_dump = os.environ.get("SACCT_DUMP", "")

def parse_elapsed(value: str) -> float | None:
    value = (value or "").strip()
    if not value or value in ("Unknown", "None"):
        return None
    m = re.match(r"^(?:(\d+)-)?(\d+):(\d{2}):(\d{2})$", value)
    if m:
        days, hours, minutes, seconds = m.groups()
        return int(days or 0) * 86400 + int(hours) * 3600 + int(minutes) * 60 + int(seconds)
    m = re.match(r"^(\d+):(\d{2})(?:\.(\d+))?$", value)
    if m:
        minutes, seconds, frac = m.group(1), m.group(2), m.group(3) or "0"
        return int(minutes) * 60 + int(seconds) + int(frac) / (10 ** len(frac))
    try:
        return float(value)
    except ValueError:
        return None

def parse_maxrss(value: str) -> int | None:
    value = (value or "").strip()
    if not value or value in ("Unknown", "None"):
        return None
    m = re.match(r"^(\d+)([KkMmGg]?)$", value)
    if not m:
        return None
    amount, unit = int(m.group(1)), m.group(2).upper()
    if unit in ("", "K"):
        return amount
    if unit == "M":
        return amount * 1024
    if unit == "G":
        return amount * 1024 * 1024
    return None

def parse_totalcpu(value: str) -> float | None:
    value = (value or "").strip()
    if not value or value in ("Unknown", "None"):
        return None
    m = re.match(r"^(?:(\d+)-)?(\d+):(\d{2}):(\d{2})$", value)
    if m:
        days, hours, minutes, seconds = m.groups()
        return int(days or 0) * 86400 + int(hours) * 3600 + int(minutes) * 60 + int(seconds)
    return parse_elapsed(value)

def pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = max(0, min(len(ordered) - 1, int((p / 100) * len(ordered) + 0.999999) - 1))
    return ordered[idx]

def summarize(values: list[float]) -> dict:
    return {
        "count": len(values),
        "avg": statistics.mean(values),
        "p95": pct(values, 95),
        "max": max(values),
    }

def print_stats_block(title: str, values: list[float], unit: str, formatter) -> None:
    if not values:
        return
    stats = summarize(values)
    print(title)
    print(f"  count:    {stats['count']}")
    print(f"  average:  {formatter(stats['avg'])}")
    print(f"  p95:      {formatter(stats['p95'])}")
    print(f"  max:      {formatter(stats['max'])}")
    print()

def load_metrics_tsv(path: str):
    processed = skipped = failed = 0
    wall: list[float] = []
    rss_kb: list[int] = []
    with open(path, encoding="utf-8") as handle:
        header = handle.readline().rstrip("\n").split("\t")
        for line in handle:
            if not line.strip():
                continue
            fields = line.rstrip("\n").split("\t")
            row = dict(zip(header, fields))
            status = row.get("status", "")
            if status == "failed":
                failed += 1
            elif status == "skipped":
                skipped += 1
            elif status == "processed":
                processed += 1
                w = row.get("wall_sec", "").strip()
                r = row.get("maxrss_kb", "").strip()
                if re.fullmatch(r"[0-9.]+", w or ""):
                    wall.append(float(w))
                if re.fullmatch(r"[0-9]+", r or ""):
                    rss_kb.append(int(r))
    return processed, skipped, failed, wall, rss_kb

def load_sacct(path: str):
    wall: list[float] = []
    rss_kb: list[int] = []
    cpu_sec: list[float] = []
    alloc_cpus: list[int] = []
    states: dict[str, int] = {}
    if not path or not os.path.isfile(path):
        return states, wall, rss_kb, cpu_sec, alloc_cpus

    with open(path, encoding="utf-8") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("|")
            if len(parts) < 7:
                continue
            job_id, state, elapsed, total_cpu, maxrss, alloc_cpus_field, _exit = parts[:7]
            if not re.fullmatch(r"\d+_\d+", job_id):
                continue
            states[state] = states.get(state, 0) + 1
            w = parse_elapsed(elapsed)
            r = parse_maxrss(maxrss)
            c = parse_totalcpu(total_cpu)
            if w is not None:
                wall.append(w)
            if r is not None:
                rss_kb.append(r)
            if c is not None:
                cpu_sec.append(c)
            if alloc_cpus_field.strip().isdigit():
                cpus = int(alloc_cpus_field)
                if cpus > 0:
                    alloc_cpus.append(cpus)
    return states, wall, rss_kb, cpu_sec, alloc_cpus

processed, skipped, failed, wall_tsv, rss_tsv = load_metrics_tsv(metrics_file)
states, wall_sacct, rss_sacct, cpu_sacct, alloc_cpus = load_sacct(sacct_dump)

print(f"=== Metrics from {metrics_file} ===")
print(f"Tasks recorded:  {processed + skipped + failed}")
print(f"  processed:     {processed}")
print(f"  skipped:       {skipped}")
print(f"  failed:        {failed}")
print()

wall = wall_tsv or wall_sacct
rss_kb = rss_tsv or rss_sacct
source = "metrics TSV"
if not wall_tsv and wall_sacct:
    source = "sacct (metrics TSV had no wall_sec values)"
if not rss_tsv and rss_sacct:
    source = "sacct (metrics TSV had no maxrss_kb values)" if source == "metrics TSV" else "metrics TSV + sacct"

if not wall and not rss_kb:
    print("No wall time or memory data found in metrics TSV or sacct.")
    print("Check one task log, then re-run a short pilot after updating lib/metrics.sh:")
    print("  head logs/gff-prep-<jobid>_1.log")
    print("  sacct -j <jobid> --format=JobID,Elapsed,MaxRSS,TotalCPU,AllocCPUS -P")
    sys.exit(0)

print(f"Using timing/memory from: {source}")
print()

print_stats_block(
    "Wall time per genome (seconds):",
    wall,
    "s",
    lambda v: f"{v:.1f}",
)
if rss_kb:
    print_stats_block(
        "Peak memory MaxRSS per genome:",
        [float(v) for v in rss_kb],
        "kb",
        lambda v: f"{v / 1024:.0f} MB ({v / 1024 / 1024:.1f} GB)",
    )

if cpu_sacct and wall_sacct and alloc_cpus:
    util = []
    for cpu, elapsed, cpus in zip(cpu_sacct, wall_sacct, alloc_cpus):
        if elapsed > 0 and cpus > 0:
            util.append(cpu / (elapsed * cpus))
    if util:
        stats = summarize(util)
        print("CPU utilization (TotalCPU / Elapsed / AllocCPUS, from sacct):")
        print(f"  average:  {stats['avg']:.2f} cores used per allocated core")
        print(f"  p95:      {stats['p95']:.2f}")
        print(f"  max:      {stats['max']:.2f}")
        print("  (Values near 1.0 mean one core busy; <<1.0 means mostly single-threaded.)")
        print()

if wall:
    wall_p95 = pct(wall, 95)
    time_hours = max(1, int(wall_p95 * 1.5 / 3600 + 0.999999))
    print("Suggested sbatch settings (from p95 + 50% headroom):")
    if rss_kb:
        rss_p95 = pct([float(v) for v in rss_kb], 95)
        mem_gb = max(1, int(rss_p95 * 1.25 / 1024 / 1024 + 0.999999))
        print(f"  --mem={mem_gb}G")
    else:
        print("  --mem=16G   # MaxRSS missing; set manually after checking sacct")
    print(f"  --time={time_hours}:00:00")
    if cpu_sacct and wall_sacct and alloc_cpus:
        avg_util = statistics.mean(
            cpu / (elapsed * cpus)
            for cpu, elapsed, cpus in zip(cpu_sacct, wall_sacct, alloc_cpus)
            if elapsed > 0 and cpus > 0
        )
        cpus = 1 if avg_util < 0.75 else 2
        print(f"  --cpus-per-task={cpus}")
    else:
        print("  --cpus-per-task=1   # pipeline is mostly single-threaded")
    print()

if states:
    print(f"=== SLURM sacct summary ===")
    print(f"Array tasks in accounting: {sum(states.values())}")
    for state, count in sorted(states.items()):
        print(f"  {state}: {count}")
    if wall_sacct:
        print(f"  sacct Elapsed avg: {statistics.mean(wall_sacct):.1f}s")
    if rss_sacct:
        print(f"  sacct MaxRSS avg:  {statistics.mean(rss_sacct) / 1024:.0f} MB")
    print()
PY

if [[ -n "${SACCT_DUMP:-}" && -z "${SACCT_FILE:-}" ]]; then
  rm -f "$SACCT_DUMP"
fi
