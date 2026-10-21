import { ConflictError, InvalidReferenceError, NotFoundError } from '@app/db'
import type { ApiError } from '@app/shared'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

/** 統一エラー形式 `{ error: { code, message } }`。code はリテラル型のまま RPC クライアントに伝わる。 */
export function errorBody<C extends ApiError['error']['code']>(code: C, message: string) {
  return { error: { code, message } }
}

export function handleError(error: Error, c: Context) {
  if (error instanceof NotFoundError) return c.json(errorBody('not_found', '見つかりません'), 404)
  if (error instanceof ConflictError) return c.json(errorBody('conflict', error.message), 409)
  if (error instanceof InvalidReferenceError) {
    return c.json(errorBody('validation_error', error.message), 400)
  }
  // 不正な JSON ボディなど、Hono 自身が投げる 4xx
  if (error instanceof HTTPException && error.status === 400) {
    return c.json(errorBody('validation_error', error.message), 400)
  }
  console.error(error)
  return c.json(errorBody('internal_error', 'サーバーエラーが発生しました'), 500)
}
