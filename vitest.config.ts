import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // E2E(Playwright)は別コマンド(pnpm test:e2e)で実行する
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // 一時 SQLite の作成や Prisma クライアントの読み込みは、負荷のある環境で遅くなる
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
