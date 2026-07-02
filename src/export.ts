import { db, type DailyLog } from './db'
import { formatMedium, todayISO } from './dates'
import { cycleStats, maxPain } from './cycle'

export interface ExportBundle {
  app: 'endo-tracker'
  schemaVersion: 1
  exportedAt: string
  dailyLogs: unknown[]
  appointments: unknown[]
  labResults: unknown[]
  medications: unknown[]
  settings: unknown[]
}

export async function buildExport(): Promise<ExportBundle> {
  const [dailyLogs, appointments, labResults, medications, settings] = await Promise.all([
    db.dailyLogs.toArray(),
    db.appointments.toArray(),
    db.labResults.toArray(),
    db.medications.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'endo-tracker',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    dailyLogs,
    appointments,
    labResults,
    medications,
    settings,
  }
}

export async function importBundle(json: string): Promise<{ imported: boolean; error?: string }> {
  let bundle: ExportBundle
  try {
    bundle = JSON.parse(json)
  } catch {
    return { imported: false, error: 'Not valid JSON.' }
  }
  if (bundle.app !== 'endo-tracker' || !Array.isArray(bundle.dailyLogs)) {
    return { imported: false, error: 'Not an Endo Tracker export file.' }
  }
  await db.transaction('rw', db.dailyLogs, db.appointments, db.labResults, db.medications, db.settings, async () => {
    await db.dailyLogs.bulkPut(bundle.dailyLogs as never[])
    // strip ids so restored rows never collide with existing ones
    await db.appointments.bulkAdd((bundle.appointments as { id?: number }[]).map(({ id: _id, ...r }) => r) as never[])
    await db.labResults.bulkAdd((bundle.labResults as { id?: number }[]).map(({ id: _id, ...r }) => r) as never[])
    await db.medications.bulkAdd((bundle.medications as { id?: number }[]).map(({ id: _id, ...r }) => r) as never[])
    await db.settings.bulkPut((bundle.settings ?? []) as never[])
  })
  return { imported: true }
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

/**
 * Human/AI-readable summary — designed to be handed to a clinician or pasted
 * into an AI assistant as context.
 */
export async function buildMarkdownSummary(): Promise<string> {
  const bundle = await buildExport()
  const logs = (bundle.dailyLogs as DailyLog[]).sort((a, b) => a.date.localeCompare(b.date))
  const stats = cycleStats(logs)
  const lines: string[] = []

  lines.push('# Health summary — endometriosis tracking')
  lines.push('')
  lines.push(`Generated ${formatMedium(todayISO())} from ${logs.length} daily log entries.`)
  lines.push('')

  lines.push('## Cycle')
  if (stats.periods.length > 0) {
    lines.push(`- Average cycle length: ${stats.avgCycleLength ? `${stats.avgCycleLength} days` : 'unknown (fewer than 2 cycles logged)'}`)
    lines.push(`- Average period length: ${stats.avgPeriodLength} days`)
    lines.push(`- Last period started: ${stats.lastPeriodStart}`)
    if (stats.predictedNextStart) lines.push(`- Predicted next period: ${stats.predictedNextStart}`)
    lines.push('')
    lines.push('| Period start | Length (days) |')
    lines.push('|---|---|')
    for (const p of stats.periods.slice(-8)) lines.push(`| ${p.start} | ${p.lengthDays} |`)
  } else {
    lines.push('- No periods logged yet.')
  }
  lines.push('')

  const last90 = logs.filter((l) => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return l.date >= d.toISOString().slice(0, 10)
  })
  lines.push('## Symptoms (last 90 days)')
  if (last90.length > 0) {
    const painDays = last90.filter((l) => maxPain(l) > 0)
    lines.push(`- Days logged: ${last90.length}; days with pain: ${painDays.length}`)
    const avgPain = avg(painDays.map(maxPain))
    if (avgPain != null) lines.push(`- Average worst pain on pain days: ${avgPain}/10`)
    const severe = painDays.filter((l) => maxPain(l) >= 7).length
    lines.push(`- Days with severe pain (≥7/10): ${severe}`)

    const counts = new Map<string, number>()
    for (const l of last90) {
      for (const s of l.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1)
      for (const p of l.painAreas) counts.set(`${p.location} pain`, (counts.get(`${p.location} pain`) ?? 0) + 1)
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    if (top.length > 0) {
      lines.push('')
      lines.push('| Symptom | Days affected |')
      lines.push('|---|---|')
      for (const [s, n] of top) lines.push(`| ${s} | ${n} |`)
    }

    const trig = new Map<string, number>()
    for (const l of last90) for (const t of l.triggers) trig.set(t, (trig.get(t) ?? 0) + 1)
    const topTrig = [...trig.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (topTrig.length > 0) {
      lines.push('')
      lines.push(`- Most-noted triggers: ${topTrig.map(([t, n]) => `${t} (${n})`).join(', ')}`)
    }
  } else {
    lines.push('- No entries in the last 90 days.')
  }
  lines.push('')

  const meds = bundle.medications as { name: string; dose?: string; frequency?: string; reason?: string; endDate?: string; notes?: string }[]
  const current = meds.filter((m) => !m.endDate)
  lines.push('## Current medications')
  if (current.length > 0) {
    for (const m of current) {
      lines.push(`- ${[m.name, m.dose, m.frequency].filter(Boolean).join(', ')}${m.reason ? ` — ${m.reason}` : ''}${m.notes ? ` (${m.notes})` : ''}`)
    }
  } else {
    lines.push('- None recorded.')
  }
  lines.push('')

  const labs = bundle.labResults as { date: string; panel?: string; testName: string; value: string; unit?: string; referenceRange?: string; flag?: string }[]
  lines.push('## Recent blood test results')
  if (labs.length > 0) {
    const recent = [...labs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
    lines.push('| Date | Test | Result | Reference | Flag |')
    lines.push('|---|---|---|---|---|')
    for (const l of recent) {
      lines.push(`| ${l.date} | ${l.testName}${l.panel ? ` (${l.panel})` : ''} | ${l.value}${l.unit ? ` ${l.unit}` : ''} | ${l.referenceRange ?? ''} | ${l.flag ?? ''} |`)
    }
  } else {
    lines.push('- None recorded.')
  }
  lines.push('')

  const appts = bundle.appointments as { date: string; clinician: string; specialty?: string; purpose?: string; outcome?: string }[]
  lines.push('## Appointments')
  if (appts.length > 0) {
    for (const a of [...appts].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 10)) {
      lines.push(`- ${a.date}: ${a.clinician}${a.specialty ? ` (${a.specialty})` : ''}${a.purpose ? ` — ${a.purpose}` : ''}${a.outcome ? `. Outcome: ${a.outcome}` : ''}`)
    }
  } else {
    lines.push('- None recorded.')
  }
  lines.push('')

  const notable = logs.filter((l) => l.notes?.trim()).slice(-10)
  if (notable.length > 0) {
    lines.push('## Recent notes')
    for (const l of notable) lines.push(`- ${l.date}: ${l.notes!.trim().replace(/\n+/g, ' ')}`)
    lines.push('')
  }

  return lines.join('\n')
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
