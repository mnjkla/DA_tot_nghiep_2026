import React, { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export function useTableSort(initialField = '', initialDirection = 'asc') {
  const [sortConfig, setSortConfig] = useState({
    field: initialField,
    direction: initialDirection,
  })

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { field, direction: 'asc' }
    })
  }

  return { sortConfig, handleSort, setSortConfig }
}

export function sortArrayByField(items, sortConfig) {
  if (!Array.isArray(items)) return []
  if (!sortConfig || !sortConfig.field) return items

  const { field, direction } = sortConfig
  const factor = direction === 'desc' ? -1 : 1

  return [...items].sort((a, b) => {
    const rawA = typeof field === 'function' ? field(a) : a?.[field]
    const rawB = typeof field === 'function' ? field(b) : b?.[field]

    if (rawA == null && rawB == null) return 0
    if (rawA == null) return 1
    if (rawB == null) return -1

    // Nếu cả 2 là số hoặc chuỗi số thuần
    const numA = Number(rawA)
    const numB = Number(rawB)
    const isNumA = typeof rawA === 'number' || (typeof rawA === 'string' && rawA.trim() !== '' && !Number.isNaN(numA))
    const isNumB = typeof rawB === 'number' || (typeof rawB === 'string' && rawB.trim() !== '' && !Number.isNaN(numB))

    if (isNumA && isNumB) {
      return (numA - numB) * factor
    }

    // Kiểm tra định dạng ngày tháng YYYY-MM-DD
    const strA = String(rawA).trim()
    const strB = String(rawB).trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(strA) && /^\d{4}-\d{2}-\d{2}/.test(strB)) {
      return strA.localeCompare(strB) * factor
    }

    return strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' }) * factor
  })
}

export default function SortableHeader({
  label,
  field,
  sortConfig,
  onSort,
  style = {},
  align = 'left',
}) {
  const isActive = sortConfig?.field === field
  const isAsc = isActive && sortConfig?.direction === 'asc'

  return (
    <th
      onClick={() => onSort && onSort(field)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        ...style,
      }}
      title={`Bấm để sắp xếp theo ${label}`}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          justifyContent:
            align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          color: isActive ? '#34d399' : 'inherit',
          fontWeight: isActive ? 700 : 600,
          transition: 'color 0.15s',
        }}
      >
        <span>{label}</span>
        {isActive ? (
          isAsc ? (
            <ArrowUp size={13} color="#10b981" />
          ) : (
            <ArrowDown size={13} color="#10b981" />
          )
        ) : (
          <ArrowUpDown size={12} style={{ opacity: 0.45 }} />
        )}
      </div>
    </th>
  )
}

