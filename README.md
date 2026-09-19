# riso-graphic

A sample sheet that imitates risograph printing on screen. Two or three spot inks share one
sheet. Each drum is screened at its own angle, the plates slip a little out of register, and no
area quite covers the paper.

The sheet is square, 1080 × 1080. Every plate draws in those coordinates, and when the paper
hangs smaller, the scale shrinks the drawing without the plate knowing. A vertical position
pinned in pixels would break every plate the moment the format changed, so plates place things
by fractions of `height` wherever they can.

Motion is the default. The page starts playing as soon as it opens.

The hung plates are **RIPPLE** · **MOON** · **GARDEN** · **JELLY** · **CELL** · **CHLORO** ·
**COSMOS** · **FLAKE** · **KALEIDO** · **METEOR**.
POSTER and MEDIUM are still in `src/plates/`. Add a line for either to `src/plates/index.js`
and it returns to the plate picker and the contact sheet. With only one plate in the list, the
picker hides.

None of the hung plates carry text. Small type on a moving picture asks to be read every frame
and says nothing. When no hung plate takes a headline (POSTER does), the HEADLINE field hides
too. An input that reaches nothing has no reason to stay.

There are no build tools: static HTML, ES modules, Canvas 2D and WebGL2. Separations are drawn
on 2D canvases, and the GPU does everything from the halftone screen to the ink landing on the
paper. Browsers that cannot open WebGL2 do not run it.

Two companion documents, both in Korean:

- [MAP.md](MAP.md): what this kind of print is called, how it differs from a zine, and where
  each printing term in the code lives.
- [how.html](how.html): how one halftone dot travels from a separation to the paper, with
  figures. The press prints every figure live, so changing the shader changes the page. The
  HOW IT'S MADE link in the SHEET card opens it.

## Running

ES modules need an http origin, so opening `index.html` straight from disk does not work.

```bash
node serve.mjs
```

Then open `http://localhost:7400`. Pass a port as an argument or set `PORT` to change it.
`npm start` does the same thing.

If you change the press, measure it side by side with the old one. If you refactor anything,
record a snapshot first and compare after: it prints every plate 520 ways and proves no pixel
moved. Both are in [bench/README.md](bench/README.md) (Korean).

```bash
node bench/serve.mjs
```

The URL is where a sheet you like is kept, so reading it has tests of its own.

```bash
npm test
```

## Print order

A riso does not mix CMYK. Each color has its own drum, the paper passes once per drum, and
colors mix only on the paper. `src/press.js` and `src/screen.js` follow that order.

1. **Compose.** The plate function draws straight onto the separations. `S.key.line(...)` draws
   a line on the darkest drum.
2. **Screen.** Each separation's coverage becomes halftone dots, at a different angle per drum.
3. **Ink.** The dots take that drum's color, as much as they cover.
4. **Land.** The inks multiply onto the paper, each drum a pixel or two out of register.

Step 1 runs on Canvas 2D. Steps 2 to 4 are one fragment shader pass. Canvas is best at lines,
type and knockouts. Halftoning and multiplying are per-pixel work that the GPU does in a single
pass. Separations are uploaded as textures, and the shader reads only their alpha.

Misregistration does not move a finished plate. The shader screens each drum at its slipped
position directly, and an edge that slips past the plate gets no ink from that drum.

Yellow multiplied over blue can only come out green. This is why adding a drum adds four
colors, not one: two inks make three colors, three inks make seven. GARDEN and KALEIDO show
this, and CHLORO gets its green this way.

### A separation is coverage, not color

Black drawn on a separation does not mean black ink. It means "cover this much". The color is
decided only just before the ink reaches the paper. So a tone gradient becomes real halftone
steps, with dots that grow and shrink, and a knockout is not white ink but a spot that drum
does not print.

Drums are named by their job, not their color. Every palette has different colors, so
luminance decides the names.

| Drum | Job | Screen angle |
| --- | --- | --- |
| `S.key` | Darkest. Type and lines | 45° |
| `S.body` | Middle. Large masses | 15° |
| `S.wash` | Lightest. Grounds | 75° |

Spacing the three angles 30° apart is a long-standing printing convention. Two plates at the
same angle make moiré. Spread apart, the overlaps form rosettes instead. Section 06 of
[how.html](how.html#angles) prints both side by side.

With two drums, `body` and `wash` are the same drum and share one separation. Two separations
would print the same plate twice and make it twice as dark.

### Randomness is spent while composing

A plate function runs once per sheet. It spends all of its random numbers there and none while
printing. When the same shape has to be knocked out of two drums, build the shape first and
carve it twice. Drawing fresh numbers for each knockout makes the two drums carve different
spots.

### Noise comes from position

Paper tooth, the specks that nibble dot edges, and the mottle where the drum laid the ink thick
are all made by the shader on the spot. It mixes the pixel position and the roll with an integer
hash. No noise is stored per roll, so there is nothing to keep for each size or impression.

Specks follow device pixels. Mottle follows sheet coordinates, because it is a property of the
print, so the small sheets on the contact sheet show the same mottle as the full sheet.

Integer math gives the same answer on every GPU, so a roll makes the same noise everywhere. The
separations, though, are drawn by the browser's canvas, and browsers smooth edges differently.
Pixel-identical sheets are promised only within one browser.

### The faintest ink fades in

A dot's edge is softened over 2.2 paper pixels, and the softening leaves half the ink right on
the boundary. So even a dot of radius zero keeps a small cone of ink in the middle of its cell.
On a fine screen that cone is a real share of the cell: about 7% at CELL 3, under 1% at CELL 9.
Left alone, any ink at all, even 1/255, covers that share at once, and a soft stain that fades
to nothing shows a hard edge right where it reaches zero. The shader works out the cone's share
(`least` in `src/screen.js`) and prints ink fainter than that at the matching fraction, so
coverage grows from zero. Anything darker prints exactly as before. [how.html](how.html) walks
through it.

### The paper is white

The stock is plain white uncoated paper (`PAPER` in `src/palette.js`). It adds no color, so the
inks land as themselves and an overlap depends only on the inks. Perfectly flat white looks
like a screen rather than paper, so the shader dusts it with a faint, slightly darker tooth
(`PAPER_SHADE`).

## Moving plates

Time is one argument a plate receives. `page.t` runs from 0 to 1 over one loop. A plate that
ignores `t` is a still sheet.

Plates move by default: the page prints and plays as soon as it opens. The exceptions are when
the page opens with a contact sheet showing (playback then starts when the sheet closes) and
when the viewer has asked for reduced motion.

### Two rules for a seamless loop

**Rule one: everything that uses time must complete a whole number of cycles as `t` goes from 0
to 1.** RIPPLE does it like this:

- A ring's life is `(t + phase) % 1`, so the rings at `t=1` are the rings at `t=0`.
- The wobble is `sin(lobes*θ + 2πt)`: whole lobes, one cycle.
- A second wobble layer turns the other way at `2·2πt`. It used to turn 1.5 times per loop,
  and the rings jumped by about a pixel at the seam.
- The dot's beat is `1 + 0.12·sin(2πt)`.

**Rule two: the number of random draws must not depend on `t`.** MOON skips stars that fall
near the moon. The moon sways, so a different set of stars was skipped on each frame. Skip one
star and every star after it gets different numbers, and the whole sky changes. Draw
everything first, then decide what to skip.

Break either rule and the picture jumps between the last frame and the first. Check seams by
measuring, not by eye. There are two checks.

**Print just before the end.** Print a sheet at `t = 1 − 1e−9` and compare it with `t = 0`. If
every period is whole, the two are the same sheet. RIPPLE, MOON, GARDEN, CELL, COSMOS, FLAKE
and KALEIDO pass to the pixel, and JELLY differs in one byte from floating-point rounding. This is the check that caught
RIPPLE's 1.5 turns, with about 34,000 bytes different.

METEOR is drawn on beats, so this check does not apply to it. `t = 1 − 1e−9` lands in the last
drawing of the loop, not the first, and about a hundred thousand bytes differ by design. For a
plate like that, compare `t = 1` with `t = 0`, which matches to the pixel, and lean on the step
measurement below.

CHLORO draws thousands of small ellipses, and the canvas moves a few hundred bytes for a 1e−9
nudge in either direction: `t = 1e−9` differs from `t = 0` as much as `t = 1 − 1e−9` does. That
is the rasterizer, not a seam. For a plate like that, compare `t = 1` with `t = 0` instead, and
lean on the step measurement below. CHLORO's `t = 1` matches `t = 0` exactly.

**Measure the steps.** Measure the pixel difference between each pair of neighboring frames
around the whole loop, and see whether the last step stands out from the rest.

Don't judge by the ratio to the mean. When step sizes are tightly bunched, any step can be the
largest, so "the seam step is 1.3× the mean" doesn't show whether it jumps. Measure it against
the standard deviation of the other steps instead: **within ±2σ, the loop is seamless.**

Don't decide from one run either. At eight sheets a second a loop has only sixteen steps, so
the standard deviation itself is unsteady, and some seeds will pass z = 2 with nothing wrong.
**Measure five or six seeds. If the signs are mixed and scattered, it is noise. If z comes out
large and positive whatever the seed, the loop is broken.** JELLY's swarm, measured over six
seeds, scattered from +2.07 to −1.90: noise. Step sizes that rise smoothly into the seam and
fall away after it are the motion's own speed, not a break.

### Printing while playing

Printing one frame used to take longer than the playback budget allows, so the film was baked
first and the projector only flipped through it. Almost all of that time went to halftoning
and multiplying. That per-pixel work moved into the shader. Now even the heaviest full-size
sheet, JELLY, takes about a sixth of a frame's budget, and most take far less. Nothing is
baked: every frame is printed as it plays.

| One sheet | Canvas 2D | WebGL2 |
| --- | --- | --- |
| RIPPLE, 1080 | 29 ms | 1.3 ms |
| MOON, 1080 | 98 ms | 1.9 ms |
| GARDEN, 1080 | 37 ms | 1.5 ms |
| JELLY, 1080 | 134 ms | 6.8 ms |
| CELL, 1080 | 80 ms | 2.6 ms |
| CHLORO, 1080 | 96 ms | 5.6 ms |
| COSMOS, 1080 | 89 ms | 3.0 ms |
| FLAKE, 1080 | 76 ms | 4.0 ms |
| KALEIDO, 1080 | 88 ms | 1.9 ms |
| METEOR, 1080 | 142 ms | 2.5 ms |
| One contact sheet | 146 ms | 15 ms |

Where one WebGL2 sheet's time goes:

| Stage | Time |
| --- | --- |
| Composing the plate | 0.03–2.9 ms |
| Rasterizing and uploading separations | 0.7–2.4 ms |
| One shader pass, by GPU timer | 0.1–0.7 ms |
| One frame's budget at 24 fps | 42 ms |

These are means on an M2 Max. Each sheet's time includes waiting for the GPU to finish, forced
by reading back one pixel. Without that wait, you time only the composing. Boil barely changes
the numbers. Most of the time now goes to moving separations to the GPU, not to halftoning. The
exceptions are JELLY, CHLORO and FLAKE, where composing the plate (stains, a swarm of bells and
legs; a few thousand chloroplasts; a few hundred crystal pieces) takes the largest share.

The Canvas 2D press worked harder where a sheet carried more ink. RIPPLE and GARDEN have since
lost their background washes, and the old press got about twice as fast on both. The first run
measured 59 ms and 71 ms. The raw data and side-by-side images are in
[the latest run](bench/results/2026-09-18-canvas2d-vs-webgl2-ten-plates/report.md), measured on
2026-09-18. The earlier runs stay as records: [nine plates](bench/results/2026-09-17-canvas2d-vs-webgl2-nine-plates/report.md),
[six plates with the leaf-tissue CHLORO](bench/results/2026-09-17-canvas2d-vs-webgl2-leaf-tissue/report.md),
[six plates with the first CHLORO](bench/results/2026-09-17-canvas2d-vs-webgl2-six-plates/report.md)
and [the first run](bench/results/2026-09-17-canvas2d-vs-webgl2/report.md) with four plates.

The milliseconds in the top bar count main-thread time only. The GPU finishes its part
afterwards, so the bar reads lower than the tables. The FPS figure on the same bar shows whether
playback keeps its beat.

### The clock always ticks 24 times a second

What changes is not the clock but how many frames each sheet is held. A loop is 48 frames, or
2 seconds, and 48 divides evenly by every hold, so the beat never drifts. The default is eight
sheets a second, the beat that suits the ripple.

| Sheets a second | Frames per sheet | Sheets per loop | How it looks |
| --- | --- | --- | --- |
| 24 | 1 | 48 | Flows smoothly |
| 12 | 2 | 24 | "On twos", as in hand-drawn animation |
| 8 | 3 | 16 | The beat sharpens and it looks more like print. Default |

When you stop and scrub, you still see only the sheets that playback would show. At eight a
second, frames 0, 1 and 2 are all sheet 0. A sheet that playback never shows does not exist.

### Slow printing makes ripples run backwards

When a ring moves more than half the ring spacing in one step, the eye pairs it with the next
ring in instead of the next ring out. This is the wagon-wheel effect, and it makes an outward
ripple look like an inward one. The ratio is `rings × frames held ÷ 48`. Near 0.5 the
direction blurs, and above it the motion flips.

| Rings | 24 a second | 12 a second | 8 a second |
| --- | --- | --- | --- |
| 12 | 0.25 | 0.50 | **0.75** |
| 3 | 0.06 | 0.13 | 0.19 |

With only three rings, the current design is safe at every beat. Making it sparse also got rid
of the wagon-wheel effect.

Direction is measured too, not judged by eye. Sample brightness outward from the center,
overlay two neighboring frames, and find the shift that matches best. A positive shift means
the ripple spreads, a negative one means it gathers. The counts below are for twelve rings and
for three:

| Sheets a second | 12 rings | 3 rings |
| --- | --- | --- |
| 24 | outward 17 / inward 7 | outward 48 / inward 0 |
| 8 | outward 5 / inward 3 | outward 16 / inward 0 |

### Drawing size and display size

There is only one drawing size. Playing, stopped or while a knob is being dragged, the press
prints at 1080. Back when a sheet was expensive, the paper changed size: 454 while dragging,
670 while playing and 1080 when stopped.

The display size is independent of that and depends on the space left on screen. Switching
between the contact sheet and a single sheet does not make the picture shrink and grow.

CSS `aspect-ratio` can't do this. Let the height fill the space and `max-width` clips only the
width, which breaks the ratio. Set both to `auto` and the canvas displays at its own pixel
size. So the page measures the space left and sets the size directly.

A single sheet is the WebGL canvas the press prints on. The contact sheet prints each cell
small on that canvas and copies it onto a 2D canvas. A canvas can hold only one kind of
context, so there are two.

The frame number comes from the wall clock. If one sheet is late, the next one still arrives on
its beat.

### Stopped versus asked to stop

Since motion is the default, touching a dial does not stop it. Whether it's a button or a
slider, the next frame prints with the new value and playback continues.

Playback stays stopped only after you press STOP or drag the frame slider. After that, touching
dials does not restart it on its own, because you asked it to stop. Play again and it resumes
from the stopped frame.

### Boil

Motion raises a question a still image never had: does the paper move with the picture, or
does the picture move under the paper? There's no single right answer, so it's a dial.

| Value | Meaning |
| --- | --- |
| HELD | One sheet. The paper stays put and the picture moves under it |
| TWOS | A new impression every two frames, the boil hand-drawn animation always had |
| EVERY | A new impression every frame. The whole screen boils |

A new impression changes the screen noise and the misregistration together. They come from the
same pass through the press and must not drift apart. Impressions cycle through eight. The
shader makes the noise on the spot, so a boiling screen costs no more.

## Making a plate

A sheet is a single function. Create a file in `src/plates/`, add it to the list in
`src/plates/index.js`, and it appears on screen and in the contact sheet.

```js
import { DISPLAY } from "../type.js";

export const hello = {
  id: "hello",
  name: "HELLO",
  about: "One line shown under the plate picker",

  paint(S, R, page) {
    S.wash.ramp(0, 0, page.width, page.height, { from: 0.8, to: 0 });
    S.body.disc(page.width / 2, 420, 200);
    S.key.text("Hello", page.margin, 300, { font: `700 90px ${DISPLAY}` });
    S.key.knockout((sep) => sep.disc(page.width / 2, 420, 60));
  }
};
```

`S` holds the three drums, plus `S.drums`, the list of drums actually running. `R` is the
roll's random generator. `page` carries the size (`width`, `height`), `margin`, `palette`, the
running `inks` and their `roles`, the roll's `seed`, the time (`t`, `frame`, `frames`), the
`headline`, and this plate's knob values in `knobs`. A separation offers `flood`, `shape`,
`line`, `disc`, `ring`, `block`, `ramp`, `text`, `knockout` and `draw`. Whatever `paint`
returns is handed to `guides` (below); most plates return nothing.

### Knobs belong to each plate

When a plate exports a `knobs` list, the page builds controls from that list alone. These are
not shared dials: RIPPLE has no HORIZON and MOON has no RINGS. Showing values a plate doesn't
use would leave you guessing what you're turning.

```js
knobs: [
  { key: "rings", label: "RINGS", min: 1, max: 10, step: 1, value: 3 }
]
```

Values are remembered per plate. Switch to another plate and back, and your settings are still
there. One plate's values never leak into another. The URL carries only the current plate's
knobs.

| Plate | Knobs |
| --- | --- |
| RIPPLE | RINGS · REACH · EASE · ARCS · WEIGHT · SQUASH · DOT · OFFSET · DROPS · FIELD |
| MOON | MOON · HORIZON · RISE · SKY · STARS · GLINTS · HAND |
| GARDEN | STEMS · REACH · LEAF · SWAY · SIDE · BERRIES |
| JELLY | SWARM: COUNT · FIELD · DEPTH · DRIFT — BELL: BELL · PULSE · THROB · HAND · HEM · INNER — WHISKERS: TENTACLES · TRAIL · WOBBLE · SWAY — LEGS: ARMS · REACH · GIRTH · SWING — WATER: DEEP · STAIN · FEATHER · GAP · MOTES |
| CELL | COUNT · FIELD · SIZE · SPIKES · LENGTH · CUPS · DEPTH · DRIFT · SPIN · GLOW · DARK · MOTES |
| CHLORO | FIELD · SIZE · STRETCH · ANGLE · JITTER · WALL · DENSITY · PLASTID · DEPTH · WANDER · TINT · GROUND |
| COSMOS | FIELD · STARS · SPIKES · TWINKLE · MILKY · NEBULA · GALAXY · TILT · ARMS · DARK |
| FLAKE | FIELD · SIZE · HABIT · BRANCH · RIDGE · BUBBLE · GLINT · FLURRY · DARK |
| KALEIDO | FIELD · MIRRORS · PIECES · SIZE · TUMBLE · TINT |
| METEOR | SKY: FIELD · DARK · DUST — BEAM: ANGLE · LENGTH · CORE · BEAMS · GLOW — BEAT: BEAT · FLASH — SPIKE card: SIZE · POINTS · STRETCH · VARY · FLIP · GLOW — DOTS card: FREQ · LIFETIME · VELOCITY · DRAG · SIZE · SHRINK · STRETCH · SCATTER — STARS card: FREQ · LIFETIME · VELOCITY · DRAG · SIZE · SHRINK · TRAIL · SCATTER |

Don't confuse the CELL plate with the CELL dial. The dial sets the halftone cell size for every
plate. The plate is the microscope sheet.

### Scope knobs are shared

The plates inside the round frame (CELL, CHLORO, COSMOS, FLAKE and KALEIDO) also export `scope`, the eyepiece
knobs from `src/scope.js`: FRAME, the field's radius, and VIGNETTE, how much the light dies
toward its edge. The page builds these into their own SCOPE card under PLATE KNOBS, and the
values are shared rather than remembered per plate, since all of them look through the same
eyepiece. The URL carries them in `s`, next to the plate's own `k`.

```js
import { SCOPE_KNOBS } from "../scope.js";

export const cell = {
  knobs: [/* the plate's own */],
  scope: SCOPE_KNOBS,
  paint(S, R, page) {
    const ring = page.width * page.knobs.frame;
  }
};
```

The press fills in the scope defaults the same way as the plate's own, so a plate printed on its
own still runs. Older links that put FRAME or VIGNETTE inside `k` still open with those values.

### A knob can be a seed

**FIELD** on RIPPLE, JELLY, CELL, CHLORO, COSMOS, FLAKE, KALEIDO and METEOR is a seed, not an amount.
The layout comes from this number, so dragging it redraws only the arrangement while the ink and
the paper tooth stay the same. NEW ROLL, by contrast, changes everything. FIELD lets you keep a print state you like and
browse compositions.

FIELD is mixed with the paper's roll, so NEW ROLL still changes the layout. The same roll with
the same FIELD always gives the same layout. JELLY mixes them like this:

```js
const layout = makeRng((page.seed ^ Math.imul(knobs.field + 1, 0x9e3779b9)) >>> 0);
```

Everything else a jellyfish draws, from the bell's wobble and rim to its legs, comes from
streams of its own, mixed the same way with a different constant. Each stream draws the same
amount per jellyfish whatever the knobs say, taking the maximum and using as much as it needs.
So TENTACLES and ARMS change the legs and never move the swarm.

### Strength and speed

When you turn a motion into knobs, keep strength and speed separate. JELLY's bell has PULSE for
how hard it beats and THROB for how many times it beats per loop. One big, slow beat and many
small shivers can't be expressed with a single value.

There are two limits:

- A knob that counts **times per loop** must be an integer. With THROB at 2.5, the bell doesn't
  return to its starting shape at the end of the loop.
- RIPPLE's **RINGS** reverses the ripple once rings × frames held ÷ 48 exceeds 0.5. At eight
  sheets a second the limit is eight rings.

### Guides, for looking while you draw

A plate can hand the screen its skeleton. Export `guides(page, sketch)` and it is called right
after the sheet is printed, with the same `page` the plate just painted with and `sketch`, whatever
its `paint` returned, so the marks use the numbers of that very sheet; what it returns is drawn on
a second canvas laid over the sheet. Nothing of it is printed, so the PNG and the contact sheet stay
as they were — turning GUIDES on and off leaves the sheet pixel-identical.

| Mark | What it draws |
| --- | --- |
| `{ kind: "line", from, to }` | A straight line |
| `{ kind: "path", points }` | A closed outline |
| `{ kind: "cross", at, r }` | A small cross on a point |
| `{ kind: "ring", at, r }` | A circle |
| `{ kind: "dot", at, r, ring }` | A filled dot inside a dashed circle |
| `{ kind: "text", at, text }` | One line of type |

Every mark takes `dash` and `hot`, which colors it. Marks on a point (`cross`, `ring`, `dot`)
also take a `label` and `lift`, how far above the point the label sits; negative puts it below.
Positions are in sheet coordinates, but sizes —
`r`, `ring`, `lift`, the line width and the type — are screen pixels, so the marks stay the same
size however large the sheet hangs. A plate with no `guides` gets the paper's own: the margin box
and the middle.

METEOR uses it for the one thing a still frame hides: the point everything attached to the head
grows and shrinks about. The only way to see that it holds still is to mark it while the crystal
pumps.

## Dials

| Dial | What it does |
| --- | --- |
| NEW ROLL | A new roll. The same number always prints the same sheet |
| PNG | Saves the current sheet |
| HOW IT'S MADE | Opens the page that follows a dot through the press |
| PLATE | Picks the plate. With a single plate it hides, leaving only the name |
| MOTION | Play, stop and scrub |
| SHEETS A SECOND | 24, 12 or 8. The clock and the loop length stay fixed |
| PLATE KNOBS | The knobs the chosen plate offers. Different on each plate, remembered per plate |
| SCOPE | FRAME and VIGNETTE, shared by the plates inside the round frame. Hidden for the others |
| BOIL | HELD, TWOS or EVERY |
| CONTACT SHEET | PLATES shows every hung plate, INKS the nine palettes, FRAMES one loop |
| HEADLINE | Appears only when a plate that takes a title, such as POSTER, is hung |
| INKS | Nine palettes |
| DRUMS | Two or three colors |
| CELL | Halftone cell size |
| GRAIN | Ink ceiling and mottle. At 0 the dots are clean |
| REGISTER | Misregistration, in pixels |
| GUIDES | Lays the plate's skeleton over the sheet. Printed pixels and the PNG are untouched |

Every setting goes into the URL, so a sheet you like can be kept as a link. `SPACE` plays and
stops, `N` rolls, `G` toggles the contact sheet, `D` the guides and `S` saves.

## How to judge

Looking good is not the same as being right. Each question has a place to check it.

| Question | Where to look |
| --- | --- |
| What colors overlaps make | GARDEN, KALEIDO, and CHLORO's green |
| How to make light things on a dark ground | JELLY, COSMOS, METEOR |
| Tone steps and knockouts | MOON |
| Whether any plate breaks in this palette | CONTACT SHEET · PLATES |
| Whether a plate survives all nine palettes | CONTACT SHEET · INKS |
| Whether the loop flows, and where it goes empty | CONTACT SHEET · FRAMES |
| Whether a seam really joins | `t = 1 − 1e−9` printed against `t = 0`, then neighbor steps within ±2σ |
| Whether a new press prints the same sheet, and how much faster | `bench/`, against an old commit on one page |
| Whether a refactor moved any pixel | `bench/snapshot.html`, against a snapshot recorded just before |
| The dots on their own | GRAIN at 0 |

MEDIUM is the plate for judging the screen itself. It isn't in the list, so add it back when
you need it.

## Files

| File | Role |
| --- | --- |
| `src/rng.js` | Seeded random numbers and value noise. The root of reproducibility |
| `src/palette.js` | The nine palettes, the paper color, trimming to the drum count |
| `src/screen.js` | Halftone, paper tooth and multiply, all in the shader. The part that makes it look like riso |
| `src/press.js` | Separations and the press. Draws separations on canvases, uploads them as textures and prints in one pass |
| `src/shapes.js` | Organic blobs, Memphis ornaments, bands of varying width |
| `src/mask.js` | Masks. Knocks everything outside one shape out of every drum, whether a circle or any shape made of points |
| `src/roundel.js` | The round frame. A circle mask plus a rim that looks drawn by hand |
| `src/scope.js` | The eyepiece field: the shared SCOPE knobs, light falloff, floating debris. The round-frame plates use it, and METEOR borrows its falloff |
| `src/drums.js` | Picking drums by color, not brightness: the greenest pair, the bluest, yellowest and reddest drum, night and light, night and the one yellow glow |
| `src/night.js` | The dark field: lay the night drums, carve light out of them, stain dark back on. CELL, COSMOS, FLAKE and METEOR use it |
| `src/blur.js` | Blurring alpha fields in JavaScript: a three-pass box blur and the soft glow around a shape. JELLY and METEOR use it |
| `src/keep.js` | Holding a few costly things (woven tissue, baked nebulae, glow masks) by key, so they aren't rebuilt every frame |
| `src/type.js` | Measuring text, line breaks, fitting type to the plate |
| `src/plates/` | The plates, one function per sheet. RIPPLE is the model for using time |
| `src/main.js` | Dials, playback clock, PNG. It hands the rest to the three below |
| `src/hash.js` | The URL: reading a link back into dials and knobs, and writing it. No DOM, so `npm test` runs it |
| `src/guides.js` | The guides laid over the sheet on their own canvas |
| `src/contact.js` | The contact sheet: many small prints pasted on one board |
| `serve.mjs` | Static server. Stamps module URLs with the boot time so no stale module survives a reload |
| `bench/` | The bench that measures two presses side by side, the snapshot that proves a refactor moved no pixel, and their results |
| `test/` | Tests that run in Node: the URL reads back the same sheet |
| `how.html` · `src/how.js` | The page that follows a dot through the press. Its figures are printed live |
| `MAP.md` | Names and terms: where this kind of print sits |

## Blank paper is the water (RIPPLE)

RIPPLE is just a few rings, some unfinished arcs and one dot in the middle. There is no ground:
the white paper is the water. Fill the areas and the ripple becomes a pattern, and a pattern
doesn't read as spreading.

There is one trap. A line thinner than a halftone cell doesn't survive. Most of the line is
edge, so the screen breaks it into a dotted line that no longer reads as solid. Even lines
meant to look thin are drawn wide enough to cover a cell comfortably, and real riso solid lines
are that heavy anyway.

Only the center dot is printed with two drums. It is the one place on the sheet where colors
mix, and the one mark that shows where the ripple started.

The two drums print the same shape slightly apart. The dot reads as two inks only when you can
see the two single-ink crescents and the overlap between them. Stacked exactly, it zooms into a
blotch of two mixed screens. OFFSET sets the distance as a fraction of the dot's radius. The
roll sets the direction, usually with the darker drum on top and its partner below. The two
shapes differ slightly, as if cut by hand, and are a little taller than wide.

The partner is the middle drum. In some palettes the lightest drum is nearly the color of the
paper, so its crescent would vanish. The overlap color depends on the palette: red or pink with
aqua gives deep navy, and the default palette's sky and yellow give green.

DROPS adds more places where ripples start, like rain on a pond. The first drop stays in the
middle and keeps using the roll's own random numbers, so adding drops never changes it. The
others take their own random stream: each is placed as far as possible from the drops already
down, is a little smaller, and spreads on its own beat. FIELD reseeds those extra drops only.

## A lineless moon (MOON)

MOON is tone steps and knockouts: the sky is a ramp, and the moon and the moonlight on the water
are carved holes. The plate is lineless: nothing is outlined, and nothing is cut with a compass
or a ruler. The moon is carved with a slightly uneven edge, and the halo rings around it are
hand-drawn. The horizon is just where the sky meets the water: the top edge of the water follows
two layers of noise, and no line is drawn along it. HAND sets how much the edges wander (0 gives
a true circle and a straight edge). The hand has its own random stream, so the stars and the
moonlight stay where they were.

## Stains and gaps (JELLY)

Light things rise through dark water. There is no white ink, so everything that glows is
carved out. The plate lays the water, carves out the bell shapes, and puts the body drum (the
middle one of three) only inside them. Painting light ink over the water is impossible, because multiply only ever
darkens.

To look like rising, the water has to move, not the jellyfish. A jellyfish that really rose
would have to jump back to its start at the end of the loop. Motes drifting downward say the
same thing and still loop.

A swarm is spread out in depth. Farther ones are smaller and fainter; where each one sits comes
from a placement score, not from its depth. The far ones are printed first and the near ones
cover them, so the near ones' knockouts erase what's behind and occlusion comes for free.

The water is not a single color. The two lighter drums bleed in large stains (STAIN), so the
water shows third colors such as green or purple. The stains depend on the roll, not on time,
and use their own random stream, so they don't disturb the swarm or the motes. The stain field
is pushed to high contrast, which on its own cuts the stains out like paper, so their edges are
feathered afterwards (FEATHER): a box blur run three times, close to a Gaussian. The field is
drawn wider than the sheet and cropped after the blur, so the sheet's edges blur like the
middle. At 0 the edges stay sharp. JELLY prints full-bleed, without the round frame.

Each jellyfish is carved out of the water a little wider than its body (GAP). Even with perfect
registration, a thin line of paper stays around it, so water and body printed with the same
drum still read as separate things. It's the reverse of a trap, which in printing overlaps two
plates slightly so misregistration shows no gap. The bell is lineless: no rim is drawn around
it, so the paper gap and the pale fill alone make its edge.

The head follows a photo of a real jellyfish. The dome is a superellipse rather than a half
ellipse, a little taller than its half-width, so the shoulders round off and the sides drop
straight. It is drawn at 0.8 of BELL, which keeps the head small against the long legs. Its
flesh is a ramp, pale at the top and denser toward the rim. Inside, a pale mushroom with a
stalk shows under the crown, and faint ribs run up along the dome's meridians and meet at the
top (INNER, 0 hides them). All three are carved out of the bell's own ink and clipped to the
bell, and the ribs turn a little from one jellyfish to the next with its phase, so no new random
numbers are drawn. The top wobbles a little, like the moon on MOON (HAND). The wobble is a scale on the angle, so it stays put while the bell pulses.
Each bell's lower rim is its own, a row of rounded lappets like a real jellyfish's margin. How
high the rim arches, which way the arch leans, how deep the lappets hang and how much they differ
are drawn per jellyfish, and bigger bells get more lappets, 5 to 16. A lappet is the absolute
sine pressed by a power below one, which rounds the lobe and narrows the notch. They come in
whole numbers, so the rim still meets the dome cleanly at both corners, and the tentacles hang
from the same arch. A band along the lappets is printed once more with the bell's own drum, so
the hem reads darker (HEM, 0 leaves the band out). It is a surface, not a rim line, and it is
clipped to the bell. The wobble and the rim each have their own random stream, so the swarm
doesn't move. Tentacles are thick at the root and taper toward the tip, and half of
them have a white core carved down the middle.

The legs hang the way they do in a photo of a real jellyfish. Tentacles fall long from the rim
in slow S-curves and fan outward toward the tips, so neighbors cross. The oral arms start inside
the bell, so their roots are hidden and they seem to pour out from under the rim; they gather
near the middle and cross each other on the way down, like a loose braid. There are five by
default, and a far jellyfish loses only one of them. Only the layout of the legs follows the
photo, not how they are drawn.

The whiskers (the thin tentacles on the rim) and the legs (the thick oral arms in the middle)
are two parts with their own knobs. Whiskers take TENTACLES, TRAIL, WOBBLE and SWAY. Legs take
ARMS, REACH, GIRTH and SWING. The legs grow with the bell: REACH is a multiple of the bell's
size, and their width scales with the bell against a near bell at the default BELL, so a far or
small jellyfish has short, thin legs. Whisker length still follows the sheet (TRAIL). Knobs that
belong to one part never move the other.

Both parts sway in two layers: a still S-shaped pose, and a wave that runs down them once per
loop. The loop is two seconds, so the wave can't run any slower. Instead SWAY (whiskers) and
SWING (legs) set how much of the wave goes in: lower values keep the pose and let them drift
lazily, and 1 is the full wave. Both layers agree at t = 0, so the first frame is the same
whatever the share.

A knob in a plate's list can carry a `group`. The panel then puts a small title wherever the
group changes, which is how JELLY's knobs read as swarm, bell, whiskers, legs and water.

A knob can also carry a `panel`. Those knobs leave the PLATE KNOBS card for a card of their own,
titled with the panel's name, right under it. Their values still belong to the plate, so the
address is the same. METEOR puts its head and its two emitters there: SPIKE, DOTS and STARS.

The glow around each bell is carved lightly out of the water. The bell is filled on a coarse
grid, a few sheet pixels to a cell, blurred, and carved out through a curve that keeps it strong
near the bell and lets it trail off, so it fades evenly with no steps. Carving a few larger
copies of the bell instead leaves an edge at every copy, and those edges stack above the bell
like echoes. The glow is soft enough that scaling the grid up doesn't show. One canvas is reused
for every bell, with a cleared border around the pattern, so a sheet never depends on what was
printed before it.

## Under the microscope (CELL and CHLORO)

Both plates are microscope slides. The round frame is the eyepiece's field of view, and outside
it is paper. The field is brightest in the middle and dims toward the edge (VIGNETTE).
`src/scope.js` holds what the field shares: the SCOPE knobs, the light falloff and the debris
layout. CHLORO lays the bright field before the specimen; CELL lays its own dark field, draws its
motes before the in-focus particles and dims the edge last. The round frame always comes last.
CELL draws its debris from the random stream after the cells, so changing the debris count
doesn't move them.

**CELL** is virus particles glowing in a dark confocal field, after a reference image: round
particles ringed with dense club-shaped spikes, a dark core, and pale spots around it where
spikes face the viewer. The field is laid like COSMOS and FLAKE: the drums that aren't yellow
become the night (`src/drums.js`), and everything that glows is carved out of it. The bluest
drum is carved less than the others, so the light comes out sky blue rather than white; only
the brightest tips are carved nearly all the way.

- **Spikes.** A stalk with a blunt head, round or flat. Stalks are carved lighter and heads
  almost through, so the tips glow most. Lengths vary (LENGTH), and one in four looks
  foreshortened, rising from the front of the particle instead of its rim. SPIKES sets how many
  ring each particle.
- **Body.** The face is carved about halfway and the rim brighter, with a faint glow around the
  particle. The night goes back on in the middle, making the dark core.
- **Cups.** Pale discs ring the dark core, spikes seen end-on, each with a dark center again
  (CUPS).
- **Depth.** Out-of-focus particles (DEPTH) go down first as large soft glows with slightly
  darker centers. The field is a little brighter in the middle, with a few soft light patches
  and small specks of light (MOTES). DARK sets how dark the field is, GLOW how bright the
  particles are.
- **Motion.** Each particle moves on its own: it circles a small closed path (DRIFT) and rocks
  in place, and each spike stretches and tilts on its own beat (SPIN).

Palettes with a deep blue, such as AQUA × BLUE × LEMON, come closest to the reference. With a
coral, red or pink key the night turns deep purple or navy.

Up to 0.32.0, CELL was stained cells in a bright field that rippled and divided; that version is
in the git history.

**CHLORO** is leaf tissue, as a light microscope shows an Elodea or moss leaf: elongated
hexagonal cells, wall to wall, each packed with green chloroplasts.

- **Cells.** A staggered hexagonal lattice is jittered (JITTER) and split into Voronoi cells.
  The cells are then stretched (STRETCH) and turned (ANGLE). Because the stretch comes after
  the split, neighboring walls always meet.
- **Walls.** Walls are left over, not drawn. Each cell's inside is inset by half the wall
  thickness (WALL), filled pale blue and outlined dark. The outlines of two neighboring cells
  become the two edges of one wall, and the band between them is tinted pale yellow.
- **Chloroplasts.** Discs with a dark rim and a few darker specks, which is how grana look under
  a light microscope. They sit in three layers. Within a layer they barely overlap, because a
  layer is filled as one path and an overlap wouldn't darken anyway. Across layers they may
  overlap deeply, and those overlaps print darker. Out-of-focus ones (DEPTH) go down first,
  larger and lighter, with no rim.
- **Motion.** Each chloroplast moves on its own. It circles a tiny loop in place (WANDER, a few
  pixels) and tilts a little. Every loop has its own angle and shape, its two axes turn once or
  twice per loop, and chloroplasts pressed against a wall move less. The walls stay still.
  Nothing moves together: an earlier version pushed each cell's chloroplasts with one shared
  wave and drifted the whole slide, and it read as the screen shaking rather than something
  alive.

There is no green ink. The chloroplasts are filled with the two drums whose overlap comes out
greenest, usually a yellow and a blue (`src/drums.js` picks them). When no pair makes green, as with the two-drum run of
MUSTARD × LEMON, it uses the greenest single drum. The cell insides take the bluest drum, the
wall bands the yellowest, and the rims and wall edges the darkest.

The tissue doesn't change over time, so it is built once and reused from frame to frame. The
plate keeps a few built versions so that dragging a knob back and forth stays quick. Every
lattice point has its own seed, so widening or narrowing the field (FRAME) keeps the cells that
remain. Each cell draws the same number of chloroplast candidates, and DENSITY and PLASTID only
decide which of them are placed. FRAME above about 0.72 makes the field cover the whole sheet,
the way the photograph fills its frame.

### The round frame

The round frame lives in `src/roundel.js`, and any plate can add it with one call at the end of
its paint. The composition is called a roundel or circular vignette. The frame has two parts:

- **The mask**, in `src/mask.js`. A rectangle larger than the plate and the shape to keep go
  into one path, filled with the even-odd rule. That knocks everything outside the shape out of
  every drum. `maskCircle` keeps a circle, `maskShape` keeps a shape made of points, and `mask`
  keeps any path. Because the fill is even-odd, the kept shape must not cross itself.
- **The rim**, `rim`. Two circles with different wobble, one drawn thick and dark, the other
  thin and light.

To cut a plate to a shape without a rim, call only the mask.

```js
import { maskCircle, maskShape } from "../mask.js";

maskCircle(S, page, width * 0.44);            // keep one circle in the middle
maskShape(S, page, shapes.blob(R, cx, cy, r)); // keep one of the plate's own shapes
```

## Through the telescope (COSMOS)

COSMOS is the night sky in a telescope eyepiece, inside the same round frame. A microscope field
is bright and a telescope field is dark, so this plate works like JELLY's water: it lays a dark
ground and carves out everything that shines.

The drums are split by color, not brightness (`nightAndLight` in `src/drums.js`). A yellow drum
under the sky would multiply with the blue into a green night. So only the drums that aren't yellow become the **night** and lay
the sky, the darkest one heaviest. The yellow drums become the **light**, printed only where
something glows. With blue and yellow inks the night is blue and the light is yellow. Palettes
with coral, red or pink give a deep purple or navy night.

- **Milky Way.** A band crossing the field at a slant (MILKY). The night is carved faintly along
  it and the light drum goes on lightly toward its core. A ridge of noise stretched along the
  band becomes a dark rift that puts the darkest drum back. Inside the band, very small stars
  crowd into star clouds.

- **Nebula.** A cloud of warped noise carves the night lightly. Where the darkest drum is carved
  again, the remaining night drums show their color. Where the warm gas is, the night is cleared
  and the light drum goes on top, so the gas stays a clean warm color. Thin dust filaments put
  the darkest drum back.
- **Galaxy.** A tilted disk (TILT) with logarithmic spiral arms (ARMS). The disk is carved, and
  the arms carve the darkest drum further, so they stay blue. The center is white with a ring of
  the light drum around it. Yellow core and blue arms are how real spiral galaxies look. Star
  clumps along the arms are brighter, and a dust lane runs along the inner edge of each arm.
- **Stars.** Sizes follow a power law: many tiny stars, a few large ones. White stars carve
  every night drum, yellow stars add the light drum on top, and blue stars carve only the
  darkest drum. The brightest few (SPIKES) get diffraction crosses from the telescope's spider
  vanes. All crosses share one angle, because all the light came through one telescope.
- **Motion.** Only the stars move, each on its own. They twinkle at their own beat and tremble
  in place with the air (TWINKLE). The Milky Way, the nebula and the galaxy stay still. With
  TWINKLE at 0, every frame is the same sheet.

The edge of the field is darkened last with the darkest drum (VIGNETTE), so stars and gas near
the rim fade with it.

The Milky Way, the nebula and the galaxy are per-pixel patterns, so they are baked once into
small canvases and stretched onto the sheet. A bake is kept while the roll and the shape stay the
same. The bakes use their own random streams, so a cached bake never changes what the layout
draws. The plate always draws the same number of stars, and STARS and MILKY only decide how many
are printed. The Milky Way's own positions and stars are drawn after everything else, so adding
it didn't move the rest of the sky.

## A snow crystal (FLAKE)

FLAKE is one snow crystal under the microscope, in the manner of the photographs Wilson Bentley
took on black grounds from the 1880s. The field is dark, laid the same way as COSMOS, and the
crystal is carved out of it.

The whole crystal comes from a 30° piece: the upper half of one arm and the side branches
leaving it at 60°. That piece is turned six times and mirrored once each, twelve copies in all,
so the hexagonal symmetry can't drift. A mirrored copy winds the other way, so its points are
reversed before it joins the path. Otherwise the overlaps would cancel out and leave holes.

- **Body.** A hexagonal center plate, six arms, side branches and their twigs. HABIT moves from
  a broad plate (0) to a thin fern (1): the arms get thinner, the side branches longer and the
  center plate smaller. Side-branch tips stay inside a hexagonal outline. BRANCH sets how many
  side branches each arm carries.
- **Light.** The body carves the night partway, so it stays pale blue. The edges are carved
  through to white, including the edges where pieces overlap, which read as facets inside the
  crystal. The arms' spines and the center plate's nested hexagons put the darkest drum back
  (RIDGE).
- **Bubbles.** Air bubbles don't follow the symmetry, as in real crystals (BUBBLE).
- **Glints.** Arm tips, branch tips and corners flash, each on its own beat, with a touch of the
  light drum at the center (GLINT).
- **Flurry.** Small crystals float faintly around the big one and rock in place (FLURRY).

Raise REGISTER and the white edges pick up colored fringes, like chromatic aberration in a
microscope. Riso gives that for free. The crystal doesn't change over time, so it is built once;
only the glints and the flurry move.

## Kaleidoscope (KALEIDO)

After the microscope and the telescope, the third thing to look through. The round frame is the
tube. Two mirrors inside it turn one wedge MIRRORS times and flip it once each; at 6 that is
twelve copies, the same symmetry as a snowflake.

The wedge holds colored glass: blobs, shards, beads, rings, drops, leaves, sparkles and threads,
the repository's own shape vocabulary. Each piece is printed on one drum, and one in three is
printed again, slightly offset, on the next drum, so overlaps give third colors. The ground is
the bright microscope field.

Pieces are placed across the wedge's edges, so they meet their own reflections at the mirror
lines and bloom there. Each drum's wedge is drawn once on a small canvas, clipped, then turned
and flipped into place, which makes the cut edges meet exactly at the mirrors.

Every piece moves on its own: it circles a small loop and rocks a little (TUMBLE). As pieces
cross the mirror lines, the pattern opens and closes. The tube itself never turns. The plate
always draws the same number of pieces, and PIECES only decides how many go in.

## A shooting star (METEOR)

A shooting star cuts across a dark sky, built the way an effect artist stacks emitters. The
reference was a breakdown of an anime-style effect, one emitter per layer, so the plate is
written as the same stack, printed back to front. Nothing is outlined.

| Layer | What it draws |
| --- | --- |
| Dust | Faint specks in the far sky (DUST) |
| Glow | One soft layer of light around the beam (GLOW) |
| Second beams | Thin pink and blue bands at slightly different angles (BEAMS) |
| Main beam | The wide yellow band from the head to the tail's end, with a white heart and a blue face at its end (CORE, LENGTH) |
| Dots | Flat dark ellipses after the breakdown's Dots emitter. Every one is born big and long right behind the head, then flows down the beam, shrinking and rounding until it ends as a circle. Each dot pivots on its leading tip at full size, so it shrinks into that point and keeps its pace as it rounds; pivoting on the head-side end dragged the shape back and made it seem to slow down. So new ones always overlap into one dark lump behind the head, and a string of ever smaller beads runs along the beam. It takes an effects emitter's values: spawn rate (FREQ, per second), lifetime (LIFETIME, seconds, snapped to an even share of the 2 s loop so the loop closes), velocity and drag (VELOCITY, DRAG), start size and size over life (SIZE, SHRINK), elongation (STRETCH) and sideways spread (SCATTER). FREQ × LIFETIME dots live at once, up to 60. These knobs sit in a DOTS card of their own. Printed over the main beam, since the beads line up with it |
| Embers | Short bright strokes that fly back from the head, twice a loop |
| Tail stars | Four-point stars the head throws back, after the breakdown's Stars emitter. Each leaves the rim of the head's circle, flies down the beam and shrinks, trailing a hairline tail back toward the head that is longer the faster it flies. Yellow, pink, blue or white, one color each. The same emitter values as the dots plus TRAIL, the tail's length, in a STARS card of their own |
| Head | After the breakdown's Spike_Main and its final composite: a round white heart, the head's core, sits fixed on HEAD 0, and yellow blades fan out from it toward the tail, with the core as the fan's pivot. The fan is built anew FLIP times a loop (24 by default, apart from BEAT), the way that emitter picks a random texture almost every frame. Blades spread like the ribs of a fan, from half of POINTS (rounded up) to POINTS of them, the count changing each drawing: the middle ones are longest, deep notches part them, and a short nose leads the way. The nose is cut into a polygon that goes back and forth between a pentagon and a heptagon from drawing to drawing: two points half the shorter edge back along each side, and one to three between them, spaced along a curve that bulges toward the old tip, so the front of the head is never a sharp triangle; the blade tips stay pointed. Each drawing sits somewhere between a narrow fan (half-angle about 23°, long blades) and a wide one (about 63°), opened enough that the side blades show beside the beam, leans a little to one side, and turns a little about the core. Each blade is uneven on its own. The core never moves, and its size changes per drawing on its own (0.16–0.26 of SIZE). The fan's floor is the size that still wraps the largest core with a yellow rim — its outline stays 1/0.85 of that core's radius from the center — and each drawing only scales the whole fan up from there (VARY; 1–1.6× at 0.5), apart from the core, so fan and core never swell and shrink together as one lump. Nothing blinks: the fan is always yellow and the core always white, except on impact frames, where the fan swells and turns white and the core turns yellow. The core is cut out of the fan and printed on its own. A soft yellow glow lies around the fan (GLOW) (SPIKE card: SIZE, POINTS as the most blades, STRETCH, VARY, FLIP, GLOW) |

The head is anchored on the head's origin, HEAD 0, where the beams start. The core sits on it and the
fan's nose just ahead of it, the impact burst is rooted there, and the dots and tail stars are born on an
unseen circle around it. The beams don't grow and shrink, so scaling about any other point slides
the head back and forth along the beam. Each drawing's fan comes from its own random stream
seeded by the drawing's number, so a drawing always gets the same fan, `t = 1` matches
`t = 0`, and the layout of every other layer is untouched. GUIDES marks that pivot, the axis, the
beam's outline and where the dots and the stars run out.

Nothing the head throws flies forward. The dots and tail stars leave toward the tail; a dot at full
size just touches HEAD 0 with its head-side end, and a star's tail stops short of it. That is kept
by the shape of each piece, not by clipping pieces at a line: clipping piled them up against the
line into straight, cut-looking edges. The impact flash is light, not something the head throws, so
it bursts every way from the pivot, forward too.

The dark sky works like COSMOS: the night drums lay the sky and whatever glows is carved out.
Here, though, night is every drum except the yellowest one. Counting only the non-yellow drums as
night leaves a warm drum such as coral out, and the sky becomes one light color; a shooting star
needs a dark sky. Yellowness is the lower of red and green minus blue, because an average lets
orange beat yellow. With two drums, both are night, and yellow light keeps a little of the paler
one instead.

| Light | How it is printed |
| --- | --- |
| Yellow | Carve all night drums, then print the yellow drum |
| Blue | Carve the night drums but leave some of the bluest |
| Pink | Carve the night drums but leave some of the reddest |
| White | Carve the yellow drum too |
| Dark | Print the night drums denser than the sky and carve the yellow drum, which would turn the dark olive |

A thin layer of the yellow drum over the sky gives the bluish gray of the reference.

The star stays put and the world streams past, as if the camera follows it. The embers flow
toward the tail twice a loop, vanish at the end and come back ahead of the head, tapering to
nothing at both ends so the wrap never shows. The dots and tail stars are emitters: each one is
reborn a whole number of times per loop, which is why their lifetimes snap to an even share of
the loop. The glow around the beam is the blurred shape from `src/blur.js`; it depends only
on the shape knobs (LENGTH, ANGLE, CORE), not on the roll, so it is made once and kept. Everything is drawn in full
every time, and the knobs only decide how much of it prints.

### Drawn like an effect, not like a photograph

Anime effects animation is not smooth. It is built from a few iconic shapes, flat colour, snappy
timing on twos or threes, and impact frames that break continuity for one or two frames. METEOR
follows three of those rules, which is what separates it from a comet photograph.

| Rule | Here |
| --- | --- |
| Timing on twos or threes | BEAT splits the loop into that many drawings, and nothing is inbetweened. At 12 a drawing holds for four of the loop's 48 frames; at 48 the plate redraws every frame and the effect goes soft. The sheet rate still decides which frames print, so at 8 sheets a second a drawing shows for three or six |
| Flat colour, not gradients | The tail is flat faces: a yellow body, a white heart inside it, a blue face at the tail's end. Only one soft glow layer is laid under them, so they don't read as cut paper |
| Impact frames | Once per loop, for two frames, a round white light bursts from the head every way, forward too, and the sky itself lightens (FLASH). It starts on a multiple of six, a frame that 24, 12 and 8 sheets a second all print. Starting anywhere, one roll in three hid it between printed frames at 8 sheets a second |

The beat is a floor of the loop's time, so `t = 1` gives the same drawing as `t = 0` and the loop
still closes. The impact frame is kept away from the loop's seam, so the seam's step stays an
ordinary one.

## Shape vocabulary

The style mixes two families of shapes.

- **Organic**: blobs, leaves, drops, torn plates. Shapes no ruler or compass touched.
- **Memphis**: waves, zigzags, sparkles, spirals, diamonds. The 1980s scatter.

If a plate uses type, small text prints only on the palette's darkest drum. Small yellow text
is unreadable, even on white paper.
