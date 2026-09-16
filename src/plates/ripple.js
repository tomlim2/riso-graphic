// 24fps 물결.
//
// t가 0에서 1로 한 바퀴 도는 동안 고리가 나고, 퍼지고, 진다. 어디서 끊어도 이어지려면
// 이 판 안의 모든 주기가 t에 대해 정확히 한 바퀴여야 한다. 고리의 수명은 frac(t + 위상)이라
// t=1의 고리 무리는 t=0의 것과 같은 무리고, 흔들림은 sin(lobes*θ + 2πt)라 역시 한 바퀴다.
// 이 규칙을 하나라도 어기면 루프가 튄다.
//
// 목판의 물결은 선이 아니라 폭이 변하는 띠다. 고리 두 개 사이를 evenodd로 채워, 파낸 골처럼
// 자리마다 두께가 달라지게 한다. 같은 굵기로 한 번 그으면 그냥 원이 된다.

import { MONO } from "../type.js";
import { splineSubpath } from "../shapes.js";

function ring(cx, cy, radius, options = {}) {
  const { steps = 72, squash = 0.7, lobes = 3, lobesB = 5, amp = 0.05, spin = 0 } = options;
  const turn = spin * Math.PI * 2;
  const points = [];

  for (let i = 0; i < steps; i += 1) {
    const theta = (i / steps) * Math.PI * 2;
    const wobble = 1 + amp * Math.sin(lobes * theta + turn) + amp * 0.55 * Math.sin(lobesB * theta - turn * 1.5);
    points.push([cx + Math.cos(theta) * radius * wobble, cy + Math.sin(theta) * radius * wobble * squash]);
  }
  return points;
}

export const ripple = {
  id: "ripple",
  name: "RIPPLE",
  about: "24fps 물결. 고리가 나고 퍼지고 지는 동안 t가 한 바퀴 돈다",

  paint(S, R, page) {
    const { width, height, margin, t } = page;

    // 물. 위가 멀고 아래가 가깝다. 바탕이 진하면 고리가 등고선처럼 보이므로 낮게 깐다
    S.wash.ramp(0, 0, width, height, { from: 0.44, to: 0.08 });
    S.body.ramp(0, height * 0.52, width, height * 0.48, { from: 0, to: 0.16 });

    const systems = [
      { x: width * 0.38, y: height * 0.4, reach: 700, rings: 11, phase: 0, weight: 1 },
      { x: width * 0.72, y: height * 0.63, reach: 480, rings: 8, phase: 0.37, weight: 0.78 }
    ];

    for (const system of systems) {
      for (let i = 0; i < system.rings; i += 1) {
        const life = (t + system.phase + i / system.rings) % 1;

        // 퍼질수록 느려진다. 안쪽에서 고리가 뭉치는 것이 물결로 읽히는 첫째 조건이다
        const radius = system.reach * Math.pow(life, 0.72);
        if (radius < 10) continue;

        // 날 때 짧게 서고, 갈 때 길게 죽는다
        const fade = Math.min(1, life / 0.08) * (1 - Math.max(0, (life - 0.6) / 0.4));
        if (fade <= 0.02) continue;

        // 물결은 거의 원이다. 흔들림을 키우면 곧바로 등고선이 된다
        const amp = (0.016 + 0.014 * (1 - life)) * system.weight;
        const shape = { lobes: 3, lobesB: 5, amp, spin: t, squash: 0.62 };
        const outer = ring(system.x, system.y, radius, shape);
        const inner = ring(system.x, system.y, radius * (1 - (0.032 + 0.026 * (1 - life))), shape);

        // 골. 두 고리 사이를 채우되 마루보다 조금 내려 앉힌다. 빛이 위에서 온다는 뜻이고,
        // 목판에서 마루 선과 그림자가 두 색으로 갈리는 것이 이 어긋남이다.
        const drop = 5 * system.weight;
        S.body.draw((g) => {
          g.globalAlpha = fade * 0.85;
          g.beginPath();
          splineSubpath(g, outer.map(([x, y]) => [x, y + drop]), true);
          splineSubpath(g, inner.map(([x, y]) => [x, y + drop]), true);
          g.fill("evenodd");
        });

        // 마루. 파낸 골의 윗날
        S.key.line(outer, { w: (5.4 - 2.6 * life) * system.weight, tone: fade, close: true });
      }

      // 떨어진 자리
      S.key.disc(system.x, system.y, 7 * system.weight, { tone: 0.85 });
      S.key.ring(system.x, system.y, 15 * system.weight, { w: 2.5, tone: 0.45 });
    }

    // 물 위의 반짝임. 자리는 고정이고 밝기만 도는데, 이것도 t에 대해 한 바퀴다
    for (let i = 0; i < 34; i += 1) {
      const x = R.float(0, width);
      const y = R.float(height * 0.12, height * 0.95);
      const pulse = 0.5 + 0.5 * Math.sin((t + R.next()) * Math.PI * 2);
      S.key.disc(x, y, R.float(1.6, 3.4), { tone: pulse * 0.5 });
    }

    S.key.text("RIPPLE — 24FPS, ONE TURN", margin, height - 54, { font: `500 12px ${MONO}`, track: 2.2 });
  }
};
