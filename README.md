# riso-graphic

A sample sheet that imitates risograph printing on screen. Two or three spot inks share one
sheet. Each drum is screened at its own angle, the plates slip a little out of register, and no
area quite covers the paper.

The sheet is square, 1080 × 1080. Every plate draws in those coordinates, and when the paper
hangs smaller, the scale shrinks the drawing without the plate knowing. A vertical position
pinned in pixels would break every plate the moment the format changed, so plates place things
by fractions of `height` wherever they can.

Motion is the default. The page starts playing as soon as it opens.

The hung plates are **RIPPLE** · **MOON** · **GARDEN** · **JELLY** · **CELL** · **CHLORO**.
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

If you change the press, measure it side by side with the old one. The method is in
[bench/README.md](bench/README.md) (Korean).

```bash
node bench/serve.mjs
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
colors, not one: two inks make three colors, three inks make seven. MEDIUM and GARDEN show
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
same angle make moiré. Spread apart, the overlaps form rosettes instead. MEDIUM shows this.

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
- The glints are `sin(2π(t + phase))`.

**Rule two: the number of random draws must not depend on `t`.** MOON skips stars that fall
near the moon. The moon sways, so a different set of stars was skipped on each frame. Skip one
star and every star after it gets different numbers, and the whole sky changes. Draw
everything first, then decide what to skip.

Break either rule and the picture jumps between the last frame and the first. Check seams by
measuring, not by eye. There are two checks.

**Print just before the end.** Print a sheet at `t = 1 − 1e−9` and compare it with `t = 0`. If
every period is whole, the two are the same sheet. Every hung plate passes to the pixel, except
JELLY, which differs in one byte from floating-point rounding. This is the check that caught
RIPPLE's 1.5 turns, with about 34,000 bytes different.

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
fall away after it, as CHLORO's do, are the motion's own speed, not a break.

### Printing while playing

Printing one frame used to take longer than the playback budget allows, so the film was baked
first and the projector only flipped through it. Almost all of that time went to halftoning
and multiplying. That per-pixel work moved into the shader, and a full-size sheet now costs
less than a tenth of a frame's budget. Nothing is baked: every frame is printed as it plays.

| One sheet | Canvas 2D | WebGL2 |
| --- | --- | --- |
| RIPPLE, 1080 | 28 ms | 1.3 ms |
| MOON, 1080 | 97 ms | 1.8 ms |
| GARDEN, 1080 | 35 ms | 1.4 ms |
| JELLY, 1080 | 123 ms | 3.8 ms |
| CELL, 1080 | 72 ms | 1.9 ms |
| CHLORO, 1080 | 71 ms | 2.5 ms |
| One contact sheet | 126 ms | 15 ms |

Where one WebGL2 sheet's time goes:

| Stage | Time |
| --- | --- |
| Composing the plate | 0.04–1.3 ms |
| Rasterizing and uploading separations | 0.6–1.5 ms |
| One shader pass, by GPU timer | 0.1–0.3 ms |
| One frame's budget at 24 fps | 42 ms |

These are means on an M2 Max. Each sheet's time includes waiting for the GPU to finish, forced
by reading back one pixel. Without that wait, you time only the composing. Boil barely changes
the numbers. Most of the time now goes to moving separations to the GPU, not to halftoning.

The Canvas 2D press worked harder where a sheet carried more ink. RIPPLE and GARDEN have since
lost their background washes, and the old press got about twice as fast on both. The first run
measured 59 ms and 71 ms. The raw data and side-by-side images are in
[the six-plate run](bench/results/2026-09-17-canvas2d-vs-webgl2-six-plates/report.md) and
[the first run](bench/results/2026-09-17-canvas2d-vs-webgl2/report.md).

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
roll's random generator. `page` carries the size, margin, palette, the time `t`, and this
plate's knob values in `knobs`. A separation offers `flood`, `shape`, `line`, `disc`, `ring`,
`block`, `ramp`, `text`, `knockout` and `draw`.

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
| RIPPLE | RINGS · REACH · EASE · ARCS · WEIGHT · SQUASH · DOT · OFFSET |
| MOON | MOON · HORIZON · RISE · SKY · STARS · GLINTS |
| GARDEN | STEMS · REACH · LEAF · SWAY · SIDE · BERRIES |
| JELLY | COUNT · FIELD · BELL · DEPTH · PULSE · THROB · DRIFT · TENTACLES · TRAIL · WOBBLE · ARMS · MOTES · DEEP · STAIN · GAP |
| CELL | COUNT · FIELD · SIZE · DRIFT · WOBBLE · DIVIDE · TINT · GRANULES · DEBRIS · VIGNETTE · RETICLE · FRAME |
| CHLORO | COUNT · FIELD · SIZE · LENS · GRANA · STACK · LAMELLAE · DIVIDE · DRIFT · WOBBLE · TINT · STROMA · DEBRIS · VIGNETTE · RETICLE · FRAME |

Don't confuse the CELL plate with the CELL dial. The dial sets the halftone cell size for every
plate. The plate is the microscope sheet.

### A knob can be a seed

**FIELD** on JELLY, CELL and CHLORO is a seed, not an amount. The layout comes from this
number, so dragging it redraws only the arrangement while the ink and the paper tooth stay the
same. NEW ROLL, by contrast, changes everything. FIELD lets you keep a print state you like and
browse compositions.

FIELD is mixed with the paper's roll, so NEW ROLL still changes the layout. The same roll with
the same FIELD always gives the same layout. JELLY mixes them like this:

```js
const layout = makeRng((page.seed ^ Math.imul(knobs.field + 1, 0x9e3779b9)) >>> 0);
```

### Strength and speed

When you turn a motion into knobs, keep strength and speed separate. JELLY's bell has PULSE for
how hard it beats and THROB for how many times it beats per loop. One big, slow beat and many
small shivers can't be expressed with a single value.

There are two limits:

- A knob that counts **times per loop** must be an integer. With THROB at 2.5, the bell doesn't
  return to its starting shape at the end of the loop.
- RIPPLE's **RINGS** reverses the ripple once rings × frames held ÷ 48 exceeds 0.5. At eight
  sheets a second the limit is eight rings.

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
| BOIL | HELD, TWOS or EVERY |
| CONTACT SHEET | PLATES shows every hung plate, INKS the nine palettes, FRAMES one loop |
| HEADLINE | Appears only when a plate that takes a title, such as POSTER, is hung |
| INKS | Nine palettes |
| DRUMS | Two or three colors |
| CELL | Halftone cell size |
| GRAIN | Ink ceiling and mottle. At 0 the dots are clean |
| REGISTER | Misregistration, in pixels |

Every setting goes into the URL, so a sheet you like can be kept as a link. `SPACE` plays and
stops, `N` rolls, `G` toggles the contact sheet and `S` saves.

## How to judge

Looking good is not the same as being right. Each question has a place to check it.

| Question | Where to look |
| --- | --- |
| What colors overlaps make | GARDEN, and CHLORO's green |
| How to make light things on a dark ground | JELLY |
| Tone steps and knockouts | MOON |
| Whether any plate breaks in this palette | CONTACT SHEET · PLATES |
| Whether a plate survives all nine palettes | CONTACT SHEET · INKS |
| Whether the loop flows, and where it goes empty | CONTACT SHEET · FRAMES |
| Whether a seam really joins | `t = 1 − 1e−9` printed against `t = 0`, then neighbor steps within ±2σ |
| Whether a new press prints the same sheet, and how much faster | `bench/`, against an old commit on one page |
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
| `src/scope.js` | The microscope field that CELL and CHLORO share: light falloff, floating debris, the reticle |
| `src/type.js` | Measuring text, line breaks, fitting type to the plate |
| `src/plates/` | The plates, one function per sheet. RIPPLE is the model for using time |
| `src/main.js` | Dials, contact sheet, playback clock, URL, PNG |
| `serve.mjs` | Static server. Stamps module URLs with the boot time so no stale module survives a reload |
| `bench/` | The bench that measures two presses side by side, and its results |
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

## Stains and gaps (JELLY)

Light things rise through dark water. There is no white ink, so everything that glows is
carved out. The plate lays the water, carves out the bell shapes, and puts the lightest drum
only inside them. Painting light ink over the water is impossible, because multiply only ever
darkens.

To look like rising, the water has to move, not the jellyfish. A jellyfish that really rose
would have to jump back to its start at the end of the loop. Motes drifting downward say the
same thing and still loop.

A swarm is spread out in depth. Farther ones are smaller, fainter and higher up. The far ones
are printed first and the near ones cover them, so the near ones' knockouts erase what's behind
and occlusion comes for free.

The water is not a single color. The two lighter drums bleed in large stains (STAIN), so the
water shows third colors such as green or purple. The stains depend on the roll, not on time,
and use their own random stream, so they don't disturb the swarm or the motes. JELLY prints
full-bleed, without the round frame.

Each jellyfish is carved out of the water a little wider than its body (GAP). Even with perfect
registration, a thin line of paper stays around it, so water and body printed with the same
drum still read as separate things. It's the reverse of a trap, which in printing overlaps two
plates slightly so misregistration shows no gap. Tentacles are thick at the root and taper
toward the tip, and half of them have a white core carved down the middle.

## Under the microscope (CELL and CHLORO)

Both plates are microscope slides. The round frame is the eyepiece's field of view, and outside
it is paper. The field is brightest in the middle and dims toward the edge, and a faint reticle
crosses it. `src/scope.js` draws the shared field. Its light goes down before the specimens.
Debris and the reticle go on top of them, and the round frame comes last. Debris is drawn from
the random stream after the specimens, so changing its count doesn't move them.

**CELL** is stained cells. The cytoplasm is split between the middle and lightest drums, so a
third color appears where two cells lean on each other. Membranes, nuclei and small organelles
are on the darkest drum. Vesicles are white holes carved out of the cytoplasm. The nucleolus is
carved only from the darkest drum, so the cytoplasm color shows through it. A dividing cell
fills both of its bodies in a single path. Filled separately, the overlap in the middle would
print twice as dark. Cells drift along small closed paths, membranes ripple in place,
organelles circle inside, and dividing cells pull apart and come back together.

**CHLORO** is chloroplasts. A chloroplast is not a cell: it has no nucleus, its body is a flat
lens, and its inside is layered membrane.

- **Envelope.** A double membrane: the outer line dark, the inner line thin and light,
  following the outer one.
- **Lamellae.** Stroma lamellae run the length of the body from end to end. They gather toward
  the ends, which gives the spindle look.
- **Grana.** Stacks of thylakoid discs, like stacked coins, sitting on the lamellae. Each disc
  is a short bar with round ends. Each stack sits two lamellae over from the one before it, so
  neighbors don't pile up. With a coarse screen the stacks merge into dark clumps, which is how grana look under a
  light microscope.
- **Stroma.** Ribosome specks, dark plastoglobuli, and starch grains carved out of every drum
  as white ovals. The grains get a faint rim, because without it a white dot reads as a glint.
- **Division.** A dividing chloroplast pinches at the waist into a dumbbell and tightens and
  relaxes once per loop.

There is no green ink. The plate looks at the palette and fills the stroma with the two drums
whose overlap comes out greenest, usually a yellow and a blue. When no pair makes green, as
with the two-drum run of MUSTARD × LEMON, it uses the greenest single drum.

Stack heights, stack positions and any discs a starch grain pushes out are decided on the
resting shape. Deciding them on the moving shape would make discs blink in and out from frame
to frame. Each chloroplast draws the same number of random values whatever the knobs say, and
the knobs only decide how many of the drawn parts are used.

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

## Shape vocabulary

The style mixes two families of shapes.

- **Organic**: blobs, leaves, drops, torn plates. Shapes no ruler or compass touched.
- **Memphis**: waves, zigzags, sparkles, spirals, diamonds. The 1980s scatter.

If a plate uses type, small text prints only on the palette's darkest drum. Small yellow text
is unreadable, even on white paper.
