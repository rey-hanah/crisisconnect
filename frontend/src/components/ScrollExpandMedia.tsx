// src/components/ScrollExpandMedia.tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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

  // Track mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Keep ref in sync with state
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  // Bug 3 fix: replace wheel/touch intercept with a simple passive scroll listener
  useEffect(() => {
    const getProgress = () => {
      if (!sectionRef.current) return 0
      const rect = sectionRef.current.getBoundingClientRect()
      const scrolled = -rect.top
      const total = sectionRef.current.offsetHeight - window.innerHeight
      return Math.min(Math.max(scrolled / total, 0), 1)
    }

    const onScroll = () => {
      const p = getProgress()
      progressRef.current = p
      setProgress(p)
      if (p >= 1) setShowContent(true)
      else if (p < 0.75) setShowContent(false)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const mediaWidth     = 300 + progress * (isMobile ? 650 : 1250)
  const mediaHeight    = 400 + progress * (isMobile ? 200 : 400)
  const textTranslateX = progress * (isMobile ? 180 : 150)
  const borderRadius   = Math.round(16 * (1 - progress))

  const words       = title ? title.split(' ') : []
  const firstWord   = words.slice(0, -1).join(' ')
  const restOfTitle = words[words.length - 1] ?? ''

  // Bug 2 fix: 300vh outer wrapper + sticky inner section
  return (
    <div ref={sectionRef} style={{ height: '300vh' }} className="relative overflow-x-hidden">
      <section className="sticky top-0 flex flex-col items-center justify-start h-screen overflow-hidden">
        <div className="relative w-full flex flex-col items-center h-full">

          {/* Background with dark overlay — Bug 4 fix: w-full h-full instead of w-screen h-screen */}
          <motion.div
            className="absolute inset-0 z-0"
            animate={{ opacity: 1 - progress }}
            transition={{ duration: 0.1 }}
          >
            <img
              src={bgImageSrc}
              alt="Background"
              className="w-full h-full object-cover object-center"
              loading="lazy"
              fetchPriority="low"
            />
            <div className="absolute inset-0 bg-black/55" />
          </motion.div>

          <div className="container mx-auto flex flex-col items-center justify-start relative z-10 h-full">
            <div className="flex flex-col items-center justify-center w-full h-full relative">

              {/* Expanding media card — Bug 1 & 2 fix: inline style transform instead of Tailwind translate classes */}
              <div
                className="absolute z-0 transform rounded-2xl"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%)`,
                  boxShadow: '0px 0px 50px rgba(0,0,0,0.3)',
                  transition: 'none',
                  borderRadius: `${borderRadius}px`,
                }}
              >
                <div className="relative w-full h-full">
                  <img
                    src={mediaSrc}
                    alt={title || 'Media'}
                    className="w-full h-full object-cover"
                    style={{ borderRadius: `${borderRadius}px` }}
                    width={1550}
                    height={874}
                  />
                  <motion.div
                    className="absolute inset-0 bg-black/50"
                    style={{ borderRadius: `${borderRadius}px` }}
                    animate={{ opacity: 0.7 - progress * 0.3 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                <div className="flex flex-col items-center text-center relative z-10 mt-4">
                  {date && (
                    <p
                      className="text-2xl font-serif"
                      style={{ color: 'white', transform: `translateX(-${textTranslateX}vw)` }}
                    >
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p
                      className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: 'white', transform: `translateX(${textTranslateX}vw)` }}
                    >
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              {/* Title text */}
              <div
                className={`flex items-center justify-center text-center gap-4 w-full relative z-10 flex-col ${
                  textBlend ? 'mix-blend-difference' : 'mix-blend-normal'
                }`}
              >
                <h2
                  className="font-serif font-black uppercase"
                  style={{
                    fontSize: 'clamp(3rem, 8vw, 8rem)',
                    color: 'white',
                    transform: `translateX(-${textTranslateX}vw)`,
                  }}
                >
                  {firstWord}
                </h2>
                <h2
                  className="font-serif font-black uppercase"
                  style={{
                    fontSize: 'clamp(3rem, 8vw, 8rem)',
                    color: 'white',
                    transform: `translateX(${textTranslateX}vw)`,
                  }}
                >
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
