// 바다 속의 고래. 움직이지 않는 한 장이다 — t를 보지 않는다.
//
// 물과 고래, 둘뿐이다. 물은 위가 밝고 아래로 갈수록 짙어지며, 옅은 두 통이 번져 고른 계조가 아니라
// 물이 된다(해파리의 물과 같다, src/stains.js). 고래는 위에서 오는 빛을 등져 속이 보이지 않는 검은
// 실루엣이고, 등줄기 한 줄만 빛을 받는다. 가장자리는 자로 그은 듯하지 않고 손으로 오린 듯 흔들린다.
//
// 윤곽은 혹등고래를 옆에서 본 비례다 — 머리가 몸의 3분의 1, 등지느러미는 몸 윤곽 안에 넣어 등에
// 붙였고(따로 그리면 등 위에 뜬 조각이 된다), 가슴지느러미는 몸길이의 3분의 1이며, 꼬리는 납작한
// 날이다. 세로로 갈라 그리면 물고기 꼬리가 된다.

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { meteorInks } from "../drums.js";
import { stain as lay } from "../night.js";
import { dim } from "../scope.js";
import { stainsFor, soak } from "../stains.js";

// 고래의 몸. 코가 원점이고 몸길이가 1이다. y는 등 쪽이 음수다
const BODY = [
  [0.004, 0.006],
  [0.012, -0.022],
  [0.05, -0.052],
  [0.11, -0.072],
  [0.18, -0.086],
  [0.32, -0.09],
  [0.46, -0.086],
  [0.575, -0.078],
  [0.62, -0.108],
  [0.66, -0.116],
  [0.7, -0.074],
  [0.8, -0.05],
  [0.87, -0.034],
  [0.885, 0],
  [0.87, 0.03],
  [0.78, 0.056],
  [0.66, 0.082],
  [0.52, 0.1],
  [0.36, 0.106],
  [0.22, 0.092],
  [0.1, 0.062],
  [0.04, 0.04],
  [0.012, 0.026]
];

// 꼬리. 자루에서 납작하게 뒤로 뻗고 가운데가 패여 두 갈래로 갈린다
const FLUKE = [
  [0.86, -0.018],
  [0.95, -0.038],
  [1.06, -0.07],
  [1.12, -0.082],
  [1.06, -0.028],
  [1.04, 0],
  [1.06, 0.028],
  [1.12, 0.082],
  [1.06, 0.07],
  [0.95, 0.038],
  [0.86, 0.018]
];

// 가슴지느러미. 몸길이의 3분의 1로 길고 끝이 둥근 노다
const FIN = [
  [0.21, 0.03],
  [0.31, 0.13],
  [0.43, 0.22],
  [0.54, 0.3],
  [0.585, 0.345],
  [0.535, 0.365],
  [0.44, 0.31],
  [0.33, 0.22],
  [0.24, 0.14],
  [0.16, 0.04]
];

export const whale = {
  id: "whale",
  name: "WHALE",
  about: "바다 속의 고래. 물과 실루엣 하나뿐인, 움직이지 않는 한 장",
  model: "claude-opus-5",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "얼룩과 손떨림을 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { key: "deep", label: "DEEP", min: 0.3, max: 1, step: 0.05, value: 0.85, hint: "바닥의 어둠. 수면 쪽은 늘 밝고 아래로 갈수록 이만큼 짙어진다" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.55, hint: "물이 얼룩덜룩한 정도. 0이면 물이 고르게 깔린다" },
    { key: "size", label: "SIZE", min: 0.3, max: 1.3, step: 0.05, value: 0.72, hint: "고래의 크기. 판 폭에 대한 몸길이다" },
    { key: "rise", label: "RISE", min: 0.2, max: 0.8, step: 0.01, value: 0.54, hint: "고래가 뜬 높이. 판 높이에서의 비율이다" },
    { key: "dive", label: "DIVE", min: -40, max: 40, step: 1, value: 12, hint: "고래가 기운 각(도). 음수면 머리가 위를 향한다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "가장자리가 손으로 오린 듯 흔들리는 정도. 0이면 자로 그은 듯하다" },
    { key: "glow", label: "GLOW", min: 0, max: 1, step: 0.05, value: 0.7, hint: "등줄기에 앉는 빛. 위에서 오는 빛을 등졌다는 표다" }
  ],

  paint(S, R, page) {
    const { width, height, knobs } = page;

    // 얼룩과 손떨림은 제 씨앗으로 뽑는다. FIELD는 잉크와 종이결을 건드리지 않는다
    const seed = fieldSeed(page, 0x5bf03635);
    const cut = makeRng((seed ^ 0x1b873593) >>> 0);

    const inks = S.drums.map((drum) => drum.separation);
    const { glowInk, darkInk } = meteorInks(S.drums, S.key);
    const rest = inks.filter((sep) => sep !== S.key && sep !== darkInk);

    // 물. 위가 밝고 아래로 갈수록 짙어진다. 옅은 통은 위쪽에 한 겹 더 깔려 물빛이 배색을 따른다
    const deep = knobs.deep;
    S.key.ramp(0, 0, width, height, { from: deep * 0.16, to: deep });
    S.wash.ramp(0, 0, width, height, { from: deep * 0.55, to: 0.02 });
    if (S.body !== S.wash) S.body.ramp(0, 0, width, height, { from: 0.02, to: deep * 0.45 });

    // 얼룩. 옅은 두 통이 서로 다른 밭을 따라 번진다. 고른 계조로는 물이 되지 않는다
    if (knobs.stain > 0) {
      const made = stainsFor(page.seed, knobs.stain, 0.55);
      soak(S.wash, made.wash, width, height);
      soak(S.body, made.body, width, height);
    }
    dim(S.key, page, width * 0.9, 0.7);

    // 고래. 빛을 등져 속이 보이지 않는다. 모든 통을 겹쳐 물보다 확실히 어둡게 찍는다 — 파내는 통이
    // 하나도 없어야 검게 선다. 통이 둘뿐이면 물과 같은 통이라 묻히므로 남은 통을 더 겹친다
    const long = width * knobs.size;
    const tilt = (knobs.dive * Math.PI) / 180;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const headX = width * 0.86;
    const headY = height * knobs.rise;
    const place = (points) => points.map(([x, y]) => [headX - (x * cos - y * sin) * long, headY + (x * sin + y * cos) * long]);
    // 손으로 오린 가장자리. 점마다 제자리에서 조금 흔들린다. 자로 그은 가장자리는 판화가 아니라 도면이다
    const wobble = long * 0.012 * knobs.hand;
    const shake = (points) => points.map(([x, y]) => [x + (cut.next() - 0.5) * wobble, y + (cut.next() - 0.5) * wobble]);
    const fill = (points) => (g) => {
      shapes.splinePath(g, points, true);
      g.fill();
    };
    const silhouette = (paint) => {
      lay([S.key], paint, 1);
      if (darkInk) lay([darkInk], paint, 0.92);
      lay(rest, paint, inks.length > 2 ? 0.42 : 0.85);
    };

    silhouette(fill(shake(place(BODY))));
    silhouette(fill(shake(place(FLUKE))));
    silhouette(fill(shake(place(FIN))));

    // 등줄기의 빛. 위에서 오는 빛을 등졌다는 표다. 등 쪽 윤곽을 따라 한 줄 얹는다
    if (knobs.glow > 0 && glowInk) {
      const ridge = place(BODY.slice(0, 10).map(([x, y]) => [x, y - 0.014]));
      lay(
        [glowInk],
        (g) => {
          g.lineWidth = Math.max(1.5, long * 0.013);
          g.lineCap = "round";
          shapes.splinePath(g, ridge, false);
          g.stroke();
        },
        knobs.glow
      );
    }

    return { headX, headY, long, tilt };
  },

  // 안내선. 고래의 축과 코를 보여 준다
  guides(page, sketch) {
    if (!sketch) return [];
    const cos = Math.cos(sketch.tilt);
    const sin = Math.sin(sketch.tilt);
    return [
      {
        kind: "line",
        from: [sketch.headX, sketch.headY],
        to: [sketch.headX - cos * sketch.long, sketch.headY + sin * sketch.long],
        dash: true
      },
      { kind: "dot", at: [sketch.headX, sketch.headY], r: 5, ring: 18, label: "NOSE", hot: true }
    ];
  }
};
