"""
Retail Data Mining Suite
Implements classic and modern retail data mining algorithms over the warehouse fact data:
1. Apriori Market Basket Analysis (Itemset mining, Support, Confidence, Lift, Conviction)
2. K-Means Demand Regime Clustering (Velocity vs. Volatility demand profiling)
3. Rolling Seasonal Anomaly Detection (Spike / Drop detection cross-referenced with stockout events)
"""

from typing import Dict, Any, List, Optional
import itertools
import logging
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from app.dw.dimensional_model import dw_engine

logger = logging.getLogger("salessense.mining")


class RetailDataMiningEngine:
    def __init__(self):
        pass

    def _get_scoped_data(self, allowed_stores: Optional[List[str]] = None) -> pd.DataFrame:
        df = dw_engine.get_facts_view()
        if allowed_stores and allowed_stores != ["*"]:
            df = df[df["store_id"].isin(allowed_stores)]
        return df

    # =========================================================================
    # 1. MARKET BASKET ANALYSIS (APRIORI)
    # =========================================================================
    def market_basket_analysis(
        self,
        min_support: float = 0.1,
        min_confidence: float = 0.3,
        level: str = "product_name",  # 'product_name' or 'category'
        allowed_stores: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Executes Market Basket Analysis using the Apriori association rule mining algorithm.
        Baskets are constructed from active daily purchasing per store-date.
        """
        df = self._get_scoped_data(allowed_stores)
        if df.empty:
            return {"total_baskets": 0, "rules": [], "frequent_itemsets": []}

        # Filter to active purchases (observed_sales > 0)
        active_sales = df[df["observed_sales"] > 0]
        item_col = level if level in active_sales.columns else "product_name"

        # Group into baskets: (store_id, date_str) -> set of items
        baskets_series = active_sales.groupby(["store_id", "date_str"])[item_col].apply(lambda s: sorted(list(set(s))))
        baskets = [b for b in baskets_series if len(b) > 0]
        total_baskets = len(baskets)

        if total_baskets == 0:
            return {"total_baskets": 0, "rules": [], "frequent_itemsets": []}

        # Step 1: 1-itemset frequencies
        item_counts: Dict[str, int] = {}
        for b in baskets:
            for item in b:
                item_counts[item] = item_counts.get(item, 0) + 1

        frequent_1 = {
            item: count / total_baskets
            for item, count in item_counts.items()
            if (count / total_baskets) >= min_support
        }

        # Step 2: 2-itemset frequencies
        frequent_items = sorted(list(frequent_1.keys()))
        pair_counts: Dict[tuple, int] = {}
        for b in baskets:
            b_set = set(b)
            # Find candidate pairs in this basket
            relevant_items = [it for it in frequent_items if it in b_set]
            for pair in itertools.combinations(relevant_items, 2):
                pair_counts[pair] = pair_counts.get(pair, 0) + 1

        frequent_2 = {
            pair: count / total_baskets
            for pair, count in pair_counts.items()
            if (count / total_baskets) >= min_support
        }

        # Step 3: Association Rules (A -> B and B -> A)
        rules = []
        for (item_a, item_b), pair_sup in frequent_2.items():
            sup_a = frequent_1.get(item_a, 0.0)
            sup_b = frequent_1.get(item_b, 0.0)

            # Rule A -> B
            if sup_a > 0:
                conf_a_b = pair_sup / sup_a
                lift_a_b = pair_sup / (sup_a * sup_b) if sup_b > 0 else 0.0
                conv_a_b = (1.0 - sup_b) / (1.0 - conf_a_b) if conf_a_b < 1.0 else 999.0
                if conf_a_b >= min_confidence:
                    rules.append({
                        "antecedent": [item_a],
                        "consequent": [item_b],
                        "support": round(pair_sup, 4),
                        "confidence": round(conf_a_b, 4),
                        "lift": round(lift_a_b, 4),
                        "conviction": round(conv_a_b, 4),
                    })

            # Rule B -> A
            if sup_b > 0:
                conf_b_a = pair_sup / sup_b
                lift_b_a = pair_sup / (sup_b * sup_a) if sup_a > 0 else 0.0
                conv_b_a = (1.0 - sup_a) / (1.0 - conf_b_a) if conf_b_a < 1.0 else 999.0
                if conf_b_a >= min_confidence:
                    rules.append({
                        "antecedent": [item_b],
                        "consequent": [item_a],
                        "support": round(pair_sup, 4),
                        "confidence": round(conf_b_a, 4),
                        "lift": round(lift_b_a, 4),
                        "conviction": round(conv_b_a, 4),
                    })

        # Format frequent itemsets
        itemsets = [
            {"items": [item], "support": round(sup, 4), "length": 1}
            for item, sup in frequent_1.items()
        ] + [
            {"items": list(pair), "support": round(sup, 4), "length": 2}
            for pair, sup in frequent_2.items()
        ]

        rules.sort(key=lambda r: r["lift"], reverse=True)
        itemsets.sort(key=lambda it: it["support"], reverse=True)

        return {
            "algorithm": "Apriori",
            "level": item_col,
            "min_support": min_support,
            "min_confidence": min_confidence,
            "total_baskets": total_baskets,
            "total_rules": len(rules),
            "rules": rules,
            "frequent_itemsets": itemsets,
        }

    # =========================================================================
    # 2. K-MEANS DEMAND REGIME CLUSTERING
    # =========================================================================
    def demand_regime_clustering(
        self,
        n_clusters: int = 4,
        allowed_stores: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Clusters store-SKU series into Demand Regimes based on:
        - Mean daily volume (Velocity)
        - Coefficient of Variation (Volatility)
        - Zero-sales ratio (Intermittency)
        - Stockout frequency ratio
        - Average Unit Price
        """
        df = self._get_scoped_data(allowed_stores)
        if df.empty:
            return {"clusters": [], "items": []}

        # Calculate features per (store_id, product_id)
        grouped = df.groupby(["store_id", "product_id", "product_name", "category"])
        stats = grouped.agg(
            mean_sales=("observed_sales", "mean"),
            std_sales=("observed_sales", "std"),
            zero_ratio=("observed_sales", lambda s: float((s == 0).mean())),
            stockout_ratio=("stock_hour6_22_cnt", lambda s: float((s < 16).mean())),
            mean_latent=("estimated_latent_demand", "mean"),
            avg_price=("unit_price", "mean"),
            total_lost_rev=("lost_revenue_estimate", "sum"),
        ).reset_index()

        # Handle NaNs
        stats["std_sales"] = stats["std_sales"].fillna(0.0)
        # Coefficient of variation CV = std / mean
        stats["cv_demand"] = np.where(stats["mean_sales"] > 0, stats["std_sales"] / stats["mean_sales"], 0.0)

        feature_cols = ["mean_sales", "cv_demand", "zero_ratio", "stockout_ratio", "avg_price"]
        X = stats[feature_cols].values

        n_clusters = min(n_clusters, len(stats))
        if n_clusters < 2:
            n_clusters = 1

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)
        stats["cluster"] = labels

        # Label interpretation based on cluster centers
        centers = scaler.inverse_transform(kmeans.cluster_centers_)
        cluster_profiles = []

        for cid in range(n_clusters):
            c_center = centers[cid]
            mean_vol = c_center[0]
            cv_val = c_center[1]
            interm_val = c_center[2]
            stk_val = c_center[3]

            if mean_vol > np.median(stats["mean_sales"]) and cv_val < 0.6:
                archetype = "Fast Mover — Smooth"
                strategy = "Automated high-frequency replenishment, minimal safety buffer."
            elif mean_vol > np.median(stats["mean_sales"]) and cv_val >= 0.6:
                archetype = "High Volume — Erratic/Volatile"
                strategy = "Dynamic safety stock buffer; sensitive to promotion spikes."
            elif mean_vol <= np.median(stats["mean_sales"]) and interm_val > 0.3:
                archetype = "Intermittent / Lumpy"
                strategy = "Croston-style replenishment; avoid over-stocking perishables."
            else:
                archetype = "Steady Standard Demand"
                strategy = "Standard periodic review (s, S) inventory control."

            matching_items = stats[stats["cluster"] == cid]
            cluster_profiles.append({
                "cluster_id": int(cid),
                "archetype": archetype,
                "recommended_strategy": strategy,
                "item_count": int(len(matching_items)),
                "centroids": {
                    "mean_daily_sales": round(float(mean_vol), 2),
                    "coefficient_of_variation": round(float(cv_val), 3),
                    "zero_sales_ratio": round(float(interm_val), 3),
                    "stockout_ratio": round(float(stk_val), 3),
                    "avg_price": round(float(c_center[4]), 2),
                },
            })

        items_list = stats[[
            "store_id", "product_id", "product_name", "category",
            "mean_sales", "cv_demand", "zero_ratio", "stockout_ratio",
            "avg_price", "total_lost_rev", "cluster"
        ]].copy()
        items_list["mean_sales"] = items_list["mean_sales"].round(2)
        items_list["cv_demand"] = items_list["cv_demand"].round(3)
        items_list["zero_ratio"] = items_list["zero_ratio"].round(3)
        items_list["stockout_ratio"] = items_list["stockout_ratio"].round(3)
        items_list["avg_price"] = items_list["avg_price"].round(2)
        items_list["total_lost_rev"] = items_list["total_lost_rev"].round(2)

        return {
            "algorithm": "K-Means Demand Regime Clustering",
            "n_clusters": n_clusters,
            "inertia": round(float(kmeans.inertia_), 2),
            "clusters": cluster_profiles,
            "items": items_list.to_dict(orient="records"),
        }

    # =========================================================================
    # 3. ROLLING SEASONAL ANOMALY DETECTION
    # =========================================================================
    def detect_anomalies(
        self,
        store_id: Optional[str] = None,
        product_id: Optional[str] = None,
        z_threshold: float = 2.5,
        rolling_window: int = 7,
        allowed_stores: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Detects demand spikes and unexpected demand collapses.
        Cross-references drops with stockout data to distinguish unconstrained drops from stockout losses.
        """
        df = self._get_scoped_data(allowed_stores)
        if store_id:
            df = df[df["store_id"] == store_id]
        if product_id:
            df = df[df["product_id"] == product_id]

        if df.empty:
            return {"total_anomalies": 0, "anomalies": []}

        # Aggregate daily if looking across products
        daily = df.groupby(["store_id", "product_id", "product_name", "date_str"], as_index=False).agg({
            "observed_sales": "sum",
            "stock_hour6_22_cnt": "min",
            "is_stockout_affected": "max",
            "estimated_latent_demand": "sum",
            "lost_sales_estimate": "sum",
            "gross_revenue": "sum",
            "lost_revenue_estimate": "sum",
        }).sort_values(by="date_str")

        anomalies = []
        for (sid, pid, pname), group in daily.groupby(["store_id", "product_id", "product_name"]):
            group = group.copy().sort_values(by="date_str").reset_index(drop=True)
            sales = group["observed_sales"]

            rolling_mean = sales.rolling(window=rolling_window, min_periods=3).mean()
            rolling_std = sales.rolling(window=rolling_window, min_periods=3).std().fillna(1.0)
            rolling_std = np.where(rolling_std == 0, 1.0, rolling_std)

            z_scores = (sales - rolling_mean) / rolling_std

            for idx, z in enumerate(z_scores):
                if pd.isna(z) or abs(z) < z_threshold:
                    continue

                row = group.iloc[idx]
                obs_val = float(row["observed_sales"])
                exp_val = float(rolling_mean.iloc[idx])
                is_stockout = bool(row["is_stockout_affected"] == 1 or row["stock_hour6_22_cnt"] < 16)

                if z > 0:
                    atype = "Demand Spike"
                    diagnosis = f"Unusual positive surge (+{round(obs_val - exp_val, 1)} units vs baseline). Likely promotional or local event."
                else:
                    if is_stockout:
                        atype = "Stockout-Induced Collapse"
                        diagnosis = f"Sales plunged (-{round(exp_val - obs_val, 1)} units) due to severe stockout ({int(row['stock_hour6_22_cnt'])} in-stock hours)."
                    else:
                        atype = "Unexplained Demand Drop"
                        diagnosis = f"Demand collapsed despite full inventory availability (-{round(exp_val - obs_val, 1)} units)."

                anomalies.append({
                    "date": str(row["date_str"]),
                    "store_id": str(sid),
                    "product_id": str(pid),
                    "product_name": str(pname),
                    "anomaly_type": atype,
                    "observed_sales": round(obs_val, 2),
                    "expected_sales": round(exp_val, 2),
                    "z_score": round(float(z), 2),
                    "stock_hours": int(row["stock_hour6_22_cnt"]),
                    "lost_revenue": float(row["lost_revenue_estimate"]),
                    "diagnosis": diagnosis,
                })

        anomalies.sort(key=lambda a: abs(a["z_score"]), reverse=True)

        return {
            "algorithm": "Rolling Seasonal Z-Score Anomaly Detection",
            "z_threshold": z_threshold,
            "rolling_window_days": rolling_window,
            "total_anomalies": len(anomalies),
            "anomalies": anomalies[:150],  # Return top 150
        }


mining_engine = RetailDataMiningEngine()
