import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _get_token(email: str = "admin@salessense.com") -> str:
    res = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_dashboard_insights_auth_required():
    """Unauthenticated access must return 401."""
    res = client.get("/api/dashboard/insights?store_id=STORE_01")
    assert res.status_code == 401


def test_dashboard_insights_admin_success():
    """Admin receives authentic KPIs, tournament champions, and dynamic feeds."""
    token = _get_token("admin@salessense.com")
    res = client.get(
        "/api/dashboard/insights?store_id=STORE_01&sku=all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["has_data"] is True
    assert data["store_id"] == "STORE_01"
    assert len(data["kpis"]) == 4

    kpi_ids = [k["id"] for k in data["kpis"]]
    assert "gross_revenue" in kpi_ids
    assert "lost_revenue" in kpi_ids
    assert "champion_model" in kpi_ids
    assert "waste_risk" in kpi_ids

    # Dynamic feeds
    assert "what_changed" in data
    assert len(data["what_changed"]) > 0
    assert "upcoming_alerts" in data


def test_dashboard_insights_retailer_scope_enforcement():
    """Retailer 1 (assigned to STORE_01) gets 403 when requesting STORE_02."""
    token = _get_token("retailer1@salessense.com")

    # Allowed store
    res_ok = client.get(
        "/api/dashboard/insights?store_id=STORE_01&sku=all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_ok.status_code == 200

    # Cross-store forbidden
    res_forbidden = client.get(
        "/api/dashboard/insights?store_id=STORE_02&sku=all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_forbidden.status_code == 403


def test_dashboard_insights_empty_store_state():
    """Requesting an unknown store returns empty state structure without throwing 500."""
    token = _get_token("admin@salessense.com")
    res = client.get(
        "/api/dashboard/insights?store_id=NON_EXISTENT_STORE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is False
    assert "message" in data


def test_dashboard_heatmap():
    """Verify Hour x Weekday heatmap distribution endpoint."""
    token = _get_token("admin@salessense.com")
    res = client.get(
        "/api/dashboard/heatmap?store_id=STORE_01",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "cells" in data
    assert len(data["cells"]) == 7 * 17  # 7 days x 17 operating hours (6 to 22)
    assert data["operating_hours"] == "06:00 - 22:00"

    first_cell = data["cells"][0]
    assert "day" in first_cell
    assert "hour" in first_cell
    assert "units_avg" in first_cell
    assert "stockout_rate" in first_cell


def test_dashboard_category_trends():
    """Verify 14-day category sparkline trend endpoint."""
    token = _get_token("admin@salessense.com")
    res = client.get(
        "/api/dashboard/category-trends?store_id=STORE_01",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "categories" in data
    assert len(data["categories"]) > 0

    first_cat = data["categories"][0]
    assert "category" in first_cat
    assert "total_revenue" in first_cat
    assert "trend_14d" in first_cat
    assert "shelf_life_days" in first_cat
    assert "is_perishable" in first_cat
    assert "lead_time_days" in first_cat


def test_dashboard_hierarchy_aggregation():
    """Verify Kimball star schema hierarchy drilldown endpoint across all levels."""
    token = _get_token("admin@salessense.com")

    # 1. Category level
    res_cat = client.get(
        "/api/dashboard/hierarchy?store_id=STORE_01&level=category",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_cat.status_code == 200, res_cat.text
    data_cat = res_cat.json()
    assert data_cat["level"] == "category"
    assert "items" in data_cat
    assert len(data_cat["items"]) > 0

    first_item = data_cat["items"][0]
    assert "id" in first_item
    assert "name" in first_item
    assert "total_revenue" in first_item
    assert "observed_sales" in first_item
    assert "skus" in first_item
    assert isinstance(first_item["skus"], list)
    assert len(first_item["skus"]) > 0

    # 2. Group level (management_group_id)
    res_group = client.get(
        "/api/dashboard/hierarchy?store_id=STORE_01&level=group",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_group.status_code == 200
    assert res_group.json()["level"] == "group"

    # 3. Subcategory level (second_category_id)
    res_sub = client.get(
        "/api/dashboard/hierarchy?store_id=STORE_01&level=subcategory",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_sub.status_code == 200
    assert res_sub.json()["level"] == "subcategory"

    # 4. Scope enforcement for retailer
    ret_token = _get_token("retailer1@salessense.com")
    res_ret_forbidden = client.get(
        "/api/dashboard/hierarchy?store_id=STORE_02&level=category",
        headers={"Authorization": f"Bearer {ret_token}"},
    )
    assert res_ret_forbidden.status_code == 403

