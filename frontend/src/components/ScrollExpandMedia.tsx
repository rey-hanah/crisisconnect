// src/components/ScrollExpandMedia.tsx
'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ScrollExpandMediaProps {
  mediaSrc: string
  bgImageSrc: string
  title?: string
  date?: string
  scrollToExpand?: string
  textBlend?: boolean
  children?: ReactNode
}

export default function ScrollExpandMedia({
  mediaSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
}: ScrollExpandMediaProps) {
  const [progress, setProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const sectionRef  = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const sectionIsActive = () => {
      if (!sectionRef.current) return false
      const rect = sectionRef.current.getBoundingClientRect()
      return rect.top <= 0 && rect.bottom > 0
    }

    const advance = (delta: number) => {
      const next = Math.min(Math.max(progressRef.current + delta, 0), 1)
      progressRef.current = next
      setProgress(next)
      if (next >= 1) setShowContent(true)
      else if (next < 0.75) setShowContent(false)
      return next
    }

    const handleWheel = (e: WheelEvent) => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const p = progressRef.current

      // Section is visible anywhere in viewport and scrolling down → intercept
      if (rect.top >= 0 && rect.top < window.innerHeight && e.deltaY > 0) {
        e.preventDefault()
        if (rect.top > 0) {
          sectionRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
        }
        advance(e.deltaY * 0.001)
        return
      }

      if (!sectionIsActive()) return

      // Fully expanded → free scroll
      if (p >= 1 && e.deltaY > 0) return
      // At zero scrolling up → free scroll
      if (p <= 0 && e.deltaY < 0) return

      e.preventDefault()
      advance(e.deltaY * 0.001)
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const deltaY = touchStartY.current - e.touches[0].clientY
      const p = progressRef.current

      if (rect.top >= 0 && rect.top < window.innerHeight && deltaY > 0) {
        e.preventDefault()
        if (rect.top > 0) sectionRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
        advance(deltaY * 0.005)
        touchStartY.current = e.touches[0].clientY
        return
      }

      if (!sectionIsActive()) return
      if (p >= 1 && deltaY > 0) return
      if (p <= 0 && deltaY < 0) return
      e.preventDefault()
      advance(deltaY * (deltaY < 0 ? 0.008 : 0.005))
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = () => { touchStartY.current = 0 }

    window.addEventListener('wheel',      handleWheel      as unknown as EventListener, { passive: false })
    window.addEventListener('touchstart', handleTouchStart as unknown as EventListener, { passive: false })
    window.addEventListener('touchmove',  handleTouchMove  as unknown as EventListener, { passive: false })
    window.addEventListener('touchend',   handleTouchEnd)

    return () => {
      window.removeEventListener('wheel',      handleWheel      as unknown as EventListener)
      window.removeEventListener('touchstart', handleTouchStart as unknown as EventListener)
      window.removeEventListener('touchmove',  handleTouchMove  as unknown as EventListener)
      window.removeEventListener('touchend',   handleTouchEnd)
    }
  }, [])

  const mediaWidth     = 300 + progress * (isMobile ? 650 : 1250)
  const mediaHeight    = 400 + progress * (isMobile ? 200 : 400)
  const textTranslateX = progress * (isMobile ? 180 : 150)
  const borderRadius   = Math.round(16 * (1 - progress))

  const words       = title ? title.split(' ') : []
  const firstWord   = words.slice(0, -1).join(' ')
  const restOfTitle = words[words.length - 1] ?? ''

  return (
    <div ref={sectionRef} className="overflow-x-hidden">
      <section className="relative flex flex-col items-center justify-start min-h-[100dvh]">
        <div className="relative w-full flex flex-col items-center min-h-[100dvh]">

          {/* Background with dark overlay */}
          <motion.div
            className="absolute inset-0 z-0 h-full"
            animate={{ opacity: 1 - progress }}
            transition={{ duration: 0.1 }}
          >
            <img src={bgImageSrc} alt="Background"
              className="w-screen h-screen object-cover object-center" />
            {/* Dark overlay so foreground image pops */}
            <div className="absolute inset-0 bg-black/55" />
          </motion.div>

          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-[100dvh] relative">

              {/* Expanding media */}
              <div
                className="absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl"
                style={{
                  width: `${mediaWidth}px`, height: `${mediaHeight}px`,
                  maxWidth: '100vw', maxHeight: '100vh',
                  boxShadow: '0px 0px 50px rgba(0,0,0,0.3)', transition: 'none',
                  borderRadius: `${borderRadius}px`,
                }}
              >
                <div className="relative w-full h-full">
                  <img src={mediaSrc} alt={title || 'Media'}
                    className="w-full h-full object-cover"
                    style={{ borderRadius: `${borderRadius}px` }} />
                  <motion.div className="absolute inset-0 bg-black/50"
                    style={{ borderRadius: `${borderRadius}px` }}
                    animate={{ opacity: 0.7 - progress * 0.3 }}
                    transition={{ duration: 0.2 }} />
                </div>

                <div className="flex flex-col items-center text-center relative z-10 mt-4">
                  {date && (
                    <p className="text-2xl font-serif"
                      style={{ color: 'white', transform: `translateX(-${textTranslateX}vw)` }}>
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: 'white', transform: `translateX(${textTranslateX}vw)` }}>
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              {/* Title — BE THE flies left, CHANGE flies right */}
              <div className={`flex items-center justify-center text-center gap-4 w-full relative z-10 flex-col ${textBlend ? 'mix-blend-difference' : 'mix-blend-normal'}`}>
                {/* "BE THE" — solid white */}
                <h2 className="font-serif font-black uppercase"
                  style={{
                    fontSize: 'clamp(3rem, 8vw, 8rem)',
                    color: 'white',
                    transform: `translateX(-${textTranslateX}vw)`,
                  }}>
                  {firstWord}
                </h2>
                {/* "CHANGE" — white with outline for contrast */}
                <h2 className="font-serif font-black uppercase"
                  style={{
                    fontSize: 'clamp(3rem, 8vw, 8rem)',
                    color: 'white',
                    transform: `translateX(${textTranslateX}vw)`,
                  }}>
                  {restOfTitle}
                </h2>
              </div>
            </div>

            {children && (
              <motion.section
                className="flex flex-col w-full px-8 py-10 md:px-16 lg:py-20"
                animate={{ opacity: showContent ? 1 : 0 }}
                transition={{ duration: 0.7 }}
              >
                {children}
              </motion.section>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
