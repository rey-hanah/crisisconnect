"use client"

import * as React from "react"
import { createMap } from "svg-dotted-map"
import { cn } from "@/lib/utils"

interface Marker {
  lat: number
  lng: number
  size?: number
}

interface DottedMapProps {
  markers?: Marker[]
  className?: string
}

const W = 150
const H = 75

const PULSE_POOL = [
  { lat: 51.5, lng: -0.1 },
  { lat: 48.8, lng: 2.35 },
  { lat: 40.7, lng: -74.0 },
  { lat: 34.0, lng: -118.2 },
  { lat: 35.6, lng: 139.6 },
  { lat: 55.7, lng: 37.6 },
  { lat: 28.6, lng: 77.2 },
  { lat: 1.3, lng: 103.8 },
  { lat: -23.5, lng: -46.6 },
  { lat: -33.8, lng: 151.2 },
  { lat: 19.4, lng: -99.1 },
  { lat: 52.5, lng: 13.4 },
  { lat: -26.2, lng: 28.0 },
  { lat: 25.2, lng: 55.3 },
  { lat: 37.5, lng: 127.0 },
]

const PULSE_COUNT = 5
const PULSE_INTERVAL = 2800

function toXY(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  }
}

function useIsDark() {
  const [dark, setDark] = React.useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  )
  React.useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => obs.disconnect()
  }, [])
  return dark
}

export function DottedMap({ markers = [], className }: DottedMapProps) {
  const isDark = useIsDark()

  const mapData = React.useMemo(
    () => createMap({ width: W, height: H, mapSamples: 5000 }),
    []
  )

  const processedMarkers = React.useMemo(
    () => mapData.addMarkers(markers),
    [markers]
  )

  const { xStep, yToRowIndex } = React.useMemo(() => {
    const sorted = [...mapData.points].sort((a, b) => a.y - b.y || a.x - b.x)
    const rowMap = new Map<number, number>()
    let step = 0
    let prevY = NaN
    let prevX = NaN
    for (const p of sorted) {
      if (p.y !== prevY) {
        prevY = p.y
        prevX = NaN
        if (!rowMap.has(p.y)) rowMap.set(p.y, rowMap.size)
      }
      if (!isNaN(prevX)) {
        const d = p.x - prevX
        if (d > 0) step = step === 0 ? d : Math.min(step, d)
      }
      prevX = p.x
    }
    return { xStep: step || 1, yToRowIndex: rowMap }
  }, [mapData.points])

  const [active, setActive] = React.useState<Set<number>>(new Set())

  React.useEffect(() => {
    const pick = () => {
      const pool = PULSE_POOL.map((_, i) => i)
      const chosen = new Set<number>()
      while (chosen.size < PULSE_COUNT && pool.length > 0) {
        const i = Math.floor(Math.random() * pool.length)
        chosen.add(pool.splice(i, 1)[0])
      }
      setActive(chosen)
    }
    pick()
    const id = setInterval(pick, PULSE_INTERVAL)
    return () => clearInterval(id)
  }, [])

  const dotColor = isDark ? "#d4d4e8" : "#1c1c2e"
  const markerColor = isDark ? "#4a9eff" : "#1a6fd4"
  const red = "#e05a4e"

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
      className={cn(className)}
    >
      {mapData.points.map((p, i) => {
        const row = yToRowIndex.get(p.y) ?? 0
        const ox = row % 2 === 1 ? xStep / 2 : 0
        return (
          <circle
            key={i}
            cx={p.x + ox}
            cy={p.y}
            r={0.22}
            fill={dotColor}
          />
        )
      })}

      {processedMarkers.map((m, i) => {
        const row = yToRowIndex.get(m.y) ?? 0
        const ox = row % 2 === 1 ? xStep / 2 : 0
        return (
          <circle
            key={i}
            cx={m.x + ox}
            cy={m.y}
            r={m.size ?? 0.5}
            fill={markerColor}
          />
        )
      })}

      {PULSE_POOL.map((coord, i) => {
        if (!active.has(i)) return null
        const { x, y } = toXY(coord.lat, coord.lng)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={0.4} fill={red} />
            <circle
              cx={x}
              cy={y}
              r={0.4}
              fill="none"
              stroke={red}
              strokeWidth={0.15}
              style={{
                animation: `dmPulse ${PULSE_INTERVAL}ms ease-out infinite`,
              }}
            />
          </g>
        )
      })}

      <style>{`
        @keyframes dmPulse {
          0%   { r: 0.4; opacity: 0.8; }
          70%  { r: 2.2; opacity: 0;   }
          100% { r: 0.4; opacity: 0;   }
        }
      `}</style>
    </svg>
  )
}
