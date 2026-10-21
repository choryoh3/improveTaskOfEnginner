import { AppShell } from '@/components/shell/app-shell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = typeof data?.claims.email === 'string' ? data.claims.email : null

  return <AppShell email={email}>{children}</AppShell>
}
