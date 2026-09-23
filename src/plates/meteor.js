// 별똥별. 애니메이션 이펙트 작화의 문법으로, 이미터를 층층이 쌓아 그린다.
//
// 받은 이펙트 분해 장면을 따라 층을 나눈다. 층마다 모양 어휘와 색과 박자가 다르고, 뒤에서 앞으로
// 이 차례로 찍는다.
//
//   티끌      먼 하늘의 별. 카메라가 따라가는 만큼 꼬리 쪽으로 지나간다. 가까운 것일수록 크고 밝고
//             빠르며 긴 꼬리를 끈다
//   번짐      광선 둘레의 흐린 빛 한 겹
//   보조 광선  분해 장면의 Laser_Second. 머리에서 한 점으로 모여 나와 레이저 곁을 휘어 뻗는 어두운 띠.
//             박자마다 새로 짓는다
//   레이저    머리 쪽에서 부풀었다가 끝으로 가늘어지는 단순한 유성 꼬리 하나. 박자마다 깜빡인다
//   도트      머리 바로 뒤에서 크게 태어나 광선을 따라 흐르며 작아지는 납작한 어두운 타원. 머리 뒤에
//             한 덩이가 되고 그 뒤로 구슬이 줄지어 선다. 광선 위에 얹는다
//   꼬리별     머리에서 뿜어 나와 꼬리 쪽으로 날아가는 네 갈래 별. 머리 쪽으로 가늘어지는 꼬리를 끈다
//   머리      분해 장면의 Spike_Main. 머리 원점의 동그라미 심(코어)을 사북으로 칼날이 부채꼴로
//             꼬리 쪽에 펼쳐진다. 부채는 장마다 새로 짓고, 심은 자리가 붙박이고 크기만 부채를 따라 바뀐다.
//             빛깔은 깜빡이지 않는다
//
// 이펙트 작화의 문법은 둘이다.
//
//   또박또박한 박자   한 바퀴를 BEAT장으로 나눠 그 장 수만큼만 그림이 바뀐다. 사이를 메우지 않아
//                     모양이 뚝뚝 끊겨 튄다. 프레임마다 부드럽게 흐르면 사진이 되고 이펙트가 아니다
//   납작한 면        번지는 계조가 아니라 납작한 면이다. 가장자리는 마디가 적어 직선으로 꺾인다
//
// 어두운 시야는 COSMOS처럼 하늘을 깔고 빛나는 것을 파내는 방식이다. 하늘은 모든 통으로 깐다 — 가장 진한
// 통이 위에서 아래로 옅어지고 가장 옅은 통이 그 반쯤으로 깔려, 배색마다 하늘 빛깔이 달라진다.
// 빛(유성 본체)은 하늘의 가장 진한 통과 가장 먼 빛깔이다 — 진한 통이 푸르면 노랑, 붉으면 물빛. 나머지가
// 곁들이다(src/drums.js). 아래 '노란 빛'은 빛의 통으로, '분홍 빛'은 곁들이로 찍는다는 뜻이다.
//
//   노란 빛   모든 통을 파낸 자리에 빛의 통을 얹는다
//   푸른 빛   모든 통을 파내되 조금 남겨 옅은 하늘이 된다
//   분홍 빛   모든 통을 파내고 곁들이를 찍는다. 곁들이가 없는 두 통 배색에서는 하늘을 조금 남긴다
//   흰 빛     모든 통을 파낸다
//   어둠      가장 진한 통을 끝까지 채우고 곁들이를 겹친다. 나머지는 파낸다. 노랑이 겹치면 어둠이 올리브가 된다
//
// 별똥별은 제자리에 있고 둘레가 흐른다. 카메라가 별똥별을 따라가는 셈이다. 흐르는 것은 꼬리 쪽으로
// 가서 끝에서 사라지고 머리 앞에서 다시 나타난다. 흐르는 박자는 한 바퀴에 정수 번이고 양 끝에서
// 가늘어져, 되감기는 자리가 보이지 않는다. 무엇이든 언제나 같은 수만큼 뽑고 손잡이는 그중 몇을
// 찍을지만 정한다.

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { glowMask, keepGlow, layGlow } from "../blur.js";
import { keeper } from "../keep.js";
import { meteorInks } from "../drums.js";
import { carve, stain } from "../night.js";
import { dim } from "../scope.js";

const TAU = Math.PI * 2;
const MOST_DUST = 120;
const MOST_DOTS = 60; // 한 번에 보이는 도트의 끝값
const DOTS_EARLY = 12; // 도트 가운데 예전 연기가 뽑던 자리에서 뽑는 수
const LOOP_SECONDS = 2; // 화면의 시계는 한 바퀴 48프레임, 초당 24프레임이다. 이미터의 값은 초로 적는다
const MOST_STARS = 40; // 한 번에 보이는 꼬리별의 끝값
const MOST_BEAMS = 4;
const MOST_EMBERS = 12;

// 축을 따라 늘인 조각. u0에서 u1까지 half(s)만큼의 반폭이고, 마디가 적어 가장자리가 직선으로
// 꺾인다. lean은 끝으로 갈수록 옆으로 비껴 나는 정도다
function facet(at, u0, u1, v, half, { steps = 7, lean = 0 } = {}) {
  const one = [];
  const other = [];
  for (let i = 0; i <= steps; i += 1) {
    const s = i / steps;
    const u = u0 + (u1 - u0) * s;
    const w = Math.max(0.15, half(s));
    const side = v + lean * s;
    one.push(at(u, side + w));
    other.push(at(u, side - w));
  }
  return [...one, ...other.reverse()];
}

// 띠의 굵기. 머리 쪽에서 부풀었다가 끝으로 가늘어진다
const taper = (s) => (s < 0.08 ? Math.sqrt(s / 0.08) : Math.pow(1 - (s - 0.08) / 0.92, 1.1));

// 흐린 무늬는 모양 손잡이(LENGTH · ANGLE · CORE)가 같으면 다시 짓지 않는다. 롤과는 상관이 없다.
// 공용 캔버스(src/blur.js)의 것을 제 캔버스로 옮겨 쥔다
const keepMask = keeper(8);
// 창끝의 번짐은 장마다 꼴이 달라 따로 쥔다. 한 바퀴의 장(FLIP) 수만큼은 쥔다
const keepSpikeGlow = keeper(64);

const poly = (points) => (g) => {
  shapes.polyPath(g, points, true);
  g.fill();
};

// 이미터. 1초에 freq개를 뿜고 하나는 lifetime초 산다. 하나는 한 바퀴에 lives번 다시 태어나므로 수명은
// 한 바퀴의 1/lives로 맞춰진다 — 정수여야 루프가 닫힌다. 1초에 freq개를 뿜으려면 한 번에 freq × 수명개가
// 살아 있어야 하므로, 늘 뽑아 둔 all에서 그만큼만 쓴다. 태어나는 때는 황금비로 흩어 늘 고르게 뿜는다.
// burst는 그 흩어짐을 거두는 정도다 — 1이면 모두 같은 때에 태어나 함께 사라지고, 수명마다 한 무더기씩 뿜는다
function emitter(all, freq, lifetime, held, burst = 0) {
  const lives = Math.max(1, Math.round(LOOP_SECONDS / lifetime));
  const life = LOOP_SECONDS / lives;
  const list = all.slice(0, Math.min(all.length, Math.round(freq * life)));
  const count = Math.max(1, list.length);
  const ageOf = (i, born) => ((((i * 0.6180339887 + born / count) * (1 - burst) + held * lives) % 1) + 1) % 1;
  return { lives, lifetime: life, list, ageOf };
}

// 점에서 닫힌 모양의 가장자리까지 가장 가까운 거리
function edgeDistance(points, x, y) {
  let near = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [ax, ay] = points[j];
    const dx = points[i][0] - ax;
    const dy = points[i][1] - ay;
    const f = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    near = Math.min(near, Math.hypot(x - ax - f * dx, y - ay - f * dy));
  }
  return near;
}

// 머리의 창끝 하나를 짓는다(분해 장면의 Spike_Main). 심을 사북(부채의 고정점)으로 삼아 칼날이 부채꼴로
// 꼬리 쪽에 펼쳐진다 — 분해 장면의 완성본에서 빛나는 머리 둘레로 칼날이 부채처럼 펼쳐지는 것과 같다. 좌표는
// 창끝의 것이다 — 원점이 심이고, x는 꼬리 쪽이 +, y는 등 쪽(화면 위)이 +이며, 심을 감싸는 테를 1로 잰다.
// 크기는 판에 놓을 때 통째로 스케일해 정한다.
//
//   날    칼날이 심에서 부채살처럼 뻗는다. 수는 장마다 points의 절반에서 points 사이로 줄었다 늘었다 한다.
//         가운데 날일수록 길고, 날 사이는 깊게 파인다
//   부채  벌어지는 각이 spread(도)다. 장마다 그보다 좁거나 넓고(±30%), 한쪽으로 조금 기운다. 좁을수록 날이 길다
//   코    심 앞의 끝. 진행 방향을 가리킨다. 코끝에서 테에 닿는 두 접선 사이의 각이 noseAngle(도)다 — 작을수록 코가
//         길고 뾰족하다. 끝은 장마다 오각형에서 칠각형 사이로 깎인다
//   옆선  테에 닿아 바깥 날 끝으로 가는 선. 부채의 가장자리와 나란하다
//   테    심 둘레를 감싸는 몸통. 심에 몸통 빛깔의 테가 남는 자리다. 반지름 1인 원이다
//
// 코의 접선과 옆선은 모두 테에 닿는 선이라, 둘이 만나는 모서리는 두 접점의 가운데 방향, 테에서 조금 바깥에
// 선다. 그래서 부채의 각과 코의 각이 따로 논다. stretch는 날의 길이다. 꼭짓점이 모두 심을 한 방향으로 도는
// 차례(코 → 아래 모서리 → 날들 → 위 모서리)로 놓여, 윤곽은 스스로 꼬이지 않는다
function spikeShape(rng, points, stretch, spread, noseAngle) {
  const blades = rng.int(Math.max(2, Math.ceil(points / 2)), Math.max(2, points)); // 날 수. 장마다 points의 절반에서 points 사이로 바뀐다
  const open = rng.next(); // 0이면 spread보다 좁게 모은 부채, 1이면 넓게 펼친 부채
  const half = Math.min(1.25, ((spread * Math.PI) / 360) * (0.7 + 0.6 * open)); // 부채의 반각(라디안). 72°를 넘지 않는다
  const tilt = rng.float(-0.15, 0.15) * half;
  const middle = stretch * rng.float(3, 4.2) * (1.3 - 0.3 * open); // 가운데 날의 길이. 좁은 부채일수록 길다
  const from = tilt - half;
  const to = tilt + half;
  const polar = (angle, r) => [r * Math.cos(angle), r * Math.sin(angle)];
  // 코끝. 두 접선 사이의 각이 noseAngle이 되는 거리에 둔다(장마다 ±15%)
  const noseHalf = Math.min(1.4, ((noseAngle * Math.PI) / 360) * rng.float(0.85, 1.15));
  const tip = [-1 / Math.sin(noseHalf), rng.float(-0.1, 0.1)];
  // 모서리. 코의 접선이 테에 닿는 각(touch)과 옆선이 테에 닿는 각(flank)의 가운데 방향, 두 접선이 만나는 자리
  const facing = Math.atan2(tip[1], tip[0]);
  const span = Math.acos(1 / Math.hypot(tip[0], tip[1]));
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const corner = (touch, flank) => polar((touch + flank) / 2, 1 / Math.cos((touch - flank) / 2));
  const outline = [tip, corner(wrap(facing + span), from - Math.PI / 2)];
  const step = (to - from) / (blades - 1);
  let last = null;
  for (let k = 0; k < blades; k += 1) {
    const angle = from + step * k + (k > 0 && k < blades - 1 ? rng.float(-0.3, 0.3) * step : 0);
    const length = Math.max(1.8, middle * (1 - 0.35 * Math.abs((2 * k) / (blades - 1) - 1)) * rng.float(0.6, 1.25));
    // 날 사이의 골. 두 날 가운데 짧은 것의 절반쯤까지 파이되, 심의 테는 남긴다
    if (last) outline.push(polar((last.angle + angle) / 2, Math.max(1.3, Math.min(last.length, length) * rng.float(0.35, 0.6))));
    outline.push(polar(angle, length));
    last = { angle, length };
  }
  outline.push(corner(wrap(facing - span), to + Math.PI / 2));
  // 코. 끝점 하나를 여럿으로 나눠 머리를 다각형으로 깎는다 — 날 끝은 그대로 뾰족하다. 양 끝 두 점(a, b)은 코의
  // 가장자리를 따라 짧은 쪽 길이의 절반만큼 물러난 자리다. 그 사이 점들은 a에서 b로 가며 코끝 쪽으로 부푼
  // 2차 곡선 위에 고르게 놓인다. 곡선이 따르는 점(bend)은 두 점의 가운데에서 코끝 쪽으로 80% 나온 자리다. 코에
  // 놓는 점이 셋이면 심 앞이 오각형, 넷이면 육각형, 다섯이면 칠각형이고, 장마다 그 사이를 오간다. 모든 점이 코
  // 안쪽이라 윤곽은 그대로 꼬이지 않는다
  const [nose, ...rest] = outline;
  const near = [outline[outline.length - 1], outline[1]].map(([x, y]) => [x - nose[0], y - nose[1], Math.hypot(x - nose[0], y - nose[1])]);
  const cut = 0.5 * Math.min(near[0][2], near[1][2]);
  const [a, b] = near.map(([dx, dy, d]) => [nose[0] + (dx * cut) / d, nose[1] + (dy * cut) / d]);
  const bend = [0.1 * (a[0] + b[0]) + 0.8 * nose[0], 0.1 * (a[1] + b[1]) + 0.8 * nose[1]];
  const count = rng.int(3, 5);
  const front = Array.from({ length: count }, (_, k) => {
    const t = k / (count - 1);
    return [0, 1].map((j) => (1 - t) ** 2 * a[j] + 2 * t * (1 - t) * bend[j] + t * t * b[j]);
  });
  return [...front, ...rest];
}

// 네 갈래 별 하나를 길의 한 토막으로 더한다. 방향 angle을 따라 앞(front)과 뒤(back)로, 옆으로(side)
// 뻗고, 팔 사이의 허리는 waist만큼 들어간다. 모든 별이 같은 차례로 돌아, 겹쳐도 한 번에 채워진다
function starSubpath(g, x, y, angle, front, back, side, waist) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (a, b) => [x + a * cos - b * sin, y + a * sin + b * cos];
  const tips = [[front, 0], [0, side], [-back, 0], [0, -side]];
  g.moveTo(...at(front, 0));
  for (let k = 1; k <= 4; k += 1) {
    const [a0, b0] = tips[k - 1];
    const [a1, b1] = tips[k % 4];
    g.quadraticCurveTo(...at((a0 + a1) * waist, (b0 + b1) * waist), ...at(a1, b1));
  }
  g.closePath();
}


export const meteor = {
  id: "meteor",
  name: "METEOR",
  about: "별똥별. 이펙트 이미터를 층층이 — 머리의 부채, 광선과 도트, 꼬리별",
  model: "claude-opus-5",

  knobs: [
    { group: "SKY", key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "층마다의 자리를 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { group: "SKY", key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 0.85, hint: "하늘의 어둠" },
    { group: "SKY", key: "dust", label: "DUST", min: 0, max: 120, step: 5, value: 50, hint: "먼 하늘의 별의 수" },
    { group: "SKY", key: "depth", label: "DEPTH", min: 0, max: 1, step: 0.05, value: 0.6, hint: "별의 거리 차. 0이면 모두 같은 거리라 한 바퀴에 한 번 지나가고, 올릴수록 가까운 별이 크고 밝고 빠르게(한 바퀴에 두세 번) 지나간다" },
    { group: "SKY", key: "trail", label: "TRAIL", min: 0, max: 1, step: 0.05, value: 0.5, hint: "별이 끄는 꼬리의 길이. 빠른 별일수록 길다. 0이면 꼬리 없는 점이다" },
    { group: "BEAM", key: "angle", label: "ANGLE", min: 10, max: 80, step: 1, value: 38, hint: "광선이 기운 각도. 꼬리가 오른쪽 위로 뻗는다" },
    { group: "BEAM", key: "length", label: "LENGTH", min: 0.4, max: 1.3, step: 0.01, value: 0.89, hint: "광선의 길이. 판 폭에 대한 비율이다. 길게 하면 꼬리가 판 밖으로 나간다" },
    { group: "BEAM", key: "beams", label: "BEAMS", min: 0, max: 4, step: 1, value: 0, hint: "레이저 곁을 휘어 뻗는 보조 광선(분해 장면의 Laser_Second)의 수" },
    // 레이저(분해 장면의 Laser_Main). 판 손잡이 칸에서 빼 LASER 칸으로 따로 둔다. 주소의 열쇠 core · glow는 예전 그대로다
    { panel: "LASER", key: "core", label: "WIDTH", min: 0.3, max: 2.5, step: 0.05, value: 0.8, hint: "레이저의 굵기. 머리 쪽에서 가장 굵고 끝으로 가늘어진다" },
    { panel: "LASER", key: "laserLength", label: "LENGTH", min: 0.2, max: 1.3, step: 0.01, value: 1.3, hint: "레이저의 길이. BEAM의 LENGTH에 대한 비율이다. 머리 자리는 그대로 두고 레이저만 늘고 준다" },
    { panel: "LASER", key: "laserVary", label: "VARY", min: 0, max: 1, step: 0.05, value: 0.5, hint: "박자마다 레이저의 굵기와 길이가 달라지는 정도. 0.5면 굵기 ±15% · 길이 ±12%쯤이고, 0이면 늘 같다" },
    { panel: "LASER", key: "laserFlicker", label: "FLICKER", min: 0, max: 0.8, step: 0.05, value: 0, hint: "박자마다 꺼져 있을 몫. 분해 장면의 레이저는 열 장에 넷쯤 꺼져 있다. 0이면 늘 켜져 있다" },
    { panel: "LASER", key: "glow", label: "GLOW", min: 0, max: 1, step: 0.05, value: 0.4, hint: "레이저 둘레의 번짐. 납작한 면만 있으면 붙인 색종이가 된다" },
    // 머리의 창끝(분해 장면의 Spike_Main). 판 손잡이 칸에서 빼 SPIKE 칸으로 따로 둔다(panel)
    { panel: "SPIKE", key: "spikeSize", label: "SIZE", min: 0.3, max: 2, step: 0.05, value: 1.3, hint: "머리 창끝의 크기" },
    { panel: "SPIKE", key: "spikePoints", label: "POINTS", min: 2, max: 8, step: 1, value: 5, hint: "부채의 칼날 수의 끝값. 장마다 이 수의 절반에서 이 수 사이로 줄었다 늘었다 한다" },
    { panel: "SPIKE", key: "spikeStretch", label: "STRETCH", min: 0.5, max: 2.5, step: 0.05, value: 0.95, hint: "칼날이 뻗는 길이. 높을수록 길다" },
    { panel: "SPIKE", key: "spikeSpread", label: "SPREAD", min: 20, max: 140, step: 1, value: 140, hint: "부채가 벌어지는 각(도). 칼날이 심에서 퍼지는 폭이다. 장마다 이보다 30%쯤 좁거나 넓다" },
    { panel: "SPIKE", key: "spikeNose", label: "NOSE", min: 20, max: 150, step: 1, value: 137, hint: "코끝에서 심의 테에 닿는 두 접선 사이의 각(도). 작을수록 코가 길고 뾰족하다. SPREAD와 따로 논다" },
    { panel: "SPIKE", key: "spikeVary", label: "VARY", min: 0, max: 1, step: 0.05, value: 0.2, hint: "장마다 창끝이 커지는 정도. 가장 작을 때도 가장 커진 심을 감싼다. 0이면 늘 그 크기다" },
    { panel: "SPIKE", key: "spikeFlip", label: "FLIP", min: 4, max: 48, step: 1, value: 12, hint: "창끝이 한 바퀴에 몇 번 바뀌는가. 한 바퀴는 48프레임이고, 분해 장면은 거의 매 프레임 바뀐다. BEAT와 따로 논다" },
    { panel: "SPIKE", key: "spikeGlow", label: "GLOW", min: 0, max: 1, step: 0.05, value: 0.45, hint: "창끝 둘레의 번짐" },
    // 두 번째 창끝(분해 장면의 Spike_Second). 첫째 부채 뒤에 도트의 빛깔로 한 겹 더 편다. SECOND 칸으로 따로 둔다
    { panel: "SECOND", key: "secondSize", label: "SIZE", min: 0, max: 2.5, step: 0.05, value: 0.5, hint: "몸통의 크기. 1이면 첫째 부채의 가장 작은 몸통과 같아 늘 그 뒤에 묻힌다. 0이면 없다" },
    { panel: "SECOND", key: "secondPoints", label: "POINTS", min: 2, max: 8, step: 1, value: 2, hint: "칼날 수의 끝값. 장마다 이 수의 절반에서 이 수 사이다" },
    { panel: "SECOND", key: "secondStretch", label: "STRETCH", min: 0.5, max: 2.5, step: 0.05, value: 2.2, hint: "칼날이 뻗는 길이" },
    { panel: "SECOND", key: "secondSpread", label: "SPREAD", min: 20, max: 140, step: 1, value: 33, hint: "부채가 벌어지는 각(도)" },
    { panel: "SECOND", key: "secondVary", label: "VARY", min: 0, max: 1, step: 0.05, value: 0.5, hint: "장마다 날의 길이가 달라지는 정도" },
    { panel: "SECOND", key: "secondFlip", label: "FLIP", min: 4, max: 48, step: 1, value: 18, hint: "한 바퀴에 몇 번 바뀌는가. 첫째 부채와 다르게 두면 둘이 함께 바뀌지 않는다" },
    // 도트 이미터. 이펙트 툴의 이미터 값을 그대로 둔다 — 뿜는 빈도, 수명, 빠르기와 끌림, 크기와 수명에 따른 크기.
    // 판 손잡이 칸에서 빼 DOTS 칸으로 따로 둔다(panel)
    { panel: "DOTS", key: "burst", label: "BURST", min: 0, max: 1, step: 0.05, value: 0, hint: "한꺼번에 뿜는 정도. 0이면 고르게 이어 뿜고, 1이면 수명마다 모두 한꺼번에 태어나 함께 사라진다" },
    { panel: "DOTS", key: "freq", label: "FREQ", min: 0, max: 60, step: 1, value: 20, hint: "뿜는 빈도(spawn rate). 1초에 몇 개를 뿜는가. 한 번에 보이는 점은 FREQ × LIFETIME개이고 60개까지다. 0이면 도트가 없다" },
    { panel: "DOTS", key: "lifetime", label: "LIFETIME", min: 0.2, max: 2, step: 0.05, value: 1.9, hint: "점 하나가 사는 시간(초). 루프가 닫히도록 한 바퀴(2초)를 똑같이 나눈 값(2 · 1 · 0.67 · 0.5 …)으로 맞춰진다. 길수록 오래 남아 멀리 간다" },
    { panel: "DOTS", key: "velocity", label: "VELOCITY", min: 0.05, max: 1.5, step: 0.05, value: 0.5, hint: "흐르는 빠르기. 1초에 광선 길이의 몇 배를 가는가. 구슬 줄의 길이는 VELOCITY × LIFETIME이다" },
    { panel: "DOTS", key: "dotAngle", label: "ANGLE", min: -60, max: 60, step: 1, value: 0, hint: "점이 나는 방향. 광선 축에서 기운 각(도)이다. 0이면 꼬리 쪽으로 곧게 흐른다. 속력(VELOCITY)과 함께 속도가 된다" },
    { panel: "DOTS", key: "accel", label: "ACCEL", min: -0.5, max: 2, step: 0.05, value: 0.4, hint: "나는 방향으로 빨라지는 가속도. 0이면 고른 속력이고, 양수면 사는 동안 점점 빨라지며 음수면 느려진다. 가는 거리는 그대로다" },
    { panel: "DOTS", key: "drag", label: "DRAG", min: 0, max: 1, step: 0.05, value: 0.55, hint: "끌림. 0이면 고른 빠르기로 흐르고, 올릴수록 갓 난 점이 빠르게 튀어 나갔다가 느려져 구슬이 꼬리 쪽에 몰린다" },
    { panel: "DOTS", key: "gravity", label: "GRAVITY", min: 0, max: 1, step: 0.05, value: 0, hint: "한쪽으로 끌리는 가속도. 나이의 제곱으로 밀려나 구슬 줄이 포물선처럼 휜다. 1이면 수명 끝에 판 폭의 절반만큼 밀린다. 0이면 없다" },
    { panel: "DOTS", key: "toward", label: "TOWARD", min: -180, max: 180, step: 5, value: 0, hint: "끌리는 방향(도). 0이면 화면 아래, 90이면 오른쪽, ±180이면 위다" },
    { panel: "DOTS", key: "size", label: "SIZE", min: 0.1, max: 2, step: 0.05, value: 1, hint: "갓 난 타원의 크기. 머리 뒤 덩이의 크기다. 0.1까지 내리면 덩이 없이 작은 구슬만 흐른다" },
    { panel: "DOTS", key: "sizeVary", label: "VARY", min: 0, max: 1, step: 0.05, value: 1, hint: "갓 난 타원의 크기가 점마다 달라지는 정도. 0이면 모두 같은 크기로 태어나고, 0.5면 0.55~1.45배, 1이면 0.1~1.9배다" },
    { panel: "DOTS", key: "shrink", label: "SHRINK", min: 0, max: 6, step: 0.1, value: 6, hint: "사는 동안 작아지는 모양(size over life). 0이면 고르게 줄고, 높을수록 덩이를 벗어나자마자 작아져 구슬이 떨어져 선다" },
    { panel: "DOTS", key: "fade", label: "FADE", min: 0, max: 6, step: 0.1, value: 0, hint: "사는 동안 옅어지는 모양(alpha over life). 0이면 끝까지 진하고, 높을수록 태어나자마자 옅어져 사라진다" },
    { panel: "DOTS", key: "stretch", label: "STRETCH", min: 0, max: 2, step: 0.05, value: 0.85, hint: "갓 난 타원이 축을 따라 길쭉한 정도. 흐르며 동그래져 끝에서는 원이 된다. 0이면 처음부터 원이다" },
    { panel: "DOTS", key: "scatter", label: "SCATTER", min: 0, max: 1, step: 0.05, value: 0.4, hint: "옆으로 벌어지는 정도. 0이면 구슬이 광선과 한 줄로 선다" },
    // 꼬리별 이미터. 도트와 같은 이미터 값에, 별 뒤로 끄는 꼬리의 길이(TRAIL)를 더한다. 판 손잡이 칸에서
    // 빼 STARS 칸으로 따로 둔다(panel)
    { panel: "STARS", key: "starFreq", label: "FREQ", min: 0, max: 30, step: 1, value: 30, hint: "꼬리별을 뿜는 빈도(spawn rate). 1초에 몇 개를 뿜는가. 한 번에 보이는 별은 FREQ × LIFETIME개이고 40개까지다. 0이면 없다" },
    { panel: "STARS", key: "starLifetime", label: "LIFETIME", min: 0.2, max: 2, step: 0.05, value: 1.25, hint: "별 하나가 사는 시간(초). 루프가 닫히도록 한 바퀴(2초)를 똑같이 나눈 값(2 · 1 · 0.67 · 0.5 …)으로 맞춰진다" },
    { panel: "STARS", key: "starVelocity", label: "VELOCITY", min: 0.1, max: 2, step: 0.05, value: 1.4, hint: "날아가는 빠르기. 1초에 광선 길이의 몇 배를 가는가" },
    { panel: "STARS", key: "starDrag", label: "DRAG", min: 0, max: 1, step: 0.05, value: 1, hint: "끌림. 올릴수록 빠르게 튀어 나갔다가 느려지고, 느려지는 만큼 꼬리가 짧아진다" },
    { panel: "STARS", key: "starSize", label: "SIZE", min: 0.3, max: 2, step: 0.05, value: 2, hint: "갓 난 별의 크기" },
    { panel: "STARS", key: "starShrink", label: "SHRINK", min: 0, max: 6, step: 0.1, value: 4.8, hint: "사는 동안 작아지는 모양(size over life). 높을수록 금세 작아진다" },
    { panel: "STARS", key: "starTrail", label: "TRAIL", min: 0, max: 3, step: 0.05, value: 0.05, hint: "별 뒤로 머리 쪽을 향해 끄는 꼬리의 길이. 빠르게 날수록 길다. 0이면 꼬리 없는 반짝이다" },
    { panel: "STARS", key: "starScatter", label: "SCATTER", min: 0, max: 1, step: 0.05, value: 1, hint: "옆으로 벌어지는 정도. 0이면 별이 광선과 한 줄로 난다" },
    // 한 바퀴를 몇 장으로 그리는가. 시계는 한 바퀴 48프레임이므로 12면 네 프레임에 한 장이다
    { group: "BEAT", key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 48, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊기고, 48이면 프레임마다 다시 그린다" },
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 또박또박한 박자. 한 바퀴를 BEAT장으로 나누고 그 장의 시간으로만 그린다. t=1이면 한 바퀴를 꽉
    // 돌아 t=0과 같은 그림이다
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;
    const turn = held * TAU;

    // 자리는 제 씨앗으로 뽑는다. FIELD는 잉크와 종이결을 건드리지 않는다
    const seed = fieldSeed(page, 0x7f4a7c15);
    const layout = makeRng(seed);

    layout.next(); // 걷은 임팩트 프레임이 뽑던 자리. 뒤의 자리가 그대로이도록 흘려보낸다
    const clock = Math.floor(t * page.frames) % page.frames; // t=1은 한 바퀴를 꽉 돈 것이라 t=0과 같은 장이다

    // 축. 머리에서 꼬리 쪽을 향한다. 화면의 y는 아래로 자라므로 위로 가려면 뺀다. 머리는 왼쪽 아래에
    // 두고 꼬리가 오른쪽 위로 판을 가로지른다
    const angle = (knobs.angle * Math.PI) / 180;
    const L = width * knobs.length;
    const hx = width * 0.5 - Math.cos(angle) * L * 0.44;
    const hy = height * 0.5 + Math.sin(angle) * L * 0.44;
    const dx = Math.cos(angle);
    const dy = -Math.sin(angle);
    const at = (u, v) => [hx + dx * u - dy * v, hy + dy * u + dx * v];
    const tilt = -angle;

    // 뽑기. 언제나 같은 수만큼, 같은 차례로
    const trailPhase = layout.float(0, TAU);
    const dust = Array.from({ length: MOST_DUST }, () => ({
      x: layout.float(0, width),
      y: layout.float(0, height),
      size: layout.float(0.8, 2.2),
      beat: layout.int(1, 3),
      phase: layout.float(0, TAU)
    })).slice(0, knobs.dust);
    // 도트 하나. 언제나 여섯 번 뽑는다. 앞의 열둘은 여기서, 나머지는 맨 뒤에서 뽑는다 — 예전 연기가
    // 이 자리에서 여섯 번씩 열둘을 뽑았으므로, 점을 늘려도 뒤의 층들이 제자리에 있다
    const drawDot = () => ({
      born: layout.next(),
      reach: layout.next(),
      size: layout.next(),
      off: layout.float(-1, 1),
      drift: layout.float(-1, 1),
      stretch: layout.next()
    });
    const dotsEarly = Array.from({ length: DOTS_EARLY }, drawDot);
    // 예전 보조 광선이 뽑던 자리(4개 × 6번). 보조 광선은 이제 박자마다 제 난수로 짓는다. 뒤의 층들이
    // 제자리에 있도록 흘려보낸다
    for (let i = 0; i < MOST_BEAMS * 6; i += 1) layout.next();
    // 걷은 층들이 뽑던 자리 — 속도선(30개 × 8번), 각진 파편(14개 × 7번), 점선 꼬리 별(40개 × 8번). 층은
    // 걷었지만 뒤의 층들이 제자리에 있도록 뽑던 수만큼 흘려보낸다
    for (let i = 0; i < 30 * 8 + 14 * 7 + 40 * 8; i += 1) layout.next();
    // 걷은 불티가 뽑던 자리(12개 × 5번). 뒤의 도트와 꼬리별이 제자리에 있도록 흘려보낸다
    for (let i = 0; i < MOST_EMBERS * 5; i += 1) layout.next();
    // 걷은 머리의 파편들이 뽑던 자리 — 긴 가시(4쌍 × 3번), 결정 조각(24개 × 6번), 부채꼴의 반지름(1번).
    // 뒤의 도트와 꼬리별이 제자리에 있도록 흘려보낸다
    for (let i = 0; i < 4 * 3 + 24 * 6 + 1; i += 1) layout.next();
    // 도트의 나머지
    const dotsAll = [...dotsEarly, ...Array.from({ length: MOST_DOTS - DOTS_EARLY }, drawDot)];
    // 꼬리별. 별마다 색 하나를 쥔다. 맨 마지막 뽑기라 빼거나 바꿔도 다른 자리는 그대로다
    const starsAll = Array.from({ length: MOST_STARS }, () => {
      const hue = layout.next();
      const star = {
        born: layout.next(),
        reach: layout.next(),
        size: layout.next(),
        off: layout.float(-1, 1),
        drift: layout.float(-1, 1)
      };
      layout.next(); // 걷은 반짝임(FLICKER)이 뽑던 자리. 뒤의 별들이 제자리에 있게 흘려보낸다
      return { ...star, kind: hue < 0.45 ? "yellow" : hue < 0.62 ? "pink" : hue < 0.78 ? "cyan" : hue < 0.9 ? "dark" : "white" };
    });

    // 도트와 꼬리별의 이미터. 한 번에 사는 수는 빈도와 수명이 정한다
    const dotsFlow = emitter(dotsAll, knobs.freq, knobs.lifetime, held, knobs.burst);
    const dots = dotsFlow.list;
    const starFlow = emitter(starsAll, knobs.starFreq, knobs.starLifetime, held);

    // 통 나누기. 하늘은 해파리의 물처럼 모든 통으로 깔고, 빛(유성 본체)은 하늘의 가장 진한 통과 가장 먼
    // 빛깔로 찍는다 — 푸른 하늘에는 노랑, 붉은 하늘에는 물빛. 곁들이는 남은 통이다(src/drums.js)
    const inks = S.drums.map((drum) => drum.separation);
    const { glowInk, accent, darkInk } = meteorInks(S.drums, S.key);

    // 빛을 찍는다. paint는 캔버스에 모양을 그리고 채운다. 모든 통을 파내고 빛깔대로 찍는다 — 노랑은 빛의
    // 통, 분홍은 곁들이, 흰빛은 곁들이로 옅게 물든 종이다. 푸른 빛은 하늘을 조금 남겨 옅은 하늘이 된다.
    // 곁들이가 없으면 분홍 빛도 하늘을 조금 남긴다
    // 흰빛은 종이 그대로가 아니라 곁들이 잉크로 옅게 물든다. 배색마다 흰 부분의 빛깔도 바뀐다. 곁들이가 없는
    // 두 통 배색에서는 가장 진한 통으로 물든다. 머리의 심은 같은 잉크로 진하게 물들어 잉크색에 가깝다
    const tint = accent || (S.key !== glowInk ? S.key : null);
    const keeps = (kind) => (kind === "cyan" ? 0.6 : kind === "pink" && !accent ? 0.45 : 0);
    const glowWith = (kind, paint, strength = 1) => {
      carve(inks, paint, strength * (1 - keeps(kind)));
      if (kind === "pink" && accent) stain([accent], paint, strength * 0.8);
      else if (kind === "yellow" && glowInk) stain([glowInk], paint, strength * 0.95);
      else if (kind === "white" && tint) stain([tint], paint, strength * 0.4);
      else if (kind === "core" && tint) stain([tint], paint, strength * 0.8);
    };

    // 어둠을 찍는다. 가장 진한 통을 끝까지 채우고 곁들이를 겹쳐 하늘보다 짙게, 나머지 통은 파낸다 — 노랑이
    // 겹치면 어둠이 올리브가 된다. 도트가 쓴다
    const darken = (paint, strength = 1) => {
      carve(inks.filter((sep) => sep !== S.key && sep !== darkInk), paint, strength);
      stain([S.key], paint, strength);
      if (darkInk) stain([darkInk], paint, strength * 0.9);
    };
    const every = (list) => (g) => {
      for (const paint of list) paint(g);
    };

    // 머리의 둘레. 머리 원점(HEAD 0), 광선이 시작하는 자리를 가운데 둔 원이다. 그리지는 않지만 도트와
    // 꼬리별이 이 둘레에서 태어나므로 찍기 전에 정한다. 머리 원점을 잡고 부풀었다 가라앉는다. 광선은 늘고
    // 줄지 않으므로, 머리에 딸린 것은 모두 머리 원점을 잡는다 — 다른 점을 잡고 키우면 머리가 광선 위에서
    // 앞뒤로 미끄러진다
    const pulse = 1 + 0.12 * Math.sin(turn * 2 + trailPhase);
    const headRadius = width * 0.026 * pulse;

    // 하늘. 가장 진한 통이 위에서 아래로 옅어지고 가장 옅은 통이 그 반쯤으로 깔린다. 배색마다 하늘
    // 빛깔이 달라진다. 가장자리를 조금 누른다. 카메라가 별똥별을 따라가므로 하늘에는 자리를 잡고 멈춰
    // 있는 무늬가 없다 — 빛만 깔고 얼룩은 두지 않는다
    const dark = knobs.dark;
    S.key.ramp(0, 0, width, height, { from: dark, to: dark * 0.22 });
    S.wash.ramp(0, 0, width, height, { from: dark * 0.5, to: 0.06 });
    dim(S.key, page, width * 0.82, 0.8);

    // 먼 하늘의 별. 카메라가 따라가는 만큼 먼 하늘도 흘러, 별이 꼬리 쪽으로 지나간다. 유성우 사진처럼
    // 한 방향으로 나란히 흐르되 거리가 제각각이다(DEPTH) — 가까운 별은 크고 밝고 빠르며 긴 꼬리를 끌고,
    // 먼 별은 작고 흐린 점이라 거의 움직이지 않는다. 지나가는 횟수는 한 바퀴에 정수 번이라야 루프가
    // 닫히므로 한 번에서 세 번 사이로 끊는다. 제 자리를 가운데 두고 지나가며, 양 끝에서 옅어져 되감기는
    // 자리가 보이지 않는다. 꼬리는 머리 쪽 뒤로 뻗어 끝에서 한 점으로 모이는 납작한 면이다
    if (dust.length) {
      const past = width * 0.5;
      const dirX = Math.cos(angle);
      const dirY = -Math.sin(angle);
      glowWith(
        "white",
        every(
          dust.map((d) => (g) => {
            const near = (d.size - 0.8) / 1.4; // 0이면 가장 먼 별, 1이면 가장 가까운 별
            const laps = 1 + Math.round(knobs.depth * near * 2);
            const p = (d.phase / TAU + held * laps) % 1;
            const fade = Math.pow(Math.sin(Math.PI * p), 0.6);
            const r = d.size * (0.6 + 0.4 * Math.sin(turn * d.beat + d.phase)) * (1 + knobs.depth * near * 2) * fade;
            if (r < 0.3) return;
            const gone = (p - 0.5) * past * laps;
            const x = d.x + dirX * gone;
            const y = d.y + dirY * gone;
            const tail = knobs.trail * width * 0.05 * laps * fade;
            const was = g.globalAlpha;
            g.globalAlpha = was * (0.3 + 0.7 * near); // 먼 별은 흐리다
            g.beginPath();
            g.arc(x, y, r, 0, TAU);
            if (tail > r) {
              g.moveTo(x - dirY * r * 0.8, y + dirX * r * 0.8);
              g.lineTo(x - dirX * tail, y - dirY * tail);
              g.lineTo(x + dirY * r * 0.8, y - dirX * r * 0.8);
              g.closePath();
            }
            g.fill();
            g.globalAlpha = was;
          })
        ),
        0.8
      );
    }

    // 레이저. 머리 쪽에서 부풀었다가 끝으로 가늘어지는 단순한 유성 꼬리 하나다. 박자마다 켜졌다 꺼지고(FLICKER),
    // 켜진 박자마다 굵기와 길이가 조금씩 달라진다(VARY) — 늘 같은 띠가 깜빡이기만 하면 붙였다 뗀 색종이가 된다.
    // 셋 다 박자 번호로 섞은 한 난수에서 이어 뽑아, t=1은 t=0과 같은 박자다. 머리 자리는 그대로다
    const coreWidth = width * 0.016 * knobs.core;
    const beatRng = makeRng((seed ^ 0x3c6ef372 ^ Math.imul((Math.floor(t * beat) % beat) + 1, 0xa54ff53a)) >>> 0);
    const lit = beatRng.next() >= knobs.laserFlicker;
    const laserWide = coreWidth * (1 + knobs.laserVary * (beatRng.next() - 0.5) * 0.6);
    const baseReach = L * knobs.laserLength;
    const reach = baseReach * (1 + knobs.laserVary * (beatRng.next() - 0.5) * 0.5);

    // 레이저 둘레의 번짐. 레이저가 꺼진 박자에는 없다
    if (lit && knobs.glow > 0) {
      const mask = keepMask(`halo|${width}|${height}|${knobs.length}|${knobs.angle}|${knobs.core}|${knobs.laserLength}`, () =>
        // 번짐은 흐릿해 박자마다 다시 지을 것이 없다. 손잡이가 정한 바탕 꼴로 한 번 짓고 쥔다
        keepGlow(glowMask(facet(at, -baseReach * 0.02, baseReach, 0, (s) => coreWidth * 2.4 * taper(s), { steps: 24 }), width * 0.03))
      );
      for (const sep of inks) sep.knockout((plate) => plate.draw((g) => layGlow(g, mask, knobs.glow * 0.6)));
      if (glowInk) glowInk.draw((g) => layGlow(g, mask, knobs.glow * 0.5));
    }

    // 보조 광선. 분해 장면의 Laser_Second다(0:30~0:33). 머리에서 한 점으로 모여 나와 레이저 곁을 따라 뻗는
    // 띠로, 레이저 옆으로 활처럼 휘었다가 돌아오고 어떤 것은 끝 쪽에서 물결친다. 박자마다 제 난수로 새로
    // 짓는다 — 박자 번호로 씨앗을 섞어 t=1은 t=0과 같은 박자다. 빛깔은 도트와 같은 어둠(세컨더리 빛깔)이다.
    // 레이저가 꺼진 박자에도 있다. 수는 BEAMS다
    const beamRng = makeRng((seed ^ 0x6a09e667 ^ Math.imul((Math.floor(t * beat) % beat) + 1, 0xbb67ae85)) >>> 0);
    for (let i = 0; i < knobs.beams; i += 1) {
      const long = reach * beamRng.float(0.6, 1);
      const lean = beamRng.float(-0.08, 0.08);
      const bow = beamRng.float(-0.1, 0.1);
      const wave = beamRng.float(-0.06, 0.06);
      const wide = coreWidth * beamRng.float(0.3, 0.6);
      const one = [];
      const other = [];
      for (let k = 0; k <= 10; k += 1) {
        const f = k / 10;
        const v = long * (lean * f + bow * Math.sin(Math.PI * f) + wave * f * Math.sin(3 * Math.PI * f));
        const w = wide * Math.min(1, f / 0.12, (1 - f) / 0.35);
        one.push(at(long * f, v + w));
        other.push(at(long * f, v - w));
      }
      darken(poly([...one, ...other.reverse()]));
    }

    // 레이저. 꼬리 하나를 빛의 통으로 찍는다
    if (lit) glowWith("yellow", poly(facet(at, 0, reach, 0, (s) => laserWide * taper(s), { steps: 9 })));

    // 도트. 받은 분해 장면의 Dots 이미터다(0:13~0:14). 점은 모두 머리 바로 뒤에서 크고 길쭉한 타원으로
    // 태어나 고른 빠르기로 꼬리 쪽으로 흐르며 작아지고 동그래져, 끝에서는 원이 된다. 그래서 머리 뒤에는
    // 갓 난 큰 타원이 늘 겹쳐 한 덩이를 이루고, 그 뒤로 점점 작아지는 구슬이 광선을 따라 거의 한 줄로
    // 선다. 점마다 축을 따라 눕고 옆으로는 거의 벌어지지 않는다. 덩이를 벗어나자마자 빠르게 작아져
    // 구슬이 서로 떨어져 선다.
    //
    // 피벗은 가장 컸을 때의 진행 방향 맨 앞 끝이다. 작아지고 동그래지면서 그 점으로 오므라드므로, 원이
    // 되어도 느려 보이지 않는다. 머리 쪽 끝에 두었을 때는 줄어드는 만큼 모양이 뒤로 끌려, 원이 될 때
    // 느려 보였다. 가장 클 때 머리 쪽 끝이 머리 원점 바로 뒤에 닿으므로 머리 앞으로 나오지 않는다.
    //
    // 값은 이펙트 툴의 이미터처럼 둔다(DOTS 칸) — 뿜는 빈도(FREQ), 수명(LIFETIME), 흐르는 빠르기와
    // 나는 방향과 가속도와 끌림(VELOCITY · ANGLE · ACCEL · DRAG · GRAVITY · TOWARD), 갓 난 크기와 그 흩어짐과 수명에 따른 크기와 옅어짐(SIZE · VARY · SHRINK · FADE),
    // 한꺼번에 뿜기(BURST), 길쭉함(STRETCH), 옆으로
    // 벌어짐(SCATTER). 기본은 1초에 서른일곱 개를 뿜고 한 점이 한 바퀴를 산다. FREQ 0이면 도트가 없다.
    // 수명이 짧아 한 점이 세 장만 살면 흐르기보다 깜빡이다 사라진다.
    //
    // 겹친 자리가 더 진해지지 않게 한 길에 모아 한 번에 찍는다. 광선 위에 얹는다 — 구슬이 광선과 한
    // 줄이라 광선 밑에 깔면 다 가려진다. 색은 분해 장면의 완성본처럼 어둠이다. 흰 타원이면 머리의 흰
    // 원이 덩이와 한 덩어리가 된다
    //
    // dotPeak는 도트 하나가 가장 클 때의 반지름(긴 축)에 대한 비율이다. 크기는 자라기를 마치는 나이
    // 0.04에서 가장 크다
    const dotPeak = 0.96 * Math.exp(-0.04 * knobs.shrink);
    const aim = (knobs.dotAngle * Math.PI) / 180; // 점이 나는 방향. 속력과 함께 속도가 된다
    // 끌리는 쪽(GRAVITY · TOWARD). 화면의 y는 아래로 자라므로 0도가 화면 아래다
    const fallTo = (knobs.toward * Math.PI) / 180;
    const fall = [Math.sin(fallTo) * knobs.gravity * width * 0.5, Math.cos(fallTo) * knobs.gravity * width * 0.5];
    const dotReach = L * knobs.velocity * dotsFlow.lifetime;
    if (dots.length) {
      // 옅어짐(FADE)이 같은 단계끼리 한 길에 모아 찍는다. 겹친 자리가 더 진해지지 않게 하려는 것이다.
      // FADE가 0이면 모두 한 단계라 예전처럼 한 길이고, 한꺼번에 뿜으면(BURST 1) 나이가 같아 역시 한 길이다
      const steps = new Map();
      dots.forEach((d, i) => {
        const age = dotsFlow.ageOf(i, d.born);
        // 수명에 따른 크기. 끝으로 갈수록 0이라 되감기는 자리에서 튀지 않는다
        const shrink = Math.min(1, age / 0.04) * (1 - age) * Math.exp(-knobs.shrink * age);
        if (shrink <= 0.01) return;
        // 사는 동안 옅어지는 모양. 여덟 단계로 끊어 같은 단계끼리 모은다
        const light = Math.round(8 * Math.exp(-knobs.fade * age));
        if (light <= 0) return;
        const full = width * 0.08 * knobs.size * (1 + knobs.sizeVary * 1.8 * (d.size - 0.5)); // 갓 난 크기. 점마다 VARY만큼 다르다
        const long = full * shrink;
        // 갓 난 것은 길쭉하고 흐르며 동그래져, 끝에서는 원이다
        const thick = long / (1 + knobs.stretch * (3 + 0.6 * d.stretch) * Math.pow(1 - age, 1.5));
        // 피벗은 가장 컸을 때의 진행 방향 맨 앞 끝(꼬리 쪽 끝)이다. 점은 이 점을 따라 흐르고, 작아지며
        // 이 점으로 오므라들어 원이 된다. 가장 클 때 머리 쪽 끝이 머리 원점 바로 뒤에 닿는다
        const eased = 1 - Math.pow(1 - age, 1 + 3 * knobs.drag);
        // 가속도. 등속이면 나이만큼 가고, 빨라지면 나이의 제곱이 섞인다. 끝값으로 나눠 가는 거리는 그대로다
        const flow = (eased + knobs.accel * eased * eased) / (1 + knobs.accel);
        const lead = headRadius * 0.2 + 2 * full * dotPeak + dotReach * (0.78 + 0.44 * d.reach) * flow;
        const middle = lead - long;
        // 나는 방향(라디안). ANGLE만큼 축에서 기울고, 점마다 SCATTER만큼 더 흩어진다. 옆으로 밀리는
        // 자리는 그 방향의 기울기다
        const lean = aim + d.drift * 0.16 * knobs.scatter;
        const [px, py] = at(middle, d.off * headRadius * 1.6 * knobs.scatter + middle * Math.tan(lean));
        // 끌림. 나이의 제곱으로 한쪽으로 밀려 구슬 줄이 휜다
        const x = px + fall[0] * age * age;
        const y = py + fall[1] * age * age;
        const tip = tilt + lean;
        if (!steps.has(light)) steps.set(light, []);
        steps.get(light).push((g) => {
          g.moveTo(x + Math.cos(tip) * long, y + Math.sin(tip) * long);
          g.ellipse(x, y, long, thick, tip, 0, TAU);
        });
      });
      for (const [light, list] of [...steps].sort((a, b) => a[0] - b[0])) {
        darken((g) => {
          g.beginPath();
          for (const add of list) add(g);
          g.fill();
        }, light / 8);
      }
    }

    // 꼬리별. 받은 분해 장면의 Stars 이미터다(0:18~0:21). 별은 머리 원의 가장자리에서 태어나 꼬리 쪽으로
    // 날아가며 작아진다. 허리가 가는 네 갈래 반짝이이고, 앞뒤 팔이 옆 팔보다 조금 길다. 뒤로는 머리 쪽을
    // 향해 머리카락처럼 가늘어지는 꼬리를 끈다 — 빠를수록 길어, 끌림(DRAG)으로 느려지면 짧아진다. 꼬리는
    // 머리 원점을 넘어 앞으로 나오지 않는다. 별마다 노랑 · 분홍 · 푸름 · 흰빛 가운데 하나로 빛나고, 열에 하나쯤은
    // 두 번째 창끝과 같은 어둠이라 밝은 별 사이에 어두운 별이 섞인다. 색끼리
    // 한 길에 모아 찍는다. 머리는 그 위에 찍힌다
    const starReach = L * knobs.starVelocity * starFlow.lifetime;
    if (starFlow.list.length) {
      const byKind = { yellow: [], pink: [], cyan: [], dark: [], white: [] };
      const hard = 1 + 3 * knobs.starDrag;
      starFlow.list.forEach((d, i) => {
        const age = starFlow.ageOf(i, d.born);
        const shrink = Math.min(1, age / 0.05) * (1 - age) * Math.exp(-knobs.starShrink * age);
        if (shrink <= 0.02) return;
        const r = width * 0.022 * (0.6 + 0.8 * d.size) * knobs.starSize * shrink;
        // 끌림이 있으면 갓 났을 때 빠르고 점점 느려진다. pace는 지금 빠르기의 평균에 대한 비율이다
        const flow = 1 - Math.pow(1 - age, hard);
        const pace = hard * Math.pow(1 - age, hard - 1);
        const u = headRadius * 0.8 + starReach * (0.7 + 0.6 * d.reach) * flow;
        const lean = d.drift * 0.2 * knobs.starScatter;
        const [x, y] = at(u, d.off * headRadius * (0.5 + 2.5 * knobs.starScatter) + u * lean);
        const dir = tilt + lean;
        const trail = Math.min(knobs.starTrail * r * 7 * pace, Math.max(0, u - headRadius * 0.3));
        const thin = Math.max(0.8, r * 0.1);
        byKind[d.kind].push((g) => {
          starSubpath(g, x, y, dir, r * 1.3, r * 1.1, r * 0.8, 0.12);
          if (trail > r) {
            const cos = Math.cos(dir);
            const sin = Math.sin(dir);
            g.moveTo(x - sin * thin, y + cos * thin);
            g.lineTo(x - cos * trail, y - sin * trail);
            g.lineTo(x + sin * thin, y - cos * thin);
            g.closePath();
          }
        });
      });
      for (const [kind, list] of Object.entries(byKind)) {
        if (!list.length) continue;
        const paint = (g) => {
          g.beginPath();
          for (const add of list) add(g);
          g.fill();
        };
        if (kind === "dark") darken(paint);
        else glowWith(kind, paint);
      }
    }

    // 유성의 머리. 분해 장면의 Spike_Main이다(0:03~0:08, 완성본 0:34~0:36). 머리 원점에 동그라미 심이
    // 붙박이로 빛나고, 심을 사북으로 칼날이 부채꼴로 꼬리 쪽에 펼쳐진다. 부채는 한 바퀴에 FLIP번 새로
    // 짓는다 — 텍스처를 거의 매 프레임 무작위로 고르는 분해 장면과 같다. BEAT와 따로 논다. 장마다 날의 수는
    // 그대로(POINTS)이고 펼친 폭과 길이와 크기가 달라지며(VARY), 심은 자리가 붙박이고 크기만 부채를 따라
    // 바뀐다. 빛깔은 깜빡이지 않는다 — 부채는 늘 빛의 통이고 심은 늘 곁들이 잉크다. 둘레로 번진다(GLOW).
    //
    // 장의 부채는 제 난수로 짓는다. 장 번호로 씨앗을 섞으므로 같은 장은 늘 같은 부채이고, t=1은 t=0과
    // 같은 장이다. 자리를 뽑는 난수는 건드리지 않아 다른 층은 그대로다
    const flip = Math.max(1, Math.round(knobs.spikeFlip));
    const leaf = Math.floor(t * flip) % flip; // 부채의 몇 번째 장인가. t=1은 t=0과 같은 장이다
    const spikeRng = makeRng((seed ^ 0x51f15e5d ^ Math.imul(leaf + 1, 0x9e3779b1)) >>> 0);
    const base = width * 0.1 * knobs.spikeSize; // 창끝 크기(SIZE)
    // 심. 머리의 코어라 머리 원점에 붙박이고, 크기는 장마다 제 난수로 바뀐다(창끝 크기의 0.16~0.26배).
    // 꼴은 자로 그린 원이 아니라 손으로 오린 둥근 꼴이다 — 컴퍼스로 그린 동그라미는 이 판의 다른
    // 층과 따로 논다. 부채의 난수를 건드리지 않도록 제 난수를 따로 굴린다
    const heartR = base * (0.16 + 0.1 * spikeRng.next());
    const coreRng = makeRng((seed ^ 0x7feb352d ^ Math.imul(leaf + 1, 0x846ca68b)) >>> 0);
    const core = shapes.blob(coreRng, hx, hy, heartR, { lobes: 4, wobble: 0.16, steps: 16 });
    // 부채. 가장 작을 때도 가장 커진 심을 감싸고 테를 남긴다 — 윤곽이 심 가운데에서 가장 큰 심의 1/0.85배
    // 밖에 있다. 부채는 이 바닥만 지키고, 장마다 그보다 크게 통째로 스케일한다(VARY). 심과 따로 논다. 장마다
    // 심을 축으로 조금 돈다(±3°) — 텍스처를 바꿔 끼울 때마다 조금씩 어긋나는 것과 같다. 등 쪽은 축의 -v다
    const turnBy = (spikeRng.next() - 0.5) * 0.12 * knobs.spikeVary * 2;
    const shape = spikeShape(spikeRng, Math.round(knobs.spikePoints), knobs.spikeStretch, knobs.spikeSpread, knobs.spikeNose);
    const grow = ((base * 0.26) / 0.85 / edgeDistance(shape, 0, 0)) * (1 + knobs.spikeVary * 1.2 * spikeRng.next());
    const cosT = Math.cos(turnBy) * grow;
    const sinT = Math.sin(turnBy) * grow;
    const outline = shape.map(([x, y]) => at(x * cosT - y * sinT, -(x * sinT + y * cosT)));

    // 두 번째 창끝(분해 장면의 Spike_Second). 분해 장면의 색 단계에서 밝은 창끝 뒤로 남색 · 보라의 가늘고 긴
    // 창끝이 삐져나오듯, 첫째 부채 뒤에 도트와 같은 어둠(세컨더리 빛깔)으로 부채 하나를 더 편다. 몸통은 첫째
    // 부채의 가장 작은 몸통보다 크지 않아(SIZE 1) 늘 그 뒤에 묻히고, 날이 길어 그 밖으로 나온 날만 보인다. 장마다
    // 날의 길이가 달라진다(VARY). 제 난수와 제 박자(FLIP)로 짓는다. 코는 뭉툭하게 두어 첫째 부채 뒤에 묻는다(SECOND 칸)
    if (knobs.secondSize > 0) {
      const flip2 = Math.max(1, Math.round(knobs.secondFlip));
      const secondRng = makeRng((seed ^ 0x2545f491 ^ Math.imul((Math.floor(t * flip2) % flip2) + 1, 0x85ebca77)) >>> 0);
      const turn2 = (secondRng.next() - 0.5) * 0.12 * knobs.secondVary * 2;
      const reach2 = knobs.secondStretch * (1 + knobs.secondVary * 1.2 * secondRng.next());
      const shape2 = spikeShape(secondRng, Math.round(knobs.secondPoints), reach2, knobs.secondSpread, 150);
      const grow2 = ((base * 0.26) / 0.85 / edgeDistance(shape2, 0, 0)) * knobs.secondSize;
      const cos2 = Math.cos(turn2) * grow2;
      const sin2 = Math.sin(turn2) * grow2;
      darken(poly(shape2.map(([x, y]) => at(x * cos2 - y * sin2, -(x * sin2 + y * cos2)))));
    }

    // 번짐. 부채의 흐린 무늬를 한 겹 깐다. 장마다 꼴이 달라 장마다 짓고, 같은 장이면 쥐고 있다
    if (knobs.spikeGlow > 0) {
      const key = `spike|${seed}|${leaf}|${width}|${height}|${knobs.angle}|${knobs.length}|${knobs.spikeSize}|${knobs.spikePoints}|${knobs.spikeStretch}|${knobs.spikeSpread}|${knobs.spikeNose}|${knobs.spikeVary}`;
      const halo = keepSpikeGlow(key, () => keepGlow(glowMask(outline, width * 0.025)));
      glowWith("yellow", (g) => {
        g.globalAlpha *= knobs.spikeGlow;
        g.imageSmoothingQuality = "low";
        g.drawImage(halo.canvas, 1, 1, halo.cols, halo.rows, halo.x, halo.y, halo.width, halo.height);
      });
    }
    // 몸통. 심 자리는 오려 내고 심은 따로 찍는다 — 잉크를 얹고 파내는 방식이라, 겹쳐 찍으면 심의 빛깔이
    // 몸통을 따라 달라진다
    glowWith("yellow", (g) => {
      g.beginPath();
      g.rect(-width, -height, width * 3, height * 3);
      shapes.splineSubpath(g, core, true);
      g.clip("evenodd");
      poly(outline)(g);
    });
    glowWith("core", (g) => {
      shapes.splinePath(g, core, true);
      g.fill();
    });

    // 도트가 사는 동안 가는 끝. 기운 방향(ANGLE)과 끌림(GRAVITY)을 따라간다. 안내선이 여기를 찍는다
    const dotEnd = headRadius * 0.2 + 2 * width * 0.08 * knobs.size * dotPeak + dotReach;
    const dotTip = at(dotEnd, dotEnd * Math.tan(aim));
    dotTip[0] += fall[0];
    dotTip[1] += fall[1];

    // 이 장의 뼈대. 인쇄기가 안내선(guides)에 넘긴다. 안내선이 판을 다시 계산하지 않고 이 장이 쓴
    // 값을 그대로 본다. span은 안내선의 축이 머리 앞에서 꼬리 끝 너머까지 긋는 길이다
    const span = L * 1.3;
    return { at, L, reach, hx, hy, coreWidth: laserWide, beat, held, clock, span, dots: { count: dots.length, lifetime: dotsFlow.lifetime, tip: dotTip }, stars: { count: starFlow.list.length, lifetime: starFlow.lifetime, end: headRadius * 0.8 + starReach } };
  },

  // 안내선. 인쇄된 픽셀은 건드리지 않고 화면 위에 겹쳐 그린다 — 축이 어디를 지나는지, 머리에 딸린
  // 것이 어느 점을 붙박이로 늘고 주는지, 광선이 어디까지 뻗는지를 눈으로 잡기 위한 것이다
  guides(page, sketch) {
    if (!sketch) return [];
    const { at, L, reach, hx, hy, coreWidth, beat, held, clock, span, dots, stars } = sketch;
    const marks = [];

    // 축. 머리 앞에서 꼬리 끝 너머까지
    marks.push({ kind: "line", from: at(-L * 0.15, 0), to: at(-L * 0.15 + span, 0), dash: true });

    // 레이저의 윤곽. 머리 쪽에서 부풀었다가 끝으로 가늘어지는 꼬리
    marks.push({ kind: "path", points: facet(at, 0, reach, 0, (s) => coreWidth * taper(s), { steps: 9 }), dash: true });

    // 머리 원점. 광선이 여기서 시작하고, 머리에 딸린 것들의 피벗도 여기다
    marks.push({ kind: "dot", at: [hx, hy], r: 5, ring: 22, label: "PIVOT · HEAD 0", hot: true });

    // 도트의 피벗(가장 컸을 때의 앞 끝)이 사는 동안 가는 끝. 구슬 줄이 여기쯤에서 원이 되어 사라진다
    if (dots.count) marks.push({ kind: "dot", at: dots.tip, r: 3, label: "DOTS END" });

    // 꼬리별이 사는 동안 가는 끝(가운데 빠르기의 별)
    if (stars.count) marks.push({ kind: "dot", at: at(stars.end, 0), r: 3, label: "STARS END", lift: -18 });

    // 박자. 지금 몇 번째 장인지. 도트가 실제로 뿜는 빈도와 수명 — 루프가
    // 닫히도록 맞춘 값이라 손잡이와 조금 다를 수 있다. 그림을 가리지 않게 모서리에 적는다
    const drawn = Math.round(held * beat);
    const rate = (name, flow) => (flow.count ? ` · ${name} ${Math.round(flow.count / flow.lifetime)}/S × ${flow.lifetime.toFixed(2)}S = ${flow.count}` : "");
    const flows = rate("DOTS", dots) + rate("STARS", stars);
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `BEAT ${drawn}/${beat} · F${clock}${flows}`
    });
    return marks;
  }
};
