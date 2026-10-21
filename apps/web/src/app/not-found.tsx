import { Compass } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/page'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="ページが見つかりません"
        description="URL が正しいか確認してください。"
        action={
          <Link href="/" className={buttonVariants()}>
            Today に戻る
          </Link>
        }
      />
    </main>
  )
}
