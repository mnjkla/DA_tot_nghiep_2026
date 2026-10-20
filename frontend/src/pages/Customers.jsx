import React, { useEffect, useState } from 'react'
import { Users, Phone, Mail, MapPin, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getCustomers()
      .then((res) => setCustomers(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh Mục Khách Hàng & Quản Lý Công Nợ</h3>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Theo dõi đối tác, hạn mức tín dụng và công nợ bán buôn / bán lẻ
        </p>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Tên khách hàng / Đại lý</th>
                <th>Phân loại</th>
                <th>Liên hệ</th>
                <th>Hạn mức tín dụng</th>
                <th>Công nợ hiện tại</th>
                <th>Trạng thái rủi ro</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                    {loading ? 'Đang tải...' : 'Chưa có thông tin khách hàng.'}
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const debt = Number(c.current_debt || 0)
                  const limit = Number(c.credit_limit || 0)
                  const isOverLimit = limit > 0 && debt >= limit

                  return (
                    <tr key={c.customer_id}>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{c.customer_code}</td>
                      <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {c.customer_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        <div>{c.phone || '—'}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{c.email || ''}</div>
                      </td>
                      <td>{Number(limit).toLocaleString('vi-VN')} ₫</td>
                      <td style={{ fontWeight: 700, color: debt > 0 ? '#f59e0b' : '#94a3b8' }}>
                        {Number(debt).toLocaleString('vi-VN')} ₫
                      </td>
                      <td>
                        {isOverLimit ? (
                          <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                            <AlertCircle size={12} /> Vượt hạn mức
                          </span>
                        ) : (
                          <span className="badge badge-completed">
                            An toàn
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
    </div>
  )
}
