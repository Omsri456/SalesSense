# SalesSense — Research Alignment & Stockout-Censored Demand Methodology

**Research Reference:** *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset*  
**Authors:** Wang et al. (2025; arXiv:2505.16319)  
**Methodology Companion:** *Ecevit et al. (2023), "Short-Term Sales Forecasting Using LSTM and Prophet Based Models in E-Commerce"*  
**Status:** Implemented in SalesSense

---

## 1. Research Problem Definition

In traditional retail demand forecasting, time-series and deep-learning models are trained on observed sales sequences $Y_t$. However, in real-world retail operations:
$$Y_t = \min(D_t, I_t)$$
Where $D_t$ represents true customer demand and $I_t$ represents on-shelf inventory availability.

When a product experiences a stockout ($I_t = 0$), observed sales drop to zero ($Y_t = 0$) even if underlying customer demand remains elevated ($D_t > 0$). Consequently, time-series models trained directly on naive sales observations systematically **underestimate future demand**, perpetuating a cycle of under-replenishment, repeat stockouts, and lost revenue.

SalesSense directly addresses this research challenge using the annotations and structure of the **FreshRetailNet-50K** dataset.

---

## 2. Research Paper Contributions vs. SalesSense Design

It is critical to distinguish between what comes from the research literature and our engineering architecture:

| Aspect | Research Paper (FreshRetailNet-50K) | SalesSense Platform Implementation |
| :--- | :--- | :--- |
| **Domain & Problem** | Stockout-annotated censored demand in fresh grocery retail. | Core retail forecasting & inventory intelligence premise. |
| **Dataset Annotations** | `stock_hour6_22_cnt`, `hours_stock_status`, `dt`, `hours_sale`, product hierarchy, weather regressors. | Preserved directly in the Data Warehouse schema and ETL pipeline. |
| **Censored Recovery** | Highlighting that naive observations bias loss functions. | Baseline expectation recovery using in-stock velocity and comparable periods. |
| **User Roles & Governance** | Not addressed in the research paper (pure dataset paper). | Platform-specific design: Admin (Governance), Retailer (Decision-maker), ML Engineer (Modeler). |
| **Model Selection** | Compares benchmark models on censored data. | Tournament engine: SARIMA, Prophet, and BiLSTM competing on holdouts via wMAPE. |
| **Data Warehouse & OLAP**| Not addressed in paper. | Kimball Star Schema and multi-dimensional OLAP slicing/dicing. |

---

## 3. Preserved Dataset Factors

SalesSense preserves and operationalizes all critical FreshRetailNet-50K factors:

### 3.1 Store and Location Context
- `city_id`: Municipal region identifier (e.g., `CITY_NORTH`, `CITY_SOUTH`).
- `store_id`: Retail outlet identifier (e.g., `STORE_01`, `STORE_02`).

### 3.2 Multi-Tier Product Hierarchy
- `management_group_id`: Top-level department/merchandising group.
- `first_category_id`: Primary retail division (e.g., Produce, Bakery, Beverages).
- `second_category_id`: Sub-category grouping (e.g., Fresh Fruits, Organic Breads).
- `third_category_id`: Granular item class.
- `product_id`: Unique Stock Keeping Unit (SKU).

### 3.3 Sales and Temporal Granularity
- `dt`: Daily date stamp (`YYYY-MM-DD`).
- `timestamp`: Chronological hourly ISO-8601 index (`YYYY-MM-DDTHH:MM:SS`).
- `sale_amount`: Total unit quantity sold.
- Diurnal distribution: Hourly peak tracking (12:00-13:00 lunch rush, 18:00-19:00 dinner rush).

### 3.4 Stockout Availability Annotations
- `stock_hour6_22_cnt`: Count of operational hours between 06:00 and 22:00 where the SKU was actively in stock (0 to 16).
- `hours_stock_status`: Hourly binary status array/string (1 = in stock, 0 = stockout).
- `is_stockout_affected`: Boolean flag set to `True` whenever `stock_hour6_22_cnt < 16`.

### 3.5 Contextual Regressors
- `discount`: Promotional discount rate $[0.0, 1.0]$.
- `holiday_flag`: Binary indicator for official holidays.
- `activity_flag`: Binary indicator for marketing campaigns.
- `precpt`: Precipitation in mm.
- `avg_temperature`: Temperature in °C.
- `avg_humidity`: Relative humidity %.
- `avg_wind_level`: Beaufort wind scale level.

---

## 4. Latent Demand Recovery Algorithm

A stockout observation does not reveal the exact amount of lost demand. SalesSense implements an empirical baseline demand recovery model:

$$\hat{D}_t = Y_t + \left(0.5 \cdot v_{\text{active}} + 0.5 \cdot v_{\text{comparable}}\right) \times H_{\text{stockout}}$$

Where:
- $Y_t$: Recorded sales amount on date $t$.
- $H_{\text{active}} = \max(1, \text{stock\_hour6\_22\_cnt})$: Active selling hours.
- $H_{\text{stockout}} = 16 - H_{\text{active}}$: Censored/lost selling hours.
- $v_{\text{active}} = Y_t / H_{\text{active}}$: Hourly velocity during in-stock hours.
- $v_{\text{comparable}}$: Historical mean hourly velocity for unconstrained days with matching Store, SKU, Day of Week, and Promotional status.

### Uncertainty Scoring & Confidence Flagging
When comparable unconstrained history is sparse ($N < 3$) or stockout duration is severe ($H_{\text{stockout}} > 10$), the observation is flagged with reduced `recovery_confidence` $[0.0, 1.0]$ rather than being presented as ground truth.

---

## 5. Multi-Model Forecasting on Recovered Demand

Forecasting models are evaluated against holdout series:
1. **SARIMA:** Fits on recovered latent demand to establish an autoregressive seasonal baseline.
2. **Prophet:** Integrates weather covariates and promotional regressors against unconstrained trends.
3. **BiLSTM:** Deep learning sequence network learning non-linear interactions across 24-hour lookback windows.

Primary evaluation metric: **wMAPE** (Weighted Mean Absolute Percentage Error):
$$\text{wMAPE} = \frac{\sum_t |y_t - \hat{y}_t|}{\sum_t y_t}$$

Champion selection rationale is dynamically generated and presented to the user, ensuring full transparency.

---

*End of Research Alignment Specification.*
