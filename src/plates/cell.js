// 현미경으로 들여다본 세포.
//
// 둥근 틀이 곧 접안렌즈의 시야다. 틀 밖은 종이이고, 틀 안은 빛이 고르게 들어온 밝은 시야에
// 물들인 세포가 떠 있다. 시야의 빛과 눈금과 부스러기는 src/scope.js가 깐다.
//
// 세포질은 가운데 통과 옅은 통에 나눠 찍는다. 두 세포가 겹친 자리에서 제3의 색이 난다. 막과
// 핵과 작은 기관, 시야의 눈금은 가장 진한 통이다. 물집 같은 소포는 세포질에서 파낸 구멍이고,
// 핵 안의 인은 진한 통에서만 파내 세포질 색이 비친다.
//
// 모든 움직임은 t에 대해 정확히 한 바퀴다. 세포는 작은 닫힌 길을 돌고, 막은 제자리에서
// 일렁이며, 기관은 세포 안을 한 바퀴 흘러 돈다. 나뉘는 세포는 두 몸이 벌어졌다 붙었다를
// 되풀이한다. 난수는 판을 짤 때 한 번에 다 쓰고, 뽑는 횟수는 t와 무관하다.

import { makeRng } from "../rng.js";
import { splineSubpath } from "../shapes.js";
import { roundel } from "../roundel.js";
import { light, scatter, specks, reticle } from "../scope.js";

// 막. 원에 주기가 다른 물결 둘을 얹는다. phase를 t로 돌리면 막이 제자리에서 일렁인다.
// 두 물결의 빠르기가 정수배라 한 바퀴 끝에서 제 모양으로 돌아온다.
function membrane(cx, cy, radius, { lobes, wobble, phase, squash = 1, tilt = 0, steps = 30 }) {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const points = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius * (1 + wobble * 0.62 * Math.sin(a * lobes + phase) + wobble * 0.38 * Math.sin(a * (lobes + 2) - phase * 2));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * squash;
    points.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return points;
}

// 여러 몸을 한 경로로 채운다. 따로 채우면 나뉘는 세포의 가운데가 두 번 칠해져 진해진다.
function fill(sep, bodies, tone) {
  sep.draw((g) => {
    g.globalAlpha = tone;
    g.beginPath();
    for (const body of bodies) splineSubpath(g, body, true);
    g.fill();
  });
}

export const cell = {
  id: "cell",
  name: "CELL",
  about: "현미경 아래의 세포. 둥근 시야 안에서 떠다니고 일렁이고 나뉜다",

  knobs: [
    { key: "count", label: "COUNT", min: 3, max: 30, step: 1, value: 11 },
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "시야의 씨앗. 종이의 롤은 그대로 두고 세포만 다시 뽑는다" },
    { key: "size", label: "SIZE", min: 0.04, max: 0.16, step: 0.005, value: 0.085 },
    { key: "drift", label: "DRIFT", min: 0, max: 0.04, step: 0.002, value: 0.012, hint: "세포가 한 바퀴 동안 도는 작은 길의 크기" },
    { key: "wobble", label: "WOBBLE", min: 0, max: 0.3, step: 0.01, value: 0.1, hint: "막이 일렁이는 정도" },
    { key: "divide", label: "DIVIDE", min: 0, max: 1, step: 0.05, value: 0.3, hint: "나뉘고 있는 세포의 비율" },
    { key: "tint", label: "TINT", min: 0.2, max: 0.9, step: 0.05, value: 0.5, hint: "세포질을 얼마나 진하게 물들일지" },
    { key: "granules", label: "GRANULES", min: 0, max: 12, step: 1, value: 5, hint: "세포 하나에 든 작은 기관의 수" },
    { key: "debris", label: "DEBRIS", min: 0, max: 120, step: 4, value: 36, hint: "시야에 떠 있는 부스러기" },
    { key: "vignette", label: "VIGNETTE", min: 0, max: 1, step: 0.05, value: 0.5, hint: "시야 가장자리로 갈수록 빛이 죽는 정도" },
    { key: "reticle", label: "RETICLE", min: 0, max: 1, step: 0.05, value: 0.4, hint: "접안렌즈의 눈금. 0이면 없다" },
    { key: "frame", label: "FRAME", min: 0.3, max: 0.5, step: 0.01, value: 0.44, hint: "시야의 반지름" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { count, drift, wobble, divide, tint, granules, debris, vignette } = knobs;

    const turn = t * Math.PI * 2;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;

    // 세포는 제 씨앗으로 굴린다. FIELD는 잉크와 종이결을 건드리지 않고 시야만 다시 뽑는다
    const layout = makeRng((page.seed ^ Math.imul(knobs.field + 1, 0x85ebca6b)) >>> 0);

    light(S, page, ring, vignette);

    // 세포를 놓는다. 후보를 여럿 뽑아 이웃과의 여유가 가장 큰 데로 간다. 조금 겹치는 것은
    // 괜찮다 — 시야 안에서 세포는 서로 기댄다. 시야 밖으로 너무 나가는 자리는 깎는다.
    const limit = ring * 0.93;
    const cells = [];
    for (let i = 0; i < count; i += 1) {
      const r = width * knobs.size * layout.float(0.62, 1.38);
      let spot = null;
      for (let tryAt = 0; tryAt < 24; tryAt += 1) {
        const angle = layout.float(0, Math.PI * 2);
        const dist = Math.sqrt(layout.next()) * limit;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        let room = width;
        for (const other of cells) room = Math.min(room, Math.hypot(other.x - x, other.y - y) - (other.r + r) * 0.82);
        const score = room - Math.max(0, dist + r * 0.4 - limit) * 2;
        if (!spot || score > spot.score) spot = { x, y, score };
      }

      cells.push({
        x: spot.x,
        y: spot.y,
        r,
        drum: layout.chance(0.5) ? "body" : "wash",
        tone: tint * layout.float(0.78, 1.18),
        lobes: layout.int(2, 4),
        wobble: wobble * layout.float(0.6, 1.3),
        phase: layout.float(0, Math.PI * 2),
        squash: layout.float(0.78, 1.12),
        tilt: layout.float(0, Math.PI * 2),
        path: {
          ax: layout.float(0.4, 1),
          ay: layout.float(0.4, 1),
          fx: layout.int(1, 2),
          fy: layout.int(1, 2),
          px: layout.float(0, Math.PI * 2),
          py: layout.float(0, Math.PI * 2)
        },
        nucleus: {
          dx: layout.float(-0.22, 0.22),
          dy: layout.float(-0.22, 0.22),
          size: layout.float(0.3, 0.44),
          tone: layout.float(0.72, 0.92),
          phase: layout.float(0, Math.PI * 2)
        },
        splits: layout.chance(divide),
        axis: layout.float(0, Math.PI),
        granules: Array.from({ length: granules }, () => ({
          angle: layout.float(0, Math.PI * 2),
          dist: layout.float(0.42, 0.78),
          size: layout.float(0.06, 0.12),
          spin: layout.chance(0.5) ? 1 : -1,
          phase: layout.float(0, Math.PI * 2)
        })),
        vesicles: Array.from({ length: layout.int(1, 3) }, () => ({
          angle: layout.float(0, Math.PI * 2),
          dist: layout.float(0.35, 0.7),
          size: layout.float(0.08, 0.15)
        }))
      });
    }

    const dust = scatter(layout, debris, limit, cx, cy);

    // 큰 것부터 깐다. 작은 세포가 큰 세포 위에 앉는다
    cells.sort((a, b) => b.r - a.r);

    for (const cell of cells) {
      const { path } = cell;
      const x = cell.x + Math.cos(turn * path.fx + path.px) * drift * path.ax * width;
      const y = cell.y + Math.sin(turn * path.fy + path.py) * drift * path.ay * width;
      const tilt = cell.tilt + Math.sin(turn + cell.phase) * 0.08;
      const look = { lobes: cell.lobes, wobble: cell.wobble, phase: cell.phase + turn, squash: cell.squash, tilt };
      const plasm = S[cell.drum];

      // 몸과 핵의 자리. 나뉘는 세포는 두 몸이 축을 따라 벌어졌다 붙었다 한다
      let bodies;
      let nuclei;
      let reach;
      if (cell.splits) {
        const pull = cell.r * (0.42 + 0.1 * Math.sin(turn + cell.phase));
        const ax = Math.cos(cell.axis) * pull;
        const ay = Math.sin(cell.axis) * pull;
        bodies = [
          membrane(x - ax, y - ay, cell.r * 0.72, look),
          membrane(x + ax, y + ay, cell.r * 0.72, { ...look, phase: look.phase + 1.7 })
        ];
        nuclei = [
          [x - ax, y - ay, cell.r * cell.nucleus.size * 0.78],
          [x + ax, y + ay, cell.r * cell.nucleus.size * 0.78]
        ];
        reach = 0.64;
      } else {
        bodies = [membrane(x, y, cell.r, look)];
        nuclei = [[x + cell.nucleus.dx * cell.r, y + cell.nucleus.dy * cell.r, cell.r * cell.nucleus.size]];
        reach = 1;
      }

      // 세포 안의 한 자리. 세포와 같이 눌리고 같이 기운다
      const inside = (angle, dist) => {
        const lx = Math.cos(angle) * dist * cell.r;
        const ly = Math.sin(angle) * dist * cell.r * cell.squash;
        return [x + lx * Math.cos(tilt) - ly * Math.sin(tilt), y + lx * Math.sin(tilt) + ly * Math.cos(tilt)];
      };

      // 세포질, 그리고 거기서 파낸 소포
      fill(plasm, bodies, Math.min(1, cell.tone));
      plasm.knockout((sep) => {
        for (const vesicle of cell.vesicles) {
          const [vx, vy] = inside(vesicle.angle + turn, vesicle.dist * reach);
          sep.disc(vx, vy, vesicle.size * cell.r);
        }
      });

      // 막. 망점 셀보다 가늘면 점선으로 부서지므로 한 셀은 덮게 긋는다
      const edge = Math.max(4.5, cell.r * 0.055);
      for (const body of bodies) S.key.line(body, { w: edge, tone: 0.85, close: true });

      // 작은 기관. 세포 안을 한 바퀴 흘러 돈다
      for (const granule of cell.granules) {
        const a = granule.angle + turn * granule.spin;
        const [gx, gy] = inside(a, granule.dist * reach);
        const size = granule.size * cell.r;
        S.key.shape(membrane(gx, gy, size, { lobes: 2, wobble: 0.12, phase: granule.phase + turn, squash: 0.45, tilt: a + tilt + Math.PI / 2, steps: 12 }), { tone: 0.55 });
      }

      // 핵과 인. 인은 진한 통에서만 파내 세포질 색이 비친다
      for (const [nx, ny, size] of nuclei) {
        S.key.shape(membrane(nx, ny, size, { lobes: 3, wobble: 0.08, phase: cell.nucleus.phase - turn, squash: 0.9, tilt }), { tone: cell.nucleus.tone });
        S.key.knockout((sep) => sep.disc(nx + size * 0.28, ny - size * 0.22, size * 0.24));
      }
    }

    specks(S, dust, turn);
    reticle(S, page, ring, knobs.reticle);
    roundel(S, page, ring);
  }
};
