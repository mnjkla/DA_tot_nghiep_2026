import React, { useEffect, useState } from 'react'
import { Plus, Play, CheckCircle, Clock, AlertTriangle, ClipboardList, ShieldCheck, Download } from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function Production({ addToast, currentUser }) {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const { sortConfig: poSort, handleSort: handlePoSort } = useTableSort('order_id', 'desc')

  // Form state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [targetQuantity, setTargetQuantity] = useState(100)
  const [notes, setNotes] = useState('Lệnh sản xuất đợt 1')

  const fetchOrders = () => {
    setLoading(true)
    Promise.all([api.getProductionOrders(), api.getProducts()])
      .then(([ordersRes, prodRes]) => {
        setOrders(ordersRes.data || [])
        setProducts(prodRes.data || [])
        if (prodRes.data && prodRes.data.length > 0) {
          setSelectedProductId(prodRes.data[0].product_id)
        }
      })
      .catch((err) => {
        console.error(err)
        addToast && addToast(err.message, 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleStartOrder = async (orderId) => {
    try {
      const res = await api.startProductionOrder(orderId)
      addToast && addToast(res.message, 'success')
      fetchOrders()
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
      fetchOrders()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleCompleteOrder = async (orderId) => {
    try {
      const res = await api.completeProductionOrder(orderId)
      addToast && addToast(res.message, 'success')
      fetchOrders()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    try {
      const res = await api.createProductionOrder({
        product_id: Number(selectedProductId),
        target_quantity: Number(targetQuantity),
        notes,
        requested_by: currentUser ? `${currentUser.username} (${currentUser.full_name})` : 'sanxuat (Lê Văn Xuất)',
      })
      addToast &&
        addToast(
          `${res.message} (Mã PO: ${res.order_code}${res.req_code ? ` • Phiếu NVL: ${res.req_code}` : ''})`,
          'success'
        )
      setShowModal(false)
      fetchOrders()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true
    return o.status === filter
  })

  return (
    <div>
      {/* 2-Step Approval Workflow Guide Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClipboardList size={22} color="#f59e0b" />
          <div style={{ fontSize: '0.84rem', lineHeight: 1.45 }}>
            <strong style={{ color: '#f8fafc' }}>Quy Trình Phê Duyệt Xuất Kho NVL 2 Bước (2-Step Approval Workflow):</strong>{' '}
            <span style={{ color: '#cbd5e1' }}>
              (1) Bộ phận Sản xuất tạo Lệnh PO &rarr; Sinh <strong>Phiếu Yêu Cầu Xuất NVL</strong> ở trạng thái{' '}
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>CHỜ TRƯỞNG KHO DUYỆT</span> (chưa trừ kho). (2) Trưởng Kho kiểm tra tồn thực tế tại phân hệ Kho &rarr; Bấm{' '}
              <strong style={{ color: '#10b981' }}>&ldquo;Phê Duyệt &amp; Xuất Kho&rdquo;</strong> để trừ kho BOM và chạy lệnh.
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
            <button
              key={f}
              type="button"
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              onClick={() => setFilter(f)}
            >
              {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Chờ sản xuất' : f === 'IN_PROGRESS' ? 'Đang sản xuất' : 'Hoàn thành'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={api.getTaxExportUrl('ALL', 8, 'csv', '03_Nhat_Ky_San_Xuat')}
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
            <span>Xuất Nhật Ký Sản Xuất (.CSV)</span>
          </a>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} />
            <span>Tạo lệnh sản xuất mới</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="Mã lệnh PO" field="order_code" sortConfig={poSort} onSort={handlePoSort} />
                <SortableHeader label="Sản phẩm" field="product_name" sortConfig={poSort} onSort={handlePoSort} />
                <SortableHeader label="Số lượng mục tiêu" field="target_quantity" sortConfig={poSort} onSort={handlePoSort} />
                <SortableHeader label="Phiếu Yêu Cầu Xuất NVL (Kho)" field="requisition_status" sortConfig={poSort} onSort={handlePoSort} />
                <SortableHeader label="Trạng thái PO" field="status" sortConfig={poSort} onSort={handlePoSort} />
                <SortableHeader label="Ghi chú" field="notes" sortConfig={poSort} onSort={handlePoSort} />
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                    {loading ? 'Đang tải dữ liệu...' : 'Chưa có lệnh sản xuất nào.'}
                  </td>
                </tr>
              ) : (
                sortArrayByField(filteredOrders, poSort).map((o) => (
                  <tr key={o.order_id}>
                    <td style={{ fontWeight: 600, color: '#38bdf8' }}>{o.order_code}</td>
                    <td style={{ fontWeight: 500 }}>{o.product_name}</td>
                    <td>{o.target_quantity} {o.unit}</td>
                    <td>
                      {o.req_code ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#e2e8f0' }}>{o.req_code}</div>
                          <span
                            className="badge"
                            style={{
                              marginTop: 4,
                              background:
                                o.requisition_status === 'APPROVED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color: o.requisition_status === 'APPROVED' ? '#10b981' : '#f59e0b',
                            }}
                          >
                            {o.requisition_status === 'APPROVED'
                              ? '✓ Trưởng kho đã duyệt xuất NVL'
                              : '⏳ Chờ Trưởng kho duyệt (Chưa trừ kho)'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {o.status === 'PENDING' ? 'Chưa gửi phiếu kho' : 'Đã xuất kho BOM'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${o.status === 'PENDING' ? 'pending' : o.status === 'IN_PROGRESS' ? 'progress' : 'completed'}`}>
                        {o.status === 'PENDING' ? 'Chờ duyệt' : o.status === 'IN_PROGRESS' ? 'Đang chạy' : 'Hoàn thành'}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{o.notes || '—'}</td>
                    <td>
                      {o.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {!o.req_code && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-action"
                              style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                              onClick={() => handleRequestMaterials(o.order_id)}
                              title="Lập phiếu yêu cầu xuất NVL gửi Trưởng kho duyệt"
                            >
                              <ClipboardList size={14} />
                              <span>Yêu cầu xuất NVL</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary btn-action"
                            onClick={() => handleStartOrder(o.order_id)}
                            title="Bắt đầu và xuất kho NVL theo định mức BOM"
                          >
                            <Play size={14} />
                            <span>Bắt đầu (Xuất NVL)</span>
                          </button>
                        </div>
                      )}
                      {o.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-action"
                          style={{ borderColor: '#10b981', color: '#10b981' }}
                          onClick={() => handleCompleteOrder(o.order_id)}
                          title="Hoàn thành sản xuất và nhập kho thành phẩm theo Lô"
                        >
                          <CheckCircle size={14} />
                          <span>Nhập kho Lô</span>
                        </button>
                      )}
                      {o.status === 'COMPLETED' && (
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Đã nhập kho ({o.completed_quantity || o.target_quantity} {o.unit})</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Lệnh Sản Xuất */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Tạo Lệnh Sản Xuất Mới</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chọn sản phẩm sản xuất</label>
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

                <div className="form-group">
                  <label className="form-label">Số lượng mục tiêu</label>
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
                  <label className="form-label">Ghi chú lệnh</label>
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
                  Tạo Lệnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
