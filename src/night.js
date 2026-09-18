// 어두운 시야. 밤의 통을 먼저 깔고, 빛나는 것은 그 밤을 파내서 얻는다. 흰 잉크가 없으니 빛은
// 찍는 것이 아니라 찍지 않은 자리다. CELL, COSMOS, FLAKE, METEOR가 이렇게 그린다.
//
// 어느 통이 밤인지는 판마다 다르게 고른다(src/drums.js). 여기서는 고른 통들에 찍기만 한다.
// alpha에는 수를 주거나, 통마다 다른 값을 내는 함수를 준다. 1을 넘으면 1이고, 0 이하인 통은
// 건너뛴다. 분판의 draw와 knockout은 컨텍스트를 저장했다 되돌리므로, 알파 0으로 찍는 것과
// 건너뛰는 것은 같은 장이 된다.

const amountOf = (alpha, sep) => Math.min(1, typeof alpha === "function" ? alpha(sep) : alpha);

// 밤을 깐다. 가장 진한 통을 가장 짙게
export function floodNight(night, deepest, dark, deep = 0.95, rest = 0.8) {
  for (const sep of night) sep.flood((sep === deepest ? deep : rest) * dark);
}

// 빛을 판다. paint가 칠하는 모양만큼 통들에서 잉크를 걷어 낸다
export function carve(seps, paint, alpha = 1) {
  for (const sep of seps) {
    const amount = amountOf(alpha, sep);
    if (!(amount > 0)) continue;
    sep.knockout((plate) =>
      plate.draw((g) => {
        g.globalAlpha = amount;
        paint(g);
      })
    );
  }
}

// 어둠을 얹는다. paint가 칠하는 모양만큼 통들에 잉크를 더 찍는다
export function stain(seps, paint, alpha = 1) {
  for (const sep of seps) {
    const amount = amountOf(alpha, sep);
    if (!(amount > 0)) continue;
    sep.draw((g) => {
      g.globalAlpha = amount;
      paint(g);
    });
  }
}
