'use client'

import type { Overview } from '@app/shared'
import { AlertTriangle, CalendarClock, Ban, Gauge, Timer, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useUi } from '@/components/shell/ui-context'
import { Button } from '@/components/ui/button'
import { Badge, Card, Skeleton } from '@/components/ui/misc'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/page'
import { errorMessage } from '@/lib/api'
import { useOverview } from '@/lib/queries'
import { formatMinutes } from '@/lib/task-ui'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`

export function OverviewView() {
  const ui = useUi()
  const { data, isPending, isError, error, refetch } = useOverview()

  return (
    <>
      <PageHeader
        title="Overview"
        description="領域ごとの進捗と、今週の負荷を俯瞰します。"
        actions={
          <Button variant="outline" size="sm" onClick={() => ui.setAreasOpen(true)}>
            領域を管理
          </Button>
        }
      />

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <section aria-label="サマリー" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              icon={Timer}
              label="今週の集中"
              value={data && formatMinutes(data.week.focusMin)}
              hint={
                data && data.week.plannedMin > 0
                  ? `計画 ${formatMinutes(data.week.plannedMin)}`
                  : undefined
              }
            />
            <Kpi
              icon={CalendarClock}
              label="今週が期限の見積もり"
              value={data && formatMinutes(data.week.plannedMin)}
            />
            <Kpi
              icon={AlertTriangle}
              label="期限切れ"
              value={data && `${data.overdueCount}件`}
              tone={data && data.overdueCount > 0 ? 'danger' : undefined}
            />
            <Kpi
              icon={Ban}
              label="ブロック中"
              value={data && `${data.blockedCount}件`}
              tone={data && data.blockedCount > 0 ? 'warning' : undefined}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <AreasCard data={data} loading={isPending} onManage={() => ui.setAreasOpen(true)} />
            <TrendCard data={data} loading={isPending} />
          </div>
        </div>
      )}
    </>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | undefined
  hint?: string
  tone?: 'danger' | 'warning'
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p
          className={cn(
            'text-2xl font-bold tracking-tight',
            tone === 'danger' && 'text-destructive',
            tone === 'warning' && 'text-warning',
          )}
        >
          {value}
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

const SEGMENTS = [
  { key: 'done', label: '完了', className: 'bg-success' },
  { key: 'doing', label: '進行中', className: 'bg-info' },
  { key: 'blocked', label: 'ブロック', className: 'bg-warning' },
  { key: 'rest', label: '未着手', className: 'bg-muted-foreground/25' },
] as const

function AreasCard({
  data,
  loading,
  onManage,
}: {
  data: Overview | undefined
  loading: boolean
  onManage: () => void
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Gauge className="size-4 text-primary" /> 領域別の進捗
        </h2>
        <ul
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
          aria-label="凡例"
        >
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-2 rounded-full', s.className)} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      {loading ? (
        <div className="grid gap-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !data || data.areas.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="まだ集計するタスクがありません"
          description="領域を作ってタスクを追加すると、進捗がここに表示されます。"
          action={<Button onClick={onManage}>領域を作る</Button>}
          className="border-0 py-8"
        />
      ) : (
        <ul className="grid gap-5">
          {data.areas.map((area) => {
            const rest = Math.max(0, area.total - area.done - area.doing - area.blocked)
            const counts = { done: area.done, doing: area.doing, blocked: area.blocked, rest }
            const percent = area.total === 0 ? 0 : Math.round((area.done / area.total) * 100)
            const summary = `${area.name}: 全${area.total}件、完了${area.done}、進行中${area.doing}、ブロック${area.blocked}、未着手${rest}`
            return (
              <li key={area.areaId ?? 'none'}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Link
                    href={area.areaId ? `/tasks?areaId=${area.areaId}` : '/tasks'}
                    className="flex min-w-0 items-center gap-2 text-sm font-medium hover:text-primary"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="truncate">{area.name}</span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {area.overdue > 0 && <Badge tone="danger">期限切れ {area.overdue}</Badge>}
                    <span className="tabular-nums">
                      {area.done}/{area.total} ({percent}%)
                    </span>
                  </div>
                </div>
                {/* セグメント間に 2px の隙間を空け、両端を丸める */}
                <div
                  role="img"
                  aria-label={summary}
                  className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
                >
                  {area.total === 0 ? (
                    <span className="h-full w-full bg-muted" />
                  ) : (
                    SEGMENTS.map((s) =>
                      counts[s.key] > 0 ? (
                        <span
                          key={s.key}
                          title={`${s.label} ${counts[s.key]}件`}
                          className={cn(
                            'h-full min-w-1 first:rounded-l-full last:rounded-r-full',
                            s.className,
                          )}
                          style={{ flexGrow: counts[s.key] }}
                        />
                      ) : null,
                    )
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function TrendCard({ data, loading }: { data: Overview | undefined; loading: boolean }) {
  const trend = data?.focusTrend ?? []
  const max = Math.max(60, ...trend.map((d) => d.minutes))
  // 目盛りは 3 本(0 / 中間 / 最大)。最大値はきりのよい数に切り上げる
  const top = Math.ceil(max / 30) * 30
  const total = trend.reduce((sum, d) => sum + d.minutes, 0)

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Timer className="size-4 text-primary" /> 集中時間(直近 7 日)
        </h2>
        {data && <span className="text-xs text-muted-foreground">合計 {formatMinutes(total)}</span>}
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-44" />
      ) : (
        <>
          <div
            className="relative mt-4 h-44 pl-8"
            role="img"
            aria-label={`直近7日の集中時間。合計${formatMinutes(total)}`}
          >
            {[1, 0.5, 0].map((ratio) => (
              <div
                key={ratio}
                className="absolute inset-x-0 flex items-center gap-2"
                style={{ bottom: `calc(1.5rem + ${ratio} * (100% - 1.5rem) - 0.5px)` }}
              >
                <span className="w-6 text-right text-[0.625rem] text-muted-foreground tabular-nums">
                  {Math.round(top * ratio)}
                </span>
                <span className={cn('h-px flex-1', ratio === 0 ? 'bg-border' : 'bg-border/50')} />
              </div>
            ))}

            <div className="relative flex h-full items-end gap-2 pb-6">
              {trend.map((day, index) => {
                const isToday = index === trend.length - 1
                const height = day.minutes === 0 ? 0 : Math.max(4, (day.minutes / top) * 100)
                return (
                  <div
                    key={day.date}
                    tabIndex={0}
                    aria-label={`${shortDate(day.date)}(${weekdayOf(day.date)}) ${day.minutes}分`}
                    className="group relative flex h-full flex-1 items-end justify-center rounded-md outline-offset-2"
                  >
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                    >
                      {shortDate(day.date)}({weekdayOf(day.date)}) {formatMinutes(day.minutes)}
                    </span>
                    <span
                      className={cn(
                        'w-full max-w-7 rounded-t-[4px] bg-primary transition-[height,opacity] duration-500 ease-out',
                        !isToday && 'opacity-60 group-hover:opacity-100',
                      )}
                      style={{ height: `${height}%` }}
                    />
                    <span
                      className={cn(
                        'absolute -bottom-6 text-[0.6875rem]',
                        isToday ? 'font-semibold text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {weekdayOf(day.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground">表で見る</summary>
            <table className="mt-2 w-full text-left">
              <caption className="sr-only">日別の集中時間</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-1 font-medium">
                    日付
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    分
                  </th>
                </tr>
              </thead>
              <tbody>
                {trend.map((day) => (
                  <tr key={day.date} className="border-t">
                    <td className="py-1">
                      {shortDate(day.date)}({weekdayOf(day.date)})
                    </td>
                    <td className="py-1 text-right tabular-nums">{day.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  )
}
