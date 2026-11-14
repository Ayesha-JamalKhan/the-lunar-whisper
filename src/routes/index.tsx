import { createFileRoute } from '@tanstack/react-router'
import { ArrowUp, Telescope, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ChapterSection } from '@/components/story/chapter-section'
import {
  imageUrl,
  Reveal,
  ScrollProgress,
  Starfield,
  TwinklingStars,
  useActiveSection,
} from '@/components/story/primitives'
import { VoiceProvider, useVoice } from '@/components/story/voice'
import { Button } from '@/components/ui/button'
import { chapters, lookUpTips } from '@/content/story'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: Home,
})

const chapterIds = chapters.map((c) => c.id)

function Home() {
  const active = useActiveSection(chapterIds)
  const onTitle = useOnTitlePage()

  return (
    <VoiceProvider>
      <main className="relative bg-background">
        {/* The title page shows only its cover; the controls appear once the story starts. */}
        <div
          className={cn(
            'relative z-40 transition-opacity duration-500',
            onTitle && 'pointer-events-none opacity-0',
          )}
          inert={onTitle}
        >
          <ScrollProgress />
          <ChapterNav active={active} />
          <VoiceToggle />
        </div>
        <Hero />
        {chapters.map((chapter, i) => (
          <ChapterSection key={chapter.id} chapter={chapter} index={i} />
        ))}
        <Epilogue />
      </main>
    </VoiceProvider>
  )
}

/** Turns on reading each card aloud, in the narrator's and characters' voices, as it scrolls into view. */
function VoiceToggle() {
  const { supported, autoRead, setAutoRead } = useVoice()
  if (!supported) return null
  return (
    <button
      type="button"
      onClick={() => setAutoRead(!autoRead)}
      aria-pressed={autoRead}
      className={cn(
        'fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg shadow-black/40 backdrop-blur-md transition-colors focus-visible:outline-2',
        autoRead
          ? 'border-primary/60 bg-primary/15 text-foreground'
          : 'border-border bg-background/70 text-muted-foreground hover:text-foreground',
      )}
    >
      {autoRead ? (
        <Volume2 className="size-4" aria-hidden="true" />
      ) : (
        <VolumeX className="size-4" aria-hidden="true" />
      )}
      {autoRead ? 'Voices on' : 'Read aloud as I scroll'}
    </button>
  )
}

/** The title page: the cover illustration, stretched to fill the screen. */
const COVER = '/title.png'
/** Used until `/title.png` is added to `public/`. */
const COVER_FALLBACK = '/title.jpg'

function Hero() {
  const [cover, setCover] = useState(COVER)
  const img = useRef<HTMLImageElement>(null)
  const widths = [640, 960, 1280, 1536]
  const fallBack = () => setCover((c) => (c === COVER ? COVER_FALLBACK : c))

  // The picture can fail before the page is interactive, when onError isn't listening yet.
  useEffect(() => {
    const el = img.current
    if (el?.complete && el.naturalWidth === 0) fallBack()
  }, [])

  const begin = () => {
    const first = document.getElementById(chapters[0].id)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    first?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <header id="top" className="relative h-svh overflow-hidden bg-background">
      <h1 className="sr-only">The Lunar Whisper</h1>
      <img
        ref={img}
        src={imageUrl(cover, 1280)}
        srcSet={widths.map((w) => `${imageUrl(cover, w)} ${w}w`).join(', ')}
        sizes="100vw"
        alt="The Lunar Whisper. A young woman and her little nephew sit on a stone rooftop above a mountain river at night, looking up at the Moon, Jupiter, icy Europa and the James Webb Space Telescope."
        width={896}
        height={1200}
        fetchPriority="high"
        decoding="async"
        onError={fallBack}
        // Stretched to fill the whole screen, with no empty space around it.
        className="relative h-full w-full object-fill"
      />
      {/* Bright stars twinkling over the night sky of the cover. */}
      <TwinklingStars className="bottom-auto h-[55%]" />
      <div className="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex justify-center">
        <Button
          type="button"
          size="lg"
          onClick={begin}
          className="h-auto rounded-full border border-amber-200/60 bg-amber-300/90 px-8 py-3 font-display text-lg text-indigo-950 shadow-[0_0_30px_rgba(252,211,77,0.45)] hover:bg-amber-200 focus-visible:ring-amber-100"
        >
          Story Begins
        </Button>
      </div>
    </header>
  )
}

/** True while the title page is on screen, so the floating controls stay out of it. */
function useOnTitlePage() {
  const [onTitle, setOnTitle] = useState(true)
  useEffect(() => {
    const el = document.getElementById('top')
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setOnTitle(entry.isIntersecting),
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return onTitle
}

function ChapterNav({ active }: { active: string | null }) {
  return (
    <nav
      aria-label="Chapters"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:block"
    >
      <ol className="flex flex-col items-end gap-3">
        {chapters.map((c) => {
          const isActive = active === c.id
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={isActive ? 'step' : undefined}
                className="group flex items-center gap-3 rounded-full py-1 pl-3 focus-visible:outline-2"
              >
                <span
                  className={cn(
                    'font-display text-sm text-foreground/0 transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80',
                    isActive && 'text-foreground/80',
                  )}
                >
                  {c.title}
                </span>
                <span
                  className={cn(
                    'block size-2 rounded-full bg-foreground/30 transition-all',
                    isActive && 'size-3 bg-primary shadow-[0_0_12px] shadow-primary',
                  )}
                />
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Epilogue() {
  return (
    <footer className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6">
      <Starfield className="opacity-60" />
      <div className="relative mx-auto max-w-content">
        <Reveal className="text-center">
          <p className="font-display text-5xl font-light italic text-ash sm:text-6xl">
            The End
          </p>
          <p className="mx-auto mt-6 max-w-reading text-lg text-muted-foreground">
            Somewhere out there, past the clouds
            and the stars that twinkle, a spacecraft is still on its way.
          </p>
        </Reveal>

        <Reveal className="mt-28">
          <h2 className="flex items-center justify-center gap-3 text-center font-display text-3xl sm:text-4xl">
            <Telescope className="size-7 text-accent" aria-hidden="true" />
            Look up tonight
          </h2>
          <p className="mx-auto mt-3 max-w-reading text-center text-muted-foreground">
            You can find Europa’s planet yourself, just like Ash and Shazz.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {lookUpTips.map((tip, i) => (
            <Reveal
              key={tip.title}
              delay={i * 150}
              className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur"
            >
              <p className="font-display text-sm text-primary">0{i + 1}</p>
              <h3 className="mt-2 font-display text-xl">{tip.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {tip.text}
              </p>
            </Reveal>
          ))}
        </div>

        <div className="mt-24 flex flex-col items-center gap-6 border-t border-border pt-10 text-center">
          <Button asChild variant="outline" className="rounded-full">
            <a href="#top">
              <ArrowUp aria-hidden="true" />
              Read it again
            </a>
          </Button>
          <p className="max-w-reading text-xs leading-relaxed text-muted-foreground/80">
            A story inspired by real science. Ash and Shazz are imaginary; the
            ocean of Europa might not be.
          </p>
        </div>
      </div>
    </footer>
  )
}
