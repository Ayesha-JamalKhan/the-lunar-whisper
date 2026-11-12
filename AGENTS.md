# AGENTS.md

## Project overview

"The Lunar Whisper" is a single-page, scroll-driven illustrated story about Europa (a moon of **Jupiter**, not Saturn; the story addresses this mix-up directly). It is built on TanStack Start and deployed on Netlify. It has no backend, database, or forms.

## Key directories

```
public/img/                       # Six AI-generated 16:9 illustrations (PNG originals)
src/content/story.ts              # ALL story content: characters, chapters, beats, lines, facts, tips
src/components/story/primitives.tsx
                                  # imageUrl()/StoryImage (Image CDN), Reveal (scroll fade-in),
                                  # Starfield (seeded, SSR-safe), ScrollProgress, useActiveSection
src/components/story/chapter-section.tsx
                                  # One chapter: sticky illustration + text cards scrolling over it
src/routes/index.tsx              # Hero, chapter dot-nav, chapters, epilogue/"Look up tonight"
src/routes/__root.tsx             # <head>: title, description, og:image, Google Fonts
src/styles.css                    # Dark night-sky theme variables, --ash/--shazz voice colours,
                                  # .reveal / .drift / .star animations
src/components/ui/                # shadcn/ui components from the starter (only Button is used)
```

## Conventions and decisions

- **Content and layout are separate.** Edit the story only in `src/content/story.ts`. A chapter is a list of *beats*. Each beat becomes one text card, and each line is either `narration` or `speech` by `ash` or `shazz`. Ash (in her twenties) is the aunt of Shazz (six). Speech lines take an optional `mood` (`excited`, `whisper`, `sleepy`, …) that shapes how the line is read aloud.
- **Voices:** `src/components/story/voice.tsx` reads only dialogue aloud using browser speech synthesis (AI Gateway has no text-to-speech). Narration stays silent. `shapeLine()` splits each line into phrases and varies pitch, rate, volume and pauses by mood and punctuation.
- **Images always go through the Netlify Image CDN.** Use `imageUrl(file, width)`, which builds `/.netlify/images?url=/img/<file>&w=<w>&fm=webp`. Never link the PNGs directly; they are about 2 MB each.
- **Scrollytelling pattern:** each section has a `sticky top-0 h-svh` image, followed by a `-mt-[100svh]` text column, so the text scrolls over the pinned image.
- **SSR safety:** the starfield uses a seeded PRNG, so server and client markup match. Browser APIs are only touched inside `useEffect`.
- **Motion:** every animation has a `prefers-reduced-motion` fallback in `styles.css`.
- The theme is dark only (no `.dark` variant block). Fonts are `font-display` (Fraunces) for headings and the body font (Literata).
- Science facts in the story are kept accurate as of 2026. Examples: Europa Clipper launched in October 2024 and arrives in 2030; JUICE launched in 2023. Keep facts hedged where the science is uncertain, such as ice thickness and whether life exists.

## Regenerating illustrations

The images were generated once with `gemini-3.1-flash-image` through Netlify AI Gateway (`@google/genai`, using `NETLIFY_AI_GATEWAY_KEY` and `NETLIFY_AI_GATEWAY_URL`), with a shared "painterly storybook, gouache, indigo/amber/teal" style suffix. To keep the series consistent, reuse that style when adding scenes. There is no runtime image generation.

## Commands

`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`. `src/routeTree.gen.ts` is generated; don't edit it.
