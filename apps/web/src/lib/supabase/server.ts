import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from '@/lib/env'

/** サーバー用(Server Component / Route Handler / Server Action)。リクエストごとに作る。 */
export async function createClient() {
  const { url, publishableKey } = supabaseConfig()
  const store = await cookies()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options)
        } catch {
          // Server Component からは Cookie を書けない。proxy がトークン更新を担うので無視してよい。
        }
      },
    },
  })
}
