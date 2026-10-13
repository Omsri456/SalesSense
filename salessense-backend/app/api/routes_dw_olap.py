"""
Data Warehouse & OLAP API Routes
Provides endpoints for multidimensional analysis:
- Metadata & Star Schema overview
- Rollup
- Drill-Down
- Slice
- Dice
- Pivot
- Rebuild Warehouse
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, require_role
from app.db.schemas import UserResponse
from app.dw.dimensional_model import dw_engine
from app.services.olap_service import olap_engine

router = APIRouter(prefix="/dw", tags=["Data Warehouse & OLAP"])


class RollupRequest(BaseModel):
    hierarchy_level: str = Field(..., description="Level to roll up to, e.g., 'category', 'month_name', 'store_id'")
    metric: Optional[str] = Field("observed_sales", description="Metric to aggregate, e.g. observed_sales, gross_revenue")
    filters: Optional[Dict[str, Any]] = Field(None, description="Optional dimension filters")


class DrilldownRequest(BaseModel):
    parent_dimension: str = Field(..., description="Parent dimension, e.g., 'category'")
    parent_value: Any = Field(..., description="Parent value, e.g., 'Bakery'")
    child_dimension: str = Field(..., description="Child dimension to disaggregate to, e.g., 'product_name'")
    metric: Optional[str] = Field("observed_sales", description="Metric to aggregate")


class SliceRequest(BaseModel):
    dimension: str = Field(..., description="Dimension to slice, e.g. 'store_id' or 'category'")
    value: Any = Field(..., description="Dimension value to filter by, e.g. 'STORE_01'")
    time_grain: Optional[str] = Field("date_str", description="Time granularity: 'date_str' or 'month_name'")


class DiceRequest(BaseModel):
    store_ids: Optional[List[str]] = Field(None, description="Stores to filter")
    categories: Optional[List[str]] = Field(None, description="Categories to filter")
    product_ids: Optional[List[str]] = Field(None, description="Products to filter")
    date_start: Optional[str] = Field(None, description="Start date YYYY-MM-DD")
    date_end: Optional[str] = Field(None, description="End date YYYY-MM-DD")


class PivotRequest(BaseModel):
    row_dim: str = Field(..., description="Dimension for rows, e.g. 'product_name' or 'category'")
    col_dim: str = Field(..., description="Dimension for columns, e.g. 'month_name' or 'store_id'")
    val_metric: Optional[str] = Field("observed_sales", description="Metric, e.g. 'observed_sales' or 'gross_revenue'")
    aggfunc: Optional[str] = Field("sum", description="Aggregation function: sum, mean, count")


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


@router.get("/metadata")
def get_warehouse_metadata(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve metadata about the Kimball Star Schema and tables."""
    return dw_engine.get_warehouse_metadata()


@router.post("/rebuild")
def rebuild_warehouse(current_user: Dict[str, Any] = Depends(require_role(["admin", "ml_engineer"]))):
    """Rebuilds the dimensional data warehouse from staging data."""
    meta = dw_engine.build_warehouse(force_rebuild=True)
    return {"message": "Warehouse successfully rebuilt", "metadata": meta}


@router.post("/rollup")
def execute_rollup(
    req: RollupRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Roll up facts to a higher-level dimensional hierarchy."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        results = olap_engine.rollup(
            hierarchy_level=req.hierarchy_level,
            metric=req.metric,
            allowed_stores=allowed_stores,
            filters=req.filters,
        )
        return {"hierarchy_level": req.hierarchy_level, "metric": req.metric, "data": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/drilldown")
def execute_drilldown(
    req: DrilldownRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Drill down from a parent category to granular child items."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        results = olap_engine.drilldown(
            parent_dimension=req.parent_dimension,
            parent_value=req.parent_value,
            child_dimension=req.child_dimension,
            metric=req.metric,
            allowed_stores=allowed_stores,
        )
        return {
            "parent_dimension": req.parent_dimension,
            "parent_value": req.parent_value,
            "child_dimension": req.child_dimension,
            "data": results,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/slice")
def execute_slice(
    req: SliceRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Slice warehouse cube along a single dimension."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        # If user is scoped to specific stores and slices by store_id, verify access
        if req.dimension == "store_id" and allowed_stores and req.value not in allowed_stores:
            raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this store.")

        result = olap_engine.slice(
            dimension=req.dimension,
            value=req.value,
            time_grain=req.time_grain or "date_str",
            allowed_stores=allowed_stores,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dice")
def execute_dice(
    req: DiceRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Dice the warehouse cube across multi-dimensional criteria."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        # Reconcile requested stores with allowed stores
        scoped_stores = req.store_ids
        if allowed_stores:
            if scoped_stores:
                scoped_stores = [s for s in scoped_stores if s in allowed_stores]
            else:
                scoped_stores = allowed_stores

        result = olap_engine.dice(
            store_ids=scoped_stores,
            categories=req.categories,
            product_ids=req.product_ids,
            date_start=req.date_start,
            date_end=req.date_end,
            allowed_stores=allowed_stores,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pivot")
def execute_pivot(
    req: PivotRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Generate a 2D cross-tabulation pivot matrix."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
        result = olap_engine.pivot(
            row_dim=req.row_dim,
            col_dim=req.col_dim,
            val_metric=req.val_metric,
            aggfunc=req.aggfunc or "sum",
            allowed_stores=allowed_stores,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
