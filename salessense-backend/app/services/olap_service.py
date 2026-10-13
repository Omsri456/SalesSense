"""
OLAP Engine for Kimball Dimensional Data Warehouse
Supports standard multidimensional operations over the denormalized fact/dimension view:
- Rollup (aggregating up hierarchies: date -> month -> quarter, item -> category)
- Drill-Down (disaggregating down hierarchies: region -> city -> store, year -> month)
- Slice (1D filtering along a single dimension)
- Dice (ND hypercube filtering along multiple dimensions)
- Pivot (Cross-tabulation matrix of Row Dimension vs Column Dimension)
"""

from typing import Dict, Any, List, Optional
import logging
import numpy as np
import pandas as pd

from app.dw.dimensional_model import dw_engine

logger = logging.getLogger("salessense.olap")


class OLAPEngine:
    def __init__(self):
        pass

    def _get_scoped_view(self, allowed_stores: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Retrieves the denormalized analytical view and filters by allowed store scope if provided.
        """
        df = dw_engine.get_facts_view()
        if allowed_stores is not None and len(allowed_stores) > 0 and allowed_stores != ["*"]:
            df = df[df["store_id"].isin(allowed_stores)]
        return df

    def rollup(
        self,
        hierarchy_level: str,
        metric: str = "observed_sales",
        allowed_stores: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Rollup operation: Summarizes metrics at a higher granularity.
        Supported levels: 'year', 'quarter', 'month', 'category', 'management_group_id', 'region_name', 'store_id'
        """
        df = self._get_scoped_view(allowed_stores)
        if filters:
            for col, val in filters.items():
                if col in df.columns:
                    if isinstance(val, list):
                        df = df[df[col].isin(val)]
                    else:
                        df = df[df[col] == val]

        if hierarchy_level not in df.columns:
            raise ValueError(f"Invalid hierarchy level '{hierarchy_level}'. Valid columns: {list(df.columns)}")

        agg_dict = {
            "observed_sales": "sum",
            "gross_revenue": "sum",
            "estimated_latent_demand": "sum",
            "lost_sales_estimate": "sum",
            "lost_revenue_estimate": "sum",
            "fact_id": "count",
        }
        # Include requested metric if not in standard dict
        if metric in df.columns and metric not in agg_dict:
            agg_dict[metric] = "sum"

        grouped = df.groupby(hierarchy_level, as_index=False).agg(agg_dict)
        grouped.rename(columns={"fact_id": "record_count"}, inplace=True)
        grouped.sort_values(by=metric, ascending=False, inplace=True)
        return grouped.to_dict(orient="records")

    def drilldown(
        self,
        parent_dimension: str,
        parent_value: Any,
        child_dimension: str,
        metric: str = "observed_sales",
        allowed_stores: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Drill-down operation: Navigates from parent dimension to child dimension.
        Example: parent_dimension='category', parent_value='Bakery', child_dimension='product_name'
        """
        df = self._get_scoped_view(allowed_stores)

        if parent_dimension not in df.columns or child_dimension not in df.columns:
            raise ValueError(f"Dimensions '{parent_dimension}' or '{child_dimension}' not found.")

        filtered = df[df[parent_dimension] == parent_value]
        if filtered.empty:
            return []

        grouped = filtered.groupby(child_dimension, as_index=False).agg({
            "observed_sales": "sum",
            "gross_revenue": "sum",
            "estimated_latent_demand": "sum",
            "lost_sales_estimate": "sum",
            "lost_revenue_estimate": "sum",
            "fact_id": "count",
        })
        grouped.rename(columns={"fact_id": "record_count"}, inplace=True)
        grouped.sort_values(by=metric, ascending=False, inplace=True)
        return grouped.to_dict(orient="records")

    def slice(
        self,
        dimension: str,
        value: Any,
        time_grain: str = "date_str",
        allowed_stores: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Slice operation: Fixes one dimension to a single value and returns the time-series profile.
        """
        df = self._get_scoped_view(allowed_stores)
        if dimension not in df.columns:
            raise ValueError(f"Dimension '{dimension}' not found.")

        sliced = df[df[dimension] == value]
        if sliced.empty:
            return {
                "dimension": dimension,
                "value": value,
                "total_sales": 0.0,
                "total_revenue": 0.0,
                "total_latent_demand": 0.0,
                "time_series": [],
            }

        if time_grain not in sliced.columns:
            time_grain = "date_str"

        ts = sliced.groupby(time_grain, as_index=False).agg({
            "observed_sales": "sum",
            "gross_revenue": "sum",
            "estimated_latent_demand": "sum",
            "lost_sales_estimate": "sum",
            "lost_revenue_estimate": "sum",
        }).sort_values(by=time_grain)

        return {
            "dimension": dimension,
            "value": value,
            "total_sales": float(sliced["observed_sales"].sum().round(2)),
            "total_revenue": float(sliced["gross_revenue"].sum().round(2)),
            "total_latent_demand": float(sliced["estimated_latent_demand"].sum().round(2)),
            "total_lost_revenue": float(sliced["lost_revenue_estimate"].sum().round(2)),
            "time_series": ts.to_dict(orient="records"),
        }

    def dice(
        self,
        store_ids: Optional[List[str]] = None,
        categories: Optional[List[str]] = None,
        product_ids: Optional[List[str]] = None,
        date_start: Optional[str] = None,
        date_end: Optional[str] = None,
        allowed_stores: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Dice operation: Multi-dimensional sub-cube extraction.
        """
        df = self._get_scoped_view(allowed_stores)

        if store_ids:
            df = df[df["store_id"].isin(store_ids)]
        if categories:
            df = df[df["category"].isin(categories)]
        if product_ids:
            df = df[df["product_id"].isin(product_ids)]
        if date_start:
            df = df[df["date_str"] >= date_start]
        if date_end:
            df = df[df["date_str"] <= date_end]

        if df.empty:
            return {
                "cube_size": 0,
                "summary": {},
                "records": [],
            }

        summary = {
            "total_records": int(len(df)),
            "unique_stores": int(df["store_id"].nunique()),
            "unique_products": int(df["product_id"].nunique()),
            "total_observed_sales": float(df["observed_sales"].sum().round(2)),
            "total_gross_revenue": float(df["gross_revenue"].sum().round(2)),
            "total_estimated_latent_demand": float(df["estimated_latent_demand"].sum().round(2)),
            "total_lost_revenue_estimate": float(df["lost_revenue_estimate"].sum().round(2)),
        }

        # Return sample or grouped sub-cube
        top_records = df[[
            "date_str", "store_id", "product_id", "product_name", "category",
            "observed_sales", "gross_revenue", "estimated_latent_demand", "lost_revenue_estimate", "stock_hour6_22_cnt"
        ]].head(200).to_dict(orient="records")

        return {
            "cube_size": len(df),
            "summary": summary,
            "sample_records": top_records,
        }

    def pivot(
        self,
        row_dim: str,
        col_dim: str,
        val_metric: str = "observed_sales",
        aggfunc: str = "sum",
        allowed_stores: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Pivot operation: Rotates dimensions into a 2D cross-tabulation matrix.
        Example: Rows=product_name, Columns=month_name, Values=gross_revenue
        """
        df = self._get_scoped_view(allowed_stores)

        if row_dim not in df.columns or col_dim not in df.columns or val_metric not in df.columns:
            raise ValueError(f"Invalid parameters for pivot: row='{row_dim}', col='{col_dim}', val='{val_metric}'.")

        pivoted = pd.pivot_table(
            df,
            index=row_dim,
            columns=col_dim,
            values=val_metric,
            aggfunc=aggfunc,
            fill_value=0.0,
        )

        rows = pivoted.index.tolist()
        cols = pivoted.columns.tolist()
        matrix = []

        for r_idx, r_val in enumerate(rows):
            row_data = {"row": str(r_val)}
            row_sum = 0.0
            for c_val in cols:
                cell_val = float(round(pivoted.loc[r_val, c_val], 2))
                row_data[str(c_val)] = cell_val
                row_sum += cell_val
            row_data["total"] = round(row_sum, 2)
            matrix.append(row_data)

        # Compute column totals
        col_totals = {"row": "TOTAL"}
        grand_total = 0.0
        for c_val in cols:
            c_sum = float(round(pivoted[c_val].sum(), 2))
            col_totals[str(c_val)] = c_sum
            grand_total += c_sum
        col_totals["total"] = round(grand_total, 2)

        return {
            "row_dim": row_dim,
            "col_dim": col_dim,
            "val_metric": val_metric,
            "columns": [str(c) for c in cols],
            "data": matrix,
            "totals": col_totals,
        }


olap_engine = OLAPEngine()
