# GFF / FASTA prep

Prepares annotation GFF and assembly FASTA files for the gene viewer: splits embedded FASTA from NCBI-style GFF, block-gzips and tabix-indexes the GFF, and indexes the FASTA.

## Layout

| File | Responsibility |
|------|----------------|
| `prepare_gff_fasta_indexes.sh` | Entrypoint: single file or directory scan |
| `generate_gff_file_list.sh` | Build sorted work list for SLURM arrays |
| `submit_gff_prep_array.slurm` | SLURM array job template |
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

# 1. Build work list (once)
./generate_gff_file_list.sh /path/to/genomes gff_files.lst

# 2. Pilot on first 100 genomes
N=$(wc -l < gff_files.lst)
mkdir -p logs
sbatch --array=1-100%20 submit_gff_prep_array.slurm

# 3. Check a few tasks, then submit full run
sbatch --array=1-${N}%100 submit_gff_prep_array.slurm
```

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

Re-submit failed tasks only:

```bash
sbatch --array=1234,5678,9012 submit_gff_prep_array.slurm
```

## Dependencies

`gunzip`, `awk`, `grep`, `sort`, `bgzip`, `tabix`, `samtools`, `nohup`
