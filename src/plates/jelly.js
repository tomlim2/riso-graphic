// 어두운 물을 밝은 것들이 올라간다.
//
// 흰 잉크가 없으므로 빛나는 것은 전부 파낸 자리다. 물을 깔고, 종 모양으로 파내고, 그 안에만
// 옅은 통을 얹는다. 물 위에 밝은 잉크를 칠하는 방법은 없다 — 곱하기는 언제나 더 어둡게만
// 만든다.
//
// 오르는 것처럼 보이려면 해파리가 아니라 물이 움직여야 한다. 해파리가 실제로 올라가면 한
// 바퀴 끝에서 제자리로 돌아오느라 튄다. 티끌을 아래로 흘려 보내면 같은 말을 하면서 이어진다.
//
// 여러 마리는 깊이로 벌린다. 멀수록 작고 흐리다. 먼 것부터 찍고 가까운 것이 그 위를
// 덮으므로, 가까운 놈의 녹아웃이 먼 놈을 지워 가림이 저절로 생긴다.
//
// 물은 한 빛깔이 아니다. 옅은 두 통이 큰 얼룩으로 번져, 물 위에서 초록이나 보라 같은 제3의
// 색이 된다. 물은 판 가득 찍는다. 둥근 틀은 현미경과 망원경 판들의 것이다.
//
// 해파리는 물에서 조금 넓게 파낸다. 판이 어긋나지 않아도 둘레에 가는 종이 틈이 서서, 같은 통으로
// 찍은 물과 몸이 갈라져 보인다. 인쇄에서 틈이 안 보이게 두 판을 살짝 겹치는 트랩의 거꾸로다.
// 종은 라인리스다 — 둘레에 테를 긋지 않고, 틈과 옅은 면만으로 가장자리가 선다. 촉수는 뿌리에서
// 굵고 끝으로 가늘어지며, 절반은 속에 흰 줄이 파여 있다.
//
// 얼룩은 롤이 정하고 시간과 무관하다. 무리를 짜는 난수와 티끌을 뿌리는 난수의 흐름은 건드리지
// 않는다 — 얼룩은 따로 굴린다.

import { makeRng, makeNoise2, fieldSeed } from "../rng.js";
import { keeper } from "../keep.js";
import * as shapes from "../shapes.js";
import { soften, glowMask, layGlow } from "../blur.js";

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

// 지붕의 생김새. 참고한 해파리 사진처럼 폭보다 조금 높고, 어깨가 둥글게 떨어져 옆이 곧게 내려온다.
// 반원 대신 초타원(지수 2/SHOULDER)으로 짚는다. 종의 크기는 BELL에서 조금 덜어 머리를 작게 둔다
const SHOULDER = 0.8;
const TALL = 1.08; // 높이와 반폭의 비
const HEAD = 0.8; // BELL에 곱하는 머리의 크기

// 초타원 지붕에서 높이 h(밑 0, 꼭대기 1)의 반폭. 반폭에 대한 비율이다
function domeWidth(h) {
  return (1 - Math.min(1, Math.max(0, h)) ** (2 / SHOULDER)) ** (SHOULDER / 2);
}

// 속에 비치는 버섯 모양의 밑단. 가리비가 얕고 띠가 없다
const CAP_RIM = { lift: 0.18, lean: 1, lobes: 6, depth: 0.08, sizes: new Array(16).fill(1), band: 0 };

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
    const across = Math.cos(angle);
    const up = Math.max(0, Math.sin(angle));
    points.push([cx + Math.sign(across) * Math.abs(across) ** SHOULDER * rx * r, cy - up ** SHOULDER * ry * r]);
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

// 수염과 다리의 자리와 흐름. 참고한 해파리 사진처럼 수염(촉수)은 밑단 가장자리에서 길게 늘어져
// 끝으로 갈수록 벌어지고, 다리(구완)는 종 속 가운데에서 서로 꼬이듯 엇갈리며 길게 내려온다.
const TENTACLE_REACH = 1.5; // 수염 길이의 배율. TRAIL에 곱한다
const LEG_WOBBLE = 0.45; // 다리가 옆으로 흔들리는 폭. 수염의 WOBBLE과 따로 둔다
const LEG_BELL = 0.13; // 다리 굵기의 기준이 되는 BELL. 이 BELL의 가까운 종에서 GIRTH가 제 굵기다
const MOST_TENTACLES = 20; // TENTACLES의 끝값
const MOST_ARMS = 6; // ARMS의 끝값
// FIELD를 씨앗에 섞는 곱수. 다른 판들(0x85ebca6b)과 다르지만, 저장된 주소가 같은 무리를 찍어야 하므로
// 그대로 둔다
const FIELD_MIX = 0x9e3779b9;

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
const stains = keeper(6);

function stainsFor(seed, amount, feather) {
  return stains(`${seed >>> 0}:${amount}:${feather}`, () => bleed(seed, amount, feather));
}

function bleed(seed, amount, feather) {
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

  return { wash, body };
}

function soak(sep, canvas, width, height) {
  sep.draw((g) => {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "low";
    g.drawImage(canvas, 0, 0, width, height);
  });
}

// 종 둘레의 빛. 종을 흐린 무늬(src/blur.js)만큼 물에서 옅게 파낸다. 종에서 멀어질수록 고르게
// 옅어져 계단이 없다. 크기를 달리한 종을 몇 겹 파내면 겹마다 가장자리가 서서, 종 위로 흰 윤곽이
// 되풀이되는 메아리가 된다. 번짐 폭은 종마다 정해져 뛰는 동안 바뀌지 않는다.
const GLOW_REACH = 0.18; // 번짐 폭. 종 크기에 대한 비율이다
const GLOW_TONE = 0.9; // 가장 진한 자리에서 물을 얼마나 파내는가

export const jelly = {
  id: "jelly",
  name: "JELLY",
  about: "어두운 물을 올라가는 빛들. 밝은 것은 전부 파낸 자리다",

  // 손잡이는 몸의 부분별로 묶는다. 무리, 종, 수염(밑단 가장자리의 가는 촉수), 다리(종 가운데의
  // 굵은 구완), 물. 수염과 다리는 길이와 흔들림을 따로 받는다
  knobs: [
    { group: "SWARM", key: "count", label: "COUNT", min: 1, max: 9, step: 1, value: 5 },
    // 무리만 따로 굴리는 씨앗. 종이의 롤은 그대로 두고 배치와 크기만 바꾼다
    { group: "SWARM", key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "밭의 씨앗. 종이의 롤은 그대로 두고 무리만 다시 뽑는다" },
    { group: "SWARM", key: "depth", label: "DEPTH", min: 0, max: 0.8, step: 0.05, value: 0.55 },
    { group: "SWARM", key: "drift", label: "DRIFT", min: 0, max: 0.06, step: 0.005, value: 0.012 },
    { group: "BELL", key: "bell", label: "BELL", min: 0.05, max: 0.26, step: 0.01, value: 0.13 },
    { group: "BELL", key: "pulse", label: "PULSE", min: 0, max: 0.35, step: 0.01, value: 0.06 },
    // 한 바퀴에 몇 번 뛰는가. 정수여야 한 바퀴 끝에서 제자리로 돌아온다
    { group: "BELL", key: "throb", label: "THROB", min: 1, max: 4, step: 1, value: 2 },
    { group: "BELL", key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.1, hint: "종 윗선이 보름달처럼 손으로 오린 듯 흔들리는 정도. 0이면 반듯한 반원이다" },
    { group: "BELL", key: "hem", label: "HEM", min: 0, max: 1, step: 0.05, value: 0.6, hint: "종 밑단 띠의 진하기. 가리비를 따라 종과 같은 통으로 한 번 더 찍는다. 0이면 띠 없이 가리비 모양만 남는다" },
    { group: "BELL", key: "inner", label: "INNER", min: 0, max: 1, step: 0.05, value: 0.6, hint: "종 속이 비치는 정도. 꼭대기 아래의 옅은 버섯 모양과 기둥, 꼭대기로 모이는 세로 결. 0이면 속이 비치지 않는다" },
    { group: "WHISKERS", key: "tentacles", label: "TENTACLES", min: 0, max: 20, step: 1, value: 9, hint: "수염의 수. 밑단 가장자리에서 늘어지는 가는 촉수다" },
    { group: "WHISKERS", key: "trail", label: "TRAIL", min: 0.1, max: 0.7, step: 0.01, value: 0.3, hint: "수염의 길이. 판 높이에 대한 비율이다" },
    { group: "WHISKERS", key: "wobble", label: "WOBBLE", min: 0, max: 1.6, step: 0.05, value: 0.45, hint: "수염이 옆으로 흔들리는 폭" },
    { group: "WHISKERS", key: "sway", label: "SWAY", min: 0, max: 1, step: 0.05, value: 0.35, hint: "수염이 흐느적거리는 몫. 낮을수록 제 자세를 지킨 채 천천히 흔들리고, 1이면 파동이 수염을 통째로 훑는다" },
    { group: "LEGS", key: "arms", label: "ARMS", min: 0, max: 6, step: 1, value: 5, hint: "다리의 수. 종 가운데에서 늘어지는 굵은 구완이다" },
    { group: "LEGS", key: "reach", label: "REACH", min: 1, max: 10, step: 0.1, value: 4.3, hint: "다리의 길이. 종 크기의 몇 배인가 — BELL을 키우면 다리도 길어진다" },
    { group: "LEGS", key: "girth", label: "GIRTH", min: 0.5, max: 3, step: 0.1, value: 1.6, hint: "다리의 굵기. 종 크기를 따라 함께 굵어진다" },
    { group: "LEGS", key: "swing", label: "SWING", min: 0, max: 1, step: 0.05, value: 0.35, hint: "다리가 흐느적거리는 몫. 낮을수록 제 자세를 지킨 채 천천히 흔들리고, 1이면 파동이 다리를 통째로 훑는다" },
    { group: "WATER", key: "deep", label: "DEEP", min: 0.2, max: 1, step: 0.05, value: 0.85 },
    { group: "WATER", key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.8, hint: "물에 번진 얼룩. 옅은 두 통이 큰 얼룩으로 겹쳐 제3의 색이 된다" },
    { group: "WATER", key: "feather", label: "FEATHER", min: 0, max: 1, step: 0.05, value: 0.6, hint: "얼룩 가장자리가 번지는 폭. 0이면 오려 낸 듯 또렷하다" },
    { group: "WATER", key: "gap", label: "GAP", min: 0, max: 6, step: 0.5, value: 0.5, hint: "해파리 둘레의 흰 틈. 물을 해파리보다 이만큼 넓게 파낸다" },
    { group: "WATER", key: "motes", label: "MOTES", min: 0, max: 120, step: 5, value: 45 }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { count, pulse, throb, drift, tentacles, arms, motes, deep, wobble, stain, feather, gap, sway, swing, girth } = knobs;

    const turn = t * Math.PI * 2;

    // 판을 파낼 때는 실제로 도는 분판마다 한 번씩. 통이 둘이면 body와 wash가 같은 분판이라,
    // 역할 이름으로 돌면 같은 판을 두 번 파낸다.
    const inks = S.drums.map((drum) => drum.separation);

    // 무리는 제 씨앗으로 굴린다. 종이의 롤에 밭의 씨앗을 섞으므로, NEW ROLL은 여전히 전부를
    // 바꾸고 FIELD는 그리는 잉크와 종이결을 건드리지 않은 채 배치만 다시 뽑는다.
    const layout = makeRng(fieldSeed(page, 0, FIELD_MIX));
    // 종의 흔들림은 또 따로 굴린다. 무리의 흐름에 끼우면 흔들림을 더한 것만으로 배치가 바뀐다
    const hands = makeRng(fieldSeed(page, 0x2b992ddf, FIELD_MIX));
    // 밑단의 생김새도 따로. 마리마다 같은 수만큼 뽑아, 마리 수를 바꿔도 앞의 놈들은 그대로다
    const rims = makeRng(fieldSeed(page, 0x5be0cd19, FIELD_MIX));
    // 촉수가 벌어지는 정도와 구완의 꼬임도 따로. 역시 마리마다 같은 수를 뽑는다
    const sways = makeRng(fieldSeed(page, 0x1f83d9ab, FIELD_MIX));
    // 다리 하나하나의 값도 따로. 촉수와 구완은 손잡이의 끝값만큼 늘 뽑고 앞에서부터 쓴다. 무리의
    // 흐름에 끼워 두면 TENTACLES나 ARMS를 바꾸는 것만으로 뒤에 놓이는 놈들의 자리가 밀린다
    const legs = makeRng(fieldSeed(page, 0xa54ff53a, FIELD_MIX));

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
      const size = width * knobs.bell * HEAD * (1 - far * knobs.depth) * layout.float(0.88, 1.12);

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
        splay: sways.float(0.2, 0.45),
        twists: Array.from({ length: MOST_ARMS }, () => ({ turns: sways.float(1.6, 3.2), phase: sways.float(0, Math.PI * 2) })),
        strands: [],
        ribbons: []
      };

      const strandPool = Array.from({ length: MOST_TENTACLES }, () => ({
        length: legs.float(0.45, 1.3),
        amp: legs.float(0.35, 0.95),
        phase: legs.float(0, Math.PI * 2),
        curl: legs.float(3.2, 6.4),
        lean: legs.float(-0.5, 0.5),
        weight: legs.float(1.6, 3)
      }));
      const armPool = Array.from({ length: MOST_ARMS }, () => ({
        length: legs.float(0.3, 0.55),
        amp: legs.float(0.3, 0.7),
        phase: legs.float(0, Math.PI * 2)
      }));

      const strandCount = Math.round(tentacles * (1 - far * 0.35));
      spec.strands = strandPool.slice(0, strandCount).map((drawn, k) => ({
        at: strandCount === 1 ? 0.5 : k / (strandCount - 1),
        length: height * knobs.trail * drawn.length * (1 - far * 0.4),
        amp: wobble * drawn.amp,
        phase: drawn.phase,
        curl: drawn.curl,
        lean: drawn.lean,
        weight: drawn.weight * (1 - far * 0.45)
      }));

      // 구완은 멀어도 하나만 덜어 낸다. ARMS 5면 가까운 놈은 다섯, 먼 놈은 넷이다
      const ribbonCount = Math.round(arms * (1 - far * 0.2));
      // 다리는 종을 따라 자란다. 길이는 종 크기에 REACH를 곱하고(0.7배에서 1.3배로 흩뜨린다), 굵기는
      // 기본 BELL의 가까운 종에 견준 크기만큼 굵어진다. 먼 놈은 종이 작으니 다리도 짧고 가늘다
      spec.grow = size / (width * LEG_BELL * HEAD);
      spec.ribbons = armPool.slice(0, ribbonCount).map((drawn, k) => ({
        offset: ribbonCount === 1 ? 0 : (k / (ribbonCount - 1) - 0.5) * 1.1,
        length: size * knobs.reach * (drawn.length / 0.425),
        amp: LEG_WOBBLE * drawn.amp,
        phase: drawn.phase,
        weight: (7 - 3 * (k % 2)) * spec.grow
      }));

      swarm.push(spec);
    }

    // 먼 것부터. 가까운 놈의 녹아웃이 먼 놈을 지우므로 가림이 저절로 생긴다
    swarm.sort((a, b) => b.far - a.far);

    for (const one of swarm) {
      const beat = Math.sin(turn * throb + one.phase);
      const cx = one.x;
      const cy = one.y + Math.sin(turn + one.phase) * height * drift;
      const rx = one.size * (1 - pulse * beat);
      const ry = one.size * TALL * (1 + pulse * beat * 0.9);

      const dome = bell(cx, cy, rx, ry, { hand: one.hand, rim: one.rim });
      const show = one.show;

      // 빛은 한 번에 파내지 않는다. 종에서 멀어질수록 옅게, 계단 없이 번지게 판다. 한 번에 다
      // 파내면 오려 붙인 스티커가 된다. 종 자체를 파내는 마지막 겹은 촉수 뒤로 미룬다 — 종이
      // 제 촉수의 뿌리를 덮어야 한다.
      const glow = glowMask(dome, one.size * GLOW_REACH);
      for (const ink of inks) ink.knockout((sep) => sep.draw((g) => layGlow(g, glow, GLOW_TONE * show)));

      // 물에서 띠를 넓게 파낸다. 틈은 뿌리에서 넓고 끝으로 가며 닫힌다
      const clear = (points, width) => {
        if (gap <= 0) return;
        const band = shapes.ribbon(points, width);
        for (const ink of inks) ink.knockout((sep) => sep.shape(band, { tone: show }));
      };

      // 수염(촉수). 밑단 가장자리에서 길게 늘어진다. 긴 S자로 흔들리고, 끝으로 갈수록 바깥으로 벌어져 서로
      // 엇갈린다. 뿌리에서 굵고 끝으로 가며 가늘어지고, 비틀리듯 굵기가 오르내린다. 절반은 속에 흰
      // 줄을 판다. 뽑아 둔 말림과 기울기는 긴 몸에 맞게 줄여 쓴다.
      //
      // 흔들림은 두 겹이다. 멈춰 있는 S자 자세(pose)와, 한 바퀴에 한 번 아래로 흐르는 파동(flow).
      // 루프가 2초라 파동을 더 느리게 돌릴 수는 없으니, 파동의 몫(SWAY)을 줄여 움직이는 폭을
      // 덜어 낸다. 그러면 제 자세를 지킨 채 천천히 흐느적거린다. t=0에서는 두 겹이 같아서
      // SWAY와 상관없이 첫 장의 모양이 같다. 다리(구완)도 같은 식으로 흔들리되, 몫은 SWING이 정한다.
      //
      // 촉수는 물과 같은 통이라 틈이 없으면 물에 묻힌다. 그렇다고 틈을 종만큼 벌리면 흰 끈이
      // 되고 만다. 틈은 종의 절반으로 좁히고, 몸은 물보다 진하게 꽉 채워 찍는다.
      for (const strand of one.strands) {
        const side = strand.at * 2 - 1;
        const x0 = cx + side * rx * 0.94;
        const y0 = cy - rimLift(strand.at, one.rim, ry);
        const length = strand.length * TENTACLE_REACH;
        const points = [];
        for (let s = 0; s <= 40; s += 1) {
          const along = s / 40;
          const pose = Math.sin(-along * strand.curl * 0.7 + strand.phase + one.phase);
          const flow = Math.sin(turn - along * strand.curl * 0.7 + strand.phase + one.phase);
          const wave = ((1 - sway) * pose + sway * flow) * rx * strand.amp * Math.pow(along, 1.2);
          const sweep = (strand.lean * 0.5 + side * one.splay) * rx * along * along;
          points.push([x0 + wave + sweep, y0 + along * length]);
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

      // 다리(구완). 종 속 가운데에서 내려오는 두꺼운 주름. 종 속에서 시작하므로 뿌리는 종에 가려
      // 밑단 아래로 흘러나온 것처럼 보인다. 가운데로 모여 서로 꼬이듯 엇갈리며 길게 내려오고,
      // 끝으로 가며 조금 좁아진다. 길이는 REACH, 굵기는 GIRTH, 흐느적이는 몫은 SWING이다
      one.ribbons.forEach((ribbon, k) => {
        const twist = one.twists[k];
        const top = cy - ry * 0.35;
        const length = ribbon.length;
        const points = [];
        for (let s = 0; s <= 36; s += 1) {
          const along = s / 36;
          const pose = Math.sin(-along * 2.8 + ribbon.phase + one.phase);
          const flow = Math.sin(turn - along * 2.8 + ribbon.phase + one.phase);
          const lilt = ((1 - swing) * pose + swing * flow) * rx * ribbon.amp * Math.pow(along, 1.3);
          const cross = Math.cos(along * twist.turns + twist.phase) * ribbon.offset * rx * 0.35;
          points.push([cx + cross + lilt, top + along * length]);
        }
        const thick = (u) => ribbon.weight * 1.5 * girth * (1 - 0.5 * u);
        clear(points, (u) => thick(u) + 2 * gap * (1 - 0.5 * u));
        S.body.shape(shapes.ribbon(points, thick), { tone: 0.55 * show });
        S.key.line(points, { w: 2 * one.grow, tone: 0.5 * show });
      });

      // 종. 둘레를 물에서 조금 넓게 파내 흰 틈을 두고, 그 안에 옅은 통만 얹는다. 테는 긋지 않는다
      const hollow = gap > 0 ? shapes.grow(dome, gap) : dome;
      for (const ink of inks) ink.knockout((sep) => sep.shape(hollow, { tone: show }));

      // 종의 살. 사진처럼 꼭대기가 옅고 밑단으로 갈수록 진하다
      S.body.draw((g) => {
        const ramp = g.createLinearGradient(0, cy - ry, 0, cy);
        ramp.addColorStop(0, `rgba(0, 0, 0, ${0.18 * show})`);
        ramp.addColorStop(1, `rgba(0, 0, 0, ${0.46 * show})`);
        g.fillStyle = ramp;
        shapes.splinePath(g, dome, true);
        g.fill();
      });

      // 속. 꼭대기 아래에 옅은 버섯 모양과 그 밑의 기둥이 비치고, 세로 결이 꼭대기로 모인다.
      // 모두 종의 살을 옅게 파낸 자리다. 결은 지붕의 경선이라 높이마다 지붕의 폭을 따라 좁아진다.
      // 결의 자리는 마리마다 조금씩 돈다 — 새 난수 없이 마리의 위상에서 얻는다. 밑단 아래로
      // 삐지지 않게 종 모양으로 오린다
      if (knobs.inner > 0) {
        const inner = knobs.inner * show;
        const capBase = cy - ry * 0.42;
        const cap = bell(cx, capBase, rx * 0.34, ry * 0.3, { rim: CAP_RIM });
        const stalk = shapes.ribbon([[cx, capBase - ry * 0.05], [cx, cy]], (u) => rx * (0.16 - 0.07 * u));
        const ribs = [];
        const turnOf = one.phase / (Math.PI * 2);
        for (let k = 0; k < 7; k += 1) {
          const at = ((k + turnOf) / 7) * 2 - 1;
          if (Math.abs(at) > 0.85) continue;
          const left = [];
          const right = [];
          for (let j = 0; j <= 12; j += 1) {
            const h = 0.02 + (0.96 * j) / 12;
            const half = domeWidth(h) * rx;
            left.push([cx + (at - 0.03) * half, cy - h * ry]);
            right.push([cx + (at + 0.03) * half, cy - h * ry]);
          }
          ribs.push([...left, ...right.reverse()]);
        }
        S.body.knockout((sep) =>
          sep.draw((g) => {
            shapes.splinePath(g, dome, true);
            g.clip();
            g.globalAlpha = Math.min(1, 0.35 * inner);
            for (const rib of ribs) {
              shapes.splinePath(g, rib, true);
              g.fill();
            }
            g.globalAlpha = Math.min(1, 0.45 * inner);
            shapes.splinePath(g, stalk, true);
            g.fill();
            g.globalAlpha = Math.min(1, 0.8 * inner);
            shapes.splinePath(g, cap, true);
            g.fill();
          })
        );
      }

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
