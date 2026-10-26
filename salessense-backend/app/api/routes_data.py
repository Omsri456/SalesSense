import io
import os
import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status

from app.db.schemas import ProductItem, DatasetSummary, CensoringSummary
from app.data.ingestion_service import ingestion_service
from app.services.censored_demand_service import censored_demand_service
from app.api.deps import get_current_user, require_role

router = APIRouter(tags=["Data"])


@router.get("/products", response_model=List[ProductItem])
async def list_products(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    List available store-product series.
    Dynamically computed from active dataset observations, filtered
    by the authenticated user's assigned store scope.
    """
    role = current_user.get("role", "retailer")
    assigned = current_user.get("assigned_stores", [])

    store_filter = None if (role == "admin" or "*" in assigned) else assigned
    products = ingestion_service.get_dynamic_products(store_filter=store_filter)

    # Return validated ProductItem models
    return [ProductItem(**p) for p in products]


@router.get("/dataset/summary", response_model=DatasetSummary)
async def get_dataset_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Summary metrics on the ingested FreshRetailNet-50K series.
    Dynamically calculated from real active observations with live row counts,
    date ranges, and stockout censoring frequencies.
    """
    stats = ingestion_service.compute_dynamic_statistics()
    return DatasetSummary(
        dataset_name=stats["dataset_name"],
        total_series=stats["total_store_product_series"],
        total_rows=stats["total_rows"],
        date_range_start=stats["date_range_start"],
        date_range_end=stats["date_range_end"],
        status=stats["status"],
        columns=stats["columns"],
        unique_stores=stats["unique_stores"],
        unique_products=stats["unique_products"],
        stockout_affected_count=stats["stockout_affected_count"],
        censoring_rate_pct=stats["censoring_rate_pct"],
    )


@router.get("/dataset/censoring-summary", response_model=CensoringSummary)
async def get_censoring_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieve stockout-censored demand metrics and latent demand estimates (Research Alignment §3).
    Quantifies the gap between observed sales and true unconstrained demand.
    """
    df = ingestion_service.load_active_dataset()
    summary = censored_demand_service.get_censoring_summary(df)
    return CensoringSummary(**summary)


@router.post("/dataset/upload")
async def upload_dataset_file(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_role(["admin", "ml_engineer"])),
):
    """
    Upload and ingest a new retail sales dataset file (CSV/Parquet).
    Enforces server-side schema validation, duplicate detection, and stockout preservation.
    Restricted to ML Engineers and Administrators.
    """
    filename = file.filename or "uploaded_dataset.csv"
    if not (filename.endswith(".csv") or filename.endswith(".parquet")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a CSV (.csv) or Parquet (.parquet) file.",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        if filename.endswith(".parquet"):
            df = pd.read_parquet(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse dataset file: {str(e)}")

    try:
        report = ingestion_service.save_dataset(df, source_provenance=filename)

        # Force synchronous warehouse rebuild and invalidate model cache
        from app.dw.dimensional_model import dw_engine
        from app.api.routes_models import clear_model_cache

        dw_engine.build_warehouse(force_rebuild=True)
        clear_model_cache()

        return {
            "status": "success",
            "message": f"Dataset '{filename}' successfully validated and ingested. Warehouse and model cache re-synchronized.",
            "report": report,
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Dataset validation failed: {str(e)}")
