import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Storefront from './Storefront'
import { api } from '../services/api'

vi.mock('../services/api', () => ({
  api: {
    getStoreProducts: vi.fn(),
    getStoreProductDetail: vi.fn(),
    createProductReview: vi.fn(),
    getCampaigns: vi.fn(),
    saveCustomerProfile: vi.fn(),
    verifyAgent: vi.fn(),
    storeCheckout: vi.fn(),
    calculatePricing: vi.fn(),
    askStoreSalesChat: vi.fn(),
  },
}))

describe('Storefront B2B/B2C Commerce & Geo-Personalization UI Flow', () => {
  const mockProducts = [
    {
      product_id: 1,
      product_code: 'PROD_YEN_LO_70ML',
      product_name: 'Yến Lọ Chưng Đường Phèn 70ml',
      category_name: 'Yến Sào',
      unit: 'lọ',
      packaging_spec: 'Lọ thuỷ tinh 70ml',
      case_spec: 'Thùng 24 lọ',
      retail_price: 45000,
      wholesale_price: 37000,
      agent_price: 35000,
      wholesale_moq: 24,
      target_region: 'NORTH',
      is_regional_top: true,
      health_benefits: 'Bổ phổi, tăng cường miễn dịch.',
      image: 'https://example.com/yenlo.jpg',
      in_stock: 500,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getStoreProducts.mockResolvedValue({ data: mockProducts })
    api.getCampaigns.mockResolvedValue({
      data: [
        {
          campaign_id: 1,
          title: 'Flash Sale Mùa Lạnh Miền Bắc',
          campaign_type: 'FLASHSALE',
          target_region: 'NORTH',
          discount_percentage: 20,
          flash_sale_price: 36000,
          product_id: 1,
        },
      ],
    })
  })

  it('renders products, Flash Sale countdown, regional switcher and allows adding a case to cart', async () => {
    const addToast = vi.fn()
    render(
      <MemoryRouter>
        <Storefront addToast={addToast} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Yến Lọ Chưng Đường Phèn 70ml')).toBeInTheDocument()
    })

    // Switch region to Miền Bắc
    const northBtn = screen.getByRole('button', { name: /Miền Bắc/i })
    fireEvent.click(northBtn)
    await waitFor(() => {
      expect(api.getStoreProducts).toHaveBeenCalledWith('NORTH')
      expect(screen.getByText('+1 Thùng (24)')).toBeInTheDocument()
    })

    // Click "+1 Thùng (24)"
    const addCaseBtn = screen.getByText('+1 Thùng (24)')
    fireEvent.click(addCaseBtn)

    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('Đã thêm 24 lọ'),
      'success'
    )

    // Open Cart
    const cartBtn = screen.getByRole('button', { name: /giỏ hàng/i })
    fireEvent.click(cartBtn)

    expect(screen.getByText('Giỏ Hàng Của Bạn')).toBeInTheDocument()
    expect(screen.getByText(/Giá sỉ đạt MOQ/i)).toBeInTheDocument()
  })

  it('displays minimized Chatbot icon with greeting bubble and Cloud CDN badge', async () => {
    render(
      <MemoryRouter>
        <Storefront addToast={vi.fn()} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Tôi là trợ lý mua hàng, tôi có thể giúp gì cho bạn\?/i)
      ).toBeInTheDocument()
      expect(screen.getByText('☁️ Cloud CDN')).toBeInTheDocument()
    })

    // Dismiss only the greeting bubble while keeping the Chatbot icon button
    const closeBubbleBtn = screen.getByRole('button', { name: /Đóng lời chào/i })
    fireEvent.click(closeBubbleBtn)

    expect(
      screen.queryByText(/Tôi là trợ lý mua hàng, tôi có thể giúp gì cho bạn\?/i)
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Trợ Lý Bán Hàng AI/i })).toBeInTheDocument()
  })

  it('opens Product Detail Page with factory address, benefits, BOM, buyer reviews and supports Chatbot 1-click Buy Now & View Detail (Version 1.7.0)', async () => {
    api.getStoreProductDetail.mockResolvedValue({
      product: mockProducts[0],
      origin_info: {
        factory_name: 'Nhà Máy Chế Biến Yến Sào Khánh Hòa (Chuẩn ISO 22000)',
        factory_address: 'Lô C12, Khu Công Nghiệp Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa',
        raw_material_region: 'Đảo Yến Tự Nhiên Vịnh Nha Trang - Khánh Hòa',
        certifications: ['ISO 22000:2018', 'HACCP Codex'],
        production_technology: 'Công nghệ chưng cất tiệt trùng chân không.',
      },
      usage_guide: {
        detailed_benefits: ['Bổ phổi, tiêu đờm', 'Tăng cường hệ miễn dịch'],
        target_users: 'Người cao tuổi, người mới ốm dậy',
        best_time: 'Buổi sáng trước bữa ăn 30 phút',
        storage_guide: 'Bảo quản nơi khô ráo thoáng mát',
      },
      bom_ingredients: [
        { material_name: 'Tổ yến tinh chế', quantity_required: 3, bom_unit: 'gram', notes: 'Sợi yến nguyên chất' },
      ],
      batches: [
        { batch_code: 'LOT-2026-01', quantity_in_stock: 500, manufacturing_date: '2026-10-01', expiry_date: '2028-10-01', warehouse_location: 'Kho Khánh Hòa' },
      ],
      reviews: [
        {
          review_id: 101,
          reviewer_name: 'Bác Nguyễn Văn Hòa (64 tuổi)',
          customer_type: 'RETAIL',
          rating: 5,
          comment: 'Sợi yến thật và thơm dịu, ngủ rất sâu giấc!',
          region: 'Miền Bắc',
          verified_purchase: 1,
          created_at: '2026-10-28 09:00:00',
        },
      ],
      rating_summary: {
        average_rating: 4.9,
        total_reviews: 3,
        star_breakdown: { 5: 3, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
      related_products: [],
    })

    api.askStoreSalesChat.mockResolvedValue({
      reply: '🎁 Gợi ý sản phẩm bồi bổ sức khỏe cho bạn:',
      suggested_products: [
        {
          product_id: 1,
          product_code: 'PROD_YEN_LO_70ML',
          product_name: 'Yến Lọ Chưng Đường Phèn 70ml',
          price: 45000,
          wholesale_price: 37000,
          wholesale_moq: 24,
          case_spec: 'Thùng 24 lọ',
          unit: 'lọ',
          image: 'https://example.com/yenlo.jpg',
          average_rating: 4.9,
          review_count: 3,
          quantity: 2,
          badge_note: 'Top 1 Bán Chạy',
          actions: ['buy_now', 'add_to_cart', 'view_detail'],
        },
      ],
    })

    render(
      <MemoryRouter>
        <Storefront addToast={vi.fn()} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Yến Lọ Chưng Đường Phèn 70ml')).toBeInTheDocument()
    })

    // 1. Open Chatbot and click Quick Prompt Chip
    const chatToggleBtn = screen.getByRole('button', { name: /Trợ Lý Bán Hàng AI/i })
    fireEvent.click(chatToggleBtn)

    const giftChip = screen.getByRole('button', { name: /🎁 Quà biếu sức khỏe/i })
    fireEvent.click(giftChip)

    await waitFor(() => {
      expect(api.askStoreSalesChat).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /🔍 Chi tiết/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /⚡ Mua ngay/i })).toBeInTheDocument()
    })

    // 2. Click "🔍 Chi tiết" inside Chatbot to open Product Detail View
    fireEvent.click(screen.getByRole('button', { name: /🔍 Chi tiết/i }))

    await waitFor(() => {
      expect(api.getStoreProductDetail).toHaveBeenCalledWith(1, expect.any(String))
      expect(
        screen.getByText(/Lô C12, Khu Công Nghiệp Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/Bác Nguyễn Văn Hòa \(64 tuổi\)/i)).toBeInTheDocument()
    })

    // 3. Click "⚡ Mua ngay" inside Chatbot to immediately open Checkout Modal without searching
    fireEvent.click(screen.getByRole('button', { name: /^⚡ Mua ngay$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Thông Tin Đặt Hàng & Thanh Toán/i)).toBeInTheDocument()
    })
  })
})
