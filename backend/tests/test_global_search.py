import sys
from pathlib import Path

import duckdb

import pytest
from fastapi import HTTPException

from core.constants import MIN_SEARCH_PREFIX_LENGTH
from services.global_search import (
    compose_search_query,
    fetch_search_counts_by_dataset,
    is_global_search_available,
    merge_search_predicate,
    normalize_search_query,
    require_filters_or_search,
    resolve_search_prefix,
)

_REPO_ROOT = Path(__file__).resolve().parents[2]
_GLOBAL_SEARCH_PATH = _REPO_ROOT / "global-search"
if str(_GLOBAL_SEARCH_PATH) not in sys.path:
    sys.path.insert(0, str(_GLOBAL_SEARCH_PATH))


def test_normalize_search_query():
    assert normalize_search_query(None) is None
    assert normalize_search_query("  ") is None
    assert normalize_search_query("ab") is None
    assert len("ab") < MIN_SEARCH_PREFIX_LENGTH
    assert normalize_search_query("  ERZ254  ") == "erz254"


def test_merge_search_predicate():
    assert merge_search_predicate("", None) == ""
    assert merge_search_predicate("genus = ?", None) == "genus = ?"
    assert "search_hits" in merge_search_predicate("genus = ?", "erz")
    assert merge_search_predicate("", "erz") == "rowid IN (SELECT hit_rowid FROM search_hits)"


def test_compose_search_query_adds_cte_and_params():
    sql, params = compose_search_query(
        "SELECT COUNT(*) FROM phenotype WHERE genus = ?",
        ["Streptococcus"],
        "phenotype",
        "erz254",
    )
    assert sql.startswith("WITH ")
    assert "search_hits" in sql
    assert params == ["erz254", "phenotype", "Streptococcus"]


def test_require_filters_or_search():
    require_filters_or_search([], "erz")
    require_filters_or_search([{"category": "x", "value": "y"}], None)
    with pytest.raises(HTTPException) as exc:
        require_filters_or_search([], None)
    assert exc.value.status_code == 400


def test_compose_search_query_noop_without_prefix():
    sql, params = compose_search_query(
        "SELECT 1",
        [],
        "phenotype",
        None,
    )
    assert sql == "SELECT 1"
    assert params == []


def test_global_search_round_trip_in_memory():
    from amr_global_search import build_global_search

    conn = duckdb.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE phenotype AS SELECT
            'SAMEA1' AS BioSample_ID,
            'ERZ25458162' AS assembly_ID,
            'amikacin' AS antibiotic_name,
            'resistant' AS resistance_phenotype
        """
    )
    conn.execute(
        """
        CREATE TABLE genotype AS SELECT
            'SAMEA2' AS BioSample_ID,
            'GCA_001' AS assembly_ID,
            'tetA' AS gene_symbol,
            'tetA' AS id,
            'tetA' AS amr_element_symbol,
            'tetracycline' AS antibiotic_name
        """
    )
    conn.execute(
        """
        CREATE TABLE pheno_geno_merged AS SELECT
            'SAMEA3' AS BioSample_ID,
            'ERZ999' AS assembly_ID,
            NULL AS SRA_accession,
            NULL AS id,
            NULL AS gene_symbol,
            NULL AS amr_element_symbol,
            'amikacin' AS antibiotic_name
        """
    )

    build_global_search(conn)
    assert is_global_search_available(conn)

    counts = fetch_search_counts_by_dataset(conn, "erz254")
    assert counts.get("phenotype", 0) >= 1

    sql, params = compose_search_query(
        "SELECT COUNT(*) FROM phenotype",
        [],
        "phenotype",
        "erz254",
    )
    count = conn.execute(sql, params).fetchone()[0]
    assert count == 1

    assert resolve_search_prefix("ERZ254", conn) == "erz254"
    assert resolve_search_prefix("ab", conn) is None

    conn.close()
