// 접안렌즈의 시야. 둥근 틀을 두르는 판 — CELL, CHLORO, COSMOS — 이 함께 쓴다.
//
// 둥근 틀(src/roundel.js)이 접안렌즈의 테라면, 여기는 그 안이다. 빛이 고르게 들어온 밝은 바닥,
// 가장자리로 갈수록 조금 죽는 빛, 시야에 떠 있는 부스러기.
//
// 부르는 차례가 있다. light나 dim은 표본보다 먼저이거나 표본을 다 그린 뒤이고, specks는 표본 다음,
// roundel은 맨 끝이다. 부스러기는 표본을 다 뽑은 뒤에 뽑는다 — 그래야 그 수를 바꿔도 표본이
// 흔들리지 않는다.

const TAU = Math.PI * 2;

// 시야의 공통 손잡이. 판은 제 손잡이 목록(knobs)과 따로 scope에 이것을 내놓고, 화면은 이것을 따로
// 한 칸으로 짓는다. 값은 판끼리 나눠 쓴다 — 어느 판이든 같은 접안렌즈를 들여다보는 것이므로.
export const SCOPE_KNOBS = [
  { key: "frame", label: "FRAME", min: 0.3, max: 0.75, step: 0.01, value: 0.44, hint: "시야의 반지름. 0.72를 넘으면 시야가 판을 다 덮는다" },
  { key: "vignette", label: "VIGNETTE", min: 0, max: 1, step: 0.05, value: 0.5, hint: "시야 가장자리로 갈수록 빛이 죽는 정도" }
];

// 밝은 시야의 바닥. 옅은 통을 한가운데에서 가장자리로 갈수록 조금씩 짙게 깔고, 가장자리 한 켜는
// 진한 통으로 누른다. 렌즈가 원래 그렇다. 바닥을 다른 통으로 깔고 싶으면 ground로 넘긴다.
export function light(S, page, ring, vignette, ground = S.wash) {
  const { width, height } = page;
  const cx = width / 2;
  const cy = height / 2;
  ground.draw((g) => {
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, ring);
    glow.addColorStop(0, "rgba(0, 0, 0, 0.05)");
    glow.addColorStop(1, `rgba(0, 0, 0, ${0.05 + 0.2 * vignette})`);
    g.fillStyle = glow;
    g.fillRect(0, 0, width, height);
  });
  dim(S.key, page, ring, vignette, cx, cy);
}

// 가장자리 한 켜만 누른다. 어두운 시야는 바닥을 따로 깔므로 이것만 쓴다
export function dim(sep, { width, height }, ring, vignette, cx = width / 2, cy = height / 2) {
  if (!(vignette > 0)) return;
  sep.draw((g) => {
    const edge = g.createRadialGradient(cx, cy, ring * 0.6, cx, cy, ring);
    edge.addColorStop(0, "rgba(0, 0, 0, 0)");
    edge.addColorStop(1, `rgba(0, 0, 0, ${0.3 * vignette})`);
    g.fillStyle = edge;
    g.fillRect(0, 0, width, height);
  });
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
