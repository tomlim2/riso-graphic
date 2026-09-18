// The shape vocabulary. Two families, and the style is the pair of them together:
//
//   organic  — blobs, arches, drops. Nothing with a compass or a ruler in it.
//   memphis  — squiggles, zigzags, sparkles, spirals. The 1980s scatter, used as garnish.
//
// Every builder returns points and takes its randomness up front, so the geometry is
// settled during layout. Drawing happens once per ink pass and must not touch the rng,
// or the second pass would get a different poster than the first.

// Each path builder comes in two: one that starts a new path, and a *Subpath that adds to the
// current one. Many shapes in one path fill in a single pass, so where they overlap the ink
// doesn't double up.

export function polyPath(context, points, close = true) {
  context.beginPath();
  polySubpath(context, points, close);
}

export function polySubpath(context, points, close = true) {
  context.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) context.lineTo(points[i][0], points[i][1]);
  if (close) context.closePath();
}

// A circle added to the current path. It moves to the circle's right end first, or the arc
// would draw a line from wherever the last shape ended.
export function circleSubpath(context, cx, cy, radius) {
  context.moveTo(cx + radius, cy);
  context.arc(cx, cy, radius, 0, Math.PI * 2);
}

// Twice the signed area of a closed outline. Positive when it winds one way, negative the other.
export function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    sum += x0 * y1 - x1 * y0;
  }
  return sum;
}

// Catmull-Rom through every point, as beziers. A closed loop of these is the organic blob.
export function splinePath(context, points, close = true) {
  context.beginPath();
  splineSubpath(context, points, close);
}

// The same curve without starting a new path. Two of these in one path, filled "evenodd",
// give a ring with a wall of varying thickness — which is what a carved water ring is.
export function splineSubpath(context, points, close = true) {
  const n = points.length;
  const at = (i) => (close ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);

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

// 잎. 타원이 아니다 — 양 끝이 뾰족해야 잎으로 읽힌다. 폭을 (1 - u²)의 거듭제곱으로 주면
// 끝에서 폭과 기울기가 함께 0이 되어 꼭지점이 생긴다. 거기에 전체를 한쪽으로 휘게 한다.
export function leaf(rng, cx, cy, size, tilt = 0, options = {}) {
  const { thickness = 0.4, bend = 0.15, steps = 11 } = options;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const jitter = 1 + rng.float(-0.06, 0.06);
  const points = [];

  const place = (u, side) => {
    const x = u * size;
    const half = thickness * size * jitter * Math.pow(Math.max(0, 1 - u * u), 1.15);
    const curve = bend * size * (1 - u * u);
    const y = side * half + curve;
    points.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  };

  // 위 가장자리는 끝점까지, 아래 가장자리는 끝점을 빼고 돌아온다. 같은 점을 두 번 넣으면
  // 스플라인의 제어점이 뭉개진다
  for (let i = 0; i <= steps; i += 1) place(-1 + (2 * i) / steps, 1);
  for (let i = steps - 1; i >= 1; i -= 1) place(-1 + (2 * i) / steps, -1);

  return points;
}

// 굵기가 변하는 선. 경로를 따라 양쪽 가장자리를 따로 내어 닫힌 띠로 돌려준다.
// width(u)는 경로의 처음(0)에서 끝(1)까지의 굵기다. 끝으로 갈수록 줄이면 뾰족하게 끝난다.
// 두 가장자리가 한 점에 겹치면 스플라인의 제어점이 뭉개지므로 아주 얇게라도 벌려 둔다.
export function ribbon(points, width) {
  const last = points.length - 1;
  const left = [];
  const right = [];
  points.forEach(([x, y], i) => {
    const [ax, ay] = points[Math.max(0, i - 1)];
    const [bx, by] = points[Math.min(last, i + 1)];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / length;
    const ny = (bx - ax) / length;
    const half = Math.max(0.15, width(last ? i / last : 0) / 2);
    left.push([x + nx * half, y + ny * half]);
    right.push([x - nx * half, y - ny * half]);
  });
  return [...left, ...right.reverse()];
}

// 닫힌 모양을 둘레로 amount만큼 고르게 키운다. 꼭짓점마다 이웃 둘을 보고 바깥 법선 쪽으로
// 민다. 배율로 키우면 해파리 종처럼 밑단이 들린 모양은 밑단이 오히려 안으로 들어온다.
export function grow(points, amount) {
  const count = points.length;
  const outward = signedArea(points) > 0 ? amount : -amount;
  return points.map(([x, y], i) => {
    const [ax, ay] = points[(i - 1 + count) % count];
    const [bx, by] = points[(i + 1) % count];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    return [x + ((by - ay) / length) * outward, y - ((bx - ax) / length) * outward];
  });
}

// -- memphis garnish -------------------------------------------------------------------

// phase를 t에 맞춰 한 바퀴 돌리면 물결이 선 위를 흘러간다. 루프가 이어지려면 한 바퀴여야 한다.
export function wave(x0, y0, x1, y1, options = {}) {
  const { amplitude = 12, cycles = 6, steps = 96, noise = null, wobble = 3, offset = 0, phase = 0 } = options;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    let push = Math.sin(t * Math.PI * 2 * cycles + phase) * amplitude;
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
  sparkleSubpath(context, cx, cy, radius, waist);
}

export function sparkleSubpath(context, cx, cy, radius, waist = 0.26) {
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
