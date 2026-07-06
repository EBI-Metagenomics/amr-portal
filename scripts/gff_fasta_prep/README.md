# GFF / FASTA prep

Prepares annotation GFF and assembly FASTA files for the gene viewer: splits embedded FASTA from NCBI-style GFF, block-gzips and tabix-indexes the GFF, and indexes the FASTA.

## Layout

| File | Responsibility |
|------|----------------|
| `prepare_gff_fasta_indexes.sh` | Entrypoint: single file or directory scan |
| `generate_gff_file_list.sh` | Build sorted work list for SLURM arrays |
| `submit_gff_prep_array.slurm` | SLURM array job template (records per-task metrics) |
| `verify_processed_outputs.py` | Random spot-check of processed outputs |
| `tests/test_verify_processed_outputs.py` | Unit tests for output validation logic |
| `lib/cli.sh` | Argument parsing and usage |
| `lib/background.sh` | `nohup` detach for long interactive runs |
| `lib/discovery.sh` | Find and validate `*_annotations.gff.gz` |
| `lib/paths.sh` | Assembly accession derivation and skip checks |
| `lib/process.sh` | Split, sort, bgzip, tabix, and FASTA indexing |
| `lib/common.sh` | Shared logging |

## Usage

### Directory mode (sequential)

```bash
./prepare_gff_fasta_indexes.sh /path/to/genomes
./prepare_gff_fasta_indexes.sh /path/to/genomes --background
```

### Single file mode (SLURM array tasks)

```bash
./prepare_gff_fasta_indexes.sh --gff-file /path/to/ERZ25201620_annotations.gff.gz
```

Each genome directory should contain `{ACCESSION}_annotations.gff.gz`. Sibling files such as `{ACCESSION}_amrfinderplus.tsv.gz` are ignored. Already-processed genomes are skipped when `.csi` and `.fasta.gz.fai` exist.

## SLURM array (large batches)

Each genome takes only ~1–2 seconds, so **one array task per genome is inefficient** (scheduler + conda overhead dominates) and 170K also exceeds the cluster `MaxArraySize`. Instead, each array task processes a **chunk** of `CHUNK_SIZE` genomes (default 500).

```bash
cd scripts/gff_fasta_prep

# 1. Build work list (once) — searches recursively for *_annotations.gff.gz
./generate_gff_file_list.sh --genomes-dir /path/to/genomes --output gff_files.lst

# 2. Compute number of array tasks from list size and chunk size
N=$(wc -l < gff_files.lst)
CHUNK=500
TASKS=$(( (N + CHUNK - 1) / CHUNK ))     # ceil(N / CHUNK)
mkdir -p logs

# 3. Pilot: first few chunks
JOB_ID=$(sbatch --parsable --export=ALL,CHUNK_SIZE=$CHUNK \
  --array=1-2%2 submit_gff_prep_array.slurm)

# 4. After pilot finishes, summarize wall time / memory
./summarize_pilot_metrics.sh logs/gff-prep-metrics.tsv "$JOB_ID"

# If wall_sec / MaxRSS columns are empty, sacct is used automatically.
# You can also save sacct output explicitly:
#   sacct -j "$JOB_ID" --format=JobID,State,Elapsed,TotalCPU,MaxRSS,AllocCPUS,ExitCode -P -n > logs/pilot.sacct.tsv
#   SACCT_FILE=logs/pilot.sacct.tsv ./summarize_pilot_metrics.sh logs/gff-prep-metrics.tsv

# 5. Full run
sbatch --export=ALL,CHUNK_SIZE=$CHUNK --array=1-${TASKS}%50 submit_gff_prep_array.slurm
```

Metrics and failures are still recorded **per genome** (not per chunk): each genome appends one row to `logs/gff-prep-metrics.tsv`, and any failing genome appends its path to `logs/gff-prep-failed.lst`.

**Important:** run `sbatch` from `scripts/gff_fasta_prep`. SLURM copies the job script to a spool directory; the script uses `SLURM_SUBMIT_DIR` to find `lib/` and write logs/metrics in the right place.

### Choosing CHUNK_SIZE and resources

At ~1.5s/genome:

| CHUNK_SIZE | Genomes/task | Approx task time | Tasks for 170K |
|-----------|--------------|------------------|----------------|
| 200 | 200 | ~5 min | 850 |
| 500 | 500 | ~12 min | 340 |
| 1000 | 1000 | ~25 min | 170 |

Keep total tasks under `MaxArraySize` (check with `scontrol show config | grep MaxArraySize`). Suggested resources (pipeline is single-threaded):

| Setting | Value |
|---------|-------|
| `--cpus-per-task` | 1 |
| `--mem` | 4G |
| `--time` | 2:00:00 (headroom for a full chunk) |
| Array concurrency | `%50`–`%100` |

Override paths and chunk size when submitting:

```bash
sbatch --export=ALL,GFF_LIST=/data/gff_files.lst,CONDA_ENV=gff-tools,CHUNK_SIZE=500 \
  --array=1-340%50 submit_gff_prep_array.slurm
```

## Re-running failed tasks

Failed GFF paths are collected automatically in `logs/gff-prep-failed.lst`. To re-run only those, feed that file back in as the work list. Failures are usually few, so use `CHUNK_SIZE=1` (one task per genome) for easy per-genome logs:

```bash
cd scripts/gff_fasta_prep

# Start clean so a new failed list is written for this retry
mv logs/gff-prep-failed.lst logs/gff-prep-retry.lst
N=$(wc -l < logs/gff-prep-retry.lst)
sbatch --export=ALL,GFF_LIST=logs/gff-prep-retry.lst,CHUNK_SIZE=1 \
  --array=1-${N}%50 submit_gff_prep_array.slurm
```

Already-processed genomes are skipped on re-run (`.csi` + `.fasta.gz.fai` present), so re-submitting is always safe.

## Verify processed outputs

After a run (or on a random sample from the full 170K), spot-check that outputs look correct:

```bash
# Random sample from the work list (recommended after full run)
./verify_processed_outputs.py --gff-list gff_files.lst --sample 20 --seed 42

# Or scan a genomes tree directly
./verify_processed_outputs.py --genomes-dir /path/to/genomes --sample 10
```

Each genome is checked for:

- `{ACCESSION}_annotations.gff.gz` + `.csi`
- `{ACCESSION}.fasta.gz` + `.fasta.gz.fai`
- No leftover `.tmp.gff` or plain `.fasta`
- GFF no longer contains embedded `##FASTA`
- `bgzip -t`, `tabix -l`, and `samtools faidx` (when available)

Run unit tests locally:

```bash
python3 tests/test_verify_processed_outputs.py -v
```

## Dependencies

`gunzip`, `awk`, `grep`, `sort`, `bgzip`, `tabix`, `samtools`, `nohup`
