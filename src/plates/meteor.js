// 별똥별. 애니메이션 이펙트 작화의 문법으로, 이미터를 층층이 쌓아 그린다.
//
// 받은 이펙트 분해 장면을 따라 층을 나눈다. 층마다 모양 어휘와 색과 박자가 다르고, 뒤에서 앞으로
// 이 차례로 찍는다.
//
//   티끌      먼 하늘의 작은 점
//   번짐      광선 둘레의 흐린 빛 한 겹
//   보조 광선  주 광선과 조금 다른 각도로 나란히 뻗는 가는 띠. 분홍과 푸름
//   주 광선    머리에서 꼬리 끝까지 뻗는 넓은 노란 띠. 속에 흰 심이 있다
//   도트      머리 바로 뒤에서 크게 태어나 광선을 따라 흐르며 작아지는 납작한 어두운 타원. 머리 뒤에
//             한 덩이가 되고 그 뒤로 구슬이 줄지어 선다. 광선 위에 얹는다
//   불티      머리 언저리의 짧고 밝은 줄기
//   꼬리별     머리에서 뿜어 나와 꼬리 쪽으로 날아가는 네 갈래 별. 머리 쪽으로 가늘어지는 꼬리를 끈다
//   머리      분해 장면의 Spike_Main. 머리 원점의 흰 동그라미 심(코어)을 사북으로 노란 칼날이 부채꼴로
//             꼬리 쪽에 펼쳐진다. 부채는 장마다 새로 짓고, 심은 자리가 붙박이고 크기만 부채를 따라 바뀐다.
//             빛깔은 깜빡이지 않는다
//
// 이펙트 작화의 문법은 셋이다.
//
//   또박또박한 박자   한 바퀴를 BEAT장으로 나눠 그 장 수만큼만 그림이 바뀐다. 사이를 메우지 않아
//                     모양이 뚝뚝 끊겨 튄다. 프레임마다 부드럽게 흐르면 사진이 되고 이펙트가 아니다
//   납작한 면        번지는 계조가 아니라 납작한 면이다. 가장자리는 마디가 적어 직선으로 꺾인다
//   임팩트 프레임    한 바퀴에 한 번, 두 프레임 동안 머리에서 둥근 흰빛이 터지고 하늘까지 옅어진다
//
// 어두운 시야는 COSMOS처럼 밤의 통을 하늘에 깔고 빛나는 것을 파내는 방식이다. 다만 밤은 가장 노란
// 통 하나만 빼고 모두다. 노랗지 않은 통만 밤으로 치면 코랄 같은 따뜻한 통이 빠져 하늘이 한 가지
// 밝은 색으로만 깔린다. 별똥별은 하늘이 어두워야 선다.
//
//   노란 빛   밤을 다 파낸 자리에 노란 통을 얹는다. 노란 통이 없으면 가장 옅은 밤을 조금 남긴다
//   푸른 빛   밤을 파내되 가장 푸른 통은 조금 남긴다
//   분홍 빛   밤을 파내되 가장 붉은 통은 조금 남긴다
//   흰 빛     노란 통까지 다 파낸다
//   어둠      밤의 통을 하늘보다 진하게 찍고, 노란 통은 파낸다. 노랑이 남으면 어둠이 올리브가 된다
//
// 별똥별은 제자리에 있고 둘레가 흐른다. 카메라가 별똥별을 따라가는 셈이다. 흐르는 것은 꼬리 쪽으로
// 가서 끝에서 사라지고 머리 앞에서 다시 나타난다. 흐르는 박자는 한 바퀴에 정수 번이고 양 끝에서
// 가늘어져, 되감기는 자리가 보이지 않는다. 무엇이든 언제나 같은 수만큼 뽑고 손잡이는 그중 몇을
// 찍을지만 정한다.

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { glowMask, keepGlow, layGlow } from "../blur.js";
import { keeper } from "../keep.js";
import { nightAndGlow, bluest, reddest } from "../drums.js";
import { floodNight, carve, stain } from "../night.js";
import { dim } from "../scope.js";

const TAU = Math.PI * 2;
const MOST_DUST = 120;
const MOST_DOTS = 60; // 한 번에 보이는 도트의 끝값
const DOTS_EARLY = 12; // 도트 가운데 예전 연기가 뽑던 자리에서 뽑는 수
const LOOP_SECONDS = 2; // 화면의 시계는 한 바퀴 48프레임, 초당 24프레임이다. 이미터의 값은 초로 적는다
const MOST_STARS = 40; // 한 번에 보이는 꼬리별의 끝값
const MOST_BEAMS = 4;
const MOST_EMBERS = 12;
const FLASH_FRAMES = 2; // 임팩트 프레임이 머무는 프레임 수. 시계는 한 바퀴 48프레임이다

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

// 흐르는 것의 자리. 한 바퀴에 speed번 0에서 1까지 가고, 양 끝에서 0으로 가늘어지는 창을 함께 준다
function flowing(phase, t, speed) {
  const p = (phase + t * speed) % 1;
  return { p, fade: Math.pow(Math.sin(Math.PI * p), 0.6) };
}

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
// 살아 있어야 하므로, 늘 뽑아 둔 all에서 그만큼만 쓴다. 태어나는 때는 황금비로 흩어 늘 고르게 뿜는다
function emitter(all, freq, lifetime, held) {
  const lives = Math.max(1, Math.round(LOOP_SECONDS / lifetime));
  const life = LOOP_SECONDS / lives;
  const list = all.slice(0, Math.min(all.length, Math.round(freq * life)));
  const count = Math.max(1, list.length);
  const ageOf = (i, born) => (((i * 0.6180339887 + born / count + held * lives) % 1) + 1) % 1;
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
//   부채  장마다 좁게 모은 부채(창)와 넓게 펼친 부채 사이의 어디쯤이고, 한쪽으로 조금 기운다. 좁을수록 날이 길다
//   코    심 앞으로 짧게 나온 끝. 진행 방향을 가리키고, 끝은 장마다 오각형에서 칠각형 사이로 깎인다
//   테    심 둘레를 감싸는 몸통. 심에 몸통 빛깔의 테가 남는 자리다
//
// stretch는 날의 길이다. 꼭짓점이 모두 심을 한 방향으로 도는 차례(코 → 아래 → 날들 → 위)로 놓여, 윤곽은
// 스스로 꼬이지 않는다
function spikeShape(rng, points, stretch) {
  const blades = rng.int(Math.max(2, Math.ceil(points / 2)), Math.max(2, points)); // 날 수. 장마다 points의 절반에서 points 사이로 바뀐다
  const open = rng.next(); // 0이면 좁게 모은 부채, 1이면 넓게 펼친 부채
  const half = (0.44 + 0.56 * open) * rng.float(0.9, 1.1); // 부채의 반각(라디안). 23°~63°. 가운데 날은 광선에 묻히므로 옆 날이 보이게 편다
  const tilt = rng.float(-0.15, 0.15) * half;
  const middle = stretch * rng.float(3, 4.2) * (1.3 - 0.3 * open); // 가운데 날의 길이. 좁은 부채일수록 길다
  const from = tilt - half;
  const to = tilt + half;
  const polar = (angle, r) => [r * Math.cos(angle), r * Math.sin(angle)];
  const outline = [[-rng.float(1.5, 2.1), rng.float(-0.1, 0.1)], polar(from - Math.PI / 2, 1)];
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
  outline.push(polar(to + Math.PI / 2, 1));
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
  about: "별똥별. 이펙트 이미터를 층층이 — 광선과 도트, 꼬리별, 그리고 임팩트 프레임",

  knobs: [
    { group: "SKY", key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "층마다의 자리를 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { group: "SKY", key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 0.85, hint: "하늘의 어둠" },
    { group: "SKY", key: "dust", label: "DUST", min: 0, max: 120, step: 5, value: 50, hint: "먼 하늘의 티끌" },
    { group: "BEAM", key: "angle", label: "ANGLE", min: 10, max: 80, step: 1, value: 38, hint: "광선이 기운 각도. 꼬리가 오른쪽 위로 뻗는다" },
    { group: "BEAM", key: "length", label: "LENGTH", min: 0.4, max: 1.3, step: 0.01, value: 1.05, hint: "광선의 길이. 판 폭에 대한 비율이다. 길게 하면 꼬리가 판 밖으로 나간다" },
    { group: "BEAM", key: "core", label: "CORE", min: 0.3, max: 2.5, step: 0.05, value: 1.3, hint: "주 광선의 굵기" },
    { group: "BEAM", key: "beams", label: "BEAMS", min: 0, max: 4, step: 1, value: 2, hint: "조금 다른 각도로 나란히 뻗는 보조 광선의 수" },
    { group: "BEAM", key: "glow", label: "GLOW", min: 0, max: 1, step: 0.05, value: 0.6, hint: "광선 둘레의 번짐. 납작한 면만 있으면 붙인 색종이가 된다" },
    // 머리의 창끝(분해 장면의 Spike_Main). 판 손잡이 칸에서 빼 SPIKE 칸으로 따로 둔다(panel)
    { panel: "SPIKE", key: "spikeSize", label: "SIZE", min: 0.3, max: 2, step: 0.05, value: 1, hint: "머리 창끝의 크기" },
    { panel: "SPIKE", key: "spikePoints", label: "POINTS", min: 2, max: 8, step: 1, value: 5, hint: "부채의 칼날 수의 끝값. 장마다 이 수의 절반에서 이 수 사이로 줄었다 늘었다 한다" },
    { panel: "SPIKE", key: "spikeStretch", label: "STRETCH", min: 0.5, max: 2.5, step: 0.05, value: 1, hint: "칼날이 뻗는 길이. 높을수록 길다" },
    { panel: "SPIKE", key: "spikeVary", label: "VARY", min: 0, max: 1, step: 0.05, value: 0.5, hint: "장마다 창끝이 커지는 정도. 가장 작을 때도 가장 커진 심을 감싼다. 0이면 늘 그 크기다" },
    { panel: "SPIKE", key: "spikeFlip", label: "FLIP", min: 4, max: 48, step: 1, value: 24, hint: "창끝이 한 바퀴에 몇 번 바뀌는가. 한 바퀴는 48프레임이고, 분해 장면은 거의 매 프레임 바뀐다. BEAT와 따로 논다" },
    { panel: "SPIKE", key: "spikeGlow", label: "GLOW", min: 0, max: 1, step: 0.05, value: 0.8, hint: "창끝 둘레의 번짐" },
    // 도트 이미터. 이펙트 툴의 이미터 값을 그대로 둔다 — 뿜는 빈도, 수명, 빠르기와 끌림, 크기와 수명에 따른 크기.
    // 판 손잡이 칸에서 빼 DOTS 칸으로 따로 둔다(panel)
    { panel: "DOTS", key: "freq", label: "FREQ", min: 0, max: 60, step: 1, value: 24, hint: "뿜는 빈도(spawn rate). 1초에 몇 개를 뿜는가. 한 번에 보이는 점은 FREQ × LIFETIME개이고 60개까지다. 0이면 도트가 없다" },
    { panel: "DOTS", key: "lifetime", label: "LIFETIME", min: 0.2, max: 2, step: 0.05, value: 1, hint: "점 하나가 사는 시간(초). 루프가 닫히도록 한 바퀴(2초)를 똑같이 나눈 값(2 · 1 · 0.67 · 0.5 …)으로 맞춰진다. 길수록 오래 남아 멀리 간다" },
    { panel: "DOTS", key: "velocity", label: "VELOCITY", min: 0.05, max: 1.5, step: 0.05, value: 0.45, hint: "흐르는 빠르기. 1초에 광선 길이의 몇 배를 가는가. 구슬 줄의 길이는 VELOCITY × LIFETIME이다" },
    { panel: "DOTS", key: "drag", label: "DRAG", min: 0, max: 1, step: 0.05, value: 0, hint: "끌림. 0이면 고른 빠르기로 흐르고, 올릴수록 갓 난 점이 빠르게 튀어 나갔다가 느려져 구슬이 꼬리 쪽에 몰린다" },
    { panel: "DOTS", key: "size", label: "SIZE", min: 0.3, max: 2, step: 0.05, value: 1, hint: "갓 난 타원의 크기. 머리 뒤 덩이의 크기다" },
    { panel: "DOTS", key: "shrink", label: "SHRINK", min: 0, max: 6, step: 0.1, value: 3, hint: "사는 동안 작아지는 모양(size over life). 0이면 고르게 줄고, 높을수록 덩이를 벗어나자마자 작아져 구슬이 떨어져 선다" },
    { panel: "DOTS", key: "stretch", label: "STRETCH", min: 0, max: 2, step: 0.05, value: 1, hint: "갓 난 타원이 축을 따라 길쭉한 정도. 흐르며 동그래져 끝에서는 원이 된다. 0이면 처음부터 원이다" },
    { panel: "DOTS", key: "scatter", label: "SCATTER", min: 0, max: 1, step: 0.05, value: 0.25, hint: "옆으로 벌어지는 정도. 0이면 구슬이 광선과 한 줄로 선다" },
    // 꼬리별 이미터. 도트와 같은 이미터 값에, 별 뒤로 끄는 꼬리의 길이(TRAIL)를 더한다. 판 손잡이 칸에서
    // 빼 STARS 칸으로 따로 둔다(panel)
    { panel: "STARS", key: "starFreq", label: "FREQ", min: 0, max: 30, step: 1, value: 10, hint: "꼬리별을 뿜는 빈도(spawn rate). 1초에 몇 개를 뿜는가. 한 번에 보이는 별은 FREQ × LIFETIME개이고 40개까지다. 0이면 없다" },
    { panel: "STARS", key: "starLifetime", label: "LIFETIME", min: 0.2, max: 2, step: 0.05, value: 0.7, hint: "별 하나가 사는 시간(초). 루프가 닫히도록 한 바퀴(2초)를 똑같이 나눈 값(2 · 1 · 0.67 · 0.5 …)으로 맞춰진다" },
    { panel: "STARS", key: "starVelocity", label: "VELOCITY", min: 0.1, max: 2, step: 0.05, value: 0.9, hint: "날아가는 빠르기. 1초에 광선 길이의 몇 배를 가는가" },
    { panel: "STARS", key: "starDrag", label: "DRAG", min: 0, max: 1, step: 0.05, value: 0.3, hint: "끌림. 올릴수록 빠르게 튀어 나갔다가 느려지고, 느려지는 만큼 꼬리가 짧아진다" },
    { panel: "STARS", key: "starSize", label: "SIZE", min: 0.3, max: 2, step: 0.05, value: 1, hint: "갓 난 별의 크기" },
    { panel: "STARS", key: "starShrink", label: "SHRINK", min: 0, max: 6, step: 0.1, value: 1.2, hint: "사는 동안 작아지는 모양(size over life). 높을수록 금세 작아진다" },
    { panel: "STARS", key: "starTrail", label: "TRAIL", min: 0, max: 3, step: 0.05, value: 1, hint: "별 뒤로 머리 쪽을 향해 끄는 꼬리의 길이. 빠르게 날수록 길다. 0이면 꼬리 없는 반짝이다" },
    { panel: "STARS", key: "starScatter", label: "SCATTER", min: 0, max: 1, step: 0.05, value: 0.4, hint: "옆으로 벌어지는 정도. 0이면 별이 광선과 한 줄로 난다" },
    // 한 바퀴를 몇 장으로 그리는가. 시계는 한 바퀴 48프레임이므로 12면 네 프레임에 한 장이다
    { group: "BEAT", key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 12, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊기고, 48이면 프레임마다 다시 그린다" },
    { group: "BEAT", key: "flash", label: "FLASH", min: 0, max: 1, step: 0.05, value: 0.6, hint: "임팩트 프레임. 한 바퀴에 한 번 두 프레임 동안 머리에서 둥근 흰빛이 터지고 하늘이 옅어진다. 0이면 터지지 않는다" }
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

    // 임팩트 프레임. 시계의 한 바퀴 가운데 두 프레임 동안만 선다. 시작은 6의 배수 프레임이다 —
    // 화면은 한 장을 1·2·3프레임씩 잡아 두는데, 6의 배수는 어느 박자로 찍어도 찍히는 프레임이다.
    // 아무 프레임에서나 서게 두었더니 세 프레임에 한 장일 때, 롤 셋에 하나는 섬광의 두 프레임이
    // 모두 찍히지 않는 자리에 끼어 아예 보이지 않았다. 이음매에서는 멀리 떨어뜨려, 이음매를 재는
    // 걸음에 이 큰 뜀이 끼지 않게 한다. 뽑기는 예전처럼 한 번이라 뒤의 자리는 그대로다
    const flashFrame = 6 * layout.int(1, 6);
    const clock = Math.floor(t * page.frames) % page.frames; // t=1은 한 바퀴를 꽉 돈 것이라 t=0과 같은 장이다
    const burst = knobs.flash > 0 && clock >= flashFrame && clock < flashFrame + FLASH_FRAMES ? knobs.flash : 0;

    // 축. 머리에서 꼬리 쪽을 향한다. 화면의 y는 아래로 자라므로 위로 가려면 뺀다. 머리는 왼쪽 아래에
    // 두고 꼬리가 오른쪽 위로 판을 가로지른다
    const angle = (knobs.angle * Math.PI) / 180;
    const L = width * knobs.length;
    const hx = width * 0.5 - Math.cos(angle) * L * 0.44;
    const hy = height * 0.5 + Math.sin(angle) * L * 0.44;
    const axis = (lean = 0) => {
      const a = angle + lean;
      const dx = Math.cos(a);
      const dy = -Math.sin(a);
      return (u, v) => [hx + dx * u - dy * v, hy + dy * u + dx * v];
    };
    const at = axis();
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
    const beams = Array.from({ length: MOST_BEAMS }, (_, i) => ({
      lean: layout.float(0.03, 0.12) * (i % 2 === 0 ? 1 : -1),
      off: layout.float(0.005, 0.04) * (i % 2 === 0 ? 1 : -1),
      long: layout.float(0.3, 0.6),
      wide: layout.float(0.18, 0.4),
      kind: i % 2 === 0 ? "pink" : "cyan",
      beat: layout.int(1, 2),
      phase: layout.float(0, TAU)
    })).slice(0, knobs.beams);
    // 걷은 층들이 뽑던 자리 — 속도선(30개 × 8번), 각진 파편(14개 × 7번), 점선 꼬리 별(40개 × 8번). 층은
    // 걷었지만 뒤의 층들이 제자리에 있도록 뽑던 수만큼 흘려보낸다
    for (let i = 0; i < 30 * 8 + 14 * 7 + 40 * 8; i += 1) layout.next();
    const embers = Array.from({ length: MOST_EMBERS }, () => ({
      phase: layout.next(),
      off: layout.float(-0.05, 0.05),
      len: layout.float(0.03, 0.09),
      half: layout.float(1.5, 4),
      kind: layout.chance(0.6) ? "yellow" : "pink"
    }));
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
      return { ...star, kind: hue < 0.5 ? "yellow" : hue < 0.7 ? "pink" : hue < 0.9 ? "cyan" : "white" };
    });

    // 도트와 꼬리별의 이미터. 한 번에 사는 수는 빈도와 수명이 정한다
    const dotsFlow = emitter(dotsAll, knobs.freq, knobs.lifetime, held);
    const dots = dotsFlow.list;
    const starFlow = emitter(starsAll, knobs.starFreq, knobs.starLifetime, held);

    // 통 나누기. 빛은 가장 노란 통 하나이고 나머지는 모두 밤이다(src/drums.js). 통이 둘 이하면
    // 모두 밤이고, 노란 빛은 가장 옅은 밤을 조금 남겨 낸다
    const { night, palest, deepest, nightDrums, glowInk } = nightAndGlow(S.drums);
    const blue = bluest(nightDrums);
    const red = reddest(nightDrums);

    // 빛을 찍는다. paint는 캔버스에 모양을 그리고 채운다. 색마다 밤을 얼마나 남기는지가 다르다
    const keeps = (kind, sep) =>
      kind === "cyan" && sep === blue
        ? 0.6
        : kind === "pink" && sep === red
          ? 0.55
          : kind === "yellow" && !glowInk && sep === palest && night.length > 1
            ? 0.45
            : 0;
    const glowWith = (kind, paint, strength = 1) => {
      carve(night, paint, (sep) => strength * (1 - keeps(kind, sep)));
      if (!glowInk) return;
      if (kind === "white") carve([glowInk], paint, strength);
      else if (kind === "yellow" || kind === "cyan") stain([glowInk], paint, strength * (kind === "yellow" ? 0.95 : 0.14));
    };

    // 어둠을 찍는다. 밤의 통을 하늘보다 진하게, 노란 통은 파낸다. 도트가 쓴다
    const darken = (paint, strength = 1) => {
      stain(night, paint, (sep) => strength * (sep === deepest ? 1 : 0.9));
      if (glowInk) carve([glowInk], paint, strength);
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

    // 하늘. 밤의 통을 깔고 노란 통을 옅게 깔아 푸르스름한 회색을 만든다. 가장자리를 조금 누른다.
    // 임팩트 프레임에는 하늘까지 옅어진다
    const dark = knobs.dark * (1 - 0.22 * burst);
    floodNight(night, deepest, dark, 0.9, 0.75);
    if (glowInk) glowInk.flood(0.18 * dark);
    dim(deepest, page, width * 0.82, 0.8);

    // 먼 하늘의 티끌
    if (dust.length) {
      glowWith(
        "white",
        every(
          dust.map((d) => (g) => {
            const r = d.size * (0.6 + 0.4 * Math.sin(turn * d.beat + d.phase));
            g.beginPath();
            g.arc(d.x, d.y, Math.max(0.3, r), 0, TAU);
            g.fill();
          })
        ),
        0.6
      );
    }

    // 광선 둘레의 번짐
    const coreWidth = width * 0.016 * knobs.core;
    if (knobs.glow > 0) {
      const mask = keepMask(`halo|${width}|${height}|${knobs.length}|${knobs.angle}|${knobs.core}`, () =>
        keepGlow(glowMask(facet(at, -L * 0.02, L, 0, (s) => coreWidth * 2.4 * taper(s), { steps: 24 }), width * 0.03))
      );
      for (const sep of night) sep.knockout((plate) => plate.draw((g) => layGlow(g, mask, knobs.glow * (sep === blue ? 0.6 : 0.8))));
      if (glowInk) glowInk.draw((g) => layGlow(g, mask, knobs.glow * 0.5));
    }

    // 보조 광선. 주 광선과 조금 다른 각도로 나란히 뻗는다. 분홍과 푸름이 번갈아 온다
    for (const b of beams) {
      const beamAt = axis(b.lean);
      const wide = coreWidth * b.wide * (1 + 0.12 * Math.sin(turn * b.beat + b.phase));
      glowWith(b.kind, poly(facet(beamAt, 0, L * b.long, b.off * width, (s) => wide * taper(s), { steps: 8 })));
    }

    // 주 광선. 납작한 면 셋이다 — 노란 몸, 꼬리 끝의 푸른 면, 그 안의 흰 심
    const swell = 1 + 0.1 * Math.sin(turn * 2 + trailPhase);
    glowWith("yellow", poly(facet(at, 0, L, 0, (s) => coreWidth * taper(s) * swell, { steps: 9 })));
    glowWith("cyan", poly(facet(at, L * 0.55, L, 0, (s) => coreWidth * taper(0.55 + s * 0.45) * swell * 0.95, { steps: 5 })));
    const heartEnd = L * (0.45 + 0.06 * Math.sin(turn + trailPhase));
    glowWith("white", poly(facet(at, L * 0.01, heartEnd, 0, (s) => coreWidth * 0.5 * Math.pow(Math.sin(Math.PI * s), 0.6) * swell, { steps: 6 })), 0.9);

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
    // 끌림(VELOCITY · DRAG), 갓 난 크기와 수명에 따른 크기(SIZE · SHRINK), 길쭉함(STRETCH), 옆으로
    // 벌어짐(SCATTER). 기본은 1초에 스물네 개를 뿜어 1초 산다. 기본 박자(BEAT 12)에서 여섯 장쯤이다.
    // 세 장만 살 때는 점이 흐르기보다 깜빡이다 사라졌다.
    //
    // 겹친 자리가 더 진해지지 않게 한 길에 모아 한 번에 찍는다. 광선 위에 얹는다 — 구슬이 광선과 한
    // 줄이라 광선 밑에 깔면 다 가려진다. 색은 분해 장면의 완성본처럼 어둠이다. 흰 타원이면 머리의 흰
    // 원이 덩이와 한 덩어리가 된다
    //
    // dotPeak는 도트 하나가 가장 클 때의 반지름(긴 축)에 대한 비율이다. 크기는 자라기를 마치는 나이
    // 0.04에서 가장 크다
    const dotPeak = 0.96 * Math.exp(-0.04 * knobs.shrink);
    const dotReach = L * knobs.velocity * dotsFlow.lifetime;
    if (dots.length) {
      darken((g) => {
        g.beginPath();
        dots.forEach((d, i) => {
          const age = dotsFlow.ageOf(i, d.born);
          // 수명에 따른 크기. 끝으로 갈수록 0이라 되감기는 자리에서 튀지 않는다
          const shrink = Math.min(1, age / 0.04) * (1 - age) * Math.exp(-knobs.shrink * age);
          if (shrink <= 0.01) return;
          const full = width * (0.06 + 0.04 * d.size) * knobs.size;
          const long = full * shrink;
          // 갓 난 것은 길쭉하고 흐르며 동그래져, 끝에서는 원이다
          const thick = long / (1 + knobs.stretch * (3 + 0.6 * d.stretch) * Math.pow(1 - age, 1.5));
          // 피벗은 가장 컸을 때의 진행 방향 맨 앞 끝(꼬리 쪽 끝)이다. 점은 이 점을 따라 흐르고, 작아지며
          // 이 점으로 오므라들어 원이 된다. 가장 클 때 머리 쪽 끝이 머리 원점 바로 뒤에 닿는다
          const flow = 1 - Math.pow(1 - age, 1 + 3 * knobs.drag);
          const lead = headRadius * 0.2 + 2 * full * dotPeak + dotReach * (0.78 + 0.44 * d.reach) * flow;
          const middle = lead - long;
          const lean = d.drift * 0.16 * knobs.scatter;
          const [x, y] = at(middle, d.off * headRadius * 1.6 * knobs.scatter + middle * lean);
          const tip = tilt + lean;
          g.moveTo(x + Math.cos(tip) * long, y + Math.sin(tip) * long);
          g.ellipse(x, y, long, thick, tip, 0, TAU);
        });
        g.fill();
      });
    }

    // 불티. 머리 언저리에서 짧고 밝은 줄기가 튄다. 한 바퀴에 두 번 흐른다
    for (const kind of ["yellow", "pink"]) {
      const mine = embers.filter((e) => e.kind === kind);
      if (!mine.length) continue;
      glowWith(
        kind,
        every(
          mine.map((e) => {
            const { p, fade } = flowing(e.phase, held, 2);
            const u0 = -L * 0.06 + p * L * 0.4;
            const len = width * e.len;
            return poly(facet(at, u0, u0 + len, e.off * width, (s) => e.half * fade * Math.pow(Math.sin(Math.PI * s), 0.7), { steps: 5 }));
          })
        )
      );
    }

    // 꼬리별. 받은 분해 장면의 Stars 이미터다(0:18~0:21). 별은 머리 원의 가장자리에서 태어나 꼬리 쪽으로
    // 날아가며 작아진다. 허리가 가는 네 갈래 반짝이이고, 앞뒤 팔이 옆 팔보다 조금 길다. 뒤로는 머리 쪽을
    // 향해 머리카락처럼 가늘어지는 꼬리를 끈다 — 빠를수록 길어, 끌림(DRAG)으로 느려지면 짧아진다. 꼬리는
    // 머리 원점을 넘어 앞으로 나오지 않는다. 별마다 노랑 · 분홍 · 푸름 · 흰빛 가운데 하나로 빛난다. 색끼리
    // 한 길에 모아 찍는다. 머리는 그 위에 찍힌다
    const starReach = L * knobs.starVelocity * starFlow.lifetime;
    if (starFlow.list.length) {
      const byKind = { yellow: [], pink: [], cyan: [], white: [] };
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
        glowWith(kind, (g) => {
          g.beginPath();
          for (const add of list) add(g);
          g.fill();
        });
      }
    }

    // 임팩트 프레임. 머리 원점에서 둥근 흰빛이 터진다. 머리가 뿜어 내는 것이 아니라 두 프레임 동안
    // 번쩍하는 빛이라, 앞으로도 터져야 무언가에 부딪힌 것처럼 보인다
    if (burst > 0) {
      glowWith("white", (g) => {
        g.beginPath();
        g.arc(hx, hy, width * 0.055 * burst, 0, TAU);
        g.fill();
      });
    }

    // 유성의 머리. 분해 장면의 Spike_Main이다(0:03~0:08, 완성본 0:34~0:36). 머리 원점에 흰 동그라미 심이
    // 붙박이로 빛나고, 심을 사북으로 노란 칼날이 부채꼴로 꼬리 쪽에 펼쳐진다. 부채는 한 바퀴에 FLIP번 새로
    // 짓는다 — 텍스처를 거의 매 프레임 무작위로 고르는 분해 장면과 같다. BEAT와 따로 논다. 장마다 날의 수는
    // 그대로(POINTS)이고 펼친 폭과 길이와 크기가 달라지며(VARY), 심은 자리가 붙박이고 크기만 부채를 따라
    // 바뀐다. 빛깔은 깜빡이지 않는다 — 부채는 늘 노랗고 심은 늘 희다. 임팩트 프레임에만 부채가 부풀어 희고
    // 심이 노랗다. 둘레로 노랗게 번진다(GLOW).
    //
    // 장의 부채는 제 난수로 짓는다. 장 번호로 씨앗을 섞으므로 같은 장은 늘 같은 부채이고, t=1은 t=0과
    // 같은 장이다. 자리를 뽑는 난수는 건드리지 않아 다른 층은 그대로다
    const flip = Math.max(1, Math.round(knobs.spikeFlip));
    const leaf = Math.floor(t * flip) % flip; // 부채의 몇 번째 장인가. t=1은 t=0과 같은 장이다
    const spikeRng = makeRng((seed ^ 0x51f15e5d ^ Math.imul(leaf + 1, 0x9e3779b1)) >>> 0);
    const base = width * 0.1 * knobs.spikeSize * (1 + 0.35 * burst); // 창끝 크기(SIZE). 임팩트 프레임에는 부푼다
    const spikeKind = burst > 0 ? "white" : "yellow";
    const heartKind = burst > 0 ? "yellow" : "white";
    // 심. 머리의 코어라 머리 원점에 붙박이고, 크기는 장마다 제 난수로 바뀐다(창끝 크기의 0.16~0.26배)
    const heartR = base * (0.16 + 0.1 * spikeRng.next());
    // 부채. 가장 작을 때도 가장 커진 심을 감싸고 테를 남긴다 — 윤곽이 심 가운데에서 가장 큰 심의 1/0.85배
    // 밖에 있다. 부채는 이 바닥만 지키고, 장마다 그보다 크게 통째로 스케일한다(VARY). 심과 따로 논다. 장마다
    // 심을 축으로 조금 돈다(±3°) — 텍스처를 바꿔 끼울 때마다 조금씩 어긋나는 것과 같다. 등 쪽은 축의 -v다
    const turnBy = (spikeRng.next() - 0.5) * 0.12 * knobs.spikeVary * 2;
    const shape = spikeShape(spikeRng, Math.round(knobs.spikePoints), knobs.spikeStretch);
    const grow = ((base * 0.26) / 0.85 / edgeDistance(shape, 0, 0)) * (1 + knobs.spikeVary * 1.2 * spikeRng.next());
    const cosT = Math.cos(turnBy) * grow;
    const sinT = Math.sin(turnBy) * grow;
    const outline = shape.map(([x, y]) => at(x * cosT - y * sinT, -(x * sinT + y * cosT)));

    // 번짐. 부채의 흐린 무늬를 한 겹 깐다. 장마다 꼴이 달라 장마다 짓고, 같은 장이면 쥐고 있다
    if (knobs.spikeGlow > 0) {
      const key = `spike|${seed}|${leaf}|${burst > 0}|${width}|${height}|${knobs.angle}|${knobs.length}|${knobs.spikeSize}|${knobs.spikePoints}|${knobs.spikeStretch}|${knobs.spikeVary}`;
      const halo = keepSpikeGlow(key, () => keepGlow(glowMask(outline, width * 0.025)));
      glowWith(spikeKind, (g) => {
        g.globalAlpha *= knobs.spikeGlow;
        g.imageSmoothingQuality = "low";
        g.drawImage(halo.canvas, 1, 1, halo.cols, halo.rows, halo.x, halo.y, halo.width, halo.height);
      });
    }
    // 몸통. 심 자리는 오려 내고 심은 따로 찍는다. 잉크를 얹고 파내는 방식이라 겹쳐 찍으면 심의 빛깔이
    // 몸통을 따라 달라진다 — 흰 부채 위의 노란 심은 노란 통이 없는 배색에서 종이에 묻힌다
    glowWith(spikeKind, (g) => {
      g.beginPath();
      g.rect(-width, -height, width * 3, height * 3);
      shapes.circleSubpath(g, hx, hy, heartR);
      g.clip("evenodd");
      poly(outline)(g);
    });
    glowWith(heartKind, (g) => {
      g.beginPath();
      shapes.circleSubpath(g, hx, hy, heartR);
      g.fill();
    });

    // 이 장의 뼈대. 인쇄기가 안내선(guides)에 넘긴다. 안내선이 판을 다시 계산하지 않고 이 장이 쓴
    // 값을 그대로 본다. span은 안내선의 축이 머리 앞에서 꼬리 끝 너머까지 긋는 길이다
    const span = L * 1.3;
    return { at, L, hx, hy, coreWidth, beat, held, clock, flashFrame, burst, span, dots: { count: dots.length, lifetime: dotsFlow.lifetime, end: headRadius * 0.2 + 2 * width * 0.08 * knobs.size * dotPeak + dotReach }, stars: { count: starFlow.list.length, lifetime: starFlow.lifetime, end: headRadius * 0.8 + starReach } };
  },

  // 안내선. 인쇄된 픽셀은 건드리지 않고 화면 위에 겹쳐 그린다 — 축이 어디를 지나는지, 머리에 딸린
  // 것이 어느 점을 붙박이로 늘고 주는지, 광선이 어디까지 뻗는지를 눈으로 잡기 위한 것이다
  guides(page, sketch) {
    if (!sketch) return [];
    const { at, L, hx, hy, coreWidth, beat, held, clock, flashFrame, burst, span, dots, stars } = sketch;
    const marks = [];

    // 축. 머리 앞에서 꼬리 끝 너머까지
    marks.push({ kind: "line", from: at(-L * 0.15, 0), to: at(-L * 0.15 + span, 0), dash: true });

    // 주 광선의 윤곽. 납작한 면이 어디까지 부푸는지
    marks.push({ kind: "path", points: facet(at, 0, L, 0, (s) => coreWidth * taper(s), { steps: 9 }), dash: true });

    // 머리 원점. 광선이 여기서 시작하고, 머리에 딸린 것들의 피벗도 여기다
    marks.push({ kind: "dot", at: [hx, hy], r: 5, ring: 22, label: "PIVOT · HEAD 0", hot: true });

    // 도트의 피벗(가장 컸을 때의 앞 끝)이 사는 동안 가는 끝. 구슬 줄이 여기쯤에서 원이 되어 사라진다
    if (dots.count) marks.push({ kind: "dot", at: at(dots.end, 0), r: 3, label: "DOTS END" });

    // 꼬리별이 사는 동안 가는 끝(가운데 빠르기의 별)
    if (stars.count) marks.push({ kind: "dot", at: at(stars.end, 0), r: 3, label: "STARS END", lift: -18 });

    // 박자. 지금 몇 번째 장인지, 임팩트 프레임이 언제 서는지. 도트가 실제로 뿜는 빈도와 수명 — 루프가
    // 닫히도록 맞춘 값이라 손잡이와 조금 다를 수 있다. 그림을 가리지 않게 모서리에 적는다
    const drawn = Math.round(held * beat);
    const rate = (name, flow) => (flow.count ? ` · ${name} ${Math.round(flow.count / flow.lifetime)}/S × ${flow.lifetime.toFixed(2)}S = ${flow.count}` : "");
    const flows = rate("DOTS", dots) + rate("STARS", stars);
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `BEAT ${drawn}/${beat} · F${clock} · FLASH @${flashFrame}${burst > 0 ? " BURST" : ""}${flows}`,
      hot: burst > 0
    });
    return marks;
  }
};
