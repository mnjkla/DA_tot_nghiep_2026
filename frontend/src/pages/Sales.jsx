import React, { useEffect, useState } from 'react'
import { Plus, Send, CheckCircle2, ShoppingBag } from 'lucide-react'
import { api } from '../services/api'

export default function Sales({ addToast }) {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [unitPrice, setUnitPrice] = useState(45000)
  const [notes, setNotes] = useState('Đơn bán hàng đại lý')

  const fetchSalesData = () => {
    setLoading(true)
    Promise.all([api.getSalesOrders(), api.getCustomers(), api.getProducts()])
      .then(([soRes, custRes, prodRes]) => {
        setOrders(soRes.data || [])
        setCustomers(custRes.data || [])
        setProducts(prodRes.data || [])
        if (custRes.data && custRes.data.length > 0) {
          setCustomerId(custRes.data[0].customer_id)
        }
        if (prodRes.data && prodRes.data.length > 0) {
          setProductId(prodRes.data[0].product_id)
          setUnitPrice(prodRes.data[0].selling_price || 45000)
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh Sách Đơn Bán Hàng</h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Quy trình xuất kho 2 bước chuẩn ERP: Tạo đơn → Lập phiếu xuất & Trừ tồn kho theo Lô
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          <span>Lập đơn bán hàng mới</span>
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Phân loại</th>
                <th>Tổng thanh toán</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                    {loading ? 'Đang tải dữ liệu...' : 'Chưa có đơn hàng nào.'}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.sales_order_id}>
                    <td style={{ fontWeight: 600, color: '#38bdf8' }}>{o.order_code}</td>
                    <td style={{ fontWeight: 500 }}>{o.customer_name}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {o.customer_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      {Number(o.final_amount).toLocaleString('vi-VN')} ₫
                    </td>
                    <td>
                      <span className={`badge badge-${o.status === 'NEW' ? 'pending' : 'completed'}`}>
                        {o.status === 'NEW' ? 'Đơn mới (Chưa xuất)' : 'Đã xuất kho & giao'}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{o.notes || '—'}</td>
                    <td>
                      {o.status === 'NEW' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-action"
                          onClick={() => handleDispatchOrder(o.sales_order_id)}
                          title="Lập phiếu xuất kho và trừ số lượng theo lô tồn kho"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  )
}
