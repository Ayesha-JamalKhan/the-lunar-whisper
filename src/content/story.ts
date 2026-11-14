// All story text and illustrations live here, so the words can be edited
// without touching layout code.

export type Speaker = 'ash' | 'shazz'

/** How a line is said aloud. It shapes the pitch, pace and loudness of the voice. */
export type Mood =
  | 'excited'
  | 'curious'
  | 'wonder'
  | 'gentle'
  | 'whisper'
  | 'playful'
  | 'sad'
  | 'sleepy'
  | 'serious'
  | 'amazed'

export type Line =
  | {
      kind: 'narration'
      text: string
      /** One mood for the line, or one per sentence. */
      mood?: Mood | Mood[]
      /** Poetry: kept on separate lines, and each line is read with a pause. */
      verse?: boolean
      /** A titled list, such as safety tips. Read aloud after the heading, one item at a time. */
      heading?: string
      items?: string[]
      /** Show the list numbered (1, 2, 3…). The numbers are never read aloud. */
      numbered?: boolean
    }
  | {
      kind: 'speech'
      speaker: Speaker
      text: string
      /** One mood for the line, or one per sentence. */
      mood?: Mood | Mood[]
      /** Words outside the quote, like "Ash smiled:". Shown, but not read aloud. */
      lead?: string
      /** A numbered point's title, like "1. NASA watches our glaciers melting:". Read aloud before the text. */
      heading?: string
    }

export interface Beat {
  lines: Line[]
  /**
   * A new background picture (path inside /public) that fades in when the
   * reader reaches this card, and stays until a later card changes it.
   */
  image?: { file: string; alt: string }
  /**
   * A "learn more" link. Once this card is reached, an animated click button
   * appears in the top-left corner of the page and stays until the chapter
   * ends or a later card replaces it. `null` removes the button from this card on.
   */
  link?: { href: string; label: string } | null
}

export interface Chapter {
  id: string
  number: string
  title: string
  /** Path of the illustration inside /public, e.g. `/chapter1/image-1.jpeg`. */
  image: string
  imageAlt: string
  /** Where the text panels sit over the image. */
  align: 'left' | 'right'
  beats: Beat[]
  /** A short, accurate science note shown at the end of the chapter. */
  fact?: { label: string; text: string }
}

/**
 * How a voice is read aloud by the browser's speech synthesis.
 * `prefer` is the kind of system voice to pick when one is available.
 */
export interface VoiceProfile {
  /** Shown to readers next to the character. */
  label: string
  prefer: 'female' | 'male' | 'child'
  pitch: number
  rate: number
  /** How far the pitch rises and falls between phrases, so it never sounds flat. */
  bounce: number
}

export interface Character {
  name: string
  description: string
  voice: VoiceProfile
}

export const characters: Record<Speaker, Character> = {
  ash: {
    name: 'Ash',
    description: 'in her twenties, Shazz’s aunt, knows the names of things',
    voice: {
      label: 'A warm, lively young woman’s voice',
      prefer: 'female',
      pitch: 1.06,
      rate: 1.08,
      bounce: 0.14,
    },
  },
  shazz: {
    name: 'Shazz',
    description: 'six, her nephew, asks why',
    voice: {
      label: 'A high, bouncy, curious little boy’s voice',
      prefer: 'child',
      pitch: 1.75,
      rate: 1.22,
      bounce: 0.22,
    },
  },
}

/** The storyteller, who reads the narration in a calm man's voice. */
export const narrator: Character = {
  name: 'Narrator',
  description: 'tells the story',
  voice: {
    label: 'A calm, warm man’s storytelling voice',
    prefer: 'male',
    pitch: 0.9,
    rate: 1.04,
    bounce: 0.1,
  },
}

const n = (text: string, mood?: Mood | Mood[]): Line => ({ kind: 'narration', text, mood })
const verse = (text: string, mood?: Mood | Mood[]): Line => ({
  kind: 'narration',
  text,
  mood,
  verse: true,
})
const ash = (
  text: string,
  mood?: Mood | Mood[],
  lead?: string,
  heading?: string,
): Line => ({
  kind: 'speech',
  speaker: 'ash',
  text,
  mood,
  lead,
  heading,
})
const list = (
  heading: string,
  items: string[],
  mood?: Mood | Mood[],
  numbered = false,
): Line => ({
  kind: 'narration',
  text: '',
  heading,
  items,
  mood,
  numbered,
})
const shazz = (text: string, mood?: Mood | Mood[], lead?: string): Line => ({
  kind: 'speech',
  speaker: 'shazz',
  text,
  mood,
  lead,
})

export const chapters: Chapter[] = [
  {
    id: 'the-question',
    number: '1',
    title: 'The Question',
    image: '/chapter1/image-1.jpeg',
    imageAlt:
      'A young woman in a hijab and her little nephew in a knitted hat sit on a stone rooftop at night beside a glowing lantern. She points up at a bright Jupiter, while a river winds through the mountains below.',
    align: 'right',
    beats: [
      {
        lines: [
          n(
            'In a remote town in the mountains of Pakistan, there is a boy, Shazz, who every night sits on the rooftop with his Aunt, Ash. Below them, a majestic river glows in the moonlight. Above them, the stars are so close, loud and bright!',
            ['gentle', 'wonder', 'excited'],
          ),
        ],
      },
      {
        lines: [shazz('Ash... is there anyone else out there? Up in sky?', ['whisper', 'curious'])],
      },
      {
        lines: [
          ash(
            'Look, that is Jupiter! And around Jupiter, there is its moon, Europa.',
            ['excited', 'wonder'],
            'Ash pointed across the mountains,',
          ),
        ],
      },
      {
        lines: [shazz('What is inside it, Ash?', 'curious')],
      },
      {
        lines: [
          ash(
            'Europa has water. Not a little water, but more water than all the oceans on Earth! Hidden under ice. An ocean so deep, so dark, and so secret.',
            ['wonder', 'excited', 'whisper', 'whisper'],
            'Ash smiled:',
          ),
        ],
        link: {
          href: 'https://science.nasa.gov/mission/europa-clipper/',
          label: 'Learn about NASA’s Europa Clipper mission (opens in a new tab)',
        },
      },
      {
        lines: [
          shazz(
            "So life doesn't need the Sun? It just needs water?",
            ['amazed', 'curious'],
            'Shazz asked:',
          ),
        ],
      },
      {
        lines: [
          ash(
            "Exactly! And this is why Europa's story is so close to us. If life can live in the dark under ice, then life is stronger than we thought, and water is more precious than we imagine.",
            ['excited', 'gentle', 'serious'],
            'Ash said:',
          ),
        ],
      },
      {
        lines: [
          verse(
            'No sun, no sky, no day, no night\nYet life can grow without the light\nIn warm dark water, deep below\nIs where Europa’s secrets glow',
            ['serious', 'gentle', 'wonder', 'whisper'],
          ),
        ],
      },
      {
        image: {
          file: '/chapter1/aliens.jpg',
          alt: 'Shazz imagines what life on Europa could look like: fish and aliens.',
        },
        lines: [
          shazz(
            'So... Europa could have life? Real life? Like fish? Like... aliens?',
            ['amazed', 'excited', 'curious', 'playful', 'excited'],
            'His eyes go wide.',
          ),
        ],
      },
      {
        image: {
          file: '/chapter1/organisms.jpeg',
          alt: 'Tiny microscopic organisms drifting in dark water under the ice.',
        },
        lines: [
          ash(
            'Maybe not fish. Maybe tiny, tiny life, microbes so small you cannot see them. But alive! Breathing, eating, growing in water, in the dark, under ice. And we have an ear that can finally listen to its whispering.',
            ['playful', 'gentle', 'excited', 'wonder', 'whisper'],
          ),
        ],
      },
      {
        lines: [shazz('What is our Ear in space, Ash?', 'amazed')],
      },
      {
        image: {
          file: '/chapter2/image-2.jpeg',
          alt: 'Ash and Shazz on the rooftop gaze up at the golden James Webb Space Telescope, beside a cracked, icy Europa with a plume of water bursting from it.',
        },
        lines: [
          ash(
            'His name is Webb. The James Webb Space Telescope. It does not see like you. It sees heat. It sees water. It listens for the chemicals of life.',
            ['playful', 'excited', 'gentle', 'serious', 'serious', 'wonder'],
          ),
        ],
      },
      {
        lines: [n('The boy looks at the river. He looks up at the sky.', ['gentle', 'wonder'])],
      },
    ],
  },
  {
    id: 'the-ear-that-listens',
    number: '2',
    title: 'The Ear That Listens',
    image: '/chapter2/image-2.jpeg',
    imageAlt:
      'Ash and Shazz on the rooftop gaze up at the golden James Webb Space Telescope, beside a cracked, icy Europa with a plume of water bursting from it.',
    align: 'right',
    beats: [
      {
        lines: [
          n(
            'The James Webb Space Telescope launched on December 25, 2021. It lives 1.5 million kilometers away, at a place called L2, where the gravity of the Sun and Earth balance.',
            ['serious', 'wonder'],
          ),
        ],
        link: {
          href: 'https://science.nasa.gov/mission/webb/',
          label: 'Learn about NASA’s James Webb Space Telescope (opens in a new tab)',
        },
      },
      {
        lines: [
          n(
            'Webb can see where water is hiding. Webb looked for a cryovolcanic plume, a 200 km-high fountain of water vapor.',
            ['wonder', 'excited'],
          ),
        ],
        link: {
          href: 'https://science.nasa.gov/missions/webb/nasas-webb-finds-carbon-source-on-surface-of-jupiters-moon-europa/',
          label: 'Read how Webb found a carbon source on the surface of Europa (opens in a new tab)',
        },
      },
      {
        lines: [shazz('Ash, is Webb listening to us too?', ['curious'])],
      },
      {
        lines: [
          ash(
            'Webb listens to space. But the same way it sees heat and water from far away is how NASA watches Earth. To watch our glaciers. To watch our rivers.',
            ['playful', 'gentle', 'wonder', 'serious'],
          ),
        ],
      },
      {
        lines: [
          n('NASA uses the SWOT and Landsat satellites for rivers and floods.', 'serious'),
        ],
        link: {
          href: 'https://swot.jpl.nasa.gov/',
          label: 'Learn about the SWOT satellite, which measures Earth’s rivers and floods (opens in a new tab)',
        },
      },
      {
        lines: [shazz('Ash, did it watch the flood last year?', ['curious', 'sad'])],
      },
      {
        lines: [n('Ash was silent.', 'sad')],
      },
      {
        lines: [n('Was that flood water ‘Life’ too?', 'whisper')],
      },
    ],
  },
  {
    id: 'nasas-flood-watch',
    number: '3',
    title: 'NASA’s Flood Watch',
    image: '/chapter3/image-3.jpeg',
    imageAlt:
      'Ash and Shazz on the rooftop look up at NASA satellites shining beams down through monsoon clouds onto snowy mountains, glaciers, a winding river and a village below.',
    align: 'right',
    beats: [
      {
        lines: [shazz('Ash, was that flood water also life?', ['curious', 'sad'])],
      },
      {
        lines: [
          ash(
            "Water is life when we respect it. Water becomes danger when we don't understand it. And that is why NASA data matters.",
            ['gentle', 'serious', 'serious'],
          ),
        ],
      },
      {
        lines: [
          ash(
            'Our glaciers are like Europa’s ice shell. They are melting because Earth is getting warmer. NASA satellites use infrared, the same kind of heat-seeing that Webb uses, to measure how fast the ice is melting, and how much water will come down.',
            ['gentle', 'serious', 'wonder', 'serious'],
            'She explains, slowly',
            '1. NASA watches our glaciers melting:',
          ),
        ],
        link: {
          href: 'https://science.nasa.gov/earth/explore/earth-indicators/ice-sheets/',
          label: 'See how NASA measures Earth’s melting ice (opens in a new tab)',
        },
      },
      {
        lines: [
          ash(
            'NASA’s rain satellites measure monsoon clouds over Pakistan days before they arrive. They can tell if a village will get too much rain or a river will rise.',
            ['wonder', 'serious'],
            undefined,
            '2. NASA watches the rain as it falls:',
          ),
        ],
        link: {
          href: 'https://gpm.nasa.gov/',
          label: 'Learn about NASA’s Global Precipitation Measurement rain satellites (opens in a new tab)',
        },
      },
      {
        lines: [
          ash(
            'NASA’s SWOT and Landsat satellites measure river height and soil wetness. If a river is rising too fast, they can send an ‘early warning’ ⚠️.',
            ['serious', 'excited'],
            undefined,
            '3. NASA watches the rivers rising:',
          ),
        ],
        link: {
          href: 'https://science.nasa.gov/mission/landsat/',
          label: 'Learn about NASA’s Landsat satellites (opens in a new tab)',
        },
      },
      {
        image: {
          file: '/chapter3/image_cad65303.jpg',
          alt: 'A village prepared for the monsoon, safe from the river.',
        },
        lines: [
          ash(
            'If we get a warning 3 days early, we can move people. We can save animals. We can save homes. We can prevent a disaster!',
            ['serious', 'gentle', 'gentle', 'excited'],
          ),
        ],
      },
      {
        image: {
          file: '/chapter3/raining.jpg',
          alt: 'Monsoon rain falling over the mountain town and its river.',
        },
        // No link on the flood-prevention tips.
        link: null,
        lines: [
          list(
            'How Floods Can Be Prevented',
            [
              'Don’t build houses right on the river bank.',
              'Keep drains clean, don’t throw plastic in them.',
              'Plant trees, their roots hold the soil and drink extra water.',
              'Listen to early warnings and tell your neighbours.',
              'Save water in dry days so we are ready for wet days.',
            ],
            ['serious', 'gentle'],
          ),
        ],
      },
    ],
  },
  {
    id: 'water-is-life',
    number: '4',
    title: 'Water Is Life',
    image: '/chapter4/image-4.jpg',
    imageAlt: 'Ash and Shazz on their rooftop at night, beside the glowing river.',
    align: 'right',
    beats: [
      {
        lines: [
          ash(
            'When Webb looks at Europa, it is not just looking for aliens. It is reminding us: If you want to find life, find water. If you want to keep life, save water.',
            ['gentle', 'wonder', 'serious', 'serious'],
          ),
        ],
      },
      {
        lines: [
          shazz(
            'When I grow up, I want to build a probe that goes to Europa! I want to taste its ocean! But first, I will save the ocean we already have. I will help Pakistan hear the flood warning in time.',
            ['excited', 'excited', 'serious', 'serious'],
            'The boy turns to his Aunt and says:',
          ),
        ],
      },
      {
        image: {
          file: '/chapter4/ending.jpg',
          alt: 'Shazz keeping his promises to save water, for the generations to come.',
        },
        lines: [
          list(
            'That night he made 5 Promises For Future Generations:',
            [
              'Turn off the tap while brushing.',
              'Use a bucket.',
              'Fix leaking taps at home and school.',
              'Collect rainwater for plants.',
              'Tell his friends: One drop saved today is one life saved tomorrow.',
            ],
            ['gentle', 'serious'],
            true,
          ),
        ],
      },
      {
        lines: [
          n(
            "He did not go to space that night. Space came to him in a drop of water, in a form of learning that the drop will be there for his children and his children's children too!",
            ['gentle', 'wonder', 'excited'],
          ),
        ],
      },
    ],
  },
]

export const lookUpTips = [
  {
    title: 'Find the light that doesn’t twinkle',
    text: 'Planets shine with a steady glow, while stars flicker. Jupiter is usually the brightest steady point in the night sky after the Moon and Venus.',
  },
  {
    title: 'Bring binoculars',
    text: 'Even ordinary binoculars held very still can show up to four tiny dots lined up beside Jupiter. Those are the same moons Galileo saw, and one of them is Europa.',
  },
  {
    title: 'Look again tomorrow',
    text: 'The moons change places every night as they orbit. Europa goes all the way around Jupiter in about three and a half days.',
  },
]
