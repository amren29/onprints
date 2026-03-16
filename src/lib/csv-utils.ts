import { showToast } from './toast'

/**
 * Converts an array of objects to CSV and triggers a download.
 * @param filename - file name without extension
 * @param rows - array of flat objects
 * @param columns - ordered column definitions { key, label }
 */
export function downloadCSV<T extends object>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
) {
  const escape = (v: unknown): string => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const header = columns.map(c => escape(c.label)).join(',')
  const body = rows.map(row =>
    columns.map(c => escape(row[c.key])).join(',')
  ).join('\n')

  const csv = header + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
  showToast(`${filename}.csv downloaded`)
}
