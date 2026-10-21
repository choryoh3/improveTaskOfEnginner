'use client'

import type { Task } from '@app/shared'
import {
  CalendarCheck,
  Check,
  Flame,
  Hourglass,
  ListPlus,
  PartyPopper,
  Play,
  Plus,
  Timer,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FocusPanel } from '@/components/focus/focus-panel'
import { useUi } from '@/components/shell/ui-context'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { TaskListSkeleton, TaskRow } from '@/components/tasks/task-row'
import { useToggleDone } from '@/components/tasks/use-toggle-done'
import { Button } from '@/components/ui/button'
import { Celebrate } from '@/components/ui/celebrate'
import { Input } from '@/components/ui/input'
import { Badge, Card, Skeleton } from '@/components/ui/misc'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/page'
import { errorMessage } from '@/lib/api'
import {
  areaById,
  useAreas,
  useCreateTask,
  useOverview,
  useTasks,
  useUpdateTask,
} from '@/lib/queries'
import { dateInputToIso, dueInfo, formatMinutes, PRIORITY_LABEL } from '@/lib/task-ui'
import { useFocusTimer } from '@/lib/use-focus-timer'
import { cn } from '@/lib/utils'

function greeting(hour: number) {
  if (hour < 5) return 'お疲れさまです'
  if (hour < 11) return 'おはようございます'
  if (hour < 18) return 'こんにちは'
  return 'こんばんは'
}

const todayInput = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 「次にやること」の選び方: 進行中 > 期限切れ > 今日が期限 > 優先度 > 並び順 */
function pickNext(candidates: Task[]): Task | undefined {
  const rank = (task: Task) => {
    if (task.status === 'doing') return 0
    const due = dueInfo(task)
    if (due?.tone === 'danger') return 1
    if (due?.label === '今日') return 2
    return 3
  }
  return [...candidates].sort(
    (a, b) => rank(a) - rank(b) || b.priority - a.priority || a.position - b.position,
  )[0]
}

export function TodayView() {
  const ui = useUi()
  const { session } = useFocusTimer()
  const toggleDone = useToggleDone()
  const updateTask = useUpdateTask()
  const [editing, setEditing] = useState<Task | undefined>()

  const { data: areas } = useAreas()
  const areaMap = useMemo(() => areaById(areas), [areas])
  const overview = useOverview()

  // サーバー側の「今日」の境界(タイムゾーン設定)に合わせるため、期限の絞り込みは API に任せる
  const doing = useTasks({ status: 'doing', limit: 50 })
  const overdue = useTasks({ due: 'overdue', limit: 50 })
  const dueToday = useTasks({ due: 'today', limit: 50 })
  const backlog = useTasks({ status: 'todo', limit: 30 })

  const loading = [doing, overdue, dueToday, backlog].some((q) => q.isPending)
  const failed = [doing, overdue, dueToday, backlog].find((q) => q.isError)

  const todayList = useMemo(() => {
    const seen = new Set<string>()
    const merged: Task[] = []
    for (const task of [
      ...(doing.data ?? []),
      ...(overdue.data ?? []),
      ...(dueToday.data ?? []).filter((t) => t.status !== 'done'),
    ]) {
      if (!seen.has(task.id)) {
        seen.add(task.id)
        merged.push(task)
      }
    }
    return merged
  }, [doing.data, overdue.data, dueToday.data])

  const backlogCandidates = useMemo(() => {
    const inToday = new Set(todayList.map((t) => t.id))
    return (backlog.data ?? []).filter((t) => !inToday.has(t.id)).slice(0, 5)
  }, [backlog.data, todayList])

  const next = pickNext([...todayList, ...backlogCandidates])
  const doneToday = (dueToday.data ?? []).filter((t) => t.status === 'done').length

  // 今日の予定が(このセッション中に)すべて片付いたら、お祝いする
  const previousCount = useRef<number | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  useEffect(() => {
    if (loading) return
    if (previousCount.current !== null && previousCount.current > 0 && todayList.length === 0) {
      setCelebrating(true)
      const timer = setTimeout(() => setCelebrating(false), 2000)
      return () => clearTimeout(timer)
    }
    previousCount.current = todayList.length
  }, [loading, todayList.length])

  const now = new Date()
  const todayFocusMin = overview.data?.focusTrend.at(-1)?.minutes ?? 0

  return (
    <>
      <PageHeader
        title={greeting(now.getHours())}
        description={now.toLocaleDateString('ja-JP', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      />

      <div className="grid gap-6">
        <section aria-label="今日の状況" className="grid grid-cols-3 gap-3">
          <Stat
            icon={Timer}
            label="今日の集中"
            value={overview.isPending ? undefined : formatMinutes(todayFocusMin)}
          />
          <Stat
            icon={CalendarCheck}
            label="今日の予定"
            value={loading ? undefined : `${todayList.length}件`}
            hint={doneToday > 0 ? `完了 ${doneToday}` : undefined}
          />
          <Stat
            icon={Flame}
            label="期限切れ"
            value={overdue.isPending ? undefined : `${overdue.data?.length ?? 0}件`}
            tone={overdue.data?.length ? 'danger' : undefined}
          />
        </section>

        {session ? (
          <FocusPanel />
        ) : (
          next && (
            <NextUpCard
              task={next}
              areaName={next.areaId ? areaMap.get(next.areaId)?.name : undefined}
              onFocus={() => {
                if (next.status === 'todo')
                  updateTask.mutate({ id: next.id, patch: { status: 'doing' } })
                ui.openFocus(next.id)
              }}
              onDone={() => toggleDone(next)}
              onEdit={() => setEditing(next)}
            />
          )
        )}

        {failed && (
          <ErrorState
            message={errorMessage(failed.error)}
            onRetry={() => [doing, overdue, dueToday, backlog].forEach((q) => void q.refetch())}
          />
        )}

        <section aria-labelledby="today-heading" className="relative">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="today-heading" className="text-sm font-semibold text-muted-foreground">
              今日やること
            </h2>
          </div>
          <QuickAdd />
          <div className="mt-2">
            {loading ? (
              <TaskListSkeleton />
            ) : todayList.length === 0 ? (
              celebrating || doneToday > 0 ? (
                <EmptyState
                  icon={PartyPopper}
                  title="今日の予定はすべて完了です"
                  description="お疲れさまでした。余裕があれば、下の候補から次の一歩を選べます。"
                />
              ) : (
                <EmptyState
                  icon={ListPlus}
                  title="今日の予定はまだありません"
                  description="上の入力欄に書いて Enter。バックログから選ぶこともできます。"
                />
              )
            ) : (
              <ul className="grid gap-0.5" aria-label="今日のタスク">
                {todayList.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    area={task.areaId ? areaMap.get(task.areaId) : undefined}
                    showStatus
                    onToggle={toggleDone}
                    onEdit={setEditing}
                    onFocus={(t) => ui.openFocus(t.id)}
                  />
                ))}
              </ul>
            )}
          </div>
          <Celebrate active={celebrating} />
        </section>

        {backlogCandidates.length > 0 && (
          <section aria-labelledby="backlog-heading">
            <h2 id="backlog-heading" className="mb-2 text-sm font-semibold text-muted-foreground">
              バックログから選ぶ
            </h2>
            <ul className="grid gap-0.5" aria-label="バックログ">
              {backlogCandidates.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-card hover:shadow-soft"
                >
                  <button
                    type="button"
                    onClick={() => setEditing(task)}
                    className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm"
                  >
                    {task.title}
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateTask.mutate(
                        { id: task.id, patch: { dueDate: dateInputToIso(todayInput()) } },
                        { onError: (e) => toast.error(errorMessage(e)) },
                      )
                    }
                  >
                    <Plus /> 今日やる
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <TaskDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(undefined)}
        task={editing}
      />
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Timer
  label: string
  value: string | undefined
  hint?: string
  tone?: 'danger'
}) {
  return (
    <Card className="p-3.5 sm:p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p
          className={cn(
            'text-xl font-bold tracking-tight sm:text-2xl',
            tone === 'danger' && 'text-destructive',
          )}
        >
          {value}
          {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
        </p>
      )}
    </Card>
  )
}

function NextUpCard({
  task,
  areaName,
  onFocus,
  onDone,
  onEdit,
}: {
  task: Task
  areaName?: string
  onFocus: () => void
  onDone: () => void
  onEdit: () => void
}) {
  const due = dueInfo(task)
  return (
    <Card className="animate-fade-up overflow-hidden bg-gradient-to-br from-accent/70 via-card to-card p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
        <Hourglass className="size-3.5" /> 次にやること
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="block max-w-full cursor-pointer text-left text-xl font-semibold tracking-tight hover:text-primary sm:text-2xl"
      >
        {task.title}
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {areaName && <Badge tone="primary">{areaName}</Badge>}
        {task.priority >= 2 && (
          <Badge tone={task.priority === 3 ? 'danger' : 'warning'}>
            {PRIORITY_LABEL[task.priority]}
          </Badge>
        )}
        {due && (
          <Badge
            tone={due.tone === 'neutral' ? 'neutral' : due.tone === 'danger' ? 'danger' : 'warning'}
          >
            {due.label}
          </Badge>
        )}
        {task.estimateMin && <span>見積もり {formatMinutes(task.estimateMin)}</span>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onFocus}>
          <Play /> フォーカス開始
        </Button>
        <Button variant="outline" onClick={onDone}>
          <Check /> 完了にする
        </Button>
      </div>
    </Card>
  )
}

/** Today 用のインライン追加。期限は「今日」にする。 */
function QuickAdd() {
  const create = useCreateTask()
  const [title, setTitle] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    setTitle('')
    create.mutate(
      { title: value, dueDate: dateInputToIso(todayInput()) },
      { onError: (e) => toast.error(errorMessage(e)) },
    )
  }

  return (
    <form onSubmit={submit} className="relative">
      <Plus
        aria-hidden="true"
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="今日のタスクを追加"
        placeholder="今日やることを書いて Enter"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-11 pl-9"
      />
    </form>
  )
}
