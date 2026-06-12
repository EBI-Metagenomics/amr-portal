#!/usr/bin/env python3
"""Generate the AMR Data Portal Postman collection with tests."""

import base64
import json
from pathlib import Path

BASE = "http://{{amr_current}}/api"
OUT = Path(__file__).with_name("AMR Data Portal.postman_collection.json")

COMMON_TIMING = [
    'pm.test("Response time is under 30s", function () {',
    "    pm.expect(pm.response.responseTime).to.be.below(30000);",
    "});",
]


def records_tests(expect_hits: bool = False) -> list[str]:
    tests = [
        'pm.test("Status code is 200", function () {',
        "    pm.response.to.have.status(200);",
        "});",
        *COMMON_TIMING,
        'pm.test("Response has meta and data", function () {',
        "    const json = pm.response.json();",
        '    pm.expect(json).to.have.all.keys("meta", "data");',
        "    pm.expect(json.data).to.be.an(\"array\");",
        "});",
        'pm.test("Meta pagination fields are valid", function () {',
        "    const meta = pm.response.json().meta;",
        "    const body = JSON.parse(pm.request.body.raw);",
        "    pm.expect(meta.page).to.eql(body.page || 1);",
        "    pm.expect(meta.per_page).to.eql(body.per_page || 100);",
        "    pm.expect(meta.total_hits).to.be.a(\"number\").and.at.least(0);",
        "    pm.expect(meta.columns).to.be.an(\"array\").that.is.not.empty;",
        "});",
        'pm.test("Column metadata shape", function () {',
        "    pm.response.json().meta.columns.forEach(function (col) {",
        '        pm.expect(col).to.include.keys("id", "label", "sortable", "type");',
        "    });",
        "});",
        'pm.test("Data rows do not exceed per_page", function () {',
        "    const body = JSON.parse(pm.request.body.raw);",
        "    const perPage = body.per_page || 100;",
        "    pm.expect(pm.response.json().data.length).to.be.at.most(perPage);",
        "});",
    ]
    if expect_hits:
        tests += [
            'pm.test("Search returns at least one hit", function () {',
            "    pm.expect(pm.response.json().meta.total_hits).to.be.above(0);",
            "    pm.expect(pm.response.json().data.length).to.be.above(0);",
            "});",
        ]
    else:
        tests += [
            'pm.test("Filtered query returns hits when filters are set", function () {',
            "    const body = JSON.parse(pm.request.body.raw);",
            "    if ((body.selected_filters || []).length > 0) {",
            "        pm.expect(pm.response.json().meta.total_hits).to.be.above(0);",
            "    }",
            "});",
        ]
    return tests


def download_csv_tests(expected_rows: int | None = None, check_stream: bool = False) -> list[str]:
    tests = [
        'pm.test("Status code is 200", function () {',
        "    pm.response.to.have.status(200);",
        "});",
        *COMMON_TIMING,
        'pm.test("CSV content type and attachment header", function () {',
        '    pm.expect(pm.response.headers.get("Content-Type")).to.include("text/csv");',
        '    pm.expect(pm.response.headers.get("Content-Disposition")).to.include("attachment");',
        '    pm.expect(pm.response.headers.get("Content-Disposition")).to.include("amr_records.csv");',
        "});",
        'pm.test("CSV has header row", function () {',
        '    const lines = pm.response.text().trim().split("\\n");',
        "    pm.expect(lines.length).to.be.above(0);",
        '    pm.expect(lines[0]).to.include("phenotype-antibiotic_name");',
        "});",
    ]
    if expected_rows is not None:
        tests += [
            f'pm.test("CSV row count matches page scope (header + {expected_rows} rows)", function () {{',
            '    const lines = pm.response.text().trim().split("\\n");',
            f"    pm.expect(lines.length).to.eql({expected_rows + 1});",
            "});",
        ]
    if check_stream:
        tests += [
            'pm.test("CSV stream contains data rows", function () {',
            '    const lines = pm.response.text().trim().split("\\n");',
            "    pm.expect(lines.length).to.be.above(1);",
            "});",
        ]
    return tests


def download_json_tests(expected_rows: int) -> list[str]:
    return [
        'pm.test("Status code is 200", function () {',
        "    pm.response.to.have.status(200);",
        "});",
        *COMMON_TIMING,
        'pm.test("JSON attachment headers", function () {',
        '    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");',
        '    pm.expect(pm.response.headers.get("Content-Disposition")).to.include("amr_records.json");',
        "});",
        'pm.test("Body is a JSON array", function () {',
        "    const rows = pm.response.json();",
        "    pm.expect(rows).to.be.an(\"array\");",
        f"    pm.expect(rows.length).to.eql({expected_rows});",
        "});",
        'pm.test("Each row is an object with flattened column keys", function () {',
        "    pm.response.json().forEach(function (row) {",
        "        pm.expect(row).to.be.an(\"object\");",
        "    });",
        "});",
    ]


def req(
    method: str,
    path: str,
    name: str,
    body=None,
    query=None,
    description: str = "",
    tests: list[str] | None = None,
    accept: str = "application/json",
):
    headers = [{"key": "Accept", "value": accept}]
    if method in ("POST", "PUT", "PATCH"):
        headers.append({"key": "Content-Type", "value": "application/json"})
    url = {
        "raw": f"{BASE}{path}",
        "protocol": "http",
        "host": ["{{amr_current}}"],
        "path": ["api"] + [p for p in path.strip("/").split("/") if p],
    }
    if query:
        url["query"] = query
    request = {"method": method, "header": headers, "url": url, "description": description}
    if body is not None:
        request["body"] = {
            "mode": "raw",
            "raw": json.dumps(body, indent=4),
            "options": {"raw": {"language": "json"}},
        }
    item = {"name": name, "request": request}
    if tests:
        item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": tests}}]
    return item


def download_req(name, query, body, accept, tests):
    return req(
        "POST",
        "/amr-records/download",
        name,
        body=body,
        query=query,
        accept=accept,
        description=f"POST /amr-records/download — {name}",
        tests=tests,
    )


def download_get_req():
    payload = {
        "selected_filters": [{"category": "phenotype-antibiotic_name", "value": "amikacin"}],
        "view_id": 1,
        "page": 1,
        "per_page": 5,
    }
    b64 = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    return {
        "name": "download-csv-get",
        "request": {
            "method": "GET",
            "header": [{"key": "Accept", "value": "text/csv"}],
            "url": {
                "raw": f"{BASE}/amr-records/download?payload={b64}&scope=page&file_format=csv",
                "protocol": "http",
                "host": ["{{amr_current}}"],
                "path": ["api", "amr-records", "download"],
                "query": [
                    {
                        "key": "payload",
                        "value": b64,
                        "description": "Base64 URL-safe encoded Payload JSON",
                    },
                    {"key": "scope", "value": "page"},
                    {"key": "file_format", "value": "csv"},
                ],
            },
            "description": "GET variant of download using Base64-encoded payload query parameter.",
        },
        "event": [
            {
                "listen": "test",
                "script": {"type": "text/javascript", "exec": download_csv_tests(expected_rows=5)},
            }
        ],
    }


def build_collection() -> dict:
    return {
        "info": {
            "_postman_id": "c809bc90-c847-49af-9943-782d250d0096",
            "name": "AMR Data Portal",
            "description": (
                "AMR Data Portal API collection with response validation tests. "
                "Set the `amr_current` collection variable (e.g. `localhost:8000`)."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            "_exporter_id": "19420352",
        },
        "variable": [{"key": "amr_current", "value": "localhost:8000", "type": "string"}],
        "event": [
            {
                "listen": "prerequest",
                "script": {
                    "type": "text/javascript",
                    "exec": ["// Collection-wide pre-request hook (extend as needed)"],
                },
            }
        ],
        "item": [
            {
                "name": "AMR APIs",
                "item": [
                    {
                        "name": "meta-data",
                        "item": [
                            req(
                                "GET",
                                "/health",
                                "API Health",
                                description="Lightweight health check — verifies the API process is serving requests.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Returns healthy status string", function () {',
                                    "    const json = pm.response.json();",
                                    '    pm.expect(json).to.have.property("status", "Healthy: OK");',
                                    "});",
                                    'pm.test("Content-Type is JSON", function () {',
                                    '    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");',
                                    "});",
                                ],
                            ),
                            req(
                                "GET",
                                "/release",
                                "Data Release",
                                description="Returns the current AMR data release label shown in the UI and exports.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Release label is present", function () {',
                                    "    const json = pm.response.json();",
                                    '    pm.expect(json).to.have.property("label");',
                                    "    pm.expect(json.label).to.be.a(\"string\").and.not.empty;",
                                    "    pm.expect(json.label).to.match(/^\\d{4}-\\d{2}$/);",
                                    "});",
                                ],
                            ),
                        ],
                    },
                    {
                        "name": "filters-config",
                        "item": [
                            req(
                                "GET",
                                "/filters-config",
                                "filters-config",
                                description="Filter categories, views, grouped categories, and embedded release metadata.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Has filter configuration shape", function () {',
                                    "    const json = pm.response.json();",
                                    '    pm.expect(json).to.have.all.keys("filterCategories", "filterViews", "release");',
                                    "    pm.expect(json.filterViews).to.be.an(\"array\").with.lengthOf(3);",
                                    "    pm.expect(json.filterCategories).to.be.an(\"object\");",
                                    "    pm.expect(Object.keys(json.filterCategories).length).to.be.above(0);",
                                    "});",
                                    'pm.test("Each view has required fields", function () {',
                                    "    pm.response.json().filterViews.forEach(function (view) {",
                                    '        pm.expect(view).to.have.all.keys("id", "url_name", "name", "categoryGroups", "otherCategoryGroups", "columns");',
                                    "        pm.expect(view.columns).to.be.an(\"array\").that.is.not.empty;",
                                    "    });",
                                    "});",
                                    'pm.test("Release label matches expected format", function () {',
                                    "    const label = pm.response.json().release.label;",
                                    "    pm.expect(label).to.match(/^\\d{4}-\\d{2}$/);",
                                    "});",
                                ],
                            ),
                        ],
                    },
                    {
                        "name": "amr-facets",
                        "item": [
                            req(
                                "POST",
                                "/amr-facets",
                                "amr-facets",
                                body={
                                    "selected_filters": [],
                                    "facet_paging": {},
                                    "facet_operators": {},
                                    "view_id": 1,
                                },
                                description="Facet buckets for phenotype view with no active filters.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Response has data_type and facets", function () {',
                                    "    const json = pm.response.json();",
                                    '    pm.expect(json).to.have.all.keys("data_type", "facets");',
                                    "    pm.expect(json.data_type).to.be.an(\"array\").with.lengthOf(3);",
                                    "    pm.expect(json.facets).to.be.an(\"array\").that.is.not.empty;",
                                    "});",
                                    'pm.test("Active view is phenotype (id=1)", function () {',
                                    "    const active = pm.response.json().data_type.find(function (d) { return d.active; });",
                                    '    pm.expect(active).to.eql({ id: 1, name: "AMR phenotypes", selected_count: 0, search_count: null, active: true });',
                                    "});",
                                    'pm.test("Facet options have count and selected flags", function () {',
                                    "    const facet = pm.response.json().facets[0];",
                                    '    pm.expect(facet).to.include.keys("id", "label", "selected_count", "total_options", "options", "has_more");',
                                    "    pm.expect(facet.options).to.be.an(\"array\").that.is.not.empty;",
                                    "    const opt = facet.options[0];",
                                    '    pm.expect(opt).to.include.keys("value", "label", "count", "selected");',
                                    "    pm.expect(opt.count).to.be.a(\"number\");",
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-facets",
                                "amr-facets-search-string",
                                body={
                                    "search_query": "SAMEA",
                                    "selected_filters": [],
                                    "facet_paging": {},
                                    "facet_operators": {},
                                    "view_id": 1,
                                },
                                description="Global search mode with search_count per data type.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Search counts are populated", function () {',
                                    "    pm.response.json().data_type.forEach(function (dt) {",
                                    "        pm.expect(dt.search_count).to.be.a(\"number\").and.above(0);",
                                    "    });",
                                    "});",
                                    'pm.test("Facets still returned for active view", function () {',
                                    "    pm.expect(pm.response.json().facets).to.be.an(\"array\").that.is.not.empty;",
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-facets",
                                "amr-facets-with-selected-filters",
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"}
                                    ],
                                    "facet_paging": {},
                                    "facet_operators": {},
                                    "view_id": 1,
                                },
                                description="Selected filter reflected in facet option state.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Selected filter reflected in facets", function () {',
                                    '    const facet = pm.response.json().facets.find(function (f) { return f.id === "phenotype-antibiotic_name"; });',
                                    "    pm.expect(facet).to.exist;",
                                    "    pm.expect(facet.selected_count).to.eql(1);",
                                    '    const selected = facet.options.find(function (o) { return o.value === "amikacin"; });',
                                    "    pm.expect(selected).to.exist;",
                                    "    pm.expect(selected.selected).to.be.true;",
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-facets",
                                "amr-facets-genotype-view",
                                body={
                                    "selected_filters": [],
                                    "facet_paging": {},
                                    "facet_operators": {},
                                    "view_id": 2,
                                },
                                description="Genotype view (view_id=2) facet response.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    *COMMON_TIMING,
                                    'pm.test("Genotype view is active", function () {',
                                    "    const active = pm.response.json().data_type.find(function (d) { return d.active; });",
                                    "    pm.expect(active.id).to.eql(2);",
                                    '    pm.expect(active.name).to.eql("AMR genotypes");',
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-facets",
                                "amr-facets-search-performance",
                                body={
                                    "selected_filters": [
                                        {"category": "genotype-antibiotic_name", "value": "amikacin"},
                                        {
                                            "category": "genotype-antibiotic_name",
                                            "value": "aminocoumarin antibiotic",
                                        },
                                        {"category": "genotype-antibiotic_name", "value": "ampicillin"},
                                    ],
                                    "facet_paging": {},
                                    "facet_operators": {},
                                    "view_id": 2,
                                    "search_query": "samea",
                                },
                                description="Heavier facet query with multiple genotype filters and search.",
                                tests=[
                                    'pm.test("Status code is 200", function () {',
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    'pm.test("Response time is under 10s", function () {',
                                    "    pm.expect(pm.response.responseTime).to.be.below(10000);",
                                    "});",
                                    'pm.test("Genotype view active with search counts", function () {',
                                    "    const json = pm.response.json();",
                                    "    const active = json.data_type.find(function (d) { return d.active; });",
                                    "    pm.expect(active.id).to.eql(2);",
                                    "    pm.expect(active.search_count).to.be.a(\"number\");",
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-facets",
                                "amr-facets-invalid-view",
                                body={"selected_filters": [], "facet_paging": {}, "view_id": 999},
                                description="Invalid view_id should return 400.",
                                tests=[
                                    'pm.test("Status code is 400", function () {',
                                    "    pm.response.to.have.status(400);",
                                    "});",
                                    'pm.test("Error detail mentions view ID", function () {',
                                    '    pm.expect(pm.response.json().detail).to.include("999");',
                                    "});",
                                ],
                            ),
                        ],
                    },
                    {
                        "name": "amr-records",
                        "item": [
                            req(
                                "POST",
                                "/amr-records",
                                "amr-records-phenotype-01",
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"},
                                        {
                                            "category": "phenotype-species",
                                            "value": "Acinetobacter baumannii",
                                        },
                                        {"category": "phenotype-genus", "value": "Acinetobacter"},
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 100,
                                    "facet_operators": {},
                                },
                                description="Phenotype records filtered by antibiotic, species, and genus.",
                                tests=records_tests(),
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "AMR-Records",
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"}
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 100,
                                },
                                description="Basic phenotype records query with a single antibiotic filter.",
                                tests=records_tests(),
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "AMR-Records-search-string",
                                body={
                                    "search_query": "SAMEA7526",
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 100,
                                },
                                description="Global search for a BioSample accession prefix.",
                                tests=records_tests(expect_hits=True),
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "amr-records-genotype-view",
                                body={
                                    "selected_filters": [
                                        {"category": "genotype-antibiotic_name", "value": "amikacin"}
                                    ],
                                    "view_id": 2,
                                    "page": 1,
                                    "per_page": 50,
                                    "facet_operators": {},
                                },
                                description="Genotype view records with antibiotic filter.",
                                tests=records_tests(),
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "combined-records",
                                body={
                                    "selected_filters": [
                                        {
                                            "category": "pheno_geno_merged-antibiotic_name",
                                            "value": "chloramphenicol",
                                        },
                                        {
                                            "category": "pheno_geno_merged-antibiotic_name",
                                            "value": "cefiderocol",
                                        },
                                        {
                                            "category": "pheno_geno_merged-antibiotic_name",
                                            "value": "ampicillin",
                                        },
                                    ],
                                    "view_id": 3,
                                    "page": 1,
                                    "per_page": 100,
                                    "facet_operators": {},
                                },
                                description="Combined phenotype/genotype view (view_id=3).",
                                tests=records_tests(),
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "amr-records-with-sort",
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"}
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 10,
                                    "order_by": {"category": "phenotype-species", "order": "ASC"},
                                },
                                description="Records sorted ascending by species column.",
                                tests=records_tests()
                                + [
                                    'pm.test("Returns requested page size", function () {',
                                    "    const body = JSON.parse(pm.request.body.raw);",
                                    "    pm.expect(pm.response.json().data.length).to.be.at.most(body.per_page);",
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "amr-records-browse-all",
                                body={"selected_filters": [], "view_id": 1, "page": 1, "per_page": 10},
                                description="Browse all phenotype records without filters or search.",
                                tests=records_tests()
                                + [
                                    'pm.test("Returns the full dataset count", function () {',
                                    "    pm.expect(pm.response.json().meta.total_hits).to.be.above(0);",
                                    "});",
                                ],
                            ),
                            req(
                                "POST",
                                "/amr-records",
                                "amr-records-short-search",
                                body={"search_query": "ab", "view_id": 1, "page": 1, "per_page": 10},
                                description="Search shorter than minimum prefix length should return 400.",
                                tests=[
                                    'pm.test("Status code is 400", function () {',
                                    "    pm.response.to.have.status(400);",
                                    "});",
                                    'pm.test("Error mentions minimum search length", function () {',
                                    "    pm.expect(pm.response.json().detail).to.match(/minimum 3 characters/i);",
                                    "});",
                                ],
                            ),
                        ],
                    },
                    {
                        "name": "amr-records-download",
                        "item": [
                            download_req(
                                "download-csv-page",
                                query=[
                                    {"key": "scope", "value": "page"},
                                    {"key": "file_format", "value": "csv"},
                                ],
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"}
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 5,
                                },
                                accept="text/csv",
                                tests=download_csv_tests(expected_rows=5),
                            ),
                            download_req(
                                "download-json-page",
                                query=[
                                    {"key": "scope", "value": "page"},
                                    {"key": "file_format", "value": "json"},
                                ],
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"}
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 3,
                                },
                                accept="application/json",
                                tests=download_json_tests(expected_rows=3),
                            ),
                            download_req(
                                "download-csv-all",
                                query=[
                                    {"key": "scope", "value": "all"},
                                    {"key": "file_format", "value": "csv"},
                                ],
                                body={
                                    "selected_filters": [
                                        {"category": "phenotype-antibiotic_name", "value": "amikacin"},
                                        {
                                            "category": "phenotype-species",
                                            "value": "Acinetobacter baumannii",
                                        },
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 100,
                                },
                                accept="text/csv",
                                tests=download_csv_tests(check_stream=True),
                            ),
                            download_get_req(),
                            download_req(
                                "download-no-results",
                                query=[
                                    {"key": "scope", "value": "page"},
                                    {"key": "file_format", "value": "csv"},
                                ],
                                body={
                                    "selected_filters": [
                                        {
                                            "category": "phenotype-antibiotic_name",
                                            "value": "__nonexistent_antibiotic_xyz__",
                                        }
                                    ],
                                    "view_id": 1,
                                    "page": 1,
                                    "per_page": 5,
                                },
                                accept="application/json",
                                tests=[
                                    'pm.test("Status code is 404", function () {',
                                    "    pm.response.to.have.status(404);",
                                    "});",
                                    'pm.test("No data error message", function () {',
                                    '    pm.expect(pm.response.json().detail).to.eql("No data found for the given filters");',
                                    "});",
                                ],
                            ),
                        ],
                    },
                ],
            }
        ],
    }


def main() -> None:
    OUT.write_text(json.dumps(build_collection(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
