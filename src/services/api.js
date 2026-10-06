const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Robust fetch wrapper with timeout and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const api = {
  /**
   * Health check / summary
   */
  async getDatasetSummary() {
    return apiFetch('/dataset/summary');
  },

  /**
   * List available products / stores
   */
  async getProducts() {
    return apiFetch('/products');
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
};
