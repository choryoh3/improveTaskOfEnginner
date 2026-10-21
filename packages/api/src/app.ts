import type { Db } from '@app/db'
import { reportQuerySchema } from '@app/shared'
import { Hono } from 'hono'
import type { TokenVerifier } from './auth/verify'
import type { AppEnv } from './env'
import { handleError } from './errors'
import { authenticate } from './middleware/auth'
import { areaRoutes } from './routes/areas'
import { focusRoutes } from './routes/focus'
import { snippetRoutes } from './routes/snippets'
import { taskRoutes } from './routes/tasks'
import { buildOverview } from './services/overview'
import { buildReport } from './services/report'
import { validate } from './validate'

export interface AppOptions {
  verifyToken: TokenVerifier
  getDb: () => Promise<Db>
  now?: () => Date
  /** 「今日」「今週」の境界に使う固定オフセット(分)。JST は 540。既定は 0(UTC) */
  tzOffsetMin?: number
}

/**
 * Hono アプリ。依存(認証・DB・時計)は引数で受け取り、テストと本番で差し替える。
 * メソッドチェーンで定義し、戻り値の型を AppType として hc クライアントに公開する。
 */
export function createApp(options: AppOptions) {
  const now = options.now ?? (() => new Date())
  const tzOffsetMin = options.tzOffsetMin ?? 0

  return (
    new Hono<AppEnv>()
      .basePath('/api')
      .onError(handleError)
      // 認証不要(死活監視用)。`use` より前に登録するため、認証の対象外になる。
      .get('/health', (c) => c.json({ ok: true }, 200))
      .use('*', authenticate({ ...options, now, tzOffsetMin }))
      .route('/areas', areaRoutes)
      .route('/tasks', taskRoutes)
      .route('/focus', focusRoutes)
      .route('/snippets', snippetRoutes)
      .get('/overview', async (c) =>
        c.json(await buildOverview(c.var.repos, now(), tzOffsetMin), 200),
      )
      .get('/reports', validate('query', reportQuerySchema), async (c) =>
        c.json(await buildReport(c.var.repos, c.req.valid('query'), now(), tzOffsetMin), 200),
      )
  )
}

export type App = ReturnType<typeof createApp>
