import React, { useEffect, useState } from 'react'
import { DollarSign, Package, Feather, Factory, TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { api } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    monthly_revenue: 485000000,
    finished_goods_count: 1250,
    raw_bird_nest_stock: 4500,
    active_production_orders: 2,
    database_engine: 'SQLITE',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Error fetching dashboard stats:', err))
      .finally(() => setLoading(false))
  }, [])

  const revenueData = [
    { month: 'T5', revenue: 320, cost: 210 },
    { month: 'T6', revenue: 380, cost: 240 },
    { month: 'T7', revenue: 410, cost: 260 },
    { month: 'T8', revenue: 450, cost: 290 },
    { month: 'T9', revenue: 470, cost: 300 },
    { month: 'T10', revenue: (stats.monthly_revenue / 1000000) || 485, cost: 310 },
  ]

  const productShareData = [
    { name: 'Yến lọ 70ml', value: 45, color: '#10b981' },
    { name: 'Yến chai 300ml', value: 20, color: '#38bdf8' },
    { name: 'Yến lon 190ml', value: 15, color: '#f59e0b' },
    { name: 'Cháo yến', value: 12, color: '#a855f7' },
    { name: 'Cà phê phin giấy', value: 8, color: '#ec4899' },
  ]

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon-wrapper">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-label">Doanh thu tháng (VND)</div>
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

      {/* BI Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Biểu đồ Doanh thu & Chi phí */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Biến động Doanh thu & Chi phí (Triệu VNĐ)</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Dữ liệu tài chính 6 tháng gần nhất</p>
            </div>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8, color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="cost" name="Chi phí" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Tỷ trọng Doanh số 5 Dòng Sản Phẩm */}
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Tỷ trọng Doanh số 5 Nhóm Sản Phẩm</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Phân bổ theo doanh số bán hàng</p>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
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
                  formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
