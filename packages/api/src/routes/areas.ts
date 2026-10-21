import { areaCreateSchema, areaUpdateSchema } from '@app/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { validate } from '../validate'

export const areaRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await c.var.repos.areas.list(), 200))
  .post('/', validate('json', areaCreateSchema), async (c) =>
    c.json(await c.var.repos.areas.create(c.req.valid('json')), 201),
  )
  .patch('/:id', validate('json', areaUpdateSchema), async (c) =>
    c.json(await c.var.repos.areas.update(c.req.param('id'), c.req.valid('json')), 200),
  )
  .delete('/:id', async (c) => {
    await c.var.repos.areas.remove(c.req.param('id'))
    return c.body(null, 204)
  })
