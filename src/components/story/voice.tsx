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

import {
  characters,
  type Line,
  type Mood,
  type Speaker,
  type VoiceProfile,
} from '@/content/story'

/**
 * Reads the story aloud with the browser's built-in speech synthesis, giving
 * Ash and Shazz each their own voice. Narration is never read aloud, only
 * dialogue. To keep the voices from sounding flat, each line is split into
 * phrases. Every phrase gets its own pitch, pace and pause, set by the line's
 * mood, its punctuation and the character's natural bounce. Nothing is generated
 * on a server; if the browser has no speech support, the voice controls stay
 * hidden.
 */


interface Playing {
  id: string
  line: number
}

interface VoiceContextValue {
  supported: boolean
  playing: Playing | null
  autoRead: boolean
  setAutoRead: (on: boolean) => void
  play: (id: string, lines: Line[]) => void
  stop: () => void
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

const FEMALE =
  /female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|susan|zira|aria|jenny|libby|sonia|natasha|hazel|emma|ava|allison|kate|catherine|joanna|salli|kendra|kimberly|amy|nicky/i
const MALE =
  /\bmale\b|\bman\b|daniel|alex|fred|oliver|arthur|aaron|david|mark|guy|ryan|thomas|george|james|rishi|gordon|tom|matthew|joey|brian|eric|christopher/i

/** System voices that sound like a child (Apple "Junior", Amazon "Ivy"/"Justin"/"Kevin"). */
const CHILD = /junior|\bivy\b|justin|kevin|child|\bkid\b|\bboy\b|\bgirl\b/i

function rank(voice: SpeechSynthesisVoice) {
  // Prefer natural/online voices, then local English ones.
  let score = 0
  if (/natural|neural|online|premium|enhanced/i.test(voice.name)) score += 4
  if (/google/i.test(voice.name)) score += 2
  if (voice.localService) score += 1
  return score
}

function castVoices(all: SpeechSynthesisVoice[]) {
  const english = all
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => rank(b) - rank(a))
  const pool = english.length ? english : all
  const used = new Set<string>()

  const pick = (profile: VoiceProfile) => {
    const free = (v: SpeechSynthesisVoice) => !used.has(v.voiceURI)
    const wanted: ((v: SpeechSynthesisVoice) => boolean)[] =
      profile.prefer === 'child'
        ? // A real child voice is best. Otherwise a higher, lighter woman's
          // voice, pitched up, sounds far more childlike than a pitched-up man's.
          [(v) => CHILD.test(v.name), (v) => FEMALE.test(v.name)]
        : profile.prefer === 'female'
          ? [(v) => FEMALE.test(v.name) && !CHILD.test(v.name)]
          : [(v) => MALE.test(v.name) && !FEMALE.test(v.name)]
    let choice: SpeechSynthesisVoice | undefined
    for (const test of wanted) {
      choice = pool.find((v) => test(v) && free(v))
      if (choice) break
    }
    choice ??= pool.find(free) ?? pool[0]
    if (choice) used.add(choice.voiceURI)
    return choice ?? null
  }

  return {
    ash: pick(characters.ash.voice),
    shazz: pick(characters.shazz.voice),
  } satisfies Record<Speaker, SpeechSynthesisVoice | null>
}

/** Pitch × rate × volume adjustments for each mood. */
const MOODS: Record<Mood, { pitch: number; rate: number; volume: number }> = {
  excited: { pitch: 1.14, rate: 1.12, volume: 1 },
  curious: { pitch: 1.07, rate: 1, volume: 0.95 },
  wonder: { pitch: 1.05, rate: 0.86, volume: 0.9 },
  gentle: { pitch: 0.97, rate: 0.9, volume: 0.85 },
  whisper: { pitch: 0.92, rate: 0.8, volume: 0.55 },
  playful: { pitch: 1.1, rate: 1.06, volume: 1 },
  sad: { pitch: 0.88, rate: 0.84, volume: 0.75 },
  sleepy: { pitch: 0.9, rate: 0.76, volume: 0.65 },
  serious: { pitch: 0.94, rate: 0.92, volume: 0.95 },
}

interface Phrase {
  text: string
  pitch: number
  rate: number
  volume: number
  /** Silence after this phrase, in milliseconds. */
  pause: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * Splits a line into phrases and gives each one its own delivery: questions
 * rise, exclamations lift, short phrases ("Squeeze, stretch.") are slowed
 * and leaned on, trailing dots linger, and sentences fall gently toward their end.
 */
export function shapeLine(text: string, profile: VoiceProfile, mood?: Mood): Phrase[] {
  const m = MOODS[mood ?? 'gentle']
  const parts = text.match(/[^,;:.!?…—]+(?:[,;:.!?…—]+|$)/g) ?? [text]
  const phrases: Phrase[] = []
  let inSentence = 0

  parts.forEach((raw, i) => {
    const part = raw.trim()
    if (!/[a-z0-9]/i.test(part)) return
    const end = part.match(/[,;:.!?…—]+$/)?.[0] ?? ''
    const words = part.split(/\s+/).length
    const sentenceEnd = /[.!?…]/.test(end)

    // Natural rise and fall: alternate up and down, and drift down through a sentence.
    const swing = (i % 2 === 0 ? 1 : -0.6) * profile.bounce
    let pitch = profile.pitch * m.pitch * (1 + swing - inSentence * 0.04)
    let rate = profile.rate * m.rate
    let pause = sentenceEnd ? profile.pause : profile.pause * 0.45

    if (end.includes('?')) pitch *= 1.15 // a question lifts at the end
    if (end.includes('!')) {
      pitch *= 1.1
      rate *= 1.06
    }
    if (end.includes('…') || end.includes('...')) {
      rate *= 0.85
      pause += 400
    }
    if (end.includes('—')) pause += 150
    if (words <= 3) {
      rate *= 0.88 // lean on short, punchy phrases
      pause += 80
    }

    pitch = clamp(pitch, 0.1, 2)
    rate = clamp(rate, 0.5, 2)
    phrases.push({ text: part, pitch, rate, volume: m.volume, pause })
    inSentence = sentenceEnd ? 0 : inSentence + 1
  })

  return phrases
}

const noop = () => () => {}

/** True when a card has at least one spoken line worth playing. */
export function hasDialogue(lines: Line[]) {
  return lines.some((line) => line.kind === 'speech')
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const supported = useSyncExternalStore(
    noop,
    () => 'speechSynthesis' in window,
    () => false,
  )
  const [playing, setPlaying] = useState<Playing | null>(null)
  const [autoRead, setAutoReadState] = useState(false)
  // Each playback gets a token so callbacks from cancelled speech are ignored.
  const run = useRef(0)

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    // Some browsers load their voice list lazily; asking once warms it up.
    synth.getVoices()
    return () => synth.cancel()
  }, [supported])

  const stop = useCallback(() => {
    run.current++
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setPlaying(null)
  }, [])

  const play = useCallback(
    (id: string, lines: Line[]) => {
      if (!('speechSynthesis' in window)) return
      const synth = window.speechSynthesis
      synth.cancel()
      const token = ++run.current
      const cast = castVoices(synth.getVoices())

      const speak = (i: number) => {
        if (token !== run.current) return
        if (i >= lines.length) {
          setPlaying(null)
          return
        }
        const line = lines[i]
        // Narration stays silent; only the characters speak.
        if (line.kind !== 'speech') {
          speak(i + 1)
          return
        }
        const voice = cast[line.speaker]
        const phrases = shapeLine(
          line.text,
          characters[line.speaker].voice,
          line.mood,
        )
        setPlaying({ id, line: i })

        const say = (k: number) => {
          if (token !== run.current) return
          if (k >= phrases.length) {
            speak(i + 1)
            return
          }
          const phrase = phrases[k]
          const utterance = new SpeechSynthesisUtterance(phrase.text)
          if (voice) {
            utterance.voice = voice
            utterance.lang = voice.lang
          } else {
            utterance.lang = 'en-US'
          }
          utterance.pitch = phrase.pitch
          utterance.rate = phrase.rate
          utterance.volume = phrase.volume
          utterance.onend = () => {
            window.setTimeout(() => say(k + 1), phrase.pause)
          }
          utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') return
            if (token === run.current) setPlaying(null)
          }
          synth.speak(utterance)
        }

        say(0)
      }

      speak(0)
    },
    [],
  )

  const setAutoRead = useCallback(
    (on: boolean) => {
      setAutoReadState(on)
      if (!on) stop()
    },
    [stop],
  )

  const value = useMemo(
    () => ({ supported, playing, autoRead, setAutoRead, play, stop }),
    [supported, playing, autoRead, setAutoRead, play, stop],
  )

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoice() {
  const ctx = useContext(VoiceContext)
  if (!ctx) throw new Error('useVoice must be used inside <VoiceProvider>')
  return ctx
}

/**
 * When "read aloud as I scroll" is on, starts reading a card once most of it
 * is on screen.
 */
export function useAutoRead(id: string, lines: Line[]) {
  const ref = useRef<HTMLDivElement>(null)
  const { autoRead, play, playing } = useVoice()
  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    const el = ref.current
    if (!autoRead || !el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          playingRef.current?.id !== id &&
          hasDialogue(lines)
        ) {
          play(id, lines)
        }
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoRead, id, lines, play])

  return ref
}
