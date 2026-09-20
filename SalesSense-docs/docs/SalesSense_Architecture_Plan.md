# SalesSense — Architecture & Forward Plan

## 1. Frontend Audit — What You Actually Have

Went through the repo (`salessense-frontend_2.zip` / `Omsri456/SalesSense` — only the frontend zips are in the repo, no backend work from your teammate yet). Here's the honest picture:

**What's solid:**
- React 19 + Vite + Tailwind 4, clean routing (`react-router-dom`), `recharts` for charts, `papaparse` already wired up for CSV parsing — good choices, nothing to rip out.
- Pages already built: Landing, Login/Register/Forgot Password, Dashboard, Dataset Upload, Models, Forecast, Inventory, Reports. That's a genuinely complete shell — more than "just a frontend," it's a full IA (information architecture) for the product.
- The Dashboard already has the right bones: KPI cards, sales trend, a forecast graph, recent activity, alerts.

**What's dummy and needs to become real:**
- Every page pulls from `src/data/*.js` — hand-written generators using a seeded random function. Nothing calls an API.
- `Models.jsx` simulates "training" with a `setInterval` progress bar and fake accuracy jitter — there's no real model behind it.
- Four "models" are shown (LSTM, SARIMA, Prophet, **and XGBoost**) — XGBoost was never part of your plan or the reference paper. Worth dropping it so the story stays clean: 3 models, matching the paper.

**The professor's note — this is the important one:**
Right now, `Models.jsx` and `ModelComparisonChart.jsx` show all models side-by-side as the *main* result (a bar chart of all 4 accuracies, all cards equally weighted). That's why it read as "here are 3 results, pick one yourself" instead of "here's the answer." The fix isn't cosmetic — it changes what the API returns and what the default view shows:

- **Primary result** (Dashboard, Forecast page default view): show **only the recommended/best model** for that product — its forecast chart, its accuracy, a one-line reason ("LSTM selected — lowest wMAPE for this SKU").
- **Secondary/expandable view** (a "Compare models" toggle or a details drawer): the full 3-model comparison stays available for anyone who wants to dig in — professor included — but it's not what loads by default.
- This maps cleanly onto features you already listed in the product overview: "auto-recommended best model" is the headline, "model comparison view" is the drill-down.

## 2. Backend Architecture

**Stack**: FastAPI (API layer) + MongoDB (storage) + Python ML stack (`statsmodels` for SARIMA, `prophet` for Prophet, `tensorflow`/`keras` for LSTM) — matching what you'd already planned and what the reference paper used.

```
salessense-backend/
├── app/
│   ├── main.py                      # FastAPI app entrypoint
│   ├── config.py                    # env vars, Mongo URI, settings
│   ├── api/
│   │   ├── routes_data.py           # dataset ingestion/query endpoints
│   │   ├── routes_forecast.py       # forecast request/result endpoints
│   │   └── routes_models.py         # model metadata, comparison endpoint
│   ├── db/
│   │   ├── mongo.py                 # connection + client
│   │   └── schemas.py               # Pydantic models for Mongo documents
│   ├── data/
│   │   ├── loader.py                # loads FreshRetailNet-50K (HF datasets)
│   │   ├── subset_selector.py       # picks the 5–10 store-product series to model
│   │   └── preprocessing.py         # cleaning, feature engineering, resampling
│   ├── models/
│   │   ├── base.py                  # shared interface: fit(), predict(), evaluate()
│   │   ├── sarima_model.py
│   │   ├── prophet_model.py
│   │   ├── lstm_model.py
│   │   └── registry.py              # maps model name -> class
│   ├── evaluation/
│   │   ├── metrics.py               # R², RMSE, wMAPE (same as the paper)
│   │   ├── backtest.py              # chronological hold-out split + scoring
│   │   └── selector.py              # picks the best model per series
│   └── services/
│       └── forecast_service.py      # orchestrates: load data -> run models -> evaluate -> pick best -> store
├── scripts/
│   └── ingest_dataset.py            # one-off: pull FreshRetailNet-50K subset into Mongo
├── requirements.txt
└── README.md
```

**Why this shape**: `models/` keeps each algorithm isolated behind the same interface (`fit/predict/evaluate`), so adding/removing a model later doesn't touch the API or evaluation code. `evaluation/selector.py` is where the "show only the best model" logic actually lives — it's a backend decision, not a frontend one, which is the right place for it.

## 3. Data Flow

```
FreshRetailNet-50K (Hugging Face)
        │
        ▼
scripts/ingest_dataset.py  ──► picks subset (5–10 store-product series)
        │                       cleans + engineers features
        ▼
   MongoDB (raw_sales, features collections)
        │
        ▼
forecast_service.py
        │
        ├──► sarima_model.py   ─┐
        ├──► prophet_model.py  ─┤─► each fits on chronological 80/20 split
        └──► lstm_model.py     ─┘
        │
        ▼
   evaluation/backtest.py  ──► R², RMSE, wMAPE per model
        │
        ▼
   evaluation/selector.py ──► picks best model per series
        │
        ▼
   MongoDB (forecast_results: best_model + all_model_scores)
        │
        ▼
   FastAPI response ──► Frontend (best model shown by default,
                          full comparison available on request)
```

## 4. API Contract (what the frontend should build against)

```
POST /api/forecast
  body: { store_id, product_id, horizon_hours }
  → triggers or retrieves a cached forecast

GET /api/forecast/{store_id}/{product_id}
  → {
      "best_model": {
        "name": "LSTM",
        "forecast": [...],
        "metrics": { "r2": 0.91, "rmse": 0.076, "wmape": 0.162 },
        "reason": "Lowest wMAPE and RMSE on backtest for this series"
      },
      "all_models": [
        { "name": "LSTM", "metrics": {...} },
        { "name": "SARIMA", "metrics": {...} },
        { "name": "Prophet", "metrics": {...} }
      ]
    }

GET /api/products
  → list of store-product series available (from the chosen subset)

GET /api/dataset/summary
  → basic stats on the ingested subset (for the Dataset Upload / dashboard page)
```

This directly fixes the professor's note: `best_model` is a first-class field the frontend renders by default; `all_models` exists for the comparison drawer, not the homepage.

## 5. Updated Roadmap (dataset is now finalized — this replaces Phase 0 status)

| Phase | Status | What's left |
|---|---|---|
| **0. Planning & scope** | ✅ Done | — |
| **1. Dataset** | ✅ Done | FreshRetailNet-50K selected; Member 1 still needs to pick the actual 5–10 series subset and run `ingest_dataset.py` |
| **2. Backend scaffolding** | ⏳ Next | Stand up the folder structure above, MongoDB schema, FastAPI skeleton with stub endpoints |
| **3. Model layer** | Not started | SARIMA → Prophet → LSTM, in that order (fastest to slowest to build) |
| **4. Evaluation & selection** | Not started | Backtest harness + `selector.py` — this is what makes "best model only" actually work |
| **5. Connect frontend to real API** | Not started | Swap `src/data/*.js` fake generators for real `fetch` calls to the endpoints above; rework `Models.jsx`/`Forecast.jsx` to show best-model-first |
| **6. Testing & polish** | Not started | Edge cases (low-volume SKUs, stockout hours), report export, accuracy tracking |
| **7. Deploy & document** | Not started | — |

**Immediate next 4 actions**, concretely:
1. Member 1 (Data & Pipeline): run the subset selection against FreshRetailNet-50K and land clean data in Mongo.
2. Member 2 (Backend & API): scaffold the FastAPI project structure above (even with stub/mock responses matching the API contract) so nobody else is blocked waiting on real models.
3. Member 3 (Modeling): start SARIMA against the real subset — fastest model to get an actual number out of, which unblocks testing the evaluation harness end-to-end before Prophet/LSTM are ready.
4. Member 4 (Frontend Integration): start reworking `Models.jsx`/`Forecast.jsx` against mocked responses matching the API contract — doesn't need to wait on the real backend either.
