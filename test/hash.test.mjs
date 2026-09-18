// 주소가 같은 장을 되읽는지. 마음에 든 장을 링크로 남기는 자리라, 읽는 법이 바뀌어 예전 링크가 다른
// 장을 찍으면 그것은 깨진 것이다.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHash, encodeHash, applyKnobs } from "../src/hash.js";
import { SCOPE_KNOBS } from "../src/scope.js";

// 판 둘. 하나는 제 손잡이만, 하나는 시야의 손잡이까지 내놓는다
const RIPPLE = { id: "ripple", knobs: [{ key: "rings", min: 1, max: 12, step: 1, value: 3 }, { key: "field", min: 0, max: 199, step: 1, value: 0 }] };
const CELL = { id: "cell", knobs: [{ key: "count", min: 3, max: 30, step: 1, value: 9 }], scope: SCOPE_KNOBS };
const PLATES = [RIPPLE, CELL];
const plateById = (id) => PLATES.find((plate) => plate.id === id) || PLATES[0];

const DEFAULTS = { plate: "ripple", seed: 1, palette: 0, drums: 3, cell: 9, grain: 0.35, register: 2, headline: "", grid: "off", frame: 0, hold: 3, boil: "twos", guides: false };
const OPTIONS = {
  plateById,
  palettes: 9,
  holds: [1, 2, 3],
  grids: ["off", "plates", "inks", "frames"],
  boils: ["held", "twos", "every"],
  frames: 48,
  defaults: DEFAULTS
};

const defaultsOf = (list = []) => Object.fromEntries(list.map((knob) => [knob.key, knob.value]));

// 주소 하나를 화면이 하듯 읽는다. 다이얼과 판의 손잡이와 시야의 손잡이
function read(hash) {
  const { knobs, scope, ...dials } = parseHash(hash, OPTIONS);
  const state = { ...DEFAULTS, ...dials };
  const plate = plateById(state.plate);
  const knobValues = defaultsOf(plate.knobs);
  const scopeValues = defaultsOf(SCOPE_KNOBS);
  applyKnobs({ knobs, scope }, plate, CELL, knobValues, scopeValues);
  return { state, knobValues, scopeValues };
}

test("오늘 쓴 주소는 같은 설정으로 되읽힌다", () => {
  const state = { ...DEFAULTS, plate: "cell", seed: 2957031601, palette: 4, drums: 2, cell: 12, grain: 0.5, register: 4, frame: 17, hold: 2, boil: "every", grid: "inks", guides: true, headline: "리소 판화" };
  const knobValues = { count: 21 };
  const scopeValues = { frame: 0.61, vignette: 0.25 };
  const back = read(`#${encodeHash(state, CELL, knobValues, scopeValues)}`);
  assert.deepEqual(back.state, state);
  assert.deepEqual(back.knobValues, knobValues);
  assert.deepEqual(back.scopeValues, scopeValues);
});

test("0.36.0 이전의 주소도 그대로 읽힌다", () => {
  const back = read("#plate=ripple&seed=42&p=3&drums=3&cell=9&grain=0.35&reg=2&f=5&hold=3&boil=twos&k=rings:7|field:12");
  assert.equal(back.state.plate, "ripple");
  assert.equal(back.state.seed, 42);
  assert.equal(back.state.palette, 3);
  assert.equal(back.state.frame, 5);
  assert.deepEqual(back.knobValues, { rings: 7, field: 12 });
});

test("시야의 손잡이가 k에 섞여 온 예전 주소도 시야로 받는다", () => {
  const back = read("#plate=cell&seed=7&k=count:14|frame:0.5|vignette:0.8");
  assert.deepEqual(back.knobValues, { count: 14 });
  assert.deepEqual(back.scopeValues, { frame: 0.5, vignette: 0.8 });
});

test("s가 있으면 시야는 s에서만 읽는다", () => {
  const back = read("#plate=cell&k=count:14|frame:0.5&s=frame:0.66|vignette:0.1");
  assert.deepEqual(back.scopeValues, { frame: 0.66, vignette: 0.1 });
});

test("손으로 고친 숫자는 기본값으로 돌아가거나 끝값에 앉는다", () => {
  const junk = read("#plate=nope&seed=x&p=x&drums=9&cell=x&grain=abc&reg=zz&f=-3&hold=7&boil=hot&grid=all");
  assert.equal(junk.state.plate, "ripple");
  assert.equal(junk.state.seed, 0);
  assert.equal(junk.state.palette, DEFAULTS.palette);
  assert.equal(junk.state.drums, DEFAULTS.drums);
  assert.equal(junk.state.cell, DEFAULTS.cell);
  assert.equal(junk.state.grain, DEFAULTS.grain);
  assert.equal(junk.state.register, DEFAULTS.register);
  assert.equal(junk.state.frame, 0);
  assert.equal(junk.state.hold, DEFAULTS.hold);
  assert.equal(junk.state.boil, DEFAULTS.boil);
  assert.equal(junk.state.grid, "off");

  const wide = read("#p=1.5&cell=40&grain=-3&reg=2.5&f=50");
  assert.equal(wide.state.palette, 2);
  assert.equal(wide.state.cell, 16);
  assert.equal(wide.state.grain, 0);
  assert.equal(wide.state.register, 2.5);
  assert.equal(wide.state.frame, 2);
});

test("판이 내놓지 않은 열쇠는 버리고, 범위를 넘는 손잡이는 끝값에 앉는다", () => {
  const back = read("#plate=ripple&k=rings:99|field:x|ghost:3");
  assert.deepEqual(back.knobValues, { rings: 12, field: 0 });
});
