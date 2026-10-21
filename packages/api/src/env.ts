import type { Repositories } from '@app/db'

/** 認証ミドルウェアが載せる、リクエストスコープの値 */
export type AppEnv = {
  Variables: {
    userId: string
    /** userId が束縛済み。ルートは DB へこれ経由でのみ触れる */
    repos: Repositories
  }
}
