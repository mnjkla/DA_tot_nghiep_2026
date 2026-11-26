const BASE_URL = ''

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const token = localStorage.getItem('erp_auth_token')
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
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
  // 0. Auth & RBAC Module
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: (token) => request(`/api/auth/me?token=${token}`),
  getUsers: () => request('/api/auth/users'),

  // 1. Dashboard & AI 1-Year Profit Forecast
  getDashboardStats: () => request('/api/dashboard/stats'),
  getProfitForecast: () => request('/api/bi/profit-forecast'),
  executeAIStrategy: (phaseCode) =>
    request('/api/bi/execute-strategy', {
      method: 'POST',
      body: JSON.stringify({ phase_code: phaseCode }),
    }),

  // 2. Production, Catalog CRUD & 2-Step Warehouse Requisition Module
  getProducts: () => request('/api/products'),
  createProduct: (data) =>
    request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (productId, data) =>
    request(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getBOM: (productId) => request(`/api/bom/${productId}`),
  getMaterials: () => request('/api/materials'),
  getMaterialReceipts: () => request('/api/materials/receipts'),
  importMaterialStock: (data) =>
    request('/api/materials/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProductionOrders: () => request('/api/production-orders'),
  createProductionOrder: (data) =>
    request('/api/production-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  requestMaterialsForPO: (orderId) =>
    request(`/api/production-orders/${orderId}/request-materials`, {
      method: 'POST',
    }),
  getMaterialRequisitions: () => request('/api/material-requisitions'),
  approveMaterialRequisition: (reqId, approvedBy = 'kho (Nguyễn Văn Kho - Trưởng Kho)') =>
    request(`/api/material-requisitions/${reqId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
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

  // 4. AI Copilot Integration & Gemini RAG Config (Version 1.8.0)
  askAIChat: (question) =>
    request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  getAIConfig: () => request('/api/system/ai-config'),
  updateAIConfig: (apiKey, model = 'gemini-1.5-flash') =>
    request('/api/system/ai-config', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey, model }),
    }),

  // 5. Storefront B2B/B2C Commerce & Geo-Personalization Module
  getStoreProducts: (region = 'ALL') =>
    request(region && region !== 'ALL' ? `/api/store/products?region=${region}` : '/api/store/products'),
  getStoreProductDetail: (productId, region = 'ALL') =>
    request(`/api/store/products/${productId}/detail?region=${encodeURIComponent(region || 'ALL')}`),
  createProductReview: (productId, reviewData) =>
    request(`/api/store/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),
  saveCustomerProfile: (profileData) =>
    request('/api/store/customer-profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }),
  verifyAgent: (agentCode) =>
    request('/api/store/verify-agent', {
      method: 'POST',
      body: JSON.stringify({ agent_code: agentCode }),
    }),
  calculatePricing: (items, agentCode = null) =>
    request('/api/store/calculate-pricing', {
      method: 'POST',
      body: JSON.stringify({ items, agent_code: agentCode }),
    }),
  storeCheckout: (orderData) =>
    request('/api/store/checkout', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  askStoreAIChat: (message, customerType = 'RETAIL') =>
    request('/api/store/ai-sales-chat', {
      method: 'POST',
      body: JSON.stringify({ message, customer_type: customerType }),
    }),
  askStoreSalesChat: (message, customerType = 'RETAIL') =>
    request('/api/store/ai-sales-chat', {
      method: 'POST',
      body: JSON.stringify({ message, customer_type: customerType }),
    }),

  // 6. Admin CMS & Marketing Campaigns (Flash Sale & Video Showcase)
  getCampaigns: (region = 'ALL', activeOnly = false) =>
    request(`/api/campaigns?region=${region}&active_only=${activeOnly}`),
  createCampaign: (data) =>
    request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleCampaign: (campaignId) =>
    request(`/api/campaigns/${campaignId}/toggle`, {
      method: 'PUT',
    }),
  deleteCampaign: (campaignId) =>
    request(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
    }),

  // 7. Version 1.5.0: n8n Automation, Tax Excel/CSV Export-Import & Cloud Image Manager
  getN8nStatus: () => request('/api/n8n/status'),
  triggerN8nWorkflow: (workflowId, action = 'MANUAL_SYNC') =>
    request('/api/n8n/trigger', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: workflowId, action }),
    }),
  getN8nWorkflowDownloadUrl: (workflowId) =>
    `${BASE_URL}/api/n8n/workflows/${workflowId}/download`,

  getTaxReportSummary: (period = 'ALL', vatRate = 8) =>
    request(`/api/reports/tax-summary?period=${period}&vat_rate=${vatRate}`),
  getTaxExportUrl: (
    period = 'ALL',
    vatRate = 8,
    format = 'xlsx',
    sheet = '01_Bang_Ke_Thue_Dau_Ra'
  ) =>
    `${BASE_URL}/api/reports/tax-export?period=${period}&vat_rate=${vatRate}&format=${format}&sheet=${sheet}`,
  getImportTemplateUrl: (target = 'MATERIALS', format = 'xlsx') =>
    `${BASE_URL}/api/data/import-template?target=${target}&format=${format}`,
  importTabularFile: (data) =>
    request('/api/data/import-file', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCloudImages: () => request('/api/cloud-images'),
  uploadCloudImage: (data) =>
    request('/api/cloud-images/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 8. Version 1.6.0: Real-Time Notification Bell, Customer Debt Settlement & Web Load Benchmark
  getNotifications: () => request('/api/notifications'),
  markNotificationsRead: (notificationId = null, markAll = true) =>
    request('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_id: notificationId, mark_all: markAll }),
    }),
  settleCustomerDebt: (customerId, data) =>
    request(`/api/customers/${customerId}/settle-debt`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  runLoadBenchmark: (concurrentUsers = 20, totalRequests = 100) =>
    request('/api/system/load-test', {
      method: 'POST',
      body: JSON.stringify({
        concurrent_users: concurrentUsers,
        total_requests: totalRequests,
      }),
    }),

  // 9. Version 1.9.0: Xưởng Sản Xuất, Công Nhân & Phân Phối Đại Lý Thực Dụng
  getWorkshops: () => request('/api/production/workshops'),
  createWorkshop: (data) =>
    request('/api/production/workshops', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWorkers: (workshopId = null) =>
    request('/api/production/workers' + (workshopId ? `?workshop_id=${workshopId}` : '')),
  createWorker: (data) =>
    request('/api/production/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWorkShifts: () => request('/api/production/shifts'),
  assignWorkersToOrder: (orderId, data) =>
    request(`/api/production/orders/${orderId}/assign-workers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getOrderWorkers: (orderId) => request(`/api/production/orders/${orderId}/workers`),
  autoReorderDefect: (orderId) =>
    request(`/api/production/orders/${orderId}/auto-reorder-defect`, {
      method: 'POST',
    }),
  getDealerRequests: () => request('/api/distribution/dealer-requests'),
  createDealerRequest: (data) =>
    request('/api/distribution/dealer-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkDealerRequestStock: (requestId) =>
    request(`/api/distribution/dealer-requests/${requestId}/check-stock`, {
      method: 'POST',
    }),
  approveDealerRequestDispatch: (requestId) =>
    request(`/api/distribution/dealer-requests/${requestId}/approve-dispatch`, {
      method: 'POST',
    }),
  requestDealerProductionHandoff: (requestId, data = {}) =>
    request(`/api/distribution/dealer-requests/${requestId}/request-production`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getOrderReturns: () => request('/api/distribution/returns'),
  createOrderReturn: (data) =>
    request('/api/distribution/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getInventoryExportReport: () => request('/api/inventory/report/export'),
  devSwitchRole: (targetRole) =>
    request('/api/auth/dev-switch-role', {
      method: 'POST',
      body: JSON.stringify({ target_role: targetRole }),
    }),

  // 10. Version 2.0.0: Mở rộng 3 tác nhân Giám Đốc, Kho & Quản Đốc Sản Xuất
  getSuppliers: (q = '', status = '') => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    const qs = params.toString()
    return request('/api/suppliers' + (qs ? `?${qs}` : ''))
  },
  createSupplier: (data) =>
    request('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id, data) =>
    request(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id) =>
    request(`/api/suppliers/${id}`, {
      method: 'DELETE',
    }),
  updateWorkshop: (id, data) =>
    request(`/api/production/workshops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getWorkshopHistory: (id) =>
    request(`/api/production/workshops/${id}/history`),
  updateBOM: (productId, data) =>
    request(`/api/bom/${productId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProductionOrderDetails: (id) =>
    request(`/api/production-orders/${id}/details`),
  getPendingFinishedGoods: () =>
    request('/api/inventory/pending-finished-goods'),
  receiveFinishedGoods: (data) =>
    request('/api/inventory/receive-finished-goods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCustomerFinancials: (startDate = '', endDate = '') => {
    const qs = startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''
    return request(`/api/bi/customer-financials${qs}`)
  },
  getStockDemandForecast: () =>
    request('/api/bi/stock-demand-forecast'),
  // PP_01: Chuyển đổi trạng thái kinh doanh Đang bán / Ngừng bán
  updateProductSellingStatus: (productId, isSelling) =>
    request(`/api/products/${productId}/selling-status`, {
      method: 'PUT',
      body: JSON.stringify({ is_selling: isSelling }),
    }),
  // PP_03: Chỉnh sửa thông tin hồ sơ và hạn mức công nợ khách hàng
  updateCustomer: (customerId, data) =>
    request(`/api/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  // Quản lý kho: Danh mục kho
  getWarehouses: () =>
    request('/api/warehouses'),
  createWarehouse: (data) =>
    request('/api/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateWarehouse: (id, data) =>
    request(`/api/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getWarehouseTransactions: (id) =>
    request(`/api/warehouses/${id}/transactions`),
  // Quy trình 6 bước Đại lý:
  forwardDealerRequestToWarehouse: (id) =>
    request(`/api/distribution/dealer-requests/${id}/forward-to-warehouse`, {
      method: 'POST',
    }),
  warehouseDispatchDealerRequest: (id) =>
    request(`/api/distribution/dealer-requests/${id}/warehouse-dispatch`, {
      method: 'POST',
    }),
  agentConfirmReceived: (id) =>
    request(`/api/distribution/dealer-requests/${id}/agent-confirm-received`, {
      method: 'POST',
    }),
  agentRequestReturn: (id, data) =>
    request(`/api/distribution/dealer-requests/${id}/agent-request-return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // QDSX_09: Tổng kết sản lượng sản xuất theo tháng
  getProductionMonthlySummary: () =>
    request('/api/production/monthly-summary'),
}

