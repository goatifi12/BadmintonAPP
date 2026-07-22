from __future__ import annotations

import sys
from pathlib import Path

from a2wsgi import ASGIMiddleware

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as fastapi_app  # noqa: E402

application = ASGIMiddleware(fastapi_app)
