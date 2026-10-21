"""
SQLAlchemy Relational Models for Kimball Dimensional Data Warehouse
Defines Star Schema dimensional tables, fact tables, and ETL audit logging:
- DimDate: Calendar & cyclical dimensions
- DimStore: Store locations, tiers, regions (Dynamic)
- DimProduct: Product hierarchy, categories, prices (Dynamic)
- DimStockout: Censoring durations & severity classifications
- DimPromotion: Promotional campaign & activity metadata
- FactDailySales: Daily observed sales and model-estimated latent demand at grain (Store x Product x Day)
- FactForecast: Model forecasts at grain (Store x Product x Target Date x Horizon x Model)
- EtlRun: Execution audit trail for data provenance and ETL reconciliation
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.dw.db import Base


class DimDate(Base):
    __tablename__ = "dim_date"

    date_key = Column(Integer, primary_key=True)  # YYYYMMDD
    full_date = Column(String(10), nullable=False, unique=True, index=True)  # YYYY-MM-DD
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    day_name = Column(String(15), nullable=False)
    day_of_month = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False, index=True)
    month_name = Column(String(15), nullable=False)
    quarter = Column(Integer, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    is_weekend = Column(Boolean, nullable=False, default=False)
    holiday_flag = Column(Integer, nullable=False, default=0)

    # Relationships
    daily_sales = relationship("FactDailySales", back_populates="dim_date")
    forecasts = relationship("FactForecast", back_populates="dim_date")


class DimStore(Base):
    __tablename__ = "dim_store"

    store_key = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(String(50), nullable=False, unique=True, index=True)
    store_name = Column(String(100), nullable=False)
    city_id = Column(String(50), nullable=True)
    region_name = Column(String(100), nullable=True)
    store_tier = Column(String(50), nullable=True)

    # Relationships
    daily_sales = relationship("FactDailySales", back_populates="dim_store")
    forecasts = relationship("FactForecast", back_populates="dim_store")


class DimProduct(Base):
    __tablename__ = "dim_product"

    product_key = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), nullable=False, unique=True, index=True)
    product_name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    management_group_id = Column(Integer, nullable=True)
    first_category_id = Column(Integer, nullable=True)
    second_category_id = Column(Integer, nullable=True)
    third_category_id = Column(Integer, nullable=True)
    unit_price = Column(Float, nullable=False, default=1.0)
    unit_cost = Column(Float, nullable=True)

    # Relationships
    daily_sales = relationship("FactDailySales", back_populates="dim_product")
    forecasts = relationship("FactForecast", back_populates="dim_product")


class DimStockout(Base):
    __tablename__ = "dim_stockout"

    stockout_key = Column(Integer, primary_key=True)
    stock_hour6_22_cnt = Column(Integer, nullable=False, unique=True, index=True)  # 0 to 16
    in_stock_hours = Column(Integer, nullable=False)
    stockout_hours = Column(Integer, nullable=False)
    is_censored = Column(Boolean, nullable=False, default=False)
    severity_label = Column(String(50), nullable=False)

    # Relationships
    daily_sales = relationship("FactDailySales", back_populates="dim_stockout")


class DimPromotion(Base):
    __tablename__ = "dim_promotion"

    promotion_key = Column(Integer, primary_key=True, autoincrement=True)
    promotion_code = Column(String(50), nullable=False, unique=True, index=True)
    promotion_name = Column(String(100), nullable=False)
    discount_rate = Column(Float, nullable=False, default=0.0)
    activity_flag = Column(Integer, nullable=False, default=0)
    is_holiday = Column(Integer, nullable=False, default=0)

    # Relationships
    daily_sales = relationship("FactDailySales", back_populates="dim_promotion")


class FactDailySales(Base):
    """
    Grain: One row per (store, product, date)
    Additive measures: observed_sales, gross_revenue, estimated_latent_demand, lost_sales_estimate, lost_revenue_estimate
    """
    __tablename__ = "fact_daily_sales"

    fact_id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign Keys
    store_key = Column(Integer, ForeignKey("dim_store.store_key"), nullable=False, index=True)
    product_key = Column(Integer, ForeignKey("dim_product.product_key"), nullable=False, index=True)
    date_key = Column(Integer, ForeignKey("dim_date.date_key"), nullable=False, index=True)
    stockout_key = Column(Integer, ForeignKey("dim_stockout.stockout_key"), nullable=False, index=True)
    promotion_key = Column(Integer, ForeignKey("dim_promotion.promotion_key"), nullable=True)

    # Natural IDs for trace and fast direct querying
    store_id = Column(String(50), nullable=False, index=True)
    product_id = Column(String(50), nullable=False, index=True)
    date_str = Column(String(10), nullable=False, index=True)

    # Additive Measures
    observed_sales = Column(Float, nullable=False, default=0.0)
    gross_revenue = Column(Float, nullable=False, default=0.0)
    unit_price = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)

    # Model-Estimated Latent Demand (Clearly kept distinct from observed sales)
    estimated_latent_demand = Column(Float, nullable=False, default=0.0)
    lost_sales_estimate = Column(Float, nullable=False, default=0.0)
    lost_revenue_estimate = Column(Float, nullable=False, default=0.0)
    recovery_confidence = Column(Float, nullable=False, default=1.0)
    estimation_method = Column(String(50), nullable=False, default="Tobit-Empirical-Rate")

    # Contextual & Stockout Attributes
    stock_hour6_22_cnt = Column(Integer, nullable=False, default=16)
    is_stockout_affected = Column(Integer, nullable=False, default=0)
    precpt = Column(Float, nullable=False, default=0.0)
    avg_temperature = Column(Float, nullable=False, default=20.0)
    avg_humidity = Column(Float, nullable=False, default=65.0)
    avg_wind_level = Column(Float, nullable=False, default=2.0)

    # Relationships
    dim_store = relationship("DimStore", back_populates="daily_sales")
    dim_product = relationship("DimProduct", back_populates="daily_sales")
    dim_date = relationship("DimDate", back_populates="daily_sales")
    dim_stockout = relationship("DimStockout", back_populates="daily_sales")
    dim_promotion = relationship("DimPromotion", back_populates="daily_sales")

    __table_args__ = (
        UniqueConstraint("store_key", "product_key", "date_key", name="uq_store_product_date"),
        Index("idx_fact_sales_scope", "store_id", "date_str"),
    )


class FactForecast(Base):
    """
    Grain: One row per (store, product, target_date, horizon, model_version)
    Stores model-generated predictions alongside actual facts for forecast evaluation.
    """
    __tablename__ = "fact_forecast"

    forecast_fact_id = Column(Integer, primary_key=True, autoincrement=True)

    store_key = Column(Integer, ForeignKey("dim_store.store_key"), nullable=False, index=True)
    product_key = Column(Integer, ForeignKey("dim_product.product_key"), nullable=False, index=True)
    date_key = Column(Integer, ForeignKey("dim_date.date_key"), nullable=False, index=True)

    store_id = Column(String(50), nullable=False, index=True)
    product_id = Column(String(50), nullable=False, index=True)
    forecast_date_str = Column(String(10), nullable=False, index=True)

    forecast_sales = Column(Float, nullable=False, default=0.0)
    lower_bound = Column(Float, nullable=False, default=0.0)
    upper_bound = Column(Float, nullable=False, default=0.0)
    horizon_days = Column(Integer, nullable=False, default=30)
    model_name = Column(String(50), nullable=False)
    model_version = Column(String(50), nullable=False, default="v1.0")
    generated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    dim_store = relationship("DimStore", back_populates="forecasts")
    dim_product = relationship("DimProduct", back_populates="forecasts")
    dim_date = relationship("DimDate", back_populates="forecasts")

    __table_args__ = (
        Index("idx_fact_forecast_scope", "store_id", "product_id", "forecast_date_str"),
    )


class EtlRun(Base):
    """
    Audit log tracking Extract-Transform-Load executions.
    Provides complete provenance, reconciliation, and auditability for evaluators.
    """
    __tablename__ = "etl_runs"

    run_id = Column(String(36), primary_key=True)
    run_timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    dataset_name = Column(String(100), nullable=False)
    source_identifier = Column(String(255), nullable=False)
    dataset_mode = Column(String(50), nullable=False)  # authentic, derived_subset, synthetic_benchmark

    rows_extracted = Column(Integer, nullable=False, default=0)
    rows_accepted = Column(Integer, nullable=False, default=0)
    rows_rejected = Column(Integer, nullable=False, default=0)
    rows_inserted = Column(Integer, nullable=False, default=0)
    facts_created = Column(Integer, nullable=False, default=0)

    stores_loaded = Column(Integer, nullable=False, default=0)
    products_loaded = Column(Integer, nullable=False, default=0)
    dates_loaded = Column(Integer, nullable=False, default=0)

    validation_failures = Column(Text, nullable=True)  # JSON string
    status = Column(String(20), nullable=False, default="SUCCESS")  # SUCCESS, FAILED
    error_details = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=False, default=0)
