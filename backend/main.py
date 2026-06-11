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
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from api.endpoints import router as api_router
from api.docs_chrome import FOOTER_HTML, HEADER_HTML
from core.config import get_settings
from core.duckdb_conn import connect_duckdb, verify_fts_extension
from services.global_search import is_global_search_available

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    conn = connect_duckdb(settings.duckdb_path, read_only=True)
    try:
        fts_ok = verify_fts_extension(conn)
        if fts_ok and is_global_search_available(conn):
            logger.info("global_search table and FTS index are available")
        elif fts_ok:
            logger.warning(
                "FTS extension loaded but global_search / fts_main_global_search "
                "not found — run global-search rebuild on the database"
            )
        else:
            logger.warning(
                "FTS extension unavailable — global search endpoints will be degraded"
            )
    finally:
        conn.close()
    yield


app = FastAPI(
    title="AMR Data Portal API",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)

app.mount("/api-static", StaticFiles(directory=_STATIC_ROOT), name="api-static")
app.include_router(api_router, prefix="/api")


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
    html = html.replace('<div id="swagger-ui">', f"{HEADER_HTML}\n<div id=\"swagger-ui\">")
    html = html.replace(
        "</body>",
        f"{FOOTER_HTML}\n"
        '  <script defer src="//ebi.emblstatic.net/web_guidelines/EBI-Framework/v1.4/js/script.js"></script>\n'
        '  <script src="/api-static/ninja/swagger-ui-custom-init.js"></script>\n'
        "</body>",
    )
    return HTMLResponse(content=html)
