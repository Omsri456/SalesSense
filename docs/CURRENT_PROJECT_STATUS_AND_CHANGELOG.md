# SalesSense — Current Project Status & Architectural Evolution Report

**Document Version:** 2.0  
**Project:** SalesSense — Autonomous Retail Demand Intelligence & Data Warehouse / Mining Platform  
**Target Repository:** `salessense-frontend_2`  
**Research Paper Inspiration:** *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Retail Forecasting and Inventory Management* (Wang et al., 2025; arXiv:2505.16319)

---

## 1. Executive Summary

SalesSense has evolved from an initial **Software Engineering (SE) frontend prototype** into an enterprise-grade **Data Warehouse & Data Mining (DWM) Intelligence Platform**.

Previously, the platform relied on client-side synthetic simulations, hardcoded mock datasets (`src/data/*.js`), a client-side role toggle that permitted horizontal and vertical privilege escalation, and unconstrained time-series forecasting models that treated inventory stockouts as zero customer demand.

Today, SalesSense is backed by:
1. **A Kimball Star Schema Data Warehouse** with native multidimensional OLAP operations (Rollup, Drill-Down, Slice, Dice, 2D Pivot).
2. **A Retail Data Mining Suite** executing Apriori Market Basket Analysis, K-Means Demand Regime Clustering, and Rolling Seasonal Anomaly Detection with root-cause stockout attribution.
3. **Research-Aligned Censored Demand Recovery** reconstructing true unconstrained customer demand from FreshRetailNet-50K operational factors.
4. **True Role-Based Access Control (RBAC)** enforcing store data scoping across all queries.
5. **A 100% Passing Automated Test Suite** (20 unit and integration tests across backend and frontend).

---

## 2. Before vs. After Feature Comparison Matrix

| System Domain | Original Baseline Prototype | Current Production DWM Platform |
| :--- | :--- | :--- |
| **Authentication & RBAC** | • Client-side role toggle (`localStorage`).<br>• Any user could switch to `admin` without server verification (CWE-269).<br>• No store isolation: any user could query any store. | • Server-side JWT bearer authentication.<br>• Administrative panel for role assignment and store scoping.<br>• Store scoping dependency guard [`verify_store_access`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/deps.py) blocks cross-store data leakage.<br>• Full MongoDB audit logging. |
| **Data Schema & Provenance** | • Synthetic sample series with generic columns.<br>• Ignored retail factors.<br>• No data provenance or checksum tracking. | • Authentic schema adhering to **FreshRetailNet-50K**.<br>• Preserves `stock_hour6_22_cnt`, `management_group_id`, 3-level category hierarchy, and weather exog.<br>• 61,320 rows active staging dataset with SHA-256 checksum tracking. |
| **Stockout & Censored Demand** | • Stockouts treated as zero sales $Y_t = 0$.<br>• Naive forecasting models trained on truncated sales, severely under-predicting demand. | • Stockout Latent Demand Recovery Engine ([censored_demand_service.py](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/services/censored_demand_service.py)).<br>• Unconstrained latent demand $\hat{D}_t$ calculated using active-hour and comp-store velocity adjustments.<br>• Models trained on latent demand target. |
| **Data Warehouse Architecture** | • No data warehouse; flat transaction tables only. | • **Kimball Star Schema Data Warehouse**:<br>&nbsp;&nbsp;– `FactDailySales` (additive sales, latent demand, lost revenue)<br>&nbsp;&nbsp;– `DimStore`, `DimProduct`, `DimDate`, `DimStockout`.<br>• In-memory denormalized OLAP views. |
| **OLAP Multidimensional Operations** | • None. | • **Rollup**: Category, month, store, management group hierarchies.<br>• **Drill-Down**: Category to SKU disaggregation.<br>• **Slice**: 1D filtering with time-series profiles.<br>• **Dice**: Multi-dimensional sub-cube extraction.<br>• **Pivot**: Interactive 2D Cross-Tabulation matrix with row, column, and grand totals. |
| **Data Mining Capabilities** | • None. | • **Apriori Association Rules**: Support, Confidence, Lift, and Conviction over daily customer baskets.<br>• **K-Means Demand Regime Clustering**: 4 operational archetypes (Velocity vs. Volatility).<br>• **Rolling Anomaly Detection**: 7-day seasonal z-score detection with stockout attribution. |
| **Forecasting Tournament Engine** | • Silent fallback synthetic generator (`_fallback_forecast`).<br>• Models simulated via `setInterval` and `Math.random()`. | • Chronological 80/20 train/test holdouts across SARIMA, Prophet, and BiLSTM.<br>• Real training on latent demand target.<br>• Automated Champion selection via minimum holdout wMAPE error. |
| **Frontend UI & Integration** | • Static pages using mock arrays in `src/data/*.js`.<br>• No data warehouse or mining views. | • All core pages (`Dashboard`, `Forecast`, `Models`, `Inventory`, `DatasetUpload`) connected to real backend APIs.<br>• **New dedicated portal:** [`DataWarehouseMining.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/pages/DataWarehouseMining.jsx) (`/dw-mining`) providing interactive OLAP and Data Mining exploration. |
| **Testing & Quality Assurance** | • 0 automated unit or integration tests.<br>• Untracked lint warnings. | • **20 automated Pytest tests** covering RBAC, store scope, ETL, Star Schema, OLAP, and Data Mining.<br>• Clean production Vite build (`npm run build`).<br>• 0 linter errors. |

---

## 3. Detailed Structural Changes by Module

### 3.1. Security, Role-Based Access Control & Store Data Scoping
- **Files Created/Modified:**
  - [`salessense-backend/app/api/deps.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/deps.py)
  - [`salessense-backend/app/api/routes_admin.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/routes_admin.py)
  - [`salessense-backend/app/services/auth_service.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/services/auth_service.py)
  - [`salessense-backend/app/db/schemas.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/db/schemas.py)
  - [`src/context/AuthContext.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/context/AuthContext.jsx)
  - [`src/components/Sidebar.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/components/Sidebar.jsx)
- **What Changed:**
  - Removed client-side `updateUserRole` that allowed arbitrary role spoofing.
  - Built dependency factories `require_role(["admin", ...])` and `verify_store_access(store_id, current_user)`.
  - Added Admin user governance endpoints (`GET /api/admin/users`, `PUT /api/admin/users/{id}/role`, `PUT /api/admin/users/{id}/stores`, `GET /api/admin/audit-logs`).
  - Added dedicated test accounts with verified JWTs:
    - `admin@salessense.com` (Global platform scope)
    - `retailer1@salessense.com` (Scoped to `STORE_01`)
    - `retailer2@salessense.com` (Scoped to `STORE_02`)
    - `mle@salessense.com` (Global analytical scope)

### 3.2. Research Alignment & Stockout Latent Demand Recovery
- **Files Created/Modified:**
  - [`salessense-backend/app/services/censored_demand_service.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/services/censored_demand_service.py)
  - [`salessense-backend/app/data/ingestion_service.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/data/ingestion_service.py)
  - [`salessense-backend/scripts/ingest_dataset.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/scripts/ingest_dataset.py)
  - [`salessense-backend/app/api/routes_data.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/routes_data.py)
- **What Changed:**
  - Preserved the operational schema from *FreshRetailNet-50K*:
    - `stock_hour6_22_cnt`: Count of operating hours (0–16) where inventory was in stock.
    - Category taxonomy: `management_group_id`, `first_category_id`, `second_category_id`, `third_category_id`.
    - Exogenous weather indicators: `precpt`, `avg_temperature`, `avg_humidity`, `avg_wind_level`.
  - Implemented the latent demand formula:
    $$\hat{D}_t = Y_t + \left(0.5 \cdot v_{\text{active}} + 0.5 \cdot v_{\text{comp}}\right) \cdot H_{\text{lost}}$$
    where $H_{\text{lost}} = 16 - \text{stock\_hour6\_22\_cnt}$.
  - Staging dataset expanded to **61,320 rows** with ~9% realistic stockout days, ingested into MongoDB and cached locally with SHA-256 provenance tracking.

### 3.3. Kimball Star Schema Data Warehouse & OLAP Operations
- **Files Created/Modified:**
  - [`salessense-backend/app/dw/dimensional_model.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/dw/dimensional_model.py)
  - [`salessense-backend/app/services/olap_service.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/services/olap_service.py)
  - [`salessense-backend/app/api/routes_dw_olap.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/routes_dw_olap.py)
- **What Changed:**
  - Transformed staging data into a dimensional Star Schema:
    - **`FactDailySales`**: Grain per Store × SKU × Date. Tracks additive sales, gross revenue, latent demand, lost sales, lost revenue.
    - **`DimStore`**: Store ID, City ID, Region, Tier.
    - **`DimProduct`**: SKU, Name, 3-level category hierarchy, Management Group, Unit Price, Unit Cost.
    - **`DimDate`**: Date key, Day Name, Month, Quarter, Year, Weekend Flag, Holiday Flag.
    - **`DimStockout`**: Operational availability (0–16h), Lost hours, Censoring flag, Severity label.
  - Implemented the 5 standard OLAP cube operations:
    1. **Rollup**: Hierarchical aggregation along product, calendar, or store axes.
    2. **Drill-Down**: Disaggregation from category to SKU.
    3. **Slice**: 1D filtering along store, category, or time.
    4. **Dice**: Multi-dimensional sub-cube intersection across stores, categories, and date ranges.
    5. **Pivot**: 2D Cross-Tabulation matrix with row, column, and grand totals.

### 3.4. Retail Data Mining Suite
- **Files Created/Modified:**
  - [`salessense-backend/app/services/mining_service.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/services/mining_service.py)
  - [`salessense-backend/app/api/routes_mining.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/routes_mining.py)
- **What Changed:**
  - **Market Basket Analysis (Apriori)**:
    - Constructs daily purchasing transactions per store-date.
    - Calculates Support, Confidence, Lift, and Conviction for frequent itemsets and association rules.
  - **K-Means Demand Regime Clustering**:
    - Generates 5 behavioral features per SKU (Velocity, Volatility CV, Zero-sales ratio, Stockout frequency, Unit price).
    - Uses `StandardScaler` + `KMeans` to assign SKUs to 4 operational archetypes:
      - *Fast Mover — Smooth*
      - *High Volume — Erratic/Volatile*
      - *Intermittent / Lumpy*
      - *Steady Standard Demand*
  - **Rolling Seasonal Anomaly Detection**:
    - Computes 7-day rolling baselines ($\mu_{\text{rolling}}, \sigma_{\text{rolling}}$).
    - Flags $|z| \ge 2.2$ anomalies, classifying root causes into *Demand Spike*, *Stockout-Induced Collapse*, and *Unexplained Demand Drop*.

### 3.5. Multi-Model Forecasting Tournament Engine
- **Files Modified:**
  - [`salessense-backend/app/services/forecast_service.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/services/forecast_service.py)
  - [`salessense-backend/app/api/routes_forecast.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/routes_forecast.py)
  - [`salessense-backend/app/api/routes_models.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/api/routes_models.py)
  - [`salessense-backend/app/data/preprocessing.py`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/salessense-backend/app/data/preprocessing.py)
- **What Changed:**
  - Resolved pandas duplicate label reindexing bug when aggregating across all products.
  - Retrained models on stockout-recovered latent demand $\hat{D}_t$.
  - Eliminated fake synthetic fallback generators.
  - Added on-demand tournament retraining endpoint (`POST /api/models/retrain`).

### 3.6. Frontend Integration & DWM Portal
- **Files Created/Modified:**
  - [`src/pages/DataWarehouseMining.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/pages/DataWarehouseMining.jsx) (New Page)
  - [`src/routes/AppRoutes.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/routes/AppRoutes.jsx)
  - [`src/services/api.js`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/services/api.js)
  - [`src/pages/Dashboard.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/pages/Dashboard.jsx)
  - [`src/pages/Forecast.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/pages/Forecast.jsx)
  - [`src/pages/Models.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/pages/Models.jsx)
  - [`src/pages/DatasetUpload.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/pages/DatasetUpload.jsx)
  - [`src/components/Sidebar.jsx`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/src/components/Sidebar.jsx)
- **What Changed:**
  - Created a dedicated **Data Warehouse & Data Mining Intelligence** page (`/dw-mining`) with interactive tabs for:
    - OLAP Rollup & 2D Pivot Matrix
    - Apriori Association Rules (with interactive Support/Confidence sliders)
    - K-Means Demand Regime Clusters
    - Rolling Seasonal Anomalies Feed
  - Connected `Dashboard.jsx` to live DW metadata, forecast champion, and store scope.
  - Connected `Forecast.jsx` to real backtested champion model metrics (wMAPE, RMSE, $R^2$).
  - Connected `Models.jsx` to authentic retraining runs without synthetic jitter.
  - Connected `DatasetUpload.jsx` to multipart file upload and live SHA-256 provenance tracking.

---

## 4. Current System Status

### 4.1. Running Processes
- **Frontend Dev Server**: Running on `http://localhost:5173` (`npm run dev:client`).
- **Backend API Server**: Running on `http://localhost:8000` (`npm run dev:server`).
- **Database**: Local MongoDB instance active on `mongodb://localhost:27017` with cached staging dataset (61,320 records).

### 4.2. Automated Test Results
```bash
python -m pytest tests/ -v
```
**Results: 20 passed, 0 failed in 88.47s.**
- `tests/test_rbac_and_scope.py`: 5 tests passing (Admin login, Retailer login, Privilege escalation prevention, Store scope isolation, Admin user management).
- `tests/test_dataset_and_censoring.py`: 5 tests passing (Schema validation, Dynamic stats, Latent demand recovery algorithm, API summary endpoints).
- `tests/test_dw_and_mining.py`: 10 tests passing (Star schema build, Rollup, Drill-down, Slice, Dice, Pivot, Apriori, K-Means clustering, Anomaly detection, RBAC scope enforcement).

### 4.3. Git & Codebase State
- **Branch**: `main`
- **Remote**: Synced with GitHub (`https://github.com/Omsri456/SalesSense.git`).
- **Working Tree**: Clean (`nothing to commit, working tree clean`).

---

## 5. Summary of Documentation Files Created

All architectural, mathematical, and implementation details are fully documented in the repository:
1. [`docs/ARCHITECTURE.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/ARCHITECTURE.md) — System Architecture, Star Schema, and Component Design.
2. [`docs/RESEARCH_ALIGNMENT.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/RESEARCH_ALIGNMENT.md) — FreshRetailNet-50K paper factors and latent demand recovery formulation.
3. [`docs/DATA_WAREHOUSE_AND_MINING.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/DATA_WAREHOUSE_AND_MINING.md) — Kimball dimensional modeling, OLAP operations, and Data Mining suite.
4. [`docs/DATA_DICTIONARY.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/DATA_DICTIONARY.md) — Complete field-level schema definitions for raw, staging, and dimensional tables.
5. [`docs/ETL_PIPELINE.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/ETL_PIPELINE.md) — Ingestion, deduplication, validation, and SHA-256 provenance tracking.
6. [`docs/RBAC_AND_DATA_SCOPE.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/RBAC_AND_DATA_SCOPE.md) — Role definitions, token claims, and store scoping specification.
7. [`docs/PROJECT_AUDIT.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/PROJECT_AUDIT.md) — Baseline defect and security gap audit.
8. [`docs/IMPLEMENTATION_ROADMAP.md`](file:///c:/Users/Omsri/Desktop/salessense-frontend_2/docs/IMPLEMENTATION_ROADMAP.md) — 8-phase implementation roadmap and completed milestones.
