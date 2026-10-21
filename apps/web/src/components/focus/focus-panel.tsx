'use client'

import { Coffee, Square, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/misc'
import { errorMessage } from '@/lib/api'
import { useStopFocus, useTasks } from '@/lib/queries'
import { formatClock, useFocusTimer } from '@/lib/use-focus-timer'
import { cn } from '@/lib/utils'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** 進行中のフォーカスセッションを、大きなリングタイマーで表示する */
export function FocusPanel() {
  const { session, remainingSec, elapsedSec, progress, isOver } = useFocusTimer()
  const stop = useStopFocus()
  const { data: tasks } = useTasks({ limit: 200 })

  if (!session) return null
  const task = tasks?.find((t) => t.id === session.taskId)
  const isBreak = session.kind === 'break'

  return (
    <Card className="flex animate-fade-up flex-col items-center gap-5 overflow-hidden bg-gradient-to-br from-accent/60 to-card p-6 sm:flex-row sm:gap-8 sm:p-8">
      <div className="relative size-36 shrink-0" role="timer" aria-live="off">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="8" className="stroke-muted" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className={cn(
              'transition-[stroke-dashoffset] duration-1000 ease-linear',
              isOver ? 'stroke-success' : isBreak ? 'stroke-info' : 'stroke-primary',
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight tabular-nums">
            {formatClock(remainingSec)}
          </span>
          <span className="text-xs text-muted-foreground">
            {isOver ? '予定時間に到達' : '残り'}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          {isBreak ? <Coffee className="size-4" /> : <Timer className="size-4" />}
          {isBreak ? '休憩中' : '集中中'}
        </div>
        <p className="max-w-full truncate text-xl font-semibold">
          {task?.title ?? (isBreak ? 'ゆっくり休みましょう' : 'タスクを選ばずに集中')}
        </p>
        <p className="text-sm text-muted-foreground">
          経過 {Math.floor(elapsedSec / 60)}分 / 予定 {Math.round(session.plannedSec / 60)}分
        </p>
        <Button
          variant={isOver ? 'default' : 'outline'}
          disabled={stop.isPending}
          onClick={() =>
            stop.mutate(session.id, {
              onSuccess: () => toast.success('お疲れさまでした。記録しました'),
              onError: (e) => toast.error(errorMessage(e)),
            })
          }
        >
          <Square /> 終了して記録
        </Button>
      </div>
    </Card>
  )
}
