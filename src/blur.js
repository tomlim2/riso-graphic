// 흐림. 판 여럿이 부드러운 빛과 번진 얼룩을 만드는 데 쓴다.
//
// 캔버스의 filter는 브라우저마다 받는 것이 다르고 결과도 다르다. 그래서 알파 밭을 자바스크립트로
// 직접 흐린다. 상자 흐림을 세 번 겹치면 가우스 흐림에 가깝고, 반폭과 상관없이 한 줄을 한 번에
// 훑으므로 빠르다.

import { splinePath } from "./shapes.js";

// 한 방향 상자 흐림. 창을 밀며 들어오는 값을 더하고 나가는 값을 빼, 반폭과 상관없이 한 줄을
// 한 번에 훑는다. 줄 끝 너머는 끝값으로 친다. across면 가로로, 아니면 세로로 흐린다
function boxBlur(field, cols, rows, radius, across) {
  const out = new Float32Array(field.length);
  const lines = across ? rows : cols;
  const length = across ? cols : rows;
  const along = across ? 1 : cols; // 줄 안에서 한 칸
  const between = across ? cols : 1; // 줄과 줄 사이
  const span = radius * 2 + 1;
  const last = length - 1;
  for (let line = 0; line < lines; line += 1) {
    const origin = line * between;
    const first = field[origin];
    const end = field[origin + last * along];
    let sum = 0;
    for (let k = -radius; k <= radius; k += 1) sum += k < 0 ? first : k > last ? end : field[origin + k * along];
    for (let k = 0; k < length; k += 1) {
      out[origin + k * along] = sum / span;
      const enter = k + radius + 1;
      const leave = k - radius;
      sum += (enter > last ? end : field[origin + enter * along]) - (leave < 0 ? first : field[origin + leave * along]);
    }
  }
  return out;
}

// 세 번 겹친 상자 흐림. 가우스 흐림에 가깝다
export function soften(field, cols, rows, radius) {
  let out = field;
  for (let pass = 0; radius > 0 && pass < 3; pass += 1) {
    out = boxBlur(boxBlur(out, cols, rows, radius, true), cols, rows, radius, false);
  }
  return out;
}

// 닫힌 모양 하나의 번짐. 모양을 성긴 격자에 칠해 흐리고, 파내거나 찍을 알파 무늬로 돌려준다.
// 모양에서 멀어질수록 고르게 옅어져 계단이 없다.
//
// 격자 한 칸(step)은 판의 몇 픽셀이다. 빛이 흐려서 키워 붙여도 티가 나지 않고, 모양 하나에
// 몇천 칸이면 된다. 칸의 크기는 번짐 폭(reach, 판의 픽셀)을 따라 정해 흐림이 몇 칸에 걸치게 한다.
// 같은 모양에 같은 폭을 주면 칸도 같으므로, 폭이 프레임마다 바뀌지 않는 한 그림이 튀지 않는다.
// 모양 둘레에는 흐림이 닿는 만큼 여백을 둔다. 흐린 값에는 곡선을 씌워 모양 가까이는 진하게,
// 멀리는 길게 끌리게 한다.
//
// 캔버스는 한 장을 돌려 쓰고, 모자랄 때만 키운다. 무늬는 한 칸 들여 앉히고 매번 전부 지운다.
// 키워 붙일 때 무늬 바깥 한 칸을 함께 읽는데, 거기에 앞 무늬가 남아 있거나 캔버스 끝이 걸리면
// 같은 장이 앞서 무엇을 찍었느냐에 따라 달라진다. 돌려준 무늬는 다음 부름 전에 다 써야 한다.
let glowCanvas = null;

export function glowMask(points, reach) {
  const step = Math.max(1, Math.min(4, Math.floor(reach / 4)));
  const pad = reach * 3;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const [x, y] of points) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  const col = Math.floor((left - pad) / step);
  const row = Math.floor((top - pad) / step);
  const cols = Math.ceil((right + pad) / step) - col;
  const rows = Math.ceil((bottom + pad) / step) - row;

  glowCanvas ??= document.createElement("canvas");
  if (glowCanvas.width < cols + 2) glowCanvas.width = cols + 2;
  if (glowCanvas.height < rows + 2) glowCanvas.height = rows + 2;
  const g = glowCanvas.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
  g.setTransform(1 / step, 0, 0, 1 / step, 1 - col, 1 - row);
  g.fillStyle = "#000";
  splinePath(g, points, true);
  g.fill();

  const image = g.getImageData(1, 1, cols, rows);
  const field = new Float32Array(cols * rows);
  for (let i = 0; i < field.length; i += 1) field[i] = image.data[i * 4 + 3] / 255;
  const sigma = reach / step;
  const soft = soften(field, cols, rows, Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2)));
  for (let i = 0; i < soft.length; i += 1) {
    const rest = 1 - soft[i];
    image.data[i * 4 + 3] = Math.round((1 - rest * rest * rest) * 255);
  }
  g.putImageData(image, 1, 1);

  return { canvas: glowCanvas, cols, rows, x: col * step, y: row * step, width: cols * step, height: rows * step };
}

// 번짐 무늬를 제 캔버스로 옮긴다. glowMask가 돌려주는 것은 공용 캔버스라 다음 부름에 지워지므로,
// 여러 장에 걸쳐 쥐고 쓰려면 이것으로 옮겨 둔다. 한 칸 들여 앉힌 테두리까지 함께 옮긴다
export function keepGlow(glow) {
  const canvas = document.createElement("canvas");
  canvas.width = glow.cols + 2;
  canvas.height = glow.rows + 2;
  canvas.getContext("2d").drawImage(glow.canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return { ...glow, canvas };
}

// 번짐 무늬를 분판 위에 키워 붙인다. 파낼 때는 knockout 안에서 부른다
export function layGlow(g, glow, alpha) {
  g.globalAlpha = alpha;
  g.imageSmoothingQuality = "low";
  g.drawImage(glow.canvas, 1, 1, glow.cols, glow.rows, glow.x, glow.y, glow.width, glow.height);
}
