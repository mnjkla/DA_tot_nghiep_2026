const BASE_URL = ''

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`
    throw new Error(errorMsg)
  }

  return data
}

export const api = {
  // 1. Dashboard Stats
  getDashboardStats: () => request('/api/dashboard/stats'),

  // 2. Production Module
  getProducts: () => request('/api/products'),
  getBOM: (productId) => request(`/api/bom/${productId}`),
  getMaterials: () => request('/api/materials'),
  getProductionOrders: () => request('/api/production-orders'),
  createProductionOrder: (data) =>
    request('/api/production-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  startProductionOrder: (orderId) =>
    request(`/api/production-orders/${orderId}/start`, {
      method: 'POST',
    }),
  completeProductionOrder: (orderId) =>
    request(`/api/production-orders/${orderId}/complete`, {
      method: 'POST',
    }),

  // 3. Sales & Inventory Module
  getCustomers: () => request('/api/customers'),
  getFinishedGoods: () => request('/api/inventory/finished-goods'),
  getSalesOrders: () => request('/api/sales-orders'),
  createSalesOrder: (data) =>
    request('/api/sales-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchSalesOrder: (orderId) =>
    request(`/api/sales-orders/${orderId}/dispatch`, {
      method: 'POST',
    }),

  // 4. AI Copilot Integration
  askAIChat: (question) =>
    request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
}
