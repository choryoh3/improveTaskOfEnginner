/** 対象が存在しない、または他ユーザーのもの(存在を区別しない) */
export class NotFoundError extends Error {
  constructor(what = 'resource') {
    super(`${what} not found`)
    this.name = 'NotFoundError'
  }
}

/** 一意制約や状態の衝突(重複する名前、進行中のセッションがあるなど) */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

/** 参照先(areaId / taskId)が存在しない、または他ユーザーのもの */
export class InvalidReferenceError extends Error {
  constructor(what: string) {
    super(`${what} が見つかりません`)
    this.name = 'InvalidReferenceError'
  }
}

function prismaCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

/** Prisma: 更新・削除対象が無い(where に一致しない) */
export const isRecordNotFound = (error: unknown) => prismaCode(error) === 'P2025'

/** Prisma: 一意制約違反 */
export const isUniqueViolation = (error: unknown) => prismaCode(error) === 'P2002'
