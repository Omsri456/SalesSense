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
