import { useState } from 'react'
import { TodayView } from './views/TodayView'
import { CalendarView } from './views/CalendarView'
import { TrendsView } from './views/TrendsView'
import { MedicalView } from './views/MedicalView'
import { MoreView } from './views/MoreView'

type Tab = 'today' | 'cycle' | 'trends' | 'medical' | 'data'

const ICONS: Record<Tab, React.ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20l7-7a4.6 4.6 0 0 0-6.5-6.5L12 7l-.5-.5A4.6 4.6 0 0 0 5 13z" />
    </svg>
  ),
  cycle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  trends: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19h16M5 15l4-5 4 3 5-7" />
    </svg>
  ),
  medical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="17" rx="3" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  ),
  data: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </svg>
  ),
}

const LABELS: Record<Tab, string> = {
  today: 'Today',
  cycle: 'Cycle',
  trends: 'Trends',
  medical: 'Medical',
  data: 'Data',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [openDate, setOpenDate] = useState<string | null>(null)

  return (
    <>
      <main>
        {tab === 'today' && <TodayView key={openDate ?? 'today'} initialDate={openDate ?? undefined} />}
        {tab === 'cycle' && (
          <CalendarView
            onOpenDay={(d) => {
              setOpenDate(d)
              setTab('today')
            }}
          />
        )}
        {tab === 'trends' && <TrendsView />}
        {tab === 'medical' && <MedicalView />}
        {tab === 'data' && <MoreView />}
      </main>
      <nav className="tabbar" aria-label="Main">
        {(Object.keys(LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => {
              if (t === 'today') setOpenDate(null)
              setTab(t)
            }}
          >
            {ICONS[t]}
            {LABELS[t]}
          </button>
        ))}
      </nav>
    </>
  )
}
