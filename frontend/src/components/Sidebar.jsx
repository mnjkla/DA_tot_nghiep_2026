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
  Store,
  Megaphone,
} from 'lucide-react'

export default function Sidebar({ currentUser }) {
  const isWarehouseRole = currentUser?.role === 'QUAN_LY_KHO' || currentUser?.role === 'WAREHOUSE_MANAGER'

  const allNavItems = [
    { to: '/', label: 'Tổng quan BI', icon: LayoutDashboard, roles: ['ADMIN', 'GIAM_DOC'] },
    { to: '/production', label: 'Sản xuất & Xưởng', icon: Factory, roles: ['ADMIN', 'GIAM_DOC', 'PRODUCTION_STAFF', 'QUAN_DOC_SAN_XUAT', 'WAREHOUSE_MANAGER', 'QUAN_LY_KHO'] },
    { to: '/bom', label: 'Định mức BOM', icon: Layers, roles: ['ADMIN', 'GIAM_DOC', 'PRODUCTION_STAFF', 'QUAN_DOC_SAN_XUAT', 'PROCUREMENT'] },
    {
      to: '/sales',
      label: isWarehouseRole ? 'Xuất Kho & Đổi Trả' : 'Bán hàng & Đơn',
      icon: ShoppingCart,
      roles: ['ADMIN', 'GIAM_DOC', 'WAREHOUSE_MANAGER', 'QUAN_LY_KHO', 'QUAN_LY_PHAN_PHOI', 'DAI_LY'],
    },
    { to: '/inventory', label: 'Kho hàng & Thu mua', icon: Warehouse, roles: ['ADMIN', 'GIAM_DOC', 'WAREHOUSE_MANAGER', 'QUAN_LY_KHO', 'PROCUREMENT'] },
    { to: '/customers', label: 'Khách hàng', icon: Users, roles: ['ADMIN', 'GIAM_DOC', 'QUAN_LY_PHAN_PHOI'] },
    { to: '/campaigns', label: 'Chiến Dịch & CMS', icon: Megaphone, roles: ['ADMIN', 'GIAM_DOC'], badge: 'CMS' },
    { to: '/store', label: 'Cổng Bán Hàng', icon: Store, badge: 'Sỉ & Lẻ' },
  ]

  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true // ai cũng xem được (như Cổng Bán Hàng)
    if (!currentUser) return false
    return item.roles.includes(currentUser.role) || currentUser.role === 'ADMIN'
  })

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
              {item.badge && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    padding: '2px 6px',
                    borderRadius: 10,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div>Hệ thống Quản trị & AI v1.4.0</div>
        <div style={{ color: '#10b981', marginTop: 4 }}>● Bảo mật RBAC Đa Cấp</div>
      </div>
    </aside>
  )
}
