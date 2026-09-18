// 주소. 한 장을 이루는 설정을 주소의 # 뒤에 싣고 되읽는다. 마음에 든 장을 링크로 남기는 자리라
// 예전 주소가 예전 장을 그대로 찍어야 한다. 읽는 법을 고치면 test/hash.test.mjs를 돌린다.
//
// 화면에도 DOM에도 기대지 않는다. 판과 배색과 박자의 목록은 부르는 쪽이 넘긴다(options).
//
//   plateById  판의 이름을 판으로. 모르는 이름이면 첫째 판
//   palettes   배색의 수
//   holds      한 장을 잡아 두는 프레임 수들
//   grids      콘택트 시트의 종류들
//   boils      끓음의 종류들
//   frames     한 바퀴의 프레임 수
//   defaults   화면의 기본값. 읽지 못한 값은 이리로 돌아간다

// 주소의 숫자. 숫자가 아니면 기본값으로, 범위를 넘으면 끝값으로 앉힌다. 손으로 고친 주소가
// 화면을 멈추면 안 된다 — #p=x는 배색을 PALETTES[NaN]으로, #cell=x는 셰이더에 NaN을 넘겼다.
// whole이면 정수로 반올림한다. 배색 번호는 1.5일 수 없다
export function numberIn(text, min, max, fallback, whole = false) {
  const value = Number(text);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, whole ? Math.round(value) : value));
}

// 주소를 읽는다. 주소에 없는 것은 빼고 돌려주므로 부르는 쪽이 기본값 위에 얹는다. 판의 손잡이(k)와
// 시야의 손잡이(s)는 판을 알아야 읽을 수 있어 글자 그대로 knobs · scope로 넘긴다. applyKnobs가 읽는다
export function parseHash(hash, options) {
  const { plateById, palettes, holds, grids, boils, frames, defaults } = options;
  const raw = hash.replace(/^#/, "");
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  const out = {};
  if (params.has("plate")) out.plate = plateById(params.get("plate")).id;
  if (params.has("seed")) out.seed = Number(params.get("seed")) >>> 0;
  if (params.has("p")) out.palette = numberIn(params.get("p"), 0, palettes - 1, defaults.palette, true);
  if (params.has("drums")) out.drums = [2, 3].includes(Number(params.get("drums"))) ? Number(params.get("drums")) : defaults.drums;
  if (params.has("cell")) out.cell = numberIn(params.get("cell"), 3, 16, defaults.cell);
  if (params.has("grain")) out.grain = numberIn(params.get("grain"), 0, 0.6, defaults.grain);
  if (params.has("reg")) out.register = numberIn(params.get("reg"), 0, 5, defaults.register);
  if (params.has("t")) out.headline = params.get("t");
  if (params.has("grid")) out.grid = grids.includes(params.get("grid")) ? params.get("grid") : defaults.grid;
  if (params.has("f")) out.frame = Math.max(0, Number(params.get("f")) | 0) % frames;
  if (params.has("hold")) out.hold = holds.includes(Number(params.get("hold"))) ? Number(params.get("hold")) : defaults.hold;
  if (params.has("boil")) out.boil = boils.includes(params.get("boil")) ? params.get("boil") : defaults.boil;
  if (params.has("guides")) out.guides = params.get("guides") === "1";
  if (params.has("k")) out.knobs = params.get("k");
  if (params.has("s")) out.scope = params.get("s");
  return out;
}

// "열쇠:값|열쇠:값"을 values에 앉힌다. 목록(list)에 없는 열쇠는 버리고, 범위를 넘으면 끝값으로
export function takeKnobs(raw, list, values) {
  for (const pair of raw.split("|")) {
    const [key, text] = pair.split(":");
    const knob = list.find((item) => item.key === key);
    if (!knob) continue;
    const value = Number(text);
    if (Number.isFinite(value)) values[key] = Math.max(knob.min, Math.min(knob.max, value));
  }
}

// 주소에 실려 온 손잡이를 앉힌다. k는 걸린 판(plate)의 것이다. 시야의 손잡이는 s에 따로 실려 오고,
// 시야를 내놓는 판(holder)의 목록으로 읽는다. 예전 주소는 시야의 것도 k에 섞어 실었으므로, s가
// 없으면 k에서 시야의 것도 찾는다. 시야의 값은 판끼리 나눠 쓰는 한 벌(scopeValues)이다
export function applyKnobs({ knobs, scope }, plate, holder, knobValues, scopeValues) {
  if (knobs) {
    takeKnobs(knobs, plate.knobs || [], knobValues);
    if (!scope) takeKnobs(knobs, plate.scope || [], scopeValues);
  }
  if (scope && holder) takeKnobs(scope, holder.scope, scopeValues);
}

// 주소를 쓴다. 걸린 판의 손잡이만 싣는다 — 판마다 열쇠가 다르므로 섞어 담을 수 없다. 시야의
// 손잡이는 판끼리 나눠 쓰므로 s에 따로 싣는다
export function encodeHash(state, plate, knobValues, scopeValues) {
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
  if (state.guides) params.set("guides", "1");

  const packed = Object.entries(knobValues).map(([key, value]) => `${key}:${value}`).join("|");
  if (packed) params.set("k", packed);
  if (plate.scope?.length) params.set("s", plate.scope.map((knob) => `${knob.key}:${scopeValues[knob.key]}`).join("|"));
  return params.toString();
}
