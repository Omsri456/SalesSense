"""
Tests for Kimball Star Schema Data Warehouse, OLAP Engine, and Retail Data Mining Suite.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dw.dimensional_model import dw_engine
from app.services.olap_service import olap_engine
from app.services.mining_service import mining_engine

client = TestClient(app)


def _get_token(email: str, password: str = "Password123!") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_dimensional_star_schema_build():
    """Verify Kimball dimensional data warehouse builds with expected facts and dimensions."""
    meta = dw_engine.build_warehouse(force_rebuild=True)
    assert meta["fact_table"] == "FactDailySales"
    assert meta["total_facts"] > 0
    assert meta["dimensions"]["DimStore"] >= 2
    assert meta["dimensions"]["DimProduct"] >= 5
    assert meta["dimensions"]["DimDate"] > 0
    assert meta["dimensions"]["DimStockout"] == 17
    assert meta["financial_summary"]["total_units_sold"] > 0
    assert meta["financial_summary"]["total_gross_revenue"] > 0


def test_olap_rollup():
    """Verify rollup along category and month dimensions."""
    cat_rollup = olap_engine.rollup(hierarchy_level="category", metric="observed_sales")
    assert len(cat_rollup) > 0
    for row in cat_rollup:
        assert "category" in row
        assert "observed_sales" in row
        assert "gross_revenue" in row
        assert row["observed_sales"] >= 0

    month_rollup = olap_engine.rollup(hierarchy_level="month_name", metric="gross_revenue")
    assert len(month_rollup) > 0
    for row in month_rollup:
        assert "month_name" in row
        assert "gross_revenue" in row


def test_olap_drilldown():
    """Verify drilldown from category to product items."""
    drill = olap_engine.drilldown(
        parent_dimension="category",
        parent_value="Bakery",
        child_dimension="product_name",
        metric="observed_sales",
    )
    assert len(drill) > 0
    for item in drill:
        assert "product_name" in item
        assert "observed_sales" in item


def test_olap_slice_and_dice():
    """Verify 1D slice and ND dice operations."""
    slice_res = olap_engine.slice(dimension="store_id", value="STORE_01")
    assert slice_res["dimension"] == "store_id"
    assert slice_res["value"] == "STORE_01"
    assert slice_res["total_sales"] > 0
    assert len(slice_res["time_series"]) > 0

    dice_res = olap_engine.dice(store_ids=["STORE_01"], categories=["Bakery", "Produce"])
    assert dice_res["cube_size"] > 0
    assert dice_res["summary"]["total_observed_sales"] > 0


def test_olap_pivot():
    """Verify 2D pivot cross-tabulation matrix."""
    pivot_res = olap_engine.pivot(
        row_dim="product_name",
        col_dim="store_id",
        val_metric="observed_sales",
    )
    assert pivot_res["row_dim"] == "product_name"
    assert pivot_res["col_dim"] == "store_id"
    assert len(pivot_res["columns"]) > 0
    assert len(pivot_res["data"]) > 0
    assert "TOTAL" in pivot_res["totals"]["row"]


def test_market_basket_analysis_apriori():
    """Verify Apriori market basket analysis generates frequent itemsets and association rules."""
    res = mining_engine.market_basket_analysis(min_support=0.01, min_confidence=0.1)
    assert res["algorithm"] == "Apriori"
    assert res["total_baskets"] > 0
    assert len(res["frequent_itemsets"]) > 0
    assert len(res["rules"]) > 0
    for rule in res["rules"][:5]:
        assert "support" in rule
        assert "confidence" in rule
        assert "lift" in rule
        assert rule["confidence"] >= 0.1


def test_demand_regime_clustering_kmeans():
    """Verify K-Means clustering assigns items into demand archetypes."""
    res = mining_engine.demand_regime_clustering(n_clusters=4)
    assert res["algorithm"] == "K-Means Demand Regime Clustering"
    assert res["n_clusters"] == 4
    assert len(res["clusters"]) == 4
    for c in res["clusters"]:
        assert "archetype" in c
        assert "recommended_strategy" in c
        assert "centroids" in c
    assert len(res["items"]) > 0


def test_anomaly_detection_with_stockout_attribution():
    """Verify rolling seasonal anomaly detection flags spikes and stockout plunges."""
    res = mining_engine.detect_anomalies(z_threshold=2.0, rolling_window=7)
    assert res["algorithm"] == "Rolling Seasonal Z-Score Anomaly Detection"
    assert res["total_anomalies"] > 0
    # Check that diagnoses are populated
    for a in res["anomalies"][:5]:
        assert "diagnosis" in a
        assert "z_score" in a
        assert "anomaly_type" in a
        assert a["anomaly_type"] in ["Demand Spike", "Stockout-Induced Collapse", "Unexplained Demand Drop"]


def test_dw_api_endpoints_and_rbac():
    """Verify DW API endpoints enforce authorization and store scoping."""
    admin_token = _get_token("admin@salessense.com")
    retailer1_token = _get_token("retailer1@salessense.com")  # Scoped to STORE_01

    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_ret1 = {"Authorization": f"Bearer {retailer1_token}"}

    # 1. Metadata
    meta_res = client.get("/api/dw/metadata", headers=headers_admin)
    assert meta_res.status_code == 200

    # 2. Rollup
    roll_res = client.post("/api/dw/rollup", json={"hierarchy_level": "category"}, headers=headers_ret1)
    assert roll_res.status_code == 200
    assert len(roll_res.json()["data"]) > 0

    # 3. Pivot
    piv_res = client.post(
        "/api/dw/pivot",
        json={"row_dim": "product_name", "col_dim": "store_id", "val_metric": "observed_sales"},
        headers=headers_admin,
    )
    assert piv_res.status_code == 200
    assert len(piv_res.json()["data"]) > 0

    # 4. Slice with forbidden store scope
    slice_bad = client.post(
        "/api/dw/slice",
        json={"dimension": "store_id", "value": "STORE_02"},
        headers=headers_ret1,
    )
    assert slice_bad.status_code == 403


def test_mining_api_endpoints():
    """Verify Data Mining endpoints return valid analysis over HTTP."""
    token = _get_token("admin@salessense.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Market Basket
    mba_res = client.get("/api/mining/market-basket?min_support=0.01&min_confidence=0.1", headers=headers)
    assert mba_res.status_code == 200
    assert mba_res.json()["total_rules"] > 0

    # Clusters
    clu_res = client.get("/api/mining/demand-clusters?n_clusters=3", headers=headers)
    assert clu_res.status_code == 200
    assert clu_res.json()["n_clusters"] == 3

    # Anomalies
    ano_res = client.get("/api/mining/anomalies?z_threshold=2.0", headers=headers)
    assert ano_res.status_code == 200
    assert ano_res.json()["total_anomalies"] > 0
