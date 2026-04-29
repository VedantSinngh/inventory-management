/**
 * API Service Layer
 * Centralizes all API calls with:
 * - Automatic token injection
 * - Consistent error handling
 * - Request/response intercepting
 * - Base URL management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get authorization token from session storage
   */
  getToken() {
    return sessionStorage.getItem('token');
  }

  /**
   * Build request headers with auth token
   */
  getHeaders(additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers),
      credentials: 'include' // Include cookies for future httpOnly cookie support
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - token may be expired
      if (response.status === 401) {
        // Token expired, clear it
        sessionStorage.removeItem('token');
        // Could trigger logout or redirect to login here
        // For now, the response will bubble up to the caller
      }

      // Try to parse JSON response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // If response is not ok, throw error with data
      if (!response.ok) {
        const error = new Error(data?.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Network error or parsing error
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  delete(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE',
      ...(Object.keys(data).length > 0 && { body: JSON.stringify(data) })
    });
  }

  // ========== AUTHENTICATION ==========

  login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  register(userData) {
    return this.post('/auth/register', userData);
  }

  getCurrentUser() {
    return this.get('/auth/me');
  }

  // ========== PRODUCTS ==========

  getProducts(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({
      page,
      limit,
      ...filters
    });
    return this.get(`/products?${params}`);
  }

  getProduct(id) {
    return this.get(`/products/${id}`);
  }

  createProduct(productData) {
    return this.post('/products', productData);
  }

  updateProduct(id, productData) {
    return this.put(`/products/${id}`, productData);
  }

  deleteProduct(id, reason = '') {
    return this.delete(`/products/${id}`, { reason });
  }

  // ========== ORDERS ==========

  getOrders(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({
      page,
      limit,
      ...filters
    });
    return this.get(`/orders?${params}`);
  }

  getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  createOrder(orderData) {
    return this.post('/orders', orderData);
  }

  updateOrderStatus(id, status) {
    return this.put(`/orders/${id}`, { status });
  }

  cancelOrder(id) {
    return this.post(`/orders/${id}/cancel`, {});
  }

  // ========== WAREHOUSES ==========

  getWarehouses(page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit });
    return this.get(`/warehouses?${params}`);
  }

  getWarehouse(id) {
    return this.get(`/warehouses/${id}`);
  }

  getWarehouseStock(id) {
    return this.get(`/warehouses/${id}/stock`);
  }

  createWarehouse(warehouseData) {
    return this.post('/warehouses', warehouseData);
  }

  updateWarehouse(id, warehouseData) {
    return this.put(`/warehouses/${id}`, warehouseData);
  }

  deleteWarehouse(id, reason = '') {
    return this.delete(`/warehouses/${id}`, { reason });
  }

  // ========== AUDIT LOGS ==========

  getAuditLogs(page = 1, limit = 50, filters = {}) {
    const params = new URLSearchParams({
      page,
      limit,
      ...filters
    });
    return this.get(`/audit?${params}`);
  }

  getEntityAuditHistory(entityType, entityId) {
    return this.get(`/audit/entity/${entityType}/${entityId}`);
  }

  getAuditSummary() {
    return this.get('/audit/summary/stats');
  }

  // ========== ANALYTICS ==========

  getReorderSuggestions() {
    return this.get('/analytics/reorder-suggestions');
  }

  // ========== HEALTH ==========

  checkHealth() {
    return this.get('/health');
  }
}

// Export singleton instance
export default new APIService();

// Also export class for testing
export { APIService };
