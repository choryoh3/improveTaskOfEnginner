import { getDb as defaultGetDb, resolveDbTarget, type Db } from '@app/db'
import { reportQuerySchema } from '@app/shared'
import { Hono } from 'hono'
import type { TokenVerifier } from './auth/verify'
import type { AppEnv } from './env'
import { describeDatabaseUrl } from './diagnostics'
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
  /** 省略時は @app/db の getDb(DB_TARGET で SQLite / Postgres を切替) */
  getDb?: () => Promise<Db>
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
  const getDb = options.getDb ?? defaultGetDb

  return (
    new Hono<AppEnv>()
      .basePath('/api')
      .onError(handleError)
      // 認証不要(死活監視用)。`use` より前に登録するため、認証の対象外になる。
      .get('/health', (c) => c.json({ ok: true }, 200))
      // DB との疎通確認(デプロイ後の確認用)。接続情報や詳細なエラーは返さない。
      .get('/health/db', async (c) => {
        const target = resolveDbTarget()
        try {
          await (
            await getDb()
          ).$queryRaw`select 1`
          return c.json({ ok: true, db: 'up' as const, target }, 200)
        } catch (error) {
          console.error('DB health check failed:', error)
          // 開発中だけ、アプリが受け取った接続先(パスワードを除く)を添える。本番では返さない。
          const connection =
            process.env.NODE_ENV !== 'production' && target === 'postgres'
              ? { connection: describeDatabaseUrl(process.env.DATABASE_URL) }
              : {}
          return c.json({ ok: false, db: 'down' as const, target, ...connection }, 503)
        }
      })
      .use('*', authenticate({ ...options, getDb, now, tzOffsetMin }))
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
