export const APP_NAME = 'improveTaskOfEnginner'

export const DB_TARGETS = ['sqlite', 'postgres'] as const
export type DbTarget = (typeof DB_TARGETS)[number]
