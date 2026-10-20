import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Production from './Production'
import { api } from '../services/api'

describe('Production Module UI Flow (Seam 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders production orders and allows starting a pending order', async () => {
    const mockOrders = [
      {
        order_id: 101,
        order_code: 'PO-2026-101',
        product_name: 'Yến Lọ Chưng Đường Phèn 70ml',
        target_quantity: 500,
        completed_quantity: 0,
        status: 'PENDING',
        notes: 'Lô sản xuất thử nghiệm',
        unit: 'lọ',
      },
    ]

    const mockProducts = [
      { product_id: 1, product_name: 'Yến Lọ Chưng Đường Phèn 70ml', unit: 'lọ' },
    ]

    vi.spyOn(api, 'getProductionOrders').mockResolvedValue({ data: mockOrders })
    vi.spyOn(api, 'getProducts').mockResolvedValue({ data: mockProducts })
    const startSpy = vi.spyOn(api, 'startProductionOrder').mockResolvedValue({
      message: 'Đã bắt đầu sản xuất và xuất kho NVL theo định mức BOM thành công',
    })

    const addToastMock = vi.fn()

    render(<Production addToast={addToastMock} />)

    // Verify order code renders
    await waitFor(() => {
      expect(screen.getByText('PO-2026-101')).toBeInTheDocument()
    })

    expect(screen.getByText('Yến Lọ Chưng Đường Phèn 70ml')).toBeInTheDocument()
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument()

    // Find and click "Bắt đầu (Xuất NVL)" button
    const startBtn = screen.getByRole('button', { name: /Bắt đầu \(Xuất NVL\)/i })
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith(101)
      expect(addToastMock).toHaveBeenCalledWith(
        'Đã bắt đầu sản xuất và xuất kho NVL theo định mức BOM thành công',
        'success'
      )
    })
  })
})
