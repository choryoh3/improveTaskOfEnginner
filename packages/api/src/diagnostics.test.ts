import { describe, expect, it } from 'vitest'
import { describeDatabaseUrl } from './diagnostics'

describe('describeDatabaseUrl', () => {
  it('returns only non-secret parts and never the password', () => {
    const result = describeDatabaseUrl(
      'postgresql://postgres.abc:Sup3rSecret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    )
    expect(result).toEqual({
      set: true,
      scheme: 'postgresql',
      user: 'postgres.abc',
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: '6543',
      database: 'postgres',
      passwordHasBrackets: false,
      passwordIsEmpty: false,
    })
    expect(JSON.stringify(result)).not.toContain('Sup3rSecret')
  })

  it('detects leftover placeholder brackets around the password', () => {
    const result = describeDatabaseUrl('postgresql://postgres.abc:[mypassword]@host:6543/postgres')
    expect(result).toMatchObject({ passwordHasBrackets: true })
  })

  it('handles unset and unparsable values', () => {
    expect(describeDatabaseUrl(undefined)).toEqual({ set: false })
    expect(describeDatabaseUrl('not a url')).toEqual({ set: true, parsable: false })
  })
})
