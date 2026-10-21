import { expect, test } from '@playwright/test'

// 通し確認: ログイン → タスク追加 → 完了 → フォーカス → 日報。
// 実際の Supabase に接続するため、テスト専用アカウントを渡したときだけ動く(CI では実行されない)。
//   E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
// データは実行ごとに一意なタイトルで作り、自分のアカウント内だけで完結させる。
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ')

test('ログインから日報の生成までが通る', async ({ page }) => {
  const title = `E2E ${Date.now()}`

  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(email!)
  await page.getByLabel('パスワード').fill(password!)
  await page.getByRole('button', { name: 'ログイン', exact: true }).click()
  await expect(page).toHaveURL('/')

  // Today からタスクを追加
  const quickAdd = page.getByLabel('今日のタスクを追加')
  await quickAdd.fill(title)
  await quickAdd.press('Enter')
  await expect(page.getByRole('button', { name: title, exact: true }).first()).toBeVisible()

  // 完了にする(トーストに「元に戻す」が出る)
  await page.getByRole('checkbox', { name: `${title} を完了にする` }).click()
  await expect(page.getByText('完了しました').first()).toBeVisible()

  // フォーカスを開始して終了(F キー)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('f')
  await page.getByRole('dialog').getByRole('button', { name: '開始' }).click()
  await expect(page.getByRole('timer').first()).toBeVisible()
  await page.keyboard.press('f')
  await expect(page.getByText('お疲れさまでした。記録しました').first()).toBeVisible()

  // 日報に完了タスクが載る
  await page.goto('/reports')
  await expect(page.locator('article')).toContainText(title)
})
