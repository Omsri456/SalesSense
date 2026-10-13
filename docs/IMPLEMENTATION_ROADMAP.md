# SalesSense — Implementation Roadmap & Execution Plan

**Project:** SalesSense (Retail Demand Forecasting, Data Warehouse & Mining Platform)  
**Research Alignment:** *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset*  
**Date:** October 2026  
**Status:** In Progress — Phase-by-Phase Rollout

---

## 1. Roadmap Overview & Strategic Objectives

This roadmap establishes a clear, chronological path to elevate SalesSense from an initial software engineering prototype with mocked UI data into a production-grade, mathematically sound **Data Warehouse & Mining (DWM)** intelligence platform.

Every phase adheres to three core mandates:
1. **Preserve working software:** Do not break existing working code, frameworks, or libraries.
2. **Eliminate mock/hardcoded data:** Replace client-side pseudo-random generators and static backend constants with dynamic database records and authentic calculations.
3. **Align with FreshRetailNet-50K research:** Accurately represent stockout censoring, product hierarchies, and latent demand recovery.

```
+----------------------------------------------------------------------------------------------------+
|                                    IMPLEMENTATION PHASES TIMELINE                                  |
|                                                                                                    |
|  [Phase 1] Security, RBAC & Store Scoping (Fix vulnerabilities, enforce store access)             |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 2] Dataset Integrity & Dynamic Statistics (Remove hardcoded counts, validate schemas)      |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 3] Research Alignment & Censored Demand Recovery (Stockout detection & latent demand)       |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 4] Data Warehouse & Dimensional Modeling (Star schema: Facts & Dims, OLAP Engine)          |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 5] Multi-Model Forecasting Tournament (Dynamic backtest, real inference, no silent fallback)|
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 6] Data Mining Suite (Apriori Market Basket, K-Means Clustering, Anomaly Detection)       |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 7] Full Frontend Integration (Connect Dashboard, Forecast, Inventory, Models to real APIs) |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Phase 8] Automated Test Suite & Research Documentation (Pytest, verification, research docs)     |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Implementation Phases

### Phase 1: Security, True RBAC & Data Scope Enforcement
- **Goal:** Neutralize privilege escalation, separate roles from data scopes, and enforce authorization across all backend routes.
- **Tasks:**
  1. `app/services/auth_service.py` & `app/api/routes_auth.py`:
     - Disallow updating `role` via self-service `PUT /api/auth/profile`.
     - Create dedicated admin-only user management routes (`GET /api/admin/users`, `PUT /api/admin/users/{user_id}/role`, `POST /api/admin/users/{user_id}/stores`).
  2. Implement store assignment scoping:
     - Add `user_store_assignments` collection / mapping linking `user_id` to allowed `store_id` list.
     - Add dependency `verify_store_access(store_id: str, current_user: User)` verifying that retailers can only access assigned stores, while Admins have platform-wide access.
  3. Frontend security cleanup:
     - Remove client-side role toggle button from `ProtectedRoute.jsx` and `Profile.jsx`.
     - Update `src/services/api.js` to automatically attach `Authorization: Bearer <token>` to all HTTP requests.

### Phase 2: Dataset Integrity, Ingestion & Dynamic Statistics
- **Goal:** Ingest multi-store, multi-product datasets with complete hierarchy and stockout annotations, eliminating all hardcoded row/store/product counts.
- **Tasks:**
  1. Define unified FreshRetailNet-50K data schema in backend:
     - Location: `city_id`, `store_id`.
     - Product hierarchy: `management_group_id`, `first_category_id`, `second_category_id`, `third_category_id`, `product_id`.
     - Sales and time: `dt`, `sale_amount`, `hours_sale`.
     - Stockout status: `stock_hour6_22_cnt`, `hours_stock_status`.
     - Context: `discount`, `holiday_flag`, `activity_flag`, `precpt`, `avg_temperature`, `avg_humidity`, `avg_wind_level`.
  2. Implement comprehensive ETL ingestion pipeline (`app/data/ingestion_service.py`):
     - Source validation, schema mapping, type casting, duplicate detection, and missing value checks.
     - Idempotent upsert into MongoDB and local CSV/Parquet cache.
     - Full audit logging recording ingestion job provenance, row counts, and status.
  3. Dynamic statistics endpoint:
     - Update `/api/dataset/summary` and `/api/products` to query active data dynamically: count unique stores, distinct products, unique store-product pairs, total rows, date range, and stockout frequency.
     - Remove static `INITIAL_PRODUCTS` and `total_rows = 61320` constants.

### Phase 3: Research Alignment & Stockout-Aware Censored Demand
- **Goal:** Formally distinguish observed sales from true customer demand when stockouts censor observations.
- **Tasks:**
  1. Implement `app/services/censored_demand_service.py`:
     - Stockout classification: Flag days/hours where `stock_hour6_22_cnt < 16` or `hours_stock_status` indicates unavailability.
     - Baseline demand recovery: Estimate unconstrained latent demand using sales velocity during available hours and comparable in-stock periods (matching day-of-week, season, and promo status).
     - Compute confidence interval and uncertainty bounds for recovered demand.
  2. Surface censoring indicators in APIs:
     - Provide separate fields in data responses: `observed_sales`, `is_censored`, `estimated_latent_demand`, and `demand_uncertainty`.
  3. Author `docs/RESEARCH_ALIGNMENT.md` detailing paper methodologies, assumptions, and practical implementation choices.

### Phase 4: Data Warehouse & Dimensional Modeling (Star Schema & OLAP)
- **Goal:** Implement a full Kimball dimensional data warehouse with native OLAP operations.
- **Tasks:**
  1. Dimensional Schema Design (`app/dw/`):
     - `FactDailySales` & `FactHourlySales`: core transactional facts with additive sales and censoring flags.
     - `DimStore`: store, city, region, tier attributes.
     - `DimProduct`: multi-level category taxonomy.
     - `DimDate`: calendar, cyclical, holiday attributes.
     - `DimWeather`: temperature, precipitation, humidity, wind.
     - `DimStockout`: availability categories and duration.
  2. Build OLAP Engine (`app/services/olap_service.py` & `app/api/routes_dw_olap.py`):
     - Endpoints for **Rollup** (hourly -> daily -> monthly -> yearly; SKU -> subcategory -> category -> store).
     - Endpoints for **Drill-Down** (region -> city -> store -> department -> item).
     - Endpoints for **Slice** (filter by store, category, or date window).
     - Endpoints for **Dice** (multi-dimensional intersections).
     - Endpoints for **Pivot / Cross-tabulation** (store vs category matrix).

### Phase 5: Multi-Model Forecasting Tournament Engine
- **Goal:** Execute real backtesting and forward inference without synthetic fallbacks.
- **Tasks:**
  1. Fix endpoint type bug in `routes_forecast.py` (`store_id` and `product_id` as string paths).
  2. Enhance models (`SARIMA`, `Prophet`, `BiLSTM`):
     - Ensure models train on reconstructed latent demand as well as observed sales.
     - Train independently on chronological 80/20 train/test holdouts.
     - Calculate $R^2$, RMSE, wMAPE, MAE, and selection explanations.
  3. Remove silent synthetic fallback `_fallback_forecast`:
     - Surface genuine errors if training fails on insufficient data.
     - Cache legitimate model artifacts and forecast points with cache invalidation upon dataset re-ingestion.

### Phase 6: Retail Data Mining Suite
- **Goal:** Implement core retail data mining algorithms on warehouse facts.
- **Tasks:**
  1. **Market Basket Analysis (Apriori):**
     - Identify cross-category co-purchase rules (Support, Confidence, Lift).
  2. **K-Means Demand Regime Clustering:**
     - Cluster store–product series into velocity/volatility demand archetypes.
  3. **Sales Anomaly Detection:**
     - Detect abnormal spikes or sudden drops using rolling seasonal Z-score bounds.
  4. Expose mining endpoints via `app/api/routes_mining.py`.

### Phase 7: Real Frontend Integration
- **Goal:** Wire all UI components directly to backend APIs, retiring client-side mock generators.
- **Tasks:**
  1. `Dashboard.jsx`: Fetch real KPIs, real sales trends, and champion forecast for user's assigned store.
  2. `Forecast.jsx`: Call `/api/forecast/{store_id}/{product_id}` dynamically with horizon selector; display champion model explanation and full model comparison drawer.
  3. `Inventory.jsx`: Connect to dynamic warehouse inventory metrics (days to stockout, reorder recommendation, safety stock calculation).
  4. `Models.jsx`: Trigger real model retraining runs via backend API; display true tournament leaderboards and metrics.
  5. `DatasetUpload.jsx`: Upload CSV files via multipart form data to `/api/dataset/upload` with server-side validation and progress monitoring.
  6. `Reports.jsx`: Generate real exportable analytical reports (CSV/JSON/PDF) computed from warehouse queries.
  7. Fix linter warning in `Topbar.jsx` (import `Settings as SettingsIcon`).

### Phase 8: Verification, Automated Testing & Documentation
- **Goal:** Ensure regression protection, security enforcement, and complete documentation.
- **Tasks:**
  1. Create automated test suite (`tests/`):
     - Unit tests for metrics ($R^2$, RMSE, wMAPE).
     - Unit tests for RBAC, role escalation prevention, and cross-store data leakage.
     - Integration tests for ETL ingestion, OLAP rollup/slice queries, and forecasting pipelines.
  2. Create documentation:
     - `docs/DATA_DICTIONARY.md`
     - `docs/ETL_PIPELINE.md`
     - `docs/RESEARCH_ALIGNMENT.md`
     - `docs/RBAC_AND_DATA_SCOPE.md`
  3. Final end-to-end verification and performance benchmarks.

---

*End of Implementation Roadmap.*
