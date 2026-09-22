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
//   방      오래된 저택의 방. 벽 아래 3분의 1에 판재를 두르고, 걸레받이 밑으로 넓은 마루가 소실점을
//           향해 물러난다. 모두 면을 파내 짓는다 — 판의 얼굴과 마루 널은 빛을 받아 옅고, 이음매와
//           틈은 파내지 않고 남은 밤이다
//   창문    벽에 난 내리닫이창. 유리만 파내고 창살과 틀은 남은 밤이다 — 어두운 방에서 보면 틀은 벽에
//           묻히고 살만 달빛 든 유리에 검게 선다. 비례는 조지안 창을 따른다
//   거미줄  모서리께에 온전히 걸린 둥근 그물. 살이 한가운데에서 사방으로 뻗고 그 사이를 늘어진 줄이
//           잇는다. 그리는 것이 아니라 작도다 — 살의 각을 고르게 나누고, 이웃한 살 사이마다 줄이 제
//           무게로 처지며, 바깥 틀에서 벽으로 줄 셋을 매어 건다
//   고스팅  유령의 꼴이 종이가 가는 쪽으로 몇 번 더, 점점 옅게 찍힌다. 잉크가 잘못 놓인 자리다
//   몸      통마다 조금씩 어긋난 자리에서 밤을 파낸다. 세 통이 함께 파낸 한가운데는 종이가 되고,
//           한 통이 놓친 가장자리에는 그 통의 색만 남아 옅은 테가 된다. 그 테가 유령의 테두리다
//   눈      구멍 둘. 몸과 같은 어긋남을 함께 받는다
//   턴테이블 유령 앞, 판 아래의 디제이 턴테이블. 테크닉스 SL-1200의 치수를 그대로 쓰고 조금 위에서
//           내려다본다. 음반은 한 바퀴에 정수 번 돌고, 홈이 받는 빛의 띠는 돌지 않는다
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
    { key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 1, hint: "밤의 어둠. 유령은 이 밤을 파낸 자리다" },
    { key: "count", label: "COUNT", min: 1, max: MOST_GHOSTS, step: 1, value: 1, hint: "유령의 수. 하나면 하나가 크게 선다" },
    { key: "size", label: "SIZE", min: 0.1, max: 0.7, step: 0.01, value: 0.42, hint: "유령의 크기. 판 폭에 대한 비율이다" },
    { key: "hem", label: "HEM", min: 2, max: 9, step: 1, value: 2, hint: "밑단 가리비의 수. 많을수록 자락이 잘게 늘어진다" },
    { key: "slip", label: "SLIP", min: 0, max: 6, step: 0.1, value: 0, hint: "통마다 어긋나는 거리(밀리). 실제 리소가 1~4밀리 어긋난다. 0이면 딱 맞아 테가 없다" },
    { key: "ghosts", label: "GHOSTS", min: 0, max: 5, step: 1, value: 1, hint: "잉크가 잘못 놓여 한 번 더 찍히는 수. 종이가 가는 쪽으로 점점 옅게 남는다" },
    { key: "fade", label: "FADE", min: 0.05, max: 0.7, step: 0.05, value: 0.7, hint: "잘못 놓인 자국이 얼마나 진한가. 첫 자국의 진하기다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.45, hint: "가장자리가 손으로 오린 듯 흔들리는 정도" },
    { key: "eyes", label: "EYES", min: 0, max: 1, step: 0.05, value: 1, hint: "구멍 둘의 크기. 0이면 눈이 없다" },
    { key: "phones", label: "PHONES", min: 0, max: 1.4, step: 0.05, value: 1.05, hint: "유령이 쓴 헤드셋의 크기. 머리띠의 두께와 이어컵의 크기를 함께 정한다. 0이면 쓰지 않는다" },
    { key: "fov", label: "FOV", min: 52, max: 110, step: 1, value: 52, hint: "눈의 화각(도). 기본은 가장 좁아 뒤 벽이 판을 가득 채운다. 넓히면 뒤 벽이 작아지며 옆벽과 천장과 마루가 드러나 소실점으로 모인다. 턴테이블도 같은 눈으로 본다" },
    { key: "room", label: "ROOM", min: 0, max: 1, step: 0.05, value: 1, hint: "방이 드러나는 정도 — 벽의 판재와 걸레받이와 마루. 0이면 벽도 바닥도 밤에 묻힌다" },
    { key: "window", label: "WINDOW", min: 0, max: 0.8, step: 0.05, value: 0.6, hint: "뒤 벽에 난 창의 높이. 벽 높이에 대한 비율이고 폭은 그 절반이다(조지안 창은 높이가 폭의 두 배다). 창턱은 판재 위 몰딩에 앉는다. 0이면 창이 없다" },
    { key: "panes", label: "PANES", min: 1, max: 4, step: 1, value: 3, hint: "창 한 짝의 가로 유리 수. 세로는 유리 한 장이 폭의 1.5배가 되게 저절로 나뉜다 — 1은 1-over-1, 2는 2-over-2, 3은 6-over-6, 4는 12-over-12다" },
    { key: "deck", label: "DECK", min: 0, max: 0.8, step: 0.02, value: 0.46, hint: "유령 앞 턴테이블의 폭. 판 폭에 대한 비율이고, 장마다 ±15% 안에서 조금씩 다르다. 0이면 턴테이블이 없다" },
    { key: "spin", label: "SPIN", min: -3, max: 3, step: 1, value: 1, hint: "음반이 한 바퀴에 도는 수. 한 바퀴가 2초면 1이 분당 30회로 33⅓에 가깝다. 음수면 거꾸로 돈다" },
    { key: "web", label: "WEB", min: 0, max: 1, step: 0.05, value: 0.7, hint: "거미줄의 크기. 1이면 지름이 판 폭의 80%로 여백 안을 거의 채운다. 0이면 거미줄이 없다" },
    { key: "threads", label: "THREADS", min: 6, max: 32, step: 1, value: 9, hint: "거미줄의 살 수. 사방으로 고르게 뻗고, 살 사이를 잇는 줄은 그 절반쯤이다. 여섯보다 적으면 그물로 읽히지 않는다" },
    { key: "cobwebs", label: "COBWEBS", min: 0, max: 1, step: 1, value: 1, hint: "큰 그물 반대편의 위 모서리에 거는 작은 그물. 0이면 걸지 않는다" },
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
    const { glowInk } = meteorInks(S.drums, S.key);

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

    // 방의 것들(창문, 턴테이블)은 제 난수로 흔든다. 유령과 거미줄의 난수를 건드리지 않아, 둘을
    // 0으로 두면 그전의 장과 한 픽셀도 다르지 않다
    const room = makeRng((seed ^ 0x3c6ef372) >>> 0);
    //
    // 방의 변은 자로 긋지 않는다. 자로 그은 곧은 변은 판화가 아니라 도면이다 — 변마다 잘게 나누어, 변
    // 전체가 한 번 불룩하게 휘고 그 위로 잔물결이 인다. 양 끝은 모서리에 붙어 있고, 모서리는 제자리에서
    // 조금 흔들린다. 휘는 폭은 변 길이의 1.8%에서 판 폭의 0.7%까지이고 HAND를 따른다
    const tremble = (points, amount) => {
      const corners = points.map(([x, y]) => [x + (room.next() - 0.5) * amount, y + (room.next() - 0.5) * amount]);
      const out = [];
      for (let i = 0; i < corners.length; i += 1) {
        const [x0, y0] = corners[i];
        const [x1, y1] = corners[(i + 1) % corners.length];
        out.push([x0, y0]);
        const len = Math.hypot(x1 - x0, y1 - y0);
        const pieces = Math.min(120, Math.floor(len / 14));
        if (pieces < 2) continue;
        const reach = Math.min(len * 0.018, width * 0.007) * knobs.hand * 2;
        const bow = (room.next() - 0.5) * 2 * reach;
        const ripple = (room.next() - 0.5) * reach * 0.7;
        const turns = 2 + Math.floor(room.next() * 2);
        const phase = room.next() * TAU;
        const nx = -(y1 - y0) / len;
        const ny = (x1 - x0) / len;
        for (let j = 1; j < pieces; j += 1) {
          const t = j / pieces;
          const lift = Math.sin(Math.PI * t) * (bow + ripple * Math.sin(TAU * turns * t + phase));
          out.push([x0 + (x1 - x0) * t + nx * lift, y0 + (y1 - y0) * t + ny * lift]);
        }
      }
      return out;
    };

    // 방. 오래된 저택의 방을 실제 치수로 짓는다 — 폭 5.2미터, 높이 3.2미터(옛 저택은 천장이 높다), 뒤
    // 벽은 눈에서 4.4미터. 눈높이 1.6미터에서 뒤 벽을 똑바로 보는 한 점 투시이고, 소실점은 판 높이의
    // 37%에 있다. FOV가 눈의 화각이다 — 기본은 가장 좁아 뒤 벽이 판을 가득 채우고, 넓히면 뒤 벽이
    // 작아지며 옆벽과 천장과 마루가 판 가장자리로 드러나 소실점으로 모인다.
    //
    //   판재     벽 높이의 3분의 1까지(1.07미터, 42인치) 세 벽에 두른다. 위 끝의 몰딩은 2인치, 틀의
    //            가로대와 세로대는 4인치, 판 하나의 폭은 16인치다. 판의 얼굴만 파내고 틀은 남은 밤이다
    //   걸레받이 판재가 높으면 걸레받이도 높다. 6인치
    //   몰딩     벽과 천장이 만나는 자리의 띠. 3인치
    //   마루     옛 저택의 넓은 소나무 널, 7인치. 널마다 1~2.4미터에서 끊기고 이음매는 널마다 어긋난다.
    //            널의 얼굴만 파내고 틈은 남은 밤이다
    const roomW = 5.2;
    const roomH = 3.2;
    const wallZ = 4.4;
    const eyeH = 1.6;
    const inch = 0.0254;
    const railH = 1.07;
    const horizon = height * 0.37;
    const focal = width / 2 / Math.tan((knobs.fov * Math.PI) / 360);
    // 눈에서 Z미터 떨어진 곳의 1미터가 판에서 몇 픽셀인가
    const scaleAt = (Z) => focal / Z;
    const project = (X, Y, Z) => [width / 2 + X * scaleAt(Z), horizon + (eyeH - Y) * scaleAt(Z)];
    const wallScale = scaleAt(wallZ);
    if (knobs.room > 0) {
      const lit = knobs.room;
      const near = 0.3;
      const wobble = 0.004 * wallScale * knobs.hand;
      const flat = (points) => tremble(points.map(([X, Y, Z]) => project(X, Y, Z)), wobble);
      const faces = (list, tone) =>
        carve(
          inks,
          (g) => {
            g.beginPath();
            for (const face of list) shapes.polySubpath(g, face, true);
            g.fill();
          },
          tone
        );
      const half = roomW / 2;
      // 벽 셋 위의 띠 하나. 뒤 벽은 X로, 옆벽은 Z로 뻗는다
      const band = (y0, y1) => [
        flat([[-half, y0, wallZ], [half, y0, wallZ], [half, y1, wallZ], [-half, y1, wallZ]]),
        flat([[-half, y0, near], [-half, y0, wallZ], [-half, y1, wallZ], [-half, y1, near]]),
        flat([[half, y0, wallZ], [half, y0, near], [half, y1, near], [half, y1, wallZ]])
      ];
      // 옆벽은 뒤 벽보다 조금 밝다. 창에서 든 빛이 비스듬히 스친다
      faces(band(0, roomH).slice(1), 0.1 * lit);
      // 판재. 뒤 벽은 가운데를 기준으로 좌우로, 옆벽은 모서리에서 앞으로 판을 늘어놓는다
      const frame = 4 * inch;
      const panel = 16 * inch;
      const low = 6 * inch + frame;
      const high = railH - 2 * inch - frame;
      const panels = [];
      for (let k = -8; k <= 8; k += 1) {
        const x0 = frame / 2 + k * (panel + frame);
        const x1 = Math.min(x0 + panel, half - frame);
        const x2 = Math.max(x0, -half + frame);
        if (x1 > x2) panels.push(flat([[x2, low, wallZ], [x1, low, wallZ], [x1, high, wallZ], [x2, high, wallZ]]));
      }
      for (let z1 = wallZ - frame; z1 - panel > near; z1 -= panel + frame) {
        const z0 = z1 - panel;
        panels.push(flat([[-half, low, z0], [-half, low, z1], [-half, high, z1], [-half, high, z0]]));
        panels.push(flat([[half, low, z1], [half, low, z0], [half, high, z0], [half, high, z1]]));
      }
      faces(panels, 0.26 * lit);
      // 몰딩과 걸레받이. 위쪽 모서리가 빛을 받는다
      faces(band(railH - 2 * inch, railH), 0.42 * lit);
      faces(band(0, 6 * inch), 0.2 * lit);
      faces(band(6 * inch - inch, 6 * inch), 0.4 * lit);
      faces(band(roomH - 3 * inch, roomH), 0.3 * lit);
      // 마루. 널이 방의 폭을 가로질러 늘어서고 소실점으로 물러난다. 판 아래 끝까지만 깐다
      const nearest = (focal * eyeH) / (height - horizon);
      const plank = 7 * inch;
      const gap = 0.012;
      const boards = [];
      for (let x0 = -half; x0 < half - 0.01; x0 += plank) {
        const xa = x0 + gap / 2;
        const xb = Math.min(x0 + plank, half) - gap / 2;
        let z = wallZ + room.float(0, 2.4);
        while (z > nearest - 0.2) {
          const length = room.float(1, 2.4);
          const za = Math.min(wallZ, z) - gap / 2;
          const zb = Math.max(z - length, nearest - 0.3) + gap / 2;
          if (za > zb) boards.push({ face: flat([[xa, 0, za], [xb, 0, za], [xb, 0, zb], [xa, 0, zb]]), tone: room.float(0.16, 0.3) });
          z -= length;
        }
      }
      for (const board of boards) faces([board.face], board.tone * lit);
    }

    // 창문. 조지안 내리닫이창의 비례를 따른다 — 창은 높이가 폭의 두 배이고, 위아래 두 짝으로
    // 나뉘며, 위짝이 아래짝보다 조금 짧다. 창살은 창 폭의 2.3%(870밀리 창에 20밀리), 두 짝이 만나는
    // 띠는 4.5%다. 한 짝의 가로 유리 수를 정하면 세로는 유리 한 장이 폭의 1.5배가 되게 나눈다.
    // 유리만 파낸다. 살과 틀은 파내지 않고 남은 밤이다
    if (knobs.window > 0) {
      // 창의 높이는 벽 높이에 대한 비율이고, 창턱이 판재 위 몰딩에 앉는다. 천장을 뚫지는 않는다
      const tallM = Math.min(knobs.window * roomH, roomH - railH - 0.1);
      const tallG = tallM * wallScale;
      const wideG = tallG / 2;
      const left = width / 2 - wideG / 2;
      const top = project(0, railH + tallM, wallZ)[1];
      const bar = wideG * 0.023;
      const rail = wideG * 0.045;
      const cols = Math.round(knobs.panes);
      const paneW = (wideG - bar * (cols - 1)) / cols;
      const upper = (tallG - rail) * 0.48;
      const glass = [];
      const sash = (y0, sashH) => {
        const rows = Math.max(1, Math.round(sashH / (paneW * 1.5)));
        const paneH = (sashH - bar * (rows - 1)) / rows;
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            const x = left + c * (paneW + bar);
            const y = y0 + r * (paneH + bar);
            glass.push(tremble([[x, y], [x + paneW, y], [x + paneW, y + paneH], [x, y + paneH]], bar * 0.6 * knobs.hand));
          }
        }
      };
      sash(top, upper);
      sash(top + upper + rail, tallG - rail - upper);
      // 달빛 든 유리. 종이까지 파내지 않는다 — 유령이 언제나 가장 밝아야 한다
      carve(
        inks,
        (g) => {
          g.beginPath();
          for (const pane of glass) shapes.polySubpath(g, pane, true);
          g.fill();
        },
        0.6
      );
    }

    // 거미줄. 둥근 그물(원망)의 짜임을 따른다.
    //
    //   살     한가운데에서 사방으로 고르게 뻗되 꼭 같지는 않다
    //   위아래 거미는 아래로 더 빨리 달리므로 한가운데가 위로 치우친다. 위쪽 살은 아래쪽 살의 4분의 3쯤이다
    //   가로줄 한가운데 둘레는 비워 두고(거미가 앉는 자리다), 그 밖을 칸마다 제 무게로 안쪽으로 처지는
    //          줄이 돈다. 줄 사이가 꼭 같지 않아야 자로 그은 것이 아니라 친 것이 된다
    //   틀     살 끝을 잇는 바깥 줄. 가로줄과 달리 팽팽하다
    //   매는 줄 틀에서 가까운 두 모서리 선과 모서리로 셋을 매어 건다. 매지 않은 그물은 과녁이 된다
    //
    // 실이 가늘어 밤을 조금만 파낸다 — 줄이 빛을 받은 것이다. 줄의 모양은 모두 찍기 전에 뽑아 둔다.
    // 통마다 다시 뽑으면 통마다 다른 자리에 줄이 난다
    //
    // (cx, cy)는 그물이 걸리는 모서리이고 (sx, sy)는 그물이 모서리에서 뻗어 나가는 쪽이다
    const hang = (rng, cx, cy, sx, sy, size, spokes, rings, thread, tone) => {
      const arms = Array.from({ length: spokes }, (_, i) => (i / spokes) * TAU + rng.float(-0.3, 0.3) * (TAU / spokes));
      const reach = arms.map((a) => (size * (1 + 0.14 * Math.sin(a))) / 1.14);
      const shares = Array.from({ length: rings }, (_, k) => 0.2 + (0.72 * (k + 1 + rng.float(-0.22, 0.22))) / rings);
      const ends = arms.map((a, i) => [Math.cos(a) * reach[i], Math.sin(a) * reach[i]]);
      // 그물이 모서리에서 조금 떨어져 앉는다. 그 틈으로 매는 줄이 모서리 선에 닿는다
      const gap = size * 0.14;
      const lo = [Math.min(...ends.map((p) => p[0])), Math.min(...ends.map((p) => p[1]))];
      const hi = [Math.max(...ends.map((p) => p[0])), Math.max(...ends.map((p) => p[1]))];
      const hx = sx > 0 ? cx + gap - lo[0] : cx - gap - hi[0];
      const hy = sy > 0 ? cy + gap - lo[1] : cy - gap - hi[1];
      const at = (a, r) => [hx + Math.cos(a) * r, hy + Math.sin(a) * r];
      const tip = (i, share = 1) => at(arms[i], reach[i] * share);
      const toward = (aim) => {
        let best = 0;
        for (let i = 1; i < spokes; i += 1) {
          if (Math.cos(arms[i] - aim) > Math.cos(arms[best] - aim)) best = i;
        }
        return best;
      };
      const toSideX = tip(toward(sx > 0 ? Math.PI : 0));
      const toSideY = tip(toward(sy > 0 ? -Math.PI / 2 : Math.PI / 2));
      const toCorner = tip(toward(Math.atan2(cy - hy, cx - hx)));
      // 곧은 줄도 자로 긋지 않는다. 살 · 틀 · 매는 줄마다 한 번씩 조금 휜다(길이의 2.5%까지, HAND를 따른다)
      const bows = Array.from({ length: spokes * 2 + 3 }, () => (rng.next() - 0.5) * 2 * 0.05 * knobs.hand * 2);
      const strand = (g, a, b, lean) => {
        g.moveTo(a[0], a[1]);
        g.quadraticCurveTo(
          (a[0] + b[0]) / 2 - (b[1] - a[1]) * lean,
          (a[1] + b[1]) / 2 + (b[0] - a[0]) * lean,
          b[0],
          b[1]
        );
      };
      const paint = (g) => {
        g.save();
        g.beginPath();
        g.rect(page.margin, page.margin, width - page.margin * 2, height - page.margin * 2);
        g.clip();
        g.lineWidth = thread;
        g.lineCap = "round";
        g.lineJoin = "round";
        // 살
        g.beginPath();
        for (let i = 0; i < spokes; i += 1) strand(g, [hx, hy], tip(i), bows[i]);
        g.stroke();
        // 가로줄. 살과 살 사이마다 안쪽으로 처진다
        for (const share of shares) {
          g.beginPath();
          g.moveTo(...tip(0, share));
          for (let i = 0; i < spokes; i += 1) {
            const next = (i + 1) % spokes;
            const mid = arms[i] + ((arms[next] - arms[i] + TAU) % TAU) / 2;
            const dip = ((reach[i] + reach[next]) / 2) * share * 0.86;
            g.quadraticCurveTo(...at(mid, dip), ...tip(next, share));
          }
          g.stroke();
        }
        // 틀. 살 끝을 잇는다
        g.beginPath();
        for (let i = 0; i < spokes; i += 1) strand(g, tip(i), tip((i + 1) % spokes), bows[spokes + i]);
        g.stroke();
        // 매는 줄. 틀에서 가까운 모서리 선 둘과 모서리로
        g.beginPath();
        strand(g, toSideX, [cx, toSideX[1]], bows[spokes * 2]);
        strand(g, toSideY, [toSideY[0], cy], bows[spokes * 2 + 1]);
        strand(g, toCorner, [cx, cy], bows[spokes * 2 + 2]);
        g.stroke();
        g.restore();
      };
      carve(inks, paint, tone);
      if (glowInk) stain([glowInk], paint, tone * 0.18);
    };

    // 큰 그물. 판 위쪽 두 모서리 가운데 하나에, 여백 안에 온전히 걸린다 — 눈에 가까운 천장 모서리다.
    // 아래 모서리는 턴테이블과 유령이 가린다
    const web = width * knobs.web * 0.4;
    // 네 모서리를 뽑던 수를 그대로 뽑고 위쪽 둘로 접는다. 뒤따르는 난수가 밀리지 않는다
    const corner = web > 4 ? layout.int(0, 3) % 2 : 0;
    const inset = page.margin;
    if (web > 4) {
      const spin = makeRng((seed ^ 0x5bd1e995) >>> 0);
      const spokes = Math.round(knobs.threads);
      hang(spin, corner === 0 ? inset : width - inset, inset, corner === 0 ? 1 : -1, 1, web, spokes, Math.max(2, Math.round(spokes * 0.55)), Math.max(1.2, width * 0.0034), 0.88);
    }

    // 작은 그물. 큰 그물 반대편의 위 모서리에 하나 건다. 실물로 40센티이고 살이 일고여덟에 가로줄이
    // 셋뿐이며 실이 더 가늘다 — 큰 그물만큼 촘촘하면 그물이 아니라 흰 점이 된다
    if (knobs.cobwebs > 0) {
      const bit = makeRng((seed ^ 0x9e3779b9 ^ 0x85ebca6b) >>> 0);
      const far = corner === 0 ? width - inset : inset;
      hang(bit, far, inset, corner === 0 ? -1 : 1, 1, 0.4 * wallScale, 7 + bit.int(0, 1), 3, Math.max(1, width * 0.0015), 0.75);
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

    // 턴테이블. 테크닉스 SL-1200의 치수를 그대로 쓴다 — 몸체 453×353×162밀리, 플래터 332밀리,
    // 12인치 음반 302밀리, 라벨 4인치(101.6밀리). 플래터의 중심은 왼쪽 앞에서 178·176밀리이고,
    // 톤암은 뒤 오른쪽(380·250)에서 230밀리를 뻗어 바늘이 스핀들에서 118밀리 떨어진 홈에 앉는다.
    //
    // 방과 같은 눈으로 본다 — 마루에 서 있고, 뒤로 갈수록 작아져 윗면이 사다리꼴이 되며, 모든 모서리가
    // 마루의 널과 같은 소실점으로 모인다. 앞면은 벽과 나란하므로 곧은 네모다. 옆면은 눈이 턴테이블의
    // 가운데 앞에 있어 보이지 않는다. 크기는 실물보다 크다 — 앞 모서리의 폭을 DECK으로 정하고 그만큼
    // 통째로 키운 것이다.
    //
    // 유령보다 나중에 찍어 앞에 선다 — 디제이는 턴테이블 뒤에 선다. 파내기만으로는 유령을 가릴 수
    // 없으므로(종이를 더 파내도 종이다) 몸체 자리를 먼저 잉크로 덮고 거기서 다시 파낸다
    if (knobs.deck > 0) {
      // 턴테이블도 장마다 조금씩 크기가 다르다(±15%). 제 난수 하나로 뽑으므로 창과 거미줄과 유령은
      // 그대로다. 아무리 커져도 여백 안에 든다
      const vary = makeRng((seed ^ 0x6a09e667) >>> 0).float(0.85, 1.15);
      const wide = Math.min(width * knobs.deck * vary, width - page.margin * 2);
      // 앞 모서리가 마루에 닿는 자리. 거기서 1미터가 몇 픽셀인지로 눈과의 거리를 거꾸로 구한다
      const floor = height - page.margin;
      const nearScale = (floor - horizon) / eyeH;
      const zFront = focal / nearScale;
      const k = wide / nearScale / 453;
      // 턴테이블 위의 한 점. u는 왼쪽에서, v는 앞에서, z는 윗면에서 잰 밀리다
      const at = (u, v, z = 0) => project((u - 226.5) * k, (162 + z) * k, zFront + v * k);
      // 플래터 깊이에서 1밀리가 몇 픽셀인가. 선의 굵기와 손떨림에 쓴다
      const unit = k * scaleAt(zFront + 176.5 * k);
      const ring = (u, v, z, r, from = 0, to = TAU, steps = 56) =>
        Array.from({ length: steps + 1 }, (_, i) => {
          const a = from + ((to - from) * i) / steps;
          return at(u + Math.cos(a) * r, v + Math.sin(a) * r, z);
        });
      const hand = unit * 1.2 * knobs.hand;
      const solid = (points) => (g) => {
        shapes.polyPath(g, points, true);
        g.fill();
      };
      const rest = inks.filter((sep) => sep !== S.key);

      // 몸체. 앞면은 어둡게 두고 윗면만 은빛으로 파낸다
      const body = tremble([at(0, 0, -162), at(453, 0, -162), at(453, 0), at(453, 353), at(0, 353), at(0, 0)], hand);
      stain([S.key], solid(body), 1);
      stain(rest, solid(body), 0.8);
      carve(inks, solid(tremble([at(0, 353), at(453, 353), at(453, 0), at(0, 0)], hand)), 0.5);

      // 플래터. 옆면이 앞쪽으로 띠를 이루는 원통이다 — 위 테의 뒤 절반과 아래 테의 앞 절반을 잇는다
      const [pu, pv] = [178, 176.5];
      const platter = [...ring(pu, pv, 22, 166, 0, Math.PI), ...ring(pu, pv, 0, 166, Math.PI, TAU)];
      // 한 번 흔든 꼴을 두 번 찍는다. 통마다 따로 흔들면 통마다 다른 플래터가 된다
      const drum = tremble(platter, hand);
      stain([S.key], solid(drum), 0.75);
      stain(rest, solid(drum), 0.5);

      // 음반. 검다
      const record = tremble(ring(pu, pv, 22, 151), hand);
      stain([S.key], solid(record), 1);
      stain(rest, solid(record), 0.85);

      // 홈이 받는 빛. 동심원 홈에 앉는 빛은 빛과 눈을 잇는 면을 따라 한가운데를 지나는 띠가 되고,
      // 음반이 돌아도 제자리에 있다. 빛(창)이 뒤에 있으므로 띠는 앞뒤로 선다
      const sheen = (g) => {
        g.beginPath();
        for (const aim of [Math.PI / 2, -Math.PI / 2]) {
          const wedge = [...ring(pu, pv, 22, 56, aim - 0.2, aim + 0.2, 8), ...ring(pu, pv, 22, 148, aim + 0.2, aim - 0.2, 8)];
          shapes.polySubpath(g, wedge, true);
        }
        g.fill();
      };
      carve(inks, sheen, 0.38);

      // 라벨. 종이에 반쪽만 색이 있어 도는 것이 보인다. 한 바퀴에 정수 번이라 루프가 닫힌다
      const spun = TAU * Math.round(knobs.spin) * held;
      carve(inks, solid(ring(pu, pv, 22, 50.8)), 1);
      const half = [...ring(pu, pv, 22, 50.8, spun, spun + Math.PI, 28), at(pu, pv, 22)];
      stain([glowInk || S.wash], solid(half), 0.9);
      stain([S.key], solid(ring(pu, pv, 22, 3.6, 0, TAU, 12)), 1);

      // 톤암. 받침과 균형추, S자로 굽은 관, 끝의 헤드셸. 은빛이라 파낸다
      const [au, av] = [380, 250];
      const [su, sv] = [233.7, 72.4];
      carve(inks, solid(ring(au, av, 0, 26, 0, TAU, 24)), 0.85);
      const arm = (g) => {
        g.lineCap = "round";
        g.lineJoin = "round";
        // 균형추
        g.lineWidth = 16 * unit;
        g.beginPath();
        g.moveTo(...at(au, av, 40));
        g.lineTo(...at(au + 22, av + 40, 40));
        g.stroke();
        // 관. 떠날 때와 닿을 때의 방향이 어긋나 S자가 된다
        g.lineWidth = 7 * unit;
        g.beginPath();
        g.moveTo(...at(au, av, 40));
        g.bezierCurveTo(...at(au - 70, av - 20, 38), ...at(su + 70, sv + 90, 32), ...at(su + 10, sv + 18, 30));
        g.stroke();
        // 헤드셸
        g.lineWidth = 14 * unit;
        g.beginPath();
        g.moveTo(...at(su + 10, sv + 18, 30));
        g.lineTo(...at(su - 4, sv - 14, 28));
        g.stroke();
      };
      carve(inks, arm, 1);
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
