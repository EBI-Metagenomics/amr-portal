# GFF / FASTA prep

Prepares annotation GFF and assembly FASTA files for the gene viewer: splits embedded FASTA from NCBI-style GFF, block-gzips and tabix-indexes the GFF, and indexes the FASTA.

## Layout

| File | Responsibility |
|------|----------------|
| `prepare_gff_fasta_indexes.sh` | Entrypoint: single file or directory scan |
| `generate_gff_file_list.sh` | Build sorted work list for SLURM arrays |
| `submit_gff_prep_array.slurm` | SLURM array job template (records per-task metrics) |
| `summarize_pilot_metrics.sh` | Average / p95 wall time and memory from pilot |
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

For ~170K genomes, use one array task per GFF file rather than one long sequential job.

```bash
cd scripts/gff_fasta_prep

# 1. Build work list (once) — searches recursively for *_annotations.gff.gz
./generate_gff_file_list.sh --genomes-dir /path/to/genomes --output gff_files.lst

# 2. Pilot on first 100 genomes (must sbatch from this directory)
N=$(wc -l < gff_files.lst)
mkdir -p logs
JOB_ID=$(sbatch --parsable --array=1-100%20 submit_gff_prep_array.slurm)

# 3. After pilot finishes, summarize wall time / memory
./summarize_pilot_metrics.sh logs/gff-prep-metrics.tsv "$JOB_ID"

# 4. Submit full run using suggested --mem / --time from the summary
sbatch --array=1-${N}%100 submit_gff_prep_array.slurm
```

Each array task appends one row to `logs/gff-prep-metrics.tsv` (wall time, MaxRSS, skipped/processed/failed). Use the pilot summary to pick resources for the full run.

**Important:** run `sbatch` from `scripts/gff_fasta_prep`. SLURM copies the job script to a spool directory; the script uses `SLURM_SUBMIT_DIR` to find `lib/` and write logs/metrics in the right place.

Failed tasks also append their GFF path to `logs/gff-prep-failed.lst` (one per line), so you can re-run just the failures without re-scanning the tree.

Suggested per-task resources (tune after pilot):

| Setting | Value |
|---------|-------|
| `--cpus-per-task` | 2 |
| `--mem` | 16G |
| `--time` | 1:00:00 |
| Array concurrency | `%50`–`%200` |

Override paths when submitting:

```bash
sbatch --export=ALL,GFF_LIST=/data/gff_files.lst,CONDA_ENV=gff-tools \
  --array=1-170000%100 submit_gff_prep_array.slurm
```

## Re-running failed tasks

Failed GFF paths are collected automatically in `logs/gff-prep-failed.lst`. To re-run only those, feed that file back in as the work list:

```bash
cd scripts/gff_fasta_prep

# Re-run failures as a fresh array (start clean so a new failed list is written)
mv logs/gff-prep-failed.lst logs/gff-prep-retry.lst
N=$(wc -l < logs/gff-prep-retry.lst)
sbatch --export=ALL,GFF_LIST=logs/gff-prep-retry.lst \
  --array=1-${N}%50 submit_gff_prep_array.slurm
```

Already-processed genomes are skipped on re-run (`.csi` + `.fasta.gz.fai` present), so re-submitting is always safe. If you instead know the specific array indices, you can target them directly:

```bash
sbatch --array=1234,5678,9012 submit_gff_prep_array.slurm
```

## Dependencies

`gunzip`, `awk`, `grep`, `sort`, `bgzip`, `tabix`, `samtools`, `nohup`
