# SalesSense

AI-powered retail demand forecasting platform. Users select a store and product, and SalesSense forecasts demand using three time-series models (SARIMA, Prophet, LSTM), automatically surfacing whichever performed best on that product — with the full comparison available on request.

Based on the methodology of Ecevit et al. (2023), *"Short-Term Sales Forecasting Using LSTM and Prophet Based Models in E-Commerce."*

## Status

- ✅ Frontend shell built (React) — currently on mock data, being connected to the real API
- ✅ Dataset finalized: [FreshRetailNet-50K](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K)
- ⏳ Backend, model layer, and real data integration in progress

See `docs/SalesSense_Architecture_Plan.md` for the full system design and `docs/SalesSense_SRS.md` for requirements.

## Stack

- **Frontend**: React 19, Vite, Tailwind 4, recharts, react-router-dom
- **Backend**: FastAPI
- **Database**: MongoDB
- **Models**: `statsmodels` (SARIMA), `prophet`, `tensorflow`/`keras` (LSTM)

## Team & Ownership

| Area | Owner | Scope |
|---|---|---|
| Data & Pipeline | Member 1 | Dataset subset selection, cleaning, MongoDB ingestion |
| Backend & API | Member 2 | FastAPI, evaluation/backtest harness, best-model selection logic |
| Modeling | Member 3 | SARIMA, Prophet, LSTM implementations |
| Frontend Integration | Member 4 | Connecting real API, best-model-first UI rework |

## Getting Started

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (once scaffolded)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Repo Docs

- `docs/SalesSense_Architecture_Plan.md` — backend structure, data flow, API contract
- `docs/SalesSense_SRS.md` — formal requirements specification
- `CONTRIBUTING.md` — team workflow and task ownership
- `AI_GUIDELINES.md` — what AI coding assistants may and may not touch in this repo
