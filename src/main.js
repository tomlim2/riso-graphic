// 인쇄기 앞의 화면. 여기서 정하는 것은 다이얼뿐이고, 한 장이 어떻게 생겼는지는
// 판화(src/plates/)가, 어떻게 찍히는지는 press.js가 정한다.
//
// 움직이는 판화는 미리 찍어 두고 튼다. 한 프레임을 찍는 데 재생 예산보다 오래 걸리기
// 때문이기도 하지만, 그것이 인쇄가 실제로 하는 일이기도 하다. 필름은 미리 찍히고, 영사기는
// 찍힌 것을 넘길 뿐이다.

import { PALETTES } from "./palette.js";
import { PLATES, plateById } from "./plates/index.js";
import { printSheet, SHEET } from "./press.js";

// 초당 스물네 장. 고정이다.
//
// 투스로 찍으면 그림은 초당 열두 장이고 한 장을 두 프레임씩 잡아 둔다. 손그림 애니메이션이
// 늘 하던 일이고 굽는 시간도 절반이지만, 초당 스물네 번이라는 말과는 다르다. 프레임마다
// 새로 찍는다. 값이 아니라 약속이라 다이얼로 두지 않는다.
const FPS = 24;
const FRAMES = 48; // 한 바퀴 2초. 물결의 박자가 여기 맞춰져 있다
const PLAY_SCALE = 0.62; // 재생용 종이 크기. 망점도 같이 줄어 눈에는 같은 스크린으로 보인다
const GRID_SCALE = 1 / 3;

const canvas = document.getElementById("sheet");
const status = document.getElementById("status");
const about = document.getElementById("about");
const plateRow = document.getElementById("plates");
const paletteRow = document.getElementById("palettes");
const drumsRow = document.getElementById("drums");
const gridRow = document.getElementById("grid");
const boilRow = document.getElementById("boil");
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
  boil: "twos"
};

const state = { ...DEFAULTS, ...readHash() };

const offscreen = document.createElement("canvas");
let film = null;
let playing = false;
let raf = 0;

// 움직이는 것이 기본이므로, 다이얼을 하나 건드렸다고 멈춘 채로 두지 않는다. wantsPlay는
// 쓰는 사람의 뜻이고 playing은 지금 상태다. 둘을 나눠 두어야 "잠깐 정지 화면을 보여 주고
// 다시 잇는" 것과 "멈춰 달라고 해서 멈춘 것"이 섞이지 않는다.
let wantsPlay = false;
let resumeTimer = 0;

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
  if (params.has("boil")) out.boil = ["held", "twos", "every"].includes(params.get("boil")) ? params.get("boil") : "twos";
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
    boil: state.boil
  });
  if (state.headline) params.set("t", state.headline);
  if (state.grid !== "off") params.set("grid", state.grid);
  history.replaceState(null, "", `#${params.toString()}`);
}

function settings(plate, palette, extra = {}) {
  return {
    plate,
    palette,
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
  return [state.plate, state.seed, state.palette, state.drums, state.cell, state.grain, state.register, state.headline, state.boil].join("|");
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

  for (let frame = 0; frame < FRAMES; frame += 1) {
    printSheet(offscreen, settings(plate, palette, { frame, scale: PLAY_SCALE }));
    shots.push(await createImageBitmap(offscreen));
    status.textContent = `PRINTING ${frame + 1} / ${FRAMES}`;

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
  const shot = film.shots[((frame % FRAMES) + FRAMES) % FRAMES];
  canvas.width = shot.width;
  canvas.height = shot.height;
  canvas.getContext("2d").drawImage(shot, 0, 0);
  return true;
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
}

// 다이얼이 바뀐 뒤 다시 잇는다. 슬라이더는 끄는 동안 계속 바뀌므로 잠시 기다렸다가 간다.
function resume(delay = 0) {
  clearTimeout(resumeTimer);
  if (!wantsPlay || state.grid !== "off") return;
  resumeTimer = setTimeout(play, delay);
}

async function play() {
  if (state.grid !== "off") {
    state.grid = "off";
    mark(gridRow, gridItems, (item) => item.kind === state.grid);
  }

  wantsPlay = true;
  stop();
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
      status.textContent = `${plateById(state.plate).name} · PLAYING ${ticks} FPS · ${(FRAMES / FPS).toFixed(1)}S LOOP · BOIL ${state.boil.toUpperCase()}`;
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
      render();
      resume(); // 버튼은 한 번 누르고 끝이라 기다릴 것 없이 바로 잇는다
    });
    row.append(button);
  }
  mark(row, items, isOn);
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
    (item) => { stop(); state.plate = item.id; }
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
  boilRow,
  [{ label: "HELD", kind: "held", title: "한 장. 종이는 붙박이고 그림이 그 밑에서 움직인다" },
   { label: "TWOS", kind: "twos", title: "두 프레임에 한 번. 손으로 그린 애니메이션의 속도" },
   { label: "EVERY", kind: "every", title: "매 프레임. 화면 전체가 끓는다" }],
  (item) => item.kind === state.boil,
  (item) => { stop(); state.boil = item.kind; }
);

// 슬라이더는 끄는 내내 값이 바뀐다. 그 동안은 정지 화면을 보여 주고, 손이 멎으면 잇는다.
// 한 칸 움직일 때마다 다시 구우면 아무것도 못 한다.
const SETTLE = 500;

for (const [name, dial] of Object.entries(dials)) {
  dial.input.addEventListener("input", () => {
    stop();
    state[name] = dial.read(dial.input.value);
    dial.out.textContent = dial.show(state[name]);
    render();
    resume(SETTLE);
  });
}

headlineInput.addEventListener("input", () => {
  stop();
  state.headline = headlineInput.value;
  render();
  resume(SETTLE);
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
  stop();
  state.seed = (Math.random() * 0xffffffff) >>> 0;
  render();
  resume();
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
    stop();
    state.grid = state.grid === "off" ? gridItems[1].kind : "off";
    mark(gridRow, gridItems, (item) => item.kind === state.grid);
    render();
    resume();
  }
});

// -- 시동 -------------------------------------------------------------------------------

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
