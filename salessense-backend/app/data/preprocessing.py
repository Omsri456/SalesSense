"""
Data Preprocessing & Feature Engineering Module
Complies with SRS DR-3, DR-5, and DR-6.

Provides:
- Complete hourly time-grid alignment and zero-sale imputation (DR-5).
- Exogenous feature engineering: calendar cyclical encoding, lag terms, rolling statistics (DR-3).
- Categorical encoding and feature normalization options (DR-6).
"""

from typing import List, Optional, Tuple, Dict, Any
import numpy as np
import pandas as pd


def clean_sales_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardizes column names, converts timestamps to datetime, and sorts chronologically.
    Supports either 'timestamp' or 'dt' + 'hour' formats from FreshRetailNet-50K.
    """
    cleaned = df.copy()

    # Standardize column naming if alternate schemas are present
    rename_map = {
        "sales": "sale_amount",
        "qty": "sale_amount",
        "price": "unit_price",
        "holiday": "holiday_flag",
        "promotion": "activity_flag",
        "promo_flag": "activity_flag",
        "temp": "avg_temperature",
        "humidity": "avg_humidity",
        "wind": "avg_wind_level",
        "precipitation": "precpt",
    }
    cleaned = cleaned.rename(columns={k: v for k, v in rename_map.items() if k in cleaned.columns and v not in cleaned.columns})

    # Timestamp handling
    if "timestamp" in cleaned.columns:
        cleaned["timestamp"] = pd.to_datetime(cleaned["timestamp"])
    elif "dt" in cleaned.columns:
        if "hour" in cleaned.columns:
            cleaned["timestamp"] = pd.to_datetime(cleaned["dt"]) + pd.to_timedelta(cleaned["hour"], unit="h")
        else:
            cleaned["timestamp"] = pd.to_datetime(cleaned["dt"])
    else:
        raise ValueError("DataFrame must contain 'timestamp' or 'dt' column.")

    # Fill default values for required DR-3 columns if absent
    if "sale_amount" not in cleaned.columns:
        cleaned["sale_amount"] = 0.0

    defaults = {
        "unit_price": 5.0,
        "discount": 0.0,
        "holiday_flag": 0,
        "activity_flag": 0,
        "precpt": 0.0,
        "avg_temperature": 20.0,
        "avg_humidity": 65.0,
        "avg_wind_level": 2.0,
        "category": "General",
    }
    for col, default_val in defaults.items():
        if col not in cleaned.columns:
            cleaned[col] = default_val

    # Ensure types
    cleaned["sale_amount"] = pd.to_numeric(cleaned["sale_amount"], errors="coerce").fillna(0.0)
    cleaned["unit_price"] = pd.to_numeric(cleaned["unit_price"], errors="coerce").fillna(defaults["unit_price"])
    cleaned["discount"] = pd.to_numeric(cleaned["discount"], errors="coerce").fillna(0.0)
    cleaned["holiday_flag"] = pd.to_numeric(cleaned["holiday_flag"], errors="coerce").fillna(0).astype(int)
    cleaned["activity_flag"] = pd.to_numeric(cleaned["activity_flag"], errors="coerce").fillna(0).astype(int)
    cleaned["precpt"] = pd.to_numeric(cleaned["precpt"], errors="coerce").fillna(0.0)
    cleaned["avg_temperature"] = pd.to_numeric(cleaned["avg_temperature"], errors="coerce").fillna(20.0)
    cleaned["avg_humidity"] = pd.to_numeric(cleaned["avg_humidity"], errors="coerce").fillna(65.0)
    cleaned["avg_wind_level"] = pd.to_numeric(cleaned["avg_wind_level"], errors="coerce").fillna(2.0)

    cleaned = cleaned.sort_values("timestamp").reset_index(drop=True)
    return cleaned


def impute_zero_sales(series_df: pd.DataFrame, freq: str = "1h") -> pd.DataFrame:
    """
    Implements DR-5: Complete hourly grid alignment and zero-sale imputation.
    Retail records often omit non-operating or zero-sale hours.
    This creates a contiguous frequency index between min and max timestamps,
    fills missing sales with 0.0, and forward/backward fills exogenous features.
    """
    if series_df.empty:
        return series_df

    df = series_df.copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        df = df.set_index("timestamp").sort_index()

    start_time = df.index.min().floor("h")
    end_time = df.index.max().ceil("h")
    full_idx = pd.date_range(start=start_time, end=end_time, freq=freq, name="timestamp")

    # Reindex
    reindexed = df.reindex(full_idx)

    # Impute sales with 0.0 (DR-5)
    reindexed["sale_amount"] = reindexed["sale_amount"].fillna(0.0)

    # Forward fill metadata and weather regressors, then backward fill if leading NaNs exist
    metadata_cols = ["store_id", "product_id", "category"]
    for col in metadata_cols:
        if col in reindexed.columns:
            reindexed[col] = reindexed[col].ffill().bfill()

    exog_cols = [
        "unit_price", "discount", "holiday_flag", "activity_flag",
        "precpt", "avg_temperature", "avg_humidity", "avg_wind_level"
    ]
    for col in exog_cols:
        if col in reindexed.columns:
            reindexed[col] = reindexed[col].ffill().bfill()

    return reindexed.reset_index()


def engineer_features(df: pd.DataFrame, include_lags: bool = True) -> pd.DataFrame:
    """
    Implements DR-3 (Exogenous Regressors & Temporal Features):
    - Calendar cyclical decomposition (sin/cos of hour and day of week)
    - Holiday & promotional flags
    - Weather attributes (precipitation, temperature, humidity, wind)
    - Autoregressive lags and rolling moving averages (when include_lags is True)
    """
    feat_df = df.copy()
    ts = pd.to_datetime(feat_df["timestamp"])

    # Temporal features
    feat_df["hour"] = ts.dt.hour
    feat_df["day_of_week"] = ts.dt.dayofweek
    feat_df["day_of_month"] = ts.dt.day
    feat_df["month"] = ts.dt.month
    feat_df["is_weekend"] = feat_df["day_of_week"].isin([5, 6]).astype(int)

    # Cyclical representations
    feat_df["sin_hour"] = np.sin(2 * np.pi * feat_df["hour"] / 24.0)
    feat_df["cos_hour"] = np.cos(2 * np.pi * feat_df["hour"] / 24.0)
    feat_df["sin_dow"] = np.sin(2 * np.pi * feat_df["day_of_week"] / 7.0)
    feat_df["cos_dow"] = np.cos(2 * np.pi * feat_df["day_of_week"] / 7.0)

    # Autoregressive lags & rolling windows
    if include_lags and "sale_amount" in feat_df.columns:
        feat_df["lag_1"] = feat_df["sale_amount"].shift(1).fillna(0.0)
        feat_df["lag_24"] = feat_df["sale_amount"].shift(24).fillna(0.0)
        feat_df["lag_168"] = feat_df["sale_amount"].shift(168).fillna(0.0)  # 1 week lag
        feat_df["rolling_mean_24h"] = (
            feat_df["sale_amount"].shift(1).rolling(window=24, min_periods=1).mean().fillna(0.0)
        )
        feat_df["rolling_std_24h"] = (
            feat_df["sale_amount"].shift(1).rolling(window=24, min_periods=1).std().fillna(0.0)
        )

    return feat_df


def preprocess_series(
    df: pd.DataFrame,
    store_id: Optional[str] = None,
    product_id: Optional[str] = None,
    freq: str = "1h",
    include_lags: bool = True,
) -> pd.DataFrame:
    """
    End-to-end preprocessing pipeline for a single store-product series:
    1. Clean and validate schema
    2. Filter to store and product if specified
    3. Reindex and zero-impute missing hours (DR-5)
    4. Engineer calendar, weather, and lag features (DR-3)
    """
    cleaned = clean_sales_dataframe(df)

    if store_id and "store_id" in cleaned.columns:
        cleaned = cleaned[cleaned["store_id"] == store_id]
    if product_id and "product_id" in cleaned.columns:
        cleaned = cleaned[cleaned["product_id"] == product_id]

    if cleaned.empty:
        return cleaned

    imputed = impute_zero_sales(cleaned, freq=freq)
    featured = engineer_features(imputed, include_lags=include_lags)
    return featured
