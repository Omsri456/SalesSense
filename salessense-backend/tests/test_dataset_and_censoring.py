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
    stats = ingestion_service.compute_dynamic_statistics()
    assert stats["total_rows"] == 61320
    assert stats["unique_stores"] == 2
    assert stats["unique_products"] == 6
    assert stats["total_store_product_series"] == 12
    assert stats["stockout_affected_count"] > 0
    assert 5.0 <= stats["censoring_rate_pct"] <= 15.0  # ~9% simulated stockout days
    assert "2025" in stats["date_range_start"]
    assert "2025" in stats["date_range_end"]


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
    res = client.get("/api/dataset/summary", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_rows"] == 61320
    assert data["total_series"] == 12
    assert data["unique_stores"] == 2
    assert data["unique_products"] == 6
    assert data["stockout_affected_count"] > 0
    assert data["censoring_rate_pct"] > 0


def test_api_censoring_summary_endpoint(auth_headers):
    """Verify that GET /api/dataset/censoring-summary provides research-aligned stockout analysis."""
    res = client.get("/api/dataset/censoring-summary", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_records"] == 61320
    assert data["stockout_affected_records"] > 0
    assert data["total_estimated_demand"] > data["total_observed_sales"]
    assert data["total_lost_sales_estimate"] > 0
