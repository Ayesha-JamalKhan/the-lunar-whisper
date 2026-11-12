import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Telescope, Volume2, VolumeX } from 'lucide-react'

import { ChapterSection } from '@/components/story/chapter-section'
import {
  Reveal,
  ScrollProgress,
  Starfield,
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

  return (
    <VoiceProvider>
      <main className="relative bg-background">
        <ScrollProgress />
        <ChapterNav active={active} />
        <VoiceToggle />
        <Hero />
        {chapters.map((chapter, i) => (
          <ChapterSection key={chapter.id} chapter={chapter} index={i} />
        ))}
        <Epilogue />
      </main>
    </VoiceProvider>
  )
}

/** Turns on reading each card aloud, in the characters' voices, as it scrolls into view. */
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

/** A small painted Europa: pale ice with reddish cracks. */
function EuropaMoon({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative aspect-square rounded-full', className)}
      style={{
        background:
          'radial-gradient(circle at 35% 30%, oklch(0.98 0.02 85), oklch(0.86 0.04 75) 45%, oklch(0.55 0.05 60) 85%, oklch(0.3 0.04 270))',
        boxShadow:
          '0 0 80px 10px oklch(0.85 0.08 80 / 0.25), inset -20px -20px 60px oklch(0.2 0.04 270 / 0.7)',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full rounded-full opacity-70 mix-blend-multiply"
      >
        <g fill="none" stroke="oklch(0.5 0.12 40)" strokeLinecap="round">
          <path d="M8 40 C 30 35, 55 50, 92 30" strokeWidth="0.9" />
          <path d="M15 65 C 40 55, 60 70, 88 58" strokeWidth="0.7" />
          <path d="M30 10 C 38 35, 45 60, 40 95" strokeWidth="0.6" />
          <path d="M60 8 C 55 30, 70 55, 62 92" strokeWidth="0.8" />
          <path d="M5 52 C 25 50, 50 30, 75 15" strokeWidth="0.5" />
          <path d="M20 85 C 45 78, 70 85, 95 70" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  )
}

function Hero() {
  return (
    <header id="top" className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 text-center sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.28_0.07_265),transparent_60%),radial-gradient(ellipse_at_bottom,oklch(0.22_0.06_220),transparent_55%)]"
      />
      <Starfield />

      <div className="relative">
        <EuropaMoon className="mx-auto mb-10 w-28 sm:w-36" />
        <p className="font-display text-sm uppercase tracking-[0.45em] text-primary">
          What mysteries Europa might hold
        </p>
        <h1 className="mt-5 font-display text-6xl font-light leading-[0.95] text-balance sm:text-8xl md:text-9xl">
          The Lunar <em className="font-normal text-ash">Whisper</em>
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          One summer night, on the roof of a sleeping house, a young woman tells her
          little nephew about a frozen moon of Jupiter, the hidden ocean
          beneath its ice, and the small hope that something might be living
          down there in the dark.
        </p>

        <p className="mx-auto mt-6 max-w-md text-xs text-muted-foreground/70">
          Press <span className="text-foreground/80">Listen</span> to hear the
          characters speak their lines.
        </p>

        <Button asChild size="lg" className="mt-12 rounded-full px-8">
          <a href={`#${chapters[0].id}`}>
            Begin the story
            <ArrowDown className="motion-safe:animate-bounce" aria-hidden="true" />
          </a>
        </Button>
      </div>

      <p className="absolute bottom-6 text-xs text-muted-foreground/80">
        Scroll slowly. It’s a long way to Jupiter.
      </p>
    </header>
  )
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
            …or maybe just the beginning. Somewhere out there, past the clouds
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
