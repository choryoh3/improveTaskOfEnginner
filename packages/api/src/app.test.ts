import { createTestDb, type TestDb } from '@app/db/testing'
import type { Task } from '@app/shared'
import { hc } from 'hono/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp, type App } from './app'
import type { TokenVerifier } from './auth/verify'

// 2026-10-21(水)12:00 JST
let clock = new Date('2026-10-21T03:00:00Z')
const JST = 540

// トークンは "user:<id>" 形式のみ有効(Supabase の代わり)
const verifyToken: TokenVerifier = async (token) =>
  token.startsWith('user:') ? { userId: token.slice(5), email: undefined } : null

let testDb: TestDb
let app: App

beforeAll(async () => {
  testDb = await createTestDb()
  app = createApp({
    verifyToken,
    getDb: async () => testDb.db,
    now: () => clock,
    tzOffsetMin: JST,
  })
}, 30_000)

afterAll(async () => {
  await testDb?.cleanup()
})

async function call(user: string | null, method: string, path: string, body?: unknown) {
  const res = await app.request(`/api${path}`, {
    method,
    headers: {
      ...(user && { Authorization: `Bearer user:${user}` }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

describe('authentication', () => {
  it('serves /health without a token', async () => {
    expect(await call(null, 'GET', '/health')).toEqual({ status: 200, body: { ok: true } })
  })

  it('returns 401 in the unified error shape without a valid token', async () => {
    for (const path of ['/tasks', '/areas', '/focus/active', '/snippets', '/overview']) {
      const res = await call(null, 'GET', path)
      expect(res.status, path).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    }
    const bad = await app.request('/api/tasks', { headers: { Authorization: 'Bearer invalid' } })
    expect(bad.status).toBe(401)
  })
})

describe('validation', () => {
  it('returns 400 validation_error with the offending field', async () => {
    const res = await call('v1', 'POST', '/tasks', { title: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
    expect(res.body.error.message).toContain('title')
  })

  it('rejects malformed JSON and bad query values', async () => {
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { Authorization: 'Bearer user:v1', 'Content-Type': 'application/json' },
      body: '{broken',
    })
    expect(res.status).toBe(400)
    expect((await call('v1', 'GET', '/tasks?limit=9999')).status).toBe(400)
    expect((await call('v1', 'GET', '/tasks?status=wip')).status).toBe(400)
  })

  it("returns 400 for a reference to another user's area", async () => {
    const area = await call('v-other', 'POST', '/areas', { name: 'theirs' })
    const res = await call('v1', 'POST', '/tasks', { title: 'x', areaId: area.body.id })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })
})

describe('tasks', () => {
  it('runs the full CRUD flow', async () => {
    const created = await call('t1', 'POST', '/tasks', {
      title: 'PR レビュー',
      priority: 2,
      tags: ['review'],
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ title: 'PR レビュー', status: 'todo', tags: ['review'] })
    const id = created.body.id

    expect((await call('t1', 'GET', `/tasks/${id}`)).body.title).toBe('PR レビュー')

    const done = await call('t1', 'PATCH', `/tasks/${id}`, { status: 'done' })
    expect(done.body).toMatchObject({ status: 'done', completedAt: clock.toISOString() })

    expect((await call('t1', 'GET', '/tasks?status=done')).body).toHaveLength(1)
    expect((await call('t1', 'DELETE', `/tasks/${id}`)).status).toBe(204)
    expect((await call('t1', 'GET', `/tasks/${id}`)).status).toBe(404)
  })
})

describe('authorization: another user gets 404 and cannot change anything', () => {
  it('protects tasks, areas, snippets and focus sessions', async () => {
    const task = (await call('owner', 'POST', '/tasks', { title: 'mine' })).body
    const area = (await call('owner', 'POST', '/areas', { name: 'mine' })).body
    const snippet = (await call('owner', 'POST', '/snippets', { title: 's', body: 'b' })).body
    const session = (await call('owner', 'POST', '/focus/start', {})).body

    const attempts: [string, string, unknown?][] = [
      ['GET', `/tasks/${task.id}`],
      ['PATCH', `/tasks/${task.id}`, { title: 'hacked' }],
      ['DELETE', `/tasks/${task.id}`],
      ['PATCH', `/areas/${area.id}`, { name: 'hacked' }],
      ['DELETE', `/areas/${area.id}`],
      ['GET', `/snippets/${snippet.id}`],
      ['PATCH', `/snippets/${snippet.id}`, { title: 'hacked' }],
      ['DELETE', `/snippets/${snippet.id}`],
      ['POST', `/focus/${session.id}/stop`],
    ]
    for (const [method, path, body] of attempts) {
      const res = await call('intruder', method, path, body)
      expect(res.status, `${method} ${path}`).toBe(404)
      expect(res.body.error.code).toBe('not_found')
    }

    // 一覧にも出ない
    expect((await call('intruder', 'GET', '/tasks')).body).toEqual([])
    expect((await call('intruder', 'GET', '/areas')).body).toEqual([])
    expect((await call('intruder', 'GET', '/snippets')).body).toEqual([])
    expect((await call('intruder', 'GET', '/focus/active')).body).toBeNull()

    // 所有者のデータは無傷
    expect((await call('owner', 'GET', `/tasks/${task.id}`)).body.title).toBe('mine')
    expect((await call('owner', 'GET', '/areas')).body[0].name).toBe('mine')
    expect((await call('owner', 'GET', '/focus/active')).body.id).toBe(session.id)
  })
})

describe('areas', () => {
  it('returns 409 for a duplicate name', async () => {
    await call('a1', 'POST', '/areas', { name: 'Work' })
    const res = await call('a1', 'POST', '/areas', { name: 'Work' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('conflict')
  })
})

describe('focus', () => {
  it('starts, rejects a second session, and stops with the duration', async () => {
    const task = (await call('f1', 'POST', '/tasks', { title: 'deep work' })).body
    const started = await call('f1', 'POST', '/focus/start', { taskId: task.id, plannedSec: 1500 })
    expect(started.status).toBe(201)

    expect((await call('f1', 'POST', '/focus/start', {})).status).toBe(409)
    expect((await call('f1', 'GET', '/focus/active')).body.id).toBe(started.body.id)

    clock = new Date(clock.getTime() + 25 * 60_000)
    const stopped = await call('f1', 'POST', `/focus/${started.body.id}/stop`)
    expect(stopped.body.durationSec).toBe(1500)
    expect((await call('f1', 'GET', '/focus/active')).body).toBeNull()
    clock = new Date('2026-10-21T03:00:00Z')
  })
})

describe('overview', () => {
  it('summarises areas, the week, blockers and the focus trend', async () => {
    const user = 'o1'
    const work = (await call(user, 'POST', '/areas', { name: 'Work' })).body
    await call(user, 'POST', '/tasks', { title: 'a', areaId: work.id, status: 'done' })
    await call(user, 'POST', '/tasks', { title: 'b', areaId: work.id, status: 'doing' })
    await call(user, 'POST', '/tasks', {
      title: 'c',
      areaId: work.id,
      dueDate: '2026-10-20T10:00:00+09:00',
      estimateMin: 30,
    })
    await call(user, 'POST', '/tasks', { title: 'd', status: 'blocked' })
    await call(user, 'POST', '/tasks', {
      title: 'e',
      dueDate: '2026-10-23T10:00:00+09:00',
      estimateMin: 90,
    })

    const session = (await call(user, 'POST', '/focus/start', {})).body
    clock = new Date(clock.getTime() + 50 * 60_000)
    await call(user, 'POST', `/focus/${session.id}/stop`)

    const { status, body } = await call(user, 'GET', '/overview')
    clock = new Date('2026-10-21T03:00:00Z')

    expect(status).toBe(200)
    expect(body.areas).toEqual([
      expect.objectContaining({ name: 'Work', total: 3, done: 1, doing: 1, overdue: 1 }),
      expect.objectContaining({ areaId: null, name: '未分類', total: 2, blocked: 1 }),
    ])
    // 今週(10/19〜10/25)に期限がある未完了: c(30) + e(90)
    expect(body.week).toEqual({ plannedMin: 120, focusMin: 50 })
    expect(body.overdueCount).toBe(1)
    expect(body.blockedCount).toBe(1)
    expect(body.focusTrend).toHaveLength(7)
    expect(body.focusTrend.at(-1)).toEqual({ date: '2026-10-21', minutes: 50 })
    expect(body.focusTrend[0]).toEqual({ date: '2026-10-15', minutes: 0 })
  })

  it('is empty for a new user', async () => {
    const { body } = await call('o-new', 'GET', '/overview')
    expect(body.areas).toEqual([])
    expect(body.week).toEqual({ plannedMin: 0, focusMin: 0 })
  })
})

describe('reports', () => {
  it('builds a daily report from completed tasks, focus time and blockers', async () => {
    const user = 'r1'
    const area = (await call(user, 'POST', '/areas', { name: 'API' })).body
    const done = (await call(user, 'POST', '/tasks', { title: '認可を実装', areaId: area.id })).body
    await call(user, 'POST', '/tasks', { title: '調査中', status: 'doing' })
    await call(user, 'POST', '/tasks', { title: 'レビュー待ち', status: 'blocked' })

    const session = (await call(user, 'POST', '/focus/start', { taskId: done.id })).body
    clock = new Date(clock.getTime() + 45 * 60_000)
    await call(user, 'POST', `/focus/${session.id}/stop`)
    await call(user, 'PATCH', `/tasks/${done.id}`, { status: 'done' })

    const { status, body } = await call(user, 'GET', '/reports?type=daily')
    clock = new Date('2026-10-21T03:00:00Z')

    expect(status).toBe(200)
    expect(body).toMatchObject({ type: 'daily', from: '2026-10-21', to: '2026-10-21' })
    expect(body.markdown).toContain('# 日報 2026-10-21(水)')
    expect(body.markdown).toContain('- [API] 認可を実装(集中 45分)')
    expect(body.markdown).toContain('合計 45分(1セッション)')
    expect(body.markdown).toContain('## 進行中\n- 調査中')
    expect(body.markdown).toContain('## ブロッカー\n- レビュー待ち')
  })

  it('builds a weekly review for the week containing the given date', async () => {
    const user = 'r2'
    const task = (
      await call(user, 'POST', '/tasks', {
        title: '来週の件',
        dueDate: '2026-10-27T10:00:00+09:00',
      })
    ).body
    await call(user, 'POST', '/tasks', { title: '遅延', dueDate: '2026-10-19T10:00:00+09:00' })

    const { body } = await call(user, 'GET', '/reports?type=weekly&date=2026-10-22')
    expect(body).toMatchObject({ type: 'weekly', from: '2026-10-19', to: '2026-10-25' })
    expect(body.markdown).toContain('# 週次レビュー 2026-10-19 〜 2026-10-25')
    expect(body.markdown).toContain('## 来週が期限\n- 2026-10-27 来週の件')
    expect(body.markdown).toContain('## 期限切れ\n- 2026-10-19 遅延')
    expect(task.id).toBeDefined()
  })

  it('shows "なし" for empty sections and rejects a bad date', async () => {
    const { body } = await call('r-empty', 'GET', '/reports?type=daily')
    expect(body.markdown).toContain('## 完了\n- なし')
    expect((await call('r-empty', 'GET', '/reports?type=daily&date=2026-13-45')).status).toBe(400)
    expect((await call('r-empty', 'GET', '/reports')).status).toBe(400)
  })
})

describe('snippets', () => {
  it('creates, searches and updates', async () => {
    const created = await call('s1', 'POST', '/snippets', {
      title: 'git rebase',
      body: 'git rebase -i HEAD~3',
      language: 'bash',
      tags: ['git'],
    })
    expect(created.status).toBe(201)
    expect((await call('s1', 'GET', '/snippets?q=rebase')).body).toHaveLength(1)
    expect((await call('s1', 'GET', '/snippets?q=docker')).body).toHaveLength(0)
    const updated = await call('s1', 'PATCH', `/snippets/${created.body.id}`, { language: null })
    expect(updated.body.language).toBeNull()
  })
})

describe('typed RPC client', () => {
  it('infers request and response types from the routes', async () => {
    const client = hc<App>('http://localhost', {
      // hc は Headers インスタンスを渡すことがあるため、Request を組み立ててヘッダーを足す
      fetch: (input: string | URL | Request, init?: RequestInit) => {
        const request = new Request(input, init)
        request.headers.set('Authorization', 'Bearer user:rpc')
        return app.fetch(request)
      },
    })

    const res = await client.api.tasks.$post({ json: { title: 'typed' } })
    expect(res.status).toBe(201)
    if (res.status === 201) {
      const task: Task = await res.json()
      expect(task.title).toBe('typed')
    }

    // @ts-expect-error title は必須(型で検出される)
    await client.api.tasks.$post({ json: { notes: 'no title' } })
  })
})
