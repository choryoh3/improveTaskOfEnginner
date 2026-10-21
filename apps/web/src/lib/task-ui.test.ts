import { describe, expect, it } from 'vitest'
import { dateInputToIso, dueInfo, formatMinutes, isoToDateInput, parseTags } from './task-ui'

describe('parseTags', () => {
  it('splits on commas, spaces and Japanese commas, strips #, dedupes', () => {
    expect(parseTags('bug, #api　レビュー、bug')).toEqual(['bug', 'api', 'レビュー'])
  })

  it('caps at 10 tags and ignores blanks', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags(Array.from({ length: 15 }, (_, i) => `t${i}`).join(','))).toHaveLength(10)
  })
})

describe('date input conversion', () => {
  it('round-trips a local calendar day through the end-of-day ISO string', () => {
    const iso = dateInputToIso('2026-10-21')
    expect(iso).not.toBeNull()
    expect(isoToDateInput(iso)).toBe('2026-10-21')
  })

  it('handles empty values', () => {
    expect(dateInputToIso('')).toBeNull()
    expect(isoToDateInput(null)).toBe('')
  })
})

describe('dueInfo', () => {
  const now = new Date(2026, 9, 21, 12, 0) // ローカル 10/21 12:00
  const at = (month: number, day: number, hour = 23) =>
    new Date(2026, month - 1, day, hour, 59).toISOString()

  it('returns null without a due date', () => {
    expect(dueInfo({ dueDate: null, status: 'todo' }, now)).toBeNull()
  })

  it('flags overdue, today and tomorrow', () => {
    expect(dueInfo({ dueDate: at(10, 20), status: 'todo' }, now)).toEqual({
      label: '期限切れ 10/20',
      tone: 'danger',
    })
    expect(dueInfo({ dueDate: at(10, 21), status: 'todo' }, now)).toEqual({
      label: '今日',
      tone: 'warning',
    })
    expect(dueInfo({ dueDate: at(10, 22), status: 'todo' }, now)).toEqual({
      label: '明日',
      tone: 'neutral',
    })
    expect(dueInfo({ dueDate: at(10, 30), status: 'todo' }, now)?.label).toBe('10/30')
  })

  it('does not emphasise completed tasks', () => {
    expect(dueInfo({ dueDate: at(10, 20), status: 'done' }, now)).toEqual({
      label: '10/20',
      tone: 'neutral',
    })
  })
})

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(0)).toBe('0分')
    expect(formatMinutes(45)).toBe('45分')
    expect(formatMinutes(60)).toBe('1時間')
    expect(formatMinutes(95)).toBe('1時間35分')
  })
})
