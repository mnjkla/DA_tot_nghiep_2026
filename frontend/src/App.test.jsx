import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

describe('App Shell & Navigation (Seam 2)', () => {
  beforeEach(() => {
    // Mock API calls so App mount does not fail
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            monthly_revenue: 485000000,
            finished_goods_count: 1250,
            raw_bird_nest_stock: 4500,
            active_production_orders: 2,
            database_engine: 'SQLITE',
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })
  })

  it('renders the enterprise branding and navigation items', async () => {
    render(<App />)

    // Brand title in sidebar
    await waitFor(() => {
      expect(screen.getByText(/Yến & Cà Phê ERP/i)).toBeInTheDocument()
    })

    // Sidebar navigation links
    expect(screen.getByRole('link', { name: /Tổng quan/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sản xuất/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Định mức BOM/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bán hàng/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kho hàng/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khách hàng/i })).toBeInTheDocument()

    // AI Copilot trigger button
    expect(screen.getByRole('button', { name: /AI Copilot/i })).toBeInTheDocument()
  })
})
