import React, { useEffect, useState } from 'react'
import {
  Users,
  AlertCircle,
  Download,
  DollarSign,
  CheckCircle2,
  Search,
  UserCheck,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Eye,
  Edit2,
  X,
  CreditCard,
  MapPin,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

const DEFAULT_INTERNAL_STAFF = [
  { user_id: 1, username: 'admin', full_name: 'Nguyễn Văn Admin', role: 'ADMIN', role_name: 'Quản Trị Viên Tối Cao', email: 'admin@yencafe.vn', phone: '0901 000 001', status: 'ACTIVE' },
  { user_id: 2, username: 'giamdoc', full_name: 'Trần Văn Giám Đốc', role: 'GIAM_DOC', role_name: 'Giám Đốc Điều Hành', email: 'giamdoc@yencafe.vn', phone: '0901 000 002', status: 'ACTIVE' },
  { user_id: 3, username: 'sanxuat', full_name: 'Lê Văn Sản Xuất', role: 'QUAN_DOC_SAN_XUAT', role_name: 'Quản Đốc Sản Xuất', email: 'sanxuat@yencafe.vn', phone: '0901 000 003', status: 'ACTIVE' },
  { user_id: 4, username: 'sx', full_name: 'Vũ Thị Kỹ Thuật SX', role: 'PRODUCTION_STAFF', role_name: 'Kỹ Sư Sản Xuất & Xưởng', email: 'sx@yencafe.vn', phone: '0901 000 004', status: 'ACTIVE' },
  { user_id: 5, username: 'kho', full_name: 'Nguyễn Văn Kho', role: 'QUAN_LY_KHO', role_name: 'Trưởng Kho & Logistics', email: 'kho@yencafe.vn', phone: '0901 000 005', status: 'ACTIVE' },
  { user_id: 6, username: 'thumua', full_name: 'Phạm Thị Mua', role: 'PROCUREMENT', role_name: 'Phụ Trách Thu Mua NVL', email: 'thumua@yencafe.vn', phone: '0901 000 006', status: 'ACTIVE' },
  { user_id: 7, username: 'phanphoi', full_name: 'Hoàng Văn Phân Phối', role: 'QUAN_LY_PHAN_PHOI', role_name: 'Quản Lý Kênh B2B', email: 'phanphoi@yencafe.vn', phone: '0901 000 007', status: 'ACTIVE' },
  { user_id: 8, username: 'tiepthi1', full_name: 'Đặng Tiếp Thị Vùng 1', role: 'TIEP_THI', role_name: 'Chuyên Viên Tiếp Thị Miền Nam', email: 'tiepthi1@yencafe.vn', phone: '0901 000 008', status: 'ACTIVE' },
  { user_id: 9, username: 'daily1', full_name: 'Chủ Đại Lý Cấp 1 Đông Sài Gòn', role: 'DAI_LY', role_name: 'Đại Lý Phân Phối Đối Tác', email: 'daily1@yencafe.vn', phone: '0901 000 009', status: 'ACTIVE' },
]

export default function Customers({ addToast }) {
  const [activeTab, setActiveTab] = useState('customers') // 'customers' | 'staff'
  const [customers, setCustomers] = useState([])
  const [staffList, setStaffList] = useState(DEFAULT_INTERNAL_STAFF)
  const [loading, setLoading] = useState(true)

  // Search & Filter (GD_02)
  const [customerSearch, setCustomerSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')

  // Modal Thu hồi nợ
  const [settlingCustomer, setSettlingCustomer] = useState(null)
  const [settleAmount, setSettleAmount] = useState(0)
  const [settleNotes, setSettleNotes] = useState('Thu hồi công nợ đại lý B2B qua chuyển khoản')

  // PP_03: Modal Xem chi tiết & Chỉnh sửa hồ sơ khách hàng/đại lý
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [custEditForm, setCustEditForm] = useState({
    customer_name: '',
    customer_type: 'AGENT',
    phone: '',
    email: '',
    address: '',
    credit_limit: 100000000,
  })

  const { sortConfig: custSort, handleSort: handleCustSort } = useTableSort('customer_id', 'asc')
  const { sortConfig: staffSort, handleSort: handleStaffSort } = useTableSort('user_id', 'asc')

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

  // PP_03: Mở modal chỉnh sửa
  const handleOpenEditCustomer = (c) => {
    setEditingCustomer(c)
    setCustEditForm({
      customer_name: c.customer_name || '',
      customer_type: c.customer_type || 'AGENT',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      credit_limit: Number(c.credit_limit || 0),
    })
  }

  const handleSaveCustomerEdit = async (e) => {
    e.preventDefault()
    if (!editingCustomer) return
    try {
      const res = await api.updateCustomer(editingCustomer.customer_id, custEditForm)
      addToast && addToast(res.message, 'success')
      setEditingCustomer(null)
      fetchCustomers()
    } catch (err) {
      addToast && addToast(err.message || 'Lỗi cập nhật hồ sơ khách hàng', 'error')
    }
  }

  // Filter khách hàng (GD_02)
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim()
    if (!q) return true
    return (
      (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.customer_type && c.customer_type.toLowerCase().includes(q))
    )
  })

  // Filter nhân sự (GD_02)
  const filteredStaff = staffList.filter((s) => {
    const q = staffSearch.toLowerCase().trim()
    if (!q) return true
    return (
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.role_name && s.role_name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* Top Bar Header & Action */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Quản Lý Đối Tác, Khách Hàng B2B & Nhân Sự Nội Bộ (GD_02, PP_03)
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Theo dõi hạn mức tín dụng khách hàng, hồ sơ đại lý B2B và danh sách nhân sự vận hành hệ thống.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              fontSize: '0.82rem',
            }}
          >
            <Download size={15} />
            <span>Xuất Sổ Công Nợ (.XLSX)</span>
          </a>
        </div>
      </div>

      {/* Tabs Chuyển Đổi: Khách Hàng vs Nhân Sự */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('customers')}
        >
          <Building size={16} />
          <span>Danh Sách Khách Hàng & Đại Lý ({customers.length})</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('staff')}
        >
          <UserCheck size={16} />
          <span>Danh Sách Nhân Sự & Phân Quyền Nội Bộ ({staffList.length})</span>
        </button>
      </div>

      {/* TAB 1: KHÁCH HÀNG & CÔNG NỢ B2B */}
      {activeTab === 'customers' && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc' }}>
              Danh Sách Đại Lý & Khách Hàng B2B
            </h4>

            {/* Ô tìm kiếm khách hàng tức thì (GD_02) */}
            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 32, fontSize: '0.82rem' }}
                placeholder="Tìm theo tên, mã KH, SĐT..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>
          </div>

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
                  <th>Thao tác quản lý & Kế toán</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                      {loading ? 'Đang tải...' : 'Không tìm thấy khách hàng phù hợp.'}
                    </td>
                  </tr>
                ) : (
                  sortArrayByField(filteredCustomers, custSort).map((c) => {
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* PP_03: Nút xem chi tiết */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-action"
                              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                              onClick={() => setViewingCustomer(c)}
                              title="Xem chi tiết hồ sơ đối tác"
                            >
                              <Eye size={13} />
                              <span>Chi tiết</span>
                            </button>

                            {/* PP_03: Nút chỉnh sửa hồ sơ */}
                            <button
                              type="button"
                              className="btn btn-outline btn-action"
                              style={{ padding: '4px 8px', fontSize: '0.74rem', borderColor: 'rgba(56,189,248,0.4)', color: '#38bdf8' }}
                              onClick={() => handleOpenEditCustomer(c)}
                              title="Chỉnh sửa thông tin & hạn mức công nợ"
                            >
                              <Edit2 size={13} />
                              <span>Sửa</span>
                            </button>

                            {debt > 0 ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-action"
                                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                onClick={() => handleOpenSettle(c)}
                              >
                                <DollarSign size={13} />
                                <span>Thu nợ</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <CheckCircle2 size={12} color="#10b981" /> Đã thu hết
                              </span>
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
      )}

      {/* TAB 2: NHÂN SỰ & PHÂN QUYỀN NỘI BỘ (GD_02) */}
      {activeTab === 'staff' && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={17} color="#10b981" />
                <span>Danh Sách Nhân Viên & Phân Quyền Vai Trò Hệ Thống (GD_02)</span>
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                Giám Đốc có thể kiểm tra toàn bộ danh mục tài khoản vận hành, chức vụ và trạng thái hoạt động.
              </p>
            </div>

            {/* Ô tìm kiếm nhân sự (GD_02) */}
            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 32, fontSize: '0.82rem' }}
                placeholder="Tìm theo tên, username, chức danh..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Mã NV" field="user_id" sortConfig={staffSort} onSort={handleStaffSort} />
                  <SortableHeader label="Tên Đăng Nhập" field="username" sortConfig={staffSort} onSort={handleStaffSort} />
                  <SortableHeader label="Họ & Tên Nhân Viên" field="full_name" sortConfig={staffSort} onSort={handleStaffSort} />
                  <SortableHeader label="Chức Danh / Phân Quyền" field="role_name" sortConfig={staffSort} onSort={handleStaffSort} />
                  <th>Email & Liên Hệ</th>
                  <th>Mã Vai Trò (RBAC)</th>
                  <th>Trạng Thái Hoạt Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  sortArrayByField(filteredStaff, staffSort).map((s) => (
                    <tr key={s.user_id}>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>NV-{String(s.user_id).padStart(3, '0')}</td>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>{s.username}</td>
                      <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                      <td style={{ color: '#cbd5e1' }}>
                        <div style={{ fontWeight: 600, color: '#38bdf8' }}>{s.role_name}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        <div>{s.email}</div>
                        <div style={{ color: '#64748b' }}>{s.phone}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontFamily: 'monospace' }}>
                          {s.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-completed">
                          <CheckCircle2 size={12} /> Đang hoạt động
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PP_03: MODAL XEM CHI TIẾT KHÁCH HÀNG / ĐẠI LÝ */}
      {viewingCustomer && (
        <div className="modal-overlay" onClick={() => setViewingCustomer(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={18} color="#38bdf8" />
                <span>Chi Tiết Hồ Sơ Khách Hàng & Đại Lý</span>
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setViewingCustomer(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {viewingCustomer.customer_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: 2 }}>
                  Mã đối tác: {viewingCustomer.customer_code || `KH-${viewingCustomer.customer_id}`} • Nhóm: {viewingCustomer.customer_type}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>Số điện thoại liên hệ</div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>{viewingCustomer.phone || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>Email đối tác</div>
                  <div style={{ fontWeight: 600 }}>{viewingCustomer.email || '—'}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>Địa chỉ giao hàng / Trụ sở</div>
                <div style={{ fontWeight: 500 }}>{viewingCustomer.address || '—'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>Hạn mức tín dụng</div>
                  <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                    {Number(viewingCustomer.credit_limit || 0).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>Dư nợ hiện tại</div>
                  <div style={{ fontWeight: 700, color: Number(viewingCustomer.current_debt || 0) > 0 ? '#f59e0b' : '#10b981' }}>
                    {Number(viewingCustomer.current_debt || 0).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingCustomer(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const c = viewingCustomer
                  setViewingCustomer(null)
                  handleOpenEditCustomer(c)
                }}
              >
                <Edit2 size={14} />
                <span>Chỉnh Sửa Hồ Sơ Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PP_03: MODAL CHỈNH SỬA THÔNG TIN KHÁCH HÀNG / ĐẠI LÝ */}
      {editingCustomer && (
        <div className="modal-overlay" onClick={() => setEditingCustomer(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={18} color="#38bdf8" />
                <span>Chỉnh Sửa Thông Tin & Hạn Mức Tín Dụng (PP_03)</span>
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setEditingCustomer(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCustomerEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên Khách Hàng / Đại Lý</label>
                  <input
                    type="text"
                    className="form-input"
                    value={custEditForm.customer_name}
                    onChange={(e) => setCustEditForm({ ...custEditForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Phân Loại Khách Hàng</label>
                    <select
                      className="form-select"
                      value={custEditForm.customer_type}
                      onChange={(e) => setCustEditForm({ ...custEditForm, customer_type: e.target.value })}
                    >
                      <option value="RETAIL">Khách Lẻ (RETAIL)</option>
                      <option value="AGENT">Đại Lý Cấp 1 & 2 (AGENT)</option>
                      <option value="DISTRIBUTOR">Nhà Phân Phối Vùng (DISTRIBUTOR)</option>
                      <option value="ENTERPRISE">Doanh Nghiệp / B2B (ENTERPRISE)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại</label>
                    <input
                      type="text"
                      className="form-input"
                      value={custEditForm.phone}
                      onChange={(e) => setCustEditForm({ ...custEditForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Đối Tác</label>
                  <input
                    type="email"
                    className="form-input"
                    value={custEditForm.email}
                    onChange={(e) => setCustEditForm({ ...custEditForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa Chỉ Kho / Trụ Sở</label>
                  <input
                    type="text"
                    className="form-input"
                    value={custEditForm.address}
                    onChange={(e) => setCustEditForm({ ...custEditForm, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Hạn Mức Tín Dụng Bán Chịu (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    className="form-input"
                    value={custEditForm.credit_limit}
                    onChange={(e) => setCustEditForm({ ...custEditForm, credit_limit: Number(e.target.value) })}
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                    Khi dư nợ vượt quá hạn mức này, hệ thống sẽ cảnh báo rủi ro khi đại lý đặt đơn mới.
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingCustomer(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thu Hồi Nợ */}
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
