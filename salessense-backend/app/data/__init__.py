"""
SalesSense Data Module
Handles dataset ingestion, cleaning, feature engineering, and temporal splitting.
"""

from .preprocessing import preprocess_series, clean_sales_dataframe
from .splitter import chronological_split
from .loader import load_series_data, get_available_series

__all__ = [
    "preprocess_series",
    "clean_sales_dataframe",
    "chronological_split",
    "load_series_data",
    "get_available_series",
]
