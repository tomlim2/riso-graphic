// 판화 목록. 한 장이 곧 하나의 함수이고, 여기 등록된 것이 화면에 뜨는 전부다.
//
// 구성을 코드 한 덩어리로 두면 새 장을 하나 그리려 할 때마다 그 덩어리를 건드려야 한다.
// 이름 붙은 함수로 떼어 두면 장끼리 서로를 깨뜨리지 못하고, 콘택트 시트가 전부를 한눈에
// 펼쳐 비교할 수 있다.

import { poster } from "./poster.js";
import { medium } from "./medium.js";
import { moon } from "./moon.js";
import { garden } from "./garden.js";

export const PLATES = [poster, medium, moon, garden];

export function plateById(id) {
  return PLATES.find((plate) => plate.id === id) || PLATES[0];
}
