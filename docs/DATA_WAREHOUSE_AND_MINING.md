# SalesSense — Data Warehouse & Data Mining (DWM) Specification

## 1. Executive Summary & Architecture

SalesSense combines production demand forecasting with an authentic **Data Warehouse & Data Mining (DWM)** intelligence architecture inspired by the research paper:

> **FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Retail Forecasting and Inventory Management** (Wang et al., 2025; arXiv:2505.16319).

Rather than viewing retail transactions merely as sequential time-series, SalesSense structures operational data into a **Kimball Star Schema Data Warehouse** and performs high-speed **OLAP multidimensional analysis** (Rollup, Drill-Down, Slice, Dice, Pivot) and **unsupervised data mining** (Apriori Association Rule Mining, K-Means Demand Regime Clustering, and Rolling Seasonal Anomaly Detection).

---

## 2. Kimball Dimensional Star Schema Design

The dimensional model transforms clean staging records (`raw_sales`) into an analytical star schema stored in memory and indexed for fast online analytical processing:

```
                            +-------------------+
                            |      DimDate      |
                            +-------------------+
                            | PK: date_key      |
                            | full_date         |
                            | day_name, month   |
                            | quarter, year     |
                            | is_weekend        |
                            | holiday_flag      |
                            +---------+---------+
                                      |
                                      | 1:N
                                      v
+-------------------+       +-------------------------+       +---------------------+
|      DimStore     |  1:N  |      FactDailySales     |  N:1  |      DimProduct     |
+-------------------+ ----> +-------------------------+ <---- +---------------------+
| PK: store_key     |       | PK: fact_id             |       | PK: product_key     |
| store_id          |       | FK: store_key           |       | product_id          |
| store_name        |       | FK: product_key         |       | product_name        |
| city_id           |       | FK: date_key            |       | category            |
| region_name       |       | FK: stockout_key        |       | management_group_id |
| store_tier        |       | observed_sales          |       | first_category_id   |
+-------------------+       | gross_revenue           |       | second_category_id  |
                            | estimated_latent_demand |       | third_category_id   |
                            | lost_sales_estimate     |       | unit_price          |
                            | lost_revenue_estimate   |       | unit_cost           |
                            | stock_hour6_22_cnt      |       +---------------------+
                            | is_stockout_affected    |
                            | precpt, temperature     |
                            +------------+------------+
                                         |
                                         | N:1
                                         v
                            +-------------------------+
                            |       DimStockout       |
                            +-------------------------+
                            | PK: stockout_key        |
                            | stock_hour6_22_cnt      |
                            | in_stock_hours          |
                            | stockout_hours          |
                            | is_censored (bool)      |
                            | severity_label          |
                            +-------------------------+
```

### Table Specifications

| Table | Grain | Key Attributes | Additive Measures |
| :--- | :--- | :--- | :--- |
| **`FactDailySales`** | Store × Product × Day | `store_key`, `product_key`, `date_key`, `stockout_key` | `observed_sales`, `gross_revenue`, `estimated_latent_demand`, `lost_sales_estimate`, `lost_revenue_estimate` |
| **`DimStore`** | Individual Retail Store | `store_id`, `city_id`, `region_name`, `store_tier` | — |
| **`DimProduct`** | Individual SKU | `product_id`, `category`, `management_group_id`, `first/second/third_category_id`, `unit_price` | — |
| **`DimDate`** | Calendar Day | `date_key` (YYYYMMDD), `full_date`, `day_of_week`, `month`, `quarter`, `year`, `is_weekend`, `holiday_flag` | — |
| **`DimStockout`** | Operating Availability Hour Count (0–16h) | `stock_hour6_22_cnt`, `in_stock_hours`, `stockout_hours`, `severity_label` | — |

---

## 3. Multidimensional OLAP Engine

SalesSense provides dedicated endpoints for all 5 standard OLAP cube operations:

### 3.1. Rollup (`POST /api/dw/rollup`)
Aggregates transactional facts to higher-level dimensional hierarchies:
- **Product Hierarchy:** Item SKU $\to$ Category $\to$ Management Group.
- **Time Hierarchy:** Day $\to$ Month $\to$ Quarter $\to$ Year.
- **Location Hierarchy:** Store $\to$ City $\to$ Region.
- **Metrics Computed:** Total Observed Units, Gross Sales Revenue, Latent Unconstrained Demand, Stockout Lost Revenue.

### 3.2. Drill-Down (`POST /api/dw/drilldown`)
Disaggregates summarized measures down to finer grains:
- Example: Drill down from `category="Bakery"` into child SKUs (`Artisan Sourdough`, etc.).

### 3.3. Slice (`POST /api/dw/slice`)
Filters a 1-dimensional slice through the hypercube along a fixed dimension member (e.g., `store_id = "STORE_01"`), returning time-series trends and financial summaries.

### 3.4. Dice (`POST /api/dw/dice`)
Extracts a multi-dimensional sub-cube bounded by intersections across multiple dimensions simultaneously (e.g., `stores in ['STORE_01'] AND categories in ['Produce', 'Bakery'] AND date between '2024-01-01' and '2024-06-30'`).

### 3.5. Pivot / Cross-Tabulation (`POST /api/dw/pivot`)
Rotates dimensional cubes into an interactive 2D matrix:
- **Rows:** Product SKU or Category.
- **Columns:** Store ID or Month Name.
- **Values:** Observed Sales, Gross Revenue, or Lost Revenue Estimate.
- **Aggregations:** Computes row totals, column totals, and grand matrix totals.

---

## 4. Retail Data Mining Suite

SalesSense implements 3 unsupervised pattern extraction algorithms operating over warehouse facts:

### 4.1. Apriori Market Basket Association Rule Mining (`GET /api/mining/market-basket`)
- **Transaction Grain:** Daily purchasing co-occurrence per `(store_id, date_str)`.
- **Candidate Generation:** Stepwise frequent $k$-itemset mining based on parameterized minimum support.
- **Rule Formulation ($A \implies B$):**
  $$\text{Support}(A \implies B) = P(A \cap B) = \frac{\text{count}(A \cup B)}{\text{Total Baskets}}$$
  $$\text{Confidence}(A \implies B) = \frac{P(A \cap B)}{P(A)}$$
  $$\text{Lift}(A \implies B) = \frac{P(A \cap B)}{P(A) \cdot P(B)}$$
  $$\text{Conviction}(A \implies B) = \frac{1 - P(B)}{1 - \text{Confidence}(A \implies B)}$$
- **Retail Utility:** Surfaces actionable cross-merchandising rules (e.g., displaying Artisan Sourdough alongside Extra Virgin Olive Oil to maximize co-purchase lift).

### 4.2. K-Means Demand Regime Clustering (`GET /api/mining/demand-clusters`)
- **Feature Vector per Store-SKU:**
  1. Mean Daily Volume (Velocity: $\mu$)
  2. Coefficient of Variation (Volatility: $\text{CV} = \sigma / \mu$)
  3. Zero-Sales Intermittency Ratio ($P(Y_t = 0)$)
  4. Stockout Censoring Frequency ($P(\text{stock\_hours} < 16)$)
  5. Average Unit Price
- **Standardization & Clustering:** Feature normalization with `StandardScaler` followed by $k$-Means with multiple random initializations.
- **Archetype Profiling & Actionable Strategies:**
  - **Fast Mover — Smooth:** High volume, low CV $\to$ Automated high-frequency replenishment with lean safety stock.
  - **High Volume — Erratic/Volatile:** High volume, high CV $\to$ Dynamic safety buffers sensitive to promotions and weekend surges.
  - **Intermittent / Lumpy Demand:** Low volume, high zero ratio $\to$ Croston-style replenishment to prevent perishable shrinkage.
  - **Steady Standard Demand:** Moderate volume, moderate CV $\to$ Periodic review $(s, S)$ inventory control.

### 4.3. Rolling Seasonal Anomaly Detection (`GET /api/mining/anomalies`)
- **Baseline Computation:** Computes rolling 7-day mean ($\mu_{\text{rolling}}$) and standard deviation ($\sigma_{\text{rolling}}$) per store-SKU time series.
- **Z-Score Detection:** Flags observations exceeding threshold $|z| \ge 2.2$:
  $$z_t = \frac{Y_t - \mu_{\text{rolling}}}{\sigma_{\text{rolling}}}$$
- **Root-Cause Attribution:**
  - **Demand Spike ($z > 0$):** Promotional event or unmodeled holiday rush.
  - **Stockout-Induced Collapse ($z < 0$ and $\text{stock\_hour6\_22\_cnt} < 16$):** Severe inventory depletion leading to lost sales hours.
  - **Unexplained Demand Drop ($z < 0$ and in-stock):** Genuine drop in consumer demand despite full product availability.

---

## 5. Security & Store Scoping Integration

All Data Warehouse and Data Mining operations strictly enforce Role-Based Access Control (RBAC):
- **Admin & ML Engineer:** Global platform visibility across all stores.
- **Retailer:** Queries are automatically scoped to `user.assigned_stores`. Attempting to slice or dice across unauthorized stores yields `HTTP 403 Forbidden`.

---

## 6. Frontend Integration

A dedicated interactive interface is exposed at route `/dw-mining` (`DataWarehouseMining.jsx`):
1. **OLAP Tab:** Interactive hierarchy selector for Rollup, metric dropdowns, and live 2D Cross-Tabulation Pivot spreadsheet table.
2. **Market Basket Tab:** Interactive sliders for Support and Confidence, dynamic itemsets list, and sortable association rules table.
3. **Demand Regimes Tab:** Cluster count selector ($k=3, 4, 5$), cluster archetype cards with operational replenishment guidelines, and item-level cluster assignments.
4. **Anomalies Tab:** Z-Score sensitivity slider, dual-direction anomaly cards with severity indicators and root-cause diagnoses.

---

## 7. Verification & Automated Test Coverage

The full test suite validates the entire architecture:

```bash
python -m pytest tests/ -v
```

**Results:**
- `tests/test_dataset_and_censoring.py` (5 tests) — PASSED
- `tests/test_dw_and_mining.py` (10 tests) — PASSED
- `tests/test_rbac_and_scope.py` (5 tests) — PASSED
- **Total: 20 Passing Tests in 88.47s with zero failures.**
