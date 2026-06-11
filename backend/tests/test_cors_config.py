from core.config import _normalize_cors_origin, _parse_cors_origins, get_settings
from core.constants import (
    DEFAULT_CORS_ALLOW_CREDENTIALS,
    DEFAULT_CORS_ALLOW_HEADERS,
    DEFAULT_CORS_ALLOW_METHODS,
)


def test_parse_cors_origins_supports_csv_and_wildcard():
    assert _parse_cors_origins("*") == ["*"]
    assert _parse_cors_origins("https://a.example,https://b.example") == [
        "https://a.example",
        "https://b.example",
    ]


def test_normalize_cors_origin_adds_schemes():
    assert _normalize_cors_origin("amr-review.mgnify.org") == "https://amr-review.mgnify.org"
    assert _normalize_cors_origin("localhost") == "http://localhost"
    assert (
        _normalize_cors_origin("hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk:32028")
        == "http://hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk:32028"
    )


def test_parse_cors_origins_dedupes_dev_host_list():
    origins = _parse_cors_origins(
        "amr-review.mgnify.org,ebi.ac.uk,hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk,"
        "localhost,127.0.0.1,hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk:32028"
    )
    assert origins == [
        "https://amr-review.mgnify.org",
        "https://ebi.ac.uk",
        "http://hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk",
        "http://localhost",
        "http://127.0.0.1",
        "http://hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk:32028",
    ]


def test_cors_config_disables_credentials_for_wildcard_origin():
    cors = get_settings().model_copy(update={"cors_allowed_origins": ["*"]}).cors_config()
    assert cors.allow_origins == ["*"]
    assert cors.allow_credentials is False


def test_cors_config_uses_app_defaults_for_methods_and_headers(tmp_path, monkeypatch):
    db_file = tmp_path / "portal.duckdb"
    db_file.write_text("placeholder")
    monkeypatch.setenv("DUCKDB_PATH", str(db_file))
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://amr-review.mgnify.org")
    get_settings.cache_clear()

    cors = get_settings().cors_config()
    assert cors.allow_origins == ["https://amr-review.mgnify.org"]
    assert cors.allow_credentials is DEFAULT_CORS_ALLOW_CREDENTIALS
    assert cors.allow_methods == DEFAULT_CORS_ALLOW_METHODS
    assert cors.allow_headers == DEFAULT_CORS_ALLOW_HEADERS

    get_settings.cache_clear()
