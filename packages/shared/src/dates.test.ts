import { describe, expect, it } from 'vitest'
import { addDays, formatDate, parseDate, startOfDay, startOfWeek } from './dates'

const JST = 540

describe('dates (JST = +540)', () => {
  // 2026-10-21 は水曜日。UTC 20:30 は JST では 10/22 05:30
  const late = new Date('2026-10-21T20:30:00Z')

  it('uses the local calendar day, not the UTC day', () => {
    expect(startOfDay(late, JST).toISOString()).toBe('2026-10-21T15:00:00.000Z')
    expect(formatDate(late, JST)).toBe('2026-10-22')
    expect(formatDate(late, 0)).toBe('2026-10-21')
  })

  it('starts the week on Monday', () => {
    expect(formatDate(startOfWeek(new Date('2026-10-21T03:00:00Z'), JST), JST)).toBe('2026-10-19')
    // 日曜(10/25)は同じ週の最終日
    expect(formatDate(startOfWeek(new Date('2026-10-25T03:00:00Z'), JST), JST)).toBe('2026-10-19')
    // 月曜(10/26)の JST 早朝(UTC では日曜)は新しい週
    expect(formatDate(startOfWeek(new Date('2026-10-25T16:00:00Z'), JST), JST)).toBe('2026-10-26')
  })

  it('round-trips parseDate and formatDate', () => {
    expect(formatDate(parseDate('2026-10-21', JST), JST)).toBe('2026-10-21')
    expect(parseDate('2026-10-21', JST).toISOString()).toBe('2026-10-20T15:00:00.000Z')
  })

  it('adds days', () => {
    expect(addDays(new Date('2026-10-21T00:00:00Z'), 7).toISOString()).toBe(
      '2026-10-28T00:00:00.000Z',
    )
  })
})
