# SalesSense — Product Overview

## 1. The Idea / Problem Being Solved

Retailers — from a single grocery store to a multi-outlet chain or an e-commerce seller — constantly have to answer one question: **"How much of X will I sell next week/month?"** Get it wrong in either direction and it costs money:

- **Overstock** → capital tied up in inventory, spoilage (for perishables), markdowns, storage costs.
- **Understock** → lost sales, disappointed customers, emergency reordering at higher cost.

Most small-to-mid retailers today either:
1. **Guess / use gut feeling** or basic spreadsheet averages — fast but inaccurate, especially around seasonality and promotions.
2. **Buy enterprise forecasting suites** (SAP IBP, Blue Yonder, o9) — accurate but expensive, complex, and built for large enterprises, not accessible to smaller players.

**SalesSense's idea**: give retailers an AI-powered demand forecasting platform that's accurate, explainable, and easy to use — sitting in the gap between "spreadsheet guesswork" and "enterprise-only tooling." Instead of betting on one forecasting technique, it runs multiple models and shows the user which one actually fits their data best, rather than pretending one-size-fits-all forecasting works.

## 2. Who Uses It (Target Users)

| User | What they need from SalesSense |
|---|---|
| **Store / Inventory Manager** | "How much should I order for next week for this SKU?" — simple, actionable numbers |
| **Retail owner / Regional manager** | Store/region-level demand trends for budgeting and planning |
| **Procurement / Supply chain team** | Lead-time-aware forecasts to avoid stockouts when ordering from suppliers |
| **Data-savvy analyst inside the retail company** | Wants to compare model accuracy, dig into confidence intervals, tune parameters |

The common thread: none of them want to be data scientists. They want a dashboard that answers "what to stock, how much, and how confident are we" — with the option to go deeper if they want to.

## 3. Why Three Models? (LSTM, Prophet, SARIMA)

This is the core technical differentiator, and the reasoning matters: **no single forecasting model wins for every product.** Demand patterns vary a lot across a retailer's catalog — a soft drink sells consistently with weekly/seasonal patterns, a fashion item has erratic, promo-driven spikes, a new SKU has almost no history. Using one model everywhere means it'll be great for some SKUs and bad for others, with no way to know which.

| Model | What it's good at | Why it's in SalesSense |
|---|---|---|
| **SARIMA** (Seasonal ARIMA) | Classical statistical method. Strong on stable, well-behaved series with clear seasonality and *limited* history. Gives statistically grounded confidence intervals. Cheap and fast to train. | Reliable baseline — works even when there isn't much historical data yet, and is easy to sanity-check against. |
| **Prophet** | Decomposes demand into trend + weekly/yearly seasonality + holiday effects. Robust to missing data, outliers, and irregular gaps. Very interpretable ("this spike is because of the holiday component"). | Retail demand is heavily calendar-driven (weekends, festivals, month-end salary cycles) — Prophet is built exactly for this. |
| **LSTM** (deep learning) | Learns complex, non-linear patterns and longer dependencies — e.g. lingering effects of a promotion, or interactions between related products — that the other two can't capture. Needs more data to be worth it. | Captures the "messy" demand patterns classical models miss, once there's enough historical data per SKU. |

**How SalesSense uses the three together**: for each store–product combination, it backtests all three models on holdout data, scores them (MAPE/RMSE), and either auto-recommends the best-performing one or shows all three side-by-side so the user can see *why* one is trusted more for that specific product — turning "trust the black box" into "here's the evidence."

## 4. Features Users Get

**Core forecasting flow**
- Select store, product (SKU), and forecast horizon
- Get a demand forecast chart with confidence intervals
- See a stock recommendation ("order ~X units for next week")

**Model transparency**
- Side-by-side comparison of LSTM / Prophet / SARIMA predictions
- Accuracy metrics per model, per product (so the user sees *why* a model was picked)
- Auto-recommended "best model" per SKU

**Dashboard & reporting**
- KPI cards: predicted demand, potential stockout/overstock risk
- Historical accuracy tracking (how good were past forecasts vs. actual sales)
- Export forecast reports (CSV/PDF)

**Planned / future**
- Alerts for predicted stockouts before they happen
- Multi-store aggregate/rollup view
- "What-if" simulation (e.g. "what happens to demand if I run a 20% promo?")

## 5. System Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌───────────────────────────┐
│  React Frontend  │  REST  │   FastAPI Backend     │        │   Forecasting Engine       │
│  (dashboard,      │◄─────► │   (validation, auth,  │◄──────►│   LSTM / Prophet / SARIMA   │
│   charts, forms)  │        │    orchestration)      │        │   (preprocess → train/     │
└─────────────────┘        └──────────┬───────────┘        │    predict → evaluate)      │
                                        │                     └───────────────────────────┘
                                        ▼
                                 ┌─────────────┐
                                 │  MongoDB     │
                                 │  sales data, │
                                 │  forecasts,  │
                                 │  user config │
                                 └─────────────┘
```

**Flow**: User configures a forecast request in the React UI → FastAPI validates it and pulls historical sales data from MongoDB → triggers the forecasting job → the engine preprocesses the data (cleaning, handling missing values, feature engineering), runs the three models, backtests and scores them → results (forecast + metrics) are written back to MongoDB → backend returns them → frontend renders the charts/KPIs.

## 6. Where the Project Actually Stands Right Now

Updated to reflect the current state, not the state when this doc was first written:

- ✅ **Frontend built** — but still running on **dummy/mock data**, not yet connected to a real backend or real models.
- ✅ **Dataset finalized** — [FreshRetailNet-50K](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K) (real hourly fresh-retail sales, 898 stores, 865 SKUs), chosen over Rossmann and a synthetic alternative for being real, recent, and feature-rich.
- ✅ **Problem/user analysis done** — personas, feature set, and architecture are defined in this doc, the Architecture Plan, and the SRS.
- ✅ **Team scaled to 4 members**, with a defined task split (Data & Pipeline / Backend & API / Modeling / Frontend Integration) — see `CONTRIBUTING.md`.
- ✅ **Professor feedback incorporated** — the "best model only" result view is now a first-class part of the API contract (`best_model` vs `all_models`), not an afterthought.
- ❌ **No models actually trained or integrated yet.**
- ❌ **Backend not yet scaffolded** — the structure is designed (see Architecture Plan) but no code exists yet.

In short: planning and design are essentially done — dataset, architecture, requirements, and team roles are all locked. What's left is real implementation: data ingestion, model training, backend wiring, and connecting the frontend to real data.

## 7. Roadmap

**Phase 0 — Define scope & get real data** ✅ *Done*
- Dataset: FreshRetailNet-50K (real hourly retail sales)
- Scope: store-product level, hourly granularity, following the reference paper's methodology
- User stories and personas: captured in Section 2 of this doc

**Phase 1 — Backend & data pipeline foundations**
- Set up MongoDB schema for raw sales data, forecasts, and metrics
- Build FastAPI endpoints: data ingestion, data retrieval, forecast request
- Build the preprocessing pipeline: cleaning, handling missing values/outliers, feature engineering (day-of-week, holidays, lag features)

**Phase 2 — Model development (build up in order of complexity)**
- Start with **SARIMA** as the baseline — fastest to get working end-to-end
- Add **Prophet** — compare against SARIMA on the same holdout data
- Add **LSTM** once there's a working evaluation harness — this one needs the most data and tuning

**Phase 3 — Evaluation & model-selection layer**
- Implement backtesting (train/test split over time, not random split)
- Compute MAPE/RMSE per model per SKU
- Build the "best model" selection logic (or ensembling if you want to go further)

**Phase 4 — Connect backend to real logic**
- Wire the forecasting engine into the FastAPI endpoints (sync first; move to background jobs/queue if forecasts take too long)
- Store forecast results + metrics in MongoDB

**Phase 5 — Replace dummy frontend data with the real backend**
- Swap mock data calls for real API calls
- Build the model-comparison view and KPI dashboard against real forecast output

**Phase 6 — Polish & test**
- Handle edge cases: new products with no history, sparse/intermittent demand SKUs
- Add report export, accuracy tracking over time
- Basic usability testing with the personas from Phase 0

**Phase 7 — Deploy & document**
- Deploy backend + frontend (even a simple cloud deployment for demo purposes)
- Write up the README, architecture doc, and results (model accuracy comparisons make for strong internship/hackathon talking points)

---

**Suggested immediate next step**: Phase 1 — Member 1 starts data ingestion against FreshRetailNet-50K while Members 2 and 4 scaffold the backend and rework the frontend against a mocked API contract in parallel. See `CONTRIBUTING.md` for the full per-member breakdown.
