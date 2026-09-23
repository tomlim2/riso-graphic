// 산호초. 잠수부가 산호초의 앞머리를 따라 헤엄치며 옆을 본다. 물이 판을 채우고, 빛은 수면에서 내려온다.
//
// 산호는 그리지 않는다. 산호가 자라는 규칙과 조사자가 잰 치수로 짓는다.
//
//   뼈대    죽은 산호가 쌓여 굳은 바위 등성이가 나란히 뻗고, 그 사이 골에는 모래가 깔린다. 등성이 사이 8미터,
//           골의 폭 1~2미터, 등성이의 머리는 둥글다. 등성이는 바다 쪽으로 뻗으므로, 앞머리를 따라 헤엄치는
//           눈앞을 가로질러 한 줄씩 물러난다
//   덮개    산 산호가 바닥을 덮은 몫은 조사자가 줄을 따라 재는 값이다. 건강한 산호초는 40~50%다(COVER). 산호는
//           바위에 붙어 자란다. 생장형마다 덮개에서 차지하는 몫을 따로 준다
//   크기    군체 지름의 로그가 정규 분포를 따른다 — 작은 군체가 많고 큰 군체는 드물다. 가운데값 30센티,
//           log10의 표준편차 0.28
//   가지형  사슴뿔 산호. 줄기가 곧게 뻗으며 마디마다 곁가지를 60~90도로 낸다. 가지는 지름 1.2센티의 원기둥이고
//           새로 자라는 끝이 하얗다. 군체는 폭의 절반 높이다. 파도를 세게 받으면 작고 촘촘하다
//   탁상형  가는 줄기 위의 수평한 판. 판은 넓든 좁든 바닥 위 0.43미터에 앉고, 평균 1미터로 넓다. 판 위의 가지결이
//           한가운데서 테로 퍼진다
//   뇌산호  반구의 돔을 굽이치는 골이 덮는다. 골 하나와 등성이 하나가 1~2센티다. 골은 가까이서는 부추기고
//           멀리서는 누르는 두 힘이 겨뤄 스스로 무늬를 짓는 규칙(튜링)으로 편다
//   부채    한 평면에 펼친 그물. 잔가지가 3~6밀리마다 나서 서로 이어 붙는다. 평면은 파도가 밀고 당기는 방향을
//           마주 보되, 작은 부채는 아무 쪽이나 보고 클수록 반듯이 마주 본다
//   물      검은 과녁이 물빛에 묻히는 거리(시정)는 빛줄기 감쇠계수의 4.8분의 1이다. 대비는 e^-cr로 준다. 산호는
//           종이까지 파내 제 빛깔로 찍고 그 앞의 물을 막으로 덮는다. 물은 붉은빛을 먼저 먹는다 — 멀수록 붉은
//           통이 노란 통보다 빨리 옅어진다. 올려다본 물이 가장 밝고 눈높이의 먼 물이 짙다
//   빛      햇빛은 물에 들며 꺾여 천정에서 48.6도 안쪽으로 온다. 빛줄기는 나란하므로 판에서는 꺾인 해에서
//           부챗살처럼 퍼진다. 물결이 햇빛을 모았다 흩어 빛줄기가 깜박인다
//
// 참고: 생장형(English, Wilkinson & Baker 1997), 덮개(Gardner 외 2003, Bruno & Selig 2007), 군체 크기의 로그정규
// 분포(Bak & Meesters 1998, Medina-Valmaseda 외 2020), 사슴뿔 산호(Acropora Biological Review Team 2005,
// Agudo-Adriani 외 2016), 탁상형의 높이(Kerry 2015, Ferrari 외 2017), 뇌산호의 골(Veron, Corals of the World),
// 부채산호의 그물과 방향(Bayer 1961, Wainwright & Dillon 1969), 물의 흡수(Pope & Fry 1997), 시정(Zaneveld &
// Pegau 2003), 물속의 밝기(Tyler 1958), 빛줄기의 깜박임(Hieronymi 외 2012), 등성이와 골(Goreau 1959, Rogers
// 외 2013), 튜링 무늬(Turing 1952).

import { makeRng, makeNoise2, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { bluest, reddest, yellowest, rgbOf } from "../drums.js";
import { carve, stain } from "../night.js";
import { stainsFor, soak } from "../stains.js";
import { soften } from "../blur.js";
import { keeper } from "../keep.js";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// 눈. 화각은 60도다
const FOV = 60 * DEG;
// 물의 굴절률
const WATER = 1.333;
// 가로 시정. 검은 과녁이 물빛에 묻히는 거리는 빛줄기 감쇠계수 c의 4.8분의 1이다
const SIGHT = 4.8;
// 대비가 이보다 낮으면 찍지 않고, 이보다 높으면 제 꼴을 다 찍는다. 그 사이는 윤곽만 몇 켜로 끊어 찍는다
const FAINT = 0.03;
const DETAIL = 0.35;
const LAYERS = 5;
// 군체 지름. 지름의 로그가 정규 분포를 따른다(가운데값 14~36센티, log10의 표준편차 0.25~0.3). 탁상형은
// 평균 1미터쯤으로 크다
const MEDIAN = 0.3;
const SPREAD = 0.28 * Math.LN10;
const TABLE_MEDIAN = 0.9;
const SMALLEST = 0.06;
const MOST = 1400;
// 물이 빛깔을 먹는 정도(1/미터). 붉은빛이 가장 먼저 사라지고 노란빛은 오래 간다(순수한 물의 흡수, 650nm와
// 600nm 사이, 575nm)
const EAT_WARM = 0.25;
const EAT_SUN = 0.077;
// 산호초의 뼈대 — 등성이와 골. 산호가 쌓아 올린 바위 등성이가 나란히 뻗고, 그 사이 골에는 모래가 깔린다.
// 등성이 사이 8미터, 골의 폭 1~2미터, 등성이의 높이, 모래 위에 서는 군체의 몫(바위 위에 대한)
const SPUR = 8;
const GROOVE = 1.6;
const RELIEF = 1.2;
const SAND = 0.08;
// 바닥을 켜로 잘라 뒤에서 앞으로 찍는다. 이웃한 켜의 판 위 간격(픽셀)
const SLICE = 7;

// 가지형(사슴뿔 산호). 가지 지름(0.25~1.5센티), 곁가지 사이(가지 지름의 배수), 곁가지가 나가는 각(60~90도)
const TWIG = 0.012;
const NODE = 5;
const FORK = 75 * DEG;
// 탁상형. 판의 높이(미터 — 판이 넓든 좁든 바닥 위 0.43미터에 앉는다), 두께, 테의 가지 끝 사이
const LIFT = 0.43;
const PLATE = 0.07;
const RIM = 0.04;
// 뇌산호. 높이(지름에 대한 비 — 반구), 골과 등성이 한 벌의 폭(1~2센티)
const DOME = 0.5;
const VALLEY = 0.015;
const MAZE = 128;
// 부채산호. 폭(높이에 대한 비), 그물눈(잔가지가 3~6밀리마다 나서 이어 붙는다)
const FAN_WIDE = 1.2;
const MESH = 0.0045;

// 판의 망점 한 칸. 이보다 가는 무늬는 망점에 녹는다
const CELL = 9;

const builds = keeper(3);
const mazes = keeper(4);

const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const unit = (p) => {
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / l, p[1] / l, p[2] / l];
};
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
// d에 수직인 두 축
function axesOf(d) {
  const helper = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(d, helper));
  return [u, cross(d, u)];
}
// d를 angle만큼, spin 쪽으로 기울인다
function tilt(d, angle, spin) {
  const [u, v] = axesOf(d);
  const side = add(add([0, 0, 0], u, Math.cos(spin)), v, Math.sin(spin));
  return unit(add(add([0, 0, 0], d, Math.cos(angle)), side, Math.sin(angle)));
}

// 뇌산호의 미로. 가까이서는 서로 부추기고 멀리서는 서로 누르는 두 힘이 겨루면(튜링) 폭이 고른 골이
// 굽이치며 판을 채운다. 가까운 이웃의 평균이 먼 이웃의 평균보다 크면 짙어지고 작으면 옅어진다
function turing(seed) {
  return mazes(`${seed}`, () => {
    const rng = makeRng((seed ^ 0x3c6ef372) >>> 0);
    const x = new Float32Array(MAZE * MAZE);
    for (let i = 0; i < x.length; i += 1) x[i] = (rng.next() * 2 - 1) * 0.1;
    for (let step = 0; step < 180; step += 1) {
      const near = soften(x, MAZE, MAZE, 2);
      const wide = soften(x, MAZE, MAZE, 4);
      for (let i = 0; i < x.length; i += 1) x[i] = Math.max(-1, Math.min(1, x[i] + 0.05 * Math.tanh((near[i] - wide[i]) * 8)));
    }
    return soften(x, MAZE, MAZE, 1);
  });
}

// 미로의 한 점. 가장자리 네 칸은 쓰지 않는다 — 벽을 따라 골이 줄을 선다
function mazeAt(field, u, v) {
  const lo = 4;
  const hi = MAZE - 5;
  const span = hi - lo;
  const wrap = (s) => lo + (((s - lo) % (2 * span)) + 2 * span) % (2 * span);
  let x = wrap(u);
  let y = wrap(v);
  if (x > hi) x = 2 * hi - x;
  if (y > hi) y = 2 * hi - y;
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const a = field[j * MAZE + i];
  const b = field[j * MAZE + i + 1];
  const c = field[(j + 1) * MAZE + i];
  const d = field[(j + 1) * MAZE + i + 1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

// 가지형(사슴뿔 산호) 군체. 줄기 몇이 바닥 한가운데서 비스듬히 올라 곧게 뻗고, 마디마다 곁가지를 60~90도로
// 낸다. 곁가지도 같은 규칙으로 자란다. 가지는 원기둥이라 끝까지 굵기가 같다. 군체는 폭의 절반 높이의 덤불로
// 자라고(높이 27~80센티에 길이 50~175센티), 그 둘레 밖으로 나가는 가지는 거기서 멎어 끝이 된다. 가지 끝은
// 새로 자라는 자리라 공생조류가 적어 하얗다. 파도를 세게 받는 군체는 작고 촘촘하다 — 곁가지 사이가 짧고
// 곁가지가 잦다
function branching(rng, diameter, hand, surge) {
  const radius = diameter / 2;
  const tall = diameter * 0.5;
  const node = TWIG * NODE * (1 - 0.4 * surge);
  const side = 0.5 + 0.3 * surge;
  const inside = ([x, y, z]) => y >= 0 && (x * x + z * z) / (radius * radius) + (y * y) / (tall * tall) <= 1;
  const segs = [];
  const tips = [];
  const queue = [];
  const trunks = rng.int(2, 4);
  for (let i = 0; i < trunks; i += 1) {
    const az = (i / trunks) * TAU + rng.float(-0.6, 0.6);
    const lean = rng.float(0.3, 0.9);
    queue.push({ p: [0, 0, 0], d: [Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az)] });
  }
  let head = 0;
  for (; head < queue.length && segs.length < 600; head += 1) {
    const { p, d } = queue[head];
    const length = node * rng.float(0.7, 1.3);
    const bend = rng.float(0, 0.25) * hand;
    const spin = rng.float(0, TAU);
    const lateral = rng.next() < side;
    const angle = FORK + rng.float(-15, 15) * DEG;
    const roll = rng.float(0, TAU);
    const q = add(p, d, length);
    if (!inside(q)) {
      tips.push({ p, d });
      continue;
    }
    segs.push([p, q]);
    // 줄기는 곧게 이어 가되 조금 휘고, 빛 쪽으로 조금 든다. 곁가지는 옆으로 나가 위로 휜다
    queue.push({ p: q, d: unit(add(tilt(d, bend, spin), [0, 1, 0], 0.1)) });
    if (lateral) queue.push({ p: q, d: unit(add(tilt(d, angle, roll), [0, 1, 0], 0.35)) });
  }
  // 다 자라지 못하고 멎은 가지도 끝이다
  for (; head < queue.length; head += 1) tips.push(queue[head]);
  return { segs, tips, tall };
}

// 탁상형 군체. 가는 줄기 위에 수평한 판이 앉는다. 판은 한가운데서 퍼지는 가지들이 갈라지며 짠
// 것이라, 테에는 가지 끝이 고른 간격으로 늘어선다
function table(rng, diameter, hand) {
  const radius = diameter / 2;
  // 판은 넓든 좁든 바닥 위 같은 높이에 앉는다(자라며 판은 넓어지고 줄기는 굵어진다). 아주 작은 판만 낮다
  const lift = Math.min(LIFT, diameter * 0.8) * rng.float(0.94, 1.06);
  const count = Math.max(12, Math.round((TAU * radius) / RIM));
  const rim = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * TAU + rng.float(-0.4, 0.4) * (TAU / count);
    rim.push({ a, r: radius * (1 - rng.next() * 0.1 * (0.4 + hand)) });
  }
  const fibres = rim.map(({ a, r }) => ({ a, from: r * rng.float(0.2, 0.75), to: r }));
  return { radius, lift, rim, fibres, stalk: Math.max(0.03, radius * 0.12) };
}

// 부채산호. 한 평면에 펼친 그물이다. 굵은 줄기 몇이 밑동에서 부챗살처럼 퍼지고, 그 사이를 가는 잔가지가
// 서로 이어 붙어 그물눈을 짓는다. 평면은 파도가 밀고 당기는 방향을 마주 본다 — 작은 부채는 아무 쪽이나 보고,
// 클수록 반듯이 마주 본다
function fanOf(rng, height, mesh, hand) {
  const wide = height * FAN_WIDE * rng.float(0.8, 1.15);
  const stalk = height * 0.08;
  const bumps = [rng.float(0, TAU), rng.float(0, TAU)];
  // 둘레. 밑동 위에 얹힌 둥근 부채다
  const edge = (angle) => {
    const wob = 1 + 0.06 * (0.5 + hand) * (Math.sin(angle * 3 + bumps[0]) + 0.6 * Math.sin(angle * 7 + bumps[1]));
    return [Math.cos(angle) * (wide / 2) * wob, stalk + (height - stalk) * (0.5 + 0.5 * Math.sin(angle)) * wob];
  };
  const outline = [];
  for (let i = 0; i <= 40; i += 1) {
    const angle = -0.08 * Math.PI + (i / 40) * 1.16 * Math.PI;
    outline.push(edge(angle));
  }
  outline.push([0, stalk]);
  const inside = (a, b) => {
    // 둘레 다각형 안인가
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
      const [ai, bi] = outline[i];
      const [aj, bj] = outline[j];
      if (bi > b !== bj > b && a < ((aj - ai) * (b - bi)) / (bj - bi) + ai) hit = !hit;
    }
    return hit;
  };
  // 굵은 줄기. 밑동에서 둘레까지
  const veins = [];
  const count = rng.int(4, 6);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.PI * (0.12 + (0.76 * (i + rng.float(0.3, 0.7))) / count);
    const [ea, eb] = edge(angle);
    const bow = rng.float(-0.08, 0.08);
    const line = [];
    for (let k = 0; k <= 8; k += 1) {
      const s = k / 8;
      line.push([ea * s + bow * height * Math.sin(Math.PI * s), stalk + (eb - stalk) * s]);
    }
    veins.push(line);
  }
  // 그물. 고르게 흩은 점을 가까운 이웃끼리 잇되, 두 점 사이에 더 가까운 점이 끼어 있으면 잇지 않는다
  // (상대 이웃 그래프). 그물눈이 다각형으로 닫힌다
  const points = [];
  for (let b = stalk; b < height * 1.05; b += mesh * 0.9) {
    for (let a = -wide / 2; a < wide / 2; a += mesh) {
      const pa = a + rng.float(-0.35, 0.35) * mesh;
      const pb = b + rng.float(-0.35, 0.35) * mesh;
      if (inside(pa, pb)) points.push([pa, pb]);
    }
  }
  const net = [];
  const reach = mesh * 1.8;
  // 이웃은 칸으로 나눠 찾는다. 그물눈 둘 너비 밖의 점은 잇지도 막지도 않는다
  const bins = new Map();
  const binOf = (a, b) => `${Math.floor(a / reach)},${Math.floor(b / reach)}`;
  points.forEach((point, i) => {
    const bin = binOf(point[0], point[1]);
    if (!bins.has(bin)) bins.set(bin, []);
    bins.get(bin).push(i);
  });
  const around = ([a, b]) => {
    const ca = Math.floor(a / reach);
    const cb = Math.floor(b / reach);
    const out = [];
    for (let i = ca - 1; i <= ca + 1; i += 1) for (let k = cb - 1; k <= cb + 1; k += 1) out.push(...(bins.get(`${i},${k}`) || []));
    return out;
  };
  for (let i = 0; i < points.length; i += 1) {
    const near = around(points[i]);
    for (const j of near) {
      if (j <= i) continue;
      const dij = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      if (dij > reach) continue;
      let blocked = false;
      for (const k of near) {
        if (k === i || k === j) continue;
        const dik = Math.hypot(points[i][0] - points[k][0], points[i][1] - points[k][1]);
        const djk = Math.hypot(points[j][0] - points[k][0], points[j][1] - points[k][1]);
        if (Math.max(dik, djk) < dij) {
          blocked = true;
          break;
        }
      }
      if (!blocked) net.push([points[i], points[j]]);
    }
  }
  const turn = normalOf(rng) * 90 * DEG * Math.exp(-height / 0.35);
  return { height, wide, stalk, outline, veins, net, turn, phase: rng.next() };
}

// 로그정규 분포의 지름
function diameterOf(rng, largest) {
  return Math.min(largest, Math.max(SMALLEST, MEDIAN * Math.exp(SPREAD * normalOf(rng))));
}

// 표준 정규 분포의 한 값
function normalOf(rng) {
  const u = Math.max(1e-9, rng.next());
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

// 눈. 등성이 머리보다 EYE만큼 높이 떠서 LOOK만큼 내려다본다. 판의 한가운데가 눈이 향한 곳이다. 높이는 모래
// 바닥(골)에서 잰다
function lens(knobs, width, height) {
  const focal = width / 2 / Math.tan(FOV / 2);
  const eye = RELIEF + knobs.eye;
  const pitch = knobs.look * DEG;
  const cos = Math.cos(pitch);
  const sin = Math.sin(pitch);
  const middle = height / 2;
  // 눈앞으로의 깊이. 한 점의 판 위 크기는 이것에 반비례한다
  const depth = (x, y, z) => Math.max(0.05, z * cos - (y - eye) * sin);
  const project = (x, y, z) => {
    const ahead = depth(x, y, z);
    return [width / 2 + (focal * x) / ahead, middle - (focal * ((y - eye) * cos + z * sin)) / ahead];
  };
  // 판의 한 줄(y)을 지나는 시선. 위로 드는 각, 바닥에 닿으면 그 거리와 물속을 지나는 길이
  const row = (y) => {
    const up = (middle - y) / focal;
    const dirY = up * cos - sin;
    const dirZ = up * sin + cos;
    const rise = Math.atan2(dirY, dirZ);
    if (dirY >= 0) return { rise, z: Infinity, path: Infinity };
    const t = eye / -dirY;
    return { rise, z: t * dirZ, path: t * Math.hypot(dirY, dirZ) };
  };
  return { width, height, focal, eye, pitch, horizon: middle - focal * Math.tan(pitch), depth, project, row };
}

// 산호초를 짓는다. 시간과 무관한 것은 모두 여기서 한 번 짓고 쥐고 있는다
function build(seed, knobs, cam) {
  const { height, focal, eye, c, project } = cam;
  const rng = makeRng(seed);
  // 눈에서 한 점까지 물속을 지나는 길이
  const reachOf = (x, y, z) => Math.hypot(x, y - eye, z);

  // 바닥의 부채꼴. 판 아래 끝에 걸리는 바닥보다 조금 가까이부터, 대비가 FAINT로 떨어지는 거리까지
  const bottom = cam.row(height).z;
  // 등성이는 모래보다 높아 눈에 더 가까이 걸린다. 눈앞 30센티부터 본다
  const near = Math.min(bottom * 0.6, 0.3);
  const far = Math.log(1 / FAINT) / c;
  // 거리 z에서 판의 폭에 드는 바닥의 반폭. 내려다볼수록 앞으로의 깊이가 z보다 길어 넓게 든다
  const spread = Math.tan(FOV / 2) * 1.2;
  const lean = Math.cos(cam.pitch);
  const drop = eye * Math.sin(cam.pitch);
  const halfAt = (z) => spread * (z * lean + drop);
  const wedge = spread * (lean * (far * far - near * near) + 2 * drop * (far - near));
  // 부채꼴 안에 고르게 한 점을 뽑는다. 거리 z에 놓일 몫은 그 거리의 폭에 비례한다
  const spot = (u, v) => {
    const whole = (lean / 2) * (far * far - near * near) + drop * (far - near);
    const z = (-drop + Math.sqrt(drop * drop + 2 * lean * ((lean / 2) * near * near + drop * near + u * whole))) / lean;
    return [(v - 0.5) * 2 * halfAt(z), z];
  };

  // 뼈대. 잠수부는 산호초의 앞머리를 따라 헤엄치며 옆을 본다. 등성이는 바다 쪽으로 뻗으므로 눈앞을 가로질러
  // 나란히 서고, 멀어질수록 한 줄씩 물빛에 묻힌다. 등성이의 단면은 머리가 둥근 |cos|이고, 골 폭만큼은 모래가
  // 덮어 평평하다. 등성이는 조금씩 굽이치고 겉은 울퉁불퉁하다. 가장 가까운 등성이가 어디 걸릴지는 씨앗이 정한다
  const ground = makeRng((seed ^ 0x2545f491) >>> 0);
  const knob = makeNoise2(ground);
  const phase = ground.float(0, SPUR);
  const groove = Math.sin((Math.PI * GROOVE) / (2 * SPUR));
  const lift = (x, z) => {
    const bend = (knob(x / 9 + 3.7, 11.3) - 0.5) * SPUR * 0.5;
    const across = Math.abs(Math.cos((Math.PI * (z + phase + bend)) / SPUR));
    if (across <= groove) return 0;
    const head = Math.sqrt((across - groove) / (1 - groove));
    return RELIEF * head * (0.7 + 0.6 * knob(x / 1.6 + 29, z / 1.6 + 7));
  };

  // 군체를 하나씩 뽑아 늘어놓는다. 산 산호가 바닥 전체의 COVER만큼 덮을 때까지다 — 조사자가 줄을 따라
  // 재는 값이라 모래까지 센다. 산호는 바위에 붙어 자라므로 거의 다 바위 위에 서고, 모래 위에는 바위 위의
  // SAND배만큼만 선다. 군체끼리는 서로 파고들지 않는다
  // 생장형의 손잡이는 덮개에서 차지하는 몫이다(조사자가 생장형마다 덮개를 따로 잰다). 군체 하나가 덮는 넓이가
  // 생장형마다 다르므로 수로 바꿔 뽑는다 — 탁상형은 지름이 세 배라 아홉 배를 덮고, 부채는 밑동만 센다
  const areas = [1, (TABLE_MEDIAN / MEDIAN) ** 2, 1, 0.5];
  const weights = [knobs.branch, knobs.table, knobs.brain, knobs.fan].map((w, i) => w / areas[i]);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const colonies = [];
  const grid = new Map();
  const cellOf = (x, z) => `${Math.floor(x / 0.5)},${Math.floor(z / 0.5)}`;
  let rockHits = 0;
  let samples = 0;
  let onRock = 0;
  let onSand = 0;
  const cover = knobs.cover / 100;
  for (let tries = 0; total > 0 && colonies.length < MOST && tries < MOST * 14; tries += 1) {
    const [x, z] = spot(rng.next(), rng.next());
    const size = diameterOf(rng, knobs.size);
    let pick = rng.next() * total;
    let form = 0;
    while (form < 3 && pick >= weights[form]) pick -= weights[form++];
    const diameter = form === 1 ? Math.min(knobs.size, Math.max(0.2, (size * TABLE_MEDIAN) / MEDIAN)) : size;
    const grow = rng.int(0, 0x7fffffff);
    const y = lift(x, z);
    const rock = y > 0;
    samples += 1;
    if (rock) rockHits += 1;
    // 바위와 모래의 넓이는 뽑은 자리의 몫으로 어림한다. 바위 위의 덮개는 바닥 전체의 덮개를 바위의 몫으로 나눈 것이다
    const rockArea = (wedge * rockHits) / samples;
    const sandArea = wedge - rockArea;
    const onRockWant = Math.min(0.95 * rockArea, cover * wedge);
    if (rock ? onRock >= onRockWant : onSand >= SAND * cover * sandArea) {
      if (onRock >= onRockWant && onSand >= SAND * cover * sandArea && samples > 200) break;
      continue;
    }
    const reach = diameter * (form === 3 ? 0.25 : 0.5);
    const gx = Math.floor(x / 0.5);
    const gz = Math.floor(z / 0.5);
    const span = Math.ceil((reach + knobs.size / 2) / 0.5);
    let clash = false;
    for (let i = gx - span; i <= gx + span && !clash; i += 1) {
      for (let k = gz - span; k <= gz + span && !clash; k += 1) {
        for (const other of grid.get(`${i},${k}`) || []) {
          if (Math.hypot(other.x - x, other.z - z) < (other.reach + reach) * 0.72) {
            clash = true;
            break;
          }
        }
      }
    }
    if (clash) continue;
    const one = { kind: "colony", x, y, z, diameter, form, reach, grow };
    colonies.push(one);
    const key = cellOf(x, z);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(one);
    const area = (Math.PI / 4) * diameter * diameter * (form === 3 ? 0.5 : 1);
    if (rock) onRock += area;
    else onSand += area;
  }
  const rockShare = rockHits / Math.max(1, samples);

  // 바닥의 켜. 뒤에서 앞으로, 판에서 고른 높이 간격이 되게 자른다. 켜마다 바위가 솟은 자리만 그 켜의 모래
  // 선 위로 채운다 — 가까운 켜가 먼 켜의 아래를 덮는다
  // 켜의 간격은 판 위에서 고르다. 모래 선이 판 아래 끝에 닿는 거리까지는 모래 높이로, 그보다 가까이는 등성이
  // 머리 높이로 잰다 — 가까이 보이는 것은 등성이 머리뿐이다
  const depths = [];
  const inner = 1 / Math.max(near, bottom);
  for (let u = 1 / far; u < inner; u += SLICE / (focal * eye)) depths.push(1 / u);
  for (let u = inner; u <= 1 / near; u += SLICE / (focal * Math.max(0.2, eye - RELIEF))) depths.push(1 / u);
  const slices = [];
  for (const z of depths) {
    const half = halfAt(z);
    const steps = 64;
    const shape = new Path2D();
    let run = null;
    let any = false;
    const close = () => {
      if (!run) return;
      const [x0] = run[0];
      const [x1] = run[run.length - 1];
      const points = run.map(([x, y]) => project(x, y, z));
      points.push(project(x1, 0, z), project(x0, 0, z));
      shapes.polySubpath(shape, points, true);
      any = true;
      run = null;
    };
    for (let i = 0; i <= steps; i += 1) {
      const x = -half + (2 * half * i) / steps;
      const y = lift(x, z);
      if (y > 0) {
        run ??= i > 0 ? [[x - (2 * half) / steps, 0]] : [];
        run.push([x, y]);
      } else if (run) {
        run.push([x, 0]);
        close();
      }
    }
    close();
    if (any) slices.push({ kind: "slice", z, shape });
  }

  // 먼 것부터 찍는다
  const items = [...slices, ...colonies];
  items.sort((a, b) => b.z - a.z);

  const maze = turing(seed);
  const bins = [];
  const nearOnes = [];
  for (const one of items) {
    const reach = one.kind === "slice" ? one.z : reachOf(one.x, one.y, one.z);
    const clear = Math.exp(-c * reach);
    const scale = one.kind === "slice" ? focal / one.z : focal / cam.depth(one.x, one.y, one.z);
    if (clear < DETAIL) {
      // 먼 것은 윤곽만 찍는다. 물빛에 묻혀 속은 보이지 않는다. 대비를 몇 켜로 끊어 켜마다 한 번에 찍는다
      const layer = Math.min(LAYERS - 1, Math.floor(((clear - FAINT) / (DETAIL - FAINT)) * LAYERS));
      bins[layer] ??= { shape: new Path2D(), clear: 0, reach: 0, n: 0 };
      if (one.kind === "slice") bins[layer].shape.addPath(one.shape);
      else {
        if ((one.diameter / 2) * scale < 0.5) continue;
        const [bx, by] = project(one.x, one.y, one.z);
        silhouette(bins[layer].shape, one, bx, by, scale, makeRng(one.grow >>> 0), cam, knobs);
      }
      bins[layer].clear += clear;
      bins[layer].reach += reach;
      bins[layer].n += 1;
      continue;
    }
    if (one.kind === "slice") {
      // 사이에 군체가 없고 빛깔이 거의 같은 이웃 켜는 한 번에 찍는다
      const last = nearOnes[nearOnes.length - 1];
      if (last && last.kind === "slice" && Math.abs(last.clear - clear) < 0.02) last.shape.addPath(one.shape);
      else nearOnes.push({ kind: "slice", clear, reach, shape: new Path2D(one.shape) });
    }
    else nearOnes.push({ ...shapeNear(one, clear, scale, makeRng(one.grow >>> 0), knobs, cam, project, maze), reach });
  }
  const layers = bins.filter(Boolean).map((bin) => ({ shape: bin.shape, clear: bin.clear / bin.n, reach: bin.reach / bin.n }));
  return { colonies, layers, nearOnes, rock: rockShare, covered: (onRock + onSand) / wedge };
}

// 먼 군체의 윤곽. 가지형은 가지 끝이 둥글게 모인 덤불, 탁상형은 줄기 위의 판, 뇌산호는 돔, 부채산호는
// 파도의 방향을 마주 본 만큼 좁아진 부채다
function silhouette(path, one, bx, by, scale, bits, cam, knobs) {
  const r = (one.diameter / 2) * scale;
  if (one.form === 0) {
    const tall = one.diameter * 0.55 * scale;
    path.moveTo(bx + r, by);
    path.ellipse(bx, by, r, tall * 0.55, 0, 0, Math.PI, true);
    const heads = bits.int(5, 8);
    for (let i = 0; i < heads; i += 1) {
      const a = Math.PI * (0.08 + (0.84 * (i + bits.float(0.25, 0.75))) / heads);
      const hx = bx - Math.cos(a) * r * 0.72;
      const hy = by - Math.sin(a) * tall * 0.72;
      shapes.circleSubpath(path, hx, hy, Math.max(0.5, r * bits.float(0.26, 0.4)));
    }
  } else if (one.form === 1) {
    const height = Math.min(LIFT, one.diameter * 0.8);
    const lift = height * scale;
    const flat = Math.max(0.5, (r * Math.abs(cam.eye - one.y - height)) / one.z);
    path.moveTo(bx + r, by - lift);
    path.ellipse(bx, by - lift, r, flat + PLATE * scale, 0, 0, TAU);
    path.rect(bx - Math.max(0.5, r * 0.1), by - lift, Math.max(1, r * 0.2), lift);
  } else if (one.form === 2) {
    const tall = one.diameter * DOME * scale;
    path.moveTo(bx + r, by);
    path.ellipse(bx, by, r, tall, 0, 0, Math.PI, true);
    path.ellipse(bx, by, r, Math.max(0.5, (r * Math.abs(cam.eye - one.y)) / one.z), 0, 0, Math.PI);
  } else {
    const face = Math.max(0.15, Math.abs(Math.cos(knobs.swell * DEG)));
    const tall = one.diameter * scale;
    path.moveTo(bx + r * FAN_WIDE * face, by - tall * 0.5);
    path.ellipse(bx, by - tall * 0.52, r * FAN_WIDE * face, tall * 0.48, 0, 0, TAU);
    path.rect(bx - 0.6, by - tall * 0.1, 1.2, tall * 0.1);
  }
}

// 가까운 군체를 짓는다. 판에 찍을 모양까지 여기서 지어 두고 쥐고 있는다(부채산호는 흔들리므로 평면의
// 뼈대만)
function shapeNear(one, clear, scale, bits, knobs, cam, project, maze) {
  const { focal, eye } = cam;
  const hand = knobs.hand;
  const [bx, by] = project(one.x, one.y, one.z);
  const out = { form: one.form, clear, x: one.x, y: one.y, z: one.z, bx, by, scale, diameter: one.diameter };

  // 바닥의 그늘. 군체 밑의 바위나 모래에 앉는다
  const foot = (one.diameter / 2) * (one.form === 3 ? 0.35 : 0.85);
  out.shadow = new Path2D();
  const flat = Math.max(0.05, (eye - one.y) / one.z);
  out.shadow.ellipse(bx, by, foot * scale, Math.max(0.6, foot * scale * flat), 0, 0, TAU);

  if (one.form === 0) {
    const grown = branching(bits, one.diameter, hand, knobs.surge);
    const at = ([x, y, z]) => project(one.x + x, one.y + y, one.z + z);
    // 앞뒤로 세 겹. 뒤의 가지가 먼저 찍히고 앞의 가지가 그 위를 덮는다
    const layers = [new Path2D(), new Path2D(), new Path2D()];
    const back = one.diameter / 2;
    for (const [p, q] of grown.segs) {
      const depth = (p[2] + q[2]) / 2;
      const layer = depth > back * 0.25 ? 0 : depth > -back * 0.25 ? 1 : 2;
      const [x1, y1] = at(p);
      const [x2, y2] = at(q);
      layers[layer].moveTo(x1, y1);
      layers[layer].lineTo(x2, y2);
    }
    // 망점 한 칸보다 가는 가지는 망점에 녹는다. 가는 가지는 칸만큼 굵게 찍어, 작은 군체는 덤불 덩어리로 읽힌다
    const width = Math.max(CELL * 0.9, Math.min(TWIG, one.diameter * 0.045) * scale);
    // 끝의 하얀 자리는 가지 끝 1.5센티다
    const tips = new Path2D();
    for (const { p, d } of grown.tips) {
      const [x1, y1] = at(add(p, d, -0.015));
      const [x2, y2] = at(p);
      tips.moveTo(x1, y1);
      tips.lineTo(x2, y2);
    }
    Object.assign(out, { layers, tips, width, top: by - grown.tall * scale * 1.05, bottom: by });
  } else if (one.form === 1) {
    const grown = table(bits, one.diameter, hand);
    const lift = one.y + grown.lift;
    const rim = grown.rim.map(({ a, r }) => [Math.cos(a) * r, Math.sin(a) * r]);
    const top = rim.map(([x, z]) => project(one.x + x, lift, one.z + z));
    const under = rim.map(([x, z]) => project(one.x + x, lift - PLATE, one.z + z));
    out.plate = new Path2D();
    shapes.polySubpath(out.plate, top, true);
    // 판의 두께와 밑면. 앞쪽 테 아래로 보인다
    out.under = new Path2D();
    for (let i = 0; i < top.length; i += 1) {
      const j = (i + 1) % top.length;
      out.under.moveTo(top[i][0], top[i][1]);
      out.under.lineTo(top[j][0], top[j][1]);
      out.under.lineTo(under[j][0], under[j][1]);
      out.under.lineTo(under[i][0], under[i][1]);
      out.under.closePath();
    }
    const stalkW = Math.max(1.5, grown.stalk * scale);
    const [sx, sy] = project(one.x, lift - PLATE, one.z);
    out.stalk = new Path2D();
    out.stalk.rect(bx - stalkW / 2, sy, stalkW, by - sy);
    // 판 위의 가지결. 한가운데서 테로 퍼진다
    out.fibres = new Path2D();
    for (const f of grown.fibres) {
      const [x1, y1] = project(one.x + Math.cos(f.a) * f.from, lift, one.z + Math.sin(f.a) * f.from);
      const [x2, y2] = project(one.x + Math.cos(f.a) * f.to, lift, one.z + Math.sin(f.a) * f.to);
      out.fibres.moveTo(x1, y1);
      out.fibres.lineTo(x2, y2);
    }
    out.tips = new Path2D();
    const tipR = Math.max(0.8, RIM * 0.2 * scale);
    for (const [x, y] of top) shapes.circleSubpath(out.tips, x, y, tipR);
    out.fibreWidth = Math.max(2.5, RIM * 0.25 * scale);
    // 판 밑의 그늘은 판만큼 넓다
    out.shadow = new Path2D();
    out.shadow.ellipse(bx, by, grown.radius * scale * 0.95, Math.max(0.6, grown.radius * scale * 0.95 * flat), 0, 0, TAU);
    out.seeTop = lift < eye;
  } else if (one.form === 2) {
    Object.assign(out, dome(one, bits, scale, knobs, cam, project, maze));
  } else {
    // 그물눈은 망점 두 칸보다 잘게 찍지 않는다. 가까운 부채도 높이에 눈이 서른 개를 넘지 않는다
    const mesh = Math.max(MESH, (CELL * 1.6 * one.z) / focal, one.diameter / 30);
    Object.assign(out, { fan: fanOf(bits, one.diameter, mesh, hand) });
  }
  return out;
}

// 뇌산호. 바닥에 앉은 반구의 돔이다. 겉은 미로처럼 굽이치는 골로 덮이고, 해를 등진
// 쪽에 납작한 그늘이 앉는다. 돔을 비스듬히 내려다보므로 픽셀마다 돔의 겉을 되짚어 골을 찾는다
function dome(one, bits, scale, knobs, cam, project, maze) {
  const { eye, sun } = cam;
  const radius = one.diameter / 2;
  const tall = one.diameter * DOME * bits.float(0.85, 1.2);
  // 돔을 내려다보는 각
  const look = Math.atan2(eye - one.y - tall / 2, one.z);
  const [bx, by] = project(one.x, one.y, one.z);
  const rx = radius * scale;
  const ry = Math.sqrt((tall * Math.cos(look)) ** 2 + (radius * Math.sin(look)) ** 2) * scale;
  const foot = Math.max(0.5, radius * Math.abs(Math.sin(look)) * scale);
  // 윤곽. 위는 돔의 윤곽 타원, 아래는 바닥에 닿은 발자국 타원의 앞쪽 반
  const outline = [];
  const wob = [bits.float(0, TAU), bits.float(0, TAU)];
  const hand = knobs.hand;
  for (let i = 0; i <= 48; i += 1) {
    const a = Math.PI + (i / 48) * Math.PI;
    const w = 1 + 0.025 * hand * (Math.sin(a * 5 + wob[0]) + Math.sin(a * 9 + wob[1]));
    outline.push([bx + Math.cos(a) * rx * w, by + Math.sin(a) * ry * w]);
  }
  for (let i = 1; i < 24; i += 1) {
    const a = (i / 24) * Math.PI;
    outline.push([bx + Math.cos(a) * rx, by + Math.sin(a) * foot]);
  }
  const shape = new Path2D();
  shapes.polySubpath(shape, outline, true);

  // 골과 그늘을 픽셀마다 짓는다. 돔이 작으면 골은 망점에 녹으므로 그늘만. 큰 돔은 성긴 격자로 지어 키워
  // 붙인다 — 골은 망점 두 칸보다 굵으므로 티가 나지 않는다
  const left = Math.floor(bx - rx - 2);
  const top = Math.floor(by - ry - 2);
  const w = Math.ceil(rx * 2 + 4);
  const h = Math.ceil(ry + foot + 4);
  const step = Math.max(1, Math.ceil(Math.max(w, h) / 320));
  const sw = Math.ceil(w / step);
  const sh = Math.ceil(h / step);
  const valleys = document.createElement("canvas");
  const shade = document.createElement("canvas");
  valleys.width = shade.width = sw;
  valleys.height = shade.height = sh;
  const vImage = valleys.getContext("2d").createImageData(sw, sh);
  const sImage = shade.getContext("2d").createImageData(sw, sh);
  // 골 한 벌의 폭. 실물(VALLEY)보다 가늘면 망점에 녹으므로 두 칸보다 가늘게 찍지 않는다
  const period = Math.max(VALLEY, (CELL * 2) / scale);
  const cells = 12.5; // 미로 한 벌이 차지하는 칸
  const turn = bits.float(0, TAU);
  const ou = bits.float(0, MAZE);
  const ov = bits.float(0, MAZE);
  const view = [0, -Math.sin(look), Math.cos(look)];
  const upScreen = [0, Math.cos(look), Math.sin(look)];
  const drawMaze = rx > 22;
  for (let py = 0; py < sh; py += 1) {
    for (let px = 0; px < sw; px += 1) {
      // 판의 한 점을 돔의 좌표(미터)로. 돔 발자국의 한가운데가 원점이다
      const sx = (left + (px + 0.5) * step - bx) / scale;
      const sy = (by - (top + (py + 0.5) * step)) / scale;
      const o = add(add([0, 0, 0], [1, 0, 0], sx), upScreen, sy);
      // o + t·view가 타원체 (x/R)² + (y/T)² + (z/R)² = 1과 만나는 곳
      const A = (view[1] / tall) ** 2 + (view[2] / radius) ** 2;
      const B = 2 * ((o[1] * view[1]) / (tall * tall) + (o[2] * view[2]) / (radius * radius));
      const C = (o[0] / radius) ** 2 + (o[1] / tall) ** 2 + (o[2] / radius) ** 2 - 1;
      const disc = B * B - 4 * A * C;
      if (disc < 0) continue;
      const t = (-B - Math.sqrt(disc)) / (2 * A);
      const p = add(o, view, t);
      if (p[1] < 0) continue;
      const n = unit([p[0] / (radius * radius), p[1] / (tall * tall), p[2] / (radius * radius)]);
      const lit = n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2];
      const a = (py * sw + px) * 4 + 3;
      if (lit < 0.15) sImage.data[a] = 255;
      if (!drawMaze) continue;
      // 돔의 꼭대기에서 겉을 따라 잰 거리와 방위로 미로를 편다
      const polar = Math.acos(Math.max(-1, Math.min(1, p[1] / tall)));
      const around = Math.atan2(p[2], p[0]) + turn;
      const arc = (polar * (radius + tall)) / 2 / period;
      const value = mazeAt(maze, ou + Math.cos(around) * arc * cells, ov + Math.sin(around) * arc * cells);
      // 옆으로 누운 겉은 골이 촘촘히 겹쳐 보이므로 흐린다
      const facing = -(n[0] * view[0] + n[1] * view[1] + n[2] * view[2]);
      const fade = Math.min(1, Math.max(0, (facing - 0.12) / 0.3));
      const edge = Math.min(1, Math.max(0, (value - 0.6) / 0.25));
      vImage.data[a] = Math.round(edge * fade * 255);
    }
  }
  valleys.getContext("2d").putImageData(vImage, 0, 0);
  shade.getContext("2d").putImageData(sImage, 0, 0);
  return { shape, valleys, shade, sprite: { left, top, w, h }, drawMaze };
}

export const reef = {
  id: "reef",
  name: "REEF",
  about: "잠수부 눈높이의 산호초 — 가지형 · 탁상형 · 뇌산호 · 부채산호가 제 규칙으로 자라고, 멀수록 물빛에 묻힌다",
  model: "claude-opus-5-5",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "군체가 놓이는 자리와 꼴을 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { key: "deep", label: "DEEP", min: 0.3, max: 1, step: 0.05, value: 0.8, hint: "물의 짙기. 눈높이의 먼 물이 가장 짙고, 위로 수면에 가까울수록 옅다" },
    { key: "clear", label: "CLEAR", min: 8, max: 40, step: 1, value: 20, hint: "가로 시정(미터). 이 거리에서 산호가 물빛에 묻힌다. 가까운 산호도 이 비율로 옅어진다" },
    { key: "cover", label: "COVER", min: 5, max: 80, step: 1, value: 45, hint: "살아 있는 산호가 바닥을 덮은 몫(%). 조사자가 줄을 따라 재는 값이라 모래까지 센다. 건강한 산호초는 40~50%다" },
    { key: "size", label: "SIZE", min: 0.5, max: 3, step: 0.1, value: 1.8, hint: "가장 큰 군체의 지름(미터). 군체의 지름은 로그정규 분포를 따라 작은 것이 많다" },
    { key: "eye", label: "EYE", min: 0, max: 3, step: 0.1, value: 0.6, hint: "눈이 등성이 머리보다 높이 뜬 만큼(미터). 낮을수록 산호가 물을 배경으로 선다" },
    { key: "look", label: "LOOK", min: 0, max: 40, step: 1, value: 8, hint: "내려다보는 각(도). 0이면 바닥과 나란히 멀리 본다" },
    { key: "branch", label: "BRANCH", min: 0, max: 1, step: 0.05, value: 0.35, hint: "덮개에서 가지형(사슴뿔 산호)이 차지하는 몫" },
    { key: "table", label: "TABLE", min: 0, max: 1, step: 0.05, value: 0.2, hint: "덮개에서 탁상형이 차지하는 몫. 판 하나가 평균 1미터로 넓어 수는 적다" },
    { key: "brain", label: "BRAIN", min: 0, max: 1, step: 0.05, value: 0.3, hint: "덮개에서 뇌산호(반구의 돔)가 차지하는 몫" },
    { key: "fan", label: "FAN", min: 0, max: 1, step: 0.05, value: 0.15, hint: "덮개에서 부채산호가 차지하는 몫" },
    { key: "swell", label: "SWELL", min: 0, max: 90, step: 5, value: 35, hint: "파도가 바닥을 밀고 당기는 방향이 눈과 이루는 각(도). 부채산호는 이 방향을 마주 본다 — 0이면 부채가 정면을, 90이면 옆을 보인다" },
    { key: "surge", label: "SURGE", min: 0, max: 1, step: 0.05, value: 0.4, hint: "파도가 바닥을 밀었다 당기는 세기. 부채산호가 흔들리고, 가지형은 작고 촘촘하게 자란다. 0이면 가만히 있다" },
    { key: "rays", label: "RAYS", min: 0, max: 1, step: 0.05, value: 0.5, hint: "수면의 물결이 모은 햇빛 줄기. 0이면 없다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "가지와 테와 둘레가 손으로 오린 듯 흔들리는 정도" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.3, hint: "물이 얼룩덜룩한 정도" },
    { key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 16, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊긴다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;
    const seed = fieldSeed(page, 0x6b43a9b5);

    // 통. 물은 가장 푸른 통, 산호는 남은 통 가운데 가장 붉은 통과 가장 노란 통으로 찍는다. 통이 둘이면
    // 산호는 한 통이다
    const inks = S.drums.map((drum) => drum.separation);
    const water = bluest(S.drums);
    const rest = S.drums.filter((drum) => drum.separation !== water);
    const warm = rest.length ? reddest(rest) : water;
    const sun = rest.length ? yellowest(rest) : water;
    const key = S.key;
    // 남은 통에 푸른 통이 또 있으면 먼 물을 한 번 더 짙게 한다
    const cool = rest.filter((drum) => {
      const [r, g, b] = rgbOf(drum.ink);
      return b - (r + g) / 2 > 0.2;
    });
    const depth = cool.length ? bluest(cool) : null;

    // 눈과 물
    const cam = lens(knobs, width, height);
    const { focal, horizon, project } = cam;
    const c = SIGHT / knobs.clear;
    cam.c = c;
    // 수면에서 꺾여 들어온 햇빛. 해는 앞쪽 왼편 하늘 천정에서 35도에 있다
    const zenith = Math.asin(Math.sin(35 * DEG) / WATER);
    const azimuth = -25 * DEG;
    const sun3 = [Math.sin(zenith) * Math.sin(azimuth), Math.cos(zenith), Math.sin(zenith) * Math.cos(azimuth)];
    cam.sun = sun3;

    // 물. 눈높이의 먼 물이 가장 짙고, 올려다볼수록 수면의 빛을 받아 옅다. 바닥은 모래가 밝고, 멀수록
    // 물빛에 묻힌다(대비가 e^-cd로 준다)
    const deep = knobs.deep;
    const top = Math.max(0.01, cam.row(0).rise);
    const far = deep * 0.95;
    const tone = (y, nearTone, upTone) => {
      const ray = cam.row(y);
      if (ray.path === Infinity) return far + (upTone - far) * Math.min(1, ray.rise / top);
      const k = Math.exp(-c * ray.path);
      return far * (1 - k) + nearTone * k;
    };
    const column = (sep, f) =>
      sep.draw((g) => {
        const gradient = g.createLinearGradient(0, 0, 0, height);
        const stops = 32;
        for (let i = 0; i <= stops; i += 1) {
          const y = (i / stops) * height;
          gradient.addColorStop(i / stops, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, f(y)))})`);
        }
        if (horizon > 0 && horizon < height) gradient.addColorStop(horizon / height, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, f(horizon)))})`);
        g.fillStyle = gradient;
        g.fillRect(0, 0, width, height);
      });
    column(water, (y) => tone(y, 0.06, deep * 0.55));
    if (depth) column(depth, (y) => tone(y, 0, deep * 0.1) * 0.55);
    // 모래는 햇빛을 받아 따뜻하다. 멀수록 물빛에 묻힌다
    if (sun !== water) column(sun, (y) => (y > horizon ? 0.14 * Math.exp(-c * cam.row(y).path) : 0.04));
    if (knobs.stain > 0) {
      const made = stainsFor(page.seed, knobs.stain, 0.8);
      soak(water, made.wash, width, height);
    }

    // 산호초. 시간과 무관한 것은 한 번 짓고 쥐고 있는다
    const key0 = [seed, knobs.cover, knobs.size, knobs.eye, knobs.look, knobs.clear, knobs.branch, knobs.table, knobs.brain, knobs.fan, knobs.swell, knobs.surge, knobs.hand].join(":");
    const reefNow = builds(key0, () => build(seed, knobs, cam));

    const fill = (path) => (g) => g.fill(path);
    const stroke = (path, w) => (g) => {
      g.lineWidth = w;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.stroke(path);
    };

    // 물빛 막. 산호와 바위는 종이까지 파내 제 빛깔로 찍고, 눈과 그 사이의 물을 막으로 덮는다. 멀수록 제
    // 빛깔은 옅어지고(대비 k의 0.7제곱) 막은 짙어져, 끝내 물빛과 하나가 된다. 제 빛깔을 흐리게 파내는 대신
    // 온전히 파내므로 윤곽이 망점에 녹지 않는다
    // 붉은빛은 물이 먼저 먹는다. 멀수록 붉은 통이 노란 통보다 빨리 옅어지고, 푸른 통은 대비만큼만 옅어진다
    const ownOf = (k, r) => {
      const tones = [Math.pow(k, 0.7), Math.pow(k * Math.exp(-EAT_SUN * r), 0.7), Math.pow(k * Math.exp(-EAT_WARM * r), 0.7)];
      return (sep) => (sep === warm ? tones[2] : sep === sun ? tones[1] : tones[0]);
    };
    const veil = (path, k) => {
      stain([water], path, far * (1 - k));
      if (depth) stain([depth], path, far * 0.55 * (1 - k));
    };

    // 먼 것. 물빛에 묻힌 윤곽을 켜마다 한 번에, 먼 켜부터
    for (const layer of reefNow.layers) {
      const own = ownOf(layer.clear, layer.reach);
      carve(inks, fill(layer.shape), 1);
      stain([water], fill(layer.shape), own(water));
      if (depth) stain([depth], fill(layer.shape), 0.6 * own(depth));
      if (key !== water) stain([key], fill(layer.shape), 0.3 * own(key));
      stain([sun], fill(layer.shape), own(sun) * 0.2);
      stain([warm], fill(layer.shape), own(warm) * 0.2);
      veil(fill(layer.shape), layer.clear);
    }

    // 가까운 것. 먼 것부터
    let fans = 0;
    for (const one of reefNow.nearOnes) {
      const k = one.clear;
      const own = ownOf(k, one.reach);
      if (one.kind === "slice") {
        // 뼈대의 한 켜. 죽은 산호가 굳은 바위다. 산 산호의 빛깔이 없어 어둡다 — 물보다 짙은 푸른빛에 가장 짙은
        // 통이 겹치고, 산호말(석회조류)의 붉은 기가 옅게 돈다. 멀수록 물빛 막에 묻혀 물과 하나가 된다
        carve(inks, fill(one.shape), 1);
        stain([water], fill(one.shape), own(water));
        if (depth) stain([depth], fill(one.shape), 0.6 * own(depth));
        if (key !== water) stain([key], fill(one.shape), 0.35 * own(key));
        stain([warm], fill(one.shape), 0.12 * own(warm));
        veil(fill(one.shape), k);
        continue;
      }
      // 판 밑은 그늘이 깊다
      const dusk = one.form === 1 ? 0.45 : 0.22;
      stain([key], fill(one.shadow), dusk * own(key));
      stain([water], fill(one.shadow), dusk * 0.6 * own(water));
      if (one.form === 0) {
        const shade = (g, amount) => {
          const gradient = g.createLinearGradient(0, one.top, 0, one.bottom);
          gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
          gradient.addColorStop(1, `rgba(0, 0, 0, ${amount})`);
          return gradient;
        };
        const whole = new Path2D();
        one.layers.forEach((layer, back) => {
          whole.addPath(layer);
          carve(inks, stroke(layer, one.width), 1);
          stain([warm], stroke(layer, one.width), 0.9 * own(warm));
          stain([key], stroke(layer, one.width), (0.3 - back * 0.12) * own(key));
          stain([water], (g) => {
            g.strokeStyle = shade(g, 0.5);
            stroke(layer, one.width)(g);
          }, own(water));
        });
        carve(inks, stroke(one.tips, one.width), 0.8);
        veil(stroke(whole, one.width), k);
      } else if (one.form === 1) {
        carve(inks, fill(one.stalk), 1);
        stain([key], fill(one.stalk), 0.75 * own(key));
        stain([water], fill(one.stalk), 0.6 * own(water));
        carve(inks, fill(one.under), 1);
        stain([key], fill(one.under), 0.8 * own(key));
        stain([water], fill(one.under), 0.45 * own(water));
        stain([warm], fill(one.under), 0.2 * own(warm));
        carve(inks, fill(one.plate), 1);
        stain([sun], fill(one.plate), (one.seeTop ? 0.6 : 0.4) * own(sun));
        stain([water], fill(one.plate), (one.seeTop ? 0.35 : 0.65) * own(water));
        if (one.seeTop) carve(inks, stroke(one.fibres, one.fibreWidth), 0.55);
        carve(inks, fill(one.tips), 0.6);
        const whole = new Path2D(one.plate);
        whole.addPath(one.under);
        whole.addPath(one.stalk);
        veil(fill(whole), k);
      } else if (one.form === 2) {
        const lay = (sprite) => (g) => g.drawImage(sprite, one.sprite.left, one.sprite.top, one.sprite.w, one.sprite.h);
        carve(inks, fill(one.shape), 1);
        stain([sun], fill(one.shape), 0.7 * own(sun));
        stain([warm], fill(one.shape), 0.28 * own(warm));
        stain([water], lay(one.shade), 0.4 * own(water));
        stain([key], lay(one.shade), 0.2 * own(key));
        if (one.drawMaze) {
          stain([warm], lay(one.valleys), 0.6 * own(warm));
          stain([key], lay(one.valleys), 0.9 * own(key));
        }
        veil(fill(one.shape), k);
      } else {
        // 부채. 파도의 방향을 마주 보는 평면이 파도에 앞뒤로 흔들린다. 한 바퀴에 한 번 오간다
        fans += 1;
        const f = one.fan;
        const facing = knobs.swell * DEG + f.turn;
        const flow = [Math.sin(facing), 0, Math.cos(facing)];
        const across = [Math.cos(facing), 0, -Math.sin(facing)];
        const sway = knobs.surge * 0.35 * Math.sin(TAU * (held + f.phase * 0.25 + one.x * 0.05));
        const place = ([a, b]) => {
          const lean = b * Math.sin(sway);
          const up = b * Math.cos(sway);
          return project(one.x + across[0] * a + flow[0] * lean, one.y + up, one.z + across[2] * a + flow[2] * lean);
        };
        const sheet = new Path2D();
        shapes.polySubpath(sheet, f.outline.map(place), true);
        const veins = new Path2D();
        for (const line of f.veins) {
          const pts = line.map(place);
          veins.moveTo(pts[0][0], pts[0][1]);
          for (const p of pts.slice(1)) veins.lineTo(p[0], p[1]);
        }
        const [s0x, s0y] = place([0, 0]);
        const [s1x, s1y] = place([0, f.stalk]);
        veins.moveTo(s0x, s0y);
        veins.lineTo(s1x, s1y);
        const net = new Path2D();
        for (const [p, q] of f.net) {
          const [x1, y1] = place(p);
          const [x2, y2] = place(q);
          net.moveTo(x1, y1);
          net.lineTo(x2, y2);
        }
        // 그물은 망점에 녹지 않게 굵기를 지키고 온톤으로 찍는다. 그물눈 사이로 물이 비치는 옅은 막이 깔린다
        const vein = Math.max(3, f.height * 0.012 * one.scale);
        const thread = Math.max(2.2, vein * 0.6);
        carve(inks, fill(sheet), 0.35);
        stain([warm], fill(sheet), 0.35 * own(warm));
        carve(inks, stroke(net, thread), 1);
        stain([warm], stroke(net, thread), 0.9 * own(warm));
        carve(inks, stroke(veins, vein), 1);
        stain([warm], stroke(veins, vein), own(warm));
        stain([water], stroke(veins, vein), 0.2 * own(water));
        veil(stroke(net, thread), k);
        veil(stroke(veins, vein), k);
      }
    }

    // 빛줄기. 수면의 물결이 모은 햇빛이 물속에서 흩어져 보인다. 모두 꺾인 해를 향해 모인다
    const rays = [];
    if (knobs.rays > 0) {
      const ahead = Math.max(0.02, sun3[2] * Math.cos(cam.pitch) - sun3[1] * Math.sin(cam.pitch));
      const vp = [width / 2 + (focal * sun3[0]) / ahead, height / 2 - (focal * (sun3[1] * Math.cos(cam.pitch) + sun3[2] * Math.sin(cam.pitch))) / ahead];
      const beams = makeRng((seed ^ 0x1b873593) >>> 0);
      const from = Math.atan2(height - vp[1], -vp[0] - width * 0.1);
      const to = Math.atan2(height - vp[1], width * 1.1 - vp[0]);
      const count = 9;
      for (let i = 0; i < count; i += 1) {
        const base = to + (from - to) * ((i + beams.float(0.2, 0.8)) / count);
        const wide = beams.float(0.004, 0.014);
        const k = beams.int(1, 2);
        const phase = beams.next();
        const glow = beams.float(0.5, 1);
        const drift = 0.004 * Math.sin(TAU * (k * held + phase));
        // 햇빛은 물결마다 모였다 흩어져 깜박인다. 수심 4미터에서 ±94%, 29미터에서 ±10%다. 산호초의 깊이에 맞춰 ±60%로 둔다
        const flick = (1 + 0.6 * Math.sin(TAU * (k * held + phase * 1.7))) / 1.6;
        const a = base + drift;
        const reach = height * 1.3;
        const tri = new Path2D();
        tri.moveTo(vp[0], vp[1]);
        tri.lineTo(vp[0] + Math.cos(a - wide) * (reach - vp[1]) * 2, vp[1] + Math.sin(a - wide) * (reach - vp[1]) * 2);
        tri.lineTo(vp[0] + Math.cos(a + wide) * (reach - vp[1]) * 2, vp[1] + Math.sin(a + wide) * (reach - vp[1]) * 2);
        tri.closePath();
        rays.push({ tri, alpha: knobs.rays * glow * flick * 0.6 });
      }
      for (const ray of rays) {
        carve(inks, (g) => {
          const gradient = g.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
          gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.35)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          g.fillStyle = gradient;
          g.fill(ray.tri);
        }, ray.alpha);
      }
    }

    return { colonies: reefNow.colonies.length, rock: reefNow.rock, near: reefNow.nearOnes.length, fans, covered: reefNow.covered, horizon };
  },

  // 안내선. 소실선과, 군체의 수와 덮은 몫을 적는다
  guides(page, sketch) {
    if (!sketch) return [];
    return [
      { kind: "line", from: [0, sketch.horizon], to: [page.width, sketch.horizon], dash: true },
      {
        kind: "text",
        at: [page.margin, page.height - page.margin],
        text: `${sketch.colonies} COLONIES · ${Math.round(sketch.rock * 100)}% REEF · ${Math.round(sketch.covered * 100)}% COVER`
      }
    ];
  }
};
