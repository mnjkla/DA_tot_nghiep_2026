import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from './api.js'

describe('API Service Layer (Seam 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getDashboardStats fetches data from /api/dashboard/stats', async () => {
    const mockData = {
      monthly_revenue: 485000000.0,
      finished_goods_count: 1250,
      raw_bird_nest_stock: 4500.0,
      active_production_orders: 2,
      database_engine: 'SQLITE'
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    })

    const result = await api.getDashboardStats()
    expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/stats', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' })
    }))
    expect(result).toEqual(mockData)
  })

  it('createProductionOrder posts payload to /api/production-orders', async () => {
    const payload = { product_id: 1, target_quantity: 500, notes: 'Lô thử nghiệm' }
    const mockResponse = { message: 'Tạo lệnh sản xuất thành công', order_code: 'PO-2026-1001', id: 5 }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await api.createProductionOrder(payload)
    expect(global.fetch).toHaveBeenCalledWith('/api/production-orders', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload)
    }))
    expect(result).toEqual(mockResponse)
  })

  it('startProductionOrder posts to /api/production-orders/:id/start', async () => {
    const mockResponse = { message: 'Đã bắt đầu sản xuất' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await api.startProductionOrder(10)
    expect(global.fetch).toHaveBeenCalledWith('/api/production-orders/10/start', expect.objectContaining({
      method: 'POST'
    }))
    expect(result).toEqual(mockResponse)
  })

  it('askAIChat posts question to /api/ai/chat and returns answer', async () => {
    const mockResponse = { answer: 'Tồn kho còn 100 lọ', question: 'Tồn kho yến lọ' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await api.askAIChat('Tồn kho yến lọ')
    expect(global.fetch).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ question: 'Tồn kho yến lọ' })
    }))
    expect(result).toEqual(mockResponse)
  })

  it('throws descriptive error when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Chỉ lệnh PENDING mới có thể bắt đầu' })
    })

    await expect(api.startProductionOrder(99)).rejects.toThrow('Chỉ lệnh PENDING mới có thể bắt đầu')
  })
})
