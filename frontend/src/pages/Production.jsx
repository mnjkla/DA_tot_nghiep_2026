import React, { useEffect, useState } from 'react'
import { Plus, Play, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'

export default function Production({ addToast }) {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('ALL')

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
      })
      addToast && addToast(`${res.message} (Mã: ${res.order_code})`, 'success')
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

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          <span>Tạo lệnh sản xuất mới</span>
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã lệnh</th>
                <th>Sản phẩm</th>
                <th>Số lượng mục tiêu</th>
                <th>Số lượng hoàn thành</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
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
                filteredOrders.map((o) => (
                  <tr key={o.order_id}>
                    <td style={{ fontWeight: 600, color: '#38bdf8' }}>{o.order_code}</td>
                    <td style={{ fontWeight: 500 }}>{o.product_name}</td>
                    <td>{o.target_quantity} {o.unit}</td>
                    <td>{o.completed_quantity || 0} {o.unit}</td>
                    <td>
                      <span className={`badge badge-${o.status === 'PENDING' ? 'pending' : o.status === 'IN_PROGRESS' ? 'progress' : 'completed'}`}>
                        {o.status === 'PENDING' ? 'Chờ duyệt' : o.status === 'IN_PROGRESS' ? 'Đang chạy' : 'Hoàn thành'}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{o.notes || '—'}</td>
                    <td>
                      {o.status === 'PENDING' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-action"
                          onClick={() => handleStartOrder(o.order_id)}
                          title="Bắt đầu và xuất kho NVL theo định mức BOM"
                        >
                          <Play size={14} />
                          <span>Bắt đầu (Xuất NVL)</span>
                        </button>
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
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Đã nhập kho</span>
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
