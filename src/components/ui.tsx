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
