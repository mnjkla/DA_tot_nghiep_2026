import React, { useEffect, useState } from 'react'
import {
  Plus,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Download,
  Factory,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Edit,
  Phone,
  MapPin,
  Building,
  User,
  History,
  FileText,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function Production({ addToast, currentUser }) {
  const [activeTab, setActiveTab] = useState('ORDERS') // 'ORDERS' | 'WORKSHOPS'
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const { sortConfig: poSort, handleSort: handlePoSort } = useTableSort('order_id', 'desc')

  // Form state Tạo PO mới (QDSX_05)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [targetQuantity, setTargetQuantity] = useState(100)
  const [selectedWorkshopId, setSelectedWorkshopId] = useState(1)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState('Lệnh sản xuất đợt 1')

  // Modal Xem Chi Tiết Lệnh Sản Xuất (QDSX_04)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // State Quản lý Xưởng sản xuất (QDSX_03)
  const [showWorkshopModal, setShowWorkshopModal] = useState(false)
  const [editingWorkshop, setEditingWorkshop] = useState(null) // null = create new
  const [wsCode, setWsCode] = useState('')
  const [wsName, setWsName] = useState('')
  const [wsType, setWsType] = useState('YEN_SAO')
  const [wsLocation, setWsLocation] = useState('')
  const [wsManager, setWsManager] = useState('')
  const [wsPhone, setWsPhone] = useState('')
  const [wsCapacity, setWsCapacity] = useState(3000)
  const [wsStatus, setWsStatus] = useState('ACTIVE')

  // Modal Lịch sử Lệnh SX của Phân xưởng
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyWorkshop, setHistoryWorkshop] = useState(null)
  const [historyOrders, setHistoryOrders] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [monthlySummary, setMonthlySummary] = useState({ data: [], monthly_breakdown: [] })

  const fetchProductionData = () => {
    setLoading(true)
    Promise.all([
      api.getProductionOrders(),
      api.getProducts(),
      api.getWorkshops ? api.getWorkshops().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getProductionMonthlySummary ? api.getProductionMonthlySummary().catch(() => ({ data: [], monthly_breakdown: [] })) : Promise.resolve({ data: [], monthly_breakdown: [] }),
    ])
      .then(([ordersRes, prodRes, wsRes, monthRes]) => {
        setOrders(ordersRes.data || [])
        setProducts(prodRes.data || [])
        setWorkshops(wsRes.data || [])
        setMonthlySummary(monthRes || { data: [], monthly_breakdown: [] })
        if (prodRes.data && prodRes.data.length > 0 && !selectedProductId) {
          setSelectedProductId(prodRes.data[0].product_id)
        }
        if (wsRes.data && wsRes.data.length > 0 && !selectedWorkshopId) {
          setSelectedWorkshopId(wsRes.data[0].workshop_id)
        }
      })
      .catch((err) => {
        console.error(err)
        addToast && addToast(err.message, 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProductionData()
  }, [])

  const handleStartOrder = async (orderId) => {
    try {
      const res = await api.startProductionOrder(orderId)
      addToast && addToast(res.message, 'success')
      fetchProductionData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleRequestMaterials = async (orderId) => {
    try {
      const res = api.requestMaterialsForPO
        ? await api.requestMaterialsForPO(orderId)
        : { message: 'Đã lập Phiếu yêu cầu xuất NVL chờ Trưởng kho duyệt!' }
      addToast && addToast(res.message, 'success')
      fetchProductionData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleCompleteOrder = async (orderId) => {
    try {
      const res = await api.completeProductionOrder(orderId)
      addToast && addToast(`${res.message} (Chờ Thủ kho duyệt nhập kho thành phẩm)`, 'success')
      fetchProductionData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleAutoReorderDefect = async (orderId) => {
    try {
      if (!api.autoReorderDefect) return
      const res = await api.autoReorderDefect(orderId)
      addToast &&
        addToast(
          `${res.message} (Lệnh bù mới: ${res.new_order_code} • SL bù: ${res.reorder_quantity})`,
          'success'
        )
      fetchProductionData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleOpenOrderDetail = async (orderId) => {
    setShowDetailModal(true)
    setLoadingDetail(true)
    try {
      if (api.getProductionOrderDetails) {
        const data = await api.getProductionOrderDetails(orderId)
        setDetailOrder(data)
      } else {
        const found = orders.find((o) => o.order_id === orderId)
        setDetailOrder(found)
      }
    } catch (err) {
      addToast && addToast(err.message || 'Lỗi nạp chi tiết lệnh sản xuất', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    try {
      const prod = products.find((p) => p.product_id === Number(selectedProductId))
      const dateCode = new Date().toLocaleDateString('en-GB').replace(/\//g, '').slice(0, 4) + '26'
      const bomVer = `BOM_${prod?.product_code || 'SP01'}_${dateCode}_v1`

      const res = await api.createProductionOrder({
        product_id: Number(selectedProductId),
        target_quantity: Number(targetQuantity),
        workshop_id: Number(selectedWorkshopId),
        start_time: startDate ? `${startDate} 08:00:00` : null,
        end_time: endDate ? `${endDate} 17:00:00` : null,
        bom_version: bomVer,
        notes: notes,
        requested_by: currentUser ? `${currentUser.username} (${currentUser.full_name})` : 'sanxuat (Quản Đốc SX)',
      })
      addToast &&
        addToast(
          `${res.message} (Mã PO: ${res.order_code} • Phiên bản BOM: ${res.bom_version || bomVer})`,
          'success'
        )
      setShowModal(false)
      fetchProductionData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  // Workshop management handlers (QDSX_03)
  const handleOpenCreateWorkshop = () => {
    setEditingWorkshop(null)
    setWsCode(`WS${String(workshops.length + 1).padStart(2, '0')}`)
    setWsName('')
    setWsType('YEN_SAO')
    setWsLocation('')
    setWsManager('Lê Văn Sản')
    setWsPhone('0905123456')
    setWsCapacity(3000)
    setWsStatus('ACTIVE')
    setShowWorkshopModal(true)
  }

  const handleOpenEditWorkshop = (ws) => {
    setEditingWorkshop(ws)
    setWsCode(ws.workshop_code)
    setWsName(ws.workshop_name)
    setWsType(ws.workshop_type || 'YEN_SAO')
    setWsLocation(ws.location || '')
    setWsManager(ws.manager_name || '')
    setWsPhone(ws.contact_phone || '0905123456')
    setWsCapacity(ws.capacity_per_day || 2000)
    setWsStatus(ws.status || 'ACTIVE')
    setShowWorkshopModal(true)
  }

  const handleSaveWorkshop = async (e) => {
    e.preventDefault()
    try {
      if (editingWorkshop) {
        await api.updateWorkshop(editingWorkshop.workshop_id, {
          workshop_name: wsName.trim(),
          workshop_type: wsType,
          location: wsLocation.trim(),
          manager_name: wsManager.trim(),
          contact_phone: wsPhone.trim(),
          capacity_per_day: Number(wsCapacity),
          status: wsStatus,
        })
        addToast && addToast(`Đã cập nhật thông tin phân xưởng ${wsName}`, 'success')
      } else {
        await api.createWorkshop({
          workshop_code: wsCode.trim().toUpperCase(),
          workshop_name: wsName.trim(),
          workshop_type: wsType,
          location: wsLocation.trim(),
          manager_name: wsManager.trim(),
          contact_phone: wsPhone.trim(),
          capacity_per_day: Number(wsCapacity),
        })
        addToast && addToast(`Tạo thành công phân xưởng mới ${wsName}`, 'success')
      }
      setShowWorkshopModal(false)
      fetchProductionData()
    } catch (err) {
      addToast && addToast(err.message || 'Lỗi lưu thông tin xưởng', 'error')
    }
  }

  const handleViewWorkshopHistory = async (ws) => {
    setHistoryWorkshop(ws)
    setShowHistoryModal(true)
    setLoadingHistory(true)
    try {
      if (api.getWorkshopHistory) {
        const res = await api.getWorkshopHistory(ws.workshop_id)
        setHistoryOrders(res.data || [])
      } else {
        const filtered = orders.filter((o) => o.workshop_id === ws.workshop_id)
        setHistoryOrders(filtered)
      }
    } catch (err) {
      addToast && addToast(err.message || 'Lỗi tải lịch sử lệnh của xưởng', 'error')
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true
    return o.status === filter
  })

  return (
    <div>
      {/* Tab Switcher: Lệnh Sản Xuất vs Quản Lý Phân Xưởng */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <Factory size={17} />
            <span>Lệnh Sản Xuất & Bù Hao Hụt (PO)</span>
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
            onClick={() => setActiveTab('WORKSHOPS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'WORKSHOPS' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
              color: activeTab === 'WORKSHOPS' ? '#38bdf8' : '#94a3b8',
              border: activeTab === 'WORKSHOPS' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <Building size={17} />
            <span>Quản Lý Phân Xưởng Sản Xuất (QDSX_03)</span>
            <span
              style={{
                fontSize: '0.72rem',
                background: 'rgba(56, 189, 248, 0.25)',
                padding: '2px 7px',
                borderRadius: 10,
                color: '#7dd3fc',
              }}
            >
              {workshops.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MONTHLY_SUMMARY')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'MONTHLY_SUMMARY' ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
              color: activeTab === 'MONTHLY_SUMMARY' ? '#c084fc' : '#94a3b8',
              border: activeTab === 'MONTHLY_SUMMARY' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <Calendar size={17} />
            <span>Tổng Kết Sản Lượng Theo Tháng (QDSX_09)</span>
          </button>
        </div>

        {activeTab === 'ORDERS' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
            <span>Lập Lệnh Sản Xuất Mới (Có Mốc Thời Gian)</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateWorkshop}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7' }}
          >
            <Plus size={16} />
            <span>Đăng Ký Phân Xưởng Mới</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DANH SÁCH LỆNH SẢN XUẤT (PO)                       */}
      {/* ========================================================= */}
      {activeTab === 'ORDERS' && (
        <>
          {/* Filter Bar */}
          <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất cả lệnh' },
                { id: 'PENDING', label: 'Chờ sản xuất' },
                { id: 'IN_PROGRESS', label: 'Đang sản xuất' },
                { id: 'HOAN_THANH', label: 'Đã hoàn thành' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`btn ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Hiển thị: <strong>{filteredOrders.length}</strong> lệnh sản xuất
            </div>
          </div>

          {/* Orders Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Mã Lệnh" field="order_code" sortConfig={poSort} onSort={handlePoSort} />
                    <SortableHeader label="Sản Phẩm" field="product_name" sortConfig={poSort} onSort={handlePoSort} />
                    <th>Phân Xưởng Phụ Trách</th>
                    <th>Thời Hạn (Bắt đầu → Hạn chót)</th>
                    <SortableHeader label="Số Lượng KH" field="target_quantity" sortConfig={poSort} onSort={handlePoSort} />
                    <th>Số Lượng Hoàn Thành</th>
                    <th>Tỷ Lệ Lỗi</th>
                    <SortableHeader label="Trạng Thái SX" field="status" sortConfig={poSort} onSort={handlePoSort} />
                    <th>Phiếu Xuất NVL (2 Bước)</th>
                    <th style={{ textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                        Đang tải danh sách lệnh sản xuất...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                        Không có lệnh sản xuất nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    sortArrayByField(filteredOrders, poSort.field, poSort.direction).map((order) => {
                      const isPending = order.status === 'PENDING'
                      const isInProgress = order.status === 'IN_PROGRESS'
                      const isCompleted = order.status === 'HOAN_THANH' || order.status === 'COMPLETED'
                      const isCancelled = order.status === 'CANCELLED'
                      const defectRate = Number(order.defect_rate || 0)
                      const isHighDefect = defectRate > 10.0

                      return (
                        <tr key={order.order_id}>
                          <td>
                            <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                              {order.order_code}
                            </strong>
                            {order.bom_version && (
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
                                {order.bom_version}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{order.product_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Mã SP: {order.product_code}
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#cbd5e1' }}>
                              <Building size={14} color="#38bdf8" />
                              {order.workshop_name || 'Xưởng 1 (Khánh Hòa)'}
                            </span>
                            {order.contact_phone && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                                ĐT: {order.contact_phone}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                              {order.start_time ? order.start_time.slice(0, 10) : 'Hôm nay'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 2 }}>
                              Hạn: {order.end_time ? order.end_time.slice(0, 10) : 'Chưa định hạn'}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {Number(order.target_quantity).toLocaleString('vi-VN')} {order.unit}
                          </td>
                          <td>
                            <strong style={{ color: isCompleted ? '#10b981' : '#94a3b8' }}>
                              {Number(order.completed_quantity || 0).toLocaleString('vi-VN')}
                            </strong>
                          </td>
                          <td>
                            {defectRate > 0 ? (
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color: isHighDefect ? '#f43f5e' : '#e2e8f0',
                                  background: isHighDefect ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                                  padding: isHighDefect ? '2px 6px' : '0',
                                  borderRadius: 4,
                                }}
                              >
                                {defectRate.toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>0%</span>
                            )}
                          </td>
                          <td>
                            {isPending && <span className="badge badge-warning">Chờ duyệt</span>}
                            {isInProgress && <span className="badge badge-info">Đang sản xuất</span>}
                            {isCompleted && <span className="badge badge-success">Đã hoàn thành</span>}
                            {isCancelled && <span className="badge badge-danger">Đã hủy</span>}
                          </td>
                          <td>
                            {order.requisition_status === 'APPROVED' ? (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <ShieldCheck size={14} /> Đã xuất kho NVL
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={14} /> Chờ Trưởng kho duyệt
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                              {/* Nút Xem Chi Tiết Lệnh (QDSX_04) */}
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleOpenOrderDetail(order.order_id)}
                                title="Xem chi tiết lệnh, định mức BOM & NVL"
                              >
                                <Eye size={14} />
                              </button>

                              {isPending && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => handleStartOrder(order.order_id)}
                                >
                                  Bắt đầu (Xuất NVL)
                                </button>
                              )}

                              {isInProgress && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#10b981' }}
                                  onClick={() => handleCompleteOrder(order.order_id)}
                                >
                                  Hoàn Thành
                                </button>
                              )}

                              {isCompleted && isHighDefect && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    color: '#f43f5e',
                                    borderColor: 'rgba(244, 63, 94, 0.4)',
                                  }}
                                  onClick={() => handleAutoReorderDefect(order.order_id)}
                                  title="Hao hụt cao vượt định mức: Tự động lập lệnh sản xuất bù"
                                >
                                  Tạo Lệnh Bù
                                </button>
                              )}
                            </div>
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

      {/* ========================================================= */}
      {/* TAB 2: QUẢN LÝ CÁC PHÂN XƯỞNG SẢN XUẤT (QDSX_03)           */}
      {/* ========================================================= */}
      {activeTab === 'WORKSHOPS' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Danh Sách Các Phân Xưởng Sản Xuất
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0' }}>
                Quản lý các cơ sở sản xuất, người đại diện xưởng, số điện thoại liên hệ và lịch sử các lệnh sản xuất (QDSX_03)
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Xưởng</th>
                  <th>Tên Phân Xưởng</th>
                  <th>Loại Hình Chế Biến</th>
                  <th>Địa Chỉ Nhà Xưởng</th>
                  <th>Người Đại Diện Xưởng</th>
                  <th>Liên Hệ (SĐT)</th>
                  <th>Công Suất Thiết Kế</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {workshops.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                      Chưa có phân xưởng sản xuất nào được cấu hình.
                    </td>
                  </tr>
                ) : (
                  workshops.map((ws) => (
                    <tr key={ws.workshop_id}>
                      <td>
                        <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                          {ws.workshop_code}
                        </strong>
                      </td>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {ws.workshop_name}
                      </td>
                      <td>
                        <span className="badge badge-info">{ws.workshop_type}</span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.82rem', maxWidth: 220 }}>
                        {ws.location}
                      </td>
                      <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {ws.manager_name || 'Lê Văn Sản'}
                      </td>
                      <td>
                        <span style={{ color: '#34d399', fontWeight: 600, fontFamily: 'monospace' }}>
                          {ws.contact_phone || '0905123456'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {Number(ws.capacity_per_day || 2000).toLocaleString('vi-VN')} SP/ngày
                      </td>
                      <td>
                        <span className={`badge ${ws.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {ws.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleViewWorkshopHistory(ws)}
                            title="Xem lịch sử các lệnh sản xuất của xưởng"
                          >
                            <History size={14} />
                            <span style={{ marginLeft: 4 }}>Lịch Sử Lệnh</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenEditWorkshop(ws)}
                            title="Chỉnh sửa thông tin xưởng"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BÁO CÁO TỔNG KẾT SẢN LƯỢNG THEO THÁNG (QDSX_09)    */}
      {/* ========================================================= */}
      {activeTab === 'MONTHLY_SUMMARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Bảng tiến độ theo tháng */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#c084fc" />
              <span>Tiến Độ Sản Xuất & Tỷ Lệ Hao Hụt Theo Tháng (QDSX_09)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
              Thống kê tổng số lệnh sản xuất, sản lượng thực nhận đạt chuẩn và tỷ lệ hao hụt trung bình theo từng kỳ kinh doanh.
            </p>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ Báo Cáo / Tháng</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Tổng Sản Lượng Đạt</th>
                    <th>Tỷ Lệ Hao Hụt Trung Bình</th>
                    <th>Đánh Giá Kế Hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.monthly_breakdown || []).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{m.month}</td>
                      <td style={{ fontWeight: 600 }}>{m.total_orders} lệnh</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(m.total_output).toLocaleString('vi-VN')} sản phẩm
                      </td>
                      <td style={{ fontWeight: 600, color: m.avg_defect_pct > 2.5 ? '#f43f5e' : '#f59e0b' }}>
                        {m.avg_defect_pct}%
                      </td>
                      <td>
                        <span className="badge badge-success">{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Bảng tổng kết theo từng dòng sản phẩm */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14 }}>
              Tổng Kết Sản Lượng Hoàn Thành Theo Từng Dòng Sản Phẩm
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th>Đơn Vị</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Kế Hoạch Đề Ra</th>
                    <th>Thực Tế Hoàn Thành</th>
                    <th>Tỷ Lệ Hoàn Thành</th>
                    <th>Hao Hụt TB (%)</th>
                    <th>Tổng Chi Phí Vốn SX</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.data || []).map((p) => {
                    const target = Number(p.total_target_qty || 0)
                    const comp = Number(p.total_completed_qty || 0)
                    const rate = target > 0 ? ((comp / target) * 100).toFixed(1) : '100.0'
                    return (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{p.product_code}</td>
                        <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                        <td>{p.unit}</td>
                        <td>{p.total_orders} lệnh</td>
                        <td style={{ color: '#cbd5e1' }}>{Number(target).toLocaleString('vi-VN')}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{Number(comp).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ color: Number(p.avg_defect_rate || 0) > 5 ? '#f43f5e' : '#cbd5e1', fontWeight: 600 }}>
                          {Number(p.avg_defect_rate || 0).toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {Number(p.total_production_cost || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: TẠO LỆNH SẢN XUẤT MỚI (QDSX_05)                  */}
      {/* ========================================================= */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Lập Lệnh Sản Xuất Mới (Có Mốc Thời Gian & Xưởng)
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Dòng sản phẩm sản xuất</label>
                  <select
                    className="form-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.packaging_spec || p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Số lượng kế hoạch</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phân xưởng sản xuất phụ trách</label>
                    <select
                      className="form-select"
                      value={selectedWorkshopId}
                      onChange={(e) => setSelectedWorkshopId(e.target.value)}
                      required
                    >
                      {workshops.map((w) => (
                        <option key={w.workshop_id} value={w.workshop_id}>
                          {w.workshop_name} ({w.workshop_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Ngày bắt đầu sản xuất</label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hạn hoàn thành (Deadline)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú & Chỉ đạo kỹ thuật</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Yêu cầu kiểm tra nhiệt độ chưng 121 độ C, chuẩn quy cách..."
                  />
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  ℹ️ Lệnh sản xuất sau khi tạo sẽ tự động sinh <strong>Phiếu Yêu Cầu Xuất NVL 2 Bước</strong> gửi đến Trưởng kho phê duyệt theo định mức BOM tiêu chuẩn.
                </div>
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác Nhận Tạo Lệnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BÁO CÁO TỔNG KẾT SẢN LƯỢNG THEO THÁNG (QDSX_09)    */}
      {/* ========================================================= */}
      {activeTab === 'MONTHLY_SUMMARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Bảng tiến độ theo tháng */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#c084fc" />
              <span>Tiến Độ Sản Xuất & Tỷ Lệ Hao Hụt Theo Tháng (QDSX_09)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
              Thống kê tổng số lệnh sản xuất, sản lượng thực nhận đạt chuẩn và tỷ lệ hao hụt trung bình theo từng kỳ kinh doanh.
            </p>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ Báo Cáo / Tháng</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Tổng Sản Lượng Đạt</th>
                    <th>Tỷ Lệ Hao Hụt Trung Bình</th>
                    <th>Đánh Giá Kế Hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.monthly_breakdown || []).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{m.month}</td>
                      <td style={{ fontWeight: 600 }}>{m.total_orders} lệnh</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(m.total_output).toLocaleString('vi-VN')} sản phẩm
                      </td>
                      <td style={{ fontWeight: 600, color: m.avg_defect_pct > 2.5 ? '#f43f5e' : '#f59e0b' }}>
                        {m.avg_defect_pct}%
                      </td>
                      <td>
                        <span className="badge badge-success">{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Bảng tổng kết theo từng dòng sản phẩm */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14 }}>
              Tổng Kết Sản Lượng Hoàn Thành Theo Từng Dòng Sản Phẩm
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th>Đơn Vị</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Kế Hoạch Đề Ra</th>
                    <th>Thực Tế Hoàn Thành</th>
                    <th>Tỷ Lệ Hoàn Thành</th>
                    <th>Hao Hụt TB (%)</th>
                    <th>Tổng Chi Phí Vốn SX</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.data || []).map((p) => {
                    const target = Number(p.total_target_qty || 0)
                    const comp = Number(p.total_completed_qty || 0)
                    const rate = target > 0 ? ((comp / target) * 100).toFixed(1) : '100.0'
                    return (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{p.product_code}</td>
                        <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                        <td>{p.unit}</td>
                        <td>{p.total_orders} lệnh</td>
                        <td style={{ color: '#cbd5e1' }}>{Number(target).toLocaleString('vi-VN')}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{Number(comp).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ color: Number(p.avg_defect_rate || 0) > 5 ? '#f43f5e' : '#cbd5e1', fontWeight: 600 }}>
                          {Number(p.avg_defect_rate || 0).toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {Number(p.total_production_cost || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: XEM CHI TIẾT LỆNH SẢN XUẤT (QDSX_04)             */}
      {/* ========================================================= */}
      {showDetailModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Chi Tiết Lệnh Sản Xuất: {detailOrder?.order_code}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px' }}
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                  Đang tải thông tin chi tiết lệnh sản xuất...
                </div>
              ) : detailOrder ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Overview Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sản phẩm sản xuất</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                        {detailOrder.product_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Kế hoạch: {Number(detailOrder.target_quantity).toLocaleString('vi-VN')} {detailOrder.unit}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Phân xưởng phụ trách</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                        {detailOrder.workshop_name || 'Xưởng 1 (Khánh Hòa)'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Đại diện: {detailOrder.manager_name || 'Lê Văn Sản'} • ĐT: {detailOrder.contact_phone || '0905123456'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Phiên bản định mức BOM</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginTop: 2, fontFamily: 'monospace' }}>
                        {detailOrder.bom_version || 'BOM_TIÊU_CHUẨN_V1'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Ước tính vốn NVL: {Number(detailOrder.total_materials_cost || 0).toLocaleString('vi-VN')} ₫
                      </div>
                    </div>
                  </div>

                  {/* Dates & Status */}
                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      Thời gian: <strong>{detailOrder.start_time ? detailOrder.start_time.slice(0, 10) : 'Hôm nay'}</strong> → Hạn chót:{' '}
                      <strong style={{ color: '#f59e0b' }}>{detailOrder.end_time ? detailOrder.end_time.slice(0, 10) : 'Chưa định hạn'}</strong>
                    </div>
                    <div>
                      <span className={`badge ${detailOrder.status === 'COMPLETED' || detailOrder.status === 'HOAN_THANH' ? 'badge-success' : 'badge-warning'}`}>
                        {detailOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* BOM Materials List */}
                  <div>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                      Bảng Chi Tiết Định Mức Nguyên Vật Liệu Tiêu Hao
                    </h5>
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>Mã NVL</th>
                            <th>Tên NVL</th>
                            <th>Định Mức / 1 SP</th>
                            <th>Tổng NVL Cần Cho Lô</th>
                            <th>Tồn Kho Hiện Có</th>
                            <th>Dự Tính Chi Phí</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailOrder.bom_items && detailOrder.bom_items.length > 0 ? (
                            detailOrder.bom_items.map((it, idx) => (
                              <tr key={idx}>
                                <td>
                                  <span className="badge badge-info">{it.material_code}</span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{it.material_name}</td>
                                <td>
                                  {Number(it.quantity_required).toLocaleString('vi-VN')} {it.material_unit}
                                </td>
                                <td>
                                  <strong style={{ color: '#38bdf8' }}>
                                    {Number(it.total_required_quantity || 0).toLocaleString('vi-VN')} {it.material_unit}
                                  </strong>
                                </td>
                                <td>
                                  <span style={{ color: Number(it.current_stock) >= Number(it.total_required_quantity) ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                                    {Number(it.current_stock || 0).toLocaleString('vi-VN')} {it.material_unit}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600, color: '#34d399' }}>
                                  {Number(it.line_estimated_cost || 0).toLocaleString('vi-VN')} ₫
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '16px 0' }}>
                                Chưa có danh sách định mức NVL.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BÁO CÁO TỔNG KẾT SẢN LƯỢNG THEO THÁNG (QDSX_09)    */}
      {/* ========================================================= */}
      {activeTab === 'MONTHLY_SUMMARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Bảng tiến độ theo tháng */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#c084fc" />
              <span>Tiến Độ Sản Xuất & Tỷ Lệ Hao Hụt Theo Tháng (QDSX_09)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
              Thống kê tổng số lệnh sản xuất, sản lượng thực nhận đạt chuẩn và tỷ lệ hao hụt trung bình theo từng kỳ kinh doanh.
            </p>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ Báo Cáo / Tháng</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Tổng Sản Lượng Đạt</th>
                    <th>Tỷ Lệ Hao Hụt Trung Bình</th>
                    <th>Đánh Giá Kế Hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.monthly_breakdown || []).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{m.month}</td>
                      <td style={{ fontWeight: 600 }}>{m.total_orders} lệnh</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(m.total_output).toLocaleString('vi-VN')} sản phẩm
                      </td>
                      <td style={{ fontWeight: 600, color: m.avg_defect_pct > 2.5 ? '#f43f5e' : '#f59e0b' }}>
                        {m.avg_defect_pct}%
                      </td>
                      <td>
                        <span className="badge badge-success">{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Bảng tổng kết theo từng dòng sản phẩm */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14 }}>
              Tổng Kết Sản Lượng Hoàn Thành Theo Từng Dòng Sản Phẩm
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th>Đơn Vị</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Kế Hoạch Đề Ra</th>
                    <th>Thực Tế Hoàn Thành</th>
                    <th>Tỷ Lệ Hoàn Thành</th>
                    <th>Hao Hụt TB (%)</th>
                    <th>Tổng Chi Phí Vốn SX</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.data || []).map((p) => {
                    const target = Number(p.total_target_qty || 0)
                    const comp = Number(p.total_completed_qty || 0)
                    const rate = target > 0 ? ((comp / target) * 100).toFixed(1) : '100.0'
                    return (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{p.product_code}</td>
                        <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                        <td>{p.unit}</td>
                        <td>{p.total_orders} lệnh</td>
                        <td style={{ color: '#cbd5e1' }}>{Number(target).toLocaleString('vi-VN')}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{Number(comp).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ color: Number(p.avg_defect_rate || 0) > 5 ? '#f43f5e' : '#cbd5e1', fontWeight: 600 }}>
                          {Number(p.avg_defect_rate || 0).toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {Number(p.total_production_cost || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: THÊM / SỬA PHÂN XƯỞNG SẢN XUẤT (QDSX_03)         */}
      {/* ========================================================= */}
      {showWorkshopModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                {editingWorkshop ? `Chỉnh Sửa Phân Xưởng: ${editingWorkshop.workshop_code}` : 'Đăng Ký Phân Xưởng Sản Xuất Mới'}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px' }}
                onClick={() => setShowWorkshopModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveWorkshop}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Mã xưởng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={wsCode}
                      onChange={(e) => setWsCode(e.target.value)}
                      disabled={!!editingWorkshop}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên phân xưởng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="Xưởng Chưng Yến Vô Trùng..."
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Loại hình chế biến</label>
                    <select
                      className="form-select"
                      value={wsType}
                      onChange={(e) => setWsType(e.target.value)}
                    >
                      <option value="YEN_SAO">Chế biến Yến Sào</option>
                      <option value="CA_PHE">Chế biến Cà Phê</option>
                      <option value="DONG_GOI">Hoàn thiện & Đóng gói</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Công suất thiết kế (SP/ngày)</label>
                    <input
                      type="number"
                      min="100"
                      className="form-input"
                      value={wsCapacity}
                      onChange={(e) => setWsCapacity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Người đại diện xưởng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={wsManager}
                      onChange={(e) => setWsManager(e.target.value)}
                      placeholder="Họ tên Quản đốc/Đại diện"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SĐT liên hệ người đại diện</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={wsPhone}
                      onChange={(e) => setWsPhone(e.target.value)}
                      placeholder="0905123456"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ phân xưởng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={wsLocation}
                    onChange={(e) => setWsLocation(e.target.value)}
                    placeholder="Số 12 Trần Phú, Nha Trang, Khánh Hòa..."
                    required
                  />
                </div>

                {editingWorkshop && (
                  <div className="form-group">
                    <label className="form-label">Trạng thái phân xưởng</label>
                    <select
                      className="form-select"
                      value={wsStatus}
                      onChange={(e) => setWsStatus(e.target.value)}
                    >
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="INACTIVE">Tạm ngưng bảo trì</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowWorkshopModal(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingWorkshop ? 'Lưu Thay Đổi' : 'Đăng Ký Xưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BÁO CÁO TỔNG KẾT SẢN LƯỢNG THEO THÁNG (QDSX_09)    */}
      {/* ========================================================= */}
      {activeTab === 'MONTHLY_SUMMARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Bảng tiến độ theo tháng */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#c084fc" />
              <span>Tiến Độ Sản Xuất & Tỷ Lệ Hao Hụt Theo Tháng (QDSX_09)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
              Thống kê tổng số lệnh sản xuất, sản lượng thực nhận đạt chuẩn và tỷ lệ hao hụt trung bình theo từng kỳ kinh doanh.
            </p>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ Báo Cáo / Tháng</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Tổng Sản Lượng Đạt</th>
                    <th>Tỷ Lệ Hao Hụt Trung Bình</th>
                    <th>Đánh Giá Kế Hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.monthly_breakdown || []).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{m.month}</td>
                      <td style={{ fontWeight: 600 }}>{m.total_orders} lệnh</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(m.total_output).toLocaleString('vi-VN')} sản phẩm
                      </td>
                      <td style={{ fontWeight: 600, color: m.avg_defect_pct > 2.5 ? '#f43f5e' : '#f59e0b' }}>
                        {m.avg_defect_pct}%
                      </td>
                      <td>
                        <span className="badge badge-success">{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Bảng tổng kết theo từng dòng sản phẩm */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14 }}>
              Tổng Kết Sản Lượng Hoàn Thành Theo Từng Dòng Sản Phẩm
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th>Đơn Vị</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Kế Hoạch Đề Ra</th>
                    <th>Thực Tế Hoàn Thành</th>
                    <th>Tỷ Lệ Hoàn Thành</th>
                    <th>Hao Hụt TB (%)</th>
                    <th>Tổng Chi Phí Vốn SX</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.data || []).map((p) => {
                    const target = Number(p.total_target_qty || 0)
                    const comp = Number(p.total_completed_qty || 0)
                    const rate = target > 0 ? ((comp / target) * 100).toFixed(1) : '100.0'
                    return (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{p.product_code}</td>
                        <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                        <td>{p.unit}</td>
                        <td>{p.total_orders} lệnh</td>
                        <td style={{ color: '#cbd5e1' }}>{Number(target).toLocaleString('vi-VN')}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{Number(comp).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ color: Number(p.avg_defect_rate || 0) > 5 ? '#f43f5e' : '#cbd5e1', fontWeight: 600 }}>
                          {Number(p.avg_defect_rate || 0).toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {Number(p.total_production_cost || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: LỊCH SỬ LỆNH SẢN XUẤT CỦA PHÂN XƯỞNG (QDSX_03)    */}
      {/* ========================================================= */}
      {showHistoryModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                  Lịch Sử Lệnh Sản Xuất: {historyWorkshop?.workshop_name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                  Mã xưởng: {historyWorkshop?.workshop_code} • Đại diện: {historyWorkshop?.manager_name} ({historyWorkshop?.contact_phone})
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px' }}
                onClick={() => setShowHistoryModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
                  Đang tải lịch sử các lệnh sản xuất...
                </div>
              ) : historyOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
                  Phân xưởng này chưa có lệnh sản xuất nào được phân bổ.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Mã Lệnh</th>
                        <th>Sản Phẩm</th>
                        <th>Kế Hoạch</th>
                        <th>Đã Hoàn Thành</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map((o) => (
                        <tr key={o.order_id}>
                          <td>
                            <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                              {o.order_code}
                            </strong>
                          </td>
                          <td style={{ fontWeight: 600 }}>{o.product_name}</td>
                          <td>{Number(o.target_quantity).toLocaleString('vi-VN')} {o.unit}</td>
                          <td>{Number(o.completed_quantity || 0).toLocaleString('vi-VN')}</td>
                          <td>
                            <span className={`badge ${o.status === 'HOAN_THANH' || o.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BÁO CÁO TỔNG KẾT SẢN LƯỢNG THEO THÁNG (QDSX_09)    */}
      {/* ========================================================= */}
      {activeTab === 'MONTHLY_SUMMARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Bảng tiến độ theo tháng */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#c084fc" />
              <span>Tiến Độ Sản Xuất & Tỷ Lệ Hao Hụt Theo Tháng (QDSX_09)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
              Thống kê tổng số lệnh sản xuất, sản lượng thực nhận đạt chuẩn và tỷ lệ hao hụt trung bình theo từng kỳ kinh doanh.
            </p>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ Báo Cáo / Tháng</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Tổng Sản Lượng Đạt</th>
                    <th>Tỷ Lệ Hao Hụt Trung Bình</th>
                    <th>Đánh Giá Kế Hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.monthly_breakdown || []).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{m.month}</td>
                      <td style={{ fontWeight: 600 }}>{m.total_orders} lệnh</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(m.total_output).toLocaleString('vi-VN')} sản phẩm
                      </td>
                      <td style={{ fontWeight: 600, color: m.avg_defect_pct > 2.5 ? '#f43f5e' : '#f59e0b' }}>
                        {m.avg_defect_pct}%
                      </td>
                      <td>
                        <span className="badge badge-success">{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Bảng tổng kết theo từng dòng sản phẩm */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 14 }}>
              Tổng Kết Sản Lượng Hoàn Thành Theo Từng Dòng Sản Phẩm
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th>Đơn Vị</th>
                    <th>Tổng Số Lệnh SX</th>
                    <th>Kế Hoạch Đề Ra</th>
                    <th>Thực Tế Hoàn Thành</th>
                    <th>Tỷ Lệ Hoàn Thành</th>
                    <th>Hao Hụt TB (%)</th>
                    <th>Tổng Chi Phí Vốn SX</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlySummary.data || []).map((p) => {
                    const target = Number(p.total_target_qty || 0)
                    const comp = Number(p.total_completed_qty || 0)
                    const rate = target > 0 ? ((comp / target) * 100).toFixed(1) : '100.0'
                    return (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{p.product_code}</td>
                        <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                        <td>{p.unit}</td>
                        <td>{p.total_orders} lệnh</td>
                        <td style={{ color: '#cbd5e1' }}>{Number(target).toLocaleString('vi-VN')}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{Number(comp).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ color: Number(p.avg_defect_rate || 0) > 5 ? '#f43f5e' : '#cbd5e1', fontWeight: 600 }}>
                          {Number(p.avg_defect_rate || 0).toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {Number(p.total_production_cost || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
