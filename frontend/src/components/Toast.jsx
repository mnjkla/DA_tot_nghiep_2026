import React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || 'success'}`}>
          {t.type === 'error' ? (
            <AlertCircle size={18} color="#f43f5e" />
          ) : (
            <CheckCircle2 size={18} color="#10b981" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
