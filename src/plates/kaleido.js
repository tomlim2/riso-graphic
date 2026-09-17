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

import { makeRng } from "../rng.js";
import * as shapes from "../shapes.js";
import { roundel } from "../roundel.js";
import { SCOPE_KNOBS, light } from "../scope.js";

const TAU = Math.PI * 2;
const MOST_PIECES = 60;
const PAD = 8;
const KINDS = ["glass", "glass", "glass", "shard", "shard", "bead", "ring", "drop", "leaf", "star", "thread"];

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

// 조각 하나를 그린다. 모양의 난수는 조각의 씨앗으로 새로 굴려, 매 프레임 같은 모양이 나온다
function piece(g, kind, seed, x, y, size, angle) {
  const rng = makeRng(seed);
  switch (kind) {
    case "glass":
      shapes.splinePath(g, shapes.blob(rng, x, y, size, { lobes: 3, wobble: 0.25, steps: 14, tilt: angle }), true);
      g.fill();
      break;
    case "shard": {
      const corners = rng.int(3, 4);
      const points = Array.from({ length: corners }, (_, k) => {
        const a = angle + (k / corners) * TAU + rng.float(-0.35, 0.35);
        const r = size * rng.float(0.55, 1.1);
        return [x + Math.cos(a) * r, y + Math.sin(a) * r];
      });
      shapes.polyPath(g, points, true);
      g.fill();
      break;
    }
    case "bead":
      g.beginPath();
      g.arc(x, y, size * 0.35, 0, TAU);
      g.fill();
      break;
    case "ring":
      g.beginPath();
      g.lineWidth = Math.max(3, size * 0.14);
      g.arc(x, y, size * 0.6, 0, TAU);
      g.stroke();
      break;
    case "drop":
      shapes.splinePath(g, shapes.drop(rng, x, y, size, angle), true);
      g.fill();
      break;
    case "leaf":
      shapes.splinePath(g, shapes.leaf(rng, x, y, size, angle), true);
      g.fill();
      break;
    case "star":
      shapes.sparkle(g, x, y, size * 0.8, 0.22);
      g.fill();
      break;
    default: {
      // 실. 조각을 가로질러 물결치는 선
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const wiggle = rng.float(0.15, 0.3);
      const points = [];
      for (let s = 0; s <= 12; s += 1) {
        const u = s / 12 - 0.5;
        const side = Math.sin(u * TAU * 1.5) * size * wiggle;
        points.push([x + ux * u * size * 2.2 - uy * side, y + uy * u * size * 2.2 + ux * side]);
      }
      g.lineWidth = Math.max(3, size * 0.08);
      shapes.splinePath(g, points, false);
      g.stroke();
    }
  }
}

export const kaleido = {
  id: "kaleido",
  name: "KALEIDO",
  about: "만화경. 색유리 조각이 거울에 비쳐 대칭으로 피고, 조각마다 굴러 무늬가 바뀐다",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "통 속 조각의 씨앗. 종이의 롤은 그대로 두고 조각만 다시 뽑는다" },
    { key: "mirrors", label: "MIRRORS", min: 2, max: 12, step: 1, value: 6, hint: "거울이 만드는 겹의 수. 6이면 눈송이처럼 열두 벌이다" },
    { key: "pieces", label: "PIECES", min: 4, max: 60, step: 1, value: 24, hint: "통 속 조각의 수" },
    { key: "size", label: "SIZE", min: 0.02, max: 0.14, step: 0.005, value: 0.06, hint: "조각의 크기" },
    { key: "tumble", label: "TUMBLE", min: 0, max: 1, step: 0.05, value: 0.5, hint: "조각이 저마다 굴러다니는 정도" },
    { key: "tint", label: "TINT", min: 0.3, max: 1, step: 0.05, value: 0.8, hint: "조각을 얼마나 진하게 찍을지" }
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
    const layout = makeRng((page.seed ^ 0x3243f6a8 ^ Math.imul(knobs.field + 1, 0x85ebca6b)) >>> 0);
    const spin = layout.float(0, TAU);
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

    // 조각의 자리. 쐐기의 극좌표에서 저마다 작은 고리를 돌고 까딱인다. 큰 것부터 깐다
    const roam = knobs.tumble * width * 0.02;
    const base = width * knobs.size;
    const placed = pieces
      .map((p) => {
        const r = p.r * ring * 1.02 + Math.cos(turn * p.loop.fx + p.loop.px) * roam * p.reach;
        const a = p.a * wedge + (Math.sin(turn * p.loop.fy + p.loop.py) * roam * p.reach) / Math.max(r, 40);
        return {
          p,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          size: base * p.size,
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
            sheet.rotate(spin + k * 2 * wedge);
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
