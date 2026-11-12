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

export type Line =
  | { kind: 'narration'; text: string }
  | { kind: 'speech'; speaker: Speaker; text: string; mood?: Mood }

export interface Beat {
  lines: Line[]
}

export interface Chapter {
  id: string
  number: string
  title: string
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
  /** Pause between sentences, in milliseconds. */
  pause: number
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
      pitch: 1.05,
      rate: 0.95,
      bounce: 0.1,
      pause: 280,
    },
  },
  shazz: {
    name: 'Shazz',
    description: 'six, her nephew, asks why',
    voice: {
      label: 'A high, bouncy, curious little boy’s voice',
      prefer: 'child',
      pitch: 1.75,
      rate: 1.12,
      bounce: 0.18,
      pause: 160,
    },
  },
}

const n = (text: string): Line => ({ kind: 'narration', text })
const ash = (text: string, mood?: Mood): Line => ({ kind: 'speech', speaker: 'ash', text, mood })
const shazz = (text: string, mood?: Mood): Line => ({
  kind: 'speech',
  speaker: 'shazz',
  text,
  mood,
})

export const chapters: Chapter[] = [
  {
    id: 'rooftop',
    number: 'I',
    title: 'The Rooftop',
    image: 'rooftop.png',
    imageAlt:
      'A young woman and her little nephew wrapped in a plaid blanket on a roof at night, the woman pointing at a bright light in a sky full of stars.',
    align: 'left',
    beats: [
      {
        lines: [
          n(
            'It was the kind of summer night when the air stays warm long after the sun goes down. Everyone in the house was asleep, except two.',
          ),
          n(
            'Ash pushed open the attic window, and Shazz climbed out after her with the big plaid blanket dragging behind him like a cape.',
          ),
        ],
      },
      {
        lines: [
          n(
            'They sat on the slope of the roof, shoulder to shoulder, and let their eyes get used to the dark. One by one, then all at once, the stars came out.',
          ),
          shazz('Ash. Which one is the brightest?', 'curious'),
        ],
      },
      {
        lines: [
          n('She lifted her arm and pointed, low above the trees.'),
          ash(
            "That one. See how it doesn't twinkle? That's not a star at all. That's a planet. That's Jupiter.",
            'excited',
          ),
        ],
      },
    ],
  },
  {
    id: 'jupiter',
    number: 'II',
    title: 'A Moon Named Europa',
    image: 'jupiter.png',
    imageAlt:
      'The giant striped planet Jupiter with a small pale icy moon, Europa, in front of it.',
    align: 'right',
    beats: [
      {
        lines: [
          shazz('Jupiter is the one with the rings, right?', 'curious'),
          ash(
            "That's Saturn. Lots of people mix them up. Jupiter is the giant one, the biggest planet of all. It has stripes made of clouds, and a storm bigger than the whole Earth.",
            'playful',
          ),
        ],
      },
      {
        lines: [
          ash(
            "A long, long time ago, more than four hundred years, a man named Galileo pointed one of the very first telescopes at it. And he saw four tiny dots next to it that moved every night.",
            'wonder',
          ),
          shazz('Dots?', 'curious'),
          ash('Moons. Jupiter has moons, just like we have ours. Lots of them.', 'playful'),
        ],
      },
      {
        lines: [
          ash(
            "One of them is called Europa. It's a little smaller than our Moon. And I think it might be the most interesting place in the whole solar system.",
            'wonder',
          ),
          shazz('Why?', 'curious'),
          ash('Because of what might be hiding under it.', 'whisper'),
        ],
      },
    ],
    fact: {
      label: 'A small correction, from Ash',
      text: 'Europa is often mistaken for a moon of Saturn, but it orbits Jupiter. Galileo Galilei discovered it in January 1610, along with Io, Ganymede, and Callisto.',
    },
  },
  {
    id: 'ice',
    number: 'III',
    title: 'A World of Cracked Ice',
    image: 'surface.png',
    imageAlt:
      'The frozen surface of Europa, white ice broken by long reddish-brown cracks, with Jupiter huge in the black sky.',
    align: 'left',
    beats: [
      {
        lines: [
          ash(
            "Imagine standing there. Everything is ice. Not like a frozen pond, like a whole world wrapped in it, kilometres and kilometres thick.",
            'wonder',
          ),
          ash(
            "It's so cold, colder than anywhere on Earth has ever been. And Jupiter hangs in the sky, so huge you could hold out both hands and not cover it.",
            'wonder',
          ),
        ],
      },
      {
        lines: [
          shazz('Is it smooth? Like an ice rink?', 'excited'),
          ash(
            "No, that's the strange part. The ice is cracked. All over. Long lines that crisscross the whole moon, some of them reddish-brown, like something from underneath leaked up and stained them.",
            'serious',
          ),
        ],
      },
      {
        lines: [
          shazz('What cracked it?', 'curious'),
          ash(
            "Jupiter did. Its gravity is so strong that it squeezes Europa and stretches it, again and again, every time it goes around. Squeeze, stretch. Squeeze, stretch. Like kneading dough.",
            'playful',
          ),
          n('Shazz squeezed his own hands together, frowning, trying to feel it.'),
        ],
      },
    ],
    fact: {
      label: 'What scientists know',
      text: "Europa's surface is one of the smoothest in the solar system, with very few craters, a sign that it is young and constantly renewed. Its reddish-brown streaks, called lineae, may be salts that rose up from below.",
    },
  },
  {
    id: 'ocean',
    number: 'IV',
    title: 'The Ocean Underneath',
    image: 'ocean.png',
    imageAlt:
      'A dark ocean beneath a thick ceiling of cracked blue ice, with glowing warm vents far below on the seafloor.',
    align: 'right',
    beats: [
      {
        lines: [
          ash(
            "And all that squeezing makes heat. Like when you rub your hands together really fast. Enough heat that, deep under the ice, it isn't frozen anymore.",
            'gentle',
          ),
          shazz('Then what is it?', 'curious'),
          ash('Water. An ocean. A whole ocean, hiding in the dark.', 'whisper'),
        ],
      },
      {
        lines: [
          n('Shazz was quiet for a long moment. Somewhere down the street, a dog barked once and stopped.'),
          shazz('Bigger than our ocean?', 'excited'),
          ash(
            "Scientists think it might hold twice as much water as all of Earth's oceans put together. On a moon smaller than ours.",
            'wonder',
          ),
        ],
      },
      {
        lines: [
          ash(
            "And at the very bottom, there might be places where warm water bubbles up out of the rock, full of minerals. We have places like that on Earth too, at the bottom of the sea.",
            'gentle',
          ),
          shazz('How do we know it’s there if it’s under all that ice?', 'curious'),
          ash(
            "Clues. The way Europa makes Jupiter's magnetism wobble. The way the ice moves. And sometimes, maybe, it sprays water up through the cracks into space, like a geyser.",
            'gentle',
          ),
        ],
      },
    ],
    fact: {
      label: 'What scientists know',
      text: "Measurements from NASA's Galileo spacecraft strongly suggest a salty liquid-water ocean beneath an ice shell estimated to be roughly 15 to 25 kilometres thick. Hubble has spotted signs of possible water plumes.",
    },
  },
  {
    id: 'hope',
    number: 'V',
    title: 'A Little Hope',
    image: 'life.png',
    imageAlt:
      'Faint glowing specks and translucent ribbon-like shapes drifting near a warm vent in a dark alien ocean.',
    align: 'left',
    beats: [
      {
        lines: [
          shazz('Ash… are there fish?', 'whisper'),
          n('She smiled, but she didn’t laugh. It was a good question. It was the question.'),
        ],
      },
      {
        lines: [
          ash(
            "Nobody knows. But here's what we do know. Everywhere on Earth we find water, we find life. Even in the deepest, darkest parts of the ocean, where sunlight never reaches, there are creatures living around those warm vents.",
            'gentle',
          ),
          ash('Life needs water. It needs a bit of energy. It needs the right ingredients. Europa might have all three.', 'serious'),
        ],
      },
      {
        lines: [
          ash(
            "So maybe there's nothing down there. Just dark water. Or maybe there's something tiny. Something glowing. Something that's never seen the sky, floating under all that ice, not knowing we're out here wondering about it.",
            'whisper',
          ),
          shazz('That’s a little bit sad.', 'sad'),
          ash('Or a little bit hopeful. It depends how you look at it.', 'gentle'),
        ],
      },
    ],
    fact: {
      label: 'What scientists know',
      text: 'No life has been found on Europa. But water, chemical energy, and the right elements are the three ingredients life needs, and Europa may have them all, which is why it is one of the best places to search beyond Earth.',
    },
  },
  {
    id: 'ending',
    number: 'VI',
    title: 'Someone Is Going to Look',
    image: 'ending.png',
    imageAlt:
      'A little boy asleep on his young aunt’s shoulder under a blanket on the roof, while she watches a shooting star.',
    align: 'right',
    beats: [
      {
        lines: [
          ash(
            "Want to know a secret? Right now, there's a spaceship on its way there. It's called Europa Clipper. It left Earth in 2024, and it's flying all the way out to Jupiter.",
            'whisper',
          ),
          shazz('To find the fish?', 'excited'),
          ash(
            "To find out if Europa could have life. It'll fly past dozens of times, look through the ice, taste what comes out of the cracks.",
            'wonder',
          ),
        ],
      },
      {
        lines: [
          shazz('When does it get there?', 'sleepy'),
          ash("2030. You'll be ten.", 'playful'),
          shazz('Will you tell me what it finds?', 'sleepy'),
          ash('I promise.', 'gentle'),
        ],
      },
      {
        lines: [
          n(
            "Shazz's head grew heavy against her shoulder. His breathing slowed. Above them a shooting star scratched a thin silver line across the sky, and was gone.",
          ),
          n(
            'Ash stayed a while longer, watching that one bright point of light that didn’t twinkle, thinking about a dark ocean very far away, and whatever might be in it, waiting.',
          ),
        ],
      },
    ],
    fact: {
      label: 'What scientists know',
      text: "NASA's Europa Clipper launched in October 2024 and is due to reach Jupiter in 2030, where it will make about 49 close flybys of Europa. ESA's JUICE mission, launched in 2023, will also visit.",
    },
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
