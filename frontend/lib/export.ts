/**
 * CSV Export Utilities
 * ====================
 *
 * Utilities for exporting data to CSV format.
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return ''

  // If columns not specified, use all keys from first object
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }))

  // Create header row
  const header = cols.map(col => escapeCSVValue(col.label)).join(',')

  // Create data rows
  const rows = data.map(row =>
    cols.map(col => {
      const value = row[col.key]
      return escapeCSVValue(value)
    }).join(',')
  )

  return [header, ...rows].join('\n')
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Export customers to CSV
 */
export function exportCustomersCSV(customers: any[], filename = 'customers.csv') {
  const columns = [
    { key: 'customer_id', label: 'Customer ID' },
    { key: 'company_name', label: 'Company Name' },
    { key: 'company_size', label: 'Company Size' },
    { key: 'industry', label: 'Industry' },
    { key: 'status', label: 'Status' },
    { key: 'health_score', label: 'Health Score' },
    { key: 'current_mrr', label: 'MRR' },
    { key: 'arr', label: 'ARR' },
    { key: 'churn_probability', label: 'Churn Probability' },
    { key: 'nps_score', label: 'NPS Score' },
    { key: 'tenure_days', label: 'Tenure (Days)' },
    { key: 'start_date', label: 'Start Date' },
  ]

  const csv = arrayToCSV(customers, columns)
  downloadCSV(csv, filename)
}

/**
 * Export generic table data to CSV
 */
export function exportTableCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
) {
  const csv = arrayToCSV(data, columns)
  downloadCSV(csv, filename)
}
