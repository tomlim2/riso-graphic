// 물결 하나.
//
// 종이가 거의 그대로 남아야 한다. 고리 두어 개, 다 그려지지 않고 조각만 남은 호, 두 통이
// 비껴 찍은 가운데 점 하나. 그게 전부다. 면을 채우면 물결은 무늬가 되고, 무늬가 되면 퍼지는
// 것으로 보이지 않는다. 비어 있는 종이가 물이다.
//
// t가 0에서 1로 한 바퀴 도는 동안 고리가 나고, 퍼지고, 진다. 어디서 끊어도 이어지려면
// 이 판 안의 모든 주기가 t에 대해 정확히 한 바퀴여야 하고, 난수를 뽑는 횟수가 t에 따라
// 달라져서도 안 된다.
//
// 떨어진 자리는 DROPS만큼이다. 첫 자리는 언제나 가운데이고 롤의 난수를 그대로 쓴다. 둘째부터는
// 따로 굴린 난수로 자리와 크기와 박자를 정한다 — 그래야 자리를 늘려도 첫 물결이 그대로다. 뒤의
// 자리는 조금 작고, 제 박자로 퍼진다. 이미 놓인 자리에서 가장 먼 곳을 골라 서로 너무 붙지 않는다.
// FIELD는 그 자리의 씨앗이다. 종이의 롤은 그대로 두고 둘째부터의 자리만 다시 뽑는다.

import * as shapes from "../shapes.js";
import { makeRng } from "../rng.js";

// 한 바퀴, 또는 그 일부. from/to를 주면 부서진 호가 된다.
//
// 흔들림 두 겹은 서로 반대로 돈다. 둘 다 t에 대해 정수 바퀴여야 한 바퀴 끝에서 제 모양으로
// 돌아온다. 두 번째 겹이 한 바퀴에 1.5번 돌던 때는 끝에서 고리가 1픽셀 남짓 튀었다.
function arc(cx, cy, radius, options = {}) {
  const { steps = 96, squash = 0.94, lobes = 3, lobesB = 5, amp = 0.006, spin = 0, from = 0, to = Math.PI * 2 } = options;
  const turn = spin * Math.PI * 2;
  const points = [];
  const span = to - from;
  const count = Math.max(6, Math.round((steps * Math.abs(span)) / (Math.PI * 2)));

  for (let i = 0; i <= count; i += 1) {
    const theta = from + (span * i) / count;
    const wobble = 1 + amp * Math.sin(lobes * theta + turn) + amp * 0.55 * Math.sin(lobesB * theta - turn * 2);
    points.push([cx + Math.cos(theta) * radius * wobble, cy + Math.sin(theta) * radius * wobble * squash]);
  }
  return points;
}

// 물결 하나. 고리, 부서진 호, 떨어진 자리를 찍는다. 난수는 넘겨받은 흐름에서 언제나 같은
// 수만큼 쓴다
function drop(S, rng, t, { cx, cy, reach, weight, dot }, knobs) {
  const { rings, ease: easeBase, arcs: arcCount, squash, offset } = knobs;

  // 고리. 실선 한 겹뿐이고 굵기는 반지름을 따라가지 않는다
  for (let i = 0; i < rings; i += 1) {
    const jitter = rng.float(-0.1, 0.1);
    const ease = easeBase + rng.float(-0.06, 0.06);
    const life = (t + (i + jitter) / rings + 1) % 1;
    const radius = reach * Math.pow(life, ease);
    if (radius < 8) continue;

    // 끝까지 살아 있다가 마지막에만 진다. 큰 고리가 다 자란 모습을 보여 주려면 그래야 한다
    const fade = Math.min(1, life / 0.06) * (1 - Math.max(0, (life - 0.8) / 0.2));
    if (fade <= 0.02) continue;

    // 망점 셀보다 가는 선은 살아남지 못한다. 점선으로 부서져 실선으로 읽히지 않으므로
    // 한 셀은 너끈히 덮을 굵기로 긋는다. 리소 실선이 실제로 그만큼 굵기도 하다.
    S.key.line(arc(cx, cy, radius, { spin: t, squash }), { w: weight - weight * 0.21 * life, tone: fade, close: true });
  }

  // 부서진 호. 고리 하나가 다 찍히지 못하고 조각만 남은 것 — 판이 종이에 덜 닿은 자리다.
  // 안쪽에 낮게 깔려, 다 자란 고리와 가운데 점 사이의 빈 곳을 겨우 한 번 건드린다.
  for (let i = 0; i < arcCount; i += 1) {
    const heading = rng.float(0, Math.PI * 2);
    const span = rng.float(0.35, 0.85);
    const lane = rng.float(0.34, 0.74);
    const life = (t + 0.42 + i * 0.29) % 1;
    const radius = reach * Math.pow(life, easeBase) * lane;
    if (radius < 14) continue;

    const fade = Math.min(1, life / 0.1) * (1 - Math.max(0, (life - 0.62) / 0.38));
    if (fade <= 0.02) continue;

    S.key.line(arc(cx, cy, radius, { spin: t, squash, from: heading, to: heading + span }), { w: weight * 0.75, tone: fade * 0.9 });
  }

  // 떨어진 자리. 종이 위에서 유일하게 색이 섞이는 자리이자, 물결이 어디서 났는지 말해 주는
  // 유일한 표다.
  //
  // 두 통이 같은 모양을 조금씩 비껴 찍는다. 한 통씩만 찍힌 초승달 둘과 그 사이의 겹친 자리가
  // 함께 보여야 두 잉크로 읽힌다. 정확히 포개면 확대했을 때 두 망점이 뒤섞인 얼룩일 뿐이다.
  // 짝은 가운데 통이다. 가장 옅은 통은 배색에 따라 종이와 거의 같아 초승달이 보이지 않는다.
  //
  // 모양은 손으로 오린 듯 둘이 조금씩 다르고 세로로 살짝 길다. 비끼는 방향은 롤이 정하되
  // 대개 아래쪽이다 — 진한 통이 위, 가운데 통이 아래. 난수는 모양과 방향에 한 번씩만 쓴다.
  if (dot > 0) {
    const beat = 1 + 0.12 * Math.sin(t * Math.PI * 2);
    const size = dot * beat;
    const heading = rng.around(Math.PI * 0.45, 0.35);
    const dx = (Math.cos(heading) * size * offset) / 2;
    const dy = (Math.sin(heading) * size * offset) / 2;
    const cut = { lobes: 3, wobble: 0.07, squash: 1.1 };
    S.key.shape(shapes.blob(rng, cx - dx, cy - dy, size, cut));
    S.body.shape(shapes.blob(rng, cx + dx, cy + dy, size, cut));
  }
}

export const ripple = {
  id: "ripple",
  name: "RIPPLE",
  about: "고리 몇 개와 부서진 호. 나머지는 종이다",

  // 이 판이 스스로 내놓는 손잡이. 화면은 목록을 보고 조절칸을 짓는다.
  // RINGS를 올릴 때는 조심할 것 — 고리 수 × 잡는 프레임 ÷ 48이 0.5를 넘으면 물결이
  // 거꾸로 돈다. 초당 여덟 장에서 그 경계는 여덟이다.
  knobs: [
    { key: "rings", label: "RINGS", min: 1, max: 10, step: 1, value: 3 },
    { key: "reach", label: "REACH", min: 0.15, max: 0.75, step: 0.01, value: 0.42 },
    { key: "ease", label: "EASE", min: 0.45, max: 1.3, step: 0.05, value: 0.8 },
    { key: "arcs", label: "ARCS", min: 0, max: 8, step: 1, value: 3 },
    { key: "weight", label: "WEIGHT", min: 1.5, max: 12, step: 0.1, value: 5.6 },
    { key: "squash", label: "SQUASH", min: 0.4, max: 1, step: 0.02, value: 0.94 },
    { key: "dot", label: "DOT", min: 0, max: 24, step: 1, value: 15 },
    { key: "offset", label: "OFFSET", min: 0, max: 1.2, step: 0.05, value: 0.7, hint: "가운데 점의 두 통을 비껴 찍는 거리. 점 반지름에 대한 비율이고 0이면 포갠다" },
    { key: "drops", label: "DROPS", min: 1, max: 12, step: 1, value: 1, hint: "물결이 시작되는 자리의 수. 둘째부터는 조금 작고 제 박자로 퍼진다" },
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "물결 자리의 씨앗. 종이의 롤은 그대로 두고 둘째부터의 자리와 크기와 박자만 다시 뽑는다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 바탕은 깔지 않는다. 흰 종이가 그대로 물이다. 예전에는 가장 옅은 통을 판 전체에 옅게
    // 깔았는데, 노랑 계열 배색에서는 그 한 겹이 흰 종이를 도로 누렇게 덮었다.
    const cx = width * 0.5;
    const cy = height * 0.47;
    const reach = width * knobs.reach;
    drop(S, R, t, { cx, cy, reach, weight: knobs.weight, dot: knobs.dot }, knobs);

    // 둘째 자리부터. 후보를 여럿 뽑아 이미 놓인 자리에서 가장 먼 곳에 둔다
    const count = Math.round(knobs.drops);
    if (count > 1) {
      const field = Math.imul(knobs.field, 0x85ebca6b);
      const scatter = makeRng((page.seed ^ 0x7c3a9d1b ^ field) >>> 0);
      const margin = width * 0.1;
      const spots = [[cx, cy]];
      for (let i = 1; i < count; i += 1) {
        let best = null;
        for (let tryAt = 0; tryAt < 16; tryAt += 1) {
          const x = scatter.float(margin, width - margin);
          const y = scatter.float(margin, height - margin);
          const room = Math.min(...spots.map(([sx, sy]) => Math.hypot(sx - x, sy - y)));
          if (!best || room > best.room) best = { x, y, room };
        }
        spots.push([best.x, best.y]);
        const scale = scatter.float(0.35, 0.8);
        const phase = scatter.next();
        const hand = makeRng((page.seed ^ field ^ Math.imul(i, 0x9e3779b9)) >>> 0);
        drop(S, hand, (t + phase) % 1, {
          cx: best.x,
          cy: best.y,
          reach: reach * scale,
          weight: knobs.weight * (0.6 + 0.4 * scale),
          dot: knobs.dot * scale
        }, knobs);
      }
    }
  }
};
