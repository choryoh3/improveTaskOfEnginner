import type { Db } from '../client'

/** リポジトリ共通の文脈。userId は生成時に束縛し、呼び出し側が渡し忘れられないようにする。 */
export interface RepoContext {
  db: Db
  userId: string
  now: () => Date
  /** 「今日」「今週」の境界に使う固定オフセット(分) */
  tzOffsetMin: number
}

/** タグ名の重複を除いて、このユーザーのタグ ID に解決する(無ければ作成) */
export async function resolveTagIds(
  { db, userId }: RepoContext,
  names: readonly string[] | undefined,
): Promise<string[]> {
  const ids: string[] = []
  for (const name of new Set(names ?? [])) {
    const tag = await db.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
    })
    ids.push(tag.id)
  }
  return ids
}
