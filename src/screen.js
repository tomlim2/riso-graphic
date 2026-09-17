// 리소는 드럼이 스크린 너머로 잉크를 밀어 넣는 기계다. 그래서 어떤 면도 솔리드가 아니라
// 망점이고, 드럼마다 스크린 각도가 다르며, 세 각도가 겹친 자리에 로제트가 뜬다.
//
// 이 파일이 하는 일은 하나다. 분판의 알파(= 커버리지)를 받아 망점으로 바꾸고 종이에 곱해
// 얹는다. 픽셀마다 따로 도는 계산이라 GPU의 몫이고, 그래서 여기 있는 것은 전부 셰이더다.
//
// 셰이더 안에는 한글을 두지 않는다. GLSL은 주석에도 ASCII만 받던 때가 있었다. 설명은
// 조각마다 자바스크립트 쪽에 붙여 두고, 조각을 이어 붙여 한 벌을 만든다.

// 드럼별 스크린 각도. 같은 각도로 두 판을 찍으면 무아레가 생긴다. 셋을 30도씩 벌려 두는
// 것이 인쇄가 오래 써 온 답이고, 겹친 자리에 로제트가 뜨는 것도 이 벌어짐 때문이다.
export const ANGLES = { key: 45, body: 15, wash: 75 };

// 화면을 덮는 삼각형 하나. 꼭짓점은 press.js가 넣는다.
export const VERTEX = `#version 300 es
in vec2 a_corner;
void main() {
  gl_Position = vec4(a_corner, 0.0, 1.0);
}
`;

// 한 장이 받는 것.
//   u_size  — 종이의 픽셀 수
//   u_scale — 판형 1픽셀이 종이 몇 픽셀인가. 콘택트 시트에서는 1/3이다
//   u_keys  — 롤과 인상에서 나온 씨앗 셋. 티끌, 굵은 얼룩, 잔 얼룩
//   u_count — 실제로 도는 통 수. 옅은 통부터 들어온다
const HEAD = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_size;
uniform float u_scale;
uniform uvec3 u_keys;
uniform int u_count;
uniform float u_cell;
uniform float u_grain;
uniform vec3 u_paper;
uniform vec3 u_shade;

uniform sampler2D u_sep[3];
uniform vec3 u_ink[3];
uniform vec2 u_turn[3];
uniform vec2 u_slip[3];

out vec4 outColor;
`;

// 잡음. 예전에는 롤마다 종이 픽셀 수만큼 난수를 뽑아 표로 들고 있었다. 1080이면 117만 개,
// 한 벌에 20밀리초였고 끓는 화면은 그것을 여덟 벌 쥐고 있어야 했다. 지금은 자리와 씨앗을
// 섞어 그 자리에서 만든다. 표가 없으니 크기마다 따로 쥘 것도 없다.
//
// 정수 연산은 GPU마다 같은 답을 낸다. 같은 롤이 같은 잡음을 내는 뿌리가 여기 있다.
// 위 24비트만 쓰는 것은 32비트를 그대로 나누면 반올림으로 1.0이 나오기 때문이다.
const NOISE = `
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

float hash(ivec2 at, uint key) {
  uvec2 u = uvec2(at + 65536);
  return float(pcg(pcg(key + u.x) + u.y) >> 8u) / 16777216.0;
}

float valueNoise(vec2 at, uint key) {
  vec2 cell = floor(at);
  vec2 f = at - cell;
  vec2 s = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(cell);
  float top = mix(hash(c, key), hash(c + ivec2(1, 0), key), s.x);
  float bottom = mix(hash(c + ivec2(0, 1), key), hash(c + ivec2(1, 1), key), s.x);
  return mix(top, bottom, s.y);
}
`;

// 종이에 딸린 두 결.
//   speck  — 픽셀마다 흰 잡음. 망점의 가장자리를 갉는다. 종이 픽셀을 따른다
//   mottle — 낮은 주파수. 드럼이 두껍게 먹은 자리와 얇게 지나간 자리. 판형 좌표를 따른다
//
// 얼룩은 예전에 종이 픽셀을 따랐다. 그래서 콘택트 시트의 작은 장은 같은 얼룩을 세 배로
// 키워 입었다. 얼룩은 인쇄의 성질이지 화면의 성질이 아니므로 판형에 붙인다.
const FIELDS = `
float speck(vec2 pixel) {
  return hash(ivec2(pixel), u_keys.x);
}

float mottle(vec2 sheet) {
  return valueNoise(sheet / 110.0, u_keys.y) * 0.65 + valueNoise(sheet / 31.0, u_keys.z) * 0.35;
}
`;

// 커버리지 c를 망점 반지름으로 바꾼다.
//
// 넓이가 c가 되는 원의 반지름은 셀 반폭 단위로 1.128*sqrt(c)다. 그대로 쓰면 c가 1이어도
// 반지름이 1.128이라 셀 모서리(1.414)가 끝내 비어 솔리드가 되지 않는다. 진한 쪽으로 갈수록
// 조금씩 부풀려, 실제 스크린이 그러듯 95% 언저리에서 점끼리 붙어 막히게 한다.
const DOT = `
float dotRadius(float c) {
  return 1.128 * sqrt(c) * (1.0 + 0.35 * c * c);
}
`;

// 통 하나를 망점으로. q는 이 통 자신의 좌표로 본 픽셀 자리다 — 판이 어긋난 만큼 밀려 있다.
//
// 어긋남은 다 찍은 판을 옮겨 붙이지 않고, 어긋난 자리에서 바로 망점을 친다. 예전에는 찍은
// 판을 소수점 픽셀만큼 옮기며 한 번 더 흐렸다. 판 밖으로 밀려난 자리에는 잉크가 없다.
//
// 드럼은 종이를 100% 덮지 못한다. 꽉 채운 면에도 셀 모서리마다 바늘구멍이 남고, 그 위를
// 농도 얼룩이 다시 흔든다. 이 상한이 없으면 솔리드가 완전히 납작해져 망점으로 바꾼 보람이
// 사라진다. GRAIN을 0으로 내리면 상한이 1로 올라가 얼룩 없는 깨끗한 망점이 되므로, 스크린만
// 따로 판단할 수 있다.
//
// 가장자리는 종이 2.2픽셀에 걸쳐 흐린다. 계단을 막는다.
const SCREEN = `
float screen(sampler2D sep, vec2 q, vec2 turn) {
  vec2 s = q + 0.5;
  if (s.x < 0.0 || s.y < 0.0 || s.x >= u_size.x || s.y >= u_size.y) return 0.0;

  float alpha = textureLod(sep, s / u_size, 0.0).a;
  if (alpha <= 0.0) return 0.0;

  float c = alpha * (1.0 - u_grain * 0.32) * (1.0 + (mottle(q / u_scale) - 0.5) * u_grain * 0.6);
  if (c <= 0.0) return 0.0;
  c = min(c, 1.0);

  vec2 r = vec2(q.x * turn.x + q.y * turn.y, q.y * turn.x - q.x * turn.y);
  float halfCell = u_cell * 0.5;
  vec2 uv = mod(r, u_cell) / halfCell - 1.0;

  float edge = length(uv) - dotRadius(c) + (speck(floor(s)) - 0.5) * u_grain * 1.4;
  return clamp(0.5 - edge * halfCell / 2.2, 0.0, 1.0);
}
`;

// 인쇄 순서 그대로. 종이를 깔고, 종이결을 입히고, 통마다 망점을 쳐서 곱하기로 얹는다.
//
// 종이결은 잉크 그레인보다 훨씬 약하다. 이게 있어야 종이로 읽힌다.
//
// 곱하기는 불투명한 종이 위에서 종이 × mix(1, 잉크, 망점)이 된다. 순서를 바꿔도 같은 답이
// 나오지만 옅은 통부터 넣는다 — 종이가 실제로 통과하는 순서다. 노랑이 파랑 위에 곱해지면
// 초록 말고 갈 곳이 없다.
//
// 샘플러 배열은 상수로만 짚을 수 있어서 통 셋을 풀어 쓴다.
const MAIN = `
void main() {
  vec2 p = vec2(gl_FragCoord.x - 0.5, u_size.y - 0.5 - gl_FragCoord.y);

  float tooth = speck(p) * 26.0 + (mottle(p / u_scale) - 0.5) * 18.0;
  vec3 color = mix(u_paper, u_shade, max(tooth, 0.0) / 255.0);

  if (u_count > 0) color *= mix(vec3(1.0), u_ink[0], screen(u_sep[0], p - u_slip[0], u_turn[0]));
  if (u_count > 1) color *= mix(vec3(1.0), u_ink[1], screen(u_sep[1], p - u_slip[1], u_turn[1]));
  if (u_count > 2) color *= mix(vec3(1.0), u_ink[2], screen(u_sep[2], p - u_slip[2], u_turn[2]));

  outColor = vec4(color, 1.0);
}
`;

export const FRAGMENT = HEAD + NOISE + FIELDS + DOT + SCREEN + MAIN;

// 씨앗 섞기. 셰이더의 pcg와 같은 식이다. 셰이더가 픽셀마다 같은 씨앗을 다시 섞지 않도록
// 한 장에 한 번 여기서 섞어 넘긴다.
export function pcg(value) {
  const state = (Math.imul(value >>> 0, 747796405) + 2891336453) >>> 0;
  const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>> 0;
  return ((word >>> 22) ^ word) >>> 0;
}
