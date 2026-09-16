// What makes a print look risographed is not the colour, it is the coverage. The drum
// pushes ink through a screen, so no area is ever a flat solid: a fill is thousands of
// specks that only read as solid from far away, and whole patches come out thick or thin.
//
// Every ink layer is drawn as a mask first, then this eats into its alpha.

import { makeNoise2 } from "./rng.js";

// Two fields, both the size of the sheet.
//   speck  — one white-noise value per pixel: the screen itself
//   mottle — two octaves of value noise: the patches where the drum ran thick or thin
export function makeFields(width, height, rng) {
  const count = width * height;
  const speck = new Float32Array(count);
  for (let i = 0; i < count; i += 1) speck[i] = rng.next();

  const coarse = makeNoise2(rng);
  const fine = makeNoise2(rng);
  const mottle = new Float32Array(count);
  for (let y = 0, i = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1, i += 1) {
      mottle[i] = coarse(x / 110, y / 110) * 0.65 + fine(x / 31, y / 31) * 0.35;
    }
  }

  return { speck, mottle, width, height };
}

// The mask's alpha channel in, the printed coverage out.
//
// A solid loses a random bite of itself everywhere, which is the visible grain; a tint
// loses proportionally less, or the lightest tones would drop off the sheet entirely.
export function applyGrain(image, fields, amount) {
  if (amount <= 0) return;
  const data = image.data;
  const { speck, mottle } = fields;

  for (let i = 0, p = 3; i < speck.length; i += 1, p += 4) {
    const alpha = data[p];
    if (alpha === 0) continue;

    const coverage = alpha / 255;
    let value = coverage - amount * speck[i] * (0.55 + 0.45 * coverage);
    value += (mottle[i] - 0.5) * amount * 0.55 * coverage;

    data[p] = value <= 0 ? 0 : value >= 1 ? 255 : (value * 255) | 0;
  }
}

// The paper's own tooth. Far weaker than the ink grain and it never moves, so the sheet
// reads as stock rather than as another layer of noise.
export function paperTooth(context, fields, width, height, shade) {
  const image = context.createImageData(width, height);
  const data = image.data;
  const tint = parseInt(shade.slice(1), 16);
  const r = (tint >> 16) & 255;
  const g = (tint >> 8) & 255;
  const b = tint & 255;

  for (let i = 0, p = 0; i < fields.speck.length; i += 1, p += 4) {
    data[p] = r;
    data[p + 1] = g;
    data[p + 2] = b;
    data[p + 3] = (fields.speck[i] * 26 + (fields.mottle[i] - 0.5) * 18) | 0;
  }

  return image;
}
