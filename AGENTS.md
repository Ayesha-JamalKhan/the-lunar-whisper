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

- **Content and layout are separate.** Edit the story only in `src/content/story.ts`. A chapter is a list of *beats*. Each beat becomes one text card (one paragraph per card, so the reader scrolls for each line), and each line is either `narration` or `speech` by `ash` or `shazz`. Ash (in her twenties) is the aunt of Shazz (a six-year-old boy). The story is set on a rooftop in a mountain town in Pakistan. Lines take an optional `mood` (`excited`, `whisper`, `amazed`, `sleepy`, …) that shapes how the line is read aloud; it can also be a list with one mood per sentence (or per verse line), which is how lines change expression partway through. Speech lines take an optional `lead` (words outside the quotes, such as "Ash smiled:"), which is shown but not spoken. Narration with `verse: true` is a poem, with lines separated by `\n` (the `verse()` helper is kept, though no poem is currently in the story). Speech lines can take a `heading` (a numbered point's title, spoken first without its number), and narration built with `list(heading, items, mood, numbered)` renders as a titled bullet (or numbered) list that the narrator reads item by item. `spokenText()` in `voice.tsx` builds what is read aloud and drops emoji.
- **Links:** a beat's `link` is not shown in the card. Once the reader scrolls to that card, the animated click-button GIF appears fixed in the top-left corner of the page and stays until the chapter ends (`useChapterProgress` in `chapter-section.tsx`). Only one link shows at a time: a later card's link replaces the earlier one in the same spot, and `link: null` removes the button from that card on. It opens in a new tab. Every link in the story uses this.
- **Background changes:** a beat's optional `image` (`{ file, alt }`, path inside `/public`) fades in behind the text when the reader reaches that card and stays until a later card changes it. A picture that fails to load is skipped and the previous one stays. Chapter 1 uses `/chapter1/aliens.jpg`, `/chapter1/organisms.jpeg` and `/chapter2/image-2.jpeg`. Chapter 2 ("The Ear That Listens") keeps `/chapter2/image-2.jpeg` throughout. Chapter 3 ("NASA's Flood Watch") starts on `/chapter3/image-3.jpeg` and switches to `/chapter3/raining.jpg` at the "If we get a warning 3 days early" card, which stays through "How Floods Can Be Prevented" (that card has no link). Chapter 4 ("Water Is Life") starts on `/chapter4/image-4.jpg` and switches to `/chapter4/ending.jpg` at the "5 Promises" list.
- **Image files:** every picture the story references is in `public/`, including the cover `/title.png` (1672×941).
- **Full-screen images:** every illustration, including the cover, is stretched (`object-fill`) to fill the whole screen with no empty space, at the user's request. Only a light side tint behind the text cards remains. A glowing `Starfield` over the upper (sky) part of every picture, including the cover, keeps stars twinkling.
- **Title page:** the cover `/title.png` (the title is in the artwork) and a "Story Begins" button near the bottom that scrolls to Chapter 1. The link-preview image (`og:image` in `__root.tsx`) is also `/title.png`. Bright four-pointed `TwinklingStars` (`.sparkle` in `styles.css`) twinkle over its sky. A small white round badge in the top-right corner shows `/github-logo.png` and links to the GitHub repository in a new tab. Chapter transitions stay as they are: each pinned picture scrolls off and the next one rises in (the user turned down a scroll-linked cross-fade). The floating controls (voice toggle, chapter dots, progress bar) are hidden while it is on screen. Don't add other text to it.
- **Voices:** `src/components/story/voice.tsx` reads cards aloud using browser speech synthesis (AI Gateway has no text-to-speech). Narration is read by a calm male narrator (`narrator` in `story.ts`), Ash by a female voice and Shazz by a child-like voice. `shapeLine()` splits each line into phrases (and verse into lines) and varies pitch, rate and volume by mood and punctuation. Every full stop, comma, exclamation or question mark (and verse line) gets the same short pause, kept very short (`PUNCTUATION_PAUSE`, 150 ms on top of the engine's own gap); the user wants it brief, so don't make pauses longer.
- **Images always go through the Netlify Image CDN.** Use `imageUrl(path, width)`, where `path` is a path inside `/public` such as `/chapter1/image-1.jpeg` (a bare name means `/img/<name>`). Never link the image files directly. The click GIF is the exception, because the CDN would drop its animation.
- **Scrollytelling pattern:** each section has a `sticky top-0 h-svh` image, followed by a `-mt-[100svh]` text column, so the text scrolls over the pinned image.
- **SSR safety:** the starfield uses a seeded PRNG, so server and client markup match. Browser APIs are only touched inside `useEffect`.
- **Motion:** every animation has a `prefers-reduced-motion` fallback in `styles.css`. Exception requested by the user: stars keep twinkling under reduced motion, but only as an opacity fade (no scaling or rotation).
- The theme is dark only (no `.dark` variant block). Fonts are `font-display` (Fraunces) for headings and the body font (Literata).
- Science facts in the story are kept accurate as of 2026. Examples: Europa Clipper launched in October 2024 and arrives in 2030; JUICE launched in 2023. Keep facts hedged where the science is uncertain, such as ice thickness and whether life exists.

## Regenerating illustrations

The images were generated once with `gemini-3.1-flash-image` through Netlify AI Gateway (`@google/genai`, using `NETLIFY_AI_GATEWAY_KEY` and `NETLIFY_AI_GATEWAY_URL`), with a shared "painterly storybook, gouache, indigo/amber/teal" style suffix. To keep the series consistent, reuse that style when adding scenes. There is no runtime image generation.

## Commands

`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`. `src/routeTree.gen.ts` is generated; don't edit it.
