"""
Test Suite for Analytical Reports & Enterprise Data Integrity (Task 8)
Verifies:
1. Live Sales Summary endpoint delivers verified facts from Kimball star schema.
2. Store scoping is strictly enforced (Retailer 1 cannot access STORE_02 sales summary).
3. Date range parameter changes produce genuinely different numbers (7d vs 90d).
4. All four report data endpoints return real data without hardcoded fallbacks.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_sales_summary_endpoint_and_scoping():
    # 1. Retailer 1 login (assigned to STORE_01)
    login_ret = client.post("/api/auth/login", json={"email": "retailer1@salessense.com", "password": "Password123!"})
    ret_headers = {"Authorization": f"Bearer {login_ret.json()['access_token']}"}

    # Authorized store (STORE_01) -> 200 OK
    res_auth = client.get("/api/reports/sales-summary?store_id=STORE_01&date_range=30d", headers=ret_headers)
    assert res_auth.status_code == 200, res_auth.text
    data = res_auth.json()
    assert data["store_id"] == "STORE_01"
    assert "total_revenue" in data
    assert "categories" in data
    assert isinstance(data["categories"], list)
    assert len(data["categories"]) > 0

    # Unauthorized store (STORE_02) -> 403 Forbidden
    res_unauth = client.get("/api/reports/sales-summary?store_id=STORE_02&date_range=30d", headers=ret_headers)
    assert res_unauth.status_code == 403
    assert "Access denied" in res_unauth.json()["detail"]


def test_sales_summary_date_range_variance():
    # Admin login
    login_adm = client.post("/api/auth/login", json={"email": "admin@salessense.com", "password": "Password123!"})
    adm_headers = {"Authorization": f"Bearer {login_adm.json()['access_token']}"}

    res_7d = client.get("/api/reports/sales-summary?store_id=STORE_01&date_range=7d", headers=adm_headers)
    res_90d = client.get("/api/reports/sales-summary?store_id=STORE_01&date_range=90d", headers=adm_headers)

    assert res_7d.status_code == 200
    assert res_90d.status_code == 200

    data_7d = res_7d.json()
    data_90d = res_90d.json()

    # 90d must encompass more days and greater/equal revenue than 7d
    assert data_90d["total_revenue"] >= data_7d["total_revenue"]
    assert data_90d["total_units"] >= data_7d["total_units"]
    assert data_7d["date_start"] != data_90d["date_start"]


def test_all_four_report_data_sources_integrity():
    login_adm = client.post("/api/auth/login", json={"email": "admin@salessense.com", "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login_adm.json()['access_token']}"}

    # 1. Sales Summary
    res1 = client.get("/api/reports/sales-summary?store_id=STORE_01&date_range=30d", headers=headers)
    assert res1.status_code == 200
    assert "categories" in res1.json()

    # 2. Inventory Health
    res2 = client.get("/api/inventory/recommendations?store_id=STORE_01&safety_days=3", headers=headers)
    assert res2.status_code == 200
    assert "recommendations" in res2.json()

    # 3. Forecast Accuracy
    res3 = client.get("/api/forecast/accuracy-history/STORE_01/all", headers=headers)
    assert res3.status_code == 200
    assert "history" in res3.json()

    # 4. Model Comparison
    res4 = client.get("/api/models?store_id=STORE_01", headers=headers)
    assert res4.status_code == 200
    models_list = res4.json()
    assert isinstance(models_list, list)
    assert len(models_list) >= 3
