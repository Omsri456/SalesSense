"""
Data Loading & Caching Module
Provides transparent access to FreshRetailNet-50K records from MongoDB or local CSV cache.
"""

import os
import logging
from typing import List, Dict, Any, Optional
import pandas as pd

logger = logging.getLogger("salessense.data.loader")

DATA_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data_cache")
DEFAULT_CACHE_CSV = os.path.join(DATA_CACHE_DIR, "freshretailnet_subset.csv")


def get_default_cache_path() -> str:
    os.makedirs(DATA_CACHE_DIR, exist_ok=True)
    return DEFAULT_CACHE_CSV


def load_series_data(
    store_id: Optional[str] = None,
    product_id: Optional[str] = None,
) -> pd.DataFrame:
    """
    Loads raw sales observations from MongoDB or falls back to local CSV cache.
    Automatically filters by store_id and product_id if provided.
    """
    # 1. Try MongoDB first if configured
    try:
        from pymongo import MongoClient
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=1000)
        db = client["salessense"]
        col = db["raw_sales"]
        query: Dict[str, Any] = {}
        if store_id:
            query["store_id"] = store_id
        if product_id:
            query["product_id"] = product_id

        count = col.count_documents(query)
        if count > 0:
            cursor = col.find(query, {"_id": 0})
            df = pd.DataFrame(list(cursor))
            if not df.empty:
                logger.debug("Loaded %d records from MongoDB 'raw_sales'", len(df))
                return df
    except Exception as e:
        logger.debug("MongoDB query skipped or failed (%s). Falling back to CSV cache.", e)

    # 2. Try Local CSV Cache
    cache_path = get_default_cache_path()
    if os.path.exists(cache_path):
        try:
            df = pd.read_csv(cache_path)
            if store_id and "store_id" in df.columns:
                df = df[df["store_id"] == store_id]
            if product_id and "product_id" in df.columns:
                df = df[df["product_id"] == product_id]
            return df
        except Exception as e:
            logger.warning("Error reading cache CSV at %s: %s", cache_path, e)

    # 3. If cache does not exist, trigger ingestion generation
    from scripts.ingest_dataset import generate_benchmark_series
    logger.info("Local dataset cache not found. Generating benchmark FreshRetailNet-50K data...")
    df = generate_benchmark_series()
    try:
        df.to_csv(cache_path, index=False)
        logger.info("Saved generated series to %s", cache_path)
    except Exception as e:
        logger.warning("Could not persist generated series to CSV: %s", e)

    if store_id and "store_id" in df.columns:
        df = df[df["store_id"] == store_id]
    if product_id and "product_id" in df.columns:
        df = df[df["product_id"] == product_id]

    return df


def get_available_series() -> List[Dict[str, str]]:
    """
    Returns the distinct store and product series available in the system.
    """
    df = load_series_data()
    if df.empty or "store_id" not in df.columns or "product_id" not in df.columns:
        return [
            {"store_id": "STORE_01", "product_id": "SKU-ORG-01", "category": "Produce"},
            {"store_id": "STORE_01", "product_id": "SKU-BAK-04", "category": "Bakery"},
            {"store_id": "STORE_01", "product_id": "SKU-BEV-09", "category": "Beverages"},
            {"store_id": "STORE_01", "product_id": "SKU-PAN-12", "category": "Pantry"},
            {"store_id": "STORE_01", "product_id": "SKU-MEA-02", "category": "Meat"},
            {"store_id": "STORE_01", "product_id": "SKU-DAI-07", "category": "Dairy"},
        ]

    cols = ["store_id", "product_id"]
    if "category" in df.columns:
        cols.append("category")

    unique_df = df[cols].drop_duplicates()
    return unique_df.to_dict(orient="records")
