import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import AICopilotDrawer from './components/AICopilotDrawer'
import Toast from './components/Toast'

import Dashboard from './pages/Dashboard'
import Production from './pages/Production'
import BOM from './pages/BOM'
import Sales from './pages/Sales'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Storefront from './pages/Storefront'
import Campaigns from './pages/Campaigns'
import Login from './pages/Login'
import DevRoleSwitcher from './components/DevRoleSwitcher'

import { api } from './services/api'
import './index.css'

export function getHomeRouteForRole(role) {
  switch (role) {
    case 'PRODUCTION_STAFF':
    case 'QUAN_DOC_SAN_XUAT':
      return '/production'
    case 'WAREHOUSE_MANAGER':
    case 'QUAN_LY_KHO':
    case 'PROCUREMENT':
      return '/inventory'
    case 'QUAN_LY_PHAN_PHOI':
    case 'DAI_LY':
      return '/sales'
    case 'GIAM_DOC':
    case 'ADMIN':
    default:
      return '/'
  }
}

function RoleGuard({ currentUser, allowedRoles, isRoot = false, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const userRole = currentUser.role || 'ADMIN'
  if (userRole === 'ADMIN' || !allowedRoles || allowedRoles.includes(userRole)) {
    return children
  }

  // Nếu đang ở trang gốc "/" mà không phải ADMIN -> tự động chuyển hướng về phân hệ chuyên trách
  if (isRoot) {
    return <Navigate to={getHomeRouteForRole(userRole)} replace />
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center', padding: '36px 28px' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <ShieldAlert size={28} />
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>
        Khu Vực Giới Hạn Quyền Truy Cập (RBAC)
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.5 }}>
        Tài khoản <strong>{currentUser.full_name}</strong> có vai trò <strong>{userRole}</strong> không có quyền truy cập vào phân hệ này.
      </p>
      <Link to={getHomeRouteForRole(userRole)} className="btn btn-primary">
        <span>Về Phân Hệ Làm Việc Của Tôi</span>
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}

function LayoutShell({ children, dbEngine, toasts, onDismissToast, currentUser, onLogout }) {
  const location = useLocation()

  // Màn hình /login hoặc khi chưa đăng nhập (trừ /store công khai) -> hiển thị shell độc lập không lộ Sidebar nội bộ
  const isLoginPage = location.pathname === '/login' || (!currentUser && !location.pathname.startsWith('/store'))
  const isStoreRoute = location.pathname.startsWith('/store')
  const isPublicStoreOnly = isStoreRoute && !currentUser

  if (isLoginPage || isPublicStoreOnly) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
        <main style={isPublicStoreOnly ? { padding: '24px 32px', maxWidth: 1440, margin: '0 auto' } : {}}>
          {children}
        </main>
        <Toast toasts={toasts} onDismiss={onDismissToast} />
      </div>
    )
  }

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/store')) {
      return 'Cổng Bán Hàng Trực Tuyến (Cá Nhân Hóa Khu Vực)'
    }
    switch (pathname) {
      case '/':
        return 'Tổng Quan Doanh Nghiệp, Chỉ Số BI & AI Dự Báo 1 Năm'
      case '/production':
        return 'Quản Lý Sản Xuất & Yêu Cầu Xuất Kho NVL'
      case '/bom':
        return 'Định Mức Sản Xuất Tiêu Chuẩn (BOM)'
      case '/sales':
        return 'Quản Lý Bán Hàng & Xuất Kho Thành Phẩm'
      case '/inventory':
        return 'Quản Lý Kho, Duyệt Xuất NVL 2 Bước & Thu Mua'
      case '/customers':
        return 'Quản Lý Khách Hàng & Hạn Mức Công Nợ'
      case '/campaigns':
        return 'Quản Trị Chiến Dịch Flash Sale, Video & Danh Mục Động (CMS)'
      default:
        return 'Hệ Thống Quản Trị ERP & BI'
    }
  }

  return (
    <div className="app-container">
      <Sidebar currentUser={currentUser} />
      <div className="main-wrapper">
        <Header
          dbEngine={dbEngine}
          title={getPageTitle(location.pathname)}
          currentUser={currentUser}
          onLogout={onLogout}
        />
        <main className="content-body">{children}</main>
      </div>

      {!isStoreRoute && <AICopilotDrawer />}
      <Toast toasts={toasts} onDismiss={onDismissToast} />
    </div>
  )
}

export default function App() {
  const [dbEngine, setDbEngine] = useState('SQLITE')
  const [toasts, setToasts] = useState([])
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    localStorage.removeItem('erp_auth_token')
    localStorage.removeItem('erp_user')
    setCurrentUser(null)
    addToast('Đã đăng xuất khỏi hệ thống Quản trị ERP', 'info')
  }

  useEffect(() => {
    api
      .getDashboardStats()
      .then((data) => {
        if (data.database_engine) {
          setDbEngine(data.database_engine)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <LayoutShell
        dbEngine={dbEngine}
        toasts={toasts}
        onDismissToast={dismissToast}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        <Routes>
          {/* Route Đăng Nhập Quản Trị Nội Bộ */}
          <Route
            path="/login"
            element={<Login onLoginSuccess={handleLoginSuccess} addToast={addToast} />}
          />

          {/* Cổng Bán Hàng Storefront & Trang Chi Tiết Sản Phẩm: Mở tự do (Public Access) cho khách hàng */}
          <Route
            path="/store"
            element={<Storefront addToast={addToast} currentUser={currentUser} />}
          />
          <Route
            path="/store/product/:productId"
            element={<Storefront addToast={addToast} currentUser={currentUser} />}
          />

          {/* Các phân hệ Quản trị ERP & BI nội bộ: Bảo vệ nghiêm ngặt bằng RBAC */}
          <Route
            path="/"
            element={
              <RoleGuard currentUser={currentUser} allowedRoles={['ADMIN', 'GIAM_DOC']} isRoot={true}>
                <Dashboard addToast={addToast} />
              </RoleGuard>
            }
          />
          <Route
            path="/production"
            element={
              <RoleGuard
                currentUser={currentUser}
                allowedRoles={['ADMIN', 'GIAM_DOC', 'PRODUCTION_STAFF', 'QUAN_DOC_SAN_XUAT', 'WAREHOUSE_MANAGER', 'QUAN_LY_KHO']}
              >
                <Production addToast={addToast} currentUser={currentUser} />
              </RoleGuard>
            }
          />
          <Route
            path="/bom"
            element={
              <RoleGuard
                currentUser={currentUser}
                allowedRoles={['ADMIN', 'GIAM_DOC', 'PRODUCTION_STAFF', 'QUAN_DOC_SAN_XUAT', 'PROCUREMENT']}
              >
                <BOM />
              </RoleGuard>
            }
          />
          <Route
            path="/sales"
            element={
              <RoleGuard
                currentUser={currentUser}
                allowedRoles={['ADMIN', 'GIAM_DOC', 'WAREHOUSE_MANAGER', 'QUAN_LY_KHO', 'QUAN_LY_PHAN_PHOI', 'DAI_LY']}
              >
                <Sales addToast={addToast} />
              </RoleGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <RoleGuard
                currentUser={currentUser}
                allowedRoles={['ADMIN', 'GIAM_DOC', 'WAREHOUSE_MANAGER', 'QUAN_LY_KHO', 'PROCUREMENT']}
              >
                <Inventory addToast={addToast} currentUser={currentUser} />
              </RoleGuard>
            }
          />
          <Route
            path="/customers"
            element={
              <RoleGuard currentUser={currentUser} allowedRoles={['ADMIN', 'GIAM_DOC', 'QUAN_LY_PHAN_PHOI']}>
                <Customers addToast={addToast} />
              </RoleGuard>
            }
          />
          <Route
            path="/campaigns"
            element={
              <RoleGuard currentUser={currentUser} allowedRoles={['ADMIN', 'GIAM_DOC']}>
                <Campaigns addToast={addToast} />
              </RoleGuard>
            }
          />
        </Routes>
        {currentUser && (
          <DevRoleSwitcher
            currentUser={currentUser}
            onRoleSwitch={(u) => setCurrentUser(u)}
            addToast={addToast}
          />
        )}
      </LayoutShell>
    </BrowserRouter>
  )
}
