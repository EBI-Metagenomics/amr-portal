from core.sql_utils import quote_column_name


def test_quote_column_name():
    assert quote_column_name("BioSample_ID") == '"BioSample_ID"'
