// 계조와 녹아웃만으로 짜는 판. 흰 잉크가 없는 기계에서 밝은 것을 얻는 방법은 하나뿐이다.
// 그 자리를 찍지 않는 것. 달도, 물 위에 부서지는 달빛도 전부 파낸 구멍이다.

import { DISPLAY, MONO } from "../type.js";
import * as shapes from "../shapes.js";

export const moon = {
  id: "moon",
  name: "MOON",
  about: "계조와 녹아웃. 하늘은 램프, 달과 물빛은 파낸 자리",

  paint(S, R, page) {
    const { width, height, margin } = page;

    const horizon = height * 0.66;
    const cx = width * 0.5;
    const cy = height * 0.31;
    const radius = 168;

    // 하늘. 진한 통이 깊이를 만들고 가운데 통이 수평선 쪽에 온기를 남긴다
    S.key.ramp(0, 0, width, horizon, { from: 0.95, to: 0.05 });
    S.body.ramp(0, 0, width, horizon, { from: 0.3, to: 0.02 });

    // 달. 하늘에 쓴 통 모두에서 파낸다. 한쪽만 파면 그 통의 색이 달에 남는다
    for (const drum of [S.key, S.body]) {
      drum.knockout((sep) => sep.disc(cx, cy, radius));
    }
    S.body.ring(cx, cy, radius + 22, { w: 3, tone: 0.42 });
    S.body.ring(cx, cy, radius + 52, { w: 2, tone: 0.22 });

    // 별. 하늘이 진한 위쪽일수록 촘촘하게. 옅은 아래에 찍으면 별로 읽히지 않는다
    for (let i = 0; i < 120; i += 1) {
      const x = R.float(0, width);
      const y = R.float(0, horizon * 0.95);
      if (Math.hypot(x - cx, y - cy) < radius + 36) continue;
      if (!R.chance((1 - y / horizon) * 0.85)) continue;

      const size = R.float(1.3, 3.4);
      if (R.chance(0.14)) S.key.knockout((sep) => sep.draw((g) => { shapes.sparkle(g, x, y, size * 3.4); g.fill(); }));
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
    const rows = 30;
    for (let i = 0; i < rows; i += 1) {
      const t = i / rows;
      const y = horizon + 12 + t * (height - horizon - 40);
      const spread = (46 + t * 150) * R.float(0.55, 1.25);
      for (let k = 0, pieces = R.int(2, 4); k < pieces; k += 1) {
        const x = cx + R.float(-spread, spread);
        const length = R.float(14, 52) * (0.5 + t);
        glints.push({
          points: shapes.wave(x - length / 2, y, x + length / 2, y, { amplitude: 1.6, cycles: 1.1, steps: 12, offset: i + k }),
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

    // 글자도 물에서 파낸다. 진한 물 위에 진한 잉크로 쓰면 읽히지 않는다
    carveWater((sep) => {
      sep.text("달은 찍지 않은 자리다", margin, height - 96, { font: `700 40px ${DISPLAY}` });
      sep.text("MOONRISE — EVERY BRIGHT THING IS A HOLE", margin, height - 60, { font: `500 12px ${MONO}`, track: 2 });
    });
  }
};
