'use client'

import { Coffee, Loader2, Play, Timer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useUi } from '@/components/shell/ui-context'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { errorMessage } from '@/lib/api'
import { useStartFocus, useTasks } from '@/lib/queries'
import { cn } from '@/lib/utils'

const PRESETS = [
  { label: '25分', minutes: 25, kind: 'focus' as const },
  { label: '50分', minutes: 50, kind: 'focus' as const },
  { label: '休憩 5分', minutes: 5, kind: 'break' as const },
  { label: '休憩 15分', minutes: 15, kind: 'break' as const },
]

export function FocusDialog() {
  const { focusOpen, closeFocus, focusTaskId } = useUi()
  return (
    <Dialog open={focusOpen} onOpenChange={(open) => !open && closeFocus()}>
      <DialogContent aria-describedby="focus-dialog-description" className="max-w-md">
        {focusOpen && <FocusForm initialTaskId={focusTaskId} onDone={closeFocus} />}
      </DialogContent>
    </Dialog>
  )
}

function FocusForm({
  initialTaskId,
  onDone,
}: {
  initialTaskId: string | null
  onDone: () => void
}) {
  const start = useStartFocus()
  const { data: tasks } = useTasks({ limit: 200 })
  const openTasks = (tasks ?? []).filter((task) => task.status !== 'done')

  const [taskId, setTaskId] = useState(initialTaskId ?? '')
  const [presetIndex, setPresetIndex] = useState(0)
  const preset = PRESETS[presetIndex]!

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await start.mutateAsync({
        taskId: taskId || null,
        kind: preset.kind,
        plannedSec: preset.minutes * 60,
      })
      toast.success(
        preset.kind === 'focus' ? '集中モード開始。がんばりましょう!' : '休憩を開始しました',
      )
      onDone()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="space-y-1">
        <DialogTitle className="flex items-center gap-2">
          <Timer className="size-5 text-primary" /> フォーカスを開始
        </DialogTitle>
        <DialogDescription id="focus-dialog-description">
          タスクに紐づけると、集中時間が日報に反映されます。
        </DialogDescription>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="focus-task">タスク(任意)</Label>
        <Select id="focus-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">タスクなし</option>
          {openTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">時間</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={presetIndex === index}
              onClick={() => setPresetIndex(index)}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-all',
                presetIndex === index
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              {item.kind === 'break' && <Coffee className="size-3.5" />}
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
        <Button type="submit" disabled={start.isPending}>
          {start.isPending ? <Loader2 className="animate-spin" /> : <Play />}
          開始
        </Button>
      </div>
    </form>
  )
}
