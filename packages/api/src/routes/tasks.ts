import { taskCreateSchema, taskListQuerySchema, taskUpdateSchema } from '@app/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { errorBody } from '../errors'
import { validate } from '../validate'

export const taskRoutes = new Hono<AppEnv>()
  .get('/', validate('query', taskListQuerySchema), async (c) =>
    c.json(await c.var.repos.tasks.list(c.req.valid('query')), 200),
  )
  .post('/', validate('json', taskCreateSchema), async (c) =>
    c.json(await c.var.repos.tasks.create(c.req.valid('json')), 201),
  )
  .get('/:id', async (c) => {
    const task = await c.var.repos.tasks.get(c.req.param('id'))
    if (!task) return c.json(errorBody('not_found', 'タスクが見つかりません'), 404)
    return c.json(task, 200)
  })
  .patch('/:id', validate('json', taskUpdateSchema), async (c) =>
    c.json(await c.var.repos.tasks.update(c.req.param('id'), c.req.valid('json')), 200),
  )
  .delete('/:id', async (c) => {
    await c.var.repos.tasks.remove(c.req.param('id'))
    return c.body(null, 204)
  })
