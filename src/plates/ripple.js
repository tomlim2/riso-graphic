// 물결 하나.
//
// 종이가 거의 그대로 남아야 한다. 고리 두어 개, 다 그려지지 않고 조각만 남은 호, 가운데
// 점 하나. 그게 전부다. 면을 채우면 물결은 무늬가 되고, 무늬가 되면 퍼지는 것으로 보이지
// 않는다. 비어 있는 종이가 물이다.
//
// t가 0에서 1로 한 바퀴 도는 동안 고리가 나고, 퍼지고, 진다. 어디서 끊어도 이어지려면
// 이 판 안의 모든 주기가 t에 대해 정확히 한 바퀴여야 하고, 난수를 뽑는 횟수가 t에 따라
// 달라져서도 안 된다.

// 한 바퀴, 또는 그 일부. from/to를 주면 부서진 호가 된다.
function arc(cx, cy, radius, options = {}) {
  const { steps = 96, squash = 0.94, lobes = 3, lobesB = 5, amp = 0.006, spin = 0, from = 0, to = Math.PI * 2 } = options;
  const turn = spin * Math.PI * 2;
  const points = [];
  const span = to - from;
  const count = Math.max(6, Math.round((steps * Math.abs(span)) / (Math.PI * 2)));

  for (let i = 0; i <= count; i += 1) {
    const theta = from + (span * i) / count;
    const wobble = 1 + amp * Math.sin(lobes * theta + turn) + amp * 0.55 * Math.sin(lobesB * theta - turn * 1.5);
    points.push([cx + Math.cos(theta) * radius * wobble, cy + Math.sin(theta) * radius * wobble * squash]);
  }
  return points;
}

export const ripple = {
  id: "ripple",
  name: "RIPPLE",
  about: "고리 몇 개와 부서진 호. 나머지는 종이다",

  paint(S, R, page) {
    const { width, height, t } = page;

    const cx = width * 0.5;
    const cy = height * 0.47;
    const reach = width * 0.42;
    const rings = 3;

    // 종이는 거의 그대로. 아주 옅은 기운만 깔아 잉크가 얹힐 자리를 만든다
    S.wash.ramp(0, 0, width, height, { from: 0.1, to: 0.02 });

    // 고리. 실선 한 겹뿐이고 굵기는 반지름을 따라가지 않는다
    for (let i = 0; i < rings; i += 1) {
      const jitter = R.float(-0.1, 0.1);
      const ease = 0.8 + R.float(-0.06, 0.06);
      const life = (t + (i + jitter) / rings + 1) % 1;
      const radius = reach * Math.pow(life, ease);
      if (radius < 8) continue;

      // 끝까지 살아 있다가 마지막에만 진다. 큰 고리가 다 자란 모습을 보여 주려면 그래야 한다
      const fade = Math.min(1, life / 0.06) * (1 - Math.max(0, (life - 0.8) / 0.2));
      if (fade <= 0.02) continue;

      // 망점 셀보다 가는 선은 살아남지 못한다. 점선으로 부서져 실선으로 읽히지 않으므로
      // 한 셀은 너끈히 덮을 굵기로 긋는다. 리소 실선이 실제로 그만큼 굵기도 하다.
      S.key.line(arc(cx, cy, radius, { spin: t }), { w: 5.6 - 1.2 * life, tone: fade, close: true });
    }

    // 부서진 호. 고리 하나가 다 찍히지 못하고 조각만 남은 것 — 판이 종이에 덜 닿은 자리다.
    // 안쪽에 낮게 깔려, 다 자란 고리와 가운데 점 사이의 빈 곳을 겨우 한 번 건드린다.
    for (let i = 0; i < 3; i += 1) {
      const heading = R.float(0, Math.PI * 2);
      const span = R.float(0.35, 0.85);
      const lane = R.float(0.34, 0.74);
      const life = (t + 0.42 + i * 0.29) % 1;
      const radius = reach * Math.pow(life, 0.8) * lane;
      if (radius < 14) continue;

      const fade = Math.min(1, life / 0.1) * (1 - Math.max(0, (life - 0.62) / 0.38));
      if (fade <= 0.02) continue;

      S.key.line(arc(cx, cy, radius, { spin: t, from: heading, to: heading + span }), { w: 4.2, tone: fade * 0.9 });
    }

    // 떨어진 자리. 진한 통 위에 옅은 통을 겹쳐 거기만 한 단계 더 가라앉힌다. 종이 위에서
    // 유일하게 색이 섞이는 자리이자, 물결이 어디서 났는지 말해 주는 유일한 표다.
    // 가운데 통을 쓰면 파랑에 노랑이 곱해져 초록이 된다 — 여기서 원하는 것은 더 깊은 파랑이다.
    const beat = 1 + 0.12 * Math.sin(t * Math.PI * 2);
    S.key.disc(cx, cy, 8 * beat);
    S.wash.disc(cx, cy, 8 * beat);
  }
};
