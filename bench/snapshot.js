// 스냅숏. 판을 모두 정해진 설정 여럿으로 찍고, 찍힌 장마다 픽셀의 해시를 남긴다.
//
// 리팩터링은 그림을 한 픽셀도 바꾸지 않아야 한다. 눈으로는 그걸 증명할 수 없다. 그래서 고치기
// 전에 해시를 떠 두고(RECORD), 고친 뒤에 다시 떠서 견준다(COMPARE). 다른 장이 나오면 어느 판의
// 어느 설정인지 적는다. 그림을 일부러 바꾼 단계라면, 바뀐 장이 바꾸려던 판에만 있는지 보고 기준을
// 새로 뜬다.
//
// 해시는 기준을 뜬 기계와 브라우저에서만 뜻이 있다. GPU와 드라이버와 글꼴이 다르면 같은 코드도
// 다른 픽셀을 찍는다. 기준은 고치기 직전에 같은 자리에서 뜬다.
//
// 설정은 판마다 다섯 묶음이다.
//
//   palettes  배색 아홉 벌 × 통 둘·셋. 통을 색으로 고르는 판(src/drums.js)을 지킨다
//   time      씨앗 셋 × 프레임 셋
//   knobs     손잡이를 모두 최소, 모두 최대, 뽑은 값 둘 × 배색 둘 × 통 둘. FIELD도 여기서 움직인다
//   dials     CELL · GRAIN · REGISTER · BOIL을 기본에서 비킨 것 둘
//   small     콘택트 시트의 1/3 크기
//
// 다 찍은 뒤 흩어진 스물몇 장을 다른 차례로 다시 찍어 같은지 본다. 같은 장이 앞서 무엇을
// 찍었느냐에 따라 달라지면(캐시가 새는 등) 스냅숏 자체를 믿을 수 없기 때문이다.

const FRAMES = 48; // 실험의 정의다. 화면의 시계가 바뀌어도 여기는 그대로 둔다
const HEADLINE = "리소 판화 SAMPLE"; // 제목을 받는 판(POSTER)이 찍을 글
const BASE = {
  palette: 0,
  inkCount: 3,
  seed: 12345,
  cell: 9,
  grain: 0.35,
  registration: 2,
  frame: 0,
  boil: "twos",
  scale: 1,
  knobs: {},
  knobName: "default"
};

let state = null;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// 손잡이 값을 뽑는 난수. 판의 난수(src/rng.js)를 빌리지 않는다 — 그쪽을 고치는 순간 뽑힌 값이
// 달라져, 판은 그대로인데 스냅숏만 다르다고 나온다
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 인쇄기와 판을 작업 트리에서 불러온다. 걸리지 않은 판(POSTER · MEDIUM)도 함께다. 그 판들만 쓰는
// 모양과 분판 기능이 있어서, 빼면 그쪽을 고쳐도 아무도 모른다
export async function setup(stamp) {
  const info = await (await fetch("/meta")).json();
  const load = (path) => import(`/new/src/${path}?v=${stamp}`);
  const { PLATES } = await load("plates/index.js");
  const plates = [...PLATES];
  for (const file of ["poster", "medium"]) {
    const plate = (await load(`plates/${file}.js`))[file];
    if (plate && !plates.some((p) => p.id === plate.id)) plates.push(plate);
  }
  const { createPress } = await load("press.js");
  const { PALETTES } = await load("palette.js");

  const canvas = document.createElement("canvas");
  const machine = createPress(canvas);
  const gl = canvas.getContext("webgl2");
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  state = {
    source: info.new,
    gpu: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    plates,
    palettes: PALETTES,
    machine,
    gl,
    canvas
  };
  return { source: state.source.commit, gpu: state.gpu, plates: plates.map((plate) => plate.id), cases: cases().length };
}

// 손잡이를 모두 한쪽 끝으로, 또는 뽑은 값으로. 뽑은 값도 손잡이의 눈금 위에 앉힌다. 화면에서
// 슬라이더가 내는 값과 같은 모양이어야 한다
function knobSets(plate) {
  const all = [...(plate.knobs || []), ...(plate.scope || [])];
  if (!all.length) return {};
  const places = (step) => (String(step).includes(".") ? String(step).split(".")[1].length : 0);
  const at = (knob, f) => {
    const steps = Math.round((knob.max - knob.min) / knob.step);
    return Number((knob.min + Math.round(f * steps) * knob.step).toFixed(places(knob.step)));
  };
  const drawn = (seed) => {
    const next = mulberry(seed);
    return Object.fromEntries(all.map((knob) => [knob.key, at(knob, next())]));
  };
  return {
    min: Object.fromEntries(all.map((knob) => [knob.key, knob.min])),
    max: Object.fromEntries(all.map((knob) => [knob.key, knob.max])),
    mixA: drawn(0xa11ce),
    mixB: drawn(0xb0b)
  };
}

export function cases() {
  const list = [];
  for (const plate of state.plates) {
    const add = (group, over) => list.push({ ...BASE, plate, group, ...over });

    for (let palette = 0; palette < state.palettes.length; palette += 1) {
      for (const inkCount of [2, 3]) add("palettes", { palette, inkCount, frame: 13 });
    }
    for (const seed of [12345, 777, 2024]) {
      for (const frame of [0, 7, 30]) add("time", { seed, frame });
    }
    for (const [knobName, knobs] of Object.entries(knobSets(plate))) {
      for (const palette of [0, 4]) {
        for (const inkCount of [2, 3]) add("knobs", { knobs, knobName, palette, inkCount, frame: 19, seed: 777 });
      }
    }
    add("dials", { cell: 5, grain: 0.55, registration: 4, boil: "every", frame: 23, seed: 2024, palette: 2 });
    add("dials", { cell: 14, grain: 0, registration: 0, boil: "held", frame: 23, seed: 2024, palette: 6 });
    add("small", { scale: 1 / 3, frame: 6, palette: 1 });
  }
  return list;
}

export const idOf = (c) =>
  [c.plate.id, c.group, `p${c.palette}`, `d${c.inkCount}`, `s${c.seed}`, `f${c.frame}`, c.knobName, `c${c.cell}`, `g${c.grain}`, `r${c.registration}`, c.boil, `x${Number(c.scale.toFixed(3))}`].join(" ");

// 한 장을 찍고 곧바로 읽는다. 읽기는 찍은 것과 같은 일 안에 있어야 한다 — 화면에 한 번 올라가고
// 나면 그리기 버퍼가 비워질 수 있다
async function shootOne(c) {
  const { machine, gl, canvas, palettes } = state;
  const record = machine.print({
    plate: c.plate,
    palette: palettes[c.palette],
    inkCount: c.inkCount,
    seed: c.seed,
    cell: c.cell,
    grain: c.grain,
    registration: c.registration,
    headline: HEADLINE,
    frame: c.frame,
    frames: FRAMES,
    boil: c.boil,
    scale: c.scale,
    knobs: c.knobs
  });
  if (!record) throw new Error("GPU가 기계를 잃었다. 다시 연다");
  const pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", pixels));
  return [...digest.slice(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function shoot(onProgress) {
  const list = cases();
  const hashes = {};
  const started = performance.now();
  for (let i = 0; i < list.length; i += 1) {
    hashes[idOf(list[i])] = await shootOne(list[i]);
    if (i % 16 === 0) {
      onProgress?.(`${i} / ${list.length}`);
      await tick();
    }
  }

  // 흩어진 장을 다른 차례로 다시 찍는다. 앞에 찍힌 장이 달라도 같아야 한다
  const again = list.filter((_, i) => i % 23 === 11).reverse();
  const unstable = [];
  for (const c of again) {
    if ((await shootOne(c)) !== hashes[idOf(c)]) unstable.push(idOf(c));
  }
  onProgress?.(`${list.length} / ${list.length}`);

  return {
    hashes,
    count: list.length,
    seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
    repeat: { checked: again.length, unstable }
  };
}

const describe = () => ({
  date: new Date().toISOString(),
  source: state.source.commit,
  gpu: state.gpu,
  browser: navigator.userAgent
});

// 지금 작업 트리를 기준으로 뜬다. bench/results/<run>/snapshot.json에 적는다
export async function record(run, onProgress) {
  const shot = await shoot(onProgress);
  if (shot.repeat.unstable.length) throw new Error(`같은 장이 다시 찍으면 다르다: ${shot.repeat.unstable.join(", ")}`);
  const body = { kind: "riso-snapshot", ...describe(), count: shot.count, seconds: shot.seconds, repeat: shot.repeat, hashes: shot.hashes };
  const response = await fetch(`/save?run=${encodeURIComponent(run)}&file=snapshot.json`, { method: "POST", body: JSON.stringify(body, null, 1) });
  if (!response.ok) throw new Error(`저장하지 못했다: ${response.status}`);
  return { saved: await response.text(), count: shot.count, seconds: shot.seconds, repeat: shot.repeat };
}

// 지금 작업 트리를 찍어 기준과 견준다. 다른 장을 판별로 센다
export async function compare(run, onProgress) {
  const response = await fetch(`/results/${encodeURIComponent(run)}/snapshot.json`);
  if (!response.ok) throw new Error(`기준이 없다: bench/results/${run}/snapshot.json`);
  const base = await response.json();
  const shot = await shoot(onProgress);

  const differ = [];
  const missing = [];
  for (const [id, hash] of Object.entries(base.hashes)) {
    if (!(id in shot.hashes)) missing.push(id);
    else if (shot.hashes[id] !== hash) differ.push(id);
  }
  const added = Object.keys(shot.hashes).filter((id) => !(id in base.hashes));
  const byPlate = {};
  for (const id of differ) {
    const [plate, group] = id.split(" ");
    byPlate[plate] ??= {};
    byPlate[plate][group] = (byPlate[plate][group] || 0) + 1;
  }

  return {
    base: { run, source: base.source, date: base.date },
    now: state.source.commit,
    total: Object.keys(base.hashes).length,
    same: Object.keys(base.hashes).length - differ.length - missing.length,
    differ: differ.length,
    byPlate,
    examples: differ.slice(0, 12),
    missing,
    added,
    repeat: shot.repeat,
    seconds: shot.seconds
  };
}
