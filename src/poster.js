// One sheet, printed the way a Riso prints it.
//
// The composition is laid out once, as a list of marks each tagged with the drum that
// prints it. Then the sheet goes through the press once per drum: a mask is drawn, the
// screen eats into it (grain.js), the drum's ink tints what is left, and the pass lands
// on the paper a pixel or two off register, multiplying into whatever is already there.
//
// Multiply is not a decoration here. It is the whole reason two drums look like three
// colours: yellow over cyan has nowhere to go but green.

import { makeRng, makeNoise } from "./rng.js";
import { makeFields, applyGrain, paperTooth } from "./grain.js";
import { PAPER, PAPER_SHADE, inksFor, inkIndex, luminance } from "./palette.js";
import * as shapes from "./shapes.js";

export const SHEET = { width: 900, height: 1200 };

const DISPLAY = '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Helvetica Neue", system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// The fields cost more than everything else on the sheet, and they depend only on the
// roll and the size — not on the grain dial. Kept, so dragging the dial is instant.
let cached = null;
function fieldsFor(seed, width, height) {
  if (cached && cached.seed === seed && cached.width === width && cached.height === height) return cached.fields;
  const fields = makeFields(width, height, makeRng((seed ^ 0x5bf03635) >>> 0));
  cached = { seed, width, height, fields };
  return fields;
}

// -- text ------------------------------------------------------------------------------

function tracked(context, text, x, y, spacing) {
  let cursor = x;
  for (const character of text) {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + spacing;
  }
}

function trackedWidth(context, text, spacing) {
  let total = 0;
  for (const character of text) total += context.measureText(character).width + spacing;
  return total - spacing;
}

function wrapLines(context, text, maxWidth) {
  const lines = [];
  let line = "";

  const flush = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    // A word wider than the column has to break inside itself, or it would sit there
    // overhanging the margin. Korean runs long without spaces, so this is the common case.
    if (context.measureText(word).width > maxWidth) {
      flush();
      let piece = "";
      for (const character of word) {
        if (piece && context.measureText(piece + character).width > maxWidth) {
          lines.push(piece);
          piece = character;
        } else {
          piece += character;
        }
      }
      line = piece;
      continue;
    }

    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      flush();
      line = word;
    } else {
      line = candidate;
    }
  }
  flush();

  return lines.length ? lines : [""];
}

// The headline is set to whatever was typed, so the type has to come down to meet it
// rather than the text being cut to fit the type. The largest size that still lands
// inside the column in at most maxLines wins.
function fitHeadline(context, text, maxWidth, maxLines, largest, smallest) {
  let fallback = null;

  for (let size = largest; size >= smallest; size -= 3) {
    context.font = `700 ${size}px ${DISPLAY}`;
    const lines = wrapLines(context, text, maxWidth);
    if (!fallback || lines.length <= maxLines) fallback = { size, lines };
    if (lines.length <= maxLines) return { size, lines };
  }

  return { size: fallback.size, lines: fallback.lines.slice(0, maxLines) };
}

// -- layout ----------------------------------------------------------------------------

function roundedPath(context, x, y, width, height, corners) {
  const [tl, tr, br, bl] = corners;
  context.beginPath();
  context.moveTo(x + tl, y);
  context.lineTo(x + width - tr, y);
  context.quadraticCurveTo(x + width, y, x + width, y + tr);
  context.lineTo(x + width, y + height - br);
  context.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  context.lineTo(x + bl, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - bl);
  context.lineTo(x, y + tl);
  context.quadraticCurveTo(x, y, x + tl, y);
  context.closePath();
}

// Rejection sampling, so the garnish never lands on top of itself.
function scatter(rng, count, bounds, spacing) {
  const placed = [];
  let guard = count * 40;
  while (placed.length < count && guard-- > 0) {
    const x = rng.float(bounds.x, bounds.x + bounds.width);
    const y = rng.float(bounds.y, bounds.y + bounds.height);
    if (placed.every((p) => Math.hypot(p[0] - x, p[1] - y) > spacing)) placed.push([x, y]);
  }
  return placed;
}

function layout({ rng, noise, inks, palette, headline, width, height }) {
  const ops = [];
  const on = (ink, paint) => ops.push({ ink: inkIndex(ink, inks), paint });

  // Inks sorted dark to light. Type goes on the darkest drum or it will not read on cream
  // paper; the pale drum is for the big quiet areas.
  const order = inks.map((hex, index) => [index, luminance(hex)]).sort((a, b) => a[1] - b[1]).map(([index]) => index);
  const dark = order[0];
  const warm = order[Math.min(1, order.length - 1)];
  const pale = order[order.length - 1];

  const margin = 78;
  const scratch = document.createElement("canvas").getContext("2d");

  // -- the frame: a band off the top edge, a block off the bottom ------------------------
  on(dark, (g) => g.fillRect(0, 0, width, 26));
  on(warm, (g) => {
    roundedPath(g, -40, height - 148, width + 80, 200, [130, 0, 0, 0]);
    g.fill();
  });

  // -- the strap line --------------------------------------------------------------------
  const strap = `RISO PICKUP — ${palette.label}`;
  on(dark, (g) => {
    g.font = `500 13px ${MONO}`;
    tracked(g, strap, margin, 104, 2.2);
  });

  // -- the headline ----------------------------------------------------------------------
  const { size, lines } = fitHeadline(scratch, headline, width - margin * 2, 2, 84, 44);
  const inkForLine = [dark, warm];
  lines.forEach((line, index) => {
    const y = 224 + index * (size + 16);
    on(inkForLine[index % inkForLine.length], (g) => {
      g.font = `700 ${size}px ${DISPLAY}`;
      g.fillText(line, margin, y);
    });
  });

  const ruleY = 224 + lines.length * (size + 16) - 30;
  const ruleWave = shapes.wave(margin, ruleY, width - margin * 1.9, ruleY, {
    amplitude: 7,
    cycles: 11,
    noise,
    wobble: 2.4,
    offset: rng.float(0, 50)
  });
  on(dark, (g) => {
    g.strokeStyle = "#000";
    shapes.strokePoints(g, ruleWave, 5);
  });

  // -- the hero ---------------------------------------------------------------------------
  // Three arrangements. Whichever the roll picks, the two big marks are placed so they
  // have to overlap: the crescent where the drums cross is the point of the sheet.
  const heroTop = ruleY + 64;
  const heroBottom = 872;
  const cx = width * 0.5;
  const cy = (heroTop + heroBottom) / 2;
  const kind = rng.pick(["sun", "cloud", "panel"]);
  const radius = 214;

  if (kind === "sun") {
    const rays = shapes.burst(rng, cx + 46, cy - 26, radius * 1.08, { spikes: rng.int(10, 14), inner: rng.float(0.6, 0.72) });
    const body = shapes.blob(rng, cx - 74, cy + 44, radius * 0.86, { lobes: 4, wobble: 0.16 });
    on(warm, (g) => { shapes.polyPath(g, rays); g.fill(); });
    on(pale, (g) => { shapes.splinePath(g, body); g.fill(); });
    const coil = shapes.spiral(cx + 132, cy + 96, 8, 58, 2.6);
    on(dark, (g) => { g.strokeStyle = "#000"; shapes.strokePoints(g, coil, 6); });
  } else if (kind === "cloud") {
    const back = shapes.blob(rng, cx + 62, cy - 18, radius, { lobes: 6, wobble: 0.26, squash: 0.88 });
    const front = shapes.blob(rng, cx - 68, cy + 40, radius * 0.92, { lobes: 5, wobble: 0.3, squash: 1.06 });
    on(pale, (g) => { shapes.splinePath(g, back); g.fill(); });
    on(warm, (g) => { shapes.splinePath(g, front); g.fill(); });
    const comb = shapes.wave(cx - 150, cy + 168, cx + 120, cy + 168, { amplitude: 16, cycles: 3.2, noise, wobble: 3 });
    on(dark, (g) => { g.strokeStyle = "#000"; shapes.strokePoints(g, comb, 7); });
  } else {
    const panel = shapes.patch(rng, cx - 210, cy - 180, 380, 340, 9);
    const bubble = shapes.blob(rng, cx + 122, cy + 104, radius * 0.7, { lobes: 5, wobble: 0.22 });
    on(pale, (g) => { shapes.splinePath(g, panel); g.fill(); });
    on(warm, (g) => { shapes.splinePath(g, bubble); g.fill(); });
    const zig = shapes.zigzag(cx - 168, cy + 196, cx + 40, cy + 196, 5, 15);
    on(dark, (g) => { g.strokeStyle = "#000"; shapes.strokePoints(g, zig, 6); });
  }

  // -- the garnish -------------------------------------------------------------------------
  const spots = scatter(rng, 11, { x: margin, y: heroTop - 30, width: width - margin * 2, height: heroBottom - heroTop + 60 }, 118);
  for (const [x, y] of spots) {
    const ink = rng.pick([dark, dark, warm, pale]);
    const kindOf = rng.pick(["sparkle", "drop", "leaf", "ring", "squiggle", "diamond"]);
    const scale = rng.float(0.8, 1.35);

    if (kindOf === "sparkle") {
      const r = 15 * scale;
      on(ink, (g) => { shapes.sparkle(g, x, y, r); g.fill(); });
    } else if (kindOf === "drop") {
      const points = shapes.drop(rng, x, y, 17 * scale, rng.float(-0.5, 0.5));
      on(ink, (g) => { shapes.splinePath(g, points); g.fill(); });
    } else if (kindOf === "leaf") {
      const points = shapes.leaf(rng, x, y, 24 * scale, rng.float(-1, 1));
      on(ink, (g) => { shapes.splinePath(g, points); g.fill(); });
    } else if (kindOf === "ring") {
      const points = shapes.blob(rng, x, y, 21 * scale, { lobes: 3, wobble: 0.05 });
      on(ink, (g) => { g.strokeStyle = "#000"; shapes.strokePoints(g, points, 5, true); });
    } else if (kindOf === "squiggle") {
      const points = shapes.wave(x - 32 * scale, y, x + 32 * scale, y, { amplitude: 7 * scale, cycles: 2.2, noise, wobble: 2, offset: x });
      on(ink, (g) => { g.strokeStyle = "#000"; shapes.strokePoints(g, points, 4.5); });
    } else {
      const r = 13 * scale;
      on(ink, (g) => { shapes.diamond(g, x, y, r); g.fill(); });
    }
  }

  // -- the swatch row: the drums themselves, overlapping so the mixes are on the sheet ------
  const swatchY = 966;
  const swatchR = 54;
  inks.forEach((hex, index) => {
    const x = margin + swatchR + index * swatchR * 1.42;
    const ring = shapes.blob(rng, x, swatchY, swatchR, { lobes: 3, wobble: 0.045 });
    on(index, (g) => { shapes.splinePath(g, ring); g.fill(); });
  });

  const listX = margin + swatchR * 1.42 * inks.length + swatchR + 46;
  inks.forEach((hex, index) => {
    const y = swatchY - (inks.length - 1) * 13 + index * 26;
    on(index, (g) => { g.beginPath(); g.arc(listX, y - 5, 7, 0, Math.PI * 2); g.fill(); });
    on(dark, (g) => {
      g.font = `500 17px ${MONO}`;
      tracked(g, hex.toUpperCase(), listX + 20, y, 1.4);
    });
  });

  // -- the footer, knocked out of the bottom block -------------------------------------------
  // A knockout is not white ink. It is the drum not printing there, so the paper shows through
  // — which is why it is punched out of the block's own mask instead of drawn over it.
  const mark = "RISO GRAPHIC";
  const sub = "SAMPLE SHEET · 2 OR 3 DRUMS · ONE PASS EACH";
  on(warm, (g) => {
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.font = `700 21px ${MONO}`;
    tracked(g, mark, margin, height - 74, 3);
    g.font = `500 12px ${MONO}`;
    tracked(g, sub, margin, height - 48, 2);
    g.restore();
  });

  // The registration slip, one offset per drum. The first drum is the reference: it is the
  // later passes that land off, which is what the eye reads as a misprint.
  const offsets = inks.map((_, index) => (index === 0 ? [0, 0] : [rng.around(0, 1), rng.around(0, 1)]));

  return { ops, offsets };
}

// -- the press ------------------------------------------------------------------------------

export function drawPoster(canvas, options) {
  const { seed, palette, inkCount, grain, registration, headline } = options;
  const { width, height } = SHEET;
  const inks = inksFor(palette, inkCount);

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const rng = makeRng(seed >>> 0);
  const noise = makeNoise(rng);
  const plan = layout({ rng, noise, inks, palette, headline, width, height });
  const fields = fieldsFor(seed >>> 0, width, height);

  // The stock.
  context.globalCompositeOperation = "source-over";
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  const tooth = document.createElement("canvas");
  tooth.width = width;
  tooth.height = height;
  tooth.getContext("2d").putImageData(paperTooth(context, fields, width, height, PAPER_SHADE), 0, 0);
  context.drawImage(tooth, 0, 0);

  // One pass per drum.
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const layerContext = layer.getContext("2d");

  inks.forEach((hex, index) => {
    layerContext.globalCompositeOperation = "source-over";
    layerContext.clearRect(0, 0, width, height);
    layerContext.fillStyle = "#000";
    layerContext.strokeStyle = "#000";

    for (const op of plan.ops) {
      if (op.ink !== index) continue;
      layerContext.save();
      op.paint(layerContext);
      layerContext.restore();
    }

    const image = layerContext.getImageData(0, 0, width, height);
    applyGrain(image, fields, grain);
    layerContext.globalCompositeOperation = "source-over";
    layerContext.putImageData(image, 0, 0);

    layerContext.globalCompositeOperation = "source-in";
    layerContext.fillStyle = hex;
    layerContext.fillRect(0, 0, width, height);

    const [dx, dy] = plan.offsets[index];
    context.globalCompositeOperation = "multiply";
    context.drawImage(layer, dx * registration, dy * registration);
  });

  context.globalCompositeOperation = "source-over";
  return { inks, seed };
}
