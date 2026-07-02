import Dexie, { type EntityTable } from 'dexie'

export type Bleeding = 'none' | 'spotting' | 'light' | 'medium' | 'heavy'

export const BLEEDING_LEVELS: Bleeding[] = ['none', 'spotting', 'light', 'medium', 'heavy']

export const PAIN_LOCATIONS = [
  'Pelvis',
  'Lower back',
  'Abdomen',
  'Legs / hips',
  'Rectal',
  'Bladder',
  'Chest / shoulder',
  'Headache',
] as const

export const SYMPTOMS = [
  'Bloating',
  'Fatigue',
  'Nausea',
  'Constipation',
  'Diarrhoea',
  'Painful bowel movement',
  'Painful urination',
  'Pain during/after sex',
  'Dizziness',
  'Brain fog',
  'Hot flushes',
  'Insomnia',
  'Low mood',
  'Anxiety',
] as const

export const TRIGGERS = [
  'Stress',
  'Poor sleep',
  'Alcohol',
  'Caffeine',
  'Dairy',
  'Gluten',
  'Sugar',
  'Exercise',
  'Missed medication',
  'Travel',
] as const

export interface PainArea {
  location: string
  severity: number // 1–10
}

export interface DailyLog {
  date: string // YYYY-MM-DD, primary key
  painAreas: PainArea[]
  bleeding: Bleeding
  symptoms: string[]
  energy?: number // 1–10
  mood?: number // 1–10
  sleepHours?: number
  medsTaken: string[]
  triggers: string[]
  notes?: string
  updatedAt: string // ISO timestamp
}

export interface Appointment {
  id?: number
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  clinician: string
  specialty?: string
  location?: string
  purpose?: string
  questions?: string // things to ask / bring up
  outcome?: string // what was said / decided
}

export interface LabResult {
  id?: number
  date: string // YYYY-MM-DD
  panel?: string // e.g. "Full blood count", "Hormone panel"
  testName: string // e.g. "Ferritin"
  value: string // kept as string so "positive", "<5" etc. work
  unit?: string
  referenceRange?: string // e.g. "13–150"
  flag?: 'low' | 'high' | 'abnormal' | ''
  notes?: string
}

export interface Medication {
  id?: number
  name: string
  dose?: string
  frequency?: string
  startDate?: string
  endDate?: string // empty = current
  reason?: string
  notes?: string
}

export interface Setting {
  key: string
  value: string
}

export class EndoDB extends Dexie {
  dailyLogs!: EntityTable<DailyLog, 'date'>
  appointments!: EntityTable<Appointment, 'id'>
  labResults!: EntityTable<LabResult, 'id'>
  medications!: EntityTable<Medication, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('endo-tracker')
    this.version(1).stores({
      dailyLogs: 'date',
      appointments: '++id, date',
      labResults: '++id, date, testName',
      medications: '++id, name',
      settings: 'key',
    })
  }
}

export const db = new EndoDB()
