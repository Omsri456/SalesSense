# SalesSense — Comprehensive Project Audit & Baseline Analysis

**Audit Date:** October 2026  
**Audited Target:** SalesSense Platform (Frontend: React 19 / Vite / Tailwind CSS 4; Backend: FastAPI / MongoDB / PyTorch / Statsmodels)  
**Reference Research:** *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset* (Wang et al., 2025; arXiv:2505.16319) & *Ecevit et al. (2023)*

---

## 1. Executive Summary

SalesSense was conceived as an AI-powered retail demand forecasting and inventory intelligence platform sitting between rudimentary spreadsheet heuristics and bloated enterprise suites. It runs multiple complementary models (SARIMA, Prophet, LSTM) and surfaces the best-fitting champion model for each store–product series.

This audit evaluates the codebase to establish a concrete, empirical baseline before extending the platform into a full **Data Warehouse & Mining (DWM)** system aligned with the **FreshRetailNet-50K** research on stockout-censored retail demand.

### Baseline Summary Matrix

| Subsystem | Implemented Status | Tested | Primary Deficiencies & Technical Debt |
| :--- | :--- | :--- | :--- |
| **Frontend Framework & UI** | Fully Built Shell | Manual Only | Relies heavily on client-side mock data (`src/data/*.js`) with seeded random number generators. Many components do not invoke the backend API. |
| **Authentication & RBAC** | Partial / Insecure | Manual Only | JWT and bcrypt are implemented, but role escalation is trivial via `PUT /api/auth/profile` and client-side persona switching. No data scoping (store assignment). |
| **Backend API & Services** | Implemented but Gapped | Manual Only | Core endpoints exist for auth, forecast, and dataset summaries, but endpoints lack auth guards and type mismatches exist (e.g. `int` vs `str` store/product IDs). |
| **Forecasting Engine** | Substantially Implemented | Baseline Scripts | SARIMA, Prophet, and BiLSTM architectures are implemented with fallback engines, but models fall back to synthetic data upon cache or ingestion misses. |
| **Dataset & Stockout Representation** | Synthetic Benchmark | None | Ingestion script generates synthetic data without true FreshRetailNet-50K stockout fields (`stock_hour6_22_cnt`, `hours_stock_status`, `city_id`, category hierarchy). |
| **Data Warehouse & OLAP** | Missing | None | No dimensional schema (star/snowflake), no ETL staging/fact/dimension tables, no OLAP slicing/dicing/drill-down backend services. |
| **Testing & CI/CD** | Missing | None | 0 automated test suites (no `pytest`, no frontend test runner, no CI configuration, no Dockerfile). |

---

## 2. In-Depth Component Inspection

### 2.1 Frontend Framework, Routing, and State

- **Stack:** React 19.2.8, Vite 8.2.0, Tailwind CSS 4.3.3, Recharts 3.10.1, Framer Motion 12.43.0, Lucide React 1.28.0, PapaParse 5.5.4.
- **Routing (`src/routes/AppRoutes.jsx`):** Clean routing architecture with `ProtectedRoute` wrappers for roles (`retailer`, `ml_engineer`, `admin`).
- **State Management:** React Context (`AuthContext`, `ThemeContext`) and localized component state.
- **Identified Deficiencies:**
  1. **Mock Data Reliance:** `Dashboard.jsx`, `Forecast.jsx`, `Inventory.jsx`, `Models.jsx`, and `Reports.jsx` bypass the backend and read directly from `src/data/*.js`.
  2. **Simulated Model Training:** In `src/pages/Models.jsx`, model retraining is simulated using a client-side `setInterval` timer with random progress increments and jittered accuracy updates.
  3. **Client-Side CSV Parsing Only:** In `src/pages/DatasetUpload.jsx`, files dropped into `FileDropzone` are parsed with PapaParse for the first 8 rows only, with simulated progress bars; no payload is ever transmitted to the backend ETL pipeline.
  4. **Unauthenticated API Client:** `src/services/api.js` provides `apiFetch` wrappers but does not inject `Authorization: Bearer <token>` headers from `localStorage` or `AuthContext`.
  5. **Linting Defect in Topbar:** `src/components/Topbar.jsx` references `<Settings className="h-3.5 w-3.5" />` without importing `Settings as SettingsIcon` from `lucide-react`, triggering JSX reference warnings.

### 2.2 Backend Framework, APIs, and Middleware

- **Stack:** Python 3.14 / 3.11+ compatible, FastAPI 0.141.1, Uvicorn 0.52.4, Pydantic 2.13.5, Motor 3.7.1, PyMongo 4.18.2.
- **Architecture:** Async FastAPI application with lifespan management connecting to MongoDB, CORS middleware configured for `localhost:5173` and `*`.
- **API Endpoints:**
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/me`, `PUT /api/auth/profile`.
  - `GET /api/products`: returns static hardcoded product list (`INITIAL_PRODUCTS`).
  - `GET /api/dataset/summary`: counts MongoDB documents or cached CSV rows, but falls back to hardcoded figures (`total_rows = 61320`).
  - `GET /api/forecast/{store_id}/{product_id}`: executes backtest and model selection or serves memory cache.
  - `POST /api/forecast`: triggers forecast calculation.
  - `GET /api/forecast/accuracy-history/{store_id}/{product_id}`: parameter types declared as `int` rather than `str`, causing 422 Unprocessable Entity errors when store IDs like `"STORE_01"` are supplied.
  - `GET /api/models`: returns hardcoded static array (`BENCHMARK_MODELS`).

### 2.3 Database, Schemas, and Storage

- **Technology:** MongoDB via Motor (async) and PyMongo (sync).
- **Resilience Design:** Graceful fallback to local in-memory dictionaries and CSV cache (`data_cache/freshretailnet_subset.csv`) when MongoDB is unreachable.
- **Schemas (`app/db/schemas.py`):**
  - Defines `ModelMetrics`, `ForecastDataPoint`, `HistoricalDataPoint`, `ChartDataPoint`, `BestModelDetails`, `ModelSummary`, `ForecastResponse`, `ForecastRequest`, `ProductItem`, `DatasetSummary`.
  - **Missing Entities:**
    - No User / Role schema in Pydantic (auth services use raw dictionaries).
    - No UserStoreAssignment schema for granular data scoping.
    - No Data Warehouse dimensional entities (FactSales, DimStore, DimProduct, DimDate, DimWeather, DimStockout).
    - No Job / IngestionLog entity to track batch pipelines and ETL run history.

### 2.4 User Roles, Authorization, and Security Vulnerabilities

- **Current Implementation:** Roles are strings (`"retailer"`, `"ml_engineer"`, `"admin"`).
- **Critical Vulnerabilities:**
  1. **Self-Service Privilege Escalation (CWE-269):** The endpoint `PUT /api/auth/profile` accepts `{ "role": "admin" }` directly from an authenticated user without verifying administrative authority. Any retailer can immediately grant themselves administrator permissions.
  2. **Client-Side Role Override:** In `src/routes/ProtectedRoute.jsx` and `src/pages/Profile.jsx`, users are provided a UI option to switch their persona in local storage, which the client-side router trusts completely.
  3. **Missing API Authorization Middleware:** Core analytics and model endpoints (`/api/forecast/*`, `/api/models`, `/api/products`, `/api/dataset/summary`) do not require authentication headers or verify role permissions.
  4. **Absence of Data Scope Enforcement:** No mechanism links retailers to specific assigned stores. All data returned is global or unconstrained.

### 2.5 Dataset Ingestion, Source Files, and FreshRetailNet-50K Reality

- **Current Script:** `salessense-backend/scripts/ingest_dataset.py` attempts to download `sample.parquet` from Hugging Face (`Dingdong-Inc/FreshRetailNet-50K`). When unreachable, it generates synthetic data via `generate_benchmark_series`.
- **Existing CSV Cache:** `data_cache/freshretailnet_subset.csv` (61,322 lines, ~4.95 MB).
- **Discrepancy with FreshRetailNet-50K Research Paper:**
  - The actual FreshRetailNet-50K dataset represents:
    - `city_id` and `store_id` (location context).
    - Product hierarchy: `management_group_id`, `first_category_id`, `second_category_id`, `third_category_id`, `product_id`.
    - Stockout annotations: `stock_hour6_22_cnt` (hours in stock between 06:00 and 22:00) and `hours_stock_status` (hourly binary stockout indicators).
    - Sales: `dt`, `sale_amount`, `hours_sale` (hourly distribution array).
  - The current CSV file completely lacks stockout columns, city IDs, and category hierarchy keys. It contains synthetic observations labeled as benchmark data without recording provenance or censoring flags.

### 2.6 Forecasting Implementations and Evaluation Engine

- **Implemented Models:**
  1. **SARIMA (`app/models/sarima_model.py`):** Uses `statsmodels.tsa.statespace.sarimax.SARIMAX` with `order=(2,1,2)` and `seasonal_order=(1,1,1,12)`.
  2. **Prophet (`app/models/prophet_model.py`):** Self-contained Bayesian Fourier Additive Decomposition engine supporting daily and weekly Fourier seasonality and exogenous regressors (`holiday_flag`, `discount`, `avg_temperature`, `precpt`).
  3. **Bidirectional LSTM (`app/models/lstm_model.py`):** PyTorch implementation with 24-hour lookback window, MSE loss, Adam optimizer, and residual-based confidence intervals.
- **Evaluation Engine (`app/evaluation/`):**
  - Chronological 80/20 train/test split (`splitter.py`).
  - Metrics calculation (`metrics.py`): R², RMSE, wMAPE, MAE, accuracy percentage.
  - Champion selector (`selector.py`): Primary ranking by lowest wMAPE with RMSE tie-breaking.
  - **Deficiency:** When any fitting failure or data inconsistency occurs, `forecast_service.py` catches all exceptions and silently returns `_fallback_forecast`, returning hardcoded synthetic numbers instead of reporting pipeline errors.

### 2.7 Environment, Configuration, and Testing

- **Docker / Compose:** No `Dockerfile` or `docker-compose.yml` present in repository.
- **CI/CD:** No GitHub Actions or CI pipeline defined.
- **Tests:** Zero unit or integration tests exist in either `src/` or `salessense-backend/`.

---

## 3. Functionality Categorization

### Category 1: Fully Implemented and Functional
- React/Vite UI layout, responsive shell, dark/light theme toggle, and UI component hierarchy.
- Password hashing using bcrypt and JWT token generation/validation.
- Mathematical metric computation functions ($R^2$, RMSE, wMAPE, MAE) matching research definitions.
- Statistical SARIMA modeling via `statsmodels` with error fallback.
- Fourier additive decomposition model for seasonal regression.
- Chronological time-series train/test splitting.

### Category 2: Implemented but Incomplete
- Ingestion pipeline: loads CSV cache and MongoDB if available, but lacks validation, error reporting, provenance, and true FreshRetailNet-50K stockout fields.
- Forecast service: executes backtesting on raw data, but falls back silently to synthetic numbers upon minor data discrepancies.
- User profile management: allows name and password updates, but lacks audit trails and administrative oversight.
- In-memory caching: cache exists in `forecast_service.py` but is not keyed by user store permissions.

### Category 3: UI-Only or Mocked Functionality
- `src/pages/Dashboard.jsx`: draws exclusively from `src/data/dashboardData.js` and `salesTrendData.js`.
- `src/pages/Forecast.jsx`: executes client-side `generateForecast` with `seededRandom`.
- `src/pages/Inventory.jsx`: calculates stockout days and ROP recommendations from static `inventoryData.js`.
- `src/pages/Models.jsx`: simulates model training with `setInterval` rather than backend execution.
- `src/pages/Reports.jsx`: generates fake reports with simulated timers and static strings.
- `src/pages/DatasetUpload.jsx`: parses 8 rows client-side with PapaParse, never transmits data to server.

### Category 4: Missing Functionality
- **Data Warehouse Layer:** Star/Snowflake dimensional models, surrogate keys, date/store/product dimensions, and fact tables.
- **OLAP Capabilities:** Rollup, drill-down, slice, and dice operations across store, city, category, and time dimensions.
- **Data Mining Algorithms:** Association rule mining (Apriori/FP-Growth), clustering for product demand regimes (K-Means/DBSCAN), and anomaly detection.
- **Stockout-Aware Censored Demand Recovery:** Baseline expectation-maximization or comparable period interpolation to uncover latent unconstrained demand.
- **Granular Data Scope (Store Authorization):** Store assignment mapping ensuring retailers only access their assigned facilities.
- **Automated Test Suites:** Pytest unit/integration tests and frontend verification tests.
- **Containerization:** Docker and orchestration configs.

### Category 5: Insecure, Incorrect, or Inconsistent Functionality
- **Insecure:** Privilege escalation via `PUT /api/auth/profile` allowing users to set `role="admin"`.
- **Insecure:** All analytical and data APIs (`/products`, `/forecast`, `/models`, `/dataset/summary`) are unauthenticated.
- **Incorrect:** `routes_forecast.py` expects `store_id: int, product_id: int` for `/accuracy-history`, breaking string identifiers like `"STORE_01"`.
- **Inconsistent:** Hardcoded dataset statistics (`total_rows = 61320`) conflict with dynamic row counts from ingested files.
- **Inconsistent:** Synthetic fallback in `forecast_service.py` conceals real backend errors from the user.

---

## 4. Audit Baseline Verification

- **Backend Syntax & Lifespan:** Tested via Python execution (`app.main` imported cleanly; zero fatal import errors).
- **Frontend Build & Transpilation:** Verified via `npm run build` (Rolldown/Vite built in 3.78s).
- **Frontend Linter:** Verified via `oxlint` (16 non-fatal warnings identified, including unused imports and missing icon alias in `Topbar.jsx`).
- **Dependencies:** All necessary ML and web packages (`torch`, `statsmodels`, `scikit-learn`, `pandas`, `fastapi`, `motor`, `pymongo`, `bcrypt`, `pyjwt`) are present in the local environment.

---

*End of Project Audit Report.*
