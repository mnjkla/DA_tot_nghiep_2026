import React, { useState, useEffect } from 'react'
import {
  Megaphone,
  Flame,
  Video,
  PackagePlus,
  Edit3,
  Trash2,
  Power,
  MapPin,
  Clock,
  CheckCircle2,
  Sparkles,
  Plus,
  Image as ImageIcon,
  Cloud,
  Upload,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from '../components/SortableHeader'

export default function Campaigns({ addToast }) {
  const [activeTab, setActiveTab] = useState('flashsale') // 'flashsale' | 'video' | 'catalog'
  const [campaigns, setCampaigns] = useState([])
  const [products, setProducts] = useState([])
  const [cloudGallery, setCloudGallery] = useState([])
  const [uploadingCloudImg, setUploadingCloudImg] = useState(false)
  const [loading, setLoading] = useState(true)

  const { sortConfig: campSort, handleSort: handleCampSort } = useTableSort('campaign_id', 'desc')
  const { sortConfig: prodSort, handleSort: handleProdSort } = useTableSort('product_id', 'asc')

  // Form tạo Flash Sale / Video Showcase
  const [title, setTitle] = useState('')
  const [campaignType, setCampaignType] = useState('FLASHSALE')
  const [targetRegion, setTargetRegion] = useState('NORTH')
  const [discountPct, setDiscountPct] = useState(25)
  const [selectedProductId, setSelectedProductId] = useState(1)
  const [videoUrl, setVideoUrl] = useState('https://www.w3schools.com/html/mov_bbb.mp4')
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80'
  )
  const [endTime, setEndTime] = useState('2026-12-31 23:59:59')
  const [notes, setNotes] = useState('Chương trình khuyến mãi đặc biệt theo khu vực')

  // Form Catalog CRUD (Thêm mới / Sửa sản phẩm)
  const [editingProduct, setEditingProduct] = useState(null)
  const [prodCode, setProdCode] = useState('')
  const [prodName, setProdName] = useState('')
  const [prodUnit, setProdUnit] = useState('lọ')
  const [prodSpec, setProdSpec] = useState('Thùng 24 lọ x 70ml')
  const [prodCost, setProdCost] = useState(25000)
  const [prodPrice, setProdPrice] = useState(48000)
  const [prodMoq, setProdMoq] = useState(24)
  const [prodRegion, setProdRegion] = useState('NORTH')
  const [prodImage, setProdImage] = useState(
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
  )
  const [prodBenefits, setProdBenefits] = useState(
    'Bồi bổ khí huyết, tăng cường sức đề kháng và phục hồi thể lực.'
  )
  const [prodInitialStock, setProdInitialStock] = useState(500)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      api.getCampaigns('ALL', false),
      api.getProducts(),
      api.getCloudImages().catch(() => ({ data: [] })),
    ])
      .then(([campRes, prodRes, cloudRes]) => {
        setCampaigns(campRes.data || [])
        const prods = prodRes.data || []
        setProducts(prods)
        setCloudGallery(cloudRes.data || [])
        if (prods.length > 0 && !selectedProductId) {
          setSelectedProductId(prods[0].product_id)
        }
      })
      .catch((err) => {
        console.error(err)
        addToast && addToast(err.message, 'error')
      })
      .finally(() => setLoading(false))
  }

  const handleCloudFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCloudImg(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const res = await api.uploadCloudImage({
          title: prodName.trim() || file.name,
          category: 'SAN_PHAM',
          image_base64: ev.target?.result,
          product_id: editingProduct?.product_id || null,
        })
        setProdImage(res.cloud_url)
        addToast && addToast(res.message || 'Đã tải ảnh lên Cloud thành công!', 'success')
        fetchAll()
      } catch (err) {
        addToast && addToast(err.message || 'Lỗi tải ảnh lên Cloud', 'error')
      } finally {
        setUploadingCloudImg(false)
        e.target.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      addToast && addToast('Vui lòng nhập tên chiến dịch', 'error')
      return
    }
    try {
      const res = await api.createCampaign({
        title: title.trim(),
        campaign_type: campaignType,
        target_region: targetRegion,
        banner_url: bannerUrl,
        video_url: videoUrl,
        discount_percentage: Number(discountPct),
        product_id: Number(selectedProductId),
        end_time: endTime,
        notes,
      })
      addToast && addToast(res.message, 'success')
      setTitle('')
      fetchAll()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleToggleCampaign = async (id) => {
    try {
      const res = await api.toggleCampaign(id)
      addToast && addToast(res.message, 'success')
      fetchAll()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const handleDeleteCampaign = async (id) => {
    try {
      const res = await api.deleteCampaign(id)
      addToast && addToast(res.message, 'info')
      fetchAll()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const startEditProduct = (p) => {
    setEditingProduct(p)
    setProdCode(p.product_code)
    setProdName(p.product_name)
    setProdUnit(p.unit)
    setProdSpec(p.packaging_spec || p.case_spec || '')
    setProdCost(p.cost_price || 20000)
    setProdPrice(p.selling_price || 45000)
    setProdMoq(p.wholesale_moq || 24)
    setProdRegion(p.target_region || 'ALL')
    setProdImage(
      p.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
    )
    setProdBenefits(p.health_benefits || 'Sản phẩm dinh dưỡng cao cấp.')
  }

  const resetProductForm = () => {
    setEditingProduct(null)
    setProdCode('')
    setProdName('')
    setProdUnit('lọ')
    setProdSpec('Thùng 24 lọ x 70ml')
    setProdCost(22000)
    setProdPrice(48000)
    setProdMoq(24)
    setProdRegion('NORTH')
    setProdInitialStock(500)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!prodName.trim()) {
      addToast && addToast('Vui lòng nhập tên sản phẩm', 'error')
      return
    }
    try {
      const payload = {
        product_code: prodCode.trim() || undefined,
        product_name: prodName.trim(),
        unit: prodUnit,
        packaging_spec: prodSpec,
        case_spec: prodSpec,
        cost_price: Number(prodCost),
        selling_price: Number(prodPrice),
        wholesale_moq: Number(prodMoq),
        target_region: prodRegion,
        image_url: prodImage,
        health_benefits: prodBenefits,
        initial_stock: Number(prodInitialStock),
      }
      if (editingProduct) {
        const res = await api.updateProduct(editingProduct.product_id, payload)
        addToast && addToast(res.message, 'success')
      } else {
        const res = await api.createProduct(payload)
        addToast && addToast(res.message, 'success')
      }
      resetProductForm()
      fetchAll()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    }
  }

  const getRegionBadge = (reg) => {
    switch (reg) {
      case 'NORTH':
        return { label: '❄️ Miền Bắc', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }
      case 'CENTRAL':
        return { label: '🎁 Miền Trung', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }
      case 'SOUTH':
        return { label: '☀️ Miền Nam', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }
      default:
        return { label: '🌐 Toàn Quốc', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }
    }
  }

  const flashSales = campaigns.filter((c) => c.campaign_type === 'FLASHSALE')
  const videoShowcases = campaigns.filter((c) => c.campaign_type === 'VIDEO_SHOWCASE')

  return (
    <div>
      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'flashsale' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setActiveTab('flashsale')
            setCampaignType('FLASHSALE')
          }}
        >
          <Flame size={16} />
          <span>Quản Lý Flash Sale Theo Vùng ({flashSales.length})</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'video' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setActiveTab('video')
            setCampaignType('VIDEO_SHOWCASE')
          }}
        >
          <Video size={16} />
          <span>Video Showcase & Truyền Thông ({videoShowcases.length})</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('catalog')}
        >
          <PackagePlus size={16} />
          <span>Catalog CRUD (Thêm / Sửa Sản Phẩm Động) ({products.length})</span>
        </button>
      </div>

      {/* TAB 1 & 2: FLASH SALE & VIDEO SHOWCASE */}
      {(activeTab === 'flashsale' || activeTab === 'video') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
          {/* Cột trái: Form cấu hình */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeTab === 'flashsale' ? <Flame size={18} color="#f43f5e" /> : <Video size={18} color="#38bdf8" />}
              <span>
                {activeTab === 'flashsale'
                  ? 'Tạo Chiến Dịch Flash Sale Đếm Ngược'
                  : 'Nhúng Video Showcase Lên Storefront'}
              </span>
            </h3>

            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label className="form-label">Tiêu đề chiến dịch / Video</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    activeTab === 'flashsale'
                      ? 'VD: 🔥 Flash Sale Gió Mùa Đông Bắc - Giảm 25% Yến Lọ'
                      : 'VD: 🎬 Quy Trình Chưng Cất Tổ Yến Tinh Chế Chuẩn ISO'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Khu vực mục tiêu (Geo-Target)</label>
                  <select
                    className="form-select"
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                  >
                    <option value="ALL">🌐 Toàn Quốc (Tất cả vùng)</option>
                    <option value="NORTH">❄️ Miền Bắc (Mùa lạnh)</option>
                    <option value="CENTRAL">🎁 Miền Trung (Quà biếu)</option>
                    <option value="SOUTH">☀️ Miền Nam (Giải nhiệt)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mức giảm giá Flash Sale (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    className="form-input"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sản phẩm tâm điểm gắn kèm</label>
                <select
                  className="form-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} — Giá lẻ: {Number(p.selling_price).toLocaleString('vi-VN')} ₫/{p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Link Video Showcase (MP4 / YouTube Embed)</label>
                <input
                  type="text"
                  className="form-input"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thời hạn kết thúc Countdown (YYYY-MM-DD HH:mm:ss)</label>
                <input
                  type="text"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thông điệp truyền thông</label>
                <input
                  type="text"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                <Plus size={16} />
                <span>Xuất Bản Lên Cổng Bán Hàng Storefront</span>
              </button>
            </form>
          </div>

          {/* Cột phải: Danh sách chiến dịch đang hoạt động */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
              Danh Sách Chiến Dịch Đang Cấu Hình Trên Storefront ({campaigns.length})
            </h3>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Chiến dịch & Sản phẩm" field="title" sortConfig={campSort} onSort={handleCampSort} />
                    <SortableHeader label="Loại" field="campaign_type" sortConfig={campSort} onSort={handleCampSort} />
                    <SortableHeader label="Vùng mục tiêu" field="target_region" sortConfig={campSort} onSort={handleCampSort} />
                    <SortableHeader label="Ưu đãi" field="discount_percentage" sortConfig={campSort} onSort={handleCampSort} />
                    <SortableHeader label="Trạng thái" field="is_active" sortConfig={campSort} onSort={handleCampSort} />
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        {loading ? 'Đang tải...' : 'Chưa có chiến dịch nào.'}
                      </td>
                    </tr>
                  ) : (
                    sortArrayByField(campaigns, campSort).map((c) => {
                      const regBadge = getRegionBadge(c.target_region)
                      return (
                        <tr key={c.campaign_id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{c.title}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                              SP: {c.product_name || 'Toàn bộ danh mục'} • Hạn: {c.end_time}
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background:
                                  c.campaign_type === 'FLASHSALE'
                                    ? 'rgba(244, 63, 94, 0.15)'
                                    : 'rgba(56, 189, 248, 0.15)',
                                color: c.campaign_type === 'FLASHSALE' ? '#f43f5e' : '#38bdf8',
                              }}
                            >
                              {c.campaign_type === 'FLASHSALE' ? '⚡ Flash Sale' : '🎬 Video'}
                            </span>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{ background: regBadge.bg, color: regBadge.color }}
                            >
                              {regBadge.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#10b981' }}>-{c.discount_percentage}%</div>
                            {c.flash_sale_price && (
                              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                                Còn {Number(c.flash_sale_price).toLocaleString('vi-VN')} ₫
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${c.is_active ? 'badge-completed' : 'badge-pending'}`}>
                              {c.is_active ? 'Đang hiển thị' : 'Tạm dừng'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-action"
                                onClick={() => handleToggleCampaign(c.campaign_id)}
                                title="Bật / Tắt chiến dịch"
                              >
                                <Power size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-action"
                                style={{ color: '#f43f5e' }}
                                onClick={() => handleDeleteCampaign(c.campaign_id)}
                                title="Xóa chiến dịch"
                              >
                                <Trash2 size={14} />
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
        </div>
      )}

      {/* TAB 3: CATALOG CRUD (THÊM MỚI / SỬA GIÁ & ẢNH SẢN PHẨM ĐỘNG) */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PackagePlus size={18} color="#10b981" />
              <span>{editingProduct ? `Cập Nhật: ${editingProduct.product_name}` : 'Thêm Sản Phẩm Mới Vào CSDL'}</span>
            </h3>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mã SKU Sản Phẩm</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: PROD_YEN_DONG_TRUNG"
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn vị tính</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tên thương mại sản phẩm</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Yến Chưng Đông Trùng Hạ Thảo Cao Cấp 70ml"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Giá vốn ước tính (VNĐ)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá bán lẻ niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Quy cách Thùng / Hộp</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prodSpec}
                    onChange={(e) => setProdSpec(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">MOQ Sỉ (Số lượng tối thiểu)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={prodMoq}
                    onChange={(e) => setProdMoq(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Khu vực ưu tiên Đề xuất Top 1</label>
                  <select
                    className="form-select"
                    value={prodRegion}
                    onChange={(e) => setProdRegion(e.target.value)}
                  >
                    <option value="NORTH">❄️ Miền Bắc (Ấm nóng / Bồi bổ)</option>
                    <option value="CENTRAL">🎁 Miền Trung (Quà biếu trang trọng)</option>
                    <option value="SOUTH">☀️ Miền Nam (Thanh mát / Tỉnh táo)</option>
                    <option value="ALL">🌐 Toàn Quốc</option>
                  </select>
                </div>

                {!editingProduct && (
                  <div className="form-group">
                    <label className="form-label">Tồn kho khởi tạo (Đơn vị)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={prodInitialStock}
                      onChange={(e) => setProdInitialStock(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>☁️ Ảnh Sản Phẩm Trên Cloud CDN (URL hoặc Upload)</span>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: '0.75rem',
                      color: '#38bdf8',
                      cursor: uploadingCloudImg ? 'wait' : 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    <Upload size={13} />
                    <span>{uploadingCloudImg ? 'Đang tải lên Cloud...' : 'Tải ảnh từ máy lên Cloud'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCloudFileUpload}
                      disabled={uploadingCloudImg}
                      style={{ display: 'none' }}
                    />
                  </label>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="https://images.unsplash.com/...?auto=format&fit=crop&w=800&q=80"
                />

                {/* Kho Ảnh Cloud CDN Mẫu Ngành Yến Sào */}
                {cloudGallery.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 6 }}>
                      Chọn nhanh từ Kho Ảnh Cloud CDN Ngành Yến Sào ({cloudGallery.length} ảnh):
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {cloudGallery.slice(0, 6).map((asset) => (
                        <button
                          key={asset.asset_id || asset.asset_code}
                          type="button"
                          onClick={() => setProdImage(asset.cloud_url)}
                          title={asset.title}
                          style={{
                            border:
                              prodImage === asset.cloud_url
                                ? '2px solid #10b981'
                                : '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8,
                            padding: 2,
                            background: 'rgba(15, 23, 42, 0.8)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={asset.cloud_url}
                            alt={asset.title}
                            style={{ width: 52, height: 42, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Công dụng sức khỏe nổi bật</label>
                <input
                  type="text"
                  className="form-input"
                  value={prodBenefits}
                  onChange={(e) => setProdBenefits(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                {editingProduct && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetProductForm}
                  >
                    Hủy sửa
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <CheckCircle2 size={16} />
                  <span>{editingProduct ? 'Lưu Thay Đổi Vào CSDL' : 'Thêm Sản Phẩm Mới Vào CSDL'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bảng danh mục sản phẩm hiện có */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
              Danh Mục Sản Phẩm Cốt Lõi & Vùng Đề Xuất ({products.length})
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader label="Mã SKU" field="product_code" sortConfig={prodSort} onSort={handleProdSort} />
                    <SortableHeader label="Sản phẩm" field="product_name" sortConfig={prodSort} onSort={handleProdSort} />
                    <SortableHeader label="Giá vốn / Giá bán lẻ" field="selling_price" sortConfig={prodSort} onSort={handleProdSort} />
                    <SortableHeader label="Khu vực Top 1" field="target_region" sortConfig={prodSort} onSort={handleProdSort} />
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {sortArrayByField(products, prodSort).map((p) => {
                    const regBadge = getRegionBadge(p.target_region)
                    return (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.8rem' }}>{p.product_code}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                              src={p.image_url}
                              alt={p.product_name}
                              style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                            />
                            <div>
                              <div style={{ fontWeight: 700 }}>{p.product_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {p.packaging_spec} • ĐVT: {p.unit}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#10b981' }}>
                            {Number(p.selling_price).toLocaleString('vi-VN')} ₫
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Giá vốn: {Number(p.cost_price).toLocaleString('vi-VN')} ₫
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: regBadge.bg, color: regBadge.color }}>
                            {regBadge.label}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-action"
                            onClick={() => startEditProduct(p)}
                          >
                            <Edit3 size={14} />
                            <span>Sửa giá / Ảnh</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

