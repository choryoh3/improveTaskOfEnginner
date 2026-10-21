import type { Db } from '../client'
import { createAreaRepository } from './areas'
import type { RepoContext } from './context'
import { createFocusRepository } from './focus'
import { createSnippetRepository } from './snippets'
import { createTaskRepository } from './tasks'

export interface RepositoryOptions {
  now?: () => Date
  tzOffsetMin?: number
}

/**
 * 1 ユーザー分のリポジトリ一式。DB へ触れる唯一の入口で、全クエリに userId が付く。
 * userId をここで束縛するので、呼び出し側(API)は userId を渡し忘れようがない。
 */
export function createRepositories(db: Db, userId: string, options: RepositoryOptions = {}) {
  if (!userId) throw new Error('userId は必須です')
  const ctx: RepoContext = {
    db,
    userId,
    now: options.now ?? (() => new Date()),
    tzOffsetMin: options.tzOffsetMin ?? 0,
  }
  return {
    areas: createAreaRepository(ctx),
    tasks: createTaskRepository(ctx),
    focus: createFocusRepository(ctx),
    snippets: createSnippetRepository(ctx),
  }
}

export type Repositories = ReturnType<typeof createRepositories>
export type { TaskSummaryRow } from './tasks'
