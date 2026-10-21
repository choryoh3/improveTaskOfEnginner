'use client'

import type {
  Area,
  AreaCreate,
  AreaUpdate,
  FocusStart,
  ReportQuery,
  SnippetCreate,
  SnippetListQuery,
  SnippetUpdate,
  Task,
  TaskCreate,
  TaskListQuery,
  TaskUpdate,
} from '@app/shared'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, unwrap, unwrapEmpty } from './api'

// ---- クエリキー ----
export const keys = {
  tasks: (query?: TaskListQuery) => ['tasks', query ?? {}] as const,
  tasksAll: ['tasks'] as const,
  areas: ['areas'] as const,
  focusActive: ['focus', 'active'] as const,
  snippets: (query?: SnippetListQuery) => ['snippets', query ?? {}] as const,
  overview: ['overview'] as const,
  report: (query: ReportQuery) => ['report', query] as const,
}

/** タスクの変更は、俯瞰・日報の数字にも影響する */
const invalidateTaskDerived = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: keys.tasksAll }),
    qc.invalidateQueries({ queryKey: keys.overview }),
    qc.invalidateQueries({ queryKey: ['report'] }),
  ])

// ---- Tasks ----
export function useTasks(query?: TaskListQuery) {
  return useQuery({
    queryKey: keys.tasks(query),
    queryFn: async () => unwrap(await api().tasks.$get({ query: toQueryStrings(query) })),
  })
}

function toQueryStrings(query: TaskListQuery = {}) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  )
}

type TaskLists = [readonly unknown[], Task[] | undefined][]

/** 全てのタスク一覧キャッシュに変換を適用し、ロールバック用に元の値を返す */
async function patchTaskLists(qc: QueryClient, patch: (tasks: Task[]) => Task[]) {
  await qc.cancelQueries({ queryKey: keys.tasksAll })
  const snapshot: TaskLists = qc.getQueriesData<Task[]>({ queryKey: keys.tasksAll })
  for (const [key, tasks] of snapshot) {
    if (tasks) qc.setQueryData(key, patch(tasks))
  }
  return snapshot
}

function restore(qc: QueryClient, snapshot: TaskLists | undefined) {
  for (const [key, tasks] of snapshot ?? []) qc.setQueryData(key, tasks)
}

/** 一覧のフィルターに合致するか(合致が判断できない条件があれば false にして、サーバーに任せる) */
function matchesFilters(task: Task, query: TaskListQuery = {}) {
  if (query.due || query.q) return false
  if (query.status && task.status !== query.status) return false
  if (query.areaId && task.areaId !== query.areaId) return false
  if (query.tag && !task.tags.includes(query.tag)) return false
  return true
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TaskCreate) => unwrap(await api().tasks.$post({ json: input })),
    onMutate: async (input) => {
      const now = new Date().toISOString()
      const temp: Task = {
        id: `temp-${crypto.randomUUID()}`,
        areaId: input.areaId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        status: input.status ?? 'todo',
        priority: input.priority ?? 1,
        estimateMin: input.estimateMin ?? null,
        dueDate: input.dueDate ?? null,
        position: Number.MAX_SAFE_INTEGER,
        completedAt: null,
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
      }
      await qc.cancelQueries({ queryKey: keys.tasksAll })
      const snapshot: TaskLists = qc.getQueriesData<Task[]>({ queryKey: keys.tasksAll })
      for (const [key, tasks] of snapshot) {
        const query = (key[1] ?? {}) as TaskListQuery
        if (tasks && matchesFilters(temp, query)) qc.setQueryData(key, [...tasks, temp])
      }
      return { snapshot }
    },
    onError: (_error, _input, context) => restore(qc, context?.snapshot),
    onSettled: () => invalidateTaskDerived(qc),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskUpdate }) =>
      unwrap(await api().tasks[':id'].$patch({ param: { id }, json: patch })),
    onMutate: async ({ id, patch }) => ({
      snapshot: await patchTaskLists(qc, (tasks) =>
        tasks.map((task) => (task.id === id ? applyPatch(task, patch) : task)),
      ),
    }),
    onError: (_error, _vars, context) => restore(qc, context?.snapshot),
    onSettled: () => invalidateTaskDerived(qc),
  })
}

function applyPatch(task: Task, patch: TaskUpdate): Task {
  return {
    ...task,
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.notes !== undefined && { notes: patch.notes }),
    ...(patch.areaId !== undefined && { areaId: patch.areaId }),
    ...(patch.status !== undefined && {
      status: patch.status,
      completedAt: patch.status === 'done' ? new Date().toISOString() : null,
    }),
    ...(patch.priority !== undefined && { priority: patch.priority }),
    ...(patch.estimateMin !== undefined && { estimateMin: patch.estimateMin }),
    ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
    ...(patch.position !== undefined && { position: patch.position }),
    ...(patch.tags !== undefined && { tags: patch.tags }),
  }
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapEmpty(await api().tasks[':id'].$delete({ param: { id } })),
    onMutate: async (id) => ({
      snapshot: await patchTaskLists(qc, (tasks) => tasks.filter((task) => task.id !== id)),
    }),
    onError: (_error, _id, context) => restore(qc, context?.snapshot),
    onSettled: () => invalidateTaskDerived(qc),
  })
}

// ---- Areas ----
export function useAreas() {
  return useQuery({
    queryKey: keys.areas,
    queryFn: async () => unwrap(await api().areas.$get()),
    staleTime: 60_000,
  })
}

export function useCreateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AreaCreate) => unwrap(await api().areas.$post({ json: input })),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.areas }),
  })
}

export function useUpdateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AreaUpdate }) =>
      unwrap(await api().areas[':id'].$patch({ param: { id }, json: patch })),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: keys.areas }), invalidateTaskDerived(qc)]),
  })
}

export function useDeleteArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapEmpty(await api().areas[':id'].$delete({ param: { id } })),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: keys.areas }), invalidateTaskDerived(qc)]),
  })
}

export const areaById = (areas: Area[] | undefined) => new Map((areas ?? []).map((a) => [a.id, a]))

// ---- Focus ----
export function useActiveFocus() {
  return useQuery({
    queryKey: keys.focusActive,
    queryFn: async () => unwrap(await api().focus.active.$get()),
  })
}

export function useStartFocus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FocusStart) => unwrap(await api().focus.start.$post({ json: input })),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.focusActive }),
  })
}

export function useStopFocus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api().focus[':id'].stop.$post({ param: { id } })),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.focusActive }),
        qc.invalidateQueries({ queryKey: keys.overview }),
        qc.invalidateQueries({ queryKey: ['report'] }),
      ]),
  })
}

// ---- Snippets ----
export function useSnippets(query?: SnippetListQuery) {
  return useQuery({
    queryKey: keys.snippets(query),
    queryFn: async () =>
      unwrap(
        await api().snippets.$get({
          query: Object.fromEntries(Object.entries(query ?? {}).filter(([, v]) => v)) as Record<
            string,
            string
          >,
        }),
      ),
  })
}

export function useCreateSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SnippetCreate) => unwrap(await api().snippets.$post({ json: input })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['snippets'] }),
  })
}

export function useUpdateSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SnippetUpdate }) =>
      unwrap(await api().snippets[':id'].$patch({ param: { id }, json: patch })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['snippets'] }),
  })
}

export function useDeleteSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapEmpty(await api().snippets[':id'].$delete({ param: { id } })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['snippets'] }),
  })
}

// ---- Overview / Reports ----
export function useOverview() {
  return useQuery({
    queryKey: keys.overview,
    queryFn: async () => unwrap(await api().overview.$get()),
  })
}

export function useReport(query: ReportQuery) {
  return useQuery({
    queryKey: keys.report(query),
    queryFn: async () =>
      unwrap(
        await api().reports.$get({
          query: { type: query.type, ...(query.date && { date: query.date }) },
        }),
      ),
  })
}
