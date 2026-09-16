// The shape vocabulary. Two families, and the style is the pair of them together:
//
//   organic  — blobs, arches, drops. Nothing with a compass or a ruler in it.
//   memphis  — squiggles, zigzags, sparkles, spirals. The 1980s scatter, used as garnish.
//
// Every builder returns points and takes its randomness up front, so the geometry is
// settled during layout. Drawing happens once per ink pass and must not touch the rng,
// or the second pass would get a different poster than the first.

export function polyPath(context, points, close = true) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) context.lineTo(points[i][0], points[i][1]);
  if (close) context.closePath();
}

// Catmull-Rom through every point, as beziers. A closed loop of these is the organic blob.
export function splinePath(context, points, close = true) {
  const n = points.length;
  const at = (i) => (close ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);

  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    context.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1]
    );
  }
  if (close) context.closePath();
}

export function strokePoints(context, points, width, close = false) {
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  splinePath(context, points, close);
  context.stroke();
}

// -- organic ---------------------------------------------------------------------------

// A circle that was drawn by hand and then leaned on. Two sine lobes at different
// frequencies keep it from settling into a flower.
export function blob(rng, cx, cy, radius, options = {}) {
  const { lobes = 5, wobble = 0.2, steps = 18, squash = 1, tilt = 0 } = options;
  const phase = rng.float(0, Math.PI * 2);
  const drift = rng.float(0, Math.PI * 2);
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const points = [];

  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius * (1 + wobble * 0.62 * Math.sin(t * lobes + phase) + wobble * 0.48 * Math.sin(t * (lobes + 3) + drift));
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r * squash;
    points.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return points;
}

// The spiked sun. Alternating radii, every spike a little off, drawn as a polygon so the
// points stay sharp — splining it would round the spikes into a cloud.
export function burst(rng, cx, cy, radius, options = {}) {
  const { spikes = 11, inner = 0.66 } = options;
  const phase = rng.float(0, Math.PI * 2);
  const points = [];

  for (let i = 0; i < spikes * 2; i += 1) {
    const t = phase + (i / (spikes * 2)) * Math.PI * 2;
    const r = radius * (i % 2 === 0 ? 1 : inner) * (1 + rng.float(-0.07, 0.07));
    points.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return points;
}

// A torn rectangle: straight enough to read as a panel, never actually straight.
export function patch(rng, x, y, width, height, slack = 10) {
  const edge = (x0, y0, x1, y1, steps) => {
    const out = [];
    for (let i = 0; i < steps; i += 1) {
      const t = i / steps;
      out.push([x0 + (x1 - x0) * t + rng.float(-slack, slack), y0 + (y1 - y0) * t + rng.float(-slack, slack)]);
    }
    return out;
  };

  return [
    ...edge(x, y, x + width, y, 4),
    ...edge(x + width, y, x + width, y + height, 4),
    ...edge(x + width, y + height, x, y + height, 4),
    ...edge(x, y + height, x, y, 4)
  ];
}

export function drop(rng, cx, cy, size, tilt = 0) {
  const points = [];
  const steps = 16;
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const pinch = 1 - 0.55 * Math.pow(Math.max(0, Math.cos(t)), 3);
    const r = size * pinch * (1 + rng.float(-0.04, 0.04));
    const x = Math.cos(t) * r * 0.78;
    const y = Math.sin(t) * r;
    points.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return points;
}

export function leaf(rng, cx, cy, size, tilt = 0) {
  const points = [];
  const steps = 14;
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.cos(t) * size;
    const y = Math.sin(t) * size * 0.42 * (1 + rng.float(-0.06, 0.06));
    const bend = Math.sin((x / size) * Math.PI * 0.5) * size * 0.18;
    points.push([cx + x * Math.cos(tilt) - (y + bend) * Math.sin(tilt), cy + x * Math.sin(tilt) + (y + bend) * Math.cos(tilt)]);
  }
  return points;
}

// -- memphis garnish -------------------------------------------------------------------

export function wave(x0, y0, x1, y1, options = {}) {
  const { amplitude = 12, cycles = 6, steps = 96, noise = null, wobble = 3, offset = 0 } = options;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    let push = Math.sin(t * Math.PI * 2 * cycles) * amplitude;
    if (noise) push += noise(offset + t * cycles * 3) * wobble;
    points.push([x0 + dx * t + nx * push, y0 + dy * t + ny * push]);
  }
  return points;
}

export function zigzag(x0, y0, x1, y1, teeth = 5, amplitude = 14) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points = [];

  for (let i = 0; i <= teeth; i += 1) {
    const t = i / teeth;
    const push = (i % 2 === 0 ? 1 : -1) * amplitude;
    points.push([x0 + dx * t + nx * push, y0 + dy * t + ny * push]);
  }
  return points;
}

export function spiral(cx, cy, from, to, turns = 2.5, steps = 80) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * turns;
    const r = from + (to - from) * t;
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return points;
}

// The four-point twinkle. Concave sides, which is what separates it from a plus sign.
export function sparkle(context, cx, cy, radius, waist = 0.26) {
  context.beginPath();
  context.moveTo(cx, cy - radius);
  context.quadraticCurveTo(cx + radius * waist, cy - radius * waist, cx + radius, cy);
  context.quadraticCurveTo(cx + radius * waist, cy + radius * waist, cx, cy + radius);
  context.quadraticCurveTo(cx - radius * waist, cy + radius * waist, cx - radius, cy);
  context.quadraticCurveTo(cx - radius * waist, cy - radius * waist, cx, cy - radius);
  context.closePath();
}

export function diamond(context, cx, cy, radius) {
  context.beginPath();
  context.moveTo(cx, cy - radius);
  context.lineTo(cx + radius * 0.62, cy);
  context.lineTo(cx, cy + radius);
  context.lineTo(cx - radius * 0.62, cy);
  context.closePath();
}
