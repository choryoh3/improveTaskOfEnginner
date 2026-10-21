import type { Repositories } from '@app/db'
import { addDays, formatDate, startOfDay, startOfWeek, type Overview } from '@app/shared'

const UNASSIGNED = { name: '未分類', color: '#94a3b8' }
const TREND_DAYS = 7

/** 領域別の進捗、今週の負荷、期限切れ/ブロック中、集中時間の推移 */
export async function buildOverview(
  repos: Repositories,
  now: Date,
  tzOffsetMin: number,
): Promise<Overview> {
  const today = startOfDay(now, tzOffsetMin)
  const weekStart = startOfWeek(now, tzOffsetMin)
  const weekEnd = addDays(weekStart, 7)
  const trendStart = addDays(today, -(TREND_DAYS - 1))

  const [areas, rows, sessions] = await Promise.all([
    repos.areas.list(),
    repos.tasks.summaryRows(),
    // 今週と推移(直近 7 日)の両方を覆う期間
    repos.focus.listBetween(
      weekStart < trendStart ? weekStart : trendStart,
      weekEnd > addDays(today, 1) ? weekEnd : addDays(today, 1),
    ),
  ])

  const isOverdue = (row: (typeof rows)[number]) =>
    row.status !== 'done' && row.dueDate !== null && row.dueDate < now

  const stats = (areaRows: typeof rows) => ({
    total: areaRows.length,
    done: areaRows.filter((r) => r.status === 'done').length,
    doing: areaRows.filter((r) => r.status === 'doing').length,
    blocked: areaRows.filter((r) => r.status === 'blocked').length,
    overdue: areaRows.filter(isOverdue).length,
  })

  const areaStats: Overview['areas'] = areas.map((area) => ({
    areaId: area.id,
    name: area.name,
    color: area.color,
    ...stats(rows.filter((r) => r.areaId === area.id)),
  }))
  const unassigned = rows.filter((r) => r.areaId === null)
  if (unassigned.length > 0) areaStats.push({ areaId: null, ...UNASSIGNED, ...stats(unassigned) })

  const focusSessions = sessions.filter((s) => s.kind === 'focus')
  const toMinutes = (seconds: number) => Math.round(seconds / 60)

  const inWeek = (date: Date) => date >= weekStart && date < weekEnd
  const plannedMin = rows
    .filter((r) => r.status !== 'done' && r.dueDate !== null && inWeek(r.dueDate))
    .reduce((sum, r) => sum + (r.estimateMin ?? 0), 0)
  const weekFocusSec = focusSessions
    .filter((s) => inWeek(new Date(s.startedAt)))
    .reduce((sum, s) => sum + s.durationSec, 0)

  const secondsByDate = new Map<string, number>()
  for (const s of focusSessions) {
    const key = formatDate(new Date(s.startedAt), tzOffsetMin)
    secondsByDate.set(key, (secondsByDate.get(key) ?? 0) + s.durationSec)
  }
  const focusTrend = Array.from({ length: TREND_DAYS }, (_, i) => {
    const date = formatDate(addDays(trendStart, i), tzOffsetMin)
    return { date, minutes: toMinutes(secondsByDate.get(date) ?? 0) }
  })

  return {
    areas: areaStats,
    week: { plannedMin, focusMin: toMinutes(weekFocusSec) },
    overdueCount: rows.filter(isOverdue).length,
    blockedCount: rows.filter((r) => r.status === 'blocked').length,
    focusTrend,
  }
}
