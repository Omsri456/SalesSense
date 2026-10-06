from fastapi import APIRouter, Query
from app.db.schemas import ForecastResponse, ForecastRequest
from app.services.forecast_service import forecast_service

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/{store_id}/{product_id}", response_model=ForecastResponse)
async def get_forecast(
    store_id: str,
    product_id: str,
    horizon_days: int = Query(90, ge=7, le=365, description="Forecast horizon in days"),
):
    """
    Retrieve sales forecast for store & product combination.
    Returns the champion best model by default alongside comparison metrics.
    """
    return forecast_service.get_forecast(store_id, product_id, horizon_days)


@router.post("", response_model=ForecastResponse)
async def create_forecast(req: ForecastRequest):
    """
    Trigger or re-compute forecast pipeline.
    """
    return forecast_service.get_forecast(req.store_id, req.product_id, req.horizon_days)


@router.get("/accuracy-history/{store_id}/{product_id}")
async def get_accuracy_history_endpoint(store_id: int, product_id: int):
    """
    Track historical forecast accuracy metrics over time (FR-14).
    """
    from app.services.accuracy_service import get_accuracy_history
    return await get_accuracy_history(store_id, product_id)

