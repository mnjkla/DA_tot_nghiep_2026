import React, { useState } from 'react'
import { Bot, Send, X, Sparkles, Loader2 } from 'lucide-react'
import { api } from '../services/api'

export default function AICopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý AI ERP. Tôi có thể giúp bạn tra cứu tồn kho, định mức BOM, doanh thu hoặc hỗ trợ ra quyết định sản xuất.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const quickPrompts = [
    'Tồn kho thành phẩm còn bao nhiêu?',
    'Kiểm tra tồn kho nguyên vật liệu',
    'Xem sản phẩm bán chạy nhất tháng',
    'Định mức BOM Yến chưng đường phèn',
  ]

  const handleSend = async (questionText) => {
    const query = (questionText || input).trim()
    if (!query || loading) return

    const userMsg = { sender: 'user', text: query }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.askAIChat(query)
      setMessages((prev) => [...prev, { sender: 'bot', text: res.answer }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: `⚠️ Lỗi kết nối trợ lý AI: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="ai-copilot-btn"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles size={18} />
        <span>AI Copilot</span>
      </button>

      {isOpen && (
        <>
          <div
            className="ai-drawer-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="ai-drawer" role="dialog" aria-label="AI Assistant Drawer">
            <div className="ai-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bot size={22} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Trợ lý AI Doanh Nghiệp</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    RAG & Text-to-SQL Real-time
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', borderRadius: '50%' }}
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ai-drawer-messages">
              {messages.map((m, idx) => (
                <div key={idx} className={`ai-msg ${m.sender}`}>
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="ai-msg bot" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang truy vấn CSDL & phân tích...</span>
                </div>
              )}
            </div>

            <div className="quick-chips-wrapper">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chip"
                  onClick={() => handleSend(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              className="ai-drawer-input"
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
            >
              <input
                type="text"
                placeholder="Nhập câu hỏi tra cứu..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0 16px' }}
                disabled={loading}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
