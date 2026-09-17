// 마스크. 남길 모양 하나를 주면, 그 바깥을 실제로 도는 모든 통에서 파낸다.
//
// 흰 잉크가 없으니 바깥의 흰색도 찍지 않은 자리다. 실물로 치면 모양대로 오린 마스킹 종이를 대고
// 찍은 것과 같다. 판화의 마지막에 부른다 — 그래야 모양 밖으로 나간 것이 전부 지워진다. 테나
// 눈금처럼 모양 밖으로 걸쳐야 하는 것은 마스크 다음에 긋는다.
//
// 판보다 조금 큰 사각형과 남길 모양을 한 경로에 넣고 짝홀 규칙으로 채운다. 두 모양이 겹치는
// 안쪽은 비고 바깥만 칠해지므로, 그 칠을 파내기로 하면 바깥만 지워진다. 짝홀이라 남길 모양은
// 스스로 겹치지 않는 닫힌 모양 하나여야 한다. 겹치면 겹친 자리가 도로 지워진다.

import { splineSubpath } from "./shapes.js";

// keep(g)는 경로를 새로 시작하지 않고 남길 모양만 더한다.
export function mask(S, { width, height }, keep) {
  for (const drum of S.drums) {
    drum.separation.knockout((sep) =>
      sep.draw((g) => {
        g.beginPath();
        g.rect(-20, -20, width + 40, height + 40);
        keep(g);
        g.fill("evenodd");
      })
    );
  }
}

// 원 하나를 남긴다. 중심을 주지 않으면 판 한가운데다.
export function maskCircle(S, page, radius, cx = page.width / 2, cy = page.height / 2) {
  mask(S, page, (g) => {
    g.moveTo(cx + radius, cy);
    g.arc(cx, cy, radius, 0, Math.PI * 2);
  });
}

// 점으로 이은 닫힌 모양 하나를 남긴다. smooth면 판화의 다른 모양처럼 곡선으로 잇고, 아니면
// 꺾인 채로 잇는다. shapes.js의 blob이나 leaf가 내놓는 점을 그대로 넘기면 된다.
export function maskShape(S, page, points, { smooth = true } = {}) {
  mask(S, page, (g) => {
    if (smooth) {
      splineSubpath(g, points, true);
      return;
    }
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i][0], points[i][1]);
    g.closePath();
  });
}
