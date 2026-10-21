# SalesSense — Data Warehouse, ETL, and OLAP Architecture Audit

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Module Target:** Data Warehouse and Mining (DWM) & OLAP Suite  
**Scope:** Dimensional Schema, Persistent Storage, ETL Pipeline, Multi-dimensional OLAP Operations, Unsupervised Data Mining Algorithms, Frontend DWM Console (`src/pages/DataWarehouseMining.jsx`).

---

## 1. Executive Summary & Architecture Overview

The SalesSense platform contains an operational backend built on FastAPI and a frontend application built with React/Vite. The current Data Warehouse and Mining module was designed around research concepts from:

> Wang et al. (2025). *"FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Retail Forecasting and Inventory Management"*, arXiv:2505.16319.

### Current Data Flow

```
+-------------------------------------------------------------------+
| 1. OPERATIONAL SOURCE & CACHE                                     |
|    - Source file: salessense-backend/data_cache/freshretailnet_subset.csv
|    - Format: CSV (61,320 rows, 22 columns)                        |
|    - Grain: Store x Product x Operating Hour (14 operating hours) |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 2. INGESTION SERVICE (app/data/ingestion_service.py)             |
|    - Column renaming, type coercion, missing value imputation     |
|    - Censoring annotation (stock_hour6_22_cnt < 16 => censored)   |
|    - Output: In-memory Pandas DataFrame                           |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 3. IN-MEMORY DIMENSIONAL ENGINE (app/dw/dimensional_model.py)    |
|    - Latent demand estimation (censored_demand_service.py)        |
|    - DimStore (Hardcoded 2 stores)                                |
|    - DimProduct (SKU aggregation with hardcoded names)            |
|    - DimDate (Calendar breakdown)                                 |
|    - DimStockout (Static 17 rows, 0-16 hours)                     |
|    - FactDailySales (Pandas groupby store, product, date)         |
|    - STORAGE: 100% IN-PROCESS RAM (No SQL database persistence)   |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 4. ANALYTICAL CONSUMPTION SERVICES                                |
|    - OLAP Engine (app/services/olap_service.py): Pandas queries   |
|    - Mining Engine (app/services/mining_service.py): Apriori,     |
|      K-Means demand regimes, Rolling Z-score anomaly detection     |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 5. REST APIS & FRONTEND PRESENTATION                             |
|    - FastAPI Routes: /api/dw/*, /api/mining/*                     |
|    - Frontend UI: src/pages/DataWarehouseMining.jsx               |
+-------------------------------------------------------------------+
```

---

## 2. Fact & Dimension Tables Audit

### Current Dimensional Tables (In-Memory Pandas DataFrames)

| Table Name | Type | Current Grain | Primary Key | Foreign Keys | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`FactDailySales`** | Fact | Store $\times$ Product $\times$ Day | `fact_id` (synthetic integer) | `store_key`, `product_key`, `date_key`, `stockout_key` | Operational in RAM |
| **`DimStore`** | Dimension | Individual Store | `store_key` | None | **Defective**: Hardcoded to `STORE_01` & `STORE_02` |
| **`DimProduct`** | Dimension | Individual SKU | `product_key` | None | **Defective**: Hardcoded SKU labels; dynamic category mapping exists |
| **`DimDate`** | Dimension | Calendar Day | `date_key` (YYYYMMDD) | None | Functional |
| **`DimStockout`** | Dimension | Operating In-Stock Hours (0–16h) | `stockout_key` | None | Functional (17 static bands) |
| **`FactForecast`** | Fact | Store $\times$ Product $\times$ Target Date $\times$ Horizon $\times$ Model | N/A | `store_key`, `product_key`, `date_key` | **MISSING**: Forecasts generated ad-hoc, not stored in warehouse |
| **`DimPromotion`** | Dimension | Promotion / Activity Event | N/A | None | **MISSING**: Stored only as raw flag in facts |

---

## 3. Actual Grain of Fact Tables

1. **Staging / Raw Sales Operational Data (`freshretailnet_subset.csv`)**:
   - **Grain**: **Store $\times$ Product $\times$ Hour**
   - Operating window: Hours 08:00 to 21:00 (14 hours daily).
   - Series count: 2 stores $\times$ 6 products = 12 series.
   - Observation count: 12 series $\times$ 365 days $\times$ 14 hours = **61,320 records**.

2. **Warehouse Fact Table (`FactDailySales`)**:
   - **Declared & Actual Grain**: **Store $\times$ Product $\times$ Day**
   - Aggregated from 14 hourly observations per day.
   - Total rows: 2 stores $\times$ 6 products $\times$ 365 days = **4,380 rows**.
   - **Additive Measures**:
     - `observed_sales`: $\sum(\text{sale\_amount})$
     - `gross_revenue`: $\sum(\text{sale\_amount} \times \text{unit\_price} \times (1 - \text{discount}))$
     - `estimated_latent_demand`: $\sum(\text{latent demand calculated via Tobit/Censored logic})$
     - `lost_sales_estimate`: $\sum(\text{latent demand} - \text{observed sales})$
     - `lost_revenue_estimate`: $\sum(\text{lost sales} \times \text{unit\_price})$
   - **Non-additive / Contextual Attributes**:
     - `stock_hour6_22_cnt`: Minimum in-stock hours across the day.
     - `is_stockout_affected`: Maximum censoring indicator ($\in \{0, 1\}$).
     - `avg_temperature`, `avg_humidity`, `avg_wind_level`, `precpt`.

---

## 4. Existing OLAP Operations and API Endpoints

The system currently exposes five OLAP operations via `app/api/routes_dw_olap.py`:

| Operation | HTTP Endpoint | Parameters | Implementation Method |
| :--- | :--- | :--- | :--- |
| **Rollup** | `POST /api/dw/rollup` | `hierarchy_level` (`category`, `month_name`, `store_id`), `metric`, `filters` | Pandas `groupby()` with sum aggregation and descending sort |
| **Drill-Down** | `POST /api/dw/drilldown` | `parent_dimension` (`category`), `parent_value` (`Bakery`), `child_dimension` (`product_name`), `metric` | Pandas filtering on parent, grouping on child |
| **Slice** | `POST /api/dw/slice` | `dimension` (`store_id`), `value` (`STORE_01`), `time_grain` (`date_str`) | Slices 1D hypercube, returns time series and summary |
| **Dice** | `POST /api/dw/dice` | `store_ids`, `categories`, `product_ids`, `date_start`, `date_end` | Multi-dimensional intersection filter, returns sub-cube |
| **Pivot** | `POST /api/dw/pivot` | `row_dim` (`product_name`), `col_dim` (`store_id`), `val_metric`, `aggfunc` | Pandas `pivot_table()` with grand totals and row sums |
| **Rebuild** | `POST /api/dw/rebuild` | Restricted to `admin` and `ml_engineer` | Calls `dw_engine.build_warehouse(force_rebuild=True)` |
| **Metadata** | `GET /api/dw/metadata` | Authenticated session | Returns table names, row counts, date coverage, and financial totals |

---

## 5. Warehouse Persistence Status: In-Memory vs. Database

### Audit Verdict: **100% IN-MEMORY (RAM-BOUND)**

- **Current State**:
  - The dimensional model resides entirely inside process memory as attributes on the `DimensionalModelEngine` singleton (`self._dim_store`, `self._fact_daily_sales`, etc.).
  - There are **no persistent SQL relational tables** representing the star schema.
  - If the FastAPI process restarts or crashes, the warehouse is destroyed and must be rebuilt in RAM.
  - No database transactions, foreign key constraints, or indexing are enforced at the database layer.
- **Available Database Infrastructure**:
  - `sqlite3` and `SQLAlchemy 2.1.4` are already installed and available in the Python runtime.
  - MongoDB connection exists via `motor` but is configured for operational documents (`salessense`), not relational star schema analytical queries.
- **Remediation**:
  - Introduce a persistent relational analytical store using **SQLite via SQLAlchemy** (with clean configuration for PostgreSQL if configured).
  - Persist `dim_date`, `dim_store`, `dim_product`, `dim_stockout`, `fact_daily_sales`, `fact_forecast`, and `etl_runs`.
  - Ensure the warehouse survives server restarts and supports repeatable, idempotent ETL refreshes.

---

## 6. ETL Behavior and Dataset Provenance Audit

### Current Provenance
- `salessense-backend/data_cache/freshretailnet_subset.csv`:
  - Size: 8,016,881 bytes (~8 MB).
  - Rows: 61,320 rows across 365 days (2025-01-01 to 2025-12-31).
  - Origin: Generated using `generate_benchmark_series()` with `random.seed(42)` mirroring the FreshRetailNet-50K schema.
  - Stores: `STORE_01`, `STORE_02`.
  - SKUs: 6 distinct SKUs (`SKU-ORG-01`, `SKU-BAK-04`, `SKU-BEV-09`, `SKU-PAN-12`, `SKU-MEA-02`, `SKU-DAI-07`).

### Critical Provenance Issue: Silent Fallback
In `salessense-backend/scripts/ingest_dataset.py`:
```python
def try_download_huggingface_dataset(subset_size: int = 10000):
    try:
        from huggingface_hub import hf_hub_download
        ...
    except Exception as e:
        logger.info("Hugging Face remote pull unavailable (%s). Using high-fidelity benchmark fixture generator.", e)
        return pd.DataFrame()
```
When downloading fails, the script silently falls back to synthetic generation without explicitly reporting dataset mode to the user or recording whether the active dataset is **authentic source data**, a **derived subset**, or **synthetic demonstration data**.

---

## 7. Hardcoded Values, Mock Responses & Unsupported Claims

1. **Hardcoded Store Dimension in Warehouse Engine**:
   - `dimensional_model.py` hardcodes:
     ```python
     store_records = [
         {"store_id": "STORE_01", "store_name": "Downtown Fresh Flagship", ...},
         {"store_id": "STORE_02", "store_name": "Harbor Bay Outlet", ...},
     ]
     ```
     *Impact*: Ingesting a dataset with 5, 10, or 50 stores breaks or silently ignores all stores other than Store 1 and Store 2.
2. **Hardcoded SKU Names**:
   - `sku_names` dictionary maps 6 SKUs. Any newly ingested products fall back to their raw ID without clean attribute handling.
3. **Apriori Algorithm Academic Flaw**:
   - `mining_service.py` constructs market baskets by grouping daily sales by `(store_id, date_str)`:
     ```python
     baskets_series = active_sales.groupby(["store_id", "date_str"])[item_col].apply(...)
     ```
     *Impact*: Grouping all items purchased at a retail store across an entire day is **not** a customer shopping basket. This is academically indefensible unless explicitly qualified or substituted with product demand co-movement / correlation analysis.
4. **Missing ETL Job Audit Table**:
   - The UI does not display actual ETL run logs, timestamps, records extracted vs. rejected, and execution status from a database audit log.
5. **No `FactForecast` Table**:
   - Forecasts are computed in isolation and never loaded into the dimensional warehouse for multi-dimensional actual-vs-forecast variance analysis.

---

## 8. Existing Functionality That Must Be Preserved

1. **API Contracts**: Keep `/api/dw/rollup`, `/api/dw/drilldown`, `/api/dw/slice`, `/api/dw/dice`, `/api/dw/pivot`, and `/api/dw/metadata` fully compatible with existing frontend calls.
2. **Role-Based Store Scoping**: Keep `allowed_stores` verification in OLAP operations to ensure Retailer 1 cannot dice/slice unauthorized stores.
3. **Latent Demand Integration**: Preserve the censored demand recovery calculation connecting stockout hours to lost sales estimates.
4. **K-Means Demand Regime Clustering**: Retain velocity vs. volatility feature extraction (CV, zero-sales ratio, stockout frequency).
5. **Rolling Seasonal Anomaly Detection**: Retain the Z-score calculation with stockout attribution diagnosis.

---

## 9. Prioritized Implementation Plan

| Phase | Milestone | Priority | Actions |
| :--- | :--- | :--- | :--- |
| **Phase 2** | **Data Provenance & Ingestion Pipeline** | P0 | Remove silent synthetic fallback; validate required columns, nulls, types; record provenance manifest (`authentic`, `derived`, `synthetic`); report rejected records. |
| **Phase 3** | **Persistent Relational Star Schema** | P0 | Implement SQLAlchemy SQLite database (`salessense_dw.db`); define `DimDate`, `DimStore`, `DimProduct`, `DimStockout`, `FactDailySales`, `FactForecast`; make dimensions dynamic from source data; add surrogate keys and foreign key constraints. |
| **Phase 4** | **Demonstrable ETL Pipeline** | P0 | Implement Extract $\to$ Transform $\to$ Load $\to$ Reconcile; create `EtlRun` audit log table; expose `POST /api/dw/etl/run` and `GET /api/dw/etl/runs` with real execution tracking. |
| **Phase 5** | **Functional OLAP Engine** | P0 | Update Rollup, Drill-Down, Slice, Dice, and Pivot to query persistent warehouse safely; add allowlist validation for dimension and metric parameters; write comprehensive test fixtures. |
| **Phase 6** | **Academically Defensible DWM UI** | P1 | Overhaul `src/pages/DataWarehouseMining.jsx` into 4 clear sections: Warehouse Overview (with star-schema diagram), ETL Pipeline, OLAP Explorer (chart + table + export), and Data Mining. |
| **Phase 7** | **Correct Data Mining Algorithms** | P1 | Fix Apriori by clearly qualifying basket grain or offering Demand Co-movement Analysis; ensure K-Means and Anomaly Detection have reproducible seeds and explainable outputs. |
| **Phase 8** | **Security & RBAC Enforcement** | P1 | Enforce backend role check on ETL execution; validate parameter inputs against SQL injection / attribute tampering. |
| **Phase 9** | **Automated Testing Suite** | P0 | Write Pytest fixtures verifying persistence, idempotency, foreign keys, OLAP aggregations, and run lint/build checks. |
| **Phase 10** | **Academic Documentation** | P1 | Produce complete architectural guides, data dictionaries, and demonstration walkthroughs for evaluation. |
