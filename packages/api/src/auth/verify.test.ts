import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClaims = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getClaims } }),
}))

import { createSupabaseVerifier, parseBearerToken } from './verify'

describe('parseBearerToken', () => {
  it('extracts the token', () => {
    expect(parseBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi')
    expect(parseBearerToken('bearer abc')).toBe('abc')
  })

  it('returns null for missing or malformed headers', () => {
    expect(parseBearerToken(undefined)).toBeNull()
    expect(parseBearerToken('')).toBeNull()
    expect(parseBearerToken('Basic abc')).toBeNull()
    expect(parseBearerToken('Bearer')).toBeNull()
    expect(parseBearerToken('Bearer a b')).toBeNull()
  })
})

describe('createSupabaseVerifier', () => {
  const verify = createSupabaseVerifier({ url: 'http://localhost', publishableKey: 'key' })

  beforeEach(() => getClaims.mockReset())

  it('returns the user for a valid token', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'a@example.com' } },
      error: null,
    })
    expect(await verify('t')).toEqual({ userId: 'user-1', email: 'a@example.com' })
  })

  it('returns null when verification fails', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('invalid') })
    expect(await verify('t')).toBeNull()
  })

  it('returns null when the token has no subject', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null })
    expect(await verify('t')).toBeNull()
  })
})
