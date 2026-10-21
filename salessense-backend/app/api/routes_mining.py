"""
Data Mining API Routes
Exposes retail data mining algorithms over the data warehouse:
- Apriori Market Basket Association Rule Mining
- K-Means Demand Regime Clustering
- Rolling Seasonal Anomaly Detection with Stockout Attribution
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from app.api.deps import get_current_user
from app.services.mining_service import mining_engine

router = APIRouter(prefix="/mining", tags=["Data Mining"])


def _get_user_allowed_stores(current_user: Dict[str, Any]) -> Optional[List[str]]:
    role = current_user.get("role", "retailer")
    if role in ["admin", "ml_engineer"]:
        return None
    assigned = current_user.get("assigned_stores", [])
    if not assigned:
        assigned = current_user.get("allowed_stores", [])
    if "*" in assigned:
        return None
    return assigned


@router.get("/market-basket")
def get_market_basket_analysis(
    min_support: float = Query(0.05, ge=0.001, le=1.0, description="Minimum support threshold"),
    min_confidence: float = Query(0.2, ge=0.01, le=1.0, description="Minimum confidence threshold"),
    level: str = Query("product_name", description="Analysis level: 'product_name' or 'category'"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Executes Apriori association rule mining for cross-product purchase associations."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        result = mining_engine.market_basket_analysis(
            min_support=min_support,
            min_confidence=min_confidence,
            level=level,
            allowed_stores=allowed_stores,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demand-clusters")
def get_demand_regime_clusters(
    n_clusters: int = Query(4, ge=2, le=8, description="Number of demand regime clusters"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Executes K-Means clustering across store-SKU velocity and volatility profiles."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        result = mining_engine.demand_regime_clustering(
            n_clusters=n_clusters,
            allowed_stores=allowed_stores,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomalies")
def get_sales_anomalies(
    store_id: Optional[str] = Query(None, description="Optional store filter"),
    product_id: Optional[str] = Query(None, description="Optional product filter"),
    z_threshold: float = Query(1.8, ge=1.0, le=5.0, description="Z-score anomaly threshold"),
    rolling_window: int = Query(7, ge=3, le=30, description="Rolling baseline window in days"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Detects sales spikes and plunges with stockout loss cross-referencing."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        if store_id and allowed_stores and store_id not in allowed_stores:
            raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this store.")

        result = mining_engine.detect_anomalies(
            store_id=store_id,
            product_id=product_id,
            z_threshold=z_threshold,
            rolling_window=rolling_window,
            allowed_stores=allowed_stores,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comovement")
def get_demand_comovement(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Computes cross-product synchronous demand co-movement correlation matrix."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        result = mining_engine.demand_comovement_analysis(allowed_stores=allowed_stores)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
