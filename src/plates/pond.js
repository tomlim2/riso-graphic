// 얼어붙은 연못을 위에서 본다. 맑은 얼음은 밑의 물이 비쳐 어둡고, 갈라진 자리는 희다 — 얼음이
// 깨질 때 틈에 공기가 갇히고, 그 수많은 공기와 얼음의 경계가 빛을 모든 파장으로 고르게 흩어서
// 뿌옇게 보이기 때문이다. 눈이 희고 얼음이 맑은 것과 같은 까닭이다. 그래서 이 판에서 금은 찍는
// 것이 아니라 파내는 것이다. 흰 잉크가 아니라 찍지 않은 종이다.
//
// 금의 모양은 그리지 않는다. 얼음이 실제로 갈라지는 차례를 그대로 따른다.
//
//   수축 금  기온이 내려가면 얼음판이 줄어들며 갈라진다. 새 금은 먼저 난 금에서 직각으로 떠나고,
//            다른 금의 응력이 풀린 영역에 들어서면 방향을 틀어 그 금에도 직각으로 가 닿는다.
//            그래서 마디가 T자다. 판은 이렇게 한 번에 하나씩 쪼개지며 고른 조각으로 나뉜다
//   돌자국   돌이 떨어진 자리에서는 살이 먼저 뻗고, 그다음 살을 가로지르는 고리 금이 얼마쯤
//            떨어진 곳에 난다. 살은 넷에서 아홉쯤이다
//   돌       맑은 얼음 위의 돌은 제 그늘로 밑의 얼음이 마르는 것을 막아 가느다란 기둥 위에 남고,
//            제 몸에서 나오는 열이 둘레를 얕게 파낸다(바이칼의 젠 스톤). 위에서 보면 검은 돌
//            둘레에 기둥의 테가 밝게 둘린다
//   틱       금은 한꺼번에 나지 않는다. 추운 밤 얼음은 하나씩 소리를 내며 갈라진다. 한 바퀴 동안
//            금마다 한 번씩 제 차례에 희게 트였다가 가라앉는다
//
// 참고: 열수축 다각형의 직각 마디와 육각 마디(Lachenbruch 1962), 얼음판 충격의 살금과 고리금,
// 젠 스톤의 승화 기둥(PNAS 2021).

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { meteorInks } from "../drums.js";
import { carve, stain } from "../night.js";
import { dim } from "../scope.js";
import { stainsFor, soak } from "../stains.js";

const TAU = Math.PI * 2;

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function areaOf(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    sum += x0 * y1 - x1 * y0;
  }
  return Math.abs(sum) / 2;
}

function middle(poly) {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return [x / poly.length, y / poly.length];
}

// 변의 안쪽 법선. 조각의 한가운데를 향하는 쪽이다. 금은 이 방향으로 떠나고 이 방향으로 와 닿는다
function inward(poly, i) {
  const [x0, y0] = poly[i];
  const [x1, y1] = poly[(i + 1) % poly.length];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const n = [-(y1 - y0) / len, (x1 - x0) / len];
  const mid = [(x0 + x1) / 2, (y0 + y1) / 2];
  const [cx, cy] = middle(poly);
  return n[0] * (cx - mid[0]) + n[1] * (cy - mid[1]) < 0 ? [-n[0], -n[1]] : n;
}

// 떠난 금이 어느 변에 가 닿는가. 모서리에 너무 가까이 닿는 것은 버린다 — 실제 금도 벽의 가운데
// 께에 가 붙지 꼭짓점을 물지 않는다
function shoot(poly, from, dir, skip) {
  let hit = null;
  for (let i = 0; i < poly.length; i += 1) {
    if (i === skip) continue;
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const ex = x1 - x0;
    const ey = y1 - y0;
    const den = ex * dir[1] - ey * dir[0];
    if (Math.abs(den) < 1e-9) continue;
    const dx = x0 - from[0];
    const dy = y0 - from[1];
    const along = (ex * dy - ey * dx) / den;
    const on = (dir[0] * dy - dir[1] * dx) / den;
    if (along <= 1e-6 || on < 0.12 || on > 0.88) continue;
    if (!hit || along < hit.along) hit = { edge: i, on, along };
  }
  return hit;
}

// 금 하나로 조각을 둘로 나눈다. 장부는 곧은 현으로 적고 그림만 휜다 — 휘는 폭이 좁아 둘이 어긋나
// 보이지 않는다
function split(poly, ia, ta, ib, tb) {
  const n = poly.length;
  const A = lerp(poly[ia], poly[(ia + 1) % n], ta);
  const B = lerp(poly[ib], poly[(ib + 1) % n], tb);
  const one = [A];
  for (let i = (ia + 1) % n; ; i = (i + 1) % n) {
    one.push(poly[i]);
    if (i === ib) break;
  }
  one.push(B);
  const two = [B];
  for (let i = (ib + 1) % n; ; i = (i + 1) % n) {
    two.push(poly[i]);
    if (i === ia) break;
  }
  two.push(A);
  return [one, two, A, B];
}

// 떠날 때의 방향과 닿을 때의 방향이 정해진 금. 삼차 곡선 하나면 양 끝이 다 직각이다
function bend(A, dirA, B, dirB, steps = 18) {
  const span = Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.34;
  const c1 = [A[0] + dirA[0] * span, A[1] + dirA[1] * span];
  const c2 = [B[0] + dirB[0] * span, B[1] + dirB[1] * span];
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const s = i / steps;
    const k = 1 - s;
    points.push([
      k * k * k * A[0] + 3 * k * k * s * c1[0] + 3 * k * s * s * c2[0] + s * s * s * B[0],
      k * k * k * A[1] + 3 * k * k * s * c1[1] + 3 * k * s * s * c2[1] + s * s * s * B[1]
    ]);
  }
  return points;
}

export const pond = {
  id: "pond",
  name: "POND",
  about: "얼어붙은 연못을 위에서 — 갈라진 자리는 희고, 돌은 제 기둥 위에 남는다",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "금이 나는 차례와 돌이 놓이는 자리를 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 0.9, hint: "얼음의 어둠. 맑은 얼음일수록 밑의 물이 비쳐 어둡다" },
    { key: "cracks", label: "CRACKS", min: 0, max: 120, step: 1, value: 44, hint: "수축 금의 수. 한 번에 가장 큰 조각을 쪼개므로 많을수록 조각이 고르고 잘다" },
    { key: "stones", label: "STONES", min: 0, max: 9, step: 1, value: 5, hint: "빙판 위에 놓인 돌의 수" },
    { key: "size", label: "SIZE", min: 0.015, max: 0.09, step: 0.005, value: 0.055, hint: "돌의 크기. 판 폭에 대한 비율이다" },
    { key: "shatter", label: "SHATTER", min: 0, max: 9, step: 1, value: 5, hint: "돌자국의 살금 수. 얼음판을 때리면 살이 먼저 뻗는다. 실제로도 넷에서 아홉쯤이다" },
    { key: "rings", label: "RINGS", min: 0, max: 4, step: 1, value: 2, hint: "살을 가로지르는 고리 금의 수. 살이 뻗은 다음 얼마쯤 떨어진 곳에 난다" },
    { key: "rim", label: "RIM", min: 0, max: 1, step: 0.05, value: 0.7, hint: "돌 둘레에 둘리는 기둥의 테. 돌이 제 그늘로 밑의 얼음을 지켜 남긴 자리다" },
    { key: "tick", label: "TICK", min: 0, max: 1, step: 0.05, value: 0.6, hint: "금이 제 차례에 트이는 밝기. 0이면 모든 금이 한결같이 가라앉아 있다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "금과 돌의 가장자리가 손으로 오린 듯 흔들리는 정도" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.4, hint: "얼음이 얼룩덜룩한 정도. 0이면 얼음이 고르게 깔린다" },
    { key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 16, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊긴다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 또박또박한 박자. 한 바퀴를 BEAT장으로 나누고 그 장의 시간으로만 그린다
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;

    const seed = fieldSeed(page, 0x6d3f19a7);
    const layout = makeRng(seed);
    const cut = makeRng((seed ^ 0x1b56c4e9) >>> 0);

    const inks = S.drums.map((drum) => drum.separation);
    const { glowInk, darkInk } = meteorInks(S.drums, S.key);

    // 얼음. 모든 통으로 깔되 가장 진한 통에 자리를 남겨 둔다 — 돌이 그 자리를 쓴다
    const dark = knobs.dark;
    S.key.ramp(0, 0, width, height, { from: dark * 0.82, to: dark });
    S.wash.ramp(0, 0, width, height, { from: dark * 0.6, to: dark * 0.26 });
    if (S.body !== S.wash) S.body.ramp(0, 0, width, height, { from: dark * 0.3, to: dark * 0.66 });
    // 얼룩. 해파리의 물과 같다. 고른 계조로는 얼음이 되지 않는다
    if (knobs.stain > 0) {
      const made = stainsFor(page.seed, knobs.stain, 0.6);
      soak(S.wash, made.wash, width, height);
      soak(S.body, made.body, width, height);
    }
    dim(S.key, page, width * 0.95, 0.65);

    // 손으로 오린 가장자리
    const wobble = width * 0.0016 * knobs.hand;
    const shake = (points) => points.map(([x, y]) => [x + (cut.next() - 0.5) * wobble, y + (cut.next() - 0.5) * wobble]);

    // 금 하나. 밑에 가라앉아 있다가 제 차례에 종이까지 트인다. 한 바퀴에 한 번이라 루프가 닫힌다
    const cracks = [];
    const lay = (points, thick, phase) => cracks.push({ points: shake(points), thick, phase });

    // 수축 금. 판 전체가 한 조각에서 시작해 한 번에 하나씩 쪼개진다. 언제나 가장 큰 조각을 고르므로
    // 조각이 고르게 잘아진다 — 열수축 다각형이 실제로 그렇게 자란다
    const shards = [
      [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height]
      ]
    ];
    const most = Math.round(knobs.cracks);
    for (let k = 0; k < most; k += 1) {
      let pick = 0;
      let big = -1;
      for (let i = 0; i < shards.length; i += 1) {
        const size = areaOf(shards[i]);
        if (size > big) {
          big = size;
          pick = i;
        }
      }
      const poly = shards[pick];
      // 가장 긴 변에서 떠난다. 그래야 조각의 긴 쪽을 가로질러 반으로 나뉜다
      let edge = 0;
      let far = -1;
      for (let i = 0; i < poly.length; i += 1) {
        const [x0, y0] = poly[i];
        const [x1, y1] = poly[(i + 1) % poly.length];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len > far) {
          far = len;
          edge = i;
        }
      }
      const at = layout.float(0.3, 0.7);
      const from = lerp(poly[edge], poly[(edge + 1) % poly.length], at);
      // 직각으로 떠나되 꼭 직각은 아니다. 문헌도 '대략 90도'라 적는다. 자로 잰 직각만 쓰면 판이
      // 바둑판이 되고 얼음이 아니라 타일이 된다
      const straight = inward(poly, edge);
      const skew = layout.float(-0.34, 0.34);
      const dir = [
        straight[0] * Math.cos(skew) - straight[1] * Math.sin(skew),
        straight[0] * Math.sin(skew) + straight[1] * Math.cos(skew)
      ];
      const hit = shoot(poly, from, dir, edge);
      if (!hit) continue;
      // 닿는 쪽도 직각이다. 되돌아오는 방향이 그 변의 안쪽 법선이다
      const land = inward(poly, hit.edge);
      const [one, two, A, B] = split(poly, edge, at, hit.edge, hit.on);
      shards.splice(pick, 1, one, two);
      // 늦게 난 금일수록 가늘다. 먼저 난 금이 넓게 벌어져 있다
      const thin = 1 - (k / Math.max(1, most)) * 0.62;
      lay(bend(A, dir, B, land), width * 0.0034 * thin, layout.next());
    }

    // 돌. 서로 겹치지 않게 놓고, 판 끝은 피한다
    const many = Math.round(knobs.stones);
    const stones = [];
    const grit = width * knobs.size;
    for (let i = 0; i < many; i += 1) {
      for (let tries = 0; tries < 24; tries += 1) {
        const x = layout.float(width * 0.12, width * 0.88);
        const y = layout.float(height * 0.12, height * 0.88);
        const r = grit * layout.float(0.55, 1.45);
        if (stones.every((one) => Math.hypot(one.x - x, one.y - y) > (one.r + r) * 2.1)) {
          stones.push({ x, y, r, turn: layout.float(0, TAU) });
          break;
        }
      }
    }

    // 돌자국. 살이 먼저 뻗고, 살을 가로지르는 고리 금이 얼마쯤 떨어진 곳에 난다
    for (const one of stones) {
      const arms = Math.round(knobs.shatter);
      const reach = [];
      for (let i = 0; i < arms; i += 1) {
        const a = one.turn + (i / arms) * TAU + layout.float(-0.18, 0.18);
        const len = one.r * layout.float(2.4, 5.6);
        reach.push({ a, len });
        const steps = 10;
        const points = [];
        for (let s = 0; s <= steps; s += 1) {
          const at = one.r * 0.8 + (len - one.r * 0.8) * (s / steps);
          const sway = Math.sin((s / steps) * Math.PI) * one.r * 0.18 * layout.float(-1, 1);
          points.push([one.x + Math.cos(a) * at - Math.sin(a) * sway, one.y + Math.sin(a) * at + Math.cos(a) * sway]);
        }
        lay(points, width * 0.0034, layout.next());
      }
      // 고리 금. 살에 걸려 살과 살 사이가 안쪽으로 처진다
      const hoops = Math.round(knobs.rings);
      for (let k = 1; k <= hoops && reach.length > 1; k += 1) {
        const share = 0.42 + (0.46 * k) / hoops;
        const points = [];
        for (let i = 0; i <= reach.length; i += 1) {
          const now = reach[i % reach.length];
          const next = reach[(i + 1) % reach.length];
          const r0 = now.len * share;
          points.push([one.x + Math.cos(now.a) * r0, one.y + Math.sin(now.a) * r0]);
          const mid = now.a + ((next.a - now.a + TAU) % TAU) / 2;
          const sag = ((r0 + next.len * share) / 2) * 0.9;
          points.push([one.x + Math.cos(mid) * sag, one.y + Math.sin(mid) * sag]);
        }
        lay(points, width * 0.0026, layout.next());
      }
    }

    // 금을 판다. 얼음이 깨진 자리에 갇힌 공기가 빛을 흩어 희게 보이므로, 찍는 것이 아니라 파낸다
    const tick = knobs.tick;
    for (const crack of cracks) {
      // 제 차례가 오면 종이까지 트였다가 가라앉는다. 한 바퀴에 꼭 한 번이다
      const age = ((held - crack.phase) % 1 + 1) % 1;
      const open = age < 0.12 ? 1 - age / 0.12 : 0;
      const tone = 0.66 + 0.34 * open * tick;
      carve(
        inks,
        (g) => {
          g.lineWidth = Math.max(1, crack.thick);
          g.lineCap = "round";
          g.lineJoin = "round";
          shapes.splinePath(g, crack.points, false);
          g.stroke();
        },
        tone
      );
    }

    // 돌. 기둥의 테를 먼저 파내고 그 위에 돌을 얹으면, 검은 돌 둘레에 테만 밝게 남는다
    for (const one of stones) {
      const stone = shake(shapes.blob(cut, one.x, one.y, one.r, { lobes: 3, wobble: 0.09, steps: 26, squash: 0.86, tilt: one.turn }));
      if (knobs.rim > 0) {
        const halo = shake(shapes.blob(cut, one.x, one.y, one.r * 1.16, { lobes: 3, wobble: 0.07, steps: 26, squash: 0.86, tilt: one.turn }));
        carve(inks, fill(halo), knobs.rim * 0.9);
      }
      stain([S.key], fill(stone), 1);
      if (darkInk) stain([darkInk], fill(stone), 0.92);
      stain(inks.filter((sep) => sep !== S.key && sep !== darkInk), fill(stone), inks.length > 2 ? 0.45 : 0.9);
      // 돌의 한쪽에 앉는 빛. 옅은 통 하나만 걷어 내면 남은 통의 색이 드러난다
      if (glowInk && glowInk !== S.key) {
        const lit = shake(shapes.blob(cut, one.x - one.r * 0.28, one.y - one.r * 0.3, one.r * 0.44, { lobes: 4, wobble: 0.3, steps: 14 }));
        carve([glowInk], fill(lit), 0.75);
      }
    }

    return { stones, shards: shards.length, cracks: cracks.length };
  },

  // 안내선. 돌마다 가운데를 찍고, 얼음이 몇 조각으로 갈렸는지 적는다
  guides(page, sketch) {
    if (!sketch) return [];
    const marks = sketch.stones.map((one) => ({ kind: "dot", at: [one.x, one.y], r: 4, ring: one.r * 1.34 }));
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `${sketch.shards} SHARDS · ${sketch.cracks} CRACKS`
    });
    return marks;
  }
};

function fill(points) {
  return (g) => {
    shapes.splinePath(g, points, true);
    g.fill();
  };
}
