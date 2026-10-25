import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_login_admin():
    """Admin login yields valid token with admin role and global scope."""
    res = client.post("/api/auth/login", json={
        "email": "admin@salessense.com",
        "password": "Password123!",
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert "*" in data["user"]["assigned_stores"]


def test_auth_login_retailer():
    """Retailer 1 login yields retailer role and STORE_01 scope."""
    res = client.post("/api/auth/login", json={
        "email": "retailer1@salessense.com",
        "password": "Password123!",
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["role"] == "retailer"
    assert "STORE_01" in data["user"]["assigned_stores"]


def test_privilege_escalation_prevented():
    """Verify that updating profile cannot change user role to admin (CWE-269 mitigation)."""
    # 1. Login as retailer
    login_res = client.post("/api/auth/login", json={
        "email": "retailer1@salessense.com",
        "password": "Password123!",
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Attempt to update profile name
    update_res = client.put(
        "/api/auth/profile",
        json={"name": "Retailer New Name"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Retailer New Name"
    assert update_res.json()["role"] == "retailer"  # Must stay retailer!

    # 3. Attempt crafted payload trying to elevate role
    crafted_res = client.put(
        "/api/auth/profile",
        json={"name": "Attacker", "role": "admin"},
        headers=headers,
    )
    # The server accepts name but strictly ignores/does not elevate role
    assert crafted_res.status_code == 200
    assert crafted_res.json()["role"] == "retailer"


def test_cross_store_data_scope_rejection():
    """Verify that Retailer 1 (assigned to STORE_01) cannot access STORE_02 forecast."""
    # 1. Login as Retailer 1
    login_res = client.post("/api/auth/login", json={
        "email": "retailer1@salessense.com",
        "password": "Password123!",
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Access authorized store (STORE_01)
    auth_store_res = client.get("/api/forecast/STORE_01/all?horizon_days=30", headers=headers)
    assert auth_store_res.status_code == 200

    # 3. Access UNAUTHORIZED store (STORE_02) -> must return 403 Forbidden!
    unauth_store_res = client.get("/api/forecast/STORE_02/all?horizon_days=30", headers=headers)
    assert unauth_store_res.status_code == 403
    assert "Access denied" in unauth_store_res.json()["detail"]


def test_admin_user_management_access():
    """Verify that only Admin can access /api/admin/users, while Retailer is rejected."""
    # 1. Retailer attempt -> 403 Forbidden
    login_ret = client.post("/api/auth/login", json={
        "email": "retailer1@salessense.com",
        "password": "Password123!",
    })
    ret_token = login_ret.json()["access_token"]
    ret_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {ret_token}"})
    assert ret_res.status_code == 403

    # 2. Admin attempt -> 200 OK
    login_adm = client.post("/api/auth/login", json={
        "email": "admin@salessense.com",
        "password": "Password123!",
    })
    adm_token = login_adm.json()["access_token"]
    adm_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {adm_token}"})
    assert adm_res.status_code == 200
    users = adm_res.json()
    assert len(users) >= 4


def test_dw_and_mining_role_restrictions():
    """Verify DW and Mining endpoints strictly enforce 403 for retailer and ml_engineer, while admin succeeds."""
    login_ret = client.post("/api/auth/login", json={"email": "retailer1@salessense.com", "password": "Password123!"})
    ret_headers = {"Authorization": f"Bearer {login_ret.json()['access_token']}"}

    login_ml = client.post("/api/auth/login", json={"email": "mle@salessense.com", "password": "Password123!"})
    ml_headers = {"Authorization": f"Bearer {login_ml.json()['access_token']}"}

    login_adm = client.post("/api/auth/login", json={"email": "admin@salessense.com", "password": "Password123!"})
    adm_headers = {"Authorization": f"Bearer {login_adm.json()['access_token']}"}

    # 1. Retailer gets 403 on DW & Mining
    assert client.get("/api/dw/metadata", headers=ret_headers).status_code == 403
    assert client.get("/api/dw/schema", headers=ret_headers).status_code == 403
    assert client.post("/api/dw/rollup", json={"hierarchy_level": "category"}, headers=ret_headers).status_code == 403
    assert client.get("/api/mining/market-basket", headers=ret_headers).status_code == 403
    assert client.get("/api/mining/demand-clusters", headers=ret_headers).status_code == 403

    # 2. ML Engineer gets 403 on DW & Mining
    assert client.get("/api/dw/metadata", headers=ml_headers).status_code == 403
    assert client.get("/api/dw/schema", headers=ml_headers).status_code == 403
    assert client.post("/api/dw/rollup", json={"hierarchy_level": "category"}, headers=ml_headers).status_code == 403
    assert client.get("/api/mining/market-basket", headers=ml_headers).status_code == 403

    # 3. Admin gets 200
    assert client.get("/api/dw/metadata", headers=adm_headers).status_code == 200
    assert client.get("/api/dw/schema", headers=adm_headers).status_code == 200
    assert client.get("/api/mining/market-basket", headers=adm_headers).status_code == 200
