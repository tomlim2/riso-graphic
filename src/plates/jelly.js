// 어두운 물을 밝은 것 하나가 올라간다.
//
// 흰 잉크가 없으므로 빛나는 것은 전부 파낸 자리다. 물을 깔고, 종이 모양으로 파내고, 그
// 안에만 옅은 통을 얹는다. 물 위에 밝은 잉크를 칠하는 방법은 없다 — 곱하기는 언제나 더
// 어둡게만 만든다.
//
// 오르는 것처럼 보이려면 해파리가 아니라 물이 움직여야 한다. 해파리가 실제로 올라가면 한
// 바퀴 끝에서 제자리로 돌아오느라 튄다. 티끌을 아래로 흘려 보내면 같은 말을 하면서 이어진다.

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
  about: "어두운 물을 올라가는 빛. 밝은 것은 전부 파낸 자리다",

  knobs: [
    { key: "bell", label: "BELL", min: 0.08, max: 0.3, step: 0.01, value: 0.17 },
    { key: "pulse", label: "PULSE", min: 0, max: 0.35, step: 0.01, value: 0.06 },
    // 한 바퀴에 몇 번 뛰는가. 정수여야 한 바퀴 끝에서 제자리로 돌아온다
    { key: "throb", label: "THROB", min: 1, max: 4, step: 1, value: 2 },
    { key: "drift", label: "DRIFT", min: 0, max: 0.06, step: 0.005, value: 0.012 },
    { key: "tentacles", label: "TENTACLES", min: 0, max: 24, step: 1, value: 11 },
    { key: "trail", label: "TRAIL", min: 0.1, max: 0.7, step: 0.01, value: 0.38 },
    { key: "wobble", label: "WOBBLE", min: 0, max: 1.6, step: 0.05, value: 0.45 },
    { key: "arms", label: "ARMS", min: 0, max: 6, step: 1, value: 4 },
    { key: "motes", label: "MOTES", min: 0, max: 120, step: 5, value: 45 },
    { key: "deep", label: "DEEP", min: 0.2, max: 1, step: 0.05, value: 0.85 }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { pulse, throb, drift, tentacles, arms, motes, deep, wobble } = knobs;

    const turn = t * Math.PI * 2;
    const cx = width * 0.5;
    const cy = height * 0.4 + Math.sin(turn) * height * drift;

    // 종이 뛴다. 오므리면 좁고 길어지고 펴면 넓고 납작해진다 — 부피는 얼추 지킨다.
    // 세기(PULSE)와 빠르기(THROB)를 따로 둔 것은 둘이 다른 것이기 때문이다. 크게 한 번
    // 천천히 뛰는 것과 작게 여러 번 떠는 것은 같은 값으로 묶일 수 없다.
    const beat = Math.sin(turn * throb);
    const base = width * knobs.bell;
    const rx = base * (1 - pulse * beat);
    const ry = base * 0.94 * (1 + pulse * beat * 0.9);

    // 물. 위가 깊고 아래로 갈수록 옅어진다
    S.key.ramp(0, 0, width, height, { from: deep, to: deep * 0.22 });
    S.wash.ramp(0, 0, width, height, { from: deep * 0.5, to: 0.06 });

    // 티끌. 아래로 흘러 해파리가 오르는 것처럼 보이게 한다. 물을 찍은 두 통에서 모두 파낸다
    const motesAt = [];
    for (let i = 0; i < motes; i += 1) {
      const x = R.float(0, width);
      const lane = R.float(0, 1);
      const size = R.float(1.4, 4.2);
      // 한 바퀴에 정확히 한 번 또는 두 번 건넌다. 실수로 주면 t=1에서 제자리로 돌아오지
      // 않아 티끌이 통째로 튄다 — 판 안의 모든 주기는 t에 대해 한 바퀴여야 한다.
      const speed = R.int(1, 2);
      const y = ((lane + t * speed) % 1) * (height + 60) - 30;
      motesAt.push([x, y, size]);
    }
    for (const drum of [S.key, S.wash]) {
      drum.knockout((sep) => {
        for (const [x, y, size] of motesAt) sep.disc(x, y, size);
      });
    }

    // 종 자리를 물에서 파낸다. 그래야 종이가 드러나고, 그 위에 얹는 옅은 통이 빛으로 보인다.
    //
    // 한 번에 다 파내면 종이가 오려 붙인 스티커처럼 보인다. 녹아웃도 톤을 받으므로, 바깥
    // 테를 옅게 파고 안으로 갈수록 깊이 판다. 빛이 번지는 것은 세기가 아니라 가장자리다.
    const dome = bell(cx, cy, rx, ry);
    const glow = [
      [1.34, 0.2],
      [1.2, 0.35],
      [1.09, 0.6],
      [1, 1]
    ].map(([spread, tone]) => [bell(cx, cy, rx * spread, ry * spread), tone]);

    for (const drum of [S.key, S.wash]) {
      drum.knockout((sep) => {
        for (const [shape, tone] of glow) sep.shape(shape, { tone });
      });
    }

    // 빛. 파낸 자리 안쪽에만 옅은 통을 얹어 갓 아래가 비치게 한다
    S.body.shape(dome, { tone: 0.32 });
    S.key.line(dome, { w: 2.8, tone: 0.8, close: true });

    // 촉수. 아래로 갈수록 크게 흔들리고, 흔들림이 아래로 번져 간다
    const trail = height * knobs.trail;
    for (let i = 0; i < tentacles; i += 1) {
      const u = tentacles === 1 ? 0.5 : i / (tentacles - 1);
      const x0 = cx + (u * 2 - 1) * rx * 0.94;
      const y0 = cy - Math.sin(u * Math.PI) * ry * 0.26;
      const length = trail * R.float(0.45, 1.3);
      // 흔들림의 크기는 손잡이가 정한다. 0이면 곧게 늘어지고, 올릴수록 크게 굽이친다.
      const amp = rx * wobble * R.float(0.35, 0.95);
      const phase = R.float(0, Math.PI * 2);
      const curl = R.float(3.2, 6.4); // 흔들림이 아래로 번져 가는 빠르기. 클수록 말린다
      const lean = R.float(-0.5, 0.5);
      const weight = R.float(1.6, 3);
      const points = [];

      // 파동이 아래로 번져 가므로 끝이 말린다. 아래로 갈수록 크게 흔들리고, 전체가 한쪽으로
      // 흐르면서 늘어진다 — 곧게 내리면 촉수가 아니라 실이 된다.
      for (let s = 0; s <= 26; s += 1) {
        const along = s / 26;
        const wave = Math.sin(turn - along * curl + phase) * amp * Math.pow(along, 1.5);
        const sweep = lean * rx * along * along;
        points.push([x0 + wave + sweep, y0 + along * length]);
      }
      S.key.line(points, { w: weight, tone: 0.82 });
    }

    // 구완. 가운데에서 내려오는 두꺼운 주름. 촉수보다 짧고 굵다
    for (let i = 0; i < arms; i += 1) {
      const offset = arms === 1 ? 0 : (i / (arms - 1) - 0.5) * rx * 1.1;
      const length = trail * R.float(0.3, 0.55);
      const amp = rx * wobble * R.float(0.3, 0.7);
      const phase = R.float(0, Math.PI * 2);
      const points = [];

      for (let s = 0; s <= 18; s += 1) {
        const along = s / 18;
        const swing = Math.sin(turn - along * 2.8 + phase) * amp * Math.pow(along, 1.3);
        points.push([cx + offset + swing, cy + along * length]);
      }
      S.body.line(points, { w: 7 - 3 * (i % 2), tone: 0.55 });
      S.key.line(points, { w: 2, tone: 0.5 });
    }
  }
};
