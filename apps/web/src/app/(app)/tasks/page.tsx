import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TasksView } from './tasks-view'

export const metadata: Metadata = { title: 'タスク' }

export default function TasksPage() {
  // useSearchParams を使うクライアントコンポーネントは Suspense で包む
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  )
}
