import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure sibling packages (api, core, …) resolve when cwd is not backend/.
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
_STATIC_ROOT = _ROOT / "static"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from api.docs_chrome import FOOTER_HTML, HEADER_HTML
from api.endpoints import router as api_router
from core.config import get_settings
from core.constants import (
    API_PREFIX,
    API_STATIC_MOUNT,
    DEFAULT_CORS_ALLOW_CREDENTIALS,
    GZIP_COMPRESSLEVEL,
    GZIP_MINIMUM_SIZE,
)
from core.database import close_db_connection, init_db_connection, verify_db_at_startup

_settings = get_settings()


def _configure_logging() -> None:
    level = getattr(logging, _settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    )


_configure_logging()
logger = logging.getLogger(__name__)

_cors = _settings.cors_config()
if "*" in _settings.cors_allowed_origins and DEFAULT_CORS_ALLOW_CREDENTIALS:
    logger.warning(
        "CORS_ALLOWED_ORIGINS contains '*'; credentials are disabled because "
        "browsers reject that combination"
    )
logger.info(
    "CORS configured: origins=%s credentials=%s methods=%s headers=%s",
    _cors.allow_origins,
    _cors.allow_credentials,
    _cors.allow_methods,
    _cors.allow_headers,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db_connection()
    fts_ok, search_ok = verify_db_at_startup()
    if fts_ok and search_ok:
        logger.info("global_search table and FTS index are available")
    elif fts_ok:
        logger.warning(
            "FTS extension loaded but global_search / fts_main_global_search "
            "not found — run global-search rebuild on the database"
        )
    else:
        logger.warning("FTS extension unavailable — global search endpoints will be degraded")
    yield
    close_db_connection()


app = FastAPI(
    title="AMR Data Portal API",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors.allow_origins,
    allow_credentials=_cors.allow_credentials,
    allow_methods=_cors.allow_methods,
    allow_headers=_cors.allow_headers,
)

app.add_middleware(
    GZipMiddleware,
    minimum_size=GZIP_MINIMUM_SIZE,
    compresslevel=GZIP_COMPRESSLEVEL,
)

app.mount(API_STATIC_MOUNT, StaticFiles(directory=_STATIC_ROOT), name="api-static")
app.include_router(api_router, prefix=API_PREFIX)


@app.get("/docs", include_in_schema=False)
def custom_swagger_ui() -> HTMLResponse:
    swagger = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )
    html = swagger.body.decode("utf-8")
    html = html.replace(
        "</head>",
        '  <link rel="stylesheet" href="/api-static/ninja/swagger-ui-custom.css">\n'
        '  <link rel="stylesheet" href="https://assets.emblstatic.net/vf/v2.5.7/css/styles.css"/>\n'
        '  <link rel="stylesheet" href="https://assets.emblstatic.net/vf/v2/assets/ebi-header-footer/ebi-header-footer.css"/>\n'
        '  <link rel="stylesheet" href="//ebi.emblstatic.net/web_guidelines/EBI-Icon-fonts/v1.3/fonts.css"/>\n'
        "</head>",
    )
    html = html.replace('<div id="swagger-ui">', f'{HEADER_HTML}\n<div id="swagger-ui">')
    html = html.replace(
        "</body>",
        f"{FOOTER_HTML}\n"
        '  <script defer src="//ebi.emblstatic.net/web_guidelines/EBI-Framework/v1.4/js/script.js"></script>\n'
        '  <script src="/api-static/ninja/swagger-ui-custom-init.js"></script>\n'
        "</body>",
    )
    return HTMLResponse(content=html)
