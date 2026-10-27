"""
Accuracy Service
Tracks real historical tournament forecast accuracy over time (FR-14).
Stores timestamped backtest evaluation records in MongoDB and local data cache.
No fabricated or simulated baseline metrics.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.db.mongo import get_db

logger = logging.getLogger("salessense.accuracy")

ACCURACY_CACHE_FILE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data_cache", "accuracy_history.json"
)

_ACCURACY_HISTORY_ENTRIES: List[Dict[str, Any]] = []


def _load_persisted_accuracy_history() -> List[Dict[str, Any]]:
    global _ACCURACY_HISTORY_ENTRIES
    if _ACCURACY_HISTORY_ENTRIES:
        return _ACCURACY_HISTORY_ENTRIES
    if os.path.exists(ACCURACY_CACHE_FILE):
        try:
            with open(ACCURACY_CACHE_FILE, "r", encoding="utf-8") as f:
                _ACCURACY_HISTORY_ENTRIES = json.load(f)
        except Exception as e:
            logger.warning("Could not read accuracy history cache: %s", e)
            _ACCURACY_HISTORY_ENTRIES = []
    return _ACCURACY_HISTORY_ENTRIES


def record_tournament_run(
    store_id: str,
    product_id: str,
    champion_name: str,
    champion_metrics: Dict[str, Any],
    model_summaries: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Persist an authentic tournament run result into the accuracy history.
    """
    global _ACCURACY_HISTORY_ENTRIES
    history = _load_persisted_accuracy_history()

    now_utc = datetime.now(timezone.utc)
    eval_timestamp = now_utc.strftime("%Y-%m-%d %H:%M:%S")
    eval_date = now_utc.strftime("%Y-%m-%d")

    matching = [
        r for r in history
        if r.get("store_id") == str(store_id) and r.get("product_id") == str(product_id)
    ]
    run_num = len(matching) + 1
    window_label = f"Tournament Run #{run_num} ({eval_timestamp})"

    models_perf = {}
    for m in model_summaries:
        m_name = m.get("name") if isinstance(m, dict) else getattr(m, "name", "Model")
        m_metrics = m.get("metrics") if isinstance(m, dict) else getattr(m, "metrics", {})
        if hasattr(m_metrics, "model_dump"):
            m_metrics = m_metrics.model_dump()
        elif hasattr(m_metrics, "dict"):
            m_metrics = m_metrics.dict()

        models_perf[m_name] = {
            "wmape": round(float(m_metrics.get("wmape", 0.0)), 4),
            "rmse": round(float(m_metrics.get("rmse", 0.0)), 2),
            "r2": round(float(m_metrics.get("r2", 0.0)), 4),
            "mae": round(float(m_metrics.get("mae", 0.0)), 2),
        }

    entry = {
        "id": str(uuid.uuid4()),
        "window": window_label,
        "evaluation_date": eval_date,
        "evaluation_timestamp": eval_timestamp,
        "store_id": str(store_id),
        "product_id": str(product_id),
        "champion_model": champion_name,
        "champion_wmape": round(float(champion_metrics.get("wmape", 0.0)), 4),
        "champion_rmse": round(float(champion_metrics.get("rmse", 0.0)), 2),
        "champion_r2": round(float(champion_metrics.get("r2", 0.0)), 4),
        "champion_mae": round(float(champion_metrics.get("mae", 0.0)), 2),
        "models": models_perf,
    }

    _ACCURACY_HISTORY_ENTRIES.append(entry)

    # Persist to local JSON file
    try:
        os.makedirs(os.path.dirname(ACCURACY_CACHE_FILE), exist_ok=True)
        with open(ACCURACY_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_ACCURACY_HISTORY_ENTRIES, f, indent=2)
    except Exception as e:
        logger.warning("Could not persist accuracy history to file: %s", e)

    # Persist to MongoDB if available
    try:
        db = get_db()
        if db is not None:
            db.accuracy_history.insert_one(entry.copy())
    except Exception as e:
        logger.warning("Could not insert accuracy record to MongoDB: %s", e)

    logger.info("Recorded real accuracy history entry for %s/%s (run #%d)", store_id, product_id, run_num)
    return entry


async def get_accuracy_history(store_id: str, product_id: str) -> Dict[str, Any]:
    """
    Retrieve historical forecast accuracy tracked over real tournament runs (FR-14).
    Returns real persisted records only; reports insufficient history if no runs exist.
    """
    db = get_db()
    records = []

    if db is not None:
        try:
            query = {"store_id": str(store_id)}
            if product_id != "all":
                query["product_id"] = str(product_id)
            cursor = db.accuracy_history.find(query).sort("evaluation_timestamp", 1)
            records = await cursor.to_list(length=100)
            for r in records:
                if "_id" in r:
                    r["_id"] = str(r["_id"])
        except Exception as e:
            logger.warning("MongoDB error fetching accuracy history: %s", e)

    if not records:
        all_entries = _load_persisted_accuracy_history()
        records = [
            r for r in all_entries
            if r.get("store_id") == str(store_id) and (product_id == "all" or r.get("product_id") in [str(product_id), "all"])
        ]

    if not records:
        return {
            "store_id": str(store_id),
            "product_id": str(product_id),
            "series_id": f"store_{store_id}_prod_{product_id}",
            "total_evaluation_windows": 0,
            "recent_champion": "N/A",
            "recent_wmape": None,
            "accuracy_improvement_pct": 0.0,
            "status": "insufficient_history",
            "message": "Insufficient run history yet. Historical tracking accumulates as tournaments are evaluated.",
            "history": [],
        }

    # Compute overall trends across authentic records
    recent_wmape = records[-1]["champion_wmape"]
    earliest_wmape = records[0]["champion_wmape"]
    improvement_pct = round(((earliest_wmape - recent_wmape) / max(0.0001, earliest_wmape)) * 100, 1) if len(records) > 1 else 0.0

    return {
        "store_id": str(store_id),
        "product_id": str(product_id),
        "series_id": f"store_{store_id}_prod_{product_id}",
        "total_evaluation_windows": len(records),
        "recent_champion": records[-1]["champion_model"],
        "recent_wmape": recent_wmape,
        "accuracy_improvement_pct": improvement_pct,
        "status": "active_history",
        "message": f"Real accuracy tracked across {len(records)} tournament run(s).",
        "history": records,
    }
