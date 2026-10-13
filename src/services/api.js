const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Robust fetch wrapper with automatic JWT Bearer authentication, timeout, and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const api = {
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

  async rebuildWarehouse() {
    return apiFetch('/dw/rebuild', { method: 'POST' });
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

  async getAnomalies(storeId = '', productId = '', zThreshold = 2.5, rollingWindow = 7) {
    let url = `/mining/anomalies?z_threshold=${zThreshold}&rolling_window=${rollingWindow}`;
    if (storeId) url += `&store_id=${storeId}`;
    if (productId) url += `&product_id=${productId}`;
    return apiFetch(url);
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
