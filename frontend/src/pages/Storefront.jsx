import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Package,
  CheckCircle2,
  Building2,
  QrCode,
  ArrowRight,
  ArrowLeft,
  Tag,
  X,
  Plus,
  Minus,
  Truck,
  Copy,
  AlertCircle,
  HeartHandshake,
  Check,
  Search,
  MessageSquare,
  Send,
  Bot,
  User,
  MapPin,
  Flame,
  Clock,
  Video,
  Lock,
  Star,
  Eye,
  Zap,
  Award,
  FileText,
} from 'lucide-react'
import { api } from '../services/api'

const REGIONAL_BANNERS = {
  ALL: {
    badge: '🌐 ĐỀ XUẤT TOÀN QUỐC',
    title: 'Tinh Hoa Yến Sào Khánh Hòa & Cà Phê Phin Giấy Cầu Đất',
    subtitle: 'Chọn khu vực địa lý của bạn (Miền Bắc / Miền Trung / Miền Nam) để hệ thống AI cá nhân hóa sản phẩm theo thời tiết và ưu đãi vùng miền!',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: 'rgba(16, 185, 129, 0.35)',
    accent: '#10b981',
  },
  NORTH: {
    badge: '❄️ CÁ NHÂN HÓA MIỀN BẮC (MÙA LẠNH)',
    title: 'Ấm Áp Mùa Gió Lạnh: Yến Chưng Đường Phèn & Cháo Yến Nóng Hổi',
    subtitle: 'Ưu tiên Top 1 cho khí hậu Miền Bắc: Yến Lọ Chưng Đường Phèn 70ml bồi bổ khí huyết, giữ ấm phổi và Cháo Yến Thịt Bằm dinh dưỡng ấm nóng.',
    gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: 'rgba(56, 189, 248, 0.4)',
    accent: '#38bdf8',
  },
  CENTRAL: {
    badge: '🎁 CÁ NHÂN HÓA MIỀN TRUNG (QUÀ BIẾU)',
    title: 'Quà Biếu Trang Trọng & Đậm Đà Tình Thân Miền Trung',
    subtitle: 'Ưu tiên Top 1 cho Miền Trung: Hộp quà biếu sang trọng và Yến Chai Nguyên Chất 300ml hàm lượng tổ yến cao bồi bổ toàn diện.',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: 'rgba(245, 158, 11, 0.4)',
    accent: '#f59e0b',
  },
  SOUTH: {
    badge: '☀️ CÁ NHÂN HÓA MIỀN NAM (THANH MÁT)',
    title: 'Giải Nhiệt Thanh Mát & Năng Lượng Tỉnh Táo Phương Nam',
    subtitle: 'Ưu tiên Top 1 cho thời tiết nắng ấm Miền Nam: Yến Lon Uống Liền 190ml ướp lạnh sảng khoái và Cà Phê Phin Giấy đậm đà.',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 78, 59, 0.5) 100%)',
    border: 'rgba(16, 185, 129, 0.45)',
    accent: '#10b981',
  },
}

export default function Storefront({ addToast, currentUser }) {
  const { productId: routeProductId } = useParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('RETAIL') // 'RETAIL' | 'WHOLESALE'
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState(() => {
    return localStorage.getItem('store_customer_region') || 'ALL'
  })

  // Đồng hồ đếm ngược Flash Sale (giây)
  const [countdownSec, setCountdownSec] = useState(14250) // ~ 03:57:30

  // Khách hàng đăng nhập nhanh lưu khu vực
  const [customerProfile, setCustomerProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('store_customer_profile')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profName, setProfName] = useState('')
  const [profPhone, setProfPhone] = useState('')
  const [profAddress, setProfAddress] = useState('')
  const [profRegion, setProfRegion] = useState('NORTH')

  // Giỏ hàng
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Đại lý B2B
  const [agent, setAgent] = useState(null)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [agentCodeInput, setAgentCodeInput] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState('')

  // Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutName, setCheckoutName] = useState('')
  const [checkoutPhone, setCheckoutPhone] = useState('')
  const [checkoutAddress, setCheckoutAddress] = useState('')
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('VIETQR') // 'VIETQR' | 'COD' | 'DEBT'
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Kết quả đặt hàng / VietQR
  const [completedOrder, setCompletedOrder] = useState(null)
  const [copiedBank, setCopiedBank] = useState(false)

  // AI Sales Copilot Widget
  const [showAIChat, setShowAIChat] = useState(false)
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      text: '👋 Xin chào! Tôi là Trợ Lý Bán Hàng AI của doanh nghiệp Yến & Cà Phê SMB. Tôi có thể tư vấn sản phẩm bồi bổ sức khỏe theo vùng miền, giải đáp chính sách sỉ theo thùng, hoặc kiểm tra tiến độ đơn hàng theo mã `SO-STORE-xxxx` cho bạn!',
    },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatBottomRef = useRef(null)

  const fetchStoreProducts = async (reg = selectedRegion) => {
    try {
      setLoading(true)
      const [prodRes, campRes] = await Promise.all([
        api.getStoreProducts(reg),
        api.getCampaigns ? api.getCampaigns(reg, true).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ])
      setProducts(prodRes.data || [])
      setCampaigns(campRes.data || [])
    } catch (err) {
      console.error(err)
      addToast && addToast(err.message || 'Không thể tải danh mục sản phẩm', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStoreProducts(selectedRegion)
  }, [selectedRegion])

  // Hiệu ứng đếm ngược Flash Sale mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 14400))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatCountdown = (sec) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0')
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return { h, m, s }
  }

  const handleSelectRegion = (reg) => {
    setSelectedRegion(reg)
    localStorage.setItem('store_customer_region', reg)
    const names = { ALL: 'Toàn Quốc', NORTH: 'Miền Bắc', CENTRAL: 'Miền Trung', SOUTH: 'Miền Nam' }
    addToast && addToast(`Đã chuyển sang gợi ý cá nhân hóa khu vực: ${names[reg]}`, 'info')
  }

  const handleSaveCustomerProfile = async (e) => {
    e.preventDefault()
    if (!profName.trim() || !profPhone.trim()) {
      addToast && addToast('Vui lòng nhập Họ tên và Số điện thoại', 'error')
      return
    }
    try {
      const res = api.saveCustomerProfile
        ? await api.saveCustomerProfile({
            customer_name: profName.trim(),
            phone: profPhone.trim(),
            address: profAddress.trim(),
            region: profRegion,
          })
        : {
            message: `Xin chào ${profName}! Đã lưu khu vực.`,
            customer: { customer_name: profName, phone: profPhone, address: profAddress, region: profRegion },
          }
      setCustomerProfile(res.customer)
      localStorage.setItem('store_customer_profile', JSON.stringify(res.customer))
      setCheckoutName(res.customer.customer_name)
      setCheckoutPhone(res.customer.phone)
      if (res.customer.address) setCheckoutAddress(res.customer.address)
      handleSelectRegion(profRegion)
      setShowProfileModal(false)
      addToast && addToast(res.message, 'success')
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  useEffect(() => {
    if (showAIChat && chatBottomRef.current?.scrollIntoView) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [aiMessages, showAIChat])

  // Xử lý xác thực Đại lý B2B
  const handleVerifyAgent = async (e) => {
    e.preventDefault()
    if (!agentCodeInput.trim()) {
      setAgentError('Vui lòng nhập Mã đại lý hoặc Số điện thoại')
      return
    }
    setAgentLoading(true)
    setAgentError('')
    try {
      const res = await api.verifyAgent(agentCodeInput.trim())
      if (res.valid) {
        setAgent(res.agent)
        setMode('WHOLESALE')
        setCheckoutName(res.agent.customer_name)
        setCheckoutPhone(res.agent.phone)
        setCheckoutAddress(res.agent.address || '')
        setShowAgentModal(false)
        addToast && addToast(`Xin chào đối tác ${res.agent.customer_name}! Đã kích hoạt giá sỉ VIP & Công nợ.`, 'success')
      } else {
        setAgentError(res.message || 'Mã đối tác không tồn tại')
      }
    } catch (err) {
      setAgentError(err.message || 'Lỗi khi xác thực mã đại lý')
    } finally {
      setAgentLoading(false)
    }
  }

  const handleLogoutAgent = () => {
    setAgent(null)
    setMode('RETAIL')
    setPaymentMethod('VIETQR')
    addToast && addToast('Đã thoát phiên làm việc đối tác B2B', 'info')
  }

  // Quản lý giỏ hàng
  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.product_id === product.product_id)
      if (existing) {
        return prev.map((item) =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { product, quantity }]
    })
    addToast && addToast(`Đã thêm ${quantity} ${product.unit} ${product.product_name} vào giỏ`, 'success')
  }

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.product_id === productId ? { ...item, quantity: newQty } : item
      )
    )
  }

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.product_id !== productId))
  }

  // Tính toán giỏ hàng
  const calculateCartTotals = () => {
    let totalRetail = 0
    let totalFinal = 0
    let totalSavings = 0

    const itemsSummary = cart.map((item) => {
      const { product, quantity } = item
      const retailPrice = Number(product.retail_price)
      const wholesaleMoq = Number(product.wholesale_moq)
      const wholesalePrice = Number(product.wholesale_price)
      const agentPrice = Number(product.agent_price || wholesalePrice)

      let unitPrice = retailPrice
      let isDiscounted = false
      let discountLabel = 'Giá bán lẻ'

      if (agent) {
        unitPrice = agentPrice
        isDiscounted = true
        discountLabel = 'Giá đại lý VIP B2B'
      } else if (quantity >= wholesaleMoq) {
        unitPrice = wholesalePrice
        isDiscounted = true
        discountLabel = `Giá sỉ đạt MOQ (≥ ${wholesaleMoq} ${product.unit})`
      }

      const itemRetailTotal = retailPrice * quantity
      const itemFinalTotal = unitPrice * quantity
      const itemSavings = itemRetailTotal - itemFinalTotal

      totalRetail += itemRetailTotal
      totalFinal += itemFinalTotal
      totalSavings += itemSavings

      return {
        ...item,
        unitPrice,
        isDiscounted,
        discountLabel,
        itemRetailTotal,
        itemFinalTotal,
        itemSavings,
      }
    })

    return {
      itemsSummary,
      totalRetail,
      totalFinal,
      totalSavings,
      totalCount: cart.reduce((sum, i) => sum + i.quantity, 0),
    }
  }

  const cartCalculations = calculateCartTotals()

  // Gửi đơn hàng (Checkout)
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault()
    if (cart.length === 0) {
      addToast && addToast('Giỏ hàng trống!', 'error')
      return
    }
    if (!checkoutName.trim() || !checkoutPhone.trim() || !checkoutAddress.trim()) {
      addToast && addToast('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        customer_name: checkoutName.trim(),
        phone: checkoutPhone.trim(),
        address: checkoutAddress.trim(),
        customer_type: agent ? 'AGENT' : mode,
        agent_code: agent ? agent.customer_code : null,
        payment_method: paymentMethod,
        items: cart.map((i) => ({
          product_id: i.product.product_id,
          quantity: i.quantity,
        })),
        notes: checkoutNotes.trim() || (agent ? 'Đơn đặt từ Đại lý B2B' : 'Đơn đặt từ Cổng Bán Hàng Storefront'),
      }

      const res = await api.storeCheckout(payload)
      setCompletedOrder(res)
      setCart([])
      setShowCheckoutModal(false)
      setIsCartOpen(false)
      addToast && addToast(`Đặt hàng thành công! Mã đơn: ${res.order_code}`, 'success')
      fetchStoreProducts()
    } catch (err) {
      console.error(err)
      addToast && addToast(err.message || 'Không thể tạo đơn hàng', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyBankInfo = () => {
    if (!completedOrder || !completedOrder.bank_info) return
    const text = `Ngân hàng: ${completedOrder.bank_info.bank_name}\nSTK: ${completedOrder.bank_info.account_number}\nChủ TK: ${completedOrder.bank_info.account_name}\nSố tiền: ${completedOrder.bank_info.amount.toLocaleString()} VND\nNội dung: ${completedOrder.bank_info.content}`
    navigator.clipboard.writeText(text)
    setCopiedBank(true)
    setTimeout(() => setCopiedBank(false), 3000)
    addToast && addToast('Đã sao chép thông tin chuyển khoản VietQR', 'success')
  }

  // Version 1.7.0: Trang Chi Tiết Sản Phẩm & Đánh Giá Người Mua
  const [activeProductDetail, setActiveProductDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailQty, setDetailQty] = useState(1)
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewRegion, setReviewRegion] = useState('Miền Bắc')
  const [reviewCustomerType, setReviewCustomerType] = useState('RETAIL')
  const [submittingReview, setSubmittingReview] = useState(false)

  const handleOpenProductDetail = async (productId) => {
    if (!productId) return
    setDetailLoading(true)
    setDetailQty(1)
    try {
      const data = api.getStoreProductDetail
        ? await api.getStoreProductDetail(productId, selectedRegion)
        : null
      if (data && data.product) {
        setActiveProductDetail(data)
      } else {
        const fallbackProd = products.find((p) => Number(p.product_id) === Number(productId))
        if (fallbackProd) {
          setActiveProductDetail({
            product: fallbackProd,
            origin_info: {
              factory_name: 'Nhà Máy Chế Biến Yến Sào Khánh Hòa (Chuẩn ISO 22000)',
              factory_address: 'Lô C12, Khu Công Nghiệp Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa',
              raw_material_region: 'Đảo Yến Tự Nhiên Vịnh Nha Trang - Khánh Hòa',
              certifications: ['ISO 22000:2018', 'HACCP Codex', 'VSATTP Bộ Y Tế'],
              production_technology: 'Chưng cất tiệt trùng chân không giữ trọn dưỡng chất tự nhiên.',
            },
            usage_guide: {
              detailed_benefits: [fallbackProd.health_benefits || 'Bồi bổ sức khỏe, tăng đề kháng tự nhiên.'],
              target_users: 'Người lớn tuổi, người mới ốm dậy, cả gia đình.',
              best_time: 'Buổi sáng trước ăn 30 phút hoặc tối trước khi ngủ.',
              storage_guide: 'Bảo quản nơi khô ráo, thoáng mát, ngon hơn khi uống lạnh.',
            },
            bom_ingredients: [],
            batches: [],
            reviews: [],
            rating_summary: { average_rating: 4.9, total_reviews: 3, star_breakdown: { 5: 3 } },
            related_products: products.filter((p) => Number(p.product_id) !== Number(productId)),
          })
        }
      }
      try {
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo(0, 0)
        }
      } catch {
        // ignore JSDOM unimplemented scrollTo
      }
    } catch (err) {
      addToast && addToast(err.message || 'Không thể tải chi tiết sản phẩm', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseProductDetail = () => {
    setActiveProductDetail(null)
    if (routeProductId) {
      navigate('/store')
    }
  }

  useEffect(() => {
    if (routeProductId) {
      handleOpenProductDetail(Number(routeProductId))
    }
  }, [routeProductId])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!activeProductDetail?.product) return
    if (!reviewName.trim() || !reviewComment.trim()) {
      addToast && addToast('Vui lòng nhập Họ tên và Nội dung đánh giá của bạn', 'error')
      return
    }
    setSubmittingReview(true)
    const pid = activeProductDetail.product.product_id
    try {
      if (api.createProductReview) {
        await api.createProductReview(pid, {
          reviewer_name: reviewName.trim(),
          customer_type: agent ? 'AGENT_VIP' : reviewCustomerType,
          rating: Number(reviewRating),
          comment: reviewComment.trim(),
          region: reviewRegion,
        })
      }
      addToast && addToast('Cảm ơn bạn đã gửi đánh giá sản phẩm!', 'success')
      setReviewName('')
      setReviewComment('')
      setReviewRating(5)
      await handleOpenProductDetail(pid)
    } catch (err) {
      addToast && addToast(err.message || 'Không thể gửi đánh giá', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Xử lý gửi tin nhắn AI Chatbot
  const handleSendAIMessage = async (textToSend = null) => {
    const text = (textToSend || aiInput).trim()
    if (!text || aiLoading) return

    const userMsg = { role: 'user', text }
    setAiMessages((prev) => [...prev, userMsg])
    setAiInput('')
    setAiLoading(true)

    try {
      const chatFn = api.askStoreSalesChat || api.askStoreAIChat
      const res = await chatFn(text, agent ? 'AGENT' : mode)
      const assistantMsg = {
        role: 'assistant',
        text: res.reply,
        products: res.suggested_products || [],
      }
      setAiMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error(err)
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Xin lỗi, kết nối tới máy chủ AI đang bận. Vui lòng thử lại sau ít giây.',
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  const resolveProductFromSuggestion = (suggested) => {
    const found = products.find((p) => Number(p.product_id) === Number(suggested.product_id))
    if (found) return found
    return {
      product_id: suggested.product_id,
      product_code: suggested.product_code || `PROD_${suggested.product_id}`,
      product_name: suggested.product_name,
      unit: suggested.unit || 'lọ',
      case_spec: suggested.case_spec || 'Thùng tiêu chuẩn',
      retail_price: Number(suggested.retail_price || suggested.price || 45000),
      wholesale_price: Number(suggested.wholesale_price || Math.round(Number(suggested.price || 45000) * 0.82)),
      agent_price: Number(suggested.wholesale_price || Math.round(Number(suggested.price || 45000) * 0.78)),
      wholesale_moq: Number(suggested.wholesale_moq || 24),
      image: suggested.image || '',
      in_stock: Number(suggested.in_stock || 100),
    }
  }

  // Thêm sản phẩm được AI gợi ý vào giỏ
  const handleAddAISuggestionToCart = (suggested) => {
    const prodObj = resolveProductFromSuggestion(suggested)
    addToCart(prodObj, suggested.quantity || 1)
    setIsCartOpen(true)
  }

  // Bấm "⚡ Mua ngay" ngay trong Chatbot -> Thêm vào giỏ & mở thẳng cửa sổ Thanh Toán (Checkout) không cần tìm kiếm
  const handleBuyNowFromAI = (suggested, customQty = null) => {
    const prodObj = resolveProductFromSuggestion(suggested)
    const qty = customQty || suggested.quantity || 1
    addToCart(prodObj, qty)
    setIsCartOpen(false)
    setShowCheckoutModal(true)
  }

  const [sortBy, setSortBy] = useState('REGIONAL')
  const [showChatGreeting, setShowChatGreeting] = useState(true)

  const resolveCloudImageUrl = (rawUrl) => {
    if (!rawUrl || !String(rawUrl).trim()) {
      return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80'
    }
    const u = String(rawUrl).trim()
    if (u.startsWith('data:image/')) return u
    if (u.includes('images.unsplash.com') && !u.includes('auto=format')) {
      return `${u}${u.includes('?') ? '&' : '?'}auto=format&fit=crop&w=800&q=80`
    }
    return u
  }

  // Lọc và Sắp xếp sản phẩm
  const filteredProducts = products
    .filter((p) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'YEN' && p.product_name.includes('Yến')) ||
        (selectedCategory === 'CAPHE' && p.product_name.includes('Cà Phê'))
      const matchesSearch =
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
    .sort((a, b) => {
      const priceA = Number(agent ? a.agent_price || a.wholesale_price : mode === 'WHOLESALE' ? a.wholesale_price : a.retail_price)
      const priceB = Number(agent ? b.agent_price || b.wholesale_price : mode === 'WHOLESALE' ? b.wholesale_price : b.retail_price)
      if (sortBy === 'PRICE_ASC') return priceA - priceB
      if (sortBy === 'PRICE_DESC') return priceB - priceA
      if (sortBy === 'NAME_ASC') return a.product_name.localeCompare(b.product_name, 'vi')
      if (sortBy === 'STOCK_DESC') return Number(b.in_stock || 0) - Number(a.in_stock || 0)
      return 0
    })

  const bannerConfig = REGIONAL_BANNERS[selectedRegion] || REGIONAL_BANNERS.ALL
  const cd = formatCountdown(countdownSec)
  const activeFlashSales = campaigns.filter((c) => c.campaign_type === 'FLASHSALE')
  const activeVideos = campaigns.filter((c) => c.campaign_type === 'VIDEO_SHOWCASE')

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', paddingBottom: 80, position: 'relative' }}>
      {/* 0. Geo-Targeted Region Selector Bar (Cá Nhân Hóa Theo Khu Vực) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 18px',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
            <MapPin size={15} /> Khu vực của bạn:
          </span>

          {[
            { code: 'ALL', label: '🌐 Toàn Quốc' },
            { code: 'NORTH', label: '❄️ Miền Bắc (Mùa lạnh)' },
            { code: 'CENTRAL', label: '🎁 Miền Trung (Quà biếu)' },
            { code: 'SOUTH', label: '☀️ Miền Nam (Giải nhiệt)' },
          ].map((reg) => (
            <button
              key={reg.code}
              type="button"
              onClick={() => handleSelectRegion(reg.code)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                border: selectedRegion === reg.code ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                background: selectedRegion === reg.code ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                color: selectedRegion === reg.code ? '#10b981' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {reg.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {customerProfile ? (
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="btn btn-outline"
              style={{ padding: '5px 12px', fontSize: '0.78rem', borderColor: 'rgba(16,185,129,0.4)', color: '#10b981' }}
            >
              <User size={14} />
              <span>KH: {customerProfile.customer_name} ({customerProfile.phone})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="btn btn-outline"
              style={{ padding: '5px 12px', fontSize: '0.78rem', borderColor: 'rgba(56,189,248,0.4)', color: '#38bdf8' }}
            >
              <User size={14} />
              <span>Đăng nhập nhanh KH (Lưu khu vực & Đ/c)</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Dynamic Regional Hero Banner: Cổng Bán Hàng Storefront */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: bannerConfig.gradient,
          border: `1px solid ${bannerConfig.border}`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: bannerConfig.accent,
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={14} /> {bannerConfig.badge}
            </span>
            {agent && (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Building2 size={14} /> ĐẠI LÝ CHÍNH THỨC
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {bannerConfig.title}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: 6, lineHeight: 1.45 }}>
            {bannerConfig.subtitle}
          </p>
        </div>

        {/* Action Controls Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Switcher Bán Lẻ / Bán Sỉ */}
          <div
            style={{
              display: 'flex',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setMode('RETAIL')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'RETAIL' && !agent ? 'var(--primary)' : 'transparent',
                color: mode === 'RETAIL' && !agent ? '#042f2e' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              🛍️ Khách Mua Lẻ
            </button>
            <button
              type="button"
              onClick={() => setMode('WHOLESALE')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'WHOLESALE' || agent ? '#0284c7' : 'transparent',
                color: mode === 'WHOLESALE' || agent ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              💼 Khách Sỉ / Thùng
            </button>
          </div>

          {/* Nút Đại lý B2B */}
          {agent ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>{agent.customer_name}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Hạn mức: {agent.credit_limit.toLocaleString()} ₫ (Nợ: {agent.current_debt.toLocaleString()} ₫)
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogoutAgent}
                title="Đăng xuất đại lý"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAgentModal(true)}
              className="btn btn-outline"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
            >
              <Building2 size={16} />
              <span>Kích Hoạt Mã Đại Lý B2B</span>
            </button>
          )}

          {/* Giỏ hàng Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="btn btn-primary"
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={18} />
            <span>Giỏ hàng</span>
            {cartCalculations.totalCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  borderRadius: 12,
                  padding: '2px 7px',
                  marginLeft: 4,
                }}
              >
                {cartCalculations.totalCount}
              </span>
            )}
          </button>

          {/* Điều hướng về Admin hoặc Đăng nhập nội bộ */}
          <Link
            to={currentUser ? '/' : '/login'}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', padding: '8px 12px' }}
            title="Cổng Quản trị ERP & BI dành cho nhân sự nội bộ"
          >
            <Lock size={15} />
            <span>{currentUser ? 'Về Quản Trị ERP' : 'Đăng nhập Nội bộ ERP'}</span>
          </Link>
        </div>
      </div>

      {/* 1B. Block Flash Sale Đếm Ngược Thời Gian Thực & Video Showcase */}
      {(activeFlashSales.length > 0 || activeVideos.length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: activeVideos.length > 0 ? '1.35fr 1fr' : '1fr',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Flash Sale Countdown Box */}
          {activeFlashSales.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.16) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      background: '#f43f5e',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Flame size={14} /> FLASH SALE ĐẾM NGƯỢC
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#fda4af', fontWeight: 600 }}>
                    Khu vực: {selectedRegion === 'ALL' ? 'Toàn Quốc' : selectedRegion === 'NORTH' ? 'Miền Bắc' : selectedRegion === 'CENTRAL' ? 'Miền Trung' : 'Miền Nam'}
                  </span>
                </div>

                {/* Countdown Timer Giờ : Phút : Giây */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#f43f5e" />
                  <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>Kết thúc sau:</span>
                  {[cd.h, cd.m, cd.s].map((unit, idx) => (
                    <React.Fragment key={idx}>
                      <span
                        style={{
                          background: '#0f172a',
                          border: '1px solid rgba(244, 63, 94, 0.5)',
                          color: '#f43f5e',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '3px 7px',
                          borderRadius: 6,
                          minWidth: 28,
                          textAlign: 'center',
                        }}
                      >
                        {unit}
                      </span>
                      {idx < 2 && <span style={{ color: '#f43f5e', fontWeight: 800 }}>:</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeFlashSales.slice(0, 2).map((fs) => {
                  const targetProd = products.find((p) => p.product_id === fs.product_id) || products[0]
                  return (
                    <div
                      key={fs.campaign_id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc' }}>{fs.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                          Giảm sốc <strong style={{ color: '#f43f5e' }}>-{fs.discount_percentage}%</strong> • Giá chỉ còn:{' '}
                          <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>
                            {Number(fs.flash_sale_price || 36000).toLocaleString('vi-VN')} ₫
                          </strong>
                        </div>
                      </div>
                      {targetProd && (
                        <button
                          type="button"
                          onClick={() => addToCart(targetProd, 1)}
                          className="btn btn-primary"
                          style={{ background: '#f43f5e', borderColor: '#f43f5e', padding: '7px 14px', fontSize: '0.8rem' }}
                        >
                          ⚡ Săn Deal Ngay
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Video Showcase Box */}
          {activeVideos.length > 0 && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Video size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  {activeVideos[0].title}
                </span>
              </div>
              <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', height: 155 }}>
                {activeVideos[0].video_url?.includes('youtube.com/embed') ? (
                  <iframe
                    src={activeVideos[0].video_url}
                    title="Video Showcase"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeVideos[0].video_url || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                    controls
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                ✨ Truyền thông trực tiếp từ Admin CMS • Quy trình chưng cất & đóng gói chuẩn ISO 22000
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Banner Thông báo & Ưu Đãi Hiện Tại */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 20px',
          marginBottom: 24,
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tag size={18} color="#10b981" />
          <span>
            {agent ? (
              <>
                Đối tác <strong>{agent.customer_name}</strong> đang được áp dụng mức giá chiết khấu{' '}
                <strong style={{ color: '#38bdf8' }}>Đại lý VIP cao nhất (20% - 26%)</strong> và được hỗ trợ Ghi nợ
                công nợ tối đa <strong>{agent.credit_limit.toLocaleString()} ₫</strong>.
              </>
            ) : mode === 'WHOLESALE' ? (
              <>
                Chế độ xem sỉ: Đặt từ <strong style={{ color: '#38bdf8' }}>1 Thùng/Lốc (MOQ)</strong> để nhận chiết khấu
                tự động từ <strong style={{ color: '#10b981' }}>15% - 22%</strong>. Có sẵn hỗ trợ chuyển khoản VietQR tự
                động!
              </>
            ) : (
              <>
                Bán lẻ tiêu chuẩn: Miễn phí giao hàng cho đơn từ 500,000 ₫. Đặt hàng số lượng từ 1 thùng trở lên để nhận giá sỉ ưu đãi.
              </>
            )}
          </span>
        </div>

        {!agent && (
          <button
            type="button"
            onClick={() => setShowAgentModal(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            Nhập mã đối tác <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* 3. Filter Bar & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`btn ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Tất cả sản phẩm ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('YEN')}
            className={`btn ${selectedCategory === 'YEN' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Tổ Yến Cao Cấp (4)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('CAPHE')}
            className={`btn ${selectedCategory === 'CAPHE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Cà Phê Phin Giấy (1)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Sắp xếp:</span>
            <select
              aria-label="Sắp xếp sản phẩm"
              className="input-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ height: 38, fontSize: '0.82rem', minWidth: 200, padding: '0 10px' }}
            >
              <option value="REGIONAL">🔥 Đề xuất theo vùng miền</option>
              <option value="PRICE_ASC">💰 Giá: Thấp đến Cao</option>
              <option value="PRICE_DESC">💎 Giá: Cao đến Thấp</option>
              <option value="STOCK_DESC">📦 Tồn kho sẵn có nhiều nhất</option>
              <option value="NAME_ASC">🔤 Tên sản phẩm: A → Z</option>
            </select>
          </div>

          <div style={{ position: 'relative', width: 250 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} />
            <input
              type="text"
              className="input-control"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* 4. Trang Chi Tiết Sản Phẩm (Version 1.7.0) HOẶC Danh Sách Sản Phẩm */}
      {detailLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Đang tải thông tin chi tiết sản phẩm, địa chỉ nhà máy, thành phần BOM & đánh giá người mua...
        </div>
      ) : activeProductDetail && activeProductDetail.product ? (
        (() => {
          const dp = activeProductDetail.product
          const origin = activeProductDetail.origin_info || {}
          const usage = activeProductDetail.usage_guide || {}
          const bomList = activeProductDetail.bom_ingredients || []
          const batchList = activeProductDetail.batches || []
          const reviewList = activeProductDetail.reviews || []
          const ratingSum = activeProductDetail.rating_summary || { average_rating: 4.9, total_reviews: reviewList.length }
          const relatedList = activeProductDetail.related_products || []
          const dpRetail = Number(dp.retail_price || dp.selling_price || 45000)
          const dpWholesale = Number(dp.wholesale_price || Math.round(dpRetail * 0.82))
          const dpAgent = Number(dp.agent_price || dpWholesale)
          const dpMoq = Number(dp.wholesale_moq || 24)
          const dpStock = Number(dp.in_stock ?? 100)
          const appliedUnitPrice = agent ? dpAgent : detailQty >= dpMoq ? dpWholesale : dpRetail

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
              {/* Thanh điều hướng quay lại */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: '12px 18px',
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseProductDetail}
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}
                >
                  <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
                </button>

                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Cửa hàng / <span style={{ color: '#38bdf8' }}>{dp.category_name || 'Sản phẩm'}</span> /{' '}
                  <strong style={{ color: '#f8fafc' }}>{dp.product_name}</strong>
                </div>
              </div>

              {/* KHỐI 1: TỔNG QUAN SẢN PHẨM & ĐẶT HÀNG NHANH (LẺ / THÙNG SỈ) */}
              <div
                className="card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: 28,
                  padding: 26,
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {/* Ảnh sản phẩm lớn */}
                <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0b1120', minHeight: 340 }}>
                  <img
                    src={resolveCloudImageUrl(dp.image || dp.image_url)}
                    alt={dp.product_name}
                    style={{ width: '100%', height: '100%', maxHeight: 420, objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span
                      style={{
                        background: 'rgba(15, 23, 42, 0.88)',
                        color: '#38bdf8',
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                      }}
                    >
                      ☁️ Ảnh chuẩn Cloud CDN • Mã: {dp.product_code}
                    </span>
                    {dp.flash_sale && (
                      <span
                        style={{
                          background: '#f43f5e',
                          color: '#fff',
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: '0.76rem',
                          fontWeight: 800,
                        }}
                      >
                        ⚡ ĐANG FLASH SALE -{dp.flash_sale.discount_percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Thông tin đặt hàng */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {dp.category_name || 'Tinh Hoa Yến & Cà Phê'}
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(245, 158, 11, 0.16)',
                          color: '#fbbf24',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        ★ {ratingSum.average_rating} / 5.0 ({ratingSum.total_reviews} đánh giá xác thực)
                      </span>

                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        • Tồn kho sẵn có: <strong style={{ color: '#10b981' }}>{dpStock.toLocaleString()} {dp.unit}</strong>
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 10px', lineHeight: 1.25 }}>
                      {dp.product_name}
                    </h2>

                    <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: 16 }}>
                      {dp.health_benefits}
                    </p>

                    {/* Khung Giá Lẻ / Giá Thùng Sỉ */}
                    <div
                      style={{
                        background: 'rgba(30, 41, 59, 0.65)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                            Đơn giá áp dụng ({detailQty >= dpMoq ? `Giá Sỉ Thùng ≥ ${dpMoq} ${dp.unit}` : 'Giá Bán Lẻ'}):
                          </div>
                          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                            {appliedUnitPrice.toLocaleString()} ₫
                            <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}> / {dp.unit}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Quy cách đóng gói:</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                            {dp.case_spec || dp.packaging_spec} (MOQ: {dpMoq} {dp.unit})
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px dashed rgba(255,255,255,0.1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          color: '#cbd5e1',
                        }}
                      >
                        <span>Giá lẻ niêm yết: <strong>{dpRetail.toLocaleString()} ₫/{dp.unit}</strong></span>
                        <span style={{ color: '#34d399', fontWeight: 700 }}>
                          Mua theo thùng ({dpMoq} {dp.unit}): chỉ {dpWholesale.toLocaleString()} ₫/{dp.unit} (Tiết kiệm {Math.round((1 - dpWholesale / dpRetail) * 100)}%)
                        </span>
                      </div>
                    </div>

                    {/* Chọn số lượng & Chuyển nhanh Lẻ / 1 Thùng */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                      <span style={{ fontSize: '0.84rem', color: '#cbd5e1', fontWeight: 600 }}>Số lượng đặt:</span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                          className="btn btn-outline"
                          style={{ width: 34, height: 34, padding: 0 }}
                        >
                          <Minus size={15} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={detailQty}
                          onChange={(e) => setDetailQty(Math.max(1, Number(e.target.value) || 1))}
                          className="input-control"
                          style={{ width: 72, height: 34, textAlign: 'center', fontWeight: 700 }}
                        />
                        <button
                          type="button"
                          onClick={() => setDetailQty((q) => q + 1)}
                          className="btn btn-outline"
                          style={{ width: 34, height: 34, padding: 0 }}
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDetailQty(dpMoq)}
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          borderColor: detailQty >= dpMoq ? '#10b981' : undefined,
                          color: detailQty >= dpMoq ? '#10b981' : undefined,
                        }}
                      >
                        📦 Chọn 1 Thùng Sỉ ({dpMoq} {dp.unit})
                      </button>
                    </div>
                  </div>

                  {/* Nút Thêm Vào Giỏ & Mua Ngay Thanh Toán Liền */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(dp, detailQty)
                        setIsCartOpen(true)
                      }}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '12px 18px', fontSize: '0.92rem', fontWeight: 700 }}
                    >
                      <ShoppingCart size={18} /> + Thêm Vào Giỏ ({detailQty} {dp.unit})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        addToCart(dp, detailQty)
                        setIsCartOpen(false)
                        setShowCheckoutModal(true)
                      }}
                      className="btn btn-primary"
                      style={{
                        flex: 1.2,
                        padding: '12px 18px',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      }}
                    >
                      <Zap size={18} /> ⚡ Mua Ngay ({(appliedUnitPrice * detailQty).toLocaleString()} ₫)
                    </button>
                  </div>
                </div>
              </div>

              {/* KHỐI 2 & 3: ĐỊA CHỈ SẢN XUẤT / NGUỒN GỐC & CÔNG DỤNG CHI TIẾT */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: 20,
                }}
              >
                {/* Khối 2: Địa chỉ nhà máy sản xuất & Nguồn gốc xuất xứ */}
                <div className="card" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <MapPin size={20} color="#38bdf8" />
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      Nguồn Gốc Xuất Xứ & Địa Chỉ Nhà Máy Sản Xuất
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.86rem', color: '#cbd5e1' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Đơn vị sản xuất & Chế biến:</div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{origin.factory_name}</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 12, borderRadius: 10, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>📍 Địa chỉ nhà máy sản xuất:</div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>{origin.factory_address}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#94a3b8' }}>• Vùng nguyên liệu tuyển chọn: </strong>
                      <span>{origin.raw_material_region}</span>
                    </div>

                    <div>
                      <strong style={{ color: '#94a3b8' }}>• Công nghệ chế biến: </strong>
                      <span>{origin.production_technology}</span>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6 }}>Chứng nhận chất lượng & An toàn:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(origin.certifications || []).map((cert) => (
                          <span
                            key={cert}
                            style={{
                              background: 'rgba(16, 185, 129, 0.14)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#34d399',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}
                          >
                            ✔ {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khối 3: Công dụng sức khỏe, Đối tượng & Hướng dẫn sử dụng */}
                <div className="card" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <HeartHandshake size={20} color="#10b981" />
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      Công Dụng Sức Khỏe & Hướng Dẫn Sử Dụng
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.86rem', color: '#cbd5e1' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, marginBottom: 6 }}>
                        🌿 Công dụng nổi bật:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(usage.detailed_benefits || []).map((bf, i) => (
                          <li key={i} style={{ lineHeight: 1.45 }}>{bf}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 11, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ color: '#38bdf8' }}>👥 Đối tượng khuyên dùng: </strong>
                      <span>{usage.target_users}</span>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 11, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ color: '#fbbf24' }}>⏰ Thời điểm dùng tốt nhất: </strong>
                      <span>{usage.best_time}</span>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 11, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ color: '#a7f3d0' }}>❄️ Cách dùng & Bảo quản: </strong>
                      <span>{usage.storage_guide}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 4: THÀNH PHẦN ĐỊNH MỨC CHUẨN (BOM) & LÔ HÀNG TRUY XUẤT THỰC TẾ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: 20,
                }}
              >
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.96rem', color: '#f8fafc' }}>
                    🥣 Thành Phần Cấu Tạo Định Mức Chuẩn (Truy Xuất BOM ERP)
                  </h4>
                  {bomList.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                      Sản phẩm chế biến từ 100% nguyên liệu tự nhiên tuyển chọn theo tiêu chuẩn ISO 22000.
                    </div>
                  ) : (
                    <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Nguyên Vật Liệu Thành Phần</th>
                          <th>Định Lượng / 1 {dp.unit}</th>
                          <th>Ghi Chú Chất Lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomList.map((b, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{b.material_name}</td>
                            <td style={{ color: '#34d399', fontWeight: 700 }}>
                              {b.quantity_required} {b.bom_unit || b.mat_unit}
                            </td>
                            <td style={{ color: '#94a3b8' }}>{b.notes || 'Chuẩn kiểm định QA'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.96rem', color: '#f8fafc' }}>
                    📦 Truy Xuất Lô Thành Phẩm Thực Tế Trong Kho (Batch Traceability)
                  </h4>
                  {batchList.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                      Đang xuất từ lô mới nhất sản xuất trong tháng.
                    </div>
                  ) : (
                    <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Mã Lô (Batch)</th>
                          <th>Tồn Sẵn Có</th>
                          <th>Ngày SX</th>
                          <th>Hạn Dùng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchList.map((bt, idx) => (
                          <tr key={idx}>
                            <td><code style={{ color: '#38bdf8' }}>{bt.batch_code}</code></td>
                            <td style={{ color: '#34d399', fontWeight: 700 }}>{bt.quantity_in_stock} {dp.unit}</td>
                            <td>{bt.manufacturing_date}</td>
                            <td>{bt.expiry_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* KHỐI 5: ĐÁNH GIÁ CỦA NGƯỜI MUA (CUSTOMER REVIEWS) & FORM GỬI ĐÁNH GIÁ MỚI */}
              <div className="card" style={{ padding: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 18,
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                      ⭐ Đánh Giá Thực Tế Của Người Mua ({ratingSum.total_reviews} lượt đánh giá)
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 4 }}>
                      Điểm trung bình: <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>{ratingSum.average_rating} / 5.0 ★</strong> • 100% đánh giá từ khách hàng & đại lý đã mua hàng
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 22,
                  }}
                >
                  {/* Danh sách đánh giá */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reviewList.map((rv) => (
                      <div
                        key={rv.review_id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>{rv.reviewer_name}</strong>
                            <span
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                              }}
                            >
                              ✔ Đã mua hàng • {rv.region || 'Toàn Quốc'}
                            </span>
                            {rv.customer_type === 'AGENT_VIP' && (
                              <span
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                }}
                              >
                                Đại lý B2B
                              </span>
                            )}
                          </div>
                          <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.85rem' }}>
                            {'★'.repeat(Number(rv.rating || 5))}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                          {rv.comment}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Form gửi đánh giá mới */}
                  <form
                    onSubmit={handleSubmitReview}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      height: 'fit-content',
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>
                      ✍️ Viết Đánh Giá Của Bạn Về Sản Phẩm Này
                    </h4>

                    <div>
                      <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                        Họ tên của bạn *
                      </label>
                      <input
                        type="text"
                        className="input-control"
                        placeholder="VD: Chị Lan Hương (Hà Nội)"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                          Mức độ hài lòng
                        </label>
                        <select
                          className="input-control"
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                        >
                          <option value={5}>★★★★★ (5 Sao - Tuyệt vời)</option>
                          <option value={4}>★★★★☆ (4 Sao - Hài lòng)</option>
                          <option value={3}>★★★☆☆ (3 Sao - Bình thường)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                          Khu vực
                        </label>
                        <select
                          className="input-control"
                          value={reviewRegion}
                          onChange={(e) => setReviewRegion(e.target.value)}
                        >
                          <option value="Miền Bắc">Miền Bắc</option>
                          <option value="Miền Trung">Miền Trung</option>
                          <option value="Miền Nam">Miền Nam</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                        Cảm nhận thực tế sau khi sử dụng *
                      </label>
                      <textarea
                        rows={3}
                        className="input-control"
                        placeholder="Chia sẻ cảm nhận về hương vị, chất lượng sợi yến, quy cách đóng gói..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        style={{ padding: 10, height: 'auto' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="btn btn-primary"
                      style={{ alignSelf: 'flex-start', padding: '9px 18px', fontSize: '0.84rem' }}
                    >
                      {submittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá Xác Thực'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Sản phẩm liên quan */}
              {relatedList.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#f8fafc' }}>
                    🔥 Sản Phẩm Khác Bạn Có Thể Quan Tâm
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    {relatedList.map((rp) => (
                      <div
                        key={rp.product_id}
                        className="card"
                        style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>{rp.product_name}</div>
                          <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.84rem', marginTop: 4 }}>
                            {Number(rp.retail_price).toLocaleString()} ₫ / {rp.unit}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenProductDetail(rp.product_id)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                        >
                          🔍 Xem chi tiết
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Đang đồng bộ dữ liệu tồn kho sản phẩm từ CSDL ERP...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Không tìm thấy sản phẩm nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 24,
          }}
        >
          {filteredProducts.map((p) => {
            const retailPrice = Number(p.retail_price)
            const wholesalePrice = Number(p.wholesale_price)
            const agentPrice = Number(p.agent_price || wholesalePrice)
            const moq = Number(p.wholesale_moq)
            const inStock = Number(p.in_stock)
            const displayPrice = agent ? agentPrice : mode === 'WHOLESALE' ? wholesalePrice : retailPrice

            return (
              <div
                key={p.product_id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                }}
              >
                {/* Product Image (Cloud CDN Optimized + Fallback) */}
                <div
                  onClick={() => handleOpenProductDetail(p.product_id)}
                  style={{ position: 'relative', height: 210, width: '100%', background: '#0f172a', cursor: 'pointer' }}
                  title="Bấm để xem chi tiết sản phẩm, địa chỉ nhà máy & đánh giá"
                >
                  <img
                    src={resolveCloudImageUrl(p.image || p.image_url)}
                    alt={p.product_name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80'
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: inStock <= 0 ? 0.4 : 0.95,
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 12,
                      background: 'rgba(15, 23, 42, 0.78)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      padding: '2px 7px',
                      borderRadius: 6,
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    ☁️ Cloud CDN
                  </span>

                  <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#f8fafc',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {p.packaging_spec || p.case_spec}
                    </span>

                    {p.is_regional_top && (
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          padding: '4px 9px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                        }}
                      >
                        ⭐ TOP 1 ĐỀ XUẤT KHU VỰC
                      </span>
                    )}

                    {p.flash_sale && (
                      <span
                        style={{
                          background: '#f43f5e',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        ⚡ FLASH SALE -{p.flash_sale.discount_percentage}%
                      </span>
                    )}
                  </div>

                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    {inStock > 0 ? (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.9)',
                          color: '#042f2e',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Còn {inStock.toLocaleString()} {p.unit}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Hết hàng
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {p.category_name} • {p.product_code}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 700 }}>
                      ★ {p.average_rating || 4.9} ({p.review_count || 3})
                    </span>
                  </div>
                  <h3
                    onClick={() => handleOpenProductDetail(p.product_id)}
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      marginTop: 4,
                      marginBottom: 8,
                      lineHeight: 1.3,
                      cursor: 'pointer',
                    }}
                  >
                    {p.product_name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#94a3b8',
                      lineHeight: 1.45,
                      marginBottom: 16,
                      flex: 1,
                    }}
                  >
                    {p.health_benefits}
                  </p>

                  {/* Pricing Info Box */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {agent ? 'Giá Đại Lý VIP:' : mode === 'WHOLESALE' ? 'Giá Sỉ (Theo Thùng):' : 'Giá Bán Lẻ:'}
                      </span>
                      <div>
                        <span
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: agent ? '#38bdf8' : mode === 'WHOLESALE' ? '#10b981' : '#f8fafc',
                          }}
                        >
                          {displayPrice.toLocaleString()} ₫
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 4 }}>/{p.unit}</span>
                      </div>
                    </div>

                    {!agent && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 6,
                          paddingTop: 6,
                          borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span style={{ color: '#94a3b8' }}>
                          Lẻ: {retailPrice.toLocaleString()} ₫ | Sỉ MOQ ≥ {moq} {p.unit}:
                        </span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          {wholesalePrice.toLocaleString()} ₫ (-{Math.round((1 - wholesalePrice / retailPrice) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add to Cart & View Detail Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenProductDetail(p.product_id)}
                      className="btn btn-outline"
                      style={{ padding: '9px 11px', fontSize: '0.8rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.35)' }}
                      title="Xem thông tin chi tiết, địa chỉ sản xuất, công dụng & đánh giá người mua"
                    >
                      🔍 Xem chi tiết
                    </button>

                    <button
                      type="button"
                      disabled={inStock <= 0}
                      onClick={() => addToCart(p, 1)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '9px 10px', fontSize: '0.82rem' }}
                      title="Thêm 1 đơn vị lẻ"
                    >
                      <Plus size={15} /> +1 {p.unit}
                    </button>

                    <button
                      type="button"
                      disabled={inStock < moq}
                      onClick={() => addToCart(p, moq)}
                      className="btn btn-primary"
                      style={{ flex: 1.2, padding: '9px 10px', fontSize: '0.82rem' }}
                      title={`Thêm 1 thùng (${moq} ${p.unit}) nhận giá sỉ ưu đãi`}
                    >
                      <Package size={15} /> +1 Thùng ({moq})
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Cart Slide-out Drawer */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              height: '100%',
              background: 'var(--bg-sidebar)',
              borderLeft: '1px solid var(--border-subtle)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 20,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCart size={22} color="#10b981" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Giỏ Hàng Của Bạn</h3>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  {cartCalculations.totalCount} SP
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <p>Giỏ hàng của bạn đang trống.</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="btn btn-outline"
                    style={{ marginTop: 16, fontSize: '0.85rem' }}
                  >
                    Khám phá sản phẩm ngay
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {cartCalculations.itemsSummary.map((item) => (
                    <div
                      key={item.product.product_id}
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f8fafc' }}>
                            {item.product.product_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {item.product.unit} • {item.product.case_spec}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.product_id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Pricing Tag */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: item.isDiscounted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: item.isDiscounted ? '#10b981' : '#94a3b8',
                            fontWeight: 600,
                          }}
                        >
                          {item.discountLabel}
                        </span>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                            {item.itemFinalTotal.toLocaleString()} ₫
                          </span>
                          {item.isDiscounted && (
                            <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                              Tiết kiệm: -{item.itemSavings.toLocaleString()} ₫
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity Modifier */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          paddingTop: 8,
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Đơn giá: {item.unitPrice.toLocaleString()} ₫
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.product_id, item.quantity - 1)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', height: 28, width: 28 }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 24, textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.product_id, item.quantity + 1)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', height: 28, width: 28 }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Gợi ý đạt MOQ */}
                      {!agent && item.quantity < item.product.wholesale_moq && (
                        <div
                          style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px dashed rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 10px',
                            fontSize: '0.73rem',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>
                            Thêm {item.product.wholesale_moq - item.quantity} {item.product.unit} để nhận giá sỉ!
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.product_id, item.product.wholesale_moq)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#38bdf8',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            Nâng lên {item.product.wholesale_moq}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer Summary & Checkout */}
            {cart.length > 0 && (
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8' }}>
                  <span>Tạm tính giá gốc:</span>
                  <span>{cartCalculations.totalRetail.toLocaleString()} ₫</span>
                </div>

                {cartCalculations.totalSavings > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    <span>Ưu đãi tiết kiệm (Sỉ/Đại lý):</span>
                    <span>-{cartCalculations.totalSavings.toLocaleString()} ₫</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#f8fafc',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span>Tổng thanh toán:</span>
                  <span style={{ color: '#10b981' }}>{cartCalculations.totalFinal.toLocaleString()} ₫</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 6 }}
                >
                  Tiến Hành Đặt Hàng ({cartCalculations.totalCount} SP) <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5B. Customer Quick Login & Regional Personalization Modal */}
      {/* ========================================================================= */}
      {showProfileModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={22} color="#10b981" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Đăng Nhập Nhanh & Lưu Khu Vực</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 }}>
              Lưu thông tin số điện thoại và khu vực địa lý để hệ thống tự động đề xuất sản phẩm phù hợp thời tiết vùng miền và điền sẵn địa chỉ khi thanh toán.
            </p>

            <form onSubmit={handleSaveCustomerProfile}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Họ và Tên Khách Hàng *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Số Điện Thoại *</label>
                <input
                  type="tel"
                  className="input-control"
                  placeholder="Ví dụ: 0912345678"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Khu Vực Địa Lý Của Bạn *</label>
                <select
                  className="form-select"
                  value={profRegion}
                  onChange={(e) => setProfRegion(e.target.value)}
                >
                  <option value="NORTH">❄️ Miền Bắc (Ưu tiên Yến Lọ ấm nóng & Cháo Yến)</option>
                  <option value="CENTRAL">🎁 Miền Trung (Ưu tiên Hộp Quà Biếu & Yến Chai 300ml)</option>
                  <option value="SOUTH">☀️ Miền Nam (Ưu tiên Yến Lon giải khát & Cà Phê Phin Giấy)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Địa Chỉ Giao Hàng Mặc Định</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố..."
                  value={profAddress}
                  onChange={(e) => setProfAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowProfileModal(false)}>
                  Đóng
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu Khu Vực & Cá Nhân Hóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. B2B Agent Verification Modal */}
      {/* ========================================================================= */}
      {showAgentModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={24} color="#38bdf8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Xác Thực Đối Tác Đại Lý B2B</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 18, lineHeight: 1.5 }}>
              Nhập <strong>Mã Đại Lý</strong> hoặc <strong>Số điện thoại</strong> đã đăng ký hợp đồng với doanh nghiệp để
              mở khóa chiết khấu cấp 1 và chính sách công nợ.
            </p>

            <form onSubmit={handleVerifyAgent}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Mã Đại Lý hoặc SĐT Đăng Ký *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ví dụ: CUST_AGENT_01 hoặc 0918889999"
                  value={agentCodeInput}
                  onChange={(e) => setAgentCodeInput(e.target.value)}
                  autoFocus
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  Gợi ý test thử: <code>CUST_AGENT_01</code> (Đại Lý Sài Gòn) hoặc <code>CUST_DIST_01</code> (Nhà Phân Phối)
                </div>
              </div>

              {agentError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{agentError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="btn btn-outline"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={agentLoading}
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7' }}
                >
                  {agentLoading ? 'Đang tra cứu CSDL...' : 'Xác Thực & Kích Hoạt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. Checkout Information & Payment Modal */}
      {/* ========================================================================= */}
      {showCheckoutModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={24} color="#10b981" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Thông Tin Đặt Hàng & Thanh Toán</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Họ và Tên Khách Hàng *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Nguyễn Văn A"
                    value={checkoutName}
                    onChange={(e) => setCheckoutName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số Điện Thoại Nhận Hàng *</label>
                  <input
                    type="tel"
                    className="input-control"
                    placeholder="0901234567"
                    value={checkoutPhone}
                    onChange={(e) => setCheckoutPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Địa Chỉ Giao Hàng Chi Tiết *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                  value={checkoutAddress}
                  onChange={(e) => setCheckoutAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Ghi Chú Đơn Hàng (Tùy chọn)</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Giao giờ hành chính, gọi trước khi giao..."
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                />
              </div>

              {/* Lựa chọn phương thức thanh toán */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                  Phương Thức Thanh Toán An Toàn *
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: paymentMethod === 'VIETQR' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.4)',
                      border: paymentMethod === 'VIETQR' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="VIETQR"
                      checked={paymentMethod === 'VIETQR'}
                      onChange={() => setPaymentMethod('VIETQR')}
                    />
                    <QrCode size={20} color="#10b981" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Chuyển Khoản Ngân Hàng (VietQR Napas247)</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        Quét mã QR tự động điền đúng số tiền và nội dung đơn hàng (MBBank)
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: paymentMethod === 'COD' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.4)',
                      border: paymentMethod === 'COD' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                    />
                    <Truck size={20} color="#38bdf8" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Thanh Toán Tiền Mặt Khi Nhận Hàng (COD)</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Kiểm tra hàng trước khi thanh toán cho shipper</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background:
                        paymentMethod === 'DEBT'
                          ? 'rgba(56, 189, 248, 0.15)'
                          : agent
                          ? 'rgba(30, 41, 59, 0.4)'
                          : 'rgba(15, 23, 42, 0.4)',
                      border: paymentMethod === 'DEBT' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                      opacity: agent ? 1 : 0.5,
                      cursor: agent ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="DEBT"
                      checked={paymentMethod === 'DEBT'}
                      disabled={!agent}
                      onChange={() => setPaymentMethod('DEBT')}
                    />
                    <HeartHandshake size={20} color="#38bdf8" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          Ghi Nợ Công Nợ Đại Lý (B2B Contract)
                        </span>
                        {!agent && (
                          <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            Cần mã đối tác
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {agent
                          ? `Hạn mức khả dụng: ${agent.available_credit.toLocaleString()} ₫ (Hạn mức trần: ${agent.credit_limit.toLocaleString()} ₫)`
                          : 'Chỉ áp dụng cho đại lý chính thức đã được ban giám đốc cấp hạn mức tín dụng'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tóm tắt thanh toán */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  marginBottom: 20,
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Tổng số lượng:</span>
                  <span style={{ fontWeight: 600 }}>{cartCalculations.totalCount} sản phẩm</span>
                </div>
                {cartCalculations.totalSavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#10b981' }}>
                    <span>Ưu đãi sỉ/đại lý:</span>
                    <span>-{cartCalculations.totalSavings.toLocaleString()} ₫</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: '#f8fafc',
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span>Tổng tiền thanh toán:</span>
                  <span style={{ color: '#10b981' }}>{cartCalculations.totalFinal.toLocaleString()} ₫</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="btn btn-outline"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  {isSubmitting ? 'Đang bảo mật tạo đơn...' : 'Xác Nhận & Đặt Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. Order Success & Dynamic VietQR Modal */}
      {/* ========================================================================= */}
      {completedOrder && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 520, textAlign: 'center' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
              Đặt Hàng Thành Công!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 18 }}>
              Mã đơn hàng: <strong style={{ color: '#38bdf8' }}>{completedOrder.order_code}</strong>
            </p>

            {completedOrder.payment_method === 'VIETQR' && completedOrder.vietqr_url && (
              <div
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 18px',
                  marginBottom: 20,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>
                  QUÉT MÃ NAPAS247 ĐỂ THANH TOÁN TỰ ĐỘNG
                </div>

                <img
                  src={completedOrder.vietqr_url}
                  alt="Mã VietQR Thanh Toán"
                  style={{
                    width: 240,
                    height: 240,
                    margin: '0 auto 12px',
                    display: 'block',
                    borderRadius: 8,
                  }}
                />

                <div
                  style={{
                    background: '#f1f5f9',
                    borderRadius: 8,
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    Ngân hàng: <strong>{completedOrder.bank_info?.bank_name}</strong>
                  </div>
                  <div>
                    Số tài khoản: <strong>{completedOrder.bank_info?.account_number}</strong>
                  </div>
                  <div>
                    Chủ tài khoản: <strong>{completedOrder.bank_info?.account_name}</strong>
                  </div>
                  <div>
                    Số tiền: <strong style={{ color: '#059669', fontSize: '0.95rem' }}>{completedOrder.final_amount.toLocaleString()} ₫</strong>
                  </div>
                  <div>
                    Nội dung: <strong>{completedOrder.bank_info?.content}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyBankInfo}
                  className="btn btn-outline"
                  style={{
                    marginTop: 12,
                    width: '100%',
                    color: '#0f172a',
                    borderColor: '#cbd5e1',
                    fontSize: '0.82rem',
                  }}
                >
                  {copiedBank ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                  <span>{copiedBank ? 'Đã sao chép vào bộ nhớ tạm!' : 'Sao chép thông tin chuyển khoản'}</span>
                </button>
              </div>
            )}

            {completedOrder.payment_method === 'DEBT' && (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  marginBottom: 20,
                  fontSize: '0.85rem',
                  color: '#e0f2fe',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Giao dịch Ghi Nợ Công Nợ Đối Tác</div>
                <div>
                  Giá trị đơn hàng <strong>{completedOrder.final_amount.toLocaleString()} ₫</strong> đã được cộng vào
                  công nợ của đối tác và sẽ được đối soát theo chu kỳ thanh toán 30 ngày.
                </div>
              </div>
            )}

            {completedOrder.payment_method === 'COD' && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  marginBottom: 20,
                  fontSize: '0.85rem',
                  color: '#a7f3d0',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Thanh toán khi nhận hàng (COD)</div>
                <div>
                  Nhân viên giao vận sẽ liên hệ với bạn trước khi giao hàng. Vui lòng chuẩn bị đúng số tiền{' '}
                  <strong>{completedOrder.final_amount.toLocaleString()} ₫</strong>.
                </div>
              </div>
            )}

            <div
              style={{
                fontSize: '0.78rem',
                color: '#94a3b8',
                marginBottom: 20,
                lineHeight: 1.4,
              }}
            >
              Dữ liệu đơn hàng đã được cập nhật thời gian thực vào phân hệ <strong>Bán Hàng ERP</strong> và hệ thống{' '}
              <strong>Xuất Kho Thành Phẩm</strong>.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Tiếp tục mua hàng
              </button>
              <Link
                to="/sales"
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Xem đơn trong ERP
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. Floating AI Sales Copilot Button & Chat Widget */}
      {/* ========================================================================= */}
      {!showAIChat && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            zIndex: 1050,
          }}
        >
          {showChatGreeting && (
            <div
              onClick={() => setShowAIChat(true)}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1.5px solid #10b981',
                borderRadius: '16px 16px 4px 16px',
                padding: '10px 28px 10px 14px',
                maxWidth: 250,
                boxShadow: '0 10px 28px rgba(16, 185, 129, 0.3), 0 4px 12px rgba(0, 0, 0, 0.6)',
                color: '#f8fafc',
                fontSize: '0.82rem',
                lineHeight: 1.45,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <button
                type="button"
                aria-label="Đóng lời chào"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowChatGreeting(false)
                }}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              <div style={{ fontWeight: 600, color: '#ffffff' }}>
                👋 Tôi là trợ lý mua hàng, tôi có thể giúp gì cho bạn?
              </div>
            </div>
          )}

          <button
            type="button"
            aria-label="Trợ Lý Bán Hàng AI"
            title="Trợ Lý Bán Hàng AI"
            onClick={() => setShowAIChat(true)}
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: '2px solid #a7f3d0',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Bot size={28} />
            <span
              style={{
                position: 'absolute',
                top: 3,
                right: 3,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#34d399',
                border: '2px solid #0f172a',
              }}
            />
          </button>
        </div>
      )}

      {showAIChat && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 380,
            height: 520,
            background: '#0f172a',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.25)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                  Trợ Lý Bán Hàng AI
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Sẵn sàng tư vấn real-time
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAIChat(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '8px 12px',
              overflowX: 'auto',
              background: 'rgba(30, 41, 59, 0.5)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { label: '🌿 Người tiểu đường', text: 'Tư vấn sản phẩm cho người tiểu đường hoặc ăn kiêng' },
              { label: '🎁 Quà biếu sức khỏe', text: 'Gợi ý quà biếu bồi bổ cho người lớn tuổi hoặc người ốm' },
              { label: '💼 Mua sỉ theo thùng', text: 'Chính sách chiết khấu mua sỉ theo thùng' },
              { label: '🚚 Tra cứu đơn hàng', text: 'Hướng dẫn tra cứu đơn hàng SO' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleSendAIMessage(chip.text)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                }}
              >
                {m.role === 'assistant' && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Bot size={13} />
                  </div>
                )}

                <div
                  style={{
                    background: m.role === 'user' ? '#0284c7' : 'rgba(30, 41, 59, 0.85)',
                    color: '#f8fafc',
                    borderRadius: 12,
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {m.text}

                  {/* Hiển thị thẻ sản phẩm đa năng được AI đề xuất (Mua ngay / Thêm giỏ / Xem chi tiết) */}
                  {m.products && m.products.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {m.products.map((prod) => (
                        <div
                          key={prod.product_id}
                          style={{
                            background: 'rgba(15, 23, 42, 0.92)',
                            border: '1px solid rgba(16, 185, 129, 0.45)',
                            borderRadius: 10,
                            padding: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {prod.image && (
                              <img
                                src={resolveCloudImageUrl(prod.image)}
                                alt={prod.product_name}
                                onClick={() => handleOpenProductDetail(prod.product_id)}
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  border: '1px solid rgba(255,255,255,0.1)',
                                }}
                                title="Bấm để xem chi tiết sản phẩm"
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                onClick={() => handleOpenProductDetail(prod.product_id)}
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  color: '#f8fafc',
                                  cursor: 'pointer',
                                  lineHeight: 1.3,
                                }}
                                title="Bấm để mở trang chi tiết sản phẩm"
                              >
                                {prod.product_name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                                  {Number(prod.price || prod.retail_price || 45000).toLocaleString()} ₫/{prod.unit}
                                </span>
                                {prod.wholesale_price && (
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                    • Sỉ: {Number(prod.wholesale_price).toLocaleString()} ₫
                                  </span>
                                )}
                                <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 700 }}>
                                  ★ {prod.average_rating || 4.9}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenProductDetail(prod.product_id)}
                              className="btn btn-outline"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                height: 27,
                                color: '#38bdf8',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                              }}
                            >
                              🔍 Chi tiết
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAddAISuggestionToCart(prod)}
                              className="btn btn-outline"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                height: 27,
                                color: '#e2e8f0',
                              }}
                            >
                              + Giỏ ({prod.quantity || 1})
                            </button>

                            <button
                              type="button"
                              onClick={() => handleBuyNowFromAI(prod)}
                              className="btn btn-primary"
                              style={{
                                flex: 1,
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                height: 27,
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              }}
                            >
                              ⚡ Mua ngay
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(2, 132, 199, 0.3)',
                      color: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {aiLoading && (
              <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot size={13} />
                </div>
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.85)',
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                  }}
                >
                  AI đang tra cứu CSDL...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border-subtle)',
              background: '#0b1120',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              className="input-control"
              placeholder="Nhập câu hỏi hoặc mã SO-STORE-xxxx..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAIMessage()}
              style={{ fontSize: '0.82rem', height: 36, padding: '0 10px' }}
            />
            <button
              type="button"
              disabled={!aiInput.trim() || aiLoading}
              onClick={() => handleSendAIMessage()}
              className="btn btn-primary"
              style={{ padding: '0 12px', height: 36 }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
