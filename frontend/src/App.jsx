import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
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

import { api } from './services/api'
import './index.css'

function LayoutShell({ children, dbEngine, toasts, onDismissToast }) {
  const location = useLocation()

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'Tổng Quan Doanh Nghiệp & Chỉ Số BI'
      case '/production':
        return 'Quản Lý Sản Xuất & Lệnh PO'
      case '/bom':
        return 'Định Mức Sản Xuất Tiêu Chuẩn (BOM)'
      case '/sales':
        return 'Quản Lý Bán Hàng & Xuất Kho'
      case '/inventory':
        return 'Quản Lý Kho Nguyên Liệu & Thành Phẩm'
      case '/customers':
        return 'Quản Lý Khách Hàng & Công Nợ'
      default:
        return 'Hệ Thống Quản Trị ERP'
    }
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header dbEngine={dbEngine} title={getPageTitle(location.pathname)} />
        <main className="content-body">
          {children}
        </main>
      </div>

      <AICopilotDrawer />
      <Toast toasts={toasts} onDismiss={onDismissToast} />
    </div>
  )
}

export default function App() {
  const [dbEngine, setDbEngine] = useState('SQLITE')
  const [toasts, setToasts] = useState([])

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

  useEffect(() => {
    api.getDashboardStats()
      .then((data) => {
        if (data.database_engine) {
          setDbEngine(data.database_engine)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <LayoutShell dbEngine={dbEngine} toasts={toasts} onDismissToast={dismissToast}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/production" element={<Production addToast={addToast} />} />
          <Route path="/bom" element={<BOM />} />
          <Route path="/sales" element={<Sales addToast={addToast} />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
        </Routes>
      </LayoutShell>
    </BrowserRouter>
  )
}
