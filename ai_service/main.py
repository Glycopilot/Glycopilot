from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.routes.predict import router as predict_router
from api.routes.health import router as health_router
from api.routes.finetune import router as finetune_router
from models.ensemble import ensemble_model
from core.logger import get_logger
from core.scheduler import start_scheduler

logger = get_logger(__name__)
_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    logger.info("Loading models...")
    ensemble_model.load()
    logger.info("Models ready.")
    _scheduler = start_scheduler()
    yield
    if _scheduler:
        _scheduler.shutdown(wait=False)
    logger.info("Shutting down AI service.")


app = FastAPI(
    title="Glycopilot AI Service",
    description="Multi-horizon glucose prediction microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(predict_router)
app.include_router(finetune_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
