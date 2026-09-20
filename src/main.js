// 인쇄기 앞의 화면. 여기서 정하는 것은 다이얼뿐이고, 한 장이 어떻게 생겼는지는
// 판화(src/plates/)가, 어떻게 찍히는지는 press.js가 정한다.
//
// 찍으면서 튼다. 망점과 안착을 GPU로 옮기고 나니 제 크기 한 장이 재생 예산 안에 넉넉히
// 들어온다. 필름을 미리 굽던 일, 끄는 동안 작은 종이로 바꿔 찍던 일, 손이 멎기를 기다리던
// 일이 모두 여기서 사라졌다. 다이얼은 다음 프레임에 닿는다.

import { PALETTES } from "./palette.js";
import { PLATES, plateById } from "./plates/index.js";
import { createPress, SHEET } from "./press.js";
import { createGuides, paperGuides } from "./guides.js";
import { parseHash, encodeHash, applyKnobs } from "./hash.js";
import { GRID_SCALE, layContact } from "./contact.js";

// 시계는 언제나 초당 스물네 번. 바뀌는 것은 한 장을 몇 프레임 잡아 두느냐다.
//
//   24장 — 프레임마다 새 장. 매끄럽게 흐른다
//   12장 — 두 프레임에 한 장. 손그림 애니메이션의 투스 촬영
//    8장 — 세 프레임에 한 장. 박자가 또렷해지고 인쇄물에 가까워진다
//
// 48프레임이 셋 모두로 나누어떨어져 한 바퀴가 어디서도 어긋나지 않는다.
const FPS = 24;
const FRAMES = 48; // 한 바퀴 2초. 물결의 박자가 여기 맞춰져 있다
const RATES = [
  { label: "24", hold: 1, title: "프레임마다 새 장. 매끄럽게 흐른다" },
  { label: "12", hold: 2, title: "두 프레임에 한 장. 손그림 애니메이션의 투스 촬영" },
  { label: "8", hold: 3, title: "세 프레임에 한 장. 박자가 또렷해진다" }
];
// 끓음. 같은 롤이라도 인상이 바뀌면 스크린과 판 어긋남이 함께 바뀐다(press.js)
const BOILS = [
  { label: "HELD", kind: "held", title: "한 장. 종이는 붙박이고 그림이 그 밑에서 움직인다" },
  { label: "TWOS", kind: "twos", title: "두 프레임에 한 번. 손으로 그린 애니메이션의 속도" },
  { label: "EVERY", kind: "every", title: "매 프레임. 화면 전체가 끓는다" }
];

// 판화가 하나뿐이면 고르개도, 판화끼리 견주는 콘택트 시트도 뜻이 없다. 목록을 따라간다.
const many = PLATES.length > 1;

const gridItems = [
  { label: "OFF", kind: "off" },
  ...(many ? [{ label: "PLATES", kind: "plates" }] : []),
  { label: "INKS", kind: "inks" },
  { label: "FRAMES", kind: "frames" }
];

// 종이 둘. 한 장은 인쇄기가 직접 찍는 WebGL 캔버스이고, 다른 하나는 콘택트 시트를 붙이는
// 대지다. 캔버스 하나는 한 가지 컨텍스트만 가질 수 있어서 나눠 둔다.
const sheet = document.getElementById("sheet");
const contact = document.getElementById("contact");
const guidesButton = document.getElementById("guides");
const status = document.getElementById("status");
const about = document.getElementById("about");
const plateRow = document.getElementById("plates");
const paletteRow = document.getElementById("palettes");
const drumsRow = document.getElementById("drums");
const gridRow = document.getElementById("grid");
const boilRow = document.getElementById("boil");
const knobsCard = document.getElementById("knobsCard");
const knobsRow = document.getElementById("knobs");
const scopeCard = document.getElementById("scopeCard");
const scopeRow = document.getElementById("scopeKnobs");
const rateRow = document.getElementById("rate");
const headlineInput = document.getElementById("headline");
const playButton = document.getElementById("play");
const scrub = document.getElementById("scrub");
const frameOut = document.getElementById("frameOut");

const dials = {
  cell: { input: document.getElementById("cell"), out: document.getElementById("cellOut"), read: (v) => Number(v), show: (v) => `${v} PX` },
  grain: { input: document.getElementById("grain"), out: document.getElementById("grainOut"), read: (v) => Number(v) / 100, show: (v) => v.toFixed(2) },
  register: { input: document.getElementById("register"), out: document.getElementById("registerOut"), read: (v) => Number(v), show: (v) => `${v} PX` }
};

let press;
try {
  press = createPress(sheet);
} catch (error) {
  // WebGL2가 없어서일 수도, 셰이더가 짜이지 않아서일 수도 있다. 까닭은 글이 말한다
  status.textContent = "NO PRESS";
  const note = document.createElement("p");
  note.className = "noscript";
  note.textContent = error.message;
  sheet.replaceWith(note);
  document.querySelector(".deck").hidden = true;
  throw error;
}

// 안내선은 한 장 위에 겹친 다른 캔버스에 그린다(src/guides.js). 찍힌 장에는 손대지 않는다
const guides = createGuides(sheet, document.getElementById("marks"), SHEET);

const DEFAULTS = {
  plate: PLATES[0].id,
  seed: (Math.random() * 0xffffffff) >>> 0,
  palette: 0,
  drums: 3,
  cell: 9,
  grain: 0.35,
  register: 2,
  headline: "",
  grid: "off",
  frame: 0,
  hold: 3, // 초당 여덟 장. 이 물결에는 이 박자가 맞는다
  boil: "twos",
  guides: false
};

// 주소에 실려 온 설정(src/hash.js). 판의 손잡이는 글자 그대로 받아 두었다가 시동에서 앉힌다
const { knobs: knobText, scope: scopeText, ...fromHash } = parseHash(location.hash, {
  plateById,
  palettes: PALETTES.length,
  holds: RATES.map((rate) => rate.hold),
  grids: gridItems.map((item) => item.kind),
  boils: BOILS.map((item) => item.kind),
  frames: FRAMES,
  defaults: DEFAULTS
});
const state = { ...DEFAULTS, ...fromHash };

// 손잡이 값은 판마다 따로 기억한다. 판을 바꿨다 돌아와도 맞춰 둔 것이 남아 있어야 하고,
// 한 판의 값이 다른 판에 새어 들어가서도 안 된다 — 판마다 필요한 것이 다르기 때문이다.
const knobState = {};
function knobsFor(plate) {
  if (!knobState[plate.id]) {
    knobState[plate.id] = Object.fromEntries((plate.knobs || []).map((knob) => [knob.key, knob.value]));
  }
  return knobState[plate.id];
}

// 시야의 공통 손잡이는 판끼리 나눠 쓴다. 둥근 틀을 두르는 판은 모두 같은 접안렌즈를 들여다본다.
const scopeState = {};
function scopeFor(plate) {
  for (const knob of plate.scope || []) {
    if (!(knob.key in scopeState)) scopeState[knob.key] = knob.value;
  }
  return scopeState;
}

// 판에 넘길 손잡이 값. 판의 것에 그 판이 내놓은 시야의 것을 더한다
function knobValues(plate) {
  const values = { ...knobsFor(plate) };
  const shared = scopeFor(plate);
  for (const knob of plate.scope || []) values[knob.key] = shared[knob.key];
  return values;
}

function writeHash() {
  const plate = plateById(state.plate);
  history.replaceState(null, "", `#${encodeHash(state, plate, knobsFor(plate), scopeFor(plate))}`);
}

// 주소는 손이 멎은 뒤에 한 번 적는다. 끄는 내내 적으면 사파리는 30초에 백 번을 넘는 순간
// 주소 고치기를 막아 버린다.
let hashTimer = 0;
function writeHashSoon() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(writeHash, 300);
}

function settings(plate, palette, extra = {}) {
  return {
    plate,
    palette,
    knobs: knobValues(plate),
    inkCount: state.drums,
    seed: state.seed,
    cell: state.cell,
    grain: state.grain,
    registration: state.register,
    headline: state.headline,
    frames: FRAMES,
    boil: state.boil,
    ...extra
  };
}

// 이 프레임에 걸리는 장. 초당 여덟 장이면 0·1·2 프레임이 모두 0번 장을 본다.
// 멈춰서 프레임을 끌 때도 같은 장을 보여 준다 — 재생에 나오지 않는 장은 없는 장이다.
const sheetFrame = (frame) => Math.floor(frame / state.hold) * state.hold;

// -- 콘택트 시트 -------------------------------------------------------------------------
//   PLATES — 같은 롤로 모든 판화를. 어느 장이 이 배색에서 무너지는지
//   INKS   — 같은 판화를 배색 아홉 벌로. 어느 배색에서 글자가 안 읽히는지
//   FRAMES — 한 판화를 한 바퀴에 걸쳐. 루프가 이어지는지, 어디서 비는지
function gridCells() {
  if (state.grid === "plates") {
    return PLATES.map((plate) => ({ plate, palette: PALETTES[state.palette], frame: state.frame, label: plate.name }));
  }
  if (state.grid === "inks") {
    return PALETTES.map((palette, index) => ({
      plate: plateById(state.plate),
      palette,
      frame: state.frame,
      label: palette.label,
      mark: index === state.palette
    }));
  }
  const plate = plateById(state.plate);
  const count = 9;
  return Array.from({ length: count }, (_, index) => {
    const frame = Math.round((index * FRAMES) / count);
    return { plate, palette: PALETTES[state.palette], frame, label: `${frame}` };
  });
}

// 판화 고르개의 썸네일. 이름만 있으면 무엇이 찍히는지 알 수 없다. 판마다 지금 배색과 지금 손잡이로
// 첫 장을 작게 찍어 버튼에 붙인다. 공용 종이 한 장을 돌려 쓰므로, 찍고 나면 본 그림을 다시 찍는다
const thumbs = new Map();
let wantsThumbs = true;
function paintThumbs() {
  if (!press) return;
  for (const [id, canvas] of thumbs) {
    press.print(settings(plateById(id), PALETTES[state.palette], { frame: 0, scale: GRID_SCALE }));
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.imageSmoothingQuality = "high";
    g.drawImage(sheet, 0, 0, sheet.width, sheet.height, 0, 0, canvas.width, canvas.height);
  }
}

// 배색이나 통 수가 바뀌면 썸네일도 따라 바뀐다. 다음 프레임에 본 그림과 함께 찍는다
function askThumbs() {
  wantsThumbs = true;
  wake();
}

// 칸마다 작게 찍어 대지에 붙인다(src/contact.js)
const printContact = () =>
  layContact(contact, sheet, gridCells(), (cell) => press.print(settings(cell.plate, cell.palette, { frame: cell.frame, scale: GRID_SCALE })), SHEET);

// 한 장이든 콘택트 시트든 지금 다이얼대로 찍는다. 무엇을 찍었는지와 걸린 시간을 돌려준다.
function draw() {
  const started = performance.now();
  const plate = plateById(state.plate);
  let note;

  if (state.grid === "off") {
    const record = press.print(settings(plate, PALETTES[state.palette], { frame: sheetFrame(state.frame) }));
    show(sheet);
    // 안내선은 판이 방금 쓴 그 page로 짓는다. 찍은 장과 어긋날 자리가 없다. GPU가 기계를 잃은
    // 동안에는 찍힌 것이 없으므로(record가 null) 안내선도 없다
    guides.draw(record && state.guides ? (plate.guides ? plate.guides(record.page, record.sketch) : paperGuides(record.page)) : []);
    about.textContent = plate.about;
    note = `${plate.name} · ROLL ${state.seed} · ${state.drums} DRUMS · F${state.frame}${state.guides ? " · GUIDES" : ""}`;
  } else {
    const count = printContact();
    show(contact);
    guides.draw([]);
    about.textContent =
      state.grid === "plates" ? "같은 롤로 모든 판화를 나란히" : state.grid === "inks" ? "같은 판화를 배색 아홉 벌로" : "한 바퀴를 아홉 자리에서 끊어";
    note = `GRID ${state.grid.toUpperCase()} · ${count} SHEETS · ROLL ${state.seed}`;
  }

  return { note, ms: performance.now() - started };
}

// -- 걸기 -------------------------------------------------------------------------------

// 화면에 걸리는 크기는 자리가 정한다. 캔버스의 픽셀 수를 그대로 걸면 콘택트 시트와 한 장이
// 번갈아 걸릴 때마다 그림이 작아졌다 커진다.
//
// CSS의 aspect-ratio로는 안 된다. 높이를 채우게 두면 max-width가 가로만 잘라 비율이
// 깨지고, 둘 다 auto로 두면 캔버스가 제 픽셀 수만큼만 걸린다. 남은 자리를 재서 직접 정한다.
const NARROW = matchMedia("(max-width: 860px)");

function fit(canvas) {
  // 좁은 화면에서는 가로를 가득 채우는 쪽이 맞다. 그때는 CSS에 맡긴다
  if (NARROW.matches) {
    canvas.style.width = "";
    canvas.style.height = "";
    return;
  }

  const desk = canvas.parentElement;
  const style = getComputedStyle(desk);
  const room = {
    width: desk.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    height: desk.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  };
  if (room.width <= 0 || room.height <= 0) return;

  const scale = Math.min(room.width / canvas.width, room.height / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

function show(canvas) {
  sheet.hidden = canvas !== sheet;
  contact.hidden = canvas !== contact;
  fit(canvas);
}

addEventListener("resize", () => {
  fit(state.grid === "off" ? sheet : contact);
  guides.refit();
});

// -- 시계 -------------------------------------------------------------------------------

// 움직이는 것이 기본이다. wantsPlay는 쓰는 사람의 뜻이고, 실제로 도는지는 콘택트 시트가
// 펼쳐져 있는지까지 보고 정한다. 둘을 나눠 두어야 시트를 닫는 순간 하던 재생이 이어진다.
let wantsPlay = false;
const playing = () => wantsPlay && state.grid === "off";

let raf = 0;
let running = false;
let anchor = { time: 0, frame: 0 };
let version = 0; // 다이얼이 움직일 때마다 하나씩
let shown = ""; // 지금 걸려 있는 것
let counted = -1; // 프레임 표시가 마지막으로 가리킨 프레임
const meter = { since: 0, frames: 0, prints: 0, ms: 0 };

// 지금 다이얼과 프레임이면 무엇이 걸려 있어야 하는가. 걸린 것과 같으면 다시 찍지 않는다.
const wanted = () =>
  state.grid === "off" ? `${version}:sheet:${sheetFrame(state.frame)}` : `${version}:${state.grid}:${state.frame}`;

// 프레임 번호는 벽시계에서 뽑는다. 한 장이 늦게 나와도 다음 장은 제 박자에 온다.
function clockFrame(now) {
  const elapsed = Math.floor(((now - anchor.time) / 1000) * FPS);
  return (((anchor.frame + elapsed) % FRAMES) + FRAMES) % FRAMES;
}

function loop(now) {
  raf = 0;
  const on = playing();

  // 도는 쪽으로 넘어가는 순간 시계를 지금 프레임에 맞춘다. 멈췄던 자리에서 이어진다
  if (on !== running) {
    running = on;
    playButton.textContent = on ? "STOP" : "PLAY 24FPS";
    playButton.classList.toggle("on", on);
    if (on) {
      anchor = { time: now, frame: state.frame };
      Object.assign(meter, { since: now, frames: 0, prints: 0, ms: 0 });
      status.textContent = `${plateById(state.plate).name} · PLAYING`;
    } else {
      shown = ""; // 멈춘 장의 적바림을 다시 쓴다
      writeHashSoon();
    }
  }

  if (on) {
    const frame = clockFrame(now);
    if (frame !== state.frame) {
      state.frame = frame;
      meter.frames += 1;
    }
  }

  // 썸네일을 먼저 찍고 본 그림을 다시 찍는다. 한 프레임 안에서 둘 다 끝나 화면이 깜빡이지 않는다
  if (wantsThumbs) {
    wantsThumbs = false;
    paintThumbs();
    shown = "";
  }

  const want = wanted();
  if (want !== shown) {
    shown = want;
    const { note, ms } = draw();
    meter.prints += 1;
    meter.ms += ms;
    if (!on) status.textContent = `${note} · ${ms.toFixed(1)} MS`;
  }

  if (state.frame !== counted) {
    counted = state.frame;
    frameOut.textContent = `${state.frame} / ${FRAMES}`;
    scrub.value = String(state.frame);
  }

  if (on) {
    if (now - meter.since >= 1000) {
      const fps = Math.round((meter.frames * 1000) / (now - meter.since));
      const cost = meter.prints ? (meter.ms / meter.prints).toFixed(1) : "—";
      status.textContent = `${plateById(state.plate).name} · ${fps} FPS · ${FPS / state.hold} SHEETS A SECOND · ${(FRAMES / FPS).toFixed(1)}S LOOP · BOIL ${state.boil.toUpperCase()} · ${cost} MS A SHEET`;
      Object.assign(meter, { since: now, frames: 0, prints: 0, ms: 0 });
    }
    raf = requestAnimationFrame(loop);
  }
}

function wake() {
  if (!raf) raf = requestAnimationFrame(loop);
}

// 다이얼이 움직였다. 다음 프레임에 새로 찍는다 — 도는 중이면 도는 채로, 멈춰 있으면 멈춘 채로.
function changed() {
  version += 1;
  writeHashSoon();
  wake();
}

// 콘택트 시트를 바꾼다. 고르개의 표시도 함께 옮긴다
function setGrid(kind) {
  state.grid = kind;
  mark(gridRow, gridItems, (item) => item.kind === state.grid);
  changed();
}

function play() {
  if (state.grid !== "off") setGrid("off");
  wantsPlay = true;
  wake();
}

// 멈춰 달라고 해서 멈춘다. 다이얼을 건드려도 저 혼자 다시 돌지 않는다.
function halt() {
  wantsPlay = false;
  wake();
}

// -- 다이얼 -----------------------------------------------------------------------------

function mark(row, items, isOn) {
  [...row.children].forEach((button, index) => button.classList.toggle("on", isOn(items[index])));
}

function buildRow(row, items, isOn, onPick, decorate) {
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    if (decorate) decorate(button, item);
    else button.textContent = item.label;
    button.title = item.title || item.label;
    button.addEventListener("click", () => {
      onPick(item);
      mark(row, items, isOn);
      changed();
    });
    row.append(button);
  }
  mark(row, items, isOn);
}

// 손잡이를 한 줄씩 짓는다. 끌면 values의 값을 바로 고친다
function fillKnobs(container, list, values) {
  container.replaceChildren();
  const places = (step) => (String(step).includes(".") ? String(step).split(".")[1].length : 0);

  // 손잡이에 group이 있으면 묶음이 바뀌는 자리마다 작은 제목을 단다. 손잡이가 많은 판이
  // 몸의 부분별로 나눠 보이게 한다
  let group = null;
  for (const knob of list) {
    if (knob.group && knob.group !== group) {
      const title = document.createElement("p");
      title.className = "knobGroup";
      title.textContent = knob.group;
      container.append(title);
    }
    group = knob.group || null;
    const digits = places(knob.step);
    const row = document.createElement("div");
    row.className = "knob";

    const head = document.createElement("div");
    head.className = "knobHead";
    const name = document.createElement("span");
    name.textContent = knob.label;
    const out = document.createElement("span");
    out.className = "out";
    out.textContent = values[knob.key].toFixed(digits);
    head.append(name, out);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(knob.min);
    input.max = String(knob.max);
    input.step = String(knob.step);
    input.value = String(values[knob.key]);
    input.setAttribute("aria-label", knob.panel ? `${knob.panel} ${knob.label}` : knob.label);
    if (knob.hint) input.title = knob.hint;

    input.addEventListener("input", () => {
      values[knob.key] = Number(input.value);
      out.textContent = values[knob.key].toFixed(digits);
      changed();
    });

    row.append(head, input);
    container.append(row);
  }
}

// 판이 따로 빼 둔 손잡이 칸들. 판을 바꿀 때마다 걷고 새로 짓는다
let panelCards = [];

// 고른 판의 손잡이만 조절칸으로 짓는다. 판을 바꾸면 칸도 통째로 바뀐다 — 남의 판에 없는
// 값을 띄워 두면 무엇을 돌리는지 알 수 없게 된다. 시야의 공통 손잡이는 그 아래 따로 한 칸이다.
//
// 손잡이에 panel이 있으면 판 손잡이 칸에서 빼, 그 이름의 칸을 따로 지어 바로 아래에 둔다. 값은 판의
// 손잡이 값 그대로라 주소도 그대로다
function buildKnobs() {
  const plate = plateById(state.plate);
  const own = plate.knobs || [];
  const scope = plate.scope || [];
  const main = own.filter((knob) => !knob.panel);
  knobsCard.hidden = main.length === 0;
  scopeCard.hidden = scope.length === 0;
  fillKnobs(knobsRow, main, knobsFor(plate));
  fillKnobs(scopeRow, scope, scopeFor(plate));

  for (const card of panelCards) card.remove();
  const panels = new Map();
  for (const knob of own) {
    if (knob.panel) panels.set(knob.panel, [...(panels.get(knob.panel) || []), knob]);
  }
  panelCards = [...panels].map(([name, list]) => {
    const card = document.createElement("section");
    card.className = "card";
    const title = document.createElement("h2");
    title.textContent = name;
    const row = document.createElement("div");
    card.append(title, row);
    scopeCard.before(card);
    fillKnobs(row, list, knobsFor(plate));
    return card;
  });
}

if (many) {
  buildRow(
    plateRow,
    PLATES.map((plate) => ({ label: plate.name, title: plate.about, id: plate.id })),
    (item) => item.id === state.plate,
    (item) => { state.plate = item.id; buildKnobs(); },
    (button, item) => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 180;
      const name = document.createElement("span");
      name.textContent = item.label;
      button.append(canvas, name);
      thumbs.set(item.id, canvas);
    }
  );
} else {
  // 고를 것이 없으면 고르개를 치우고, 그 자리에 지금 걸린 판의 이름만 남긴다
  plateRow.hidden = true;
  document.getElementById("plateTitle").textContent = PLATES[0].name;
}

buildRow(
  paletteRow,
  PALETTES.map((palette, index) => ({ label: palette.label, title: `${palette.name} — ${palette.label}`, index, inks: palette.inks })),
  (item) => item.index === state.palette,
  (item) => { state.palette = item.index; askThumbs(); },
  (button, item) => {
    button.className = "swatch";
    button.setAttribute("aria-label", item.label);
    for (const ink of item.inks) {
      const chip = document.createElement("span");
      chip.style.background = ink;
      button.append(chip);
    }
  }
);

buildRow(drumsRow, [{ label: "2", count: 2 }, { label: "3", count: 3 }], (item) => item.count === state.drums, (item) => { state.drums = item.count; askThumbs(); });

buildRow(gridRow, gridItems, (item) => item.kind === state.grid, (item) => { state.grid = item.kind; });

buildRow(rateRow, RATES, (item) => item.hold === state.hold, (item) => { state.hold = item.hold; });

buildRow(boilRow, BOILS, (item) => item.kind === state.boil, (item) => { state.boil = item.kind; });

for (const [name, dial] of Object.entries(dials)) {
  dial.input.addEventListener("input", () => {
    state[name] = dial.read(dial.input.value);
    dial.out.textContent = dial.show(state[name]);
    changed();
  });
}

headlineInput.addEventListener("input", () => {
  state.headline = headlineInput.value;
  changed();
});

// 프레임을 직접 끄는 것은 "이 한 장을 보겠다"는 뜻이다. 멈춘 채로 둔다.
scrub.addEventListener("input", () => {
  halt();
  state.frame = Number(scrub.value);
  writeHashSoon();
});

playButton.addEventListener("click", () => (playing() ? halt() : play()));

// 안내선은 다이얼이 아니라 들여다보는 방식이다. 찍히는 것은 그대로고 겹쳐 그리는 것만 바뀐다
function toggleGuides() {
  state.guides = !state.guides;
  guidesButton.classList.toggle("on", state.guides);
  changed();
}
guidesButton.addEventListener("click", toggleGuides);

document.getElementById("reroll").addEventListener("click", () => {
  state.seed = (Math.random() * 0xffffffff) >>> 0;
  changed();
});

// 저장하는 것이 지금 다이얼과 같은 장이도록 그 자리에서 한 번 더 찍는다. 콘택트 시트를
// 닫은 직후라면 인쇄기의 종이에는 아직 칸 하나가 남아 있을 수 있다.
document.getElementById("save").addEventListener("click", () => {
  draw();
  shown = wanted();
  const target = state.grid === "off" ? sheet : contact;
  target.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.grid === "off" ? `riso-${state.plate}-${state.seed}-f${state.frame}.png` : `riso-grid-${state.grid}-${state.seed}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});

addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === "n" || event.key === "N") document.getElementById("reroll").click();
  if (event.key === "s" || event.key === "S") document.getElementById("save").click();
  if (event.key === " ") { event.preventDefault(); playButton.click(); }
  if (event.key === "d" || event.key === "D") toggleGuides();
  if (event.key === "g" || event.key === "G") setGrid(state.grid === "off" ? gridItems[1].kind : "off");
});

// GPU가 기계를 잃었다가 되찾으면 걸려 있던 것을 다시 찍는다
press.onRestore(() => {
  shown = "";
  wake();
});

// -- 시동 -------------------------------------------------------------------------------

// 주소에 실려 온 손잡이를 앉힌다. k는 지금 걸린 판의 것이고, 시야의 것은 s에 따로 온다
// (예전 주소처럼 k에 섞여 와도 받는다). 시야의 값은 판끼리 나눠 쓰는 한 벌이다
{
  const plate = plateById(state.plate);
  const holder = PLATES.find((item) => item.scope);
  applyKnobs({ knobs: knobText, scope: scopeText }, plate, holder, knobsFor(plate), scopeFor(holder || plate));
}
buildKnobs();
guidesButton.classList.toggle("on", state.guides);

// 제목을 받는 판이 하나도 안 걸려 있으면 그 칸은 아무 데도 닿지 않는다
document.getElementById("headlineCard").hidden = !PLATES.some((plate) => plate.headline);
headlineInput.value = state.headline;
scrub.max = String(FRAMES - 1);
scrub.value = String(Math.min(state.frame, FRAMES - 1));
state.frame = Number(scrub.value);
for (const [name, dial] of Object.entries(dials)) {
  dial.input.value = name === "grain" ? String(Math.round(state.grain * 100)) : String(state[name]);
  dial.out.textContent = dial.show(state[name]);
}

// 판화는 기본으로 움직인다. 열면 바로 찍고 튼다 — 정지된 한 장은 t를 안 보는 판화일 뿐이다.
// 쓰는 사람이 움직임을 줄여 달라고 해 두었으면 그러지 않는다. 콘택트 시트를 펼친 채로
// 들어왔으면 뜻만 세워 두고, 시트를 닫는 순간 이어진다.
wantsPlay = !matchMedia("(prefers-reduced-motion: reduce)").matches;
wake();
