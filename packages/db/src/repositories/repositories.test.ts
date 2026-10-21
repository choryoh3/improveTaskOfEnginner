import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ConflictError, InvalidReferenceError, NotFoundError } from '../errors'
import { createTestDb, type TestDb } from '../testing'
import { createRepositories, type Repositories } from './index'

// 2026-10-21(水)12:00 JST
const NOW = new Date('2026-10-21T03:00:00Z')
const JST = 540

let testDb: TestDb
let clock = NOW
const repos = (userId: string): Repositories =>
  createRepositories(testDb.db, userId, { now: () => clock, tzOffsetMin: JST })

beforeAll(async () => {
  testDb = await createTestDb()
}, 30_000)

afterAll(async () => {
  await testDb?.cleanup()
})

describe('createRepositories', () => {
  it('rejects an empty userId', () => {
    expect(() => createRepositories(testDb.db, '')).toThrow()
  })
})

describe('tasks', () => {
  it('creates a task with tags, area and defaults, appending to the end', async () => {
    const r = repos('t-create')
    const area = await r.areas.create({ name: 'Work' })
    const first = await r.tasks.create({ title: 'A', areaId: area.id, tags: ['bug', 'bug', 'api'] })
    const second = await r.tasks.create({ title: 'B' })

    expect(first).toMatchObject({ status: 'todo', priority: 1, areaId: area.id })
    expect(first.tags).toEqual(['api', 'bug'])
    expect(second.position).toBeGreaterThan(first.position)
  })

  it('sets and clears completedAt when the status changes', async () => {
    const r = repos('t-status')
    const task = await r.tasks.create({ title: 'A' })
    const done = await r.tasks.update(task.id, { status: 'done' })
    expect(done.completedAt).toBe(NOW.toISOString())
    expect((await r.tasks.update(task.id, { status: 'doing' })).completedAt).toBeNull()
  })

  it('treats null as "clear" and undefined as "keep" on update', async () => {
    const r = repos('t-patch')
    const task = await r.tasks.create({ title: 'A', notes: 'memo', estimateMin: 30 })
    const kept = await r.tasks.update(task.id, { title: 'A2' })
    expect(kept).toMatchObject({ title: 'A2', notes: 'memo', estimateMin: 30 })
    const cleared = await r.tasks.update(task.id, { notes: null, estimateMin: null })
    expect(cleared).toMatchObject({ notes: null, estimateMin: null })
  })

  it('replaces tags on update', async () => {
    const r = repos('t-tags')
    const task = await r.tasks.create({ title: 'A', tags: ['x', 'y'] })
    expect((await r.tasks.update(task.id, { tags: ['y', 'z'] })).tags).toEqual(['y', 'z'])
    expect((await r.tasks.update(task.id, { tags: [] })).tags).toEqual([])
  })

  it('filters by status, tag, text and due ranges (JST day/week boundaries)', async () => {
    const r = repos('t-filter')
    await r.tasks.create({ title: 'overdue', dueDate: '2026-10-20T10:00:00+09:00' })
    await r.tasks.create({ title: 'today early', dueDate: '2026-10-21T00:30:00+09:00' })
    await r.tasks.create({
      title: 'today late',
      dueDate: '2026-10-21T23:30:00+09:00',
      tags: ['ops'],
    })
    await r.tasks.create({ title: 'sunday', dueDate: '2026-10-25T20:00:00+09:00' })
    await r.tasks.create({ title: 'next monday', dueDate: '2026-10-26T00:30:00+09:00' })
    const finished = await r.tasks.create({
      title: 'finished',
      dueDate: '2026-10-19T10:00:00+09:00',
    })
    await r.tasks.update(finished.id, { status: 'done' })

    const titles = async (query: Parameters<typeof r.tasks.list>[0]) =>
      (await r.tasks.list(query)).map((t) => t.title).sort()

    // 期限切れは「期限が過去かつ未完了」(完了済みは含めない)
    expect(await titles({ due: 'overdue' })).toEqual(['overdue', 'today early'])
    expect(await titles({ due: 'today' })).toEqual(['today early', 'today late'])
    // 今週は月曜 10/19 〜 日曜 10/25(翌月曜は含まない)
    expect(await titles({ due: 'week' })).toEqual([
      'finished',
      'overdue',
      'sunday',
      'today early',
      'today late',
    ])
    expect(await titles({ tag: 'ops' })).toEqual(['today late'])
    expect(await titles({ q: 'monday' })).toEqual(['next monday'])
    expect(await titles({ status: 'done' })).toEqual(['finished'])
  })

  it('lists completed and due-between ranges', async () => {
    const r = repos('t-range')
    const a = await r.tasks.create({ title: 'a', dueDate: '2026-10-22T10:00:00+09:00' })
    const b = await r.tasks.create({ title: 'b' })
    await r.tasks.update(b.id, { status: 'done' })

    const dayStart = new Date('2026-10-20T15:00:00Z')
    const nextDay = new Date('2026-10-21T15:00:00Z')
    expect((await r.tasks.completedBetween(dayStart, nextDay)).map((t) => t.id)).toEqual([b.id])
    expect(
      (await r.tasks.dueBetween(dayStart, new Date('2026-10-23T00:00:00Z'))).map((t) => t.id),
    ).toEqual([a.id])
  })

  it('rejects an area that does not belong to the user', async () => {
    const other = await repos('t-ref-other').areas.create({ name: 'Secret' })
    const r = repos('t-ref')
    await expect(r.tasks.create({ title: 'x', areaId: other.id })).rejects.toBeInstanceOf(
      InvalidReferenceError,
    )
    const task = await r.tasks.create({ title: 'y' })
    await expect(r.tasks.update(task.id, { areaId: other.id })).rejects.toBeInstanceOf(
      InvalidReferenceError,
    )
  })

  it('throws NotFoundError for missing tasks', async () => {
    const r = repos('t-missing')
    await expect(r.tasks.update('nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(r.tasks.remove('nope')).rejects.toBeInstanceOf(NotFoundError)
    expect(await r.tasks.get('nope')).toBeNull()
  })
})

describe("authorization: users cannot see or touch each other's data", () => {
  it("hides, rejects updates to, and refuses deletion of another user's resources", async () => {
    const alice = repos('authz-alice')
    const bob = repos('authz-bob')

    const task = await alice.tasks.create({ title: 'alice-task', tags: ['private'] })
    const area = await alice.areas.create({ name: 'alice-area' })
    const snippet = await alice.snippets.create({ title: 'alice-snippet', body: 'secret' })

    // 読み取り
    expect(await bob.tasks.get(task.id)).toBeNull()
    expect(await bob.tasks.list()).toEqual([])
    expect(await bob.tasks.list({ tag: 'private' })).toEqual([])
    expect(await bob.areas.list()).toEqual([])
    expect(await bob.snippets.get(snippet.id)).toBeNull()
    expect(await bob.snippets.list({ q: 'secret' })).toEqual([])

    // 更新・削除
    await expect(bob.tasks.update(task.id, { title: 'hacked' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(bob.tasks.remove(task.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(bob.areas.update(area.id, { name: 'hacked' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(bob.areas.remove(area.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(bob.snippets.update(snippet.id, { title: 'hacked' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(bob.snippets.remove(snippet.id)).rejects.toBeInstanceOf(NotFoundError)

    // 他人のタスクにフォーカスを紐づけられない
    await expect(bob.focus.start({ taskId: task.id })).rejects.toBeInstanceOf(InvalidReferenceError)

    // 元のデータは無傷
    expect(await alice.tasks.get(task.id)).toMatchObject({ title: 'alice-task' })
    expect(await alice.areas.list()).toHaveLength(1)
    expect(await alice.snippets.get(snippet.id)).toMatchObject({ title: 'alice-snippet' })
  })

  it('keeps tags separate per user', async () => {
    const a = await repos('authz-tag-a').tasks.create({ title: 'a', tags: ['shared-name'] })
    const b = await repos('authz-tag-b').tasks.create({ title: 'b', tags: ['shared-name'] })
    expect(a.tags).toEqual(['shared-name'])
    expect(b.tags).toEqual(['shared-name'])
  })

  it("cannot stop another user's focus session", async () => {
    const session = await repos('authz-focus-a').focus.start({})
    await expect(repos('authz-focus-b').focus.stop(session.id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(await repos('authz-focus-a').focus.active()).toMatchObject({ id: session.id })
  })
})

describe('areas', () => {
  it('rejects duplicate names per user', async () => {
    const r = repos('a-dup')
    await r.areas.create({ name: 'Work' })
    await expect(r.areas.create({ name: 'Work' })).rejects.toBeInstanceOf(ConflictError)
    await expect(repos('a-dup-other').areas.create({ name: 'Work' })).resolves.toBeDefined()
  })

  it('keeps tasks (unassigned) when an area is deleted', async () => {
    const r = repos('a-del')
    const area = await r.areas.create({ name: 'Temp' })
    const task = await r.tasks.create({ title: 't', areaId: area.id })
    await r.areas.remove(area.id)
    expect((await r.tasks.get(task.id))?.areaId).toBeNull()
  })
})

describe('focus', () => {
  it('allows one active session, records the duration on stop', async () => {
    const r = repos('f-flow')
    const task = await r.tasks.create({ title: 'deep work' })
    clock = new Date('2026-10-21T03:00:00Z')
    const session = await r.focus.start({ taskId: task.id, plannedSec: 1500 })
    expect(session).toMatchObject({ kind: 'focus', plannedSec: 1500, endedAt: null })

    await expect(r.focus.start({})).rejects.toBeInstanceOf(ConflictError)

    clock = new Date('2026-10-21T03:25:10Z')
    const stopped = await r.focus.stop(session.id)
    expect(stopped.durationSec).toBe(1510)
    expect(await r.focus.active()).toBeNull()
    await expect(r.focus.stop(session.id)).rejects.toBeInstanceOf(NotFoundError)
    clock = NOW
  })

  it('lists sessions in a range', async () => {
    const r = repos('f-range')
    clock = new Date('2026-10-21T01:00:00Z')
    const s = await r.focus.start({})
    clock = new Date('2026-10-21T01:10:00Z')
    await r.focus.stop(s.id)
    clock = NOW

    expect(
      await r.focus.listBetween(new Date('2026-10-21T00:00:00Z'), new Date('2026-10-22T00:00:00Z')),
    ).toHaveLength(1)
    expect(
      await r.focus.listBetween(new Date('2026-10-22T00:00:00Z'), new Date('2026-10-23T00:00:00Z')),
    ).toHaveLength(0)
  })
})

describe('snippets', () => {
  it('searches title and body, filters by tag, and replaces tags', async () => {
    const r = repos('s-search')
    const a = await r.snippets.create({
      title: 'git rebase',
      body: 'git rebase -i HEAD~3',
      language: 'bash',
      tags: ['git'],
    })
    await r.snippets.create({ title: 'docker', body: 'docker compose up', tags: ['ops'] })

    expect((await r.snippets.list({ q: 'rebase' })).map((s) => s.id)).toEqual([a.id])
    expect((await r.snippets.list({ q: 'compose' })).map((s) => s.title)).toEqual(['docker'])
    expect((await r.snippets.list({ tag: 'git' })).map((s) => s.id)).toEqual([a.id])

    const updated = await r.snippets.update(a.id, { tags: ['vcs'], language: null })
    expect(updated).toMatchObject({ tags: ['vcs'], language: null })
  })
})
