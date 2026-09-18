// Repeatable randomness. One roll makes one print: the same number gives back the same
// shapes, the same misregistration and the same speck of grain.

// mulberry32 — short, evenly distributed PRNG.
export function makeRng(roll) {
  let state = roll >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    sign: () => (next() < 0.5 ? -1 : 1),

    // A value that clusters near the mean without leaving the range.
    around: (mean, spread) => mean + (next() + next() + next() - 1.5) * (spread / 1.5)
  };

  return rng;
}

// The seed of a plate with a FIELD knob. The paper's roll (page.seed) is mixed with the plate's own
// salt and with FIELD, so turning FIELD re-draws the layout while the inks and the paper's grain stay
// put. Saved links carry FIELD, so the formula must not change. RIPPLE predates it and mixes FIELD
// without the +1 on its own line; JELLY passes its own multiplier.
export const fieldSeed = (page, salt, mix = 0x85ebca6b) => (page.seed ^ salt ^ Math.imul(page.knobs.field + 1, mix)) >>> 0;

// 1D value noise. Used to make a line wobble the way a hand draws it — neighbouring
// samples stay close, so the wobble reads as one unsteady stroke and not as jitter.
export function makeNoise(rng, size = 256) {
  const table = new Float32Array(size);
  for (let i = 0; i < size; i += 1) table[i] = rng.next() * 2 - 1;

  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[((i % size) + size) % size];
    const b = table[((((i + 1) % size) + size) % size)];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

// 2D value noise. The low-frequency unevenness inside an ink layer — the patches where
// the drum laid the ink on thick and where it ran thin.
export function makeNoise2(rng, size = 64) {
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i += 1) table[i] = rng.next();

  const at = (x, y) => table[(((y % size) + size) % size) * size + (((x % size) + size) % size)];

  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const sx = (x - xi) * (x - xi) * (3 - 2 * (x - xi));
    const sy = (y - yi) * (y - yi) * (3 - 2 * (y - yi));
    const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const bottom = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}
