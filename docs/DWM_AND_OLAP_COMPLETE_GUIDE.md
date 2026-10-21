# SalesSense — Data Warehouse, OLAP & Data Mining Complete Guide

> **Academic & Technical Reference Document**  
> **Course / Subject:** Data Warehousing and Data Mining (DWM) & Business Intelligence (BI)  
> **Repository:** SalesSense Retail Intelligence Platform  
> **Primary Dataset Foundation:** *FreshRetailNet-50K: A Stockout-Annotated Censored Demand Dataset for Retail Forecasting and Inventory Management* (Wang et al., 2025; arXiv:2505.16319).

---

## Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Data Warehouse (DW) Dimensional Design (Kimball Star Schema)](#2-data-warehouse-dw-dimensional-design-kimball-star-schema)
3. [The ETL Pipeline (Extract, Transform, Load)](#3-the-etl-pipeline-extract-transform-load)
4. [Multidimensional OLAP Cube & Analytical Operations](#4-multidimensional-olap-cube--analytical-operations)
   - [4.1 Roll-Up (Generalization)](#41-roll-up-generalization)
   - [4.2 Drill-Down (Specialization)](#42-drill-down-specialization)
   - [4.3 Slice (1D Filtration)](#43-slice-1d-filtration)
   - [4.4 Dice (Multi-Dimensional Sub-Cube Extraction)](#44-dice-multi-dimensional-sub-cube-extraction)
   - [4.5 Pivot (Matrix Rotation & Cross-Tabulation)](#45-pivot-matrix-rotation--cross-tabulation)
5. [Retail Data Mining Suite (4 Core Algorithms)](#5-retail-data-mining-suite-4-core-algorithms)
   - [5.1 K-Means Demand Regime Clustering](#51-k-means-demand-regime-clustering)
   - [5.2 Demand Co-Movement Correlation Matrix](#52-demand-co-movement-correlation-matrix)
   - [5.3 Rolling Seasonal Anomaly Detection with Stockout Attribution](#53-rolling-seasonal-anomaly-detection-with-stockout-attribution)
   - [5.4 Market Basket Analysis (Apriori Association Mining)](#54-market-basket-analysis-apriori-association-mining)
6. [Frontend DWM Console Architecture (`/dw-mining`)](#6-frontend-dwm-console-architecture-dw-mining)
7. [Professor / Viva Presentation Q&A Cheat Sheet](#7-professor--viva-presentation-qa-cheat-sheet)

---

## 1. Executive Summary & System Architecture

Modern retail inventory decision-making fails when operational systems only record **observed point-of-sale (POS) receipts**. If a product runs out of stock at 2:00 PM, recorded sales drop to zero for the rest of the day—not because customer demand vanished, but because the shelf was bare. In econometrics and data mining, this is known as **right-censored demand**.

The SalesSense platform bridges **Data Warehousing & Data Mining (DWM)** with supply-chain forecasting:
1. **Warehouse Staging & Transformation:** Raw POS logs and shelf availability hours (0–16 operating hours) are cleansed and transformed into a Kimball Star Schema.
2. **Latent Demand Imputation:** Lost sales and true customer demand are estimated using censored demand reconstruction (Tobit / Kaplan-Meier estimation).
3. **Multidimensional OLAP Engine:** Provides real-time slice-and-dice, rollups, drill-downs, and pivot analysis over millions of aggregated fact points.
4. **Data Mining Suite:** Unsupervised machine learning models (K-Means, Pearson Co-Movement, Rolling Z-Score Anomalies, and Apriori Association Rules) discover hidden behavioral patterns, demand regimes, and cross-merchandising opportunities.

### End-to-End System Pipeline

```
+---------------------------------------------------------------------------------+
|                               1. DATA EXTRACTION                                |
|   Raw POS Receipts + In-Stock Sensor Hours (08:00 - 22:00, 16 operating hours) |
|   Dataset: 18 SKUs x 3 Retail Stores x 365 Days = 19,710 Fact Observations      |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|                               2. TRANSFORMATION                                 |
|   - Data Quality Cleansing & Outlier Validation                                 |
|   - Censored Demand Imputation (Latent Demand & Lost Sales Estimation)          |
|   - Dimension Surrogate Key Generation & Calendar Date Attribute Enrichment     |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|                               3. DATA WAREHOUSE                                 |
|                       Kimball Dimensional Star Schema                           |
|       Fact Table: FactDailySales (Store x Product x Day Granularity)            |
|       Dimension Tables: DimStore, DimProduct, DimDate, DimStockout              |
+---------------------------------------+-----------------------------------------+
                    |                                           |
                    v                                           v
+---------------------------------------+   +-------------------------------------+
|        4. MULTIDIMENSIONAL OLAP       |   |        5. DATA MINING SUITE         |
|  - Roll-Up (Product, Location, Time)  |   |  - K-Means Demand Clustering        |
|  - Drill-Down (Category -> SKUs)      |   |  - Synchronous Demand Co-Movement   |
|  - Slice (Single-Store Plane)         |   |  - Seasonal Anomaly Detection       |
|  - Dice (Multi-attribute Sub-cube)    |   |  - Apriori Association Rule Mining  |
|  - Pivot (2D Cross-Tabulation Matrix) |   |                                     |
+---------------------------------------+   +-------------------------------------+
                    \                                           /
                     \                                         /
                      v                                       v
+---------------------------------------------------------------------------------+
|                     6. USER INTERFACE: DWM CONSOLE (REACT)                      |
|            Warehouse Overview | ETL Pipeline | OLAP Explorer | Mining Suite     |
+---------------------------------------------------------------------------------+
```

---

## 2. Data Warehouse (DW) Dimensional Design (Kimball Star Schema)

SalesSense implements an enterprise **Kimball Dimensional Model** optimized for read-heavy Online Analytical Processing (OLAP).

```
                            +-----------------------------------+
                            |              DimDate              |
                            +-----------------------------------+
                            | PK  date_key (Integer: YYYYMMDD)  |
                            |     full_date (Date: YYYY-MM-DD)  |
                            |     day_of_week (0-6)             |
                            |     day_name (e.g. 'Saturday')    |
                            |     month (1-12)                  |
                            |     month_name (e.g. 'November')  |
                            |     quarter (Q1-Q4)               |
                            |     year (2024, 2025)             |
                            |     is_weekend (Boolean)          |
                            |     is_holiday (Boolean)          |
                            +-----------------+-----------------+
                                              |
                                              | 1:N
                                              v
+-----------------------------+     +-----------------------------------+     +-----------------------------------+
|          DimStore           |     |          FactDailySales           |     |            DimProduct             |
+-----------------------------+     +-----------------------------------+     +-----------------------------------+
| PK  store_key (Integer)     | 1:N | PK  fact_id (Integer)             | N:1 | PK  product_key (Integer)         |
|     store_id (STORE_01)     +---> | FK  store_key (Int)               | <---+     product_id (SKU-ORG-01)     |
|     store_name              |     | FK  product_key (Int)             |     |     product_name (Organic Banana) |
|     city_id                 |     | FK  date_key (Int)                |     |     category (Produce, Bakery...) |
|     region_name             |     | FK  stockout_key (Int)            |     |     management_group_id           |
|     store_tier (Tier 1/2)   |     |                                   |     |     unit_price ($)                |
+-----------------------------+     | --- ADDITIVE MEASURES ---         |     |     unit_cost ($)                 |
                                    | observed_sales (Units)            |     +-----------------------------------+
                                    | gross_revenue ($)                 |
                                    | estimated_latent_demand (Units)   |
                                    | lost_sales_estimate (Units)       |
                                    | lost_revenue_estimate ($)         |
                                    |                                   |
                                    | --- NON-ADDITIVE / CONTEXT ---    |
                                    | stock_hour6_22_cnt (0-16 hours)   |
                                    | is_stockout_affected (0 or 1)     |
                                    +-----------------+-----------------+
                                                      |
                                                      | N:1
                                                      v
                                    +-----------------------------------+
                                    |            DimStockout            |
                                    +-----------------------------------+
                                    | PK  stockout_key (0 to 16)        |
                                    |     stock_hour6_22_cnt (0-16 hrs) |
                                    |     in_stock_hours                |
                                    |     stockout_hours (16 - cnt)     |
                                    |     is_censored (cnt < 16)        |
                                    |     severity_label                |
                                    +-----------------------------------+
```

### Table Details & Measures

| Table Name | Grain | Role | Key Attributes & Measures |
| :--- | :--- | :--- | :--- |
| **`FactDailySales`** | Store $\times$ Product $\times$ Day | Central Fact Table | **Primary Key:** `fact_id`<br>**Foreign Keys:** `store_key`, `product_key`, `date_key`, `stockout_key`<br>**Additive Measures:** `observed_sales`, `gross_revenue`, `estimated_latent_demand`, `lost_sales_estimate`, `lost_revenue_estimate`<br>**Semi-Additive/Flags:** `stock_hour6_22_cnt`, `is_stockout_affected` |
| **`DimStore`** | Individual Retail Store | Conformed Dimension | `store_key`, `store_id`, `store_name`, `city_id`, `region_name`, `store_tier` |
| **`DimProduct`** | Individual SKU | Conformed Dimension | `product_key`, `product_id`, `product_name`, `category`, `management_group_id`, `unit_price`, `unit_cost` |
| **`DimDate`** | Calendar Day | Time Dimension | `date_key` (e.g., `20250222`), `full_date`, `day_of_week`, `day_name`, `month`, `month_name`, `quarter`, `year`, `is_weekend`, `is_holiday` |
| **`DimStockout`** | In-Stock Band (0–16h) | Availability Dimension | `stockout_key`, `stock_hour6_22_cnt`, `in_stock_hours`, `stockout_hours`, `is_censored`, `severity_label` |

---

## 3. The ETL Pipeline (Extract, Transform, Load)

The ETL process runs synchronously and on-demand to ingest operational files, cleanse anomalies, calculate econometric latent demand, and build indexed analytical structures:

```
[ Raw CSV/POS Staging ] ---> [ Schema Validator ] ---> [ Censored Demand Imputer ] ---> [ Star Schema Loader ]
```

1. **Extraction (E):**
   - Ingests store transactions, inventory snapshots, and hourly in-stock counts (`stock_hour6_22_cnt`).
   - Validates data types (dates, numeric sales, monetary amounts) and drops corrupted records.
2. **Transformation (T):**
   - **Econometric Imputation:** Identifies days where `stock_hour6_22_cnt < 16`. Computes `estimated_latent_demand = observed_sales / (stock_hour6_22_cnt / 16)` and calculates `lost_sales_estimate` and `lost_revenue_estimate`.
   - **Hierarchy Derivation:** Extracts month, quarter, day of week, weekend flags, and product classification categories.
   - **Surrogate Key Generation:** Generates surrogate integer primary keys (`store_key`, `product_key`, `date_key`) ensuring independence from source POS system ID modifications.
3. **Loading (L):**
   - Materializes the conformed dimension tables and populated fact table.
   - Stores an immutable audit trail in `salessense-backend/data_cache/dataset_provenance.json` tracking row counts, null values handled, execution time, and data freshness timestamps.

---

## 4. Multidimensional OLAP Cube & Analytical Operations

The warehouse organizes sales facts into an $N$-dimensional hypercube along **Product**, **Store**, and **Time** dimensions. SalesSense supports all 5 canonical OLAP operations.

```
            Time Dimension (Day -> Month -> Quarter -> Year)
                  /
                 /
                +-----------------------+
               /                       /|
              /                       / |
             +-----------------------+  |
             |                       |  |
Store Dim    |      OLAP CUBE        |  |
(Store ->    |                       |  +  Product Dimension
 Region)     |   Measures:           | /   (SKU -> Category -> Management Group)
             |   - Observed Sales    |/
             |   - Gross Revenue     |
             |   - Lost Revenue      |
             +-----------------------+
```

### 4.1 Roll-Up (Generalization)
- **Concept:** Moves up dimension hierarchies to present aggregated, generalized data (decreasing granularity, increasing summary).
- **Hierarchies in SalesSense:**
  - **Product:** SKU Item $\to$ Product Category $\to$ Management Group.
  - **Time:** Day $\to$ Month $\to$ Quarter $\to$ Year.
  - **Geography:** Store $\to$ City $\to$ Region.
- **Example:** Rolling up daily SKU sales to view total quarterly revenue by Product Category (`Produce`, `Bakery`, `Dairy`, `Meat`, `Pantry`, `Beverages`).

### 4.2 Drill-Down (Specialization)
- **Concept:** The reverse of Roll-Up. Navigates deeper into finer-grained data hierarchies to reveal underlying details.
- **Example:** Clicking on the `Bakery` category drills down into its constituent SKUs (`Artisan Sourdough`, `Brioche Buns`, `Whole Wheat Loaf`) across individual stores to pinpoint which specific product drove a sales dip.

### 4.3 Slice (1D Filtration)
- **Concept:** Cuts a 1-dimensional slice through the cube by fixing a single dimension to a specific member.
- **Example:** Fixing `store_id = "STORE_01"`. The resulting 2D slice provides a complete timeline of all product sales exclusively for Store 01.

### 4.4 Dice (Multi-Dimensional Sub-Cube Extraction)
- **Concept:** Extracts a smaller sub-cube by specifying criteria along **two or more dimensions simultaneously**.
- **Example:** Selecting `store_id IN ['STORE_01', 'STORE_02']` **AND** `category IN ['Bakery', 'Produce']` **AND** `date BETWEEN '2025-01-01' AND '2025-06-30'`. This allows comparative regional category audits over specific time intervals.

### 4.5 Pivot (Matrix Rotation & Cross-Tabulation)
- **Concept:** Rotates the axes of the data view to create a 2D cross-tabulation spreadsheet matrix.
- **Example:** 
  - **Rows:** Product Names (or Categories).
  - **Columns:** Store IDs (`STORE_01`, `STORE_02`, `STORE_03`) or Months.
  - **Cells:** Observed Sales, Gross Revenue, or Lost Stockout Revenue.
  - **Marginals:** Automatically computes row totals, column totals, and grand matrix totals.

---

## 5. Retail Data Mining Suite (4 Core Algorithms)

SalesSense integrates 4 complementary data mining algorithms operating directly on warehouse facts:

```
+-----------------------------------------------------------------------------------------+
|                                RETAIL DATA MINING SUITE                                 |
+-----------------------------+-----------------------------+-----------------------------+
|   1. K-Means Clustering     |  2. Demand Co-Movement      |   3. Anomaly Detection      |
|  Archetype segmentation     |  Cross-product correlation  |  Z-score surge/drop filter  |
|  (Velocity vs Volatility)   |  r in [-1.0, 1.0]           |  Stockout attribution       |
+-----------------------------+-----------------------------+-----------------------------+
                              |   4. Apriori Market Basket  |
                              |  Frequent itemsets (A -> B) |
                              |  Support, Confidence, Lift  |
                              +-----------------------------+
```

---

### 5.1 K-Means Demand Regime Clustering

#### Concept & Mathematical Feature Space
Rather than treating all products with uniform inventory rules, K-Means partitions store-SKU combinations into distinct operational demand archetypes.
Each store-SKU time series is mapped into a 2D feature vector:
1. **Demand Velocity ($X$-axis):** Mean daily units sold ($\mu = \frac{1}{T}\sum Y_t$).
2. **Demand Volatility ($Y$-axis):** Standard deviation of daily sales ($\sigma = \sqrt{\frac{1}{T}\sum (Y_t - \mu)^2}$) or Coefficient of Variation ($\text{CV} = \sigma / \mu$).

The Euclidean distance between item vector $x_i$ and cluster centroid $\mu_k$ is iteratively minimized:
$$J = \sum_{k=1}^{K} \sum_{x_i \in C_k} ||x_i - \mu_k||^2$$

#### The 4 Retail Demand Archetypes
1. **Core Staples (High Velocity, Low Volatility):**
   - *Behavior:* Essential items with high, predictable daily demand (e.g., Bananas, Whole Milk, Fresh Baguette).
   - *Inventory Strategy:* High-frequency automated replenishment with lean safety stock; stockouts here directly damage store loyalty.
2. **Smooth Runners (Moderate Velocity, Low Volatility):**
   - *Behavior:* Stable, everyday items with minimal fluctuations (e.g., Greek Yogurt, Olive Oil, Baby Spinach).
   - *Inventory Strategy:* Standard economic order quantity (EOQ) and fixed reorder points ($s, S$).
3. **Volatile Peaks / Promotional Items (High Velocity, High Volatility):**
   - *Behavior:* Spiky items that surge on weekends, holidays, or promotional discounts (e.g., Sparkling Water, Chicken Breast).
   - *Inventory Strategy:* Dynamic buffer stock and safety stock calculated with high service-level multipliers; supplier lead times must be tightly monitored.
4. **Slow Movers / Problem Items (Low Velocity, Low Volatility):**
   - *Behavior:* Infrequent or niche purchases (e.g., Balsamic Vinegar, Brioche Buns).
   - *Inventory Strategy:* Small minimum batch orders or just-in-time cross-docking to prevent perishable shrinkage and expiration waste.

---

### 5.2 Demand Co-Movement Correlation Matrix

#### Concept & Formula
Analyzes whether consumer purchases of different products move synchronously across the calendar year.
Computes the **Pearson Correlation Coefficient ($r$)** between product daily time-series $X$ and $Y$ across 365 days:
$$r_{X, Y} = \frac{\sum_{t=1}^{T}(X_t - \bar{X})(Y_t - \bar{Y})}{\sqrt{\sum_{t=1}^{T}(X_t - \bar{X})^2}\sqrt{\sum_{t=1}^{T}(Y_t - \bar{Y})^2}}, \quad r \in [-1.0, +1.0]$$

#### Strategic Business Insights
- **Strong Positive Co-Movement ($r > +0.5$): Complementary Demand**
  - When customers buy Artisan Sourdough, they simultaneously buy Olive Oil and Whole Milk.
  - *Action:* Place complementary items in adjacent physical aisles or offer bundled multi-item promotions.
- **Negative Co-Movement ($r < -0.2$): Product Substitution / Cannibalization**
  - When sales of SKU A spike (e.g., discount on 2% Reduced Fat Milk), sales of SKU B drop (Whole Milk).
  - *Action:* Avoid simultaneous promotions on cannibalizing SKUs to protect gross margins.

---

### 5.3 Rolling Seasonal Anomaly Detection with Stockout Attribution

#### Concept & Z-Score Formula
Flags statistical demand surges and collapses by comparing daily sales $Y_t$ against a rolling 7-day baseline:
$$\mu_{\text{rolling}} = \frac{1}{W} \sum_{i=0}^{W-1} Y_{t-i}, \quad \sigma_{\text{rolling}} = \sqrt{\frac{1}{W} \sum_{i=0}^{W-1} (Y_{t-i} - \mu_{\text{rolling}})^2}$$
$$z_t = \frac{Y_t - \mu_{\text{rolling}}}{\sigma_{\text{rolling}}}$$

Observations with $|z_t| \ge 1.8$ are flagged as anomalies.

#### The Stockout Attribution Innovation
Standard anomaly detection systems naively report any sudden drop in sales as "loss of customer interest." SalesSense cross-references the drop against the warehouse availability dimension (`stock_hour6_22_cnt` and `is_stockout_affected`):

```
                                  [ Anomaly Detected: |z| >= 1.8 ]
                                                 |
                       +-------------------------+-------------------------+
                       |                                                   |
                 Surge: z > 0                                         Drop: z < 0
                       |                                                   |
             [ Demand Spike ]                             +----------------+----------------+
      - Promotional rush / viral event                    |                                 |
      - Weekend demand wave                      stock_hours < 16                  stock_hours == 16
                                                          |                                 |
                                             [ Stockout Collapse ]             [ Unexplained Drop ]
                                        - Shelf was bare / out of stock    - Shelves fully stocked
                                        - True demand was CENSORED!        - True demand evaporated
                                        - High priority replenishment      - Price or quality issue
```

1. **Demand Spike ($z > +1.8$):** Observed sales significantly exceeded expected baseline. (e.g., weekend barbecue rush or viral recipe).
2. **Stockout-Induced Collapse ($z < -1.8$ AND `stock_hour6_22_cnt < 16`):** Sales dropped because the product ran out of stock during operating hours. This is **censored demand**, resulting in recoverable lost revenue!
3. **Unexplained Demand Drop ($z < -1.8$ AND `stock_hour6_22_cnt == 16`):** Product was fully stocked all day, but customers chose not to buy. (Indicates potential product quality degradation, negative publicity, or competitor discount).

---

### 5.4 Market Basket Analysis (Apriori Association Mining)

#### Concept
Discovers item-purchase co-occurrence patterns in retail transactions using the **Apriori Algorithm**. Operates on transaction receipts $(T_1, T_2, \dots, T_N)$ where each basket contains a set of items $\{i_1, i_2, \dots, i_m\}$.

#### Key Metrics & Formulas
For an association rule of the form $\text{Antecedent } (A) \implies \text{Consequent } (B)$:

| Metric | Formula | Practical Meaning |
| :--- | :--- | :--- |
| **Support** | $\text{Supp}(A \implies B) = \frac{\text{Count}(A \cup B)}{N}$ | Frequency: The proportion of total transactions containing both $A$ and $B$. |
| **Confidence** | $\text{Conf}(A \implies B) = \frac{\text{Supp}(A \cup B)}{\text{Supp}(A)} = P(B \mid A)$ | Reliability: Given that a customer bought item $A$, what is the probability they also bought item $B$? |
| **Lift** | $\text{Lift}(A \implies B) = \frac{\text{Conf}(A \implies B)}{\text{Supp}(B)} = \frac{P(A \cap B)}{P(A) \cdot P(B)}$ | Affinity: How much more likely is $B$ to be purchased when $A$ is purchased, compared to if $B$ was purchased at random? |

#### Lift Interpretation Guide
- **$\text{Lift} > 1.0$:** Positive correlation. Items are genuine complements (e.g., $\text{Lift} = 2.5$ means customers buying sourdough bread are 2.5 times more likely to purchase olive oil than the average shopper).
- **$\text{Lift} = 1.0$:** Independence. $A$ and $B$ have zero association; their co-occurrence is purely random.
- **$\text{Lift} < 1.0$:** Negative correlation. Items are substitutes or mutually exclusive.

---

## 6. Frontend DWM Console Architecture (`/dw-mining`)

The interactive frontend console (`src/pages/DataWarehouseMining.jsx`) exposes all functionality through 4 main tabs:

1. **Warehouse Overview:**
   - Visual star schema topology diagram (fact table and linked dimensions).
   - High-level metrics: Total Fact Records (19,710), Distinct SKUs (18), Store Nodes (3), Observation Days (365).
   - Dimensional storage and memory footprints.
2. **ETL Pipeline:**
   - Raw ingestion source logs and schema validation status.
   - Provenance audit ledger showing row counts, null imputations, and run times.
   - Button to trigger fresh ETL transformation and cache materialization.
3. **OLAP Explorer:**
   - **Roll-Up & Drill-Down Controls:** Hierarchy selector (`Category`, `Management Group`, `Day`, `Month`, `Quarter`) and metric toggles.
   - **Slice & Dice Filters:** Multi-store and multi-category selectors.
   - **Interactive 2D Pivot Table:** Live cross-tabulation matrix with product rows, store/month columns, and row/column totals with CSV export.
4. **Data Mining Suite:**
   - **Subtab 1: K-Means Demand Regimes:** Interactive scatter/cluster visualization (Velocity vs Volatility) with archetype strategy cards and SKU assignments.
   - **Subtab 2: Demand Co-Movement:** Synchronous correlation heat-grid ($r \in [-1, 1]$) identifying complements and substitutes.
   - **Subtab 3: Rolling Seasonal Anomalies:** Z-score sensitivity slider ($z \ge 1.8$), anomaly type badges (Spikes, Stockouts, Drops), observed vs expected values, and stockout attribution diagnoses.
   - **Subtab 4: Market Basket (Apriori):** Minimum support and confidence sliders, frequent itemsets table, and sortable association rules with Support, Confidence, and Lift.

---

## 7. Professor / Viva Presentation Q&A Cheat Sheet

Use these concise, high-impact answers when explaining your project during evaluation or viva examinations:

### Q1: What is the primary difference between OLTP and your OLAP Data Warehouse?
> *"Our OLTP system records raw checkout transactions at the hourly store-SKU level for transaction processing. Our OLAP Data Warehouse transforms these into a de-normalized Kimball Star Schema aggregated at the daily fact grain. This allows analytical queries—such as multi-store category rollups and 365-day correlation matrices—to execute in milliseconds without locking operational checkout tables."*

### Q2: Why did you choose a Star Schema over a Snowflake Schema?
> *"In retail decision support, query read speed is paramount. A Star Schema features de-normalized dimensions directly linked to the central fact table via foreign keys. This requires only single-level joins ($O(1)$ relational depth) compared to the normalized multi-hop joins of a Snowflake Schema, maximizing OLAP slice-and-dice query performance."*

### Q3: What is 'Censored Demand' and how does your DW handle it?
> *"Observed sales do not equal true consumer demand when a store runs out of stock. If an item stockouts for 6 out of 16 operating hours, sales artificially drop. Our ETL pipeline identifies these censored intervals using the availability dimension (`stock_hour6_22_cnt < 16`), applies econometric Tobit/proportional reconstruction to estimate latent demand, and stores both `observed_sales` and `estimated_latent_demand` as additive measures in `FactDailySales`."*

### Q4: Explain the 5 OLAP operations implemented in your project.
> 1. *"**Roll-Up:** Aggregating data up the hierarchy (e.g., SKU sales summarized to Category level).*
> 2. *"**Drill-Down:** Disaggregating data down the hierarchy (e.g., expanding Bakery into individual artisan bread SKUs).*
> 3. *"**Slice:** Taking a 1D slice across the cube along a fixed dimension (e.g., analyzing only Store 01).*
> 4. *"**Dice:** Extracting a multi-dimensional sub-cube bounded by intersections across multiple dimensions (e.g., Store 01 & 02 for Bakery & Produce in Q1).*
> 5. *"**Pivot:** Rotating axes to present a 2D cross-tabulation matrix of Products vs Stores with marginal totals."*

### Q5: On what basis are products clustered in your K-Means feature space?
> *"We map each store-SKU into a 2D velocity-volatility space where the X-axis is **Demand Velocity** (mean daily sales) and the Y-axis is **Demand Volatility** (standard deviation or coefficient of variation). This segments inventory into 4 actionable supply chain archetypes: Core Staples, Smooth Runners, Volatile Peaks, and Slow Movers—each assigned tailored replenishment rules."*

### Q6: How does your Anomaly Detection differ from traditional outlier algorithms?
> *"Traditional algorithms flag an anomaly purely on mathematical deviation ($|z| \ge 1.8$). Our innovation is **Stockout Attribution**: when sales collapse, we cross-reference the hourly in-stock count. If the item was out of stock, it is diagnosed as a **Stockout-Induced Collapse** (censored demand) rather than a loss of consumer interest, providing actionable supply chain recovery steps."*

### Q7: What do Support, Confidence, and Lift mean in your Apriori implementation?
> - *"**Support:** The percentage of all retail transactions containing both items (e.g., 15% of all baskets have bread and milk).*
> - *"**Confidence:** The conditional probability that a buyer of item A also buys item B (e.g., 65% of sourdough buyers also buy olive oil).*
> - *"**Lift:** The ratio of observed joint occurrence to expected random occurrence. A Lift of 2.5 means buying sourdough makes the customer 2.5 times more likely to purchase olive oil than a random shopper."*
