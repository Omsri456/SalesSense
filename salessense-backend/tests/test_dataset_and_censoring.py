import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.data.ingestion_service import ingestion_service
from app.services.censored_demand_service import censored_demand_service

client = TestClient(app)


@pytest.fixture
def auth_headers():
    res = client.post("/api/auth/login", json={
        "email": "admin@salessense.com",
        "password": "Password123!",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_dataset_columns_and_schema():
    """Verify that the loaded active dataset contains all genuine FreshRetailNet-50K factors."""
    df = ingestion_service.load_active_dataset()
    assert not df.empty, "Dataset must not be empty"

    required_factors = [
        "timestamp", "dt", "store_id", "city_id", "product_id", "category",
        "management_group_id", "first_category_id", "second_category_id", "third_category_id",
        "sale_amount", "unit_price", "discount", "holiday_flag", "activity_flag",
        "stock_hour6_22_cnt", "is_stockout_affected",
        "precpt", "avg_temperature", "avg_humidity", "avg_wind_level",
    ]

    for col in required_factors:
        assert col in df.columns, f"Required FreshRetailNet-50K column '{col}' is missing"


def test_dynamic_statistics_calculation():
    """Verify dynamic dataset statistics calculation without hardcoding."""
    df = ingestion_service.load_active_dataset()
    stats = ingestion_service.compute_dynamic_statistics()
    assert stats["total_rows"] == len(df)
    assert stats["unique_stores"] == df["store_id"].nunique()
    assert stats["unique_products"] == df["product_id"].nunique()
    assert stats["stockout_affected_count"] > 0
    assert stats["censoring_rate_pct"] > 0
    assert stats["date_range_start"] != "N/A"
    assert stats["date_range_end"] != "N/A"


def test_censored_demand_recovery_algorithm():
    """Verify mathematical distinction between observed sales and latent recovered demand."""
    sample_data = pd.DataFrame([
        {
            "timestamp": "2025-06-01T12:00:00",
            "dt": "2025-06-01",
            "store_id": "STORE_01",
            "product_id": "SKU-ORG-01",
            "category": "Produce",
            "sale_amount": 10.0,
            "stock_hour6_22_cnt": 16,  # In-stock all day
        },
        {
            "timestamp": "2025-06-02T12:00:00",
            "dt": "2025-06-02",
            "store_id": "STORE_01",
            "product_id": "SKU-ORG-01",
            "category": "Produce",
            "sale_amount": 6.0,
            "stock_hour6_22_cnt": 8,   # 8 hours stockout (half-day loss)
        },
    ])

    recovered = censored_demand_service.estimate_latent_demand(sample_data)

    # 1. First record (full stock): observed sales equals latent demand
    row1 = recovered.iloc[0]
    assert not row1["is_censored"]
    assert row1["estimated_latent_demand"] == 10.0
    assert row1["lost_sales_estimate"] == 0.0
    assert row1["recovery_confidence"] == 1.0

    # 2. Second record (stockout): latent demand > observed sales
    row2 = recovered.iloc[1]
    assert row2["is_censored"]
    assert row2["estimated_latent_demand"] > row2["observed_sales"]
    assert row2["lost_sales_estimate"] > 0.0
    assert row2["recovery_confidence"] < 1.0


def test_api_dataset_summary_endpoint(auth_headers):
    """Verify that GET /api/dataset/summary returns authentic dynamic statistics."""
    df = ingestion_service.load_active_dataset()
    res = client.get("/api/dataset/summary", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_rows"] == len(df)
    assert data["unique_stores"] == df["store_id"].nunique()
    assert data["unique_products"] == df["product_id"].nunique()
    assert data["stockout_affected_count"] > 0
    assert data["censoring_rate_pct"] > 0


def test_api_censoring_summary_endpoint(auth_headers):
    """Verify that GET /api/dataset/censoring-summary provides research-aligned stockout analysis."""
    df = ingestion_service.load_active_dataset()
    res = client.get("/api/dataset/censoring-summary", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_records"] == len(df)
    assert data["stockout_affected_records"] > 0
    assert data["total_estimated_demand"] > data["total_observed_sales"]
    assert data["total_lost_sales_estimate"] > 0


def test_dataset_upload_cache_invalidation_and_product_list_change(auth_headers):
    """
    Verify Task 2: Uploading a new dataset forces warehouse rebuild and model cache invalidation,
    causing warehouse metadata and product lists to change immediately.
    """
    import io
    from app.dw.dimensional_model import dw_engine
    from app.api.routes_models import _MODEL_CACHE

    # 1. Capture original dataset and populate model cache with stale entry
    orig_df = ingestion_service.load_active_dataset().copy()
    _MODEL_CACHE["test_key"] = {"stale": True}

    # 2. Build a valid custom dataset with a distinct SKU
    custom_rows = []
    for day in range(1, 15):
        custom_rows.append({
            "timestamp": f"2025-01-{day:02d}T08:00:00",
            "dt": f"2025-01-{day:02d}",
            "store_id": "STORE_01",
            "city_id": "CITY_NORTH",
            "product_id": "SKU-CUSTOM-NEW-01",
            "category": "Produce",
            "management_group_id": 1,
            "first_category_id": 101,
            "second_category_id": 1101,
            "third_category_id": 11001,
            "sale_amount": 25.0,
            "unit_price": 3.99,
            "discount": 0.0,
            "holiday_flag": 0,
            "activity_flag": 0,
            "stock_hour6_22_cnt": 16,
            "is_stockout_affected": False,
            "precpt": 0.0,
            "avg_temperature": 22.0,
            "avg_humidity": 55.0,
            "avg_wind_level": 2.0,
        })
    custom_df = pd.DataFrame(custom_rows)
    csv_bytes = io.BytesIO()
    custom_df.to_csv(csv_bytes, index=False)

    try:
        # 3. Post to /api/dataset/upload
        res = client.post(
            "/api/dataset/upload",
            files={"file": ("custom_dataset.csv", csv_bytes.getvalue(), "text/csv")},
            headers=auth_headers,
        )
        assert res.status_code == 200, res.text
        assert "Warehouse and model cache re-synchronized" in res.json()["message"]

        # 4. Assert model cache was cleared
        assert "test_key" not in _MODEL_CACHE

        # 5. Assert warehouse reflects new fact count
        meta = dw_engine.get_warehouse_metadata()
        assert meta["total_facts"] == len(custom_rows)

        # 6. Assert /api/products returns the new product list immediately
        prod_res = client.get("/api/products", headers=auth_headers)
        assert prod_res.status_code == 200
        prods = [p["value"] for p in prod_res.json()]
        assert "SKU-CUSTOM-NEW-01" in prods
    finally:
        # Restore original dataset and warehouse
        ingestion_service.save_dataset(orig_df, source_provenance="freshretailnet_subset.csv")
        dw_engine.build_warehouse(force_rebuild=True)

