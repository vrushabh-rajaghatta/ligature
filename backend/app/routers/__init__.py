"""Router registry. Each module ports one src/app/api/<domain> route group."""
from fastapi import FastAPI

from app.routers import audit, auth, documents, haqs, health, products, submissions, users, version


def register_routers(app: FastAPI) -> None:
    app.include_router(audit.router)
    app.include_router(auth.router)
    app.include_router(documents.router)
    app.include_router(haqs.router)
    app.include_router(health.router)
    app.include_router(products.router)
    app.include_router(submissions.router)
    app.include_router(users.router)
    app.include_router(version.router)
