import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Sales from './Sales'
import { api } from '../services/api'

describe('Sales Module UI Flow (Seam 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders sales orders and allows dispatching an order', async () => {
    const mockOrders = [
      {
        sales_order_id: 201,
        order_code: 'SO-2026-201',
        customer_name: 'Đại lý Yến Sào Miền Nam',
        customer_type: 'AGENT',
        final_amount: 15000000,
        status: 'NEW',
        notes: 'Giao trong ngày',
      },
    ]

    vi.spyOn(api, 'getSalesOrders').mockResolvedValue({ data: mockOrders })
    vi.spyOn(api, 'getCustomers').mockResolvedValue({ data: [] })
    vi.spyOn(api, 'getProducts').mockResolvedValue({ data: [] })
    const dispatchSpy = vi.spyOn(api, 'dispatchSalesOrder').mockResolvedValue({
      message: 'Đã lập phiếu xuất kho DISP-2026-201 và trừ tồn kho thành phẩm thành công!',
    })

    const addToastMock = vi.fn()

    render(<Sales addToast={addToastMock} />)

    await waitFor(() => {
      expect(screen.getByText('SO-2026-201')).toBeInTheDocument()
    })

    expect(screen.getByText('Đại lý Yến Sào Miền Nam')).toBeInTheDocument()
    expect(screen.getByText('Đơn mới (Chưa xuất)')).toBeInTheDocument()

    // Find and click "Xuất kho (Trừ lô)" button
    const dispatchBtn = screen.getByRole('button', { name: /Xuất kho \(Trừ lô\)/i })
    fireEvent.click(dispatchBtn)

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(201)
      expect(addToastMock).toHaveBeenCalledWith(
        'Đã lập phiếu xuất kho DISP-2026-201 và trừ tồn kho thành phẩm thành công!',
        'success'
      )
    })
  })
})
