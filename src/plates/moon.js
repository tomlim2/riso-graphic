// 계조와 녹아웃만으로 짜는 판. 흰 잉크가 없는 기계에서 밝은 것을 얻는 방법은 하나뿐이다.
// 그 자리를 찍지 않는 것. 달도, 물 위에 부서지는 달빛도 전부 파낸 구멍이다.

import * as shapes from "../shapes.js";

export const moon = {
  id: "moon",
  name: "MOON",
  about: "계조와 녹아웃. 하늘은 램프, 달과 물빛은 파낸 자리",

  // 이 판이 스스로 내놓는 손잡이. RIPPLE의 것과 겹치지 않는다 — 판마다 필요한 것이 다르고,
  // 남의 판에 없는 값을 화면에 띄워 둘 이유가 없다.
  knobs: [
    { key: "moon", label: "MOON", min: 0.06, max: 0.32, step: 0.01, value: 0.17 },
    { key: "horizon", label: "HORIZON", min: 0.35, max: 0.88, step: 0.01, value: 0.66 },
    { key: "rise", label: "RISE", min: 0, max: 40, step: 1, value: 9 },
    { key: "sky", label: "SKY", min: 0.2, max: 1, step: 0.05, value: 0.95 },
    { key: "stars", label: "STARS", min: 0, max: 240, step: 10, value: 120 },
    { key: "glints", label: "GLINTS", min: 0, max: 60, step: 2, value: 30 }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    const turn = t * Math.PI * 2;
    const swing = (phase = 0) => Math.sin(turn + phase);

    const horizon = height * knobs.horizon;
    const cx = width * 0.5;
    const cy = height * 0.3 + swing() * knobs.rise; // 달이 아주 천천히 오르내린다
    const radius = width * knobs.moon;

    // 하늘. 진한 통이 깊이를 만들고 가운데 통이 수평선 쪽에 온기를 남긴다
    S.key.ramp(0, 0, width, horizon, { from: knobs.sky, to: 0.05 });
    S.body.ramp(0, 0, width, horizon, { from: knobs.sky * 0.32, to: 0.02 });

    // 달. 하늘에 쓴 통 모두에서 파낸다. 한쪽만 파면 그 통의 색이 달에 남는다
    for (const drum of [S.key, S.body]) {
      drum.knockout((sep) => sep.disc(cx, cy, radius));
    }
    S.body.ring(cx, cy, radius + 22, { w: 3, tone: 0.42 });
    S.body.ring(cx, cy, radius + 52, { w: 2, tone: 0.22 });

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

    // 물. 수평선 아래로 다시 진해진다
    S.key.ramp(0, horizon, width, height - horizon, { from: 0.28, to: 0.66 });
    S.wash.ramp(0, horizon, width, height - horizon, { from: 0.1, to: 0.4 });

    // 달빛. 달 바로 아래로 끊긴 가로 획들 — 찍지 않은 자리라 종이가 그대로 드러난다.
    // 아래로 갈수록 넓어지되 폭을 흔들어, 길이 삼각형으로 굳지 않게 한다.
    //
    // 물을 두 통이 찍었으니 두 통에서 다 파내야 종이가 나온다. 한 통만 파면 남은 통의
    // 색이 그 자리에 그대로 남아 물빛이 흐려진다. 그래서 획을 먼저 만들어 두고 같은 것을
    // 두 번 새긴다 — 파낼 때마다 난수를 다시 당기면 두 통이 서로 다른 자리를 판다.
    const glints = [];
    const rows = knobs.glints;
    for (let i = 0; i < rows; i += 1) {
      const t = i / rows;
      const y = horizon + 12 + t * (height - horizon - 40);
      const spread = (46 + t * 150) * R.float(0.55, 1.25);
      for (let k = 0, pieces = R.int(2, 4); k < pieces; k += 1) {
        // 물빛은 제자리에서 좌우로 흔들린다. 흐르는 것이 아니라 물이 일렁이는 것이다.
        // 흔들리는 폭은 아래로 갈수록 커진다 — 시간이 아니라 자리에 따라. t에 비례시키면
        // 한 바퀴 끝에서 폭이 제자리로 튀고, 그 튐이 곧 이음매가 된다.
        const sway = swing(R.float(0, Math.PI * 2)) * (6 + (i / rows) * 10);
        const x = cx + R.float(-spread, spread) + sway;
        const length = R.float(14, 52) * (0.5 + i / rows);
        glints.push({
          points: shapes.wave(x - length / 2, y, x + length / 2, y, { amplitude: 1.6, cycles: 1.1, steps: 12, offset: i + k, phase: turn }),
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

    S.key.line([[0, horizon], [width, horizon]], { w: 2, tone: 0.5, smooth: false });
  }
};
