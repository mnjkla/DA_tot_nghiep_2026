import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Database,
  LogOut,
  User,
  ShieldCheck,
  Package,
  Factory,
  ShoppingBag,
  FileSpreadsheet,
  Workflow,
  Bell,
  CheckCheck,
  Gauge,
  Sparkles,
  Key,
  Check,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import AutomationAndTaxCenterModal from './AutomationAndTaxCenterModal'

export default function Header({ dbEngine = 'SQLITE', title = 'Tổng quan hệ thống', currentUser, onLogout }) {
  const isPostgres = dbEngine === 'POSTGRESQL'
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('TAX_EXCEL')
  const [notiOpen, setNotiOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Version 1.8.0: Google Gemini AI Config Modal
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiConfig, setAiConfig] = useState(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [aiModelInput, setAiModelInput] = useState('gemini-1.5-flash')
  const [savingAI, setSavingAI] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchAIConfig = () => {
    if (!api.getAIConfig) return
    api
      .getAIConfig()
      .then((cfg) => {
        setAiConfig(cfg)
        if (cfg.active_model) setAiModelInput(cfg.active_model)
      })
      .catch(() => {})
  }

  const fetchNotifications = () => {
    if (!api.getNotifications) return
    api
      .getNotifications()
      .then((res) => {
        setNotifications(res.data || [])
        setUnreadCount(Number(res.unread_count || 0))
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchNotifications()
    fetchAIConfig()
  }, [])

  const handleSaveAIConfig = async (e) => {
    e.preventDefault()
    setSavingAI(true)
    try {
      if (api.updateAIConfig) {
        const res = await api.updateAIConfig(apiKeyInput.trim(), aiModelInput)
        setAiConfig(res)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        setApiKeyInput('')
      }
    } catch (err) {
      alert(`Lỗi lưu cấu hình: ${err.message}`)
    } finally {
      setSavingAI(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      if (api.markNotificationsRead) {
        await api.markNotificationsRead(null, true)
      }
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // ignore
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: '👑 Giám Đốc', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' }
      case 'WAREHOUSE_MANAGER':
        return { label: '📦 Trưởng Kho', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' }
      case 'PRODUCTION_STAFF':
        return { label: '🏭 Quản Đốc SX', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }
      case 'PROCUREMENT':
        return { label: '🛒 Thu Mua NVL', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }
      default:
        return { label: 'Nhân Viên', bg: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', border: 'var(--border-subtle)' }
    }
  }

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title">{title}</h2>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            setModalTab('TAX_EXCEL')
            setModalOpen(true)
          }}
          className="btn btn-outline"
          style={{
            padding: '5px 11px',
            fontSize: '0.76rem',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Xuất Báo Cáo Thuế GTGT (.xlsx 4 Sheet) & Lưu trữ chống thất thoát"
        >
          <FileSpreadsheet size={14} />
          <span>Báo Cáo Thuế & Excel</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setModalTab('N8N_ENGINE')
            setModalOpen(true)
          }}
          className="btn btn-outline"
          style={{
            padding: '5px 11px',
            fontSize: '0.76rem',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Trung Tâm Tự Động Hóa n8n (3 Workflows & Nhật ký Webhook)"
        >
          <Workflow size={14} />
          <span>n8n Automation</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setModalTab('LOAD_BENCHMARK')
            setModalOpen(true)
          }}
          className="btn btn-outline"
          style={{
            padding: '5px 11px',
            fontSize: '0.76rem',
            borderColor: 'rgba(245, 158, 11, 0.45)',
            color: '#fbbf24',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Kiểm thử Độ Tải & Hiệu Năng Chịu Tải Web (Load Benchmark)"
        >
          <Gauge size={14} />
          <span>Test Độ Tải</span>
        </button>

        {/* Nút Cấu Hình Google Gemini AI & RAG Engine (Version 1.8.0) */}
        <button
          type="button"
          onClick={() => {
            fetchAIConfig()
            setAiModalOpen(true)
          }}
          className="btn btn-outline"
          style={{
            padding: '5px 11px',
            fontSize: '0.76rem',
            borderColor: aiConfig?.gemini_configured ? 'rgba(168, 85, 247, 0.45)' : 'rgba(148, 163, 184, 0.3)',
            color: aiConfig?.gemini_configured ? '#c084fc' : '#cbd5e1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Cấu hình Google Gemini API Key & RAG Context Engine"
        >
          <Sparkles size={14} color={aiConfig?.gemini_configured ? '#c084fc' : '#94a3b8'} />
          <span>{aiConfig?.gemini_configured ? 'Gemini AI (Online)' : 'Gemini AI'}</span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: aiConfig?.gemini_configured ? '#10b981' : '#f59e0b',
            }}
          />
        </button>

        {/* Chuông Thông Báo Real-time (Notification Bell) */}
        <button
          type="button"
          aria-label="Chuông thông báo"
          title="Chuông thông báo hệ thống"
          onClick={() => {
            if (!notiOpen) fetchNotifications()
            setNotiOpen((prev) => !prev)
          }}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 10,
            background: notiOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.8)',
            border: notiOpen ? '1px solid #10b981' : '1px solid var(--border-subtle)',
            color: '#f8fafc',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 10,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.6)',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <div className={`db-badge ${isPostgres ? 'postgres' : 'sqlite'}`}>
          <span className="status-dot"></span>
          <Database size={14} />
          <span>DB: {isPostgres ? 'PostgreSQL' : 'SQLite'}</span>
        </div>

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 10px',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <User size={14} />
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                  {currentUser.full_name}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: roleInfo.color,
                    fontWeight: 700,
                  }}
                >
                  {roleInfo.label}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="btn btn-outline"
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={14} />
              <span>Thoát</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <User size={14} />
            <span>Đăng Nhập</span>
          </Link>
        )}
      </div>

      <AutomationAndTaxCenterModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          fetchNotifications()
        }}
        initialTab={modalTab}
      />

      {notiOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
            }}
            onClick={() => setNotiOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: 68,
                right: 24,
                width: 390,
                maxHeight: 460,
                background: '#0f172a',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                borderRadius: 14,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.78)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'rgba(30, 41, 59, 0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={15} color="#10b981" />
                  <span>Trung Tâm Thông Báo & Cảnh Báo ({notifications.length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCheck size={14} />
                  <span>Đọc tất cả</span>
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    Chưa có thông báo mới.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.notification_id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: n.is_read ? 'rgba(30, 41, 59, 0.4)' : 'rgba(16, 185, 129, 0.1)',
                        border:
                          n.severity === 'CRITICAL'
                            ? '1px solid rgba(239, 68, 68, 0.45)'
                            : n.is_read
                            ? '1px solid rgba(255, 255, 255, 0.06)'
                            : '1px solid rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: n.severity === 'CRITICAL' ? '#f87171' : '#f8fafc',
                          }}
                        >
                          {n.title}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', flexShrink: 0 }}>
                          {String(n.created_at || '').slice(11, 19)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.77rem', color: '#cbd5e1', marginTop: 4, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL CẤU HÌNH GOOGLE GEMINI AI & RAG (VERSION 1.8.0) */}
      {aiModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setAiModalOpen(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 520,
                background: '#0f172a',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: 14,
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(15, 23, 42, 0.95))',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={20} color="#c084fc" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                      Cấu Hình Google Gemini AI & Hybrid RAG
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                      Kích hoạt trí tuệ nhân tạo thế hệ mới hiểu sâu ngữ cảnh CSDL ERP
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSaveAIConfig} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Trạng thái hiện tại */}
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderRadius: 10,
                    padding: 12,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Chế độ vận hành hiện tại:</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: aiConfig?.gemini_configured ? '#34d399' : '#fbbf24', marginTop: 2 }}>
                      {aiConfig?.gemini_configured ? '🟢 Google Gemini Cloud AI (Trực Tuyến)' : '🟡 Semantic RAG Engine (Nội Bộ / Offline)'}
                    </div>
                  </div>
                  {aiConfig?.masked_key && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.8)', padding: '4px 8px', borderRadius: 6 }}>
                      Key: {aiConfig.masked_key}
                    </span>
                  )}
                </div>

                {saveSuccess && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#34d399',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Check size={16} /> Đã cập nhật và lưu cấu hình Gemini AI thành công!
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: 6 }}>
                    Gemini API Key (Google AI Studio)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                    <input
                      type="password"
                      className="input-control"
                      placeholder="Dán mã API Key (AIzaSy...)"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      style={{ paddingLeft: 38, height: 40, fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                    Lấy miễn phí tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>aistudio.google.com/app/apikey</a>. Nếu bỏ trống, hệ thống sẽ tự động dùng bộ Semantic RAG Engine nội bộ.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: 6 }}>
                    Mô hình suy luận (Model Selection)
                  </label>
                  <select
                    className="input-control"
                    value={aiModelInput}
                    onChange={(e) => setAiModelInput(e.target.value)}
                    style={{ height: 40, fontSize: '0.85rem' }}
                  >
                    <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Khuyên dùng - Nhanh, chuẩn xác, tối ưu đồ án)</option>
                    <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Phiên bản mới nhất)</option>
                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Suy luận sâu)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(false)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={savingAI}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                      border: 'none',
                      fontSize: '0.82rem',
                      padding: '8px 18px',
                      fontWeight: 700,
                    }}
                  >
                    {savingAI ? 'Đang lưu...' : 'Lưu Cấu Hình Gemini AI'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}

