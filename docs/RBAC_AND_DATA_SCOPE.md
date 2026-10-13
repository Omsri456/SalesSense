# SalesSense — Role-Based Access Control (RBAC) & Data Scope Specification

**Document Version:** 1.0  
**Status:** Implemented & Verified  
**Date:** October 2026

---

## 1. Principles of Security Architecture

SalesSense enforces a strict separation between **System Roles** (what operations a user can perform) and **Data Scopes** (which retail stores or regions a user is authorized to analyze).

```
+----------------------------------------------------------------------------------------------------+
|                                    RBAC & DATA SCOPE ARCHITECTURE                                  |
|                                                                                                    |
|                 User Identity (JWT Token: sub, email, role, stores)                                |
|                                         │                                                          |
|                    +--------------------+--------------------+                                     |
|                    |                                         |                                     |
|                    ▼                                         ▼                                     |
|           ROLE AUTHORIZATION                         DATA SCOPE BOUNDARY                           |
|       (require_role: Capabilities)               (verify_store_access: Facilities)                 |
|                    │                                         │                                     |
|     ┌──────────────┼──────────────┐                          │                                     |
|     ▼              ▼              ▼                          │                                     |
|  Retailer     ML Engineer       Admin                        │                                     |
|  - Inventory  - Backtests     - User Provisioning            │                                     |
|  - Forecasts  - Experiments   - Role Assignment              ▼                                     |
|  - ROP Alerts - Ingestion     - Store Mapping         Assigned Stores                              |
|  - Reorders   - Telemetry     - Audit Logs        (e.g., STORE_01 only vs. '*')                    |
+----------------------------------------------------------------------------------------------------+
```

### Core Security Invariants
1. **Zero Client Trust:** Neither client-supplied roles nor frontend route flags are trusted. Every incoming request must present a valid, signed HS256 JWT Bearer token.
2. **Immutability of Privileges:** The self-service endpoint `PUT /api/auth/profile` accepts *only* display name updates. Role modifications submitted in request payloads are rejected, completely mitigating privilege escalation vulnerabilities (CWE-269).
3. **Data Scope Isolation:** A Retailer assigned to `STORE_01` cannot read, forecast, or aggregate data from `STORE_02`. Cross-store access attempts return HTTP 403 Forbidden.
4. **Platform Governance:** Only users possessing the `admin` role can manage user accounts, assign roles, define store scopes, and inspect security audit logs.

---

## 2. Role Specifications & Matrix

| System Capability | Retailer (Business User) | ML Engineer (Data Specialist) | Admin (Governance) |
| :--- | :---: | :---: | :---: |
| **Inspect Assigned Stores** | Yes (Scoped) | Yes (Global) | Yes (Global) |
| **Forecast Generation** | Yes (Scoped) | Yes (Global) | Yes (Global) |
| **Stockout & ROP Reorders** | Yes (Scoped) | Yes (Global) | Yes (Global) |
| **Model Tournament Comparison** | Yes (Summary view) | Yes (Full telemetry) | Yes (Full telemetry) |
| **Dataset Ingestion & ETL** | No | Yes | Yes |
| **Model Retraining & Experiments**| No | Yes | Yes |
| **User Provisioning & Roles** | No | No | Yes |
| **Store Scope Assignment** | No | No | Yes |
| **Security Audit Logs** | No | No | Yes |

### 2.1 Retailer — Business Decision-Maker
- **Focus:** Preventing inventory loss, mitigating stockouts, and automating replenishment.
- **Scope:** Restricted exclusively to assigned stores (e.g. `["STORE_01"]`).
- **Access Rule:** Requests with mismatched `store_id` parameter are blocked by backend middleware (`verify_store_access`).

### 2.2 ML Engineer — Data and Model Specialist
- **Focus:** Dataset quality, feature engineering, multi-model tournaments (SARIMA, Prophet, BiLSTM), backtesting holdouts, and model promotion.
- **Scope:** Platform-wide analytical scope (`["*"]`), without user administration rights.

### 2.3 Admin — Platform Governance
- **Focus:** User lifecycle management, store directory catalog, credential governance, and security audit log inspection.
- **Scope:** Unrestricted administrative scope.

---

## 3. Seed Accounts for Testing & Evaluation

The system initializes default credentials upon startup for evaluation:

| Email | Default Password | Role | Assigned Store Scope |
| :--- | :--- | :--- | :--- |
| `admin@salessense.com` | `Password123!` | `admin` | `["*"]` (Global) |
| `retailer1@salessense.com` | `Password123!` | `retailer` | `["STORE_01"]` |
| `retailer2@salessense.com` | `Password123!` | `retailer` | `["STORE_02"]` |
| `mle@salessense.com` | `Password123!` | `ml_engineer` | `["*"]` (Global) |

---

## 4. Backend Middleware Implementation

### 4.1 Dependency Injection in `app/api/deps.py`
```python
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    # Validates Bearer token, decodes JWT, verifies user active status

def require_role(allowed_roles: List[str]):
    # Enforces role membership; raises HTTP 403 Forbidden if not authorized

async def verify_store_access(store_id: str, current_user = Depends(get_current_user)) -> str:
    # Enforces that user is permitted to view the requested store_id
```

### 4.2 Security Audit Logging
Every authentication, role alteration, and user provisioning event is recorded with timestamp, actor email, target resource, and action type:
- `USER_LOGIN`
- `USER_REGISTER`
- `UPDATE_USER_ROLE`
- `UPDATE_USER_STORES`
- `TOGGLE_USER_STATUS`

---

*End of RBAC & Data Scope Specification.*
