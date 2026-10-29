import React, { useEffect, useState } from 'react'
import {
  Package,
  Feather,
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  ShoppingBag,
  Plus,
  TrendingDown,
  TrendingUp,
  Download,
  Upload,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function Inventory({ addToast, currentUser }) {
  const defaultTab =
    currentUser?.role === 'PROCUREMENT'
      ? 'procurement'
      : currentUser?.role === 'WAREHOUSE_MANAGER'
      ? 'approvals'
      : 'approvals'

  const [activeTab, setActiveTab] = useState(defaultTab) // 'approvals' | 'procurement' | 'materials' | 'finished_goods'
  const [materials, setMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [requisitions, setRequisitions] = useState([])
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)

  const { sortConfig: reqSort, handleSort: handleReqSort } = useTableSort('req_id', 'desc')
  const { sortConfig: recSort, handleSort: handleRecSort } = useTableSort('receipt_id', 'desc')
  const { sortConfig: matSort, handleSort: handleMatSort } = useTableSort('material_id', 'asc')
  const { sortConfig: fgSort, handleSort: handleFgSort } = useTableSort('inventory_id', 'desc')

  // Form Thu Mua Nhập Kho NVL (Procurement)
  const [selectedMatId, setSelectedMatId] = useState(1)
  const [importQty, setImportQty] = useState(1000)
  const [importUnitPrice, setImportUnitPrice] = useState(20500)
  const [supplierName, setSupplierName] = useState('Nhà Yến Khánh Hòa Nguồn Việt')
  const [marketSeason, setMarketSeason] = useState('LOW_SEASON_MAY_JUL')
  const [importNotes, setImportNotes] = useState('Nhập tích trữ NVL theo biến động giá thị trường')

  const fetchInventoryData = () => {
    setLoading(true)
    Promise.all([
      api.getMaterials(),
      api.getFinishedGoods(),
      api.getMaterialRequisitions ? api.getMaterialRequisitions().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getMaterialReceipts ? api.getMaterialReceipts().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([matRes, fgRes, reqRes, recRes]) => {
        const mats = matRes.data || []
        setMaterials(mats)
        setFinishedGoods(fgRes.data || [])
        setRequisitions(reqRes.data || [])
        setReceipts(recRes.data || [])
        if (mats.length > 0 && !selectedMatId) {
          setSelectedMatId(mats[0].material_id)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInventoryData()
  }, [])

  const handleApproveRequisition = async (reqId) => {
    try {
      const approverName = currentUser
        ? `${currentUser.username} (${currentUser.full_name})`
        : 'kho (Nguyễn Văn Kho - Trưởng Kho)'
      const res = await api.approveMaterialRequisition(reqId, approverName)
      addToast && addToast(res.message, 'success')
      fetchInventoryData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleImportMaterial = async (e) => {
    e.preventDefault()
    try {
      const res = await api.importMaterialStock({
        material_id: Number(selectedMatId),
        quantity: Number(importQty),
        unit_price: Number(importUnitPrice),
        supplier_name: supplierName,
        market_season: marketSeason,
        imported_by: currentUser ? `${currentUser.username} (${currentUser.full_name})` : 'thumua (Phạm Thị Mua)',
        notes: importNotes,
      })
      addToast && addToast(res.message, 'success')
      fetchInventoryData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const pendingReqCount = requisitions.filter((r) => r.status === 'PENDING_APPROVAL').length

  const handleQuickFileImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const res = await api.importTabularFile({
          target: 'MATERIALS',
          filename: file.name,
          file_base64: ev.target?.result,
          imported_by: currentUser?.username || 'kho',
        })
        addToast && addToast(res.message, 'success')
        fetchInventoryData()
      } catch (err) {
        addToast && addToast(err.message || 'Lỗi xử lý file Excel/CSV', 'error')
      } finally {
        setUploadingFile(false)
        e.target.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      {/* Navigation Tabs & Excel Export/Import Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('approvals')}
          >
            <ClipboardCheck size={16} />
            <span>Duyệt Xuất Kho NVL Sản Xuất ({requisitions.length})</span>
            {pendingReqCount > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '1px 7px',
                  borderRadius: 10,
                  marginLeft: 4,
                }}
              >
                {pendingReqCount} chờ duyệt
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'procurement' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('procurement')}
          >
            <ShoppingBag size={16} />
            <span>Thu Mua & Nhập Kho NVL Theo Giá Mùa Vụ ({receipts.length})</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'materials' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('materials')}
          >
            <Feather size={16} />
            <span>Tồn Kho Nguyên Vật Liệu ({materials.length})</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'finished_goods' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('finished_goods')}
          >
            <Package size={16} />
            <span>Tồn Kho Thành Phẩm Theo Lô ({finishedGoods.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a
            href={api.getTaxExportUrl('ALL', 8, 'xlsx', '02_Nhap_Xuat_Ton_Kho')}
            download
            className="btn btn-outline"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              borderColor: 'rgba(16, 185, 129, 0.45)',
              color: '#34d399',
            }}
          >
            <Download size={14} />
            <span>Xuất Báo Cáo Nhập-Xuất-Tồn (.XLSX)</span>
          </a>

          <label
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              borderColor: 'rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              cursor: uploadingFile ? 'wait' : 'pointer',
              margin: 0,
            }}
          >
            <Upload size={14} />
            <span>{uploadingFile ? 'Đang nhập file...' : 'Nhập Kho Từ Excel/CSV'}</span>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleQuickFileImport}
              disabled={uploadingFile}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* TAB 1: TRƯỞNG KHO DUYỆT XUẤT KHO NVL 2 BƯỚC */}
      {activeTab === 'approvals' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Phê Duyệt Phiếu Yêu Cầu Xuất Kho NVL Cho Sản Xuất (2-Step Approval)
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                Trưởng Kho kiểm tra số lượng tồn thực tế so với định mức BOM trước khi bấm &ldquo;Phê Duyệt &amp; Xuất Kho&rdquo;.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Mã Phiếu Xuất" field="req_code" sortConfig={reqSort} onSort={handleReqSort} />
                  <SortableHeader label="Lệnh SX & Thành Phẩm" field="product_name" sortConfig={reqSort} onSort={handleReqSort} />
                  <SortableHeader label="Người Yêu Cầu" field="requested_by" sortConfig={reqSort} onSort={handleReqSort} />
                  <th>Chi Tiết Định Mức BOM Cần Xuất & Tồn Thực Tế</th>
                  <SortableHeader label="Trạng Thái" field="status" sortConfig={reqSort} onSort={handleReqSort} />
                  <th>Thao Tác Trưởng Kho</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                      {loading ? 'Đang tải...' : 'Chưa có phiếu yêu cầu xuất kho NVL nào.'}
                    </td>
                  </tr>
                ) : (
                  sortArrayByField(requisitions, reqSort).map((r) => (
                    <tr key={r.req_id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>{r.req_code}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{r.created_at}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{r.product_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                          Mã PO: {r.order_code} • SL: {r.target_quantity} {r.product_unit}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        <div>{r.requested_by}</div>
                        {r.approved_by && (
                          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: 2 }}>
                            Duyệt bởi: {r.approved_by}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(r.bom_details || []).map((b) => (
                            <div
                              key={b.material_id}
                              style={{
                                fontSize: '0.76rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                background: 'rgba(15, 23, 42, 0.5)',
                                padding: '4px 8px',
                                borderRadius: 6,
                              }}
                            >
                              <span>
                                • <strong>{b.material_name}</strong>: Cần{' '}
                                <strong style={{ color: '#f59e0b' }}>
                                  {Number(b.needed_qty).toLocaleString('vi-VN')} {b.unit}
                                </strong>
                              </span>
                              <span style={{ color: b.is_enough ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                                (Kho còn: {Number(b.current_stock).toLocaleString('vi-VN')} {b.unit})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        {r.status === 'APPROVED' ? (
                          <span className="badge badge-completed">
                            <CheckCircle size={12} /> Đã duyệt & Trừ kho
                          </span>
                        ) : (
                          <span className="badge badge-pending">⏳ Chờ Trưởng kho duyệt</span>
                        )}
                      </td>
                      <td>
                        {r.status === 'PENDING_APPROVAL' ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-action"
                            onClick={() => handleApproveRequisition(r.req_id)}
                          >
                            <ClipboardCheck size={14} />
                            <span>Phê Duyệt & Xuất Kho</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                            ✓ Lệnh SX đang chạy
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
      )}

      {/* TAB 2: PHÂN HỆ THU MUA NVL THEO GIÁ BIẾN ĐỘNG THỊ TRƯỜNG */}
      {activeTab === 'procurement' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.65fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="#c084fc" />
              <span>Lập Phiếu Nhập Mua NVL Theo Giá Mùa Vụ</span>
            </h3>

            <form onSubmit={handleImportMaterial}>
              <div className="form-group">
                <label className="form-label">Chọn Nguyên Vật Liệu Thu Mua</label>
                <select
                  className="form-select"
                  value={selectedMatId}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setSelectedMatId(id)
                    const found = materials.find((m) => m.material_id === id)
                    if (found && found.unit_cost) {
                      setImportUnitPrice(found.unit_cost)
                    }
                  }}
                >
                  {materials.map((m) => (
                    <option key={m.material_id} value={m.material_id}>
                      {m.material_name} ({m.material_code}) — Tồn: {Number(m.current_stock).toLocaleString()} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Số lượng nhập mua</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={importQty}
                    onChange={(e) => setImportQty(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Đơn giá nhập thực tế (VNĐ)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={importUnitPrice}
                    onChange={(e) => setImportUnitPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Chu kỳ / Mùa vụ biến động giá</label>
                <select
                  className="form-select"
                  value={marketSeason}
                  onChange={(e) => {
                    const val = e.target.value
                    setMarketSeason(val)
                    if (Number(selectedMatId) === 1) {
                      if (val === 'LOW_SEASON_MAY_JUL') setImportUnitPrice(20200)
                      else if (val === 'MID_AUTUMN_AUG_OCT') setImportUnitPrice(24800)
                      else if (val === 'PEAK_SEASON_NOV_JAN') setImportUnitPrice(29500)
                      else setImportUnitPrice(24000)
                    }
                  }}
                >
                  <option value="LOW_SEASON_MAY_JUL">🟢 Mùa Thu Hoạch Tháng 5-7 (Giá Đáy Tích Trữ -20%)</option>
                  <option value="NORMAL">⚪ Mùa Bình Thường Tháng 3-4 (Giá Ổn Định)</option>
                  <option value="MID_AUTUMN_AUG_OCT">🟡 Vụ Trung Thu Tháng 8-10 (Giá Tăng Nhẹ)</option>
                  <option value="PEAK_SEASON_NOV_JAN">🔴 Cao Điểm Cuối Năm & Cận Tết Tháng 11-1 (Giá Đỉnh)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nhà cung cấp đối tác</label>
                <input
                  type="text"
                  className="form-input"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú lô nhập</label>
                <input
                  type="text"
                  className="form-input"
                  value={importNotes}
                  onChange={(e) => setImportNotes(e.target.value)}
                />
              </div>

              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <span>Tổng giá trị lô thu mua:</span>
                <strong style={{ color: '#10b981' }}>
                  {(Number(importQty) * Number(importUnitPrice)).toLocaleString('vi-VN')} ₫
                </strong>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={16} />
                <span>Xác Nhận Nhập Kho NVL & Ghi Nhận Giá Vốn</span>
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
              Lịch Sử Các Lô Thu Mua NVL & Biến Động Giá Thị Trường ({receipts.length})
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Mã Phiếu Nhập" field="receipt_code" sortConfig={recSort} onSort={handleRecSort} />
                    <SortableHeader label="Nguyên Vật Liệu & NCC" field="material_name" sortConfig={recSort} onSort={handleRecSort} />
                    <SortableHeader label="Số Lượng" field="quantity" sortConfig={recSort} onSort={handleRecSort} />
                    <SortableHeader label="Đơn Giá Thực Tế" field="unit_price" sortConfig={recSort} onSort={handleRecSort} />
                    <SortableHeader label="Thành Tiền" field="total_cost" sortConfig={recSort} onSort={handleRecSort} />
                    <SortableHeader label="Mùa Vụ Thị Trường" field="market_season" sortConfig={recSort} onSort={handleRecSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortArrayByField(receipts, recSort).map((rec) => (
                    <tr key={rec.receipt_id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#c084fc', fontSize: '0.8rem' }}>{rec.receipt_code}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rec.created_at}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{rec.material_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.supplier_name}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        +{Number(rec.quantity).toLocaleString('vi-VN')} {rec.unit}
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {Number(rec.unit_price).toLocaleString('vi-VN')} ₫/{rec.unit}
                      </td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(rec.total_cost).toLocaleString('vi-VN')} ₫
                      </td>
                      <td>
                        {rec.market_season === 'LOW_SEASON_MAY_JUL' ? (
                          <span className="badge badge-completed">
                            <TrendingDown size={12} /> Đáy mùa hè (T5-T7)
                          </span>
                        ) : rec.market_season === 'PEAK_SEASON_NOV_JAN' ? (
                          <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                            <TrendingUp size={12} /> Đỉnh cuối năm
                          </span>
                        ) : (
                          <span className="badge badge-pending">{rec.market_season}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TỒN KHO NGUYÊN VẬT LIỆU */}
      {activeTab === 'materials' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
            Bảng Kiểm Kê Nguyên Vật Liệu Đầu Vào
          </h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Mã NVL" field="material_code" sortConfig={matSort} onSort={handleMatSort} />
                  <SortableHeader label="Tên nguyên vật liệu" field="material_name" sortConfig={matSort} onSort={handleMatSort} />
                  <SortableHeader label="Tồn kho hiện tại" field="current_stock" sortConfig={matSort} onSort={handleMatSort} />
                  <SortableHeader label="Định mức an toàn (Min)" field="min_stock_level" sortConfig={matSort} onSort={handleMatSort} />
                  <SortableHeader label="Đơn giá nhập gần nhất" field="unit_cost" sortConfig={matSort} onSort={handleMatSort} />
                  <SortableHeader label="Đơn vị" field="unit" sortConfig={matSort} onSort={handleMatSort} />
                  <th>Trạng thái cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                      {loading ? 'Đang tải...' : 'Không có dữ liệu NVL.'}
                    </td>
                  </tr>
                ) : (
                  sortArrayByField(materials, matSort).map((m) => {
                    const isLow = Number(m.current_stock) <= Number(m.min_stock_level)
                    return (
                      <tr key={m.material_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{m.material_code}</td>
                        <td style={{ fontWeight: 500 }}>{m.material_name}</td>
                        <td style={{ fontWeight: 700, color: isLow ? '#f43f5e' : '#10b981' }}>
                          {Number(m.current_stock).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ color: '#94a3b8' }}>
                          {Number(m.min_stock_level).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ fontWeight: 600, color: '#cbd5e1' }}>
                          {Number(m.unit_cost || 0).toLocaleString('vi-VN')} ₫
                        </td>
                        <td>{m.unit}</td>
                        <td>
                          {isLow ? (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(244,63,94,0.15)',
                                color: '#f43f5e',
                                border: '1px solid rgba(244,63,94,0.3)',
                              }}
                            >
                              <AlertTriangle size={12} /> Cảnh báo sắp hết
                            </span>
                          ) : (
                            <span className="badge badge-completed">
                              <CheckCircle size={12} /> Đủ định mức
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
      )}

      {/* TAB 4: TỒN KHO THÀNH PHẨM THEO LÔ */}
      {activeTab === 'finished_goods' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
            Bảng Quản Lý Tồn Kho Thành Phẩm Theo Lô (Lot Tracking)
          </h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Mã Lô (Lot Number)" field="lot_number" sortConfig={fgSort} onSort={handleFgSort} />
                  <SortableHeader label="Tên sản phẩm" field="product_name" sortConfig={fgSort} onSort={handleFgSort} />
                  <SortableHeader label="Số lượng tồn kho" field="quantity_in_stock" sortConfig={fgSort} onSort={handleFgSort} />
                  <SortableHeader label="Đơn vị tính" field="unit" sortConfig={fgSort} onSort={handleFgSort} />
                  <SortableHeader label="Ngày sản xuất" field="manufactured_date" sortConfig={fgSort} onSort={handleFgSort} />
                  <SortableHeader label="Vị trí kho" field="warehouse_location" sortConfig={fgSort} onSort={handleFgSort} />
                </tr>
              </thead>
              <tbody>
                {finishedGoods.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                      {loading ? 'Đang tải...' : 'Chưa có lô thành phẩm nào trong kho.'}
                    </td>
                  </tr>
                ) : (
                  sortArrayByField(finishedGoods, fgSort).map((fg) => (
                    <tr key={fg.inventory_id}>
                      <td style={{ fontWeight: 600, color: '#f59e0b' }}>{fg.lot_number}</td>
                      <td style={{ fontWeight: 500 }}>{fg.product_name}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {Number(fg.quantity_in_stock).toLocaleString('vi-VN')}
                      </td>
                      <td>{fg.unit}</td>
                      <td style={{ color: '#94a3b8' }}>{fg.manufactured_date || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                          {fg.warehouse_location || 'KHO_CHINH'}
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
    </div>
  )
}
