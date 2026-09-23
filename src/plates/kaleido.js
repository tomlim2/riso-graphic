// 만화경.
//
// 현미경과 망원경 다음의 세 번째 들여다보는 기구다. 둥근 틀이 만화경의 통이고, 통 속의 거울 두 장이
// 쐐기 하나를 MIRRORS번 돌리고 한 번씩 뒤집어 찍는다. MIRRORS가 6이면 열두 벌, 눈송이와 같은
// 대칭이다.
//
// 쐐기 안에는 색유리 조각이 들어 있다. 덩어리, 깨진 조각, 구슬, 고리, 물방울, 잎, 반짝이, 실 —
// 이 저장소의 형태 어휘(src/shapes.js) 그대로다. 조각마다 통 하나에 찍고, 셋에 하나는 다른 통에
// 조금 비껴 한 번 더 찍어 겹친 자리에서 제3의 색이 난다. 바탕은 밝은 시야다(src/scope.js).
//
// 조각은 쐐기 경계를 넘나들게 놓는다. 그래야 거울 선에서 조각이 맞붙어 꽃처럼 핀다. 쐐기는 통마다
// 작은 캔버스에 한 번 그려 오려 내고, 돌리고 뒤집어 여러 번 붙인다. 뒤집어 붙이면 잘린 자리가 거울
// 선에서 정확히 맞닿는다.
//
// 움직임은 조각마다 따로다. 저마다 작은 고리를 돌고 조금씩 까딱인다. 조각이 거울 선을 넘나들 때마다
// 무늬가 피었다 진다. 통 전체를 돌리지는 않는다. 박자는 모두 한 바퀴에 정수 번이다. 조각은 언제나
// 같은 수만큼 뽑고, PIECES는 그중 몇을 넣을지만 정한다.

import { makeRng, fieldSeed } from "../rng.js";
import { KINDS, piece } from "../glass.js";
import { roundel } from "../roundel.js";
import { SCOPE_KNOBS, light } from "../scope.js";

const TAU = Math.PI * 2;
const MOST_PIECES = 60;
const PAD = 8;

// 쐐기를 그릴 캔버스. 통마다 하나씩 두고 다시 쓴다
const wedges = [];
function wedgeCanvas(index, size) {
  let canvas = wedges[index];
  if (!canvas) {
    canvas = document.createElement("canvas");
    wedges[index] = canvas;
  }
  if (canvas.width !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  return canvas;
}

export const kaleido = {
  id: "kaleido",
  name: "KALEIDO",
  about: "만화경. 색유리 조각이 거울에 비쳐 대칭으로 피고, 조각마다 굴러 무늬가 바뀐다",
  model: "claude-opus-5",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 70, hint: "통 속 조각의 씨앗. 종이의 롤은 그대로 두고 조각만 다시 뽑는다" },
    { key: "mirrors", label: "MIRRORS", min: 2, max: 12, step: 1, value: 12, hint: "거울이 만드는 겹의 수. 6이면 눈송이처럼 열두 벌이다" },
    { key: "pieces", label: "PIECES", min: 4, max: MOST_PIECES, step: 1, value: 28, hint: "통 속 조각의 수" },
    { key: "size", label: "SIZE", min: 0.02, max: 0.14, step: 0.005, value: 0.06, hint: "조각의 크기" },
    { key: "tumble", label: "TUMBLE", min: 0, max: 1, step: 0.05, value: 0, hint: "조각이 저마다 굴러다니는 정도. 가장 높으면 조각 하나만큼 돌아다녀 거울 선을 넘나든다" },
    { key: "flow", label: "FLOW", min: 0, max: 2, step: 1, value: 1, hint: "조각이 한 바퀴에 가운데로 흘러드는 횟수. 통 밖에서 들어 가운데로 가고, 가운데에 닿으면 다시 밖에서 든다. 0이면 흐르지 않는다" },
    { key: "spin", label: "SPIN", min: -2, max: 2, step: 1, value: -2, hint: "한 바퀴에 통이 도는 칸 수. 한 칸은 거울 한 겹이라 돌아도 이음매가 없다. 음수면 반대로 돈다. 0이면 통이 서 있다" },
    { key: "tint", label: "TINT", min: 0.3, max: 1, step: 0.05, value: 1, hint: "조각을 얼마나 진하게 찍을지" }
  ],
  scope: SCOPE_KNOBS,

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const turn = t * TAU;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;
    const mirrors = Math.round(knobs.mirrors);
    const wedge = Math.PI / mirrors;

    // 조각은 제 씨앗으로 뽑는다. FIELD는 잉크와 종이결을 건드리지 않는다
    const layout = makeRng(fieldSeed(page, 0x3243f6a8));
    const spin = layout.float(0, TAU);
    // 통이 도는 각. 한 바퀴에 거울 한 겹(2 × 쐐기)씩 도므로 무늬의 대칭 주기와 같아, 돌아도 t=1이 t=0과
    // 같은 장이다. 통을 손에 쥐고 천천히 돌리는 셈이다(SPIN)
    const barrel = Math.round(knobs.spin) * 2 * wedge * t;
    const flow = Math.round(knobs.flow); // 한 바퀴에 조각이 가운데로 흘러드는 횟수. 정수라야 루프가 닫힌다
    const pieces = Array.from({ length: MOST_PIECES }, () => ({
      kind: layout.pick(KINDS),
      seed: Math.floor(layout.next() * 4294967296) >>> 0,
      r: Math.sqrt(layout.next()),
      a: layout.float(-0.3, 1.3),
      size: layout.float(0.5, 1.5),
      drum: layout.next(),
      pair: layout.next(),
      tone: layout.float(0.6, 1),
      tilt: layout.float(0, TAU),
      loop: { fx: layout.int(1, 2), fy: layout.int(1, 2), fs: layout.int(1, 2), px: layout.float(0, TAU), py: layout.float(0, TAU), ps: layout.float(0, TAU) },
      reach: layout.float(0.4, 1),
      aside: layout.float(0, TAU)
    })).slice(0, Math.round(knobs.pieces));

    light(S, page, ring, knobs.vignette);

    // 조각의 자리. 쐐기의 극좌표에서 저마다 작은 고리를 한 바퀴 돈다. 큰 것부터 깐다.
    //
    // 고리는 두 좌표에 같은 각을 써서 참말로 도는 고리다 — 한쪽은 코사인, 한쪽은 사인이다. 전에는 두
    // 좌표의 박자와 위상이 따로 놀아, 위상이 비슷한 조각은 한 줄 위를 오갔다. 오가는 조각은 양 끝에서
    // 멈췄다 되돌아오므로 무늬가 새로 짜이지 않고 숨만 쉬었다. 도는 고리는 멈추는 자리가 없어 한 바퀴
    // 내내 무늬가 바뀐다. 도는 수는 대개 한 바퀴에 한 번이고 넷에 하나만 두 번이다 — 정수라 루프가
    // 닫히고, 대부분이 한 바퀴를 꼬박 도는 동안 제자리로 돌아오지 않아 무늬가 내내 새로 짜인다. 두 번
    // 도는 조각이 섞여 빠르기가 한 가지로 보이지 않는다. 도는 쪽과 고리의 납작함(py)은 조각마다 다르다
    const roam = knobs.tumble * width * 0.06;
    const base = width * knobs.size;
    const placed = pieces
      .map((p) => {
        const laps = p.loop.fx === 1 && p.loop.fy === 1 ? 2 : 1; // 넷에 하나만 두 번 돈다
        const spun = turn * laps * (p.tilt < Math.PI ? 1 : -1) + p.loop.px;
        const squash = 0.6 + (0.4 * p.loop.py) / TAU;
        // 흐름. 조각은 통 밖에서 들어 가운데로 흘러 들어가고, 가운데에 닿으면 다시 밖에서 든다(FLOW).
        // 되감기는 자리는 보이지 않는다 — 드는 자리는 둥근 틀 밖이라 잘리고, 지는 자리에서는 가운데로
        // 갈수록 작아져 한 점으로 사라진다. 흐르는 수가 정수라 루프가 닫힌다. 조각마다 드는 때가 달라
        // 무리가 생겼다 풀린다. 처음에는 안팎으로 밀렸다 당겼다 하게 했는데 사인 곡선이 그대로 보였다
        // 드는 때는 고르게 흩는다 — p.r은 넓이를 고르게 하려고 제곱근을 씌운 값이라 그대로 쓰면
        // 한 무리가 함께 바깥에 몰려, 그 무리가 가운데에 닿을 때 판이 훌쩍 비어 보인다
        const sink = (((p.r * p.r - t * flow) % 1) + 1) % 1; // 1이면 통 밖, 0이면 가운데
        const r = ring * 1.08 * sink + Math.cos(spun) * roam * p.reach;
        // 가운데에서는 각의 흔들림이 커지므로 통의 3할 안쪽으로는 더 흔들리지 않게 잡는다
        const a = p.a * wedge + (Math.sin(spun) * squash * roam * p.reach) / Math.max(r, ring * 0.3);
        return {
          p,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          size: base * p.size * Math.min(1, sink * 2.2),
          angle: p.tilt + Math.sin(turn * p.loop.fs + p.loop.ps) * 0.5 * knobs.tumble
        };
      })
      .sort((a, b) => b.size - a.size);

    // 통마다 조각을 고른다. 셋에 하나는 다음 통에도 조금 비껴 찍는다
    const drums = S.drums;
    const weights = drums.length === 3 ? [0.4, 0.8] : drums.length === 2 ? [0.6] : [];
    const primaryOf = (p) => {
      const at = weights.findIndex((w) => p.drum < w);
      return at < 0 ? drums.length - 1 : at;
    };

    const size = Math.ceil(ring + PAD * 2);
    drums.forEach((drum, index) => {
      const canvas = wedgeCanvas(index, size);
      const g = canvas.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, size, size);
      g.translate(PAD, PAD);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, ring + PAD, 0, wedge);
      g.closePath();
      g.save();
      g.clip();
      g.fillStyle = "#000";
      g.strokeStyle = "#000";
      g.lineCap = "round";
      g.lineJoin = "round";
      for (const item of placed) {
        const { p } = item;
        const primary = primaryOf(p);
        const second = drums.length > 1 && p.pair < 0.33 ? (primary + 1) % drums.length : -1;
        if (primary === index) {
          g.globalAlpha = Math.min(1, p.tone * knobs.tint);
          piece(g, p.kind, p.seed, item.x, item.y, item.size, item.angle);
        }
        if (second === index) {
          const shift = item.size * 0.35;
          g.globalAlpha = Math.min(1, p.tone * knobs.tint * 0.85);
          piece(g, p.kind, p.seed, item.x + Math.cos(p.aside) * shift, item.y + Math.sin(p.aside) * shift, item.size * 0.92, item.angle);
        }
      }
      g.restore();

      // 붙인다. 돌리고, 한 번씩 뒤집는다
      drum.separation.draw((sheet) => {
        for (let k = 0; k < mirrors; k += 1) {
          for (const flip of [1, -1]) {
            sheet.save();
            sheet.translate(cx, cy);
            sheet.rotate(spin + barrel + k * 2 * wedge);
            sheet.scale(1, flip);
            sheet.drawImage(canvas, -PAD, -PAD);
            sheet.restore();
          }
        }
      });
    });

    roundel(S, page, ring);
  }
};
