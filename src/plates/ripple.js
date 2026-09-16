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

    // 고리 수가 방향을 정한다.
    //
    // 한 걸음에 고리가 나아가는 거리가 고리 사이 간격의 절반을 넘으면, 눈은 바깥 고리 대신
    // 안쪽 고리를 짝지어 버린다. 마차바퀴가 거꾸로 도는 것과 같은 일이고, 그러면 퍼지는
    // 물결이 모이는 물결로 보인다. 비율은 rings × hold ÷ 48이라 초당 여덟 장(hold 3)에서
    // 고리 열둘은 0.75 — 완전히 거꾸로다. 다섯이면 0.31, 넷이면 0.25로 안전하다.
    //
    // 대신 계를 하나 더 놓아 밀도를 되찾는다. 계마다 간격이 다르므로 서로 짝지어지지 않는다.
    const reach = Math.hypot(width, height);
    const systems = [
      { x: width * 0.36, y: height * 0.34, reach: reach * 0.92, rings: 4, phase: 0, weight: 1 },
      { x: width * 0.76, y: height * 0.6, reach: reach * 0.62, rings: 4, phase: 0.37, weight: 0.85 },
      { x: width * 0.18, y: height * 0.8, reach: reach * 0.46, rings: 3, phase: 0.71, weight: 0.68 },
      { x: width * 0.62, y: height * 0.9, reach: reach * 0.34, rings: 3, phase: 0.19, weight: 0.55 }
    ];

    for (const system of systems) {
      for (let i = 0; i < system.rings; i += 1) {
        // 자리도 속도도 고리마다 조금씩 다르게. 간격이 고르면 눈이 엉뚱한 짝을 찾아내지만,
        // 흐트러져 있으면 찾을 짝이 없다. 물이 실제로 그렇기도 하다 — 파장마다 속도가 다르다.
        const jitter = R.float(-0.16, 0.16);
        const ease = 0.72 + R.float(-0.1, 0.1);
        const life = (t + system.phase + (i + jitter) / system.rings + 1) % 1;

        // 퍼질수록 느려진다. 안쪽에서 고리가 뭉치는 것이 물결로 읽히는 첫째 조건이다
        const radius = system.reach * Math.pow(life, ease);
        if (radius < 10) continue;

        // 날 때 짧게 서고, 갈 때 길게 죽는다
        const fade = Math.min(1, life / 0.08) * (1 - Math.max(0, (life - 0.6) / 0.4));
        if (fade <= 0.02) continue;

        // 물결은 거의 원이다. 흔들림을 키우면 곧바로 등고선이 된다
        const amp = (0.016 + 0.014 * (1 - life)) * system.weight;
        const shape = { lobes: 3, lobesB: 5, amp, spin: t, squash: 0.62 };

        // 골의 두께는 픽셀로 정한다. 반지름에 비례시켰더니 멀리 간 고리가 예순 픽셀짜리
        // 띠가 되어, 물결이 아니라 덩어리로 보였다. 파도 마루는 퍼진다고 굵어지지 않는다.
        const band = (19 - 9 * life) * system.weight;
        const outer = ring(system.x, system.y, radius, shape);
        const inner = ring(system.x, system.y, radius - band, shape);

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
        S.key.line(outer, { w: (5 - 2.2 * life) * system.weight, tone: fade, close: true });

        // 자취. 마루 뒤로 얇게 한 줄 더. 물결 하나가 앞뒤로 다른 모양이 되면 눈이 자리가
        // 아니라 모양으로 짝을 짓는다. 느리게 찍을수록 방향을 붙잡아 주는 것이 이쪽이다.
        const wake = radius - band * 2.8;
        if (wake > 26) {
          S.key.line(ring(system.x, system.y, wake, shape), {
            w: 2 * system.weight,
            tone: fade * 0.42,
            close: true
          });
        }
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

    S.key.text("RIPPLE — 24FPS, ONE TURN", margin, height - 46, { font: `500 12px ${MONO}`, track: 2.2 });
  }
};
