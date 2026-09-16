// 인쇄기 앞의 화면. 여기서 정하는 것은 다이얼뿐이고, 한 장이 어떻게 생겼는지는
// 판화(src/plates/)가, 어떻게 찍히는지는 press.js가 정한다.
//
// 설정은 전부 주소에 들어간다. 마음에 드는 장은 링크로 남고, 같은 링크는 같은 장을 찍는다.

import { PALETTES } from "./palette.js";
import { PLATES, plateById } from "./plates/index.js";
import { printSheet, SHEET } from "./press.js";

const canvas = document.getElementById("sheet");
const status = document.getElementById("status");
const about = document.getElementById("about");
const plateRow = document.getElementById("plates");
const paletteRow = document.getElementById("palettes");
const drumsRow = document.getElementById("drums");
const gridRow = document.getElementById("grid");
const headlineInput = document.getElementById("headline");

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
  grid: "off"
};

const state = { ...DEFAULTS, ...readHash() };

// 콘택트 시트가 칸마다 다시 쓰는 종이. 한 장만 두고 돌려 쓴다.
const offscreen = document.createElement("canvas");

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
  if (params.has("grid")) out.grid = ["plates", "inks"].includes(params.get("grid")) ? params.get("grid") : "off";
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
    reg: String(state.register)
  });
  if (state.headline) params.set("t", state.headline);
  if (state.grid !== "off") params.set("grid", state.grid);
  history.replaceState(null, "", `#${params.toString()}`);
}

function settings(plate, palette) {
  return {
    plate,
    palette,
    inkCount: state.drums,
    seed: state.seed,
    cell: state.cell,
    grain: state.grain,
    registration: state.register,
    headline: state.headline
  };
}

// 콘택트 시트. 한 장만 보고서는 알 수 없는 것을 판단하는 자리다.
//   PLATES — 같은 롤로 모든 판화를. 어느 장이 이 배색에서 무너지는지
//   INKS   — 같은 판화를 배색 아홉 벌로. 어느 배색에서 글자가 안 읽히는지
function renderGrid() {
  const cells =
    state.grid === "plates"
      ? PLATES.map((plate) => ({ plate, palette: PALETTES[state.palette], label: plate.name }))
      : PALETTES.map((palette, index) => ({ plate: plateById(state.plate), palette, label: palette.label, mark: index === state.palette }));

  const columns = Math.min(3, cells.length);
  const rows = Math.ceil(cells.length / columns);
  const cellWidth = 300;
  const cellHeight = 400;

  canvas.width = columns * cellWidth;
  canvas.height = rows * cellHeight;
  const out = canvas.getContext("2d");
  out.fillStyle = "#ddd8cb";
  out.fillRect(0, 0, canvas.width, canvas.height);

  cells.forEach((cell, index) => {
    printSheet(offscreen, settings(cell.plate, cell.palette));
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    out.drawImage(offscreen, x + 7, y + 7, cellWidth - 14, cellHeight - 26);

    out.fillStyle = cell.mark ? "#2b2724" : "rgba(43, 39, 36, 0.55)";
    out.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    out.fillText(cell.label, x + 8, y + cellHeight - 6);
  });

  return cells.length;
}

function render() {
  const started = performance.now();
  const plate = plateById(state.plate);
  let note;

  if (state.grid === "off") {
    printSheet(canvas, settings(plate, PALETTES[state.palette]));
    note = `${plate.name} · ROLL ${state.seed} · ${state.drums} DRUMS`;
    about.textContent = plate.about;
  } else {
    const count = renderGrid();
    note = `GRID ${state.grid.toUpperCase()} · ${count} SHEETS · ROLL ${state.seed}`;
    about.textContent = state.grid === "plates" ? "같은 롤로 모든 판화를 나란히" : "같은 판화를 배색 아홉 벌로";
  }

  status.textContent = `${note} · ${Math.round(performance.now() - started)} MS`;
  writeHash();
}

// -- 다이얼 ---------------------------------------------------------------------------

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
    });
    row.append(button);
  }
  mark(row, items, isOn);
}

function mark(row, items, isOn) {
  [...row.children].forEach((button, index) => button.classList.toggle("on", isOn(items[index])));
}

buildRow(
  plateRow,
  PLATES.map((plate) => ({ label: plate.name, title: plate.about, id: plate.id })),
  (item) => item.id === state.plate,
  (item) => { state.plate = item.id; }
);

buildRow(
  paletteRow,
  PALETTES.map((palette, index) => ({ label: palette.label, title: `${palette.name} — ${palette.label}`, index, inks: palette.inks })),
  (item) => item.index === state.palette,
  (item) => { state.palette = item.index; },
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

buildRow(
  drumsRow,
  [{ label: "2", count: 2 }, { label: "3", count: 3 }],
  (item) => item.count === state.drums,
  (item) => { state.drums = item.count; }
);

buildRow(
  gridRow,
  [{ label: "OFF", kind: "off" }, { label: "PLATES", kind: "plates" }, { label: "INKS", kind: "inks" }],
  (item) => item.kind === state.grid,
  (item) => { state.grid = item.kind; }
);

for (const [name, dial] of Object.entries(dials)) {
  dial.input.addEventListener("input", () => {
    state[name] = dial.read(dial.input.value);
    dial.out.textContent = dial.show(state[name]);
    render();
  });
}

headlineInput.addEventListener("input", () => {
  state.headline = headlineInput.value;
  render();
});

document.getElementById("reroll").addEventListener("click", () => {
  state.seed = (Math.random() * 0xffffffff) >>> 0;
  render();
});

document.getElementById("save").addEventListener("click", () => {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.grid === "off" ? `riso-${state.plate}-${state.seed}.png` : `riso-grid-${state.grid}-${state.seed}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});

addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === "n" || event.key === "N") document.getElementById("reroll").click();
  if (event.key === "s" || event.key === "S") document.getElementById("save").click();
  if (event.key === "g" || event.key === "G") {
    state.grid = state.grid === "off" ? "plates" : "off";
    mark(gridRow, [{ kind: "off" }, { kind: "plates" }, { kind: "inks" }], (item) => item.kind === state.grid);
    render();
  }
});

// -- 시동 -----------------------------------------------------------------------------

canvas.width = SHEET.width;
canvas.height = SHEET.height;
headlineInput.value = state.headline;
for (const [name, dial] of Object.entries(dials)) {
  dial.input.value = name === "grain" ? String(Math.round(state.grain * 100)) : String(state[name]);
  dial.out.textContent = dial.show(state[name]);
}
render();
