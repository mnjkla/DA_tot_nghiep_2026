import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Factory,
  Layers,
  ShoppingCart,
  Warehouse,
  Users,
  Sparkles,
} from 'lucide-react'

export default function Sidebar() {
  const navItems = [
    { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/production', label: 'Sản xuất', icon: Factory },
    { to: '/bom', label: 'Định mức BOM', icon: Layers },
    { to: '/sales', label: 'Bán hàng', icon: ShoppingCart },
    { to: '/inventory', label: 'Kho hàng', icon: Warehouse },
    { to: '/customers', label: 'Khách hàng', icon: Users },
  ]

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-logo-badge">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="brand-title">Yến & Cà Phê ERP</h1>
          <p className="brand-subtitle">SMB AI Enterprise</p>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={item.to === '/'}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div>Hệ thống Quản trị & AI v1.2.0</div>
        <div style={{ color: '#10b981', marginTop: 4 }}>● Hệ thống sẵn sàng</div>
      </div>
    </aside>
  )
}
