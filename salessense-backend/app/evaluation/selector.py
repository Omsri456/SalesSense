from typing import List, Dict, Any


def select_best_model(model_evaluations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Selects the champion (best) model from evaluated models.
    Primary criteria: Lowest wMAPE.
    Tie-breaker: Lowest RMSE.
    """
    if not model_evaluations:
        raise ValueError("No models provided for evaluation.")

    sorted_models = sorted(
        model_evaluations,
        key=lambda m: (m["metrics"]["wmape"], m["metrics"]["rmse"])
    )

    champion = sorted_models[0]
    reason = (
        f"Selected as champion due to lowest wMAPE ({champion['metrics']['wmape']:.3f}) "
        f"and lowest RMSE ({champion['metrics']['rmse']}) on chronological holdout validation."
    )

    return {
        "champion": champion,
        "reason": reason,
        "all_ranked": sorted_models,
    }
