"""
Data Warehouse & OLAP API Routes
Provides endpoints for multidimensional analysis, star schema inspection, and ETL pipeline runs:
- Metadata & Star Schema overview
- Schema Topology for Visual Star Diagram
- ETL Run execution & audit run history
- Rollup
- Drill-Down
- Slice
- Dice
- Pivot
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, require_role
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
def get_warehouse_metadata(current_user: Dict[str, Any] = Depends(require_role(["admin"]))):
    """Retrieve metadata about the Kimball Star Schema and tables."""
    return dw_engine.get_warehouse_metadata()


@router.get("/schema")
def get_star_schema_topology(current_user: Dict[str, Any] = Depends(require_role(["admin"]))):
    """
    Returns explicit Kimball Star Schema topology:
    Fact table with grain, additive measures, and surrounding dimension tables with hierarchies.
    Powers the Star Schema Visualizer on the frontend.
    """
    meta = dw_engine.get_warehouse_metadata()
    return {
        "fact_table": {
            "name": "FactDailySales",
            "grain": "Store x Product x Day",
            "primary_key": "fact_id",
            "total_rows": meta.get("total_facts", 0),
            "measures": [
                {"name": "observed_sales", "type": "FLOAT", "description": "Actual observed unit volume"},
                {"name": "gross_revenue", "type": "FLOAT", "description": "Net monetary sales after discounts"},
                {"name": "estimated_latent_demand", "type": "FLOAT", "description": "Model-recovered unconstrained demand"},
                {"name": "lost_sales_estimate", "type": "FLOAT", "description": "Estimated unfulfilled demand units"},
                {"name": "lost_revenue_estimate", "type": "FLOAT", "description": "Revenue lost due to stockouts"},
            ],
            "foreign_keys": [
                {"column": "store_key", "references": "DimStore.store_key"},
                {"column": "product_key", "references": "DimProduct.product_key"},
                {"column": "date_key", "references": "DimDate.date_key"},
                {"column": "stockout_key", "references": "DimStockout.stockout_key"},
                {"column": "promotion_key", "references": "DimPromotion.promotion_key"},
            ]
        },
        "dimensions": [
            {
                "name": "DimStore",
                "table": "dim_store",
                "key": "store_key",
                "natural_key": "store_id",
                "attributes": ["store_name", "city_id", "region_name", "store_tier"],
                "cardinality": meta.get("dimensions", {}).get("DimStore", 0),
            },
            {
                "name": "DimProduct",
                "table": "dim_product",
                "key": "product_key",
                "natural_key": "product_id",
                "attributes": ["product_name", "category", "management_group_id", "first_category_id", "second_category_id", "third_category_id", "unit_price"],
                "cardinality": meta.get("dimensions", {}).get("DimProduct", 0),
            },
            {
                "name": "DimDate",
                "table": "dim_date",
                "key": "date_key",
                "natural_key": "full_date",
                "attributes": ["day_name", "day_of_week", "day_of_month", "month", "month_name", "quarter", "year", "is_weekend", "holiday_flag"],
                "cardinality": meta.get("dimensions", {}).get("DimDate", 0),
            },
            {
                "name": "DimStockout",
                "table": "dim_stockout",
                "key": "stockout_key",
                "natural_key": "stock_hour6_22_cnt",
                "attributes": ["in_stock_hours", "stockout_hours", "is_censored", "severity_label"],
                "cardinality": meta.get("dimensions", {}).get("DimStockout", 0),
            },
            {
                "name": "DimPromotion",
                "table": "dim_promotion",
                "key": "promotion_key",
                "natural_key": "promotion_code",
                "attributes": ["promotion_name", "discount_rate", "activity_flag", "is_holiday"],
                "cardinality": meta.get("dimensions", {}).get("DimPromotion", 3),
            },
            {
                "name": "DimWeather",
                "table": "dim_weather",
                "key": "weather_key",
                "natural_key": "date_str",
                "attributes": ["avg_temperature", "avg_humidity", "precpt", "avg_wind_level", "weather_condition"],
                "cardinality": meta.get("dimensions", {}).get("DimWeather", 0),
            },
        ],
    }


@router.post("/rebuild")
def rebuild_warehouse(current_user: Dict[str, Any] = Depends(require_role(["admin"]))):
    """Rebuilds the dimensional data warehouse from staging data."""
    meta = dw_engine.build_warehouse(force_rebuild=True)
    return {"message": "Warehouse successfully rebuilt", "metadata": meta}


@router.post("/etl/run")
def execute_etl_pipeline(current_user: Dict[str, Any] = Depends(require_role(["admin"]))):
    """
    Executes complete Extract-Transform-Load (ETL) pipeline with stage reconciliation.
    Records audit log in persistent EtlRun table.
    """
    meta = dw_engine.build_warehouse(force_rebuild=True)
    latest_run = dw_engine.get_latest_etl_run()
    return {
        "status": "success",
        "message": "ETL pipeline completed successfully and persisted to database.",
        "etl_run": latest_run,
        "metadata": meta,
    }


@router.get("/etl/runs")
def list_etl_runs(
    limit: int = Query(10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """Retrieves history of ETL pipeline executions from persistent database."""
    return dw_engine.get_etl_runs(limit=limit)


@router.post("/rollup")
def execute_rollup(
    req: RollupRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rollup execution failed: {str(e)}")


@router.post("/drilldown")
def execute_drilldown(
    req: DrilldownRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drilldown execution failed: {str(e)}")


@router.post("/slice")
def execute_slice(
    req: SliceRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """Slice warehouse cube along a single dimension."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slice execution failed: {str(e)}")


@router.post("/dice")
def execute_dice(
    req: DiceRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """Dice the warehouse cube across multi-dimensional criteria."""
    try:
        allowed_stores = _get_user_allowed_stores(current_user)
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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dice execution failed: {str(e)}")


@router.post("/pivot")
def execute_pivot(
    req: PivotRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pivot execution failed: {str(e)}")
