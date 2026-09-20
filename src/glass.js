// 색유리 조각. 만화경 통에 든 것이다 — 덩어리, 깨진 조각, 구슬, 고리, 물방울, 잎, 반짝이, 실.
// 저장소의 형태 어휘(src/shapes.js)에서 조각 하나로 묶은 것이라, 다른 판도 같은 유리를 가져다 쓸 수
// 있다. 지금은 KALEIDO가 쓴다.

import { makeRng } from "./rng.js";
import * as shapes from "./shapes.js";

const TAU = Math.PI * 2;

// 어느 조각이 나올지. 덩어리와 깨진 조각이 더 자주 나오도록 여러 번 적는다
export const KINDS = ["glass", "glass", "glass", "shard", "shard", "bead", "ring", "drop", "leaf", "star", "thread"];

// 조각 하나를 그린다. 모양의 난수는 조각의 씨앗으로 새로 굴려, 매 프레임 같은 모양이 나온다
export function piece(g, kind, seed, x, y, size, angle) {
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
