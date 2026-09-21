// 판화 목록. 한 장이 곧 하나의 함수이고, 여기 등록된 것이 화면에 뜨는 전부다.
//
// POSTER · MEDIUM · WHALE 도 이 폴더에 그대로 있다. 아래에 한 줄씩 더하면 판화 고르개와
// 콘택트 시트에 함께 돌아온다. 목록이 하나뿐일 때는 고르개가 아예 숨는다 — 고를 것이 없는
// 자리를 남겨 둘 이유가 없다.
//
//   import { poster } from "./poster.js";
//   import { medium } from "./medium.js";
//   import { whale } from "./whale.js";
//
// WHALE은 걸지 않는다. 까닭은 README의 '여기 어울리지 않는 것'에 적어 두었다.

import { ripple } from "./ripple.js";
import { moon } from "./moon.js";
import { garden } from "./garden.js";
import { jelly } from "./jelly.js";
import { cell } from "./cell.js";
import { chloro } from "./chloro.js";
import { cosmos } from "./cosmos.js";
import { flake } from "./flake.js";
import { kaleido } from "./kaleido.js";
import { meteor } from "./meteor.js";
import { ghost } from "./ghost.js";

// 첫째가 기본이다.
export const PLATES = [ripple, moon, garden, jelly, cell, chloro, cosmos, flake, kaleido, meteor, ghost];

export function plateById(id) {
  return PLATES.find((plate) => plate.id === id) || PLATES[0];
}
