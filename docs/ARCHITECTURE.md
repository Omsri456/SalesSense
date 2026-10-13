# SalesSense — System Architecture & Design Specification

**Document Version:** 2.0  
**Domain:** AI-Powered Retail Demand Forecasting, Data Warehousing & Data Mining (DWM)  
**Research Reference:** *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset* (Wang et al., 2025; arXiv:2505.16319)

---

## 1. Architectural Vision & Core Principles

SalesSense bridges the gap between ad-hoc spreadsheet estimation and inaccessible enterprise forecasting software. Instead of enforcing a single universal model, SalesSense runs a tournament of specialized time-series and deep-learning models (SARIMA, Prophet, BiLSTM) across each store–product time series, dynamically crowning the best-fitting champion model while preserving full explainability.

In this evolution, the platform expands into a full **Data Warehouse & Data Mining (DWM)** architecture that addresses the fundamental retail phenomenon identified in the FreshRetailNet-50K research: **stockout censoring**. When products are out of stock, observed sales drop to zero, artificially masking true customer demand. SalesSense models true latent demand, houses clean historical data in an OLAP-ready dimensional warehouse, and delivers role-scoped predictive intelligence.

```
+---------------------------------------------------------------------------------------------------+
|                                       PRESENTATION TIER (SPA)                                     |
|  React 19 + Vite + Tailwind CSS 4 | Dynamic Dark/Light Theme | Recharts Visualization Shell       |
|  +--------------------+  +--------------------+  +--------------------+  +---------------------+  |
|  | Retailer Workspace |  | ML Engineer Studio |  | Admin Governance   |  | Shared Auth/Profile |  |
|  +--------------------+  +--------------------+  +--------------------+  +---------------------+  |
+-------------------------------------------------+-------------------------------------------------+
                                                  | HTTPS / REST + Bearer JWT
+-------------------------------------------------v-------------------------------------------------+
|                                     APPLICATION & API TIER (FastAPI)                              |
|  [Auth & RBAC Middleware] -> Strictly enforces Role + Data Scope (Assigned Store Filtering)       |
|  +-------------------------+  +-------------------------+  +------------------------------------+ |
|  | routes_auth.py          |  | routes_forecast.py      |  | routes_dw_olap.py                  | |
|  | routes_data.py          |  | routes_models.py        |  | routes_mining.py                   | |
|  +-------------------------+  +-------------------------+  +------------------------------------+ |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
+-------------------------------------------------v-------------------------------------------------+
|                                BUSINESS LOGIC & ALGORITHMIC SERVICES                              |
|  +---------------------------+ +----------------------------+ +---------------------------------+ |
|  | Forecast Engine           | | Censored Demand Recovery   | | Data Mining Engine              | |
|  | - SARIMA (Statsmodels)    | | - Stockout detection       | | - Apriori / Market Basket       | |
|  | - Prophet (Fourier Add)   | | - Latent demand estimation | | - K-Means Demand Clustering     | |
|  | - BiLSTM (PyTorch)        | | - Censoring confidence     | | - Sales Anomaly Detection       | |
|  +---------------------------+ +----------------------------+ +---------------------------------+ |
|  +----------------------------------------------------------------------------------------------+ |
|  | OLAP Aggregation Engine: Slice, Dice, Rollup, Drill-Down across Store, Product, Time, Geo    | |
|  +----------------------------------------------------------------------------------------------+ |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
+-------------------------------------------------v-------------------------------------------------+
|                                 DATA WAREHOUSE & STORAGE TIER                                     |
|  +-----------------------------------------+  +-------------------------------------------------+ |
|  | Dimensional Warehouse (Star Schema)    |  | Operational & Security Collections              | |
|  | - FactDailySales                       |  | - users & user_store_assignments                | |
|  | - FactHourlySales                      |  | - ingestion_jobs & pipeline_audit               | |
|  | - DimStore, DimProduct, DimDate        |  | - model_experiments & registry                 | |
|  | - DimWeather, DimStockout              |  | - raw_sales (Staging Area)                      | |
|  +-----------------------------------------+  +-------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Layered Architecture

### 2.1 Presentation Tier (Frontend)
- **Technology:** React 19, Vite 8, Tailwind CSS 4, Recharts, Framer Motion, Lucide Icons.
- **Client Service Layer (`src/services/api.js`):** Centralizes authenticated HTTP calls with Bearer token injection, retry logic, and strict error propagation (no silent mock generation).
- **Role-Gated Views:**
  - **Retailer Persona:** Focused on inventory replenishment, days to stockout, reorder points (ROP), safety stock margins, and demand forecasts with confidence intervals for assigned stores.
  - **ML Engineer Persona:** Model tournament leaderboard, loss curves, backtesting metrics ($R^2$, RMSE, wMAPE, MAE), dataset quality reports, and retraining controls.
  - **Admin Persona:** Platform-wide telemetry, user provisioning, store assignment management, ingestion job audit logs, and system health monitoring.

### 2.2 Security & Authorization Tier
- **Authentication:** Standard OAuth2 Bearer token format with signed HS256 JWTs and bcrypt salted password hashing (work factor 12).
- **Role vs Scope Separation:**
  - `Role`: Defines system capabilities (`retailer`, `ml_engineer`, `admin`).
  - `Data Scope`: Defines geographical/store boundaries (e.g. `STORE_01`, `STORE_02`, or `*` for admin).
- **Enforcement:** Enforced in backend route dependencies (`get_current_active_user`, `verify_store_access`). Client-supplied role overrides in profile update payloads are rejected.

### 2.3 Data Warehouse & OLAP Tier (DWM Extension)
To transform SalesSense into an enterprise-grade retail intelligence platform, we implement a **Kimball Dimensional Star Schema**:

```
                  +---------------------+
                  |      DimDate        |
                  +---------------------+
                  | date_key (PK)       |
                  | full_date           |
                  | day_of_week         |
                  | month               |
                  | quarter             |
                  | year                |
                  | is_weekend          |
                  | holiday_flag        |
                  +----------+----------+
                             |
+---------------------+      |      +---------------------+
|      DimStore       |      |      |     DimProduct      |
+---------------------+      |      +---------------------+
| store_key (PK)      |      |      | product_key (PK)    |
| store_id (Natural)  |      |      | product_id (Natural)|
| city_id             |      |      | product_name        |
| region_name         |      |      | management_group_id |
| store_tier          |      |      | first_category_id   |
+----------+----------+      |      | second_category_id  |
           |                 |      | third_category_id   |
           |                 |      | category_name       |
           |                 |      | unit_cost           |
           |                 |      +----------+----------+
           |                 |                 |
           |      +----------v----------+      |
           +----->|    FactDailySales   |<-----+
                  +---------------------+
                  | fact_id (PK)        |
                  | date_key (FK)       |
                  | store_key (FK)      |
                  | product_key (FK)    |
                  | weather_key (FK)    |
                  | stockout_key (FK)   |
                  +---------------------+
                  | observed_sales      |
                  | gross_revenue       |
                  | discount_rate       |
                  | in_stock_hours      |
                  | stockout_hours      |
                  | is_censored_flag    |
                  | estimated_demand    |
                  | unconstrained_demand|
                  +----------+----------+
                             |
           +-----------------+-----------------+
           |                                   |
+----------v----------+             +----------v----------+
|     DimWeather      |             |     DimStockout     |
+---------------------+             +---------------------+
| weather_key (PK)    |             | stockout_key (PK)   |
| precpt (mm)         |             | stock_hour6_22_cnt  |
| avg_temperature (°C)|             | hours_stock_status  |
| avg_humidity (%)    |             | stockout_severity   |
| avg_wind_level      |             | censoring_type      |
+---------------------+             +---------------------+
```

#### OLAP Operations Supported:
1. **Rollup:** Aggregate hourly records to daily, weekly, monthly, and yearly sales; aggregate SKU sales to third-category, second-category, first-category, and store levels.
2. **Drill-Down:** Navigate from city/region sales down to individual store, category, and SKU-level hourly trends.
3. **Slice:** Filter facts for a specific store (`store_id == 'STORE_01'`) or specific category (`first_category_id == 1`).
4. **Dice:** Multi-dimensional filtering, e.g., `store_id IN ['STORE_01', 'STORE_02'] AND category == 'Produce' AND month == 'July'`.
5. **Pivot:** Cross-tabulate sales metrics by Store vs Category, or Month vs Model Accuracy.

### 2.4 Data Mining Tier
SalesSense executes analytical data-mining algorithms directly on the dimensional warehouse data:
1. **Market Basket & Association Analysis (Apriori):** Discovers cross-product affinities and co-purchase rules (Support, Confidence, Lift) to optimize product co-location and joint reorders.
2. **K-Means Demand Regime Clustering:** Segments store–product series into distinct behavioral clusters:
   - *High-Velocity Stable Demand* (staples).
   - *Promo-Volatile Spiky Demand* (promotional items).
   - *Weather-Sensitive Perishables* (cold beverages, fresh produce).
   - *Low-Volume Intermittent Demand* (slow-moving specialty goods).
3. **Statistical Anomaly Detection:** Identifies abnormal sales surges or drops using $Z$-score and IQR bounds across seasonal baselines, automatically distinguishing true demand shocks from inventory stockouts.

### 2.5 Stockout-Aware Censored Demand Engine
Drawing upon the FreshRetailNet-50K paper, the application recognizes that:
$$\text{Observed Sales } Y_t = \min(D_t, I_t)$$
Where $D_t$ is true unconstrained customer demand and $I_t$ is available inventory. When stockout occurs ($I_t = 0$), $Y_t = 0$ even if $D_t > 0$.

```
+----------------------------------------------------------------------------------------+
|                          CENSORED DEMAND RECOVERY PIPELINE                             |
|                                                                                        |
|  [Raw Observation (dt, store_id, product_id)]                                         |
|                     |                                                                  |
|                     v                                                                  |
|  Check Stockout Annotations (stock_hour6_22_cnt < 16 OR hours_stock_status contains 0)  |
|       /                                                                 \              |
|      / [In-Stock All Day]                                                \ [Stockout]  |
|     v                                                                     v            |
|  Observed Sales = Latent Demand                     Calculate Active Selling Hours     |
|  Censoring Flag = False                             Identify Comparable In-Stock Days  |
|                                                     (Same DOW, season, promo status)   |
|                                                                   |                    |
|                                                                   v                    |
|                                                     Run Baseline Rate Recovery:        |
|                                                     D_est = Y_obs * (Total_hrs/Active) |
|                                                     Flag: is_censored = True           |
|                                                     Confidence: Based on sample variance|
+----------------------------------------------------------------------------------------+
```

### 2.6 Multi-Model Forecasting & Tournament Engine
Each store–product time series is fitted independently across three distinct mathematical paradigms:

1. **Statistical SARIMA:**
   $$\Phi_P(B^s)\phi_p(B)(1-B)^d(1-B^s)^D Y_t = \Theta_Q(B^s)\theta_q(B)\epsilon_t$$
   Provides a rigorous baseline with formal parametric confidence intervals.

2. **Additive Prophet with Decomposable Regressors:**
   $$y(t) = g(t) + s(t) + h(t) + \sum \beta_i X_{i,t} + \epsilon_t$$
   Handles holiday effects, promotional spikes, and weather covariates (precipitation, temperature).

3. **Deep Learning Bidirectional LSTM (BiLSTM):**
   Captures non-linear dependencies and multi-day temporal sequence patterns using forward and backward hidden states with early stopping.

#### Champion Selection Hierarchy
All models are evaluated on a strict chronological 80/20 holdout split:
1. Primary criterion: **wMAPE** (Weighted Mean Absolute Percentage Error):
   $$\text{wMAPE} = \frac{\sum_{t} |y_t - \hat{y}_t|}{\sum_t y_t}$$
2. Secondary criterion (tie-breaker): **RMSE** (Root Mean Squared Error).
3. The platform automatically serves the champion model as the primary answer, but retains full metrics for side-by-side comparison on demand.

---

## 3. Storage & Schema Definition

### 3.1 Dimensional Storage Format
The data warehouse is stored in high-performance indexed collections in MongoDB, backed by transparent file-based columnar storage (CSV/Parquet) for offline/standalone execution:

1. `dw_fact_daily_sales`: Daily aggregated transactional observations with censoring annotations and demand estimates.
2. `dw_dim_store`: Store metadata, city identifiers, region mappings, and operational tiers.
3. `dw_dim_product`: Multi-tier hierarchical product classification (`management_group_id` -> `first_category_id` -> `second_category_id` -> `third_category_id` -> `product_id`).
4. `dw_dim_date`: Calendar dimensional table with holiday and cyclical attributes.
5. `dw_dim_weather`: Aggregated meteorological indices.

### 3.2 System & Security Collections
1. `users`: Hashed passwords, emails, names, roles, account status, timestamps.
2. `user_store_assignments`: Maps user IDs to authorized store IDs and city regions.
3. `model_experiments`: Full telemetry of backtests, hyperparameters, metrics, and trained artifacts.
4. `ingestion_jobs`: Audit trail recording source file name, row count, validation errors, provenance hash, and status.

---

## 4. Security & Threat Mitigation Matrix

| Threat / Vulnerability | Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- |
| **Privilege Escalation** (e.g. Retailer setting role to Admin) | Strip `role` field from self-service profile update schemas. Role changes require dedicated admin-only endpoint (`PUT /api/admin/users/{id}/role`). | `routes_auth.py`, `routes_admin.py` |
| **Cross-Store Data Leakage** (Retailer viewing unauthorized store) | Mandatory `verify_store_access` dependency on every store-scoped API endpoint (`/forecast/{store_id}`, `/inventory/{store_id}`). | `app/api/deps.py` |
| **Unauthenticated Analytical Access** | Global JWT Bearer token authentication dependency applied across data, forecasting, and OLAP routers. | `app/api/deps.py`, `app/main.py` |
| **Insecure Mock Role Switching** | Remove client-side role override buttons from user-facing screens (`ProtectedRoute.jsx`, `Profile.jsx`). | `src/routes/ProtectedRoute.jsx`, `src/pages/Profile.jsx` |
| **Silent Error Obfuscation** | Replace catch-all fallback with typed HTTP exceptions and structured error envelopes. | `forecast_service.py` |

---

*End of Architecture Specification.*
