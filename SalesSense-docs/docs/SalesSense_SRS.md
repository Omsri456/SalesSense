# Software Requirements Specification (SRS)
## SalesSense — AI-Powered Retail Demand Forecasting Platform

Version 1.0 | Prepared for: Software Engineering coursework

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for **SalesSense**, an AI-powered platform that forecasts retail product demand using three complementary time-series models (SARIMA, Prophet, LSTM) and recommends stock/reorder quantities. It is intended to guide development, testing, and evaluation for the project's Software Engineering coursework.

### 1.2 Document Conventions
- "The system shall..." denotes a mandatory functional requirement.
- Requirements are tagged by ID (e.g., `FR-1`, `NFR-1`, `DR-1`) for traceability.
- Priority: **High** (core to the demo/evaluation), **Medium** (expected but not blocking), **Low** (stretch goal).

### 1.3 Intended Audience
- Development team (3 members) implementing the system
- Software Engineering course evaluators
- Future maintainers extending the platform

### 1.4 Project Scope
SalesSense allows a retail user to select a store and product, view an AI-generated demand forecast with a recommended reorder quantity, and — if desired — inspect how three different forecasting models compare on that product. It is built on the FreshRetailNet-50K dataset (real hourly retail sales, 898 stores, 865 SKUs) and follows the methodology of Ecevit et al. (2023), *"Short-Term Sales Forecasting Using LSTM and Prophet Based Models in E-Commerce"* (Acta Infologica).

Out of scope for the current version: multi-tenant retailer accounts, live POS integration, payment/billing, mobile apps.

### 1.5 References
- Ecevit, A., Öztürk, İ., Dağ, M., Özcan, T. (2023). *Short-Term Sales Forecasting Using LSTM and Prophet Based Models in E-Commerce.* Acta Infologica, 7(1), 59–70.
- Wang et al. (2025). *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset.* arXiv:2505.16319.
- IEEE Std 830-1998, *Recommended Practice for Software Requirements Specifications.*

---

## 2. Overall Description

### 2.1 Product Perspective
SalesSense is a new, standalone, three-tier web application: a React frontend, a FastAPI backend, and a Python-based forecasting engine, backed by MongoDB. It is not an extension of an existing system.

### 2.2 Product Functions (Summary)
- Ingest and preprocess retail sales data
- Train and backtest three forecasting models per product
- Select and surface the best-performing model as the primary result
- Allow drill-down into full model comparison on demand
- Display KPIs, stock recommendations, and trend dashboards
- Export forecast reports
- Manage user accounts (register/login)

### 2.3 User Classes and Characteristics
| User Class | Description | Technical Level |
|---|---|---|
| Store/Inventory Manager | Views forecasts, acts on reorder recommendations | Low — needs simple, actionable output |
| Retail Owner / Regional Manager | Reviews trends across products for planning | Low–Medium |
| Procurement/Supply Chain Staff | Uses forecasts to time supplier orders | Medium |
| Data Analyst (internal) | Inspects model comparison, accuracy metrics | High |

### 2.4 Operating Environment
- **Frontend**: modern web browsers (Chrome, Edge, Firefox), desktop-first responsive layout
- **Backend**: Python 3.11+, FastAPI, runs on any standard Linux server/container
- **Database**: MongoDB (self-hosted or Atlas free tier)
- **ML runtime**: `statsmodels` (SARIMA), `prophet`, `tensorflow`/`keras` (LSTM)

### 2.5 Design and Implementation Constraints
- Must reproduce the evaluation methodology (R², RMSE, wMAPE) used in the reference paper, for direct comparability.
- Limited to a curated subset (5–10 store-product series) of FreshRetailNet-50K due to team size/timeline — not the full 50,000 series.
- Team of 3 with a single academic-semester timeline.

### 2.6 Assumptions and Dependencies
- FreshRetailNet-50K remains publicly accessible under its CC-BY-4.0 license for the project's duration.
- Team members have working Python/ML environments (or access to free-tier cloud compute) for LSTM training.

---

## 3. System Features (Functional Requirements)

### 3.1 Dataset Management
- **FR-1** (High): The system shall ingest a defined subset of FreshRetailNet-50K into MongoDB.
- **FR-2** (High): The system shall preprocess raw data (handle missing/zero-sale hours, engineer day-of-week/holiday/weather features).
- **FR-3** (Medium): The system shall expose a summary view of the ingested dataset (date range, stores, products, row counts).

### 3.2 Forecasting Engine
- **FR-4** (High): The system shall train SARIMA, Prophet, and LSTM models independently on the same store-product series.
- **FR-5** (High): The system shall backtest each model using a chronological hold-out split and compute R², RMSE, and wMAPE.
- **FR-6** (High): The system shall select the best-performing model per store-product series based on the evaluation metrics.
- **FR-7** (High): The system shall generate a forecast (with confidence interval) using the selected best model.

### 3.3 Result Presentation
- **FR-8** (High): The system shall display the best model's forecast as the primary/default result for a given product.
- **FR-9** (High): The system shall provide a secondary, user-initiated view showing all three models' forecasts and metrics side-by-side.
- **FR-10** (Medium): The system shall display a short explanation of why the best model was selected (e.g., "Lowest wMAPE on backtest").

### 3.4 Dashboard & Reporting
- **FR-11** (High): The system shall display KPI cards (predicted demand, stockout/overstock risk) on the dashboard.
- **FR-12** (Medium): The system shall display historical sales trend alongside the forecast.
- **FR-13** (Medium): The system shall allow exporting a forecast report (CSV/PDF).
- **FR-14** (Low): The system shall track historical forecast accuracy over time.

### 3.5 User Accounts
- **FR-15** (Medium): The system shall allow user registration and login.
- **FR-16** (Low): The system shall support password reset.

### 3.6 Inventory Recommendations
- **FR-17** (Medium): The system shall recommend a reorder quantity based on the forecast and a configurable safety margin.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Web dashboard (React) with pages: Landing, Auth, Dashboard, Dataset Upload, Models, Forecast, Inventory, Reports (already scaffolded; to be connected to real data per this SRS).

### 4.2 Hardware Interfaces
None — standard web-accessible hardware only (client device + server).

### 4.3 Software Interfaces
REST API between frontend and backend. Key endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/forecast/{store_id}/{product_id}` | GET | Returns best model result + all-model comparison |
| `/api/forecast` | POST | Triggers a new forecast run |
| `/api/products` | GET | Lists available store-product series |
| `/api/dataset/summary` | GET | Dataset ingestion stats |

(Full request/response shapes are defined in the SalesSense Architecture Plan document.)

### 4.4 Communication Interfaces
HTTPS for all client-server communication.

---

## 5. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | Forecast retrieval for a cached/pre-computed product shall return in under 2 seconds. | High |
| NFR-2 | New model training/backtest for one series shall complete in under 5 minutes on standard hardware. | Medium |
| NFR-3 | The system shall handle at least 10 concurrent users without degradation (course-demo scale). | Low |
| NFR-4 | User passwords shall be hashed (never stored in plaintext). | High |
| NFR-5 | The UI shall be usable by a non-technical store manager without training. | High |
| NFR-6 | The codebase shall separate model logic from API logic (see architecture plan) to support adding/removing models without touching the API layer. | Medium |
| NFR-7 | The system shall degrade gracefully (clear error message) if a model fails to train on a given series (e.g., insufficient data). | Medium |

---

## 6. Data & Model Requirements

### 6.1 Dataset
- **DR-1**: Source: FreshRetailNet-50K (Hugging Face, `Dingdong-Inc/FreshRetailNet-50K`), CC-BY-4.0.
- **DR-2**: Granularity: hourly sales, 90-day series per store-product pair.
- **DR-3**: Features used: `sale_amount`, `hours_sale`, `discount`, `holiday_flag`, `activity_flag`, `precpt` (precipitation), `avg_temperature`, `avg_humidity`, `avg_wind_level`.
- **DR-4**: Subset size: 5–10 store-product series selected for tractable training within the project timeline.

### 6.2 Preprocessing Requirements
- **DR-5**: Missing/zero-sale hours shall be retained (not dropped) as they may reflect genuine zero demand or stockouts.
- **DR-6**: Categorical features (holiday/activity flags) shall be encoded for model input.
- **DR-7**: Data shall be split chronologically (not randomly) into 80% train / 20% test, matching the reference paper's methodology.

### 6.3 Model Specifications
| Model | Library | Key Parameters | Notes |
|---|---|---|---|
| SARIMA | `statsmodels` | Grid-searched `(p,d,q)(P,D,Q,s)` via AIC | Seasonal period `s` set to match daily/weekly cycle in hourly data |
| Prophet | `prophet` | Holiday + weather/promo regressors, linear & logistic growth tested | Mirrors reference paper's regressor setup |
| LSTM | `tensorflow`/`keras` | Bidirectional LSTM → global pooling → dense layers, 24-hour lookback window, early stopping | Architecture reference: Ecevit et al. (2023) |

### 6.4 Evaluation & Selection Logic
- **DR-8**: Each model shall be scored on R², RMSE, and wMAPE on the held-out test set.
- **DR-9**: The best model per series shall be selected by lowest wMAPE (primary criterion), with RMSE and R² reported alongside for transparency.
- **DR-10**: All three models' scores shall be persisted (not discarded) to support the comparison view (FR-9).

---

## 7. Other Requirements

### 7.1 Legal/Compliance
- Dataset usage complies with FreshRetailNet-50K's CC-BY-4.0 license (attribution required in project documentation/citations).

### 7.2 Future Enhancements (Out of Current Scope)
- Multi-tenant support for multiple retailers
- Real-time POS/inventory system integration
- What-if promotional impact simulation
- Alerting/notifications for predicted stockouts

---

## Appendix A: Glossary
- **SARIMA**: Seasonal Autoregressive Integrated Moving Average — a classical statistical forecasting model.
- **Prophet**: Meta's additive regression forecasting model (trend + seasonality + holidays).
- **LSTM**: Long Short-Term Memory — a recurrent neural network architecture for sequential data.
- **wMAPE**: Weighted Mean Absolute Percentage Error — the primary accuracy metric used for model selection.
- **Backtest**: Evaluating a model's forecast against historical data it wasn't trained on, using a chronological split.
