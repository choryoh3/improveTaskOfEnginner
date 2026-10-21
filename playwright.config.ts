import { defineConfig } from '@playwright/test'

const port = 3100

// 事前に `pnpm build` が必要(本番ビルドを起動して試す。dev より速く、挙動も本番に近い)。
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    // ローカルでは入っている Chrome を使う(ブラウザのダウンロード不要)。CI では Playwright 同梱の Chromium。
    channel: process.env.CI ? undefined : 'chrome',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm --filter @app/web exec next start -p ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
