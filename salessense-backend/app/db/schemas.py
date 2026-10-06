from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ModelMetrics(BaseModel):
    r2: float = Field(..., description="Coefficient of determination R^2")
    rmse: float = Field(..., description="Root Mean Squared Error")
    wmape: float = Field(..., description="Weighted Mean Absolute Percentage Error")
    mae: Optional[float] = None
    accuracy: Optional[float] = None


class ForecastDataPoint(BaseModel):
    month: str
    predicted: int
    low: int
    high: int


class HistoricalDataPoint(BaseModel):
    month: str
    sales: int


class ChartDataPoint(BaseModel):
    month: str
    actual: Optional[int] = None
    forecast: Optional[int] = None
    low: Optional[int] = None
    high: Optional[int] = None


class BestModelDetails(BaseModel):
    id: str
    name: str
    type: str
    metrics: ModelMetrics
    reason: str
    hyperparameters: Optional[Dict[str, Any]] = None


class ModelSummary(BaseModel):
    id: str
    name: str
    type: str
    description: str
    metrics: ModelMetrics
    status: str
    trainedAt: str
    hyperparameters: Optional[Dict[str, Any]] = None


class ForecastResponse(BaseModel):
    store_id: str
    product_id: str
    horizon_days: int
    confidence: float
    growthPct: float
    totalPredicted: int
    best_model: BestModelDetails
    all_models: List[ModelSummary]
    chartData: List[ChartDataPoint]
    forecast: List[ForecastDataPoint]


class ForecastRequest(BaseModel):
    store_id: str = "STORE_01"
    product_id: str = "all"
    horizon_days: int = 90


class ProductItem(BaseModel):
    value: str
    label: str
    category: str
    currentStock: int
    reorderPoint: int
    unitCost: float
    safetyStock: int
    leadTimeDays: int
    store_id: Optional[str] = "STORE_01"


class DatasetSummary(BaseModel):
    dataset_name: str
    total_series: int
    total_rows: int
    date_range_start: str
    date_range_end: str
    status: str
    columns: List[str]
