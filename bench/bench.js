// 옛 인쇄기와 새 인쇄기를 같은 롤로 견준다.
//
// 잡음을 만드는 방식이 바뀌면 픽셀이 같을 수 없다. 그래서 둘로 나눠 본다.
//   같아야 하는 것  망점 계산, 톤, 판마다의 평균 색, 루프 이음매
//   달라지는 것    한 장을 찍는 데 드는 시간
//
// 인쇄기는 두 종류다. printSheet(canvas, options)를 내놓는 캔버스 2D 인쇄기와
// createPress(canvas)를 내놓는 WebGL2 인쇄기. 어느 쪽이든 같은 모양으로 감싸 쓰므로
// 어느 두 커밋이든 견줄 수 있다.
//
// 시간은 장마다 한 픽셀을 읽어 GPU가 일을 마칠 때까지 기다린 뒤에 잰다. 기다리지 않으면
// GPU에 일을 맡기는 순간까지만 잡혀, 판을 짜는 시간만 남는다.

const SEED = 12345;
const IDS = ["ripple", "moon", "garden", "jelly", "cell", "chloro"];
const ALL_IDS = [...IDS, "poster", "medium"];
const TONES = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
const SHORT_TONES = [0.05, 0.2, 0.4, 0.6, 0.8, 0.95, 1];

// 1:1로 잘라 볼 자리. 망점이 가장 많이 말하는 곳이다
const CROPS = { ripple: [300, 250], moon: [340, 180], garden: [300, 420], jelly: [360, 300], cell: [420, 300], chloro: [420, 300] };

const EMPTY = { id: "empty", name: "EMPTY", paint() {} };
const flood = (role, tone) => ({ id: `flood-${role}`, name: "FLOOD", paint(S) { S[role].flood(tone); } });

let sides = null;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const round = (value, digits = 2) => Number(value.toFixed(digits));

function stats(values, digits = 2) {
  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
  return {
    mean: round(m, digits),
    sd: round(sd, digits),
    p50: round(sorted[Math.floor(sorted.length * 0.5)], digits),
    p99: round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))], digits),
    max: round(sorted.at(-1), digits)
  };
}

// -- 인쇄기 두 대 --------------------------------------------------------------------------

// 판화는 두 인쇄기 모두 새 쪽의 것을 먹인다. 판화를 고친 커밋과 견주어도 인쇄기의 차이만
// 남아야 하기 때문이다. 판화가 옛 인쇄기에 없는 분판 기능을 쓰기 시작하면 그 판은 옛 쪽에서
// 돌지 않는다.
export async function setup(stamp) {
  const info = await (await fetch("/meta")).json();
  const plates = await platesOf("new", stamp);
  sides = {
    old: await open("old", stamp, info.old, plates),
    new: await open("new", stamp, info.new, plates)
  };
  return describe();
}

const both = () => [sides.old, sides.new];

// 걸린 판에 더해, 걸려 있지 않은 판도 견준다. 그 커밋에 없는 판은 건너뛴다
async function platesOf(name, stamp) {
  const load = (path) => import(`/${name}/src/${path}?v=${stamp}`);
  const { PLATES } = await load("plates/index.js");
  const plates = [...PLATES];
  for (const file of ["poster", "medium"]) {
    try {
      const plate = (await load(`plates/${file}.js`))[file];
      if (plate && !plates.some((p) => p.id === plate.id)) plates.push(plate);
    } catch {
      // 없는 판
    }
  }
  return plates;
}

async function open(name, stamp, info, plates) {
  const load = (path) => import(`/${name}/src/${path}?v=${stamp}`);
  const press = await load("press.js");
  const palette = await load("palette.js");

  const canvas = document.createElement("canvas");
  const base = { name, info, plates, palettes: palette.PALETTES, inksFor: palette.inksFor, rolesFor: press.rolesFor, canvas };

  if (press.createPress) {
    const machine = press.createPress(canvas);
    const gl = canvas.getContext("webgl2");
    return {
      ...base,
      kind: "webgl2",
      gl,
      print: (options) => machine.print(options),
      sync: () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)),
      read(options) {
        machine.print(options);
        return readGL(gl, canvas);
      }
    };
  }

  const context = () => canvas.getContext("2d");
  return {
    ...base,
    kind: "canvas2d",
    print: (options) => press.printSheet(canvas, options),
    sync: () => context().getImageData(0, 0, 1, 1),
    read(options) {
      press.printSheet(canvas, options);
      return context().getImageData(0, 0, canvas.width, canvas.height);
    }
  };
}

// WebGL은 아래 줄부터 읽는다. 캔버스와 같은 순서로 뒤집어 돌려준다
function readGL(gl, canvas) {
  const { width, height } = canvas;
  const buffer = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    data.set(buffer.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
  }
  return { data, width, height };
}

function describe() {
  const gl = both().find((side) => side.gl)?.gl || document.createElement("canvas").getContext("webgl2");
  const debug = gl && gl.getExtension("WEBGL_debug_renderer_info");
  return {
    date: new Date().toISOString(),
    gpu: gl ? gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : "WebGL2 없음",
    timerQuery: Boolean(gl && gl.getExtension("EXT_disjoint_timer_query_webgl2")),
    browser: navigator.userAgent,
    cores: navigator.hardwareConcurrency,
    old: { kind: sides.old.kind, ...sides.old.info },
    new: { kind: sides.new.kind, ...sides.new.info }
  };
}

function settings(side, { paletteIndex = 0, ...extra } = {}) {
  return {
    palette: side.palettes[paletteIndex],
    inkCount: 3,
    seed: SEED,
    cell: 9,
    grain: 0.35,
    registration: 2,
    frame: 6,
    frames: 48,
    boil: "twos",
    scale: 1,
    ...extra
  };
}

const plateOf = (side, id) => side.plates.find((plate) => plate.id === id);

function meanRGB(img) {
  const sum = [0, 0, 0];
  const n = img.width * img.height;
  for (let i = 0; i < n * 4; i += 4) {
    sum[0] += img.data[i];
    sum[1] += img.data[i + 1];
    sum[2] += img.data[i + 2];
  }
  return sum.map((s) => round(s / n));
}

// -- 같아야 하는 것 -------------------------------------------------------------------------

// 종이결만. 같은 롤, 같은 인상, 판에는 아무것도 없다.
export function paper() {
  const out = {};
  for (const side of both()) {
    const img = side.read(settings(side, { plate: EMPTY }));
    const red = [];
    for (let i = 0; i < img.data.length; i += 4 * 7) red.push(img.data[i]);
    out[side.name] = { rgb: meanRGB(img), red: stats(red) };
  }
  return out;
}

// 통 하나가 흡수하는 채널. 그 채널로 읽어야 커버리지가 또렷하게 나온다
function inkOf(side, role) {
  const inks = side.inksFor(side.palettes[0], 3);
  const hex = inks[side.rolesFor(inks)[role]];
  const rgb = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const channel = rgb.indexOf(Math.min(...rgb));
  return { hex, channel, value: rgb[channel] / 255 };
}

// 종이로 나눠 커버리지를 되읽는다. 곱하기라서 out = 종이 × (1 − a × (1 − 잉크))다.
function coverage(img, ref, ink, margin = 8) {
  const out = new Float32Array(img.width * img.height).fill(NaN);
  for (let y = margin; y < img.height - margin; y += 1) {
    for (let x = margin; x < img.width - margin; x += 1) {
      const i = y * img.width + x;
      const factor = img.data[i * 4 + ink.channel] / ref.data[i * 4 + ink.channel];
      out[i] = (1 - factor) / (1 - ink.value);
    }
  }
  return out;
}

// 통 하나를 톤마다 깔고 커버리지를 견준다. GRAIN 0, REGISTER 0이면 잡음이 망점에 닿지
// 않으므로 픽셀마다 같아야 한다. 그렇지 않으면 평균만 같으면 된다.
export function tone({ role = "key", grain = 0.35, registration = 0, tones = TONES } = {}) {
  const refs = {};
  const inks = {};
  for (const side of both()) {
    refs[side.name] = side.read(settings(side, { plate: EMPTY, grain, registration }));
    inks[side.name] = inkOf(side, role);
  }

  return tones.map((level) => {
    const cover = {};
    for (const side of both()) {
      const img = side.read(settings(side, { plate: flood(role, level), grain, registration }));
      cover[side.name] = coverage(img, refs[side.name], inks[side.name]);
    }

    let a = 0;
    let b = 0;
    let n = 0;
    const diffs = [];
    for (let i = 0; i < cover.old.length; i += 1) {
      if (Number.isNaN(cover.old[i])) continue;
      a += cover.old[i];
      b += cover.new[i];
      n += 1;
      if (i % 7 === 0) diffs.push(Math.abs(cover.old[i] - cover.new[i]));
    }
    const d = stats(diffs, 4);
    return { tone: level, old: round(a / n, 4), new: round(b / n, 4), pixelMean: d.mean, pixelP99: d.p99 };
  });
}

function blockMeans(img, size) {
  const bw = Math.floor(img.width / size);
  const bh = Math.floor(img.height / size);
  const out = new Float64Array(bw * bh * 3);
  for (let y = 0; y < bh * size; y += 1) {
    for (let x = 0; x < bw * size; x += 1) {
      const i = (y * img.width + x) * 4;
      const b = (Math.floor(y / size) * bw + Math.floor(x / size)) * 3;
      out[b] += img.data[i];
      out[b + 1] += img.data[i + 1];
      out[b + 2] += img.data[i + 2];
    }
  }
  for (let i = 0; i < out.length; i += 1) out[i] /= size * size;
  return out;
}

// 판 전체. 망점 셀 셋 너비의 블록 평균으로 같은 잉크가 같은 자리에 같은 만큼 앉았는지 본다.
export function plates({ ids = ALL_IDS, grain = 0.35, registration = 2, block = 27, scale = 1 } = {}) {
  const size = Math.max(1, Math.round(block * scale));
  return ids.flatMap((id) => {
    const pair = both().map((side) => [side, plateOf(side, id)]);
    if (pair.some(([, plate]) => !plate)) return [];
    const [a, b] = pair.map(([side, plate]) => side.read(settings(side, { plate, grain, registration, scale })));
    const ba = blockMeans(a, size);
    const bb = blockMeans(b, size);
    const diffs = Array.from(ba, (value, i) => Math.abs(value - bb[i]));
    return [{ id, old: meanRGB(a), new: meanRGB(b), block: stats(diffs) }];
  });
}

// 이음매. 이웃 프레임의 차이를 한 바퀴 재고, 마지막 걸음이 나머지 사이에서 튀는지 z로 본다.
export function seam({ side = "new", id = "ripple", seeds = [1, 2, 3, 4, 5, 6], hold = 3, boil = "held", stride = 3 } = {}) {
  const press = sides[side];
  const plate = plateOf(press, id);
  return seeds.map((seed) => {
    const frames = [];
    for (let s = 0; s < 48 / hold; s += 1) frames.push(press.read(settings(press, { plate, seed, frame: s * hold, boil })).data);
    const steps = frames.map((f, i) => {
      const g = frames[(i + 1) % frames.length];
      let sum = 0;
      let n = 0;
      for (let p = 0; p < f.length; p += 4 * stride) {
        sum += Math.abs(f[p] - g[p]) + Math.abs(f[p + 1] - g[p + 1]) + Math.abs(f[p + 2] - g[p + 2]);
        n += 1;
      }
      return sum / n;
    });
    const rest = steps.slice(0, -1);
    const m = mean(rest);
    const sd = Math.sqrt(rest.reduce((a, b) => a + (b - m) ** 2, 0) / rest.length);
    return round((steps.at(-1) - m) / sd);
  });
}

export async function seams({ ids = IDS, log = () => {} } = {}) {
  const out = {};
  for (const id of ids) {
    out[id] = {};
    for (const [boil, seeds] of [["held", [1, 2, 3, 4, 5, 6]], ["twos", [1, 2, 3]]]) {
      out[id][boil] = {};
      for (const side of ["old", "new"]) {
        log(`SEAM ${id} · ${boil} · ${side}`);
        await tick();
        out[id][boil][side] = seam({ side, id, seeds, boil });
      }
    }
  }
  return out;
}

// -- 달라지는 것 ---------------------------------------------------------------------------

// 1080 한 장. 옛 인쇄기는 느리므로 적게 찍는다. 끓음은 HELD로 둔다 — 옛 인쇄기는 인상이
// 바뀔 때마다 잡음 표를 새로 뽑느라 찍는 값과 상관없는 시간이 섞인다.
export function timing({ ids = IDS, prints = 96, slowPrints = 6, boil = "held" } = {}) {
  return ids.map((id) => {
    const row = { id };
    for (const side of both()) {
      const plate = plateOf(side, id);
      const n = side.kind === "canvas2d" ? slowPrints : prints;
      side.print(settings(side, { plate, boil }));
      side.sync();
      const times = [];
      for (let i = 0; i < n; i += 1) {
        const t0 = performance.now();
        side.print(settings(side, { plate, boil, frame: i }));
        side.sync();
        times.push(performance.now() - t0);
      }
      row[side.name] = { prints: n, ...stats(times) };
    }
    return row;
  });
}

// 콘택트 시트. 한 판을 배색 아홉 벌로, 1/3 크기로.
export function contact({ id = "moon", repeats = 5, slowRepeats = 2 } = {}) {
  const out = {};
  for (const side of both()) {
    const plate = plateOf(side, id);
    const sheet = () => {
      for (let p = 0; p < 9; p += 1) {
        side.print(settings(side, { plate, paletteIndex: p, scale: 1 / 3 }));
        side.sync();
      }
    };
    sheet();
    const n = side.kind === "canvas2d" ? slowRepeats : repeats;
    const totals = [];
    for (let k = 0; k < n; k += 1) {
      const t0 = performance.now();
      sheet();
      totals.push(performance.now() - t0);
    }
    out[side.name] = { repeats: n, ...stats(totals) };
  }
  return out;
}

// GPU 단계. WebGL2 인쇄기만 잰다.
//
//   paint   판 짜기. 판화 함수 안에서 쓴 시간
//   call    print 호출이 돌아올 때까지. 판 짜기와 분판 올리기, 셰이더 부르기를 맡기는 데까지
//   wait    그 뒤 GPU가 맡은 일을 마칠 때까지
//   shader  같은 판을 한 번 더 그려 잰 셰이더 한 번. 분판과 값이 그대로 물려 있다
//   idle    기다릴 것이 없을 때 한 픽셀 읽는 값. shader에서 뺀다
//   rest    합계에서 판 짜기와 셰이더와 idle을 뺀 것. 분판을 래스터하고 올리는 데 든 몫이다
//   query   GPU 타이머로 잰 셰이더 한 번. 브라우저가 타이머를 내줄 때만 있다
export async function profile({ ids = IDS, prints = 96 } = {}) {
  const out = {};
  for (const side of both().filter((s) => s.kind === "webgl2")) {
    const gl = side.gl;
    const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    out[side.name] = [];

    for (const id of ids) {
      const plate = plateOf(side, id);
      let paint = 0;
      const timed = {
        ...plate,
        paint(S, R, page) {
          const t0 = performance.now();
          plate.paint(S, R, page);
          paint += performance.now() - t0;
        }
      };

      side.print(settings(side, { plate: timed, boil: "held" }));
      side.sync();
      paint = 0;

      const call = [];
      const wait = [];
      const shader = [];
      const idle = [];
      const queries = [];

      for (let i = 0; i < prints; i += 1) {
        const t0 = performance.now();
        side.print(settings(side, { plate: timed, boil: "held", frame: i }));
        const t1 = performance.now();
        side.sync();
        const t2 = performance.now();
        call.push(t1 - t0);
        wait.push(t2 - t1);

        let query = null;
        if (timer) {
          query = gl.createQuery();
          gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        }
        const t3 = performance.now();
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (timer) {
          gl.endQuery(timer.TIME_ELAPSED_EXT);
          queries.push(query);
        }
        side.sync();
        shader.push(performance.now() - t3);

        const t4 = performance.now();
        side.sync();
        idle.push(performance.now() - t4);
      }

      // 타이머는 몇 프레임 뒤에야 답한다. 그사이 GPU가 끊겼으면 그 값은 버린다
      const gpu = [];
      for (let tries = 0; tries < 150 && queries.length; tries += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        for (let k = queries.length - 1; k >= 0; k -= 1) {
          const query = queries[k];
          if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) continue;
          const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
          if (!disjoint) gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(query);
          queries.splice(k, 1);
        }
      }

      const total = mean(call) + mean(wait);
      const shaderOnly = Math.max(0, mean(shader) - mean(idle));
      out[side.name].push({
        id,
        prints,
        paint: round(paint / prints),
        call: round(mean(call)),
        wait: round(mean(wait)),
        shader: round(shaderOnly),
        idle: round(mean(idle)),
        rest: round(Math.max(0, total - paint / prints - shaderOnly - mean(idle))),
        total: round(total),
        query: gpu.length ? round(mean(gpu)) : null
      });
      await tick();
    }
  }
  return out;
}

// -- 그림 -----------------------------------------------------------------------------------

function toCanvas(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const data = img instanceof ImageData ? img : new ImageData(img.data, img.width, img.height);
  canvas.getContext("2d").putImageData(data, 0, 0);
  return canvas;
}

const tag = (side) => `${side.name.toUpperCase()} · ${side.kind.toUpperCase()} · ${side.info.source === "worktree" ? "작업 트리" : side.info.commit.split(" ")[0]}`;

// 판 전체를 나란히, 그리고 망점을 1:1로.
export function pictures({ ids = IDS, crop = 300, half = 540 } = {}) {
  const label = 30;
  const gap = 12;
  const sheets = document.createElement("canvas");
  sheets.width = half * 2 + gap;
  sheets.height = ids.length * (half + label) + label;
  const screen = document.createElement("canvas");
  screen.width = crop * 2 + gap;
  screen.height = ids.length * (crop + label) + label;

  const sg = sheets.getContext("2d");
  const cg = screen.getContext("2d");
  for (const [g, width] of [[sg, half], [cg, crop]]) {
    g.fillStyle = "#ddd8cb";
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.fillStyle = "#2b2724";
    g.font = "700 13px ui-monospace, Menlo, monospace";
    g.fillText(tag(sides.old), 6, 20);
    g.fillText(tag(sides.new), width + gap + 6, 20);
  }

  ids.forEach((id, row) => {
    const [a, b] = both().map((side) => toCanvas(side.read(settings(side, { plate: plateOf(side, id) }))));
    const name = plateOf(sides.new, id).name;

    const y = label + row * (half + label);
    sg.imageSmoothingQuality = "high";
    sg.drawImage(a, 0, y, half, half);
    sg.drawImage(b, half + gap, y, half, half);
    sg.fillStyle = "#2b2724";
    sg.fillText(`${name} · ROLL ${SEED} · F6`, 6, y + half + 20);

    const [cx, cy] = CROPS[id] || [390, 390];
    const yc = label + row * (crop + label);
    cg.drawImage(a, cx, cy, crop, crop, 0, yc, crop, crop);
    cg.drawImage(b, cx, cy, crop, crop, crop + gap, yc, crop, crop);
    cg.fillStyle = "#2b2724";
    cg.fillText(`${name} · 1:1 · ${cx},${cy}`, 6, yc + crop + 20);
  });

  return { sheets, screen };
}

// -- 한꺼번에 -------------------------------------------------------------------------------

async function save(run, file, body) {
  const response = await fetch(`/save?run=${encodeURIComponent(run)}&file=${encodeURIComponent(file)}`, { method: "POST", body });
  if (!response.ok) throw new Error(`저장하지 못했다: ${file}`);
  return response.text();
}

const blobOf = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function all(run, log = () => {}) {
  const step = async (label, work) => {
    log(label);
    await tick();
    return work();
  };

  const results = { run, meta: describe() };
  results.paper = await step("PAPER", () => paper());
  results.tone = {
    clean: await step("TONE · KEY · GRAIN 0 · REGISTER 0", () => tone({ role: "key", grain: 0, registration: 0 })),
    key: await step("TONE · KEY", () => tone({ role: "key", tones: SHORT_TONES })),
    body: await step("TONE · BODY · REGISTER 2", () => tone({ role: "body", registration: 2, tones: SHORT_TONES })),
    wash: await step("TONE · WASH", () => tone({ role: "wash", tones: SHORT_TONES })),
    rough: await step("TONE · KEY · GRAIN 0.6 · REGISTER 5", () => tone({ role: "key", grain: 0.6, registration: 5, tones: SHORT_TONES }))
  };
  results.plates = {
    standard: await step("PLATES", () => plates()),
    clean: await step("PLATES · GRAIN 0 · REGISTER 0", () => plates({ grain: 0, registration: 0 })),
    cleanSlip: await step("PLATES · GRAIN 0 · REGISTER 2", () => plates({ grain: 0, registration: 2 })),
    contact: await step("PLATES · 1/3", () => plates({ ids: IDS, scale: 1 / 3 }))
  };
  results.timing = await step("TIMING", () => timing());
  results.contact = await step("CONTACT SHEET", () => contact());
  results.profile = await step("PROFILE", () => profile());
  results.seam = await seams({ log });

  log("PICTURES");
  await tick();
  const { sheets, screen } = pictures();

  const files = [
    await save(run, "results.json", JSON.stringify(results, null, 2)),
    await save(run, "report.md", report(results)),
    await save(run, "sheets.jpg", await blobOf(sheets, "image/jpeg", 0.9)),
    await save(run, "screen.png", await blobOf(screen, "image/png"))
  ];
  log(`SAVED\n  ${files.join("\n  ")}`);
  return results;
}

// -- 보고서 ---------------------------------------------------------------------------------

const table = (head, rows) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");

const ms = (value) => (value === null || value === undefined ? "—" : `${value} ms`);
const rgbText = (rgb) => rgb.map((v) => v.toFixed(1)).join(" / ");
const signed = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(3)}`;
const nameOf = (id) => plateOf(sides.new, id)?.name || id.toUpperCase();

export function report(results) {
  const { meta } = results;
  const out = [];
  const line = (text = "") => out.push(text);

  line("# 인쇄기 비교");
  line();
  line(`${meta.date.slice(0, 10)}에 \`bench/\`로 잰 값이다. 무엇을 어떻게 재는지는 [bench/README.md](../../README.md)에 있다.`);
  line();
  line(table(["", "옛", "새"], [
    ["인쇄기", meta.old.kind.toUpperCase(), meta.new.kind.toUpperCase()],
    ["출처", `${meta.old.source === "worktree" ? "작업 트리" : "커밋"} ${meta.old.commit}`, `${meta.new.source === "worktree" ? "작업 트리" : "커밋"} ${meta.new.commit}`]
  ]));
  line();
  line(`- GPU: ${meta.gpu}`);
  line(`- GPU 타이머: ${meta.timerQuery ? "있음" : "브라우저가 내주지 않음"}`);
  line(`- 브라우저: ${meta.browser}`);
  line(`- 논리 코어: ${meta.cores}`);
  line("- 판화: 두 인쇄기 모두 새 쪽의 판화를 썼다");
  line();

  line("## 한 장 찍는 시간");
  line();
  line("1080 한 장. 장마다 한 픽셀을 읽어 GPU가 일을 마칠 때까지 기다렸다. 끓음은 HELD다.");
  line();
  line(table(["판", "옛 평균", "새 평균", "새 99분위", "빨라진 배"], results.timing.map((row) => [
    nameOf(row.id),
    `${ms(row.old.mean)} · ${row.old.prints}장`,
    `${ms(row.new.mean)} · ${row.new.prints}장`,
    ms(row.new.p99),
    `${Math.round(row.old.mean / row.new.mean)}×`
  ])));
  line();
  line("콘택트 시트 한 벌. MOON을 배색 아홉 벌로, 1/3 크기로 찍었다.");
  line();
  line(table(["", "옛", "새"], [
    ["평균", ms(results.contact.old.mean), ms(results.contact.new.mean)],
    ["잰 횟수", `${results.contact.old.repeats}`, `${results.contact.new.repeats}`]
  ]));
  line();

  for (const [side, rows] of Object.entries(results.profile)) {
    line(`## GPU 단계 · ${side === "new" ? "새" : "옛"} 인쇄기`);
    line();
    line(`판마다 ${rows[0]?.prints ?? 0}장의 평균이다. 셰이더는 같은 판을 한 번 더 그려 따로 쟀고, 기다릴 것이 없을 때 한 픽셀 읽는 값을 뺐다. 나머지는 분판을 래스터하고 텍스처로 올리는 몫이다.`);
    line();
    line(table(["판", "판 짜기", "print 호출", "GPU 대기", "셰이더", "분판 래스터와 업로드", "합계", "GPU 타이머 셰이더"], rows.map((row) => [
      nameOf(row.id), ms(row.paint), ms(row.call), ms(row.wait), ms(row.shader), ms(row.rest), ms(row.total), ms(row.query)
    ])));
    line();
  }

  line("## 톤");
  line();
  line("통 하나를 톤마다 판 전체에 깔고, 종이만 찍은 장으로 나눠 커버리지를 되읽었다. 가장자리 8픽셀은 뺀다.");
  line();
  line("GRAIN 0, REGISTER 0. 잡음이 망점에 닿지 않으므로 픽셀마다 같아야 한다.");
  line();
  line(table(["톤", "옛", "새", "픽셀 차이 평균", "픽셀 차이 99분위"], results.tone.clean.map((row) => [
    row.tone, row.old.toFixed(4), row.new.toFixed(4), row.pixelMean.toFixed(4), row.pixelP99.toFixed(4)
  ])));
  line();
  line("기본 GRAIN 0.35. 잡음의 무늬가 다르므로 평균만 본다. 칸마다 옛 값, 새 값, 차이 순이다.");
  line();
  const { key, body, wash, rough } = results.tone;
  line(table(["톤", "KEY", "BODY · REGISTER 2", "WASH", "KEY · GRAIN 0.6 · REGISTER 5"], key.map((row, i) => [
    row.tone,
    ...[key, body, wash, rough].map((set) => `${set[i].old.toFixed(3)} · ${set[i].new.toFixed(3)} · ${signed(set[i].new - set[i].old)}`)
  ])));
  line();

  line("## 판마다");
  line();
  line("같은 롤, 프레임 6. 블록은 망점 셀 셋 너비(27픽셀)이고 차이는 8비트 단계다.");
  line();
  line(table(["판", "옛 평균 색", "새 평균 색", "블록 차이 평균", "99분위", "최대"], results.plates.standard.map((row) => [
    nameOf(row.id), rgbText(row.old), rgbText(row.new), row.block.mean, row.block.p99, row.block.max
  ])));
  line();
  line("블록 차이만 조건별로. GRAIN이 0이면 잡음이 빠지므로 남는 차이가 망점 계산의 차이다.");
  line();
  const byId = (set) => Object.fromEntries(set.map((row) => [row.id, row.block]));
  const clean = byId(results.plates.clean);
  const slip = byId(results.plates.cleanSlip);
  const small = byId(results.plates.contact);
  line(table(["판", "GRAIN 0 · REGISTER 0", "GRAIN 0 · REGISTER 2", "기본 · 1/3 크기"], results.plates.standard.map((row) => [
    nameOf(row.id),
    `평균 ${clean[row.id].mean} · 최대 ${clean[row.id].max}`,
    `평균 ${slip[row.id].mean} · 최대 ${slip[row.id].max}`,
    small[row.id] ? `평균 ${small[row.id].mean} · 최대 ${small[row.id].max}` : "—"
  ])));
  line();
  line("1/3 크기의 평균 색.");
  line();
  line(table(["판", "옛", "새"], results.plates.contact.map((row) => [nameOf(row.id), rgbText(row.old), rgbText(row.new)])));
  line();

  line("## 종이결");
  line();
  line(table(["", "평균 색", "빨강 채널 표준편차"], ["old", "new"].map((side) => [
    side === "old" ? "옛" : "새", rgbText(results.paper[side].rgb), results.paper[side].red.sd
  ])));
  line();

  line("## 이음매");
  line();
  line("초당 여덟 장. 이웃 프레임의 차이를 한 바퀴 재고 마지막 걸음의 z를 씨앗마다 적었다. 두 인쇄기의 값이 씨앗마다 같으면 이음매는 판화의 것이고 인쇄기와 무관하다.");
  line();
  line(table(["판", "끓음", "옛", "새"], Object.entries(results.seam).flatMap(([id, byBoil]) =>
    Object.entries(byBoil).map(([boil, pair]) => [nameOf(id), boil.toUpperCase(), pair.old.join(" "), pair.new.join(" ")])
  )));
  line();

  line("## 그림");
  line();
  line("같은 롤, 같은 프레임. 왼쪽이 옛 인쇄기다.");
  line();
  line("![판 전체](sheets.jpg)");
  line();
  line("![망점 1:1](screen.png)");
  line();
  return out.join("\n");
}
