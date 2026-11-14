import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Builds a Netlify Image CDN URL for an illustration. `file` is either a path
 * inside /public (starting with "/") or a bare file name in /public/img.
 */
export function imageUrl(file: string, width: number) {
  const path = file.startsWith('/') ? file : `/img/${file}`
  return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}&fm=webp&q=80`
}

export function StoryImage({
  file,
  alt,
  className,
  priority = false,
  onError,
}: {
  file: string
  alt: string
  className?: string
  priority?: boolean
  onError?: () => void
}) {
  return (
    <img
      src={imageUrl(file, 1600)}
      srcSet={[800, 1280, 1600, 2400]
        .map((w) => `${imageUrl(file, w)} ${w}w`)
        .join(', ')}
      sizes="100vw"
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={onError}
      // Stretched to fill the whole screen, with no empty space around it.
      className={cn('h-full w-full object-fill', className)}
    />
  )
}

/** Fades its children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={cn('reveal', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// Deterministic pseudo-random numbers so server and client render the same stars.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const stars = (() => {
  const rand = seeded(42)
  return Array.from({ length: 90 }, () => ({
    top: rand() * 100,
    left: rand() * 100,
    size: rand() < 0.85 ? 1 + rand() * 1.5 : 2.5 + rand() * 1.5,
    dur: 2.5 + rand() * 4,
    delay: rand() * 5,
  }))
})()

/**
 * A layer of softly twinkling stars. With `glow`, every star gets a soft halo,
 * so they stand out when laid over the sky of a painted illustration.
 */
export function Starfield({
  className,
  glow = false,
}: {
  className?: string
  glow?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      {stars.map((star, i) => (
        <span
          key={i}
          className="star absolute rounded-full bg-foreground"
          style={
            {
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.size,
              height: star.size,
              boxShadow:
                glow || star.size > 2.5
                  ? '0 0 6px 1px oklch(0.95 0.05 85 / 0.6)'
                  : undefined,
              '--dur': `${star.dur}s`,
              '--delay': `${star.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Thin reading-progress bar pinned to the top of the window. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 bg-foreground/10"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-ash via-primary to-shazz"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}

/** Tracks which chapter is currently on screen. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}

const sparkles = (() => {
  const rand = seeded(7)
  return Array.from({ length: 46 }, () => ({
    top: 2 + rand() * 92,
    left: 2 + rand() * 96,
    size: rand() < 0.7 ? 7 + rand() * 7 : 14 + rand() * 10,
    dur: 1.6 + rand() * 2.4,
    delay: rand() * 4,
  }))
})()

/**
 * Bright, four-pointed stars that clearly twinkle (fade and flare) all the
 * time. Used over the night sky of the title cover.
 */
export function TwinklingStars({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      {sparkles.map((star, i) => (
        <span
          key={i}
          className="sparkle absolute"
          style={
            {
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.size,
              height: star.size,
              '--dur': `${star.dur}s`,
              '--delay': `${star.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
