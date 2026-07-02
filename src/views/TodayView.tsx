import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  BLEEDING_LEVELS,
  PAIN_LOCATIONS,
  SYMPTOMS,
  TRIGGERS,
  type Bleeding,
  type DailyLog,
} from '../db'
import { addDays, formatLong, todayISO } from '../dates'
import { cycleStats } from '../cycle'
import { BleedingPicker, ChipGroup, Scale } from '../components/ui'

function emptyLog(date: string): DailyLog {
  return {
    date,
    painAreas: [],
    bleeding: 'none',
    symptoms: [],
    medsTaken: [],
    triggers: [],
    updatedAt: new Date().toISOString(),
  }
}

export function TodayView({ initialDate }: { initialDate?: string }) {
  const [date, setDate] = useState(initialDate ?? todayISO())
  // null = still loading this day's entry; the form is not shown until it
  // resolves, so no tap can ever race the load and be dropped.
  const [log, setLog] = useState<DailyLog | null>(null)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [storageError, setStorageError] = useState<string | null>(null)

  const allLogs = useLiveQuery(() => db.dailyLogs.toArray(), [], [] as DailyLog[])
  const meds = useLiveQuery(() => db.medications.toArray(), [], [])
  const stats = useMemo(() => cycleStats(allLogs), [allLogs])

  useEffect(() => {
    let cancelled = false
    setLog(null)
    setStatus('idle')
    db.dailyLogs
      .get(date)
      .then((existing) => {
        if (!cancelled) setLog(existing ?? emptyLog(date))
      })
      .catch((e: unknown) => {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [date])

  async function save(next: DailyLog) {
    setLog(next)
    try {
      await db.dailyLogs.put({ ...next, updatedAt: new Date().toISOString() })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const isToday = date === todayISO()
  const cycleDay =
    stats.lastPeriodStart && date >= stats.lastPeriodStart
      ? Math.round(
          (new Date(date).getTime() - new Date(stats.lastPeriodStart).getTime()) / 86_400_000,
        ) + 1
      : null

  const header = (
    <>
      <h1>Daily log</h1>
      <p className="subtitle">A minute a day builds the picture.</p>

      <div className="datestrip">
        <button type="button" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
          ‹
        </button>
        <div className="when">
          <strong>{isToday ? 'Today' : formatLong(date)}</strong>
          <span>
            {isToday ? formatLong(date) : ''}
            {cycleDay ? `${isToday ? ' · ' : ''}Cycle day ${cycleDay}` : ''}
          </span>
        </div>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => setDate(addDays(date, 1))}
          disabled={isToday}
          style={{ opacity: isToday ? 0.35 : 1 }}
        >
          ›
        </button>
      </div>
    </>
  )

  if (storageError) {
    return (
      <>
        {header}
        <div className="card">
          <h2>Storage unavailable</h2>
          <p className="empty">
            This browser is blocking local storage, so entries can’t be saved. This usually happens
            in private browsing or inside another app’s built-in browser — open the app in Safari or
            Chrome and add it to your home screen instead. ({storageError})
          </p>
        </div>
      </>
    )
  }

  if (!log) {
    return (
      <>
        {header}
        <p className="empty">Loading…</p>
      </>
    )
  }

  const update = (patch: Partial<DailyLog>) => save({ ...log, ...patch })

  const togglePain = (location: string) => {
    const has = log.painAreas.some((p) => p.location === location)
    update({
      painAreas: has
        ? log.painAreas.filter((p) => p.location !== location)
        : [...log.painAreas, { location, severity: 5 }],
    })
  }

  const setSeverity = (location: string, severity: number | undefined) => {
    update({
      painAreas:
        severity == null
          ? log.painAreas.filter((p) => p.location !== location)
          : log.painAreas.map((p) => (p.location === location ? { ...p, severity } : p)),
    })
  }

  const toggleIn = (key: 'symptoms' | 'triggers' | 'medsTaken') => (v: string) => {
    const arr = log[key]
    update({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as Partial<DailyLog>)
  }

  const currentMeds = meds.filter((m) => !m.endDate)
  const medOptions = Array.from(
    new Set([...currentMeds.map((m) => m.name), ...log.medsTaken]),
  )

  return (
    <>
      {header}

      <div className="card">
        <h2>
          Bleeding <span className="hint">period days are derived from this</span>
        </h2>
        <BleedingPicker<Bleeding>
          options={BLEEDING_LEVELS}
          value={log.bleeding}
          onChange={(bleeding) => update({ bleeding })}
        />
      </div>

      <div className="card">
        <h2>
          Pain <span className="hint">tap a location, then rate 1–10</span>
        </h2>
        <ChipGroup
          options={PAIN_LOCATIONS}
          selected={log.painAreas.map((p) => p.location)}
          onToggle={togglePain}
        />
        {log.painAreas.map((p) => (
          <label className="field" key={p.location} style={{ marginTop: 12 }}>
            <span>{p.location}</span>
            <Scale
              value={p.severity}
              onChange={(v) => setSeverity(p.location, v)}
              ariaLabel={`${p.location} pain severity`}
            />
          </label>
        ))}
      </div>

      <div className="card">
        <h2>Symptoms</h2>
        <ChipGroup options={SYMPTOMS} selected={log.symptoms} onToggle={toggleIn('symptoms')} />
      </div>

      <div className="card">
        <h2>Wellbeing</h2>
        <label className="field">
          <span>Energy (1 = drained, 10 = great)</span>
          <Scale value={log.energy} onChange={(energy) => update({ energy })} ariaLabel="Energy" />
        </label>
        <label className="field">
          <span>Mood (1 = low, 10 = great)</span>
          <Scale value={log.mood} onChange={(mood) => update({ mood })} ariaLabel="Mood" />
        </label>
        <label className="field">
          <span>Sleep (hours)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.5"
            value={log.sleepHours ?? ''}
            onChange={(e) =>
              update({ sleepHours: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </label>
      </div>

      <div className="card">
        <h2>
          Medication taken{' '}
          <span className="hint">{currentMeds.length === 0 ? 'add meds under Medical' : ''}</span>
        </h2>
        {medOptions.length > 0 ? (
          <ChipGroup options={medOptions} selected={log.medsTaken} onToggle={toggleIn('medsTaken')} />
        ) : (
          <p className="empty">No current medications — add them in the Medical tab and they’ll appear here.</p>
        )}
      </div>

      <div className="card">
        <h2>Possible triggers</h2>
        <ChipGroup options={TRIGGERS} selected={log.triggers} onToggle={toggleIn('triggers')} />
      </div>

      <div className="card">
        <h2>Notes</h2>
        <textarea
          placeholder="Anything else worth remembering — flare details, what helped, food, context…"
          value={log.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </div>

      <p
        className="saved-note"
        aria-live="polite"
        style={status === 'error' ? { color: 'var(--danger)' } : undefined}
      >
        {status === 'saved' && 'Saved ✓'}
        {status === 'error' &&
          'Couldn’t save — this browser may be blocking storage (private browsing?)'}
      </p>
    </>
  )
}
