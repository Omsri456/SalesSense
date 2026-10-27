import pytest
from fastapi.testclient import TestClient
from app.main import app
import app.services.accuracy_service as accuracy_service

client = TestClient(app)


def _get_admin_token() -> str:
    res = client.post("/api/auth/login", json={
        "email": "admin@salessense.com",
        "password": "Password123!",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_no_fabricated_baseline_accuracy_generator_remains():
    """Verify that generate_baseline_accuracy_history was completely removed."""
    assert not hasattr(accuracy_service, "generate_baseline_accuracy_history")


def test_tournament_retraining_persists_real_accuracy_history():
    """
    Test running the tournament twice for the same store/product and asserting
    that get_accuracy_history returns two real, distinct records reflecting
    the two actual runs — not six fabricated weekly entries.
    """
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Reset in-memory and on-disk test entries for clean isolation
    import os
    accuracy_service._ACCURACY_HISTORY_ENTRIES.clear()
    if os.path.exists(accuracy_service.ACCURACY_CACHE_FILE):
        try:
            os.remove(accuracy_service.ACCURACY_CACHE_FILE)
        except Exception:
            pass

    # 1. First Tournament Run
    res1 = client.post(
        "/api/models/retrain?store_id=STORE_01&product_id=all",
        headers=headers,
    )
    assert res1.status_code == 200, res1.text
    retrain1 = res1.json()
    assert "champion_model" in retrain1

    # 2. Second Tournament Run
    res2 = client.post(
        "/api/models/retrain?store_id=STORE_01&product_id=all",
        headers=headers,
    )
    assert res2.status_code == 200, res2.text

    # 3. Fetch accuracy history
    hist_res = client.get(
        "/api/forecast/accuracy-history/STORE_01/all",
        headers=headers,
    )
    assert hist_res.status_code == 200, hist_res.text
    hist_data = hist_res.json()

    # Must reflect exactly the 2 real runs, NOT 6 fabricated entries
    assert hist_data["total_evaluation_windows"] == 2
    assert len(hist_data["history"]) == 2
    assert hist_data["status"] == "active_history"

    run1 = hist_data["history"][0]
    run2 = hist_data["history"][1]

    # Both must have valid IDs, timestamps, and model evaluations
    assert run1["id"] != run2["id"]
    assert "Tournament Run #1" in run1["window"]
    assert "Tournament Run #2" in run2["window"]
    assert run1["champion_model"] is not None
    assert run2["champion_model"] is not None
    assert run1["champion_wmape"] > 0
    assert run2["champion_wmape"] > 0
    assert "SARIMA" in run1["models"]
    assert "Prophet" in run1["models"]
    assert any("LSTM" in k for k in run1["models"].keys())
