import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Store,
  Building2,
  Package,
  Factory,
  ShoppingBag,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { api } from '../services/api'

export default function Login({ onLoginSuccess, addToast }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const getDefaultRouteByRole = (role) => {
    switch (role) {
      case 'PRODUCTION_STAFF':
        return '/production'
      case 'WAREHOUSE_MANAGER':
      case 'PROCUREMENT':
        return '/inventory'
      case 'ADMIN':
      default:
        return '/'
    }
  }

  const handleLogin = async (e) => {
    e && e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.login(username.trim(), password.trim())
      localStorage.setItem('erp_auth_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      onLoginSuccess && onLoginSuccess(res.user, res.token)
      addToast && addToast(res.message, 'success')
      navigate(getDefaultRouteByRole(res.user.role))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Tài khoản hoặc mật khẩu không chính xác')
    } finally {
      setLoading(false)
    }
  }

  // Đăng nhập nhanh tài khoản mẫu
  const handleQuickLogin = (u, p) => {
    setUsername(u)
    setPassword(p)
    setError('')
    // Tự động submit
    setLoading(true)
    api.login(u, p)
      .then((res) => {
        localStorage.setItem('erp_auth_token', res.token)
        localStorage.setItem('erp_user', JSON.stringify(res.user))
        onLoginSuccess && onLoginSuccess(res.user, res.token)
        addToast && addToast(res.message, 'success')
        navigate(getDefaultRouteByRole(res.user.role))
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.06) 0%, transparent 40%), #0b1120',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-lg)',
          backdropFilter: 'blur(16px)',
          padding: '36px 32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
              marginBottom: 14,
            }}
          >
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Hệ Thống Quản Trị ERP & BI
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
            Doanh nghiệp Yến Sào & Cà Phê SMB • Đăng nhập để truy cập phân hệ nội bộ
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.82rem',
              color: '#f87171',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
              Tên đăng nhập
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="form-input input-control"
                placeholder="admin, kho, sanxuat, thumua..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: 40, height: 44 }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input input-control"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 40, paddingRight: 42, height: 44 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            {loading ? 'Đang xác thực thông tin...' : 'Đăng Nhập Quản Trị'} <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
            TÀI KHOẢN MẪU THEO VAI TRÒ (CHỌN 1-CHẠM):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="btn btn-outline"
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                justifyContent: 'flex-start',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              }}
            >
              <ShieldCheck size={16} color="#10b981" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>Giám Đốc (Admin)</div>
                <div style={{ color: '#64748b', fontSize: '0.68rem' }}>admin / admin123</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('kho', 'kho123')}
              className="btn btn-outline"
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                justifyContent: 'flex-start',
                borderColor: 'rgba(56, 189, 248, 0.3)',
              }}
            >
              <Package size={16} color="#38bdf8" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>Trưởng Kho</div>
                <div style={{ color: '#64748b', fontSize: '0.68rem' }}>kho / kho123</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('sanxuat', 'sanxuat123')}
              className="btn btn-outline"
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                justifyContent: 'flex-start',
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <Factory size={16} color="#f59e0b" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>Quản Đốc SX</div>
                <div style={{ color: '#64748b', fontSize: '0.68rem' }}>sanxuat / sanxuat123</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('thumua', 'thumua123')}
              className="btn btn-outline"
              style={{
                padding: '8px 10px',
                fontSize: '0.75rem',
                justifyContent: 'flex-start',
                borderColor: 'rgba(168, 85, 247, 0.3)',
              }}
            >
              <ShoppingBag size={16} color="#c084fc" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>Thu Mua NVL</div>
                <div style={{ color: '#64748b', fontSize: '0.68rem' }}>thumua / thumua123</div>
              </div>
            </button>
          </div>
        </div>

        {/* Link back to Public Storefront */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link
            to="/store"
            style={{
              color: '#38bdf8',
              fontSize: '0.82rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
            }}
          >
            <Store size={15} />
            <span>← Quay lại Cổng Bán Hàng Trực Tuyến (Dành cho khách hàng)</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
