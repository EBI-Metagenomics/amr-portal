---
title: AMR Submission Guide
tags: usage
layout: "layouts/documentation.njk"
---
# AMR Submission Guide

## What is AMR data?

[Antimicrobial resistance (AMR) data](https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance) are commonly presented in the form of [antibiograms](https://www.safetyandquality.gov.au/sites/default/files/2019-05/infosheet3-whatisanantibiogram.pdf), tables showing susceptibility of microbes (particularly bacteria) to various antimicrobials including antibiotics, antivirals, antifungals, or antiparasitics. Antibiograms are a crucial piece of data in the fight against AMR in healthcare as they provide information on efficacy of treatments for different bacteria, and thus guide prescribing policies.

Antibiograms are also referred to as Antibiotic Susceptibility Test (AST) data, and are typically generated from bacteria isolated from patients.

## AMR data submission

AMR data should be submitted in JSON form to the [BioSamples archive](https://www.ebi.ac.uk/biosamples/) \- a dedicated repository for storing a variety of metadata about biological samples used in research and development.

As part of the [2020 COMPARE project](https://pubmed.ncbi.nlm.nih.gov/32255760/), an AMR metadata standard was defined in tabular form (see Figure 1).

![Fig. 1: Example antibiogram spreadsheet, developed as part of the COMPARE project](/assets/images/docs/example_antibiogram.png "Example Antibiogram")

This has been converted to a JSON template for easy BioSamples submission (see ‘Submitting AMR data to a BioSample’, later in the document).

## How to submit AMR data to BioSamples

AMR data is classed as ‘structured data’ in BioSamples, which is added to an existing BioSample record. Thus the first step in AMR data submission is to create the BioSample record itself, containing information about the sequenced microbe.

### 1. Creating a BioSample

BioSample records can be created programmatically using JSON files or interactively using a spreadsheet. As the following step of adding AMR data can only be done programmatically, we recommend using this method from the start for consistency.

#### Programmatically

Your JSON BioSample object should contain, as a minimum, the 13 mandatory sample fields listed in the table below. This incorporates [mandatory fields from the BioSamples documentation](https://www.ebi.ac.uk/biosamples/docs/cookbook/upload_files) and the European Nucleotide Archive (ENA’s) recommended checklist for AMR submissions, [ERC000029](https://www.ebi.ac.uk/ena/browser/view/ERC000029).

| Column / Field | Description | Field Validation | Source |
| :---: | :---: | :---: | :---: |
| **name** | The short name of the sample | Free text | BioSamples |
| **release** | The date at which the sample should be public | Should follow ISO6801 | BioSamples |
| **Organism OR  taxId** | The scientific name of the organism | Should follow [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy) nomenclature | BioSamples/ ENA checklist (ERC000029) |
| **collected\_by** | The name of the persons or institute who collected the specimen | Free text | ENA checklist (ERC000029) |
| **collection date** | The date the sample was collected with the intention of sequencing | Should follow ISO6801 and specific regex (see ERC0000296) | ENA checklist (ERC000029) |
| **geographic location (latitude)** | The geographical origin of the sample as defined by latitude | Units (DD) required | ENA checklist (ERC000029) |
| **geographic location (longitude)** | The geographical origin of the sample as defined by longitude | Units (DD) required | ENA checklist (ERC000029) |
| **environmental\_sample** | Identifies sequences derived by direct molecular isolation from a bulk environmental DNA sample with no reliable identification of the source organism | ‘Yes’ or ‘No’ | ENA checklist (ERC000029) |
| **geographic location (country and/or sea)** | The geographical origin of where the sample was collected from, with the intention of sequencing, as defined by country or sea name | Pick-list | ENA checklist (ERC000029) |
| **host health state** | Health status of the host at the time of sample collection | Pick-list | ENA checklist (ERC000029) |
| **host scientific name** | Scientific name of the natural (as opposed to laboratory) host to the organism from which the sample was obtained | Free text | ENA checklist (ERC000029) |
| **Is the sequenced pathogen host associated?** |  | ‘Yes’ or ‘No’ | ENA checklist (ERC000029) |
| **isolate** | Individual isolate from which the sample was obtained | Free text | ENA checklist (ERC000029) |

***Table 1:** Mandatory sample metadata fields for an AMR-related BioSamples submission*

For any of the ENA checklist (ERC000029) fields above, if a value cannot be provided you can select an appropriate term from the [INSDC Missing Value Reporting Terms](https://ena-docs.readthedocs.io/en/latest/submit/samples/missing-values.htm).

For additional fields to include in your BioSample, please consult the BioSamples documentation[^8] and the ENA’s ERC000029 checklist6. It is also possible to add user-defined fields to your BioSample.

An example JSON file containing the fields in Table 1 is below:

```json
{  
  "name": "bacterial_sample_1",  
  "release" : "2025-05-14T00:00:00Z",  
  "webinSubmissionAccountId" : "Webin-#####",  
  "characteristics": {  
    "ENA-checklist": [  
      {  
        "text": "ERC000029"  
      }  
    ],  
    "organism": [  
      {  
        "text": "Escherichia coli"  
      }  
    ],  
    "collected_by": [  
      {  
        "text": "Name Surname",  
        "tag": "attribute"  
      }  
    ],  
    "collection date": [  
      {  
        "text": "2025-05-14",  
        "tag": "attribute"  
      }  
    ],  
    "geographic location (latitude)": [  
      {  
        "text": "55.3",  
        "tag": "attribute",  
        "unit" : "DD"  
      }  
    ],  
    "geographic location (longitude)": [  
      {  
        "text": "3.43",  
        "tag": "attribute",  
        "unit" : "DD"  
      }  
    ],  
    "environmental_sample": [  
      {  
        "text": "No",  
        "tag": "attribute"  
      }  
    ],  
    "geographic location (country and/or sea)": [  
      {  
        "text": "United Kingdom",  
        "tag": "attribute"  
      }  
    ],  
    "host health state": [  
      {  
        "text": "diseased",  
        "tag": "attribute"  
      }  
    ],  
    "host scientific name": [  
      {  
        "text": "Homo Sapiens",  
        "tag": "attribute"  
      }  
    ],  
    "Is the sequenced pathogen host associated?": [  
      {  
        "text": "Yes",  
        "tag": "attribute"  
      }  
    ],  
    "isolate": [  
      {  
        "text": "APEC O1",  
        "tag": "attribute"  
      }  
    ]  
  }  
}
```

Key points:

* Ensure the release date for the BioSample is provided in full date-timestamp format (including time zone), i.e: 2025-05-14T00:00:00Z  
* ENA Webin credentials should be included in this file, i.e: `Webin-#####`.  If you do not have an ENA Webin account, you can create one [at the Webin login page](https://www.ebi.ac.uk/ena/submit/webin/login)
* Ensure the ERC000029 ENA Checklist is referenced correctly in the file, i.e:

```json
"ENA-checklist": [
  {
    "text": "ERC000029"
  }
]
```

BioSample names must be unique per submission

##### API commands to create a BioSample record

Authentication is required to submit metadata to BioSamples. Again, you can use your ENA Webin credentials (`Webin-####`) for this.

First create a token using your Webin credentials:

```bash
TOKEN=$(curl --location --request POST 'https://wwwdev.ebi.ac.uk/ena/submit/webin/auth/token' --header 'Content-Type: application/json' --data-raw '{  
  "authRealms": [  
    "ENA"  
  ],  
  "password": "<Webin password>",  
  "username": "<Webin-####>"  
}')
```

You can print the token to check if it was generated successfully:

```bash
echo $TOKEN
```

Submit the JSON file to (the test server of) BioSamples:

```bash
curl -X POST "https://wwwdev.ebi.ac.uk/biosamples/samples" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @<sample file>.json
  ```

The production endpoint can be accessed here:  
[https://www.ebi.ac.uk/biosamples/samples](https://www.ebi.ac.uk/biosamples/samples)

The contents of your JSON file will be printed to the screen, with a newly assigned sample accession under `"accession" : "SAMEA####"`. You will notice an additional `"SRAaccession" : "ERS####"` field in the output, this is largely for internal use, and you should instead always use the `SAMEA##` accession for search or citation.

##### Viewing your BioSample record

You can then view your newly submitted sample immediately in the (test) BioSamples browser via the links below: 

* Development browser: [https://wwwdev.ebi.ac.uk/biosamples/samples/<SAMEA###>](https://wwwdev.ebi.ac.uk/biosamples/samples/<SAMEA###>)
* Production browser: [https://www.ebi.ac.uk/biosamples/samples/<SAMEA###>](https://wwwdev.ebi.ac.uk/biosamples/samples/<SAMEA###>)

Or by searching for it in the production or development instance of the BioSamples website.

#### Interactively

Details on how to create a BioSample record interactively can be found in the BioSamples documentation5.

### 2. Submitting AMR data to a BioSample

It is only possible to submit AMR data to BioSamples programmatically, and only if a BioSample record already exists. This is because an AMR structured data submission is treated as a sample update.

An example JSON file containing all AMR fields in Figure 1, is shown below.

```json
{  
  "accession" : "SAME###",  
  "data" : [ {  
    "domain" : "self.ExampleDomain",  
    "webinSubmissionAccountId" : "Webin-###",  
    "type" : "AMR",  
    "schema" : null,  
    "content" : [ {  
    
  "antibioticName" : {  
        "value" : "nalidixic acid",  
        "iri" : "http://purl.obolibrary.org/obo/value_1"  
      },  
  "astStandard" : {  
        "value" : "CLSI",  
        "iri" : null  
      },  
    "breakpointVersion" : {  
        "value" : "EUCAST 2015",  
        "iri" : null  
      },  
        "laboratoryTypingMethod" : {  
        "value" : "disk diffusion",  
        "iri" : null  
      },  
     "measurement" : {  
        "value" : "17",  
        "iri" : null  
      },  
     "measurementUnits" : {  
        "value" : "mm",  
        "iri" : null  
      },  
     "measurementSign " : {  
        "value" : "==",  
        "iri" : null  
      },  
      "resistancePhenotype" : {  
        "value" : "intermediate",  
        "iri" : null  
      },  
     "platform" : {  
        "value" : "Micronaut",  
        "iri" : null  
      }  
   }]  
   }  
  ]  
}
```

Key points:

* Ensure the existing sample is referenced by `SAMEA###` accession  
* ENA Webin credentials should also be included in this file, i.e: `Webin-#####`

New API endpoints are used for AMR data submission.

#### API command to submit AMR data

Similarly to creating a new BioSample record, Webin authentication is also required to update a BioSample record with AMR data.

You can use the same command as in Step 1 to create your token.

Then, submit the JSON file containing AMR data to (the test instance of) your BioSample:

```bash
curl -X PUT "https://wwwdev.ebi.ac.uk/biosamples/structureddata/<insert SAME### accession here>"   
  -H "Content-Type: application/json" 
  -H "Authorization: Bearer $TOKEN" 
  -d @<amr data file>.json
```

Note that you should append the `SAME####` accession of the sample you are updating to the endpoint above.

You can then view your newly updated sample immediately in the (test) BioSamples browser.

Note that there is no specific validation on antibiogram submissions.

## How to update your AMR BioSample

As the sample and structured data of a BioSample are decoupled, they are updated independently:

### 1. Updating your BioSample

#### Programmatically updating your BioSample

To update just the BioSample itself (without affecting the AMR structured data) you can:

Download the JSON file for your BioSample record. This will contain fields injected by BioSamples that are required for an update. Please remember to remove the ‘dev’ when accessing a sample submitted to production.

```bash
curl -o downloaded_sample.json "https://wwwdev.ebi.ac.uk/biosamples/samples.json?filter=acc:<SAME###>"
```

* Edit the contents of the downloaded JSON file on your computer
* Generate a token using your Webin credentials, as in Step 1
* Submit it back to (the test server of) BioSamples, using a `PUT` request

```bash
  curl -X PUT "https://wwwdev.ebi.ac.uk/biosamples/samples/<SAME###>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \   
  -d @<updated sample file>.json
```

#### Interactively updating a BioSample

Details on how to update a BioSample interactively can be found in the BioSamples documentation8.

### 2. Updating the AMR structured data of your BioSample

Updating the AMR data in your BioSample follows largely the same process as its submission, as the AMR file already contains a reference to the BioSample accession.

* Modify the contents of the original AMR JSON file on your computer
* Generate a token using your Webin credentials, as in Step 1
* Re-submit the modified AMR JSON file to (the test instance of) your BioSample:

```json
curl -X PUT "https://wwwdev.ebi.ac.uk/biosamples/structureddata \
  <insert SAME### accession here>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @<updated amr data file>.json
```

## Associating AMR data with genomic data in ENA

### If you have not yet deposited the genomic data to ENA

If you would like to associate AMR data with nucleotide sequencing data, first create your BioSample and submit your AMR data to the BioSamples archive, following the steps above. Then proceed to submit your sequencing data to the ENA, following the [ENA’s submission guidance](https://ena-docs.readthedocs.io/en/latest/).

In ENA, at the time of Sample registration, you can simply reference the BioSample accession created in Step 1 (`SAM###`) in your submission, instead of creating a new Sample.

Please note that AMR antibiograms are displayed only in the BioSamples archive, and not the ENA Browser.

If you have already deposited the genomic data associated to your AMR submission to the ENA, please contact us at [ena-path-collabs@ebi.ac.uk](mailto:ena-path-collabs@ebi.ac.uk).

If you have another data type you would like to link your AMR data to, please get in touch with us at: [ena-path-collabs@ebi.ac.uk](mailto:ena-path-collabs@ebi.ac.uk).
