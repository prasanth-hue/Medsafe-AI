"""MedSafe AI API. Run:  uvicorn backend.main:app --reload --port 8000  (from the project root)."""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.api.routes import router
from backend.services import db
from backend.services.knowledge import ROOT

log = logging.getLogger("medsafe")
app = FastAPI(title="MedSafe AI", version="1.0.0", description="Explainable AI for Personalized Medication Safety (educational prototype)")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.exception_handler(StarletteHTTPException)
async def http_handler(_: Request, exc: StarletteHTTPException):
    return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    fields = ", ".join(str(e["loc"][-1]) for e in exc.errors() if e.get("loc"))
    return JSONResponse({"error": f"Some information is missing or invalid ({fields}). Please check the form and try again."}, status_code=422)


@app.exception_handler(Exception)
async def unexpected_handler(_: Request, exc: Exception):
    log.exception("Unhandled error")  # full trace stays in the server log only
    return JSONResponse({"error": "Something went wrong on the server. Please try again."}, status_code=500)


app.include_router(router)

_dist = Path(ROOT) / "frontend" / "dist"
if _dist.exists():  # optional: serve the built frontend from the API process
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
