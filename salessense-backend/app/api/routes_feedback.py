"""
Retailer Operational Feedback & Event Ingestion API
Enables store managers (retailers) to submit operational ground-truth feedback:
1. 'confirmed_reorder': Confirm that a replenishment order was dispatched.
2. 'report_stock_count': Report physical stock counts from store inventory cycle checks.
3. 'flag_inaccurate_forecast': Flag model prediction discrepancies for ML engineers.
Surfaced to Admins and ML Engineers for model monitoring and closed-loop inventory governance.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_role, verify_store_access
from app.db.mongo import get_db

logger = logging.getLogger("salessense.api.feedback")
router = APIRouter(prefix="/retailer", tags=["Retailer Feedback"])

FEEDBACK_CACHE_FILE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data_cache", "retailer_feedback.json"
)

# In-memory storage for low latency & test isolation
_FEEDBACK_ENTRIES: List[Dict[str, Any]] = []


def _load_persisted_feedback() -> List[Dict[str, Any]]:
    global _FEEDBACK_ENTRIES
    if _FEEDBACK_ENTRIES:
        return _FEEDBACK_ENTRIES
    if os.path.exists(FEEDBACK_CACHE_FILE):
        try:
            with open(FEEDBACK_CACHE_FILE, "r", encoding="utf-8") as f:
                _FEEDBACK_ENTRIES = json.load(f)
        except Exception as e:
            logger.warning("Could not read feedback cache file: %s", e)
            _FEEDBACK_ENTRIES = []
    return _FEEDBACK_ENTRIES


def _save_feedback_entry(entry: Dict[str, Any]):
    global _FEEDBACK_ENTRIES
    _FEEDBACK_ENTRIES.insert(0, entry)
    try:
        os.makedirs(os.path.dirname(FEEDBACK_CACHE_FILE), exist_ok=True)
        with open(FEEDBACK_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_FEEDBACK_ENTRIES, f, indent=2)
    except Exception as e:
        logger.warning("Could not persist feedback cache file: %s", e)

    # Also persist to Mongo if connected
    try:
        db = get_db()
        if db is not None:
            db["retailer_feedback"].insert_one(dict(entry))
    except Exception as e:
        logger.debug("Mongo feedback write skipped: %s", e)


class RetailerFeedbackRequest(BaseModel):
    store_id: str = Field(..., description="Target Store ID (e.g. STORE_01)")
    product_id: Optional[str] = Field(None, description="Optional SKU ID (e.g. SKU-1001)")
    feedback_type: str = Field(
        ...,
        description="One of: 'confirmed_reorder', 'report_stock_count', 'flag_inaccurate_forecast'",
    )
    actual_stock: Optional[int] = Field(None, description="Physical stock counted by retailer")
    reorder_quantity: Optional[int] = Field(None, description="Replenishment quantity confirmed")
    notes: Optional[str] = Field(None, max_length=500, description="Optional retailer contextual notes")


class RetailerFeedbackResponse(BaseModel):
    id: str
    timestamp: str
    store_id: str
    product_id: Optional[str] = None
    feedback_type: str
    actual_stock: Optional[int] = None
    reorder_quantity: Optional[int] = None
    notes: Optional[str] = None
    user_id: str
    user_email: str
    user_name: str


@router.post("/feedback", response_model=RetailerFeedbackResponse)
async def submit_retailer_feedback(
    body: RetailerFeedbackRequest,
    current_user: Dict[str, Any] = Depends(require_role(["retailer", "admin", "ml_engineer"])),
):
    """
    Submits retailer ground-truth feedback.
    Enforces store data scope: Retailers can only submit feedback for their assigned stores.
    """
    await verify_store_access(body.store_id, current_user)

    valid_types = {"confirmed_reorder", "report_stock_count", "flag_inaccurate_forecast"}
    if body.feedback_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feedback_type '{body.feedback_type}'. Must be one of: {list(valid_types)}",
        )

    entry = {
        "id": f"fb-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "store_id": body.store_id,
        "product_id": body.product_id,
        "feedback_type": body.feedback_type,
        "actual_stock": body.actual_stock,
        "reorder_quantity": body.reorder_quantity,
        "notes": body.notes,
        "user_id": str(current_user.get("id", "unknown")),
        "user_email": str(current_user.get("email", "unknown")),
        "user_name": str(current_user.get("name", "Store Manager")),
    }

    _save_feedback_entry(entry)
    logger.info("Retailer feedback %s registered for %s by %s", entry["id"], body.store_id, entry["user_email"])
    return RetailerFeedbackResponse(**entry)


@router.get("/feedback", response_model=List[RetailerFeedbackResponse])
async def list_retailer_feedback(
    store_id: Optional[str] = Query(None, description="Optional store filter"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieves submitted feedback entries.
    Admins & ML Engineers can inspect all stores.
    Retailers can only view entries belonging to their assigned store scopes.
    """
    entries = _load_persisted_feedback()
    role = current_user.get("role", "retailer")
    assigned = current_user.get("assigned_stores", [])

    if role == "retailer" and "*" not in assigned:
        if store_id:
            await verify_store_access(store_id, current_user)
            filtered = [e for e in entries if e.get("store_id") == store_id]
        else:
            filtered = [e for e in entries if e.get("store_id") in assigned]
    else:
        if store_id and store_id != "all":
            filtered = [e for e in entries if e.get("store_id") == store_id]
        else:
            filtered = entries

    return [RetailerFeedbackResponse(**e) for e in filtered]
