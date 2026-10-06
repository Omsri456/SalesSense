from fastapi import APIRouter
from typing import List
from app.db.schemas import ModelSummary, ModelMetrics

router = APIRouter(prefix="/models", tags=["Models"])

BENCHMARK_MODELS: List[ModelSummary] = [
    ModelSummary(
        id="lstm",
        name="LSTM Network",
        type="Deep Learning",
        description="Multi-layer recurrent network tuned for long, complex seasonal sequences.",
        status="trained",
        trainedAt="2 hours ago",
        metrics=ModelMetrics(r2=0.941, rmse=1140, wmape=0.058, mae=812, accuracy=94.2),
        hyperparameters={"Layers": 3, "Units": 64, "Dropout": 0.2, "Epochs": 50, "Learning rate": 0.001},
    ),
    ModelSummary(
        id="prophet",
        name="Prophet",
        type="Additive Model",
        description="Additive model robust to holidays and missing data.",
        status="trained",
        trainedAt="3 days ago",
        metrics=ModelMetrics(r2=0.925, rmse=1210, wmape=0.072, mae=890, accuracy=92.8),
        hyperparameters={"Changepoint prior scale": 0.05, "Seasonality mode": "multiplicative", "Holidays": "US Retail"},
    ),
    ModelSummary(
        id="sarima",
        name="SARIMA",
        type="Statistical",
        description="Seasonal ARIMA tuned on monthly retail seasonality.",
        status="trained",
        trainedAt="1 day ago",
        metrics=ModelMetrics(r2=0.908, rmse=1320, wmape=0.085, mae=960, accuracy=91.5),
        hyperparameters={"Order": "(2,1,2)", "Seasonal order": "(1,1,1,12)", "Seasonal period": 12},
    ),
]


@router.get("", response_model=List[ModelSummary])
async def list_models():
    """
    List all active forecasting models and their benchmark evaluation metrics.
    """
    return BENCHMARK_MODELS
