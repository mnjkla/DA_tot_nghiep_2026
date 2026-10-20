import React, { useEffect, useState } from 'react'
import { Layers, Info } from 'lucide-react'
import { api } from '../services/api'

export default function BOM() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [bomItems, setBomItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProducts().then((res) => {
      const prodList = res.data || []
      setProducts(prodList)
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].product_id)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      setLoading(true)
      api.getBOM(selectedProductId)
        .then((res) => setBomItems(res.bom || []))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [selectedProductId])

  const currentProduct = products.find((p) => p.product_id === Number(selectedProductId))

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Định Mức Sản Xuất Tiêu Chuẩn (BOM)</h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Công thức định mức nguyên vật liệu tiêu hao cho 1 đơn vị thành phẩm
            </p>
          </div>

          <div style={{ minWidth: 260 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              Chọn dòng sản phẩm:
            </label>
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
        </div>

        {currentProduct && (
          <div style={{ marginTop: 20, padding: 14, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Info size={20} color="#10b981" />
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{currentProduct.product_name}</span>
              <span style={{ color: '#cbd5e1' }}> — Giá bán tiêu chuẩn: {Number(currentProduct.selling_price).toLocaleString('vi-VN')} ₫ / {currentProduct.unit}. Quy cách: {currentProduct.packaging_spec || 'Theo đơn vị'}.</span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, color: '#f8fafc' }}>
          Danh Sách Nguyên Vật Liệu Tiêu Hao
        </h4>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã NVL</th>
                <th>Tên nguyên vật liệu</th>
                <th>Số lượng định mức / 1 thành phẩm</th>
                <th>Đơn vị tính</th>
                <th>Ghi chú công thức</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                    Đang tải định mức BOM...
                  </td>
                </tr>
              ) : bomItems.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                    Chưa thiết lập định mức BOM cho sản phẩm này.
                  </td>
                </tr>
              ) : (
                bomItems.map((b) => (
                  <tr key={b.bom_id}>
                    <td style={{ fontWeight: 600, color: '#38bdf8' }}>{b.material_code}</td>
                    <td style={{ fontWeight: 500 }}>{b.material_name}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{b.quantity_required}</td>
                    <td>{b.material_unit || b.unit}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{b.notes || 'Định mức tiêu chuẩn'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
