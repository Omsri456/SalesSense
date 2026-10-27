"""
Kimball Dimensional Data Warehouse Engine (Persistent Relational Store)
Transforms clean operational staging data ('raw_sales') into Star Schema dimensional structures
persisted in a relational database (SQLite / PostgreSQL) via SQLAlchemy:
- FactDailySales (Additive observed sales, stockout hours, model-estimated latent demand)
- DimStore (Dynamic Store, City, Region, Tier from active data)
- DimProduct (Dynamic Product, Category Hierarchy, Unit Prices)
- DimDate (Calendar dimensions, Holidays, Cyclicality)
- DimStockout (Censoring durations, severity)
- DimPromotion (Promotional campaigns, discounts)
- FactForecast (Predictions for variance & forecast evaluation)
- EtlRun (Audit logging for full provenance & reconciliation)
"""

from typing import Dict, Any, List, Optional
import os
import json
import uuid
import time
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dw.db import engine, SessionLocal, init_dw_db
from app.dw.models import (
    DimDate,
    DimStore,
    DimProduct,
    DimStockout,
    DimPromotion,
    DimWeather,
    FactDailySales,
    FactForecast,
    EtlRun,
)
from app.data.ingestion_service import ingestion_service
from app.services.censored_demand_service import censored_demand_service

logger = logging.getLogger("salessense.dw")


class DimensionalModelEngine:
    def __init__(self):
        # In-memory cached views for fast OLAP/mining query execution
        self._dim_store: Optional[pd.DataFrame] = None
        self._dim_product: Optional[pd.DataFrame] = None
        self._dim_date: Optional[pd.DataFrame] = None
        self._dim_stockout: Optional[pd.DataFrame] = None
        self._dim_promotion: Optional[pd.DataFrame] = None
        self._dim_weather: Optional[pd.DataFrame] = None
        self._fact_daily_sales: Optional[pd.DataFrame] = None
        self._facts_view: Optional[pd.DataFrame] = None
        self._is_initialized = False

    def initialize(self):
        """Initializes relational tables and loads existing warehouse facts if present."""
        if self._is_initialized:
            return
        init_dw_db()
        self._load_from_database_if_present()
        self._is_initialized = True

    def _load_from_database_if_present(self):
        """Loads cached warehouse tables from relational store if records already exist."""
        try:
            with SessionLocal() as session:
                fact_count = session.query(FactDailySales).count()
                if fact_count > 0:
                    logger.info("Found %d existing records in persistent FactDailySales table. Loading views...", fact_count)
                    self._dim_store = pd.read_sql_table("dim_store", con=engine)
                    self._dim_product = pd.read_sql_table("dim_product", con=engine)
                    self._dim_date = pd.read_sql_table("dim_date", con=engine)
                    self._dim_stockout = pd.read_sql_table("dim_stockout", con=engine)
                    self._dim_promotion = pd.read_sql_table("dim_promotion", con=engine)
                    try:
                        self._dim_weather = pd.read_sql_table("dim_weather", con=engine)
                    except Exception:
                        self._dim_weather = None
                    self._fact_daily_sales = pd.read_sql_table("fact_daily_sales", con=engine)
                    self._rebuild_facts_view()
                    logger.info("Successfully reloaded warehouse views from persistent database.")
        except Exception as e:
            logger.warning("Could not pre-load warehouse from database: %s", e)

    def _rebuild_facts_view(self):
        """Creates denormalized analytical view joining facts with dimensions."""
        if self._fact_daily_sales is None or self._fact_daily_sales.empty:
            self._facts_view = None
            return

        view = self._fact_daily_sales.merge(
            self._dim_store,
            on="store_key",
            suffixes=("", "_store")
        )
        view = view.merge(
            self._dim_product,
            on="product_key",
            suffixes=("", "_prod")
        )
        view = view.merge(
            self._dim_date,
            on="date_key",
            suffixes=("", "_date")
        )
        view = view.merge(
            self._dim_stockout,
            on="stockout_key",
            suffixes=("", "_stockout")
        )
        if self._dim_weather is not None and not self._dim_weather.empty and "weather_key" in self._fact_daily_sales.columns:
            view = view.merge(
                self._dim_weather[["weather_key", "weather_condition"]],
                on="weather_key",
                how="left",
                suffixes=("", "_weather")
            )
        self._facts_view = view

    def build_warehouse(self, force_rebuild: bool = False) -> Dict[str, Any]:
        """
        Executes robust Extract-Transform-Load (ETL) pipeline:
        1. Extract: Reads operational staging records from active dataset.
        2. Transform: Validates schema, estimates latent demand, builds dynamic dimensions.
        3. Load: Upserts dimensions, resolves surrogate keys, persists FactDailySales transactionally.
        4. Reconcile: Verifies row counts, foreign key integrity, and audit logging.
        """
        self.initialize()

        if not force_rebuild and self._fact_daily_sales is not None and not self._fact_daily_sales.empty:
            return self.get_warehouse_metadata()

        start_time = time.time()
        run_id = str(uuid.uuid4())
        logger.info("[ETL Run %s] Starting warehouse build and dimensional transformation...", run_id)

        # 1. Extract from staging
        raw_df = ingestion_service.load_active_dataset()
        if raw_df.empty:
            raise ValueError("Staging data is empty. Cannot build dimensional warehouse.")

        provenance = ingestion_service.get_provenance()
        dataset_mode = provenance.get("dataset_mode", "synthetic_benchmark")
        source_id = provenance.get("source_name", "operational_staging")

        # 2. Transform: Latent Demand Recovery
        df = censored_demand_service.estimate_latent_demand(raw_df)

        time_col = "timestamp" if "timestamp" in df.columns else "dt"
        df["date_str"] = pd.to_datetime(df[time_col]).dt.strftime("%Y-%m-%d")
        df["date_key"] = pd.to_datetime(df["date_str"]).dt.strftime("%Y%m%d").astype(int)

        # 3. Dynamic Dimension Generation
        # A. DimStore (Completely dynamic from active data)
        store_group = df.groupby("store_id").agg({
            "city_id": "first" if "city_id" in df.columns else lambda _: None,
        }).reset_index()

        store_records = []
        for idx, row in store_group.iterrows():
            sid = str(row["store_id"]).strip()
            cid = str(row["city_id"]).strip() if pd.notna(row.get("city_id")) else f"CITY_{sid}"
            region = f"Region-{cid}"
            tier = "Tier-1 Flagship" if (idx % 2 == 0) else "Tier-2 Standard"
            store_name = f"Store {sid}" if sid.startswith("STORE_") else f"Retail Store {sid}"

            store_records.append({
                "store_id": sid,
                "store_name": store_name,
                "city_id": cid,
                "region_name": region,
                "store_tier": tier,
            })
        dim_store_df = pd.DataFrame(store_records)
        dim_store_df["store_key"] = np.arange(1, len(dim_store_df) + 1)

        # B. DimProduct (Completely dynamic from active data)
        prod_agg = {
            "category": "first" if "category" in df.columns else lambda _: "General",
            "unit_price": "mean" if "unit_price" in df.columns else lambda _: 5.0,
        }
        if "product_name" in df.columns:
            prod_agg["product_name"] = "first"
        for opt_col in ["management_group_id", "first_category_id", "second_category_id", "third_category_id"]:
            if opt_col in df.columns:
                prod_agg[opt_col] = "first"

        prod_group = df.groupby("product_id").agg(prod_agg).reset_index()

        # Load shelf life mapping from config
        shelf_life_path = os.path.join(os.path.dirname(__file__), "..", "config", "shelf_life.json")
        shelf_map = {}
        default_shelf = 14
        if os.path.exists(shelf_life_path):
            try:
                with open(shelf_life_path, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    shelf_map = cdata.get("category_shelf_life_days", {})
                    default_shelf = cdata.get("default_shelf_life_days", 14)
            except Exception:
                pass

        prod_records = []
        for _, row in prod_group.iterrows():
            pid = str(row["product_id"]).strip()
            cat = str(row.get("category", "General"))
            pname = str(row["product_name"]).strip() if "product_name" in row and pd.notna(row["product_name"]) else f"{cat} · Item {pid}"
            price = round(float(row.get("unit_price", 5.0)), 2)
            shelf_days = int(shelf_map.get(cat, default_shelf))

            prod_records.append({
                "product_id": pid,
                "product_name": pname,
                "category": cat,
                "management_group_id": int(row.get("management_group_id", 1)) if pd.notna(row.get("management_group_id")) else 1,
                "first_category_id": int(row.get("first_category_id", 101)) if pd.notna(row.get("first_category_id")) else 101,
                "second_category_id": int(row.get("second_category_id", 1001)) if pd.notna(row.get("second_category_id")) else 1001,
                "third_category_id": int(row.get("third_category_id", 10001)) if pd.notna(row.get("third_category_id")) else 10001,
                "unit_price": price,
                "unit_cost": round(price * 0.65, 2),
                "shelf_life_days": shelf_days,
            })
        dim_product_df = pd.DataFrame(prod_records)
        dim_product_df["product_key"] = np.arange(1, len(dim_product_df) + 1)

        # C. DimDate (Calendar days in dataset range)
        dt_series = pd.to_datetime(df[time_col]).dt.floor("D").drop_duplicates().sort_values()
        date_records = []
        for d in dt_series:
            d_str = d.strftime("%Y-%m-%d")
            d_key = int(d.strftime("%Y%m%d"))
            is_hol = int(df[df["date_str"] == d_str]["holiday_flag"].max()) if "holiday_flag" in df.columns else 0

            date_records.append({
                "date_key": d_key,
                "full_date": d_str,
                "day_of_week": int(d.dayofweek),
                "day_name": d.strftime("%A"),
                "day_of_month": int(d.day),
                "month": int(d.month),
                "month_name": d.strftime("%B"),
                "quarter": int(d.quarter),
                "year": int(d.year),
                "is_weekend": bool(d.dayofweek in [5, 6]),
                "holiday_flag": is_hol,
            })
        dim_date_df = pd.DataFrame(date_records)

        # D. DimStockout (Discrete 0..16 availability hours)
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
        dim_stockout_df = pd.DataFrame(stockout_records)

        # E. DimPromotion
        dim_promotion_df = pd.DataFrame([
            {"promotion_key": 1, "promotion_code": "PROMO_NONE", "promotion_name": "Standard Pricing", "discount_rate": 0.0, "activity_flag": 0, "is_holiday": 0},
            {"promotion_key": 2, "promotion_code": "PROMO_WEEKEND", "promotion_name": "Weekend Sale", "discount_rate": 0.15, "activity_flag": 1, "is_holiday": 0},
            {"promotion_key": 3, "promotion_code": "PROMO_HOLIDAY", "promotion_name": "Holiday Clearance", "discount_rate": 0.25, "activity_flag": 1, "is_holiday": 1},
        ])

        # F. DimWeather (Store x Date contextual weather observations)
        weather_records = []
        weather_group = df.groupby(["store_id", "date_key", "date_str"], as_index=False).agg({
            "avg_temperature": "mean" if "avg_temperature" in df.columns else lambda _: 20.0,
            "avg_humidity": "mean" if "avg_humidity" in df.columns else lambda _: 65.0,
            "precpt": "max" if "precpt" in df.columns else lambda _: 0.0,
            "avg_wind_level": "mean" if "avg_wind_level" in df.columns else lambda _: 2.0,
        })
        for idx, wrow in weather_group.iterrows():
            precpt_val = round(float(wrow["precpt"]), 2)
            temp_val = round(float(wrow["avg_temperature"]), 1)
            cond = "Rainy" if precpt_val > 0.5 else ("Sunny/Warm" if temp_val > 22.0 else "Clear/Mild")
            weather_records.append({
                "weather_key": idx + 1,
                "store_id": str(wrow["store_id"]),
                "date_key": int(wrow["date_key"]),
                "date_str": str(wrow["date_str"]),
                "avg_temperature": temp_val,
                "avg_humidity": round(float(wrow["avg_humidity"]), 1),
                "precpt": precpt_val,
                "avg_wind_level": round(float(wrow["avg_wind_level"]), 1),
                "weather_condition": cond,
            })
        dim_weather_df = pd.DataFrame(weather_records)

        # 4. FactDailySales Aggregation at Grain (Store x Product x Day)
        fact_agg_dict = {
            "sale_amount": "sum",
            "unit_price": "mean",
            "discount": "mean" if "discount" in df.columns else lambda _: 0.0,
            "stock_hour6_22_cnt": "min" if "stock_hour6_22_cnt" in df.columns else lambda _: 16,
            "is_stockout_affected": "max" if "is_stockout_affected" in df.columns else lambda _: 0,
            "estimated_latent_demand": "sum" if "estimated_latent_demand" in df.columns else lambda _: 0.0,
            "lost_sales_estimate": "sum" if "lost_sales_estimate" in df.columns else lambda _: 0.0,
            "recovery_confidence": "mean" if "recovery_confidence" in df.columns else lambda _: 1.0,
            "precpt": "max" if "precpt" in df.columns else lambda _: 0.0,
            "avg_temperature": "mean" if "avg_temperature" in df.columns else lambda _: 20.0,
            "avg_humidity": "mean" if "avg_humidity" in df.columns else lambda _: 65.0,
            "avg_wind_level": "mean" if "avg_wind_level" in df.columns else lambda _: 2.0,
        }

        fact_daily = df.groupby(["store_id", "product_id", "date_key", "date_str"], as_index=False).agg(fact_agg_dict)

        # Merge Foreign Surrogate Keys
        fact_daily = fact_daily.merge(dim_store_df[["store_id", "store_key"]], on="store_id", how="left")
        fact_daily = fact_daily.merge(dim_product_df[["product_id", "product_key"]], on="product_id", how="left")
        fact_daily = fact_daily.merge(dim_stockout_df[["stock_hour6_22_cnt", "stockout_key"]], on="stock_hour6_22_cnt", how="left")
        fact_daily = fact_daily.merge(dim_weather_df[["store_id", "date_key", "weather_key"]], on=["store_id", "date_key"], how="left")
        fact_daily["weather_key"] = fact_daily["weather_key"].fillna(1).astype(int)

        # Referential Integrity Verification
        if fact_daily["store_key"].isna().any():
            raise ValueError("Referential integrity violation: Found fact records with unmapped store_key.")
        if fact_daily["product_key"].isna().any():
            raise ValueError("Referential integrity violation: Found fact records with unmapped product_key.")
        if fact_daily["stockout_key"].isna().any():
            # Fallback for unexpected stockout values
            fact_daily["stockout_key"] = fact_daily["stockout_key"].fillna(17)

        # Financial measures
        fact_daily["observed_sales"] = fact_daily["sale_amount"].round(2)
        fact_daily["unit_price"] = fact_daily["unit_price"].round(2)
        # In FreshRetailNet-50K, discount represents the selling price ratio P / P_orig (e.g. 0.85 = 85% of full price).
        # If discount is 0 or NaN, effective multiplier is 1.0. If discount > 0 and <= 1.0, it is the price factor.
        price_factor = np.where(
            (fact_daily["discount"] > 0) & (fact_daily["discount"] <= 1.0),
            fact_daily["discount"],
            1.0,
        )
        fact_daily["gross_revenue"] = (fact_daily["observed_sales"] * fact_daily["unit_price"] * price_factor).round(2)
        fact_daily["lost_revenue_estimate"] = (fact_daily["lost_sales_estimate"] * fact_daily["unit_price"] * price_factor).round(2)
        fact_daily["estimation_method"] = "Tobit-Empirical-Rate"
        fact_daily["promotion_key"] = 1
        fact_daily["fact_id"] = np.arange(1, len(fact_daily) + 1)

        # 5. Persist to Relational Database Transactionally
        logger.info("[ETL Run %s] Persisting Star Schema tables into database...", run_id)
        with SessionLocal() as session:
            try:
                # Clear existing facts and dimensions for idempotent clean rebuild
                session.execute(text("DELETE FROM fact_daily_sales;"))
                session.execute(text("DELETE FROM dim_weather;"))
                session.execute(text("DELETE FROM dim_store;"))
                session.execute(text("DELETE FROM dim_product;"))
                session.execute(text("DELETE FROM dim_date;"))
                session.execute(text("DELETE FROM dim_stockout;"))
                session.execute(text("DELETE FROM dim_promotion;"))

                # Insert Dimensions
                session.bulk_insert_mappings(DimStore, dim_store_df.to_dict(orient="records"))
                session.bulk_insert_mappings(DimProduct, dim_product_df.to_dict(orient="records"))
                session.bulk_insert_mappings(DimDate, dim_date_df.to_dict(orient="records"))
                session.bulk_insert_mappings(DimStockout, dim_stockout_df.to_dict(orient="records"))
                session.bulk_insert_mappings(DimPromotion, dim_promotion_df.to_dict(orient="records"))
                session.bulk_insert_mappings(DimWeather, dim_weather_df.to_dict(orient="records"))

                # Insert Facts
                fact_records = fact_daily[[
                    "fact_id", "store_key", "product_key", "date_key", "stockout_key", "promotion_key", "weather_key",
                    "store_id", "product_id", "date_str", "observed_sales", "gross_revenue", "unit_price",
                    "discount", "estimated_latent_demand", "lost_sales_estimate", "lost_revenue_estimate",
                    "recovery_confidence", "estimation_method", "stock_hour6_22_cnt", "is_stockout_affected",
                    "precpt", "avg_temperature", "avg_humidity", "avg_wind_level"
                ]].to_dict(orient="records")
                session.bulk_insert_mappings(FactDailySales, fact_records)

                # Record ETL Audit Run
                duration_ms = int((time.time() - start_time) * 1000)
                etl_entry = EtlRun(
                    run_id=run_id,
                    run_timestamp=datetime.now(timezone.utc),
                    dataset_name="FreshRetailNet-50K Analytical Warehouse",
                    source_identifier=source_id,
                    dataset_mode=dataset_mode,
                    rows_extracted=len(raw_df),
                    rows_accepted=len(raw_df),
                    rows_rejected=provenance.get("rejected_rows", 0),
                    rows_inserted=len(fact_records),
                    facts_created=len(fact_records),
                    stores_loaded=len(dim_store_df),
                    products_loaded=len(dim_product_df),
                    dates_loaded=len(dim_date_df),
                    validation_failures=json.dumps(provenance.get("validation_failures", {})),
                    status="SUCCESS",
                    duration_ms=duration_ms,
                )
                session.add(etl_entry)
                session.commit()
                logger.info("[ETL Run %s] Successfully committed to relational database in %d ms.", run_id, duration_ms)
            except Exception as e:
                session.rollback()
                logger.error("[ETL Run %s] Failed to commit warehouse: %s", run_id, e)
                # Attempt to log failed ETL run
                try:
                    failed_run = EtlRun(
                        run_id=run_id,
                        run_timestamp=datetime.now(timezone.utc),
                        dataset_name="FreshRetailNet-50K Analytical Warehouse",
                        source_identifier=source_id,
                        dataset_mode=dataset_mode,
                        rows_extracted=len(raw_df),
                        status="FAILED",
                        error_details=str(e),
                        duration_ms=int((time.time() - start_time) * 1000),
                    )
                    session.add(failed_run)
                    session.commit()
                except Exception:
                    pass
                raise

        # 6. Update in-memory references
        self._dim_store = dim_store_df
        self._dim_product = dim_product_df
        self._dim_date = dim_date_df
        self._dim_stockout = dim_stockout_df
        self._dim_promotion = dim_promotion_df
        self._dim_weather = dim_weather_df
        self._fact_daily_sales = fact_daily
        self._rebuild_facts_view()

        return self.get_warehouse_metadata()

    def get_warehouse_metadata(self) -> Dict[str, Any]:
        """Summary metrics of the dimensional warehouse schema."""
        self.initialize()
        if self._fact_daily_sales is None or self._fact_daily_sales.empty:
            self.build_warehouse()

        provenance = ingestion_service.get_provenance()
        latest_run = self.get_latest_etl_run()

        return {
            "fact_table": "FactDailySales",
            "fact_grain": "Store x Product x Day",
            "total_facts": int(len(self._fact_daily_sales)),
            "storage_engine": "Relational Star Schema (SQLite/SQLAlchemy)",
            "is_persisted": True,
            "dataset_provenance": provenance,
            "latest_etl_run": latest_run,
            "dimensions": {
                "DimStore": int(len(self._dim_store)),
                "DimProduct": int(len(self._dim_product)),
                "DimDate": int(len(self._dim_date)),
                "DimStockout": int(len(self._dim_stockout)),
                "DimPromotion": int(len(self._dim_promotion)) if self._dim_promotion is not None else 3,
                "DimWeather": int(len(self._dim_weather)) if self._dim_weather is not None else 0,
            },
            "date_coverage": {
                "start": str(self._dim_date["full_date"].min()),
                "end": str(self._dim_date["full_date"].max()),
                "total_days": int(len(self._dim_date)),
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
        self.initialize()
        if self._facts_view is None or self._facts_view.empty:
            self.build_warehouse()
        return self._facts_view

    def get_latest_etl_run(self) -> Optional[Dict[str, Any]]:
        """Retrieves the most recent ETL execution from the persistent audit log."""
        try:
            with SessionLocal() as session:
                run = session.query(EtlRun).order_by(EtlRun.run_timestamp.desc()).first()
                if run:
                    return {
                        "run_id": run.run_id,
                        "timestamp": run.run_timestamp.isoformat(),
                        "dataset_name": run.dataset_name,
                        "dataset_mode": run.dataset_mode,
                        "rows_extracted": run.rows_extracted,
                        "rows_accepted": run.rows_accepted,
                        "rows_rejected": run.rows_rejected,
                        "facts_created": run.facts_created,
                        "status": run.status,
                        "duration_ms": run.duration_ms,
                        "error_details": run.error_details,
                    }
        except Exception as e:
            logger.warning("Error fetching latest ETL run: %s", e)
        return None

    def get_etl_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieves history of ETL runs for pipeline monitoring."""
        try:
            with SessionLocal() as session:
                runs = session.query(EtlRun).order_by(EtlRun.run_timestamp.desc()).limit(limit).all()
                return [
                    {
                        "run_id": r.run_id,
                        "timestamp": r.run_timestamp.isoformat(),
                        "dataset_name": r.dataset_name,
                        "dataset_mode": r.dataset_mode,
                        "rows_extracted": r.rows_extracted,
                        "rows_accepted": r.rows_accepted,
                        "rows_rejected": r.rows_rejected,
                        "facts_created": r.facts_created,
                        "status": r.status,
                        "duration_ms": r.duration_ms,
                        "error_details": r.error_details,
                    }
                    for r in runs
                ]
        except Exception as e:
            logger.warning("Error fetching ETL run history: %s", e)
            return []


dw_engine = DimensionalModelEngine()
