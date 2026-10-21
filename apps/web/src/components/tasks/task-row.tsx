'use client'

import type { Area, Task } from '@app/shared'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Flag,
  GripVertical,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { dueInfo, formatMinutes, PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE } from '@/lib/task-ui'
import { cn } from '@/lib/utils'

export interface TaskRowProps {
  task: Task
  area?: Area
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onFocus?: (task: Task) => void
  onDelete?: (task: Task) => void
  /** 並べ替え(指定された行だけドラッグ・上下ボタンを出す) */
  reorder?: {
    onMove: (direction: -1 | 1) => void
    canMoveUp: boolean
    canMoveDown: boolean
    dragProps: React.HTMLAttributes<HTMLLIElement>
    dragging: boolean
    dropTarget: boolean
  }
  /** 状態バッジを出すか(グループ見出しが状態を示している画面では不要) */
  showStatus?: boolean
}

export function TaskCheckbox({
  checked,
  title,
  onToggle,
}: {
  checked: boolean
  title: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${title} を${checked ? '未完了に戻す' : '完了にする'}`}
      onClick={onToggle}
      className={cn(
        'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-200',
        checked
          ? 'border-success bg-success text-white'
          : 'border-input bg-card hover:border-primary hover:bg-accent',
      )}
    >
      {/* key で状態が変わるたびに作り直し、チェック時だけ pop アニメーションを再生する */}
      {checked && <Check key="check" className="size-3 animate-pop" strokeWidth={3.5} />}
    </button>
  )
}

export function TaskRow({
  task,
  area,
  onToggle,
  onEdit,
  onFocus,
  onDelete,
  reorder,
  showStatus = false,
}: TaskRowProps) {
  const done = task.status === 'done'
  const due = dueInfo(task)
  const pending = task.id.startsWith('temp-')

  return (
    <li
      {...reorder?.dragProps}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-border hover:bg-card hover:shadow-soft',
        pending && 'opacity-60',
        reorder?.dragging && 'opacity-40',
        reorder?.dropTarget && 'border-primary bg-accent/50',
      )}
    >
      {reorder && (
        <GripVertical
          aria-hidden="true"
          className="mt-0.5 -ml-1.5 hidden size-4 shrink-0 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground sm:block"
        />
      )}
      <div className="pt-0.5">
        <TaskCheckbox checked={done} title={task.title} onToggle={() => onToggle(task)} />
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className={cn(
            'block max-w-full cursor-pointer truncate text-left text-sm font-medium transition-colors hover:text-primary',
            done && 'text-muted-foreground line-through decoration-muted-foreground/50',
          )}
        >
          {task.title}
        </button>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showStatus && <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>}
          {area && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: area.color }}
              />
              {area.name}
            </span>
          )}
          {task.priority >= 2 && (
            <Badge tone={task.priority === 3 ? 'danger' : 'warning'}>
              <Flag className="size-3" /> {PRIORITY_LABEL[task.priority]}
            </Badge>
          )}
          {due && (
            <Badge
              tone={
                due.tone === 'neutral' ? 'neutral' : due.tone === 'danger' ? 'danger' : 'warning'
              }
            >
              {due.label}
            </Badge>
          )}
          {task.estimateMin && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {formatMinutes(task.estimateMin)}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="text-primary/80">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
        {reorder && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="上へ移動"
              disabled={!reorder.canMoveUp}
              onClick={() => reorder.onMove(-1)}
              className="max-sm:hidden"
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="下へ移動"
              disabled={!reorder.canMoveDown}
              onClick={() => reorder.onMove(1)}
              className="max-sm:hidden"
            >
              <ArrowDown />
            </Button>
          </>
        )}
        {onFocus && !done && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="フォーカスを開始"
            onClick={() => onFocus(task)}
          >
            <Play />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="編集"
          onClick={() => onEdit(task)}
          className="max-sm:hidden"
        >
          <Pencil />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="削除"
            onClick={() => onDelete(task)}
            className="max-sm:hidden"
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  )
}

export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-1" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="size-5 animate-pulse rounded-full bg-muted" />
          <div
            className="h-4 flex-1 animate-pulse rounded bg-muted"
            style={{ maxWidth: `${70 - i * 8}%` }}
          />
        </div>
      ))}
    </div>
  )
}
