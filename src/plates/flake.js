// 현미경으로 들여다본 눈 결정 한 송이.
//
// 벤틀리가 1880년대부터 검은 바탕에 찍은 눈 결정 사진처럼, 어두운 시야 한가운데 큰 결정 하나가
// 떠 있다. 시야는 COSMOS처럼 깐다 — 노랗지 않은 통이 밤이 되어 바닥을 깔고(src/drums.js), 결정은
// 그것을 파내 빛난다.
//
// 결정은 30° 조각 하나에서 나온다. 가지의 위쪽 절반과 거기서 60°로 뻗는 곁가지를 짓고, 여섯 번
// 돌리고 한 번씩 뒤집어 열두 벌을 찍는다. 그래서 육각 대칭이 어긋나지 않는다. 뒤집은 조각은 감긴
// 방향이 거꾸로라 점 순서를 되돌린다. 그래야 한 경로로 채워도 겹친 자리가 비지 않는다.
//
//   몸      가운데 육각판과 여섯 가지, 곁가지, 곁가지의 잔가지. HABIT이 넓은 판(0)에서 가는
//           고사리(1)로 옮겨 가며 가지를 가늘게, 곁가지를 길게, 가운데 판을 작게 만든다. 곁가지의
//           끝은 육각형 테두리 안에 머문다
//   빛      몸은 밤을 옅게 파내 푸르스름하고, 모서리는 다 파내 희다. 조각이 겹친 자리의 모서리도
//           희게 남아 결정 속의 면처럼 읽힌다. 가지의 등뼈와 판의 동심 육각은 가장 진한 통을 도로
//           얹어 새긴다(RIDGE)
//   공기방울 대칭을 따르지 않는다. 실제 결정 속 방울이 그렇다(BUBBLE)
//   반짝임  가지 끝과 모서리에서 저마다 다른 박자로 깜빡인다. 가운데에 빛의 통을 얹어 따뜻하다(GLINT)
//   눈가루  시야에 떠 있는 작은 결정들. 흐리게, 제자리에서 조금씩 까딱인다(FLURRY)
//
// 판 어긋남(REGISTER)을 올리면 흰 모서리에 색이 번져 현미경의 색수차처럼 보인다. 리소가 공짜로
// 주는 것이다.
//
// 결정은 시간과 무관해서 한 번 짜 두고 다시 쓴다. 움직이는 것은 반짝임과 눈가루뿐이고, 박자는 모두
// 한 바퀴에 정수 번이다. 난수는 언제나 같은 수만큼 뽑고, 손잡이는 그중 몇을 쓸지만 정한다.

import { makeRng } from "../rng.js";
import { roundel } from "../roundel.js";
import { SCOPE_KNOBS, dim } from "../scope.js";
import { nightAndLight } from "../drums.js";

const TAU = Math.PI * 2;
const SIXTH = Math.PI / 3;
const MOST_BRANCH = 12;
const MOST_SUBS = 4;
const MOST_BUBBLE = 16;
const MOST_FLURRY = 16;

const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    sum += x0 * y1 - x1 * y0;
  }
  return sum;
}

// 감긴 방향을 하나로 맞춘다
const wound = (points) => (signedArea(points) < 0 ? points.slice().reverse() : points);

// 조각 하나를 여섯 벌로 돌리거나(스스로 대칭인 것), 열두 벌로 돌리고 뒤집는다. 뒤집은 벌은 점
// 순서를 되돌려 감긴 방향을 맞춘다. 열린 선은 되돌리지 않아도 된다
function copies(points, rot, mirror, closed = true) {
  const out = [];
  for (let k = 0; k < 6; k += 1) {
    const a = rot + k * SIXTH;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const m of mirror ? [1, -1] : [1]) {
      const copy = points.map(([x, y]) => [x * c - y * m * s, x * s + y * m * c]);
      out.push(m < 0 && closed ? copy.reverse() : copy);
    }
  }
  return out;
}

// 끝이 뾰족한 가지 하나. (x, y)에서 angle 쪽으로 length만큼, 뿌리의 반폭은 root
function spike(x, y, angle, length, root) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  return wound([
    [x + nx * root, y + ny * root],
    [x + ux * length * 0.82 + nx * root * 0.4, y + uy * length * 0.82 + ny * root * 0.4],
    [x + ux * length, y + uy * length],
    [x + ux * length * 0.82 - nx * root * 0.4, y + uy * length * 0.82 - ny * root * 0.4],
    [x - nx * root, y - ny * root]
  ]);
}

// 육각형. 꼭짓점 하나가 가지 쪽을 본다
function hexagon(x, y, radius) {
  return wound(Array.from({ length: 6 }, (_, k) => [x + Math.cos(k * SIXTH) * radius, y + Math.sin(k * SIXTH) * radius]));
}

// 결정 하나를 짓는다. 가운데가 원점이다. 난수는 손잡이와 무관하게 언제나 같은 수만큼 뽑는다
function grow(rng, radius, habit, branchCount) {
  const draws = {
    rot: rng.float(0, SIXTH),
    plate: rng.float(0.85, 1.15),
    tip: rng.next(),
    tipSize: rng.float(0.7, 1.2),
    rings: [rng.float(0.92, 1.08), rng.float(0.92, 1.08), rng.float(0.92, 1.08)],
    slots: Array.from({ length: MOST_BRANCH }, () => ({
      shift: rng.float(-1, 1),
      length: rng.float(0.75, 1.1),
      width: rng.float(0.8, 1.15),
      subs: Array.from({ length: MOST_SUBS }, () => ({ shift: rng.float(-1, 1), length: rng.float(0.7, 1.15) }))
    }))
  };

  const plate = radius * lerp(0.5, 0.13, habit) * draws.plate;
  const rootWidth = radius * lerp(0.13, 0.03, habit);
  const tipWidth = radius * lerp(0.08, 0.012, habit);
  const widthAt = (x) => lerp(rootWidth, tipWidth, clamp01((x - plate) / (radius - plate)));

  const whole = [];
  const half = [];
  const spines = [[[plate * 0.15, 0], [radius * 0.94, 0]]];
  const tips = [[radius, 0]];

  // 가지. 스스로 대칭이라 뒤집지 않는다
  whole.push(wound([[0, rootWidth], [radius - tipWidth * 2.5, tipWidth], [radius, 0], [radius - tipWidth * 2.5, -tipWidth], [0, -rootWidth]]));

  // 끝의 작은 판. 넓은 판일수록 자주 달린다
  if (draws.tip < lerp(0.9, 0.2, habit)) {
    const size = radius * lerp(0.13, 0.05, habit) * draws.tipSize;
    whole.push(hexagon(radius - size * 0.9, 0, size));
  }

  // 곁가지와 잔가지
  const count = Math.round(branchCount);
  const subCount = Math.round(lerp(0, MOST_SUBS, clamp01((habit - 0.45) / 0.55)));
  for (let i = 0; i < count; i += 1) {
    const slot = draws.slots[i];
    const x = plate + (radius - plate) * Math.min(0.97, (i + 0.5 + slot.shift * 0.35) / count) * 0.92;
    const room = Math.max(0, Math.min((x - plate * 0.6) * 1.15, (radius - x) * 1.05));
    const length = room * lerp(0.28, 1, habit) * slot.length;
    if (length < 4) continue;
    const root = widthAt(x) * lerp(0.95, 0.6, habit) * slot.width;
    half.push(spike(x, 0, SIXTH, length, root));
    tips.push([x + Math.cos(SIXTH) * length, Math.sin(SIXTH) * length]);

    for (let j = 0; j < subCount; j += 1) {
      const sub = slot.subs[j];
      const along = (j + 0.6 + sub.shift * 0.3) / (subCount + 0.8);
      const bx = x + Math.cos(SIXTH) * length * along;
      const by = Math.sin(SIXTH) * length * along;
      const reach = (1 - along) * length * lerp(0.2, 0.55, habit) * sub.length;
      if (reach < 3) continue;
      const width = Math.max(1.6, root * 0.45 * (1 - along * 0.6));
      half.push(spike(bx, by, 0, reach, width));
      half.push(spike(bx, by, 2 * SIXTH, reach * 0.8, width));
    }
  }

  return {
    rot: draws.rot,
    plate,
    rootWidth,
    whole,
    half,
    spines,
    tips,
    rings: [0.74, 0.5, 0.27].map((f, k) => hexagon(0, 0, plate * f * draws.rings[k]))
  };
}

// 결정 하나를 세계 좌표의 조각 목록으로. 가운데 판은 한 번만 넣는다
function assemble(shape, x, y) {
  const move = (points) => points.map(([px, py]) => [px + x, py + y]);
  const turn = (points) => copies(points, shape.rot, false)[0];
  const bodies = [
    move(copies(hexagon(0, 0, shape.plate), shape.rot, false)[0]),
    ...shape.whole.flatMap((points) => copies(points, shape.rot, false).map(move)),
    ...shape.half.flatMap((points) => copies(points, shape.rot, true).map(move))
  ];
  const lines = [
    ...shape.spines.flatMap((points) => copies(points, shape.rot, false, false).map(move)),
    ...shape.rings.map((points) => {
      const loop = move(turn(points));
      return [...loop, loop[0]];
    })
  ];
  const seen = new Set();
  const tips = shape.tips
    .flatMap((point) => copies([point], shape.rot, true).map((copy) => move(copy)[0]))
    .filter(([px, py]) => {
      const key = `${Math.round(px)},${Math.round(py)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { bodies, lines, tips, rot: shape.rot, plate: shape.plate, rootWidth: shape.rootWidth };
}

// 짜 둔 결정. 롤과 모양이 같으면 다시 짓지 않는다
const built = new Map();
function flakeFor(key, make) {
  if (!built.has(key)) {
    built.set(key, make());
    if (built.size > 4) built.delete(built.keys().next().value);
  }
  return built.get(key);
}

function polygons(g, list) {
  for (const points of list) {
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i][0], points[i][1]);
    g.closePath();
  }
}

function polylines(g, list) {
  for (const points of list) {
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i][0], points[i][1]);
  }
}

// 네 갈래 반짝임 하나를 경로에 더한다
function sparkle(g, x, y, r) {
  const w = r * 0.18;
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + w, y - w, x + r, y);
  g.quadraticCurveTo(x + w, y + w, x, y + r);
  g.quadraticCurveTo(x - w, y + w, x - r, y);
  g.quadraticCurveTo(x - w, y - w, x, y - r);
  g.closePath();
}

export const flake = {
  id: "flake",
  name: "FLAKE",
  about: "현미경 아래의 눈 결정 한 송이. 어두운 시야에 육각 대칭으로 빛나고 모서리가 반짝인다",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "결정의 씨앗. 종이의 롤은 그대로 두고 결정과 눈가루만 다시 뽑는다" },
    { key: "size", label: "SIZE", min: 0.4, max: 1, step: 0.02, value: 0.82, hint: "결정의 크기. 시야의 반지름에 대한 비율" },
    { key: "habit", label: "HABIT", min: 0, max: 1, step: 0.05, value: 0.7, hint: "결정의 꼴. 0은 넓은 육각판, 1은 가는 고사리" },
    { key: "branch", label: "BRANCH", min: 0, max: 12, step: 1, value: 6, hint: "가지 하나에 난 곁가지의 수" },
    { key: "ridge", label: "RIDGE", min: 0, max: 1, step: 0.05, value: 0.6, hint: "가지의 등뼈와 판의 동심 육각을 새기는 정도" },
    { key: "bubble", label: "BUBBLE", min: 0, max: 16, step: 1, value: 6, hint: "결정 속 공기방울의 수" },
    { key: "glint", label: "GLINT", min: 0, max: 1, step: 0.05, value: 0.6, hint: "가지 끝과 모서리의 반짝임" },
    { key: "flurry", label: "FLURRY", min: 0, max: 16, step: 1, value: 6, hint: "시야에 떠 있는 작은 결정의 수" },
    { key: "dark", label: "DARK", min: 0.4, max: 1, step: 0.05, value: 0.9, hint: "시야가 얼마나 어두운지" }
  ],
  scope: SCOPE_KNOBS,

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const turn = t * TAU;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;
    const radius = ring * knobs.size;

    // 결정과 눈가루와 방울은 제 씨앗으로 짓는다. FIELD는 잉크와 종이결을 건드리지 않는다
    const seed = (page.seed ^ 0x5f356495 ^ Math.imul(knobs.field + 1, 0x85ebca6b)) >>> 0;
    const key = [seed, width, ring, radius, knobs.habit, Math.round(knobs.branch)].join("|");
    const scene = flakeFor(key, () => {
      const rng = makeRng(seed);
      const main = assemble(grow(rng, radius, knobs.habit, knobs.branch), cx, cy);
      // 방울은 열에 일곱이 가운데 판에, 나머지는 가지를 따라 앉는다
      const bubbles = Array.from({ length: MOST_BUBBLE }, () => {
        const angle = rng.float(0, TAU);
        const inPlate = rng.next() < 0.7;
        const spread = rng.next();
        const lean = rng.float(-1, 1);
        const size = rng.float(2.5, 7);
        const a = inPlate ? angle : Math.round((angle - main.rot) / SIXTH) * SIXTH + main.rot;
        const dist = inPlate ? Math.sqrt(spread) * main.plate * 0.8 : lerp(main.plate, radius * 0.6, spread);
        const side = inPlate ? 0 : lean * main.rootWidth * 0.4;
        return {
          x: cx + Math.cos(a) * dist - Math.sin(a) * side,
          y: cy + Math.sin(a) * dist + Math.cos(a) * side,
          r: size
        };
      });
      const flurry = Array.from({ length: MOST_FLURRY }, () => {
        const angle = rng.float(0, TAU);
        const dist = Math.sqrt(rng.next()) * ring * 0.92;
        const size = rng.float(10, 34);
        const shape = grow(rng, size, rng.next(), rng.int(0, 2));
        return {
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          body: assemble(shape, 0, 0).bodies,
          tone: rng.float(0.25, 0.5),
          beat: rng.int(1, 2),
          phase: rng.float(0, TAU),
          rock: rng.float(0.08, 0.2)
        };
      });
      const glints = main.tips.map(() => ({ beat: rng.int(1, 3), phase: rng.float(0, TAU), size: rng.float(0.7, 1.3) }));
      return { main, bubbles, flurry, glints };
    });
    const { main } = scene;

    const { night, deepest, light } = nightAndLight(S.drums);
    const [glowInk] = light;
    const carve = (paint) => {
      for (const sep of night) sep.knockout((plate) => plate.draw(paint));
    };

    // 바닥. 밤의 통을 깔고, 암시야 조명처럼 가운데를 조금 밝힌다
    for (const sep of night) sep.flood((sep === deepest ? 0.95 : 0.8) * knobs.dark);
    deepest.knockout((plate) =>
      plate.draw((g) => {
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, ring);
        glow.addColorStop(0, "rgba(0, 0, 0, 0.3)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        g.fillStyle = glow;
        g.fillRect(0, 0, width, height);
      })
    );

    // 눈가루. 결정 뒤에 흐리게, 제자리에서 까딱인다
    for (const bit of scene.flurry.slice(0, Math.round(knobs.flurry))) {
      const angle = Math.sin(turn * bit.beat + bit.phase) * bit.rock;
      const shade = bit.tone * (0.85 + 0.15 * Math.sin(turn * bit.beat + bit.phase * 1.7));
      carve((g) => {
        g.translate(bit.x, bit.y);
        g.rotate(angle);
        g.globalAlpha = shade;
        g.beginPath();
        polygons(g, bit.body);
        g.fill();
        g.globalAlpha = Math.min(1, shade + 0.25);
        g.lineWidth = 2;
        g.lineJoin = "round";
        g.stroke();
      });
    }

    // 결정의 몸. 옅게 파내고, 가운데 판은 한 번 더, 모서리는 끝까지
    const rim = Math.max(3, radius * 0.009);
    carve((g) => {
      g.globalAlpha = 0.6;
      g.beginPath();
      polygons(g, main.bodies);
      g.fill();
    });
    carve((g) => {
      g.globalAlpha = 0.35;
      g.beginPath();
      polygons(g, main.bodies.slice(0, 1));
      g.fill();
    });
    carve((g) => {
      g.lineWidth = rim;
      g.lineJoin = "round";
      g.beginPath();
      polygons(g, main.bodies);
      g.stroke();
    });

    // 새긴 결. 가장 진한 통을 도로 얹는다
    if (knobs.ridge > 0) {
      deepest.draw((g) => {
        g.globalAlpha = 0.55 * knobs.ridge;
        g.lineWidth = Math.max(2.5, main.rootWidth * 0.25);
        g.lineCap = "round";
        g.lineJoin = "round";
        g.beginPath();
        polylines(g, main.lines);
        g.stroke();
      });
    }

    // 공기방울. 테는 희고 속은 어둡다
    const bubbles = scene.bubbles.slice(0, Math.round(knobs.bubble));
    if (bubbles.length) {
      carve((g) => {
        g.lineWidth = 2.2;
        g.beginPath();
        for (const b of bubbles) {
          g.moveTo(b.x + b.r, b.y);
          g.arc(b.x, b.y, b.r, 0, TAU);
        }
        g.stroke();
      });
      deepest.draw((g) => {
        g.globalAlpha = 0.45;
        g.beginPath();
        for (const b of bubbles) {
          g.moveTo(b.x + b.r * 0.55, b.y);
          g.arc(b.x, b.y, b.r * 0.55, 0, TAU);
        }
        g.fill();
      });
    }

    // 반짝임. 끝마다 저마다 다른 박자로 깜빡인다
    if (knobs.glint > 0) {
      const lit = main.tips
        .map(([x, y], i) => {
          const g = scene.glints[i];
          const pulse = Math.max(0, Math.sin(turn * g.beat + g.phase));
          return { x, y, r: knobs.glint * 14 * g.size * pulse * pulse };
        })
        .filter((s) => s.r > 1.5);
      if (lit.length) {
        carve((g) => {
          g.beginPath();
          for (const s of lit) sparkle(g, s.x, s.y, s.r);
          g.fill();
        });
        if (glowInk) {
          glowInk.draw((g) => {
            g.globalAlpha = 0.8;
            g.beginPath();
            for (const s of lit) {
              g.moveTo(s.x + s.r * 0.22, s.y);
              g.arc(s.x, s.y, s.r * 0.22, 0, TAU);
            }
            g.fill();
          });
        }
      }
    }

    dim(deepest, page, ring, knobs.vignette);
    roundel(S, page, ring);
  }
};
