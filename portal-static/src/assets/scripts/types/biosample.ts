export type BiosampleDBRecord = {
  BioSample_ID: string;
  genus: string;
  species: string | null; // several dozens of nulls in db
  Antibiotic_name: string;
  Antibiotic_abbreviation: string | null; // many nulls in db
  Study_ID: string | null;
  SRA_sample: string | null;
  SRA_run: string | null; // no guarantee that sra_sample and sra_run are both always null or always not null
  Assembly_ID: string | null; // many nulls in db
  phenotype: string | null; // many nulls in db
  measurement_value: string; // always exists; represents some kind of number; although occasionally has values such as 16/8
  measurement_sign: string | null;
  measurement_unit: string | null;
  isolation_context: string | null;
  isolation_source: string | null;
  isolation_latitude: string | null; // empty data represented with string 'nan'
  isolation_longitude: string | null; // empty data represented with string 'nan'
  platform: string;
  laboratory_typing_platform: string | null;
  laboratory_typing_method: string | null;
  collection_date: number | null;
};

export type BiosampleRecord = {
  biosample_id: string;
  genus: string;
  species: string | null; // several dozens of nulls in db
  antibiotic_name: string;
  antibiotic_abbreviation: string | null; // many nulls in db
  study_id: string | null;
  sra_sample: string | null;
  sra_run: string | null; // no guarantee that sra_sample and sra_run are both always null or always not null
  assembly: {
    accession_id: string;
    url: string;
  } | null;
  phenotype: string | null; // many nulls in db
  measurement: {
    value: string;
    sign: string | null;
    unit: string | null;
  };
  isolation_context: string | null;
  isolation_source: string | null;
  platform: string;
  laboratory_typing_platform: string | null;
  laboratory_typing_method: string | null;
  isolation_latitude: string | null; // empty data represented with string 'nan'
  isolation_longitude: string | null; // empty data represented with string 'nan'
  collection_date: number | null;
};


/**

┌────────────────────────────┬─────────────┬─────────┬─────────┬─────────┬─────────┐
│        column_name         │ column_type │  null   │   key   │ default │  extra  │
│          varchar           │   varchar   │ varchar │ varchar │ varchar │ varchar │
├────────────────────────────┼─────────────┼─────────┼─────────┼─────────┼─────────┤
│ BioSample_ID               │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ SRA_sample                 │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ Study_ID                   │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ isolate_name               │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ SRA_run                    │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ Assembly_ID                │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ platform                   │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ genus                      │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ species                    │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ Antibiotic_abbreviation    │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ Antibiotic_name            │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ measurement_sign           │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ measurement_value          │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ measurement_unit           │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ phenotype                  │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ Updated_phenotype_CLSI     │ DOUBLE      │ YES     │ NULL    │ NULL    │ NULL    │
│ Updated_phenotype_EUCAST   │ DOUBLE      │ YES     │ NULL    │ NULL    │ NULL    │
│ laboratory_typing_method   │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ laboratory_typing_platform │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ testing_standard           │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ testing_standard_year      │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ Pubmed_ID                  │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ isolation_context          │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ isolation_source           │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ host_sex                   │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ host_age                   │ DOUBLE      │ YES     │ NULL    │ NULL    │ NULL    │
│ isolation_country          │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ isolation_longitude        │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ isolation_latitude         │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ collection_date            │ DOUBLE      │ YES     │ NULL    │ NULL    │ NULL    │
│ flag_int                   │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
│ flag_str                   │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
│ source_file                │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
├────────────────────────────┴─────────────┴─────────┴─────────┴─────────┴─────────┤
│ 33 rows                                                                6 columns │
└──────────────────────────────────────────────────────────────────────────────────┘





What does this mean (measurement in absence of phenotype)?

select phenotype, measurement_value from '~/development/amr-portal/step1_merge_all_v7.parquet' where phenotype is null;
┌───────────┬───────────────────┐
│ phenotype │ measurement_value │
│  varchar  │      varchar      │
├───────────┼───────────────────┤
│ NULL      │ 0.25              │
│ NULL      │ 0.03              │
│ NULL      │ 0.015             │
│ NULL      │ 0.5               │
│ NULL      │ 0.015             │
│ NULL      │ 0.03              │
│ NULL      │ 4                 │
│ NULL      │ 0.5               │
│ NULL      │ 0.25              │
│ NULL      │ 0.06              │
│ NULL      │ 16                │
│ NULL      │ 0.5               │
│ NULL      │ 0.03              │
│ NULL      │ 0.03              │
│ NULL      │ 16                │
│ NULL      │ 1                 │
│ NULL      │ 0.25              │
│ NULL      │ 0.032             │
│ NULL      │ 0.004             │
│ NULL      │ 0.5               │
│  ·        │  ·                │
│  ·        │  ·                │
│  ·        │  ·                │
│ NULL      │ 8.0               │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 3.0               │
│ NULL      │ 3.0               │
│ NULL      │ 3.0               │
│ NULL      │ 2.0               │
│ NULL      │ 128.0             │
│ NULL      │ 2.0               │
│ NULL      │ 0.06              │
│ NULL      │ 0.016             │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 2.0               │
│ NULL      │ 0.125             │
│ NULL      │ 0.125             │
├───────────┴───────────────────┤
│    788039 rows (40 shown)     │
└───────────────────────────────┘



SELECT measurement_value FROM '~/development/amr-portal/step1_merge_all_v7.parquet' WHERE TRY_CAST(measurement_value AS DOUBLE) IS NULL;
┌───────────────────┐
│ measurement_value │
│      varchar      │
├───────────────────┤
│ 2/38              │
│ 16/8              │
│ 64/4              │
│ 2/38              │
│ 16/8              │
│ 32/4              │
│ 16/8              │
│ 64/4              │
│ 0.5/9             │
│ 16/8              │
│ 64/4              │
│ 2/38              │
│ 16/8              │
│ 64/4              │
│ 2/38              │
│ 16/8              │
│ 64/4              │
│ 2/38              │
│ 16/8              │
│ 2/38              │
│  ·                │
│  ·                │
│  ·                │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
│ 0.5/9.5           │
├───────────────────┤
│    44584 rows     │
│    (40 shown)     │
└───────────────────┘

 */