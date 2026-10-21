import type { Task, TaskStatus } from '@app/shared'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  doing: '進行中',
  blocked: 'ブロック中',
  done: '完了',
}

export const STATUS_TONE: Record<TaskStatus, 'neutral' | 'info' | 'warning' | 'success'> = {
  todo: 'neutral',
  doing: 'info',
  blocked: 'warning',
  done: 'success',
}

export const PRIORITY_LABEL = ['低', '中', '高', '緊急'] as const
export const PRIORITY_TONE = ['neutral', 'neutral', 'warning', 'danger'] as const

/** `<input type="date">` の値(YYYY-MM-DD)を、その日の終わり(ローカル)の ISO 文字列に */
export function dateInputToIso(value: string): string | null {
  if (!value) return null
  return new Date(`${value}T23:59:00`).toISOString()
}

/** ISO 文字列を、`<input type="date">` 用の YYYY-MM-DD(ローカル)に */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,、\s]+/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    ),
  ].slice(0, 10)
}

export interface DueInfo {
  label: string
  tone: 'neutral' | 'warning' | 'danger'
}

/** 期限の表示。完了済みは強調しない。 */
export function dueInfo(task: Pick<Task, 'dueDate' | 'status'>, now = new Date()): DueInfo | null {
  if (!task.dueDate) return null
  const due = new Date(task.dueDate)
  const label = `${due.getMonth() + 1}/${due.getDate()}`
  if (task.status === 'done') return { label, tone: 'neutral' }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / 86_400_000)
  if (due < now) return { label: `期限切れ ${label}`, tone: 'danger' }
  if (days === 0) return { label: '今日', tone: 'warning' }
  if (days === 1) return { label: '明日', tone: 'neutral' }
  return { label, tone: 'neutral' }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`
}
