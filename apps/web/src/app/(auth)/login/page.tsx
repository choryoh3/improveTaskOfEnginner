import type { Metadata } from 'next'
import { LogoMark } from '@/components/logo'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'ログイン' }

const POINTS = [
  ['俯瞰', '領域ごとの進捗と今週の負荷を、1 画面で。'],
  ['集中', 'ポモドーロをタスクに紐づけて、時間を記録。'],
  ['振り返り', '日報と週次レビューを、ワンクリックで生成。'],
]

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/15 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <LogoMark className="[&_rect:first-child]:fill-white/20" />
          <span className="text-lg font-semibold tracking-tight">improveTaskOfEnginner</span>
        </div>
        <div className="relative max-w-lg space-y-8">
          <h1 className="text-4xl leading-tight font-bold tracking-tight">
            エンジニアの一日を、
            <br />
            ひとつのコックピットに。
          </h1>
          <ul className="space-y-4">
            {POINTS.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                  ✓
                </span>
                <p className="text-primary-foreground/90">
                  <strong className="font-semibold text-primary-foreground">{title}</strong>
                  <span className="mx-2 opacity-50">/</span>
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">
          ⌘K / Ctrl+K で、どこからでも素早く操作できます。
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-up space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <LogoMark />
            <span className="text-lg font-semibold tracking-tight">improveTaskOfEnginner</span>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  )
}
