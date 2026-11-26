import React, { useState } from 'react'
import {
  Shield,
  Briefcase,
  Warehouse,
  Factory,
  Truck,
  Store,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { getHomeRouteForRole } from '../App'

const ROLES = [
  {
    role: 'ADMIN',
    label: 'Admin (Dev Mode)',
    short: 'Admin',
    icon: Shield,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    desc: 'Toàn quyền kiểm thử hệ thống & AI',
  },
  {
    role: 'GIAM_DOC',
    label: 'Giám Đốc Doanh Nghiệp',
    short: 'Giám Đốc',
    icon: Briefcase,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)',
    desc: 'Xem báo cáo BI, lợi nhuận & phê duyệt',
  },
  {
    role: 'QUAN_LY_KHO',
    label: 'Quản Lý Kho Vận',
    short: 'Trưởng Kho',
    icon: Warehouse,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.4)',
    desc: 'Duyệt xuất NVL 2 bước & Báo cáo kho',
  },
  {
    role: 'QUAN_DOC_SAN_XUAT',
    label: 'Quản Đốc Sản Xuất',
    short: 'Quản Đốc SX',
    icon: Factory,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    desc: 'Xưởng, công nhân, ca làm & bù hao hụt',
  },
  {
    role: 'QUAN_LY_PHAN_PHOI',
    label: 'QL Phân Phối & Đại Lý',
    short: 'QL Phân Phối',
    icon: Truck,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.4)',
    desc: 'Duyệt đơn đại lý, xuất hàng & đổi trả',
  },
  {
    role: 'DAI_LY',
    label: 'Đại Lý Yến Cà Phê',
    short: 'Đại Lý',
    icon: Store,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    desc: 'Gửi yêu cầu nhập hàng & tạo đổi trả lỗi',
  },
]

export default function DevRoleSwitcher({ currentUser, onRoleSwitch, addToast }) {
  const [collapsed, setCollapsed] = useState(false)
  const [switching, setSwitching] = useState(false)
  const navigate = useNavigate()

  const handleSwitch = async (targetRole) => {
    if (switching) return
    setSwitching(true)
    try {
      const res = await api.devSwitchRole(targetRole)
      localStorage.setItem('erp_auth_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      if (onRoleSwitch) {
        onRoleSwitch(res.user)
      }
      if (addToast) {
        addToast(res.message || `Đã chuyển sang vai trò: ${targetRole}`, 'success')
      }
      const homeRoute = getHomeRouteForRole(res.user.role)
      navigate(homeRoute)
    } catch (err) {
      if (addToast) {
        addToast(err.message || 'Lỗi khi chuyển đổi vai trò', 'error')
      }
    } finally {
      setSwitching(false)
    }
  }

  const currentRole = currentUser?.role || 'ADMIN'

  return (
    <aside
      aria-label="Thanh công cụ chuyển vai trò kiểm thử"
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.94)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.65), 0 0 25px rgba(56, 189, 248, 0.15)',
        borderRadius: 16,
        backdropFilter: 'blur(16px)',
        padding: collapsed ? '8px 16px' : '10px 18px',
        transition: 'all 0.25s ease',
        maxWidth: '95vw',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={14} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap' }}>
            ⚡ 1-Click Role Switcher <span style={{ color: '#38bdf8', fontWeight: 500 }}>(Hội Đồng / Giảng Viên)</span>
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              fontWeight: 700,
              fontFamily: 'monospace',
            }}
          >
            {currentUser?.full_name ? `${currentUser.full_name} (${currentRole})` : currentRole}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title={collapsed ? 'Mở rộng bộ chuyển vai trò' : 'Thu gọn'}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          {ROLES.map((r) => {
            const Icon = r.icon
            const isActive = currentRole === r.role
            return (
              <button
                key={r.role}
                type="button"
                disabled={switching}
                onClick={() => handleSwitch(r.role)}
                title={`${r.label}: ${r.desc}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 600,
                  cursor: switching ? 'not-allowed' : 'pointer',
                  background: isActive ? r.bg : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? r.color : '#cbd5e1',
                  border: isActive ? `1.5px solid ${r.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isActive ? `0 0 12px ${r.border}` : 'none',
                  transition: 'all 0.18s ease',
                  opacity: switching ? 0.7 : 1,
                }}
              >
                <Icon size={14} color={isActive ? r.color : '#94a3b8'} />
                <span>{r.short}</span>
                {isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: r.color,
                      display: 'inline-block',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}
