---
title: Using the AMR Portal
description: How to use the Antimicrobial resistance portal
tags: usage
layout: "layouts/documentation.njk"
---

# How to use the Antimicrobial resistance (AMR) portal

The antimicrobial resistance (AMR) portal contains three main data resources:

- **AMR phenotypes**  - AMR was determined experimentally and taken from
  CABBAGE antibiograms catalogue.
- **AMR genotypes** - AMR was predicted computationally using
  Genotype data.
- **Combined phenotypes and genotypes** - AMR for which both phenotypic and genotypic
  data is available.

## How to access portal data via FTP

Genome annotation (available in GFF format) and AMFinderPlus results are available [from our genomes FTP site](https://ftp.ebi.ac.uk/pub/databases/amr_portal/genomes/). Our denormalised AMR data representations are available in parquet, CSV and DuckDB formats all of which are available from our [releases FTP site](https://ftp.ebi.ac.uk/pub/databases/amr_portal/releases/). Information on how to navigate and use these resources are available via our [download and developer documentation pages](/developers).

## How to explore the AMR data in the portal

You can start exploring from the [portal home page](/). The home page provides:

- A **global search** box that searches across combined phenotypes and genotypes.
- Links to each of the three data resources: **AMR phenotypes**, **AMR genotypes**, and **Combined phenotypes and genotypes**.

<figure>
  <img src="/assets/images/content/howto/home-page-amr-f1.png" alt="AMR portal home page with global search and links to the three data resources" />
  <figcaption>
    Fig 1. The portal home page. Use the search box to jump straight to matching records, or choose one of the three data resources (AMR phenotypes, AMR genotypes and Experimental, and Combined phenotypes and genotypes) below.
  </figcaption>
</figure>

Selecting a data-resource link opens the data explorer with a **faceted search panel** on the left and a **results table** on the right.

<figure>
  <img src="/assets/images/content/howto/portal-overview-f2.png" alt="AMR data explorer showing the facet sidebar and results table" />
  <figcaption>
    Fig 2. The data explorer. Faceted filters are in the left panel; matching records appear in the table on the right.
  </figcaption>
</figure>

### Choosing a data resource

Within the explorer, switch between data resources using the **Result type** cards at the top of the left panel:

- AMR phenotypes
- AMR genotypes
- Combined phenotypes and genotypes

Only one result type is active at a time. The available facet filters and table columns change when you switch type.

<figure>
  <img src="/assets/images/content/howto/result-type-f3.png" alt="Result type selector showing AMR phenotypes, AMR genotypes, and Combined phenotypes and genotypes" />
  <figcaption>
    Fig 3. Use the Result type cards to switch between AMR phenotypes, AMR genotypes, and Combined phenotypes and genotypes.
  </figcaption>
</figure>

## Global search

Global search lets you find records by sample accession, assembly accession, gene symbol, species name, antibiotic name, and other indexed text.

You can start a search from:

- The **home page search box**, which opens the combined data resource with your query applied.
- The **Global search** field at the top of the facet sidebar while browsing any data resource.

Enter at least three characters. As you type, a hint appears until the minimum length is reached. When active, your search appears as a tag under **Active filters**, and result-type cards show match counts for your query.

<figure>
  <img src="/assets/images/content/howto/global-search-f4.png" alt="Global search field with an active search query" />
  <figcaption>
    Fig 4. Global search in the facet sidebar. Enter sample accessions (e.g. SAMD…), assembly accessions (e.g. GCA…), gene symbols, or other keywords.
  </figcaption>
</figure>

Global search can be combined with facet filters. Both narrow the results table together.

## Faceted search (filters)

Filters are organised as collapsible **facets** in the left panel under the **Filters** heading. Each facet corresponds to an attribute such as antibiotic, species, or collection year.

Each data resource has its own set of facets:

**AMR phenotypes**

- Antibiotic
- Species
- Genus
- Resistance phenotype
- Isolation source category
- Testing method
- Collection year
- Geographical subregion
- Country

**AMR genotypes**

- Antibiotic
- Species
- Genus
- Annotation tool mode

**Combined phenotypes and genotypes**

- Antibiotic
- Species
- Genus
- Resistance phenotype
- Isolation source category
- Testing method
- Collection year
- Geographical subregion
- Country
- Annotation tool mode

<figure>
  <img src="/assets/images/content/howto/faceted-filters-f5.png" alt="Expanded facet filters showing checkboxes and match counts" />
  <figcaption>
    Fig 5. Facet filters. Click a facet heading to expand it, then select one or more values. The <em>Matches</em> column shows how many records match each value in the current scope.
  </figcaption>
</figure>

### Using facets

To filter the data:

1. Expand a facet by clicking its heading (for example, **Antibiotic** or **Species**).
2. Optionally use the facet's own search box to find values in long lists.
3. Tick one or more checkboxes. Selected values appear under **Active filters** at the top of the panel.
4. Add further facets to narrow results. Match counts update as filters are applied.
5. Click **Load all** at the bottom of a facet when more values are available than shown initially.

To remove a single filter, click the ✕ on its tag under **Active filters**. To remove all filters and the active global search at once, click **Clear all**.

<figure>
  <img src="/assets/images/content/howto/active-filters-f6.png" alt="Active filters showing selected facet values and a Clear all button" />
  <figcaption>
    Fig 6. Active filters. Selected facet values (and an active global search, if any) are listed here and can be removed individually or cleared together.
  </figcaption>
</figure>

When you switch result type, the facet list and table columns change to match the new resource. Your global search is kept; facet selections are reset.

## The results table

The results table shows the records that match your current result type, global search, and facet selections.

The columns shown depend on the active data resource. For example, the AMR phenotypes table includes fields such as antibiotic name, resistance phenotype, BioSample ID, assembly ID, genus, species, and collection metadata. AMR genotypes and the combined resource include additional annotation fields (for example gene symbol, region coordinates, and AMR element details).

<figure>
  <img src="/assets/images/content/howto/results-table-f7.png" alt="Results table showing AMR phenotype records" />
  <figcaption>
    Fig 7. The results table. The total number of matching records is shown above the table.
  </figcaption>
</figure>

### Pagination and sorting

Above the table you can:

- Change **rows per page** (100, 200, 500, or 1000).
- Move between pages with the previous/next controls, or type a page number directly.
- **Sort** by clicking a column heading where a sort arrow is shown.

<figure>
  <img src="/assets/images/content/howto/pagination-f8.png" alt="Pagination controls above the results table" />
  <figcaption>
    Fig 8. Pagination and rows-per-page controls above the results table.
  </figcaption>
</figure>

Many columns contain links (for example to BioSample or assembly records) that open in a new browser tab.

### Column selector

As of now, every column is shown by default. To choose which columns appear:

1. Click the **column selector** icon in the action rail on the right-hand side of the table.
2. Tick or untick columns in the **Select columns to display** panel.
3. Use **Select all** or **Deselect all** to show or hide every column at once.

<figure>
  <img src="/assets/images/content/howto/column-selector-f9.png" alt="Column selector popover listing table columns" />
  <figcaption>
    Fig 9. The column selector. Choose which columns are visible in the results table.
  </figcaption>
</figure>

### Clearing and downloading results

The action rail on the right of the table provides three further actions:

- **Clear filters** — removes all facet selections, the global search, and column visibility choices (after confirmation).
- **Download** — downloads the current result set as a CSV file, or links to the FTP site for full data releases.
- 
<figure>
  <img src="/assets/images/content/howto/clear-filters-f10.png" alt="Action rail beside the results table" />
  <figcaption>
    Fig 10. The clear filters: removes all facet selections, the global search, and column visibility choices.
  </figcaption>
</figure>

<!-- SCREENSHOT: download-dialog-f11.png — download popover with Download and FTP link -->

<figure>
  <img src="/assets/images/content/howto/download-dialog-f11.png" alt="Download popover with CSV download and FTP link" />
  <figcaption>
    Fig 11. The download panel. Click <strong>Download</strong> for a CSV of the current filtered results, or follow the FTP link for full release files.
  </figcaption>
</figure>

The number of rows in the results table depends on your global search, facet filters, and pagination settings. The CSV download includes all records matching the current filters, not only the current page.

## Genome browser

The portal includes an integrated **genome browser** (based on JBrowse 2) for inspecting assembly annotation alongside your search results.

When the genome browser is enabled, a collapsible panel appears above the explorer. To use it:

1. Filter or search until the record of interest appears in the results table.
2. Click the **View in Browser** button in the first column of that row (rows without an assembly ID show — instead).
3. The genome browser panel expands and loads the assembly, zooming to the relevant region when coordinate data is available (for example on genotype rows).
4. Click a feature in the browser track to see annotation details in the panel beside the view.
5. Collapse the panel with the toggle control at the left edge when you want more space for the table.

<!-- SCREENSHOT: view-in-browser-f13.png — results table row with View in Browser button highlighted -->

<figure>
  <img src="/assets/images/content/howto/view-in-browser-f13.png" alt="View in Browser button in the results table" />
  <figcaption>
    Fig 12. Click <strong>View in Genome Browser</strong> on a row to open that record in the genome browser.
  </figcaption>
</figure>

<!-- SCREENSHOT: genome-browser-f12.png — expanded genome browser with track and feature details -->

<figure>
  <img src="/assets/images/content/howto/genome-browser-f12.png" alt="Genome browser showing an assembly track and feature detail panel" />
  <figcaption>
    Fig 13. The genome browser. The assembly and GFF annotation load for the selected row; click a feature to inspect its attributes.
  </figcaption>
</figure>
