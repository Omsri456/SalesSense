"""
Chronological Dataset Splitter
Complies with SRS DR-7:
- Time-ordered 80/20 train/test partitioning.
- Strictly prohibits random shuffling or temporal data leakage.
"""

from typing import Tuple, List, Optional
import pandas as pd


def chronological_split(
    df: pd.DataFrame,
    train_ratio: float = 0.80,
    timestamp_col: str = "timestamp",
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits a DataFrame chronologically into train and test sets (DR-7).

    Args:
        df: Input DataFrame containing time series data.
        train_ratio: Proportion of observations assigned to train (default 0.80).
        timestamp_col: Name of datetime column to sort by.

    Returns:
        (train_df, test_df) partitioned strictly by time.
    """
    if df.empty:
        return df.copy(), df.copy()

    # Ensure chronological order
    sorted_df = df.sort_values(timestamp_col).reset_index(drop=True)
    n = len(sorted_df)

    split_idx = int(n * train_ratio)
    if split_idx <= 0:
        split_idx = 1
    elif split_idx >= n:
        split_idx = n - 1

    train_df = sorted_df.iloc[:split_idx].copy()
    test_df = sorted_df.iloc[split_idx:].copy()

    return train_df, test_df


def chronological_train_val_test_split(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.10,
    timestamp_col: str = "timestamp",
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    3-way chronological split for deep learning models (e.g., LSTM early stopping).
    Default 70% train, 10% validation, 20% test.
    """
    if df.empty:
        return df.copy(), df.copy(), df.copy()

    sorted_df = df.sort_values(timestamp_col).reset_index(drop=True)
    n = len(sorted_df)

    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = sorted_df.iloc[:train_end].copy()
    val_df = sorted_df.iloc[train_end:val_end].copy()
    test_df = sorted_df.iloc[val_end:].copy()

    return train_df, val_df, test_df


def extract_features_and_target(
    df: pd.DataFrame,
    target_col: str = "sale_amount",
    feature_cols: Optional[List[str]] = None,
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Separates exogenous regressors / features X and target vector y.
    """
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    y = df[target_col]

    if feature_cols:
        available_cols = [c for c in feature_cols if c in df.columns]
        X = df[available_cols]
    else:
        # Exclude identifiers and target
        exclude_cols = {target_col, "timestamp", "store_id", "product_id", "category"}
        cols = [c for c in df.columns if c not in exclude_cols]
        X = df[cols]

    return X, y
