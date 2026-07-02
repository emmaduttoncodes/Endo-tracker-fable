import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todayISO } from '../dates'
import { buildExport, buildMarkdownSummary, download, importBundle } from '../export'

export function MoreView() {
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(
    async () => ({
      logs: await db.dailyLogs.count(),
      appts: await db.appointments.count(),
      labs: await db.labResults.count(),
      meds: await db.medications.count(),
    }),
    [],
    { logs: 0, appts: 0, labs: 0, meds: 0 },
  )

  async function exportJSON() {
    const bundle = await buildExport()
    download(`endo-tracker-export-${todayISO()}.json`, JSON.stringify(bundle, null, 2), 'application/json')
    setMsg('Full JSON export downloaded.')
  }

  async function exportMarkdown() {
    const md = await buildMarkdownSummary()
    download(`health-summary-${todayISO()}.md`, md, 'text/markdown')
    setMsg('Markdown summary downloaded.')
  }

  async function copyMarkdown() {
    const md = await buildMarkdownSummary()
    await navigator.clipboard.writeText(md)
    setMsg('Summary copied — paste it to your clinician or an AI assistant.')
  }

  async function onImportFile(file: File) {
    const text = await file.text()
    const result = await importBundle(text)
    setMsg(result.imported ? 'Import complete.' : `Import failed: ${result.error}`)
  }

  return (
    <>
      <h1>Your data</h1>
      <p className="subtitle">
        Everything lives only on this device — nothing is uploaded anywhere.
      </p>

      <div className="stat-row">
        <div className="stat">
          <div className="label">Daily logs</div>
          <div className="value">{counts.logs}</div>
        </div>
        <div className="stat">
          <div className="label">Appointments</div>
          <div className="value">{counts.appts}</div>
        </div>
        <div className="stat">
          <div className="label">Blood tests</div>
          <div className="value">{counts.labs}</div>
        </div>
        <div className="stat">
          <div className="label">Medications</div>
          <div className="value">{counts.meds}</div>
        </div>
      </div>

      <div className="card">
        <h2>Share / health-brain export</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          The Markdown summary condenses your cycle stats, symptom patterns, medications, results and
          appointments into a document you can hand to a doctor — or paste into an AI assistant as
          context for spotting patterns and preparing for appointments.
        </p>
        <div className="row" style={{ marginBottom: 10 }}>
          <button type="button" className="primary" onClick={exportMarkdown}>
            Download summary (.md)
          </button>
        </div>
        <div className="row">
          <button type="button" className="ghost" onClick={copyMarkdown}>
            Copy summary to clipboard
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Backup &amp; restore</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          Because your data never leaves this device, take a JSON backup now and then. The same file
          is the full machine-readable dataset for future AI analysis.
        </p>
        <div className="row" style={{ marginBottom: 10 }}>
          <button type="button" className="ghost" onClick={exportJSON}>
            Export everything (.json)
          </button>
          <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImportFile(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="card">
        <h2>About</h2>
        <p className="hint">
          Endo Tracker is a private, offline-first symptom diary for endometriosis: daily symptom and
          cycle logging, medical records, and exportable context for clinicians or AI tools. It is not
          a medical device and doesn’t give medical advice — always talk to your care team about
          changes in your symptoms.
        </p>
      </div>

      <p className="saved-note" aria-live="polite">
        {msg}
      </p>
    </>
  )
}
