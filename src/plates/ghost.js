// 유령. 인쇄기가 내는 두 가지 유령이 곧 그림이다.
//
// 리소는 통 하나에 한 번씩 종이를 통과시킨다. 종이가 매번 똑같은 자리로 돌아오지 않으므로, 두 통을
// 쓰는 것은 무엇이든 1~4밀리쯤 어긋나 찍힌다(미스레지스트레이션). 그리고 드럼이 잉크를 집었다가
// 엉뚱한 자리에 다시 내려놓는 일이 있다 — 인쇄쟁이들이 고스팅이라 부르는 것으로, 그림이 종이가
// 지나가는 쪽으로 한 번 더, 더 옅게 찍혀 나온다.
//
// 이 판은 그 둘을 주제로 삼는다. 유령은 그려 넣은 것이 아니라 인쇄기가 만든 것이다.
//
//   밤      모든 통으로 깐 어두운 바탕. 아래로 갈수록 짙어진다
//   거미줄  모서리에 걸린 줄. 살이 모서리에서 뻗고 그 사이를 늘어진 줄이 잇는다. 그리는 것이 아니라
//           작도다 — 살의 각을 고르게 나누고, 이웃한 살 사이마다 줄이 제 무게로 처진다
//   고스팅  유령의 꼴이 종이가 가는 쪽으로 몇 번 더, 점점 옅게 찍힌다. 잉크가 잘못 놓인 자리다
//   몸      통마다 조금씩 어긋난 자리에서 밤을 파낸다. 세 통이 함께 파낸 한가운데는 종이가 되고,
//           한 통이 놓친 가장자리에는 그 통의 색만 남아 옅은 테가 된다. 그 테가 유령의 테두리다
//   눈      구멍 둘. 몸과 같은 어긋남을 함께 받는다
//   헤드셋  머리띠는 돔과 같은 타원을 두께만큼 밖으로 민 띠이고, 이어컵은 그 띠가 멎는 자리에
//           머리 면과 직각으로 앉은 둥근 모서리다. 좌우가 같지 않다 — 머리가 살짝 돌아 있어서
//           가까운 쪽 컵은 온전히 보이고 먼 쪽은 납작하게 줄어 머리 뒤로 들어간다. 몸과 달리
//           파내지 않고 얹으므로, 같은 어긋남이 이번에는 어두운 쪽에 테를 남긴다
//
// 꼴은 그리지 않고 규칙으로 짓는다 — 반원 지붕에 곧은 옆선, 밑단은 물결이다. 해파리의 종과 같은
// 어휘다. 가장자리는 손으로 오린 듯 흔들린다.

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { meteorInks } from "../drums.js";
import { carve, stain } from "../night.js";
import { dim } from "../scope.js";
import { stainsFor, soak } from "../stains.js";
import { glowMask, layGlow } from "../blur.js";

const TAU = Math.PI * 2;
const MOST_GHOSTS = 9;

// 유령 하나의 꼴. 반원 지붕에 곧은 옆선, 밑단은 물결이다. 코가 아니라 가운데가 원점이다
function sheetShape(cx, cy, wide, tall, lobes, phase) {
  const points = [];
  const dome = 30;
  for (let i = 0; i <= dome; i += 1) {
    const a = Math.PI + (Math.PI * i) / dome;
    points.push([cx + Math.cos(a) * wide * 0.5, cy + Math.sin(a) * tall * 0.5]);
  }
  const hem = 60;
  for (let i = 0; i <= hem; i += 1) {
    const at = 1 - i / hem;
    // 가리비 하나가 둥글게 늘어지고 사이가 패인다. 절댓값 사인이라 배가 둥글고 사이가 좁다
    // 한 가리비가 깊이보다 넓어야 천 자락으로 읽힌다. 깊으면 이빨이 된다
    const sag = Math.abs(Math.sin(at * Math.PI * lobes + phase)) * tall * 0.07;
    points.push([cx - wide * 0.5 + wide * at, cy + tall * 0.4 + sag]);
  }
  return points;
}

// 둥근 모서리의 네모. n이 클수록 네모에 가깝다. 이어컵의 꼴이다
function roundBox(px, py, halfW, halfH, n, turn) {
  const points = [];
  const steps = 44;
  const co = Math.cos(turn);
  const si = Math.sin(turn);
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * TAU;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * halfW;
    const ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) * halfH;
    points.push([px + ex * co - ey * si, py + ex * si + ey * co]);
  }
  return points;
}

export const ghost = {
  id: "ghost",
  name: "GHOST",
  about: "인쇄기가 내는 유령 — 통마다 어긋난 자리와, 잉크가 잘못 놓인 자리",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "유령의 자리와 손떨림을 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 0.95, hint: "밤의 어둠. 유령은 이 밤을 파낸 자리다" },
    { key: "count", label: "COUNT", min: 1, max: MOST_GHOSTS, step: 1, value: 1, hint: "유령의 수. 하나면 하나가 크게 선다" },
    { key: "size", label: "SIZE", min: 0.1, max: 0.7, step: 0.01, value: 0.46, hint: "유령의 크기. 판 폭에 대한 비율이다" },
    { key: "hem", label: "HEM", min: 2, max: 9, step: 1, value: 4, hint: "밑단 가리비의 수. 많을수록 자락이 잘게 늘어진다" },
    { key: "slip", label: "SLIP", min: 0, max: 6, step: 0.1, value: 2.4, hint: "통마다 어긋나는 거리(밀리). 실제 리소가 1~4밀리 어긋난다. 0이면 딱 맞아 테가 없다" },
    { key: "ghosts", label: "GHOSTS", min: 0, max: 5, step: 1, value: 3, hint: "잉크가 잘못 놓여 한 번 더 찍히는 수. 종이가 가는 쪽으로 점점 옅게 남는다" },
    { key: "fade", label: "FADE", min: 0.05, max: 0.7, step: 0.05, value: 0.25, hint: "잘못 놓인 자국이 얼마나 진한가. 첫 자국의 진하기다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "가장자리가 손으로 오린 듯 흔들리는 정도" },
    { key: "eyes", label: "EYES", min: 0, max: 1, step: 0.05, value: 0.3, hint: "구멍 둘의 크기. 0이면 눈이 없다" },
    { key: "phones", label: "PHONES", min: 0, max: 1.4, step: 0.05, value: 1, hint: "유령이 쓴 헤드셋의 크기. 머리띠의 두께와 이어컵의 크기를 함께 정한다. 0이면 쓰지 않는다" },
    { key: "web", label: "WEB", min: 0, max: 1, step: 0.05, value: 0.7, hint: "거미줄이 뻗는 거리. 판 폭에 대한 비율이고, 여백 밖으로 넘은 줄은 잘린다. 0이면 거미줄이 없다" },
    { key: "threads", label: "THREADS", min: 6, max: 16, step: 1, value: 9, hint: "거미줄의 살 수. 살 사이를 잇는 줄은 그 절반쯤이다. 여섯보다 적으면 그물로 읽히지 않는다" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.35, hint: "밤이 얼룩덜룩한 정도. 해파리의 물과 같은 얼룩이다" },
    { key: "halo", label: "HALO", min: 0, max: 1, step: 0.05, value: 0, hint: "유령 둘레의 번짐. 기본은 0이다 — 납작한 면과 또렷한 가장자리가 이 판의 문법이고, 번지면 리소가 아니라 사진이 된다" },
    { key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 16, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊긴다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 또박또박한 박자. 한 바퀴를 BEAT장으로 나누고 그 장의 시간으로만 그린다
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;
    const turn = held * TAU;

    const seed = fieldSeed(page, 0x2f6a88c1);
    const layout = makeRng(seed);
    const cut = makeRng((seed ^ 0x27d4eb2f) >>> 0);

    const inks = S.drums.map((drum) => drum.separation);
    const { glowInk, darkInk } = meteorInks(S.drums, S.key);

    // 자리. 판 가운데를 중심으로 늘어선다 — 하나면 한가운데, 여럿이면 가운데를 두고 양옆으로 고르게
    // 벌어진다. 뽑은 값은 자리가 아니라 그 자리에서의 흔들림이다. 언제나 끝값만큼 뽑고 COUNT는
    // 그중 몇을 쓸지만 정한다
    const crowd = Array.from({ length: MOST_GHOSTS }, () => ({
      x: layout.float(-1, 1),
      y: layout.float(-1, 1),
      size: layout.float(0.6, 1.25),
      lobes: layout.int(0, 2),
      phase: layout.float(0, TAU),
      bob: layout.int(1, 2),
      lean: layout.float(-0.12, 0.12)
    })).slice(0, Math.round(knobs.count));
    // 가운데 정렬. 줄의 폭은 수에 따라 벌어지되 판을 넘지 않는다
    const spacing = crowd.length > 1 ? Math.min(0.74 / (crowd.length - 1), 0.3) : 0;
    crowd.forEach((one, i) => {
      one.at = 0.5 + (i - (crowd.length - 1) / 2) * spacing + one.x * spacing * 0.12;
      one.high = 0.5 + one.y * (crowd.length > 1 ? 0.1 : 0.03);
    });

    // 밤. 위가 짙고 아래로 갈수록 옅어진다. 가장자리를 누른다
    const dark = knobs.dark;
    S.key.ramp(0, 0, width, height, { from: dark * 0.72, to: dark });
    S.wash.ramp(0, 0, width, height, { from: dark * 0.45, to: dark * 0.2 });
    if (S.body !== S.wash) S.body.ramp(0, 0, width, height, { from: dark * 0.25, to: dark * 0.6 });
    // 얼룩. 해파리의 물과 같다 — 옅은 두 통이 서로 다른 밭을 따라 번져, 고른 계조가 아니라 밤이 된다
    if (knobs.stain > 0) {
      const made = stainsFor(page.seed, knobs.stain, 0.6);
      soak(S.wash, made.wash, width, height);
      soak(S.body, made.body, width, height);
    }
    dim(S.key, page, width * 0.85, 0.85);

    // 거미줄. 네 모서리 가운데 하나에 걸리고, 여백 안쪽에서만 산다 — 걸리는 자리는 판 끝이 아니라
    // 여백 안쪽 모서리이고, 여백 밖으로 넘은 줄은 거기서 잘린다. 재단선까지 흘러 나가면 잘린
    // 그물이 된다. 살은 모서리에서 사분면을 고르게 가르며 뻗고, 이웃한 살 사이를 잇는 줄은 제
    // 무게로 안쪽으로 처진다. 줄은 둥근 호다 — 여백을 따라 돌면 그물이 아니라 테두리가 된다
    const web = width * knobs.web;
    if (web > 4) {
      const spin = makeRng((seed ^ 0x5bd1e995) >>> 0);
      const corner = layout.int(0, 3);
      const inset = page.margin;
      const ox = corner % 2 === 0 ? inset : width - inset;
      const oy = corner < 2 ? inset : height - inset;
      const turnTo = Math.atan2(corner < 2 ? 1 : -1, corner % 2 === 0 ? 1 : -1);
      const spokes = Math.round(knobs.threads);
      const rings = Math.max(2, Math.round(spokes * 0.55));
      // 실은 0.7밀리쯤이다. 리소의 원지가 그보다 가는 줄은 붙들지 못한다
      const thread = Math.max(1.2, width * 0.0034);
      // 살은 고르게 벌어지되 꼭 같지는 않다. 양 끝 둘은 여백의 두 변에 붙어 거미줄을 모서리에 맨다
      const arms = Array.from({ length: spokes }, (_, i) => {
        const even = (i / (spokes - 1) - 0.5) * (Math.PI / 2);
        const edge = i === 0 || i === spokes - 1 ? 0 : spin.float(-0.35, 0.35) / spokes;
        return turnTo + even + edge;
      });
      const at = (a, r) => [ox + Math.cos(a) * r, oy + Math.sin(a) * r];
      const draw = (paint) => {
        carve(inks, paint, 0.88);
        if (glowInk) stain([glowInk], paint, 0.16);
      };
      draw((g) => {
        g.save();
        g.beginPath();
        g.rect(inset, inset, width - inset * 2, height - inset * 2);
        g.clip();
        g.lineWidth = thread;
        g.lineCap = "round";
        g.lineJoin = "round";
        // 살. 모서리에서 곧게 뻗는다
        for (const a of arms) {
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(...at(a, web));
          g.stroke();
        }
        // 살을 잇는 줄. 한가운데는 비워 두고(거미가 앉는 자리다), 칸마다 제 무게로 안쪽으로 처진다.
        // 줄 사이가 꼭 같지 않아야 자로 그은 것이 아니라 친 것이 된다
        for (let k = 1; k <= rings; k += 1) {
          const step = (0.76 * (k + spin.float(-0.22, 0.22))) / rings;
          const r = web * (0.24 + step);
          g.beginPath();
          for (let i = 0; i < arms.length - 1; i += 1) {
            const mid = (arms[i] + arms[i + 1]) / 2;
            if (i === 0) g.moveTo(...at(arms[0], r));
            g.quadraticCurveTo(...at(mid, r * 0.84), ...at(arms[i + 1], r));
          }
          g.stroke();
        }
        g.restore();
      });
    }

    // 손으로 오린 가장자리. 점마다 제자리에서 조금 흔들린다
    const shake = (points, amount) =>
      points.map(([x, y]) => [x + (cut.next() - 0.5) * amount, y + (cut.next() - 0.5) * amount]);
    const poly = (points) => (g) => {
      shapes.splinePath(g, points, true);
      g.fill();
    };

    // 밀리를 판형 픽셀로. A4 짧은 쪽을 210밀리로 친다
    const mm = width / 210;
    const slip = knobs.slip * mm;
    // 종이가 가는 쪽. 리소는 종이가 한 방향으로 지나가므로 어긋남도 잘못 놓인 자국도 그 축을 따른다
    const feedX = Math.cos(0.12);
    const feedY = Math.sin(0.12);

    for (const one of crowd) {
      const tall = width * knobs.size * one.size;
      const wide = tall * 0.78;
      // 떠 있는 것은 제자리에서 오르내리고 좌우로 흔들린다. 오르내림과 흔들림의 박자가 달라 같은
      // 자리를 두 번 지나지 않는다. 박자마다 한 걸음이고 한 바퀴에 정수 번이라 루프가 닫힌다
      const cx = width * one.at + Math.sin(turn * one.bob + one.phase) * tall * one.lean * 2.2;
      const cy = height * one.high + Math.cos(turn * (3 - one.bob) + one.phase) * tall * 0.08;
      const lobes = Math.round(knobs.hem) + one.lobes;
      const shape = shake(sheetShape(cx, cy, wide, tall, lobes, one.phase + turn * 2), tall * 0.015 * knobs.hand);
      const eyes = (dx, dy) => (g) => {
        const r = tall * 0.075 * knobs.eyes;
        if (r <= 0.4) return;
        for (const side of [-1, 1]) {
          g.beginPath();
          g.ellipse(cx + dx + side * wide * 0.19, cy + dy - tall * 0.08, r, r * 1.35, 0, 0, TAU);
          g.fill();
        }
      };
      const moved = (dx, dy) => shape.map(([x, y]) => [x + dx, y + dy]);

      // 고스팅. 드럼이 잉크를 집었다 엉뚱한 자리에 내려놓는다. 종이가 가는 쪽으로 한 번 더, 더 옅게
      for (let k = 1; k <= Math.round(knobs.ghosts); k += 1) {
        const away = tall * 0.55 * k;
        const tone = knobs.fade * Math.pow(0.55, k - 1);
        const paint = poly(moved(feedX * away, feedY * away));
        stain([S.key], paint, tone);
        if (glowInk) stain([glowInk], paint, tone * 0.7);
      }

      // 둘레의 번짐. 파낸 자리 둘레를 옅게 더 파내, 종이가 밤 속에서 빛나 보인다
      if (knobs.halo > 0) {
        // 번짐은 좁고 옅게. 넓으면 유령이 안개에 녹아 윤곽을 잃는다
        const mask = glowMask(shape, tall * 0.09);
        carve(inks, (g) => layGlow(g, mask, 1), knobs.halo * 0.22);
      }

      // 헤드셋. 머리띠는 돔과 같은 타원을 두께만큼 밖으로 민 띠다 — 머리 위에 따로 그린 활이
      // 아니라 머리의 곡선 그 자체이므로 어느 크기에서도 얹힌 것으로 읽힌다.
      //
      // 좌우는 같지 않다. 머리가 살짝 돌아서 있어서, 가까운 쪽 이어컵은 낮게 내려와 온전히 보이고
      // 먼 쪽은 높이 멎으며 반지름 쪽으로 납작하게 줄어든다. 먼 쪽은 몸보다 먼저 찍어 머리가 그
      // 안쪽을 파내게 두므로, 남는 것은 실루엣 밖으로 삐져나온 한 조각뿐이다. 거울처럼 접힌 헤드셋은
      // 정면을 보고 선 도면이 되고, 이렇게 어긋나야 고개를 돌린 것이 된다.
      //
      // 돌아선 쪽은 한 장에서 언제나 같다 — 가까운 쪽이 오른쪽이다. 한 장은 한 자리에서 본 것이므로
      // 유령마다 다른 쪽으로 돌면 보는 자리가 여럿이 되고, 그러면 한 장이 아니다
      const gear = [];
      const under = [];
      if (knobs.phones > 0) {
        const rx = wide * 0.5;
        const ry = tall * 0.5;
        const lift = tall * 0.012;
        const thick = tall * 0.07 * knobs.phones;
        const cupW = wide * 0.19 * knobs.phones;
        const cupH = wide * 0.23 * knobs.phones;
        // 띠가 양옆에서 멎는 각. 가까운 쪽은 눈 높이까지 내려오고 먼 쪽은 그 위에서 멎는다
        const nearA = TAU - 0.14;
        const farA = Math.PI + 0.4;
        const from = Math.min(nearA, farA);
        const to = Math.max(nearA, farA);
        const arc = (grow) => {
          const points = [];
          const steps = 40;
          for (let i = 0; i <= steps; i += 1) {
            const a = from + ((to - from) * i) / steps;
            points.push([cx + Math.cos(a) * (rx + grow), cy + Math.sin(a) * (ry + grow)]);
          }
          return points;
        };
        const hand = tall * 0.008 * knobs.hand;
        const seat = (a, grow) => [cx + Math.cos(a) * (rx + grow), cy + Math.sin(a) * (ry + grow)];
        // 먼 쪽 컵. 돌아선 만큼 반지름 쪽으로 줄어 납작하다. 몸보다 먼저 찍으므로 안쪽 절반은
        // 머리에 먹히고 실루엣 밖으로 삐져나온 한 조각만 남는다
        const [fx, fy] = seat(farA, lift + thick * 0.5);
        under.push({ points: shake(roundBox(fx, fy, cupW * 0.9, cupH * 0.58, 4, farA + Math.PI / 2), hand) });
        // 머리띠
        gear.push({ points: shake([...arc(lift + thick), ...arc(lift).reverse()], hand) });
        // 가까운 쪽 컵과 이어패드
        const [nx, ny] = seat(nearA, lift + thick * 0.5);
        gear.push({ points: shake(roundBox(nx, ny, cupW, cupH, 4, nearA + Math.PI / 2), hand) });
        // 이어패드. 통마다 조금씩 도로 파낸다. 한 통만 파내면 남은 통의 색이 통째로 드러나
        // 이어컵 한가운데에 밝은 덩이가 앉으므로, 모든 통에서 고르게 덜어 같은 색의 옅은 쪽으로
        // 간다. 따로 칠한 색이 아니라 덜 찍은 자리다
        gear.push({ points: shake(roundBox(nx, ny, cupW * 0.55, cupH * 0.55, 3, nearA + Math.PI / 2), hand), cut: true });
      }

      // 헤드셋 한 조각을 통마다 어긋난 자리에 놓는다
      const lay = (piece) => {
        inks.forEach((sep, index) => {
          const away = slip * (index - (inks.length - 1) / 2);
          const shift = poly(piece.points.map(([x, y]) => [x + feedX * away, y + feedY * away]));
          if (piece.cut) carve([sep], shift, 0.45);
          else stain([sep], shift, sep === S.key ? 1 : 0.88);
        });
      };
      under.forEach(lay);

      // 몸. 통마다 조금씩 어긋난 자리에서 밤을 파낸다. 셋이 함께 파낸 한가운데는 종이가 되고,
      // 한 통이 놓친 가장자리에는 그 통의 색만 남는다 — 그 테가 유령의 테두리다
      inks.forEach((sep, index) => {
        const away = slip * (index - (inks.length - 1) / 2);
        const dx = feedX * away;
        const dy = feedY * away;
        carve([sep], poly(moved(dx, dy)), 1);
        // 눈은 어긋남을 조금만 받는다. 통마다 따로 놓이면 눈이 아니라 색점 여섯이 된다
        stain([sep], eyes(dx * 0.25, dy * 0.25), 0.85);
      });

      // 헤드셋을 얹는다. 몸은 파낸 것이고 이것은 찍은 것이라, 같은 어긋남이 이번에는 어두운 쪽에
      // 테를 남긴다
      gear.forEach(lay);
    }

    return { crowd, mm, slip };
  },

  // 안내선. 유령마다 가운데를 찍고, 통이 어긋나는 거리를 적는다
  guides(page, sketch) {
    if (!sketch) return [];
    const marks = sketch.crowd.map((one) => ({
      kind: "dot",
      at: [page.width * one.at, page.height * one.high],
      r: 4
    }));
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `SLIP ${(sketch.slip / sketch.mm).toFixed(2)}MM · ${sketch.crowd.length} GHOSTS`
    });
    return marks;
  }
};
