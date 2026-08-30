from contextlib import asynccontextmanager

from app.database.connection import DatabaseConnection
from app.routes import assignment, requests, retailers, status, users
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database pool
    try:
        await DatabaseConnection.init()
    except Exception as e:
        print(f"Warning: Database connection pool init error: {e}")
    yield
    # Shutdown: Close pool
    try:
        await DatabaseConnection.close()
    except Exception as e:
        print(f"Database close error: {e}")


app = FastAPI(
    title="Reflex Retail Logistics & Dispatch API",
    description="Backend delivery state machine and REST API",
    version="1.0.0",
    lifespan=lifespan,
)

import os

# Configurable CORS origins for production vs development
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(requests.router)
app.include_router(assignment.router)
app.include_router(status.router)
app.include_router(retailers.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {"message": "Reflex Retail Logistics & Dispatch API", "status": "online"}
