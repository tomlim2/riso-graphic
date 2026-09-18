// 망점이 어떻게 찍히는지 따라가는 페이지.
//
// 그림은 모두 이 화면의 인쇄기가 지금 찍는다. 인쇄기 하나를 보이지 않는 캔버스에 세우고,
// 그림마다 필요한 판을 찍어 필요한 자리를 잘라 옮겨 붙인다. 코드 조각도 셰이더 소스에서
// 그대로 꺼낸다. 설명과 그림이 따로 놀지 않게 하려는 것이다 — 인쇄기를 고치면 이 페이지도
// 함께 바뀐다.

import { createPress, Separation, SHEET } from "./press.js";
import { PALETTES } from "./palette.js";
import { FRAGMENT } from "./screen.js";
import { DISPLAY } from "./type.js";
import { moon } from "./plates/moon.js";

const SEED = 20260917;
const CALM = PALETTES[0]; // 노랑 × 하늘 × 안개. 화면의 기본 배색
const VIVID = PALETTES[8]; // 물빛 × 노랑 × 분홍. 겹친 색이 가장 또렷하게 갈린다

const ROLE_NAME = { key: "가장 진한 통", body: "가운데 통", wash: "가장 옅은 통" };
const INK_NAME = { "#f4c430": "노랑", "#1fbbdb": "물빛", "#ed45a1": "분홍", "#00a8e8": "하늘", "#cfd4db": "안개" };

const notice = document.getElementById("notice");

let press;
try {
  press = createPress(document.createElement("canvas"));
} catch (error) {
  notice.hidden = false;
  notice.textContent = error.message;
  throw error;
}

const BASE = {
  palette: CALM,
  inkCount: 3,
  seed: SEED,
  cell: 9,
  grain: 0.35,
  registration: 2,
  frame: 0,
  frames: 48,
  boil: "held",
  scale: 1
};

// 한 장 찍고 인쇄기의 종이와 찍은 내역을 돌려준다. 종이는 다음 장이 덮으므로 바로 옮겨 붙인다.
// GPU가 기계를 잃은 동안에는 찍히는 것이 없다. 그림들이 빈 종이를 옮겨 붙이지 않도록 멈추고 알린다
function print(plate, extra = {}) {
  const info = press.print({ ...BASE, plate, ...extra });
  if (!info) {
    notice.hidden = false;
    notice.textContent = "GPU가 인쇄기를 잃었다. 페이지를 다시 열면 된다";
    throw new Error(notice.textContent);
  }
  return { sheet: press.canvas, info };
}

const fig = (name) => document.querySelector(`[data-fig="${name}"]`);
const caption = (name, text) => {
  const node = document.querySelector(`[data-caption="${name}"]`);
  if (node) node.textContent = text;
};

// 종이의 한 자리를 잘라 픽셀째 키워 붙인다. 흐리지 않는다
function zoomInto(canvas, source, x, y, size, zoom) {
  canvas.width = size * zoom;
  canvas.height = size * zoom;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(source, x, y, size, size, 0, 0, size * zoom, size * zoom);
  return g;
}

// 종이 한 장을 통째로 줄여 붙인다
function whole(canvas, source, size = 560) {
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(source, 0, 0, size, size);
  return g;
}

// -- 연습판 ------------------------------------------------------------------------------

// 한 통만 쓰는 판. 계조 띠, 꽉 찬 원과 파낸 구멍, 50% 고리, 70%로 찍은 글자.
function lesson(sep, { width }) {
  sep.ramp(70, 70, width - 140, 250, { from: 0, to: 1, across: true });
  sep.disc(300, 590, 180);
  sep.knockout((s) => s.disc(300, 590, 64));
  sep.ring(780, 590, 150, { w: 44, tone: 0.5 });
  sep.text("망점", width / 2, 1010, { font: `700 170px ${DISPLAY}`, tone: 0.7, align: "center" });
}

const LEVELS = [0.1, 0.3, 0.5, 0.7, 0.9, 1];

// 원 셋, 통마다 하나. 겹친 자리마다 다른 색이 난다
const VENN = { wash: [0.5, 0.36], body: [0.37, 0.6], key: [0.63, 0.6] };

const plates = {
  lesson: { id: "lesson", paint: (S, R, page) => lesson(S.key, page) },
  steps: {
    id: "steps",
    paint: (S, R, { width, height }) => {
      const band = width / LEVELS.length;
      LEVELS.forEach((tone, i) => S.key.block(i * band, 0, band, height, { tone }));
    }
  },
  blank: { id: "blank", paint() {} },
  flood: (tone) => ({ id: "flood", paint: (S) => S.key.flood(tone) }),
  pair: {
    id: "pair",
    paint: (S) => {
      S.key.flood(0.5);
      S.body.flood(0.5);
    }
  },
  // 세 통이 같은 원을 찍는다. 판이 맞으면 한 덩어리, 어긋나면 가장자리에 색 테가 선다
  stack: {
    id: "stack",
    paint: (S, R, { width, height }) => {
      for (const drum of S.drums) drum.separation.disc(width / 2, height / 2, width * 0.28, { tone: 0.95 });
    }
  },
  venn: (only) => ({
    id: "venn",
    paint: (S, R, { width, height }) => {
      for (const [role, [x, y]] of Object.entries(VENN)) {
        if (only && only !== role) continue;
        S[role].disc(width * x, height * y, width * 0.26, { tone: 0.92 });
      }
    }
  })
};

// -- 셰이더 조각 -------------------------------------------------------------------------

// 셰이더 소스에서 표시한 줄부터 몇 줄을 꺼낸다. 들여쓰기는 걷어 낸다
const SNIPPETS = {
  rotate: ["vec2 r = vec2(", 3],
  radius: ["float dotRadius(float c)", 3],
  edge: ["float edge =", 5],
  grain: ["float c = alpha", 1],
  multiply: ["if (u_count > 0)", 3],
  tooth: ["float tooth =", 2]
};

function fillSnippets() {
  const lines = FRAGMENT.split("\n");
  for (const node of document.querySelectorAll("[data-snippet]")) {
    const [marker, count] = SNIPPETS[node.dataset.snippet] || [];
    const at = lines.findIndex((line) => marker && line.includes(marker));
    if (at < 0) {
      node.hidden = true;
      continue;
    }
    const picked = lines.slice(at, at + count);
    const indent = Math.min(...picked.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length));
    node.textContent = picked.map((line) => line.slice(indent)).join("\n");
  }
}

// -- 차트 --------------------------------------------------------------------------------

const SVG = "http://www.w3.org/2000/svg";

function build(svg, width, height, shapes) {
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren();
  for (const [tag, attributes, text] of shapes) {
    const node = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    svg.append(node);
  }
}

// screen.js의 dotRadius와 같은 식이다. 그림을 그리려고 여기서 한 번 더 쓴다
const radiusOf = (c) => 1.128 * Math.sqrt(c) * (1 + 0.35 * c * c);
const plainOf = (c) => 1.128 * Math.sqrt(c);

function coverageAt(target) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (radiusOf(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function drawRadiusChart(svg) {
  const W = 560;
  const H = 300;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 40;
  const x = (c) => left + c * (W - left - right);
  const y = (r) => H - bottom - (r / 1.6) * (H - top - bottom);
  const curve = (f) =>
    Array.from({ length: 121 }, (_, i) => {
      const c = i / 120;
      return `${i ? "L" : "M"}${x(c).toFixed(1)},${y(f(c)).toFixed(1)}`;
    }).join("");

  const touch = coverageAt(1);
  const close = coverageAt(Math.SQRT2);
  const shapes = [
    ["line", { class: "axis", x1: left, y1: y(0), x2: W - right, y2: y(0) }],
    ["line", { class: "axis", x1: left, y1: y(0), x2: left, y2: top }],
    ["line", { class: "guide", x1: left, y1: y(1), x2: W - right, y2: y(1) }],
    ["line", { class: "guide", x1: left, y1: y(Math.SQRT2), x2: W - right, y2: y(Math.SQRT2) }],
    ["path", { class: "plain", d: curve(plainOf) }],
    ["path", { class: "used", d: curve(radiusOf) }],
    ["circle", { class: "mark", cx: x(touch), cy: y(1), r: 4 }],
    ["circle", { class: "mark", cx: x(close), cy: y(Math.SQRT2), r: 4 }],
    ["text", { x: x(touch) + 8, y: y(1) + 16 }, `${Math.round(touch * 100)}% 이웃과 닿는다`],
    ["text", { x: x(close) - 150, y: y(Math.SQRT2) - 8 }, `${Math.round(close * 100)}% 모서리까지 막힌다`],
    ["text", { x: left - 10, y: y(1) + 4, "text-anchor": "end" }, "1"],
    ["text", { x: left - 10, y: y(Math.SQRT2) + 4, "text-anchor": "end" }, "√2"],
    ["text", { x: left - 10, y: y(0) + 4, "text-anchor": "end" }, "0"],
    ["text", { x: left, y: top - 4 }, "반지름 · 셀 반폭 단위"],
    ["text", { x: W - right, y: H - 8, "text-anchor": "end" }, "커버리지"]
  ];
  for (const c of [0, 0.25, 0.5, 0.75, 1]) {
    shapes.push(["text", { x: x(c), y: y(0) + 18, "text-anchor": "middle" }, `${c * 100}%`]);
  }
  build(svg, W, H, shapes);

  for (const node of document.querySelectorAll("[data-value]")) {
    const value = node.dataset.value === "touch" ? touch : close;
    node.textContent = `${Math.round(value * 100)}%`;
  }
}

function drawEdgeChart(svg) {
  const W = 320;
  const H = 280;
  const left = 38;
  const right = 14;
  const top = 26;
  const bottom = 44;
  const span = 3;
  const x = (d) => left + ((d + span) / (span * 2)) * (W - left - right);
  const y = (a) => H - bottom - a * (H - top - bottom);
  const ink = (d) => Math.min(1, Math.max(0, 0.5 - d / 2.2));
  const path = Array.from({ length: 121 }, (_, i) => {
    const d = -span + (i / 120) * span * 2;
    return `${i ? "L" : "M"}${x(d).toFixed(1)},${y(ink(d)).toFixed(1)}`;
  }).join("");

  build(svg, W, H, [
    ["rect", { class: "band", x: x(-1.1), y: top, width: x(1.1) - x(-1.1), height: y(0) - top }],
    ["line", { class: "axis", x1: left, y1: y(0), x2: W - right, y2: y(0) }],
    ["line", { class: "axis", x1: left, y1: y(0), x2: left, y2: top }],
    ["line", { class: "guide", x1: x(0), y1: top, x2: x(0), y2: y(0) }],
    ["path", { class: "used", d: path }],
    ["text", { x: left - 8, y: y(1) + 4, "text-anchor": "end" }, "1"],
    ["text", { x: left - 8, y: y(0) + 4, "text-anchor": "end" }, "0"],
    ["text", { x: left, y: top - 10 }, "잉크"],
    ["text", { x: x(-1.1), y: y(0) + 18, "text-anchor": "middle" }, "−1.1"],
    ["text", { x: x(0), y: y(0) + 18, "text-anchor": "middle" }, "경계"],
    ["text", { x: x(1.1), y: y(0) + 18, "text-anchor": "middle" }, "+1.1"],
    ["text", { x: W - right, y: H - 8, "text-anchor": "end" }, "경계에서 픽셀"],
    ["text", { x: x(0), y: top + 16, "text-anchor": "middle" }, "2.2픽셀"]
  ]);
}

// -- 들여다보기 --------------------------------------------------------------------------

const hero = {
  sheet: document.getElementById("heroSheet"),
  loupe: document.getElementById("heroLoupe"),
  lens: document.getElementById("heroLens"),
  note: document.getElementById("loupeNote"),
  dials: { cell: 9, grain: 0.35, registration: 2 },
  focus: { x: 360, y: 320 }, // 달의 왼쪽 테. 하늘의 계조와 파낸 자리가 맞닿는다
  size: 80,
  zoom: 3
};

function drawHero() {
  const { sheet } = print(moon, hero.dials);
  hero.sheet.getContext("2d").drawImage(sheet, 0, 0);
  drawLoupe();
}

function drawLoupe() {
  const { size, zoom } = hero;
  const x = Math.round(Math.min(SHEET.width - size, Math.max(0, hero.focus.x - size / 2)));
  const y = Math.round(Math.min(SHEET.height - size, Math.max(0, hero.focus.y - size / 2)));
  zoomInto(hero.loupe, hero.sheet, x, y, size, zoom);
  Object.assign(hero.lens.style, {
    left: `${(x / SHEET.width) * 100}%`,
    top: `${(y / SHEET.height) * 100}%`,
    width: `${(size / SHEET.width) * 100}%`,
    height: `${(size / SHEET.height) * 100}%`
  });
  hero.note.textContent = `확대경 · ${x}, ${y}에서 ${size}픽셀을 ${zoom}배로`;
}

function aim(event) {
  const rect = hero.sheet.getBoundingClientRect();
  hero.focus = {
    x: ((event.clientX - rect.left) / rect.width) * SHEET.width,
    y: ((event.clientY - rect.top) / rect.height) * SHEET.height
  };
  drawLoupe();
}

// 마우스는 따라가고, 손가락은 누른 자리를 본다. 손가락으로 끌면 페이지가 내려가야 한다
hero.sheet.addEventListener("pointermove", (event) => {
  if (event.pointerType === "mouse") aim(event);
});
hero.sheet.addEventListener("pointerdown", aim);

let pending = 0;
function soon(work) {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(work);
}

const DIALS = {
  cell: { key: "cell", read: (v) => Number(v), show: (v) => `${v} PX` },
  grain: { key: "grain", read: (v) => Number(v) / 100, show: (v) => v.toFixed(2) },
  register: { key: "registration", read: (v) => Number(v), show: (v) => `${v} PX` }
};

for (const [id, dial] of Object.entries(DIALS)) {
  const input = document.getElementById(id);
  const out = document.getElementById(`${id}Out`);
  input.addEventListener("input", () => {
    hero.dials[dial.key] = dial.read(input.value);
    out.textContent = dial.show(hero.dials[dial.key]);
    soon(drawHero);
  });
}

// -- 단계마다 --------------------------------------------------------------------------

// 01 — 캔버스가 그린 분판과, 그것을 찍은 장
function drawSeparation() {
  const coverage = Object.assign(document.createElement("canvas"), SHEET);
  lesson(new Separation("key", coverage, SHEET.width, SHEET.height, 1), SHEET);
  const target = fig("sep-coverage");
  target.width = 560;
  target.height = 560;
  const g = target.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 560, 560);
  g.imageSmoothingQuality = "high";
  g.drawImage(coverage, 0, 0, 560, 560);

  whole(fig("sep-print"), print(plates.lesson).sheet);
}

// 02 — 격자. 계조 띠의 50% 자리에 가장 진한 통의 격자를 겹쳐 그린다
function drawGrid() {
  const { sheet, info } = print(plates.lesson, { grain: 0, registration: 0 });
  const angle = info.passes.find((pass) => pass.role === "key").angle;
  const size = 60;
  const zoom = 5;
  const ox = 540 - size / 2;
  const oy = 195 - size / 2;
  const g = zoomInto(fig("grid-zoom"), sheet, ox, oy, size, zoom);

  // 셀의 경계는 돌린 좌표가 셀의 정수배인 곳이다. 셰이더는 픽셀 한가운데가 아니라 픽셀 번호
  // 자체에서 재므로, 키운 그림에서는 반 픽셀 밀어 긋는다.
  const cell = BASE.cell;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const center = [ox + size / 2, oy + size / 2];
  const corners = [[ox, oy], [ox + size, oy], [ox, oy + size], [ox + size, oy + size]];
  const place = (x, y) => [(x - ox + 0.5) * zoom, (y - oy + 0.5) * zoom];

  g.save();
  g.strokeStyle = "rgba(43, 39, 36, 0.7)";
  g.lineWidth = 1.5;
  for (const [nx, ny] of [[cos, sin], [-sin, cos]]) {
    const along = corners.map(([x, y]) => x * nx + y * ny);
    for (let k = Math.floor(Math.min(...along) / cell) - 1; k <= Math.ceil(Math.max(...along) / cell) + 1; k += 1) {
      const px = k * cell * nx;
      const py = k * cell * ny;
      const reach = Math.hypot(px - center[0], py - center[1]) + size * 2;
      g.beginPath();
      g.moveTo(...place(px + ny * reach, py - nx * reach));
      g.lineTo(...place(px - ny * reach, py + nx * reach));
      g.stroke();
    }
  }
  g.restore();

  caption("grid-zoom", `가장 진한 통의 ${angle}° 격자. 계조 띠의 50% 자리를 다섯 배로 키우고 셀의 경계를 그었다. GRAIN 0`);
}

// 03 — 커버리지 여섯 단계
function drawSteps() {
  const { sheet } = print(plates.steps, { grain: 0, registration: 0 });
  const band = SHEET.width / LEVELS.length;
  const size = 36;
  LEVELS.forEach((_, i) => {
    zoomInto(fig(`step-${i}`), sheet, Math.round((i + 0.5) * band - size / 2), 540 - size / 2, size, 5);
  });
}

// 04 — 점 하나. 격자에서 종이 한가운데에 가장 가까운 셀의 한가운데를 찾아 그 둘레를 키운다
function drawDot() {
  const { sheet, info } = print(plates.flood(0.3), { grain: 0, registration: 0 });
  const angle = info.passes.find((pass) => pass.role === "key").angle;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const cell = BASE.cell;
  const rx = 540 * cos + 540 * sin;
  const ry = 540 * cos - 540 * sin;
  const cx = (Math.floor(rx / cell) + 0.5) * cell;
  const cy = (Math.floor(ry / cell) + 0.5) * cell;
  const dot = [cx * cos - cy * sin, cx * sin + cy * cos];
  const size = 18;
  zoomInto(fig("edge-zoom"), sheet, Math.round(dot[0] - size / 2), Math.round(dot[1] - size / 2), size, 16);
}

// 05 — 같은 70% 면을 GRAIN만 바꿔 찍는다
function drawGrain() {
  [0, 0.35, 0.6].forEach((grain, i) => {
    const { sheet } = print(plates.flood(0.7), { grain, registration: 0 });
    zoomInto(fig(`grain-${i}`), sheet, 420, 420, 64, 3);
    if (grain === 0.6) zoomInto(fig("grain-wide"), sheet, 300, 300, 480, 1);
  });
}

// 06 — 두 통을 반씩. 30도 벌린 것과 5도만 벌린 것. 5도면 물결 한 번이 셀 열한 개 남짓이라
// 넉넉히 잘라야 몇 번 되풀이되는 것이 보인다
function drawAngles() {
  const rosette = print(plates.pair, { registration: 0 }).sheet;
  zoomInto(fig("rosette"), rosette, 330, 330, 420, 1);
  zoomInto(fig("rosette-zoom"), rosette, 500, 500, 70, 4);

  const moire = print(plates.pair, { registration: 0, angles: { key: 45, body: 50, wash: 75 } }).sheet;
  zoomInto(fig("moire"), moire, 330, 330, 420, 1);
  zoomInto(fig("moire-zoom"), moire, 500, 500, 70, 4);
}

// 07 — 세 통이 찍은 같은 원의 왼쪽 위 테. 어긋난 만큼 한 통씩 비어 색 테가 선다
function drawRegister() {
  const radius = SHEET.width * 0.28;
  const size = 100;
  const x = Math.round(SHEET.width / 2 - radius * Math.SQRT1_2 - size / 2);
  const y = Math.round(SHEET.height / 2 - radius * Math.SQRT1_2 - size / 2);
  for (const registration of [0, 5]) {
    const { sheet, info } = print(plates.stack, { palette: VIVID, registration });
    zoomInto(fig(`register-${registration}`), sheet, x, y, size, 3);
    const moved = info.passes
      .filter((pass) => pass.slip[0] || pass.slip[1])
      .map((pass) => `${ROLE_NAME[pass.role]} ${pass.slip.map((v) => v.toFixed(1)).join(", ")}`);
    caption(
      `register-${registration}`,
      registration
        ? `REGISTER ${registration}. 세 통이 같은 원을 찍었다. 어긋난 픽셀 · ${moved.join(" · ")}`
        : "REGISTER 0. 세 통이 같은 원을 찍어 한 덩어리로 앉았다"
    );
  }
}

// 08 — 통마다 따로, 그리고 한 장에
function drawMultiply() {
  for (const role of ["key", "body", "wash"]) {
    const { sheet, info } = print(plates.venn(role), { palette: VIVID });
    whole(fig(`mix-${role}`), sheet, 400);
    const pass = info.passes.find((item) => item.role === role);
    caption(`mix-${role}`, `${ROLE_NAME[role]} · ${INK_NAME[pass.ink] || pass.ink} ${pass.ink} · ${pass.angle}°`);
  }
  whole(fig("mix-all"), print(plates.venn(), { palette: VIVID }).sheet, 400);
}

// 09 — 빈 종이. 결이 옅어서 대비를 올린 것을 곁에 둔다
function drawPaper() {
  const { sheet } = print(plates.blank);
  zoomInto(fig("paper-zoom"), sheet, 500, 500, 70, 4);
  const g = zoomInto(fig("paper-contrast"), sheet, 500, 500, 70, 4);
  const image = g.getImageData(0, 0, g.canvas.width, g.canvas.height);
  const data = image.data;
  const mean = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c += 1) mean[c] += data[i + c];
  for (let c = 0; c < 3; c += 1) mean[c] /= data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) data[i + c] = (data[i + c] - mean[c]) * 8 + mean[c];
  }
  g.putImageData(image, 0, 0);
}

function drawAll() {
  notice.hidden = true; // 기계를 되찾아 다시 그리는 길이면 잃었다는 알림을 걷는다
  drawHero();
  drawSeparation();
  drawGrid();
  drawSteps();
  drawDot();
  drawGrain();
  drawAngles();
  drawRegister();
  drawMultiply();
  drawPaper();
}

fillSnippets();
drawRadiusChart(document.querySelector('[data-chart="radius"]'));
drawEdgeChart(document.querySelector('[data-chart="edge"]'));
drawAll();

// GPU가 기계를 잃었다가 되찾으면 그림을 다시 찍는다
press.onRestore(drawAll);

document.body.dataset.ready = "yes";
