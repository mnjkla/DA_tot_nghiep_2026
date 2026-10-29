import React, { useEffect, useState } from 'react'
import { Users, AlertCircle, Download, DollarSign, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function Customers({ addToast }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [settlingCustomer, setSettlingCustomer] = useState(null)
  const [settleAmount, setSettleAmount] = useState(0)
  const [settleNotes, setSettleNotes] = useState('Thu hồi công nợ đại lý B2B qua chuyển khoản')
  const { sortConfig: custSort, handleSort: handleCustSort } = useTableSort('customer_id', 'asc')

  const fetchCustomers = () => {
    setLoading(true)
    api
      .getCustomers()
      .then((res) => setCustomers(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleOpenSettle = (c) => {
    setSettlingCustomer(c)
    setSettleAmount(Number(c.current_debt || 0) || 1000000)
  }

  const handleConfirmSettle = async (e) => {
    e.preventDefault()
    if (!settlingCustomer) return
    try {
      const res = await api.settleCustomerDebt(settlingCustomer.customer_id, {
        amount: Number(settleAmount),
        payment_method: 'BANK_TRANSFER',
        notes: settleNotes,
      })
      addToast && addToast(res.message, 'success')
      setSettlingCustomer(null)
      fetchCustomers()
    } catch (err) {
      addToast && addToast(err.message || 'Lỗi thu hồi công nợ', 'error')
    }
  }

  return (
    <div>
      <div
        className="card"
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh Mục Khách Hàng & Quản Lý Công Nợ B2B</h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Theo dõi đối tác, hạn mức tín dụng, tất toán công nợ và xuất sổ cái kế toán chống thất thoát
          </p>
        </div>

        <a
          href={api.getTaxExportUrl('ALL', 8, 'xlsx', '04_So_Cong_No_Khach_Hang')}
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
          <span>Xuất Sổ Công Nợ Khách Hàng (.XLSX)</span>
        </a>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="Mã KH" field="customer_code" sortConfig={custSort} onSort={handleCustSort} />
                <SortableHeader label="Tên khách hàng / Đại lý" field="customer_name" sortConfig={custSort} onSort={handleCustSort} />
                <SortableHeader label="Phân loại" field="customer_type" sortConfig={custSort} onSort={handleCustSort} />
                <SortableHeader label="Liên hệ" field="phone" sortConfig={custSort} onSort={handleCustSort} />
                <SortableHeader label="Hạn mức tín dụng" field="credit_limit" sortConfig={custSort} onSort={handleCustSort} />
                <SortableHeader label="Công nợ hiện tại" field="current_debt" sortConfig={custSort} onSort={handleCustSort} />
                <th>Trạng thái rủi ro</th>
                <th>Thao tác kế toán</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                    {loading ? 'Đang tải...' : 'Chưa có thông tin khách hàng.'}
                  </td>
                </tr>
              ) : (
                sortArrayByField(customers, custSort).map((c) => {
                  const debt = Number(c.current_debt || 0)
                  const limit = Number(c.credit_limit || 0)
                  const isOverLimit = limit > 0 && debt >= limit

                  return (
                    <tr key={c.customer_id}>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{c.customer_code || `KH-${c.customer_id}`}</td>
                      <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {c.customer_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        <div>{c.phone || '—'}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{c.email || c.address || ''}</div>
                      </td>
                      <td>{Number(limit).toLocaleString('vi-VN')} ₫</td>
                      <td style={{ fontWeight: 700, color: debt > 0 ? '#f59e0b' : '#10b981' }}>
                        {Number(debt).toLocaleString('vi-VN')} ₫
                      </td>
                      <td>
                        {isOverLimit ? (
                          <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                            <AlertCircle size={12} /> Vượt hạn mức
                          </span>
                        ) : (
                          <span className="badge badge-completed">An toàn</span>
                        )}
                      </td>
                      <td>
                        {debt > 0 ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-action"
                            onClick={() => handleOpenSettle(c)}
                          >
                            <DollarSign size={14} />
                            <span>Thu hồi nợ</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} color="#10b981" /> Không nợ
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

      {settlingCustomer && (
        <div className="modal-overlay" onClick={() => setSettlingCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Thu Hồi Công Nợ: {settlingCustomer.customer_name}
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setSettlingCustomer(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmSettle}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Số tiền thanh toán công nợ (Dư nợ hiện tại:{' '}
                    {Number(settlingCustomer.current_debt || 0).toLocaleString('vi-VN')} ₫)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    className="form-input"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú phiếu thu kế toán</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                  />
                </div>
              </div>
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSettlingCustomer(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác Nhận Thu Nợ & Ghi Sổ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
