// 인쇄기 앞의 화면. 여기서 정하는 것은 다이얼뿐이고, 한 장이 어떻게 생겼는지는
// 판화(src/plates/)가, 어떻게 찍히는지는 press.js가 정한다.
//
// 움직이는 판화는 미리 찍어 두고 튼다. 한 프레임을 찍는 데 재생 예산보다 오래 걸리기
// 때문이기도 하지만, 그것이 인쇄가 실제로 하는 일이기도 하다. 필름은 미리 찍히고, 영사기는
// 찍힌 것을 넘길 뿐이다.

import { PALETTES } from "./palette.js";
import { PLATES, plateById } from "./plates/index.js";
import { printSheet, SHEET } from "./press.js";

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
  { label: "24", hold: 1, title: "프레임마다 새 장. 매끄럽게 흐르고 굽는 시간이 가장 길다" },
  { label: "12", hold: 2, title: "두 프레임에 한 장. 손그림 애니메이션의 투스 촬영" },
  { label: "8", hold: 3, title: "세 프레임에 한 장. 박자가 또렷해진다" }
];
const PLAY_SCALE = 0.62; // 재생용 종이 크기. 망점도 같이 줄어 눈에는 같은 스크린으로 보인다
// 손잡이를 끄는 동안 쓰는 크기. 한 장을 찍는 값이 재생 예산 안에 들어와야 하므로 더 작다.
// 굽지 않고 프레임마다 바로 찍으니, 끄는 손과 화면이 같이 움직인다.
const PREVIEW_SCALE = 0.42;
const GRID_SCALE = 1 / 3;

const canvas = document.getElementById("sheet");
const status = document.getElementById("status");
const about = document.getElementById("about");
const plateRow = document.getElementById("plates");
const paletteRow = document.getElementById("palettes");
const drumsRow = document.getElementById("drums");
const gridRow = document.getElementById("grid");
const boilRow = document.getElementById("boil");
const knobsCard = document.getElementById("knobsCard");
const knobsRow = document.getElementById("knobs");
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
  boil: "twos"
};

const state = { ...DEFAULTS, ...readHash() };

// 손잡이 값은 판마다 따로 기억한다. 판을 바꿨다 돌아와도 맞춰 둔 것이 남아 있어야 하고,
// 한 판의 값이 다른 판에 새어 들어가서도 안 된다 — 판마다 필요한 것이 다르기 때문이다.
const knobState = {};
function knobsFor(plate) {
  if (!knobState[plate.id]) {
    knobState[plate.id] = Object.fromEntries((plate.knobs || []).map((knob) => [knob.key, knob.value]));
  }
  return knobState[plate.id];
}

const offscreen = document.createElement("canvas");
let film = null;
let playing = false;
let raf = 0;

// 움직이는 것이 기본이므로, 다이얼을 하나 건드렸다고 멈춘 채로 두지 않는다. wantsPlay는
// 쓰는 사람의 뜻이고 playing은 지금 상태다. 둘을 나눠 두어야 "잠깐 정지 화면을 보여 주고
// 다시 잇는" 것과 "멈춰 달라고 해서 멈춘 것"이 섞이지 않는다.
let wantsPlay = false;
let resumeTimer = 0;
let live = false;
let liveRaf = 0;

// 굽는 도중에 다이얼이 또 움직이면 앞의 굽기를 버려야 한다. 세대 번호가 그 표다.
let generation = 0;

function readHash() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  const out = {};
  if (params.has("plate")) out.plate = plateById(params.get("plate")).id;
  if (params.has("seed")) out.seed = Number(params.get("seed")) >>> 0;
  if (params.has("p")) out.palette = Math.max(0, Math.min(PALETTES.length - 1, Number(params.get("p"))));
  if (params.has("drums")) out.drums = Number(params.get("drums")) === 2 ? 2 : 3;
  if (params.has("cell")) out.cell = Math.max(3, Math.min(16, Number(params.get("cell"))));
  if (params.has("grain")) out.grain = Math.max(0, Math.min(0.6, Number(params.get("grain"))));
  if (params.has("reg")) out.register = Math.max(0, Math.min(5, Number(params.get("reg"))));
  if (params.has("t")) out.headline = params.get("t");
  if (params.has("grid")) out.grid = ["plates", "inks", "frames"].includes(params.get("grid")) ? params.get("grid") : "off";
  if (params.has("f")) out.frame = Math.max(0, Number(params.get("f")) | 0) % FRAMES;
  if (params.has("hold")) out.hold = RATES.some((r) => r.hold === Number(params.get("hold"))) ? Number(params.get("hold")) : 3;
  if (params.has("boil")) out.boil = ["held", "twos", "every"].includes(params.get("boil")) ? params.get("boil") : "twos";
  if (params.has("k")) out.rawKnobs = params.get("k");
  return out;
}

function writeHash() {
  const params = new URLSearchParams({
    plate: state.plate,
    seed: String(state.seed),
    p: String(state.palette),
    drums: String(state.drums),
    cell: String(state.cell),
    grain: state.grain.toFixed(2),
    reg: String(state.register),
    f: String(state.frame),
    hold: String(state.hold),
    boil: state.boil
  });
  if (state.headline) params.set("t", state.headline);
  if (state.grid !== "off") params.set("grid", state.grid);

  // 주소에는 지금 걸린 판의 손잡이만 싣는다. 판마다 열쇠가 다르므로 섞어 담을 수 없다.
  const current = knobsFor(plateById(state.plate));
  const packed = Object.entries(current).map(([key, value]) => `${key}:${value}`).join("|");
  if (packed) params.set("k", packed);

  history.replaceState(null, "", `#${params.toString()}`);
}

function settings(plate, palette, extra = {}) {
  return {
    plate,
    palette,
    knobs: knobsFor(plate),
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

// 찍어 둔 필름이 지금 다이얼과 맞는지. 하나라도 다르면 다시 찍는다.
function filmKey() {
  const current = knobsFor(plateById(state.plate));
  const knobPart = Object.entries(current).map(([key, value]) => `${key}:${value}`).join(",");
  return [state.plate, state.seed, state.palette, state.drums, state.cell, state.grain, state.register, state.headline, state.hold, state.boil, knobPart].join("|");
}

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

function renderGrid() {
  const cells = gridCells();
  const columns = Math.min(3, cells.length);
  const rows = Math.ceil(cells.length / columns);
  const cellWidth = Math.round(SHEET.width * GRID_SCALE);
  const cellHeight = Math.round(SHEET.height * GRID_SCALE);

  canvas.width = columns * (cellWidth + 14);
  canvas.height = rows * (cellHeight + 26);
  const out = canvas.getContext("2d");
  out.fillStyle = "#ddd8cb";
  out.fillRect(0, 0, canvas.width, canvas.height);

  cells.forEach((cell, index) => {
    printSheet(offscreen, settings(cell.plate, cell.palette, { frame: cell.frame, scale: GRID_SCALE }));
    const x = (index % columns) * (cellWidth + 14) + 7;
    const y = Math.floor(index / columns) * (cellHeight + 26) + 7;
    out.drawImage(offscreen, x, y);

    out.fillStyle = cell.mark ? "#2b2724" : "rgba(43, 39, 36, 0.55)";
    out.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    out.fillText(cell.label, x, y + cellHeight + 14);
  });

  return cells.length;
}

// -- 필름 -------------------------------------------------------------------------------

// 필름 한 벌은 48장 × 558×744 = 80MB쯤 된다. 다시 구우면서 옛 벌을 놓아주지 않으면
// 다이얼을 몇 번 움직이는 것만으로 수백 MB가 쌓이고, 그때부터는 인쇄가 느려진 것처럼
// 보인다. 실제로 느려진 것은 기계가 아니라 메모리다.
function discard(reel) {
  if (!reel) return;
  for (const shot of reel.shots || reel) shot.close();
}

async function bake(mine) {
  const key = filmKey();
  if (film && film.key === key) return film;

  discard(film);
  film = null;
  const plate = plateById(state.plate);
  const palette = PALETTES[state.palette];
  const shots = [];

  const sheets = FRAMES / state.hold;

  for (let index = 0; index < sheets; index += 1) {
    printSheet(offscreen, settings(plate, palette, { frame: index * state.hold, scale: PLAY_SCALE }));
    shots.push(await createImageBitmap(offscreen));
    status.textContent = `PRINTING ${index + 1} / ${sheets}`;

    // 창을 놓아주되 rAF로는 하지 않는다. 창이 앞에 없으면 rAF는 초당 한 번까지 조여지고,
    // 굽는 일은 화면에 그리는 일이 아니라 그 박자를 따를 이유가 없다. 재생은 rAF가 맞다 —
    // 거기서는 화면과 박자를 맞추는 것이 일의 전부다.
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (mine !== generation || filmKey() !== key) {
      discard(shots); // 찍는 도중 다이얼이 움직였다
      return null;
    }
  }

  film = { key, shots };
  return film;
}

function showFrame(frame) {
  if (!film) return false;
  const wrapped = ((frame % FRAMES) + FRAMES) % FRAMES;
  const shot = film.shots[Math.floor(wrapped / state.hold) % film.shots.length];
  canvas.width = shot.width;
  canvas.height = shot.height;
  canvas.getContext("2d").drawImage(shot, 0, 0);
  return true;
}

// 미리보기. 굽지 않고 프레임마다 바로 찍는다. 손잡이를 끄는 동안에는 필름을 다시 굽는 것이
// 불가능하므로(한 벌에 1초 넘게 걸린다) 화질을 내주고 움직임을 지킨다. 따라가지 못하면
// 프레임이 떨어질 뿐인데, 프레임 번호를 벽시계에서 뽑으므로 박자는 어긋나지 않는다.
function startLive() {
  if (live) return;
  live = true;
  const started = performance.now();

  const step = (now) => {
    if (!live) return;
    const frame = Math.floor(((now - started) / 1000) * FPS) % FRAMES;
    state.frame = frame;
    printSheet(canvas, settings(plateById(state.plate), PALETTES[state.palette], { frame, scale: PREVIEW_SCALE }));
    frameOut.textContent = `${frame} / ${FRAMES}`;
    liveRaf = requestAnimationFrame(step);
  };

  liveRaf = requestAnimationFrame(step);
}

function stopLive() {
  live = false;
  cancelAnimationFrame(liveRaf);
}

// 멈춰 있을 때 끄는 동안. 움직이지는 않지만 손을 따라와야 하므로 작게 한 장만 찍는다.
function sketch() {
  printSheet(canvas, settings(plateById(state.plate), PALETTES[state.palette], { frame: state.frame, scale: PREVIEW_SCALE }));
  status.textContent = `${plateById(state.plate).name} · DRAFT · F${state.frame}`;
  writeHash();
}

// 기계를 세운다. 쓰는 사람의 뜻은 건드리지 않는다.
function stop() {
  generation += 1;
  playing = false;
  clearTimeout(resumeTimer);
  cancelAnimationFrame(raf);
  playButton.textContent = "PLAY 24FPS";
  playButton.classList.remove("on");
}

// 멈춰 달라고 해서 멈춘다. 다음 다이얼에도 다시 돌지 않는다.
function halt() {
  wantsPlay = false;
  stop();
  stopLive();
}

// 손이 멎은 뒤에 할 일. 움직이던 중이었으면 구워서 잇고, 멈춰 있었으면 제 크기로 다시 찍는다.
// 끄는 동안에는 둘 다 못 한다 — 굽는 데 1초, 제 크기 한 장에 100밀리초가 넘게 든다.
function resume(delay = 0) {
  clearTimeout(resumeTimer);
  if (state.grid !== "off") return;
  resumeTimer = setTimeout(() => (wantsPlay ? play() : render()), delay);
}

async function play() {
  if (state.grid !== "off") {
    state.grid = "off";
    mark(gridRow, gridItems, (item) => item.kind === state.grid);
  }

  wantsPlay = true;
  stop();
  stopLive();
  const mine = generation;

  playButton.textContent = "PRINTING…";
  const reel = await bake(mine);
  if (!reel || mine !== generation) return;

  playing = true;
  playButton.textContent = "STOP";
  playButton.classList.add("on");

  const started = performance.now();
  let shown = -1;
  let ticks = 0;
  let mark0 = started;

  const tick = (now) => {
    if (!playing) return;
    const frame = Math.floor(((now - started) / 1000) * FPS) % FRAMES;
    if (frame !== shown) {
      showFrame(frame);
      state.frame = frame;
      scrub.value = String(frame);
      frameOut.textContent = `${frame} / ${FRAMES}`;
      shown = frame;
      ticks += 1;
    }
    if (now - mark0 >= 1000) {
      status.textContent = `${plateById(state.plate).name} · ${ticks} FPS · ${FPS / state.hold} SHEETS A SECOND · ${(FRAMES / FPS).toFixed(1)}S LOOP · BOIL ${state.boil.toUpperCase()}`;
      ticks = 0;
      mark0 = now;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
}

// -- 그리기 -----------------------------------------------------------------------------

function render() {
  if (playing) return;
  const started = performance.now();
  const plate = plateById(state.plate);
  let note;

  if (state.grid === "off") {
    if (!(film && film.key === filmKey() && showFrame(state.frame))) {
      printSheet(canvas, settings(plate, PALETTES[state.palette], { frame: state.frame, scale: 1 }));
    }
    note = `${plate.name} · ROLL ${state.seed} · ${state.drums} DRUMS · F${state.frame}`;
    about.textContent = plate.about;
  } else {
    const count = renderGrid();
    note = `GRID ${state.grid.toUpperCase()} · ${count} SHEETS · ROLL ${state.seed}`;
    about.textContent =
      state.grid === "plates" ? "같은 롤로 모든 판화를 나란히" : state.grid === "inks" ? "같은 판화를 배색 아홉 벌로" : "한 바퀴를 아홉 자리에서 끊어";
  }

  frameOut.textContent = `${state.frame} / ${FRAMES}`;
  status.textContent = `${note} · ${Math.round(performance.now() - started)} MS`;
  writeHash();
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
      nudged(); // 슬라이더와 같은 길 — 바로 가벼운 한 장, 잠시 뒤 제 것으로
    });
    row.append(button);
  }
  mark(row, items, isOn);
}

// 슬라이더는 끄는 내내 값이 바뀐다. 손이 멎고 이만큼 지나야 다시 굽는다.
// 한 칸 움직일 때마다 굽기 시작하면 아무것도 못 한다.
const SETTLE = 500;

// 고른 판의 손잡이만 조절칸으로 짓는다. 판을 바꾸면 칸도 통째로 바뀐다 — 남의 판에 없는
// 값을 띄워 두면 무엇을 돌리는지 알 수 없게 된다.
function buildKnobs() {
  const plate = plateById(state.plate);
  const values = knobsFor(plate);
  const list = plate.knobs || [];

  knobsRow.replaceChildren();
  knobsCard.hidden = list.length === 0;
  if (!list.length) return;

  const places = (step) => (String(step).includes(".") ? String(step).split(".")[1].length : 0);

  for (const knob of list) {
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
    input.setAttribute("aria-label", knob.label);
    if (knob.hint) input.title = knob.hint;

    input.addEventListener("input", () => {
      values[knob.key] = Number(input.value);
      out.textContent = values[knob.key].toFixed(digits);
      nudged();
    });

    row.append(head, input);
    knobsRow.append(row);
  }
}

// 판화가 하나뿐이면 고르개도, 판화끼리 견주는 콘택트 시트도 뜻이 없다. 목록을 따라간다.
const many = PLATES.length > 1;

const gridItems = [
  { label: "OFF", kind: "off" },
  ...(many ? [{ label: "PLATES", kind: "plates" }] : []),
  { label: "INKS", kind: "inks" },
  { label: "FRAMES", kind: "frames" }
];

if (many) {
  buildRow(
    plateRow,
    PLATES.map((plate) => ({ label: plate.name, title: plate.about, id: plate.id })),
    (item) => item.id === state.plate,
    (item) => { stop(); state.plate = item.id; buildKnobs(); }
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
  (item) => { stop(); state.palette = item.index; },
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

buildRow(drumsRow, [{ label: "2", count: 2 }, { label: "3", count: 3 }], (item) => item.count === state.drums, (item) => { stop(); state.drums = item.count; });

buildRow(gridRow, gridItems, (item) => item.kind === state.grid, (item) => { stop(); state.grid = item.kind; });

buildRow(
  rateRow,
  RATES,
  (item) => item.hold === state.hold,
  (item) => { stop(); state.hold = item.hold; }
);

buildRow(
  boilRow,
  [{ label: "HELD", kind: "held", title: "한 장. 종이는 붙박이고 그림이 그 밑에서 움직인다" },
   { label: "TWOS", kind: "twos", title: "두 프레임에 한 번. 손으로 그린 애니메이션의 속도" },
   { label: "EVERY", kind: "every", title: "매 프레임. 화면 전체가 끓는다" }],
  (item) => item.kind === state.boil,
  (item) => { stop(); state.boil = item.kind; }
);

// 값이 끌리는 동안. 움직이던 중이었으면 미리보기로 계속 돌리고, 멈춰 있었으면 정지 화면만
// 다시 찍는다. 손이 멎으면 제 크기로 구워 넘긴다.
function nudged() {
  stop();

  if (state.grid !== "off") {
    render();
  } else if (wantsPlay) {
    startLive();
    status.textContent = `${plateById(state.plate).name} · LIVE`;
    writeHash();
  } else {
    sketch();
  }

  resume(SETTLE);
}

for (const [name, dial] of Object.entries(dials)) {
  dial.input.addEventListener("input", () => {
    state[name] = dial.read(dial.input.value);
    dial.out.textContent = dial.show(state[name]);
    nudged();
  });
}

headlineInput.addEventListener("input", () => {
  state.headline = headlineInput.value;
  nudged();
});

// 프레임을 직접 끄는 것은 "이 한 장을 보겠다"는 뜻이다. 멈춘 채로 둔다.
scrub.addEventListener("input", () => {
  halt();
  state.frame = Number(scrub.value);
  render();
});

playButton.addEventListener("click", () => {
  if (playing) {
    halt();
    render();
  } else {
    play();
  }
});

document.getElementById("reroll").addEventListener("click", () => {
  state.seed = (Math.random() * 0xffffffff) >>> 0;
  nudged();
});

document.getElementById("save").addEventListener("click", () => {
  canvas.toBlob((blob) => {
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
  if (event.key === "g" || event.key === "G") {
    state.grid = state.grid === "off" ? gridItems[1].kind : "off";
    mark(gridRow, gridItems, (item) => item.kind === state.grid);
    nudged();
  }
});

// -- 시동 -------------------------------------------------------------------------------

// 주소에 실려 온 손잡이는 지금 걸린 판의 것이다. 그 판이 내놓지 않은 열쇠는 버린다.
if (state.rawKnobs) {
  const plate = plateById(state.plate);
  const values = knobsFor(plate);
  for (const pair of state.rawKnobs.split("|")) {
    const [key, raw] = pair.split(":");
    const knob = (plate.knobs || []).find((item) => item.key === key);
    if (!knob) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) values[key] = Math.max(knob.min, Math.min(knob.max, value));
  }
}
buildKnobs();

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
render();

// 판화는 기본으로 움직인다. 열면 바로 찍고 튼다 — 정지된 한 장은 t를 안 보는 판화일 뿐이다.
// 쓰는 사람이 움직임을 줄여 달라고 해 두었으면 그러지 않는다. 콘택트 시트를 펼친 채로
// 들어왔으면 뜻만 세워 두고, 시트를 닫는 순간 이어진다.
wantsPlay = !matchMedia("(prefers-reduced-motion: reduce)").matches;
resume();
