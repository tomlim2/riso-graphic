// 공초점 현미경으로 들여다본 바이러스 입자.
//
// 받은 사진처럼 어두운 푸른 시야에 입자가 빛난다. 시야는 COSMOS·FLAKE처럼 깐다 — 노랗지 않은 통이
// 밤이 되어 바닥을 깔고(src/drums.js), 빛나는 것은 전부 파낸다. 흰 잉크가 없고 곱하기는 어둡게만
// 만들기 때문이다. 빛은 가장 파란 통을 덜 파내 흰빛보다 하늘빛이 돌게 하고, 가장 밝은 끝만 모든 밤을
// 거의 끝까지 파낸다.
//
//   가시     입자를 빽빽하게 두른 곤봉. 줄기는 옅게, 머리는 끝까지 파내 끝이 가장 밝다. 머리는 둥글거나
//            가로로 납작하고, 넷에 하나는 이쪽을 향해 짧아 보이며 앞면에서 솟는다
//   몸       앞면은 밤을 절반쯤 파낸 푸른 원이고 테가 밝다. 둘레에 빛이 번진다. 한가운데는 밤을 도로
//            얹어 짙은 속이 된다
//   컵       짙은 속을 둘러 앞을 보는 가시 머리들이 옅은 원으로 박힌다. 원 속은 다시 어둡다(CUPS)
//   흐린 입자 초점 밖에 있는 것. 크게 번진 옅은 원에 속이 조금 어둡다(DEPTH)
//   바탕     한가운데가 조금 밝고, 빛 번짐 몇과 작은 빛 알갱이가 뜬다(MOTES)
//
// 움직임은 입자마다 따로다. 저마다 작은 닫힌 길을 돌고 제자리에서 조금씩 기울며, 가시는 저마다 다른
// 박자로 늘었다 줄고 까딱인다. 다 같이 한쪽으로 흐르는 것은 없다. 박자는 모두 한 바퀴에 정수 번이다.
// 난수는 입자마다 같은 수만큼 뽑고, 손잡이는 그중 몇을 쓸지만 정한다. 빛 알갱이와 빛 번짐은 입자를
// 다 뽑은 뒤에 뽑는다.
//
// 0.32.0까지의 CELL — 흰 시야에 물들인 세포가 일렁이고 나뉘던 판 — 은 git 기록에 남아 있다.

import { makeRng, fieldSeed } from "../rng.js";
import { circleSubpath } from "../shapes.js";
import { roundel } from "../roundel.js";
import { SCOPE_KNOBS, dim, scatter } from "../scope.js";
import { nightAndLight, bluest } from "../drums.js";
import { floodNight, carve, stain } from "../night.js";

const TAU = Math.PI * 2;
const MOST_SPIKES = 80;
const MOST_CUPS = 12;
const GRAINS = 20;
const GLOWS = 6;

// 입자 하나에 필요한 난수를 모두, 언제나 같은 수만큼 뽑는다
function makeParticle(layout, spot, r) {
  return {
    x: spot.x,
    y: spot.y,
    r,
    blur: layout.next(),
    tone: layout.float(0.8, 1.15),
    path: {
      ax: layout.float(0.4, 1),
      ay: layout.float(0.4, 1),
      fx: layout.int(1, 2),
      fy: layout.int(1, 2),
      px: layout.float(0, TAU),
      py: layout.float(0, TAU)
    },
    spin: { base: layout.float(0, TAU), beat: layout.int(1, 2), phase: layout.float(0, TAU) },
    spikes: Array.from({ length: MOST_SPIKES }, () => {
      const shift = layout.float(-0.35, 0.35);
      const length = layout.float(0.65, 1.2);
      const facing = layout.next();
      const shorten = layout.float(0.35, 0.7);
      return {
        shift,
        facing: facing < 0.25,
        length: length * (facing < 0.25 ? shorten : 1),
        head: layout.next(),
        beat: layout.int(1, 3),
        phase: layout.float(0, TAU)
      };
    }),
    cups: Array.from({ length: MOST_CUPS }, () => ({
      shift: layout.float(-0.25, 0.25),
      dist: layout.float(0.45, 0.72),
      size: layout.float(0.08, 0.12)
    })),
    grains: Array.from({ length: GRAINS }, () => [layout.float(0, TAU), Math.sqrt(layout.next()) * 0.9, layout.float(1.8, 3)])
  };
}

export const cell = {
  id: "cell",
  name: "CELL",
  about: "공초점 현미경 아래의 바이러스 입자. 어두운 시야에 가시 두른 입자가 저마다 빛나며 까딱인다",

  knobs: [
    { key: "count", label: "COUNT", min: 3, max: 30, step: 1, value: 9 },
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "시야의 씨앗. 종이의 롤은 그대로 두고 입자만 다시 뽑는다" },
    { key: "size", label: "SIZE", min: 0.04, max: 0.16, step: 0.005, value: 0.1, hint: "입자의 크기" },
    { key: "spikes", label: "SPIKES", min: 0, max: MOST_SPIKES, step: 1, value: 56, hint: "입자 하나를 두른 가시의 수" },
    { key: "length", label: "LENGTH", min: 0.1, max: 0.5, step: 0.01, value: 0.3, hint: "가시의 길이. 입자 반지름에 대한 비율" },
    { key: "cups", label: "CUPS", min: 0, max: MOST_CUPS, step: 1, value: 8, hint: "짙은 속을 둘러 앞을 보는 가시 머리의 수" },
    { key: "depth", label: "DEPTH", min: 0, max: 0.7, step: 0.05, value: 0.5, hint: "초점이 맞지 않아 흐린 입자의 비율" },
    { key: "drift", label: "DRIFT", min: 0, max: 0.04, step: 0.002, value: 0.008, hint: "입자가 한 바퀴 동안 도는 작은 길의 크기" },
    { key: "spin", label: "SPIN", min: 0, max: 1, step: 0.05, value: 0.4, hint: "입자가 제자리에서 기울고 가시가 떠는 정도" },
    { key: "glow", label: "GLOW", min: 0.3, max: 1, step: 0.05, value: 0.8, hint: "입자가 얼마나 밝게 빛나는지" },
    { key: "dark", label: "DARK", min: 0.4, max: 1, step: 0.05, value: 0.9, hint: "시야가 얼마나 어두운지" },
    { key: "motes", label: "MOTES", min: 0, max: 120, step: 4, value: 36, hint: "시야에 뜬 작은 빛 알갱이" }
  ],
  scope: SCOPE_KNOBS,

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const turn = t * TAU;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;
    const limit = ring * 0.95;
    const { night, deepest } = nightAndLight(S.drums);
    const blue = bluest(S.drums);

    // 입자는 제 씨앗으로 굴린다. FIELD는 잉크와 종이결을 건드리지 않고 시야만 다시 뽑는다
    const layout = makeRng(fieldSeed(page, 0x1f123bb5));

    // 입자를 놓는다. 후보를 여럿 뽑아 이웃과의 여유가 가장 큰 데로 간다. 가시까지 셈에 넣어
    // 조금만 겹친다. 시야 밖으로 너무 나가는 자리는 깎는다
    const particles = [];
    for (let i = 0; i < knobs.count; i += 1) {
      const r = width * knobs.size * layout.float(0.75, 1.3);
      let spot = null;
      for (let tryAt = 0; tryAt < 24; tryAt += 1) {
        const angle = layout.float(0, TAU);
        const dist = Math.sqrt(layout.next()) * limit;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        let room = width;
        for (const other of particles) room = Math.min(room, Math.hypot(other.x - x, other.y - y) - (other.r + r) * 1.05);
        const score = room - Math.max(0, dist + r * 0.3 - limit) * 2;
        if (!spot || score > spot.score) spot = { x, y, score };
      }
      particles.push(makeParticle(layout, spot, r));
    }
    const motes = scatter(layout, knobs.motes, limit, cx, cy);
    const glows = Array.from({ length: GLOWS }, () => {
      const angle = layout.float(0, TAU);
      const dist = Math.sqrt(layout.next()) * ring * 0.85;
      return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist, r: ring * layout.float(0.08, 0.2), tone: layout.float(0.15, 0.35) };
    });

    // 빛을 판다. 가장 파란 통은 share만큼만 파내 빛이 하늘빛을 띤다. share가 1이면 흰빛이다
    const shine = (paint, strength, share = 0.5) => carve(night, paint, (sep) => strength * (sep === blue ? share : 1));
    // 어둠을 도로 얹는다
    const shade = (paint, strength) => stain(night, paint, strength);
    // 가운데에서 바깥으로 옅어지는 원 하나
    const soft = (x, y, inner, outer, stops) => (g) => {
      const gradient = g.createRadialGradient(x, y, inner, x, y, outer);
      for (const [at, alpha] of stops) gradient.addColorStop(at, `rgba(0, 0, 0, ${alpha})`);
      g.fillStyle = gradient;
      g.beginPath();
      g.arc(x, y, outer, 0, TAU);
      g.fill();
    };
    const discs = (list) => (g) => {
      g.beginPath();
      for (const [dx, dy, size] of list) {
        circleSubpath(g, dx, dy, size);
      }
      g.fill();
    };

    // 바닥. 밤을 깔고 한가운데를 조금 밝힌다
    floodNight(night, deepest, knobs.dark);
    shine(soft(cx, cy, 0, ring, [[0, 0.35], [1, 0]]), 1, 0.4);

    // 빛 번짐
    for (const glow of glows) shine(soft(glow.x, glow.y, 0, glow.r, [[0, glow.tone], [1, 0]]), 1);

    const glowAmount = knobs.glow;
    const shake = knobs.spin;
    const spikeCount = Math.round(knobs.spikes);
    const cupCount = Math.round(knobs.cups);

    // 흐린 것부터, 그다음 큰 것부터
    const blurred = (p) => p.blur < knobs.depth;
    const placed = [...particles]
      .sort((a, b) => (blurred(a) === blurred(b) ? b.r - a.r : blurred(a) ? -1 : 1))
      .map((p) => ({
        p,
        x: p.x + Math.cos(turn * p.path.fx + p.path.px) * knobs.drift * p.path.ax * width,
        y: p.y + Math.sin(turn * p.path.fy + p.path.py) * knobs.drift * p.path.ay * width,
        rot: p.spin.base + Math.sin(turn * p.spin.beat + p.spin.phase) * 0.35 * shake
      }));

    // 흐린 입자. 크게 번진 옅은 원에 속이 조금 어둡다
    for (const { p, x, y } of placed.filter((item) => blurred(item.p))) {
      const r = p.r * 1.3;
      const tone = glowAmount * p.tone;
      shine(soft(x, y, 0, r * 1.5, [[0, 0.42 * tone], [0.5, 0.48 * tone], [0.75, 0.28 * tone], [1, 0]]), 1);
      shade(soft(x, y, 0, r * 0.55, [[0, 0.25], [1, 0]]), 1);
    }

    // 빛 알갱이. 초점 밖의 작은 입자들이 제자리에서 조금씩 떤다
    if (motes.length) {
      shine(
        discs(
          motes.map((m) => [
            m.x + Math.cos(turn * m.beat + m.phase) * 3,
            m.y + Math.sin(turn * m.beat + m.phase * 1.3) * 3,
            m.size * 1.6
          ])
        ),
        0.75
      );
    }

    // 초점이 맞은 입자
    for (const { p, x, y, rot } of placed.filter((item) => !blurred(item.p))) {
      const r = p.r;
      const tone = Math.min(1, glowAmount * p.tone);

      // 둘레의 번짐과 앞면
      shine(soft(x, y, r * 0.9, r * 1.4, [[0, 0.2 * tone], [1, 0]]), 1);
      shine(discs([[x, y, r]]), 0.45 * tone);

      // 짙은 속
      shade(soft(x, y, 0, r * 0.62, [[0, 0.9], [0.55, 0.6], [1, 0]]), 1);

      // 앞면의 옅은 알갱이
      shine(discs(p.grains.map(([angle, dist, size]) => [x + Math.cos(angle + rot) * dist * r, y + Math.sin(angle + rot) * dist * r, size])), 0.22 * tone);

      // 테
      shine((g) => {
        g.lineWidth = Math.max(4, r * 0.045);
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.stroke();
      }, 0.9 * tone);

      // 가시. 줄기는 옅게, 머리는 거의 끝까지
      if (spikeCount > 0) {
        const stalk = Math.max(3.5, r * 0.035);
        const knob = Math.max(3.5, r * 0.05);
        const stalks = [];
        const rounds = [];
        const flats = [];
        p.spikes.slice(0, spikeCount).forEach((spike, k) => {
          const wave = Math.sin(turn * spike.beat + spike.phase);
          const angle = rot + ((k + 0.5 + spike.shift) / spikeCount) * TAU + wave * 0.04 * shake;
          const reach = r + knobs.length * r * spike.length * (1 + wave * 0.08 * shake);
          const ux = Math.cos(angle);
          const uy = Math.sin(angle);
          const foot = spike.facing ? r * 0.84 : r * 0.97;
          stalks.push([x + ux * foot, y + uy * foot, x + ux * reach, y + uy * reach]);
          if (spike.head < 0.35) flats.push([x + ux * reach, y + uy * reach, ux, uy]);
          else rounds.push([x + ux * reach, y + uy * reach, spike.head < 0.8 ? knob : knob * 1.35]);
        });
        shine((g) => {
          g.lineWidth = stalk;
          g.lineCap = "round";
          g.beginPath();
          for (const [x0, y0, x1, y1] of stalks) {
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
          }
          g.stroke();
        }, tone, 0.7);
        shine((g) => {
          discs(rounds)(g);
          g.lineWidth = knob * 1.1;
          g.lineCap = "round";
          g.beginPath();
          for (const [hx, hy, ux, uy] of flats) {
            g.moveTo(hx - uy * knob * 1.3, hy + ux * knob * 1.3);
            g.lineTo(hx + uy * knob * 1.3, hy - ux * knob * 1.3);
          }
          g.stroke();
        }, tone, 0.85);
      }

      // 컵. 짙은 속을 둘러 옅은 원이 박히고, 원 속은 다시 어둡다
      if (cupCount > 0) {
        const cups = p.cups.slice(0, cupCount).map((cup, k) => {
          const angle = rot + ((k + 0.5 + cup.shift) / cupCount) * TAU;
          return [x + Math.cos(angle) * cup.dist * r, y + Math.sin(angle) * cup.dist * r, cup.size * r];
        });
        shine(discs(cups), tone, 0.9);
        shade(discs(cups.map(([ux, uy, size]) => [ux, uy, size * 0.5])), 0.8);
      }
    }

    dim(deepest, page, ring, knobs.vignette);
    roundel(S, page, ring);
  }
};
