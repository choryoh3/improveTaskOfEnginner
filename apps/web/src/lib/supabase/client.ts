import { createBrowserClient } from '@supabase/ssr'
import { supabaseConfig } from '@/lib/env'

/** ブラウザ用(Client Component)。シングルトンなので何度呼んでもよい。 */
export function createClient() {
  const { url, publishableKey } = supabaseConfig()
  return createBrowserClient(url, publishableKey)
}
