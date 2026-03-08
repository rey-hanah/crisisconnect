// src/components/LandingPage.tsx
// npm install gsap svg-dotted-map

"use client"

import React, { useRef, useEffect } from "react"
import gsap from "gsap"
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

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const revealRef    = useRef<HTMLDivElement>(null)
  const ctaRef       = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero fade-in
      gsap.fromTo(
        revealRef.current,
        { filter: "blur(20px)", opacity: 0, scale: 1.01 },
        { filter: "blur(0px)",  opacity: 1, scale: 1, duration: 1.8, ease: "expo.out" }
      )

      // Magnetic CTA
      const onMouseMove = (e: MouseEvent) => {
        if (!ctaRef.current) return
        const rect = ctaRef.current.getBoundingClientRect()
        const dist = Math.hypot(
          e.clientX - (rect.left + rect.width  / 2),
          e.clientY - (rect.top  + rect.height / 2)
        )
        if (dist < 160) {
          gsap.to(ctaRef.current, {
            x: (e.clientX - (rect.left + rect.width  / 2)) * 0.38,
            y: (e.clientY - (rect.top  + rect.height / 2)) * 0.38,
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
      <section className="relative min-h-screen w-full flex flex-col justify-center overflow-hidden bg-background">

        {/* Subtle noise texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Very faint red glow top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 70% 5%, rgba(224,90,78,0.07) 0%, transparent 70%)",
          }}
        />

        <div
          ref={revealRef}
          className="relative z-10 flex flex-col items-start justify-between min-h-screen
                     px-8 md:px-14 lg:px-20 py-20"
        >
          {/* Live badge */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-[0.22em] uppercase">
              CrisisConnect · Live
            </span>
          </div>

          {/* Headline — centred vertically */}
          <div className="flex-1 flex flex-col justify-center">
            <h1
              className="font-serif font-black uppercase leading-[0.85] tracking-tight text-foreground"
              style={{ fontSize: "clamp(3.5rem, 11vw, 12rem)" }}
            >
              HELP FINDS<br />
              PEOPLE
            </h1>
            <p className="mt-8 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em] max-w-xs leading-relaxed">
              AI-powered peer-to-peer crisis coordination.
              <br />Seekers post needs. Providers respond. Fast.
            </p>
          </div>

          {/* Magnetic CTA */}
          <button
            ref={ctaRef}
            onClick={() => { window.location.href = "/app" }}
            className="flex items-center gap-5 group cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full border border-foreground/20
                          flex items-center justify-center
                          group-hover:bg-foreground transition-all duration-500"
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                className="stroke-foreground group-hover:stroke-background transition-colors duration-500"
              >
                <path
                  d="M7 17L17 7M17 7H8M17 7V16"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-mono text-[11px] font-bold text-foreground uppercase tracking-[0.22em]">
              Start Here
            </span>
          </button>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <section
        className="relative w-full border-t border-border py-24 px-8 md:px-14 lg:px-20 overflow-hidden"
        style={{ background: "var(--muted)" }}
      >
        {/* Top accent line */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(to right, transparent, rgba(224,90,78,0.3), transparent)",
          }}
        />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-20 items-center">

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em] mb-6">
              Who we are
            </p>
            <h2
              className="font-serif font-black uppercase tracking-tight text-foreground leading-[0.9] mb-8"
              style={{ fontSize: "clamp(2.2rem, 5vw, 5rem)" }}
            >
              BUILT FOR<br />
              THE WORST<br />
              <span className="text-destructive">MOMENTS</span>
            </h2>
            <div className="space-y-5 max-w-md">
              <p className="text-sm text-muted-foreground leading-relaxed">
                CrisisConnect is a peer-to-peer emergency coordination platform that
                bridges the gap between people who need help and people who can give it —
                in the moments that matter most.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our AI triage engine scores every request by urgency in real time,
                surfacing critical needs first — whether it's clean water, medical
                assistance, or emergency shelter. Providers always see the highest-priority
                posts at the top.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No gatekeepers. No waiting on official channels. Just people helping
                people — faster than any system before it.
              </p>
            </div>

            {/* Mini stats */}
            <div className="mt-10 flex gap-10">
              {[
                { num: "< 4min", label: "Median response" },
                { num: "AI",     label: "Auto-triage"     },
                { num: "P2P",    label: "Direct connect"  },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-serif text-2xl font-black text-foreground">{item.num}</div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="w-full lg:w-[54%] flex-shrink-0">
            <div
              className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-card/40"
              style={{ height: "360px" }}
            >
              {/* Edge vignette */}
              <div
                aria-hidden
                className="absolute inset-0 z-10 pointer-events-none rounded-xl"
                style={{
                  background: "radial-gradient(ellipse at center, transparent 50%, var(--background) 100%)",
                  opacity: 0.6,
                }}
              />
              <div className="absolute inset-0">
                <DottedMap markers={MARKERS} />
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  Active incidents
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  Coordination hubs
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
