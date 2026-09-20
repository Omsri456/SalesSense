# Contributing to SalesSense

## Team Structure (4 members)

| Area | Owner | Primary files/folders |
|---|---|---|
| Data & Pipeline | Member 1 | `backend/app/data/`, `backend/scripts/ingest_dataset.py` |
| Backend & API | Member 2 | `backend/app/api/`, `backend/app/db/`, `backend/app/evaluation/` |
| Modeling | Member 3 | `backend/app/models/` |
| Frontend Integration | Member 4 | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/data/` (being replaced with real API calls) |

Each area's owner is the default reviewer for changes in their folder — doesn't mean nobody else can touch it, just means they get pinged on the PR.

## Task Breakdown

**Member 1 — Data & Pipeline**
- Load the dataset via `datasets.load_dataset("Dingdong-Inc/FreshRetailNet-50K")`
- Pick 5–10 store-product series — prioritize decent sales volume and few stockout hours (check `hours_stock_status`)
- Clean the data (retain zero-sale hours rather than dropping them — may be genuine zero demand)
- Confirm feature set: `dt`, `sale_amount`/`hours_sale`, `discount`, `holiday_flag`, `activity_flag`, `precpt`, `avg_temperature`, `avg_humidity`, `avg_wind_level`
- Write the chronological 80/20 split as a shared, reusable function — everyone needs the *same* split for a fair comparison
- Build `ingest_dataset.py` to load the cleaned subset into MongoDB
- Write a short data dictionary for the rest of the team

**Member 2 — Backend & API**
- Scaffold FastAPI project (`main.py`, `config.py`, Mongo connection)
- Build endpoints: `/api/products`, `/api/dataset/summary`, `/api/forecast/{store_id}/{product_id}`, `POST /api/forecast`
- Build `evaluation/backtest.py` — runs each model against Member 1's split, computes R²/RMSE/wMAPE
- Build `evaluation/selector.py` — picks the best model per series by wMAPE
- Wire it together in `forecast_service.py`
- Can start immediately with FastAPI's auto-docs + mock responses matching the contract, without waiting on real models

**Member 3 — Modeling**
- `sarima_model.py` — grid search `(p,d,q)(P,D,Q,s)` by AIC, same approach as the reference paper
- `prophet_model.py` — holiday component + weather/discount as regressors, test linear vs. logistic growth
- `lstm_model.py` — Bidirectional LSTM → pooling → dense layers, 24-hour lookback window, early stopping
- All three implement the same `fit()` / `predict()` / `evaluate()` interface
- Sanity-check results against the reference paper's ballpark numbers, but report what you actually get

**Member 4 — Frontend Integration**
- Remove the stray XGBoost model from `Models.jsx` / `modelsData.js`
- Replace dummy data generators (`src/data/*.js`) with real `fetch` calls to Member 2's endpoints
- Rework `Forecast.jsx`/`Dashboard.jsx` to show the best model by default, with a "Compare models" toggle for the full 3-way view
- Can start immediately against mocked JSON matching the API contract — no need to wait for the real backend

**Dependency order**: Member 1's cleaned data is the one true bottleneck. Members 2 and 3 can scaffold against a small raw sample in the meantime; Member 4 can build the entire UI against mocked responses from day one.

## Branching

- `main` — always working/demoable. Nothing broken gets merged here.
- `feature/<area>-<short-description>` — e.g. `feature/backend-forecast-endpoint`, `feature/model-sarima-baseline`
- One feature branch per task, merged via PR — no direct pushes to `main`.

## Pull Requests

- Keep PRs scoped to one thing — a full model implementation, one endpoint, one page rework. Not "misc changes."
- PR description should say **what** changed and **why**, not just restate the diff.
- At least one other team member reviews before merge, even if it's a quick skim — the goal is that no code lands that only one person has seen.
- If a PR touches another member's owned folder (see table above), tag them specifically.

## Commit Messages

Short, present-tense, specific: `Add SARIMA backtest harness`, not `updates` or `fix stuff`.

## Definition of Done (per task)

A task isn't done when the code runs on your machine — it's done when:
1. It matches what's specified in `docs/SalesSense_SRS.md` for that feature
2. It's been reviewed by at least one teammate
3. It doesn't break anything else that was working (check `main` still runs end-to-end)

## Using AI Coding Tools

See `AI_GUIDELINES.md` before letting any AI assistant modify code in this repo — it defines what's safe to hand off and what needs a human doing it directly.
