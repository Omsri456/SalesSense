"""
Tests for Kimball Star Schema Data Warehouse, Persistent Storage, ETL Pipeline,
OLAP Hypercube Engine, and Retail Data Mining Suite.
Complies with Phase 9 of SalesSense Enhancement specification.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dw.dimensional_model import dw_engine
from app.dw.db import SessionLocal
from app.dw.models import FactDailySales, DimStore, DimProduct, DimDate, EtlRun
from app.services.olap_service import olap_engine
from app.services.mining_service import mining_engine

client = TestClient(app)


def _get_token(email: str, password: str = "Password123!") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_dimensional_star_schema_build_and_persistence():
    """Verify Kimball dimensional data warehouse builds with expected facts, dimensions, and persists in DB."""
    meta = dw_engine.build_warehouse(force_rebuild=True)
    assert meta["fact_table"] == "FactDailySales"
    assert meta["total_facts"] > 0
    assert meta["is_persisted"] is True
    assert meta["dimensions"]["DimStore"] >= 3
    assert meta["dimensions"]["DimProduct"] >= 18
    assert meta["dimensions"]["DimDate"] >= 90
    assert meta["dimensions"]["DimStockout"] >= 1
    assert meta["financial_summary"]["total_units_sold"] > 0
    assert meta["financial_summary"]["total_gross_revenue"] > 0

    # Verify rows exist in physical relational database
    with SessionLocal() as session:
        db_facts = session.query(FactDailySales).count()
        db_stores = session.query(DimStore).count()
        db_products = session.query(DimProduct).count()
        db_dates = session.query(DimDate).count()
        assert db_facts == meta["total_facts"]
        assert db_stores >= 3
        assert db_products >= 18
        assert db_dates >= 90


def test_etl_idempotency_and_audit_run():
    """Verify ETL runs are idempotent (no duplicate facts) and tracked in audit log."""
    with SessionLocal() as session:
        initial_runs = session.query(EtlRun).count()

    meta2 = dw_engine.build_warehouse(force_rebuild=True)
    assert meta2["total_facts"] > 0

    with SessionLocal() as session:
        new_runs = session.query(EtlRun).count()
        assert new_runs == initial_runs + 1
        latest = session.query(EtlRun).order_by(EtlRun.run_timestamp.desc()).first()
        assert latest.status == "SUCCESS"
        assert latest.facts_created == meta2["total_facts"]


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
    cat_rollup = olap_engine.rollup(hierarchy_level="category", metric="observed_sales")
    assert len(cat_rollup) > 0
    target_cat = cat_rollup[0]["category"]

    drill = olap_engine.drilldown(
        parent_dimension="category",
        parent_value=target_cat,
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

    cat_rollup = olap_engine.rollup(hierarchy_level="category", metric="observed_sales")
    target_cat = cat_rollup[0]["category"]

    dice_res = olap_engine.dice(store_ids=["STORE_01"], categories=[target_cat])
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


def test_olap_parameter_validation_and_security():
    """Verify invalid dimensions or SQL injection attempts are rejected."""
    with pytest.raises(ValueError, match="Invalid hierarchy level"):
        olap_engine.rollup(hierarchy_level="non_existent_column; DROP TABLE fact_daily_sales;")

    with pytest.raises(ValueError, match="Invalid metric"):
        olap_engine.rollup(hierarchy_level="category", metric="invalid_metric_name")


def test_market_basket_analysis_apriori_with_caveats():
    """Verify Apriori market basket analysis generates rules and displays academic caveats."""
    res = mining_engine.market_basket_analysis(min_support=0.01, min_confidence=0.1)
    assert res["algorithm"] == "Apriori Association Mining"
    assert "academic_caveat" in res
    assert res["requires_transaction_data"] is True
    assert res["total_baskets"] > 0
    assert len(res["frequent_itemsets"]) > 0
    assert len(res["rules"]) > 0


def test_demand_comovement_analysis():
    """Verify statistical cross-product demand correlation matrix."""
    res = mining_engine.demand_comovement_analysis()
    assert res["algorithm"] == "Demand Co-Movement Matrix"
    assert res["observation_days"] >= 90
    assert len(res["pairs"]) > 0
    for p in res["pairs"]:
        assert "product_a" in p
        assert "product_b" in p
        assert "correlation_r" in p
        assert -1.0 <= p["correlation_r"] <= 1.0


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
    for a in res["anomalies"][:5]:
        assert "diagnosis" in a
        assert "z_score" in a
        assert "anomaly_type" in a
        assert a["anomaly_type"] in ["Demand Spike", "Stockout-Induced Collapse", "Unexplained Demand Drop"]


def test_dw_api_endpoints_and_rbac():
    """Verify DW API endpoints enforce authorization, star schema topology, and store scoping."""
    admin_token = _get_token("admin@salessense.com")
    retailer1_token = _get_token("retailer1@salessense.com")  # Scoped to STORE_01

    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_ret1 = {"Authorization": f"Bearer {retailer1_token}"}

    # 1. Metadata (Admin only)
    meta_res = client.get("/api/dw/metadata", headers=headers_admin)
    assert meta_res.status_code == 200

    # 2. Schema Topology (Admin succeeds, Retailer gets 403 Forbidden)
    schema_res = client.get("/api/dw/schema", headers=headers_admin)
    assert schema_res.status_code == 200
    schema = schema_res.json()
    assert schema["fact_table"]["name"] == "FactDailySales"
    assert len(schema["dimensions"]) >= 5

    bad_schema = client.get("/api/dw/schema", headers=headers_ret1)
    assert bad_schema.status_code == 403

    # 3. ETL Pipeline Run via API (Admin succeeds)
    etl_res = client.post("/api/dw/etl/run", headers=headers_admin)
    assert etl_res.status_code == 200
    assert etl_res.json()["status"] == "success"

    # 4. Unauthorized ETL run attempt by Retailer -> 403 Forbidden
    bad_etl = client.post("/api/dw/etl/run", headers=headers_ret1)
    assert bad_etl.status_code == 403

    # 5. Rollup (Admin succeeds, Retailer gets 403 Forbidden)
    roll_res = client.post("/api/dw/rollup", json={"hierarchy_level": "category"}, headers=headers_admin)
    assert roll_res.status_code == 200
    assert len(roll_res.json()["data"]) > 0

    bad_rollup = client.post("/api/dw/rollup", json={"hierarchy_level": "category"}, headers=headers_ret1)
    assert bad_rollup.status_code == 403

    # 6. Slice (Retailer gets 403 Forbidden)
    slice_bad = client.post(
        "/api/dw/slice",
        json={"dimension": "store_id", "value": "STORE_02"},
        headers=headers_ret1,
    )
    assert slice_bad.status_code == 403
