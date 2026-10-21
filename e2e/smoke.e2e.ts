import { expect, test } from '@playwright/test'

// スモーク: 秘密情報(実際の Supabase キー)がなくても動く。CI で毎回実行する。

test('死活監視 /api/health は認証なしで応答する', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

test('未ログインの API は 401 を統一エラー形式で返す', async ({ request }) => {
  for (const path of ['/api/tasks', '/api/areas', '/api/overview']) {
    const res = await request.get(path)
    expect(res.status(), path).toBe(401)
    expect(await res.json()).toEqual({
      error: { code: 'unauthorized', message: '認証が必要です' },
    })
  }
})

test('未ログインで画面を開くと /login へリダイレクトされる', async ({ request }) => {
  // ブラウザを使わず、リダイレクトそのもの(307 と Location)を確認する
  for (const path of ['/', '/tasks', '/overview', '/reports', '/snippets']) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status(), path).toBe(307)
    expect(res.headers().location, path).toMatch(/\/login$/)
  }
})

test('ログイン画面が表示される', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'おかえりなさい' })).toBeVisible()
})

test('ログイン画面で新規登録に切り替えられ、入力欄が使える', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('tab', { name: '新規登録' }).click()
  await expect(page.getByRole('heading', { name: 'はじめましょう' })).toBeVisible()

  const submit = page.getByRole('button', { name: 'アカウントを作成' })
  await page.getByLabel('メールアドレス').fill('someone@example.com')
  await page.getByLabel('パスワード').fill('long-enough-password')
  await expect(submit).toBeEnabled()
})
