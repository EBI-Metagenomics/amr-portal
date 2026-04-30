---
title: Using the AMR Portal
description: How to use the Antimicrobial resistance portal
tags: usage
layout: "layouts/documentation.njk"
---

# How to use the Antimicrobial resistance (AMR) portal

The antimicrobial resistance (AMR) portal contains three main data resources

- **AMR phenotypes**  - AMR was determined experimentally and taken from
  CABBAGE antibiograms catalogue.
- **AMR genotypes** - AMR was predicted computationally using
  Genotype data.
- **Combined phenotypes and genotypes** - AMR for which both phenotypic and genotypic
  data is available.

## How to access portal data via FTP

Genome annotation (available in GFF format) and AMFinderPlus results are available [from our genomes FTP site](https://ftp.ebi.ac.uk/pub/databases/amr_portal/genomes/). Our denormalised AMR data representations are available in parquet, CSV and DuckDB formats all of which are available from our [releases FTP site](https://ftp.ebi.ac.uk/pub/databases/amr_portal/releases/). Information on how to navigate and use these resources are available via our [download and developer documentation pages](/developers).

## How to explore the AMR data in the portal

You can explore the three antimicrobial resistance (AMR) data resources
by selecting one of the links on the home page ie 'Experimental AMR'.

<figure>
  <img src="/assets/images/content/howto/home-page-amr-f1.webp" />
  <figcaption>
    Fig 1. A view of the antimicrobial resistance portal home page showing links to all three data resources AMR phenotypes, AMR genotypes and Experimental and Combined phenotypes and genotypes.
  </figcaption>
</figure>

The will take you to the data set ie AMR phenotypes and a
view of the antibiotics for which experimental antimicrobial resistance
data is available.

<figure>
  <img src="/assets/images/content/howto/experimental-amr-f2.png" />
  <figcaption> 
    Fig 2. A view of the AMR phenotypes data resource showing the antibiotics for which experimental AMR data is available.
  </figcaption>
</figure>

### How to choose an AMR data resource

To choose an alternative AMR data resource select either

- AMR genotypes
or
- Combined phenotypes and genotypes

under the 'Data' heading in the left hand column, both are highlighted
in blue.

## How to use the AMR data resource

### Selecting AMR data for antibiotics

The AMR data resource selected will show a view of the antibiotics for
which antimicrobial resistance data is available by default.

To select antibiotics of interest:

- Select the check box one or more antibiotics of interest e.g.
  azithromycin was selected in the example shown below.
- You can scroll through available checkboxes by moving the horizontal
  scroll bar under the list of checkboxes to the right.

<figure>
  <img src="/assets/images/content/howto/azithromycin-amr-f3.png" />
  <figcaption>
    Fig 3. A view showing the selection of azithromycin from list of antibiotics for which experimental anti-microbial resistance data is available.
  </figcaption>
</figure>

A table of results will be showed on the bottom half of the screen,
below the antibiotic table.

<figure>
  <img src="/assets/images/content/howto/azithromycin-results-table-amr-f4.png" />
  <figcaption>
    Fig 4. A view showing the table of results for azithromycin from the experimental antimicrobial resistance data resource.
  </figcaption>
</figure>

### How to filter the data

The additional ways each antimicrobial resistance data resource can be
filtered are listed alongside the 'Filter by' header at the top of the
antibiotic table.

Each of the three AMR data resources has a specific set of filters.

eg In the view shown below for AMR phenotypes the data can be further
filtered by:

- Species
- Genus
- Resistance phenotype
- Isolation source category
- Testing method
- Collection year
- Geographical subregion
- Country

<figure>
  <img src="/assets/images/content/howto/species-amr-f5.png" />
  <figcaption>
    Fig 5. A view highlighting the Species filter in the horizontal list of all filters available for the AMR phenotypes data.
  </figcaption>
</figure>

AMR genotypes data can be filtered by:

- Species
- Genus
- AMR class

Combined phenotypes and genotypes data can be filtered by:

- Species
- Genus
- Resistance Phenotype - (select true to show phenotypic data)
- Isolation source category  (select true to show those with genotype data - select
  false to show those without genotype data )  
- Testing method
- Collection year  
- Geographical subregion
- Country

To filter the data:

- Find a filter of interest alongside the \"Filter by\" header,
  highlighted in blue, ie Species.
- Select the filter ie Species Click on the check box alongside a
  species of interest to begin subsetting the data.
- You can scroll through available checkboxes by moving the horizontal
  scroll bar under the list of checkboxes to the right.
- You may continue to add any filter available for an AMR data resource
  by repeating this process.
- A reduced and more specific table of results will be displayed on the
  bottom half of the page as additional filters are added.
- If you swap to another AMR data resource, the filter criteria will
  change to fit the new resource.

<figure>
  <img src="/assets/images/content/howto/species-selected-amr-f6.png" />
  <figcaption>
    Fig 6. A view showing the selection of a species e.g. Escherichia coli from the Species filter and highlighting the subsequent reduction in the number of results for experimental antimicrobial resistance to azithromycin for AMR phenotypes data.
  </figcaption>
</figure>

## What can you find in the results table?

The results table displays all the available information for each data
point in the AMR data resource used.

The information displayed in the results table for each AMR data
resource is different.

For example the AMR phenotype resource results table displays:

- Antibiotic name
- Antibiotic abbreviation
- Resistance phenotype
- Ast standard
- Laboratory typing method
- Platform
- Biosample ID
- Assembly ID
- Genus
- Species
- Organism
- Host
- INSDC secondary accession
- Antibiotic ontology
- Collection year
- ISO country code
- Host age
- Isolate
- Isolation source
- Lat long
- AMR associated publications
- Updated phenotype CLSI	
- Updated phenotype EUCAST	
- Used ECOFF	
- Source	
- Country
- Geographical region	
- Geographical subregion

Different information is displayed in the results table for 

- AMR genotypes**
- Combined phenotypes and genotypes

<figure>
  <img src="/assets/images/content/howto/results-table-azith-species-amr-f7.png" />
  <figcaption>
    Fig 7. A view of the results table for isolates of *Escherichia coli* resistant to azithromycin from the AMR phenotypes data resource.
  </figcaption> 
  </figcaption>
</figure>

The results table has many columns which are off screen and can be viewed by
moving the scroll bar on the bottom of the results table to the right.

The number of rows in the results table will depend on how you have
filtered the data.

### How to navigate the results table

- To **reveal all the columns** in the results table - move the scroll
  bar on the bottom of the results table to the right.

- To **reveal all the rows** in the table move the scroll bar on far right
  of the results table down.

<figure>
  <img src="/assets/images/content/howto/scrolling-results-table-amr-f8.png" />
  <figcaption>
    Fig 8. A view showing the horizontal and vertical scroll bars in the results table. 
</figure>

### How to navigate the results table

- To **change the number of results** displayed per page by using the
  drop-down menu.

<figure>
  <img src="/assets/images/content/howto/items-on-a-page-results-table-amr-f9.png" />
  <figcaption>
    Fig 9. A view highlighting where to change the number of rows displayed in the results table.
  </figcaption>
</figure>

- To **clear your results** click on the blue recycle bin icon on the
  right hand side of the results table.

<figure>
  <img src="/assets/images/content/howto/results-table-delete-amr-f10.png"/>
  <figcaption>
    Fig 10. A view highlighting the blue bin icon which you select to delete the results table. 
  </figcaption>
</figure>

### How to download the results table

To **download the results** table

- select the download arrow on the right hand side of the results table.

<figure>
  <img src="/assets/images/content/howto/results-table-download-amr-f11.png" />
  <figcaption>
    Fig 11. A view highlighting the download icon which you need to select to download the results table. 
  </figcaption>
</figure>

- select the download button and a CSV version of the results table will be downloaded onto your computer.

<figure>
   <img src="/assets/images/content/howto/results-download-button-amr-f12.png" />
  <figcaption>
    Fig 12. A view highlighting the download button which you need to select to download the results table. 
  </figcaption>
</figure>