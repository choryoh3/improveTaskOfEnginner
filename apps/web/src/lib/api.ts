import type { App } from '@app/api'
import type { ApiError } from '@app/shared'
import { hc } from 'hono/client'

// 型は Hono のルート定義から推論される(別途の型定義は不要)。
// クライアント専用。Cookie が自動で送られるので、トークンは扱わない。
let client: ReturnType<typeof hc<App>> | undefined

export function api() {
  client ??= hc<App>(window.location.origin)
  return client.api
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiError['error']['code'] | 'network_error',
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function toError(res: Response): Promise<ApiRequestError> {
  try {
    const body = (await res.json()) as Partial<ApiError>
    if (body.error) return new ApiRequestError(body.error.message, res.status, body.error.code)
  } catch {
    // JSON でないレスポンス
  }
  return new ApiRequestError(
    `リクエストに失敗しました(${res.status})`,
    res.status,
    'internal_error',
  )
}

/** 成功レスポンスの本文を返す。失敗は統一エラー形式を読んで ApiRequestError を投げる。 */
export async function unwrap<R extends { ok: boolean; json(): Promise<unknown> }>(
  res: R,
): Promise<Awaited<ReturnType<Extract<R, { ok: true }>['json']>>> {
  if (!res.ok) throw await toError(res as unknown as Response)
  return (await res.json()) as never
}

/** 本文のない成功レスポンス(204)用 */
export async function unwrapEmpty(res: { ok: boolean }): Promise<void> {
  if (!res.ok) throw await toError(res as unknown as Response)
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '予期しないエラーが発生しました'
}
