// 계조와 녹아웃만으로 짜는 판. 흰 잉크가 없는 기계에서 밝은 것을 얻는 방법은 하나뿐이다.
// 그 자리를 찍지 않는 것. 달도, 물 위에 부서지는 달빛도 전부 파낸 구멍이다.
//
// 라인리스다. 달과 수평선에 테두리를 긋지 않고, 자와 컴퍼스로 자르지도 않는다. 달은 가장자리가
// 조금 흔들리게 파낸 구멍이고, 수평선은 하늘과 물이 만나는 자리일 뿐이다 — 물의 윗선이 잡음을
// 따라 흔들린다. 달무리 고리 둘도 손으로 그은 원이다. 흔들림은 롤이 정하고 시간과 무관하다(HAND).
// 손의 난수는 따로 굴려 별과 물빛의 자리는 그대로다.

import * as shapes from "../shapes.js";
import { makeRng, makeNoise } from "../rng.js";

export const moon = {
  id: "moon",
  name: "MOON",
  about: "계조와 녹아웃, 라인리스. 하늘은 램프, 달과 물빛은 파낸 자리. 가장자리는 손으로 오린 듯하다",

  // 이 판이 스스로 내놓는 손잡이. RIPPLE의 것과 겹치지 않는다 — 판마다 필요한 것이 다르고,
  // 남의 판에 없는 값을 화면에 띄워 둘 이유가 없다.
  knobs: [
    { key: "moon", label: "MOON", min: 0.06, max: 0.32, step: 0.01, value: 0.17 },
    { key: "horizon", label: "HORIZON", min: 0.35, max: 0.88, step: 0.01, value: 0.66 },
    { key: "rise", label: "RISE", min: 0, max: 40, step: 1, value: 9 },
    { key: "sky", label: "SKY", min: 0.2, max: 1, step: 0.05, value: 0.95 },
    { key: "stars", label: "STARS", min: 0, max: 240, step: 10, value: 120 },
    { key: "glints", label: "GLINTS", min: 0, max: 60, step: 2, value: 30 },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.6, hint: "달과 물의 가장자리, 달무리가 손으로 오린 듯 흔들리는 정도. 0이면 반듯한 원과 곧은 선이다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    const turn = t * Math.PI * 2;
    const swing = (phase = 0) => Math.sin(turn + phase);

    const horizon = height * knobs.horizon;
    const cx = width * 0.5;
    const cy = height * 0.3 + swing() * knobs.rise; // 달이 아주 천천히 오르내린다
    const radius = width * knobs.moon;

    // 물의 윗선. 두 겹의 잡음을 따라 흔들려 자로 그은 선처럼 곧지 않다. 잡음은 롤에서 따로 굴려,
    // 별과 물빛이 쓰는 난수 흐름을 건드리지 않는다
    const hand = makeRng((page.seed ^ 0x2b992ddf) >>> 0);
    const long = makeNoise(hand);
    const short = makeNoise(hand);
    const shore = [];
    for (let x = -12; x <= width + 12; x += 12) {
      shore.push([x, horizon + (long(x / 110) * 6 + short(x / 29) * 1.8) * knobs.hand]);
    }

    // 하늘. 진한 통이 깊이를 만들고 가운데 통이 수평선 쪽에 온기를 남긴다. 물의 윗선이 흔들려
    // 아래로 처지는 자리까지 조금 더 내려 깐다
    S.key.ramp(0, 0, width, horizon + 10, { from: knobs.sky, to: 0.05 });
    S.body.ramp(0, 0, width, horizon + 10, { from: knobs.sky * 0.32, to: 0.02 });

    // 달. 하늘에 쓴 통 모두에서 파낸다. 한쪽만 파면 그 통의 색이 달에 남는다. 가장자리는 손으로
    // 오린 듯 조금 흔들린다
    const face = shapes.blob(makeRng((page.seed ^ 0x3c6ef372) >>> 0), cx, cy, radius, { steps: 72, lobes: 4, wobble: 0.02 * knobs.hand });
    for (const drum of [S.key, S.body]) {
      drum.knockout((sep) => sep.shape(face));
    }

    // 달무리. 컴퍼스가 아니라 손으로 그은 고리 둘
    const halo = makeRng((page.seed ^ 0x510e527f) >>> 0);
    S.body.line(shapes.blob(halo, cx, cy, radius + 22, { steps: 72, lobes: 3, wobble: 0.03 * knobs.hand }), { w: 3, tone: 0.42, close: true });
    S.body.line(shapes.blob(halo, cx, cy, radius + 52, { steps: 72, lobes: 5, wobble: 0.03 * knobs.hand }), { w: 2.4, tone: 0.22, close: true });

    // 별. 하늘이 진한 위쪽일수록 촘촘하게. 옅은 아래에 찍으면 별로 읽히지 않는다.
    //
    // 뽑을 것을 먼저 다 뽑고 나서 거를지 정한다. 순서를 바꿔 달 곁이라고 먼저 건너뛰면,
    // 달이 흔들릴 때마다 걸러지는 별이 달라지고 그 뒤 별이 전부 다른 난수를 받는다.
    // 프레임마다 하늘이 통째로 갈리는 셈이다 — 시간이 난수 흐름을 건드리면 안 된다.
    for (let i = 0; i < knobs.stars; i += 1) {
      const x = R.float(0, width);
      const y = R.float(0, horizon * 0.95);
      const keep = R.chance((1 - y / horizon) * 0.85);
      const beat = R.float(0, Math.PI * 2);
      const base = R.float(1.3, 3.4);
      const flare = R.chance(0.14);

      if (!keep) continue;
      if (Math.hypot(x - cx, y - cy) < radius + 36) continue;

      // 반짝임. 파낸 구멍이 커졌다 작아지는 것이라, 종이가 숨 쉬는 것처럼 보인다
      const size = base * (0.55 + 0.45 * swing(beat));
      if (flare) S.key.knockout((sep) => sep.draw((g) => { shapes.sparkle(g, x, y, size * 3.4); g.fill(); }));
      else S.key.knockout((sep) => sep.disc(x, y, size));
    }

    // 물. 수평선 아래로 다시 진해진다. 흔들리는 윗선이 곧 수평선이라, 선을 따로 긋지 않는다
    const water = [...shore, [width + 12, height + 12], [-12, height + 12]];
    const deepen = (sep, from, to) =>
      sep.draw((g) => {
        const ramp = g.createLinearGradient(0, horizon, 0, height);
        ramp.addColorStop(0, `rgba(0, 0, 0, ${from})`);
        ramp.addColorStop(1, `rgba(0, 0, 0, ${to})`);
        g.fillStyle = ramp;
        shapes.polyPath(g, water, true);
        g.fill();
      });
    deepen(S.key, 0.28, 0.66);
    deepen(S.wash, 0.1, 0.4);

    // 달빛. 달 바로 아래로 끊긴 가로 획들 — 찍지 않은 자리라 종이가 그대로 드러난다.
    // 아래로 갈수록 넓어지되 폭을 흔들어, 길이 삼각형으로 굳지 않게 한다.
    //
    // 물을 두 통이 찍었으니 두 통에서 다 파내야 종이가 나온다. 한 통만 파면 남은 통의
    // 색이 그 자리에 그대로 남아 물빛이 흐려진다. 그래서 획을 먼저 만들어 두고 같은 것을
    // 두 번 새긴다 — 파낼 때마다 난수를 다시 당기면 두 통이 서로 다른 자리를 판다.
    const glints = [];
    const rows = knobs.glints;
    for (let i = 0; i < rows; i += 1) {
      const depth = i / rows; // 수평선에서 0, 판 아래로 갈수록 1
      const y = horizon + 12 + depth * (height - horizon - 40);
      const spread = (46 + depth * 150) * R.float(0.55, 1.25);
      for (let k = 0, pieces = R.int(2, 4); k < pieces; k += 1) {
        // 물빛은 제자리에서 좌우로 흔들린다. 흐르는 것이 아니라 물이 일렁이는 것이다.
        // 흔들리는 폭은 아래로 갈수록 커진다 — 시간이 아니라 자리에 따라. t에 비례시키면
        // 한 바퀴 끝에서 폭이 제자리로 튀고, 그 튐이 곧 이음매가 된다.
        const sway = swing(R.float(0, Math.PI * 2)) * (6 + depth * 10);
        const x = cx + R.float(-spread, spread) + sway;
        const length = R.float(14, 52) * (0.5 + depth);
        glints.push({
          points: shapes.wave(x - length / 2, y, x + length / 2, y, { amplitude: 1.6, cycles: 1.1, steps: 12, phase: turn }),
          w: R.float(2.5, 6)
        });
      }
    }

    const carveWater = (paint) => {
      for (const drum of [S.key, S.wash]) drum.knockout(paint);
    };

    carveWater((sep) => {
      for (const glint of glints) sep.line(glint.points, { w: glint.w });
    });
  }
};
