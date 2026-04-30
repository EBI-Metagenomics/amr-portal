---
title: Download and developer access to AMR portal data
header_title: Download and developer access to AMR portal data
layout: "layouts/documentation.njk"
tags: usage

---

# Download and developer access to AMR portal data

## Accessing and using parquet data views

Data from the AMR portal is organised into [Apache parquet files](https://parquet.apache.org/docs/), which is a column-oriented data storage format. It is compatible with many programming languages including Python and R with its tabular data format compatible with many packages and languages using the data frame paradigm. Each view on the AMR portal is held as a single parquet file. Data files can be accessed from <https://ftp.ebi.ac.uk/pub/databases/amr_portal/releases>.

Using tools such as [DuckDB](https://duckdb.org/) (an in-process SQL OLAP database management system) you can query these data without needing to download them first, however for repeated local analysis we do recommend downloading.

```sql
SELECT count(distinct BioSample_ID) as biosample_count 
FROM read_parquet('https://ftp.ebi.ac.uk/pub/databases/amr_portal/releases/2025-11/phenotype.parquet')
```

Examples of how to work with these files in Python can be found in our [Python notebook repository](https://github.com/Ensembl/amr_portal_notebooks).

### Available data

We provide three parquet datasets

- Phenotypes: phenotypic experimental data collected from antibiograms
- Genotypes: AMR genes and mutations from _in silico_ methods
- Merged phenotype and genotype: Merge of the previous two datasets based on a join on `BioSample_ID`, `assembly_ID` and `antibiotic_ontology` (i.e. where the same sample, assembly and antibiotic have a record).

## Accessing annotated genomes

You can access genome annotation and AMRFinderPlus analysis from our FTP site at <https://ftp.ebi.ac.uk/pub/databases/amr_portal/genomes>. Genomes are indexed by their assembly accession (same as the assembly accession in the portal views) split by the type of assembly accession (ERZ or GCA), and then the first three and second three numbers of the accession.

```text
- ERZ
  |--/252
     |--/234
        |--/ERZ25223465
- GCA
  |--/000
     |--/194
        |--/GCA_000194885.2
```

Each directory contains a GFF annotation and TSV report. The formats are `{Assembly accession}_annotations.gff.gz` and `{Assembly accession}_annotations.gff.gz`.

## AMR portal parquet schemas

### `phenotype.parquet`: AMR phenotypes

| Field                       | Type     | Nullable   | Description                                                                                                              |
|:----------------------------|:---------|:-----------|:-------------------------------------------------------------------------------------------------------------------------|
| BioSample_ID                | `string` | No         | The unique identifier for the biological sample (e.g. SAMEA1028830)                                                      |
| SRA_accession               | `string` | Yes        | The SRA accession number                                                                                                 |
| assembly_ID                 | `string` | Yes        | The unique accession number of the genome assembly (e.g. GCA_001096525.1)                                                |
| collection_year             | `int32`  | Yes        | The year the sample was collected                                                                                        |
| ISO_country_code            | `string` | Yes        | The 3-letter ISO country code where the sample was collected (e.g. THA for Thailand)                                     |
| host                        | `string` | Yes        | The organism the sample was isolated from (e.g. Homo sapiens)                                                            |
| host_age                    | `string` | Yes        | The age of the host (empty/NULL in the sample data, but should be a string to allow for various formats or NULLs)        |
| host_sex                    | `string` | Yes        | The sex of the host (empty/NULL in the sample data)                                                                      |
| isolate                     | `string` | Yes        | A unique identifier for the specific isolate (e.g. SMRU2695)                                                             |
| isolation_source            | `string` | Yes        | The specific anatomical source or environment the isolate came from (e.g. nasopharynx)                                   |
| isolation_source_category   | `string` | Yes        | The general category of the isolation source (e.g. respiratory tract)                                                    |
| isolation_latitude          | `string` | Yes        | Geographic latitude for the sample                                                                                       |
| isolation_longitude         | `string` | Yes        | Geographic longitude for the sample                                                                                      |
| genus                       | `string` | No         | The genus of the organism (e.g. Streptococcus)                                                                           |
| organism                    | `string` | No         | The full name of the organism (e.g. Streptococcus pneumoniae)                                                            |
| AMR_associated_publications | `string` | Yes        | The PubMed ID of the publication associated with the data. Can be a set of values joined with a ;                        |
| Updated_phenotype_CLSI      | `string` | Yes        | The updated antimicrobial susceptibility testing (AST) phenotype based on CLSI standards (empty/NULL in the sample data) |
| Updated_phenotype_EUCAST    | `string` | Yes        | The updated AST phenotype based on EUCAST standards (empty/NULL in the sample data)                                      |
| used_ECOFF                  | `string` | Yes        | Indicates if the Epidemiological Cut-Off (ECOFF) was used (empty/NULL in the sample data)                                |
| database                    | `string` | Yes        | Database of annotation                                                                                                   |
| antibiotic_name             | `string` | Yes        | The name of the antibiotic tested (e.g. beta-lactams, trimethoprim-sulfamethoxazole)                                     |
| ast_standard                | `string` | Yes        | The standard or guideline used for Antimicrobial Susceptibility Testing (e.g. CLSI, EUCAST)                              |
| laboratory_typing_method    | `string` | Yes        | The method used to test the antibiotic sensitivity (e.g. disk diffusion, E-test)                                         |
| measurement                 | `string` | Yes        | The raw measurement value, typically MIC or zone size (e.g. 2, 1, 0.5, 12/0.125).                                        |
| measurement_sign            | `string` | Yes        | The sign indicating the nature of the measurement (e.g. '==' for exact value, or '>', '<')                               |
| measurement_units           | `string` | Yes        | The units for the measurement (e.g. mg/l)                                                                                |
| platform                    | `string` | Yes        | The platform used for analysis (empty/NULL in the sample data)                                                           |
| resistance_phenotype        | `string` | Yes        | The final result of the interpretation (e.g. susceptible, non-susceptible, resistant)                                    |
| species                     | `string` | No         | The species of the organism (e.g. Streptococcus pneumoniae)                                                              |
| antibiotic_ontology         | `string` | Yes        | An ontology ID for the antibiotic (e.g. ARO_3004024)                                                                     |
| antibiotic_ontology_link    | `string` | Yes        | Link to the ontology resource for the ID                                                                                 |
| country                     | `string` | Yes        | Full country name where the sample was collected from. Converted from `ISO_country_code`.                                |
| geographical_region         | `string` | Yes        | Geographical region as defined by UN M49. e.g Asia, Europe, Oceania, Africa or Americas.                                 |
| geographical_subregion      | `string` | Yes        | Geographical subregion as defined by UN M49. e.g.Eastern Asia, Northern Europe.                                          |

### `genotype.parquet`: AMR genotypes

| Field                    | Type     | Nullable   | Description                                                                                                                                              |
|:-------------------------|:---------|:-----------|:---------------------------------------------------------------------------------------------------------------------------------------------------------|
| BioSample_ID             | `string` | No         | The unique identifier for the biological sample (e.g., SAMEA1028830)                                                                                     |
| assembly_ID              | `string` | No         | The unique accession number of genome assembly (e.g., GCA_001096525.1)                                                                                   |
| genus                    | `string` | No         | The genus of the organism (e.g., Streptococcus)                                                                                                          |
| species                  | `string` | No         | The species name of the organism                                                                                                                         |
| organism                 | `string` | No         | The full name of the organism (e.g., Streptococcus pneumoniae)                                                                                           |
| isolate                  | `string` | Yes        | Isolate information                                                                                                                                      |
| taxon_id                 | `int64`  | No         | NCBI Taxonomy identifier of the organism                                                                                                                 |
| region                   | `string` | No         | Name of a genomic region                                                                                                                                 |
| region_start             | `int64`  | No         | Start of the annotated gene                                                                                                                              |
| region_end               | `int64`  | No         | End of the annotated gene                                                                                                                                |
| strand                   | `string` | No         | Strand of the annotated gene. '+' indicates the forward strand, '-' indicates the reverse strand                                                         |
| _bin                     | `int64`  | No         | UCSC bin number for the genomic region. See [UCSC's wiki](https://genomewiki.ucsc.edu/index.php/Bin_indexing_system) for further details. Internal field |
| id                       | `string` | No         | Identifier of the gene                                                                                                                                   |
| gene_symbol              | `string` | No         | Symbol of the gene                                                                                                                                       |
| amr_element_symbol       | `string` | No         | AMRFinderPlus assigned symbol for the AMR element                                                                                                        |
| element_type             | `string` | No         | Broad type of AMR element. Normally set to `AMR`                                                                                                         |
| element_subtype          | `string` | No         | Subtype of AMR element. Normally set to `AMR`                                                                                                            |
| class                    | `string` | No         | Overall class of AMR compound as given by AMRFinderPlus. Normally a broad representation of antibiotics                                                  |
| subclass                 | `string` | No         | Subclass of AMR compound as given by AMRFinderPlus. Can also be set to the same as class                                                                 |
| split_subclass           | `string` | No         | Subclass can represent multiple individual compounds separated by a '/'. This field contains the individual element of subclass.                         |
| antibiotic_name          | `string` | Yes        | Normalised name of the antibiotic tested (e.g., beta-lactams, trimethoprim-sulfamethoxazole)                                                             |
| antibiotic_ontology      | `string` | Yes        | Ontology ID for the antibiotic (e.g., ARO_3004024)                                                                                                       |
| antibiotic_ontology_link | `string` | Yes        | Link to ontology entry for the antibiotic                                                                                                                |
| evidence_accession       | `string` | Yes        | Accession number for evidence supporting the predicted AMR resistance                                                                                    |
| evidence_type            | `string` | Yes        | Type of evidence supporting the predicted AMR resistance                                                                                                 |
| evidence_link            | `string` | Yes        | Link to the evidence supporting the predicted AMR resistance                                                                                             |
| evidence_description     | `string` | Yes        | Evidence description supporting the predicted AMR resistance                                                                                             |

### `phenotype_genotype_merged.parquet`: Combined phenotypes and genotypes

| Field                       | Type     | Nullable   | Description                                                                                                                      |
|:----------------------------|:---------|:-----------|:---------------------------------------------------------------------------------------------------------------------------------|
| BioSample_ID                | `string` | No         | The unique identifier for the biological sample (e.g. SAMEA1028830)                                                              |
| assembly_ID                 | `string` | No         | The unique accession number of genome assembly (e.g., GCA_001096525.1)                                                           |
| antibiotic_ontology         | `string` | Yes        | An ontology ID for the antibiotic (e.g. ARO_3004024)                                                                             |
| SRA_accession               | `string` | Yes        | The SRA accession number                                                                                                         |
| collection_year             | `int32`  | Yes        | The year the sample was collected                                                                                                |
| ISO_country_code            | `string` | Yes        | The 3-letter ISO country code where the sample was collected (e.g. THA for Thailand)                                             |
| host                        | `string` | Yes        | The organism the sample was isolated from (e.g. Homo sapiens)                                                                    |
| host_age                    | `string` | Yes        | The age of the host (empty/NULL in the sample data, but should be a string to allow for various formats or NULLs)                |
| host_sex                    | `string` | Yes        | The sex of the host (empty/NULL in the sample data)                                                                              |
| isolate                     | `string` | Yes        | A unique identifier for the specific isolate (e.g. SMRU2695)                                                                     |
| isolation_source            | `string` | Yes        | The specific anatomical source or environment the isolate came from (e.g. nasopharynx)                                           |
| isolation_source_category   | `string` | Yes        | The general category of the isolation source (e.g. respiratory tract)                                                            |
| lat_lon                     | `string` | Yes        | Geographic coordinates (latitude and longitude)                                                                                  |
| AMR_associated_publications | `string` | Yes        | The PubMed ID of the publication associated with the data                                                                        |
| used_ECOFF                  | `string` | Yes        | Indicates if the Epidemiological Cut-Off (ECOFF) was used (empty/NULL in the sample data)                                        |
| database                    | `string` | Yes        | Database of annotation                                                                                                           |
| antibiotic_name             | `string` | Yes        | The name of the antibiotic tested (e.g. beta-lactams, trimethoprim-sulfamethoxazole)                                             |
| ast_standard                | `string` | Yes        | The standard or guideline used for Antimicrobial Susceptibility Testing (e.g. CLSI, EUCAST)                                      |
| laboratory_typing_method    | `string` | Yes        | The method used to test the antibiotic sensitivity (e.g. disk diffusion, E-test)                                                 |
| measurement                 | `string` | Yes        | The raw measurement value, typically MIC or zone size (e.g. 2, 1, 0.5). FLOAT is used for non-integer numeric values             |
| measurement_sign            | `string` | Yes        | The sign indicating the nature of the measurement (e.g. '==' for exact value, or '>', '<')                                       |
| measurement_units           | `string` | Yes        | The units for the measurement (e.g. mg/l)                                                                                        |
| platform                    | `string` | Yes        | The platform used for analysis (empty/NULL in the sample data)                                                                   |
| resistance_phenotype        | `string` | Yes        | The final result of the interpretation (e.g. susceptible, non-susceptible, resistant)                                            |
| antibiotic_ontology_link    | `string` | Yes        | Link to the ontology resource for the ID                                                                                         |
| country                     | `string` | Yes        | Full country name where the sample was collected from. Converted from `ISO_country_code`.                                        |
| geographical_region         | `string` | Yes        | Geographical region as defined by UN M49. e.g Asia, Europe, Oceania, Africa or Americas.                                         |
| geographical_subregion      | `string` | Yes        | Geographical subregion as defined by UN M49. e.g.Eastern Asia, Northern Europe.                                                  |
| genus                       | `string` | No         | The genus of the organism (e.g., Streptococcus)                                                                                  |
| species                     | `string` | No         | The species name of the organism                                                                                                 |
| organism                    | `string` | No         | The full name of the organism (e.g., Streptococcus pneumoniae)                                                                   |
| isolate                     | `string` | Yes        | Isolate information                                                                                                              |
| taxon_id                    | `int64`  | No         | NCBI Taxonomy identifier of the organism                                                                                         |
| region                      | `string` | No         | Name of a genomic region                                                                                                         |
| region_start                | `int64`  | No         | Start of the annotated gene                                                                                                      |
| region_end                  | `int64`  | No         | End of the annotated gene                                                                                                        |
| strand                      | `string` | No         | Strand of the annotated gene. '+' indicates the forward strand, '-' indicates the reverse strand                                 |
| id                          | `string` | No         | Identifier of the gene                                                                                                           |
| gene_symbol                 | `string` | No         | Symbol of the gene                                                                                                               |
| amr_element_symbol          | `string` | No         | AMRFinderPlus assigned symbol for the AMR element                                                                                |
| element_type                | `string` | No         | Broad type of AMR element. Normally set to `AMR`                                                                                 |
| element_subtype             | `string` | No         | Subtype of AMR element. Normally set to `AMR`                                                                                    |
| class                       | `string` | No         | Overall class of AMR compound as given by AMRFinderPlus. Normally a broad representation of antibiotics                          |
| subclass                    | `string` | No         | Subclass of AMR compound as given by AMRFinderPlus. Can also be set to the same as class                                         |
| split_subclass              | `string` | No         | Subclass can represent multiple individual compounds separated by a '/'. This field contains the individual element of subclass. |
| evidence_accession          | `string` | Yes        | Accession number for evidence supporting the predicted AMR resistance                                                            |
| evidence_type               | `string` | Yes        | Type of evidence supporting the predicted AMR resistance                                                                         |
| evidence_link               | `string` | Yes        | Link to the evidence supporting the predicted AMR resistance                                                                     |
| evidence_description        | `string` | Yes        | Evidence description supporting the predicted AMR resistance                                                                     |
