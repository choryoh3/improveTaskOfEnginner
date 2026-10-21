import { createApp, createSupabaseVerifier } from '@app/api'
import { supabaseConfig } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

// Hono を Route Handler に載せる。ブラウザは Cookie でログイン状態を持つため、
// ここでセッションからアクセストークンを取り出して Authorization に付け替える。
// トークンの検証自体は Hono 側(createSupabaseVerifier)が行う。
let app: ReturnType<typeof createApp> | undefined

function getApp() {
  app ??= createApp({
    verifyToken: createSupabaseVerifier(supabaseConfig()),
    tzOffsetMin: Number(process.env.APP_TZ_OFFSET_MIN ?? 0),
  })
  return app
}

async function handler(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()

  const headers = new Headers(request.headers)
  headers.delete('authorization')
  if (data.session) headers.set('authorization', `Bearer ${data.session.access_token}`)

  return getApp().fetch(new Request(request, { headers }))
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
