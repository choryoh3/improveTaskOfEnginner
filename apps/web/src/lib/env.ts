// NEXT_PUBLIC_* はビルド時に静的置換されるため、動的キーでは読めない。個別に参照する。
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が未設定です(.env.example を参照)',
    )
  }
  return { url, publishableKey }
}
