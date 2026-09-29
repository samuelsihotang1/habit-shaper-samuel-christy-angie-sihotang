# Brand

How Habit Shaper looks and sounds outside a single screen: the logo, the
palette as a brand, the type, the voice, and the files to use. How the app's
screens and components are built is `docs/design/README.md`; the tokens
themselves live in `frontend/src/index.css`. If this file and those disagree,
the code wins.

`guidelines.html` is this file drawn out, reading the assets beside it; open it
from this folder in a browser. `voice.md` is the copy bank.

---

## The brand in one line

A small, calm tool for building good habits and breaking bad ones. It shows the
one number that matters today and asks for one tap.

| Line | Use |
|---|---|
| **Build the good ones. Break the rest.** | the headline: sign-in hero, share image, anywhere with room for one sentence |
| **Track habits. Stay consistent.** | the tagline: above the headline, or alone where space is short |

Always "Habit Shaper", two words, both capitalised. Not "HabitShaper",
"Habit-Shaper" or "HS".

## Logo

The mark is a white glyph on a yellow tile, drawn on a 64-unit grid with a
16-unit corner radius. The glyph is an H in two leaning strokes, each with an
arm reaching out along one crossbar line, turned half a circle onto each
other; its tips are sharp for speed, the one place the brand is not round. `LogoMark` in `frontend/src/components/Shells.tsx` and
`frontend/public/favicon.svg` draw the same paths; change all three together
(`logo/*.svg` are generated from the same numbers).

| File | Use on |
|---|---|
| `logo/mark.svg` | white, canvas, any light photo-free surface |
| `logo/mark-on-night.svg` | the mark with its own night backdrop, for dark previews |
| `logo/mark-mono-black.svg` | one-colour print, stamps; glyph is cut out |
| `logo/mark-mono-white.svg` | one colour on a dark or busy background |
| `logo/horizontal.svg` | the lockup on white: ink wordmark |
| `logo/horizontal-on-night.svg` | the lockup on night: white "Habit", yellow "Shaper" |

**Wordmark.** Urbanist, "Habit" 600 and "Shaper" 800, one normal word space.
On white it is ink throughout; the yellow tile carries the colour. Yellow
"Shaper" is for night backgrounds only (see Colour). The wordmark in the SVGs
is outlined, so it renders without the font installed.

**Lockup.** Wordmark cap height is centred on the mark; the gap between mark
and wordmark is a quarter of the mark (16 on the 64 grid).

**Clear space** is a quarter of the mark's width on every side. **Minimum
size** is 24px for the mark, 120px wide for the horizontal lockup: below that
the glyph's inner gap closes up.

**Don't:** recolour the tile outside the palette, add a shadow, outline or
gradient, rotate or stretch it, set the wordmark in another face, put yellow
"Shaper" on white, or place the yellow mark on yellow.

## Colour

Tokens and hex values are in `frontend/src/index.css` and tabled in
`docs/design/README.md`. As a brand, the palette is used in these proportions:

| Share | Colours | Role |
|---|---|---|
| ~60% | `canvas`, `surface` | the ground: calm, mostly white |
| ~30% | `night`, `ink` | the weight: hero cards, the tab bar, text |
| ~10% | `brand` yellow | the one action, the active state, progress |

`danger`, `success` and the seven `accent-*` hues are functional. They never
appear in the logo, a headline or a marketing layout.

### Contrast

WCAG 2 ratios, computed from the token values. Body text needs 4.5:1; large
text (24px, or 18.5px bold) and non-text marks need 3:1.

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `ink` | `surface` | 19.4 | any text |
| `ink` | `canvas` | 18.0 | any text |
| `ink` | `brand-soft` | 17.9 | any text |
| `ink` | `brand` | 11.4 | any text: the label on a yellow button |
| `brand` | `night` | 11.4 | any text: the only place yellow is text |
| white | `night` | 19.4 | any text |
| `#B4B4B9` | `night` | 9.4 | secondary text on night (share image) |
| `ink-muted` | `surface` | 5.3 | secondary text |
| `ink-muted` | `canvas` | 4.9 | secondary text |
| `danger` | `surface` | 5.6 | any text: field errors |
| `danger` | `danger-soft` | 4.6 | any text: the danger Alert |
| white | `danger` | 5.6 | any text: the danger button |
| `success` | `surface` | 5.7 | any text |
| `success` | `success-soft` | 5.0 | any text: the On and Reached badges |
| `line-strong` | `surface` | 3.3 | a field's border |
| white | `accent-*` | 3.4–4.0 | habit icon glyphs and streak icons, never text |
| `brand-strong` | `surface` | 2.1 | never text |
| `brand` | `surface` | 1.7 | never text; a fill or a mark only |
| white | `brand` | 1.7 | the logo glyph only, which is why the mark has a minimum size |

## Typography

**Urbanist** (Google Fonts, SIL Open Font License), weights 400–800. The
fallback stack is in `index.css`.

| Role | Size / line height | Weight |
|---|---|---|
| Display (share image, marketing) | 64–80px / 1.1 | 800 |
| Heading (`text-heading`) | 32px / 1.2 | 700 |
| Title (`text-title`) | 24px / 1.3 | 700 |
| Body (`text-base`) | 16px / 1.5 | 400–500 |
| Label, button | 14–16px | 600 |
| Secondary (`text-sm`) | 14px | 400–500 |

Sentence case everywhere, headings included. No all-caps runs of more than two
words; numbers that line up use tabular figures.

## Shape and icons

- **Round, not sharp.** Actions and single-line inputs are full pills; cards
  24px; tiles and multi-line fields 16px. No square corners on anything a
  person touches.
- **Icons** are 24px line icons with a round cap and join (`icons.tsx`). A
  habit's icon sits on its accent circle (`HabitBubble`), white, or ink on
  yellow; the streak flame and leaf are the only other accent uses.
- **Progress** is drawn, not decorated: a yellow ring on night, a yellow bar on
  cream, yellow day tiles. Those three are the brand's only illustration.

## Imagery

Flat colour and the product's own UI. No stock photography, no gradients, no
3D, no emoji as decoration. A marketing visual shows a real screen or a real
number (a streak, a week's completion), like `social/og-image.svg`.

## Voice

Second person, sentence case, short, calm. Say what happened and what to do
next. No exclamation marks, no guilt about a missed day. Examples and the
do/don't pairs are in `voice.md`.

## Files

| Path | What |
|---|---|
| `logo/` | the mark and the lockups, SVG |
| `social/og-image.svg`, `.png` | 1200×630 link preview; the PNG is also `frontend/public/og-image.png` |
| `app-icon/icon-180.png` | Apple touch icon, full-bleed (iOS rounds it); also `frontend/public/apple-touch-icon.png` |
| `app-icon/icon-192.png`, `icon-512.png` | rounded icons for a future web manifest |
| `app-icon/icon-512-maskable.png` | full-bleed, glyph inside the 80% safe zone |

`frontend/index.html` points `og:image` at the relative `/og-image.png`, so a
fresh clone works on any host. Facebook's crawler requires an absolute URL and
shows no image until the deployment's own origin is written there.
