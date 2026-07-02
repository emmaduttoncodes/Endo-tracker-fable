import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Appointment, type LabResult, type Medication } from '../db'
import { formatMedium, todayISO } from '../dates'

type Tab = 'appointments' | 'labs' | 'medications'

export function MedicalView() {
  const [tab, setTab] = useState<Tab>('appointments')
  return (
    <>
      <h1>Medical</h1>
      <p className="subtitle">Your appointments, results and medications in one place.</p>
      <div className="subtabs">
        <button type="button" className={tab === 'appointments' ? 'on' : ''} onClick={() => setTab('appointments')}>
          Appointments
        </button>
        <button type="button" className={tab === 'labs' ? 'on' : ''} onClick={() => setTab('labs')}>
          Blood tests
        </button>
        <button type="button" className={tab === 'medications' ? 'on' : ''} onClick={() => setTab('medications')}>
          Medications
        </button>
      </div>
      {tab === 'appointments' && <Appointments />}
      {tab === 'labs' && <Labs />}
      {tab === 'medications' && <Medications />}
    </>
  )
}

/* ---------------- appointments ---------------- */

const emptyAppt: Appointment = { date: todayISO(), clinician: '' }

function Appointments() {
  const appts = useLiveQuery(() => db.appointments.orderBy('date').reverse().toArray(), [], [])
  const [editing, setEditing] = useState<Appointment | null>(null)

  const today = todayISO()
  const upcoming = appts.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = appts.filter((a) => a.date < today)

  async function submit(a: Appointment) {
    if (!a.clinician.trim()) return
    try {
      await db.appointments.put(a)
      setEditing(null)
    } catch {
      alert('Couldn’t save — this browser may be blocking storage (private browsing?).')
    }
  }

  return (
    <>
      {editing ? (
        <ApptForm value={editing} onSubmit={submit} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="primary" style={{ marginBottom: 14 }} onClick={() => setEditing({ ...emptyAppt, date: todayISO() })}>
          + Add appointment
        </button>
      )}

      <div className="card">
        <h2>Upcoming</h2>
        {upcoming.length === 0 && <p className="empty">Nothing booked.</p>}
        {upcoming.map((a) => (
          <ApptItem key={a.id} a={a} onEdit={() => setEditing(a)} />
        ))}
      </div>
      <div className="card">
        <h2>Past</h2>
        {past.length === 0 && <p className="empty">No past appointments yet.</p>}
        {past.map((a) => (
          <ApptItem key={a.id} a={a} onEdit={() => setEditing(a)} />
        ))}
      </div>
    </>
  )
}

function ApptItem({ a, onEdit }: { a: Appointment; onEdit: () => void }) {
  return (
    <div className="item">
      <div className="title-line">
        <strong>
          {a.clinician}
          {a.specialty ? ` · ${a.specialty}` : ''}
        </strong>
        <span className="date">
          {formatMedium(a.date)}
          {a.time ? ` ${a.time}` : ''}
        </span>
      </div>
      {(a.location || a.purpose) && (
        <div className="meta">{[a.purpose, a.location].filter(Boolean).join(' · ')}</div>
      )}
      {a.questions && <div className="note">❓ {a.questions}</div>}
      {a.outcome && <div className="note">📝 {a.outcome}</div>}
      <div className="actions">
        <button type="button" className="ghost" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="ghost danger"
          onClick={() => {
            if (confirm('Delete this appointment?')) void db.appointments.delete(a.id!)
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ApptForm({
  value,
  onSubmit,
  onCancel,
}: {
  value: Appointment
  onSubmit: (a: Appointment) => void
  onCancel: () => void
}) {
  const [a, setA] = useState(value)
  const set = (patch: Partial<Appointment>) => setA({ ...a, ...patch })
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(a)
      }}
    >
      <h2>{a.id ? 'Edit appointment' : 'New appointment'}</h2>
      <div className="form-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" required value={a.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="field">
          <span>Time</span>
          <input type="time" value={a.time ?? ''} onChange={(e) => set({ time: e.target.value })} />
        </label>
        <label className="field">
          <span>Clinician *</span>
          <input type="text" required value={a.clinician} onChange={(e) => set({ clinician: e.target.value })} placeholder="Dr Patel" />
        </label>
        <label className="field">
          <span>Specialty</span>
          <input type="text" value={a.specialty ?? ''} onChange={(e) => set({ specialty: e.target.value })} placeholder="Gynaecology" />
        </label>
        <label className="field full">
          <span>Location</span>
          <input type="text" value={a.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
        </label>
        <label className="field full">
          <span>Purpose</span>
          <input type="text" value={a.purpose ?? ''} onChange={(e) => set({ purpose: e.target.value })} placeholder="Follow-up on scan results" />
        </label>
        <label className="field full">
          <span>Questions to ask / bring up</span>
          <textarea value={a.questions ?? ''} onChange={(e) => set({ questions: e.target.value })} />
        </label>
        <label className="field full">
          <span>Outcome / what was said</span>
          <textarea value={a.outcome ?? ''} onChange={(e) => set({ outcome: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save
        </button>
      </div>
    </form>
  )
}

/* ---------------- labs ---------------- */

function Labs() {
  const labs = useLiveQuery(() => db.labResults.orderBy('date').reverse().toArray(), [], [])
  const [editing, setEditing] = useState<LabResult | null>(null)

  // group by date + panel
  const groups = new Map<string, LabResult[]>()
  for (const l of labs) {
    const key = `${l.date}|${l.panel ?? ''}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(l)
  }

  async function submit(l: LabResult) {
    if (!l.testName.trim()) return
    try {
      await db.labResults.put(l)
      setEditing(null)
    } catch {
      alert('Couldn’t save — this browser may be blocking storage (private browsing?).')
    }
  }

  return (
    <>
      {editing ? (
        <LabForm value={editing} onSubmit={submit} onCancel={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          className="primary"
          style={{ marginBottom: 14 }}
          onClick={() => setEditing({ date: todayISO(), testName: '', value: '' })}
        >
          + Add blood test result
        </button>
      )}

      {groups.size === 0 && (
        <div className="card">
          <p className="empty">No results yet. Add each test from a blood draw — they’ll be grouped by date.</p>
        </div>
      )}
      {[...groups.entries()].map(([key, results]) => {
        const [date, panel] = key.split('|')
        return (
          <div className="card" key={key}>
            <h2>
              {panel || 'Blood tests'} <span className="hint">{formatMedium(date)}</span>
            </h2>
            <table className="data">
              <thead>
                <tr>
                  <th>Test</th>
                  <th className="num">Result</th>
                  <th className="num">Range</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.testName}
                      {l.flag ? (
                        <>
                          {' '}
                          <span className={`flag ${l.flag}`}>{l.flag}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="num">
                      {l.value}
                      {l.unit ? ` ${l.unit}` : ''}
                    </td>
                    <td className="num">{l.referenceRange ?? ''}</td>
                    <td className="num">
                      <button type="button" className="ghost" style={{ padding: '3px 10px', fontSize: 12.5 }} onClick={() => setEditing(l)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </>
  )
}

function LabForm({
  value,
  onSubmit,
  onCancel,
}: {
  value: LabResult
  onSubmit: (l: LabResult) => void
  onCancel: () => void
}) {
  const [l, setL] = useState(value)
  const set = (patch: Partial<LabResult>) => setL({ ...l, ...patch })
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(l)
      }}
    >
      <h2>{l.id ? 'Edit result' : 'New result'}</h2>
      <div className="form-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" required value={l.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="field">
          <span>Panel</span>
          <input type="text" value={l.panel ?? ''} onChange={(e) => set({ panel: e.target.value })} placeholder="Hormone panel" />
        </label>
        <label className="field">
          <span>Test *</span>
          <input type="text" required value={l.testName} onChange={(e) => set({ testName: e.target.value })} placeholder="Ferritin" />
        </label>
        <label className="field">
          <span>Result *</span>
          <input type="text" required value={l.value} onChange={(e) => set({ value: e.target.value })} placeholder="18" />
        </label>
        <label className="field">
          <span>Unit</span>
          <input type="text" value={l.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder="µg/L" />
        </label>
        <label className="field">
          <span>Reference range</span>
          <input type="text" value={l.referenceRange ?? ''} onChange={(e) => set({ referenceRange: e.target.value })} placeholder="13–150" />
        </label>
        <label className="field">
          <span>Flag</span>
          <select value={l.flag ?? ''} onChange={(e) => set({ flag: e.target.value as LabResult['flag'] })}>
            <option value="">normal</option>
            <option value="low">low</option>
            <option value="high">high</option>
            <option value="abnormal">abnormal</option>
          </select>
        </label>
        <label className="field full">
          <span>Notes</span>
          <input type="text" value={l.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        {l.id != null && (
          <button
            type="button"
            className="ghost danger"
            onClick={() => {
              if (confirm('Delete this result?')) {
                void db.labResults.delete(l.id!)
                onCancel()
              }
            }}
          >
            Delete
          </button>
        )}
        <button type="submit" className="primary">
          Save
        </button>
      </div>
    </form>
  )
}

/* ---------------- medications ---------------- */

function Medications() {
  const meds = useLiveQuery(() => db.medications.toArray(), [], [])
  const [editing, setEditing] = useState<Medication | null>(null)

  const current = meds.filter((m) => !m.endDate)
  const previous = meds.filter((m) => m.endDate)

  async function submit(m: Medication) {
    if (!m.name.trim()) return
    try {
      await db.medications.put(m)
      setEditing(null)
    } catch {
      alert('Couldn’t save — this browser may be blocking storage (private browsing?).')
    }
  }

  return (
    <>
      {editing ? (
        <MedForm value={editing} onSubmit={submit} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="primary" style={{ marginBottom: 14 }} onClick={() => setEditing({ name: '' })}>
          + Add medication
        </button>
      )}
      <div className="card">
        <h2>Current</h2>
        {current.length === 0 && <p className="empty">No current medications.</p>}
        {current.map((m) => (
          <MedItem key={m.id} m={m} onEdit={() => setEditing(m)} />
        ))}
      </div>
      {previous.length > 0 && (
        <div className="card">
          <h2>Previous</h2>
          {previous.map((m) => (
            <MedItem key={m.id} m={m} onEdit={() => setEditing(m)} />
          ))}
        </div>
      )}
    </>
  )
}

function MedItem({ m, onEdit }: { m: Medication; onEdit: () => void }) {
  return (
    <div className="item">
      <div className="title-line">
        <strong>{m.name}</strong>
        {!m.endDate && <span className="pill">current</span>}
      </div>
      <div className="meta">{[m.dose, m.frequency, m.reason].filter(Boolean).join(' · ')}</div>
      {(m.startDate || m.endDate) && (
        <div className="meta">
          {m.startDate ? `from ${formatMedium(m.startDate)}` : ''}
          {m.endDate ? ` to ${formatMedium(m.endDate)}` : ''}
        </div>
      )}
      {m.notes && <div className="note">{m.notes}</div>}
      <div className="actions">
        <button type="button" className="ghost" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="ghost danger"
          onClick={() => {
            if (confirm('Delete this medication?')) void db.medications.delete(m.id!)
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function MedForm({
  value,
  onSubmit,
  onCancel,
}: {
  value: Medication
  onSubmit: (m: Medication) => void
  onCancel: () => void
}) {
  const [m, setM] = useState(value)
  const set = (patch: Partial<Medication>) => setM({ ...m, ...patch })
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(m)
      }}
    >
      <h2>{m.id ? 'Edit medication' : 'New medication'}</h2>
      <div className="form-grid">
        <label className="field full">
          <span>Name *</span>
          <input type="text" required value={m.name} onChange={(e) => set({ name: e.target.value })} placeholder="Naproxen" />
        </label>
        <label className="field">
          <span>Dose</span>
          <input type="text" value={m.dose ?? ''} onChange={(e) => set({ dose: e.target.value })} placeholder="500 mg" />
        </label>
        <label className="field">
          <span>Frequency</span>
          <input type="text" value={m.frequency ?? ''} onChange={(e) => set({ frequency: e.target.value })} placeholder="Twice daily as needed" />
        </label>
        <label className="field">
          <span>Started</span>
          <input type="date" value={m.startDate ?? ''} onChange={(e) => set({ startDate: e.target.value })} />
        </label>
        <label className="field">
          <span>Stopped (blank = current)</span>
          <input type="date" value={m.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value })} />
        </label>
        <label className="field full">
          <span>Reason</span>
          <input type="text" value={m.reason ?? ''} onChange={(e) => set({ reason: e.target.value })} placeholder="Pain management" />
        </label>
        <label className="field full">
          <span>Notes (side effects, does it help?)</span>
          <textarea value={m.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save
        </button>
      </div>
    </form>
  )
}
