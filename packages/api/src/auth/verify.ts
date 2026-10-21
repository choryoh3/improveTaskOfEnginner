import { createClient } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  userId: string
  email: string | undefined
}

/** アクセストークンを検証し、有効ならユーザーを返す。無効・期限切れは null。 */
export type TokenVerifier = (token: string) => Promise<AuthenticatedUser | null>

export interface SupabaseVerifierOptions {
  url: string
  publishableKey: string
}

/** `Authorization: Bearer <token>` からトークンを取り出す。形式が違えば null。 */
export function parseBearerToken(header: string | null | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '')
  return match?.[1] ?? null
}

/**
 * Supabase Auth の JWT を検証する。
 * 非対称署名鍵のプロジェクトでは JWKS でローカル検証し、そうでなければ Auth サーバーに問い合わせる
 * (どちらも getClaims が自動で切り替える)。
 */
export function createSupabaseVerifier(options: SupabaseVerifierOptions): TokenVerifier {
  const client = createClient(options.url, options.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return async (token) => {
    const { data, error } = await client.auth.getClaims(token)
    const sub = data?.claims.sub
    if (error || !sub) return null
    const email = data.claims.email
    return { userId: sub, email: typeof email === 'string' ? email : undefined }
  }
}
