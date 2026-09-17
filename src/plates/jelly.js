// 어두운 물을 밝은 것들이 올라간다.
//
// 흰 잉크가 없으므로 빛나는 것은 전부 파낸 자리다. 물을 깔고, 종 모양으로 파내고, 그 안에만
// 옅은 통을 얹는다. 물 위에 밝은 잉크를 칠하는 방법은 없다 — 곱하기는 언제나 더 어둡게만
// 만든다.
//
// 오르는 것처럼 보이려면 해파리가 아니라 물이 움직여야 한다. 해파리가 실제로 올라가면 한
// 바퀴 끝에서 제자리로 돌아오느라 튄다. 티끌을 아래로 흘려 보내면 같은 말을 하면서 이어진다.
//
// 여러 마리는 깊이로 벌린다. 멀수록 작고 흐리고 위에 있다. 먼 것부터 찍고 가까운 것이 그
// 위를 덮으므로, 가까운 놈의 녹아웃이 먼 놈을 지워 가림이 저절로 생긴다.
//
// 물은 한 빛깔이 아니다. 옅은 두 통이 큰 얼룩으로 번져, 물 위에서 초록이나 보라 같은 제3의
// 색이 된다. 물은 판 가득 찍는다. 둥근 틀은 CELL과 CHLORO의 것이다.
//
// 해파리는 물에서 조금 넓게 파낸다. 판이 어긋나지 않아도 둘레에 가는 종이 틈이 서서, 같은 통으로
// 찍은 물과 몸이 갈라져 보인다. 인쇄에서 틈이 안 보이게 두 판을 살짝 겹치는 트랩의 거꾸로다.
// 종은 라인리스다 — 둘레에 테를 긋지 않고, 틈과 옅은 면만으로 가장자리가 선다. 촉수는 뿌리에서
// 굵고 끝으로 가늘어지며, 절반은 속에 흰 줄이 파여 있다.
//
// 얼룩은 롤이 정하고 시간과 무관하다. 무리를 짜는 난수와 티끌을 뿌리는 난수의 흐름은 건드리지
// 않는다 — 얼룩은 따로 굴린다.

import { makeRng, makeNoise2 } from "../rng.js";
import * as shapes from "../shapes.js";

// 종. 위는 둥근 지붕, 아래는 가리비가 줄지어 늘어진 밑단.
//
// hand를 주면 지붕이 손으로 오린 듯 흔들린다. 보름달(MOON)의 가장자리와 같은 두 겹의 물결이다.
// 흔들림은 각도에 매긴 배율이라 종이 뛰어 늘고 줄어도 물결은 제자리에 있다. 밑단의 양 끝도 같은
// 배율을 받아 지붕과 어긋나지 않는다.
//
// rim은 밑단의 생김새다. 가운데가 얼마나 들렸나(lift), 들린 꼭대기가 어느 쪽으로 쏠렸나(lean),
// 가리비가 몇 개인가(lobes), 얼마나 늘어지나(depth), 가리비마다 크기가 얼마나 다른가(sizes),
// 밑단 띠가 얼마나 두꺼운가(band). 모두 종 높이에 대한 비율이다.
const RIM = { lift: 0.26, lean: 1, lobes: 10, depth: 0.07, sizes: new Array(16).fill(1), band: 0.1 };
const MOST_LOBES = 16;
const LAPPET = 26; // 가리비 하나의 폭. 판형 픽셀이고, 종이 클수록 가리비가 많아진다

// 지붕의 흔들림. 각도를 받아 반지름에 곱할 배율을 준다
function swellOf(hand) {
  if (!hand) return () => 1;
  return (angle) => 1 + hand.wobble * (0.62 * Math.sin(angle * 4 + hand.phase) + 0.48 * Math.sin(angle * 7 + hand.drift));
}

function bell(cx, cy, rx, ry, options = {}) {
  const { steps = 44, hand = null, rim = RIM } = options;
  const swell = swellOf(hand);
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const angle = Math.PI - (Math.PI * i) / steps;
    const r = swell(angle);
    points.push([cx + Math.cos(angle) * rx * r, cy - Math.sin(angle) * ry * r]);
  }
  points.push(...hem(cx, cy, rx, ry, swell, rim, 0));
  return points;
}

// 밑단. 오른쪽 끝에서 왼쪽 끝으로 간다. rise만큼 통째로 올리면 밑단 띠의 윗선이 된다.
//
// 가리비는 둥글게 늘어지고 사이사이는 좁게 파인다. 사인의 절댓값을 1보다 작은 지수로 누르면
// 봉우리가 둥글어지고 골이 좁아진다. 가리비는 정수 개라 밑단의 양 끝에서 늘어짐이 0이 되어,
// 지붕과 만나는 모서리가 어긋나지 않는다. 가리비 하나에 여덟 점을 써 스플라인이 골을 뭉개지
// 않게 한다.
function hem(cx, cy, rx, ry, swell, rim, rise) {
  const count = Math.max(44, rim.lobes * 8);
  const points = [];
  for (let i = count - 1; i >= 1; i -= 1) {
    const u = i / count;
    const angle = Math.PI - u * Math.PI;
    const lobe = Math.min(rim.lobes - 1, Math.floor(u * rim.lobes));
    const drop = Math.abs(Math.sin(u * Math.PI * rim.lobes)) ** 0.6 * ry * rim.depth * rim.sizes[lobe];
    points.push([cx + Math.cos(angle) * rx * swell(angle), cy - rimLift(u, rim, ry) - rise + drop]);
  }
  return points;
}

// 밑단이 가운데에서 들린 높이. u는 왼쪽 끝 0에서 오른쪽 끝 1까지, ry는 종의 높이다. 촉수의
// 뿌리도 이 높이에 붙는다
function rimLift(u, rim, ry) {
  return Math.sin(Math.PI * u ** rim.lean) * ry * rim.lift;
}

// 물에 번진 얼룩. 옅은 두 통이 저주파 밭을 따라 크게 번진다. 판형의 1/6 크기로 밭을 그려
// 두고 키워 붙인다. 롤마다 한 벌이면 되니, 매 프레임 새로 짓지 않도록 몇 벌만 쥔다.
//
// 밭의 대비를 올려 얼룩을 가르면 가장자리가 오려 낸 듯 또렷해져, 물에 번진 것이 아니라 붙인
// 것처럼 보인다. 그래서 가장자리를 흐린다(FEATHER). 판의 가장자리도 안쪽과 똑같이 흐리도록,
// 밭을 흐림이 닿는 만큼 넓게 그려 흐린 뒤에 잘라 낸다.
//
// 키울 때는 보통 품질로 한다. 밭이 이미 부드러워 차이가 보이지 않는데, 고품질 확대는 한 장에
// 몇 밀리초를 더 쓴다.
const STAIN_SIZE = 180;
const FEATHER_REACH = 16; // FEATHER가 1일 때 상자 흐림의 반폭. 밭의 픽셀이다
const stains = new Map();

// 한 방향 상자 흐림. 창을 밀며 들어오는 값을 더하고 나가는 값을 빼, 반폭과 상관없이 한 줄을
// 한 번에 훑는다. 줄 끝 너머는 끝값으로 친다. across면 가로로, 아니면 세로로 흐린다
function boxBlur(field, cols, rows, radius, across) {
  const out = new Float32Array(field.length);
  const lines = across ? rows : cols;
  const length = across ? cols : rows;
  const along = across ? 1 : cols; // 줄 안에서 한 칸
  const between = across ? cols : 1; // 줄과 줄 사이
  const span = radius * 2 + 1;
  const last = length - 1;
  for (let line = 0; line < lines; line += 1) {
    const origin = line * between;
    const first = field[origin];
    const end = field[origin + last * along];
    let sum = 0;
    for (let k = -radius; k <= radius; k += 1) sum += k < 0 ? first : k > last ? end : field[origin + k * along];
    for (let k = 0; k < length; k += 1) {
      out[origin + k * along] = sum / span;
      const enter = k + radius + 1;
      const leave = k - radius;
      sum += (enter > last ? end : field[origin + enter * along]) - (leave < 0 ? first : field[origin + leave * along]);
    }
  }
  return out;
}

// 세 번 겹친 상자 흐림. 가우스 흐림에 가깝다
function soften(field, cols, rows, radius) {
  let out = field;
  for (let pass = 0; radius > 0 && pass < 3; pass += 1) {
    out = boxBlur(boxBlur(out, cols, rows, radius, true), cols, rows, radius, false);
  }
  return out;
}

function stainsFor(seed, amount, feather) {
  const key = `${seed >>> 0}:${amount}:${feather}`;
  const held = stains.get(key);
  if (held) return held;

  const radius = Math.round(feather * FEATHER_REACH);
  const pad = radius * 3;
  const span = STAIN_SIZE + pad * 2;
  const rng = makeRng((seed ^ 0x51ed270b) >>> 0);
  const [wash, body] = [0.62, 0.4].map((strength) => {
    const coarse = makeNoise2(rng);
    const fine = makeNoise2(rng);
    const field = new Float32Array(span * span);
    for (let y = 0, i = 0; y < span; y += 1) {
      for (let x = 0; x < span; x += 1, i += 1) {
        const u = x - pad;
        const w = y - pad;
        const v = coarse(u / 48, w / 48) * 0.7 + fine(u / 17 + 11, w / 17 + 3) * 0.3;
        const c = Math.min(1, Math.max(0, (v - 0.46) * 2.8));
        field[i] = c * c * (3 - 2 * c);
      }
    }
    const soft = soften(field, span, span, radius);

    const canvas = document.createElement("canvas");
    canvas.width = STAIN_SIZE;
    canvas.height = STAIN_SIZE;
    const g = canvas.getContext("2d");
    const image = g.createImageData(STAIN_SIZE, STAIN_SIZE);
    for (let y = 0, a = 3; y < STAIN_SIZE; y += 1) {
      for (let x = 0; x < STAIN_SIZE; x += 1, a += 4) {
        image.data[a] = Math.round(soft[(y + pad) * span + x + pad] * strength * amount * 255);
      }
    }
    g.putImageData(image, 0, 0);
    return canvas;
  });

  const made = { wash, body };
  stains.set(key, made);
  if (stains.size > 6) stains.delete(stains.keys().next().value);
  return made;
}

function soak(sep, canvas, width, height) {
  sep.draw((g) => {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "low";
    g.drawImage(canvas, 0, 0, width, height);
  });
}

// 종 둘레의 빛. 종을 성긴 격자에 칠해 흐리고, 그 무늬만큼 물에서 옅게 파낸다. 종에서 멀어질수록
// 고르게 옅어져 계단이 없다. 크기를 달리한 종을 몇 겹 파내면 겹마다 가장자리가 서서, 종 위로 흰
// 윤곽이 되풀이되는 메아리가 된다.
//
// 격자 한 칸(step)은 판의 몇 픽셀이다. 빛이 흐려서 키워 붙여도 티가 나지 않고, 한 마리에 몇천 칸이면
// 된다. 칸의 크기는 번짐 폭을 따라 정해 흐림이 몇 칸에 걸치게 한다. 번짐 폭은 종마다 정해져 뛰는
// 동안 바뀌지 않으므로, 칸도 프레임마다 바뀌지 않는다. 종 둘레에는 흐림이 닿는 만큼 여백을 둔다.
// 흐린 값에는 곡선을 씌워 종 가까이는 진하게, 멀리는 길게 끌리게 한다.
const GLOW_REACH = 0.18; // 번짐 폭. 종 크기에 대한 비율이다
const GLOW_TONE = 0.9; // 가장 진한 자리에서 물을 얼마나 파내는가
let glowCanvas = null;

function glowFor(dome, reach) {
  const step = Math.max(1, Math.min(4, Math.floor(reach / 4)));
  const pad = reach * 3;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const [x, y] of dome) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  const col = Math.floor((left - pad) / step);
  const row = Math.floor((top - pad) / step);
  const cols = Math.ceil((right + pad) / step) - col;
  const rows = Math.ceil((bottom + pad) / step) - row;

  // 캔버스는 한 장을 돌려 쓰고, 모자랄 때만 키운다. 무늬는 한 칸 들여 앉히고 매번 전부 지운다.
  // 키워 붙일 때 무늬 바깥 한 칸을 함께 읽는데, 거기에 앞 해파리의 무늬가 남아 있거나 캔버스
  // 끝이 걸리면 같은 장이 앞서 무엇을 찍었느냐에 따라 달라진다
  glowCanvas ??= document.createElement("canvas");
  if (glowCanvas.width < cols + 2) glowCanvas.width = cols + 2;
  if (glowCanvas.height < rows + 2) glowCanvas.height = rows + 2;
  const g = glowCanvas.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
  g.setTransform(1 / step, 0, 0, 1 / step, 1 - col, 1 - row);
  g.fillStyle = "#000";
  shapes.splinePath(g, dome, true);
  g.fill();

  const image = g.getImageData(1, 1, cols, rows);
  const field = new Float32Array(cols * rows);
  for (let i = 0; i < field.length; i += 1) field[i] = image.data[i * 4 + 3] / 255;
  const sigma = reach / step;
  const soft = soften(field, cols, rows, Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2)));
  for (let i = 0; i < soft.length; i += 1) {
    const rest = 1 - soft[i];
    image.data[i * 4 + 3] = Math.round((1 - rest * rest * rest) * 255);
  }
  g.putImageData(image, 1, 1);

  return { canvas: glowCanvas, cols, rows, x: col * step, y: row * step, width: cols * step, height: rows * step };
}

export const jelly = {
  id: "jelly",
  name: "JELLY",
  about: "어두운 물을 올라가는 빛들. 밝은 것은 전부 파낸 자리다",

  knobs: [
    { key: "count", label: "COUNT", min: 1, max: 9, step: 1, value: 5 },
    // 무리만 따로 굴리는 씨앗. 종이의 롤은 그대로 두고 배치와 크기만 바꾼다
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "밭의 씨앗. 종이의 롤은 그대로 두고 무리만 다시 뽑는다" },
    { key: "bell", label: "BELL", min: 0.05, max: 0.26, step: 0.01, value: 0.13 },
    { key: "depth", label: "DEPTH", min: 0, max: 0.8, step: 0.05, value: 0.55 },
    { key: "pulse", label: "PULSE", min: 0, max: 0.35, step: 0.01, value: 0.06 },
    // 한 바퀴에 몇 번 뛰는가. 정수여야 한 바퀴 끝에서 제자리로 돌아온다
    { key: "throb", label: "THROB", min: 1, max: 4, step: 1, value: 2 },
    { key: "drift", label: "DRIFT", min: 0, max: 0.06, step: 0.005, value: 0.012 },
    { key: "tentacles", label: "TENTACLES", min: 0, max: 20, step: 1, value: 9 },
    { key: "trail", label: "TRAIL", min: 0.1, max: 0.7, step: 0.01, value: 0.3 },
    { key: "wobble", label: "WOBBLE", min: 0, max: 1.6, step: 0.05, value: 0.45 },
    { key: "arms", label: "ARMS", min: 0, max: 6, step: 1, value: 3 },
    { key: "motes", label: "MOTES", min: 0, max: 120, step: 5, value: 45 },
    { key: "deep", label: "DEEP", min: 0.2, max: 1, step: 0.05, value: 0.85 },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.8, hint: "물에 번진 얼룩. 옅은 두 통이 큰 얼룩으로 겹쳐 제3의 색이 된다" },
    { key: "feather", label: "FEATHER", min: 0, max: 1, step: 0.05, value: 0.6, hint: "얼룩 가장자리가 번지는 폭. 0이면 오려 낸 듯 또렷하다" },
    { key: "gap", label: "GAP", min: 0, max: 6, step: 0.5, value: 0.5, hint: "해파리 둘레의 흰 틈. 물을 해파리보다 이만큼 넓게 파낸다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.1, hint: "종 윗선이 보름달처럼 손으로 오린 듯 흔들리는 정도. 0이면 반듯한 반원이다" },
    { key: "hem", label: "HEM", min: 0, max: 1, step: 0.05, value: 0.6, hint: "종 밑단 띠의 진하기. 가리비를 따라 종과 같은 통으로 한 번 더 찍는다. 0이면 띠 없이 가리비 모양만 남는다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { count, pulse, throb, drift, tentacles, arms, motes, deep, wobble, stain, feather, gap } = knobs;

    const turn = t * Math.PI * 2;

    // 판을 파낼 때는 실제로 도는 분판마다 한 번씩. 통이 둘이면 body와 wash가 같은 분판이라,
    // 역할 이름으로 돌면 같은 판을 두 번 파낸다.
    const inks = S.drums.map((drum) => drum.separation);

    // 무리는 제 씨앗으로 굴린다. 종이의 롤에 밭의 씨앗을 섞으므로, NEW ROLL은 여전히 전부를
    // 바꾸고 FIELD는 그리는 잉크와 종이결을 건드리지 않은 채 배치만 다시 뽑는다.
    const layout = makeRng((page.seed ^ Math.imul(knobs.field + 1, 0x9e3779b9)) >>> 0);
    // 종의 흔들림은 또 따로 굴린다. 무리의 흐름에 끼우면 흔들림을 더한 것만으로 배치가 바뀐다
    const hands = makeRng((page.seed ^ Math.imul(knobs.field + 1, 0x9e3779b9) ^ 0x2b992ddf) >>> 0);
    // 밑단의 생김새도 따로. 마리마다 같은 수만큼 뽑아, 마리 수를 바꿔도 앞의 놈들은 그대로다
    const rims = makeRng((page.seed ^ Math.imul(knobs.field + 1, 0x9e3779b9) ^ 0x5be0cd19) >>> 0);

    // 물. 위가 깊고 아래로 갈수록 옅어진다
    S.key.ramp(0, 0, width, height, { from: deep, to: deep * 0.22 });
    S.wash.ramp(0, 0, width, height, { from: deep * 0.5, to: 0.06 });

    // 얼룩. 옅은 통과 가운데 통이 서로 다른 밭을 따라 번진다
    if (stain > 0) {
      const made = stainsFor(page.seed, stain, feather);
      soak(S.wash, made.wash, width, height);
      soak(S.body, made.body, width, height);
    }

    // 티끌. 아래로 흘러 해파리가 오르는 것처럼 보이게 한다. 물을 찍은 통 모두에서 파낸다.
    // 속도는 한 바퀴에 한 번이나 두 번 — 실수로 주면 t=1에서 제자리로 돌아오지 않아 튄다.
    const specks = [];
    for (let i = 0; i < motes; i += 1) {
      const x = R.float(0, width);
      const lane = R.float(0, 1);
      const size = R.float(1.4, 4.2);
      const speed = R.int(1, 2);
      specks.push([x, ((lane + t * speed) % 1) * (height + 60) - 30, size]);
    }
    for (const ink of inks) {
      ink.knockout((sep) => {
        for (const [x, y, size] of specks) sep.disc(x, y, size);
      });
    }

    // 무리를 짠다. 난수는 여기서 다 쓰고 그리는 동안에는 쓰지 않는다 — 그리기는 먼 것부터
    // 도는데 거기서 난수를 당기면 마리 수를 바꿀 때마다 무리 전체가 다시 뽑힌다.
    // 밭 둘. 하나는 어디에 모일지, 하나는 얼마나 클지를 정한다. 서로 다른 밭이라야 크기가
    // 자리를 따라가지 않는다 — 같은 밭에서 뽑으면 가운데가 늘 크고 가장자리가 늘 작아져,
    // 규칙이 눈에 먼저 읽힌다.
    const placeField = makeNoise2(layout);
    const sizeField = makeNoise2(layout);

    const swarm = [];
    for (let i = 0; i < count; i += 1) {
      // 자리는 후보를 여러 개 뽑아 가장 점수가 높은 데로 간다. 점수는 셋을 더한 것이다 —
      // 가운데로 당기는 기운, 밭이 뭉쳐 있는 정도, 이미 놓인 놈에게서 떨어진 정도.
      let spot = null;
      for (let tryAt = 0; tryAt < 14; tryAt += 1) {
        const x = layout.float(width * 0.1, width * 0.9);
        const y = layout.float(height * 0.14, height * 0.86);
        const off = Math.hypot((x - width / 2) / (width / 2), (y - height / 2) / (height / 2));
        const pull = 1 - Math.min(1, off / 1.2);
        const clump = placeField(x / 230, y / 230);
        const room = swarm.length
          ? Math.min(1, Math.min(...swarm.map((o) => Math.hypot(o.x - x, o.y - y))) / (width * 0.28))
          : 1;
        const score = pull * 0.9 + clump * 0.7 + room * 0.9;
        if (!spot || score > spot.score) spot = { x, y, score };
      }

      // 크기는 다른 밭에서. 가까운 놈끼리는 비슷하게 크고, 밭이 낮은 자리에서는 함께 작다.
      // 큰 것이 가까운 것이므로 깊이는 크기에서 나온다 — 따로 뽑으면 큰데 흐린 놈이 생긴다.
      //
      // 값 노이즈는 네 귀퉁이를 섞어 만들므로 값이 가운데로 몰린다. 그대로 쓰면 크기가 전부
      // 고만고만해져 깊이가 사라진다. 두 겹으로 겹쳐 잔결을 주고, 가운데에서 밀어내 대비를
      // 되찾는다.
      const coarse = sizeField(spot.x / 190, spot.y / 190);
      const fine = sizeField(spot.x / 70 + 13, spot.y / 70 + 7);
      const raw = coarse * 0.68 + fine * 0.32;
      const grain = Math.min(1, Math.max(0, (raw - 0.5) * 2.2 + 0.5));
      const far = 1 - grain;
      const size = width * knobs.bell * (1 - far * knobs.depth) * layout.float(0.88, 1.12);

      const spec = {
        far,
        size,
        x: spot.x,
        y: spot.y,
        phase: layout.float(0, Math.PI * 2),
        show: 1 - far * 0.55,
        hand: { wobble: knobs.hand * 0.05, phase: hands.float(0, Math.PI * 2), drift: hands.float(0, Math.PI * 2) },
        rim: {
          lift: rims.float(0.16, 0.34),
          lean: 2 ** rims.float(-0.35, 0.35),
          lobes: Math.max(5, Math.min(MOST_LOBES, Math.round((size * 2) / (LAPPET * rims.float(0.8, 1.25))))),
          depth: rims.float(0.05, 0.09),
          sizes: Array.from({ length: MOST_LOBES }, () => rims.float(0.7, 1.25)),
          band: rims.float(0.07, 0.12)
        },
        strands: [],
        ribbons: []
      };

      const strandCount = Math.round(tentacles * (1 - far * 0.35));
      for (let k = 0; k < strandCount; k += 1) {
        spec.strands.push({
          at: strandCount === 1 ? 0.5 : k / (strandCount - 1),
          length: height * knobs.trail * layout.float(0.45, 1.3) * (1 - far * 0.4),
          amp: wobble * layout.float(0.35, 0.95),
          phase: layout.float(0, Math.PI * 2),
          curl: layout.float(3.2, 6.4),
          lean: layout.float(-0.5, 0.5),
          weight: layout.float(1.6, 3) * (1 - far * 0.45)
        });
      }

      const ribbonCount = Math.round(arms * (1 - far * 0.4));
      for (let k = 0; k < ribbonCount; k += 1) {
        spec.ribbons.push({
          offset: ribbonCount === 1 ? 0 : (k / (ribbonCount - 1) - 0.5) * 1.1,
          length: height * knobs.trail * layout.float(0.3, 0.55) * (1 - far * 0.4),
          amp: wobble * layout.float(0.3, 0.7),
          phase: layout.float(0, Math.PI * 2),
          weight: (7 - 3 * (k % 2)) * (1 - far * 0.45)
        });
      }

      swarm.push(spec);
    }

    // 먼 것부터. 가까운 놈의 녹아웃이 먼 놈을 지우므로 가림이 저절로 생긴다
    swarm.sort((a, b) => b.far - a.far);

    for (const one of swarm) {
      const beat = Math.sin(turn * throb + one.phase);
      const cx = one.x;
      const cy = one.y + Math.sin(turn + one.phase) * height * drift;
      const rx = one.size * (1 - pulse * beat);
      const ry = one.size * 0.94 * (1 + pulse * beat * 0.9);

      const dome = bell(cx, cy, rx, ry, { hand: one.hand, rim: one.rim });
      const show = one.show;

      // 빛은 한 번에 파내지 않는다. 종에서 멀어질수록 옅게, 계단 없이 번지게 판다. 한 번에 다
      // 파내면 오려 붙인 스티커가 된다. 종 자체를 파내는 마지막 겹은 촉수 뒤로 미룬다 — 종이
      // 제 촉수의 뿌리를 덮어야 한다.
      const glow = glowFor(dome, one.size * GLOW_REACH);
      for (const ink of inks) {
        ink.knockout((sep) =>
          sep.draw((g) => {
            g.globalAlpha = GLOW_TONE * show;
            g.imageSmoothingQuality = "low";
            g.drawImage(glow.canvas, 1, 1, glow.cols, glow.rows, glow.x, glow.y, glow.width, glow.height);
          })
        );
      }

      // 물에서 띠를 넓게 파낸다. 틈은 뿌리에서 넓고 끝으로 가며 닫힌다
      const clear = (points, width) => {
        if (gap <= 0) return;
        const band = shapes.ribbon(points, width);
        for (const ink of inks) ink.knockout((sep) => sep.shape(band, { tone: show }));
      };

      // 촉수. 파동이 아래로 번져 가므로 끝이 말린다. 뿌리에서 굵고 끝으로 가며 가늘어지고,
      // 비틀리듯 굵기가 오르내린다. 절반은 속에 흰 줄을 판다.
      //
      // 촉수는 물과 같은 통이라 틈이 없으면 물에 묻힌다. 그렇다고 틈을 종만큼 벌리면 흰 끈이
      // 되고 만다. 틈은 종의 절반으로 좁히고, 몸은 물보다 진하게 꽉 채워 찍는다.
      for (const strand of one.strands) {
        const x0 = cx + (strand.at * 2 - 1) * rx * 0.94;
        const y0 = cy - rimLift(strand.at, one.rim, ry);
        const points = [];
        for (let s = 0; s <= 26; s += 1) {
          const along = s / 26;
          const wave = Math.sin(turn - along * strand.curl + strand.phase + one.phase) * rx * strand.amp * Math.pow(along, 1.5);
          const sweep = strand.lean * rx * along * along;
          points.push([x0 + wave + sweep, y0 + along * strand.length]);
        }
        const twist = strand.curl * 0.9;
        const thick = (u) =>
          strand.weight * 3 * (1 - 0.8 * u) * (0.6 + 0.4 * Math.abs(Math.cos(u * twist + strand.phase + turn)));
        clear(points, (u) => thick(u) + gap * (1 - u));
        S.key.shape(shapes.ribbon(points, thick), { tone: show });
        if (strand.phase > Math.PI) {
          const core = shapes.ribbon(points, (u) => thick(u) * 0.3);
          for (const ink of inks) ink.knockout((sep) => sep.shape(core, { tone: show }));
        }
      }

      // 구완. 가운데에서 내려오는 두꺼운 주름. 끝으로 가며 조금 좁아진다
      for (const ribbon of one.ribbons) {
        const points = [];
        for (let s = 0; s <= 18; s += 1) {
          const along = s / 18;
          const swing = Math.sin(turn - along * 2.8 + ribbon.phase + one.phase) * rx * ribbon.amp * Math.pow(along, 1.3);
          points.push([cx + ribbon.offset * rx + swing, cy + along * ribbon.length]);
        }
        const thick = (u) => ribbon.weight * 1.5 * (1 - 0.5 * u);
        clear(points, (u) => thick(u) + 2 * gap * (1 - 0.5 * u));
        S.body.shape(shapes.ribbon(points, thick), { tone: 0.55 * show });
        S.key.line(points, { w: 2 * (1 - one.far * 0.4), tone: 0.5 * show });
      }

      // 종. 둘레를 물에서 조금 넓게 파내 흰 틈을 두고, 그 안에 옅은 통만 얹는다. 테는 긋지 않는다
      const hollow = gap > 0 ? shapes.grow(dome, gap) : dome;
      for (const ink of inks) ink.knockout((sep) => sep.shape(hollow, { tone: show }));
      S.body.shape(dome, { tone: 0.32 * show });

      // 밑단 띠. 가리비를 따라 같은 통으로 한 번 더 찍어 진하게 한다. 둘레를 긋는 테가 아니라
      // 밑단이라는 면이다. 양 끝이 지붕 밖으로 삐지지 않게 종 모양으로 오린다
      if (knobs.hem > 0) {
        const swell = swellOf(one.hand);
        const lift = ry * one.rim.band;
        const band = [...hem(cx, cy, rx, ry, swell, one.rim, 0), ...hem(cx, cy, rx, ry, swell, one.rim, lift).reverse()];
        S.body.draw((g) => {
          shapes.splinePath(g, dome, true);
          g.clip();
          g.globalAlpha = knobs.hem * show;
          shapes.splinePath(g, band, true);
          g.fill();
        });
      }
    }
  }
};
