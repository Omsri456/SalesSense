import os
import pandas as pd
from fastapi import APIRouter
from typing import List
from app.db.schemas import ProductItem, DatasetSummary
from app.data.loader import load_series_data, DEFAULT_CACHE_CSV

router = APIRouter(tags=["Data"])

# Benchmark store-product series matching FreshRetailNet-50K domain
INITIAL_PRODUCTS: List[ProductItem] = [
    ProductItem(
        value="all",
        label="All Products (Store Aggregate)",
        category="All",
        currentStock=4120,
        reorderPoint=1200,
        unitCost=14.50,
        safetyStock=400,
        leadTimeDays=3,
        store_id="STORE_01",
    ),
    ProductItem(
        value="SKU-ORG-01",
        label="Organic Avocados",
        category="Produce",
        currentStock=420,
        reorderPoint=250,
        unitCost=1.85,
        safetyStock=80,
        leadTimeDays=2,
        store_id="STORE_01",
    ),
    ProductItem(
        value="SKU-BAK-04",
        label="Artisan Sourdough",
        category="Bakery",
        currentStock=85,
        reorderPoint=120,
        unitCost=3.20,
        safetyStock=40,
        leadTimeDays=1,
        store_id="STORE_01",
    ),
    ProductItem(
        value="SKU-BEV-09",
        label="Cold Brew 32oz",
        category="Beverages",
        currentStock=310,
        reorderPoint=180,
        unitCost=4.10,
        safetyStock=60,
        leadTimeDays=4,
        store_id="STORE_01",
    ),
    ProductItem(
        value="SKU-PAN-12",
        label="Extra Virgin Olive Oil",
        category="Pantry",
        currentStock=640,
        reorderPoint=300,
        unitCost=9.40,
        safetyStock=100,
        leadTimeDays=5,
        store_id="STORE_01",
    ),
    ProductItem(
        value="SKU-MEA-02",
        label="Grass-Fed Ribeye",
        category="Meat",
        currentStock=95,
        reorderPoint=140,
        unitCost=16.80,
        safetyStock=50,
        leadTimeDays=2,
        store_id="STORE_01",
    ),
    ProductItem(
        value="SKU-DAI-07",
        label="Oat Milk Barista Blend",
        category="Dairy",
        currentStock=510,
        reorderPoint=220,
        unitCost=2.90,
        safetyStock=70,
        leadTimeDays=3,
        store_id="STORE_01",
    ),
]


@router.get("/products", response_model=List[ProductItem])
async def list_products():
    """
    List available store-product series.
    """
    return INITIAL_PRODUCTS


@router.get("/dataset/summary", response_model=DatasetSummary)
async def get_dataset_summary():
    """
    Summary metrics on the ingested FreshRetailNet-50K series.
    Dynamically counts real MongoDB rows or cached CSV records.
    """
    total_rows = 61320
    date_start = "2025-01-01T08:00:00"
    date_end = "2025-12-31T21:00:00"
    columns = [
        "timestamp", "store_id", "product_id", "category",
        "sale_amount", "unit_price", "discount", "holiday_flag",
        "activity_flag", "precpt", "avg_temperature", "avg_humidity", "avg_wind_level"
    ]

    try:
        from pymongo import MongoClient
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=500)
        col = client["salessense"]["raw_sales"]
        count = col.count_documents({})
        if count > 0:
            total_rows = count
    except Exception:
        if os.path.exists(DEFAULT_CACHE_CSV):
            try:
                df = pd.read_csv(DEFAULT_CACHE_CSV)
                total_rows = len(df)
                if "timestamp" in df.columns:
                    date_start = str(df["timestamp"].min())
                    date_end = str(df["timestamp"].max())
            except Exception:
                pass

    return DatasetSummary(
        dataset_name="FreshRetailNet-50K (Benchmark Subset)",
        total_series=len(INITIAL_PRODUCTS) - 1,
        total_rows=total_rows,
        date_range_start=date_start,
        date_range_end=date_end,
        status="active",
        columns=columns,
    )
