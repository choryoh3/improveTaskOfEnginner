'use client'

import { Loader2, MailCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Mode = 'signin' | 'signup'

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません。',
  'User already registered': 'このメールアドレスはすでに登録されています。ログインしてください。',
}

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const supabase = createClient()

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        // メール確認が有効なプロジェクトでは、セッションは確認後に作られる
        if (!data.session) {
          setConfirmationSent(true)
          return
        }
      }
      router.replace('/')
      router.refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : '認証に失敗しました'
      setError(MESSAGES[message] ?? message)
    } finally {
      setPending(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="space-y-4 text-center" role="status">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MailCheck className="size-6" />
        </div>
        <h2 className="text-xl font-semibold">確認メールを送信しました</h2>
        <p className="text-sm text-muted-foreground">
          {email} に届いたメールのリンクを開くと、登録が完了します。
        </p>
        <Button variant="ghost" onClick={() => setConfirmationSent(false)}>
          戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'signin' ? 'おかえりなさい' : 'はじめましょう'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'signin' ? 'アカウントにログインします。' : 'アカウントを作成します。'}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="認証方法"
        className="grid grid-cols-2 rounded-lg bg-muted p-1"
      >
        {(['signin', 'signup'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value)
              setError(null)
            }}
            className={cn(
              'cursor-pointer rounded-md py-1.5 text-sm font-medium transition-all',
              mode === value
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value === 'signin' ? 'ログイン' : '新規登録'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        <div className="space-y-1.5">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
          />
          {mode === 'signup' && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              8 文字以上で入力してください。
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {mode === 'signin' ? 'ログイン' : 'アカウントを作成'}
        </Button>
      </form>
    </div>
  )
}
