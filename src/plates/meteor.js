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
//   연기      머리 바로 뒤에서 크게 태어나 광선을 따라 흐르며 작아지는 납작한 어두운 타원. 머리 뒤에
//             한 덩이가 되고 그 뒤로 구슬이 줄지어 선다. 광선 위에 얹는다
//   파편      모서리가 선 조각이 돌면서 흘러간다
//   별        네 갈래 반짝이와 그 뒤를 따르는 점선 꼬리
//   불티      머리 언저리의 짧고 밝은 줄기
//   긴 가시    곧고 긴 흰 가시. 머리 원에서 부채꼴의 양쪽 가장자리를 따라 날아간다
//   결정 조각  머리 원에서 부채꼴 안으로 곧게 뻗어 나가는 작은 조각. 긴 가시와 함께 색끼리 한 번에
//             찍는다. 부채꼴(SPIKE)은 그리지 않는다 — 파편이 지나간 자리가 부채꼴을 그린다
//   머리      머리 원점을 가운데 둔 흰 원 하나
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
const MOST_SMOKE = 60; // 한 번에 보이는 연기 점의 끝값
const SMOKE_EARLY = 12; // 연기 점 가운데 예전 연기가 뽑던 자리에서 뽑는 수
const LOOP_SECONDS = 2; // 화면의 시계는 한 바퀴 48프레임, 초당 24프레임이다. 연기 이미터의 값은 초로 적는다
const MOST_BEAMS = 4;
const MOST_STREAKS = 30;
const MOST_CHIPS = 14;
const MOST_SPARKS = 40;
const MOST_EMBERS = 12;
const MOST_BARBS = 8; // 긴 가시는 둘씩 짝이라 쌍은 넷이다
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
    { group: "HEAD", key: "spike", label: "SPIKE", min: 0.2, max: 1.6, step: 0.05, value: 1, hint: "파편이 머리에서 부채꼴로 뻗어 나가는 거리. 부채꼴의 크기다" },
    { group: "HEAD", key: "barbs", label: "BARBS", min: 0, max: MOST_BARBS, step: 2, value: 2, hint: "부채꼴의 양쪽 가장자리를 따라 날아가는 긴 흰 가시의 수. 좌우 한 쌍씩 같은 모양이다" },
    { group: "HEAD", key: "shards", label: "SHARDS", min: 0, max: MOST_SHARDS, step: 1, value: 12, hint: "머리에서 부채꼴로 뻗어 나가는 조각의 수. 한 번에 보이는 수다" },
    { group: "HEAD", key: "spread", label: "SPREAD", min: 0.2, max: 1.4, step: 0.05, value: 0.85, hint: "파편이 뻗어 나가는 부채꼴의 반각(라디안). 끝값(80°)에서도 파편은 꼬리 쪽으로만 날아간다" },
    { group: "HEAD", key: "flicker", label: "FLICKER", min: 0, max: 1, step: 0.05, value: 0.8, hint: "박자마다 두 자세를 오가는 정도. 투스로 끓이는 작화다. 0이면 가만히 있다" },
    { group: "FLOW", key: "streaks", label: "STREAKS", min: 0, max: 30, step: 1, value: 14, hint: "머리에서 뻗어 나가는 어두운 속도선의 수" },
    { group: "FLOW", key: "chips", label: "CHIPS", min: 0, max: 14, step: 1, value: 7, hint: "흘러가는 각진 파편의 수" },
    { group: "FLOW", key: "sparks", label: "SPARKS", min: 0, max: 40, step: 1, value: 14, hint: "점선 꼬리를 단 별의 수" },
    // 한 바퀴에 몇 번 흘러가는가. 정수여야 한 바퀴 끝에서 제자리로 돌아온다
    { group: "FLOW", key: "speed", label: "SPEED", min: 1, max: 3, step: 1, value: 1, hint: "둘레가 흘러가는 빠르기. 한 바퀴에 몇 번 지나가는가. 연기는 제 손잡이(SMOKE 칸)를 따른다" },
    // 연기 이미터. 이펙트 툴의 이미터 값을 그대로 둔다 — 뿜는 빈도, 수명, 빠르기와 끌림, 크기와 수명에 따른 크기
    { group: "SMOKE", key: "freq", label: "FREQ", min: 0, max: 60, step: 1, value: 24, hint: "뿜는 빈도(spawn rate). 1초에 몇 개를 뿜는가. 한 번에 보이는 점은 FREQ × LIFETIME개이고 60개까지다. 0이면 연기가 없다" },
    { group: "SMOKE", key: "lifetime", label: "LIFETIME", min: 0.2, max: 2, step: 0.05, value: 1, hint: "점 하나가 사는 시간(초). 루프가 닫히도록 한 바퀴(2초)를 똑같이 나눈 값(2 · 1 · 0.67 · 0.5 …)으로 맞춰진다. 길수록 오래 남아 멀리 간다" },
    { group: "SMOKE", key: "velocity", label: "VELOCITY", min: 0.05, max: 1.5, step: 0.05, value: 0.45, hint: "흐르는 빠르기. 1초에 광선 길이의 몇 배를 가는가. 구슬 줄의 길이는 VELOCITY × LIFETIME이다" },
    { group: "SMOKE", key: "drag", label: "DRAG", min: 0, max: 1, step: 0.05, value: 0, hint: "끌림. 0이면 고른 빠르기로 흐르고, 올릴수록 갓 난 점이 빠르게 튀어 나갔다가 느려져 구슬이 꼬리 쪽에 몰린다" },
    { group: "SMOKE", key: "size", label: "SIZE", min: 0.3, max: 2, step: 0.05, value: 1, hint: "갓 난 타원의 크기. 머리 뒤 덩이의 크기다" },
    { group: "SMOKE", key: "shrink", label: "SHRINK", min: 0, max: 6, step: 0.1, value: 3, hint: "사는 동안 작아지는 모양(size over life). 0이면 고르게 줄고, 높을수록 덩이를 벗어나자마자 작아져 구슬이 떨어져 선다" },
    { group: "SMOKE", key: "stretch", label: "STRETCH", min: 0, max: 2, step: 0.05, value: 1, hint: "갓 난 타원이 축을 따라 길쭉한 정도. 흐르며 동그래져 끝에서는 원이 된다. 0이면 처음부터 원이다" },
    { group: "SMOKE", key: "scatter", label: "SCATTER", min: 0, max: 1, step: 0.05, value: 0.25, hint: "옆으로 벌어지는 정도. 0이면 구슬이 광선과 한 줄로 선다" },
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
    // 연기 점 하나. 언제나 여섯 번 뽑는다. 앞의 열둘은 여기서, 나머지는 맨 뒤에서 뽑는다 — 예전 연기가
    // 이 자리에서 여섯 번씩 열둘을 뽑았으므로, 점을 늘려도 뒤의 층들이 제자리에 있다
    const smokeDot = () => ({
      born: layout.next(),
      reach: layout.next(),
      size: layout.next(),
      off: layout.float(-1, 1),
      drift: layout.float(-1, 1),
      stretch: layout.next()
    });
    const smokeEarly = Array.from({ length: SMOKE_EARLY }, smokeDot);
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
    // 긴 가시는 좌우 한 쌍씩 같은 모양이다. 바깥 쌍부터 뽑는다
    const hooks = Array.from({ length: MOST_BARBS / 2 }, () => ({
      born: layout.float(0, 1),
      len: layout.float(0.12, 0.18),
      thick: layout.float(0.012, 0.02)
    })).slice(0, Math.floor(knobs.barbs / 2));
    // 뿜어 나가는 조각. 빗살 하나에 하나씩 앉는다. aim은 칸 안에서의 흔들림, born은 태어나는 때의
    // 흔들림이다(둘 다 칸과 간격에 대한 비율)
    const shards = Array.from({ length: MOST_SHARDS }, () => ({
      aim: layout.float(-0.35, 0.35),
      born: layout.float(-0.25, 0.25),
      size: layout.float(0.75, 1.15),
      reach: layout.float(0.8, 1.2),
      wide: layout.float(0.22, 0.3),
      accent: layout.chance(0.16)
    })).slice(0, knobs.shards);
    // 부채꼴의 반지름(축 길이에 대한 비율)
    const spike = { reach: layout.float(0.13, 0.2) };
    // 연기 점의 나머지. 맨 마지막 뽑기라 빼거나 바꿔도 다른 자리는 그대로다
    const smokeAll = [...smokeEarly, ...Array.from({ length: MOST_SMOKE - SMOKE_EARLY }, smokeDot)];

    // 연기 이미터. 점 하나는 한 바퀴에 lives번 다시 태어나므로 수명은 한 바퀴의 1/lives다. 정수여야 루프가
    // 닫힌다. 1초에 FREQ개를 뿜으려면 한 번에 FREQ × 수명개가 살아 있어야 한다
    const lives = Math.max(1, Math.round(LOOP_SECONDS / knobs.lifetime));
    const lifetime = LOOP_SECONDS / lives;
    const smoke = smokeAll.slice(0, Math.min(MOST_SMOKE, Math.round(knobs.freq * lifetime)));

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

    // 머리의 채비. 머리의 층과 연기가 함께 쓰므로 찍기 전에 정한다.
    //
    // 머리의 피벗은 머리 원점(HEAD 0), 광선이 시작하는 자리다. 머리에 딸린 것은 모두 이 점에 뿌리를
    // 두고 이 점을 잡고 늘고 준다. 광선은 늘고 줄지 않으므로, 다른 점을 잡고 키우면 머리가 광선 위에서
    // 앞뒤로 미끄러진다

    // 머리의 자세. 박자마다 두 자세를 번갈아 오간다 — 이펙트 작화가 투스로 끓이는 방식이다. 조각마다
    // 따로 흔들면 장마다 윤곽이 제멋대로 바뀐다. 한 바퀴의 장 수가 짝수면 이음매에서도 번갈아 든다
    const drawing = Math.round(held * beat) % beat;
    const pose = (drawing % 2 === 0 ? 1 : -1) * knobs.flicker;

    // 유성의 머리는 머리 원점을 가운데 둔 원이다. 부채꼴과 흰 원이 같은 반지름을 쓴다
    const pulse = 1 + 0.12 * Math.sin(turn * 2 + trailPhase);
    const headRadius = width * 0.026 * pulse;

    // 파편의 부채꼴. 부채꼴은 그려 두는 모양이 아니라 파편이 날아가는 궤적이다. 파편은 머리 원의
    // 가장자리에서 튀어나와 머리 원점을 가운데 둔 부채꼴 안에서 곧게 뻗어 나가고, 그 지나간 자리가
    // 부채꼴을 그린다. 둥근 앞쪽은 곧 머리의 원이다. 반각은 SPREAD, 반지름은 SPIKE다. 파편은 한 바퀴에
    // 2 × SPEED번 태어나 루프가 닫히고, 태어나서 빠르게 튀어 나갔다가 느려지며 작아져 사라진다
    const rate = 2 * Math.max(1, Math.round(knobs.speed));
    const flight = L * spike.reach * knobs.spike * (1 + 0.08 * pose) * (1 + 0.3 * burst);
    const lifeOf = (born) => {
      const age = (((born + held * rate) % 1) + 1) % 1;
      return { age, out: 1 - (1 - age) * (1 - age), grow: Math.min(1, age / 0.12) * Math.pow(1 - age, 0.7) };
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

    // 연기. 받은 분해 장면의 Dots 이미터다(0:13~0:14). 점은 모두 머리 바로 뒤에서 크고 길쭉한 타원으로
    // 태어나 고른 빠르기로 꼬리 쪽으로 흐르며 작아지고 동그래져, 끝에서는 원이 된다. 그래서 머리 뒤에는
    // 갓 난 큰 타원이 늘 겹쳐 한 덩이를 이루고, 그 뒤로 점점 작아지는 구슬이 광선을 따라 거의 한 줄로
    // 선다. 점마다 축을 따라 눕고 옆으로는 거의 벌어지지 않는다. 덩이를 벗어나자마자 빠르게 작아져
    // 구슬이 서로 떨어져 선다.
    //
    // 피벗은 가장 컸을 때의 진행 방향 맨 앞 끝이다. 작아지고 동그래지면서 그 점으로 오므라드므로, 원이
    // 되어도 느려 보이지 않는다. 머리 쪽 끝에 두었을 때는 줄어드는 만큼 모양이 뒤로 끌려, 원이 될 때
    // 느려 보였다. 가장 클 때 머리 쪽 끝이 머리 원점 바로 뒤에 닿으므로 머리 앞으로 나오지 않는다.
    //
    // 값은 이펙트 툴의 이미터처럼 둔다(SMOKE 칸) — 뿜는 빈도(FREQ), 수명(LIFETIME), 흐르는 빠르기와
    // 끌림(VELOCITY · DRAG), 갓 난 크기와 수명에 따른 크기(SIZE · SHRINK), 길쭉함(STRETCH), 옆으로
    // 벌어짐(SCATTER). 기본은 1초에 스물네 개를 뿜어 1초 산다. 기본 박자(BEAT 12)에서 여섯 장쯤이다.
    // 세 장만 살 때는 점이 흐르기보다 깜빡이다 사라졌다.
    //
    // 겹친 자리가 더 진해지지 않게 한 길에 모아 한 번에 찍는다. 광선 위에 얹는다 — 구슬이 광선과 한
    // 줄이라 광선 밑에 깔면 다 가려진다. 색은 분해 장면의 완성본처럼 어둠이다. 흰 타원이면 흰 조각과
    // 가시가 덩이에 묻히고 머리의 흰 원이 덩이와 한 덩어리가 된다
    // 연기 점 하나가 가장 클 때의 반지름(긴 축)에 대한 비율. 크기는 자라기를 마치는 나이 0.04에서 가장
    // 크고, 박자의 자세(FLICKER)만큼 더 부푼다
    const smokePeak = 0.96 * Math.exp(-0.04 * knobs.shrink) * (1 + 0.06 * knobs.flicker);
    const smokeReach = L * knobs.velocity * lifetime;
    if (smoke.length) {
      const count = smoke.length;
      darken((g) => {
        g.beginPath();
        smoke.forEach((d, i) => {
          const age = (((i * 0.6180339887 + d.born / count + held * lives) % 1) + 1) % 1;
          // 수명에 따른 크기. 끝으로 갈수록 0이라 되감기는 자리에서 튀지 않는다
          const shrink = Math.min(1, age / 0.04) * (1 - age) * Math.exp(-knobs.shrink * age);
          if (shrink <= 0.01) return;
          const full = width * (0.06 + 0.04 * d.size) * knobs.size;
          const long = full * shrink * (1 + 0.06 * pose);
          // 갓 난 것은 길쭉하고 흐르며 동그래져, 끝에서는 원이다
          const thick = long / (1 + knobs.stretch * (3 + 0.6 * d.stretch) * Math.pow(1 - age, 1.5));
          // 피벗은 가장 컸을 때의 진행 방향 맨 앞 끝(꼬리 쪽 끝)이다. 점은 이 점을 따라 흐르고, 작아지며
          // 이 점으로 오므라들어 원이 된다. 가장 클 때 머리 쪽 끝이 머리 원점 바로 뒤에 닿는다
          const flow = 1 - Math.pow(1 - age, 1 + 3 * knobs.drag);
          const lead = headRadius * 0.2 + 2 * full * smokePeak + smokeReach * (0.78 + 0.44 * d.reach) * flow;
          const middle = lead - long;
          const lean = d.drift * 0.16 * knobs.scatter;
          const [x, y] = at(middle, d.off * headRadius * 1.6 * knobs.scatter + middle * lean);
          const tip = tilt + lean;
          g.moveTo(x + Math.cos(tip) * long, y + Math.sin(tip) * long);
          g.ellipse(x, y, long, thick, tip, 0, TAU);
        });
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

    // 머리에 딸린 조각은 색끼리 모아 한 번에 찍는다
    const pieces = { yellow: [], cyan: [], white: [], pink: [] };
    // 머리 원점에서 방향 angle로 거리 r만큼 간 자리에, 그 방향으로 누운 조각 하나(제 좌표 a · b)를 놓는다
    const place = (points, angle, r) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return poly(points.map(([a, b]) => at((r + a) * cos - b * sin, (r + a) * sin + b * cos)));
    };

    // 긴 가시. 부채꼴의 양쪽 가장자리 궤적을 따라 좌우 한 쌍씩 같은 모양으로 날아간다. 바깥 쌍이
    // 가장자리에 붙고 안쪽 쌍일수록 조금씩 안으로 든다. 쌍마다 태어나는 때가 다르다. 조각과 같이 곧다 —
    // 피벗은 밑동, 노말은 머리 원점에서 곧게 뻗는 쪽이다. 끝을 꼬리 쪽으로 휘게 두었더니 몸통이 머리
    // 원점을 향하지 않아, 곧게 뻗는 조각들 사이에서 미묘하게 어긋나 보였다
    hooks.forEach((h, pair) => {
      const { out, grow } = lifeOf(pair * 0.6180339887 + h.born);
      if (grow <= 0.02) return;
      const len = L * h.len * 0.8 * grow * (1 + 0.06 * pose);
      const thick = width * h.thick * grow;
      const angle = knobs.spread * (1 - 0.14 * pair);
      const blade = [[0, 0], [len * 0.3, thick], [len, 0], [len * 0.3, -thick]];
      for (const side of [1, -1]) pieces.white.push(place(blade, side * angle, headRadius + out * flight));
    });

    // 조각. 조각 수만큼 고르게 나눈 칸(lane)마다 하나씩, 칸 안에서 조금 흔들린 방향으로 뻗어 나간다.
    // 가운데(꼬리 축 쪽)가 길고 멀리 가며 바깥으로 갈수록 짧다. 태어나는 때는 황금비로 흩어 늘 고른
    // 흐름이 서고, 이웃한 칸이 함께 태어나지 않는다.
    //
    // 색은 나이를 따른다. 갓 태어나면 희고, 노랗다가, 끝에서 분홍으로 식는다. 여섯에 하나쯤은 내내 푸른
    // 강조다. 임팩트 프레임에는 분홍 말고는 모두 희다
    const count = shards.length;
    shards.forEach((s, i) => {
      const slot = count > 1 ? -1 + (2 * i + 1) / count : 0;
      const angle = knobs.spread * (slot + s.aim / Math.max(1, count));
      const { age, out, grow } = lifeOf(i * 0.6180339887 + s.born / Math.max(1, count));
      if (grow <= 0.02) return;
      const len = width * 0.085 * s.size * (1 - 0.45 * slot * slot) * grow * (1 + 0.1 * pose) * (1 + 0.5 * burst);
      const half = len * s.wide * 0.5;
      // 피벗은 밑동(머리 쪽 끝)이고, 노말은 머리 원점에서 곧게 뻗는 쪽이다. 모든 조각이 같다 — 몸통
      // 가운데를 잡고 키우면 자라면서 꼬리가 머리 원 안으로 파고들어, 가장자리에서 돋는 것으로 보이지 않는다
      const kite = [[0, 0], [len * 0.45, half], [len, 0], [len * 0.45, -half]];
      const hue = s.accent ? "cyan" : age < 0.22 ? "white" : age < 0.6 ? "yellow" : "pink";
      pieces[burst > 0 && hue !== "pink" ? "white" : hue].push(place(kite, angle, headRadius + out * flight * s.reach * (1 - 0.25 * slot * slot)));
    });

    // 임팩트 프레임. 머리 원점에서 흰빛이 네 갈래로 사방에 터진다. 머리가 뿜어 내는 조각이 아니라 두
    // 프레임 동안 번쩍하는 빛이라, 앞으로도 터져야 무언가에 부딪힌 것처럼 보인다
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

    // 유성의 머리. 머리 원점을 가운데 둔 흰 원 하나면 된다. 여러 모양을 겹쳐 머리를 지으면 어느 것이
    // 머리인지 흐려진다. 광선보다 조금 넓어 머리로 읽히고, 부채꼴의 둥근 앞끝에 꼭 맞게 앉아 가시의
    // 뿌리와 조각이 태어나는 자리를 덮는다. 머리 원점을 잡고 부풀었다 가라앉는다
    glowWith("white", (g) => {
      g.beginPath();
      g.arc(hx, hy, headRadius, 0, TAU);
      g.fill();
    });

    // 이 장의 뼈대. 인쇄기가 안내선(guides)에 넘긴다. 안내선이 판을 다시 계산하지 않고 이 장이 쓴
    // 값을 그대로 본다
    return { at, L, hx, hy, coreWidth, beat, held, clock, flashFrame, burst, span, smoke: { count: smoke.length, lifetime, end: headRadius * 0.2 + 2 * width * 0.08 * knobs.size * smokePeak + smokeReach } };
  },

  // 안내선. 인쇄된 픽셀은 건드리지 않고 화면 위에 겹쳐 그린다 — 축이 어디를 지나는지, 머리에 딸린
  // 것이 어느 점을 붙박이로 늘고 주는지, 광선이 어디까지 뻗는지를 눈으로 잡기 위한 것이다
  guides(page, sketch) {
    if (!sketch) return [];
    const { at, L, hx, hy, coreWidth, beat, held, clock, flashFrame, burst, span, smoke } = sketch;
    const marks = [];

    // 축. 머리 앞에서 꼬리 끝까지. 흐르는 것이 도는 구간과 같다
    marks.push({ kind: "line", from: at(-L * 0.15, 0), to: at(-L * 0.15 + span, 0), dash: true });

    // 주 광선의 윤곽. 납작한 면이 어디까지 부푸는지
    marks.push({ kind: "path", points: facet(at, 0, L, 0, (s) => coreWidth * taper(s), { steps: 9 }), dash: true });

    // 머리 원점. 광선이 여기서 시작하고, 머리에 딸린 것들의 피벗도 여기다
    marks.push({ kind: "dot", at: [hx, hy], r: 5, ring: 22, label: "PIVOT · HEAD 0", hot: true });

    // 연기 점의 피벗(가장 컸을 때의 앞 끝)이 사는 동안 가는 끝. 구슬 줄이 여기쯤에서 원이 되어 사라진다
    if (smoke.count) marks.push({ kind: "dot", at: at(smoke.end, 0), r: 3, label: "SMOKE END" });

    // 박자. 지금 몇 번째 장인지, 임팩트 프레임이 언제 서는지. 연기가 실제로 뿜는 빈도와 수명 — 루프가
    // 닫히도록 맞춘 값이라 손잡이와 조금 다를 수 있다. 그림을 가리지 않게 모서리에 적는다
    const drawn = Math.round(held * beat);
    const puffs = smoke.count ? ` · SMOKE ${Math.round(smoke.count / smoke.lifetime)}/S × ${smoke.lifetime.toFixed(2)}S = ${smoke.count}` : "";
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `BEAT ${drawn}/${beat} · F${clock} · FLASH @${flashFrame}${burst > 0 ? " BURST" : ""}${puffs}`,
      hot: burst > 0
    });
    return marks;
  }
};
