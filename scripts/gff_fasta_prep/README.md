# GFF / FASTA prep

Prepares annotation GFF and assembly FASTA files for the gene viewer: splits embedded FASTA from NCBI-style GFF, block-gzips and tabix-indexes the GFF, and indexes the FASTA.

## Layout

| File | Responsibility |
|------|----------------|
| `prepare_gff_fasta_indexes.sh` | Entrypoint: parse CLI, optionally detach, scan directory |
| `lib/cli.sh` | Argument parsing and usage |
| `lib/background.sh` | `nohup` detach for long cluster runs |
| `lib/discovery.sh` | Find `*_annotations.gff.gz` files (ignores `*_amrfinderplus.tsv.gz`) |
| `lib/paths.sh` | Assembly accession derivation and skip checks |
| `lib/process.sh` | Split, sort, bgzip, tabix, and FASTA indexing |
| `lib/common.sh` | Shared logging |

## Usage

```bash
./prepare_gff_fasta_indexes.sh /path/to/genomes
./prepare_gff_fasta_indexes.sh /path/to/genomes --background
```

Each genome directory should contain `{ACCESSION}_annotations.gff.gz`. Already-processed genomes are skipped when `.csi` and `.fasta.gz.fai` exist.

## Dependencies

`gunzip`, `awk`, `grep`, `sort`, `bgzip`, `tabix`, `samtools`, `nohup`
