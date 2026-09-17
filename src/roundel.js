// 둥근 틀. 라운델, 원형 비네트라고도 부른다.
//
// 원 바깥을 마스크로 지우고(src/mask.js), 가장 진한 통으로 테를 두른다.
//
// 테는 굵기가 일정한 흔들리는 원 둘이다. 굵고 진한 것을 원보다 살짝 바깥에, 가늘고 옅은 것을
// 살짝 안쪽에, 흔들림을 달리해 긋는다. 둘이 딱 맞지 않아 두께가 들쭉날쭉하고 안쪽 가장자리가
// 겹쳐 보여, 손으로 덧그린 테처럼 읽힌다. 흔들림은 롤이 정하고 시간과 무관하다.
//
// 판화의 마지막에 부른다. 그래야 틀 밖으로 나간 것이 전부 지워지고, 테가 그 위에 앉는다.

import { makeRng } from "./rng.js";
import { blob } from "./shapes.js";
import { maskCircle } from "./mask.js";

// 테만. 마스크 없이 그 자리에 테를 긋는다.
export function rim(S, { width, height, seed }, radius, cx = width / 2, cy = height / 2) {
  const hand = makeRng((seed ^ 0x6a09e667) >>> 0);
  const ring = (r, options) => blob(hand, cx, cy, r, { steps: 72, ...options });
  S.key.line(ring(radius + width * 0.004, { lobes: 4, wobble: 0.012 }), { w: width * 0.017, tone: 0.95, close: true });
  S.key.line(ring(radius - width * 0.003, { lobes: 5, wobble: 0.016 }), { w: width * 0.008, tone: 0.7, close: true });
}

// 틀 전부. 원 바깥을 지우고 테를 두른다.
export function roundel(S, page, radius) {
  if (!(radius > 0)) return;
  maskCircle(S, page, radius);
  rim(S, page, radius);
}
