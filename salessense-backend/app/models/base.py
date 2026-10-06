from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from app.evaluation.metrics import calculate_metrics


class BaseForecastModel(ABC):
    """
    Standard interface for all SalesSense forecasting models (SARIMA, Prophet, LSTM).
    Ensures plug-and-play capability and consistent evaluation.
    """

    def __init__(self, name: str, model_type: str):
        self.name = name
        self.model_type = model_type
        self.is_fitted = False
        self.hyperparameters: Dict[str, Any] = {}

    @abstractmethod
    def fit(self, train_series: pd.Series) -> None:
        """
        Fit model on univariate or feature-augmented historical series.
        """
        pass

    @abstractmethod
    def predict(self, steps: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate point forecasts and confidence bounds.
        Returns: (point_forecasts, lower_bounds, upper_bounds)
        """
        pass

    def evaluate(self, test_series: pd.Series) -> Dict[str, float]:
        """
        Evaluate model against holdout ground truth using standard metrics.
        """
        if not self.is_fitted:
            raise RuntimeError(f"Model {self.name} must be fitted before evaluation.")

        preds, _, _ = self.predict(steps=len(test_series))
        return calculate_metrics(test_series.values, preds)
