import { snippetCreateSchema, snippetListQuerySchema, snippetUpdateSchema } from '@app/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { errorBody } from '../errors'
import { validate } from '../validate'

export const snippetRoutes = new Hono<AppEnv>()
  .get('/', validate('query', snippetListQuerySchema), async (c) =>
    c.json(await c.var.repos.snippets.list(c.req.valid('query')), 200),
  )
  .post('/', validate('json', snippetCreateSchema), async (c) =>
    c.json(await c.var.repos.snippets.create(c.req.valid('json')), 201),
  )
  .get('/:id', async (c) => {
    const snippet = await c.var.repos.snippets.get(c.req.param('id'))
    if (!snippet) return c.json(errorBody('not_found', 'スニペットが見つかりません'), 404)
    return c.json(snippet, 200)
  })
  .patch('/:id', validate('json', snippetUpdateSchema), async (c) =>
    c.json(await c.var.repos.snippets.update(c.req.param('id'), c.req.valid('json')), 200),
  )
  .delete('/:id', async (c) => {
    await c.var.repos.snippets.remove(c.req.param('id'))
    return c.body(null, 204)
  })
