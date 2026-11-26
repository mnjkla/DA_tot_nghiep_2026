import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Store,
  Package,
  Factory,
  ShoppingBag,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Award,
  Cpu,
  BarChart3,
  Database,
  Building,
} from 'lucide-react'
import { api } from '../services/api'

export default function Login({ onLoginSuccess, addToast }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
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

  // Đăng nhập nhanh 1-chạm theo vai trò dành cho demo / kiểm thử
  const handleQuickLogin = (u, p) => {
    setUsername(u)
    setPassword(p)
    setError('')
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
        width: '100%',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #06101e 0%, #0b1728 50%, #061a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        color: '#f8fafc',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {/* Background Decorative Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container - Modern Enterprise Split Layout */}
      <div
        style={{
          width: '100%',
          maxWidth: 1080,
          margin: 'auto',
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          backdropFilter: 'blur(24px)',
          boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ==================== CỘT TRÁI: SHOWCASE DOANH NGHIỆP ==================== */}
        <div
          style={{
            padding: '48px 40px',
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header & Logo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#34d399', textTransform: 'uppercase' }}>
                  Hệ Thống Quản Trị Doanh Nghiệp SMB
                </div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
                  Yến Khánh Hòa & Cà Phê Cầu Đất
                </h1>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 28 }}>
              Giải pháp số hóa toàn diện quy trình sản xuất khép kín, tối ưu định mức nguyên vật liệu BOM, kiểm soát kho vận 2 bước và tích hợp Trợ lý Trí Tuệ Nhân Tạo Hybrid RAG.
            </p>

            {/* Feature Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Factory size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Hoạch Định Sản Xuất & Định Mức BOM</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>Tính toán hao hụt nguyên liệu chuẩn xác, phê duyệt xuất xưởng 2 bước chống thất thoát.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Cpu size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Trợ Lý AI Hybrid RAG & Live Grounding</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>Trích xuất CSDL thực tế thời gian thực kết hợp Gemini 1.5 Flash và bộ giải mã ngữ nghĩa tiếng Việt.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Database size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Cơ Sở Dữ Liệu Kép & Tự Động Hóa n8n</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>Hỗ trợ song song PostgreSQL Docker và SQLite WAL, đồng bộ Star Schema Data Warehouse.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Standards & Certifications Badges */}
          <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 600 }}>
                <CheckCircle2 size={12} /> ISO 22000:2018
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.7rem', color: '#7dd3fc', fontWeight: 600 }}>
                <Award size={12} /> HACCP Certified
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.7rem', color: '#fcd34d', fontWeight: 600 }}>
                <BarChart3 size={12} /> 624.7 RPS Tested
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 12 }}>
              Đồ Án Tốt Nghiệp 2026 • Sinh viên: <strong>Trần Quốc Bảo</strong> & <strong>Nguyễn Hồ Quang Minh</strong>
            </div>
          </div>
        </div>

        {/* ==================== CỘT PHẢI: FORM ĐĂNG NHẬP & QUICK SWITCHER ==================== */}
        <div style={{ padding: '44px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>
              <ShieldCheck size={14} /> CỔNG XÁC THỰC NỘI BỘ (RBAC)
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0', letterSpacing: '-0.02em' }}>
              Đăng Nhập Quản Trị
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Vui lòng nhập thông tin xác thực để truy cập hệ thống điều hành
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#fca5a5',
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Controls */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                Tài khoản người dùng
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="admin, kho, sanxuat, thumua..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 42,
                    paddingRight: 14,
                    background: 'rgba(30, 41, 59, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                Mật khẩu bảo mật
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Nhập mật khẩu của bạn..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 42,
                    paddingRight: 42,
                    background: 'rgba(30, 41, 59, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#94a3b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#10b981', cursor: 'pointer' }}
                />
                Ghi nhớ phiên làm việc
              </label>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Bảo mật SSL 256-bit</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 46,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              {loading ? 'Đang xác thực thông tin...' : 'Vào Hệ Thống ERP'} <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Credentials Panel for Lecturer Review */}
          <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                ⚡ Chọn Nhanh Vai Trò (Dành cho Giảng Viên / Hội Đồng):
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Click 1-chạm</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)'
                  e.currentTarget.style.borderColor = '#10b981'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.28)'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Admin (Dev Mode)</div>
                  <div style={{ fontSize: '0.68rem', color: '#6ee7b7', fontFamily: 'monospace' }}>admin / admin123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('giamdoc', 'giamdoc123')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.18)'
                  e.currentTarget.style.borderColor = '#38bdf8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.28)'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Award size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Giám Đốc</div>
                  <div style={{ fontSize: '0.68rem', color: '#7dd3fc', fontFamily: 'monospace' }}>giamdoc / giamdoc123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('kho', 'kho123')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.28)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.18)'
                  e.currentTarget.style.borderColor = '#06b6d4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.28)'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0891b2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Quản Lý Kho</div>
                  <div style={{ fontSize: '0.68rem', color: '#67e8f9', fontFamily: 'monospace' }}>kho / kho123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sanxuat', 'sanxuat123')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.18)'
                  e.currentTarget.style.borderColor = '#f59e0b'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.28)'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#d97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Factory size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Quản Đốc SX</div>
                  <div style={{ fontSize: '0.68rem', color: '#fcd34d', fontFamily: 'monospace' }}>sanxuat / sanxuat123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('phanphoi', 'phanphoi123')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.28)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(236, 72, 153, 0.18)'
                  e.currentTarget.style.borderColor = '#ec4899'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(236, 72, 153, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.28)'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#db2777', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingBag size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>QL Phân Phối</div>
                  <div style={{ fontSize: '0.68rem', color: '#f472b6', fontFamily: 'monospace' }}>phanphoi / phanphoi123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('daily1', 'daily123')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.28)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)'
                  e.currentTarget.style.borderColor = '#a855f7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.28)'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#7e22ce', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Store size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Đại Lý Tâm An</div>
                  <div style={{ fontSize: '0.68rem', color: '#d8b4fe', fontFamily: 'monospace' }}>daily1 / daily123</div>
                </div>
              </button>
            </div>
          </div>

          {/* Link Quay Lại Cửa Hàng Trực Tuyến */}
          <div style={{ marginTop: 22, textAlign: 'center' }}>
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
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#7dd3fc')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#38bdf8')}
            >
              <Store size={15} />
              <span>← Ghé thăm Cổng Bán Hàng Trực Tuyến (Dành cho khách hàng)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
