import type { Snippet, SnippetCreate, SnippetListQuery, SnippetUpdate } from '@app/shared'
import { isRecordNotFound, NotFoundError } from '../errors'
import { resolveTagIds, type RepoContext } from './context'

interface SnippetRow {
  id: string
  title: string
  body: string
  language: string | null
  createdAt: Date
  updatedAt: Date
  tags: { tag: { name: string } }[]
}

const withTags = { tags: { include: { tag: true } } } as const

function toSnippet(row: SnippetRow): Snippet {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    language: row.language,
    tags: row.tags.map((t) => t.tag.name).sort(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function createSnippetRepository(ctx: RepoContext) {
  const { db, userId } = ctx

  return {
    async list(query: SnippetListQuery = {}): Promise<Snippet[]> {
      const rows = await db.snippet.findMany({
        where: {
          userId,
          ...(query.tag && { tags: { some: { tag: { name: query.tag } } } }),
          ...(query.q && {
            OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }],
          }),
        },
        include: withTags,
        orderBy: { updatedAt: 'desc' },
        take: 200,
      })
      return rows.map(toSnippet)
    },

    async get(id: string): Promise<Snippet | null> {
      const row = await db.snippet.findFirst({ where: { id, userId }, include: withTags })
      return row ? toSnippet(row) : null
    },

    async create(input: SnippetCreate): Promise<Snippet> {
      const tagIds = await resolveTagIds(ctx, input.tags)
      const row = await db.snippet.create({
        data: {
          userId,
          title: input.title,
          body: input.body,
          ...(input.language && { language: input.language }),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include: withTags,
      })
      return toSnippet(row)
    },

    async update(id: string, input: SnippetUpdate): Promise<Snippet> {
      const tagIds = input.tags ? await resolveTagIds(ctx, input.tags) : undefined
      try {
        const row = await db.snippet.update({
          where: { id, userId },
          data: {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.body !== undefined && { body: input.body }),
            ...(input.language !== undefined && { language: input.language }),
            ...(tagIds && { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } }),
          },
          include: withTags,
        })
        return toSnippet(row)
      } catch (error) {
        if (isRecordNotFound(error)) throw new NotFoundError('snippet')
        throw error
      }
    },

    async remove(id: string): Promise<void> {
      const { count } = await db.snippet.deleteMany({ where: { id, userId } })
      if (count === 0) throw new NotFoundError('snippet')
    },
  }
}

export type SnippetRepository = ReturnType<typeof createSnippetRepository>
