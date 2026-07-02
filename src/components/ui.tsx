interface ChipGroupProps {
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
}

export function ChipGroup({ options, selected, onToggle }: ChipGroupProps) {
  return (
    <div className="chips" role="group">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={selected.includes(o) ? 'chip on' : 'chip'}
          aria-pressed={selected.includes(o)}
          onClick={() => onToggle(o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

interface ScaleProps {
  value: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
  max?: number
  ariaLabel: string
}

/** Tappable 1–10 scale; tapping the current value clears it. */
export function Scale({ value, onChange, min = 1, max = 10, ariaLabel }: ScaleProps) {
  const nums = []
  for (let i = min; i <= max; i++) nums.push(i)
  return (
    <div className="scale" role="group" aria-label={ariaLabel}>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          className={value === n ? 'on' : ''}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? undefined : n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

const DROP = 'M12 2.5C12 2.5 5.5 10.6 5.5 15.2a6.5 6.5 0 0 0 13 0C18.5 10.6 12 2.5 12 2.5Z'

/** Fill level per bleeding option (fraction of droplet height). */
const BLEED_FILL: Record<string, number> = { none: 0, spotting: 0.22, light: 0.45, medium: 0.7, heavy: 1 }

function Droplet({ level, active }: { level: number; active: boolean }) {
  const id = `drop-${level}`
  const stroke = active ? 'var(--rose)' : 'var(--ink-3)'
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d={DROP} />
        </clipPath>
      </defs>
      {level > 0 && (
        <rect
          x="0"
          y={22 - level * 19.5}
          width="24"
          height={level * 19.5}
          clipPath={`url(#${id})`}
          fill={active ? 'var(--rose)' : 'var(--ink-3)'}
          opacity={active ? 1 : 0.35}
        />
      )}
      <path d={DROP} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

interface BleedingPickerProps<T extends string> {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}

/** Row of droplets with rising fill — the app's signature control. */
export function BleedingPicker<T extends string>({ options, value, onChange }: BleedingPickerProps<T>) {
  return (
    <div className="bleedpicker" role="group" aria-label="Bleeding level">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={value === o ? 'on' : ''}
          aria-pressed={value === o}
          onClick={() => onChange(o)}
        >
          <Droplet level={BLEED_FILL[o] ?? 0} active={value === o} />
          <span>{o}</span>
        </button>
      ))}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  labels?: Partial<Record<T, string>>
}

export function Segmented<T extends string>({ options, value, onChange, labels }: SegmentedProps<T>) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={value === o ? 'on' : ''}
          aria-pressed={value === o}
          onClick={() => onChange(o)}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  )
}
