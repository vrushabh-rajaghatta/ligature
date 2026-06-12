"""Router registry. Each module ports one src/app/api/<domain> route group."""
from fastapi import FastAPI

from app.routers import auth, health, version


def register_routers(app: FastAPI) -> None:
    app.include_router(auth.router)
    app.include_router(health.router)
    app.include_router(version.router)
