import { focusStartSchema } from '@app/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { validate } from '../validate'

export const focusRoutes = new Hono<AppEnv>()
  // 進行中のセッション。無ければ null
  .get('/active', async (c) => c.json(await c.var.repos.focus.active(), 200))
  .post('/start', validate('json', focusStartSchema), async (c) =>
    c.json(await c.var.repos.focus.start(c.req.valid('json')), 201),
  )
  .post('/:id/stop', async (c) => c.json(await c.var.repos.focus.stop(c.req.param('id')), 200))
