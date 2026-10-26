"""
Forecast Service
Orchestrates data ingestion, stockout censoring demand recovery,
chronological backtesting, champion model selection, and forward-horizon inference.
Caches results in memory for low-latency responses (NFR-1).
"""

import time
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from fastapi import HTTPException

from app.db.schemas import (
    ForecastResponse,
    BestModelDetails,
    ModelSummary,
    ModelMetrics,
    ChartDataPoint,
    ForecastDataPoint,
)
from app.data.loader import load_series_data
from app.data.preprocessing import preprocess_series
from app.services.censored_demand_service import censored_demand_service
from app.evaluation.backtest import run_chronological_backtest

logger = logging.getLogger("salessense.services.forecast")

_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL = 1800  # 30 minutes


class ForecastService:
    @staticmethod
    def get_forecast(
        store_id: str,
        product_id: str,
        horizon_days: int = 90,
    ) -> ForecastResponse:
        """
        Retrieves or generates forecasts using real MongoDB data and trained champion models,
        integrating stockout-aware demand recovery (Research Alignment §3).
        """
        cache_key = f"{store_id}_{product_id}_{horizon_days}"
        now = time.time()

        if cache_key in _CACHE:
            entry = _CACHE[cache_key]
            if now - entry["timestamp"] < _CACHE_TTL:
                logger.info("Serving forecast for %s from cache", cache_key)
                return entry["data"]

        # 1. Load series data from MongoDB or CSV cache
        raw_df = load_series_data(store_id=store_id if store_id != "all" else None, product_id=product_id if product_id != "all" else None)
        if raw_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No sales observations found for store '{store_id}' and product '{product_id}'",
            )

        # 2. Preprocess, zero-impute (DR-5), and engineer features (DR-3)
        featured_df = preprocess_series(raw_df, store_id=store_id, product_id=product_id)
        if featured_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient observations after preprocessing for store '{store_id}' and product '{product_id}'",
            )

        # 2b. Research Alignment: Recover latent demand from stockout-censored observations!
        featured_df = censored_demand_service.estimate_latent_demand(featured_df)
        censored_recs = int(featured_df["is_censored"].sum()) if "is_censored" in featured_df.columns else 0

        # Choose modeling target: unconstrained latent demand if stockouts exist, else observed sales
        target_col = "estimated_latent_demand" if "estimated_latent_demand" in featured_df.columns else "sale_amount"

        # 3. Chronological Backtest and Champion Selection (FR-5, FR-6, DR-7)
        backtest_window = featured_df.tail(min(len(featured_df), 1200)).reset_index(drop=True)
        backtest_res = run_chronological_backtest(backtest_window, train_ratio=0.8, target_col=target_col)

        champion_name = backtest_res["champion_name"]
        champion_metrics = backtest_res["champion_metrics"]
        champion_reason = backtest_res["champion_reason"]
        fitted_models = backtest_res["fitted_models"]
        champion_model = fitted_models.get(champion_name)

        if censored_recs > 0:
            champion_reason += f" (Trained on stockout-recovered latent demand across {censored_recs} censored periods)."

        # 4. Monthly/Weekly Aggregation for UI Presentation
        time_col = "timestamp" if "timestamp" in featured_df.columns else "dt"
        featured_df["period_m"] = pd.to_datetime(featured_df[time_col]).dt.to_period("M")
        monthly_groups = featured_df.groupby("period_m")["sale_amount"].sum()
        latent_col = "estimated_latent_demand" if "estimated_latent_demand" in featured_df.columns else "sale_amount"
        monthly_latent = featured_df.groupby("period_m")[latent_col].sum()
        has_conf = "recovery_confidence" in featured_df.columns
        has_stockout = "is_stockout_affected" in featured_df.columns
        monthly_conf = featured_df.groupby("period_m")["recovery_confidence"].mean() if has_conf else {}
        monthly_stockout = featured_df.groupby("period_m")["is_stockout_affected"].max() if has_stockout else {}
        recent_months = monthly_groups.tail(6)

        chart_points: List[ChartDataPoint] = []
        recent_list = list(recent_months.items())
        for idx, (period, total_sales) in enumerate(recent_list):
            m_label = period.strftime("%b")
            is_last = idx == len(recent_list) - 1
            latent_val = int(round(monthly_latent.get(period, total_sales)))
            lost_val = max(0, latent_val - int(total_sales))
            conf_val = round(float(monthly_conf.get(period, 1.0)), 2) if has_conf else 1.0
            stockout_flag = bool(monthly_stockout.get(period, 0) == 1) if has_stockout else False
            chart_points.append(
                ChartDataPoint(
                    month=m_label,
                    actual=int(total_sales),
                    latent_demand=latent_val,
                    lost_sales=lost_val,
                    recovery_confidence=conf_val,
                    is_stockout_affected=stockout_flag,
                    forecast=int(total_sales) if is_last else None,
                    predicted=int(total_sales) if is_last else None,
                )
            )

        baseline_sales = int(recent_months.iloc[-1]) if len(recent_months) > 0 else 1000

        # 5. Forward-horizon forecasting
        steps_hours = horizon_days * 24
        if champion_model is not None:
            infer_steps = min(steps_hours, 720)
            mean_preds, lower_b, upper_b = champion_model.predict(infer_steps)
            daily_pred_avg = max(1.0, float(np.sum(mean_preds) / (infer_steps / 24.0)))
        else:
            daily_pred_avg = float(baseline_sales / 30.0)

        # Build horizon months
        months_ahead = max(1, min(12, round(horizon_days / 30)))
        last_date = pd.to_datetime(featured_df[time_col].iloc[-1])
        future_periods = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=months_ahead * 30, freq="D")
        future_months = future_periods.to_period("M").unique()

        forecast_points: List[ForecastDataPoint] = []
        total_predicted = 0
        growth_trend = 1.0 + (0.02 if champion_metrics["r2"] > 0.5 else 0.01)

        curr_month_sales = daily_pred_avg * 30.0
        for i, p in enumerate(future_months[:months_ahead]):
            curr_month_sales *= growth_trend
            m_label = p.strftime("%b")
            predicted_val = int(round(curr_month_sales))
            band = 0.08 + i * 0.02
            low = int(predicted_val * (1.0 - band))
            high = int(predicted_val * (1.0 + band))

            total_predicted += predicted_val
            forecast_points.append(
                ForecastDataPoint(month=m_label, predicted=predicted_val, low=low, high=high)
            )
            chart_points.append(
                ChartDataPoint(month=m_label, forecast=predicted_val, predicted=predicted_val, low=low, high=high)
            )

        growth_pct = round(((curr_month_sales - baseline_sales) / max(1, baseline_sales)) * 100, 1)

        # Format Best Model Details
        best_model_details = BestModelDetails(
            id=champion_name.lower(),
            name=f"{champion_name} Model",
            type=champion_model.model_type if champion_model else "Adaptive",
            metrics=ModelMetrics(**champion_metrics),
            reason=champion_reason,
            hyperparameters=champion_model.hyperparameters if champion_model else {},
        )

        # Format All Candidate Models Summary
        all_models = [
            ModelSummary(
                id=m["model_id"],
                name=m["name"],
                type=m["type"],
                description=f"{m['name']} forecasting pipeline evaluated on chronological holdout.",
                metrics=ModelMetrics(**m["metrics"]),
                status=m["status"],
                trainedAt="Holdout Evaluation",
                hyperparameters=m.get("hyperparameters"),
            )
            for m in backtest_res["model_summaries"]
        ]

        response = ForecastResponse(
            store_id=store_id,
            product_id=product_id,
            horizon_days=horizon_days,
            confidence=round(champion_metrics["accuracy"], 1),
            growthPct=growth_pct,
            totalPredicted=total_predicted,
            best_model=best_model_details,
            all_models=all_models,
            chartData=chart_points,
            forecast=forecast_points,
            average_recovery_confidence=round(float(censoring_res.get("average_recovery_confidence", 1.0)), 2),
        )

        _CACHE[cache_key] = {"timestamp": now, "data": response}
        return response


forecast_service = ForecastService()
