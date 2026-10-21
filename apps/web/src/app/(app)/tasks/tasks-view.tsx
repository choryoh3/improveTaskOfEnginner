'use client'

import { TASK_STATUSES, type Task, type TaskStatus } from '@app/shared'
import { ChevronDown, FolderKanban, ListChecks, Plus, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useUi } from '@/components/shell/ui-context'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { TaskListSkeleton, TaskRow } from '@/components/tasks/task-row'
import { useToggleDone } from '@/components/tasks/use-toggle-done'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/page'
import { errorMessage } from '@/lib/api'
import { areaById, useAreas, useDeleteTask, useTasks, useUpdateTask } from '@/lib/queries'
import { positionAfterMove } from '@/lib/reorder'
import { STATUS_LABEL } from '@/lib/task-ui'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | TaskStatus

// 「すべて」のときの表示順
const GROUP_ORDER: TaskStatus[] = ['doing', 'blocked', 'todo', 'done']

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function TasksView() {
  const ui = useUi()
  const params = useSearchParams()
  const toggleDone = useToggleDone()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [search, setSearch] = useState(params.get('q') ?? '')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [areaId, setAreaId] = useState(params.get('areaId') ?? '')
  const [tag, setTag] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const q = useDebounced(search.trim(), 250)
  const { data: areas } = useAreas()
  const areaMap = useMemo(() => areaById(areas), [areas])
  const tasks = useTasks({
    limit: 200,
    ...(q && { q }),
    ...(areaId && { areaId }),
    ...(tag && { tag }),
  })

  const sorted = useMemo(
    () => [...(tasks.data ?? [])].sort((a, b) => a.position - b.position),
    [tasks.data],
  )
  const counts = useMemo(() => {
    const result: Record<TaskStatus, number> = { todo: 0, doing: 0, blocked: 0, done: 0 }
    for (const task of sorted) result[task.status]++
    return result
  }, [sorted])
  const tagOptions = useMemo(() => {
    const names = new Set(sorted.flatMap((t) => t.tags))
    if (tag) names.add(tag)
    return [...names].sort()
  }, [sorted, tag])

  const groups = useMemo(() => {
    const visible = status === 'all' ? GROUP_ORDER : [status]
    return visible
      .map((value) => ({ status: value, items: sorted.filter((t) => t.status === value) }))
      .filter((group) => group.items.length > 0)
  }, [sorted, status])

  const hasFilter = Boolean(q || areaId || tag)

  function move(list: Task[], movingId: string, targetId: string) {
    const position = positionAfterMove(list, movingId, targetId)
    if (position === null) return
    updateTask.mutate(
      { id: movingId, patch: { position } },
      { onError: (e) => toast.error(errorMessage(e)) },
    )
  }

  function remove(task: Task) {
    if (!confirm(`「${task.title}」を削除しますか?`)) return
    deleteTask.mutate(task.id, {
      onSuccess: () => toast.success('削除しました'),
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  return (
    <>
      <PageHeader
        title="タスク"
        description={
          tasks.data ? `${counts.todo + counts.doing + counts.blocked}件が未完了` : undefined
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => ui.setAreasOpen(true)}>
              <FolderKanban /> 領域
            </Button>
            <Button size="sm" onClick={() => ui.openCapture({ areaId: areaId || null })}>
              <Plus /> 追加
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="タスクを検索"
              placeholder="タイトルで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            aria-label="領域で絞り込み"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="sm:w-48"
          >
            <option value="">すべての領域</option>
            {areas?.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </Select>
        </div>

        <div
          role="tablist"
          aria-label="状態"
          className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
        >
          {(['all', ...TASK_STATUSES] as const).map((value) => {
            const count = value === 'all' ? sorted.length : counts[value]
            return (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={status === value}
                onClick={() => setStatus(value)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  status === value
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'all' ? 'すべて' : STATUS_LABEL[value]}
                <span className="text-xs tabular-nums opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        {tagOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="タグで絞り込み">
            {tagOptions.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={tag === name}
                onClick={() => setTag(tag === name ? '' : name)}
                className={cn(
                  'cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  tag === name
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                #{name}
              </button>
            ))}
          </div>
        )}
      </div>

      {tasks.isError ? (
        <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />
      ) : tasks.isPending ? (
        <TaskListSkeleton rows={6} />
      ) : groups.length === 0 ? (
        hasFilter || status !== 'all' ? (
          <EmptyState
            icon={Search}
            title="条件に合うタスクがありません"
            description="検索や絞り込みを変えてみてください。"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setAreaId('')
                  setTag('')
                  setStatus('all')
                }}
              >
                条件をクリア
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ListChecks}
            title="最初のタスクを追加しましょう"
            description="C キーか、右上の「追加」から。⌘K のコマンドパレットからも追加できます。"
            action={
              <Button onClick={() => ui.openCapture()}>
                <Plus /> タスクを追加
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-5">
          {groups.map((group) => {
            const collapsed = group.status === 'done' && status === 'all' && !showDone
            return (
              <section key={group.status} aria-label={STATUS_LABEL[group.status]}>
                <h2 className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-muted-foreground">
                  {group.status === 'done' && status === 'all' ? (
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      onClick={() => setShowDone(!showDone)}
                      className="flex cursor-pointer items-center gap-1 hover:text-foreground"
                    >
                      <ChevronDown
                        className={cn('size-3.5 transition-transform', collapsed && '-rotate-90')}
                      />
                      {STATUS_LABEL[group.status]}
                    </button>
                  ) : (
                    STATUS_LABEL[group.status]
                  )}
                  <span className="tabular-nums opacity-60">{group.items.length}</span>
                </h2>
                {!collapsed && (
                  <ul className="grid gap-0.5">
                    {group.items.map((task, index) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        area={task.areaId ? areaMap.get(task.areaId) : undefined}
                        onToggle={toggleDone}
                        onEdit={setEditing}
                        onFocus={(t) => ui.openFocus(t.id)}
                        onDelete={remove}
                        reorder={{
                          canMoveUp: index > 0,
                          canMoveDown: index < group.items.length - 1,
                          onMove: (direction) => {
                            const target = group.items[index + direction]
                            if (target) move(group.items, task.id, target.id)
                          },
                          dragging: dragId === task.id,
                          dropTarget: overId === task.id && dragId !== task.id,
                          dragProps: {
                            draggable: !task.id.startsWith('temp-'),
                            onDragStart: (e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              setDragId(task.id)
                            },
                            onDragOver: (e) => {
                              // 同じグループ内でのみ並べ替えられる
                              if (dragId && group.items.some((t) => t.id === dragId)) {
                                e.preventDefault()
                                setOverId(task.id)
                              }
                            },
                            onDragLeave: () =>
                              setOverId((current) => (current === task.id ? null : current)),
                            onDrop: (e) => {
                              e.preventDefault()
                              if (dragId) move(group.items, dragId, task.id)
                              setDragId(null)
                              setOverId(null)
                            },
                            onDragEnd: () => {
                              setDragId(null)
                              setOverId(null)
                            },
                          },
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      <TaskDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(undefined)}
        task={editing}
      />
    </>
  )
}
