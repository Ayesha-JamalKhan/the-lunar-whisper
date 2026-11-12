import { Pause, Sparkles, Volume2 } from 'lucide-react'

import { characters, type Beat, type Chapter, type Line } from '@/content/story'
import { cn } from '@/lib/utils'

import { Reveal, StoryImage } from './primitives'
import { hasDialogue, useAutoRead, useVoice } from './voice'

/** `speaking` is undefined when nothing in the card is being read aloud. */
function StoryLine({ line, speaking }: { line: Line; speaking?: boolean }) {
  const dim = speaking === false && 'opacity-55'

  if (line.kind === 'narration') {
    return (
      <p
        className={cn(
          'text-lg leading-relaxed text-foreground/85 transition-opacity duration-500 sm:text-xl',
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
      <blockquote
        className={cn(
          'font-display text-xl leading-snug sm:text-2xl',
          isAsh ? 'text-foreground' : 'italic text-foreground/95',
        )}
      >
        “{line.text}”
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
      <Reveal className="w-full rounded-2xl border border-border bg-background/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8">
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

  return (
    <section
      id={chapter.id}
      aria-labelledby={`${chapter.id}-title`}
      className="relative"
    >
      {/* The illustration stays pinned while the text scrolls over it. */}
      <div className="sticky top-0 h-svh overflow-hidden">
        <StoryImage
          file={chapter.image}
          alt={chapter.imageAlt}
          className="drift"
          priority={index === 0}
        />
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0',
            chapter.align === 'left'
              ? 'bg-gradient-to-r from-background/85 via-background/40 to-transparent'
              : 'bg-gradient-to-l from-background/85 via-background/40 to-transparent',
          )}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent"
        />
      </div>

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
          <div key={i} className="flex min-h-[85svh] items-center py-12">
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
