// 현미경으로 들여다본 잎 세포와 엽록체.
//
// 검정말이나 이끼의 잎을 광학 현미경으로 보면, 길쭉한 육각형 세포가 벽을 맞대고 줄지어 있고
// 세포마다 초록 원반 — 엽록체 — 이 가득 차 있다. 세포 안의 빈 자리는 빛이 그대로 들어와 옅은
// 하늘빛이고, 세포벽은 옅은 노랑 띠의 양쪽 가장자리가 진하게 선다.
//
// 세포는 어긋난 육각 격자의 점을 흔들어 나눈 보로노이 조각이다. 격자에서 나눈 뒤 한 방향으로
// 늘이고 돌리므로 이웃 세포의 벽이 언제나 맞물린다. 벽은 긋는 것이 아니라 남기는 것이다 —
// 세포마다 벽 두께의 절반만큼 안으로 들인 속을 칠하고 그 테두리를 진하게 긋는다. 이웃 두 세포의
// 테두리가 벽의 양쪽 가장자리가 되고, 그 사이에 남은 띠가 벽이다.
//
// 초록 잉크는 없다. 엽록체는 곱했을 때 가장 초록에 가까운 두 통을 겹쳐 칠한다. 세포 안의
// 하늘빛은 가장 파란 통, 벽의 띠는 가장 노란 통, 테두리는 가장 진한 통이다. 엽록체는 세 켜로
// 나눠 칠해, 켜가 다른 둘이 겹친 자리는 더 진해진다. 초점이 맞지 않는 것은 먼저, 옅게, 테 없이.
//
// 움직임은 엽록체마다 따로다. 저마다 제자리에서 아주 작은 고리를 돌고 조금씩 기운다. 고리의 두
// 축은 한 바퀴에 한 번이나 두 번 돌아, 한 바퀴 끝에서 제자리로 돌아온다. 다 같이 한쪽으로 밀리는
// 움직임 — 세포를 도는 물결이나 슬라이드가 도는 길 — 은 두지 않는다. 한 덩어리로 흔들리면 살아
// 있는 것보다 화면이 흔들리는 것으로 읽힌다.
//
// 세포와 엽록체의 자리는 시간과 무관해서 한 번 짜 두고 다시 쓴다. 세포는 격자 자리마다 제 씨앗을
// 가져, 시야를 넓히거나 좁혀도 남는 세포는 그대로다. 엽록체는 세포마다 같은 수의 후보를 뽑고,
// 손잡이는 그중 몇을 앉힐지만 정한다.

import { makeRng, fieldSeed } from "../rng.js";
import { circleSubpath, signedArea } from "../shapes.js";
import { keeper } from "../keep.js";
import { roundel } from "../roundel.js";
import { SCOPE_KNOBS, light } from "../scope.js";
import { greenest, bluest, yellowest } from "../drums.js";

const TAU = Math.PI * 2;
const ROW = Math.sqrt(3) / 2;
const CANDIDATES = 120;

// 격자 자리 하나의 씨앗
const spotSeed = (seed, i, j) => (Math.imul(seed ^ Math.imul(i, 0x27d4eb2d), 0x165667b1) ^ Math.imul(j, 0x9e3779b1)) >>> 0;

// 볼록 다각형에서 반평면 nx·x + ny·y ≤ d 쪽만 남긴다
function clip(poly, nx, ny, d) {
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = nx * a[0] + ny * a[1] - d;
    const db = nx * b[0] + ny * b[1] - d;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const k = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}

// 거의 겹친 이웃 꼭짓점을 하나로
function tidy(poly) {
  const out = [];
  for (const p of poly) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5) out.push(p);
  }
  while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 0.5) out.pop();
  return out;
}

// 볼록 다각형의 변마다 안쪽을 향하는 반평면. 안쪽이면 nx·x + ny·y - d가 양수이고, 그 값이 곧
// 변까지의 거리다
function sides(poly) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const length = Math.hypot(bx - ax, by - ay);
    if (length < 1e-6) continue;
    let nx = -(by - ay) / length;
    let ny = (bx - ax) / length;
    if (nx * (cx - ax) + ny * (cy - ay) < 0) {
      nx = -nx;
      ny = -ny;
    }
    out.push({ nx, ny, d: nx * ax + ny * ay });
  }
  return out;
}

const depthIn = (edges, x, y) => Math.min(...edges.map((e) => e.nx * x + e.ny * y - e.d));

// 볼록 다각형을 안으로 들인다. 변마다 amount만큼 안으로 민 반평면으로 자른다
function inset(poly, amount) {
  let out = poly;
  for (const e of sides(poly)) {
    if (out.length < 3) break;
    out = clip(out, -e.nx, -e.ny, -(e.d + amount));
  }
  return tidy(out);
}

const areaOf = (poly) => Math.abs(signedArea(poly)) / 2;

// 조직을 짠다. 세포의 속과 그 안에 앉을 엽록체까지, 시간과 무관한 것 전부
function weave(seed, knobs, width, cx, cy, ring) {
  const spacing = width * knobs.size;
  const { stretch } = knobs;
  const tilt = (knobs.angle * Math.PI) / 180;
  const ca = Math.cos(tilt);
  const sa = Math.sin(tilt);
  const toWorld = ([x, y]) => [cx + (x * stretch * ca - y * sa) * spacing, cy + (x * stretch * sa + y * ca) * spacing];

  // 시야에 조금이라도 걸리는 세포까지. 세포 하나만큼을 더한다
  const reach = ring + spacing * stretch * 1.2;
  const I = Math.ceil(reach / (spacing * stretch)) + 3;
  const J = Math.ceil(reach / (spacing * ROW)) + 3;

  // 격자 점. 자리마다 제 씨앗으로 흔든다
  const site = new Map();
  for (let j = -J; j <= J; j += 1) {
    for (let i = -I; i <= I; i += 1) {
      const shake = makeRng(spotSeed(seed ^ 0x51ed27, i, j));
      const x = i + (j & 1 ? 0.5 : 0) + shake.float(-1, 1) * knobs.jitter;
      const y = j * ROW + shake.float(-1, 1) * knobs.jitter;
      site.set(`${i},${j}`, [x, y]);
    }
  }

  const r0 = width * knobs.plastid;
  const cells = [];
  for (let j = -J + 2; j <= J - 2; j += 1) {
    for (let i = -I + 2; i <= I - 2; i += 1) {
      const [sx, sy] = site.get(`${i},${j}`);
      const [wx, wy] = toWorld([sx, sy]);
      if (Math.hypot(wx - cx, wy - cy) > reach) continue;

      // 보로노이 조각. 이웃 점과의 수직이등분선으로 차례로 자른다
      let poly = [[sx - 2, sy - 2], [sx + 2, sy - 2], [sx + 2, sy + 2], [sx - 2, sy + 2]];
      for (let dj = -2; dj <= 2; dj += 1) {
        for (let di = -2; di <= 2; di += 1) {
          if (!di && !dj) continue;
          const [ox, oy] = site.get(`${i + di},${j + dj}`);
          const nx = ox - sx;
          const ny = oy - sy;
          poly = clip(poly, nx, ny, (nx * (sx + ox) + ny * (sy + oy)) / 2);
        }
      }

      const inner = inset(tidy(poly.map(toWorld)), knobs.wall / 2);
      if (inner.length < 3) continue;
      const area = areaOf(inner);
      const edges = sides(inner);

      // 엽록체. 언제나 같은 수의 후보를 뽑고, 앉을 수 있는 것만 앉힌다. 같은 켜끼리는 거의 겹치지
      // 않게 — 한 경로로 칠하므로 겹쳐 봐야 진해지지 않는다 — 켜가 다르면 깊이 겹쳐도 된다
      const hand = makeRng(spotSeed(seed, i, j));
      const xs = inner.map((p) => p[0]);
      const ys = inner.map((p) => p[1]);
      const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const target = Math.round((knobs.density * 1.7 * area) / (Math.PI * r0 * r0));
      const plastids = [];
      for (let k = 0; k < CANDIDATES; k += 1) {
        const c = {
          x: minX + hand.next() * (maxX - minX),
          y: minY + hand.next() * (maxY - minY),
          r: r0 * hand.float(0.78, 1.22),
          squash: hand.float(0.74, 0.96),
          tilt: hand.float(0, Math.PI),
          layer: hand.int(0, 2),
          blur: hand.next(),
          // 제자리에서 도는 작은 고리. 두 축의 박자가 정수라 한 바퀴 끝에서 제자리로 돌아온다
          loop: {
            fx: hand.int(1, 2),
            fy: hand.int(1, 2),
            px: hand.float(0, TAU),
            py: hand.float(0, TAU),
            turn: hand.float(0, Math.PI),
            reach: hand.float(0.5, 1),
            dir: hand.chance(0.5) ? 1 : -1
          },
          specks: [0, 1, 2].map(() => [hand.float(0, TAU), hand.float(0.1, 0.55), hand.float(0.13, 0.19)])
        };
        if (plastids.length >= target) continue;
        c.room = depthIn(edges, c.x, c.y);
        if (c.room < c.r * 0.55) continue;
        if (plastids.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < (o.r + c.r) * (o.layer === c.layer ? 0.92 : 0.5))) continue;
        plastids.push(c);
      }

      cells.push({ inner, plastids });
    }
  }

  return cells;
}

// 짠 조직은 몇 벌 쥐고 있는다. 손잡이를 끄는 동안이 아니면 같은 조직을 프레임마다 다시 쓴다
const tissueFor = keeper(4);

// 모서리를 둥글린 다각형 하나를 경로에 더한다
function roundedSubpath(g, points, radius) {
  const n = points.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [sx, sy] = mid(points[n - 1], points[0]);
  g.moveTo(sx, sy);
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const room = Math.min(Math.hypot(p[0] - prev[0], p[1] - prev[1]), Math.hypot(next[0] - p[0], next[1] - p[1])) * 0.2;
    const [mx, my] = mid(p, next);
    g.arcTo(p[0], p[1], mx, my, Math.min(radius, room));
  }
  g.closePath();
}

function ellipseSubpath(g, p, grow) {
  const rx = p.r * grow;
  const ry = p.r * p.squash * grow;
  g.moveTo(p.x + rx * Math.cos(p.tilt), p.y + rx * Math.sin(p.tilt));
  g.ellipse(p.x, p.y, rx, ry, p.tilt, 0, TAU);
}

// 한 켜의 엽록체를 한 경로로 칠한다. 같은 켜끼리 겹친 자리는 두 번 칠해지지 않는다
function discs(sep, list, tone, grow = 1) {
  if (!sep || !list.length || !(tone > 0)) return;
  sep.draw((g) => {
    g.globalAlpha = Math.min(1, tone);
    g.beginPath();
    for (const p of list) ellipseSubpath(g, p, grow);
    g.fill();
  });
}

export const chloro = {
  id: "chloro",
  name: "CHLORO",
  about: "현미경 아래의 잎 세포. 벽 사이마다 엽록체가 가득 차, 저마다 제자리에서 조금씩 움직인다",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "조직의 씨앗. 종이의 롤은 그대로 두고 세포와 엽록체만 다시 뽑는다" },
    { key: "size", label: "SIZE", min: 0.06, max: 0.2, step: 0.005, value: 0.14, hint: "세포의 크기" },
    { key: "stretch", label: "STRETCH", min: 1, max: 2.4, step: 0.05, value: 1.55, hint: "세포가 한쪽으로 길쭉한 정도" },
    { key: "angle", label: "ANGLE", min: 0, max: 180, step: 1, value: 28, hint: "세포가 길쭉한 방향, 도" },
    { key: "jitter", label: "JITTER", min: 0, max: 0.45, step: 0.01, value: 0.3, hint: "세포 모양이 고르지 않은 정도" },
    { key: "wall", label: "WALL", min: 4, max: 28, step: 1, value: 13, hint: "세포벽의 두께, 픽셀" },
    { key: "density", label: "DENSITY", min: 0, max: 1, step: 0.05, value: 0.8, hint: "세포 안을 엽록체가 얼마나 채울지" },
    { key: "plastid", label: "PLASTID", min: 0.01, max: 0.026, step: 0.001, value: 0.018, hint: "엽록체의 크기" },
    { key: "depth", label: "DEPTH", min: 0, max: 0.6, step: 0.05, value: 0.2, hint: "초점이 맞지 않아 흐린 엽록체의 비율" },
    { key: "wander", label: "WANDER", min: 0, max: 10, step: 0.5, value: 3, hint: "엽록체가 제자리에서 저마다 조금씩 움직이는 폭, 픽셀" },
    { key: "tint", label: "TINT", min: 0.3, max: 1, step: 0.05, value: 0.75, hint: "엽록체의 초록을 얼마나 진하게. 두 통이 겹쳐 초록이 난다" },
    { key: "ground", label: "GROUND", min: 0, max: 1, step: 0.05, value: 0.7, hint: "세포 안의 하늘빛과 세포벽의 옅은 노랑" }
  ],
  scope: SCOPE_KNOBS,

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const turn = t * TAU;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;

    // 조직은 제 씨앗으로 짠다. FIELD는 잉크와 종이결을 건드리지 않고 조직만 다시 뽑는다
    const seed = fieldSeed(page, 0x2545f491);
    const shape = [seed, width, ring, knobs.size, knobs.stretch, knobs.angle, knobs.jitter, knobs.wall, knobs.density, knobs.plastid];
    const cells = tissueFor(shape.join("|"), () => weave(seed, knobs, width, cx, cy, ring));

    const leaf = greenest(S.drums);
    const sky = bluest(S.drums);
    const glow = yellowest(S.drums);

    light(S, page, ring, knobs.vignette);

    const corner = Math.max(2, knobs.wall * 0.9);
    const insides = (g) => {
      for (const cell of cells) roundedSubpath(g, cell.inner, corner);
    };

    // 바탕. 벽의 띠는 시야 전체에서 세포 속만 비워 칠하고, 세포 속은 하늘빛으로 칠한다
    if (knobs.ground > 0) {
      glow.draw((g) => {
        g.globalAlpha = 0.34 * knobs.ground;
        g.beginPath();
        circleSubpath(g, cx, cy, ring + 40);
        insides(g);
        g.fill("evenodd");
      });
      sky.draw((g) => {
        g.globalAlpha = 0.28 * knobs.ground;
        g.beginPath();
        insides(g);
        g.fill();
      });
    }

    // 엽록체의 자리. 저마다 제자리에서 작은 고리를 돌고 조금씩 기운다. 고리는 기울기와 모양이
    // 제각각이고, 벽에 붙은 것은 덜 움직인다
    const layers = [[], [], []];
    const blurred = [];
    for (const cell of cells) {
      for (const p of cell.plastids) {
        const { loop } = p;
        const reach = knobs.wander * loop.reach * Math.min(1, Math.max(0.5, p.room / (p.r * 1.2)));
        const along = Math.cos(turn * loop.fx * loop.dir + loop.px) * reach;
        const across = Math.sin(turn * loop.fy * loop.dir + loop.py) * reach * 0.6;
        const cos = Math.cos(loop.turn);
        const sin = Math.sin(loop.turn);
        const placed = {
          x: p.x + along * cos - across * sin,
          y: p.y + along * sin + across * cos,
          r: p.r,
          squash: p.squash,
          tilt: p.tilt + Math.sin(turn * loop.dir + loop.px) * 0.12,
          specks: p.specks
        };
        (p.blur < knobs.depth ? blurred : layers[p.layer]).push(placed);
      }
    }

    // 흐린 것부터 옅게, 테 없이. 그 위에 켜마다 두 통을 겹치고 테를 두른다
    const [inkA, inkB] = leaf;
    discs(inkA, blurred, knobs.tint * 0.5, 1.12);
    discs(inkB, blurred, knobs.tint * 0.3, 1.12);
    layers.forEach((list, l) => {
      discs(inkA, list, knobs.tint * (0.9 + 0.1 * l));
      discs(inkB, list, knobs.tint * (0.6 + 0.1 * l));
      if (!list.length) return;
      S.key.draw((g) => {
        g.globalAlpha = 0.42;
        g.lineWidth = 3;
        g.beginPath();
        for (const p of list) ellipseSubpath(g, p, 1);
        g.stroke();
      });
    });

    // 엽록체 속의 알갱이. 그라나가 광학 현미경에서는 이렇게 보인다
    S.key.draw((g) => {
      g.globalAlpha = 0.38;
      g.beginPath();
      for (const list of layers) {
        for (const p of list) {
          const cos = Math.cos(p.tilt);
          const sin = Math.sin(p.tilt);
          for (const [angle, dist, size] of p.specks) {
            const lx = Math.cos(angle) * dist * p.r;
            const ly = Math.sin(angle) * dist * p.r * p.squash;
            const x = p.x + lx * cos - ly * sin;
            const y = p.y + lx * sin + ly * cos;
            circleSubpath(g, x, y, size * p.r);
          }
        }
      }
      g.fill();
    });

    // 벽의 양쪽 가장자리. 이웃 두 세포의 테두리가 한 벽의 두 선이 된다
    S.key.draw((g) => {
      g.globalAlpha = 0.62;
      g.lineWidth = Math.max(3.5, knobs.wall * 0.28);
      g.lineJoin = "round";
      g.beginPath();
      insides(g);
      g.stroke();
    });

    roundel(S, page, ring);
  }
};
