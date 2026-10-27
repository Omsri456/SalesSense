import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _get_admin_token() -> str:
    res = client.post("/api/auth/login", json={
        "email": "admin@salessense.com",
        "password": "Password123!",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_forecast_horizon_clamping_and_safety_flag():
    """
    Assert that requesting an excessive horizon (e.g. 90 or 180 days) against
    the active 97-day authentic dataset is safely clamped to ~35% of the 80%
    training window (max safe horizon ~27 days) with an explicit warning flag.
    """
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Request excessive horizon (90 days)
    res = client.get("/api/forecast/STORE_01/all?horizon_days=90", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    # Must be clamped with safety indicators
    assert data["is_clamped"] is True
    assert data["clamped_from"] == 90
    assert data["max_safe_horizon"] is not None
    assert data["max_safe_horizon"] <= 35  # ~27 days for 97-day dataset
    assert data["horizon_days"] == data["max_safe_horizon"]
    assert data["warning"] is not None
    assert "exceeds statistically safe limit" in data["warning"]
    assert data["history_days"] >= 90
    assert data["available_horizons"] is not None
    assert all(h <= data["max_safe_horizon"] for h in data["available_horizons"])


def test_forecast_horizon_safe_request_not_clamped():
    """
    Assert that requesting a safe horizon within bounds (e.g. 14 days) is honored without clamping.
    """
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/forecast/STORE_01/all?horizon_days=14", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["is_clamped"] is False
    assert data["clamped_from"] is None
    assert data["horizon_days"] == 14
    assert data["warning"] is None


def test_forecast_horizon_default_uses_max_safe():
    """
    Assert that omitting the horizon_days parameter defaults to the dynamically
    derived max_safe_horizon without an error.
    """
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/forecast/STORE_01/all", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["is_clamped"] is False
    assert data["horizon_days"] == data["max_safe_horizon"]
