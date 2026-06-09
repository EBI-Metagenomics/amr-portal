-- =============================================================================
-- global_search: unified search projection for AMR portal global search
-- =============================================================================
--
-- Purpose
--   Materialises one row per searchable source record across phenotype,
--   genotype, and pheno_geno_merged. Each row stores join-back keys so API
--   queries can resolve FTS hits to the correct source table row.
--
-- Prerequisites
--   - DuckDB database with source tables already loaded:
--       phenotype, genotype, pheno_geno_merged
--
-- Idempotency
--   Safe to re-run. Uses CREATE OR REPLACE TABLE so the table is rebuilt from
--   current source data. Always re-run 02_create_fts_index.sql afterwards
--   because rowids in this table change on every rebuild.
--
-- Searchable fields (indexed in step 02)
--   Sample accession  : BioSample_ID
--   Genome accession  : assembly_ID
--   SRA accession     : SRA_accession (phenotype + merged only)
--   Gene / AMR locus  : id, gene_symbol, amr_element_symbol (genotype + merged)
--   Antibiotic name   : antibiotic_name
--
-- source_table values map to portal views (see view.dataset):
--   phenotype         -> view_id 1 (AMR phenotypes)
--   genotype          -> view_id 2 (AMR genotypes)
--   pheno_geno_merged -> view_id 3 (Combined phenotypes and genotypes)
-- =============================================================================

CREATE OR REPLACE TABLE global_search AS
SELECT
    'phenotype' AS source_table,
    rowid AS source_rowid,
    CAST(BioSample_ID AS VARCHAR) AS BioSample_ID,
    CAST(SRA_accession AS VARCHAR) AS SRA_accession,
    CAST(assembly_ID AS VARCHAR) AS assembly_ID,
    CAST(NULL AS VARCHAR) AS id,
    CAST(NULL AS VARCHAR) AS gene_symbol,
    CAST(NULL AS VARCHAR) AS amr_element_symbol,
    CAST(antibiotic_name AS VARCHAR) AS antibiotic_name
FROM phenotype

UNION ALL

SELECT
    'genotype' AS source_table,
    rowid AS source_rowid,
    CAST(BioSample_ID AS VARCHAR) AS BioSample_ID,
    CAST(NULL AS VARCHAR) AS SRA_accession,
    CAST(assembly_ID AS VARCHAR) AS assembly_ID,
    CAST(id AS VARCHAR) AS id,
    CAST(gene_symbol AS VARCHAR) AS gene_symbol,
    CAST(amr_element_symbol AS VARCHAR) AS amr_element_symbol,
    CAST(antibiotic_name AS VARCHAR) AS antibiotic_name
FROM genotype

UNION ALL

SELECT
    'pheno_geno_merged' AS source_table,
    rowid AS source_rowid,
    CAST(BioSample_ID AS VARCHAR) AS BioSample_ID,
    CAST(SRA_accession AS VARCHAR) AS SRA_accession,
    CAST(assembly_ID AS VARCHAR) AS assembly_ID,
    CAST(id AS VARCHAR) AS id,
    CAST(gene_symbol AS VARCHAR) AS gene_symbol,
    CAST(amr_element_symbol AS VARCHAR) AS amr_element_symbol,
    CAST(antibiotic_name AS VARCHAR) AS antibiotic_name
FROM pheno_geno_merged;
