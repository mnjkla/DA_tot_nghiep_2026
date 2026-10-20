import React from 'react'
import { Database, Activity } from 'lucide-react'

export default function Header({ dbEngine = 'SQLITE', title = 'Tổng quan hệ thống' }) {
  const isPostgres = dbEngine === 'POSTGRESQL'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title">{title}</h2>
      </div>

      <div className="topbar-right">
        <div className={`db-badge ${isPostgres ? 'postgres' : 'sqlite'}`}>
          <span className="status-dot"></span>
          <Database size={14} />
          <span>DB: {isPostgres ? 'PostgreSQL Core' : 'SQLite Fallback'}</span>
        </div>
      </div>
    </header>
  )
}
