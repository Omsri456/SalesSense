import numpy as np
from typing import Dict


def calculate_wmape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Weighted Mean Absolute Percentage Error (wMAPE):
    wMAPE = sum(|y_true - y_pred|) / sum(y_true)
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    total_actual = np.sum(np.abs(y_true))
    if total_actual == 0:
        return 0.0

    return float(np.sum(np.abs(y_true - y_pred)) / total_actual)


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculates R^2, RMSE, wMAPE, and MAE matching the evaluation specification.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    # MAE
    mae = float(np.mean(np.abs(y_true - y_pred)))

    # RMSE
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

    # wMAPE
    wmape = calculate_wmape(y_true, y_pred)

    # R^2
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    if ss_tot == 0:
        r2 = 1.0 if ss_res == 0 else 0.0
    else:
        r2 = float(1.0 - (ss_res / ss_tot))

    # Accuracy proxy (percentage):
    accuracy = float(max(0.0, min(100.0, (1.0 - wmape) * 100)))

    return {
        "r2": round(r2, 4),
        "rmse": round(rmse, 2),
        "wmape": round(wmape, 4),
        "mae": round(mae, 2),
        "accuracy": round(accuracy, 1),
    }
