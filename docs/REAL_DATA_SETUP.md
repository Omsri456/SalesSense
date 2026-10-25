# Real Data Setup & Ingestion Guide: FreshRetailNet-50K

This guide documents the provenance, sampling methodology, and ingestion procedures for the authentic **FreshRetailNet-50K** dataset in SalesSense, aligning with Wang et al. (2025): *"FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset"*.

---

## 1. Dataset Origin & Provenance

- **Hugging Face Hub Repository**: [`Dingdong-Inc/FreshRetailNet-50K`](https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K)
- **Primary Files**:
  - `data/train.parquet` (106 MB, ~4,500,000 rows, dates: `2024-03-28` to `2024-06-25`)
  - `data/eval.parquet` (8.44 MB, ~350,000 rows, dates: `2024-06-26` to `2024-07-02`)
- **Key Columns Preserved**:
  - **Temporal & Sales**: `dt`, `sale_amount` (daily volume), `hours_sale` (24-hour distribution)
  - **Stockout & Censoring**: `stock_hour6_22_cnt` (in-stock hours between 06:00 and 22:00, 0–16), `hours_stock_status` (hourly binary availability vector)
  - **Location & Organization**: `city_id`, `store_id`
  - **Product Taxonomy**: `management_group_id` (0–6), `first_category_id`, `second_category_id`, `third_category_id`, `product_id`
  - **Exogenous Regressors**: `discount`, `holiday_flag`, `activity_flag`, `precpt`, `avg_temperature`, `avg_humidity`, `avg_wind_level`

---

## 2. Sampling Strategy (Academic Integrity Standard)

Full FreshRetailNet-50K contains 898 stores and 865 SKUs across nearly 5 million records. For low-latency analytical queries and development responsiveness on student hardware, we employ a deterministic stratified sample:

1. **Store Selection**: Top 5 stores with complete temporal continuity across both training and evaluation windows (`STORE_01` through `STORE_05`).
2. **Product Selection**: 36 SKUs (6 representative items per management group across 6 core categories: Produce, Bakery, Dairy, Meat, Beverages, Pantry).
3. **Temporal Range**: Full 97-day continuous historical horizon (`2024-03-28` to `2024-07-02`).
4. **Reproducibility**: Random seed fixed to `42`.

---

## 3. Ingestion Instructions

### Automatic / Direct Download Mode

Ensure `huggingface_hub` and `pyarrow` are installed:

```bash
pip install -r salessense-backend/requirements.txt
```

Run the ingestion script in authentic mode:

```bash
cd salessense-backend
python scripts/ingest_dataset.py --mode authentic
```

The script:
1. Downloads the Parquet partitions from Hugging Face Hub into local cache (`~/.cache/huggingface/hub/`).
2. Applies the stratified sampling procedure.
3. Maps surrogate and natural IDs.
4. Generates `salessense-backend/data_cache/freshretailnet_subset.csv`.
5. Updates `salessense-backend/data_cache/dataset_provenance.json` with SHA-256 integrity metadata.

### High-Fidelity Synthetic Benchmark Fallback

If Hugging Face is blocked by a network proxy, firewall, or rate limits:

```bash
cd salessense-backend
python scripts/ingest_dataset.py --mode synthetic --days 365
```

The synthetic generator adheres strictly to the mathematical properties of Wang et al. (2025):
- Preserves identical schema and censoring flags (`stock_hour6_22_cnt`, `hours_stock_status`).
- Simulates realistic 9–12% stockout incidence.
- Records explicit `synthetic_benchmark` status in `dataset_provenance.json` to uphold academic integrity.

---

## 4. Rebuilding the Dimensional Data Warehouse (OLAP)

After updating the dataset, rebuild the Kimball Star Schema:

```bash
cd salessense-backend
python -c "from app.dw.dimensional_model import dw_engine; dw_engine.build_warehouse(force_rebuild=True)"
```
