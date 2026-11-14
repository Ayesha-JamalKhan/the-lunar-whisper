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
  narrator,
  type Line,
  type Mood,
  type Speaker,
  type VoiceProfile,
} from '@/content/story'

/**
 * Reads the story aloud with the browser's built-in speech synthesis, giving
 * the narrator, Ash and Shazz each their own voice: a calm man for the
 * narration, a warm young woman for Ash and a little boy for Shazz. To keep the voices from sounding flat, each line is split into
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

  // The narrator picks first so he gets the best man's voice.
  return {
    narrator: pick(narrator.voice),
    ash: pick(characters.ash.voice),
    shazz: pick(characters.shazz.voice),
  } satisfies Record<Speaker | 'narrator', SpeechSynthesisVoice | null>
}

/** Pitch × rate × volume adjustments for each mood. */
const MOODS: Record<Mood, { pitch: number; rate: number; volume: number }> = {
  excited: { pitch: 1.18, rate: 1.14, volume: 1 },
  curious: { pitch: 1.1, rate: 1.04, volume: 0.95 },
  wonder: { pitch: 1.07, rate: 0.95, volume: 0.92 },
  gentle: { pitch: 0.98, rate: 0.98, volume: 0.88 },
  whisper: { pitch: 0.9, rate: 0.9, volume: 0.6 },
  playful: { pitch: 1.13, rate: 1.1, volume: 1 },
  sad: { pitch: 0.86, rate: 0.9, volume: 0.78 },
  sleepy: { pitch: 0.9, rate: 0.88, volume: 0.7 },
  serious: { pitch: 0.92, rate: 0.98, volume: 1 },
  amazed: { pitch: 1.2, rate: 1, volume: 1 },
}

interface Phrase {
  text: string
  pitch: number
  rate: number
  volume: number
  /** Silence after this phrase, in milliseconds. */
  pause: number
}

/**
 * The extra silence after a full stop, comma, exclamation mark or question
 * mark (and after each line of verse). Kept very short on purpose: the speech
 * engine already adds its own small gap between phrases.
 */
const PUNCTUATION_PAUSE = 150

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * Splits a line into phrases and gives each one its own delivery. `mood` can
 * be one mood for the whole line, or a list with one mood per sentence, so a
 * line can change feeling halfway ("Not a little water!" then a whisper).
 * Questions rise, exclamations lift and speed up, short phrases ("So deep.")
 * are leaned on, trailing dots linger, the first phrase of each sentence gets
 * a little extra energy, and sentences fall gently toward their end.
 */
export function shapeLine(
  text: string,
  profile: VoiceProfile,
  mood?: Mood | Mood[],
): Phrase[] {
  const moods = Array.isArray(mood) ? mood : [mood ?? 'gentle']
  const parts = text.match(/[^,;:.!?…—\n]+(?:[,;:.!?…—\n]+|$)/g) ?? [text]
  const phrases: Phrase[] = []
  let sentence = 0
  let inSentence = 0

  parts.forEach((raw, i) => {
    const part = raw.trim()
    if (!/[a-z0-9]/i.test(part)) return
    const m = MOODS[moods[Math.min(sentence, moods.length - 1)] ?? 'gentle']
    // A line break (in verse) ends a phrase just like punctuation does.
    const end = raw.match(/[,;:.!?…—\n]+\s*$/)?.[0] ?? ''
    const words = part.split(/\s+/).length
    const sentenceEnd = /[.!?…\n]/.test(end)

    // Natural rise and fall: alternate up and down, and drift down through a sentence.
    const swing = (i % 2 === 0 ? 1 : -0.7) * profile.bounce
    let pitch = profile.pitch * m.pitch * (1 + swing - inSentence * 0.05)
    let rate = profile.rate * m.rate
    let volume = m.volume
    // Every stop gets the same short breath; nothing waits longer than that.
    const pause = end ? PUNCTUATION_PAUSE : 0

    // Start each sentence with a little lift, as people do.
    if (inSentence === 0) {
      pitch *= 1.04
      volume = Math.min(1, volume * 1.05)
    }
    if (end.includes('?')) pitch *= 1.2 // a question lifts at the end
    if (end.includes('!')) {
      pitch *= 1.14
      rate *= 1.08
      volume = 1
    }
    if (end.includes('…') || end.includes('...')) rate *= 0.9
    if (words <= 3) {
      rate *= 0.93 // lean on short, punchy phrases
      pitch *= 1.03
    }

    pitch = clamp(pitch, 0.1, 2)
    rate = clamp(rate, 0.5, 2)
    phrases.push({ text: part, pitch, rate, volume: clamp(volume, 0, 1), pause })
    if (sentenceEnd) {
      sentence++
      inSentence = 0
    } else {
      inSentence++
    }
  })

  return phrases
}

const noop = () => () => {}

/**
 * The words of a line as they are read aloud: a heading first, then the
 * text, then any list items. Emoji such as ⚠️ are shown but not spoken.
 */
export function spokenText(line: Line) {
  // Point numbers ("1. NASA watches…") are shown but not read aloud.
  const parts = [line.heading?.replace(/^\s*\d+[.)]\s*/, ''), line.text]
  if (line.kind === 'narration' && line.items) parts.push(...line.items)
  return parts
    .filter(Boolean)
    .map((part) => part!.trim())
    // A heading or list item ends with a pause, like the end of a sentence.
    .map((part) => (/[.!?:…]$/.test(part) ? part : `${part}.`))
    .join(' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s+([.,!?])/g, '$1')
}

/** True when a card has at least one line worth reading aloud. */
export function hasDialogue(lines: Line[]) {
  return lines.some((line) => /[a-z0-9]/i.test(spokenText(line)))
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
        // Narration is read by the narrator; dialogue by the character speaking.
        const isSpeech = line.kind === 'speech'
        const voice = isSpeech ? cast[line.speaker] : cast.narrator
        const phrases = shapeLine(
          spokenText(line),
          isSpeech ? characters[line.speaker].voice : narrator.voice,
          line.mood,
        )
        if (!phrases.length) {
          speak(i + 1)
          return
        }
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
