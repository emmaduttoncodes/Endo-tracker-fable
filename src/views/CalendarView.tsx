import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DailyLog } from '../db'
import { addDays, formatMedium, parseISO, toISODate, todayISO } from '../dates'
import { cycleStats, maxPain } from '../cycle'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function bleedClass(log: DailyLog | undefined): string {
  switch (log?.bleeding) {
    case 'spotting':
      return 'b1'
    case 'light':
      return 'b2'
    case 'medium':
      return 'b3'
    case 'heavy':
      return 'b4'
    default:
      return ''
  }
}

export function CalendarView({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const now = new Date()
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() })

  const logs = useLiveQuery(() => db.dailyLogs.toArray(), [], [] as DailyLog[])
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs])
  const stats = useMemo(() => cycleStats(logs), [logs])

  const predicted = useMemo(() => {
    const set = new Set<string>()
    if (stats.predictedNextStart && stats.avgPeriodLength) {
      for (let i = 0; i < stats.avgPeriodLength; i++) {
        set.add(addDays(stats.predictedNextStart, i))
      }
    }
    return set
  }, [stats])

  const first = new Date(month.y, month.m, 1)
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const today = todayISO()
  const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(month.y, month.m, i + 1))),
  ]

  return (
    <>
      <h1>Cycle</h1>
      <p className="subtitle">Bleeding, pain and predictions at a glance.</p>

      <div className="stat-row">
        <div className="stat">
          <div className="label">Cycle day</div>
          <div className="value">{stats.cycleDayToday ?? '—'}</div>
          <div className="sub">
            {stats.lastPeriodStart ? `last period ${formatMedium(stats.lastPeriodStart)}` : 'log bleeding to start'}
          </div>
        </div>
        <div className="stat">
          <div className="label">Avg cycle</div>
          <div className="value">{stats.avgCycleLength ? `${stats.avgCycleLength}d` : '—'}</div>
          <div className="sub">
            {stats.avgPeriodLength ? `period ~${stats.avgPeriodLength}d` : 'needs 2+ cycles'}
          </div>
        </div>
        <div className="stat">
          <div className="label">Next period</div>
          <div className="value">
            {stats.predictedNextStart ? formatMedium(stats.predictedNextStart).replace(/,? \d{4}$/, '') : '—'}
          </div>
          <div className="sub">estimated</div>
        </div>
      </div>

      <div className="card">
        <div className="cal-head">
          <button
            type="button"
            className="ghost"
            onClick={() => setMonth(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}
          >
            ‹
          </button>
          <strong>{monthName}</strong>
          <button
            type="button"
            className="ghost"
            onClick={() => setMonth(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}
          >
            ›
          </button>
        </div>
        <div className="cal-grid">
          {DOW.map((d, i) => (
            <div className="cal-dow" key={i}>
              {d}
            </div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`x${i}`} />
            const log = byDate.get(iso)
            const cls = [
              'cal-cell',
              bleedClass(log),
              iso === today ? 'today' : '',
              !log && predicted.has(iso) ? 'predicted' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const future = iso > today
            return (
              <button
                key={iso}
                type="button"
                className={cls}
                disabled={future}
                onClick={() => onOpenDay(iso)}
                aria-label={formatMedium(iso)}
              >
                {parseISO(iso).getDate()}
                {log && maxPain(log) >= 6 && <span className="pain-dot" aria-hidden />}
              </button>
            )
          })}
        </div>
        <div className="legend-row">
          <span className="key">
            <span className="swatch" style={{ background: 'var(--bleed-1)' }} /> spotting
          </span>
          <span className="key">
            <span className="swatch" style={{ background: 'var(--bleed-2)' }} /> light
          </span>
          <span className="key">
            <span className="swatch" style={{ background: 'var(--bleed-3)' }} /> medium
          </span>
          <span className="key">
            <span className="swatch" style={{ background: 'var(--bleed-4)' }} /> heavy
          </span>
          <span className="key">
            <span
              className="swatch"
              style={{ background: 'var(--series-1)', width: 6, height: 6, borderRadius: '50%' }}
            />{' '}
            pain ≥ 6
          </span>
          <span className="key">
            <span className="swatch" style={{ border: '1px dashed var(--bleed-3)' }} /> predicted
          </span>
        </div>
      </div>

      <div className="card">
        <h2>Recent periods</h2>
        {stats.periods.length === 0 ? (
          <p className="empty">No periods logged yet. Log bleeding in the daily log and they’ll show up here.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Started</th>
                <th className="num">Length</th>
                <th className="num">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.periods]
                .reverse()
                .slice(0, 8)
                .map((p, i, arr) => {
                  const prev = arr[i + 1]
                  const cycleLen = prev
                    ? Math.round(
                        (parseISO(p.start).getTime() - parseISO(prev.start).getTime()) / 86_400_000,
                      )
                    : null
                  return (
                    <tr key={p.start}>
                      <td>{formatMedium(p.start)}</td>
                      <td className="num">{p.lengthDays}d</td>
                      <td className="num">{cycleLen ? `${cycleLen}d` : '—'}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
