"""
Model Governance & Tournament Evaluation Routes
Allows ML Engineers, Admins, and Retailers to view champion model benchmarks,
tournament metrics (R², RMSE, wMAPE, MAE), and trigger retraining runs.
"""

from typing import List, Dict, Any, Optional
import time
import logging
from fastapi import APIRouter, Depends, Query, HTTPException

from app.api.deps import get_current_user, require_role
from app.db.schemas import UserResponse, ModelSummary, ModelMetrics
from app.data.loader import load_series_data
from app.data.preprocessing import preprocess_series
from app.services.censored_demand_service import censored_demand_service
from app.evaluation.backtest import run_chronological_backtest

logger = logging.getLogger("salessense.api.models")

router = APIRouter(prefix="/models", tags=["Models"])

_MODEL_CACHE: Dict[str, Any] = {}


def _run_tournament(store_id: str = "STORE_01", product_id: str = "all") -> List[ModelSummary]:
    raw_df = load_series_data(store_id=store_id if store_id != "all" else None, product_id=product_id if product_id != "all" else None)
    if raw_df.empty:
        raise HTTPException(status_code=404, detail="No observations found to evaluate models.")

    featured_df = preprocess_series(raw_df, store_id=store_id, product_id=product_id)
    featured_df = censored_demand_service.estimate_latent_demand(featured_df)

    target_col = "estimated_latent_demand" if "estimated_latent_demand" in featured_df.columns else "sale_amount"
    backtest_window = featured_df.tail(min(len(featured_df), 1000)).reset_index(drop=True)

    backtest_res = run_chronological_backtest(backtest_window, train_ratio=0.8, target_col=target_col)

    model_summaries = []
    for m in backtest_res["model_summaries"]:
        is_champ = m["name"] == backtest_res["champion_name"]
        status_label = "Champion (Selected)" if is_champ else "Evaluated"
        desc = (
            f"{m['name']} forecasting model. Selected as champion: {backtest_res['champion_reason']}"
            if is_champ
            else f"{m['name']} candidate model evaluated on chronological holdout."
        )
        model_summaries.append(
            ModelSummary(
                id=m["model_id"],
                name=m["name"],
                type=m["type"],
                description=desc,
                status=status_label,
                trainedAt="Just now",
                metrics=ModelMetrics(**m["metrics"]),
                hyperparameters=m.get("hyperparameters", {}),
            )
        )

    _MODEL_CACHE["latest"] = {
        "timestamp": time.time(),
        "store_id": store_id,
        "product_id": product_id,
        "champion": backtest_res["champion_name"],
        "reason": backtest_res["champion_reason"],
        "summaries": model_summaries,
    }
    return model_summaries


@router.get("", response_model=List[ModelSummary])
async def list_models(
    store_id: str = Query("STORE_01", description="Store ID to benchmark"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    List all active forecasting models and their dynamic benchmark evaluation metrics.
    """
    # Check cache (valid for 15 minutes)
    if "latest" in _MODEL_CACHE and (time.time() - _MODEL_CACHE["latest"]["timestamp"] < 900):
        if _MODEL_CACHE["latest"]["store_id"] == store_id:
            return _MODEL_CACHE["latest"]["summaries"]

    try:
        return _run_tournament(store_id=store_id, product_id="all")
    except Exception as e:
        logger.warning("Dynamic tournament encountered error: %s, falling back to cache if present", e)
        if "latest" in _MODEL_CACHE:
            return _MODEL_CACHE["latest"]["summaries"]
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train")
@router.post("/retrain")
async def trigger_model_retraining(
    store_id: str = Query("STORE_01", description="Store to retrain models for"),
    product_id: str = Query("all", description="Product to retrain models for"),
    current_user: UserResponse = Depends(require_role(["admin", "ml_engineer"])),
):
    """
    Triggers chronological backtesting tournament retraining across SARIMA, Prophet, and LSTM
    using stockout-recovered latent demand target.
    Requires ML Engineer or Admin role.
    """
    try:
        summaries = _run_tournament(store_id=store_id, product_id=product_id)
        cached = _MODEL_CACHE.get("latest", {})
        return {
            "message": "Model retraining tournament completed successfully.",
            "champion_model": cached.get("champion"),
            "selection_rationale": cached.get("reason"),
            "models": summaries,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")
