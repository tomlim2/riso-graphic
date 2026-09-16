// 판화 목록. 한 장이 곧 하나의 함수이고, 여기 등록된 것이 화면에 뜨는 전부다.
//
// 지금 걸려 있는 판은 RIPPLE 하나다. POSTER · MEDIUM · MOON · GARDEN 도 이 폴더에 그대로
// 있고, 아래에 한 줄씩 더하면 판화 고르개와 콘택트 시트에 함께 돌아온다. 목록이 하나뿐일
// 때는 고르개가 아예 숨는다 — 고를 것이 없는 자리를 남겨 둘 이유가 없다.
//
//   import { poster } from "./poster.js";
//   import { medium } from "./medium.js";
//   import { moon } from "./moon.js";
//   import { garden } from "./garden.js";

import { ripple } from "./ripple.js";

export const PLATES = [ripple];

export function plateById(id) {
  return PLATES.find((plate) => plate.id === id) || PLATES[0];
}
