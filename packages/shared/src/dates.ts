// 「今日」「今週」の境界は、固定オフセット(分)で決める。例: JST は 540。
// DST のあるタイムゾーンは対象外(個人利用で固定オフセットを前提にする)。

const MIN = 60_000
const DAY = 86_400_000

export function startOfDay(date: Date, tzOffsetMin: number): Date {
  const local = date.getTime() + tzOffsetMin * MIN
  return new Date(Math.floor(local / DAY) * DAY - tzOffsetMin * MIN)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY)
}

/** 月曜始まりの週の開始 */
export function startOfWeek(date: Date, tzOffsetMin: number): Date {
  const dayStart = startOfDay(date, tzOffsetMin)
  const weekday = (new Date(dayStart.getTime() + tzOffsetMin * MIN).getUTCDay() + 6) % 7
  return addDays(dayStart, -weekday)
}

/** YYYY-MM-DD(指定オフセットでの暦日) */
export function formatDate(date: Date, tzOffsetMin: number): string {
  return new Date(date.getTime() + tzOffsetMin * MIN).toISOString().slice(0, 10)
}

/** YYYY-MM-DD を、その暦日の開始時刻(指定オフセット)に変換する */
export function parseDate(value: string, tzOffsetMin: number): Date {
  return new Date(Date.parse(`${value}T00:00:00Z`) - tzOffsetMin * MIN)
}
