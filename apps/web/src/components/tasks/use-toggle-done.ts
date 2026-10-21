'use client'

import type { Task } from '@app/shared'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { useUpdateTask } from '@/lib/queries'

/** 完了 / 未完了を切り替える。完了時は「元に戻す」付きのトーストを出す。 */
export function useToggleDone() {
  const update = useUpdateTask()

  return (task: Task) => {
    const completing = task.status !== 'done'
    update.mutate(
      { id: task.id, patch: { status: completing ? 'done' : 'todo' } },
      {
        onSuccess: () => {
          if (!completing) return
          toast.success('完了しました', {
            description: task.title,
            action: {
              label: '元に戻す',
              onClick: () => update.mutate({ id: task.id, patch: { status: task.status } }),
            },
          })
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }
}
