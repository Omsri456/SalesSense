"""
Model Registry
Maps model identifiers to their respective classes and provides a unified factory.
"""

from typing import Dict, Type, List
from app.models.base import BaseForecastModel
from app.models.sarima_model import SarimaForecastModel
from app.models.prophet_model import ProphetForecastModel
from app.models.lstm_model import LSTMForecastModel

MODEL_REGISTRY: Dict[str, Type[BaseForecastModel]] = {
    "SARIMA": SarimaForecastModel,
    "Prophet": ProphetForecastModel,
    "LSTM": LSTMForecastModel,
}


def get_model_class(name: str) -> Type[BaseForecastModel]:
    key = name.upper()
    for reg_key, cls in MODEL_REGISTRY.items():
        if reg_key.upper() == key:
            return cls
    raise ValueError(f"Unknown model '{name}'. Available: {list(MODEL_REGISTRY.keys())}")


def get_all_models() -> List[BaseForecastModel]:
    """Returns instances of all registered models."""
    return [
        SarimaForecastModel(),
        ProphetForecastModel(),
        LSTMForecastModel(),
    ]
