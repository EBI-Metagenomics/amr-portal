import duckdb
import pytest

from amr_global_search import build_global_search


@pytest.fixture
def conn():
    connection = duckdb.connect(":memory:")
    connection.execute(
        """
        CREATE TABLE phenotype AS SELECT
            'SAMEA1'::VARCHAR AS BioSample_ID,
            'SRR1'::VARCHAR AS SRA_accession,
            'GCA_001'::VARCHAR AS assembly_ID,
            'amikacin'::VARCHAR AS antibiotic_name
        """
    )
    connection.execute(
        """
        CREATE TABLE genotype AS SELECT
            'SAMEA2'::VARCHAR AS BioSample_ID,
            'GCA_002'::VARCHAR AS assembly_ID,
            'locus1'::VARCHAR AS id,
            'tetA'::VARCHAR AS gene_symbol,
            'tetA'::VARCHAR AS amr_element_symbol,
            'tetracycline'::VARCHAR AS antibiotic_name
        """
    )
    connection.execute(
        """
        CREATE TABLE pheno_geno_merged AS SELECT
            'SAMEA3'::VARCHAR AS BioSample_ID,
            'SRR3'::VARCHAR AS SRA_accession,
            'GCA_003'::VARCHAR AS assembly_ID,
            'locus2'::VARCHAR AS id,
            'blaOXA'::VARCHAR AS gene_symbol,
            'blaOXA'::VARCHAR AS amr_element_symbol,
            'amoxicillin'::VARCHAR AS antibiotic_name
        """
    )
    yield connection
    connection.close()


def test_build_global_search_creates_table_and_fts_index(conn):
    build_global_search(conn)

    counts = conn.execute(
        "SELECT source_table, COUNT(*) FROM global_search GROUP BY source_table ORDER BY 1"
    ).fetchall()
    assert counts == [("genotype", 1), ("pheno_geno_merged", 1), ("phenotype", 1)]


def test_global_search_finds_gene_symbol(conn):
    build_global_search(conn)

    hits = conn.execute(
        """
        WITH query AS (SELECT lower('tetA') AS q)
        SELECT source_table, gene_symbol
        FROM global_search g, query q
        WHERE fts_main_global_search.match_bm25(g.rowid, q.q) IS NOT NULL
        """
    ).fetchall()

    assert ("genotype", "tetA") in hits
