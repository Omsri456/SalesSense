# SalesSense — Autonomous Retail Demand Intelligence & Data Warehouse / Mining Platform

SalesSense is an AI-powered retail demand forecasting, inventory optimization, and **Data Warehouse & Data Mining (DWM)** intelligence platform. It bridges the gap between spreadsheet guesswork and inaccessible enterprise software by running multiple forecasting techniques, diagnosing store stockout dynamics, and structuring retail transactions into a high-performance **Kimball Dimensional Star Schema Data Warehouse** with native **OLAP operations** and **Data Mining algorithms**.

The architecture and data schema are directly aligned with the retail research paper:
> **FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Retail Forecasting and Inventory Management** (Wang et al., 2025; arXiv:2505.16319).

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |            SalesSense Frontend              |
                                      |         React 19 + Vite + Tailwind          |
                                      +----------------------+----------------------+
                                                             |
                                           JWT Bearer Auth & REST APIs
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |         FastAPI Application Server          |
                                      |         True RBAC & Store Scoping           |
                                      +-------+--------------------+----------------+
                                              |                    |
                         +--------------------+                    +--------------------+
                         |                                                              |
                         v                                                              v
+-------------------------------------------------+            +-------------------------------------------------+
|      Kimball Star Schema Data Warehouse         |            |         Forecasting & Mining Suite              |
+-------------------------------------------------+            +-------------------------------------------------+
| - FactDailySales (Additive sales, latent demand)|            | - Apriori Market Basket (Support, Conf, Lift)   |
| - DimStore (Store, City, Region, Tier)          |            | - K-Means Demand Regime Clustering              |
| - DimProduct (SKU, 3-level Category Taxonomy)   |            | - Rolling Seasonal Anomaly Detection            |
| - DimDate (Calendar dimensions, Holidays)       |            | - Tournament Backtesting (SARIMA, Prophet, LSTM)|
| - DimStockout (In-stock hours 0-16h, severity)  |            | - Censored Latent Demand Recovery Engine        |
| - OLAP Engine (Rollup, Drill-Down, Slice, Dice, |            +-------------------------------------------------+
|   and 2D Cross-Tabulation Pivot Matrix)         |
+-------------------------------------------------+
                         |
                         v
+-------------------------------------------------+
|         Persistent Storage & Staging            |
|  MongoDB (raw_sales, users, audit_logs) + CSV   |
+-------------------------------------------------+
```

---

## Key Features

1. **Enterprise Security & True RBAC**:
   - Distinct roles: `Admin`, `Retailer`, `ML Engineer`.
   - Store Data Scoping: Retailers only see data for their assigned stores. Horizontal privilege escalation is strictly neutralized on the server side (HTTP 403).
   - Dedicated administrative audit logging and scoped analytics.

2. **Research Alignment & Latent Demand Recovery**:
   - Built on authentic FreshRetailNet-50K parquet splits (`data/train.parquet`, `data/eval.parquet`) with SHA-256 provenance tracking.
   - Direct support for retail factors: `stock_hour6_22_cnt`, `management_group_id`, category hierarchy, and `DimWeather` foreign keys.
   - Reconstructs unconstrained latent demand when stockouts occur, showing the lost sales gap in color-blind safe charts.

3. **Perishable Inventory Intelligence**:
   - Perishable reorder ceiling: `suggested_qty = max(0, min(ceil(rop_need), floor(perishable_ceiling)))`.
   - Prevents over-ordering beyond shelf life limits (`max_units_cover = shelf_life_days * daily_velocity`).
   - Visual Days of Cover bullet gauges (cover vs. lead time marker vs. shelf life hazard) and waste risk cost ($) tracking.

4. **Kimball Star Schema Data Warehouse & OLAP**:
   - `FactDailySales` joined with `DimStore`, `DimProduct`, `DimDate`, `DimStockout`, and `DimWeather`.
   - High-speed **Rollup**, **Drill-Down**, **Slice**, **Dice**, and **2D Pivot Cross-Tabulation** APIs.
   - Dynamic Kimball hierarchy level switcher (SKU -> Subcategory -> Category -> Management Group) with constituent SKU revenue drilldowns.

5. **Advanced Visualizations & Compare Mode**:
   - Color-blind safe palette (`#0d9488` actuals, `#2563eb` forecasts, `#e11d48` latent demand gap).
   - Operating hour (06:00–22:00) × Weekday (Mon–Sun) demand & stockout hazard heatmaps.
   - Multi-Product Growth Comparison mode with normalized scale (`Index = 100`) for cross-catalog velocity comparison.

6. **Retail Data Mining Suite**:
   - **Market Basket Analysis (Apriori)**: Generates frequent itemsets and association rules with Support, Confidence, Lift, and Conviction.
   - **K-Means Demand Regime Clustering**: Groups store-SKU series into 4 actionable operational archetypes (Fast Mover, Volatile Surge, Intermittent Lumpy, Steady Standard).
   - **Rolling Anomaly Detection**: 7-day seasonal baseline flags sales spikes and stockout-induced demand collapses with root-cause attribution.

7. **Multi-Model Tournament Engine**:
   - Chronological 80/20 holdouts evaluating SARIMA, Prophet, and BiLSTM.
   - Auto-selects champion model based on lowest holdout wMAPE and surfaces $R^2$, RMSE, and MAE.

---

## Project Structure

```
salessense-frontend_2/
├── docs/                                # Technical specifications & architecture
│   ├── ARCHITECTURE.md                  # System architecture & Kimball schema
│   ├── DATA_DICTIONARY.md               # Raw, staging, and dimensional data dictionary
│   ├── DATA_WAREHOUSE_AND_MINING.md     # DW, OLAP, and Data Mining suite details
│   ├── ETL_PIPELINE.md                  # Ingestion, validation, and SHA-256 provenance
│   ├── IMPLEMENTATION_ROADMAP.md        # 8-phase execution plan
│   ├── PROJECT_AUDIT.md                 # Baseline audit & security gap analysis
│   ├── RBAC_AND_DATA_SCOPE.md           # Role-based access control specification
│   └── RESEARCH_ALIGNMENT.md            # FreshRetailNet-50K paper formulation
├── salessense-backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/                         # REST API routes (auth, admin, dw, mining, forecast, dashboard, inventory)
│   │   ├── db/                          # Mongo client & Pydantic schemas
│   │   ├── dw/                          # Kimball dimensional model engine
│   │   ├── services/                    # Censored demand, OLAP, mining, forecasting services
│   │   └── models/                      # SARIMA, Prophet, LSTM forecast models
│   ├── scripts/                         # Dataset generation & ingestion scripts
│   └── tests/                           # 34 automated unit and integration tests
├── src/                                 # React 19 frontend
│   ├── components/                      # UI components, bullet charts, sparklines, heatmaps, hierarchy switcher
│   ├── pages/                           # Dashboard, DWM & OLAP, Forecast, Models, Inventory, Upload
│   ├── routes/                          # Protected routing with role verification
│   └── services/                        # Authenticated API clients
└── package.json
```

---

## Quickstart Guide

### 1. Start the Backend API
```bash
cd salessense-backend
pip install -r requirements.txt
python scripts/ingest_dataset.py
uvicorn app.main:app --reload --port 8000
```
Swagger UI: `http://localhost:8000/docs`

### 2. Run the Frontend Application
```bash
# In the repository root
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Demo Credentials
| Persona | Email | Password | Store Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@salessense.com` | `Password123!` | Global (`*`) |
| **Retail Store Manager 1** | `retailer1@salessense.com` | `Password123!` | `STORE_01` |
| **Retail Store Manager 2** | `retailer2@salessense.com` | `Password123!` | `STORE_02` |
| **ML Engineer** | `mle@salessense.com` | `Password123!` | Global (`*`) |

### 4. Run Automated Tests
```bash
cd salessense-backend
python -m pytest tests/ -v
```
**Test Results: 34 passed tests covering authentic parquet pipeline, RBAC, store scoping, censored demand recovery, star schema building, OLAP operations, data mining algorithms, perishable inventory ceilings, and Kimball hierarchy aggregation.**
