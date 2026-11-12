# Under the Cracked Ice

An illustrated, scroll-driven bedtime story about Europa, the icy moon of Jupiter. On a summer night, twelve-year-old Mira and her six-year-old brother Theo sit on their roof watching the stars. Mira tells him about Europa: the cracked ice shell, the vast ocean that may lie beneath it, and the small hope that something could be alive down there in the dark.

The story is told in six chapters. Each has a full-screen painted illustration that stays pinned while the narration and dialogue scroll over it. Every chapter ends with a short, accurate science note. The page closes with tips for finding Jupiter and its moons in the real night sky.

## Technologies

- [TanStack Start](https://tanstack.com/start) with React 19 and TypeScript
- Tailwind CSS 4, with the Fraunces and Literata fonts
- Netlify Image CDN to serve responsive WebP versions of the illustrations
- Illustrations generated once with a Gemini image model through Netlify AI Gateway and saved in `public/img`

## Running locally

```bash
npm install
netlify dev   # or: npm run dev
```

Image CDN URLs (`/.netlify/images?...`) need `netlify dev` to work locally.

## Editing the story

All text lives in `src/content/story.ts`: the chapters, the lines spoken by each character, the science notes, and the stargazing tips. Change the words there without touching any layout code.
