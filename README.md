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
**COSMOS** · **FLAKE** · **KALEIDO** · **METEOR** · **GHOST** · **CLOUD** · **SEED** · **REEF**.
POSTER, MEDIUM and WHALE are still in `src/plates/`. Add a line for either to `src/plates/index.js`
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
  model: "claude-opus-5-5",

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
returns is handed to `guides` (below); most plates return nothing. `model` names the model that
built the plate; GUIDES writes it on every plate (below). A new plate records the model that built it.

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
| KALEIDO | FIELD · MIRRORS · PIECES · SIZE · TUMBLE · FLOW · SPIN · TINT |
| GHOST | FIELD · DARK · COUNT · SIZE · HEM · SLIP · GHOSTS · FADE · HAND · EYES · PHONES · FOV · ROOM · WINDOW · PANES · DECK · SPIN · WEB · THREADS · COBWEBS · STAIN · HALO · BEAT |
| CLOUD | FIELD · SKY · OKTAS · SIZE · BASE · SHADE · HAZE · BOIL · HAND · STAIN · BEAT |
| SEED | FIELD · DARK · SIZE · SEEDS · FILAMENTS · GONE · SWAY · HAND · STAIN · BEAT |
| REEF | FIELD · DEEP · CLEAR · COVER · SIZE · EYE · LOOK · BRANCH · TABLE · BRAIN · FAN · SWELL · SURGE · RAYS · HAND · STAIN · BEAT |
| METEOR | SKY: FIELD · DARK · DUST · DEPTH · TRAIL — BEAM: ANGLE · LENGTH · BEAMS — BEAT: BEAT — LASER card: WIDTH · LENGTH · VARY · FLICKER · GLOW — SPIKE card: SIZE · POINTS · STRETCH · SPREAD · NOSE · VARY · FLIP · GLOW — SECOND card: SIZE · POINTS · STRETCH · SPREAD · VARY · FLIP — DOTS card: BURST · FREQ · LIFETIME · VELOCITY · ANGLE · ACCEL · DRAG · GRAVITY · TOWARD · SIZE · VARY · SHRINK · FADE · STRETCH · SCATTER — STARS card: FREQ · LIFETIME · VELOCITY · DRAG · SIZE · SHRINK · TRAIL · SCATTER |

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

Whatever the plate returns, GUIDES also writes the model that built it in the top-left margin —
`MODEL · CLAUDE-OPUS-5-5` — from the plate's `model`. REEF was built by claude-opus-5-5 and every
other plate, hung or not, by claude-opus-5. That record comes from the session transcripts: the model
of each message that wrote the plate's file. (SEED's DARK default was changed by claude-opus-5-5; the
plate itself was built by claude-opus-5.)

METEOR uses it for the one thing a still frame hides: the point everything attached to the head
grows and shrinks about. The only way to see that it holds still is to mark it while the crystal
pumps.

## Dials

| Dial | What it does |
| --- | --- |
| NEW ROLL | A new roll. The same number always prints the same sheet |
| PNG | Saves the current sheet |
| HOW IT'S MADE | Opens the page that follows a dot through the press |
| PLATE | Picks the plate. Each button carries a thumbnail — that plate's first sheet, printed small in the palette and drums now on the press, so the choice is made by looking, not by reading names. The thumbnails are reprinted when the palette or the drum count changes. With a single plate the card hides, leaving only the name |
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
| `src/glass.js` | One piece of colored glass — blob, shard, bead, ring, drop, leaf, sparkle, thread. KALEIDO fills its wedge with it |
| `src/mask.js` | Masks. Knocks everything outside one shape out of every drum, whether a circle or any shape made of points |
| `src/roundel.js` | The round frame. A circle mask plus a rim that looks drawn by hand |
| `src/scope.js` | The eyepiece field: the shared SCOPE knobs, light falloff, floating debris. The round-frame plates use it, and METEOR borrows its falloff |
| `src/drums.js` | Picking drums by color, not brightness: the greenest pair, the bluest, yellowest and reddest drum, night and light, and METEOR's light, the drum farthest from the darkest one |
| `src/night.js` | The dark field: lay the night drums, carve light out of them, stain dark back on. CELL, COSMOS, FLAKE and METEOR use it |
| `src/stains.js` | Soft stains that bleed along low-frequency noise, feathered at the edge: JELLY's water |
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
address is the same. METEOR puts its laser, its head, its second spike and its two emitters there: LASER, SPIKE, SECOND, DOTS and STARS.

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
tube. Two mirrors inside it turn one wedge MIRRORS times and flip it once each; at the default 12 that
is twenty-four copies, and at 6 it is twelve, the same symmetry as a snowflake.

The wedge holds colored glass: blobs, shards, beads, rings, drops, leaves, sparkles and threads,
the repository's own shape vocabulary. Each piece is printed on one drum, and one in three is
printed again, slightly offset, on the next drum, so overlaps give third colors. The ground is
the bright microscope field.

Pieces are placed across the wedge's edges, so they meet their own reflections at the mirror
lines and bloom there. Each drum's wedge is drawn once on a small canvas, clipped, then turned
and flipped into place, which makes the cut edges meet exactly at the mirrors.

Every piece moves on its own: it rides a small circle and rocks a little (TUMBLE). Both polar
coordinates share one angle, so the path really is a circle and a piece never stalls and doubles
back; most pieces go round once a loop and one in four goes round twice, so the pattern keeps
being rebuilt for the whole loop instead of breathing in and out. As pieces cross the mirror
lines, the pattern opens and closes. At TUMBLE 1 a piece wanders about its own width, so pieces
really do change places and the arrangement is rebuilt, not just jiggled. Pieces also drift inward the whole way, the way glass
settles in an oil-filled chamber: each enters from outside the frame, flows to the center and
comes back in from outside (FLOW). Neither end of that journey shows — the way in is behind the
round frame, and on the way to the center a piece shrinks to a point. Pieces enter at evenly
spread times, so groups gather and break up without the whole tube emptying at once. The tube itself turns a whole number of mirror cells a loop (SPIN), which is
the pattern's own symmetry period, so it can turn for ever without a seam; SPIN 0 holds it still. The plate
always draws the same number of pieces, and PIECES only decides how many go in.

## The press's own ghosts (GHOST)

A Riso prints one ink per pass, and the paper never comes back to exactly the same place, so
anything printed in two inks lands one to four millimetres out — that is misregistration. And a
drum will sometimes pick ink up and set it down again where it doesn't belong, a fainter repeat of
the artwork further along the paper's travel; printers call that ghosting. This plate takes the
press at its word and makes both of them the picture.

The night is laid on every drum. The figure is then carved back out of each drum in turn, each one
offset a little further along the feed (SLIP, in millimetres — the real range is 1 to 4). Where all
the drums carve together the paper is bare; where one drum missed, its ink alone is left, so the
figure wears a thin coloured fringe that is nothing but the misregistration. The faint repeats
behind it are the other ghost: the same shape stained again down the feed, each weaker than the
last (GHOSTS, FADE).

The figure wears headphones, and they are stated the same way. The band is not an arch drawn over
the head, it is the dome's own ellipse pushed out by the width of the band, so it sits on whatever
head the knobs make. The two sides are not mirrored: the head is turned a little, so the band comes
down to eye height on the near side and stops higher on the far one, and the cups follow. The near
cup is a rounded square set square to the surface of the head, half on and half off the silhouette,
with the ear pad showing. The far cup is squeezed along the radius and printed before the body
rather than after, so the head carves its inner half away and only the piece past the silhouette is
left. Mirror the two and the figure is a diagram standing face on; offset them and it has turned its
head. The near side is always the right one. A sheet is one view from one place, and figures turning
different ways would be several places at once.

The ear pad is not a second colour but the same shape printed less — every drum gives back a little
of it — because knocking one drum out entirely leaves the other inks whole and drops a bright slab
into the middle of the cup. Unlike the body the headphones are printed rather than carved, so the
same drum offsets that put a pale fringe on the figure put a dark one here. PHONES sets the size;
0 takes them off.

The shape isn't drawn, it is stated: a half-round dome on straight sides with a scalloped hem, the
same vocabulary as JELLY's bell, and a scallop is kept wider than it is deep or the hem reads as
teeth. The eyes are two holes that take the same offsets as the body. Edges are shaken off true by
hand (HAND). The figures stand centred on the sheet — one in the middle, several spread evenly to
either side of it — and bob and sway on whole-number beats, so the loop closes.

They are inside an old house, and the room is built to real dimensions: 5.2 m wide and 3.2 m high —
old houses have tall rooms — with the back wall 4.4 m from the eye. It is one-point perspective, the
eye at a standing 1.6 m looking square at the back wall, the vanishing point 37% of the way down the
sheet. FOV is the eye's field of view, and it starts at its narrowest, where the back wall fills the
sheet and nothing bends but the floor and the deck; widen it and the back wall shrinks while the side
walls, the ceiling and the floor come in from the edges and run to the vanishing point.

The lower third of all three walls is raised-panel wainscot, laid out by the finish carpenter's
rules: the chair rail at a third of the wall height (42 inches), a 2-inch rail moulding, 4-inch
stiles and rails, 16-inch panels, and a 6-inch baseboard because tall wainscot wants a tall base; a
3-inch moulding runs where the walls meet the ceiling. On the side walls the panels march toward the
eye and widen as they come. The floor is wide pine plank, 7 inches, running across the room and back
to the vanishing point; each plank breaks somewhere between 1 and 2.4 m and the joints never line up
from one plank to the next. It is all carved the same way as the window: the faces of the panels and
planks catch a little light and are cut back, and the joints and gaps are simply the night that was
left. The side walls are carved a touch lighter than the back wall, where the light from the window
grazes them. ROOM sets how much of it shows; 0 sinks the room back into the dark.

Nothing in the room is ruled. A ruled edge makes a technical drawing, not a print, so every edge —
panels, rails, planks, window panes, the plinth of the deck — is cut into short pieces, bowed once
along its length and rippled on top of that, with its ends still pinned to the corners and the
corners themselves nudged off true. The bow is up to 1.8% of the edge, never more than 0.7% of the
sheet, and follows HAND. The web's straight threads — radii, frame, mooring lines — bow the same way,
up to 2.5% of their length.

There is a window in the wall behind them, a Georgian sash, and its sill sits on the chair rail. The proportions are the ones joiners
worked to: the opening is twice as tall as it is wide, it splits into two sashes with the upper one
a little shorter, a glazing bar is 2.3% of the width (20 mm on an 870 mm window) and the meeting rail
4.5%. PANES sets how many panes run across a sash, and the rows follow from keeping each pane half
again as tall as it is wide — 1, 2, 3 and 4 give 1-over-1, 2-over-2, 6-over-6 and 12-over-12, all
real patterns. Only the glass is carved. Seen from a dark room the frame sinks into the wall and the
bars stand black against the moonlit panes, so the bars are simply the night that was not carved.
The glass stops short of paper so that the figures stay the brightest thing on the sheet. WINDOW
sets the height as a share of the wall.

In front of them stands a DJ's turntable, drawn to the dimensions of a Technics SL-1200: a 453 ×
353 × 162 mm plinth, a 332 mm platter, a 302 mm twelve-inch record with a four-inch label, the
platter centred 178 mm in from the left and 176 mm back from the front, and a 230 mm tonearm pivoting
at the back right that sets the stylus 118 mm out from the spindle. It stands on the floor and is
seen with the same eye as the room, so FOV works on it too: the top face narrows toward the back into a trapezoid whose
edges run to the floorboards' vanishing point, the front face is a plain rectangle because it faces
the wall square on, and the sides don't show because the eye is straight in front of it. It is
bigger than the real thing — DECK fixes the width of the front edge and the whole machine is scaled
up to match — but every proportion inside it is the SL-1200's. It is printed after the figures because a DJ
stands behind the decks — and since carving paper only leaves paper, the plinth first inks over its
whole footprint and is carved back from there, which is what lets it hide the hem. The plinth top is
silver and carved, the front stays dark, and the silver tonearm is carved too, so it reads across
the black record. The label is half coloured so the turn shows; it goes round a whole number of
times a loop (SPIN — at a two-second loop, 1 is 30 rpm, near enough to 33⅓; negative runs it
backwards). The light the grooves catch does not turn with it: on concentric grooves the highlight
is a band through the centre along the plane that holds the light and the eye, and the window is
behind, so it stands front to back and stays put while the record spins under it. DECK sets the
width, and each roll varies it by up to 15% either way, the way the figures vary, so no two sheets
put the same deck in front of them; it never grows past the margin. 0 takes it away, as WINDOW 0
takes the window.

A smaller web hangs in the top corner opposite the big one (COBWEBS): 40 cm across, with seven or
eight radii and only three turns on a finer thread — spin it as densely as the big web and it reads
as a white dot.

Up in a ceiling corner hangs a whole orb web — the corners where nobody reaches are where webs
collect, and the lower corners belong to the decks and the figures. It isn't drawn either, it is
built the way an orb weaver builds: radii run out from the hub all the way round, not quite evenly;
the hub sits high, because a spider runs downhill faster, so the upper radii are about three
quarters the length of the lower ones; the middle is left clear for the spider, and outside it the
capture thread runs round, sagging inward between each pair of radii under its own weight, the
turns not quite evenly spaced because a web is spun and not ruled. A taut frame thread joins the
tips of the radii, and three mooring lines tie the frame to the two nearest walls and into the
corner — without them it is a target, not a web. The threads are about seven tenths of a
millimetre — a Riso master will not hold a line much finer than that — and they carve the night
rather than print on it, so a thread is light.

The whole web lives inside the margin: it stands a little off the corner so the mooring lines have
somewhere to run, and anything that would pass the margin is clipped there. WEB sets its size — at
1 the web is 80% of the sheet across — and THREADS how many radii, fewer than six stops reading as
a net. It hangs still while the figures move.

## Fair-weather cumulus (CLOUD)

This is the sky of a sheet that will get hills and trees under it; the clouds came first. Nothing in
it is drawn. Each rule is one the weather people measured.

**One base for every cloud.** A cumulus has a flat bottom, and every cumulus in the same sky has its
bottom at the same height: air rising off the same ground reaches its dew point at the same altitude,
the lifting condensation level. In temperate places that is 500 to 1500 m (BASE).

**Wider than tall, fractal round the edge.** Fair-weather cumulus (humilis) are wider than they are
tall. Their outlines are fractal — area and perimeter follow P ∝ √A^1.35 over three orders of
magnitude (Lovejoy 1982) — and the plate gives them three generations of bubbles, turrets on turrets.
Each big lobe is a ball the base plane cuts, its centre 0.3 of its radius above the base, so its
footprint is √(1 − 0.3²) ≈ 0.95 of its radius and the cloud sits on its base like a cotton ball on a
table. The bubbles are sunk half into the lobe beneath them; perched on its rim they close ranks round
a scrap of sky and the cloud gets a hole.

**Many small, few large.** Cloud widths follow a power law: the number of clouds of width L goes as
L^−1.66 (Wood & Field 2011). The smallest here is 300 m; SIZE sets the largest.

**Cover in oktas.** Observers count cloud cover in eighths of the sky, and so does OKTAS: 1–2 is few,
3–4 scattered, 5–7 broken, 8 overcast. Clouds are added until they cover that share of the sky.

**Perspective.** We stand on the ground and look at the horizon, 78% of the way down the sheet (the
hills will stand below it). Clouds are spread evenly over the ground, so there are more of them the
farther you look; the far ones shrink, their bases settle toward the horizon, and they sink into
the air (HAZE). The base is the footprint of each lobe seen from below — a level disc at height h seen
from d away flattens by h/d — so the nearer a cloud, the thicker its shaded underside.

**Light.** The sun is up to the left. A cloud is sky carved back to paper; the side turned from the
sun is whatever the cloud doesn't cover when you slide it toward the sun, printed lightly, and the
base is printed darker. Shade on a cloud is lit by the sky, so it is printed in the sky's ink. The
sky is deepest at the zenith and pales toward the horizon (SKY).

**Boil.** Cumulus tops boil. Every bubble swells and settles on its own beat, a whole number of times
a loop (BOIL). The far clouds that come out only a few pixels wide are gathered by distance and printed
together, which keeps a sheet near 30 ms.

## A dandelion clock (SEED)

One dandelion head gone to seed, standing on a long thin stalk against a sky that is darkest at the top
and pales toward the ground (DARK, darkest by default). The proportions and
the feel follow the dandelions of picture books and book covers: a small head, a stalk a thirtieth of
the head's width, every pappus reading as its own white star with sky between them, and a small brown
knot of seeds in the middle. What sits inside the head is built from the rule the plant follows and the
plant's own measurements.

**The head.** The seeds sit round the receptacle in a ball, placed the way a sunflower places its
seeds: each one turned the golden angle (137.5°) from the last, so no two ever line up and they spread
evenly over the whole ball (SEEDS, 52 by default — fewer, denser pappi lock into a lattice the way the
illustrations show).

**One seed.** An achene 4 mm long set in the receptacle, a slender beak 8.5 mm long above it, and on the
beak's tip the pappus: a disc 13.8 mm across of filaments from one point, each 16 µm thick, the disc
about 90% empty. The air that slips through those gaps forms a vortex ring that stands clear above the
pappus and holds the seed up (Cummins et al., Nature 2018). The pappus is a shallow umbrella, its
filaments rising 30° toward the beak's tip, so the pappi round the edge of the ball, seen side on, open
into fans pointing outward and the ball's outline bristles like a fringe. A real pappus has about a
hundred filaments; printed at that count the ball fuses into a white disc, so the default is about half
(FILAMENTS 48) — each pappus a dense brush of a star — and a hundred is one turn of the knob away. SIZE sets the width of the head;
everything inside it keeps these proportions.

**Printing it.** It is printed like a print — each layer laid flat and separately, no blending tone.
Look closely at an illustrated clock and each pappus is a translucent disc, sky showing between its
filaments, with bright filaments over it and a bright point where they meet; where neighbouring discs
overlap they brighten into lenses, and those lenses draw a lattice over the whole ball. So each pappus's
disc — the outline through its filament tips — is carved out of the sky on its own and lightly, the back
ones lighter still, and the overlaps come up brighter by themselves. The filaments go over the discs as
lines carved clean to paper, and the beaks as white spokes from the receptacle to each pappus. The
filaments are brushed, not ruled (HAND): their spacing bunches and opens, their lengths are ragged and a
few break off short, and each bends a little — so every pappus has a frayed edge and the ball's outline
bristles like a feather; at HAND 0 they are the spokes of a wheel. Tip dots, to catch the light at each
filament's end, were tried and filled the gaps that make the lattice. The
halftone prints the sheet in 9-pixel cells, so anything finer than that, printed lightly, dissolves into
the dots; only paper carved clean skips the screen and stays sharp. (Measuring the filaments' density
and cutting it into flat steps was tried first: at two steps the lattice washed out into one white, at
three the ball went grey.) The receptacle and the achenes on it are printed last, since they show
through a pappus that is 90% empty: a pale tan knob — the warm drum heavy, the darkest drum light —
ringed with darker spikes, which are only the front achenes and only the 2.5 mm of each that clears the
receptacle, in the darkest drum heavy over the warm one.

**The stalk.** It runs up into the middle of the head, a thirtieth of the head's width across. That
is thinner than a real scape (3–5 mm); a head looks larger than it is from its spread of filaments,
and the illustrations draw it at this ratio. It is cut as a band by hand rather than stroked, bends a
little on its way down, and outside the ball it is knocked out of the sky first — printed over the
ground it sinks into it in some palettes — then printed in the light drum with the darkest drum over
it, which makes green the way Riso does, without a green ink; the third that faces away from the light
gets the dark drum once more. Inside the ball it only shows faintly through the pappi.

**Wind.** GONE strips a cap of the ball on the upper right, as a share of its surface, and shows the
receptacle there; by default the head is whole. The head nods on its stalk about the stalk's root
(SWAY).

## A coral reef (REEF)

A diver swims along the front of a reef and looks sideways across it. Water fills the sheet and the
light comes down from the surface. Nothing here is drawn: the reef is built from the rules corals grow
by and from what reef surveys measure.

**The framework.** Dead coral cemented into rock rises in ridges with sand in the channels between them
— spurs and grooves. Spurs stand 8 m apart crest to crest with grooves 1–2 m wide (Goreau 1959, the
buttresses off Jamaica), and their crests are rounded, a |cos| profile across them (Rogers et al. 2013).
Spurs run out to sea, so to a diver swimming along the reef front they cross the view and step back
one row at a time. The rock is the colour of nothing alive: a blue darker than the water, with a trace
of the pinkish coralline algae, and the far rows sink into the water. The sheet is cut into slices from
back to front, evenly spaced on the sheet, and each slice fills only where rock rises above its line of
sand, so a nearer ridge covers the foot of the one behind. EYE sets how far above the crests the eye
floats, LOOK how far it looks down.

**Cover and sizes.** How much of the bottom is live coral is what a surveyor measures along a line,
sand and all; healthy reefs sit at 40–50% (COVER, 45 by default — Gardner et al. 2003, Bruno & Selig
2007). Corals grow on rock, so nearly all of them stand on the spurs and only a few on the sand.
Colony diameters are log-normal (Bak & Meesters 1998): the logarithm of the diameter is normally
distributed, median 30 cm, standard deviation 0.28 in log10 (Medina-Valmaseda et al. 2020). BRANCH,
TABLE, BRAIN and FAN are each form's share of the cover, as surveys record cover by life form (English,
Wilkinson & Baker 1997); since a table covers nine times what a branching colony of the median size
does, tables are fewer.

**Branching.** Staghorn coral. Each axis grows straight and throws side branches at 60–90° from its
nodes, and the side branches grow the same way. Branches are cylinders 1.2 cm across (0.25–1.5 cm) and
don't taper; colonies are about half as tall as they are wide (27–80 cm tall, 50–175 cm long). A branch
that would leave the colony's envelope stops there. The last 1.5 cm of every branch is pale — the
growing tip, with few algae in it yet (Acropora Biological Review Team 2005; Agudo-Adriani et al. 2016).
Colonies that take a harder surge grow denser, with shorter internodes and more side branches
(SURGE).

**Tables.** A flat plate on a thin stalk. However wide the plate, its top sits 0.43 m above the
bottom — the plate widens and the stalk only thickens as the colony grows (Kerry 2015, Ferrari et al.
2017). Tables average about a metre across. From above, the branches the plate is woven from show as
grain running out from the middle to the rim; the underside and the stalk are in deep shade, and so is
the bottom beneath.

**Brain corals.** A hemispherical dome covered in meandering valleys, one valley and one ridge together
1–2 cm across (Corals of the World). The meanders are laid by a Turing rule — each point is pushed up by
its near neighbours and down by its farther ones, and the two pulls sort a field of noise into valleys of
even width (Turing 1952). For each pixel of the dome the ray is followed back to the dome's surface, and
the maze is unrolled from the crown by distance along the surface; the side of the dome turned away from
the sun gets a flat shade.

**Sea fans.** A net spread in one plane. A few thick axes spread from the holdfast, and the branchlets,
one every 3–6 mm, fuse into a mesh (Bayer 1961); here the mesh is a relative-neighbourhood graph of
evenly scattered points, so its openings close as polygons. The fan faces the direction the surge moves
in (SWELL), small fans any way and taller fans more squarely (Wainwright & Dillon 1969). The surge rocks
the fans once a loop.

**Water.** A black target disappears into the water at 4.8/c, c being the beam attenuation (Zaneveld &
Pegau 2003), so CLEAR, the horizontal visibility, sets c, and contrast falls as e^(−c·r). Nothing
finer than the halftone is printed lightly: every colony and every slice of rock is knocked out to
paper and printed in its own colour, and the water between it and the eye is laid over it as a veil.
Farther away its own colour thins and the veil thickens until the two are one. Water eats red first
(pure-water absorption, Pope & Fry 1997), so with distance the warm drum thins faster than the yellow
one, and the blue only as fast as the contrast. Anything fainter than 35% contrast is printed as a flat
silhouette in five layers. The water is brightest looking up and darkest level with the eye (Tyler
1958); the sand is lit and warm, and sinks into the water with distance.

**Light.** Sunlight entering the water bends to within 48.6° of the vertical. Its beams are parallel,
so on the sheet they fan out from the refracted sun, and as the waves gather and scatter the light the
beams flicker — ±94% at 4 m, ±10% at 29 m (Hieronymi et al. 2012); here ±60% (RAYS).

## What doesn't belong here

Two plates were built and taken down again, and they failed the same way.

FRIEZE drew bands of ornament — the seven frieze groups, twenty motifs from the ornament handbooks,
rails, a border with corner blocks. WHALE drew a whale in the sea — a silhouette against light,
with the water laid like JELLY's. Both were built from real references and both were measured
against them. Neither was good.

What they have in common is that the form came from drawing, not from printing. Every plate that
holds up here hangs on something the press does — overprint making a third color (GARDEN), gradation
and knockout (MOON), the halftone itself (MEDIUM), a symmetry that the stamping performs (KALEIDO),
emitters stacked the way an effect artist stacks them (METEOR). The rule makes the form, and riso
makes the rule visible. Ornament and depiction are the other way round: the form is drawn first and
the press only reproduces it, so the sheet stands or falls on draughtsmanship, and a mediocre drawing
is not rescued by being printed well.

So: no plates whose subject is a drawn thing, and no plates whose quality is a matter of taste in
ornament. If a new plate can't be stated as a rule the press carries out, it doesn't belong here.

## A shooting star (METEOR)

A shooting star cuts across a dark sky, built the way an effect artist stacks emitters. The
reference was a breakdown of an anime-style effect, one emitter per layer, so the plate is
written as the same stack, printed back to front. Nothing is outlined.

| Layer | What it draws |
| --- | --- |
| Dust | The far sky's stars, sliding toward the tail as the camera follows the meteor, fading in and out at the ends of their path. They lie at different distances (DEPTH): a near one is bigger, brighter and faster and drags a long tapering tail behind it (TRAIL), a far one is a small dim point that barely moves, so the sky reads like a meteor-shower photograph, every streak parallel. A star crosses the page a whole number of times a loop (one to three), so the loop closes. Faint specks in the far sky (DUST) |
| Glow | One soft layer of light around the beam (GLOW) |
| Second beams | After the breakdown's Laser_Second (0:30–0:33), read frame by frame: bands that gather to a point at the head and run beside the laser, bowing out to one side and back, some rippling toward their end. They are drawn anew every beat from that beat's own random stream, so the loop still closes. They are printed in the dots' dark, the secondary colour, and stay on the beats when the laser is off. They reach as far as the laser. BEAMS is how many, and it is 0 by default |
| Laser | A simple meteor tail after the breakdown's Laser_Main: one band in the light drum that swells just behind the head and thins toward its end (WIDTH). Like the breakdown's, it can flicker: FLICKER is the share of beats it is off, decided by that beat's own random stream so the loop still closes, and its glow goes with it. By default it never goes off (0). Every beat its thickness and its reach shift a little (VARY, ±15% and ±12% at 0.5), drawn from that same beat's stream, so it is never the same band blinking on and off; the glow keeps the knobs' own shape, since a blur that soft shows no such shift. LENGTH sets how far it reaches, as a share of the beam's LENGTH, without moving the head (LASER card: WIDTH, LENGTH, VARY, FLICKER, GLOW) |
| Dots | Flat dark ellipses after the breakdown's Dots emitter. Every one is born big and long right behind the head, then flows down the beam, shrinking and rounding until it ends as a circle. Each dot pivots on its leading tip at full size, so it shrinks into that point and keeps its pace as it rounds; pivoting on the head-side end dragged the shape back and made it seem to slow down. So new ones always overlap into one dark lump behind the head, and a string of ever smaller beads runs along the beam. It takes an effects emitter's values: spawn rate (FREQ, per second), lifetime (LIFETIME, seconds, snapped to an even share of the 2 s loop so the loop closes), how fast they fly, in which direction, how that speed changes and what pulls them (VELOCITY the speed, ANGLE the heading away from the beam's axis in degrees, ACCEL speeding up along that heading over life — negative slows down — with the distance covered kept the same, DRAG, GRAVITY a constant pull that grows with the square of age and bends the bead line into a parabola, TOWARD its direction in degrees, 0 straight down the page), start size and size over life (SIZE, SHRINK), alpha over life (FADE) and how much of the spawning is gathered into one burst (BURST: 0 spawns evenly, 1 gives every dot the same age, so a whole puff is born at once and dies together), elongation (STRETCH) and sideways spread (SCATTER). FREQ × LIFETIME dots live at once, up to 60. These knobs sit in a DOTS card of their own. Dots with the same FADE step are drawn in one path, in eight steps, so overlaps don't print darker. Printed over the main beam, since the beads line up with it |
| Tail stars | Four-point stars the head throws back, after the breakdown's Stars emitter. Each leaves the rim of the head's circle, flies down the beam and shrinks, trailing a hairline tail back toward the head that is longer the faster it flies. Yellow, pink, blue or white, one color each, and about one in ten is the dots' dark instead, so dark stars sit among the bright ones. The same emitter values as the dots plus TRAIL, the tail's length, in a STARS card of their own |
| Second spike | After the breakdown's Spike_Second, where thin navy and purple spikes stick out behind the bright one in the colour stage: a second fan behind the head, printed in the dots' dark, the secondary colour. Its body is no bigger than the head's smallest body (SIZE 1), so it always hides behind the head and only its longer blades show. It has its own random stream and its own FLIP, its blade length changes each drawing (VARY), and its nose is kept blunt so it tucks behind the head (SECOND card: SIZE, POINTS, STRETCH, SPREAD, VARY, FLIP; SIZE 0 turns it off; it is half the head's floor by default) |
| Head | After the breakdown's Spike_Main and its final composite: a heart in the accent ink, the head's core, cut round by hand rather than struck with a compass — its edge is redrawn with the fan each drawing, off its own random stream so the fan itself is untouched — sits fixed on HEAD 0, and blades fan out from it toward the tail, with the core as the fan's pivot. The fan is built anew FLIP times a loop (12 by default, apart from BEAT), the way that emitter picks a random texture almost every frame. Blades spread like the ribs of a fan, from half of POINTS (rounded up) to POINTS of them, the count changing each drawing: the middle ones are longest, deep notches part them, and a short nose leads the way. The nose is cut into a polygon that goes back and forth between a pentagon and a heptagon from drawing to drawing: two points half the shorter edge back along each side, and one to three between them, spaced along a curve that bulges toward the old tip, so the front of the head is never a sharp triangle; the blade tips stay pointed. The fan opens by SPREAD (140° by default), each drawing up to 30% narrower or wider (narrower ones have longer blades), leans a little to one side, and turns a little about the core. The front is two tangent lines from the nose to the ring around the core, and NOSE is the angle between them (137° by default): small makes a long, sharp nose. The flanks are tangent to the same ring, so each corner sits where a nose tangent meets a flank, and SPREAD and NOSE never pull on each other. Each blade is uneven on its own. The core never moves, and its size changes per drawing on its own (0.16–0.26 of SIZE). The fan's floor is the size that still wraps the largest core with a yellow rim — its outline stays 1/0.85 of that core's radius from the center — and each drawing only scales the whole fan up from there (VARY; 1–1.6× at 0.5), apart from the core, so fan and core never swell and shrink together as one lump. Nothing blinks: the fan is always the light drum and the core always white, lightly tinted by the palette (see White in the table below). The core is cut out of the fan and printed on its own. A soft glow lies around the fan (GLOW) (SPIKE card: SIZE, POINTS as the most blades, STRETCH, SPREAD, NOSE, VARY, FLIP, GLOW) |

The head is anchored on the head's origin, HEAD 0, where the beams start. The core sits on it and the
fan's nose just ahead of it, and the dots and tail stars are born on an
unseen circle around it. The beams don't grow and shrink, so scaling about any other point slides
the head back and forth along the beam. Each drawing's fan comes from its own random stream
seeded by the drawing's number, so a drawing always gets the same fan, `t = 1` matches
`t = 0`, and the layout of every other layer is untouched. GUIDES marks that pivot, the axis, the
beam's outline and where the dots and the stars run out.

Nothing the head throws flies forward. The dots and tail stars leave toward the tail; a dot at full
size just touches HEAD 0 with its head-side end, and a star's tail stops short of it. That is kept
by the shape of each piece, not by clipping pieces at a line: clipping piled them up against the
line into straight, cut-looking edges.

The sky is light, not scenery. The darkest drum fades from the top down and the palest lies at
about half that, so every palette gives its own sky: blue, green, teal, coral, red or pink.
Nothing in it holds a place: the camera follows the meteor, so a stain that sits still would read
as ground passing by. Up to 0.41.0 the two paler drums bled in big soft stains there; 0.42.0 drops
them. The
meteor's light is the drum farthest from the darkest one, yellow under a blue sky and the bluest
drum under a coral, red or pink one, so the meteor changes with the palette too. Whatever glows is
carved out of every drum and printed in its own ink, which keeps the meteor clean over the mottled
sky. Any drum left over is the accent. Yellowness is the lower of red and green minus blue, because
an average lets orange beat yellow.

| Light | How it is printed |
| --- | --- |
| Yellow | Carve every drum, then print the light drum |
| Blue | Carve every drum but leave some, a paler sky |
| Pink | Carve every drum and print the accent; with two drums, leave some of the sky instead |
| White | Carve every drum, then tint it lightly (40%) with the accent, or with the darkest drum when there are only two, so the whites change with the palette too. The head's core takes the same ink at 80%, so it reads as that ink |
| Dark | Fill the darkest drum, overprint the accent and carve the rest; a yellow accent is left out, since it would turn the dark olive |

A thin layer of the yellow drum over the sky gives the bluish gray of the reference.

The star stays put and the world streams past, as if the camera follows it: even the far sky's
dust slides toward the tail, half a page a loop, and whatever flows tapers to nothing at both
ends so the wrap never shows. The dots and tail stars are emitters: each one is
reborn a whole number of times per loop, which is why their lifetimes snap to an even share of
the loop. The glow around the beam is the blurred shape from `src/blur.js`; it depends only
on the shape knobs (LENGTH, ANGLE, CORE), not on the roll, so it is made once and kept. Everything is drawn in full
every time, and the knobs only decide how much of it prints.

### Drawn like an effect, not like a photograph

Anime effects animation is not smooth. It is built from a few iconic shapes, flat colour, snappy
timing on twos or threes, and impact frames that break continuity for one or two frames. METEOR
follows two of those rules, which is what separates it from a comet photograph. It had impact frames
too (FLASH) and dropped them in 0.41.0.

| Rule | Here |
| --- | --- |
| Timing on twos or threes | BEAT splits the loop into that many drawings, and nothing is inbetweened. At 12 a drawing holds for four of the loop's 48 frames; at 48 the plate redraws every frame and the effect goes soft. The sheet rate still decides which frames print, so at 8 sheets a second a drawing shows for three or six |
| Flat colour, not gradients | The laser is one flat face in the light drum. Only one soft glow layer is laid under it, so it doesn't read as cut paper |

The beat is a floor of the loop's time, so `t = 1` gives the same drawing as `t = 0` and the loop
still closes.

## Shape vocabulary

The style mixes two families of shapes.

- **Organic**: blobs, leaves, drops, torn plates. Shapes no ruler or compass touched.
- **Memphis**: waves, zigzags, sparkles, spirals, diamonds. The 1980s scatter.

If a plate uses type, small text prints only on the palette's darkest drum. Small yellow text
is unreadable, even on white paper.
