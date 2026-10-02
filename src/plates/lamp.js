// 가로등. 밤길에 램프형 가로등 하나가 서서 빛난다.
//
// 가로등은 그리지 않는다. 옛 거리 가로등의 치수로 세우고, 빛은 빛이 퍼지는 법칙대로 밤을 파낸다.
//
//   기둥   주철 가로등 기둥. 땅에서 4미터 올라가 굵기 76밀리의 받침으로 랜턴을 받친다. 밑동은 넓은 주물
//          받침대이고, 랜턴 밑에는 사다리를 걸치는 가로대가 걸린다
//   랜턴   네모난 유리 등롱. 높이 833밀리, 가장 넓은 자리 440밀리(DW Windsor의 Windsor Street)다. 위가 넓고
//          아래로 좁아지며, 지붕을 이고 꼭대기에 꼭지를 단다. 유리 안에 전구 하나가 빛난다
//   번짐   밝은 빛을 보면 둘레가 뿌옇게 밝다. 빛이 눈 속에서 흩어져 둘레에 베일을 씌우기 때문이다. 베일의
//          밝기는 빛에서 떨어진 각의 제곱에 반비례한다(Stiles–Holladay, L = 10E/θ²). 번짐은 그 베일이다(GLOW)
//   안개   안개 알갱이가 빛을 흩뜨려 랜턴 둘레의 공기가 넓게 밝다. 시선이 빛 곁을 b 떨어져 지나며 모으는 산란광은
//          1/b를 따라 번짐보다 천천히 옅어지고, 안개가 빛을 먹는 만큼 e^(−βb)로 더 준다(FOG). 흐린 빛이라 노랑을
//          덜 얹어 뿌옇다
//   웅덩이 가로등 밑 땅의 밝기는 코사인 세제곱 법칙을 따른다 — 높이 h에 걸린 빛에서 옆으로 r 떨어진 땅은
//          발밑의 (1 + r²/h²)^(-3/2)배로 밝다(POOL). 눈높이 1.6미터에서 10미터 앞의 가로등을 보므로, 둥근
//          빛웅덩이가 원근을 따라 납작하게 눕는다
//   찍기   흰 잉크가 없으니 빛은 찍는 것이 아니라 밤을 파낸 종이다. 밝기만큼 밤의 통을 파내고 그 자리에 가장
//          노란 통을 얹는다 — 망점이 빛의 계조를 그린다. 밝기가 넘치는 랜턴 둘레는 노랑마저 걷혀 하얗게 나고,
//          그 둘레가 노랗게 물든다. 기둥과 랜턴의 틀은 모든 통을 겹친 실루엣이라 판에서 가장 짙다. 유리는 아주
//          옅은 노랑, 전구는 종이다. 선은 긋지 않는다
//
// 장면은 하나로 짜 두었다. 롤은 인쇄기가 바꾸는 것(망점의 결, 어긋남)만 바꾼다. 빛은 흔들리지 않으므로
// 판은 가만히 있고, 빛의 무늬는 손잡이가 같으면 다시 짓지 않는다.
//
// 참고: Windsor Street 랜턴의 치수(DW Windsor, 833 × 440밀리, 76밀리 받침), 불능 눈부심의 베일
// 휘도(Stiles–Holladay, CIE), 점광원 밑 수평면 조도의 코사인 세제곱 법칙.

import { makeRng, makeNoise } from "../rng.js";
import * as shapes from "../shapes.js";
import { nightAndLight } from "../drums.js";
import { carve, stain } from "../night.js";
import { keeper } from "../keep.js";
import { stainsFor, soak } from "../stains.js";

// 장면을 짜는 난수. 롤과 상관없이 늘 같다
const ROLL = 0x1a4b5c7d;

// 장면(미터). 눈높이 1.6미터에서 10미터 앞의 가로등을 본다. 가로등은 판 높이의 78%를 차지한다
const EYE = 1.6;
const AWAY = 10;
const TALL = 4.83;
const BULB = 4.37; // 전구의 높이. 빛이 여기서 나온다
const GLASS_HALF = 0.18; // 전구 높이에서 유리의 반폭. 번짐의 기준 각이다

// 기둥의 옆모습. [높이, 반폭](미터). 받침대, 기둥, 목, 랜턴의 76밀리 받침과 그 위로 벌어지는 랜턴 밑동
const COLUMN = [
  [0, 0.16], [0.07, 0.16], [0.12, 0.13], [0.16, 0.12], [0.84, 0.105], [0.88, 0.12], [0.93, 0.12], [1, 0.07],
  [3.86, 0.045], [3.9, 0.06], [3.96, 0.06], [4, 0.038], [4.1, 0.07], [4.19, 0.155]
];
// 유리. 밑이 4.19미터, 위가 4.61미터이고 위로 갈수록 넓다
const GLASS_LOW = 4.19;
const GLASS_TOP = 4.61;
const glassHalf = (h) => 0.15 + ((h - GLASS_LOW) / (GLASS_TOP - GLASS_LOW)) * 0.06;

// 빛의 짙기. 밝기 L에서 밤을 파내는 몫은 min(1, 1.6L), 얹는 노랑은 TINT·min(L, 1/L)이다 — 밝기가 1을 넘는
// 자리는 노랑도 걷혀 하얗게 난다. 센 빛은 한가운데가 하얗고 둘레만 물든다. 유리는 GLASS만큼만 노랗다
const TINT = 0.85;
const GLASS = 0.2;
const HAZE_TINT = 0.4;
const STEP = 2; // 빛의 무늬를 짓는 격자 한 칸(판의 픽셀)

const lights = keeper(4);

// 빛의 무늬. 판을 격자로 나눠 칸마다 번짐과 웅덩이의 밝기를 더하고(빛은 더해진다), 파낼 몫과 얹을 노랑을
// 알파로 담는다.
// 번짐은 전구에서 떨어진 각 θ로, 웅덩이는 그 칸이 비추는 땅의 자리로 잰다 — 판의 한 줄 y는 눈에서
// f·EYE/(y − 지평선)미터 떨어진 땅이다
function lightFor(width, height, scene, glow, pool, fog) {
  return lights(`${width}|${height}|${glow}|${pool}|${fog}`, () => {
    const beta = 0.4 * fog; // 안개의 산란 계수(1/미터). FOG 1이면 가시거리가 10미터쯤이다(Koschmieder, V = 3.912/β)
    const { lx, ly, horizon, s } = scene;
    const f = s * AWAY;
    const lampX = (lx - width / 2) / s; // 가로등의 옆자리(미터)
    const r0 = GLASS_HALF * s; // 기준 각 θ0를 판의 픽셀로
    const cols = Math.ceil(width / STEP);
    const rows = Math.ceil(height / STEP);
    const masks = ["carve", "tint"].map(() => {
      const canvas = Object.assign(document.createElement("canvas"), { width: cols, height: rows });
      const g = canvas.getContext("2d");
      return { canvas, g, image: g.createImageData(cols, rows) };
    });
    for (let row = 0, a = 3; row < rows; row += 1) {
      const y = (row + 0.5) * STEP;
      const Z = y > horizon ? (f * EYE) / (y - horizon) : 0;
      for (let col = 0; col < cols; col += 1, a += 4) {
        const x = (col + 0.5) * STEP;
        const d2 = (x - lx) ** 2 + (y - ly) ** 2;
        const veil = (glow * r0 * r0) / Math.max(d2, 1e-6);
        // 안개빛. 시선이 빛 곁을 b미터 떨어져 지나며 모으는 산란광은 1/b를 따르고, 안개가 빛을 먹는 만큼
        // e^(−βb)로 더 준다. 세기는 산란 계수 β에 비례한다
        const b = Math.max(Math.sqrt(d2) / s, GLASS_HALF);
        const haze = 10 * beta * (GLASS_HALF / b) * Math.exp(-beta * b);
        let ground = 0;
        if (Z > 0) {
          const X = ((x - width / 2) * Z) / f;
          const r2 = (X - lampX) ** 2 + (Z - AWAY) ** 2;
          ground = pool * Math.pow(1 + r2 / (BULB * BULB), -1.5);
        }
        // 안개빛은 1.6배로 키우지 않고 밝기 그대로 파내, 판판한 데 없이 멀리까지 고르게 옅어진다. 흐린 빛은 눈에
        // 빛깔이 덜 보이므로(박명시) 노랑은 HAZE_TINT만큼만 얹는다
        const L = veil + ground;
        const open = 1 - (1 - Math.min(1, L * 1.6)) * (1 - Math.min(1, haze));
        const warm = L + haze * HAZE_TINT;
        masks[0].image.data[a] = Math.round(open * 255);
        masks[1].image.data[a] = Math.round(TINT * Math.min(warm, 1 / warm) * 255);
      }
    }
    for (const mask of masks) mask.g.putImageData(mask.image, 0, 0);
    return { carve: masks[0].canvas, tint: masks[1].canvas, cols, rows };
  });
}

export const lamp = {
  id: "lamp",
  name: "LAMP",
  about: "밤길의 램프형 가로등 하나 — 빛은 밤을 파낸 종이다",
  model: "claude-opus-5-5",

  knobs: [
    { key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 1, hint: "밤의 짙기. 하늘은 위가 짙고 지평선으로 옅어지며, 땅은 앞으로 올수록 짙다" },
    { key: "glow", label: "GLOW", min: 0, max: 12, step: 0.1, value: 6, hint: "랜턴 둘레의 번짐. 눈 속에서 흩어진 빛의 베일이라, 빛에서 떨어진 각의 제곱에 반비례해 옅어진다(Stiles–Holladay). 셀수록 랜턴 둘레가 하얗게 나고 노란 테가 밖으로 물러난다. 0이면 번짐이 없다" },
    { key: "fog", label: "FOG", min: 0, max: 1, step: 0.05, value: 0.5, hint: "안개의 짙기. 안개가 흩뜨린 빛이 랜턴 둘레의 공기를 넓게 밝힌다 — 빛에서 떨어진 거리에 반비례해 옅어지고, 짙을수록 가까이는 밝고 멀리는 빨리 사그라든다. 1이면 가시거리 10미터쯤이다. 0이면 맑은 밤이다" },
    { key: "pool", label: "POOL", min: 0, max: 1, step: 0.05, value: 0.9, hint: "가로등 발밑 땅의 밝기. 옆으로 멀어질수록 코사인 세제곱 법칙으로 어두워진다. 0이면 땅에 빛이 닿지 않는다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.3, hint: "기둥의 가장자리가 손으로 오린 듯 흔들리는 정도. 0이면 자로 자른 곧은 선이다" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.3, hint: "밤이 얼룩덜룩한 정도. 0이면 고르게 깔린다" }
  ],

  paint(S, R, page) {
    const { width, height, knobs } = page;
    const inks = S.drums.map((drum) => drum.separation);
    const { night, deepest, light } = nightAndLight(S.drums);
    const glowInk = light[0] || null;

    // 장면. 가로등의 발이 판 높이의 93%, 판 폭의 58%에 선다. s는 가로등 자리에서 1미터의 픽셀이다
    const s = (height * 0.78) / TALL;
    const lx = width * 0.58;
    const foot = height * 0.93;
    const at = (h) => foot - h * s;
    const horizon = foot - EYE * s;
    const ly = at(BULB);
    const dark = knobs.dark;

    // 밤. 하늘은 위가 짙고 지평선으로 옅어진다. 땅은 지평선에서 그보다 조금 짙게 시작해 앞으로 올수록 짙다
    for (const sep of night) {
      const tone = (sep === deepest ? 0.95 : 0.8) * dark;
      sep.ramp(0, 0, width, horizon, { from: tone, to: tone * 0.55 });
      sep.ramp(0, horizon, width, height - horizon, { from: tone * 0.7, to: Math.min(1, tone * 1.08) });
    }
    if (knobs.stain > 0) {
      const made = stainsFor(ROLL, knobs.stain, 0.8);
      soak(night[0], made.wash, width, height);
      if (night[1]) soak(night[1], made.body, width, height);
    }

    // 빛. 밝기만큼 밤을 파내고 노랑을 얹는다
    const glow = lightFor(width, height, { lx, ly, horizon, s }, knobs.glow, knobs.pool, knobs.fog);
    const lay = (canvas) => (g) => {
      g.imageSmoothingQuality = "low";
      g.drawImage(canvas, 0, 0, glow.cols, glow.rows, 0, 0, glow.cols * STEP, glow.rows * STEP);
    };
    carve(night, lay(glow.carve));
    if (glowInk) stain([glowInk], lay(glow.tint));

    // 유리와 전구. 유리는 모든 통을 파낸 종이에 옅은 노랑이고, 전구는 종이다
    const x = (m) => lx + m * s;
    const quad = (h0, h1, half0, half1) => [[x(-half0), at(h0)], [x(half0), at(h0)], [x(half1), at(h1)], [x(-half1), at(h1)]];
    const fillEach = (parts) => (g) => {
      for (const part of parts) {
        g.beginPath();
        if (part.circle) shapes.circleSubpath(g, ...part.circle);
        else if (part.oval) g.ellipse(...part.oval, 0, 0, Math.PI * 2);
        else shapes.polySubpath(g, part, true);
        g.fill();
      }
    };
    const glass = [quad(GLASS_LOW, GLASS_TOP, glassHalf(GLASS_LOW), glassHalf(GLASS_TOP))];
    carve(inks, fillEach(glass));
    if (glowInk) stain([glowInk], fillEach(glass), GLASS);
    carve(inks, fillEach([{ oval: [lx, ly, 0.042 * s, 0.058 * s] }]));

    // 실루엣. 기둥의 긴 가장자리는 손으로 오린 듯 조금 흔들린다 — 마디의 양 끝에서는 흔들리지 않아
    // 목과 받침대의 모서리가 그대로 선다
    const wobble = makeNoise(makeRng(ROLL ^ 0x68e31da4));
    const side = (sign) => {
      const points = [];
      for (let k = 0; k < COLUMN.length - 1; k += 1) {
        const [h0, w0] = COLUMN[k];
        const [h1, w1] = COLUMN[k + 1];
        const steps = Math.max(1, Math.ceil((h1 - h0) / 0.1));
        for (let j = 0; j < steps; j += 1) {
          const u = j / steps;
          const h = h0 + (h1 - h0) * u;
          const shake = knobs.hand * 3 * wobble(h * 4 + (sign > 0 ? 64 : 0)) * Math.sin(Math.PI * u);
          points.push([lx + sign * ((w0 + (w1 - w0) * u) * s + shake), at(h)]);
        }
      }
      const [h, w] = COLUMN[COLUMN.length - 1];
      points.push([lx + sign * w * s, at(h)]);
      return points;
    };
    const frame = 0.022;
    const rail = 0.025;
    const silhouette = [
      [...side(-1), ...side(1).reverse()],
      // 사다리 가로대와 양 끝의 공
      quad(3.5, 3.53, 0.3, 0.3),
      { circle: [x(-0.3), at(3.515), 0.028 * s] },
      { circle: [x(0.3), at(3.515), 0.028 * s] },
      // 유리의 틀. 양쪽 모서리 기둥과 위아래 띠, 전구 받침
      [[x(-glassHalf(GLASS_LOW)), at(GLASS_LOW)], [x(-glassHalf(GLASS_LOW) + frame), at(GLASS_LOW)], [x(-glassHalf(GLASS_TOP) + frame), at(GLASS_TOP)], [x(-glassHalf(GLASS_TOP)), at(GLASS_TOP)]],
      [[x(glassHalf(GLASS_LOW) - frame), at(GLASS_LOW)], [x(glassHalf(GLASS_LOW)), at(GLASS_LOW)], [x(glassHalf(GLASS_TOP)), at(GLASS_TOP)], [x(glassHalf(GLASS_TOP) - frame), at(GLASS_TOP)]],
      quad(GLASS_LOW, GLASS_LOW + rail, glassHalf(GLASS_LOW), glassHalf(GLASS_LOW + rail)),
      quad(GLASS_TOP - rail, GLASS_TOP, glassHalf(GLASS_TOP - rail), glassHalf(GLASS_TOP)),
      quad(GLASS_LOW + rail, 4.32, 0.012, 0.012),
      // 지붕. 처마 띠 위로 오목하게 좁아져 꼭지를 받친다
      quad(GLASS_TOP, 4.645, 0.235, 0.235),
      [[x(-0.225), at(4.645)], [x(0.225), at(4.645)], [x(0.13), at(4.69)], [x(0.075), at(4.73)], [x(0.05), at(4.76)], [x(-0.05), at(4.76)], [x(-0.075), at(4.73)], [x(-0.13), at(4.69)]],
      { circle: [lx, at(4.785), 0.022 * s] },
      [[x(-0.008), at(4.8)], [x(0.008), at(4.8)], [lx, at(TALL)]]
    ];
    stain(inks, fillEach(silhouette));

    return { horizon, bulb: [lx, ly], foot: [lx, foot] };
  },

  // 안내선. 눈높이(지평선)와 빛이 나오는 자리
  guides(page, sketch) {
    if (!sketch) return [];
    return [
      { kind: "line", from: [0, sketch.horizon], to: [page.width, sketch.horizon], dash: true },
      { kind: "dot", at: sketch.bulb, r: 4, ring: 16, label: `LAMP · ${BULB} M`, hot: true },
      { kind: "cross", at: sketch.foot, r: 6, label: `EYE ${EYE} M · ${AWAY} M AWAY`, lift: -18 }
    ];
  }
};
