import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfig } from '@/lib/env'

// 認証なしで見られるパス。/api は API 自身が 401 を返す(リダイレクトではなく JSON で返したい)。
const PUBLIC_PATHS = ['/login', '/auth']
const isPublic = (pathname: string) =>
  pathname.startsWith('/api') ||
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

/**
 * Supabase の Auth トークンを更新して Cookie に載せ直し、未ログインなら /login へ送る。
 * getClaims() が JWT を検証する(Server Component は Cookie を書けないため、ここで更新する)。
 */
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = supabaseConfig()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        // CDN がセッションをキャッシュして他ユーザーに漏らさないためのヘッダー
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims.sub)
  const { pathname } = request.nextUrl

  if (!signedIn && !isPublic(pathname)) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }
  if (signedIn && pathname === '/login') {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
