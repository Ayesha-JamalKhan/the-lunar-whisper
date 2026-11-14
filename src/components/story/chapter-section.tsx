import { Pause, Sparkles, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { characters, type Beat, type Chapter, type Line } from '@/content/story'
import { cn } from '@/lib/utils'

import { Reveal, Starfield, StoryImage } from './primitives'
import { hasDialogue, useAutoRead, useVoice } from './voice'

/** `speaking` is undefined when nothing in the card is being read aloud. */
function StoryLine({ line, speaking }: { line: Line; speaking?: boolean }) {
  const dim = speaking === false && 'opacity-55'

  if (line.kind === 'narration' && line.items) {
    return (
      <div className={cn('transition-opacity duration-500', dim)}>
        {line.heading && (
          <h3 className="font-display text-2xl leading-snug text-ash sm:text-3xl">
            {line.heading}
          </h3>
        )}
        {(() => {
          const List = line.numbered ? 'ol' : 'ul'
          return (
            <List className="mt-4 space-y-3">
              {line.items.map((item, k) => (
                <li
                  key={item}
                  className="flex gap-3 text-lg leading-relaxed text-foreground/85 sm:text-xl"
                >
                  {line.numbered ? (
                    <span
                      aria-hidden="true"
                      className="w-6 shrink-0 font-display font-semibold text-accent"
                    >
                      {k + 1}.
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-[0.6em] size-2 shrink-0 rounded-full bg-accent"
                    />
                  )}
                  {item}
                </li>
              ))}
            </List>
          )
        })()}
      </div>
    )
  }

  if (line.kind === 'narration') {
    return (
      <p
        className={cn(
          'transition-opacity duration-500',
          line.verse
            ? 'whitespace-pre-line text-center font-display text-xl italic leading-loose text-ash sm:text-2xl'
            : 'text-lg leading-relaxed text-foreground/85 sm:text-xl',
          speaking && 'text-foreground',
          dim,
        )}
      >
        {line.text}
      </p>
    )
  }

  const isAsh = line.speaker === 'ash'
  return (
    <figure
      className={cn(
        'border-l-2 pl-4 transition-opacity duration-500 sm:pl-5',
        isAsh ? 'border-ash/70' : 'border-shazz/70',
        speaking && (isAsh ? 'border-ash' : 'border-shazz'),
        dim,
      )}
    >
      <figcaption
        className={cn(
          'mb-1 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.25em]',
          isAsh ? 'text-ash' : 'text-shazz',
        )}
      >
        {characters[line.speaker].name}
        {speaking && (
          <Volume2
            className="size-3.5 motion-safe:animate-pulse"
            aria-label="speaking"
          />
        )}
      </figcaption>
      {line.lead && (
        <p className="mb-1.5 text-base italic leading-relaxed text-foreground/70 sm:text-lg">
          {line.lead}
        </p>
      )}
      {line.heading && (
        <p className="mb-2 font-display text-lg font-semibold leading-snug text-foreground sm:text-xl">
          “{line.heading}
        </p>
      )}
      <blockquote
        className={cn(
          'font-display text-xl leading-snug sm:text-2xl',
          isAsh ? 'text-foreground' : 'italic text-foreground/95',
        )}
      >
        {line.heading ? '' : '“'}
        {line.text}”
      </blockquote>
    </figure>
  )
}

function BeatCard({
  id,
  beat,
  className,
}: {
  id: string
  beat: Beat
  className: string
}) {
  const { supported, playing, play, stop } = useVoice()
  const ref = useAutoRead(id, beat.lines)
  const isPlaying = playing?.id === id

  return (
    <div ref={ref} className={cn('w-full max-w-reading', className)}>
      <Reveal
        className={cn(
          'relative w-full rounded-2xl border border-border bg-background/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8',
        )}
      >
        {supported && hasDialogue(beat.lines) && (
          <div className="-mt-2 mb-3 flex justify-end sm:-mt-3">
            <button
              type="button"
              onClick={() => (isPlaying ? stop() : play(id, beat.lines))}
              aria-pressed={isPlaying}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="size-3.5" aria-hidden="true" /> Stop
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5" aria-hidden="true" /> Listen
                </>
              )}
            </button>
          </div>
        )}
        <div className="space-y-5">
          {beat.lines.map((line, j) => (
            <StoryLine
              key={j}
              line={line}
              speaking={isPlaying ? playing.line === j : undefined}
            />
          ))}
        </div>
      </Reveal>
    </div>
  )
}

/**
 * Tracks how far the reader has got in a chapter: the last card whose top has
 * scrolled past about two-thirds of the screen (-1 before the first card), and
 * whether the chapter is still on screen. The chapter's background picture and
 * page link both follow this.
 */
function useChapterProgress(section: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ reached: -1, inChapter: false })

  useEffect(() => {
    const el = section.current
    if (!el) return
    const update = () => {
      const vh = window.innerHeight
      const box = el.getBoundingClientRect()
      // Over once the last card has scrolled away.
      const inChapter = box.bottom > vh * 0.5 && box.top < vh
      let reached = -1
      el.querySelectorAll<HTMLElement>('[data-beat]').forEach((card) => {
        if (card.getBoundingClientRect().top < vh * 0.65) {
          reached = Math.max(reached, Number(card.dataset.beat))
        }
      })
      setState((prev) =>
        prev.reached === reached && prev.inChapter === inChapter
          ? prev
          : { reached, inChapter },
      )
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [section])

  return state
}

/**
 * The value set by the latest card up to `reached` that sets one. A card can
 * set `null` to clear it from there on.
 */
function latest<T>(beats: Beat[], reached: number, pick: (b: Beat) => T | undefined) {
  for (let i = Math.min(reached, beats.length - 1); i >= 0; i--) {
    const value = pick(beats[i])
    if (value !== undefined) return value
  }
  return undefined
}

/**
 * The chapter's pictures, stacked. The one for the current part of the story
 * fades in over the others. A picture that fails to load is skipped, so the
 * previous one stays visible.
 */
function ChapterBackdrop({
  chapter,
  current,
  priority,
}: {
  chapter: Chapter
  current: string
  priority: boolean
}) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const layers = [
    { file: chapter.image, alt: chapter.imageAlt },
    ...chapter.beats.flatMap((b) =>
      b.image ? [{ file: b.image.file, alt: b.image.alt }] : [],
    ),
  ]
  const usable = layers.filter((l) => !broken.has(l.file))
  // If the current picture is missing, fall back to the latest one before it that loaded.
  const order = layers.map((l) => l.file)
  const visible =
    [...usable]
      .reverse()
      .find((l) => order.indexOf(l.file) <= order.indexOf(current))?.file ??
    chapter.image

  return (
    <>
      {layers.map((layer, i) => (
        <StoryImage
          key={layer.file}
          file={layer.file}
          alt={layer.file === visible ? layer.alt : ''}
          priority={priority && i === 0}
          onError={() => setBroken((prev) => new Set(prev).add(layer.file))}
          className={cn(
            'drift absolute inset-0 transition-opacity duration-1000',
            layer.file === visible ? 'opacity-100' : 'opacity-0',
            broken.has(layer.file) && 'hidden',
          )}
        />
      ))}
    </>
  )
}

function PageLink({
  link,
  shown,
}: {
  link: Beat['link'] | null
  shown: boolean
}) {
  if (!link) return null
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={link.label}
      title={link.label}
      inert={!shown}
      className={cn(
        'fixed left-3 top-4 z-40 block size-16 overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-black/50 ring-2 ring-accent/60 transition-[opacity,transform] duration-500 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 sm:left-5 sm:top-5 sm:size-20',
        shown ? 'opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      <img
        src="/wired-outline-2917-click-button.gif"
        alt=""
        width={400}
        height={400}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </a>
  )
}

export function ChapterSection({
  chapter,
  index,
}: {
  chapter: Chapter
  index: number
}) {
  const sideClass =
    chapter.align === 'left'
      ? 'sm:mr-auto sm:ml-[6vw]'
      : 'sm:ml-auto sm:mr-[6vw]'

  const sectionRef = useRef<HTMLElement>(null)
  const { reached, inChapter } = useChapterProgress(sectionRef)
  const reachedLink = latest(chapter.beats, reached, (b) => b.link)
  // While hidden, keep the last link (or the first one) mounted, so the button can fade in and out.
  const link =
    reachedLink ??
    latest(chapter.beats, reached, (b) => b.link ?? undefined) ??
    chapter.beats.find((b) => b.link)?.link ??
    null
  const image = latest(chapter.beats, reached, (b) => b.image?.file) ?? chapter.image

  return (
    <section
      ref={sectionRef}
      id={chapter.id}
      aria-labelledby={`${chapter.id}-title`}
      className="relative"
    >
      {/* The illustration stays pinned while the text scrolls over it. */}
      <div className="sticky top-0 h-svh overflow-hidden">
        <ChapterBackdrop
          chapter={chapter}
          current={image}
          priority={index === 0}
        />
        {/* Twinkling stars over the sky in the upper part of the picture. */}
        <Starfield glow className="bottom-auto h-[42%]" />
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0',
            chapter.align === 'left'
              ? 'bg-gradient-to-r from-background/55 via-transparent to-transparent'
              : 'bg-gradient-to-l from-background/55 via-transparent to-transparent',
          )}
        />
      </div>

      <PageLink link={link} shown={inChapter && !!reachedLink} />

      <div className="relative -mt-[100svh] px-4 sm:px-6">
        {/* Chapter title card */}
        <div className="flex min-h-svh items-center">
          <Reveal className={cn('w-full max-w-reading', sideClass)}>
            <p className="font-display text-sm uppercase tracking-[0.4em] text-primary">
              Chapter {chapter.number}
            </p>
            <h2
              id={`${chapter.id}-title`}
              className="mt-3 font-display text-5xl font-light leading-[1.05] text-balance sm:text-7xl"
            >
              {chapter.title}
            </h2>
          </Reveal>
        </div>

        {chapter.beats.map((beat, i) => (
          <div
            key={i}
            data-beat={i}
            className="flex min-h-[85svh] items-center py-12"
          >
            <BeatCard
              id={`${chapter.id}-${i}`}
              beat={beat}
              className={sideClass}
            />
          </div>
        ))}

        {chapter.fact && (
          <div className="flex min-h-[70svh] items-center pb-24">
            <Reveal
              className={cn(
                'w-full max-w-md rounded-2xl border border-accent/30 bg-secondary/80 p-6 backdrop-blur-md',
                sideClass,
              )}
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                <Sparkles className="size-4" aria-hidden="true" />
                {chapter.fact.label}
              </p>
              <p className="mt-3 text-base leading-relaxed text-foreground/85">
                {chapter.fact.text}
              </p>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  )
}
