// 현미경의 시야. CELL과 CHLORO가 함께 쓴다.
//
// 둥근 틀(src/roundel.js)이 접안렌즈의 테라면, 여기는 그 안이다. 빛이 고르게 들어온 밝은 바닥,
// 가장자리로 갈수록 조금 죽는 빛, 시야에 떠 있는 부스러기, 시야를 가로지르는 눈금.
//
// 부르는 차례가 있다. light는 표본보다 먼저, specks와 reticle은 표본 다음, roundel은 맨 끝이다.
// 부스러기는 표본을 다 뽑은 뒤에 뽑는다 — 그래야 그 수를 바꿔도 표본이 흔들리지 않는다.

const TAU = Math.PI * 2;

// 바닥의 빛. 옅은 통을 한가운데에서 가장자리로 갈수록 조금씩 짙게 깔고, 가장자리 한 켜는
// 진한 통으로 누른다. 렌즈가 원래 그렇다.
export function light(S, { width, height }, ring, vignette, cx = width / 2, cy = height / 2) {
  S.wash.draw((g) => {
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, ring);
    glow.addColorStop(0, "rgba(0, 0, 0, 0.05)");
    glow.addColorStop(1, `rgba(0, 0, 0, ${0.05 + 0.2 * vignette})`);
    g.fillStyle = glow;
    g.fillRect(0, 0, width, height);
  });
  if (vignette > 0) {
    S.key.draw((g) => {
      const dim = g.createRadialGradient(cx, cy, ring * 0.6, cx, cy, ring);
      dim.addColorStop(0, "rgba(0, 0, 0, 0)");
      dim.addColorStop(1, `rgba(0, 0, 0, ${0.3 * vignette})`);
      g.fillStyle = dim;
      g.fillRect(0, 0, width, height);
    });
  }
}

// 부스러기를 뽑는다. 반지름 limit 안에 고르게 흩는다.
export function scatter(rng, count, limit, cx, cy) {
  return Array.from({ length: count }, () => {
    const angle = rng.float(0, TAU);
    const dist = Math.sqrt(rng.next()) * limit;
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      size: rng.float(2, 4.5),
      beat: rng.int(1, 3),
      phase: rng.float(0, TAU)
    };
  });
}

// 부스러기를 찍는다. 제자리에서 조금씩 떤다. 한 경로로 채워 겹친 점이 진해지지 않는다
export function specks(S, list, turn) {
  if (!list.length) return;
  S.key.draw((g) => {
    g.globalAlpha = 0.6;
    g.beginPath();
    for (const speck of list) {
      const sx = speck.x + Math.cos(turn * speck.beat + speck.phase) * 3;
      const sy = speck.y + Math.sin(turn * speck.beat + speck.phase * 1.3) * 3;
      g.moveTo(sx + speck.size, sy);
      g.arc(sx, sy, speck.size, 0, TAU);
    }
    g.fill();
  });
}

// 눈금. 시야를 가로지르는 십자와 가로줄의 눈금. tone이 0이면 긋지 않는다
export function reticle(S, { width, height }, ring, tone, cx = width / 2, cy = height / 2) {
  if (!(tone > 0)) return;
  const span = ring * 0.86;
  const step = ring / 12;
  const mark = { w: 3, tone, smooth: false };
  S.key.line([[cx - span, cy], [cx + span, cy]], mark);
  S.key.line([[cx, cy - span], [cx, cy + span]], mark);
  for (let k = -10; k <= 10; k += 1) {
    if (k === 0) continue;
    const tick = k % 5 === 0 ? 16 : 8;
    S.key.line([[cx + k * step, cy - tick], [cx + k * step, cy + tick]], mark);
  }
}
