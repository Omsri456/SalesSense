"""
Censored Demand Recovery Service
Aligns with research paper:
Wang et al. (2025). "FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset."

Mathematical Principles:
Observed sales Y_t = min(D_t, I_t).
When stockout occurs (I_t = 0), sales drop to zero regardless of true demand D_t.
This service provides:
1. Stockout detection via stock_hour6_22_cnt and hours_stock_status.
2. Latent unconstrained demand estimation using active-period velocity
   and comparable non-stockout historical periods.
3. Explicit uncertainty and confidence scoring rather than inventing ground truth.
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
import numpy as np
import pandas as pd

logger = logging.getLogger("salessense.censored_demand")


class CensoredDemandService:
    @staticmethod
    def annotate_stockout_status(df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensures DataFrame contains standardized stockout annotation columns:
        - stock_hour6_22_cnt: hours in stock between 06:00 and 22:00 (0-16).
        - is_stockout_affected: boolean flag indicating censored observation.
        - stockout_hours: count of lost selling hours.
        """
        annotated = df.copy()

        if "stock_hour6_22_cnt" not in annotated.columns:
            # If not explicitly present in legacy format, infer from hourly sales activity or default to in-stock
            annotated["stock_hour6_22_cnt"] = 16
            annotated["is_stockout_affected"] = False
            annotated["stockout_hours"] = 0
            annotated["hours_stock_status"] = "1" * 16
        else:
            annotated["stock_hour6_22_cnt"] = pd.to_numeric(annotated["stock_hour6_22_cnt"], errors="coerce").fillna(16).astype(int)
            annotated["stock_hour6_22_cnt"] = annotated["stock_hour6_22_cnt"].clip(0, 16)
            annotated["is_stockout_affected"] = annotated["stock_hour6_22_cnt"] < 16
            annotated["stockout_hours"] = 16 - annotated["stock_hour6_22_cnt"]

        return annotated

    @staticmethod
    def estimate_latent_demand(series_df: pd.DataFrame) -> pd.DataFrame:
        """
        Reconstructs estimated unconstrained latent customer demand from censored sales.
        
        Outputs columns:
        - observed_sales: recorded sales Y
        - is_censored: boolean flag
        - estimated_latent_demand: estimated true demand D_hat
        - lost_sales_estimate: D_hat - Y
        - recovery_confidence: [0.0 to 1.0] confidence score
        - censoring_notes: explanation of estimation mechanism
        """
        df = CensoredDemandService.annotate_stockout_status(series_df)

        if "sale_amount" not in df.columns:
            df["sale_amount"] = 0.0

        df["observed_sales"] = df["sale_amount"].astype(float)
        df["is_censored"] = df["is_stockout_affected"]

        # Timestamp & Day of Week for comparable period alignment
        time_col = "timestamp" if "timestamp" in df.columns else ("dt" if "dt" in df.columns else None)
        if time_col:
            dt_series = pd.to_datetime(df[time_col])
            df["day_of_week"] = dt_series.dt.dayofweek
        else:
            df["day_of_week"] = 0

        # Calculate baseline non-stockout velocity per (store, product, day_of_week)
        in_stock_mask = ~df["is_censored"]
        in_stock_df = df[in_stock_mask]

        # Group by store, product, day_of_week
        group_cols = [c for c in ["store_id", "product_id", "day_of_week"] if c in df.columns]
        if group_cols and not in_stock_df.empty:
            comp_benchmarks = in_stock_df.groupby(group_cols)["observed_sales"].agg(["mean", "std", "count"]).reset_index()
            comp_benchmarks.rename(columns={"mean": "bench_mean", "std": "bench_std", "count": "bench_count"}, inplace=True)
            df = df.merge(comp_benchmarks, on=group_cols, how="left")
        else:
            df["bench_mean"] = df["observed_sales"].mean()
            df["bench_std"] = df["observed_sales"].std()
            df["bench_count"] = len(df)

        df["bench_mean"] = df["bench_mean"].fillna(df["observed_sales"].mean())
        df["bench_std"] = df["bench_std"].fillna(1.0)
        df["bench_count"] = df["bench_count"].fillna(1)

        # Apply demand recovery formula (vectorized for instant execution)
        in_stock_hours = np.clip(df["stock_hour6_22_cnt"].fillna(16).astype(int).values, 1, 16)
        lost_hours = 16 - in_stock_hours
        censored = df["is_censored"].fillna(False).values & (lost_hours > 0)
        obs = df["observed_sales"].fillna(0.0).astype(float).values
        bench_mean = np.maximum(0.1, df["bench_mean"].fillna(df["observed_sales"]).astype(float).values)
        bench_count = df["bench_count"].fillna(1).astype(int).values

        active_velocity = obs / in_stock_hours.astype(float)
        bench_hourly_velocity = bench_mean / 16.0
        blended_velocity = 0.5 * active_velocity + 0.5 * bench_hourly_velocity
        raw_additional_lost = np.where(censored, np.round(blended_velocity * lost_hours, 2), 0.0)
        raw_reconstructed = np.where(censored, np.round(obs + raw_additional_lost, 2), obs)

        # Grounding & Capping (Wang et al., 2025 FreshRetailNet-50K §3)
        # Latent customer demand cannot blow up beyond reasonable upper bound of in-stock baseline.
        # Bounded to at most 1.4x of observed sales or 1.35x of comparable in-stock baseline.
        upper_bound = np.maximum(obs * 1.4, bench_mean * 1.35)
        reconstructed = np.clip(raw_reconstructed, obs, upper_bound)
        additional_lost = np.maximum(0.0, reconstructed - obs)

        sample_penalty = np.minimum(1.0, bench_count / 5.0)
        duration_penalty = np.maximum(0.2, (16 - lost_hours) / 16.0)
        conf = np.where(censored, np.round(sample_penalty * duration_penalty, 2), 1.0)

        df["estimated_latent_demand"] = reconstructed
        df["lost_sales_estimate"] = additional_lost
        df["recovery_confidence"] = conf
        df["censoring_notes"] = np.where(
            censored,
            "Censored observation reconstructed via in-stock rate and comparable baseline.",
            "In-stock all operational hours; observed sales equals latent demand."
        )

        # Cleanup merge columns
        drop_cols = [c for c in ["bench_mean", "bench_std", "bench_count"] if c in df.columns]
        df.drop(columns=drop_cols, inplace=True, errors="ignore")

        return df

    @staticmethod
    def get_censoring_summary(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Returns dynamic summary statistics of stockout and censoring severity across the series.
        """
        annotated = CensoredDemandService.estimate_latent_demand(df)
        total_obs = len(annotated)
        if total_obs == 0:
            return {
                "total_records": 0,
                "stockout_affected_records": 0,
                "censoring_rate_pct": 0.0,
                "total_observed_sales": 0.0,
                "total_estimated_demand": 0.0,
                "total_lost_sales_estimate": 0.0,
                "average_recovery_confidence": 1.0,
            }

        censored_count = int(annotated["is_censored"].sum())
        obs_sales = float(annotated["observed_sales"].sum())
        est_demand = float(annotated["estimated_latent_demand"].sum())
        lost_sales = float(annotated["lost_sales_estimate"].sum())
        avg_conf = float(annotated["recovery_confidence"].mean())

        return {
            "total_records": total_obs,
            "stockout_affected_records": censored_count,
            "censoring_rate_pct": round((censored_count / total_obs) * 100.0, 2),
            "total_observed_sales": round(obs_sales, 1),
            "total_estimated_demand": round(est_demand, 1),
            "total_lost_sales_estimate": round(lost_sales, 1),
            "average_recovery_confidence": round(avg_conf, 2),
        }


censored_demand_service = CensoredDemandService()
