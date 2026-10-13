from typing import Dict, Any
from fastapi import APIRouter, Query, Depends, HTTPException, status
from app.db.schemas import ForecastResponse, ForecastRequest
from app.services.forecast_service import forecast_service
from app.api.deps import get_current_user, verify_store_access

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/{store_id}/{product_id}", response_model=ForecastResponse)
async def get_forecast(
    store_id: str,
    product_id: str,
    horizon_days: int = Query(90, ge=7, le=365, description="Forecast horizon in days"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieve sales forecast for store & product combination.
    Enforces store data scope: Retailers can only access assigned stores.
    """
    # Enforce data scope
    await verify_store_access(store_id, current_user)
    return forecast_service.get_forecast(store_id, product_id, horizon_days)


@router.post("", response_model=ForecastResponse)
async def create_forecast(
    req: ForecastRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Trigger or re-compute forecast pipeline.
    Enforces store data scope.
    """
    await verify_store_access(req.store_id, current_user)
    return forecast_service.get_forecast(req.store_id, req.product_id, req.horizon_days)


@router.get("/accuracy-history/{store_id}/{product_id}")
async def get_accuracy_history_endpoint(
    store_id: str,
    product_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Track historical forecast accuracy metrics over time (FR-14).
    Fixed parameter types to str matching FreshRetailNet-50K format.
    """
    await verify_store_access(store_id, current_user)
    from app.services.accuracy_service import get_accuracy_history
    return await get_accuracy_history(store_id, product_id)
