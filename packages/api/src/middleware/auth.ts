import { createRepositories, type Db } from '@app/db'
import { createMiddleware } from 'hono/factory'
import { parseBearerToken, type TokenVerifier } from '../auth/verify'
import type { AppEnv } from '../env'
import { errorBody } from '../errors'

export interface AuthOptions {
  verifyToken: TokenVerifier
  getDb: () => Promise<Db>
  now?: () => Date
  tzOffsetMin?: number
}

/**
 * JWT を検証して userId を確定し、userId 束縛済みのリポジトリをコンテキストに載せる。
 * 以降のハンドラーは userId を扱わず repos だけを使う(認可の取りこぼしを構造的に防ぐ)。
 */
export const authenticate = (options: AuthOptions) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const token = parseBearerToken(c.req.header('Authorization'))
    const user = token ? await options.verifyToken(token) : null
    if (!user) return c.json(errorBody('unauthorized', '認証が必要です'), 401)

    c.set('userId', user.userId)
    c.set(
      'repos',
      createRepositories(await options.getDb(), user.userId, {
        now: options.now,
        tzOffsetMin: options.tzOffsetMin,
      }),
    )
    await next()
  })
