/**
 * Utility Functions Tests
 * ========================
 *
 * Tests for formatting and utility functions.
 */

import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatRelativeDate,
  getHealthColor,
} from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats currency with default options', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })

  it('formats currency with compact notation', () => {
    expect(formatCurrency(1000, { compact: true })).toBe('$1.0K')
    expect(formatCurrency(1000000, { compact: true })).toBe('$1.0M')
    expect(formatCurrency(1500000, { compact: true })).toBe('$1.5M')
  })

  it('handles zero and negative values', () => {
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(-1000)).toBe('-$1,000.00')
  })
})

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.5)).toBe('50%')
    expect(formatPercent(0.125)).toBe('13%')
    expect(formatPercent(1.5)).toBe('150%')
  })

  it('handles zero and negative values', () => {
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(-0.1)).toBe('-10%')
  })

  it('rounds to nearest integer', () => {
    expect(formatPercent(0.126)).toBe('13%')
    expect(formatPercent(0.124)).toBe('12%')
  })
})

describe('formatDate', () => {
  it('formats date in short format by default', () => {
    const date = new Date('2024-01-15')
    const formatted = formatDate(date)
    expect(formatted).toMatch(/Jan 15, 2024/)
  })

  it('formats date in long format', () => {
    const date = new Date('2024-01-15')
    const formatted = formatDate(date, 'long')
    expect(formatted).toMatch(/January 15, 2024/)
  })

  it('formats relative dates', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const formatted = formatDate(yesterday, 'relative')
    expect(formatted).toMatch(/yesterday|1 day ago/)
  })

  it('handles string dates', () => {
    const formatted = formatDate('2024-01-15')
    expect(formatted).toMatch(/Jan 15, 2024/)
  })
})

describe('formatRelativeDate', () => {
  it('formats recent dates as relative', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatRelativeDate(yesterday)).toMatch(/yesterday|1 day ago/)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    expect(formatRelativeDate(weekAgo)).toMatch(/week ago|7 days ago/)
  })

  it('formats old dates as absolute', () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const formatted = formatRelativeDate(twoYearsAgo)
    expect(formatted).toMatch(/\d{4}/)  // Should contain a year
  })
})

describe('getHealthColor', () => {
  it('returns correct colors for health scores', () => {
    expect(getHealthColor('Green')).toBe('text-green-600')
    expect(getHealthColor('Yellow')).toBe('text-yellow-600')
    expect(getHealthColor('Red')).toBe('text-red-600')
  })

  it('returns gray for unknown health score', () => {
    expect(getHealthColor('Unknown')).toBe('text-gray-400')
    expect(getHealthColor(null as any)).toBe('text-gray-400')
    expect(getHealthColor(undefined as any)).toBe('text-gray-400')
  })
})
