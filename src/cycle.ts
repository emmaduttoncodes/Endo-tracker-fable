import type { DailyLog } from './db'
import { addDays, daysBetween, todayISO } from './dates'

export interface Period {
  start: string
  end: string
  lengthDays: number
}

export interface CycleStats {
  periods: Period[]
  avgCycleLength: number | null // start-to-start, days
  avgPeriodLength: number | null
  lastPeriodStart: string | null
  predictedNextStart: string | null
  /** Cycle day today (1 = first day of last period), null if no period logged. */
  cycleDayToday: number | null
}

function isPeriodDay(log: DailyLog): boolean {
  return log.bleeding === 'light' || log.bleeding === 'medium' || log.bleeding === 'heavy'
}

/**
 * Derive periods from logged bleeding. Consecutive bleeding days form one
 * period; a single-day gap (e.g. a lighter day that wasn't logged) doesn't
 * split it.
 */
export function derivePeriods(logs: DailyLog[]): Period[] {
  const days = logs
    .filter(isPeriodDay)
    .map((l) => l.date)
    .sort()
  const periods: Period[] = []
  for (const day of days) {
    const current = periods[periods.length - 1]
    if (current && daysBetween(current.end, day) <= 2) {
      current.end = day
    } else {
      periods.push({ start: day, end: day, lengthDays: 1 })
    }
  }
  for (const p of periods) p.lengthDays = daysBetween(p.start, p.end) + 1
  return periods
}

export function cycleStats(logs: DailyLog[]): CycleStats {
  const periods = derivePeriods(logs)
  const starts = periods.map((p) => p.start)

  let avgCycleLength: number | null = null
  if (starts.length >= 2) {
    // Use up to the last 6 cycles; ignore implausible gaps (missed logging).
    const gaps: number[] = []
    for (let i = 1; i < starts.length; i++) {
      const gap = daysBetween(starts[i - 1], starts[i])
      if (gap >= 15 && gap <= 60) gaps.push(gap)
    }
    const recent = gaps.slice(-6)
    if (recent.length > 0) {
      avgCycleLength = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    }
  }

  const avgPeriodLength =
    periods.length > 0
      ? Math.round(periods.reduce((a, p) => a + p.lengthDays, 0) / periods.length)
      : null

  const lastPeriodStart = starts.length > 0 ? starts[starts.length - 1] : null
  const predictedNextStart =
    lastPeriodStart && avgCycleLength ? addDays(lastPeriodStart, avgCycleLength) : null

  const cycleDayToday = lastPeriodStart ? daysBetween(lastPeriodStart, todayISO()) + 1 : null

  return { periods, avgCycleLength, avgPeriodLength, lastPeriodStart, predictedNextStart, cycleDayToday }
}

/** Cycle day for an arbitrary date (1-based), or null if it precedes all periods. */
export function cycleDayFor(date: string, periods: Period[]): number | null {
  let start: string | null = null
  for (const p of periods) {
    if (p.start <= date) start = p.start
    else break
  }
  return start ? daysBetween(start, date) + 1 : null
}

export function maxPain(log: DailyLog): number {
  return log.painAreas.reduce((m, p) => Math.max(m, p.severity), 0)
}
