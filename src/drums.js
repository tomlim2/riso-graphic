// 통을 색으로 고르는 도구.
//
// 역할(key · body · wash)은 밝기로 정해진다. 그런데 어떤 판은 밝기가 아니라 색이 필요하다 —
// 초록을 내려면 노랑과 파랑이 겹쳐야 하고, 밤하늘을 깔려면 노란 통을 빼야 한다. 배색마다 색이
// 다르므로 판이 S.drums의 잉크를 보고 그때그때 고른다. 모두 분판을 돌려준다.

export const rgbOf = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

// 얼마나 노란가. 빨강과 초록의 평균이 파랑을 얼마나 앞서는지로 잰다
export const warmth = (drum) => {
  const [r, g, b] = rgbOf(drum.ink);
  return (r + g) / 2 - b;
};

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
export const yellowest = (drums) => pick(drums, ([r, g, b]) => (r + g) / 2 - b);

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
