## amrfinder_data_prep

Basic tool for creating a AMR portal genotype dataset from AMRFinder data

## What does it do?

For a given release folder and config it does the following
1. Creates a directory in the CWD based on the release name
2. Selects and downloads all files from the FTP location that starts with the target string
3. Pulls GCA from selected file names
4. Gets organisim name and taxonomy id for each GCA from NCBI
5. Checks all files have compatible headers
6. merges all files and injects additional columns taken from NCBI into a single CSV file called `amrfiner.csv`
7. Replaces ` ` with `_` for column names

## Current NCBI api

Pulling from https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/GCF_001095465.1/dataset_report

Any field that you would like to add to the selected FTP files can be added to the config (config/amrfinder.config)