const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Robust fetch wrapper with automatic JWT Bearer authentication, timeout, and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const timeoutMs = options.timeout ?? 60000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const token = localStorage.getItem('salessense_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData.detail || `API error ${response.status}: ${response.statusText}`;
      if (response.status === 401) {
        localStorage.removeItem('salessense_token');
        localStorage.removeItem('salessense_user');
        window.dispatchEvent(new CustomEvent('salessense:unauthorized', { detail: { message } }));
      }
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      const timeoutErr = new Error('Request timed out while computing analytics. Please try again.');
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    if (err instanceof TypeError && (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError'))) {
      const netErr = new Error('Backend server is unreachable. Please verify backend connection.');
      netErr.status = 503;
      netErr.isNetworkError = true;
      window.dispatchEvent(new CustomEvent('salessense:network-error', { detail: { message: netErr.message } }));
      throw netErr;
    }
    throw err;
  }
}

export const api = {
  /**
   * Inventory intelligence & perishable replenishment recommendations
   */
  async getInventoryRecommendations(storeId = 'STORE_01', safetyDays = 3) {
    return apiFetch(`/inventory/recommendations?store_id=${encodeURIComponent(storeId)}&safety_days=${safetyDays}`);
  },
  /**
   * Authentic dashboard insights, KPIs, and What Changed feed
   */
  async getDashboardInsights(storeId = 'STORE_01', sku = 'all') {
    return apiFetch(`/dashboard/insights?store_id=${encodeURIComponent(storeId)}&sku=${encodeURIComponent(sku)}`);
  },
  /**
   * Hour x Weekday heatmap of sales and stockout concentration
   */
  async getDashboardHeatmap(storeId = 'STORE_01') {
    return apiFetch(`/dashboard/heatmap?store_id=${encodeURIComponent(storeId)}`);
  },
  /**
   * 14-day Category sparklines and inventory posture
   */
  async getCategoryTrends(storeId = 'STORE_01') {
    return apiFetch(`/dashboard/category-trends?store_id=${encodeURIComponent(storeId)}`);
  },
  /**
   * Kimball Star Schema Hierarchy Aggregation (sku | subcategory | category | group)
   */
  async getHierarchy(storeId = 'STORE_01', level = 'category') {
    return apiFetch(`/dashboard/hierarchy?store_id=${encodeURIComponent(storeId)}&level=${encodeURIComponent(level)}`);
  },
  /**
   * Dataset summary
   */
  async getDatasetSummary() {
    return apiFetch('/dataset/summary');
  },

  /**
   * List available products scoped to user permissions
   */
  async getProducts() {
    return apiFetch('/products');
  },

  /**
   * Get stores authorized for current authenticated user
   */
  async getMyStores() {
    return apiFetch('/auth/my-stores');
  },

  /**
   * Update profile name (role is unchangeable by user)
   */
  async updateProfile(name) {
    return apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  /**
   * Get forecast result for a specific store and product
   */
  async getForecast(storeId, productId, horizonDays = 90) {
    return apiFetch(`/forecast/${storeId}/${productId}?horizon_days=${horizonDays}`);
  },

  /**
   * Trigger on-demand forecasting model run
   */
  async triggerForecast(data) {
    return apiFetch('/forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List models metadata & comparison
   */
  async getModels() {
    return apiFetch('/models');
  },

  /**
   * Retrain tournament models on fresh data
   */
  async retrainModels(storeId = 'STORE_01', productId = 'all') {
    return apiFetch(`/models/retrain?store_id=${storeId}&product_id=${productId}`, {
      method: 'POST',
    });
  },

  /**
   * Censoring analysis summary
   */
  async getCensoringSummary() {
    return apiFetch('/dataset/censoring-summary');
  },

  /**
   * Upload dataset file (multipart form data)
   */
  async uploadDataset(formData) {
    const token = localStorage.getItem('salessense_token');
    const response = await fetch(`${API_BASE_URL}/dataset/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed: ${response.statusText}`);
    }
    return await response.json();
  },

  // --- Data Warehouse & OLAP API ---
  async getDWMetadata() {
    return apiFetch('/dw/metadata');
  },

  async getStarSchema() {
    return apiFetch('/dw/schema');
  },

  async rebuildWarehouse() {
    return apiFetch('/dw/rebuild', { method: 'POST' });
  },

  async runETLPipeline() {
    return apiFetch('/dw/etl/run', { method: 'POST' });
  },

  async getETLRuns(limit = 10) {
    return apiFetch(`/dw/etl/runs?limit=${limit}`);
  },

  async olapRollup(hierarchyLevel, metric = 'observed_sales', filters = null) {
    return apiFetch('/dw/rollup', {
      method: 'POST',
      body: JSON.stringify({ hierarchy_level: hierarchyLevel, metric, filters }),
    });
  },

  async olapDrilldown(parentDimension, parentValue, childDimension, metric = 'observed_sales') {
    return apiFetch('/dw/drilldown', {
      method: 'POST',
      body: JSON.stringify({ parent_dimension: parentDimension, parent_value: parentValue, child_dimension: childDimension, metric }),
    });
  },

  async olapSlice(dimension, value, timeGrain = 'date_str') {
    return apiFetch('/dw/slice', {
      method: 'POST',
      body: JSON.stringify({ dimension, value, time_grain: timeGrain }),
    });
  },

  async olapDice(params) {
    return apiFetch('/dw/dice', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async olapPivot(rowDim, colDim, valMetric = 'observed_sales', aggfunc = 'sum') {
    return apiFetch('/dw/pivot', {
      method: 'POST',
      body: JSON.stringify({ row_dim: rowDim, col_dim: colDim, val_metric: valMetric, aggfunc }),
    });
  },

  // --- Retail Data Mining API ---
  async getMarketBasket(minSupport = 0.05, minConfidence = 0.2, level = 'product_name') {
    return apiFetch(`/mining/market-basket?min_support=${minSupport}&min_confidence=${minConfidence}&level=${level}`);
  },

  async getDemandClusters(nClusters = 4) {
    return apiFetch(`/mining/demand-clusters?n_clusters=${nClusters}`);
  },

  async getDemandCoMovement() {
    return apiFetch('/mining/comovement');
  },

  async getAnomalies(storeId = '', productId = '', zThreshold = 1.8, rollingWindow = 7) {
    let url = `/mining/anomalies?z_threshold=${zThreshold}&rolling_window=${rollingWindow}`;
    if (storeId) url += `&store_id=${storeId}`;
    if (productId) url += `&product_id=${productId}`;
    return apiFetch(url);
  },

  async getDecisionTree(maxDepth = 3, criterion = 'gini', targetVariable = 'stockout_risk') {
    return apiFetch(`/mining/decision-tree?max_depth=${maxDepth}&criterion=${criterion}&target_variable=${targetVariable}`);
  },

  // --- Admin Governance API ---
  async adminListUsers() {
    return apiFetch('/admin/users');
  },

  async adminCreateUser(userData) {
    return apiFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async adminUpdateUserRole(userId, role) {
    return apiFetch(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async adminUpdateUserStores(userId, assignedStores) {
    return apiFetch(`/admin/users/${userId}/stores`, {
      method: 'PUT',
      body: JSON.stringify({ assigned_stores: assignedStores }),
    });
  },

  async adminToggleUserStatus(userId, isActive) {
    return apiFetch(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async adminGetAuditLogs(limit = 50) {
    return apiFetch(`/admin/audit-logs?limit=${limit}`);
  },

  async adminGetStores() {
    return apiFetch('/admin/stores');
  },
};
