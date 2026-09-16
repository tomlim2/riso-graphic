// 인쇄기.
//
// 예전 구조는 마크마다 잉크 번호를 태그해 목록에 쌓고, 드럼마다 그 목록을 훑으며 제 번호만
// 골라 그렸다. 목록은 드럼 수만큼 다시 돌아야 했고, 판을 짜는 쪽에서는 "0번 잉크"라고만 쓸
// 수 있어 그게 무슨 색으로 나올지 코드만 봐서는 알 수 없었다.
//
// 지금은 분판이 그릴 수 있는 물건이다. S.key.line(...)은 진한 드럼에 선을 긋는다는 뜻이고,
// 그 한 줄이 곧 그 드럼의 판이 된다. 고르는 일이 사라진다.

import { makeRng } from "./rng.js";
import { PAPER, PAPER_SHADE, inksFor, luminance } from "./palette.js";
import { makeInkFields, paperTooth, screenSeparation, ANGLES } from "./screen.js";
import { splinePath, polyPath } from "./shapes.js";

// 판형. 판화는 전부 이 좌표로 그리고, 종이가 더 작게 걸리면 배율이 알아서 줄인다.
// 세로 위치를 픽셀로 박아 두면 판형을 바꾸는 순간 다섯 장이 한꺼번에 무너지므로,
// 판화는 되도록 height의 비율로 자리를 잡는다.
export const SHEET = { width: 1000, height: 1000 };

// 분판 하나. 색은 없고 커버리지만 있다. 여기 그리는 검정은 "이만큼 덮는다"는 뜻이지
// 검정 잉크가 아니다. 색은 종이에 닿기 직전에야 정해진다.
export class Separation {
  #g;

  // 판화는 언제나 900x1200 좌표로 그린다. 종이가 그보다 작게 걸리면 — 콘택트 시트의
  // 축소판, 재생용 프레임 — 컨텍스트를 그만큼 줄여 두고 판화는 모르게 한다. 판화가 종이
  // 크기를 신경 쓰기 시작하면 여백과 글자 크기가 배율마다 따로 놀게 된다.
  constructor(role, width, height, scale = 1) {
    this.role = role;
    this.width = width;
    this.height = height;
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(height * scale);
    this.#g = this.canvas.getContext("2d");
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

// 배색은 색 셋이지 이름 셋이 아니다. 어느 통이 무슨 일을 하는지는 밝기가 정한다.
//   key  — 가장 진한 통. 글자와 선. 크림색 종이 위에서 노랑 잔글씨는 읽히지 않는다
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

// 필드는 이 파일에서 제일 비싼 것이다. 정지된 한 장이면 한 벌로 끝나지만, 끓는 화면은
// 프레임마다 다른 벌을 쓴다. 매번 새로 만들면 재생이 서지 않으므로 몇 벌만 만들어 두고
// 돌려 쓴다. 실제 스크린 인쇄의 끓음도 몇 장이 돌아가며 반복되는 것이라 이쪽이 맞다.
// 끓음 한 바퀴(8벌)에 정지 화면과 콘택트 시트 몫을 얹고도 남게. 작으면 한 바퀴를 도는
// 동안 쓸 것을 저희끼리 밀어내고, 프레임마다 필드를 새로 만들게 된다.
const POOL = 20;
const pool = new Map();
function fieldsFor(seed, width, height) {
  const key = `${seed >>> 0}:${width}x${height}`;
  const held = pool.get(key);
  if (held) return held;

  const fields = makeInkFields(width, height, makeRng((seed ^ 0x5bf03635) >>> 0));
  pool.set(key, fields);
  if (pool.size > POOL) pool.delete(pool.keys().next().value);
  return fields;
}

// 끓음. 같은 롤이라도 인상(impression)이 바뀌면 스크린과 판 어긋남이 함께 바뀐다.
//   held  — 한 장. 종이는 붙박이고 그림이 그 밑에서 움직인다
//   twos  — 두 프레임에 한 번. 손으로 그린 애니메이션이 늘 그러던 속도다
//   every — 매 프레임. 화면 전체가 끓는다
const BOIL_STEP = { held: 0, twos: 2, every: 1 };
const BOIL_POOL = 8;

function impressionOf(boil, frame, frames) {
  const step = BOIL_STEP[boil] ?? 0;
  if (step === 0) return 0;
  return Math.floor((((frame % frames) + frames) % frames) / step) % BOIL_POOL;
}

export function printSheet(canvas, options) {
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
    knobs = {}
  } = options;

  const { width, height } = SHEET;
  const deviceWidth = Math.round(width * scale);
  const deviceHeight = Math.round(height * scale);

  const inks = inksFor(palette, inkCount);
  const roles = rolesFor(inks);

  // 통이 둘이면 body와 wash가 같은 통이다. 그때는 분판도 하나여야 한다.
  // 둘로 두면 같은 판을 두 번 찍어 저 혼자 두 배로 진해진다.
  const drums = new Map();
  const S = {};
  for (const role of ["key", "body", "wash"]) {
    const index = roles[role];
    if (!drums.has(index)) drums.set(index, new Separation(role, width, height, scale));
    S[role] = drums.get(index);
  }

  // 통 목록. 옅은 통부터 — 실제로 종이가 통과하는 순서다. 배색표처럼 통 자체를 보여주는
  // 판화는 역할 이름이 아니라 이 목록을 돈다. 통이 둘일 때 원을 셋 그리지 않으려면 그래야 한다.
  const running = [...drums.entries()].sort((a, b) => luminance(inks[b[0]]) - luminance(inks[a[0]]));
  S.drums = running.map(([index, separation]) => ({
    index,
    ink: inks[index],
    role: separation.role,
    angle: ANGLES[separation.role],
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

  // 인상이 바뀌면 스크린도 판 어긋남도 함께 바뀐다. 둘은 같은 한 번의 통과에서 나오는 것이라
  // 따로 놀면 안 된다.
  const impression = impressionOf(boil, frame, span);
  const fieldSeed = (seed ^ Math.imul(impression + 1, 0x9e3779b9)) >>> 0;
  const fields = fieldsFor(fieldSeed, deviceWidth, deviceHeight);

  canvas.width = deviceWidth;
  canvas.height = deviceHeight;
  const out = canvas.getContext("2d");

  out.globalCompositeOperation = "source-over";
  out.fillStyle = PAPER;
  out.fillRect(0, 0, deviceWidth, deviceHeight);

  const tooth = document.createElement("canvas");
  tooth.width = deviceWidth;
  tooth.height = deviceHeight;
  tooth.getContext("2d").putImageData(paperTooth(out, fields, deviceWidth, deviceHeight, PAPER_SHADE), 0, 0);
  out.drawImage(tooth, 0, 0);

  // 판 어긋남은 판을 짜는 난수와 따로 둔다. 배치를 한 줄 고쳤다고 어긋남까지 달라지면
  // 무엇 때문에 달라 보이는지 알 수 없다.
  const slip = makeRng((Math.imul(seed, 2654435761) ^ Math.imul(impression + 1, 0x85ebca6b)) >>> 0);

  S.drums.forEach((drum, order) => {
    const image = drum.separation.context.getImageData(0, 0, deviceWidth, deviceHeight);
    screenSeparation(image, fields, {
      cell: Math.max(2, cell * scale),
      angle: drum.angle,
      grain,
      width: deviceWidth,
      height: deviceHeight
    });

    const g = drum.separation.context;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.putImageData(image, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = drum.ink;
    g.fillRect(0, 0, deviceWidth, deviceHeight);
    g.restore();

    // 첫 통이 기준이다. 나중 통이 어긋나는 것이 눈에 어긋남으로 읽힌다
    const dx = order === 0 ? 0 : slip.around(0, 1) * registration * scale;
    const dy = order === 0 ? 0 : slip.around(0, 1) * registration * scale;

    out.globalCompositeOperation = "multiply";
    out.drawImage(drum.separation.canvas, dx, dy);
  });

  out.globalCompositeOperation = "source-over";
  return { inks, roles, drums: drums.size, plate: plate.id, seed, frame, t };
}
