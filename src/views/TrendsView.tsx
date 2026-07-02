import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DailyLog } from '../db'
import { addDays, formatShort, todayISO } from '../dates'
import { cycleDayFor, derivePeriods, maxPain } from '../cycle'
import { BarChartH, ColumnChart, LineChart, TableTwin, type LinePoint } from '../components/charts'
import { Segmented } from '../components/ui'

type Range = '30d' | '90d' | '180d'
const RANGE_DAYS: Record<Range, number> = { '30d': 30, '90d': 90, '180d': 180 }

export function TrendsView() {
  const [range, setRange] = useState<Range>('90d')
  const logs = useLiveQuery(() => db.dailyLogs.toArray(), [], [] as DailyLog[])

  const days = RANGE_DAYS[range]
  const from = addDays(todayISO(), -(days - 1))
  const inRange = useMemo(
    () => logs.filter((l) => l.date >= from).sort((a, b) => a.date.localeCompare(b.date)),
    [logs, from],
  )
  const byDate = useMemo(() => new Map(inRange.map((l) => [l.date, l])), [inRange])

  // Pain over time: one point per calendar day; unlogged days are gaps.
  const painPoints: LinePoint[] = useMemo(() => {
    const pts: LinePoint[] = []
    for (let i = 0; i < days; i++) {
      const d = addDays(from, i)
      const log = byDate.get(d)
      pts.push({ label: formatShort(d), value: log ? maxPain(log) : null })
    }
    return pts
  }, [byDate, from, days])

  // Symptom frequency
  const symptomCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of inRange) {
      for (const s of l.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1)
      for (const p of l.painAreas) {
        const key = `${p.location} pain`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [inRange])

  // Average pain by cycle day (uses all history, not just the range)
  const byCycleDay = useMemo(() => {
    const periods = derivePeriods(logs)
    const sums = new Map<number, { total: number; n: number }>()
    for (const l of logs) {
      const cd = cycleDayFor(l.date, periods)
      if (!cd || cd > 35) continue
      const cur = sums.get(cd) ?? { total: 0, n: 0 }
      cur.total += maxPain(l)
      cur.n += 1
      sums.set(cd, cur)
    }
    const maxDay = Math.max(0, ...sums.keys())
    const out: { label: string; value: number }[] = []
    for (let d = 1; d <= Math.min(maxDay, 35); d++) {
      const s = sums.get(d)
      out.push({ label: String(d), value: s ? Math.round((s.total / s.n) * 10) / 10 : 0 })
    }
    return out
  }, [logs])

  const loggedDays = inRange.length

  return (
    <>
      <h1>Trends</h1>
      <p className="subtitle">
        {loggedDays} day{loggedDays === 1 ? '' : 's'} logged in this range.
      </p>

      <div style={{ marginBottom: 14 }}>
        <Segmented<Range>
          options={['30d', '90d', '180d']}
          value={range}
          onChange={setRange}
          labels={{ '30d': '30 days', '90d': '90 days', '180d': '6 months' }}
        />
      </div>

      {loggedDays === 0 ? (
        <div className="card">
          <p className="empty">
            Nothing to chart yet — log a few days of symptoms and trends will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>
              Worst daily pain <span className="hint">0–10 · gaps = not logged</span>
            </h2>
            <LineChart points={painPoints} yMax={10} />
            <TableTwin
              caption="Worst daily pain by date"
              headers={['Date', 'Worst pain']}
              rows={inRange.map((l) => [formatShort(l.date), maxPain(l)])}
            />
          </div>

          {symptomCounts.length > 0 && (
            <div className="card">
              <h2>
                Most frequent symptoms <span className="hint">days affected</span>
              </h2>
              <BarChartH data={symptomCounts} />
              <TableTwin
                caption="Symptom frequency"
                headers={['Symptom', 'Days']}
                rows={symptomCounts.map((s) => [s.label, s.value])}
              />
            </div>
          )}

          {byCycleDay.length >= 5 && (
            <div className="card">
              <h2>
                Average pain by cycle day <span className="hint">all history</span>
              </h2>
              <ColumnChart data={byCycleDay} yMax={10} xLabel="Cycle day (1 = period start)" />
              <TableTwin
                caption="Average pain by cycle day"
                headers={['Cycle day', 'Avg worst pain']}
                rows={byCycleDay.map((d) => [d.label, d.value])}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}
