import React from 'react'
import { AlertTriangle, RefreshCw, LogIn, Store, Trash2 } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('erp_user')
      localStorage.removeItem('erp_auth_token')
      sessionStorage.clear()
    } catch {}
    window.location.href = '/'
  }

  handleGoLogin = () => {
    try {
      localStorage.removeItem('erp_user')
      localStorage.removeItem('erp_auth_token')
    } catch {}
    window.location.href = '/login'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #090e1a 0%, #0f172a 100%)',
            color: '#f8fafc',
            padding: 24,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 620,
              width: '100%',
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 20,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15)',
              padding: 36,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 10, color: '#f8fafc' }}>
              Đã Xảy Ra Sự Cố Giao Diện (Runtime Recovery)
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
              Hệ thống đã tự động kích hoạt bộ cách ly lỗi để bảo vệ phiên làm việc của bạn. Thông tin lỗi kỹ thuật được ghi nhận bên dưới:
            </p>

            <div
              style={{
                background: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '12px 16px',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: '#f87171',
                maxHeight: 180,
                overflowY: 'auto',
                marginBottom: 24,
              }}
            >
              {this.state.error?.toString() || 'Unknown runtime error'}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} />
                <span>Xóa Cache & Làm Mới</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoLogin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <LogIn size={16} />
                <span>Về Trang Đăng Nhập</span>
              </button>

              <a
                href="/store"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <Store size={16} />
                <span>Cổng Bán Hàng</span>
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
