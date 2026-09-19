// 통을 색으로 고르는 도구.
//
// 역할(key · body · wash)은 밝기로 정해진다. 그런데 어떤 판은 밝기가 아니라 색이 필요하다 —
// 초록을 내려면 노랑과 파랑이 겹쳐야 하고, 밤하늘을 깔려면 노란 통을 빼야 한다. 배색마다 색이
// 다르므로 판이 S.drums의 잉크를 보고 그때그때 고른다. 모두 분판을 돌려준다.

import { rgbOf } from "./palette.js";

// 잉크를 0에서 1까지의 빨강·초록·파랑으로. 판들이 여기서 가져다 쓰므로 그대로 내놓는다
export { rgbOf };

// 얼마나 노란가. 빨강과 초록의 평균이 파랑을 얼마나 앞서는지로 잰다. 평균으로 재므로 주황도
// 노랗게 친다 — 노랑만 가려야 하는 판(METEOR)은 둘 중 낮은 쪽으로 따로 잰다
const yellowness = ([r, g, b]) => (r + g) / 2 - b;
export const warmth = (drum) => yellowness(rgbOf(drum.ink));

// 얼마나 초록인가. 초록 채널이 빨강과 파랑 중 큰 쪽을 얼마나 앞서는지로 잰다
const greenness = ([r, g, b]) => g - Math.max(r, b);

// 통 하나, 또는 곱했을 때 가장 초록인 두 통. 옅은 통이 앞이다
export function greenest(drums) {
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

// 점수가 가장 높은 통 하나
function pick(drums, score) {
  let best = drums[0];
  let top = -Infinity;
  for (const drum of drums) {
    const value = score(rgbOf(drum.ink));
    if (value > top) {
      top = value;
      best = drum;
    }
  }
  return best.separation;
}
export const bluest = (drums) => pick(drums, ([r, g, b]) => b - (r + g) / 2);
export const yellowest = (drums) => pick(drums, yellowness);
export const reddest = (drums) => pick(drums, ([r, g, b]) => r - (g + b) / 2);

// 유성의 잉크(METEOR). 하늘은 해파리의 물처럼 모든 통으로 깐다. 빛(유성 본체)은 하늘의 가장 진한 통(key)과
// 가장 먼 빛깔이다 — 진한 통이 푸르면 가장 노란 통, 붉으면 가장 푸른 통이다. 그래서 배색마다 하늘도 유성도
// 빛깔이 바뀐다. 곁들이는 남은 통이다. 어둠(도트)에는 곁들이를 가장 진한 통과 겹치되, 곁들이가 노라면
// 겹치지 않는다 — 노랑이 겹치면 어둠이 올리브가 된다. 노랑은 빨강과 초록이 함께 높아야 하므로 둘 중 낮은
// 쪽에서 파랑을 뺀다 — warmth처럼 평균으로 재면 주황이 노랑을 이긴다. 모두 분판으로 돌려준다
const pureYellow = ([r, g, b]) => Math.min(r, g) - b;
const best = (drums, score) => drums.reduce((top, drum) => (score(rgbOf(drum.ink)) > score(rgbOf(top.ink)) ? drum : top));

export function meteorInks(drums, key) {
  const rest = drums.filter((drum) => drum.separation !== key);
  if (!rest.length) return { glowInk: null, accent: null, darkInk: null };
  const [r, , b] = rgbOf(drums.find((drum) => drum.separation === key).ink);
  const glow = best(rest, r > b ? ([rr, gg, bb]) => bb - (rr + gg) / 2 : pureYellow);
  const accent = rest.find((drum) => drum !== glow) || null;
  return {
    glowInk: glow.separation,
    accent: accent ? accent.separation : null,
    darkInk: accent && pureYellow(rgbOf(accent.ink)) < 0.55 ? accent.separation : null
  };
}

// 어두운 시야를 까는 판을 위해 통을 밤과 빛으로 나눈다. 노란 통을 하늘에 깔면 파랑과 곱해져 밤이
// 초록이 되므로, 노랗지 않은 통만 밤이다. 모두 노라면 가장 진한 통 하나가 밤이다. S.drums는 옅은
// 통부터이므로 밤의 마지막이 가장 진하다. 빛은 노란 순서다
export function nightAndLight(drums) {
  let night = drums.filter((drum) => warmth(drum) < 0.33);
  if (!night.length) night = [drums[drums.length - 1]];
  const light = drums.filter((drum) => !night.includes(drum)).sort((a, b) => warmth(b) - warmth(a));
  return {
    night: night.map((drum) => drum.separation),
    deepest: night[night.length - 1].separation,
    light: light.map((drum) => drum.separation)
  };
}
