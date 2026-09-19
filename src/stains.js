// 번진 얼룩. 옅은 두 통이 저주파 밭을 따라 크게 번진다. JELLY의 물과 METEOR의 하늘이 쓴다. 판형의
// 1/6 크기로 밭을 그려 두고 키워 붙인다. 롤마다 한 벌이면 되니, 매 프레임 새로 짓지 않도록 몇 벌만 쥔다.
//
// 밭의 대비를 올려 얼룩을 가르면 가장자리가 오려 낸 듯 또렷해져, 물에 번진 것이 아니라 붙인
// 것처럼 보인다. 그래서 가장자리를 흐린다(FEATHER). 판의 가장자리도 안쪽과 똑같이 흐리도록,
// 밭을 흐림이 닿는 만큼 넓게 그려 흐린 뒤에 잘라 낸다.
//
// 키울 때는 보통 품질로 한다. 밭이 이미 부드러워 차이가 보이지 않는데, 고품질 확대는 한 장에
// 몇 밀리초를 더 쓴다.

import { makeRng, makeNoise2 } from "./rng.js";
import { keeper } from "./keep.js";
import { soften } from "./blur.js";

const STAIN_SIZE = 180;
const FEATHER_REACH = 16; // FEATHER가 1일 때 상자 흐림의 반폭. 밭의 픽셀이다
const stains = keeper(6);

export function stainsFor(seed, amount, feather) {
  return stains(`${seed >>> 0}:${amount}:${feather}`, () => bleed(seed, amount, feather));
}

function bleed(seed, amount, feather) {
  const radius = Math.round(feather * FEATHER_REACH);
  const pad = radius * 3;
  const span = STAIN_SIZE + pad * 2;
  const rng = makeRng((seed ^ 0x51ed270b) >>> 0);
  const [wash, body] = [0.62, 0.4].map((strength) => {
    const coarse = makeNoise2(rng);
    const fine = makeNoise2(rng);
    const field = new Float32Array(span * span);
    for (let y = 0, i = 0; y < span; y += 1) {
      for (let x = 0; x < span; x += 1, i += 1) {
        const u = x - pad;
        const w = y - pad;
        const v = coarse(u / 48, w / 48) * 0.7 + fine(u / 17 + 11, w / 17 + 3) * 0.3;
        const c = Math.min(1, Math.max(0, (v - 0.46) * 2.8));
        field[i] = c * c * (3 - 2 * c);
      }
    }
    const soft = soften(field, span, span, radius);

    const canvas = document.createElement("canvas");
    canvas.width = STAIN_SIZE;
    canvas.height = STAIN_SIZE;
    const g = canvas.getContext("2d");
    const image = g.createImageData(STAIN_SIZE, STAIN_SIZE);
    for (let y = 0, a = 3; y < STAIN_SIZE; y += 1) {
      for (let x = 0; x < STAIN_SIZE; x += 1, a += 4) {
        image.data[a] = Math.round(soft[(y + pad) * span + x + pad] * strength * amount * 255);
      }
    }
    g.putImageData(image, 0, 0);
    return canvas;
  });

  return { wash, body };
}

export function soak(sep, canvas, width, height) {
  sep.draw((g) => {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "low";
    g.drawImage(canvas, 0, 0, width, height);
  });
}
