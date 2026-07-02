import { useRef, useState } from 'react'

/*
 * Small SVG chart kit following the dataviz mark specs:
 * 2px lines, ≥8px markers with a 2px surface ring, bars ≤24px with a 4px
 * rounded data-end (square at the baseline), hairline solid gridlines,
 * hover tooltips that enhance (a table twin always carries the values),
 * text in ink tokens — never the series colour.
 */

const W = 600

interface Tip {
  x: number // px within wrapper
  y: number
  label: string
  value: string
}

function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  return { tip, setTip, wrapRef }
}

function TipBox({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
      <strong>{tip.label}</strong> · {tip.value}
    </div>
  )
}

export function TableTwin({
  caption,
  headers,
  rows,
}: {
  caption: string
  headers: string[]
  rows: (string | number)[][]
}) {
  return (
    <details className="tabletwin">
      <summary>View data as table</summary>
      <table className="data">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={i > 0 ? 'num' : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j > 0 ? 'num' : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export interface LinePoint {
  label: string // tooltip / table label
  value: number | null // null = gap (not logged)
}

/** Single-series line with area wash, crosshair-style hover and end marker. */
export function LineChart({
  points,
  yMax = 10,
  height = 190,
  unit = '',
}: {
  points: LinePoint[]
  yMax?: number
  height?: number
  unit?: string
}) {
  const { tip, setTip, wrapRef } = useTooltip()
  const pad = { l: 26, r: 12, t: 12, b: 22 }
  const iw = W - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const n = points.length
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / yMax) * ih

  // build segments so gaps (null) break the line
  const segs: string[] = []
  let cur: string[] = []
  points.forEach((p, i) => {
    if (p.value == null) {
      if (cur.length > 1) segs.push(cur.join(' '))
      cur = []
    } else {
      cur.push(`${x(i)},${y(p.value)}`)
    }
  })
  if (cur.length > 1) segs.push(cur.join(' '))

  const dots = points
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => {
      if (p.value == null) return false
      const prev = points[i - 1]?.value
      const next = points[i + 1]?.value
      return prev == null && next == null // isolated point: draw a dot
    })

  const last = [...points].reverse().find((p) => p.value != null)
  const lastIdx = last ? points.lastIndexOf(last) : -1

  const ticks = yMax <= 10 ? [0, 5, 10] : [0, Math.round(yMax / 2), yMax]

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = -1
    let bestDist = Infinity
    points.forEach((p, i) => {
      if (p.value == null) return
      const d = Math.abs(x(i) - px)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    if (best < 0) return setTip(null)
    const p = points[best]
    setTip({
      x: (x(best) / W) * rect.width,
      y: (y(p.value!) / height) * rect.height,
      label: p.label,
      value: `${p.value}${unit}`,
    })
  }

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Line chart"
        onPointerMove={onMove}
        onPointerLeave={() => setTip(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
              strokeWidth="1"
            />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-muted)">
              {t}
            </text>
          </g>
        ))}
        {segs.map((s, i) => (
          <g key={i}>
            <polygon
              points={`${s} ${s.split(' ').at(-1)!.split(',')[0]},${y(0)} ${s.split(' ')[0].split(',')[0]},${y(0)}`}
              fill="var(--series-1-wash)"
            />
            <polyline
              points={s}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ))}
        {dots.map(({ p, i }) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value!)}
            r="4"
            fill="var(--series-1)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}
        {lastIdx >= 0 && (
          <circle
            cx={x(lastIdx)}
            cy={y(points[lastIdx].value!)}
            r="4"
            fill="var(--series-1)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
        )}
        {/* sparse x labels: first, middle, last */}
        {n > 0 &&
          [0, Math.floor((n - 1) / 2), n - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((i) => (
              <text
                key={i}
                x={x(i)}
                y={height - 6}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                fontSize="11"
                fill="var(--chart-muted)"
              >
                {points[i].label}
              </text>
            ))}
      </svg>
      <TipBox tip={tip} />
    </div>
  )
}

export interface BarDatum {
  label: string
  value: number
}

/** Horizontal bars, one series/one hue, value labelled at the tip. */
export function BarChartH({ data, unit = '' }: { data: BarDatum[]; unit?: string }) {
  const rowH = 30
  const barH = 16
  const pad = { l: 150, r: 44, t: 4, b: 4 }
  const height = pad.t + pad.b + data.length * rowH
  const iw = W - pad.l - pad.r
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Bar chart">
        {data.map((d, i) => {
          const w = Math.max((d.value / max) * iw, 2)
          const yy = pad.t + i * rowH + (rowH - barH) / 2
          // 4px rounded data-end, square at the baseline
          const r = Math.min(4, w / 2)
          const path = `M${pad.l},${yy} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z`
          return (
            <g key={d.label}>
              <text
                x={pad.l - 8}
                y={yy + barH / 2 + 4}
                textAnchor="end"
                fontSize="12.5"
                fill="var(--ink-2)"
              >
                {d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label}
              </text>
              <path d={path} fill="var(--series-1)" />
              <text
                x={pad.l + w + 6}
                y={yy + barH / 2 + 4}
                fontSize="12"
                fontWeight="600"
                fill="var(--ink)"
              >
                {d.value}
                {unit}
              </text>
            </g>
          )
        })}
        <line
          x1={pad.l}
          x2={pad.l}
          y1={pad.t}
          y2={height - pad.b}
          stroke="var(--chart-axis)"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}

/** Columns over an ordered axis (e.g. cycle day), one hue, hover tooltip. */
export function ColumnChart({
  data,
  yMax = 10,
  height = 190,
  xLabel,
  unit = '',
}: {
  data: BarDatum[]
  yMax?: number
  height?: number
  xLabel?: string
  unit?: string
}) {
  const { tip, setTip, wrapRef } = useTooltip()
  const pad = { l: 26, r: 8, t: 12, b: xLabel ? 34 : 22 }
  const iw = W - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const n = Math.max(data.length, 1)
  const slot = iw / n
  const barW = Math.min(24, Math.max(slot - 2, 2)) // ≤24px, 2px surface gap
  const y = (v: number) => pad.t + ih - (Math.min(v, yMax) / yMax) * ih
  const ticks = [0, Math.round(yMax / 2), yMax]

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Column chart"
        onPointerLeave={() => setTip(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
              strokeWidth="1"
            />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-muted)">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + i * slot + slot / 2
          const xx = cx - barW / 2
          const h = pad.t + ih - y(d.value)
          const r = Math.min(4, barW / 2, h)
          const path =
            h <= 0
              ? ''
              : `M${xx},${y(0)} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`
          const showTick = n <= 10 || i % Math.ceil(n / 10) === 0
          return (
            <g key={d.label}>
              {path && <path d={path} fill="var(--series-1)" />}
              {/* generous hit target: the whole slot */}
              <rect
                x={pad.l + i * slot}
                y={pad.t}
                width={slot}
                height={ih}
                fill="transparent"
                onPointerEnter={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setTip({
                    x: (cx / W) * rect.width,
                    y: (y(d.value) / height) * rect.height,
                    label: d.label,
                    value: `${d.value}${unit}`,
                  })
                }}
              />
              {showTick && (
                <text
                  x={cx}
                  y={height - (xLabel ? 20 : 6)}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--chart-muted)"
                >
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
        {xLabel && (
          <text x={pad.l + iw / 2} y={height - 4} textAnchor="middle" fontSize="11.5" fill="var(--chart-muted)">
            {xLabel}
          </text>
        )}
      </svg>
      <TipBox tip={tip} />
    </div>
  )
}
