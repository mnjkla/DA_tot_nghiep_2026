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
  Building2,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Inbox,
  Calendar,
  X,
  Warehouse,
  History,
  Eye,
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

  const [activeTab, setActiveTab] = useState(defaultTab) // 'approvals' | 'procurement' | 'materials' | 'finished_goods' | 'suppliers' | 'receive_fg'
  const [materials, setMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [requisitions, setRequisitions] = useState([])
  const [receipts, setReceipts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [pendingFinishedGoods, setPendingFinishedGoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)

  const { sortConfig: reqSort, handleSort: handleReqSort } = useTableSort('req_id', 'desc')
  const { sortConfig: recSort, handleSort: handleRecSort } = useTableSort('receipt_id', 'desc')
  const { sortConfig: matSort, handleSort: handleMatSort } = useTableSort('material_id', 'asc')
  const { sortConfig: fgSort, handleSort: handleFgSort } = useTableSort('inventory_id', 'desc')
  const { sortConfig: supSort, handleSort: handleSupSort } = useTableSort('supplier_id', 'asc')

  // Form Thu Mua Nhập Kho NVL (Procurement - QLK_04)
  const [selectedMatId, setSelectedMatId] = useState(1)
  const [importQty, setImportQty] = useState(1000)
  const [importUnitPrice, setImportUnitPrice] = useState(20500)
  const [supplierName, setSupplierName] = useState('Nhà Yến Khánh Hòa Nguồn Việt')
  const [marketSeason, setMarketSeason] = useState('LOW_SEASON_MAY_JUL')
  const [importNotes, setImportNotes] = useState('Nhập tích trữ NVL theo biến động giá thị trường')

  // State Quản lý Nhà Cung Cấp (QLK_01)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [supplierForm, setSupplierForm] = useState({
    supplier_code: '',
    supplier_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    status: 'ACTIVE',
  })

  // State Duyệt Nhập Kho Thành Phẩm Sau SX (QLK_06)
  const [receivingOrder, setReceivingOrder] = useState(null)
  const [receiveForm, setReceiveForm] = useState({
    lot_number: '',
    quantity: 0,
    manufactured_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    warehouse_location: 'KHO_THANH_PHAM_A',
  })

  // State Quản Lý Danh Mục Các Kho (Yêu cầu mới Quản Lý Kho)
  const [warehouses, setWarehouses] = useState([])
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [warehouseForm, setWarehouseForm] = useState({
    warehouse_code: '',
    warehouse_name: '',
    warehouse_type: 'KHO_THANH_PHAM',
    manager_name: '',
    contact_phone: '',
    location: '',
    capacity: '',
    status: 'ACTIVE',
  })
  const [historyWarehouse, setHistoryWarehouse] = useState(null)
  const [warehouseHistory, setWarehouseHistory] = useState({ inbounds: [], outbounds: [] })
  const [loadingWhHistory, setLoadingWhHistory] = useState(false)

  const fetchInventoryData = () => {
    setLoading(true)
    Promise.all([
      api.getMaterials(),
      api.getFinishedGoods(),
      api.getMaterialRequisitions ? api.getMaterialRequisitions().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getMaterialReceipts ? api.getMaterialReceipts().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getSuppliers ? api.getSuppliers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getPendingFinishedGoods ? api.getPendingFinishedGoods().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getWarehouses ? api.getWarehouses().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([matRes, fgRes, reqRes, recRes, supRes, pfgRes, whRes]) => {
        const mats = matRes.data || []
        setMaterials(mats)
        setFinishedGoods(fgRes.data || [])
        setRequisitions(reqRes.data || [])
        setReceipts(recRes.data || [])
        const sups = supRes.data || []
        setSuppliers(sups)
        setPendingFinishedGoods(pfgRes.data || [])
        setWarehouses(whRes.data || [])

        if (mats.length > 0 && !selectedMatId) {
          setSelectedMatId(mats[0].material_id)
        }
        if (sups.length > 0 && (!supplierName || supplierName === 'Nhà Yến Khánh Hòa Nguồn Việt')) {
          setSupplierName(sups[0].supplier_name)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const handleOpenAddWarehouse = () => {
    setEditingWarehouse(null)
    setWarehouseForm({
      warehouse_code: `KHO_${String(warehouses.length + 1).padStart(2, '0')}`,
      warehouse_name: '',
      warehouse_type: 'KHO_THANH_PHAM',
      manager_name: currentUser?.full_name || 'Nguyễn Văn Kho',
      contact_phone: '0901000005',
      location: '',
      capacity: '50.000 đơn vị',
      status: 'ACTIVE',
    })
    setWarehouseModalOpen(true)
  }

  const handleOpenEditWarehouse = (w) => {
    setEditingWarehouse(w)
    setWarehouseForm({
      warehouse_code: w.warehouse_code || '',
      warehouse_name: w.warehouse_name || '',
      warehouse_type: w.warehouse_type || 'KHO_THANH_PHAM',
      manager_name: w.manager_name || '',
      contact_phone: w.contact_phone || '',
      location: w.location || '',
      capacity: w.capacity || '',
      status: w.status || 'ACTIVE',
    })
    setWarehouseModalOpen(true)
  }

  const handleSaveWarehouse = async (e) => {
    e.preventDefault()
    try {
      if (editingWarehouse) {
        const res = await api.updateWarehouse(editingWarehouse.warehouse_id, warehouseForm)
        addToast && addToast(res.message, 'success')
      } else {
        const res = await api.createWarehouse(warehouseForm)
        addToast && addToast(res.message, 'success')
      }
      setWarehouseModalOpen(false)
      fetchInventoryData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleViewWarehouseHistory = async (w) => {
    setHistoryWarehouse(w)
    setLoadingWhHistory(true)
    try {
      const res = await api.getWarehouseTransactions(w.warehouse_id)
      setWarehouseHistory(res || { inbounds: [], outbounds: [] })
    } catch (err) {
      addToast && addToast(err.message, 'error')
    } finally {
      setLoadingWhHistory(false)
    }
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

  // Xử lý Nhà cung cấp (QLK_01)
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null)
    const nextCode = `NCC_${String(suppliers.length + 1).padStart(3, '0')}`
    setSupplierForm({
      supplier_code: nextCode,
      supplier_name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      status: 'ACTIVE',
    })
    setSupplierModalOpen(true)
  }

  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup)
    setSupplierForm({
      supplier_code: sup.supplier_code || '',
      supplier_name: sup.supplier_name || '',
      contact_name: sup.contact_name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      status: sup.status || 'ACTIVE',
    })
    setSupplierModalOpen(true)
  }

  const handleSaveSupplier = async (e) => {
    e.preventDefault()
    try {
      if (editingSupplier) {
        const res = await api.updateSupplier(editingSupplier.supplier_id, supplierForm)
        addToast && addToast(res.message, 'success')
      } else {
        const res = await api.createSupplier(supplierForm)
        addToast && addToast(res.message, 'success')
      }
      setSupplierModalOpen(false)
      fetchInventoryData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleToggleSupplierStatus = async (sup) => {
    const nextStatus = sup.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const confirmMsg =
      nextStatus === 'INACTIVE'
        ? `Bạn có chắc muốn tạm dừng / ngừng hợp tác với NCC "${sup.supplier_name}"?`
        : `Kích hoạt lại trạng thái hoạt động cho NCC "${sup.supplier_name}"?`
    if (!window.confirm(confirmMsg)) return

    try {
      const res = await api.updateSupplier(sup.supplier_id, {
        ...sup,
        status: nextStatus,
      })
      addToast && addToast(res.message, 'success')
      fetchInventoryData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  // Xử lý Duyệt Nhập Kho Thành Phẩm (QLK_06)
  const handleOpenReceiveModal = (order) => {
    const todayStr = new Date().toISOString().split('T')[0]
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    const expStr = d.toISOString().split('T')[0]
    const dateCompact = todayStr.replace(/-/g, '').slice(2)
    const lotNum = `LOT_${order.order_code || 'PO'}_${dateCompact}`

    setReceivingOrder(order)
    setReceiveForm({
      lot_number: lotNum,
      quantity: order.target_quantity || 100,
      manufactured_date: todayStr,
      expiry_date: expStr,
      warehouse_location: 'KHO_THANH_PHAM_A',
    })
  }

  const handleConfirmReceiveFinishedGoods = async (e) => {
    e.preventDefault()
    if (!receivingOrder) return
    try {
      const payload = {
        order_id: receivingOrder.order_id,
        lot_number: receiveForm.lot_number,
        quantity: Number(receiveForm.quantity),
        manufactured_date: receiveForm.manufactured_date,
        expiry_date: receiveForm.expiry_date,
        warehouse_location: receiveForm.warehouse_location,
        received_by: currentUser ? `${currentUser.username} (${currentUser.full_name})` : 'kho (Nguyễn Văn Kho)',
      }
      const res = await api.receiveFinishedGoods(payload)
      addToast && addToast(res.message, 'success')
      setReceivingOrder(null)
      fetchInventoryData()
      setActiveTab('finished_goods')
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  // Xuất báo cáo in ấn / PDF (QLK_10)
  const handlePrintInventoryReport = () => {
    window.print()
  }

  const pendingReqCount = requisitions.filter((r) => r.status === 'PENDING_APPROVAL').length
  const pendingReceiveCount = pendingFinishedGoods.length

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.toLowerCase().trim()
    if (!q) return true
    return (
      (s.supplier_name && s.supplier_name.toLowerCase().includes(q)) ||
      (s.supplier_code && s.supplier_code.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(q))
    )
  })

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
      {/* Navigation Tabs & Excel/PDF Bar */}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('approvals')}
          >
            <ClipboardCheck size={16} />
            <span>Duyệt Xuất NVL ({requisitions.length})</span>
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
            className={`btn ${activeTab === 'receive_fg' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('receive_fg')}
          >
            <Inbox size={16} />
            <span>Duyệt Nhập Thành Phẩm Sau SX ({pendingReceiveCount})</span>
            {pendingReceiveCount > 0 && (
              <span
                style={{
                  background: '#10b981',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '1px 7px',
                  borderRadius: 10,
                  marginLeft: 4,
                }}
              >
                {pendingReceiveCount} lệnh xong
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'procurement' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('procurement')}
          >
            <ShoppingBag size={16} />
            <span>Thu Mua & Nhập Kho NVL</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'materials' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('materials')}
          >
            <Feather size={16} />
            <span>Tồn Kho NVL ({materials.length})</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'finished_goods' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('finished_goods')}
          >
            <Package size={16} />
            <span>Tồn Kho Thành Phẩm ({finishedGoods.length})</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('suppliers')}
          >
            <Building2 size={16} />
            <span>Nhà Cung Cấp NVL ({suppliers.length})</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'warehouses' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('warehouses')}
          >
            <Warehouse size={16} />
            <span>Danh Mục Các Kho ({warehouses.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrintInventoryReport}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              borderColor: 'rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
            }}
          >
            <Printer size={14} />
            <span>In / Xuất Báo Cáo PDF</span>
          </button>

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
            <span>Xuất Nhập-Xuất-Tồn (.XLSX)</span>
          </a>

          <label
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              borderColor: 'rgba(192, 132, 252, 0.45)',
              color: '#c084fc',
              cursor: uploadingFile ? 'wait' : 'pointer',
              margin: 0,
            }}
          >
            <Upload size={14} />
            <span>{uploadingFile ? 'Đang nhập...' : 'Nhập Từ Excel/CSV'}</span>
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

      {/* TAB 1: TRƯỞNG KHO DUYỆT XUẤT KHO NVL CHO SẢN XUẤT */}
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

      {/* TAB MỚI: DUYỆT NHẬP KHO THÀNH PHẨM SAU SẢN XUẤT (QLK_06) */}
      {activeTab === 'receive_fg' && (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inbox size={18} color="#10b981" />
              <span>Duyệt Nhập Kho Thành Phẩm Sau Khi Hoàn Thành Sản Xuất (QLK_06)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
              Tiếp nhận các Lệnh sản xuất đã hoàn thành từ Quản Đốc, lập số lô, ngày sản xuất, hạn sử dụng và cộng trực tiếp vào tồn kho thành phẩm.
            </p>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Lệnh SX</th>
                  <th>Sản Phẩm Thành Phẩm</th>
                  <th>Phân Xưởng Sản Xuất</th>
                  <th>Số Lượng Hoàn Thành</th>
                  <th>Ngày Bắt Đầu / Hạn Chót</th>
                  <th>Trạng Thái Nhập Kho</th>
                  <th>Thao Tác Thủ Kho</th>
                </tr>
              </thead>
              <tbody>
                {pendingFinishedGoods.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                      {loading ? 'Đang tải danh sách...' : 'Không có lệnh sản xuất nào đang chờ nhập kho thành phẩm.'}
                    </td>
                  </tr>
                ) : (
                  pendingFinishedGoods.map((order) => {
                    const isReceived = order.receipt_status === 'RECEIVED'
                    return (
                      <tr key={order.order_id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#38bdf8' }}>{order.order_code}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID #{order.order_id}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.product_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mã SP: {order.product_code || 'SP'}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                            {order.workshop_name || 'Xưởng Chính'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>
                          {Number(order.target_quantity).toLocaleString('vi-VN')} {order.product_unit || 'hộp'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <div>Bắt đầu: {order.start_time || '—'}</div>
                          <div style={{ color: '#f59e0b' }}>Hạn chót: {order.end_time || '—'}</div>
                        </td>
                        <td>
                          {isReceived ? (
                            <span className="badge badge-completed">
                              <CheckCircle2 size={12} /> Đã nhập vào kho
                            </span>
                          ) : (
                            <span className="badge badge-pending">
                              ⏳ Chờ thủ kho nhận hàng
                            </span>
                          )}
                        </td>
                        <td>
                          {isReceived ? (
                            <span style={{ fontSize: '0.78rem', color: '#10b981' }}>✓ Hoàn tất</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-action"
                              onClick={() => handleOpenReceiveModal(order)}
                            >
                              <Inbox size={14} />
                              <span>Duyệt Nhập Kho</span>
                            </button>
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

      {/* TAB 2: PHÂN HỆ THU MUA NVL THEO GIÁ BIẾN ĐỘNG THỊ TRƯỜNG & NCC (QLK_04) */}
      {activeTab === 'procurement' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.65fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="#c084fc" />
              <span>Lập Phiếu Nhập Mua NVL Theo Nhà Cung Cấp</span>
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

              {/* Tích hợp chọn Nhà cung cấp Dropdown (QLK_04) */}
              <div className="form-group">
                <label className="form-label">Nhà cung cấp đối tác (Danh mục NCC)</label>
                {suppliers.length > 0 ? (
                  <select
                    className="form-select"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    required
                  >
                    {suppliers
                      .filter((s) => s.status !== 'INACTIVE')
                      .map((s) => (
                        <option key={s.supplier_id} value={s.supplier_name}>
                          {s.supplier_name} ({s.supplier_code}) — {s.phone || 'SĐT: N/A'}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Nhập tên đối tác cung cấp..."
                    required
                  />
                )}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Bảng Quản Lý Tồn Kho Thành Phẩm Theo Lô (Lot Tracking)
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                Quản lý số lượng tồn, số lô, ngày sản xuất và vị trí lưu trữ từng mặt hàng.
              </p>
            </div>
            {pendingFinishedGoods.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab('receive_fg')}
              >
                <Inbox size={15} />
                <span>Xem {pendingFinishedGoods.length} Lệnh SX Hoàn Thành Chờ Nhập Kho</span>
              </button>
            )}
          </div>

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

      {/* TAB 5: QUẢN LÝ NHÀ CUNG CẤP NGUYÊN VẬT LIỆU (QLK_01) */}
      {activeTab === 'suppliers' && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#38bdf8" />
                <span>Danh Mục Nhà Cung Cấp Nguyên Vật Liệu (QLK_01)</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                Quản lý hồ sơ đối tác cung cấp yến sào thô, bao bì chai lọ, đường phèn; kiểm soát trạng thái hợp tác.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 260 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 32, fontSize: '0.82rem' }}
                  placeholder="Tìm theo tên, mã NCC, SĐT..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
              </div>

              <button type="button" className="btn btn-primary" onClick={handleOpenAddSupplier}>
                <Plus size={16} />
                <span>Thêm Nhà Cung Cấp</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Mã NCC" field="supplier_code" sortConfig={supSort} onSort={handleSupSort} />
                  <SortableHeader label="Tên Nhà Cung Cấp" field="supplier_name" sortConfig={supSort} onSort={handleSupSort} />
                  <SortableHeader label="Người Đại Diện" field="contact_name" sortConfig={supSort} onSort={handleSupSort} />
                  <SortableHeader label="Số Điện Thoại" field="phone" sortConfig={supSort} onSort={handleSupSort} />
                  <th>Email & Địa Chỉ</th>
                  <SortableHeader label="Trạng Thái" field="status" sortConfig={supSort} onSort={handleSupSort} />
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                      {loading ? 'Đang tải...' : 'Không tìm thấy nhà cung cấp nào.'}
                    </td>
                  </tr>
                ) : (
                  sortArrayByField(filteredSuppliers, supSort).map((sup) => {
                    const isActive = sup.status !== 'INACTIVE'
                    return (
                      <tr key={sup.supplier_id}>
                        <td style={{ fontWeight: 700, color: '#38bdf8' }}>{sup.supplier_code}</td>
                        <td style={{ fontWeight: 600 }}>{sup.supplier_name}</td>
                        <td style={{ color: '#cbd5e1' }}>{sup.contact_name || '—'}</td>
                        <td style={{ fontWeight: 600, color: '#10b981' }}>{sup.phone || '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          <div>{sup.email || ''}</div>
                          <div>{sup.address || ''}</div>
                        </td>
                        <td>
                          {isActive ? (
                            <span className="badge badge-completed">
                              <CheckCircle2 size={12} /> Đang hợp tác
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                              <XCircle size={12} /> Ngừng hợp tác
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-action"
                              style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                              onClick={() => handleOpenEditSupplier(sup)}
                            >
                              <Edit2 size={13} />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-action"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.76rem',
                                background: isActive ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                                color: isActive ? '#f43f5e' : '#10b981',
                                border: 'none',
                              }}
                              onClick={() => handleToggleSupplierStatus(sup)}
                            >
                              {isActive ? 'Ngừng hợp tác' : 'Kích hoạt lại'}
                            </button>
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

      {/* MODAL THÊM / SỬA NHÀ CUNG CẤP (QLK_01) */}
      {supplierModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 520, width: '100%', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSupplierModalOpen(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="#38bdf8" />
              <span>{editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Đăng Ký Nhà Cung Cấp Mới'}</span>
            </h3>

            <form onSubmit={handleSaveSupplier}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mã NCC</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierForm.supplier_code}
                    onChange={(e) => setSupplierForm({ ...supplierForm, supplier_code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên Nhà Cung Cấp</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierForm.supplier_name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Người Đại Diện</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierForm.contact_name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số Điện Thoại</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Liên Hệ</label>
                <input
                  type="email"
                  className="form-input"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Địa Chỉ Kho / Trụ Sở</label>
                <input
                  type="text"
                  className="form-input"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trạng Thái Hợp Tác</label>
                <select
                  className="form-select"
                  value={supplierForm.status}
                  onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Đang hợp tác (Active)</option>
                  <option value="INACTIVE">Tạm dừng / Ngừng hợp tác (Inactive)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSupplierModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Lưu Thay Đổi' : 'Đăng Ký NCC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: QUẢN LÝ DANH MỤC CÁC KHO (YÊU CẦU MỚI QUẢN LÝ KHO) */}
      {activeTab === 'warehouses' && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Warehouse size={18} color="#38bdf8" />
                <span>Danh Mục Các Kho & Lịch Sử Nhập Xuất (Quản Lý Kho)</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                Quản lý thông tin các kho nguyên vật liệu và kho thành phẩm, người đại diện kho, số điện thoại liên hệ và theo dõi các lệnh nhập xuất.
              </p>
            </div>

            <button type="button" className="btn btn-primary" onClick={handleOpenAddWarehouse}>
              <Plus size={16} />
              <span>Đăng Ký Kho Mới</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Kho</th>
                  <th>Tên Kho Lưu Trữ</th>
                  <th>Phân Loại</th>
                  <th>Người Đại Diện Kho</th>
                  <th>Liên Hệ Đại Diện</th>
                  <th>Địa Chỉ / Vị Trí</th>
                  <th>Sức Chứa</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                      {loading ? 'Đang tải...' : 'Chưa có thông tin kho nào.'}
                    </td>
                  </tr>
                ) : (
                  warehouses.map((w) => (
                    <tr key={w.warehouse_id}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{w.warehouse_code}</td>
                      <td style={{ fontWeight: 600 }}>{w.warehouse_name}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: w.warehouse_type === 'KHO_NGUYEN_VAT_LIEU' ? 'rgba(56,189,248,0.15)' : 'rgba(16,185,129,0.15)',
                            color: w.warehouse_type === 'KHO_NGUYEN_VAT_LIEU' ? '#38bdf8' : '#10b981',
                          }}
                        >
                          {w.warehouse_type === 'KHO_NGUYEN_VAT_LIEU' ? 'Kho Nguyên Vật Liệu' : 'Kho Thành Phẩm'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{w.manager_name || 'Nguyễn Văn Kho'}</td>
                      <td style={{ color: '#34d399', fontWeight: 600, fontFamily: 'monospace' }}>
                        {w.contact_phone || '0901000005'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: 200 }}>{w.location || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{w.capacity || '—'}</td>
                      <td>
                        <span className={`badge ${w.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {w.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-action"
                            style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                            onClick={() => handleViewWarehouseHistory(w)}
                            title="Xem lịch sử nhập xuất của kho"
                          >
                            <History size={13} />
                            <span>Lịch Sử</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-action"
                            style={{ padding: '4px 8px', fontSize: '0.74rem', borderColor: 'rgba(56,189,248,0.4)', color: '#38bdf8' }}
                            onClick={() => handleOpenEditWarehouse(w)}
                            title="Chỉnh sửa thông tin kho"
                          >
                            <Edit2 size={13} />
                            <span>Sửa</span>
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

      {/* MODAL THÊM / SỬA KHO */}
      {warehouseModalOpen && (
        <div className="modal-overlay" onClick={() => setWarehouseModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Warehouse size={18} color="#38bdf8" />
                <span>{editingWarehouse ? 'Chỉnh Sửa Thông Tin Kho' : 'Đăng Ký Kho Lưu Trữ Mới'}</span>
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setWarehouseModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveWarehouse}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Mã Kho</label>
                    <input
                      type="text"
                      className="form-input"
                      value={warehouseForm.warehouse_code}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên Kho Lưu Trữ</label>
                    <input
                      type="text"
                      className="form-input"
                      value={warehouseForm.warehouse_name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Phân Loại Kho</label>
                    <select
                      className="form-select"
                      value={warehouseForm.warehouse_type}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_type: e.target.value })}
                    >
                      <option value="KHO_THANH_PHAM">Kho Thành Phẩm</option>
                      <option value="KHO_NGUYEN_VAT_LIEU">Kho Nguyên Vật Liệu & Bao Bì</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sức Chứa / Dung Lượng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={warehouseForm.capacity}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Người Đại Diện Kho</label>
                    <input
                      type="text"
                      className="form-input"
                      value={warehouseForm.manager_name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SĐT Liên Hệ Đại Diện</label>
                    <input
                      type="text"
                      className="form-input"
                      value={warehouseForm.contact_phone}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vị Trí / Địa Chỉ Kho</label>
                  <input
                    type="text"
                    className="form-input"
                    value={warehouseForm.location}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng Thái Hoạt Động</label>
                  <select
                    className="form-select"
                    value={warehouseForm.status}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Tạm dừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setWarehouseModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingWarehouse ? 'Lưu Thay Đổi' : 'Đăng Ký Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM LỊCH SỬ NHẬP XUẤT CỦA KHO */}
      {historyWarehouse && (
        <div className="modal-overlay" onClick={() => setHistoryWarehouse(null)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} color="#38bdf8" />
                <span>Lịch Sử Các Lệnh Nhập & Xuất: {historyWarehouse.warehouse_name}</span>
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setHistoryWarehouse(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: '0.85rem' }}>
                <div><strong>Người đại diện:</strong> {historyWarehouse.manager_name} • <strong>SĐT:</strong> <span style={{ color: '#10b981' }}>{historyWarehouse.contact_phone}</span></div>
                <div style={{ marginTop: 4, color: '#94a3b8' }}><strong>Địa chỉ:</strong> {historyWarehouse.location}</div>
              </div>

              {loadingWhHistory ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>Đang tải lịch sử giao dịch...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', marginBottom: 8 }}>
                      📥 Các Lệnh Nhập Kho Gần Nhất
                    </h4>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Mã Lô</th>
                            <th>Sản Phẩm</th>
                            <th>Số Lượng</th>
                            <th>Ngày SX / HSD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(warehouseHistory.inbounds || []).length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>Chưa có giao dịch nhập nào</td></tr>
                          ) : (
                            warehouseHistory.inbounds.map((inb, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600, color: '#f59e0b' }}>{inb.lot_number}</td>
                                <td>{inb.product_name}</td>
                                <td style={{ fontWeight: 700, color: '#10b981' }}>+{inb.quantity_in_stock}</td>
                                <td style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{inb.manufactured_date} → {inb.expiry_date}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
                      📤 Các Lệnh Xuất Kho Cho Đại Lý Gần Nhất
                    </h4>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Mã Phiếu Xuất</th>
                            <th>Đơn Hàng SO</th>
                            <th>Khách Hàng / Đại Lý</th>
                            <th>Ngày Xuất</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(warehouseHistory.outbounds || []).length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>Chưa có giao dịch xuất nào</td></tr>
                          ) : (
                            warehouseHistory.outbounds.map((outb, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 700, color: '#38bdf8' }}>{outb.dispatch_code}</td>
                                <td>{outb.order_code}</td>
                                <td style={{ fontWeight: 600 }}>{outb.customer_name}</td>
                                <td style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{outb.dispatched_at}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setHistoryWarehouse(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {receivingOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 540, width: '100%', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setReceivingOrder(null)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inbox size={18} color="#10b981" />
              <span>Duyệt Nhập Kho Thành Phẩm Sau SX</span>
            </h3>

            <div
              style={{
                background: 'rgba(15,23,42,0.6)',
                padding: '12px 14px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.85rem',
              }}
            >
              <div>
                <strong>Lệnh Sản Xuất:</strong> <span style={{ color: '#38bdf8' }}>{receivingOrder.order_code}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Sản phẩm:</strong> {receivingOrder.product_name}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Phân xưởng thực hiện:</strong> {receivingOrder.workshop_name || 'Xưởng Chính'}
              </div>
              <div style={{ marginTop: 4, color: '#10b981' }}>
                <strong>Số lượng theo lệnh:</strong> {receivingOrder.target_quantity} {receivingOrder.product_unit || 'hộp'}
              </div>
            </div>

            <form onSubmit={handleConfirmReceiveFinishedGoods}>
              <div className="form-group">
                <label className="form-label">Mã Lô Hàng (Lot Number)</label>
                <input
                  type="text"
                  className="form-input"
                  value={receiveForm.lot_number}
                  onChange={(e) => setReceiveForm({ ...receiveForm, lot_number: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Số Lượng Thực Nhập</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={receiveForm.quantity}
                    onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vị Trí Lưu Kho</label>
                  <select
                    className="form-select"
                    value={receiveForm.warehouse_location}
                    onChange={(e) => setReceiveForm({ ...receiveForm, warehouse_location: e.target.value })}
                  >
                    <option value="KHO_THANH_PHAM_A">Kho Thành Phẩm A (Khu Lạnh)</option>
                    <option value="KHO_THANH_PHAM_B">Kho Thành Phẩm B (Khu Khô)</option>
                    <option value="KHO_TRUNG_TAM">Kho Trung Tâm</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Ngày Sản Xuất</label>
                  <input
                    type="date"
                    className="form-input"
                    value={receiveForm.manufactured_date}
                    onChange={(e) => setReceiveForm({ ...receiveForm, manufactured_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn Sử Dụng</label>
                  <input
                    type="date"
                    className="form-input"
                    value={receiveForm.expiry_date}
                    onChange={(e) => setReceiveForm({ ...receiveForm, expiry_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReceivingOrder(null)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={15} />
                  <span>Xác Nhận & Cộng Tồn Kho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
