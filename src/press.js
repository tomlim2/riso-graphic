// 인쇄기.
//
// 판을 짜는 일과 찍는 일은 결이 다르다. 판은 선과 글자와 녹아웃이라 2D 캔버스가 가장 잘
// 긋는다. 찍는 일은 픽셀마다 따로 도는 계산이라 GPU가 한 번에 해치운다. 그래서 분판은
// 캔버스에 그리고, 그 분판을 텍스처로 올려 망점부터 안착까지 셰이더 한 번으로 찍는다.
//
// 예전에는 찍는 쪽도 캔버스였다. 1080 한 장에 60~110밀리초가 들었고, 그 거의 전부가 망점과
// 곱하기였다. 판을 짜는 데는 1밀리초도 들지 않는다. 잰 값은 bench/results/에 있다.
//
// 분판은 그릴 수 있는 물건이다. S.key.line(...)은 진한 드럼에 선을 긋는다는 뜻이고,
// 그 한 줄이 곧 그 드럼의 판이 된다.

import { makeRng } from "./rng.js";
import { PAPER, PAPER_SHADE, inksFor, luminance } from "./palette.js";
import { ANGLES, VERTEX, FRAGMENT, pcg } from "./screen.js";
import { splinePath, polyPath } from "./shapes.js";

// 판형. 판화는 전부 이 좌표로 그리고, 종이가 더 작게 걸리면 배율이 알아서 줄인다.
// 세로 위치를 픽셀로 박아 두면 판형을 바꾸는 순간 다섯 장이 한꺼번에 무너지므로,
// 판화는 되도록 height의 비율로 자리를 잡는다.
export const SHEET = { width: 1080, height: 1080 };

// 분판 하나. 색은 없고 커버리지만 있다. 여기 그리는 검정은 "이만큼 덮는다"는 뜻이지
// 검정 잉크가 아니다. 색은 종이에 닿기 직전에야 정해진다.
export class Separation {
  #g;

  // 판화는 언제나 판형 좌표로 그린다. 종이가 그보다 작게 걸리면 — 콘택트 시트의 축소판 —
  // 컨텍스트를 그만큼 줄여 두고 판화는 모르게 한다. 판화가 종이 크기를 신경 쓰기 시작하면
  // 여백과 글자 크기가 배율마다 따로 놀게 된다.
  //
  // 종이는 인쇄기가 빌려준다. 닦아서 건네므로 판화는 새 종이와 똑같은 자리에서 시작한다.
  constructor(role, canvas, width, height, scale = 1) {
    this.role = role;
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.#g = canvas.getContext("2d");
    wipe(this.#g, canvas);
    this.#g.setTransform(scale, 0, 0, scale, 0, 0);
  }

  get context() {
    return this.#g;
  }

  #ready(tone) {
    const g = this.#g;
    g.globalAlpha = tone <= 0 ? 0 : tone >= 1 ? 1 : tone;
    g.fillStyle = "#000";
    g.strokeStyle = "#000";
    return g;
  }

  flood(tone = 1) {
    this.#ready(tone).fillRect(0, 0, this.width, this.height);
    return this;
  }

  shape(points, { tone = 1, smooth = true } = {}) {
    const g = this.#ready(tone);
    (smooth ? splinePath : polyPath)(g, points, true);
    g.fill();
    return this;
  }

  line(points, { w = 4, tone = 1, close = false, smooth = true } = {}) {
    const g = this.#ready(tone);
    g.lineWidth = w;
    g.lineCap = "round";
    g.lineJoin = "round";
    (smooth ? splinePath : polyPath)(g, points, close);
    g.stroke();
    return this;
  }

  disc(x, y, radius, { tone = 1 } = {}) {
    const g = this.#ready(tone);
    g.beginPath();
    g.arc(x, y, radius, 0, Math.PI * 2);
    g.fill();
    return this;
  }

  ring(x, y, radius, { w = 4, tone = 1 } = {}) {
    const g = this.#ready(tone);
    g.lineWidth = w;
    g.beginPath();
    g.arc(x, y, radius, 0, Math.PI * 2);
    g.stroke();
    return this;
  }

  block(x, y, width, height, { tone = 1, corners = [0, 0, 0, 0] } = {}) {
    const g = this.#ready(tone);
    const [tl, tr, br, bl] = corners;
    g.beginPath();
    g.moveTo(x + tl, y);
    g.lineTo(x + width - tr, y);
    g.quadraticCurveTo(x + width, y, x + width, y + tr);
    g.lineTo(x + width, y + height - br);
    g.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
    g.lineTo(x + bl, y + height);
    g.quadraticCurveTo(x, y + height, x, y + height - bl);
    g.lineTo(x, y + tl);
    g.quadraticCurveTo(x, y, x + tl, y);
    g.closePath();
    g.fill();
    return this;
  }

  // 톤 그라데이션. 망점을 거치면 점이 자라고 죽는 실제 계조가 된다. 분판이 색이 아니라
  // 커버리지라서 공짜로 얻어지는 것 중 제일 쓸모 있는 하나.
  ramp(x, y, width, height, { from = 1, to = 0, across = false } = {}) {
    const g = this.#ready(1);
    const gradient = across
      ? g.createLinearGradient(x, y, x + width, y)
      : g.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, from))})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, to))})`);
    g.fillStyle = gradient;
    g.fillRect(x, y, width, height);
    return this;
  }

  text(string, x, y, { font, tone = 1, track = 0, align = "left" } = {}) {
    const g = this.#ready(tone);
    g.font = font;
    g.textAlign = "left";

    let width = 0;
    if (track) {
      for (const character of string) width += g.measureText(character).width + track;
      width -= track;
    } else {
      width = g.measureText(string).width;
    }

    let cursor = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    if (track) {
      for (const character of string) {
        g.fillText(character, cursor, y);
        cursor += g.measureText(character).width + track;
      }
    } else {
      g.fillText(string, cursor, y);
    }
    return this;
  }

  // 녹아웃은 흰 잉크가 아니다. 그 자리만 드럼이 찍지 않아 종이가 드러나는 것이므로,
  // 덮는 것이 아니라 이 분판 자신에게서 파낸다.
  knockout(paint) {
    const g = this.#g;
    g.save();
    g.globalCompositeOperation = "destination-out";
    paint(this);
    g.restore();
    return this;
  }

  // 위의 것으로 안 되는 것을 위한 비상구. 캔버스 컨텍스트를 그대로 준다.
  draw(paint) {
    const g = this.#g;
    g.save();
    g.globalAlpha = 1;
    g.fillStyle = "#000";
    g.strokeStyle = "#000";
    paint(g);
    g.restore();
    return this;
  }
}

// 앞 장이 남긴 것을 전부 지운다. 그림만이 아니라 선 굵기와 글꼴과 합성 방식까지.
function wipe(g, canvas) {
  if (typeof g.reset === "function") {
    g.reset();
    return;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#000";
  g.strokeStyle = "#000";
  g.lineWidth = 1;
  g.lineCap = "butt";
  g.lineJoin = "miter";
  g.font = "10px sans-serif";
  g.textAlign = "start";
  g.textBaseline = "alphabetic";
}

// 분판 종이. 한 장마다 새로 만들면 초당 스물네 번 GPU 메모리를 잡았다 놓는다.
// 크기마다 세 장을 두고 닦아 쓴다. 크기는 재생 한 벌과 콘택트 시트 한 벌이면 된다.
const blanks = new Map();
function blanksFor(width, height) {
  const key = `${width}x${height}`;
  let set = blanks.get(key);
  if (!set) {
    set = Array.from({ length: 3 }, () => Object.assign(document.createElement("canvas"), { width, height }));
    blanks.set(key, set);
    if (blanks.size > 4) blanks.delete(blanks.keys().next().value);
  }
  return set;
}

// 배색은 색 셋이지 이름 셋이 아니다. 어느 통이 무슨 일을 하는지는 밝기가 정한다.
//   key  — 가장 진한 통. 글자와 선. 흰 종이 위에서도 노랑 잔글씨는 읽히지 않는다
//   body — 가운데 통. 큰 덩어리
//   wash — 가장 옅은 통. 바탕
export function rolesFor(inks) {
  const byDark = inks
    .map((hex, index) => [index, luminance(hex)])
    .sort((a, b) => a[1] - b[1])
    .map(([index]) => index);

  return {
    key: byDark[0],
    body: byDark[Math.min(1, byDark.length - 1)],
    wash: byDark[byDark.length - 1]
  };
}

// 끓음. 같은 롤이라도 인상(impression)이 바뀌면 스크린과 판 어긋남이 함께 바뀐다.
//   held  — 한 장. 종이는 붙박이고 그림이 그 밑에서 움직인다
//   twos  — 두 프레임에 한 번. 손으로 그린 애니메이션이 늘 그러던 속도다
//   every — 매 프레임. 화면 전체가 끓는다
//
// 인상은 여덟 벌을 돌려 쓴다. 예전에는 벌마다 잡음 표를 쥐고 있어야 해서 그랬지만, 지금은
// 값 때문이 아니다. 실제 스크린 인쇄의 끓음도 몇 장이 돌아가며 반복되는 것이다.
const BOIL_STEP = { held: 0, twos: 2, every: 1 };
const BOIL_POOL = 8;

function impressionOf(boil, frame, frames) {
  const step = BOIL_STEP[boil] ?? 0;
  if (step === 0) return 0;
  return Math.floor((((frame % frames) + frames) % frames) / step) % BOIL_POOL;
}

const rgb = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

// -- 기계 -------------------------------------------------------------------------------

// 인쇄기를 캔버스 하나에 세운다. 이 캔버스가 곧 종이이고, 찍을 때마다 그 크기로 맞춘다.
export function createPress(canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    // 저장하거나 콘택트 시트에 옮겨 붙일 때 방금 찍은 장이 남아 있어야 한다
    preserveDrawingBuffer: true
  });
  if (!gl) {
    throw new Error("이 브라우저는 WebGL2를 열지 못한다. 망점을 GPU로 찍으므로 여기서는 인쇄기가 돌지 않는다.");
  }

  let machine = assemble(gl);
  const restored = new Set();

  // GPU는 가끔 기계를 통째로 잃는다. 창이 다른 그래픽 칩으로 옮겨 가거나 드라이버가 다시
  // 뜰 때다. 잃은 동안은 찍지 않고, 돌아오면 기계를 다시 짜서 다시 찍어 달라고 알린다.
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    machine = null;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    machine = assemble(gl);
    for (const listener of restored) listener();
  });

  return {
    canvas,
    onRestore(listener) {
      restored.add(listener);
    },
    print(options) {
      return machine ? print(gl, machine, canvas, options) : null;
    }
  };
}

function link(gl) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error(`셰이더를 짜지 못했다\n${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`셰이더를 잇지 못했다\n${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function assemble(gl) {
  const program = link(gl);
  gl.useProgram(program);

  // 화면보다 큰 삼각형 하나. 사각형을 둘로 나누면 대각선에 이음새가 생길 수 있다
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, "a_corner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

  // 분판을 받을 판 셋. 쓰지 않는 칸도 빈 한 픽셀을 물려 두어 언제나 온전하게 한다.
  // 망점은 판 사이를 짚으므로 선형으로 읽는다. 판 밖은 셰이더가 스스로 비운다.
  const plates = [0, 1, 2].map((unit) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return texture;
  });

  // 분판에서 쓰는 것은 알파뿐이다. 뒤집지도, 곱해 두지도, 색 공간을 옮기지도 않는다
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

  const at = (name) => gl.getUniformLocation(program, name);
  const u = {
    size: at("u_size"),
    scale: at("u_scale"),
    keys: at("u_keys"),
    count: at("u_count"),
    cell: at("u_cell"),
    grain: at("u_grain"),
    ink: at("u_ink"),
    turn: at("u_turn"),
    slip: at("u_slip")
  };

  gl.uniform1iv(at("u_sep"), [0, 1, 2]);
  gl.uniform3fv(at("u_paper"), rgb(PAPER));
  gl.uniform3fv(at("u_shade"), rgb(PAPER_SHADE));

  return { program, vao, plates, u };
}

function print(gl, machine, canvas, options) {
  const {
    plate,
    palette,
    inkCount = 3,
    seed = 1,
    cell = 9,
    grain = 0.35,
    registration = 2,
    headline = "",
    frame = 0,
    frames = 1,
    boil = "held",
    scale = 1,
    knobs = {},
    // 통마다 스크린 각도를 바꿔 찍을 때만 넘긴다. 무아레를 보여 주는 자리 말고는 쓰지 않는다
    angles = ANGLES
  } = options;

  const { width, height } = SHEET;
  const deviceWidth = Math.round(width * scale);
  const deviceHeight = Math.round(height * scale);

  const inks = inksFor(palette, inkCount);
  const roles = rolesFor(inks);

  // 통이 둘이면 body와 wash가 같은 통이다. 그때는 분판도 하나여야 한다.
  // 둘로 두면 같은 판을 두 번 찍어 저 혼자 두 배로 진해진다.
  const paper = blanksFor(deviceWidth, deviceHeight);
  const drums = new Map();
  const S = {};
  for (const role of ["key", "body", "wash"]) {
    const index = roles[role];
    if (!drums.has(index)) drums.set(index, new Separation(role, paper[drums.size], width, height, scale));
    S[role] = drums.get(index);
  }

  // 통 목록. 옅은 통부터 — 실제로 종이가 통과하는 순서다. 배색표처럼 통 자체를 보여주는
  // 판화는 역할 이름이 아니라 이 목록을 돈다. 통이 둘일 때 원을 셋 그리지 않으려면 그래야 한다.
  const running = [...drums.entries()].sort((a, b) => luminance(inks[b[0]]) - luminance(inks[a[0]]));
  S.drums = running.map(([index, separation]) => ({
    index,
    ink: inks[index],
    role: separation.role,
    angle: angles[separation.role] ?? ANGLES[separation.role],
    separation
  }));

  // 한 바퀴를 0에서 1로. 판화는 프레임 번호가 아니라 이 값을 본다. 어디서 끊어도 이어지려면
  // 판화 안의 모든 주기가 t에 대해 한 바퀴여야 한다.
  const span = Math.max(1, frames);
  const t = span > 1 ? (((frame % span) + span) % span) / span : 0;

  // 손잡이는 판마다 다르다. 화면이 넘겨 주지 않은 것은 판이 스스로 적어 둔 기본값으로
  // 채운다 — 그래야 판 하나만 들고 찍어 보는 자리에서도 그대로 돈다.
  const settings = Object.fromEntries((plate.knobs || []).map((knob) => [knob.key, knob.value]));

  const R = makeRng(seed >>> 0);
  const page = {
    width, height, margin: 78, palette, inks, roles, headline, seed, frame, frames: span, t,
    knobs: { ...settings, ...knobs }
  };
  plate.paint(S, R, page);

  // 인상이 바뀌면 스크린의 잡음도 판 어긋남도 함께 바뀐다. 둘은 같은 한 번의 통과에서 나오는
  // 것이라 따로 놀면 안 된다.
  const impression = impressionOf(boil, frame, span);
  const fieldSeed = (seed ^ Math.imul(impression + 1, 0x9e3779b9)) >>> 0;
  const root = pcg((fieldSeed ^ 0x5bf03635) >>> 0);

  // 판 어긋남은 판을 짜는 난수와 따로 둔다. 배치를 한 줄 고쳤다고 어긋남까지 달라지면
  // 무엇 때문에 달라 보이는지 알 수 없다.
  const slip = makeRng((Math.imul(seed, 2654435761) ^ Math.imul(impression + 1, 0x85ebca6b)) >>> 0);

  if (canvas.width !== deviceWidth) canvas.width = deviceWidth;
  if (canvas.height !== deviceHeight) canvas.height = deviceHeight;

  const { u } = machine;
  gl.viewport(0, 0, deviceWidth, deviceHeight);
  gl.useProgram(machine.program);
  gl.bindVertexArray(machine.vao);

  // 통 셋에 모자라는 칸은 흰 잉크, 기울지 않은 스크린, 어긋나지 않은 판으로 채운다.
  // 셰이더는 u_count를 넘는 칸을 찍지 않는다.
  const ink = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  const turn = [1, 0, 1, 0, 1, 0];
  const offset = [0, 0, 0, 0, 0, 0];

  S.drums.forEach((drum, order) => {
    gl.activeTexture(gl.TEXTURE0 + order);
    gl.bindTexture(gl.TEXTURE_2D, machine.plates[order]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drum.separation.canvas);

    const radians = (drum.angle * Math.PI) / 180;
    ink.splice(order * 3, 3, ...rgb(drum.ink));
    turn.splice(order * 2, 2, Math.cos(radians), Math.sin(radians));

    // 첫 통이 기준이다. 나중 통이 어긋나는 것이 눈에 어긋남으로 읽힌다
    const dx = order === 0 ? 0 : slip.around(0, 1) * registration * scale;
    const dy = order === 0 ? 0 : slip.around(0, 1) * registration * scale;
    offset.splice(order * 2, 2, dx, dy);
  });

  gl.uniform2f(u.size, deviceWidth, deviceHeight);
  gl.uniform1f(u.scale, scale);
  gl.uniform3ui(u.keys, pcg(root ^ 1), pcg(root ^ 2), pcg(root ^ 3));
  gl.uniform1i(u.count, S.drums.length);
  gl.uniform1f(u.cell, Math.max(2, cell * scale));
  gl.uniform1f(u.grain, grain);
  gl.uniform3fv(u.ink, ink);
  gl.uniform2fv(u.turn, turn);
  gl.uniform2fv(u.slip, offset);

  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // 통마다 무엇을 어떻게 찍었는지. 옅은 통부터, 종이가 지나간 순서다
  const passes = S.drums.map((drum, order) => ({
    role: drum.role,
    ink: drum.ink,
    angle: drum.angle,
    slip: [offset[order * 2], offset[order * 2 + 1]]
  }));

  return { inks, roles, drums: drums.size, passes, plate: plate.id, seed, frame, t };
}
