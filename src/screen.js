// 리소는 드럼이 스크린 너머로 잉크를 밀어 넣는 기계다. 그래서 어떤 면도 솔리드가 아니라
// 망점이고, 드럼마다 스크린 각도가 다르며, 세 각도가 겹친 자리에 로제트가 뜬다.
//
// 이 파일이 하는 일은 하나다. 분판의 알파(= 커버리지)를 받아 망점으로 바꾼다.

import { makeNoise2 } from "./rng.js";

// 드럼별 스크린 각도. 같은 각도로 두 판을 찍으면 무아레가 생긴다. 셋을 30도씩 벌려 두는
// 것이 인쇄가 오래 써 온 답이고, 겹친 자리에 로제트가 뜨는 것도 이 벌어짐 때문이다.
export const ANGLES = { key: 45, body: 15, wash: 75 };

// 종이 크기마다 한 벌. 롤에만 달려 있고 다이얼에는 달려 있지 않다.
//   speck  — 픽셀마다 흰 잡음. 망점의 가장자리를 갉는다
//   mottle — 낮은 주파수. 드럼이 두껍게 먹은 자리와 얇게 지나간 자리
export function makeInkFields(width, height, rng) {
  const count = width * height;
  const speck = new Float32Array(count);
  for (let i = 0; i < count; i += 1) speck[i] = rng.next();

  const coarse = makeNoise2(rng);
  const fine = makeNoise2(rng);
  const mottle = new Float32Array(count);
  for (let y = 0, i = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1, i += 1) {
      mottle[i] = coarse(x / 110, y / 110) * 0.65 + fine(x / 31, y / 31) * 0.35;
    }
  }

  return { speck, mottle, width, height };
}

// 커버리지 c를 망점 반지름으로 바꾼다.
//
// 넓이가 c가 되는 원의 반지름은 셀 반폭 단위로 1.128*sqrt(c)다. 그대로 쓰면 c가 1이어도
// 반지름이 1.128이라 셀 모서리(1.414)가 끝내 비어 솔리드가 되지 않는다. 진한 쪽으로 갈수록
// 조금씩 부풀려, 실제 스크린이 그러듯 95% 언저리에서 점끼리 붙어 막히게 한다.
function dotRadius(c) {
  return 1.128 * Math.sqrt(c) * (1 + 0.35 * c * c);
}

// 마스크의 알파를 망점으로 갈아 끼운다.
export function screenSeparation(image, fields, options) {
  const { cell, angle, grain, width, height } = options;
  const data = image.data;
  const { speck, mottle } = fields;

  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const half = cell / 2;
  const soft = 2.2 / half; // 망점 가장자리를 2.2픽셀에 걸쳐 흐린다. 계단을 막는다
  const ragged = grain * 1.4;

  for (let y = 0, i = 0; y < height; y += 1) {
    const ys = y * sin;
    const yc = y * cos;

    for (let x = 0; x < width; x += 1, i += 1) {
      const p = i * 4 + 3;
      if (data[p] === 0) continue;

      // 드럼은 종이를 100% 덮지 못한다. 꽉 채운 면에도 셀 모서리마다 바늘구멍이 남고,
      // 그 위를 농도 얼룩이 다시 흔든다. 이 상한이 없으면 솔리드가 완전히 납작해져
      // 망점으로 바꾼 보람이 사라진다. GRAIN을 0으로 내리면 상한이 1로 올라가
      // 얼룩 없는 깨끗한 망점이 되므로, 스크린만 따로 판단할 수 있다.
      let c = (data[p] / 255) * (1 - grain * 0.32) * (1 + (mottle[i] - 0.5) * grain * 0.6);
      if (c <= 0) { data[p] = 0; continue; }
      if (c > 1) c = 1;

      // 이 드럼의 각도로 돌린 좌표에서 셀 안 위치를 구한다. 셀 중심이 (0, 0)
      const xr = x * cos + ys;
      const yr = yc - x * sin;
      let u = xr % cell; if (u < 0) u += cell;
      let v = yr % cell; if (v < 0) v += cell;
      u = u / half - 1;
      v = v / half - 1;

      const edge = Math.sqrt(u * u + v * v) - dotRadius(c) + (speck[i] - 0.5) * ragged;
      const a = 0.5 - edge / soft;
      data[p] = a <= 0 ? 0 : a >= 1 ? 255 : (a * 255) | 0;
    }
  }
}

// 종이결. 잉크 그레인보다 훨씬 약하고 움직이지 않는다. 이게 있어야 종이로 읽힌다.
export function paperTooth(context, fields, width, height, shade) {
  const image = context.createImageData(width, height);
  const data = image.data;
  const tint = parseInt(shade.slice(1), 16);
  const r = (tint >> 16) & 255;
  const g = (tint >> 8) & 255;
  const b = tint & 255;

  for (let i = 0, p = 0; i < fields.speck.length; i += 1, p += 4) {
    data[p] = r;
    data[p + 1] = g;
    data[p + 2] = b;
    data[p + 3] = (fields.speck[i] * 26 + (fields.mottle[i] - 0.5) * 18) | 0;
  }

  return image;
}
