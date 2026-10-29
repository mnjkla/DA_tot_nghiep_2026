import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Workflow,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Database,
  Clock,
  FileText,
} from 'lucide-react'
import { api } from '../services/api'
import SortableHeader, { useTableSort, sortArrayByField } from './SortableHeader'

export default function AutomationAndTaxCenterModal({
  isOpen,
  onClose,
  initialTab = 'TAX_EXCEL',
  onDataImported,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)

  // Tax & Excel State
  const [period, setPeriod] = useState('ALL')
  const [vatRate, setVatRate] = useState(8)
  const [activeSheet, setActiveSheet] = useState('01_Bang_Ke_Thue_Dau_Ra')
  const [taxData, setTaxData] = useState(null)
  const [loadingTax, setLoadingTax] = useState(false)

  // Import File State
  const [importTarget, setImportTarget] = useState('MATERIALS')
  const [importing, setImporting] = useState(false)
  const [importFeedback, setImportFeedback] = useState(null)

  // n8n State
  const [n8nStatus, setN8nStatus] = useState(null)
  const [loadingN8n, setLoadingN8n] = useState(false)
  const [triggeringWf, setTriggeringWf] = useState('')
  const [n8nFeedback, setN8nFeedback] = useState(null)

  // Load Benchmark State
  const [concurrentUsers, setConcurrentUsers] = useState(25)
  const [totalRequests, setTotalRequests] = useState(200)
  const [runningBenchmark, setRunningBenchmark] = useState(false)
  const [benchmarkResult, setBenchmarkResult] = useState(null)

  // Table Sorts
  const { sortConfig: sheetSort, handleSort: handleSheetSort } = useTableSort('', 'asc')
  const { sortConfig: logSort, handleSort: handleLogSort } = useTableSort('log_id', 'desc')

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      fetchTaxSummary(period, vatRate)
      fetchN8nStatus()
      if (initialTab === 'LOAD_BENCHMARK' && !benchmarkResult) {
        handleRunLoadTest(25, 200)
      }
    }
  }, [isOpen, initialTab])

  const handleRunLoadTest = async (users = concurrentUsers, reqs = totalRequests) => {
    if (!api.runLoadBenchmark) return
    try {
      setRunningBenchmark(true)
      const res = await api.runLoadBenchmark(Number(users), Number(reqs))
      setBenchmarkResult(res)
    } catch (err) {
      console.error('Lỗi chạy Load Benchmark:', err)
    } finally {
      setRunningBenchmark(false)
    }
  }

  const fetchTaxSummary = async (selectedPeriod = period, selectedVat = vatRate) => {
    try {
      setLoadingTax(true)
      const res = await api.getTaxReportSummary(selectedPeriod, selectedVat)
      setTaxData(res)
    } catch (err) {
      console.error('Lỗi tải báo cáo thuế:', err)
    } finally {
      setLoadingTax(false)
    }
  }

  const fetchN8nStatus = async () => {
    try {
      setLoadingN8n(true)
      const res = await api.getN8nStatus()
      setN8nStatus(res)
    } catch (err) {
      console.error('Lỗi tải trạng thái n8n:', err)
    } finally {
      setLoadingN8n(false)
    }
  }

  const handlePeriodOrVatChange = (newPeriod, newVat) => {
    setPeriod(newPeriod)
    setVatRate(newVat)
    fetchTaxSummary(newPeriod, newVat)
  }

  const handleTriggerWorkflow = async (wfId) => {
    try {
      setTriggeringWf(wfId)
      setN8nFeedback(null)
      const res = await api.triggerN8nWorkflow(wfId)
      setN8nFeedback({
        type: 'success',
        text: res.message || 'Kích hoạt Workflow thành công!',
      })
      await fetchN8nStatus()
    } catch (err) {
      setN8nFeedback({
        type: 'error',
        text: err.message || 'Không thể kích hoạt Workflow',
      })
    } finally {
      setTriggeringWf('')
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFeedback(null)
    setImporting(true)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const base64Data = ev.target?.result
        const storedUser = JSON.parse(localStorage.getItem('erp_user') || '{}')
        const res = await api.importTabularFile({
          target: importTarget,
          filename: file.name,
          file_base64: base64Data,
          imported_by: storedUser.username || 'admin',
        })
        setImportFeedback({
          type: 'success',
          text: res.message,
          items: res.items || [],
        })
        fetchTaxSummary(period, vatRate)
        if (onDataImported) onDataImported()
      } catch (err) {
        setImportFeedback({
          type: 'error',
          text: err.message || 'Lỗi khi xử lý file tải lên',
        })
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  if (!isOpen) return null

  const currentSheetRows = taxData?.preview?.[activeSheet] || []
  const sortedSheetRows = sortArrayByField(currentSheetRows, sheetSort)
  const sheetColumns = currentSheetRows.length > 0 ? Object.keys(currentSheetRows[0]) : []

  const sortedN8nLogs = sortArrayByField(n8nStatus?.recent_logs || [], logSort)

  const modalContent = (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(2, 6, 23, 0.84)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="modal-box"
        style={{
          width: '100%',
          maxWidth: 1120,
          maxHeight: '86vh',
          margin: 'auto',
          background: '#0f172a',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(15, 23, 42, 0.98) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeTab === 'TAX_EXCEL' ? <FileSpreadsheet size={20} /> : <Workflow size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#f8fafc' }}>
                Trung Tâm Báo Cáo Thuế Excel & Tự Động Hóa n8n (v1.5.0)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Xuất/Nhập hồ sơ kế toán chống thất thoát (.xlsx / .csv) & Điều phối trực quan 3 Workflows n8n
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('TAX_EXCEL')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'TAX_EXCEL' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                background: activeTab === 'TAX_EXCEL' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                color: activeTab === 'TAX_EXCEL' ? '#34d399' : '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FileSpreadsheet size={15} />
              <span>Báo Cáo Thuế & Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('N8N_ENGINE')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'N8N_ENGINE' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                background: activeTab === 'N8N_ENGINE' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(30, 41, 59, 0.6)',
                color: activeTab === 'N8N_ENGINE' ? '#38bdf8' : '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Workflow size={15} />
              <span>Điều Phối n8n Automation</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('LOAD_BENCHMARK')
                if (!benchmarkResult) handleRunLoadTest(concurrentUsers, totalRequests)
              }}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'LOAD_BENCHMARK' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                background: activeTab === 'LOAD_BENCHMARK' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(30, 41, 59, 0.6)',
                color: activeTab === 'LOAD_BENCHMARK' ? '#fbbf24' : '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Play size={14} />
              <span>Test Độ Tải Web (Load Benchmark)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 6,
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          {activeTab === 'TAX_EXCEL' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Control Bar: Kỳ báo cáo, VAT & Nút Xuất Excel */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.55)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: 4 }}>
                      Kỳ Báo Cáo Kế Toán
                    </label>
                    <select
                      className="input-control"
                      value={period}
                      onChange={(e) => handlePeriodOrVatChange(e.target.value, vatRate)}
                      style={{ height: 36, minWidth: 160, fontSize: '0.84rem' }}
                    >
                      <option value="ALL">Cả năm 2026 (Toàn bộ)</option>
                      <option value="Q1">Quý 1 (Tháng 1 - 3)</option>
                      <option value="Q2">Quý 2 (Tháng 4 - 6)</option>
                      <option value="Q3">Quý 3 (Tháng 7 - 9)</option>
                      <option value="Q4">Quý 4 (Tháng 10 - 12)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: 4 }}>
                      Thuế Suất GTGT (VAT)
                    </label>
                    <select
                      className="input-control"
                      value={vatRate}
                      onChange={(e) => handlePeriodOrVatChange(period, Number(e.target.value))}
                      style={{ height: 36, minWidth: 170, fontSize: '0.84rem' }}
                    >
                      <option value={8}>8% (Ưu đãi Nghị định Thuế)</option>
                      <option value={10}>10% (Thuế suất tiêu chuẩn)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={api.getTaxExportUrl(period, vatRate, 'xlsx', activeSheet)}
                    download
                    className="btn btn-primary"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 16px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                    }}
                  >
                    <Download size={16} />
                    <span>Xuất Hồ Sơ Thuế (.XLSX 4 Sheet)</span>
                  </a>

                  <a
                    href={api.getTaxExportUrl(period, vatRate, 'csv', activeSheet)}
                    download
                    className="btn btn-outline"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <FileText size={15} />
                    <span>Xuất Sheet Hiện Tại (.CSV)</span>
                  </a>
                </div>
              </div>

              {/* Summary KPIs */}
              {taxData?.summary && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Doanh Thu Trước Thuế</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                      {Number(taxData.summary.total_revenue_before_tax).toLocaleString()} ₫
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      {taxData.summary.invoice_count} hóa đơn phát sinh
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Thuế GTGT Đầu Ra ({taxData.summary.vat_rate}%)
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
                      {Number(taxData.summary.total_vat_amount).toLocaleString()} ₫
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Tổng thu: {Number(taxData.summary.total_final_payment).toLocaleString()} ₫
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Giá Trị Tồn Kho Kiểm Toán</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
                      {Number(taxData.summary.total_inventory_value).toLocaleString()} ₫
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Đối chiếu NVL & Thành phẩm theo lô
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tổng Công Nợ Phải Thu</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#c084fc', marginTop: 4 }}>
                      {Number(taxData.summary.total_customer_receivable).toLocaleString()} ₫
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Lưu trữ sổ cái chống thất thoát
                    </div>
                  </div>
                </div>
              )}

              {/* Khu vực Import File Excel/CSV hàng loạt */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px dashed rgba(56, 189, 248, 0.45)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Upload size={16} color="#38bdf8" />
                    <span>Nhập Dữ Liệu Hàng Loạt Từ File Excel (.xlsx) hoặc CSV (.csv)</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 3 }}>
                    Hỗ trợ kiểm kê kho nguyên vật liệu hoặc cập nhật bảng giá sản phẩm từ file Excel bên ngoài vào thẳng CSDL
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    className="input-control"
                    value={importTarget}
                    onChange={(e) => setImportTarget(e.target.value)}
                    style={{ height: 35, fontSize: '0.82rem', minWidth: 190 }}
                  >
                    <option value="MATERIALS">Nhập Kho / Kiểm Kê NVL</option>
                    <option value="PRODUCTS">Danh Mục & Giá Sản Phẩm</option>
                  </select>

                  <a
                    href={api.getImportTemplateUrl(importTarget, 'xlsx')}
                    download
                    className="btn btn-outline"
                    style={{
                      textDecoration: 'none',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Download size={14} />
                    <span>Tải File Mẫu (.xlsx)</span>
                  </a>

                  <label
                    className="btn btn-primary"
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      cursor: importing ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      margin: 0,
                    }}
                  >
                    <Upload size={15} />
                    <span>{importing ? 'Đang xử lý file...' : 'Chọn File Excel/CSV Tải Lên'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileUpload}
                      disabled={importing}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {importFeedback && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background:
                      importFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.14)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border:
                      importFeedback.type === 'success'
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : '1px solid rgba(239, 68, 68, 0.4)',
                    color: importFeedback.type === 'success' ? '#34d399' : '#fca5a5',
                    fontSize: '0.82rem',
                  }}
                >
                  <strong>{importFeedback.text}</strong>
                </div>
              )}

              {/* Chọn Sheet Xem Trước */}
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {[
                    { key: '01_Bang_Ke_Thue_Dau_Ra', label: '1. Bảng Kê Hóa Đơn & Thuế Đầu Ra' },
                    { key: '02_Nhap_Xuat_Ton_Kho', label: '2. Nhập - Xuất - Tồn Kho Chống Thất Thoát' },
                    { key: '03_Nhat_Ky_San_Xuat', label: '3. Sổ Nhật Ký Sản Xuất & Duyệt Kho' },
                    { key: '04_So_Cong_No_Khach_Hang', label: '4. Sổ Công Nợ Phải Thu Khách Hàng' },
                  ].map((sh) => (
                    <button
                      key={sh.key}
                      type="button"
                      onClick={() => setActiveSheet(sh.key)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border:
                          activeSheet === sh.key
                            ? '1px solid #10b981'
                            : '1px solid rgba(255,255,255,0.1)',
                        background:
                          activeSheet === sh.key
                            ? 'rgba(16, 185, 129, 0.18)'
                            : 'rgba(30, 41, 59, 0.5)',
                        color: activeSheet === sh.key ? '#34d399' : '#94a3b8',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>

                {/* Bảng Preview có Sort đa cột */}
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    overflowX: 'auto',
                    maxHeight: 280,
                  }}
                >
                  {loadingTax ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                      Đang tổng hợp dữ liệu kế toán...
                    </div>
                  ) : (
                    <table className="data-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          {sheetColumns.map((col) => (
                            <SortableHeader
                              key={col}
                              label={col.replace(/_/g, ' ')}
                              field={col}
                              sortConfig={sheetSort}
                              onSort={handleSheetSort}
                            />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSheetRows.map((row, idx) => (
                          <tr key={idx}>
                            {sheetColumns.map((col) => {
                              const val = row[col]
                              const isMoney =
                                col.endsWith('_VND') && typeof val === 'number'
                              return (
                                <td key={col}>
                                  {isMoney ? `${val.toLocaleString()} ₫` : String(val ?? '')}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'N8N_AUTOMATION' ? (
            /* TAB 2: TRUNG TÂM ĐIỀU PHỐI N8N AUTOMATION */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldCheck size={24} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#f8fafc' }}>
                      Trạng Thái Kết Nối: {n8nStatus?.engine || 'n8n Automation Engine'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                      Chế độ vận hành:{' '}
                      <strong style={{ color: '#34d399' }}>
                        {n8nStatus?.connection_mode === 'ONLINE_N8N_DOCKER'
                          ? '🟢 Trực tuyến qua Docker n8n (Port 5678)'
                          : '🟢 Hybrid Offline-Safe Dispatcher (Sẵn sàng Demo 100%)'}
                      </strong>{' '}
                      • Tổng lượt thực thi: <strong>{n8nStatus?.total_executions || 0}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchN8nStatus}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Làm mới trạng thái</span>
                </button>
              </div>

              {n8nFeedback && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background:
                      n8nFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.14)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border:
                      n8nFeedback.type === 'success'
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : '1px solid rgba(239, 68, 68, 0.4)',
                    color: n8nFeedback.type === 'success' ? '#34d399' : '#fca5a5',
                    fontSize: '0.82rem',
                  }}
                >
                  <strong>{n8nFeedback.text}</strong>
                </div>
              )}

              {/* 3 Workflow Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: 14,
                }}
              >
                {(n8nStatus?.workflows || []).map((wf) => (
                  <div
                    key={wf.workflow_id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            fontWeight: 700,
                          }}
                        >
                          ACTIVE WORKFLOW
                        </span>
                        <code style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                          {wf.webhook_path}
                        </code>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', marginBottom: 6 }}>
                        {wf.name}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.45 }}>
                        {wf.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <button
                        type="button"
                        disabled={triggeringWf === wf.workflow_id}
                        onClick={() => handleTriggerWorkflow(wf.workflow_id)}
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Play size={13} />
                        <span>
                          {triggeringWf === wf.workflow_id ? 'Đang chạy...' : 'Kích Hoạt Ngay'}
                        </span>
                      </button>

                      <a
                        href={api.getN8nWorkflowDownloadUrl(wf.workflow_id)}
                        download
                        className="btn btn-outline"
                        style={{
                          textDecoration: 'none',
                          padding: '7px 10px',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Tải file JSON cấu hình Workflow n8n"
                      >
                        <Download size={13} />
                        <span>JSON</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bảng Nhật Ký Thực Thi Webhook */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#e2e8f0' }}>
                  Nhật Ký Thực Thi Tự Động Hóa n8n (Real-Time Execution Logs)
                </h4>
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    overflowX: 'auto',
                    maxHeight: 240,
                  }}
                >
                  <table className="data-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <SortableHeader label="ID" field="log_id" sortConfig={logSort} onSort={handleLogSort} />
                        <SortableHeader label="Workflow" field="workflow_name" sortConfig={logSort} onSort={handleLogSort} />
                        <SortableHeader label="Webhook" field="webhook_path" sortConfig={logSort} onSort={handleLogSort} />
                        <SortableHeader label="Kết Quả Xử Lý" field="summary" sortConfig={logSort} onSort={handleLogSort} />
                        <SortableHeader label="Độ Trễ (ms)" field="duration_ms" sortConfig={logSort} onSort={handleLogSort} />
                        <SortableHeader label="Thời Gian" field="executed_at" sortConfig={logSort} onSort={handleLogSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedN8nLogs.map((lg) => (
                        <tr key={lg.log_id}>
                          <td>#{lg.log_id}</td>
                          <td style={{ fontWeight: 600, color: '#f8fafc' }}>{lg.workflow_name}</td>
                          <td>
                            <code style={{ color: '#38bdf8' }}>{lg.webhook_path}</code>
                          </td>
                          <td style={{ color: '#cbd5e1' }}>{lg.summary}</td>
                          <td style={{ color: '#34d399', fontWeight: 600 }}>{lg.duration_ms} ms</td>
                          <td style={{ color: '#94a3b8' }}>{String(lg.executed_at || '').slice(0, 19)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 3: KIỂM THỬ ĐỘ CHỊU TẢI & ĐỒNG THỜI (WEB LOAD BENCHMARK) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.65)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Số luồng truy cập đồng thời (Concurrent Users)
                    </label>
                    <select
                      value={concurrentUsers}
                      onChange={(e) => setConcurrentUsers(Number(e.target.value))}
                      style={{
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: '0.84rem',
                      }}
                    >
                      <option value={10}>10 Users đồng thời (Mức tiêu chuẩn)</option>
                      <option value={25}>25 Users đồng thời (Cao điểm)</option>
                      <option value={50}>50 Users đồng thời (Flash Sale / Stress Test)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Tổng số Requests giả lập
                    </label>
                    <select
                      value={totalRequests}
                      onChange={(e) => setTotalRequests(Number(e.target.value))}
                      style={{
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: '0.84rem',
                      }}
                    >
                      <option value={50}>50 Requests (Kiểm tra nhanh)</option>
                      <option value={100}>100 Requests (Tiêu chuẩn)</option>
                      <option value={200}>200 Requests (Chịu tải cao)</option>
                      <option value={300}>300 Requests (Stress Test tối đa)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={runningBenchmark}
                  onClick={handleRunLoadTest}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                    border: 'none',
                    padding: '10px 18px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Zap size={16} />
                  <span>
                    {runningBenchmark
                      ? 'Đang bắn tải đa luồng...'
                      : '🚀 Chạy Kiểm Thử Chịu Tải Ngay'}
                  </span>
                </button>
              </div>

              {benchmarkResult ? (
                <>
                  {/* KPI Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Tốc Độ Xử Lý (Throughput)</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                        {benchmarkResult.requests_per_second} RPS
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                        Requests / giây ({benchmarkResult.concurrent_users} luồng)
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Tỷ Lệ Thành Công</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                        {benchmarkResult.success_rate_pct}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                        {benchmarkResult.successful_requests}/{benchmarkResult.total_requests} thành công (Lỗi: {benchmarkResult.failed_requests})
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Độ Trễ Trung Bình / P50</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                        {benchmarkResult.latency_ms?.avg} ms
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                        P50: {benchmarkResult.latency_ms?.p50} ms • Min: {benchmarkResult.latency_ms?.min} ms
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(168, 85, 247, 0.35)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Độ Trễ P95 / P99</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c084fc', marginTop: 4 }}>
                        {benchmarkResult.latency_ms?.p95} ms
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                        P99: {benchmarkResult.latency_ms?.p99} ms • Max: {benchmarkResult.latency_ms?.max} ms
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontSize: '0.73rem', color: '#a7f3d0' }}>Xếp Hạng Chịu Tải</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                        🏆 {benchmarkResult.grade}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6ee7b7', marginTop: 2 }}>
                        {benchmarkResult.db_concurrency_mode}
                      </div>
                    </div>
                  </div>

                  {/* Bảng chi tiết từng Endpoint */}
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#e2e8f0' }}>
                      Chi Tiết Độ Trễ & Tỷ Lệ Phản Hồi Theo Từng Phân Hệ (Endpoint Breakdown)
                    </h4>
                    <div
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        overflowX: 'auto',
                      }}
                    >
                      <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Phân Hệ Kiểm Thử (Endpoint)</th>
                            <th>Số Lượt Gọi</th>
                            <th>Thành Công</th>
                            <th>Lỗi (Errors)</th>
                            <th>Độ Trễ TB (ms)</th>
                            <th>Độ Trễ Max (ms)</th>
                            <th>Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(benchmarkResult.endpoint_breakdown || []).map((ep) => (
                            <tr key={ep.endpoint}>
                              <td style={{ fontWeight: 600, color: '#f8fafc' }}>{ep.endpoint}</td>
                              <td>{ep.calls}</td>
                              <td style={{ color: '#34d399', fontWeight: 700 }}>{ep.success}</td>
                              <td style={{ color: ep.errors > 0 ? '#f87171' : '#94a3b8' }}>{ep.errors}</td>
                              <td style={{ color: '#38bdf8', fontWeight: 600 }}>{ep.avg_ms} ms</td>
                              <td style={{ color: '#fbbf24' }}>{ep.max_ms} ms</td>
                              <td>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background:
                                      ep.errors === 0
                                        ? 'rgba(16, 185, 129, 0.16)'
                                        : 'rgba(239, 68, 68, 0.16)',
                                    color: ep.errors === 0 ? '#34d399' : '#f87171',
                                  }}
                                >
                                  {ep.errors === 0 ? 'PASS 100%' : 'CÓ LỖI'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 12,
                    border: '1px dashed var(--border-subtle)',
                    color: '#94a3b8',
                  }}
                >
                  Nhấn nút <strong>&ldquo;🚀 Chạy Kiểm Thử Chịu Tải Ngay&rdquo;</strong> để hệ thống giả lập đa luồng đồng thời truy cập vào Storefront, BI Dashboard, Kho NVL, Báo cáo Thuế và n8n Status với cơ chế SQLite WAL Mode.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

