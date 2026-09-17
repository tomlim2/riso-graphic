// 현미경으로 들여다본 엽록체.
//
// CELL과 같은 시야(src/scope.js)에 둥근 틀(src/roundel.js)을 두르고, 그 안에 엽록체를 띄운다.
// 엽록체는 세포가 아니다. 핵이 없고, 몸은 납작한 렌즈꼴이며, 속은 막이 켜켜이 쌓인 구조다.
//   막       두 겹이다. 바깥 막은 진하게, 안쪽 막은 가늘고 옅게 바깥을 따라 긋는다
//   라멜라   스트로마 라멜라가 몸의 긴 축을 따라 한쪽 끝에서 다른 끝으로 지나간다. 끝으로
//            갈수록 모여 방추처럼 보인다
//   그라나   틸라코이드 원반이 동전처럼 쌓인 더미. 라멜라 위에 앉고, 원반 하나하나는 끝이 둥근
//            짧은 막대다. 망점이 굵으면 더미가 진한 덩이로 뭉치는데, 광학 현미경으로 본 그라나가
//            원래 그렇게 보인다
//   스트로마 바탕에 알갱이(리보솜)가 흩어지고, 진한 기름방울(플라스토글로불)이 박히고, 녹말
//            알갱이는 흰 구멍으로 남는다
// 나뉘는 엽록체는 허리가 조여 아령꼴이 된다. 조임은 한 바퀴에 한 번 조였다 풀린다.
//
// 초록 잉크는 없다. 엽록소의 초록은 두 통을 겹쳐 얻는다 — 노랑 위에 파랑이 앉으면 곱하기가
// 초록을 낸다. 그래서 판이 배색을 보고, 곱했을 때 가장 초록에 가까운 두 통으로 스트로마를
// 칠한다. 막과 라멜라와 그라나는 가장 진한 통이다.
//
// 모든 움직임은 t에 대해 정확히 한 바퀴다. 엽록체는 작은 닫힌 길을 돌며 조금씩 기울고,
// 라멜라는 제자리에서 물결치고, 그라나는 라멜라를 타고 흔들린다. 난수는 엽록체마다 같은 수만큼
// 뽑는다 — 손잡이는 뽑아 둔 것을 얼마나 쓸지만 정한다. 부스러기는 엽록체를 다 뽑은 뒤에 뽑는다.

import { makeRng } from "../rng.js";
import { roundel } from "../roundel.js";
import { light, scatter, specks, reticle } from "../scope.js";

const TAU = Math.PI * 2;
const bend = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// 엽록체 하나에 미리 뽑아 두는 수. 손잡이의 max와 맞춘다
const MOST = { lamellae: 9, grana: 9, stack: 8, starch: 2, globuli: 6, stipple: 48 };

// 윤곽. 반지름에 물결 몇 겹과 혹을 얹는다. 혹의 크기가 음수면 그 자리가 조인다. 물결의
// 빠르기는 정수배라 한 바퀴 끝에서 제 모양으로 돌아온다.
function outline(cx, cy, radius, { waves, bumps, squash, tilt }, turn, steps = 64) {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const points = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * TAU;
    let r = 1;
    for (const wave of waves) r += wave.amp * Math.sin(a * wave.k + wave.phase + turn * wave.speed);
    for (const bump of bumps) {
      const d = bend(a - bump.angle);
      r += bump.size * Math.exp(-(d * d) / (2 * bump.width * bump.width));
    }
    const x = Math.cos(a) * r * radius;
    const y = Math.sin(a) * r * radius * squash;
    points.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return points;
}

// 작은 점들을 한 경로로 찍는다. 겹친 점이 진해지지 않는다
function dots(sep, list, tone) {
  if (!list.length) return;
  sep.draw((g) => {
    g.globalAlpha = tone;
    g.beginPath();
    for (const [x, y, r] of list) {
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
    g.fill();
  });
}

// 막대 하나. 끝이 둥근 짧은 선이다
function rod(sep, x, y, length, angle, w, tone) {
  const dx = (Math.cos(angle) * length) / 2;
  const dy = (Math.sin(angle) * length) / 2;
  sep.line([[x - dx, y - dy], [x + dx, y + dy]], { w, tone, smooth: false });
}

const rgbOf = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

// 초록이 얼마나 초록인지. 초록 채널이 빨강과 파랑 중 큰 쪽을 얼마나 앞서는지로 잰다
const greenness = ([r, g, b]) => g - Math.max(r, b);

// 스트로마를 칠할 통. 통 하나, 또는 곱했을 때 가장 초록인 두 통. 옅은 통이 앞이다
function greenest(drums) {
  let best = [drums[0]];
  let top = -Infinity;
  drums.forEach((drum, i) => {
    const one = rgbOf(drum.ink);
    if (greenness(one) > top) {
      top = greenness(one);
      best = [drum];
    }
    for (const other of drums.slice(i + 1)) {
      const two = rgbOf(other.ink);
      const mixed = greenness(one.map((v, k) => v * two[k]));
      if (mixed > top) {
        top = mixed;
        best = [drum, other];
      }
    }
  });
  return best.map((drum) => drum.separation);
}

// 엽록체 하나에 필요한 난수를 모두, 언제나 같은 수만큼 뽑는다
function makePlastid(layout, spot, r) {
  const pickSign = () => (layout.chance(0.5) ? 1 : -1);
  return {
    x: spot.x,
    y: spot.y,
    r,
    tones: [layout.float(0.85, 1.15), layout.float(0.7, 1)],
    flat: layout.float(0.75, 1.25),
    tilt: layout.float(0, TAU),
    rock: layout.float(0, TAU),
    path: {
      ax: layout.float(0.4, 1),
      ay: layout.float(0.4, 1),
      fx: layout.int(1, 2),
      fy: layout.int(1, 2),
      px: layout.float(0, TAU),
      py: layout.float(0, TAU)
    },
    waves: [0, 1, 2].map(() => ({
      k: layout.int(2, 5),
      amp: layout.float(0.012, 0.04),
      phase: layout.float(0, TAU),
      speed: pickSign() * layout.int(1, 2)
    })),
    fission: layout.next(),
    pinch: { size: layout.float(0.42, 0.58), phase: layout.float(0, TAU) },
    lane: layout.next(),
    lamellae: Array.from({ length: MOST.lamellae }, () => ({
      shift: layout.float(-1, 1),
      end: layout.float(0.66, 0.76),
      k: layout.int(1, 3),
      amp: layout.float(0.015, 0.045),
      phase: layout.float(0, TAU)
    })),
    grana: Array.from({ length: MOST.grana }, () => ({
      nudge: layout.float(-1, 1),
      length: layout.float(0.15, 0.22),
      drop: layout.int(0, 2),
      phase: layout.float(0, TAU)
    })),
    starch: Array.from({ length: MOST.starch }, () => ({
      at: layout.float(0.3, 0.7),
      side: pickSign() * layout.float(0.35, 0.6),
      size: layout.float(0.13, 0.2)
    })),
    globuli: Array.from({ length: MOST.globuli }, () => [layout.float(0, TAU), Math.sqrt(layout.next()) * 0.8, layout.float(0.025, 0.045)]),
    stipple: Array.from({ length: MOST.stipple }, () => [layout.float(0, TAU), Math.sqrt(layout.next()) * 0.84, layout.float(2.4, 3.6)])
  };
}

export const chloro = {
  id: "chloro",
  name: "CHLORO",
  about: "현미경 아래의 엽록체. 그라나가 라멜라 위에 쌓이고, 몇은 허리를 조여 나뉜다",

  knobs: [
    { key: "count", label: "COUNT", min: 3, max: 24, step: 1, value: 10 },
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "시야의 씨앗. 종이의 롤은 그대로 두고 엽록체만 다시 뽑는다" },
    { key: "size", label: "SIZE", min: 0.04, max: 0.14, step: 0.005, value: 0.08 },
    { key: "lens", label: "LENS", min: 0, max: 1, step: 0.05, value: 0.45, hint: "몸이 얼마나 납작한 렌즈꼴인지. 0이면 둥글다" },
    { key: "grana", label: "GRANA", min: 0, max: 9, step: 1, value: 5, hint: "엽록체 하나에 든 그라나 더미의 수" },
    { key: "stack", label: "STACK", min: 1, max: 8, step: 1, value: 4, hint: "그라나 더미 하나에 쌓인 틸라코이드 원반의 수" },
    { key: "lamellae", label: "LAMELLAE", min: 0, max: 9, step: 1, value: 5, hint: "그라나를 잇고 몸을 길게 지나는 스트로마 라멜라의 가닥" },
    { key: "divide", label: "DIVIDE", min: 0, max: 1, step: 0.05, value: 0.25, hint: "허리가 조여 둘로 나뉘는 엽록체의 비율" },
    { key: "drift", label: "DRIFT", min: 0, max: 0.04, step: 0.002, value: 0.01, hint: "엽록체가 한 바퀴 동안 도는 작은 길의 크기" },
    { key: "wobble", label: "WOBBLE", min: 0, max: 1, step: 0.05, value: 0.45, hint: "막이 일렁이는 정도" },
    { key: "tint", label: "TINT", min: 0.2, max: 0.8, step: 0.05, value: 0.4, hint: "스트로마를 얼마나 진하게 물들일지. 두 통이 겹쳐 초록이 난다" },
    { key: "stroma", label: "STROMA", min: 0, max: 2, step: 0.1, value: 1.2, hint: "스트로마 속 알갱이와 기름방울과 녹말의 양" },
    { key: "debris", label: "DEBRIS", min: 0, max: 120, step: 4, value: 12, hint: "시야에 떠 있는 부스러기" },
    { key: "vignette", label: "VIGNETTE", min: 0, max: 1, step: 0.05, value: 0.15, hint: "시야 가장자리로 갈수록 빛이 죽는 정도" },
    { key: "reticle", label: "RETICLE", min: 0, max: 1, step: 0.05, value: 0.15, hint: "접안렌즈의 눈금. 0이면 없다" },
    { key: "frame", label: "FRAME", min: 0.3, max: 0.5, step: 0.01, value: 0.44, hint: "시야의 반지름" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { count, lens, divide, drift, wobble, tint, stroma, debris, vignette } = knobs;
    const laneCount = Math.round(knobs.lamellae);
    const granaCount = Math.round(knobs.grana);
    const stackCount = Math.round(knobs.stack);

    const turn = t * TAU;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;
    const limit = ring * 0.93;

    // 엽록체는 제 씨앗으로 굴린다. FIELD는 잉크와 종이결을 건드리지 않고 시야만 다시 뽑는다
    const layout = makeRng((page.seed ^ 0x2545f491 ^ Math.imul(knobs.field + 1, 0x85ebca6b)) >>> 0);
    const stromaDrums = greenest(S.drums);

    light(S, page, ring, vignette);

    // 엽록체를 놓는다. 후보를 여럿 뽑아 이웃과의 여유가 가장 큰 데로 간다
    const plastids = [];
    for (let i = 0; i < count; i += 1) {
      const r = width * knobs.size * layout.float(0.75, 1.3);
      let spot = null;
      for (let tryAt = 0; tryAt < 24; tryAt += 1) {
        const angle = layout.float(0, TAU);
        const dist = Math.sqrt(layout.next()) * limit;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        let room = width;
        for (const other of plastids) room = Math.min(room, Math.hypot(other.x - x, other.y - y) - (other.r + r) * 0.85);
        const score = room - Math.max(0, dist + r * 0.4 - limit) * 2;
        if (!spot || score > spot.score) spot = { x, y, score };
      }
      plastids.push(makePlastid(layout, spot, r));
    }
    const dust = scatter(layout, debris, limit, cx, cy);

    // 큰 것부터 깐다. 작은 엽록체가 큰 것 위에 앉는다
    plastids.sort((a, b) => b.r - a.r);

    for (const one of plastids) {
      const radius = one.r;
      const squash = Math.max(0.4, 1 - 0.5 * lens * one.flat);
      const x = one.x + Math.cos(turn * one.path.fx + one.path.px) * drift * one.path.ax * width;
      const y = one.y + Math.sin(turn * one.path.fy + one.path.py) * drift * one.path.ay * width;
      const tilt = one.tilt + Math.sin(turn + one.rock) * 0.1;
      const cos = Math.cos(tilt);
      const sin = Math.sin(tilt);
      const at = (X, Y) => [x + X * cos - Y * sin, y + X * sin + Y * cos];

      // 허리. 나뉘는 엽록체는 가운데가 조였다 풀린다. 속의 것도 같은 만큼 좁힌다
      const splits = one.fission < divide;
      const rest = splits ? one.pinch.size : 0;
      const pinch = rest * (1 + 0.25 * Math.sin(turn + one.pinch.phase));
      const narrow = (X, amount = pinch) => 1 - amount * Math.exp(-((X / (radius * 0.3)) ** 2));

      const stir = 0.4 + wobble * 1.2;
      const shape = {
        waves: one.waves.map((wave) => ({ ...wave, amp: wave.amp * stir })),
        bumps: splits ? [Math.PI / 2, -Math.PI / 2].map((angle) => ({ angle, width: 0.45, size: -pinch })) : [],
        squash,
        tilt
      };
      const body = outline(x, y, radius, shape, turn);

      // 속의 너비. 렌즈꼴이라 끝으로 갈수록 좁고, 허리에서 한 번 더 좁다
      const inner = radius * 0.87;
      const half = (X, amount) => inner * squash * Math.sqrt(Math.max(0, 1 - (X / inner) ** 2)) * narrow(X, amount);

      // 스트로마. 초록을 내는 두 통에 나눠 칠한다
      stromaDrums.forEach((sep, k) => sep.shape(body, { tone: tint * one.tones[k] * (k ? 0.8 : 1) }));

      // 녹말 알갱이의 자리. 나뉘는 엽록체에서는 허리를 비켜 앉는다. 파내는 것은 속을 다 그린 뒤다
      const holes = one.starch.slice(0, Math.round(stroma)).map((grain) => {
        const u = splits ? grain.at + (grain.at < 0.5 ? -0.12 : 0.12) : grain.at;
        const X = (u * 2 - 1) * inner * 0.8;
        return { X, side: grain.side, a: grain.size * radius, b: grain.size * radius * 0.62 };
      });
      const inHole = (X, Y, mx, my) =>
        holes.some((hole) => ((X - hole.X) / (hole.a + mx)) ** 2 + ((Y - hole.side * half(hole.X, rest)) / (hole.b + my)) ** 2 < 1);

      // 리보솜. 스트로마에 흩어진 알갱이
      const grains = one.stipple.slice(0, Math.round(24 * stroma)).map(([angle, dist, size]) => {
        const a = angle + Math.sin(turn + angle) * 0.05;
        const X = Math.cos(a) * dist * inner;
        return [...at(X, Math.sin(a) * dist * inner * squash * narrow(X)), size];
      });
      dots(S.key, grains, 0.5);

      // 라멜라. 긴 축을 따라 한쪽 끝에서 다른 끝으로. 끝에서는 모이고 가운데서는 벌어진다.
      // 라멜라를 긋지 않아도 그라나가 앉을 길은 있어야 하므로 길은 언제나 셋 이상 둔다
      const laneTotal = Math.max(laneCount, 3);
      const lanes = Array.from({ length: laneTotal }, (_, j) => {
        const lamella = one.lamellae[j];
        const spread = (((j + 0.5) / laneTotal) * 2 - 1) * 0.82 + (lamella.shift * 0.25) / laneTotal;
        const pole = radius * lamella.end;
        return (u, moving = true) => {
          const X = (u * 2 - 1) * pole;
          const bulge = 0.16 + 0.84 * Math.pow(Math.sin(Math.PI * u), 0.8);
          const swell = moving ? Math.sin(u * Math.PI * lamella.k + lamella.phase + turn) * lamella.amp * radius * squash * Math.sin(Math.PI * u) : 0;
          return [X, spread * inner * squash * 0.78 * bulge * narrow(X, moving ? pinch : rest) + swell];
        };
      });
      for (const lane of lanes.slice(0, laneCount)) {
        const points = [];
        for (let s = 0; s <= 24; s += 1) points.push(at(...lane(s / 24)));
        S.key.line(points, { w: 3.5, tone: 0.55 });
      }

      // 그라나. 긴 축을 따라 고르게 놓되 라멜라를 하나 건너씩 옮겨 앉아 이웃 더미와 겹치지
      // 않는다. 더미의 높이와 자리, 녹말에 밀려 빠지는 원반은 멈춘 모양으로 한 번 정한다 —
      // 움직이는 모양으로 정하면 원반이 프레임마다 생겼다 없어진다
      const disc = Math.max(5, radius * 0.056);
      const gap = disc * 1.6;
      const stride = lanes.length > 2 ? 2 : 1;
      const first = Math.floor(one.lane * lanes.length);
      for (let g = 0; g < granaCount; g += 1) {
        const granum = one.grana[g];
        let u = 0.5 + ((g + 0.5) / granaCount - 0.5) * 0.8 + (granum.nudge * 0.12) / granaCount;
        if (splits) u = u < 0.5 ? 0.5 - (0.12 + (0.5 - u) * 0.66) : 0.5 + (0.12 + (u - 0.5) * 0.66);
        const lane = lanes[(first + g * stride) % lanes.length];

        const [X0, Y0] = lane(u, false);
        const room = half(X0, rest) * 0.86;
        const stackOf = Math.max(1, Math.min(stackCount - granum.drop, Math.floor((room * 2 - disc) / gap) + 1));
        const reach = ((stackOf - 1) * gap) / 2 + disc / 2;
        const push = Math.sign(Y0) * Math.min(Math.abs(Y0), Math.max(0, room - reach)) - Y0;

        const [X, Y] = lane(u);
        const [Xa, Ya] = lane(u - 0.02);
        const [Xb, Yb] = lane(u + 0.02);
        const angle = tilt + Math.atan2(Yb - Ya, Xb - Xa);
        const sway = Math.sin(turn + granum.phase) * radius * 0.03;
        const length = granum.length * radius;
        for (let k = 0; k < stackOf; k += 1) {
          const lift = push + (k - (stackOf - 1) / 2) * gap;
          if (inHole(X0, Y0 + lift, (length + disc) / 2, disc / 2)) continue;
          const [px, py] = at(X + sway, Y + lift);
          rod(S.key, px, py, length, angle, disc, 0.9);
        }
      }

      // 기름방울. 진하고 작은 점
      const globuli = one.globuli.slice(0, Math.round(3 * stroma)).map(([angle, dist, size]) => {
        const X = Math.cos(angle) * dist * inner;
        return [...at(X, Math.sin(angle) * dist * inner * squash * narrow(X)), Math.max(3, size * radius)];
      });
      dots(S.key, globuli, 0.95);

      // 녹말. 속을 다 그린 뒤 모든 통에서 파내 흰 알갱이로 남기고, 옅은 테를 둘러 알갱이로 읽히게
      // 한다. 테가 없으면 흰 점이 광택처럼 보인다
      if (holes.length) {
        const carve = (g) => {
          g.beginPath();
          for (const hole of holes) {
            const [hx, hy] = at(hole.X, hole.side * half(hole.X, pinch));
            g.moveTo(hx + hole.a * cos, hy + hole.a * sin);
            g.ellipse(hx, hy, hole.a, hole.b, tilt, 0, TAU);
          }
        };
        for (const drum of S.drums) drum.separation.knockout((plate) => plate.draw((g) => { carve(g); g.fill(); }));
        S.key.draw((g) => {
          g.globalAlpha = 0.4;
          g.lineWidth = Math.max(3.5, radius * 0.025);
          carve(g);
          g.stroke();
        });
      }

      // 막 두 겹. 안쪽 막은 가늘고 옅게 바깥을 따라간다. 망점 셀보다 가늘면 점선으로 부서지므로
      // 안쪽 막도 한 셀은 덮게 긋는다
      S.key.line(outline(x, y, inner, shape, turn, 56), { w: Math.max(4, radius * 0.03), tone: 0.5, close: true });
      S.key.line(body, { w: Math.max(4.5, radius * 0.05), tone: 0.85, close: true });
    }

    specks(S, dust, turn);
    reticle(S, page, ring, knobs.reticle);
    roundel(S, page, ring);
  }
};
