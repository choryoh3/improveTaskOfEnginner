'use client'

import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/page'

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="問題が発生しました"
      description="一時的な問題かもしれません。もう一度お試しください。"
      action={<Button onClick={reset}>再読み込み</Button>}
    />
  )
}
