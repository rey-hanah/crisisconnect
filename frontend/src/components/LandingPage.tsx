// src/components/LandingPage.tsx
// npm install recharts

"use client"

import React, { useRef, useEffect, useState } from "react"
import gsap from "gsap"
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { DottedMap } from "@/registry/magicui/dotted-map"

const MARKERS = [
  { lat: 40.7128,  lng: -74.006,   size: 0.4 },
  { lat: 34.0522,  lng: -118.2437, size: 0.4 },
  { lat: 51.5074,  lng: -0.1278,   size: 0.4 },
  { lat: -33.8688, lng: 151.2093,  size: 0.4 },
  { lat: 48.8566,  lng: 2.3522,    size: 0.4 },
  { lat: 35.6762,  lng: 139.6503,  size: 0.4 },
  { lat: 55.7558,  lng: 37.6176,   size: 0.4 },
  { lat: 39.9042,  lng: 116.4074,  size: 0.4 },
  { lat: 28.6139,  lng: 77.209,    size: 0.4 },
  { lat: -23.5505, lng: -46.6333,  size: 0.4 },
  { lat: 1.3521,   lng: 103.8198,  size: 0.4 },
  { lat: 25.2048,  lng: 55.2708,   size: 0.4 },
  { lat: 52.52,    lng: 13.405,    size: 0.4 },
  { lat: 19.4326,  lng: -99.1332,  size: 0.4 },
  { lat: -26.2041, lng: 28.0473,   size: 0.4 },
]

// Real data from EM-DAT / UNDRR / UN OCHA — people affected by disasters (millions)
const DISASTER_DATA = [
  { year: "2019", affected: 95 },
  { year: "2020", affected: 101 },
  { year: "2021", affected: 112 },
  { year: "2022", affected: 135 },
  { year: "2023", affected: 149 },
  { year: "2024", affected: 167 },
]

// Animated counter hook
function useCountUp(target: number, duration = 2000, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, active])
  return count
}

// Individual stat card with counter
function StatCard({ num, suffix, label, sub }: { num: number; suffix: string; label: string; sub: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(num, 1800, active)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="p-6 rounded-xl border border-border bg-card">
      <div className="font-serif text-3xl font-black text-foreground">
        {count}{suffix}
      </div>
      <div className="font-mono text-[10px] text-primary uppercase tracking-widest mt-1">{label}</div>
      <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{sub}</div>
    </div>
  )
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef   = useRef<HTMLDivElement>(null)
  const ctaRef       = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
  contentRef.current,
  { opacity: 0, y: 24, filter: "blur(12px)" },
  { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, ease: "expo.out", delay: 0.3 }
)
      const onMouseMove = (e: MouseEvent) => {
        if (!ctaRef.current) return
        const rect = ctaRef.current.getBoundingClientRect()
        const dist = Math.hypot(
          e.clientX - (rect.left + rect.width / 2),
          e.clientY - (rect.top + rect.height / 2)
        )
        if (dist < 160) {
          gsap.to(ctaRef.current, {
            x: (e.clientX - (rect.left + rect.width / 2)) * 0.38,
            y: (e.clientY - (rect.top + rect.height / 2)) * 0.38,
            duration: 0.5,
          })
        } else {
          gsap.to(ctaRef.current, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" })
        }
      }
      window.addEventListener("mousemove", onMouseMove)
      return () => window.removeEventListener("mousemove", onMouseMove)
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="w-full overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen w-full overflow-hidden bg-background flex">

        {/* Atmospheric glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse 70% 60% at 0% 100%, rgba(74,158,255,0.10) 0%, transparent 65%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse 55% 45% at 100% 0%, rgba(224,90,78,0.08) 0%, transparent 65%)" }} />

        {/* Left — text */}
        <div
          ref={contentRef}
          className="relative z-10 flex flex-col justify-between w-1/2 px-8 md:px-14 lg:px-20 py-20 min-h-screen"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.15_55)] opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.72_0.15_55)]" />
            </span>
            <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-[0.22em] uppercase">
              CrisisConnect · Live
            </span>
          </div>

          <div className="flex flex-col justify-center flex-1">
            <h1
              className="font-serif font-black uppercase leading-[0.85] tracking-tight text-foreground"
              style={{ fontSize: "clamp(2.5rem, 7vw, 7rem)" }}
            >
              HELP FINDS<br />
              <span className="text-primary">PEOPLE</span>
            </h1>
            <p className="mt-8 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em] max-w-xs leading-relaxed">
              AI-powered peer-to-peer crisis coordination.
              <br />Seekers post needs. Providers respond. Fast.
            </p>
          </div>

          <button
            ref={ctaRef}
            onClick={() => { window.location.href = "/app" }}
            className="flex items-center gap-5 group cursor-pointer w-fit"
          >
            <div className="w-14 h-14 rounded-full border border-foreground/20 flex items-center justify-center group-hover:bg-foreground transition-all duration-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                className="stroke-foreground group-hover:stroke-background transition-colors duration-500">
                <path d="M7 17L17 7M17 7H8M17 7V16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-mono text-[11px] font-bold text-foreground uppercase tracking-[0.22em]">
              Start Here
            </span>
          </button>
        </div>

        {/* Right — map full height */}
        <div className="w-1/2 relative self-stretch -ml-16">
          <div className="absolute inset-0">
            <DottedMap markers={MARKERS} />
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <section className="relative w-full border-t border-border py-24 px-8 md:px-14 lg:px-20 bg-muted">
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(to right, transparent, rgba(224,90,78,0.3), transparent)" }} />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">

          {/* Left — text */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em] mb-6">
              Why it matters
            </p>
            <h2
              className="font-serif font-black uppercase tracking-tight text-foreground leading-[0.9] mb-8"
              style={{ fontSize: "clamp(2.2rem, 5vw, 5rem)" }}
            >
              BUILT FOR<br />
              THE WORST<br />
              <span className="text-[oklch(0.72_0.15_55)]">MOMENTS</span>
            </h2>
            <div className="space-y-5 max-w-md">
              <p className="text-sm text-muted-foreground leading-relaxed">
                In 2024, <span className="text-foreground font-medium">393 disasters</span> affected over
                167 million people worldwide, causing $242 billion in damages — yet only
                43% of the required humanitarian funding was received. The gap between
                need and response has never been wider.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CrisisConnect bridges that gap directly. Our AI triage engine scores every
                request by urgency in real time, surfacing critical needs first. Providers
                always see the highest-priority posts at the top — no middlemen, no delays.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When official channels are overwhelmed, peer-to-peer coordination saves
                lives. We built the infrastructure to make that happen at scale.
              </p>
            </div>

            {/* Source note */}
            <p className="mt-6 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest">
              Sources: EM-DAT 2024 · UN OCHA 2024 · UNDRR GAR 2024
            </p>
          </div>

          {/* Right — stats + chart */}
          <div className="w-full lg:w-[52%] flex-shrink-0 flex flex-col gap-6">

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard num={167} suffix="M+" label="People affected" sub="by disasters in 2024 alone" />
              <StatCard num={393}  suffix=""   label="Disasters in 2024" sub="tracked globally by EM-DAT" />
              <StatCard num={43}   suffix="%"  label="Funding gap" sub="of needed aid was received" />
            </div>

            {/* Area chart — people affected trend */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                    People affected by disasters
                  </p>
                  <p className="font-serif text-2xl font-black text-foreground mt-1">
                    167M <span className="text-[oklch(0.72_0.15_55)] text-base">↑ 75%</span>
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                    since 2019 · Source: EM-DAT
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={DISASTER_DATA}>
                  <defs>
                    <linearGradient id="crisisGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="oklch(0.72 0.15 55)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="oklch(0.72 0.15 55)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "oklch(0.636 0.049 254.610)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.269 0.042 262.698)",
                      border: "1px solid oklch(0.460 0.056 252.671)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "JetBrains Mono",
                      color: "oklch(0.636 0.049 254.610)",
                    }}
                    formatter={(v: number) => [`${v}M people`, "Affected"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="affected"
                    stroke="oklch(0.72 0.15 55)"
                    strokeWidth={2}
                    fill="url(#crisisGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
