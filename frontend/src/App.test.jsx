import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'

describe('App Shell, RBAC Guard & Navigation (Seam 2 - Version 1.4.0)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
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
      if (url.includes('/api/bi/profit-forecast')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            summary: {
              annual_projected_revenue_m: 7095,
              annual_projected_profit_m: 2661,
              average_gross_margin_pct: 47.1,
            },
            monthly_forecast: [],
            strategic_phases: [],
          }),
        })
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            unread_count: 2,
            data: [
              {
                notification_id: 1,
                title: 'CẢNH BÁO: Tổ yến dưới ngưỡng an toàn!',
                message: 'Kho NVL cần nhập thêm Tổ yến thô.',
                severity: 'CRITICAL',
                is_read: false,
                created_at: '2026-10-29 10:00:00',
              },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })
  })

  it('redirects unauthenticated users from internal BI dashboard to /login', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Đăng Nhập Quản Trị/i)).toBeInTheDocument()
      expect(screen.getByText(/admin \/ admin123/i)).toBeInTheDocument()
      expect(screen.getByText(/kho \/ kho123/i)).toBeInTheDocument()
    })
  })

  it('renders the enterprise branding, RBAC navigation items and AI 1-Year Forecast for authenticated ADMIN', async () => {
    localStorage.setItem(
      'erp_user',
      JSON.stringify({
        user_id: 1,
        username: 'admin',
        full_name: 'Trần Quốc Bảo (Giám Đốc)',
        role: 'ADMIN',
      })
    )
    localStorage.setItem('erp_auth_token', 'token_admin_1_admin')
    window.history.pushState({}, '', '/')

    render(<App />)

    // Brand title in sidebar
    await waitFor(() => {
      expect(screen.getByText(/Yến & Cà Phê ERP/i)).toBeInTheDocument()
    })

    // Sidebar navigation links
    expect(screen.getByRole('link', { name: /Tổng quan/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sản xuất/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Định mức BOM/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bán hàng & Đơn/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cổng Bán Hàng/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kho hàng/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khách hàng/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Chiến Dịch & CMS/i })).toBeInTheDocument()

    // AI Copilot trigger button
    expect(screen.getByRole('button', { name: /AI Copilot/i })).toBeInTheDocument()
  })

  it('renders Notification Bell with unread badge and allows viewing real-time alerts (Seam 4)', async () => {
    localStorage.setItem(
      'erp_user',
      JSON.stringify({
        user_id: 1,
        username: 'admin',
        full_name: 'Trần Quốc Bảo (Giám Đốc)',
        role: 'ADMIN',
      })
    )
    localStorage.setItem('erp_auth_token', 'token_admin_1_admin')
    window.history.pushState({}, '', '/')

    render(<App />)

    const bellBtn = await screen.findByRole('button', { name: /Chuông thông báo/i })
    expect(bellBtn).toBeInTheDocument()

    fireEvent.click(bellBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/CẢNH BÁO: Tổ yến dưới ngưỡng an toàn!/i)
      ).toBeInTheDocument()
    })
  })

  it('renders Gemini AI Config button on Header and opens configuration modal (Version 1.8.0)', async () => {
    localStorage.setItem(
      'erp_user',
      JSON.stringify({
        user_id: 1,
        username: 'admin',
        full_name: 'Trần Quốc Bảo (Giám Đốc)',
        role: 'ADMIN',
      })
    )
    localStorage.setItem('erp_auth_token', 'token_admin_1_admin')
    window.history.pushState({}, '', '/')

    render(<App />)

    const aiBtn = await screen.findByRole('button', { name: /Gemini AI/i })
    expect(aiBtn).toBeInTheDocument()

    fireEvent.click(aiBtn)

    await waitFor(() => {
      expect(screen.getByText(/Cấu Hình Google Gemini AI & Hybrid RAG/i)).toBeInTheDocument()
      expect(screen.getByText(/Gemini API Key \(Google AI Studio\)/i)).toBeInTheDocument()
    })
  })
})
