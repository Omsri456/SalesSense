"""
Kimball Dimensional Data Warehouse Engine
Transforms clean operational staging data ('raw_sales') into Star Schema dimensional structures:
- FactDailySales (Additive sales, stockout hours, latent demand)
- DimStore (Store, City, Region, Tier)
- DimProduct (Product, Category Hierarchy: First, Second, Third)
- DimDate (Calendar dimensions, Holidays, Cyclicality)
- DimWeather (Meteorological indicators)
- DimStockout (Censoring durations, severity)
"""

from typing import Dict, Any, List, Optional
import logging
import hashlib
import numpy as np
import pandas as pd
from datetime import datetime

from app.data.ingestion_service import ingestion_service
from app.services.censored_demand_service import censored_demand_service

logger = logging.getLogger("salessense.dw")


class DimensionalModelEngine:
    def __init__(self):
        self._dim_store: Optional[pd.DataFrame] = None
        self._dim_product: Optional[pd.DataFrame] = None
        self._dim_date: Optional[pd.DataFrame] = None
        self._dim_weather: Optional[pd.DataFrame] = None
        self._dim_stockout: Optional[pd.DataFrame] = None
        self._fact_daily_sales: Optional[pd.DataFrame] = None

    def build_warehouse(self, force_rebuild: bool = False) -> Dict[str, Any]:
        """
        Executes ETL transformation from raw sales staging into Star Schema dimensional tables.
        """
        if not force_rebuild and self._fact_daily_sales is not None:
            return self.get_warehouse_metadata()

        logger.info("Building Kimball Dimensional Star Schema Data Warehouse...")
        raw_df = ingestion_service.load_active_dataset()
        if raw_df.empty:
            raise ValueError("Staging data is empty. Cannot build dimensional warehouse.")

        # Ensure latent demand recovery is calculated
        df = censored_demand_service.estimate_latent_demand(raw_df)

        # 1. DimStore
        store_records = [
            {"store_id": "STORE_01", "store_name": "Downtown Fresh Flagship", "city_id": "CITY_NORTH", "region_name": "Northern Metro", "store_tier": "Tier-1 Flagship"},
            {"store_id": "STORE_02", "store_name": "Harbor Bay Outlet", "city_id": "CITY_SOUTH", "region_name": "Southern Bay", "store_tier": "Tier-2 Standard"},
        ]
        dim_store = pd.DataFrame(store_records)
        dim_store["store_key"] = np.arange(1, len(dim_store) + 1)

        # 2. DimProduct
        prod_cols = ["product_id", "category", "management_group_id", "first_category_id", "second_category_id", "third_category_id", "unit_price"]
        prod_grouped = df.groupby("product_id").agg({
            "category": "first",
            "management_group_id": "first",
            "first_category_id": "first",
            "second_category_id": "first",
            "third_category_id": "first",
            "unit_price": "mean",
        }).reset_index()

        sku_names = {
            "SKU-ORG-01": "Organic Bananas",
            "SKU-BAK-04": "Artisan Sourdough",
            "SKU-BEV-09": "Cold Brew Coffee",
            "SKU-PAN-12": "Extra Virgin Olive Oil",
            "SKU-MEA-02": "Grass-Fed Ground Beef",
            "SKU-DAI-07": "Greek Whole Yogurt",
        }
        prod_grouped["product_name"] = prod_grouped["product_id"].map(sku_names).fillna(prod_grouped["product_id"])
        prod_grouped["unit_cost"] = prod_grouped["unit_price"].round(2)
        prod_grouped["product_key"] = np.arange(1, len(prod_grouped) + 1)
        dim_product = prod_grouped

        # 3. DimDate
        time_col = "timestamp" if "timestamp" in df.columns else "dt"
        dt_series = pd.to_datetime(df[time_col]).dt.floor("D").drop_duplicates().sort_values()
        date_records = []
        for i, d in enumerate(dt_series):
            date_records.append({
                "date_key": int(d.strftime("%Y%m%d")),
                "full_date": d.strftime("%Y-%m-%d"),
                "day_of_week": int(d.dayofweek),
                "day_name": d.strftime("%A"),
                "day_of_month": int(d.day),
                "month": int(d.month),
                "month_name": d.strftime("%B"),
                "quarter": int(d.quarter),
                "year": int(d.year),
                "is_weekend": int(d.dayofweek in [5, 6]),
                "holiday_flag": int(df[df[time_col].astype(str).str.startswith(d.strftime("%Y-%m-%d"))]["holiday_flag"].max()) if "holiday_flag" in df.columns else 0,
            })
        dim_date = pd.DataFrame(date_records)

        # 4. DimStockout
        stockout_records = []
        for cnt in range(17):
            lost = 16 - cnt
            sev = "No Stockout" if lost == 0 else ("Minor (1-3h)" if lost <= 3 else ("Moderate (4-7h)" if lost <= 7 else "Severe (8h+)"))
            stockout_records.append({
                "stockout_key": cnt + 1,
                "stock_hour6_22_cnt": cnt,
                "in_stock_hours": cnt,
                "stockout_hours": lost,
                "is_censored": cnt < 16,
                "severity_label": sev,
            })
        dim_stockout = pd.DataFrame(stockout_records)

        # 5. Build FactDailySales
        # Aggregate hourly records to daily level per (store, product, date)
        df["date_str"] = pd.to_datetime(df[time_col]).dt.strftime("%Y-%m-%d")
        df["date_key"] = pd.to_datetime(df["date_str"]).dt.strftime("%Y%m%d").astype(int)

        fact_agg = df.groupby(["store_id", "product_id", "date_key", "date_str"]).agg({
            "sale_amount": "sum",
            "unit_price": "mean",
            "discount": "mean",
            "stock_hour6_22_cnt": "min",
            "is_stockout_affected": "max",
            "estimated_latent_demand": "sum",
            "lost_sales_estimate": "sum",
            "recovery_confidence": "mean",
            "precpt": "max",
            "avg_temperature": "mean",
            "avg_humidity": "mean",
            "avg_wind_level": "mean",
        }).reset_index()

        # Join foreign keys
        fact_merged = fact_agg.merge(dim_store[["store_id", "store_key"]], on="store_id", how="left")
        fact_merged = fact_merged.merge(dim_product[["product_id", "product_key"]], on="product_id", how="left")
        fact_merged = fact_merged.merge(dim_stockout[["stock_hour6_22_cnt", "stockout_key"]], on="stock_hour6_22_cnt", how="left")

        fact_merged["observed_sales"] = fact_merged["sale_amount"].round(2)
        fact_merged["gross_revenue"] = (fact_merged["observed_sales"] * fact_merged["unit_price"] * (1.0 - fact_merged["discount"])).round(2)
        fact_merged["lost_revenue_estimate"] = (fact_merged["lost_sales_estimate"] * fact_merged["unit_price"]).round(2)
        fact_merged["fact_id"] = np.arange(1, len(fact_merged) + 1)

        self._dim_store = dim_store
        self._dim_product = dim_product
        self._dim_date = dim_date
        self._dim_stockout = dim_stockout
        self._fact_daily_sales = fact_merged

        logger.info("Successfully built Data Warehouse: %d daily fact rows across %d products and %d stores.", len(fact_merged), len(dim_product), len(dim_store))
        return self.get_warehouse_metadata()

    def get_warehouse_metadata(self) -> Dict[str, Any]:
        """Summary metrics of the dimensional warehouse schema."""
        if self._fact_daily_sales is None:
            self.build_warehouse()

        return {
            "fact_table": "FactDailySales",
            "total_facts": len(self._fact_daily_sales),
            "dimensions": {
                "DimStore": len(self._dim_store),
                "DimProduct": len(self._dim_product),
                "DimDate": len(self._dim_date),
                "DimStockout": len(self._dim_stockout),
            },
            "date_coverage": {
                "start": str(self._dim_date["full_date"].min()),
                "end": str(self._dim_date["full_date"].max()),
                "total_days": len(self._dim_date),
            },
            "financial_summary": {
                "total_units_sold": float(self._fact_daily_sales["observed_sales"].sum()),
                "total_gross_revenue": float(self._fact_daily_sales["gross_revenue"].sum()),
                "total_estimated_latent_demand": float(self._fact_daily_sales["estimated_latent_demand"].sum()),
                "total_lost_revenue_estimate": float(self._fact_daily_sales["lost_revenue_estimate"].sum()),
            },
        }

    def get_facts_view(self) -> pd.DataFrame:
        """Denormalized analytical view joining facts and dimensions."""
        if self._fact_daily_sales is None:
            self.build_warehouse()

        view = self._fact_daily_sales.merge(self._dim_store, on="store_key", suffixes=("", "_store"))
        view = view.merge(self._dim_product, on="product_key", suffixes=("", "_prod"))
        view = view.merge(self._dim_date, on="date_key", suffixes=("", "_date"))
        return view


dw_engine = DimensionalModelEngine()
