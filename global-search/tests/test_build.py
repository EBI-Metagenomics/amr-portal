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
            'amikacin'::VARCHAR AS antibiotic_name,
            'Escherichia coli'::VARCHAR AS organism,
            'Escherichia'::VARCHAR AS genus,
            'coli'::VARCHAR AS species
        """
    )
    connection.execute(
        """
        CREATE TABLE genotype AS SELECT
            'SAMEA2'::VARCHAR AS BioSample_ID,
            'GCA_002'::VARCHAR AS assembly_ID,
            'locus1'::VARCHAR AS id,
            'tetA'::VARCHAR AS gene_symbol,
            'mph(A)'::VARCHAR AS amr_element_symbol,
            'tetracycline'::VARCHAR AS antibiotic_name,
            'Salmonella enterica'::VARCHAR AS organism,
            'Salmonella'::VARCHAR AS genus,
            'enterica'::VARCHAR AS species
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
            'amoxicillin'::VARCHAR AS antibiotic_name,
            'Escherichia coli'::VARCHAR AS organism,
            'Escherichia'::VARCHAR AS genus,
            'coli'::VARCHAR AS species,
            '562'::VARCHAR AS taxon_id
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

    columns = {
        row[0]
        for row in conn.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'global_search'
            """
        ).fetchall()
    }
    assert {"organism", "genus", "species", "taxon_id"}.issubset(columns)


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


def test_global_search_finds_bracketed_amr_element_symbol(conn):
    build_global_search(conn)

    prefix_hits = conn.execute(
        """
        WITH search_query AS (SELECT lower('mph') AS prefix),
        qtermids AS (
            SELECT dict.termid
            FROM fts_main_global_search.dict AS dict, search_query AS q
            WHERE dict.term LIKE q.prefix || '%'
        ),
        matching_docids AS (
            SELECT DISTINCT terms.docid
            FROM fts_main_global_search.terms AS terms
            WHERE terms.termid IN (SELECT termid FROM qtermids)
        )
        SELECT g.amr_element_symbol
        FROM matching_docids AS md
        INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
        INNER JOIN global_search AS g ON g.rowid = docs.name
        WHERE g.source_table = 'genotype'
        """
    ).fetchall()

    assert ("mph(A)",) in prefix_hits

    exact_hits = conn.execute(
        """
        WITH search_query AS (SELECT lower('mph(a)') AS prefix),
        qtermids AS (
            SELECT dict.termid
            FROM fts_main_global_search.dict AS dict, search_query AS q
            WHERE dict.term LIKE q.prefix || '%'
        ),
        matching_docids AS (
            SELECT DISTINCT terms.docid
            FROM fts_main_global_search.terms AS terms
            WHERE terms.termid IN (SELECT termid FROM qtermids)
        )
        SELECT g.amr_element_symbol
        FROM matching_docids AS md
        INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
        INNER JOIN global_search AS g ON g.rowid = docs.name
        WHERE g.source_table = 'genotype'
        """
    ).fetchall()

    assert ("mph(A)",) in exact_hits


def test_global_search_finds_genus_via_fts(conn):
    build_global_search(conn)

    hits = conn.execute(
        """
        WITH search_query AS (SELECT lower('salmon') AS prefix),
        qtermids AS (
            SELECT dict.termid
            FROM fts_main_global_search.dict AS dict, search_query AS q
            WHERE dict.term LIKE q.prefix || '%'
        ),
        matching_docids AS (
            SELECT DISTINCT terms.docid
            FROM fts_main_global_search.terms AS terms
            WHERE terms.termid IN (SELECT termid FROM qtermids)
        )
        SELECT g.source_table, g.genus
        FROM matching_docids AS md
        INNER JOIN fts_main_global_search.docs AS docs ON md.docid = docs.docid
        INNER JOIN global_search AS g ON g.rowid = docs.name
        """
    ).fetchall()

    assert ("genotype", "Salmonella") in hits


def test_global_search_taxon_id_stored_for_exact_lookup(conn):
    build_global_search(conn)

    row = conn.execute(
        """
        SELECT taxon_id
        FROM global_search
        WHERE source_table = 'pheno_geno_merged'
        """
    ).fetchone()
    assert row[0] == "562"

    phenotype_taxon = conn.execute(
        "SELECT taxon_id FROM global_search WHERE source_table = 'phenotype'"
    ).fetchone()
    assert phenotype_taxon[0] is None
