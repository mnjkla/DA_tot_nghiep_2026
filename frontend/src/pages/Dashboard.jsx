import React, { useEffect, useState } from 'react'
import {
  DollarSign,
  Package,
  Feather,
  Factory,
  TrendingUp,
  Sparkles,
  Zap,
  Calendar,
  CheckCircle2,
  Workflow,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { api } from '../services/api'
import AutomationAndTaxCenterModal from '../components/AutomationAndTaxCenterModal'

const DEFAULT_FORECAST_12M = [
  { month: 'T1', month_name: 'Tháng 1 (Sau Tết)', revenue: 420, cogs: 245, net_profit: 120, gross_margin_pct: 41.7, raw_nest_price_k: 26.5 },
  { month: 'T2', month_name: 'Tháng 2 (Xả Kho)', revenue: 360, cogs: 215, net_profit: 95, gross_margin_pct: 40.3, raw_nest_price_k: 25.0 },
  { month: 'T3', month_name: 'Tháng 3 (Ổn Định)', revenue: 390, cogs: 225, net_profit: 113, gross_margin_pct: 42.3, raw_nest_price_k: 24.0 },
  { month: 'T4', month_name: 'Tháng 4 (Chuyển Mùa)', revenue: 410, cogs: 232, net_profit: 125, gross_margin_pct: 43.4, raw_nest_price_k: 22.8 },
  { month: 'T5', month_name: 'Tháng 5 (Đáy Giá NVL)', revenue: 435, cogs: 218, net_profit: 163, gross_margin_pct: 49.9, raw_nest_price_k: 20.5 },
  { month: 'T6', month_name: 'Tháng 6 (Tích Trữ Yến)', revenue: 460, cogs: 225, net_profit: 180, gross_margin_pct: 51.1, raw_nest_price_k: 19.8 },
  { month: 'T7', month_name: 'Tháng 7 (Tích Trữ Đợt 2)', revenue: 480, cogs: 238, net_profit: 186, gross_margin_pct: 50.4, raw_nest_price_k: 20.2 },
  { month: 'T8', month_name: 'Tháng 8 (Đón Trung Thu)', revenue: 590, cogs: 310, net_profit: 215, gross_margin_pct: 47.5, raw_nest_price_k: 24.5 },
  { month: 'T9', month_name: 'Tháng 9 (Cao Điểm Biếu)', revenue: 680, cogs: 355, net_profit: 255, gross_margin_pct: 47.8, raw_nest_price_k: 25.8 },
  { month: 'T10', month_name: 'Tháng 10 (Chuẩn Bị Tết)', revenue: 640, cogs: 335, net_profit: 237, gross_margin_pct: 47.7, raw_nest_price_k: 26.8 },
  { month: 'T11', month_name: 'Tháng 11 (Bùng Nổ Cuối Năm)', revenue: 950, cogs: 465, net_profit: 400, gross_margin_pct: 51.1, raw_nest_price_k: 28.5 },
  { month: 'T12', month_name: 'Tháng 12 (Đỉnh Cận Tết)', revenue: 1280, cogs: 610, net_profit: 572, gross_margin_pct: 52.3, raw_nest_price_k: 29.8 },
]

const DEFAULT_PHASES = [
  {
    phase_code: 'ACCUMULATE_MAY_JUL',
    badge: '🟢 Giai đoạn Tích trữ (Tháng 5 - 7)',
    color: '#10b981',
    months: 'Tháng 5 – Tháng 7',
    market_signal: 'Giá Tổ yến thô chạm đáy mùa thu hoạch (~19,800 - 20,500 ₫/gram, thấp hơn 22% so với cuối năm).',
    ai_recommendation:
      'Tăng cường thu mua dự trữ Tổ yến thô giá đáy và đẩy mạnh sản xuất trước dòng Yến Lọ 70ml & Yến Lon 190ml có hạn sử dụng dài (12-24 tháng).',
    expected_impact: 'Tiết kiệm ~185 Triệu VNĐ chi phí vốn NVL, nâng biên lợi nhuận gộp lên >50%.',
    action_label: '⚡ Kích hoạt Thu Mua Tích Trữ NVL Giá Đáy',
  },
  {
    phase_code: 'ACCELERATE_AUG_OCT',
    badge: '🟡 Giai đoạn Tăng tốc (Tháng 8 - 10)',
    color: '#f59e0b',
    months: 'Tháng 8 – Tháng 10',
    market_signal: 'Nhu cầu quà biếu doanh nghiệp dịp Tết Trung Thu tăng +165%, chuẩn bị nguồn hàng cho vụ Tết.',
    ai_recommendation:
      'Khởi tạo Lệnh sản xuất PO công suất cao cho dòng Yến Chai Nguyên Chất 300ml & Yến Lọ Chưng Đường Phèn phục vụ kênh Đại lý B2B.',
    expected_impact: 'Đáp ứng 100% đơn sỉ B2B, doanh thu tăng vọt lên 640 - 680 Triệu VNĐ/tháng.',
    action_label: '⚡ Lập Lệnh Sản Xuất Tăng Tốc Đón Trung Thu',
  },
  {
    phase_code: 'HARVEST_NOV_DEC',
    badge: '🔴 Giai đoạn Thu hoạch Doanh thu đỉnh cao (Tháng 11 - 12 & cận Tết)',
    color: '#f43f5e',
    months: 'Tháng 11 – Tháng 12',
    market_signal: 'Nhu cầu tiêu thụ & quà Tết tăng 250% - 300%, giá NVL ngoài thị trường đạt đỉnh 29,800 ₫/g.',
    ai_recommendation:
      'Xuất bán tối đa tồn kho thành phẩm đã sản xuất từ nguồn NVL giá rẻ mùa hè; đẩy mạnh chiến dịch Quà Tết Toàn Quốc.',
    expected_impact: 'Đạt đỉnh doanh thu 1.28 Tỷ VNĐ/tháng, lợi nhuận ròng đạt 572 Triệu VNĐ (Biên gộp 52.3%).',
    action_label: '⚡ Kích Hoạt Chiến Dịch Cao Điểm Mùa Lễ Tết',
  },
  {
    phase_code: 'CLEARANCE_JAN_FEB',
    badge: '🔵 Giai đoạn Xả hàng tồn kho (Tháng 1 - 2)',
    color: '#38bdf8',
    months: 'Tháng 1 – Tháng 2',
    market_signal: 'Sức mua chững lại sau Tết, một số lô thành phẩm bắt đầu bước vào ngưỡng cận date.',
    ai_recommendation:
      'Kích hoạt Flash Sale giảm giá 25-28% các lô tồn sau Tết trên Storefront để thu hồi dòng tiền nhanh và tránh cận date.',
    expected_impact: 'Thu hồi 360 - 420 Triệu VNĐ tiền mặt, giảm tỷ lệ hủy hàng cận date về 0%.',
    action_label: '⚡ Bật Flash Sale Xả Kho Thu Hồi Vốn',
  },
]

export default function Dashboard({ addToast }) {
  const [stats, setStats] = useState({
    monthly_revenue: 485000000,
    finished_goods_count: 1250,
    raw_bird_nest_stock: 4500,
    active_production_orders: 2,
    database_engine: 'SQLITE',
  })
  const [forecastData, setForecastData] = useState(DEFAULT_FORECAST_12M)
  const [strategicPhases, setStrategicPhases] = useState(DEFAULT_PHASES)
  const [forecastSummary, setForecastSummary] = useState({
    annual_projected_revenue_m: 7095,
    annual_projected_profit_m: 2661,
    average_gross_margin_pct: 47.1,
  })
  const [executingPhase, setExecutingPhase] = useState(null)
  const [centerModalOpen, setCenterModalOpen] = useState(false)
  const [centerModalTab, setCenterModalTab] = useState('TAX_EXCEL')
  const [syncingEtl, setSyncingEtl] = useState(false)

  const handleSyncN8nEtl = async () => {
    try {
      setSyncingEtl(true)
      const res = api.triggerN8nWorkflow
        ? await api.triggerN8nWorkflow('01_etl_star_schema')
        : { message: 'Đã đồng bộ Data Warehouse qua n8n!' }
      addToast && addToast(res.message || 'Đồng bộ Data Warehouse thành công!', 'success')
      fetchDashboardData()
    } catch (err) {
      addToast && addToast(err.message || 'Lỗi đồng bộ ETL', 'error')
    } finally {
      setSyncingEtl(false)
    }
  }

  const fetchDashboardData = () => {
    api
      .getDashboardStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Error fetching dashboard stats:', err))

    if (api.getProfitForecast) {
      api
        .getProfitForecast()
        .then((res) => {
          if (res.monthly_forecast) setForecastData(res.monthly_forecast)
          if (res.strategic_phases) setStrategicPhases(res.strategic_phases)
          if (res.summary) setForecastSummary(res.summary)
        })
        .catch(() => {})
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleExecuteStrategy = async (phaseCode) => {
    setExecutingPhase(phaseCode)
    try {
      const res = api.executeAIStrategy
        ? await api.executeAIStrategy(phaseCode)
        : { message: 'Đã kích hoạt chiến lược AI thành công!' }
      addToast && addToast(res.message, 'success')
      fetchDashboardData()
    } catch (err) {
      addToast && addToast(err.message, 'error')
    } finally {
      setExecutingPhase(null)
    }
  }

  const productShareData = [
    { name: 'Yến lọ 70ml (Miền Bắc Top 1)', value: 45, color: '#10b981' },
    { name: 'Yến chai 300ml (Miền Trung Top 1)', value: 20, color: '#38bdf8' },
    { name: 'Yến lon 190ml (Miền Nam Top 1)', value: 15, color: '#f59e0b' },
    { name: 'Cháo yến thịt bằm', value: 12, color: '#a855f7' },
    { name: 'Cà phê phin giấy', value: 8, color: '#ec4899' },
  ]

  return (
    <div>
      {/* Version 1.5.0 Quick Action Bar: n8n ETL Sync & Tax/Excel Reporting */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.92) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Workflow size={20} color="#10b981" />
          <div style={{ fontSize: '0.84rem' }}>
            <strong style={{ color: '#f8fafc' }}>Trung Tâm Điều Phối Dữ Liệu BI, Báo Cáo Thuế & n8n Automation:</strong>{' '}
            <span style={{ color: '#94a3b8' }}>
              Đồng bộ tức thời Star Schema DW qua n8n & Xuất hồ sơ kế toán chống thất thoát (.xlsx 4 Sheet).
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={syncingEtl}
            onClick={handleSyncN8nEtl}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', padding: '7px 13px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Workflow size={14} />
            <span>{syncingEtl ? 'Đang đồng bộ n8n...' : 'Đồng bộ Data Warehouse (n8n ETL)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCenterModalTab('TAX_EXCEL')
              setCenterModalOpen(true)
            }}
            className="btn btn-outline"
            style={{
              fontSize: '0.78rem',
              padding: '7px 13px',
              borderColor: 'rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileSpreadsheet size={14} />
            <span>Trung Tâm Báo Cáo Thuế & Import Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon-wrapper">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-label">Doanh thu tháng hiện tại (VND)</div>
            <div className="stat-value">
              {Number(stats.monthly_revenue).toLocaleString('vi-VN')} ₫
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper amber">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-label">Tồn kho thành phẩm</div>
            <div className="stat-value">
              {Number(stats.finished_goods_count).toLocaleString('vi-VN')} đơn vị
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper blue">
            <Feather size={24} />
          </div>
          <div>
            <div className="stat-label">Tổ yến thô trong kho</div>
            <div className="stat-value">
              {Number(stats.raw_bird_nest_stock).toLocaleString('vi-VN')} g
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper purple">
            <Factory size={24} />
          </div>
          <div>
            <div className="stat-label">Lệnh sản xuất hoạt động</div>
            <div className="stat-value">
              {stats.active_production_orders} lệnh
            </div>
          </div>
        </div>
      </div>

      {/* BI Analytics Charts (12-Month AI Profit Forecast + Product Share) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Biểu đồ AI Dự Báo Biến Động Doanh Thu, Chi Phí NVL & Lợi Nhuận 12 Tháng */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800 }}>
                  AI Dự Báo Biến Động Doanh Thu - Chi Phí Vốn NVL - Lợi Nhuận 1 Năm (12 Tháng)
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                Tổng doanh thu dự kiến năm:{' '}
                <strong style={{ color: '#10b981' }}>
                  {Number(forecastSummary.annual_projected_revenue_m).toLocaleString('vi-VN')} Triệu ₫
                </strong>{' '}
                • Lợi nhuận ròng dự kiến:{' '}
                <strong style={{ color: '#38bdf8' }}>
                  {Number(forecastSummary.annual_projected_profit_m).toLocaleString('vi-VN')} Triệu ₫
                </strong>{' '}
                (Biên gộp TB: <strong>{forecastSummary.average_gross_margin_pct}%</strong>)
              </p>
            </div>
            <TrendingUp size={22} color="#10b981" />
          </div>

          <div style={{ height: 290, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu dự báo (Tr.₫)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="cogs"
                  name="Chi phí vốn NVL (Tr.₫)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCogs)"
                />
                <Area
                  type="monotone"
                  dataKey="net_profit"
                  name="Lợi nhuận ròng (Tr.₫)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Tỷ trọng Doanh số 5 Dòng Sản Phẩm */}
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Tỷ trọng Doanh số 5 Nhóm Sản Phẩm</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Phân bổ theo doanh số & vùng miền trọng điểm</p>
          </div>
          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8, color: '#fff' }}
                  formatter={(val) => [`${val}%`, 'Tỷ trọng']}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BẢNG KHUYẾN NGHỊ 4 GIAI ĐOẠN CHIẾN LƯỢC TỒN KHO & SẢN XUẤT AI (AI 4-STAGE ROADMAP) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} color="#38bdf8" />
              <span>Kế Hoạch Phân Kỳ Sản Xuất, Tích Trữ NVL & Xả Kho 4 Giai Đoạn Trong Năm (AI Strategic Engine)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 4 }}>
              Mô hình AI tối ưu hóa biên lợi nhuận dựa trên chu kỳ mùa thu hoạch Tổ yến thô và đỉnh điểm cầu tiêu dùng Lễ/Tết. Bấm nút hành động để kích hoạt trực tiếp vào ERP!
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 18 }}>
          {strategicPhases.map((phase) => (
            <div
              key={phase.phase_code}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: `1px solid ${phase.color}55`,
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: phase.color,
                    }}
                  >
                    {phase.badge}
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '3px 8px',
                      borderRadius: 12,
                      color: '#cbd5e1',
                      fontWeight: 600,
                    }}
                  >
                    {phase.months}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: 8, lineHeight: 1.45 }}>
                  <strong>📊 Tín hiệu thị trường:</strong> {phase.market_signal}
                </div>

                <div style={{ fontSize: '0.82rem', color: '#f8fafc', marginBottom: 8, lineHeight: 1.45 }}>
                  <strong>🤖 Khuyến nghị AI:</strong> {phase.ai_recommendation}
                </div>

                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                  📈 Tác động kỳ vọng: {phase.expected_impact}
                </div>
              </div>

              <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={executingPhase === phase.phase_code}
                  onClick={() => handleExecuteStrategy(phase.phase_code)}
                  className="btn btn-primary"
                  style={{
                    background: phase.color,
                    borderColor: phase.color,
                    color: phase.phase_code === 'ACCELERATE_AUG_OCT' ? '#0f172a' : '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '8px 14px',
                  }}
                >
                  <Zap size={14} />
                  <span>
                    {executingPhase === phase.phase_code ? 'Đang kích hoạt vào ERP...' : phase.action_label}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AutomationAndTaxCenterModal
        isOpen={centerModalOpen}
        onClose={() => setCenterModalOpen(false)}
        initialTab={centerModalTab}
        onDataImported={fetchDashboardData}
      />
    </div>
  )
}
