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


def test_models_endpoint_returns_holdout_trajectories_and_predictions():
    """
    Verify that /api/models and /api/models/trajectories return real holdout
    evaluation trajectories overlaying actual demand with SARIMA, Prophet, and LSTM.
    """
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test /api/models
    res = client.get("/api/models?store_id=STORE_01", headers=headers)
    assert res.status_code == 200, res.text
    models = res.json()
    assert len(models) >= 3

    model_names = [m["name"] for m in models]
    assert "SARIMA" in model_names
    assert "Prophet" in model_names
    assert any("LSTM" in n for n in model_names)

    # Verify per-model holdout predictions are present and non-empty
    for m in models:
        assert m["predictions"] is not None
        assert len(m["predictions"]) > 0

    # 2. Test /api/models/trajectories
    traj_res = client.get("/api/models/trajectories?store_id=STORE_01", headers=headers)
    assert traj_res.status_code == 200, traj_res.text
    traj_data = traj_res.json()
    assert traj_data["store_id"] == "STORE_01"
    assert traj_data["champion_name"] is not None
    assert len(traj_data["trajectory"]) > 0

    # Assert holdout point schema
    first_pt = traj_data["trajectory"][0]
    assert "date" in first_pt
    assert "actual" in first_pt
    assert "sarima" in first_pt
    assert "prophet" in first_pt
    assert "lstm" in first_pt

    # Values must be computed numbers, not None
    assert isinstance(first_pt["actual"], (int, float))
    assert isinstance(first_pt["sarima"], (int, float))
    assert isinstance(first_pt["prophet"], (int, float))
    assert isinstance(first_pt["lstm"], (int, float))
