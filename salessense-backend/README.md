# SalesSense Backend API & Data Warehouse / Mining Engine

FastAPI backend, Kimball Star Schema Data Warehouse, Retail Data Mining suite, and Machine Learning Forecasting tournament engine for **SalesSense**. Aligned with the research paper:

> **FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Retail Forecasting and Inventory Management** (Wang et al., 2025; arXiv:2505.16319).

---

## Key Architecture & Features

### 1. Security & Role-Based Access Control (RBAC)
- **Role Hierarchy**: Admin, Retailer, ML Engineer.
- **Store Data Scoping**: Retailers are strictly isolated to their assigned stores (`user.assigned_stores`), neutralizing horizontal authorization bypasses and CWE-269 privilege escalation.
- **Audit Logging**: Full audit trails of administrative governance actions stored in MongoDB.

### 2. Research Alignment & Stockout Latent Demand Recovery
- **Preserved Retail Factors**: In-stock operational hours (`stock_hour6_22_cnt`), category hierarchies (`first`, `second`, `third_category_id`, `management_group_id`), and weather features (`precpt`, `temperature`, `humidity`).
- **Latent Demand Recovery**: Reconstructs lost sales during inventory stockout events ($H_{\text{lost}} = 16 - \text{stock\_hour6\_22\_cnt}$) using peer and comp-store velocity adjustments.

### 3. Kimball Dimensional Data Warehouse (Star Schema)
- **Fact Table**: `FactDailySales` (granular additive sales, gross revenue, lost sales & revenue estimates, censoring flags).
- **Dimension Tables**: `DimStore`, `DimProduct`, `DimDate`, `DimStockout`.
- **OLAP Engine**: Native API endpoints for **Rollup**, **Drill-Down**, **Slice**, **Dice**, and **Pivot (Cross-Tabulation)**.

### 4. Retail Data Mining Suite
- **Apriori Association Rule Mining**: Discovers cross-product co-purchase rules (Support, Confidence, Lift, Conviction) over customer transaction baskets.
- **K-Means Demand Regime Clustering**: Profiles store-SKU series by velocity, volatility (CV), intermittency, and stockout risk into 4 operational retail archetypes.
- **Rolling Seasonal Anomaly Detection**: 7-day rolling baseline flagging spikes and stockout-induced demand collapses with root-cause attribution.

### 5. Multi-Model Forecasting Tournament
- Evaluates **SARIMA**, **Prophet**, and **BiLSTM** across chronological 80/20 holdouts.
- Auto-selects champion model via minimum holdout wMAPE and surfaces $R^2$, RMSE, MAE, and selection explanations.

---

## Quickstart

### 1. Install Dependencies
```bash
cd salessense-backend
pip install -r requirements.txt
```

### 2. Run the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API Documentation: `http://localhost:8000/docs`

### 3. Ingest Active Dataset & Rebuild Data Warehouse
```bash
python scripts/ingest_dataset.py
```

### 4. Run Automated Test Suite
```bash
python -m pytest tests/ -v
```
*(All 20 unit and integration tests validate RBAC, data scope, censoring recovery, star schema, OLAP, and data mining algorithms).*

---

## API Endpoints Overview

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Authentication** | `/api/auth/login` | POST | Authenticates user and returns JWT bearer token |
| | `/api/auth/register` | POST | Registers new user |
| | `/api/auth/my-stores` | GET | Returns authorized store list for active session |
| **Admin Governance** | `/api/admin/users` | GET / POST | Manages platform user identities and roles |
| | `/api/admin/users/{id}/role` | PUT | Promotes or adjusts user role |
| | `/api/admin/audit-logs` | GET | Reviews administrative action audit log |
| **Data Warehouse** | `/api/dw/metadata` | GET | Summary metrics of Kimball star schema |
| | `/api/dw/rollup` | POST | Rolls up facts along category, month, or store |
| | `/api/dw/drilldown` | POST | Disaggregates facts from category to items |
| | `/api/dw/slice` | POST | Slices hypercube along a single dimension |
| | `/api/dw/dice` | POST | Dices hypercube across multi-dimensional criteria |
| | `/api/dw/pivot` | POST | 2D cross-tabulation matrix with totals |
| **Data Mining** | `/api/mining/market-basket` | GET | Apriori frequent itemsets and association rules |
| | `/api/mining/demand-clusters` | GET | K-Means demand regime cluster archetypes |
| | `/api/mining/anomalies` | GET | Rolling seasonal anomalies with stockout attribution |
| **Forecasting** | `/api/forecast/{store}/{sku}` | GET | Champion forecast and out-of-sample comparisons |
| | `/api/models` | GET | Multi-model benchmark leaderboard |
| | `/api/models/retrain` | POST | Triggers holdout tournament retraining |
