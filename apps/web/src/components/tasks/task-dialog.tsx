'use client'

import { taskCreateSchema, TASK_STATUSES, type Task, type TaskStatus } from '@app/shared'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { errorMessage } from '@/lib/api'
import { useAreas, useCreateTask, useUpdateTask } from '@/lib/queries'
import {
  dateInputToIso,
  isoToDateInput,
  parseTags,
  PRIORITY_LABEL,
  STATUS_LABEL,
} from '@/lib/task-ui'
import { cn } from '@/lib/utils'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 指定すると編集、省略すると新規作成 */
  task?: Task
  defaults?: { title?: string; areaId?: string | null }
}

export function TaskDialog({ open, onOpenChange, task, defaults }: TaskDialogProps) {
  // 開くたびにフォームを初期化するため、中身を別コンポーネントにして key で作り直す
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="task-dialog-description">
        {open && (
          <TaskForm
            key={task?.id ?? 'new'}
            task={task}
            defaults={defaults}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({
  task,
  defaults,
  onDone,
}: {
  task?: Task
  defaults?: TaskDialogProps['defaults']
  onDone: () => void
}) {
  const { data: areas } = useAreas()
  const create = useCreateTask()
  const update = useUpdateTask()
  const editing = Boolean(task)

  const [title, setTitle] = useState(task?.title ?? defaults?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [areaId, setAreaId] = useState(task?.areaId ?? defaults?.areaId ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState(task?.priority ?? 1)
  const [due, setDue] = useState(isoToDateInput(task?.dueDate ?? null))
  const [estimate, setEstimate] = useState(task?.estimateMin ? String(task.estimateMin) : '')
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [error, setError] = useState<string | null>(null)

  const pending = create.isPending || update.isPending

  async function submit(event?: React.FormEvent) {
    event?.preventDefault()
    setError(null)

    const input = {
      title,
      notes: notes.trim() || null,
      areaId: areaId || null,
      priority,
      dueDate: dateInputToIso(due),
      estimateMin: estimate ? Number(estimate) : null,
      tags: parseTags(tags),
      ...(editing && { status }),
    }
    const parsed = taskCreateSchema.safeParse(input)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '入力内容を確認してください')
      return
    }

    try {
      if (task) await update.mutateAsync({ id: task.id, patch: parsed.data })
      else await create.mutateAsync(parsed.data)
      toast.success(editing ? 'タスクを更新しました' : 'タスクを追加しました')
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit()
      }}
      className="grid gap-4"
    >
      <div className="space-y-1">
        <DialogTitle>{editing ? 'タスクを編集' : 'タスクを追加'}</DialogTitle>
        <DialogDescription id="task-dialog-description">
          {editing ? '内容を変更して保存します。' : '⌘/Ctrl + Enter でそのまま追加できます。'}
        </DialogDescription>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-title">タイトル</Label>
        <Input
          id="task-title"
          autoFocus
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="何をやりますか?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="task-area">領域</Label>
          <Select id="task-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">未分類</option>
            {areas?.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </Select>
        </div>
        {editing ? (
          <div className="space-y-1.5">
            <Label htmlFor="task-status">状態</Label>
            <Select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="task-due">期限</Label>
            <Input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        )}
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">優先度</legend>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {PRIORITY_LABEL.map((label, value) => (
            <button
              key={label}
              type="button"
              aria-pressed={priority === value}
              onClick={() => setPriority(value)}
              className={cn(
                'cursor-pointer rounded-md py-1.5 text-sm font-medium transition-all',
                priority === value
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {editing && (
          <div className="space-y-1.5">
            <Label htmlFor="task-due-edit">期限</Label>
            <Input
              id="task-due-edit"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="task-estimate">見積もり(分)</Label>
          <Input
            id="task-estimate"
            type="number"
            min={1}
            max={1440}
            inputMode="numeric"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="30"
          />
        </div>
        <div className={cn('space-y-1.5', !editing && 'sm:col-span-2')}>
          <Label htmlFor="task-tags">タグ</Label>
          <Input
            id="task-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="レビュー, バグ(カンマ区切り)"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-notes">メモ</Label>
        <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
        <Button type="submit" disabled={pending || !title.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          {editing ? '保存' : '追加'}
        </Button>
      </div>
    </form>
  )
}
