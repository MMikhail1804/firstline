from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analytics import get_stats
from routes.insights import router as insights_router
from routes.generate import router as generate_router

app = FastAPI(title="FirstLine API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insights_router)
app.include_router(generate_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/stats")
async def stats():
    return get_stats()
