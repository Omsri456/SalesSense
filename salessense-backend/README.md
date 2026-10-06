# SalesSense Backend API

FastAPI backend and machine learning pipeline for SalesSense, implementing the architecture and API contract specified in the project documentation.

## Features
- **FastAPI Core**: Async endpoints for forecasting, dataset exploration, and model evaluation.
- **Automated Best Model Selector**: Computes wMAPE, RMSE, and $R^2$ on chronological holdout sets and automatically sets the champion model.
- **Benchmark Models**: SARIMA, Prophet, and LSTM sequence models conforming to `BaseForecastModel`.
- **MongoDB Integration**: Asynchronous storage via Motor with graceful disconnected mode fallback.

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
API Documentation will be available at: `http://localhost:8000/docs`

### 3. Run Ingestion Script
```bash
python scripts/ingest_dataset.py
```
