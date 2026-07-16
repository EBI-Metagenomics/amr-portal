import sys
from pathlib import Path

import duckdb
import pytest
from core.constants import MIN_SEARCH_PREFIX_LENGTH
from services.global_search import (
    clear_search_hits,
    compose_search_query,
    fetch_search_counts_by_dataset,
    fetch_search_counts_from_materialized,
    is_global_search_available,
    is_taxon_id_query,
    materialize_search_hits,
    merge_materialized_search_predicate,
    merge_search_predicate,
    normalize_search_query,
    resolve_search_prefix,
    set_global_search_available,
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


def test_is_taxon_id_query():
    assert is_taxon_id_query("562")
    assert is_taxon_id_query("28901")
    assert not is_taxon_id_query("erz254")
    assert not is_taxon_id_query("salmonella")


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
    assert params == ["erz254", "phenotype", "phenotype", "Streptococcus"]


def test_merge_materialized_search_predicate():
    sql, params = merge_materialized_search_predicate("genus = ?", "phenotype")
    assert "_amr_search_hits" in sql
    assert params == ["phenotype"]


@pytest.mark.skipif(
    not (_REPO_ROOT / "duckdb" / "portal.duckdb").exists(),
    reason="portal.duckdb not available",
)
def test_materialized_search_hits_against_portal_db():
    set_global_search_available(None)
    conn = duckdb.connect(str(_REPO_ROOT / "duckdb" / "portal.duckdb"), read_only=True)
    if not is_global_search_available(conn):
        conn.close()
        pytest.skip("global_search FTS not available in portal.duckdb")

    materialize_search_hits(conn, "amik")
    counts = fetch_search_counts_from_materialized(conn)
    assert sum(counts.values()) > 0

    where_sql, params = merge_materialized_search_predicate("", "phenotype")
    count = conn.execute(
        f"SELECT COUNT(*) FROM phenotype WHERE {where_sql}",
        params,
    ).fetchone()[0]
    assert count > 0

    clear_search_hits(conn)
    conn.close()


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
            'SRR1' AS SRA_accession,
            'ERZ25458162' AS assembly_ID,
            'amikacin' AS antibiotic_name,
            'Escherichia coli' AS organism,
            'Escherichia' AS genus,
            'coli' AS species
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
            'tetracycline' AS antibiotic_name,
            'Klebsiella pneumoniae' AS organism,
            'Klebsiella' AS genus,
            'pneumoniae' AS species
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
            'amikacin' AS antibiotic_name,
            'Escherichia coli' AS organism,
            'Escherichia' AS genus,
            'coli' AS species,
            '562' AS taxon_id
        """
    )

    build_global_search(conn)
    assert is_global_search_available(conn)

    counts = fetch_search_counts_by_dataset(conn, "erz254")
    assert counts.get("phenotype", 0) >= 1

    genus_counts = fetch_search_counts_by_dataset(conn, "escher")
    assert genus_counts.get("phenotype", 0) >= 1

    # Multi-word: each whitespace token is prefix-matched and ANDed.
    organism_counts = fetch_search_counts_by_dataset(conn, "escherichia coli")
    assert organism_counts.get("phenotype", 0) >= 1
    assert organism_counts.get("pheno_geno_merged", 0) >= 1

    antibiotic_phrase_counts = fetch_search_counts_by_dataset(conn, "klebsiella pneumoniae")
    assert antibiotic_phrase_counts.get("genotype", 0) >= 1

    # Tokens that do not co-occur on the same document should not match.
    mismatch_counts = fetch_search_counts_by_dataset(conn, "escherichia pneumoniae")
    assert sum(mismatch_counts.values()) == 0

    taxon_counts = fetch_search_counts_by_dataset(conn, "562")
    assert taxon_counts.get("pheno_geno_merged", 0) == 1
    assert taxon_counts.get("phenotype", 0) == 0

    materialize_search_hits(conn, "562")
    merged_count = conn.execute(
        """
        SELECT COUNT(*) FROM pheno_geno_merged
        WHERE rowid IN (
            SELECT hit_rowid FROM _amr_search_hits WHERE source_table = 'pheno_geno_merged'
        )
        """
    ).fetchone()[0]
    assert merged_count == 1
    clear_search_hits(conn)

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
