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
    unique_stores: Optional[int] = None
    unique_products: Optional[int] = None
    stockout_affected_count: Optional[int] = None
    censoring_rate_pct: Optional[float] = None


class CensoringSummary(BaseModel):
    total_records: int
    stockout_affected_records: int
    censoring_rate_pct: float
    total_observed_sales: float
    total_estimated_demand: float
    total_lost_sales_estimate: float
    average_recovery_confidence: float




# --- Role-Based Access Control (RBAC) & Scope Schemas ---

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool = True
    assigned_stores: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="retailer")
    assigned_stores: List[str] = Field(default_factory=lambda: ["STORE_01"])


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="retailer, ml_engineer, or admin")


class UserStoresUpdateRequest(BaseModel):
    assigned_stores: List[str] = Field(..., description="List of store IDs or ['*'] for global scope")


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class StoreScopeItem(BaseModel):
    store_id: str
    city_id: Optional[str] = None
    region_name: Optional[str] = None
    store_name: str
    is_active: bool = True


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    user_id: str
    user_email: str
    action: str
    resource: str
    details: Optional[Dict[str, Any]] = None

