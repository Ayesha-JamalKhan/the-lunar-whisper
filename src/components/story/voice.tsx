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
 * narration, a warm, expressive young American woman for Ash and a tiny,
 * high baby voice for Shazz. To keep the voices from sounding flat, each line
 * is split into sentences. Every sentence gets its own pitch, pace and
 * loudness, set by the line's mood, its punctuation and the character's
 * natural bounce, while commas are spoken in one easy breath. Nothing is generated
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

/** Child voices that are boys (Apple "Junior", Amazon "Justin"/"Kevin"). */
const BOY = /junior|justin|kevin|\bboy\b/i

/** A man's voice that isn't a child's or a woman's. */
const isMan = (v: SpeechSynthesisVoice) =>
  MALE.test(v.name) && !FEMALE.test(v.name) && !CHILD.test(v.name)

function rank(voice: SpeechSynthesisVoice) {
  // Prefer natural/online voices, then local English ones.
  let score = 0
  if (/natural|neural|online|premium|enhanced/i.test(voice.name)) score += 4
  if (/google/i.test(voice.name)) score += 2
  if (voice.localService) score += 1
  return score
}

/** British, Australian, Irish, Scottish or Indian system voices, by name. */
const NOT_AMERICAN =
  /\buk\b|brit|serena|kate|fiona|moira|tessa|karen|libby|sonia|hazel|martha|catherine|natasha|veena|rishi|daniel|arthur|oliver|george/i

/** True for a voice with an American accent. */
const isAmerican = (v: SpeechSynthesisVoice) =>
  /^en[-_]us/i.test(v.lang) && !NOT_AMERICAN.test(v.name)

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
        ? // A real boy's voice is best. Otherwise a man's voice pitched right
          // up and slowed down: it keeps a boy's timbre, whereas a pitched-up
          // woman's voice sounds like a little girl.
          // American voices come first, so he shares Ash's accent.
          [
            (v) => BOY.test(v.name) && isAmerican(v),
            (v) => isMan(v) && isAmerican(v),
          ]
        : profile.prefer === 'female'
          ? [
              // An American woman first ("Google US English" is a woman's
              // voice too), then any American voice, then any woman's.
              (v) =>
                isAmerican(v) &&
                (FEMALE.test(v.name) || /google us english/i.test(v.name)) &&
                !CHILD.test(v.name),
              (v) => isAmerican(v) && !MALE.test(v.name) && !CHILD.test(v.name),
              (v) => FEMALE.test(v.name) && !CHILD.test(v.name),
            ]
          : [isMan]
    let choice: SpeechSynthesisVoice | undefined
    for (const test of wanted) {
      choice = pool.find((v) => test(v) && free(v))
      if (choice) break
    }
    // With only one man's voice, Shazz shares the narrator's: pitched up
    // and slowed, it still sounds like a different, much younger boy.
    // An American man's voice, even shared, beats a free British one.
    if (!choice && profile.prefer === 'child') {
      choice =
        pool.find((v) => isMan(v) && isAmerican(v)) ??
        pool.find((v) => BOY.test(v.name) && free(v)) ??
        pool.find((v) => isMan(v) && free(v)) ??
        pool.find(isMan)
    }
    choice ??= pool.find(free) ?? pool[0]
    if (choice) used.add(choice.voiceURI)
    return choice ?? null
  }

  // The narrator picks first so he gets the best man's voice; Ash picks
  // before Shazz so she gets the American woman's voice.
  return {
    narrator: pick(narrator.voice),
    ash: pick(characters.ash.voice),
    shazz: pick(characters.shazz.voice),
  } satisfies Record<Speaker | 'narrator', SpeechSynthesisVoice | null>
}

/**
 * Pitch × rate × volume adjustments for each mood. Rates stay close to 1 so
 * no mood rushes the words; feeling comes mostly from pitch and loudness.
 */
const MOODS: Record<Mood, { pitch: number; rate: number; volume: number }> = {
  excited: { pitch: 1.16, rate: 1.06, volume: 1 },
  curious: { pitch: 1.1, rate: 1, volume: 0.95 },
  wonder: { pitch: 1.07, rate: 0.93, volume: 0.92 },
  gentle: { pitch: 0.98, rate: 0.96, volume: 0.88 },
  whisper: { pitch: 0.9, rate: 0.88, volume: 0.6 },
  playful: { pitch: 1.13, rate: 1.04, volume: 1 },
  sad: { pitch: 0.86, rate: 0.88, volume: 0.78 },
  sleepy: { pitch: 0.9, rate: 0.86, volume: 0.7 },
  serious: { pitch: 0.92, rate: 0.95, volume: 1 },
  amazed: { pitch: 1.2, rate: 0.97, volume: 1 },
  warm: { pitch: 1.03, rate: 0.96, volume: 0.92 },
  proud: { pitch: 1.08, rate: 0.98, volume: 1 },
  hopeful: { pitch: 1.1, rate: 0.96, volume: 0.95 },
  tender: { pitch: 1.01, rate: 0.9, volume: 0.78 },
  teasing: { pitch: 1.1, rate: 1.02, volume: 0.95 },
  urgent: { pitch: 1.02, rate: 1.03, volume: 1 },
  mysterious: { pitch: 0.94, rate: 0.9, volume: 0.75 },
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
 * The extra silence after a sentence (a full stop, exclamation mark or colon)
 * and after each line of verse. Kept very short on purpose: the speech engine
 * already adds its own small gap between sentences. Commas, question marks
 * and trailing dots never get extra silence: they stay inside the sentence,
 * so the voice takes only the quick breath of ordinary conversation there.
 */
const PUNCTUATION_PAUSE = 150

/**
 * Statements stay below this pitch so a question always has room to rise
 * above them, even for Shazz's high voice.
 */
const STATEMENT_PITCH = 1.86

/** Never faster than this, whatever the mood, so no sentence is rushed. */
const MAX_RATE = 1.12

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * Splits a line into sentences and gives each one its own delivery. `mood`
 * can be one mood for the whole line, or a list with one mood per sentence,
 * so a line can change feeling halfway ("Not a little water!" then a
 * whisper). Commas, question marks, trailing dots, semicolons and dashes stay
 * inside their sentence and are spoken in one breath, as in conversation: a
 * separate utterance would add the engine's longer gap. The speech engine
 * gives each `?` its own rising question tune, and a sentence that ends in a
 * question is lifted above the statements around it. Exclamations lift,
 * short sentences ("So deep.") are leaned on, and long sentences without a
 * comma to breathe at are slowed a little so the words don't run together.
 */
export function shapeLine(
  text: string,
  profile: VoiceProfile,
  mood?: Mood | Mood[],
): Phrase[] {
  const moods = Array.isArray(mood) ? mood : [mood ?? 'gentle']
  const parts = text.match(/[^.!:\n]+(?:[.!:\n]+|$)/g) ?? [text]
  const phrases: Phrase[] = []
  let sentence = 0

  parts.forEach((raw) => {
    const part = raw.trim()
    if (!/[a-z0-9]/i.test(part)) return
    const m = MOODS[moods[Math.min(sentence, moods.length - 1)] ?? 'gentle']
    // A line break (in verse) ends a phrase just like punctuation does.
    const end = raw.match(/[.!?:\n]+\s*$/)?.[0] ?? ''
    const question = end.includes('?')
    const words = part.split(/\s+/).length
    // The longest stretch of words with no comma (or similar) to breathe at.
    const run = Math.max(
      ...part.split(/[,;?—–]/).map((s) => s.trim().split(/\s+/).length),
    )

    // Natural rise and fall: alternate sentences up and down a little.
    const swing = (sentence % 2 === 0 ? 1 : -0.6) * profile.bounce
    let pitch = profile.pitch * m.pitch * (1 + swing)
    let rate = profile.rate * m.rate
    let volume = m.volume

    // A question lifts; a statement leaves headroom so the question can.
    if (question) pitch *= 1.12
    else pitch = Math.min(pitch, STATEMENT_PITCH)
    if (end.includes('!')) {
      pitch *= 1.1
      rate *= 1.03
      volume = 1
    }
    if (words <= 3) {
      rate *= 0.94 // lean on short, punchy sentences
      pitch *= 1.03
    }
    // Long runs without a comma get slowed down a touch, gradually.
    if (run > 7) rate *= Math.max(0.86, 1 - (run - 7) * 0.012)

    pitch = clamp(pitch, 0.1, 2)
    rate = clamp(rate, 0.5, MAX_RATE)
    phrases.push({
      text: part,
      pitch,
      rate,
      volume: clamp(volume, 0, 1),
      pause: end && !question ? PUNCTUATION_PAUSE : 0,
    })
    sentence++
  })

  return phrases
}

/**
 * The voice settings for a speaker. Shazz's high pitch is meant to turn a
 * man's voice into a six-year-old boy's; a real boy's voice is already young,
 * so it is raised only a little, or it would squeak like a toddler.
 */
function profileFor(
  speaker: Speaker | 'narrator',
  voice: SpeechSynthesisVoice | null,
): VoiceProfile {
  if (speaker === 'narrator') return narrator.voice
  const profile = characters[speaker].voice
  if (speaker === 'shazz' && voice && BOY.test(voice.name)) {
    return { ...profile, pitch: 1.2 }
  }
  return profile
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
    // Decimals are read out ("1.5" as "1 point 5"); otherwise the dot would
    // be taken as a full stop and split the number in two.
    .replace(/(\d)\.(\d)/g, '$1 point $2')
    // Trailing dots ("So... Europa") are read like a comma: a quick breath,
    // not the long stop an engine makes for an ellipsis.
    .replace(/\s*(?:\.{2,}|…)\s*/g, ', ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/,\s*([.!?:])/g, '$1')
    .replace(/^,\s*|,\s*$/g, '')
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
          profileFor(isSpeech ? line.speaker : 'narrator', voice),
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
