// 별똥별. 애니메이션 이펙트 작화의 문법으로, 이미터를 층층이 쌓아 그린다.
//
// 받은 이펙트 분해 장면을 따라 층을 나눈다. 층마다 모양 어휘와 색과 박자가 다르고, 뒤에서 앞으로
// 이 차례로 찍는다.
//
//   티끌      먼 하늘의 작은 점
//   번짐      광선 둘레의 흐린 빛 한 겹
//   속도선     머리에서 뻗어 나가듯 벌어지는 어두운 바늘
//   보조 광선  주 광선과 조금 다른 각도로 나란히 뻗는 가는 띠. 분홍과 푸름
//   주 광선    머리에서 꼬리 끝까지 뻗는 넓은 노란 띠. 속에 흰 심이 있다
//   연기      축을 따라 길게 늘인 어두운 얼룩. 광선 위를 덮어 깊이를 만든다
//   파편      모서리가 선 조각이 돌면서 흘러간다
//   별        네 갈래 반짝이와 그 뒤를 따르는 점선 꼬리
//   불티      머리 언저리의 짧고 밝은 줄기
//   큰 가시    머리 앞으로 솟은 큰 결정 하나
//   갈고리 가시 안쪽이 오목하게 휜 흰 가시. 머리에서 뒤로 뻗는다
//   결정 조각  부채꼴로 돋는 작은 조각. 갈고리 가시와 함께 색끼리 한 번에 찍는다
//   머리 매듭  가장 앞의 분홍 심과 그 뒤의 노란 타원
//
// 이펙트 작화의 문법은 넷이다.
//
//   또박또박한 박자   한 바퀴를 BEAT장으로 나눠 그 장 수만큼만 그림이 바뀐다. 사이를 메우지 않아
//                     모양이 뚝뚝 끊겨 튄다. 프레임마다 부드럽게 흐르면 사진이 되고 이펙트가 아니다
//   납작한 면        번지는 계조가 아니라 납작한 면이다. 가장자리는 마디가 적어 직선으로 꺾인다
//   각진 파편        둥근 방울이 아니라 모서리가 선 조각이다
//   임팩트 프레임    한 바퀴에 한 번, 두 프레임 동안 머리에서 흰빛이 터지고 하늘까지 옅어진다
//
// 어두운 시야는 COSMOS처럼 밤의 통을 하늘에 깔고 빛나는 것을 파내는 방식이다. 다만 밤은 가장 노란
// 통 하나만 빼고 모두다. 노랗지 않은 통만 밤으로 치면 코랄 같은 따뜻한 통이 빠져 하늘이 한 가지
// 밝은 색으로만 깔린다. 별똥별은 하늘이 어두워야 선다.
//
//   노란 빛   밤을 다 파낸 자리에 노란 통을 얹는다. 노란 통이 없으면 가장 옅은 밤을 조금 남긴다
//   푸른 빛   밤을 파내되 가장 푸른 통은 조금 남긴다
//   분홍 빛   밤을 파내되 가장 붉은 통은 조금 남긴다
//   흰 빛     노란 통까지 다 파낸다
//   어둠      밤의 통을 하늘보다 진하게 찍고, 노란 통은 파낸다. 노랑이 남으면 어둠이 올리브가 된다
//
// 별똥별은 제자리에 있고 둘레가 흐른다. 카메라가 별똥별을 따라가는 셈이다. 흐르는 것은 꼬리 쪽으로
// 가서 끝에서 사라지고 머리 앞에서 다시 나타난다. 흐르는 박자는 한 바퀴에 정수 번이고 양 끝에서
// 가늘어져, 되감기는 자리가 보이지 않는다. 무엇이든 언제나 같은 수만큼 뽑고 손잡이는 그중 몇을
// 찍을지만 정한다.

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { glowMask, keepGlow, layGlow } from "../blur.js";
import { keeper } from "../keep.js";
import { nightAndGlow, bluest, reddest } from "../drums.js";
import { floodNight, carve, stain } from "../night.js";
import { dim } from "../scope.js";

const TAU = Math.PI * 2;
const MOST_DUST = 120;
const MOST_SMOKE = 12;
const MOST_BEAMS = 4;
const MOST_STREAKS = 30;
const MOST_CHIPS = 14;
const MOST_SPARKS = 40;
const MOST_EMBERS = 12;
const MOST_BARBS = 8;
const MOST_SHARDS = 24;
const FLASH_FRAMES = 2; // 임팩트 프레임이 머무는 프레임 수. 시계는 한 바퀴 48프레임이다

// 축을 따라 늘인 조각. u0에서 u1까지 half(s)만큼의 반폭이고, 마디가 적어 가장자리가 직선으로
// 꺾인다. lean은 끝으로 갈수록 옆으로 비껴 나는 정도다
function facet(at, u0, u1, v, half, { steps = 7, lean = 0 } = {}) {
  const one = [];
  const other = [];
  for (let i = 0; i <= steps; i += 1) {
    const s = i / steps;
    const u = u0 + (u1 - u0) * s;
    const w = Math.max(0.15, half(s));
    const side = v + lean * s;
    one.push(at(u, side + w));
    other.push(at(u, side - w));
  }
  return [...one, ...other.reverse()];
}

// 띠의 굵기. 머리 쪽에서 부풀었다가 끝으로 가늘어진다
const taper = (s) => (s < 0.08 ? Math.sqrt(s / 0.08) : Math.pow(1 - (s - 0.08) / 0.92, 1.1));

// 흐르는 것의 자리. 한 바퀴에 speed번 0에서 1까지 가고, 양 끝에서 0으로 가늘어지는 창을 함께 준다
function flowing(phase, t, speed) {
  const p = (phase + t * speed) % 1;
  return { p, fade: Math.pow(Math.sin(Math.PI * p), 0.6) };
}

// 흐린 무늬는 모양 손잡이(LENGTH · ANGLE · CORE)가 같으면 다시 짓지 않는다. 롤과는 상관이 없다.
// 공용 캔버스(src/blur.js)의 것을 제 캔버스로 옮겨 쥔다
const keepMask = keeper(8);

const poly = (points) => (g) => {
  shapes.polyPath(g, points, true);
  g.fill();
};


export const meteor = {
  id: "meteor",
  name: "METEOR",
  about: "별똥별. 이펙트 이미터를 층층이 — 광선과 연기, 가시와 별, 그리고 임팩트 프레임",

  knobs: [
    { group: "SKY", key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "층마다의 자리를 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { group: "SKY", key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 0.85, hint: "하늘의 어둠" },
    { group: "SKY", key: "dust", label: "DUST", min: 0, max: 120, step: 5, value: 50, hint: "먼 하늘의 티끌" },
    { group: "BEAM", key: "angle", label: "ANGLE", min: 10, max: 80, step: 1, value: 38, hint: "광선이 기운 각도. 꼬리가 오른쪽 위로 뻗는다" },
    { group: "BEAM", key: "length", label: "LENGTH", min: 0.4, max: 1.3, step: 0.01, value: 1.05, hint: "광선의 길이. 판 폭에 대한 비율이다. 길게 하면 꼬리가 판 밖으로 나간다" },
    { group: "BEAM", key: "core", label: "CORE", min: 0.3, max: 2.5, step: 0.05, value: 1.3, hint: "주 광선의 굵기" },
    { group: "BEAM", key: "beams", label: "BEAMS", min: 0, max: 4, step: 1, value: 2, hint: "조금 다른 각도로 나란히 뻗는 보조 광선의 수" },
    { group: "BEAM", key: "glow", label: "GLOW", min: 0, max: 1, step: 0.05, value: 0.6, hint: "광선 둘레의 번짐. 납작한 면만 있으면 붙인 색종이가 된다" },
    { group: "HEAD", key: "spike", label: "SPIKE", min: 0, max: 1.6, step: 0.05, value: 1, hint: "머리 앞으로 솟은 큰 결정의 크기" },
    { group: "HEAD", key: "barbs", label: "BARBS", min: 0, max: 8, step: 1, value: 4, hint: "안쪽이 오목하게 휜 흰 가시의 수" },
    { group: "HEAD", key: "shards", label: "SHARDS", min: 0, max: 24, step: 1, value: 10, hint: "부채꼴로 돋는 작은 조각의 수" },
    { group: "HEAD", key: "spread", label: "SPREAD", min: 0.2, max: 1.4, step: 0.05, value: 0.85, hint: "조각과 가시가 벌어지는 정도" },
    { group: "HEAD", key: "flicker", label: "FLICKER", min: 0, max: 1, step: 0.05, value: 0.8, hint: "가시와 조각이 돋았다 사그라드는 정도. 0이면 가만히 있다" },
    { group: "FLOW", key: "smoke", label: "SMOKE", min: 0, max: 12, step: 1, value: 7, hint: "광선을 덮는 어두운 연기 덩어리의 수" },
    { group: "FLOW", key: "streaks", label: "STREAKS", min: 0, max: 30, step: 1, value: 14, hint: "머리에서 뻗어 나가는 어두운 속도선의 수" },
    { group: "FLOW", key: "chips", label: "CHIPS", min: 0, max: 14, step: 1, value: 7, hint: "흘러가는 각진 파편의 수" },
    { group: "FLOW", key: "sparks", label: "SPARKS", min: 0, max: 40, step: 1, value: 14, hint: "점선 꼬리를 단 별의 수" },
    // 한 바퀴에 몇 번 흘러가는가. 정수여야 한 바퀴 끝에서 제자리로 돌아온다
    { group: "FLOW", key: "speed", label: "SPEED", min: 1, max: 3, step: 1, value: 1, hint: "둘레가 흘러가는 빠르기. 한 바퀴에 몇 번 지나가는가" },
    // 한 바퀴를 몇 장으로 그리는가. 시계는 한 바퀴 48프레임이므로 12면 네 프레임에 한 장이다
    { group: "BEAT", key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 12, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊기고, 48이면 프레임마다 다시 그린다" },
    { group: "BEAT", key: "flash", label: "FLASH", min: 0, max: 1, step: 0.05, value: 0.6, hint: "임팩트 프레임. 한 바퀴에 한 번 두 프레임 동안 머리에서 흰빛이 터진다. 0이면 터지지 않는다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 또박또박한 박자. 한 바퀴를 BEAT장으로 나누고 그 장의 시간으로만 그린다. t=1이면 한 바퀴를 꽉
    // 돌아 t=0과 같은 그림이다
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;
    const turn = held * TAU;

    // 자리는 제 씨앗으로 뽑는다. FIELD는 잉크와 종이결을 건드리지 않는다
    const seed = fieldSeed(page, 0x7f4a7c15);
    const layout = makeRng(seed);

    // 임팩트 프레임. 시계의 한 바퀴 가운데 두 프레임 동안만 선다. 시작은 6의 배수 프레임이다 —
    // 화면은 한 장을 1·2·3프레임씩 잡아 두는데, 6의 배수는 어느 박자로 찍어도 찍히는 프레임이다.
    // 아무 프레임에서나 서게 두었더니 세 프레임에 한 장일 때, 롤 셋에 하나는 섬광의 두 프레임이
    // 모두 찍히지 않는 자리에 끼어 아예 보이지 않았다. 이음매에서는 멀리 떨어뜨려, 이음매를 재는
    // 걸음에 이 큰 뜀이 끼지 않게 한다. 뽑기는 예전처럼 한 번이라 뒤의 자리는 그대로다
    const flashFrame = 6 * layout.int(1, 6);
    const clock = Math.floor(t * page.frames) % page.frames; // t=1은 한 바퀴를 꽉 돈 것이라 t=0과 같은 장이다
    const burst = knobs.flash > 0 && clock >= flashFrame && clock < flashFrame + FLASH_FRAMES ? knobs.flash : 0;

    // 축. 머리에서 꼬리 쪽을 향한다. 화면의 y는 아래로 자라므로 위로 가려면 뺀다. 머리는 왼쪽 아래에
    // 두고 꼬리가 오른쪽 위로 판을 가로지른다
    const angle = (knobs.angle * Math.PI) / 180;
    const L = width * knobs.length;
    const hx = width * 0.5 - Math.cos(angle) * L * 0.44;
    const hy = height * 0.5 + Math.sin(angle) * L * 0.44;
    const axis = (lean = 0) => {
      const a = angle + lean;
      const dx = Math.cos(a);
      const dy = -Math.sin(a);
      return (u, v) => [hx + dx * u - dy * v, hy + dy * u + dx * v];
    };
    const at = axis();
    const tilt = -angle;

    // 뽑기. 언제나 같은 수만큼, 같은 차례로
    const trailPhase = layout.float(0, TAU);
    const dust = Array.from({ length: MOST_DUST }, () => ({
      x: layout.float(0, width),
      y: layout.float(0, height),
      size: layout.float(0.8, 2.2),
      beat: layout.int(1, 3),
      phase: layout.float(0, TAU)
    })).slice(0, knobs.dust);
    const smoke = Array.from({ length: MOST_SMOKE }, () => ({
      phase: layout.next(),
      off: layout.float(-0.05, 0.05),
      long: layout.float(0.14, 0.34),
      thick: layout.float(0.05, 0.11),
      lean: layout.float(-0.12, 0.12),
      deep: layout.float(0.45, 0.8)
    })).slice(0, knobs.smoke);
    const beams = Array.from({ length: MOST_BEAMS }, (_, i) => ({
      lean: layout.float(0.03, 0.12) * (i % 2 === 0 ? 1 : -1),
      off: layout.float(0.005, 0.04) * (i % 2 === 0 ? 1 : -1),
      long: layout.float(0.3, 0.6),
      wide: layout.float(0.18, 0.4),
      kind: i % 2 === 0 ? "pink" : "cyan",
      beat: layout.int(1, 2),
      phase: layout.float(0, TAU)
    })).slice(0, knobs.beams);
    const streaks = Array.from({ length: MOST_STREAKS }, () => ({
      side: layout.sign(),
      off: 0.012 + 0.19 * layout.next() ** 1.6,
      phase: layout.next(),
      len: layout.float(0.1, 0.34),
      half: layout.float(1.8, 6),
      speed: layout.int(1, 2),
      arrow: layout.chance(0.35),
      fan: layout.float(0.02, 0.12)
    })).slice(0, knobs.streaks);
    const chips = Array.from({ length: MOST_CHIPS }, () => ({
      phase: layout.next(),
      off: layout.float(-0.075, 0.075),
      size: layout.float(5, 16),
      turn: layout.float(0, TAU),
      spin: layout.int(1, 2),
      squat: layout.float(0.5, 0.95),
      kind: layout.chance(0.25) ? "cyan" : "dark"
    })).slice(0, knobs.chips);
    const sparks = Array.from({ length: MOST_SPARKS }, () => {
      const kind = layout.next();
      return {
        phase: layout.next(),
        off: (layout.next() + layout.next() - 1) * 0.06,
        size: 6 + 13 * layout.next() ** 2,
        beat: layout.int(1, 3),
        twinkle: layout.float(0, TAU),
        tail: layout.int(3, 6),
        kind: kind < 0.45 ? "yellow" : kind < 0.8 ? "cyan" : "white"
      };
    }).slice(0, knobs.sparks);
    const embers = Array.from({ length: MOST_EMBERS }, () => ({
      phase: layout.next(),
      off: layout.float(-0.05, 0.05),
      len: layout.float(0.03, 0.09),
      half: layout.float(1.5, 4),
      kind: layout.chance(0.6) ? "yellow" : "pink"
    }));
    const barbs = Array.from({ length: MOST_BARBS }, () => ({
      side: layout.sign(),
      spread: layout.float(0.2, 1),
      len: layout.float(0.12, 0.3),
      bow: layout.float(0.08, 0.2),
      thick: layout.float(0.018, 0.045),
      beat: layout.int(1, 2),
      phase: layout.float(0, TAU)
    })).slice(0, knobs.barbs);
    const shards = Array.from({ length: MOST_SHARDS }, () => {
      const kind = layout.next();
      return {
        side: layout.sign(),
        spread: layout.float(0.15, 1),
        forward: layout.chance(0.3),
        base: layout.float(-0.015, 0.06),
        offset: layout.float(-0.018, 0.018),
        len: layout.float(0.06, 0.16),
        wide: layout.float(0.16, 0.32),
        beat: layout.int(1, 2),
        phase: layout.float(0, TAU),
        kind: kind < 0.42 ? "yellow" : kind < 0.78 ? "cyan" : kind < 0.93 ? "white" : "pink"
      };
    }).slice(0, knobs.shards);
    const spike = {
      tip: layout.float(0.1, 0.17),
      wing: layout.float(0.05, 0.085),
      back: layout.float(0.03, 0.07),
      notch: layout.float(0.2, 0.45),
      beat: layout.int(1, 2),
      phase: layout.float(0, TAU)
    };

    // 통 나누기. 빛은 가장 노란 통 하나이고 나머지는 모두 밤이다(src/drums.js). 통이 둘 이하면
    // 모두 밤이고, 노란 빛은 가장 옅은 밤을 조금 남겨 낸다
    const { night, palest, deepest, nightDrums, glowInk } = nightAndGlow(S.drums);
    const blue = bluest(nightDrums);
    const red = reddest(nightDrums);

    // 빛을 찍는다. paint는 캔버스에 모양을 그리고 채운다. 색마다 밤을 얼마나 남기는지가 다르다
    const keeps = (kind, sep) =>
      kind === "cyan" && sep === blue
        ? 0.6
        : kind === "pink" && sep === red
          ? 0.55
          : kind === "yellow" && !glowInk && sep === palest && night.length > 1
            ? 0.45
            : 0;
    const glowWith = (kind, paint, strength = 1) => {
      carve(night, paint, (sep) => strength * (1 - keeps(kind, sep)));
      if (!glowInk) return;
      if (kind === "white") carve([glowInk], paint, strength);
      else if (kind === "yellow" || kind === "cyan") stain([glowInk], paint, strength * (kind === "yellow" ? 0.95 : 0.14));
    };

    // 어둠을 찍는다. 밤의 통을 하늘보다 진하게, 노란 통은 파낸다. 연기처럼 옅게 덮을 때도 쓴다
    const darken = (paint, strength = 1) => {
      stain(night, paint, (sep) => strength * (sep === deepest ? 1 : 0.9));
      if (glowInk) carve([glowInk], paint, strength);
    };
    const every = (list) => (g) => {
      for (const paint of list) paint(g);
    };

    // 하늘. 밤의 통을 깔고 노란 통을 옅게 깔아 푸르스름한 회색을 만든다. 가장자리를 조금 누른다.
    // 임팩트 프레임에는 하늘까지 옅어진다
    const dark = knobs.dark * (1 - 0.22 * burst);
    floodNight(night, deepest, dark, 0.9, 0.75);
    if (glowInk) glowInk.flood(0.18 * dark);
    dim(deepest, page, width * 0.82, 0.8);

    // 먼 하늘의 티끌
    if (dust.length) {
      glowWith(
        "white",
        every(
          dust.map((d) => (g) => {
            const r = d.size * (0.6 + 0.4 * Math.sin(turn * d.beat + d.phase));
            g.beginPath();
            g.arc(d.x, d.y, Math.max(0.3, r), 0, TAU);
            g.fill();
          })
        ),
        0.6
      );
    }

    // 광선 둘레의 번짐
    const coreWidth = width * 0.016 * knobs.core;
    if (knobs.glow > 0) {
      const mask = keepMask(`halo|${width}|${height}|${knobs.length}|${knobs.angle}|${knobs.core}`, () =>
        keepGlow(glowMask(facet(at, -L * 0.02, L, 0, (s) => coreWidth * 2.4 * taper(s), { steps: 24 }), width * 0.03))
      );
      for (const sep of night) sep.knockout((plate) => plate.draw((g) => layGlow(g, mask, knobs.glow * (sep === blue ? 0.6 : 0.8))));
      if (glowInk) glowInk.draw((g) => layGlow(g, mask, knobs.glow * 0.5));
    }

    // 속도선. 머리에서 뻗어 나가듯 조금씩 벌어지며 꼬리 쪽으로 흐른다. 셋에 하나는 앞이 굵은 화살이다
    const span = L * 1.3;
    if (streaks.length) {
      darken(
        every(
          streaks.map((k) => {
            const { p, fade } = flowing(k.phase, held, k.speed * knobs.speed);
            const u0 = -L * 0.15 + p * span;
            const len = width * k.len;
            const v = k.side * width * k.off;
            const half = k.arrow
              ? (s) => k.half * 1.4 * fade * Math.min(1, s * 10) * Math.pow(1 - s, 0.7)
              : (s) => k.half * fade * Math.pow(Math.sin(Math.PI * s), 0.8);
            return poly(facet(at, u0, u0 + len, v, half, { steps: 6, lean: k.side * width * k.fan * (len / width) }));
          })
        ),
        0.95
      );
    }

    // 보조 광선. 주 광선과 조금 다른 각도로 나란히 뻗는다. 분홍과 푸름이 번갈아 온다
    for (const b of beams) {
      const beamAt = axis(b.lean);
      const wide = coreWidth * b.wide * (1 + 0.12 * Math.sin(turn * b.beat + b.phase));
      glowWith(b.kind, poly(facet(beamAt, 0, L * b.long, b.off * width, (s) => wide * taper(s), { steps: 8 })));
    }

    // 주 광선. 납작한 면 셋이다 — 노란 몸, 꼬리 끝의 푸른 면, 그 안의 흰 심
    const swell = 1 + 0.1 * Math.sin(turn * 2 + trailPhase);
    glowWith("yellow", poly(facet(at, 0, L, 0, (s) => coreWidth * taper(s) * swell, { steps: 9 })));
    glowWith("cyan", poly(facet(at, L * 0.55, L, 0, (s) => coreWidth * taper(0.55 + s * 0.45) * swell * 0.95, { steps: 5 })));
    const heartEnd = L * (0.45 + 0.06 * Math.sin(turn + trailPhase));
    glowWith("white", poly(facet(at, L * 0.01, heartEnd, 0, (s) => coreWidth * 0.5 * Math.pow(Math.sin(Math.PI * s), 0.6) * swell, { steps: 6 })), 0.9);

    // 연기. 축을 따라 길게 늘인 어두운 얼룩이 광선 위를 덮으며 흘러간다. 가장 진한 통만 옅게 얹어
    // 검정이 아니라 짙은 남보라로 남는다
    for (const s of smoke) {
      const { p, fade } = flowing(s.phase, held, knobs.speed);
      const [x, y] = at(-L * 0.05 + p * L * 1.15, s.off * width);
      const long = width * s.long * (0.6 + 0.4 * fade);
      const thick = width * s.thick * fade;
      deepest.draw((g) => {
        g.globalAlpha = s.deep * fade;
        g.beginPath();
        g.ellipse(x, y, long, thick, tilt + s.lean, 0, TAU);
        g.fill();
      });
    }

    // 각진 파편. 모서리가 선 조각이 돌면서 흘러간다. 넷에 하나는 푸른 빛이다
    if (chips.length) {
      const made = chips.map((c) => {
        const { p, fade } = flowing(c.phase, held, knobs.speed);
        const [x, y] = at(-L * 0.05 + p * L * 0.9, c.off * width);
        const r = c.size * fade;
        const spin = c.turn + turn * c.spin;
        return {
          kind: c.kind,
          paint: poly(
            Array.from({ length: 4 }, (_, i) => {
              const a = spin + (i / 4) * TAU;
              const reach = i % 2 === 0 ? r : r * c.squat;
              return [x + Math.cos(a) * reach, y + Math.sin(a) * reach];
            })
          )
        };
      });
      const dull = made.filter((c) => c.kind === "dark").map((c) => c.paint);
      const lit = made.filter((c) => c.kind === "cyan").map((c) => c.paint);
      if (dull.length) darken(every(dull));
      if (lit.length) glowWith("cyan", every(lit));
    }

    // 별. 네 갈래 반짝이 뒤로 점선 꼬리가 따라온다
    for (const kind of ["yellow", "cyan", "white"]) {
      const mine = sparks.filter((s) => s.kind === kind);
      if (!mine.length) continue;
      glowWith(
        kind,
        every(
          mine.map((s) => {
            const { p, fade } = flowing(s.phase, held, knobs.speed);
            const u = -L * 0.05 + p * L * 1.1;
            const [x, y] = at(u, s.off * width);
            const r = s.size * fade * (0.55 + 0.45 * Math.sin(turn * s.beat + s.twinkle));
            return (g) => {
              shapes.sparkle(g, x, y, Math.max(0.4, r), 0.22);
              g.fill();
              for (let i = 1; i <= s.tail; i += 1) {
                const [tx, ty] = at(u + i * width * 0.018, s.off * width);
                g.beginPath();
                g.arc(tx, ty, Math.max(0.3, r * 0.12 * (1 - i / (s.tail + 1))), 0, TAU);
                g.fill();
              }
            };
          })
        )
      );
    }

    // 불티. 머리 언저리에서 짧고 밝은 줄기가 튄다
    for (const kind of ["yellow", "pink"]) {
      const mine = embers.filter((e) => e.kind === kind);
      if (!mine.length) continue;
      glowWith(
        kind,
        every(
          mine.map((e) => {
            const { p, fade } = flowing(e.phase, held, knobs.speed * 2);
            const u0 = -L * 0.06 + p * L * 0.4;
            const len = width * e.len;
            return poly(facet(at, u0, u0 + len, e.off * width, (s) => e.half * fade * Math.pow(Math.sin(Math.PI * s), 0.7), { steps: 5 }));
          })
        )
      );
    }

    // 머리의 피벗은 머리 원점(HEAD 0), 광선이 시작하는 자리다. 머리에 딸린 것은 모두 이 점을
    // 붙박이로 두고 늘고 준다. 광선은 늘고 줄지 않으므로, 다른 점을 잡고 키우면 머리가 광선 위에서
    // 앞뒤로 미끄러진다
    const fromHead = (x, y, grow) => [hx + (x - hx) * grow, hy + (y - hy) * grow];
    const growAbout = (points, grow) => points.map(([x, y]) => fromHead(x, y, grow));

    // 머리의 큰 결정. 앞으로 솟고 뒤가 오목하게 파인다. 다 자란 모양을 먼저 짓고 머리 원점을 잡고
    // 늘고 준다
    if (knobs.spike > 0) {
      const grow = (1 - 0.12 * knobs.flicker + 0.12 * knobs.flicker * Math.sin(turn * spike.beat + spike.phase)) * (1 + 0.3 * burst);
      glowWith(
        "cyan",
        poly(
          growAbout(
            [
              at(-L * spike.tip * knobs.spike, 0),
              at(L * spike.back * knobs.spike, width * spike.wing * knobs.spike),
              at(L * spike.back * knobs.spike * spike.notch, 0),
              at(L * spike.back * knobs.spike, -width * spike.wing * knobs.spike)
            ],
            grow
          )
        )
      );
    }

    // 갈고리 가시. 안쪽이 오목하게 휜 흰 가시가 머리에서 뒤로 뻗는다
    const flicker = knobs.flicker;
    const pieces = { yellow: [], cyan: [], white: [], pink: [] };
    for (const b of barbs) {
      const grow = 1 - flicker + flicker * Math.pow(Math.max(0, Math.sin(turn * b.beat + b.phase)), 0.6);
      if (grow <= 0.05) continue;
      const barbAt = axis(b.side * b.spread * knobs.spread * 0.9);
      const len = L * b.len;
      const bow = width * b.bow * b.side;
      const thick = width * b.thick;
      pieces.white.push(
        poly(
          growAbout(
            [
              barbAt(0, 0),
              barbAt(len * 0.45, thick + bow * 0.35),
              barbAt(len, bow),
              barbAt(len * 0.5, bow * 0.45),
              barbAt(len * 0.2, thick * 0.2)
            ],
            grow
          )
        )
      );
    }

    // 부채꼴로 돋는 작은 결정 조각
    for (const s of shards) {
      const grow = (1 - flicker + flicker * Math.pow(Math.max(0, Math.sin(turn * s.beat + s.phase)), 0.7)) * (1 + 0.5 * burst);
      if (grow <= 0.02) continue;
      const turnTo = tilt + (s.forward ? Math.PI : 0) + s.side * s.spread * knobs.spread * (s.forward ? 0.6 : 1);
      const ux = Math.cos(turnTo);
      const uy = Math.sin(turnTo);
      const [bx0, by0] = at(s.base * L, s.offset * width);
      const len = width * s.len;
      const half = len * s.wide * 0.5;
      // 임팩트 프레임에는 조각도 흰빛이 된다
      pieces[burst > 0 && s.kind !== "pink" ? "white" : s.kind].push(
        poly(
          growAbout(
            [
              [bx0, by0],
              [bx0 + ux * len * 0.35 - uy * half, by0 + uy * len * 0.35 + ux * half],
              [bx0 + ux * len, by0 + uy * len],
              [bx0 + ux * len * 0.35 + uy * half, by0 + uy * len * 0.35 - ux * half]
            ],
            grow
          )
        )
      );
    }

    // 임팩트 프레임. 머리 원점에서 흰빛이 네 갈래로 터진다
    if (burst > 0) {
      pieces.white.push((g) => {
        shapes.sparkle(g, hx, hy, width * 0.3 * burst, 0.12);
        g.fill();
      });
      pieces.white.push((g) => {
        g.beginPath();
        g.arc(hx, hy, width * 0.055 * burst, 0, TAU);
        g.fill();
      });
    }
    for (const [kind, list] of Object.entries(pieces)) {
      if (list.length) glowWith(kind, every(list));
    }

    // 머리 매듭. 가장 앞의 분홍 심과 그 뒤의 노란 타원. 이것도 머리 원점을 잡고 뛴다
    const knot = 1 + 0.12 * Math.sin(turn * 2 + trailPhase);
    const beads = [
      ["pink", at(-L * 0.012, 0), width * 0.032, width * 0.02],
      ["yellow", at(L * 0.035, 0), width * 0.032, width * 0.013],
      ["white", at(0, 0), width * 0.012, width * 0.012]
    ];
    for (const [kind, spot, rx, ry] of beads) {
      const [x, y] = fromHead(spot[0], spot[1], knot);
      glowWith(
        kind,
        (g) => {
          g.beginPath();
          g.ellipse(x, y, rx * knot, ry * knot, tilt, 0, TAU);
          g.fill();
        },
        kind === "white" ? 0.9 : 1
      );
    }

    // 이 장의 뼈대. 인쇄기가 안내선(guides)에 넘긴다. 안내선이 판을 다시 계산하지 않고 이 장이 쓴
    // 값을 그대로 본다
    return { at, L, hx, hy, coreWidth, beat, held, clock, flashFrame, burst, span };
  },

  // 안내선. 인쇄된 픽셀은 건드리지 않고 화면 위에 겹쳐 그린다 — 축이 어디를 지나는지, 머리에 딸린
  // 것이 어느 점을 붙박이로 늘고 주는지, 광선이 어디까지 뻗는지를 눈으로 잡기 위한 것이다
  guides(page, sketch) {
    if (!sketch) return [];
    const { at, L, hx, hy, coreWidth, beat, held, clock, flashFrame, burst, span } = sketch;
    const marks = [];

    // 축. 머리 앞에서 꼬리 끝까지. 흐르는 것이 도는 구간과 같다
    marks.push({ kind: "line", from: at(-L * 0.15, 0), to: at(-L * 0.15 + span, 0), dash: true });

    // 주 광선의 윤곽. 납작한 면이 어디까지 부푸는지
    marks.push({ kind: "path", points: facet(at, 0, L, 0, (s) => coreWidth * taper(s), { steps: 9 }), dash: true });

    // 머리 원점. 광선이 여기서 시작하고, 머리에 딸린 것들의 피벗도 여기다
    marks.push({ kind: "dot", at: [hx, hy], r: 5, ring: 22, label: "PIVOT · HEAD 0", hot: true });

    // 박자. 지금 몇 번째 장인지, 임팩트 프레임이 언제 서는지. 그림을 가리지 않게 모서리에 적는다
    const drawn = Math.round(held * beat);
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `BEAT ${drawn}/${beat} · F${clock} · FLASH @${flashFrame}${burst > 0 ? " BURST" : ""}`,
      hot: burst > 0
    });
    return marks;
  }
};
