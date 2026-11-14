import { Music, Music2 } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { useVoice } from '@/components/story/voice'
import { cn } from '@/lib/utils'

/**
 * Calm background music for the whole story. It loops, plays quietly, and gets
 * a little quieter still while a voice is reading so the characters stay clear.
 * It starts when the reader taps "Story Begins" (browsers only allow sound after
 * a tap). The on/off choice is remembered; music is on by default.
 */
const SRC = '/leberch-calm-calm-music-580525.mp3'
const STORAGE_KEY = 'lunar-whisper-music'
/** Normal background level, and the lower level used while a voice is speaking. */
const VOLUME = 0.18
const DUCKED_VOLUME = 0.09
const FADE_MS = 800

interface MusicContextValue {
  enabled: boolean
  setEnabled: (on: boolean) => void
  /** Starts the music if the reader has it on. Call from a user tap. */
  start: () => void
}

// The reader's on/off choice, kept in localStorage so it survives a reload.
const listeners = new Set<() => void>()
let memoryChoice: boolean | null = null
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function readEnabled() {
  if (memoryChoice !== null) return memoryChoice
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

const MusicContext = createContext<MusicContextValue | null>(null)

export function MusicProvider({ children }: { children: ReactNode }) {
  const { playing } = useVoice()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<number | null>(null)
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => true)
  // Whether the story has started (Story Begins tapped, or scrolled past the title page).
  const [started, setStarted] = useState(false)
  const targetVolume = playing ? DUCKED_VOLUME : VOLUME

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(SRC)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      audioRef.current = audio
    }
    return audioRef.current
  }, [])

  const fadeTo = useCallback((target: number, then?: () => void) => {
    const audio = audioRef.current
    if (!audio) return
    if (fadeRef.current !== null) cancelAnimationFrame(fadeRef.current)
    const from = audio.volume
    const begin = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - begin) / FADE_MS)
      audio.volume = from + (target - from) * t
      if (t < 1) fadeRef.current = requestAnimationFrame(step)
      else {
        fadeRef.current = null
        then?.()
      }
    }
    fadeRef.current = requestAnimationFrame(step)
  }, [])

  const shouldPlay = enabled && started
  // Latest values for callbacks that run later (fade ends, tap-to-retry).
  const shouldPlayRef = useRef(shouldPlay)
  const targetRef = useRef(targetVolume)
  useEffect(() => {
    shouldPlayRef.current = shouldPlay
    targetRef.current = targetVolume
  })

  // Play or pause (with a gentle fade) whenever the state changes.
  useEffect(() => {
    if (shouldPlay) {
      const audio = getAudio()
      audio.play().then(
        () => fadeTo(targetRef.current),
        () => {
          // Autoplay was blocked (e.g. after a reload): start on the next tap or key.
          const retry = () => {
            window.removeEventListener('pointerdown', retry)
            window.removeEventListener('keydown', retry)
            if (!shouldPlayRef.current) return
            audio.play().then(
              () => fadeTo(targetRef.current),
              () => {},
            )
          }
          window.addEventListener('pointerdown', retry, { once: true })
          window.addEventListener('keydown', retry, { once: true })
        },
      )
    } else if (audioRef.current && !audioRef.current.paused) {
      const audio = audioRef.current
      fadeTo(0, () => {
        if (!shouldPlayRef.current) audio.pause()
      })
    }
  }, [shouldPlay, getAudio, fadeTo])

  // Duck under the voices.
  useEffect(() => {
    const audio = audioRef.current
    if (shouldPlay && audio && !audio.paused) fadeTo(targetVolume)
  }, [targetVolume, shouldPlay, fadeTo])

  // Pause while the tab is hidden; resume when the reader comes back.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current
      if (!audio || !shouldPlay) return
      if (document.hidden) audio.pause()
      else audio.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [shouldPlay])

  // Once the reader is past the title page (e.g. after a reload mid-story), the music belongs on.
  useEffect(() => {
    const top = document.getElementById('top')
    if (!top) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setStarted(true)
      },
      { threshold: 0.5 },
    )
    observer.observe(top)
    return () => observer.disconnect()
  }, [])

  // Stop on unmount.
  useEffect(
    () => () => {
      if (fadeRef.current !== null) cancelAnimationFrame(fadeRef.current)
      audioRef.current?.pause()
    },
    [],
  )

  const setEnabled = useCallback((on: boolean) => {
    if (on) setStarted(true)
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      // Storage can be blocked; the choice then lasts only for this visit.
      memoryChoice = on
    }
    listeners.forEach((l) => l())
  }, [])

  const start = useCallback(() => {
    setStarted(true)
    // Calling play() directly inside the tap keeps browsers happy about sound.
    if (enabled)
      getAudio()
        .play()
        .catch(() => {})
  }, [enabled, getAudio])

  const value = useMemo(
    () => ({ enabled, setEnabled, start }),
    [enabled, setEnabled, start],
  )

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

export function useMusic() {
  const ctx = useContext(MusicContext)
  if (!ctx) throw new Error('useMusic must be used inside <MusicProvider>')
  return ctx
}

/** On/off switch for the background music. */
export function MusicToggle({ className }: { className?: string }) {
  const { enabled, setEnabled } = useMusic()
  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg shadow-black/40 backdrop-blur-md transition-colors focus-visible:outline-2',
        enabled
          ? 'border-primary/60 bg-primary/15 text-foreground'
          : 'border-border bg-background/70 text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {enabled ? (
        <Music2 className="size-4" aria-hidden="true" />
      ) : (
        <Music className="size-4 opacity-60" aria-hidden="true" />
      )}
      {enabled ? 'Music on' : 'Music off'}
    </button>
  )
}
