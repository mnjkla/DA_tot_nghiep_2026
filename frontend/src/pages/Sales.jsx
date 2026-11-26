import React, { useEffect, useState } from 'react'
import {
  Plus,
  Send,
  CheckCircle2,
  ShoppingBag,
  Download,
  Truck,
  RotateCcw,
  AlertTriangle,
  Clock,
  Sparkles,
  Store,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function Sales({ addToast, currentUser }) {
  const [activeTab, setActiveTab] = useState('ORDERS') // 'ORDERS' | 'DEALER_REQUESTS' | 'RETURNS'
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [dealerRequests, setDealerRequests] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedStockCheck, setSelectedStockCheck] = useState({}) // requestId -> result

  const { sortConfig: orderSort, handleSort: handleOrderSort } = useTableSort('sales_order_id', 'desc')

  // Form state Đơn hàng
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [unitPrice, setUnitPrice] = useState(45000)
  const [notes, setNotes] = useState('Đơn bán hàng đại lý')

  // Form state Yêu cầu nhập hàng đại lý
  const [reqAgentCode, setReqAgentCode] = useState('AGENT-001')
  const [reqProductId, setReqProductId] = useState('')
  const [reqQuantity, setReqQuantity] = useState(50)
  const [reqNotes, setReqNotes] = useState('Đại lý Tâm An yêu cầu nhập hàng bổ sung đợt lễ')

  // Form state Phiếu Đổi trả
  const [retSalesOrderId, setRetSalesOrderId] = useState(1)
  const [retCustomerId, setRetCustomerId] = useState(1)
  const [retProductId, setRetProductId] = useState(1)
  const [retQuantity, setRetQuantity] = useState(2)
  const [retReason, setRetReason] = useState('Vỡ lọ thủy tinh trong quá trình vận chuyển')
  const [retResolution, setRetResolution] = useState('TRU_CONG_NO')
  const [retCompAmount, setRetCompAmount] = useState(90000)

  const fetchSalesData = () => {
    setLoading(true)
    Promise.all([
      api.getSalesOrders(),
      api.getCustomers(),
      api.getProducts(),
      api.getDealerRequests ? api.getDealerRequests().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getOrderReturns ? api.getOrderReturns().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([soRes, custRes, prodRes, reqRes, retRes]) => {
        setOrders(soRes.data || [])
        setCustomers(custRes.data || [])
        setProducts(prodRes.data || [])
        setDealerRequests(reqRes.data || [])
        setReturns(retRes.data || [])

        if (custRes.data && custRes.data.length > 0 && !customerId) {
          setCustomerId(custRes.data[0].customer_id)
          setRetCustomerId(custRes.data[0].customer_id)
        }
        if (prodRes.data && prodRes.data.length > 0 && !productId) {
          setProductId(prodRes.data[0].product_id)
          setReqProductId(prodRes.data[0].product_id)
          setRetProductId(prodRes.data[0].product_id)
          setUnitPrice(prodRes.data[0].selling_price || 45000)
        }
        if (soRes.data && soRes.data.length > 0) {
          setRetSalesOrderId(soRes.data[0].sales_order_id)
        }
      })
      .catch((err) => {
        console.error(err)
        addToast && addToast(err.message, 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSalesData()
  }, [])

  const handleProductSelectChange = (pId) => {
    setProductId(pId)
    const found = products.find((p) => p.product_id === Number(pId))
    if (found) {
      setUnitPrice(found.selling_price)
    }
  }

  const handleDispatchOrder = async (orderId) => {
    try {
      const res = await api.dispatchSalesOrder(orderId)
      addToast && addToast(res.message, 'success')
      fetchSalesData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleCreateSalesOrder = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        customer_id: Number(customerId),
        items: [
          {
            product_id: Number(productId),
            quantity: Number(quantity),
            unit_price: Number(unitPrice),
          },
        ],
        notes,
      }
      const res = await api.createSalesOrder(payload)
      addToast && addToast(`${res.message} (Mã: ${res.order_code})`, 'success')
      setShowModal(false)
      fetchSalesData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  // --- 2 Nhánh Xử Lý Yêu Cầu Nhập Hàng Đại Lý ---
  const handleCheckStock = async (requestId) => {
    try {
      if (!api.checkDealerRequestStock) return
      const res = await api.checkDealerRequestStock(requestId)
      setSelectedStockCheck((prev) => ({ ...prev, [requestId]: res }))
      addToast &&
        addToast(
          res.is_stock_sufficient
            ? `✓ Tồn kho khả dụng: ${res.available_stock} SP (ĐỦ ĐỂ DUYỆT XUẤT)`
            : `⚠️ Tồn kho khả dụng: ${res.available_stock} SP (THIẾU ${res.deficit_quantity} SP -> Chuyển sản xuất)`,
          res.is_stock_sufficient ? 'success' : 'warning'
        )
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleApproveDispatch = async (requestId) => {
    try {
      if (!api.approveDealerRequestDispatch) return
      const res = await api.approveDealerRequestDispatch(requestId)
      addToast &&
        addToast(
          `✓ ${res.message} (Đơn SO: ${res.sales_order_code})`,
          'success'
        )
      fetchSalesData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleRequestProductionHandoff = async (requestId) => {
    try {
      if (!api.requestDealerProductionHandoff) return
      const promisedDate = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
      const res = await api.requestDealerProductionHandoff(requestId, {
        promised_delivery_date: promisedDate,
        notes: `Hẹn giao hàng ngày ${promisedDate} và lập lệnh PO sản xuất bổ sung`,
      })
      addToast &&
        addToast(
          `⏳ ${res.message} (Lệnh PO: ${res.production_order_code} • Hẹn giao: ${res.promised_delivery_date})`,
          'success'
        )
      fetchSalesData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleCreateDealerRequest = async (e) => {
    e.preventDefault()
    try {
      const res = await api.createDealerRequest({
        agent_code: reqAgentCode.trim(),
        product_id: Number(reqProductId),
        quantity_requested: Number(reqQuantity),
        notes: reqNotes,
      })
      addToast && addToast(res.message, 'success')
      setShowRequestModal(false)
      fetchSalesData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleCreateReturn = async (e) => {
    e.preventDefault()
    try {
      const res = await api.createOrderReturn({
        sales_order_id: Number(retSalesOrderId),
        customer_id: Number(retCustomerId),
        product_id: Number(retProductId),
        quantity_returned: Number(retQuantity),
        reason: retReason,
        resolution_type: retResolution,
        amount_compensated: Number(retCompAmount),
        notes: 'Tiếp nhận xử lý đổi trả hàng lỗi theo chính sách đại lý',
      })
      addToast && addToast(res.message, 'success')
      setShowReturnModal(false)
      fetchSalesData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  return (
    <div>
      {/* Tab Switcher: Bán Hàng vs Yêu Cầu Nhập Hàng Đại Lý vs Đổi Trả Lỗi */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ORDERS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'ORDERS' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
            color: activeTab === 'ORDERS' ? '#10b981' : '#94a3b8',
            border: activeTab === 'ORDERS' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <ShoppingBag size={17} />
          <span>Đơn Bán Hàng & Xuất Kho Thành Phẩm</span>
          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(16, 185, 129, 0.25)',
              padding: '2px 7px',
              borderRadius: 10,
              color: '#34d399',
            }}
          >
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DEALER_REQUESTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'DEALER_REQUESTS' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
            color: activeTab === 'DEALER_REQUESTS' ? '#38bdf8' : '#94a3b8',
            border: activeTab === 'DEALER_REQUESTS' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <Truck size={17} />
          <span>Yêu Cầu Nhập Hàng Đại Lý (2 Nhánh Xử Lý)</span>
          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(56, 189, 248, 0.25)',
              padding: '2px 7px',
              borderRadius: 10,
              color: '#7dd3fc',
            }}
          >
            {dealerRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RETURNS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'RETURNS' ? 'rgba(244, 63, 94, 0.18)' : 'transparent',
            color: activeTab === 'RETURNS' ? '#f43f5e' : '#94a3b8',
            border: activeTab === 'RETURNS' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <RotateCcw size={17} />
          <span>Đổi Trả Hàng Lỗi & Cấn Trừ Công Nợ</span>
          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(244, 63, 94, 0.25)',
              padding: '2px 7px',
              borderRadius: 10,
              color: '#fda4af',
            }}
          >
            {returns.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ĐƠN BÁN HÀNG */}
      {activeTab === 'ORDERS' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh Sách Đơn Bán Hàng</h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Quy trình xuất kho 2 bước chuẩn ERP: Tạo đơn → Lập phiếu xuất & Trừ tồn kho theo Lô
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={api.getTaxExportUrl('ALL', 8, 'xlsx', '01_Bang_Ke_Thue_Dau_Ra')}
                download
                className="btn btn-outline"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: 'rgba(16, 185, 129, 0.45)',
                  color: '#34d399',
                }}
              >
                <Download size={16} />
                <span>Xuất Bảng Kê Thuế & Hóa Đơn (.XLSX)</span>
              </a>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} />
                <span>Lập đơn bán hàng mới</span>
              </button>
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Mã đơn" field="order_code" sortConfig={orderSort} onSort={handleOrderSort} />
                    <SortableHeader label="Kênh & Nguồn" field="channel_type" sortConfig={orderSort} onSort={handleOrderSort} />
                    <SortableHeader label="Khách hàng" field="customer_name" sortConfig={orderSort} onSort={handleOrderSort} />
                    <SortableHeader label="Tổng thanh toán" field="final_amount" sortConfig={orderSort} onSort={handleOrderSort} />
                    <SortableHeader label="Thanh toán" field="payment_method" sortConfig={orderSort} onSort={handleOrderSort} />
                    <SortableHeader label="Trạng thái kho" field="status" sortConfig={orderSort} onSort={handleOrderSort} />
                    <SortableHeader label="Ghi chú" field="notes" sortConfig={orderSort} onSort={handleOrderSort} />
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                        {loading ? 'Đang tải dữ liệu...' : 'Chưa có đơn hàng nào.'}
                      </td>
                    </tr>
                  ) : (
                    sortArrayByField(orders, orderSort).map((o) => {
                      const isStorefront = (o.order_code && o.order_code.startsWith('SO-STORE-')) || (o.channel_type === 'STOREFRONT')
                      const isWholesaleB2B = (o.notes && o.notes.includes('[STOREFRONT_WHOLESALE_B2B]')) || o.customer_type === 'AGENT'
                      const isWholesaleMoq = o.notes && o.notes.includes('[STOREFRONT_WHOLESALE_MOQ]')

                      return (
                        <tr key={o.sales_order_id}>
                          <td style={{ fontWeight: 600, color: '#38bdf8' }}>{o.order_code}</td>
                          <td>
                            {isStorefront ? (
                              <span
                                className="badge"
                                style={{
                                  background: isWholesaleB2B
                                    ? 'rgba(56, 189, 248, 0.15)'
                                    : isWholesaleMoq
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(168, 85, 247, 0.15)',
                                  color: isWholesaleB2B ? '#38bdf8' : isWholesaleMoq ? '#10b981' : '#c084fc',
                                  fontWeight: 700,
                                }}
                              >
                                {isWholesaleB2B
                                  ? '🌐 Cổng B2B Đại Lý'
                                  : isWholesaleMoq
                                  ? '🌐 Cổng Sỉ Thùng'
                                  : '🌐 Cổng Bán Lẻ'}
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                                🏢 Trực Tiếp ERP
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            <div>{o.customer_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.phone}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#10b981' }}>
                            {Number(o.final_amount).toLocaleString('vi-VN')} ₫
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background:
                                  o.payment_method === 'VIETQR'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : o.payment_method === 'DEBT'
                                    ? 'rgba(56, 189, 248, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color:
                                  o.payment_method === 'VIETQR'
                                    ? '#10b981'
                                    : o.payment_method === 'DEBT'
                                    ? '#38bdf8'
                                    : '#f59e0b',
                                fontSize: '0.75rem',
                              }}
                            >
                              {o.payment_method === 'VIETQR'
                                ? 'VietQR Napas'
                                : o.payment_method === 'DEBT'
                                ? 'Công nợ B2B'
                                : o.payment_method || 'COD'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${o.status === 'NEW' ? 'pending' : 'completed'}`}>
                              {o.status === 'NEW' ? 'Đơn mới (Chưa xuất)' : 'Đã xuất kho & giao'}
                            </span>
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.notes}>
                            {o.notes || '—'}
                          </td>
                          <td>
                            {o.status === 'NEW' ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-action"
                                onClick={() => handleDispatchOrder(o.sales_order_id)}
                                title="Lập phiếu xuất kho và trừ số lượng theo lô tồn kho chuẩn 2 bước"
                              >
                                <Send size={14} />
                                <span>Xuất kho (Trừ lô)</span>
                              </button>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={14} color="#10b981" /> Đã hoàn thành
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: YÊU CẦU NHẬP HÀNG ĐẠI LÝ (2 NHÁNH XỬ LÝ) */}
      {activeTab === 'DEALER_REQUESTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Guide Banner Quy trình 2 nhánh */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Truck size={24} color="#38bdf8" />
              <div style={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
                <strong style={{ color: '#f8fafc' }}>Luồng Phân Phối Đại Lý Thực Dụng (2 Nhánh Quyết Định Tồn Kho):</strong>
                <div style={{ color: '#cbd5e1', marginTop: 4 }}>
                  ● <strong>Nhánh 1 (Đủ hàng tồn kho):</strong> Bấm &ldquo;Duyệt Xuất Kho Ngay&rdquo; &rarr; Tự động sinh Đơn SO và trừ kho thành phẩm.<br />
                  ● <strong>Nhánh 2 (Thiếu tồn kho):</strong> Bấm &ldquo;Hẹn Giao &amp; Chuyển Lệnh SX&rdquo; &rarr; Tự động hẹn ngày giao sau 5 ngày và chuyển Phiếu sang Lệnh sản xuất PO cho Quản đốc.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowRequestModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Gửi Yêu Cầu Nhập Hàng</span>
            </button>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 14, color: '#f8fafc' }}>
              Danh Sách Yêu Cầu Nhập Hàng Của Các Đại Lý
            </h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã Yêu Cầu</th>
                    <th>Đại Lý Gửi Yêu Cầu</th>
                    <th>Sản Phẩm</th>
                    <th>Số Lượng Yêu Cầu</th>
                    <th>Kiểm Tra Tồn Khả Dụng</th>
                    <th>Trạng Thái</th>
                    <th>Ngày Hẹn Giao / Liên Kết</th>
                    <th>Hành Động Phê Duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  {dealerRequests.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                        Chưa có yêu cầu nhập hàng nào từ đại lý.
                      </td>
                    </tr>
                  ) : (
                    dealerRequests.map((req) => {
                      const stockInfo = selectedStockCheck[req.request_id]
                      const isPending = req.status === 'CHO_DUYET'
                      return (
                        <tr key={req.request_id}>
                          <td style={{ fontWeight: 700, color: '#38bdf8' }}>{req.request_code}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{req.customer_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mã: {req.agent_code}</div>
                          </td>
                          <td style={{ fontWeight: 500 }}>{req.product_name}</td>
                          <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                            {req.quantity_requested} {req.unit}
                          </td>
                          <td>
                            {stockInfo ? (
                              <div style={{ fontSize: '0.75rem' }}>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontWeight: 700,
                                    background: stockInfo.is_stock_sufficient ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                    color: stockInfo.is_stock_sufficient ? '#10b981' : '#f43f5e',
                                  }}
                                >
                                  {stockInfo.is_stock_sufficient ? `✓ Đủ hàng (Tồn: ${stockInfo.available_stock})` : `Thiếu ${stockInfo.deficit_quantity} (Tồn: ${stockInfo.available_stock})`}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCheckStock(req.request_id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  background: 'rgba(56, 189, 248, 0.1)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  cursor: 'pointer',
                                }}
                              >
                                🔍 So Khớp Tồn Kho
                              </button>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background:
                                  req.status === 'DA_XUAT_KHO'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : req.status === 'CHUYEN_SAN_XUAT'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(56, 189, 248, 0.15)',
                                color:
                                  req.status === 'DA_XUAT_KHO'
                                    ? '#10b981'
                                    : req.status === 'CHUYEN_SAN_XUAT'
                                    ? '#f59e0b'
                                    : '#38bdf8',
                              }}
                            >
                              {req.status === 'DA_XUAT_KHO'
                                ? '✓ Đã Xuất Kho'
                                : req.status === 'CHUYEN_SAN_XUAT'
                                ? '⏳ Đã Chuyển SX & Hẹn Giao'
                                : '⏳ Chờ Duyệt Nhập'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                            {req.promised_delivery_date ? (
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                                📅 Hẹn: {req.promised_delivery_date}
                              </span>
                            ) : req.sales_order_id ? (
                              <span style={{ color: '#34d399' }}>Đơn SO #{req.sales_order_id}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveDispatch(req.request_id)}
                                  className="btn btn-action"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.18)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                  }}
                                  title="Nhánh 1: Tồn kho đủ -> Duyệt xuất hàng ngay cho đại lý"
                                >
                                  ✓ Duyệt Xuất Kho
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestProductionHandoff(req.request_id)}
                                  className="btn btn-action"
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.18)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                  }}
                                  title="Nhánh 2: Thiếu kho -> Hẹn ngày giao 5 ngày & tạo PO sản xuất"
                                >
                                  ⏳ Hẹn Giao & Chuyển SX
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đã hoàn tất xử lý</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ĐỔI TRẢ HÀNG LỖI & CẤN TRỪ CÔNG NỢ */}
      {activeTab === 'RETURNS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                Hồ Sơ Đổi Trả Hàng Lỗi & Cấn Trừ Công Nợ Đại Lý
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                Xử lý khiếu nại sản phẩm lỗi, hỏng vỡ trong vận chuyển. Tự động cấn trừ số tiền bồi hoàn vào công nợ đại lý hoặc cấp đổi sản phẩm mới.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowReturnModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Tiếp Nhận Đổi Trả Mới</span>
            </button>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã Phiếu Đổi Trả</th>
                    <th>Đại Lý Khiếu Nại</th>
                    <th>Sản Phẩm</th>
                    <th>Số Lượng Lỗi</th>
                    <th>Lý Do Hư Hỏng</th>
                    <th>Phương Án Xử Lý</th>
                    <th>Số Tiền Cấn Trừ</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                        Chưa có phiếu đổi trả hàng nào.
                      </td>
                    </tr>
                  ) : (
                    returns.map((ret) => (
                      <tr key={ret.return_id}>
                        <td style={{ fontWeight: 700, color: '#f43f5e' }}>{ret.return_code}</td>
                        <td style={{ fontWeight: 600 }}>{ret.customer_name || 'Đại lý'}</td>
                        <td style={{ fontWeight: 500 }}>{ret.product_name || 'Yến Chưng'}</td>
                        <td style={{ fontWeight: 700, color: '#f43f5e' }}>{ret.quantity_returned} SP</td>
                        <td style={{ fontSize: '0.8rem', color: '#cbd5e1', maxWidth: 220 }}>{ret.reason}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: ret.resolution_type === 'TRU_CONG_NO' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: ret.resolution_type === 'TRU_CONG_NO' ? '#38bdf8' : '#10b981',
                            }}
                          >
                            {ret.resolution_type === 'TRU_CONG_NO' ? 'Cấn Trừ Công Nợ' : 'Đổi Hàng Mới'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>
                          {Number(ret.amount_compensated || 0).toLocaleString()} ₫
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                            }}
                          >
                            ✓ {ret.status === 'DA_XU_LY' ? 'Đã Xử Lý Cấn Trừ' : 'Chờ Tiếp Nhận'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lập Đơn Hàng Mới */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Lập Đơn Bán Hàng Mới</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSalesOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chọn khách hàng</label>
                  <select
                    className="form-select"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.customer_name} ({c.customer_type} - {c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Chọn mặt hàng</label>
                  <select
                    className="form-select"
                    value={productId}
                    onChange={(e) => handleProductSelectChange(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} - {Number(p.selling_price).toLocaleString('vi-VN')} ₫
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đơn giá (₫)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Thành tiền dự kiến:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                    {(Number(quantity) * Number(unitPrice)).toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú đơn hàng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo Đơn Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Yêu Cầu Nhập Hàng Đại Lý Mới */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Tạo Yêu Cầu Nhập Hàng Đại Lý</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setShowRequestModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDealerRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã hoặc Tên Đại lý</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reqAgentCode}
                    onChange={(e) => setReqAgentCode(e.target.value)}
                    placeholder="AGENT-001 hoặc SĐT"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sản phẩm cần nhập</label>
                  <select
                    className="form-select"
                    value={reqProductId}
                    onChange={(e) => setReqProductId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.packaging_spec || p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Số lượng yêu cầu</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={reqQuantity}
                    onChange={(e) => setReqQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú yêu cầu</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Gửi Yêu Cầu Nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phiếu Đổi Trả Mới */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Tiếp Nhận Đổi Trả Hàng Lỗi</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setShowReturnModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateReturn}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chọn đại lý / khách hàng khiếu nại</label>
                  <select
                    className="form-select"
                    value={retCustomerId}
                    onChange={(e) => setRetCustomerId(e.target.value)}
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.customer_name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mặt hàng lỗi</label>
                  <select
                    className="form-select"
                    value={retProductId}
                    onChange={(e) => setRetProductId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Số lượng lỗi</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={retQuantity}
                      onChange={(e) => setRetQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số tiền bồi hoàn (đ)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={retCompAmount}
                      onChange={(e) => setRetCompAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phương án xử lý</label>
                  <select
                    className="form-select"
                    value={retResolution}
                    onChange={(e) => setRetResolution(e.target.value)}
                  >
                    <option value="TRU_CONG_NO">Cấn trừ trực tiếp vào công nợ đại lý</option>
                    <option value="DOI_HANG_MOI">Đổi lô hàng mới cùng loại</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Lý do hư hại</label>
                  <input
                    type="text"
                    className="form-input"
                    value={retReason}
                    onChange={(e) => setRetReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReturnModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác Nhận & Cấn Trừ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
