// 어두운 물을 밝은 것들이 올라간다.
//
// 흰 잉크가 없으므로 빛나는 것은 전부 파낸 자리다. 물을 깔고, 종 모양으로 파내고, 그 안에만
// 옅은 통을 얹는다. 물 위에 밝은 잉크를 칠하는 방법은 없다 — 곱하기는 언제나 더 어둡게만
// 만든다.
//
// 오르는 것처럼 보이려면 해파리가 아니라 물이 움직여야 한다. 해파리가 실제로 올라가면 한
// 바퀴 끝에서 제자리로 돌아오느라 튄다. 티끌을 아래로 흘려 보내면 같은 말을 하면서 이어진다.
//
// 여러 마리는 깊이로 벌린다. 멀수록 작고 흐리고 위에 있다. 먼 것부터 찍고 가까운 것이 그
// 위를 덮으므로, 가까운 놈의 녹아웃이 먼 놈을 지워 가림이 저절로 생긴다.

import { makeNoise2 } from "../rng.js";

// 종. 위는 둥근 지붕, 아래는 살짝 들린 가리비 테두리.
function bell(cx, cy, rx, ry, options = {}) {
  const { steps = 44, scallops = 6 } = options;
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const angle = Math.PI - (Math.PI * i) / steps;
    points.push([cx + Math.cos(angle) * rx, cy - Math.sin(angle) * ry]);
  }
  for (let i = steps - 1; i >= 1; i -= 1) {
    const u = i / steps;
    const lift = Math.sin(u * Math.PI) * ry * 0.26;
    const scallop = Math.sin(u * Math.PI * scallops) * ry * 0.05;
    points.push([cx + Math.cos(Math.PI - u * Math.PI) * rx, cy - lift + scallop]);
  }
  return points;
}

export const jelly = {
  id: "jelly",
  name: "JELLY",
  about: "어두운 물을 올라가는 빛들. 밝은 것은 전부 파낸 자리다",

  knobs: [
    { key: "count", label: "COUNT", min: 1, max: 9, step: 1, value: 5 },
    { key: "bell", label: "BELL", min: 0.05, max: 0.26, step: 0.01, value: 0.13 },
    { key: "depth", label: "DEPTH", min: 0, max: 0.8, step: 0.05, value: 0.55 },
    { key: "pulse", label: "PULSE", min: 0, max: 0.35, step: 0.01, value: 0.06 },
    // 한 바퀴에 몇 번 뛰는가. 정수여야 한 바퀴 끝에서 제자리로 돌아온다
    { key: "throb", label: "THROB", min: 1, max: 4, step: 1, value: 2 },
    { key: "drift", label: "DRIFT", min: 0, max: 0.06, step: 0.005, value: 0.012 },
    { key: "tentacles", label: "TENTACLES", min: 0, max: 20, step: 1, value: 9 },
    { key: "trail", label: "TRAIL", min: 0.1, max: 0.7, step: 0.01, value: 0.3 },
    { key: "wobble", label: "WOBBLE", min: 0, max: 1.6, step: 0.05, value: 0.45 },
    { key: "arms", label: "ARMS", min: 0, max: 6, step: 1, value: 3 },
    { key: "motes", label: "MOTES", min: 0, max: 120, step: 5, value: 45 },
    { key: "deep", label: "DEEP", min: 0.2, max: 1, step: 0.05, value: 0.85 }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { count, pulse, throb, drift, tentacles, arms, motes, deep, wobble } = knobs;

    const turn = t * Math.PI * 2;

    // 물. 위가 깊고 아래로 갈수록 옅어진다
    S.key.ramp(0, 0, width, height, { from: deep, to: deep * 0.22 });
    S.wash.ramp(0, 0, width, height, { from: deep * 0.5, to: 0.06 });

    // 티끌. 아래로 흘러 해파리가 오르는 것처럼 보이게 한다. 물을 찍은 두 통에서 모두 파낸다.
    // 속도는 한 바퀴에 한 번이나 두 번 — 실수로 주면 t=1에서 제자리로 돌아오지 않아 튄다.
    const specks = [];
    for (let i = 0; i < motes; i += 1) {
      const x = R.float(0, width);
      const lane = R.float(0, 1);
      const size = R.float(1.4, 4.2);
      const speed = R.int(1, 2);
      specks.push([x, ((lane + t * speed) % 1) * (height + 60) - 30, size]);
    }
    for (const drum of [S.key, S.wash]) {
      drum.knockout((sep) => {
        for (const [x, y, size] of specks) sep.disc(x, y, size);
      });
    }

    // 무리를 짠다. 난수는 여기서 다 쓰고 그리는 동안에는 쓰지 않는다 — 그리기는 먼 것부터
    // 도는데 거기서 난수를 당기면 마리 수를 바꿀 때마다 무리 전체가 다시 뽑힌다.
    // 밭 둘. 하나는 어디에 모일지, 하나는 얼마나 클지를 정한다. 서로 다른 밭이라야 크기가
    // 자리를 따라가지 않는다 — 같은 밭에서 뽑으면 가운데가 늘 크고 가장자리가 늘 작아져,
    // 규칙이 눈에 먼저 읽힌다.
    const placeField = makeNoise2(R);
    const sizeField = makeNoise2(R);

    const swarm = [];
    for (let i = 0; i < count; i += 1) {
      // 자리는 후보를 여러 개 뽑아 가장 점수가 높은 데로 간다. 점수는 셋을 더한 것이다 —
      // 가운데로 당기는 기운, 밭이 뭉쳐 있는 정도, 이미 놓인 놈에게서 떨어진 정도.
      let spot = null;
      for (let tryAt = 0; tryAt < 14; tryAt += 1) {
        const x = R.float(width * 0.1, width * 0.9);
        const y = R.float(height * 0.14, height * 0.86);
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
      const size = width * knobs.bell * (1 - far * knobs.depth) * R.float(0.88, 1.12);

      const spec = {
        far,
        size,
        x: spot.x,
        y: spot.y,
        phase: R.float(0, Math.PI * 2),
        show: 1 - far * 0.55,
        strands: [],
        ribbons: []
      };

      const strandCount = Math.round(tentacles * (1 - far * 0.35));
      for (let k = 0; k < strandCount; k += 1) {
        spec.strands.push({
          at: strandCount === 1 ? 0.5 : k / (strandCount - 1),
          length: height * knobs.trail * R.float(0.45, 1.3) * (1 - far * 0.4),
          amp: wobble * R.float(0.35, 0.95),
          phase: R.float(0, Math.PI * 2),
          curl: R.float(3.2, 6.4),
          lean: R.float(-0.5, 0.5),
          weight: R.float(1.6, 3) * (1 - far * 0.45)
        });
      }

      const ribbonCount = Math.round(arms * (1 - far * 0.4));
      for (let k = 0; k < ribbonCount; k += 1) {
        spec.ribbons.push({
          offset: ribbonCount === 1 ? 0 : (k / (ribbonCount - 1) - 0.5) * 1.1,
          length: height * knobs.trail * R.float(0.3, 0.55) * (1 - far * 0.4),
          amp: wobble * R.float(0.3, 0.7),
          phase: R.float(0, Math.PI * 2),
          weight: (7 - 3 * (k % 2)) * (1 - far * 0.45)
        });
      }

      swarm.push(spec);
    }

    // 먼 것부터. 가까운 놈의 녹아웃이 먼 놈을 지우므로 가림이 저절로 생긴다
    swarm.sort((a, b) => b.far - a.far);

    for (const one of swarm) {
      const beat = Math.sin(turn * throb + one.phase);
      const cx = one.x;
      const cy = one.y + Math.sin(turn + one.phase) * height * drift;
      const rx = one.size * (1 - pulse * beat);
      const ry = one.size * 0.94 * (1 + pulse * beat * 0.9);

      const dome = bell(cx, cy, rx, ry);

      // 빛은 한 번에 파내지 않는다. 바깥 테를 옅게 파고 안으로 갈수록 깊이 판다.
      // 한 번에 다 파내면 오려 붙인 스티커가 된다.
      const glow = [
        [1.34, 0.2],
        [1.2, 0.35],
        [1.09, 0.6],
        [1, 1]
      ];
      for (const drum of [S.key, S.wash, S.body]) {
        drum.knockout((sep) => {
          for (const [spread, tone] of glow) {
            sep.shape(bell(cx, cy, rx * spread, ry * spread), { tone: tone * one.show });
          }
        });
      }

      S.body.shape(dome, { tone: 0.32 * one.show });
      S.key.line(dome, { w: 2.8 * (1 - one.far * 0.4), tone: 0.8 * one.show, close: true });

      // 촉수. 파동이 아래로 번져 가므로 끝이 말린다
      for (const strand of one.strands) {
        const x0 = cx + (strand.at * 2 - 1) * rx * 0.94;
        const y0 = cy - Math.sin(strand.at * Math.PI) * ry * 0.26;
        const points = [];
        for (let s = 0; s <= 26; s += 1) {
          const along = s / 26;
          const wave = Math.sin(turn - along * strand.curl + strand.phase + one.phase) * rx * strand.amp * Math.pow(along, 1.5);
          const sweep = strand.lean * rx * along * along;
          points.push([x0 + wave + sweep, y0 + along * strand.length]);
        }
        S.key.line(points, { w: strand.weight, tone: 0.82 * one.show });
      }

      // 구완. 가운데에서 내려오는 두꺼운 주름
      for (const ribbon of one.ribbons) {
        const points = [];
        for (let s = 0; s <= 18; s += 1) {
          const along = s / 18;
          const swing = Math.sin(turn - along * 2.8 + ribbon.phase + one.phase) * rx * ribbon.amp * Math.pow(along, 1.3);
          points.push([cx + ribbon.offset * rx + swing, cy + along * ribbon.length]);
        }
        S.body.line(points, { w: ribbon.weight, tone: 0.55 * one.show });
        S.key.line(points, { w: 2 * (1 - one.far * 0.4), tone: 0.5 * one.show });
      }
    }
  }
};
