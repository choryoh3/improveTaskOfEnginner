import type { Repositories } from '@app/db'
import {
  addDays,
  formatDate,
  parseDate,
  startOfWeek,
  type FocusSession,
  type Report,
  type ReportQuery,
  type Task,
} from '@app/shared'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()
const minutes = (seconds: number) => Math.round(seconds / 60)

function section(title: string, lines: string[]): string {
  return `## ${title}\n${lines.length > 0 ? lines.join('\n') : '- なし'}`
}

/** 日報(スタンドアップ)と週次レビューを Markdown で生成する */
export async function buildReport(
  repos: Repositories,
  query: ReportQuery,
  now: Date,
  tzOffsetMin: number,
): Promise<Report> {
  const anchor = parseDate(query.date ?? formatDate(now, tzOffsetMin), tzOffsetMin)
  const from = query.type === 'weekly' ? startOfWeek(anchor, tzOffsetMin) : anchor
  const to = addDays(from, query.type === 'weekly' ? 7 : 1)
  const fromDate = formatDate(from, tzOffsetMin)
  const toDate = formatDate(addDays(to, -1), tzOffsetMin)

  const [areas, completed, sessions, doing, blocked] = await Promise.all([
    repos.areas.list(),
    repos.tasks.completedBetween(from, to),
    repos.focus.listBetween(from, to),
    repos.tasks.list({ status: 'doing' }),
    repos.tasks.list({ status: 'blocked' }),
  ])
  const focusSessions = sessions.filter((s) => s.kind === 'focus')
  const areaName = new Map(areas.map((a) => [a.id, a.name]))
  const label = (task: Task) =>
    `${task.areaId ? `[${areaName.get(task.areaId) ?? '?'}] ` : ''}${oneLine(task.title)}`

  const focusSecByTask = new Map<string, number>()
  for (const s of focusSessions) {
    if (s.taskId) focusSecByTask.set(s.taskId, (focusSecByTask.get(s.taskId) ?? 0) + s.durationSec)
  }
  const completedLines = completed.map((task) => {
    const sec = focusSecByTask.get(task.id)
    return `- ${label(task)}${sec ? `(集中 ${minutes(sec)}分)` : ''}`
  })
  const blockedLines = blocked.map((task) => `- ${label(task)}`)
  const totalSec = focusSessions.reduce((sum, s) => sum + s.durationSec, 0)
  const focusSummary = `合計 ${minutes(totalSec)}分(${focusSessions.length}セッション)`

  if (query.type === 'daily') {
    const markdown = [
      `# 日報 ${fromDate}(${weekdayOf(fromDate)})`,
      section('完了', completedLines),
      `## 集中時間\n- ${focusSummary}`,
      section(
        '進行中',
        doing.map((task) => `- ${label(task)}`),
      ),
      section('ブロッカー', blockedLines),
    ].join('\n\n')
    return { type: 'daily', from: fromDate, to: toDate, markdown }
  }

  const [upcoming, overdue] = await Promise.all([
    repos.tasks.dueBetween(to, addDays(to, 7)),
    repos.tasks.list({ due: 'overdue' }),
  ])

  const byDay = new Map<string, FocusSession[]>()
  for (const s of focusSessions) {
    const key = formatDate(new Date(s.startedAt), tzOffsetMin)
    byDay.set(key, [...(byDay.get(key) ?? []), s])
  }
  const dailyLines = Array.from({ length: 7 }, (_, i) => formatDate(addDays(from, i), tzOffsetMin))
    .filter((date) => byDay.has(date))
    .map((date) => {
      const sec = byDay.get(date)!.reduce((sum, s) => sum + s.durationSec, 0)
      return `- ${date}(${weekdayOf(date)}): ${minutes(sec)}分`
    })

  const markdown = [
    `# 週次レビュー ${fromDate} 〜 ${toDate}`,
    section(`完了(${completed.length}件)`, completedLines),
    section('集中時間', [`- ${focusSummary}`, ...dailyLines]),
    section(
      '来週が期限',
      upcoming.map(
        (task) => `- ${formatDate(new Date(task.dueDate!), tzOffsetMin)} ${label(task)}`,
      ),
    ),
    section(
      '期限切れ',
      overdue.map((task) => `- ${formatDate(new Date(task.dueDate!), tzOffsetMin)} ${label(task)}`),
    ),
    section('ブロッカー', blockedLines),
  ].join('\n\n')
  return { type: 'weekly', from: fromDate, to: toDate, markdown }
}
