# SalesSense — Data Dictionary & Attribute Specifications

**Dataset Standard:** FreshRetailNet-50K Annotated Retail Series  
**Storage Layers:** Staging (`raw_sales`), Data Warehouse (`dw_fact_daily_sales`, `dw_dim_*`), and CSV Cache  
**Date:** October 2026

---

## 1. Primary Operational & Analytical Attributes

| Field Name | Data Type | Physical Units | Granularity | Null / Missing Convention | Description & Business Semantics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `timestamp` | String / DateTime | ISO-8601 UTC | Hourly | Disallowed (Primary temporal key) | Timestamp of the sales observation (`YYYY-MM-DDTHH:MM:SS`). |
| `dt` | String | `YYYY-MM-DD` | Daily | Derived from `timestamp` | Calendar date of retail transaction. |
| `store_id` | String | Identifier | Store | Imputed to `'STORE_01'` if absent | Unique retail facility code (e.g., `STORE_01`, `STORE_02`). |
| `city_id` | String | Identifier | City | Mapped via store registry | Municipal market region (e.g., `CITY_NORTH`, `CITY_SOUTH`). |
| `product_id` | String | Identifier | SKU | Disallowed | Stock Keeping Unit identifier (e.g., `SKU-ORG-01`). |
| `category` | String | Nominal Name | Category | Default `'Produce'` | Commercial category name (Produce, Bakery, Beverages, etc.). |
| `management_group_id`| Integer | Numeric Code | Division | Default `1` | High-level merchandising department ID. |
| `first_category_id` | Integer | Numeric Code | Tier 1 | Default `101` | First-level retail taxonomy category identifier. |
| `second_category_id`| Integer | Numeric Code | Tier 2 | Default `1101` | Second-level retail taxonomy subcategory identifier. |
| `third_category_id` | Integer | Numeric Code | Tier 3 | Default `11001` | Third-level item class identifier. |
| `sale_amount` | Float / Int | Unit count | Hourly / Daily | Zero-imputed (DR-5) | Number of units sold during the observation window ($Y_t$). |
| `unit_price` | Float | Currency ($ USD) | SKU-level | Default baseline price | Retail price per unit before discounts. |
| `discount` | Float | Ratio $[0.0, 1.0]$ | Event | Default `0.0` | Promotional discount percentage off standard unit price. |
| `holiday_flag` | Integer | Binary $\{0, 1\}$ | Daily | Default `0` | `1` if observation occurred on a public/retail holiday. |
| `activity_flag` | Integer | Binary $\{0, 1\}$ | Daily | Default `0` | `1` if observation was subject to a marketing promotion. |
| `stock_hour6_22_cnt`| Integer | Hours $[0, 16]$ | Daily | Default `16` (in-stock) | Number of hours between 06:00 and 22:00 product was available. |
| `hours_stock_status`| String | Binary string | Hourly | Default `'1'` (in-stock) | Hourly availability indicators (`1` = in stock, `0` = stockout). |
| `is_stockout_affected`| Boolean | True / False | Daily | Derived (`stock_cnt < 16`) | Flags whether observed sales were censored by lack of inventory. |
| `estimated_latent_demand`| Float | Unit count | Daily / Hourly | Computed by recovery service | Reconstructed true customer demand ($\hat{D}_t$). |
| `lost_sales_estimate`| Float | Unit count | Daily / Hourly | Computed by recovery service | Estimated lost units due to stockout ($\hat{D}_t - Y_t$). |
| `recovery_confidence`| Float | Score $[0.0, 1.0]$ | Observation | Computed | Mathematical confidence in the demand recovery estimate. |
| `precpt` | Float | Millimeters (mm) | Hourly / Daily | Default `0.0` | Precipitation volume recorded. |
| `avg_temperature` | Float | Celsius (°C) | Hourly / Daily | Default `20.0` | Ambient temperature reading. |
| `avg_humidity` | Float | Percentage (%) | Hourly / Daily | Default `65.0` | Relative humidity index. |
| `avg_wind_level` | Float | Beaufort scale | Hourly / Daily | Default `2.0` | Wind speed rating. |

---

## 2. Ingestion Provenance & System Metadata

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `job_id` | UUID | Unique identifier of the ingestion run. |
| `source_name` | String | Source file path, remote repo ID, or `'synthetic_fixture'`. |
| `data_sha256` | Hex Hash | SHA-256 cryptographic digest of ingested data. |
| `ingested_at` | ISO-8601 UTC | Timestamp when records were validated and written to warehouse. |
| `duplicates_removed` | Integer | Count of detected duplicate records purged during ETL. |

---

*End of Data Dictionary.*
