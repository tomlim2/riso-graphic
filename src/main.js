// The screen around the press. Nothing here decides how a sheet looks — it only sets the
// dials and hands them to poster.js.
//
// The whole setting lives in the address, so a sheet worth keeping is a link, and the
// roll is shown rather than hidden: the same number always prints the same sheet.

import { PALETTES } from "./palette.js";
import { drawPoster, SHEET } from "./poster.js";

const canvas = document.getElementById("sheet");
const status = document.getElementById("status");
const paletteRow = document.getElementById("palettes");
const headlineInput = document.getElementById("headline");
const grainInput = document.getElementById("grain");
const registerInput = document.getElementById("register");
const grainOut = document.getElementById("grainOut");
const registerOut = document.getElementById("registerOut");
const drumsRow = document.getElementById("drums");

const DEFAULTS = {
  seed: (Math.random() * 0xffffffff) >>> 0,
  palette: 0,
  drums: 3,
  grain: 0.34,
  register: 2,
  headline: ""
};

const state = { ...DEFAULTS, ...readHash() };

function readHash() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  const out = {};
  if (params.has("seed")) out.seed = Number(params.get("seed")) >>> 0;
  if (params.has("p")) out.palette = Math.max(0, Math.min(PALETTES.length - 1, Number(params.get("p"))));
  if (params.has("drums")) out.drums = Number(params.get("drums")) === 2 ? 2 : 3;
  if (params.has("grain")) out.grain = Math.max(0, Math.min(0.6, Number(params.get("grain"))));
  if (params.has("reg")) out.register = Math.max(0, Math.min(5, Number(params.get("reg"))));
  if (params.has("t")) out.headline = params.get("t");
  return out;
}

function writeHash() {
  const params = new URLSearchParams({
    seed: String(state.seed),
    p: String(state.palette),
    drums: String(state.drums),
    grain: state.grain.toFixed(2),
    reg: String(state.register)
  });
  if (state.headline) params.set("t", state.headline);
  history.replaceState(null, "", `#${params.toString()}`);
}

// An empty headline follows the palette, the way the reference card names its own pair.
function headlineFor(palette) {
  return state.headline || `${palette.name}의 귀여운 배색`;
}

function render() {
  const palette = PALETTES[state.palette];
  const started = performance.now();

  drawPoster(canvas, {
    seed: state.seed,
    palette,
    inkCount: state.drums,
    grain: state.grain,
    registration: state.register,
    headline: headlineFor(palette)
  });

  const took = Math.round(performance.now() - started);
  status.textContent = `ROLL ${state.seed} · ${state.drums} DRUMS · ${took} MS`;
  writeHash();
}

// -- controls ----------------------------------------------------------------------------

for (const [index, palette] of PALETTES.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "swatch";
  button.title = `${palette.name} — ${palette.label}`;
  button.setAttribute("aria-label", palette.label);
  for (const ink of palette.inks) {
    const chip = document.createElement("span");
    chip.style.background = ink;
    button.append(chip);
  }
  button.addEventListener("click", () => {
    state.palette = index;
    markPalette();
    render();
  });
  paletteRow.append(button);
}

function markPalette() {
  for (const [index, button] of [...paletteRow.children].entries()) {
    button.classList.toggle("on", index === state.palette);
  }
}

for (const button of drumsRow.querySelectorAll("button")) {
  button.addEventListener("click", () => {
    state.drums = Number(button.dataset.drums);
    markDrums();
    render();
  });
}

function markDrums() {
  for (const button of drumsRow.querySelectorAll("button")) {
    button.classList.toggle("on", Number(button.dataset.drums) === state.drums);
  }
}

grainInput.addEventListener("input", () => {
  state.grain = Number(grainInput.value) / 100;
  grainOut.textContent = state.grain.toFixed(2);
  render();
});

registerInput.addEventListener("input", () => {
  state.register = Number(registerInput.value);
  registerOut.textContent = `${state.register} PX`;
  render();
});

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
    link.download = `riso-${state.seed}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});

addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === "n" || event.key === "N") document.getElementById("reroll").click();
  if (event.key === "s" || event.key === "S") document.getElementById("save").click();
});

// -- boot ---------------------------------------------------------------------------------

canvas.width = SHEET.width;
canvas.height = SHEET.height;
headlineInput.value = state.headline;
grainInput.value = String(Math.round(state.grain * 100));
grainOut.textContent = state.grain.toFixed(2);
registerInput.value = String(state.register);
registerOut.textContent = `${state.register} PX`;
markPalette();
markDrums();
render();
