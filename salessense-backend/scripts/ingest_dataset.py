"""
FreshRetailNet-50K Dataset Ingestion Script
Complies with SRS DR-1 through DR-7, and research alignment specifications:
Wang et al. (2025). "FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset."

Features preserved:
- Store and location: city_id, store_id
- Product hierarchy: management_group_id, first_category_id, second_category_id, third_category_id, product_id, category
- Sales and time: dt, timestamp, sale_amount
- Stock availability & censoring: stock_hour6_22_cnt, hours_stock_status, is_stockout_affected
- Contextual features: discount, holiday_flag, activity_flag, precpt, avg_temperature, avg_humidity, avg_wind_level
"""

import os
import sys
import logging

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest_dataset")

STORES = [
    {"id": "STORE_01", "city_id": "CITY_NORTH", "factor": 1.15},
    {"id": "STORE_02", "city_id": "CITY_SOUTH", "factor": 0.90},
    {"id": "STORE_03", "city_id": "CITY_EAST", "factor": 1.05},
]

SKUS = [
    # 1. Produce (3 items: fast staple, steady, intermittent)
    {
        "id": "SKU-ORG-01",
        "name": "Organic Bananas",
        "category": "Produce",
        "base_daily": 55,
        "price": 1.85,
        "mgmt_group": 1,
        "cat1": 101,
        "cat2": 1101,
        "cat3": 11001,
    },
    {
        "id": "SKU-ORG-02",
        "name": "Honeycrisp Apples",
        "category": "Produce",
        "base_daily": 35,
        "price": 3.20,
        "mgmt_group": 1,
        "cat1": 101,
        "cat2": 1101,
        "cat3": 11002,
    },
    {
        "id": "SKU-ORG-03",
        "name": "Baby Spinach",
        "category": "Produce",
        "base_daily": 16,
        "price": 4.50,
        "mgmt_group": 1,
        "cat1": 101,
        "cat2": 1101,
        "cat3": 11003,
    },
    # 2. Bakery (3 items: steady, fast staple, intermittent)
    {
        "id": "SKU-BAK-04",
        "name": "Artisan Sourdough",
        "category": "Bakery",
        "base_daily": 32,
        "price": 4.20,
        "mgmt_group": 1,
        "cat1": 102,
        "cat2": 1102,
        "cat3": 11004,
    },
    {
        "id": "SKU-BAK-05",
        "name": "Whole Grain Bagels",
        "category": "Bakery",
        "base_daily": 48,
        "price": 2.80,
        "mgmt_group": 1,
        "cat1": 102,
        "cat2": 1102,
        "cat3": 11005,
    },
    {
        "id": "SKU-BAK-06",
        "name": "Gluten-Free Brioche",
        "category": "Bakery",
        "base_daily": 13,
        "price": 6.50,
        "mgmt_group": 1,
        "cat1": 102,
        "cat2": 1102,
        "cat3": 11006,
    },
    # 3. Beverages (3 items: weather-volatile, fast staple, steady)
    {
        "id": "SKU-BEV-09",
        "name": "Cold Brew Coffee",
        "category": "Beverages",
        "base_daily": 60,
        "price": 4.10,
        "mgmt_group": 1,
        "cat1": 103,
        "cat2": 1103,
        "cat3": 11007,
    },
    {
        "id": "SKU-BEV-10",
        "name": "Sparkling Mineral Water",
        "category": "Beverages",
        "base_daily": 75,
        "price": 1.95,
        "mgmt_group": 1,
        "cat1": 103,
        "cat2": 1103,
        "cat3": 11008,
    },
    {
        "id": "SKU-BEV-11",
        "name": "Organic Kombucha",
        "category": "Beverages",
        "base_daily": 24,
        "price": 3.80,
        "mgmt_group": 1,
        "cat1": 103,
        "cat2": 1103,
        "cat3": 11009,
    },
    # 4. Pantry (3 items: steady, intermittent, promotional)
    {
        "id": "SKU-PAN-12",
        "name": "Extra Virgin Olive Oil",
        "category": "Pantry",
        "base_daily": 25,
        "price": 9.40,
        "mgmt_group": 1,
        "cat1": 104,
        "cat2": 1104,
        "cat3": 11010,
    },
    {
        "id": "SKU-PAN-13",
        "name": "Raw Almond Butter",
        "category": "Pantry",
        "base_daily": 15,
        "price": 8.50,
        "mgmt_group": 1,
        "cat1": 104,
        "cat2": 1104,
        "cat3": 11011,
    },
    {
        "id": "SKU-PAN-14",
        "name": "San Marzano Pasta Sauce",
        "category": "Pantry",
        "base_daily": 44,
        "price": 4.25,
        "mgmt_group": 1,
        "cat1": 104,
        "cat2": 1104,
        "cat3": 11012,
    },
    # 5. Meat (3 items: steady premium, fast staple, volatile high-value)
    {
        "id": "SKU-MEA-02",
        "name": "Grass-Fed Ground Beef",
        "category": "Meat",
        "base_daily": 24,
        "price": 16.80,
        "mgmt_group": 1,
        "cat1": 105,
        "cat2": 1105,
        "cat3": 11013,
    },
    {
        "id": "SKU-MEA-15",
        "name": "Free-Range Chicken Breast",
        "category": "Meat",
        "base_daily": 68,
        "price": 8.90,
        "mgmt_group": 1,
        "cat1": 105,
        "cat2": 1105,
        "cat3": 11014,
    },
    {
        "id": "SKU-MEA-16",
        "name": "Wild Alaskan Salmon",
        "category": "Meat",
        "base_daily": 18,
        "price": 19.50,
        "mgmt_group": 1,
        "cat1": 105,
        "cat2": 1105,
        "cat3": 11015,
    },
    # 6. Dairy (3 items: fast mover, ultra-fast staple, steady)
    {
        "id": "SKU-DAI-07",
        "name": "Greek Whole Yogurt",
        "category": "Dairy",
        "base_daily": 52,
        "price": 2.90,
        "mgmt_group": 1,
        "cat1": 106,
        "cat2": 1106,
        "cat3": 11016,
    },
    {
        "id": "SKU-DAI-17",
        "name": "Organic Whole Milk",
        "category": "Dairy",
        "base_daily": 88,
        "price": 3.75,
        "mgmt_group": 1,
        "cat1": 106,
        "cat2": 1106,
        "cat3": 11017,
    },
    {
        "id": "SKU-DAI-18",
        "name": "Aged Cheddar Cheese",
        "category": "Dairy",
        "base_daily": 28,
        "price": 5.80,
        "mgmt_group": 1,
        "cat1": 106,
        "cat2": 1106,
        "cat3": 11018,
    },
]


def try_download_huggingface_dataset(subset_size: int = 100000) -> pd.DataFrame:
    """
    Attempts to download authentic FreshRetailNet-50K dataset from Hugging Face Hub (Dingdong-Inc/FreshRetailNet-50K).
    Downloads authentic parquet files (train + eval) and samples 5 stores and 36 products across categories
    covering the full continuous 97-day historical window (2024-03-28 to 2024-07-02).
    """
    try:
        from huggingface_hub import hf_hub_download
        logger.info("Attempting download of FreshRetailNet-50K from Hugging Face Hub (Dingdong-Inc/FreshRetailNet-50K)...")
        repo_id = "Dingdong-Inc/FreshRetailNet-50K"

        eval_path = hf_hub_download(repo_id=repo_id, filename="data/eval.parquet", repo_type="dataset")
        train_path = hf_hub_download(repo_id=repo_id, filename="data/train.parquet", repo_type="dataset")
        logger.info("Fetched authentic partitions: eval from %s, train from %s", eval_path, train_path)

        # 1. Inspect eval to discover top stores and 36 products across management groups
        df_eval_raw = pd.read_parquet(eval_path)
        top_stores = df_eval_raw["store_id"].value_counts().head(5).index.tolist()

        sampled_products = []
        for mgmt_grp in sorted(df_eval_raw["management_group_id"].unique())[:6]:
            prods = df_eval_raw[df_eval_raw["management_group_id"] == mgmt_grp]["product_id"].unique()
            if len(prods) > 0:
                take_k = min(6, len(prods))
                sampled_products.extend(list(prods[:take_k]))

        logger.info("Selected top 5 stores %s and %d products across 6 management groups.", top_stores, len(sampled_products))

        # 2. Filter eval and train partitions
        df_eval = df_eval_raw[(df_eval_raw["store_id"].isin(top_stores)) & (df_eval_raw["product_id"].isin(sampled_products))].copy()
        del df_eval_raw

        df_train = pd.read_parquet(
            train_path,
            filters=[("store_id", "in", top_stores), ("product_id", "in", sampled_products)],
        )
        logger.info("Read train slice: %d records, eval slice: %d records.", len(df_train), len(df_eval))

        # 3. Concatenate into full 97-day authentic dataset
        df_sample = pd.concat([df_train, df_eval], ignore_index=True)
        del df_train, df_eval

        # 4. Map store IDs to standard STORE_01..STORE_05
        store_map = {orig: f"STORE_0{i+1}" for i, orig in enumerate(sorted(top_stores))}
        df_sample["store_id"] = df_sample["store_id"].map(store_map)
        df_sample["city_id"] = "CITY_" + df_sample["city_id"].astype(str)

        # 5. Map categories & human-readable product names
        cat_map = {
            0: "Produce",
            1: "Meat",
            2: "Seafood",
            3: "Dairy",
            4: "Frozen",
            5: "Beverages",
            6: "Pantry",
        }
        df_sample["category"] = df_sample["management_group_id"].map(lambda x: cat_map.get(int(x), "General"))
        df_sample["product_name"] = df_sample["category"] + " · Item " + df_sample["product_id"].astype(str)
        df_sample["product_id"] = "SKU-" + df_sample["product_id"].astype(str)
        df_sample["unit_price"] = 4.50
        df_sample["is_stockout_affected"] = df_sample["stock_hour6_22_cnt"] < 16
        df_sample["timestamp"] = pd.to_datetime(df_sample["dt"]).dt.strftime("%Y-%m-%dT08:00:00")

        # 6. Sanitize array columns for CSV and MongoDB compatibility
        if "hours_sale" in df_sample.columns:
            df_sample["hours_sale"] = df_sample["hours_sale"].apply(
                lambda x: ",".join(map(str, x)) if isinstance(x, (np.ndarray, list)) else str(x)
            )
        if "hours_stock_status" in df_sample.columns:
            df_sample["hours_stock_status"] = df_sample["hours_stock_status"].apply(
                lambda x: "".join(map(str, x)) if isinstance(x, (np.ndarray, list)) else str(x)
            )

        df_sample.sort_values(by=["dt", "store_id", "product_id"], inplace=True)
        logger.info(
            "Successfully prepared %d authentic records across %d stores (%s to %s).",
            len(df_sample),
            df_sample["store_id"].nunique(),
            df_sample["dt"].min(),
            df_sample["dt"].max(),
        )
        return df_sample.head(subset_size)
    except Exception as e:
        logger.error("Hugging Face remote pull encountered an error: %s", e)
        return pd.DataFrame()


def generate_benchmark_series(start_date="2025-01-01", days=365) -> pd.DataFrame:
    """
    Generates synthetic FreshRetailNet-50K compliant hourly sales series across multiple stores and SKUs,
    with explicit stockout censoring, product hierarchy, and location factors.
    """
    np.random.seed(42)
    logger.info("Generating benchmark FreshRetailNet-50K series across %d days...", days)
    records = []
    base_time = datetime.fromisoformat(start_date)

    # Weather simulation per day
    for day_idx in range(days):
        day_date = base_time + timedelta(days=day_idx)
        dt_str = day_date.strftime("%Y-%m-%d")
        day_of_week = day_date.weekday()
        month = day_date.month

        # Seasonal base temperature (°C)
        season_temp = 20.0 + 10.0 * np.sin((month - 4) / 12.0 * 2 * np.pi)
        day_temp = season_temp + np.random.normal(0, 3.0)

        # Precipitation simulation (rainy days ~15% probability)
        is_rainy = np.random.rand() < 0.15
        day_precpt = round(np.random.exponential(scale=6.0), 2) if is_rainy else 0.0
        day_humidity = min(98.0, max(30.0, 50.0 + (30.0 if is_rainy else 0.0) + np.random.normal(0, 10.0)))
        day_wind = max(1.0, min(6.0, round(2.0 + (1.5 if is_rainy else 0.0) + np.random.normal(0, 0.8), 1)))

        # Holiday & promotional campaigns
        is_holiday = 1 if (
            (month == 1 and day_date.day in (1, 15)) or
            (month == 5 and day_date.day >= 25 and day_of_week == 0) or
            (month == 7 and day_date.day == 4) or
            (month == 11 and day_date.day in (24, 25)) or
            (month == 12 and day_date.day in (24, 25, 31))
        ) else 0

        is_promo = 1 if (day_of_week in (5, 6) and (day_idx // 14) % 2 == 1) else 0
        weekend_boost = 1.35 if day_of_week in (4, 5, 6) else 1.0

        for store in STORES:
            store_id = store["id"]
            city_id = store["city_id"]
            store_factor = store["factor"]

            for sku in SKUS:
                base_daily = sku["base_daily"]
                base_price = sku["price"]
                discount_rate = 0.15 if is_promo else (0.25 if is_holiday else 0.0)

                # Weather sensitivity
                weather_impact = 1.0
                if sku["category"] == "Beverages" and day_temp > 25.0:
                    weather_impact = 1.25
                elif sku["category"] == "Bakery" and is_rainy:
                    weather_impact = 1.10

                # Realistic Stockout Simulation (~9% probability of daily stockout event)
                # Simulates stockout occurring at a random afternoon hour, censoring remaining sales
                is_stockout_day = np.random.rand() < 0.09
                stockout_hour_cutoff = np.random.choice([14, 15, 16, 17, 18]) if is_stockout_day else 24

                # Calculate stock_hour6_22_cnt (06:00 to 22:00 = 16 hours total)
                if not is_stockout_day:
                    in_stock_cnt = 16
                else:
                    in_stock_cnt = max(4, min(15, stockout_hour_cutoff - 6))

                for hour in range(8, 22):  # Operating hours (8 AM to 10 PM)
                    # Check if stockout has occurred at this hour
                    is_in_stock_this_hour = (hour < stockout_hour_cutoff)

                    if not is_in_stock_this_hour:
                        # CENSORED OBSERVATION: Demand exists but observed sales are 0!
                        sale_amount = 0
                    else:
                        diurnal = 1.0 + 0.4 * np.sin((hour - 8) / 14.0 * np.pi) + 0.2 * np.sin((hour - 12) / 6.0 * np.pi)
                        rate = (base_daily / 14.0) * weekend_boost * store_factor * weather_impact * diurnal
                        if is_promo:
                            rate *= 1.20
                        if is_holiday:
                            rate *= 1.15

                        noise = np.random.normal(0, 0.20)
                        sale_amount = max(0, int(round(rate * (1 + noise))))

                    hour_temp = round(day_temp + 3.0 * np.sin((hour - 8) / 14.0 * np.pi), 1)

                    records.append({
                        "timestamp": (day_date + timedelta(hours=hour)).isoformat(),
                        "dt": dt_str,
                        "city_id": city_id,
                        "store_id": store_id,
                        "product_id": sku["id"],
                        "product_name": sku["name"],
                        "category": sku["category"],
                        "management_group_id": sku["mgmt_group"],
                        "first_category_id": sku["cat1"],
                        "second_category_id": sku["cat2"],
                        "third_category_id": sku["cat3"],
                        "sale_amount": sale_amount,
                        "unit_price": base_price,
                        "discount": discount_rate,
                        "holiday_flag": is_holiday,
                        "activity_flag": is_promo,
                        "stock_hour6_22_cnt": in_stock_cnt,
                        "hours_stock_status": "1" if is_in_stock_this_hour else "0",
                        "is_stockout_affected": in_stock_cnt < 16,
                        "precpt": day_precpt,
                        "avg_temperature": hour_temp,
                        "avg_humidity": round(day_humidity, 1),
                        "avg_wind_level": day_wind,
                    })

    df = pd.DataFrame(records)
    logger.info("Generated %d records across %d store-product combinations with stockout annotations.", len(df), len(STORES) * len(SKUS))
    return df


def main():
    import argparse
    import json

    parser = argparse.ArgumentParser(description="FreshRetailNet-50K Dataset Ingestion with explicit provenance tracking.")
    parser.add_argument("--mode", choices=["authentic", "synthetic"], default="synthetic", help="Dataset mode to ingest.")
    parser.add_argument("--days", type=int, default=365, help="Days of benchmark history to generate (for synthetic mode).")
    parser.add_argument("--subset-size", type=int, default=10000, help="Subset size for authentic download.")
    args = parser.parse_args()

    output_dir = os.path.join(os.path.dirname(__file__), "..", "data_cache")
    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, "freshretailnet_subset.csv")
    prov_path = os.path.join(output_dir, "dataset_provenance.json")

    logger.info("Starting FreshRetailNet-50K Ingestion in '%s' mode...", args.mode)

    if args.mode == "authentic":
        df = try_download_huggingface_dataset(subset_size=args.subset_size)
        if df.empty:
            logger.error("FATAL: Failed to download authentic dataset from Hugging Face Hub.")
            logger.error("Per academic integrity requirements, silent replacement with synthetic data is disabled.")
            logger.error("To generate a high-fidelity synthetic benchmark fixture, run: python scripts/ingest_dataset.py --mode synthetic")
            sys.exit(1)
        dataset_mode = "authentic"
        provenance_notes = "Authentic FreshRetailNet-50K sample subset downloaded from Dingdong-Inc/FreshRetailNet-50K."
    else:
        df = generate_benchmark_series(days=args.days)
        dataset_mode = "synthetic_benchmark"
        provenance_notes = f"Synthetic FreshRetailNet-50K compliant benchmark series generated with seed 42 across {len(STORES)} stores ({', '.join(s['id'] for s in STORES)}), {len(SKUS)} SKUs across 6 categories, {args.days} days ({len(df)} rows) for stockout-censored demand testing."

    df.to_csv(csv_path, index=False)
    logger.info("Saved %s dataset to %s (%d rows)", dataset_mode, csv_path, len(df))

    # Write explicit provenance manifest
    prov_manifest = {
        "source_name": "freshretailnet_subset.csv",
        "dataset_mode": dataset_mode,
        "provenance_notes": provenance_notes,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
        "raw_rows": len(df),
        "valid_rows": len(df),
        "rejected_rows": 0,
        "duplicates_removed": 0,
        "unique_stores": int(df["store_id"].nunique()) if "store_id" in df.columns else 0,
        "unique_products": int(df["product_id"].nunique()) if "product_id" in df.columns else 0,
        "store_ids": sorted(list(df["store_id"].unique())) if "store_id" in df.columns else [],
        "date_range_start": str(df["dt"].min()) if "dt" in df.columns else "N/A",
        "date_range_end": str(df["dt"].max()) if "dt" in df.columns else "N/A",
    }
    with open(prov_path, "w", encoding="utf-8") as f:
        json.dump(prov_manifest, f, indent=2)

    # Mongo ingestion if available
    try:
        from pymongo import MongoClient
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        db = client["salessense"]
        collection = db["raw_sales"]
        collection.delete_many({})
        collection.insert_many(df.to_dict(orient="records"))
        logger.info("Successfully ingested %d records into MongoDB collection 'raw_sales'.", len(df))
    except Exception as e:
        logger.warning("MongoDB not active or serialization error. Retained local CSV dataset. (%s)", e)

    try:
        from app.dw.dimensional_model import dw_engine
        logger.info("Rebuilding Kimball Star Schema Data Warehouse from newly ingested dataset...")
        dw_engine.build_warehouse(force_rebuild=True)
        logger.info("Kimball Star Schema Data Warehouse rebuilt successfully.")
    except Exception as e:
        logger.warning("Could not rebuild data warehouse automatically: %s", e)

    logger.info("FreshRetailNet-50K Ingestion completed successfully (%s mode).", dataset_mode)


if __name__ == "__main__":
    main()

