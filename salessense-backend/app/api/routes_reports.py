"""
Analytical Reporting Engine Routes (Task 8)
Generates authentic enterprise reports sourced directly from:
- Star Schema DW Facts (OLAP Rollup & Sales Summary)
- Perishable Inventory Replenishment & Expiry Service
- Historical Forecast Accuracy Backtest Service
- Multi-Model Chronological Tournament Diagnostics

Enforces store-scoped RBAC: Retailers only access assigned stores;
Admins and ML Engineers have cross-store operational visibility.
"""

from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import pandas as pd
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.api.deps import get_current_user, verify_store_access
from app.dw.dimensional_model import dw_engine
from app.services.olap_service import olap_engine

logger = logging.getLogger("salessense.api.reports")
router = APIRouter(prefix="/reports", tags=["Analytical Reports"])


@router.get("/sales-summary")
async def get_sales_summary_report(
    store_id: str = Query("STORE_01", description="Store ID or 'all'"),
    date_range: str = Query("30d", description="7d, 30d, 90d, or ytd"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Computes verified Sales Summary from Kimball Star Schema facts
    scoped to the user's authorized store access and selected date range.
    """
    await verify_store_access(store_id, current_user)

    facts_df = dw_engine.get_facts_view()
    if facts_df is None or facts_df.empty:
        return {
            "store_id": store_id,
            "date_range": date_range,
            "total_revenue": 0.0,
            "total_units": 0,
            "categories": [],
            "top_skus": [],
        }

    # Store slice
    store_slice = facts_df if store_id == "all" else facts_df[facts_df["store_id"] == store_id]
    if store_slice.empty:
        return {
            "store_id": store_id,
            "date_range": date_range,
            "total_revenue": 0.0,
            "total_units": 0,
            "categories": [],
            "top_skus": [],
        }

    date_col = "full_date" if "full_date" in store_slice.columns else ("date" if "date" in store_slice.columns else "date_key")
    parsed_dates = pd.to_datetime(store_slice[date_col], errors="coerce")
    valid_dates = parsed_dates.dropna()

    if valid_dates.empty:
        filtered_df = store_slice
        start_str = "N/A"
        end_str = "N/A"
    else:
        max_dt = valid_dates.max()
        if date_range == "7d":
            min_dt = max_dt - pd.Timedelta(days=7)
        elif date_range == "30d":
            min_dt = max_dt - pd.Timedelta(days=30)
        elif date_range == "90d":
            min_dt = max_dt - pd.Timedelta(days=90)
        else:  # ytd
            min_dt = pd.Timestamp(f"{max_dt.year}-01-01")

        date_mask = (parsed_dates >= min_dt) & (parsed_dates <= max_dt)
        filtered_df = store_slice[date_mask].copy()
        if filtered_df.empty:
            filtered_df = store_slice.copy()
        start_str = str(filtered_df[date_col].min())
        end_str = str(filtered_df[date_col].max())

    rev_col = "gross_revenue" if "gross_revenue" in filtered_df.columns else "sale_amount"
    tot_rev = float(round(filtered_df[rev_col].sum(), 2))
    tot_units = int(round(filtered_df["observed_sales"].sum())) if "observed_sales" in filtered_df.columns else int(filtered_df["sale_amount"].sum())
    tot_latent = float(round(filtered_df["estimated_latent_demand"].sum(), 2)) if "estimated_latent_demand" in filtered_df.columns else float(tot_units)
    tot_lost_rev = float(round(filtered_df["lost_revenue_estimate"].sum(), 2)) if "lost_revenue_estimate" in filtered_df.columns else 0.0
    avg_conf = float(round(filtered_df["recovery_confidence"].mean(), 2)) if "recovery_confidence" in filtered_df.columns else 1.0

    # Category breakdown (OLAP Rollup)
    cat_rows = []
    for cat_name, c_group in filtered_df.groupby("category"):
        cat_rev = float(round(c_group[rev_col].sum(), 2))
        cat_units = int(round(c_group["observed_sales"].sum())) if "observed_sales" in c_group.columns else 0
        cat_latent = float(round(c_group["estimated_latent_demand"].sum(), 2)) if "estimated_latent_demand" in c_group.columns else float(cat_units)
        cat_lost = float(round(c_group["lost_revenue_estimate"].sum(), 2)) if "lost_revenue_estimate" in c_group.columns else 0.0
        cat_conf = float(round(c_group["recovery_confidence"].mean(), 2)) if "recovery_confidence" in c_group.columns else 1.0
        cat_rows.append({
            "category": str(cat_name),
            "revenue": cat_rev,
            "units_sold": cat_units,
            "latent_demand": cat_latent,
            "lost_revenue_estimate": cat_lost,
            "recovery_confidence": cat_conf,
            "sku_count": int(c_group["product_id"].nunique()),
        })
    cat_rows.sort(key=lambda x: x["revenue"], reverse=True)

    # Top SKUs breakdown
    sku_rows = []
    for pid, p_group in filtered_df.groupby("product_id"):
        frow = p_group.iloc[0]
        s_rev = float(round(p_group[rev_col].sum(), 2))
        s_units = int(round(p_group["observed_sales"].sum())) if "observed_sales" in p_group.columns else 0
        s_lost = float(round(p_group["lost_revenue_estimate"].sum(), 2)) if "lost_revenue_estimate" in p_group.columns else 0.0
        sku_rows.append({
            "product_id": str(pid),
            "product_name": str(frow.get("product_name", f"SKU-{pid}")),
            "category": str(frow.get("category", "General")),
            "unit_price": float(frow.get("unit_price", 5.0)),
            "revenue": s_rev,
            "units_sold": s_units,
            "lost_revenue_estimate": s_lost,
        })
    sku_rows.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "store_id": store_id,
        "date_range": date_range,
        "date_start": start_str,
        "date_end": end_str,
        "total_revenue": tot_rev,
        "total_units": tot_units,
        "total_latent_demand": tot_latent,
        "lost_revenue_estimate": tot_lost_rev,
        "average_recovery_confidence": avg_conf,
        "categories": cat_rows,
        "top_skus": sku_rows[:15],
    }
