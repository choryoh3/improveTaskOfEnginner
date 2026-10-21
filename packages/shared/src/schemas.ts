import { z } from 'zod'

// 契約方針:
// - 日時は ISO 8601 文字列(JSON でそのまま往復できる)
// - zod の default() は使わない(patch スキーマが既定値で上書きされるのを防ぐ)。既定値は DB 側で持つ
// - 列挙は String + zod で検証する(SQLite/Postgres 両対応のため DB enum は使わない)

export const TASK_STATUSES = ['todo', 'doing', 'blocked', 'done'] as const
export const taskStatusSchema = z.enum(TASK_STATUSES)
export type TaskStatus = z.infer<typeof taskStatusSchema>

export const FOCUS_KINDS = ['focus', 'break'] as const
export const focusKindSchema = z.enum(FOCUS_KINDS)
export type FocusKind = z.infer<typeof focusKindSchema>

export const idSchema = z.string().min(1)
export const isoDateTimeSchema = z.iso.datetime({ offset: true })
export const isoDateSchema = z.iso.date()
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, '#RRGGBB 形式で指定してください')
export const priorityLevelSchema = z.number().int().min(0).max(3)
export const tagNameSchema = z.string().trim().min(1).max(30)
export const tagNamesSchema = z.array(tagNameSchema).max(10)

// ---- Area(領域/プロジェクト)----
export const areaSchema = z.object({
  id: idSchema,
  name: z.string(),
  color: colorSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type Area = z.infer<typeof areaSchema>

export const areaCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: colorSchema.optional(),
})
export type AreaCreate = z.infer<typeof areaCreateSchema>

export const areaUpdateSchema = areaCreateSchema.partial()
export type AreaUpdate = z.infer<typeof areaUpdateSchema>

// ---- Task ----
export const taskSchema = z.object({
  id: idSchema,
  areaId: idSchema.nullable(),
  title: z.string(),
  notes: z.string().nullable(),
  status: taskStatusSchema,
  priority: priorityLevelSchema,
  estimateMin: z.number().int().nullable(),
  dueDate: isoDateTimeSchema.nullable(),
  position: z.number(),
  completedAt: isoDateTimeSchema.nullable(),
  tags: z.array(z.string()),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type Task = z.infer<typeof taskSchema>

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(5000).nullish(),
  areaId: idSchema.nullish(),
  status: taskStatusSchema.optional(),
  priority: priorityLevelSchema.optional(),
  estimateMin: z.number().int().min(1).max(1440).nullish(),
  dueDate: isoDateTimeSchema.nullish(),
  tags: tagNamesSchema.optional(),
})
export type TaskCreate = z.infer<typeof taskCreateSchema>

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  position: z.number().optional(),
})
export type TaskUpdate = z.infer<typeof taskUpdateSchema>

export const TASK_DUE_FILTERS = ['overdue', 'today', 'week'] as const
export const taskListQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  areaId: idSchema.optional(),
  tag: tagNameSchema.optional(),
  due: z.enum(TASK_DUE_FILTERS).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
export type TaskListQuery = z.infer<typeof taskListQuerySchema>

// ---- Focus(ポモドーロ)----
export const focusSessionSchema = z.object({
  id: idSchema,
  taskId: idSchema.nullable(),
  kind: focusKindSchema,
  plannedSec: z.number().int(),
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.nullable(),
  durationSec: z.number().int(),
})
export type FocusSession = z.infer<typeof focusSessionSchema>

export const focusStartSchema = z.object({
  taskId: idSchema.nullish(),
  kind: focusKindSchema.optional(),
  plannedSec: z.number().int().min(60).max(14400).optional(),
})
export type FocusStart = z.infer<typeof focusStartSchema>

// ---- Snippet(ナレッジ)----
export const snippetSchema = z.object({
  id: idSchema,
  title: z.string(),
  body: z.string(),
  language: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type Snippet = z.infer<typeof snippetSchema>

export const snippetCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().min(1).max(20000),
  language: z.string().trim().max(30).nullish(),
  tags: tagNamesSchema.optional(),
})
export type SnippetCreate = z.infer<typeof snippetCreateSchema>

export const snippetUpdateSchema = snippetCreateSchema.partial()
export type SnippetUpdate = z.infer<typeof snippetUpdateSchema>

export const snippetListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  tag: tagNameSchema.optional(),
})
export type SnippetListQuery = z.infer<typeof snippetListQuerySchema>

// ---- Overview(俯瞰)----
export const overviewSchema = z.object({
  areas: z.array(
    z.object({
      areaId: idSchema.nullable(),
      name: z.string(),
      color: colorSchema,
      total: z.number().int(),
      done: z.number().int(),
      doing: z.number().int(),
      blocked: z.number().int(),
      overdue: z.number().int(),
    }),
  ),
  week: z.object({
    plannedMin: z.number().int(),
    focusMin: z.number().int(),
  }),
  overdueCount: z.number().int(),
  blockedCount: z.number().int(),
  focusTrend: z.array(z.object({ date: isoDateSchema, minutes: z.number().int() })),
})
export type Overview = z.infer<typeof overviewSchema>

// ---- Report(日報/週次レビュー)----
export const reportQuerySchema = z.object({
  type: z.enum(['daily', 'weekly']),
  date: isoDateSchema.optional(),
})
export type ReportQuery = z.infer<typeof reportQuerySchema>

export const reportSchema = z.object({
  type: z.enum(['daily', 'weekly']),
  from: isoDateSchema,
  to: isoDateSchema,
  markdown: z.string(),
})
export type Report = z.infer<typeof reportSchema>

// ---- API エラー ----
export const API_ERROR_CODES = [
  'unauthorized',
  'not_found',
  'validation_error',
  'conflict',
  'internal_error',
] as const
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
})
export type ApiError = z.infer<typeof apiErrorSchema>
