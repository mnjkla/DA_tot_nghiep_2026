import React, { useEffect, useState } from 'react'
import { Package, Feather, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../services/api'

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('materials') // 'materials' | 'finished_goods'
  const [materials, setMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getMaterials(), api.getFinishedGoods()])
      .then(([matRes, fgRes]) => {
        setMaterials(matRes.data || [])
        setFinishedGoods(fgRes.data || [])
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
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

      {activeTab === 'materials' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
            Bảng Kiểm Kê Nguyên Vật Liệu Đầu Vào
          </h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã NVL</th>
                  <th>Tên nguyên vật liệu</th>
                  <th>Tồn kho hiện tại</th>
                  <th>Định mức an toàn (Min)</th>
                  <th>Đơn vị</th>
                  <th>Trạng thái cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                      {loading ? 'Đang tải...' : 'Không có dữ liệu NVL.'}
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => {
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
                        <td>{m.unit}</td>
                        <td>
                          {isLow ? (
                            <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }}>
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

      {activeTab === 'finished_goods' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
            Bảng Quản Lý Tồn Kho Thành Phẩm Theo Lô (Lot Tracking)
          </h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Lô (Lot Number)</th>
                  <th>Tên sản phẩm</th>
                  <th>Số lượng tồn kho</th>
                  <th>Đơn vị tính</th>
                  <th>Ngày sản xuất</th>
                  <th>Vị trí kho</th>
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
                  finishedGoods.map((fg) => (
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
