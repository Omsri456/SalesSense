# SalesSense — Extract, Transform, Load (ETL) Pipeline Specification

**Pipeline Engine:** SalesSense Ingestion Service (`app/data/ingestion_service.py`)  
**Standard Compliance:** SRS DR-1 through DR-7, Kimball Data Warehousing Architecture  
**Date:** October 2026

---

## 1. ETL Pipeline Flowchart

```
+----------------------------------------------------------------------------------------------------+
|                                    SALESSENSE DATA INGESTION PIPELINE                              |
|                                                                                                    |
|  [Source 1: Remote Hugging Face]   [Source 2: File Upload (CSV/Parquet)]   [Source 3: Dev Fixture] |
|                 │                                     │                                  │         |
|                 └──────────────────────────────┬──────┴──────────────────────────────────┘         |
|                                                ▼                                                   |
|                             STAGE 1: EXTRACT & INTAKE VALIDATION                                   |
|                             - Verify non-empty stream / file                                       |
|                             - File format inspection (CSV / Parquet)                               |
|                             - Compute initial raw record count                                     |
|                                                │                                                   |
|                                                ▼                                                   |
|                             STAGE 2: SCHEMA NORMALIZATION & CLEANSING                              |
|                             - Map column synonyms (sales/qty -> sale_amount)                       |
|                             - ISO-8601 Timestamp parsing (timestamp, dt, hour)                     |
|                             - Location normalization (store_id, city_id)                           |
|                             - Product taxonomy mapping (management_group_id, cat1/2/3)             |
|                             - Numerical coercion & default imputation (DR-3, DR-5)                 |
|                             - Deduplication on [timestamp, store_id, product_id]                  |
|                                                │                                                   |
|                                                ▼                                                   |
|                             STAGE 3: STOCKOUT DETECTION & DEMAND RECOVERY                          |
|                             - Annotate stock_hour6_22_cnt (0-16 in-stock hours)                    |
|                             - Evaluate is_stockout_affected (stock_cnt < 16)                        |
|                             - Execute Latent Demand Recovery Service:                              |
|                               D_hat = Y_obs + (0.5*v_active + 0.5*v_comp)*H_lost                   |
|                             - Compute recovery confidence & uncertainty score                      |
|                                                │                                                   |
|                                                ▼                                                   |
|                             STAGE 4: IDEMPOTENT LOAD & PROVENANCE RECORDING                        |
|                             - Compute SHA-256 cryptographic digest of clean data                   |
|                             - Atomic upsert into MongoDB collection: 'raw_sales'                   |
|                             - Atomic write to local CSV cache: 'freshretailnet_subset.csv'         |
|                             - Generate Ingestion Job audit record in system log                    |
|                             - Invalidate and refresh dynamic statistics cache                      |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Extraction Sources & Provenance Guarantees

1. **Remote Repository Intake:** Attempts pull from Hugging Face Hub (`Dingdong-Inc/FreshRetailNet-50K`).
2. **User Upload Intake (`POST /api/dataset/upload`):** Accepts standard CSV or Parquet files from authorized ML Engineers or Administrators.
3. **Development Benchmark Fixture:** If remote access is unavailable, a high-fidelity synthetic benchmark is generated across 365 days, 2 stores, and 6 SKUs with realistic stockout censoring.

### Provenance Guarantee
SalesSense **never** silently replaces missing data while claiming it to be genuine remote data. The provenance field explicitly tags the dataset source (`upload`, `mongodb`, `csv_cache`, or `synthetic_fixture`), accompanied by an SHA-256 digest and ingestion timestamp.

---

## 3. Transformation & Data Cleansing Rules

### 3.1 Deduplication
Transactions are unique per `(timestamp, store_id, product_id)`. If multiple rows share this primary key, only the first occurrence is preserved; subsequent rows are purged and counted in `duplicates_removed`.

### 3.2 Missing Value Imputation
- `sale_amount`: Missing or non-numeric values are zero-imputed (DR-5).
- `unit_price`: Imputed to catalog baseline price.
- `discount`: Imputed to `0.0`.
- `holiday_flag` and `activity_flag`: Imputed to `0`.
- `precpt`: Imputed to `0.0` mm.
- `avg_temperature`: Imputed to `20.0` °C.
- `avg_humidity`: Imputed to `65.0` %.
- `avg_wind_level`: Imputed to `2.0`.
- `stock_hour6_22_cnt`: Imputed to `16` (fully in stock).

### 3.3 Dynamic Statistics Calculation
Rather than relying on hardcoded constants, the following metrics are dynamically queried from active observations:
- `total_rows`: Count of validated rows.
- `unique_stores`: Distinct count of `store_id`.
- `unique_products`: Distinct count of `product_id`.
- `total_store_product_series`: Group count of distinct `(store_id, product_id)` pairs.
- `date_range_start` and `date_range_end`: Minimum and maximum dates in the series.
- `stockout_affected_count`: Observations where `is_stockout_affected == True`.
- `censoring_rate_pct`: Percentage of observations affected by stockouts.

---

*End of ETL Pipeline Specification.*
