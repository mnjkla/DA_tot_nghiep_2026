import React, { useEffect, useState } from 'react'
import {
  Info,
  Edit3,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  History,
  CheckCircle2,
  DollarSign,
  Package,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function BOM({ addToast }) {
  const [products, setProducts] = useState([])
  const [allMaterials, setAllMaterials] = useState([])
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [bomItems, setBomItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('')
  const { sortConfig: bomSort, handleSort: handleBomSort } = useTableSort('bom_id', 'asc')

  // Edit Product Pricing state
  const [editPrice, setEditPrice] = useState(0)
  const [editCost, setEditCost] = useState(0)
  const [showPriceModal, setShowPriceModal] = useState(false)

  // Edit BOM Items buffer
  const [editableItems, setEditableItems] = useState([])

  const fetchBOM = (prodId) => {
    setLoading(true)
    api
      .getBOM(prodId)
      .then((res) => {
        const items = res.bom || []
        setBomItems(items)
        setEditableItems(
          items.map((it) => ({
            material_id: it.material_id,
            material_name: it.material_name,
            material_code: it.material_code,
            material_unit: it.material_unit,
            unit_cost: it.unit_cost || 0,
            quantity_required: Number(it.quantity_required),
            notes: it.notes || '',
          }))
        )
        // Lấy version code từ item đầu tiên nếu có, hoặc tạo mặc định
        const v = items[0]?.version_code || `BOM_SP${prodId < 10 ? '0' + prodId : prodId}_261126_v1`
        setCurrentVersion(v)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([
      api.getProducts(),
      api.getMaterials ? api.getMaterials() : Promise.resolve({ data: [] }),
    ]).then(([prodRes, matRes]) => {
      const prodList = prodRes.data || []
      setProducts(prodList)
      setAllMaterials(matRes.data || [])
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].product_id)
        setEditPrice(prodList[0].selling_price || 0)
        setEditCost(prodList[0].cost_price || 0)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      setIsEditing(false)
      fetchBOM(selectedProductId)
      const p = products.find((prod) => prod.product_id === Number(selectedProductId))
      if (p) {
        setEditPrice(p.selling_price || 0)
        setEditCost(p.cost_price || 0)
      }
    }
  }, [selectedProductId])

  const currentProduct = products.find((p) => p.product_id === Number(selectedProductId))

  const handleStartEditing = () => {
    setIsEditing(true)
    setEditableItems(
      bomItems.map((it) => ({
        material_id: it.material_id,
        material_name: it.material_name,
        material_code: it.material_code,
        material_unit: it.material_unit,
        unit_cost: it.unit_cost || 0,
        quantity_required: Number(it.quantity_required),
        notes: it.notes || '',
      }))
    )
  }

  const handleItemQtyChange = (index, val) => {
    const updated = [...editableItems]
    updated[index].quantity_required = Math.max(0, Number(val))
    setEditableItems(updated)
  }

  const handleItemNotesChange = (index, val) => {
    const updated = [...editableItems]
    updated[index].notes = val
    setEditableItems(updated)
  }

  const handleAddMaterialToBOM = (matId) => {
    if (!matId) return
    const mat = allMaterials.find((m) => m.material_id === Number(matId))
    if (!mat) return
    if (editableItems.some((it) => it.material_id === mat.material_id)) {
      addToast && addToast(`Nguyên vật liệu ${mat.material_name} đã có trong BOM`, 'warning')
      return
    }
    setEditableItems([
      ...editableItems,
      {
        material_id: mat.material_id,
        material_name: mat.material_name,
        material_code: mat.material_code,
        material_unit: mat.unit,
        unit_cost: mat.unit_cost || 0,
        quantity_required: 1.0,
        notes: 'Thêm mới vào công thức định mức',
      },
    ])
  }

  const handleRemoveItem = (index) => {
    const updated = editableItems.filter((_, i) => i !== index)
    setEditableItems(updated)
  }

  const handleSaveBOM = async () => {
    if (editableItems.length === 0) {
      addToast && addToast('Định mức BOM phải có ít nhất 1 nguyên vật liệu', 'warning')
      return
    }
    setSaving(true)
    try {
      const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '').slice(0, 4) + '26'
      const newVersion = `BOM_SP${selectedProductId < 10 ? '0' + selectedProductId : selectedProductId}_${dateStr}_v${Math.floor(Math.random() * 90) + 10}`

      await api.updateBOM(selectedProductId, {
        items: editableItems.map((it) => ({
          material_id: it.material_id,
          quantity_required: it.quantity_required,
          notes: it.notes,
        })),
        version_code: newVersion,
      })

      setCurrentVersion(newVersion)
      setIsEditing(false)
      fetchBOM(selectedProductId)
      addToast && addToast(`Đã lưu thành công phiên bản định mức mới: ${newVersion}`, 'success')
    } catch (err) {
      console.error(err)
      addToast && addToast(err.message || 'Lỗi lưu định mức BOM', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProductPricing = async (e) => {
    e.preventDefault()
    if (!currentProduct) return
    try {
      if (api.updateProduct) {
        await api.updateProduct(currentProduct.product_id, {
          product_name: currentProduct.product_name,
          category_id: currentProduct.category_id || 1,
          unit: currentProduct.unit,
          packaging_spec: currentProduct.packaging_spec || '',
          selling_price: Number(editPrice),
          cost_price: Number(editCost),
          target_region: currentProduct.target_region || 'ALL',
          image_url: currentProduct.image_url || '',
          health_benefits: currentProduct.health_benefits || '',
          case_spec: currentProduct.case_spec || '',
          wholesale_moq: currentProduct.wholesale_moq || 12,
        })
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === currentProduct.product_id
            ? { ...p, selling_price: Number(editPrice), cost_price: Number(editCost) }
            : p
        )
      )
      setShowPriceModal(false)
      addToast && addToast(`Đã cập nhật giá bán tiêu chuẩn cho ${currentProduct.product_name}`, 'success')
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  // Tính tổng chi phí NVL dự tính cho 1 đơn vị sản phẩm
  const activeItems = isEditing ? editableItems : bomItems
  const estimatedCostPerUnit = activeItems.reduce((acc, it) => {
    return acc + (Number(it.quantity_required) || 0) * (Number(it.unit_cost) || 0)
  }, 0)

  return (
    <div>
      {/* Header card with product switcher and Version badge */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Định Mức Sản Xuất Tiêu Chuẩn (BOM & Versioning)
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontFamily: 'monospace',
                }}
              >
                {currentVersion || 'BOM_ACTIVE_v1'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 4 }}>
              Xây dựng định mức tiêu hao nguyên vật liệu, quản lý lịch sử phiên bản BOM và giá bán tiêu chuẩn (QDSX_02)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 260 }}>
              <select
                className="form-select"
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
              >
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.packaging_spec || p.unit})
                  </option>
                ))}
              </select>
            </div>

            {!isEditing ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartEditing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Edit3 size={15} />
                <span>Chỉnh Sửa BOM & Tạo Phiên Bản Mới</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false)
                    fetchBOM(selectedProductId)
                  }}
                  disabled={saving}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveBOM}
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#10b981' }}
                >
                  <Save size={15} />
                  <span>{saving ? 'Đang lưu...' : 'Lưu Phiên Bản BOM Mới'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {currentProduct && (
          <div
            style={{
              marginTop: 18,
              padding: '14px 18px',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
              borderRadius: 12,
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                  {currentProduct.product_name} ({currentProduct.product_code})
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                  Giá bán tiêu chuẩn:{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {Number(currentProduct.selling_price || 0).toLocaleString('vi-VN')} ₫
                  </strong>{' '}
                  / {currentProduct.unit} • Giá vốn dự kiến:{' '}
                  <strong style={{ color: '#f59e0b' }}>
                    {Number(currentProduct.cost_price || 0).toLocaleString('vi-VN')} ₫
                  </strong>{' '}
                  • Chi phí NVL theo BOM:{' '}
                  <strong style={{ color: '#34d399' }}>
                    {estimatedCostPerUnit.toLocaleString('vi-VN')} ₫
                  </strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPriceModal(true)}
              style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <DollarSign size={14} />
              <span>Chỉnh Sửa Giá Bán Tiêu Chuẩn</span>
            </button>
          </div>
        )}
      </div>

      {/* Editing Toolbar */}
      {isEditing && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px dashed rgba(56, 189, 248, 0.4)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
                Đang ở chế độ chỉnh sửa công thức định mức NVL
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Thêm NVL vào công thức:</span>
              <select
                className="form-select"
                style={{ width: 220, fontSize: '0.82rem', padding: '4px 8px' }}
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddMaterialToBOM(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  -- Chọn NVL bổ sung --
                </option>
                {allMaterials
                  .filter((m) => !editableItems.some((it) => it.material_id === m.material_id))
                  .map((m) => (
                    <option key={m.material_id} value={m.material_id}>
                      {m.material_name} ({m.unit})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* BOM Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            Chi Tiết Công Thức Định Mức Nguyên Vật Liệu
          </h4>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Tổng số nguyên vật liệu cấu thành: <strong>{activeItems.length}</strong> loại
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="Mã NVL" field="material_code" sortConfig={bomSort} onSort={handleBomSort} />
                <SortableHeader label="Tên nguyên vật liệu" field="material_name" sortConfig={bomSort} onSort={handleBomSort} />
                <SortableHeader label="Đơn vị tính" field="material_unit" sortConfig={bomSort} onSort={handleBomSort} />
                <SortableHeader label="Định mức cho 1 SP" field="quantity_required" sortConfig={bomSort} onSort={handleBomSort} />
                <th>Đơn giá vốn NVL</th>
                <th>Thành tiền NVL / 1 SP</th>
                <th>Ghi chú quy trình</th>
                {isEditing && <th style={{ textAlign: 'center', width: 60 }}>Xóa</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isEditing ? 8 : 7} style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                    Đang tải định mức BOM...
                  </td>
                </tr>
              ) : activeItems.length === 0 ? (
                <tr>
                  <td colSpan={isEditing ? 8 : 7} style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0' }}>
                    Chưa có nguyên vật liệu nào trong định mức của sản phẩm này.
                  </td>
                </tr>
              ) : (
                sortArrayByField(activeItems, bomSort.field, bomSort.direction).map((item, idx) => {
                  const lineCost = (Number(item.quantity_required) || 0) * (Number(item.unit_cost) || 0)
                  return (
                    <tr key={item.material_id || idx}>
                      <td>
                        <span className="badge badge-info">{item.material_code}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.material_name}</td>
                      <td style={{ color: '#94a3b8' }}>{item.material_unit}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            className="form-input"
                            style={{ width: 110, padding: '4px 8px', fontSize: '0.85rem' }}
                            value={item.quantity_required}
                            onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                            required
                          />
                        ) : (
                          <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>
                            {Number(item.quantity_required).toLocaleString('vi-VN', { maximumFractionDigits: 4 })}
                          </strong>
                        )}
                      </td>
                      <td style={{ color: '#cbd5e1' }}>
                        {Number(item.unit_cost || 0).toLocaleString('vi-VN')} ₫
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {lineCost.toLocaleString('vi-VN')} ₫
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                            value={item.notes || ''}
                            onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                            placeholder="Ghi chú công đoạn..."
                          />
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                            {item.notes || 'Định mức chuẩn'}
                          </span>
                        )}
                      </td>
                      {isEditing && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            title="Xóa NVL khỏi định mức"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
            {activeItems.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 700 }}>
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 16 }}>
                    Tổng Chi Phí Nguyên Vật Liệu / 1 Thành Phẩm:
                  </td>
                  <td colSpan={2} style={{ color: '#34d399', fontSize: '0.95rem' }}>
                    ≈ {estimatedCostPerUnit.toLocaleString('vi-VN')} ₫
                  </td>
                  <td colSpan={isEditing ? 3 : 2} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    (Tự động cập nhật vào các Lệnh sản xuất mới lập)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Chỉnh Sửa Giá Bán Tiêu Chuẩn */}
      {showPriceModal && currentProduct && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Cập Nhật Giá Bán & Giá Vốn Tiêu Chuẩn
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px' }}
                onClick={() => setShowPriceModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProductPricing}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
                  Sản phẩm: <strong>{currentProduct.product_name}</strong> ({currentProduct.product_code})
                </p>

                <div className="form-group">
                  <label className="form-label">Giá bán tiêu chuẩn (₫)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Giá vốn dự kiến (₫)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                    Chi phí NVL tính theo công thức BOM hiện hành: {estimatedCostPerUnit.toLocaleString('vi-VN')} ₫.
                  </small>
                </div>
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPriceModal(false)}
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
    </div>
  )
}
