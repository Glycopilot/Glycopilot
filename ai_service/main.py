from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.routes.predict import router as predict_router
from api.routes.health import router as health_router
from models.ensemble import ensemble_model
from core.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading models...")
    ensemble_model.load()
    logger.info("Models ready.")
    yield
    logger.info("Shutting down AI service.")


app = FastAPI(
    title="Glycopilot AI Service",
    description="Multi-horizon glucose prediction microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(predict_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
