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


def test_inventory_recommendations_auth_required():
    """Unauthenticated access to recommendations must return 401."""
    res = client.get("/api/inventory/recommendations?store_id=STORE_01")
    assert res.status_code == 401


def test_inventory_recommendations_admin_success():
    """Admin can query inventory recommendations for any store."""
    token = _get_token("admin@salessense.com")
    res = client.get(
        "/api/inventory/recommendations?store_id=STORE_01&safety_days=3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["store_id"] == "STORE_01"
    assert "summary" in data
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0

    summary = data["summary"]
    assert "total_skus" in summary
    assert "critical_count" in summary
    assert "low_stock_count" in summary
    assert "healthy_count" in summary
    assert "expiry_risk_count" in summary
    assert "total_waste_risk_cost" in summary


def test_inventory_recommendations_store_scope_enforcement():
    """Retailer 1 (assigned to STORE_01) gets 403 Forbidden when requesting STORE_02."""
    token = _get_token("retailer1@salessense.com")

    # Allowed store
    res_ok = client.get(
        "/api/inventory/recommendations?store_id=STORE_01",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_ok.status_code == 200

    # Unauthorized store
    res_forbidden = client.get(
        "/api/inventory/recommendations?store_id=STORE_02",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_forbidden.status_code == 403


def test_inventory_perishable_quantity_cap_and_expiry_risk():
    """Verify perishable order caps and expiry risk calculations."""
    token = _get_token("admin@salessense.com")
    res = client.get(
        "/api/inventory/recommendations?store_id=STORE_01&safety_days=5",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    items = res.json()["recommendations"]

    perishables = [x for x in items if x["is_perishable"]]
    assert len(perishables) > 0, "Expected at least one perishable SKU in the recommendations"

    for p in perishables:
        # 1. Perishable shelf life must be <= 7 days
        assert p["shelf_life_days"] <= 7

        # 2. Perishable safety buffer cap
        assert p["effective_buffer_days"] <= max(1, int(p["shelf_life_days"] * 0.3))

        # 3. Replenishment Cap: Suggested order must NEVER cause stock to exceed what can sell before expiring
        max_sellable = p["daily_demand"] * p["shelf_life_days"]
        current = p["current_stock"]
        suggested = p["suggested_order_qty"]

        # If order is placed, current + suggested should not exceed max sellable (modulo floor rounding)
        if suggested > 0:
            assert current + suggested <= max_sellable + 1.0

        # 4. If days_of_cover > shelf_life_days, it must be flagged as expiry risk with waste risk > 0
        if p["days_of_cover"] > p["shelf_life_days"]:
            assert p["is_expiry_risk"] is True
            assert p["status"] == "expiry_risk"
            assert p["waste_risk_units"] > 0
            assert p["waste_risk_cost"] > 0
