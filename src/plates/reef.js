// 산호초. 한 장의 걸작으로 짓는다. 잠수부가 모래 위에 솟은 산호 둔덕(봄미) 하나를 둔덕의 허리 높이에서
// 마주 본다. 둔덕 옆구리에서 탁상형 산호가 층층이 판을 내밀고, 판 사이로 가지형 산호가 흰 끝을 세우며,
// 스틸로포라가 분홍 끝의 가지 무더기로 곳곳에 앉는다. 둔덕 앞 왼쪽 모래에는 붉은 그물 부채가 크게 서고, 왼쪽
// 모래에 하나 더 선다. 뒤로는 먼 둔덕들이 한 켜씩 물빛에 묻히고, 왼쪽 위에서 햇빛 줄기가 내려온다. 구도는
// 레퍼런스 사진(플린 리프의 산호 둔덕)을 따른다.
//
// 구도는 한 번 고른 것이라 롤을 따라 바뀌지 않는다 — 롤은 인쇄기의 망점과 판 어긋남만 바꾼다. 산호 하나하나는
// 그리지 않는다. 산호가 자라는 규칙과 조사자가 잰 치수로 짓는다.
//
//   둔덕    산호초의 뼈대(죽은 산호가 쌓여 굳은 바위)가 모래 위에 무더기로 솟은 것. 1미터 넘게 솟고, 옆은
//           가파르고 머리는 둥글다. 주인공 둔덕은 2미터다. 겉은 산 산호가 90%를 넘게 덮는다 — 이름 있는 군체
//           사이를 작은 군체로 채우되, 판에 비친 원이 이웃과 조금씩 겹치는 자리에만 앉혀 보이는 겉이 빈틈없이
//           덮인다. 드러난 틈은 산호말(석회조류)이 덮은 바위의 깊은 그늘이다. 채우는 군체의 지름은 로그가 정규
//           분포를 따른다(가운데값 30센티, log10의 표준편차 0.28)
//   가지형  사슴뿔 산호. 줄기가 곧게 뻗으며 마디마다 곁가지를 60~90도로 낸다. 가지는 지름 1.2센티의 원기둥이고
//           새로 자라는 끝이 하얗다. 군체는 폭의 절반 높이다. 파도를 세게 받으면 촘촘하다
//   탁상형  가는 줄기 위의 수평한 판. 판은 넓든 좁든 바닥 위 0.43미터에 앉는다. 둔덕에서는 줄기 없이 한쪽이
//           붙어 선반처럼 판을 내민다. 눈보다 낮은 판은 윗면을 — 25밀리가 안 되는 곁가지의 흰 끝이 점점이
//           박혔다 — , 높은 판은 하얀 테 밑의 어두운 밑면을 보인다(테는 새로 자라는 자리라 하얗다). 옆에서 본
//           판은 한 줄 금이 되므로 눈높이에는 두지 않고, 올려다보면 가는 띠가 되는 작은 판도 두지 않는다
//   분홍    스틸로포라. 한 밑동에서 굵고 뭉툭한 가지들이 두 갈래씩 갈라지며 둥근 무더기를 이룬다(얕은 곳의
//           군체는 둥글고 가지가 굵다). 산호 구멍은 0.85~1.2밀리로 촘촘히 박힌다. 다 자란 군체는 20~25센티이고
//           50센티까지 큰다. 빛깔은 한 가지로 크림 · 분홍 · 초록이고, 새로 자라는 가지 끝은 색소 단백질이 모여
//           분홍이 짙다
//   부채    붉은 그물 부채. 한 평면에 펼친다. 굵고 짧은 줄기가 밑동 가까이에서 굵은 가지 몇으로 갈라져 부챗살처럼
//           퍼지고, 옆에 가지 하나가 들어설 틈이 벌어지면 곁가지를 낸다. 끝가지(2~4밀리)는 다른 가지에 닿으면
//           대개 이어 붙어(문합) 그물을 닫는다. 2미터까지 큰다. 평면은 파도가 밀고 당기는 방향을 마주 보되, 작은
//           부채는 아무 쪽이나 보고 클수록 반듯이 마주 본다
//   빛깔    공생조류와 색소가 군체마다 달라, 같은 생장형도 빛깔이 여럿이다. 군체마다 제 씨앗으로 한 벌을 고른다
//   물      검은 과녁이 물빛에 묻히는 거리(시정)는 빛줄기 감쇠계수의 4.8분의 1이다. 대비는 e^-cr로 준다. 산호는
//           종이까지 파내 제 빛깔로 찍고 그 앞의 물을 막으로 덮는다. 물은 붉은빛을 먼저 먹는다 — 눈은 둔덕에
//           빛깔을 맞추므로(수중 사진가가 피사체까지의 거리에 화이트 밸런스를 맞추듯) 둔덕보다 먼 것만 붉은
//           통이 노란 통보다 빨리 옅어진다. 올려다본 물이 가장 밝고 눈높이의 먼 물이 짙다
//   빛      햇빛은 물에 들며 꺾여 천정에서 48.6도 안쪽으로 온다. 빛줄기는 나란하므로 판에서는 꺾인 해에서
//           부챗살처럼 퍼진다. 물결이 햇빛을 모았다 흩으므로 빛줄기마다 밝기가 다르다
//
// 움직이지 않는 한 장이다. 한 번 찍어 쥐고 있다가 장마다 그대로 옮기고, 인쇄기의 망점과 판 어긋남만 장마다
// 바뀐다
//
// 참고: 구도(Toby Hudson, Coral Outcrop Flynn Reef, Wikimedia Commons), 생장형(English, Wilkinson & Baker 1997),
// 군체 크기의 로그정규 분포(Bak & Meesters 1998, Medina-Valmaseda 외 2020), 사슴뿔 산호(Acropora Biological
// Review Team 2005, Agudo-Adriani 외 2016), 탁상형의 높이와 곁가지(Kerry 2015, Ferrari 외 2017, Corals of the
// World), 스틸로포라(Veron, Corals of the World, Einbinder 외 2009, Kramer 외 2022), 가지 끝의 색소(D'Angelo 외
// 2012), 부채산호의 그물과 방향(Bayer 1961, Wainwright & Dillon 1969, Branch 외 2010), 둔덕(Goreau 1959), 물의
// 흡수(Pope & Fry 1997), 시정(Zaneveld & Pegau 2003), 물속의 밝기(Tyler 1958), 빛줄기의 깜박임(Hieronymi 외
// 2012).

import { makeRng } from "../rng.js";
import * as shapes from "../shapes.js";
import { bluest, reddest, yellowest, rgbOf } from "../drums.js";
import { carve, stain } from "../night.js";
import { stainsFor, soak } from "../stains.js";
import { keeper } from "../keep.js";
import { Separation } from "../press.js";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// 눈. 모래 위 1.6미터 — 둔덕의 허리께 — 에 떠서 모래와 나란히 본다. 화각은 60도다
const FOV = 60 * DEG;
const EYE = 1.6;
const LOOK = 0;
// 구도를 뽑은 롤. 종이의 롤이 바뀌어도 그림은 바뀌지 않는다
const ROLL = 0x5eef1a2b;
// 물의 굴절률
const WATER = 1.333;
// 가로 시정. 검은 과녁이 물빛에 묻히는 거리는 빛줄기 감쇠계수 c의 4.8분의 1이다
const SIGHT = 4.8;
// 대비가 이보다 낮으면 찍지 않고, 이보다 높으면 제 꼴을 다 찍는다. 그 사이는 윤곽만 몇 켜로 끊어 찍는다
const FAINT = 0.03;
const DETAIL = 0.3;
const LAYERS = 5;
// 채우는 군체의 지름. 지름의 로그가 정규 분포를 따른다(가운데값 14~36센티, log10의 표준편차 0.25~0.3)
const MEDIAN = 0.3;
const SPREAD = 0.28 * Math.LN10;
const SMALLEST = 0.06;
// 물이 빛깔을 먹는 정도(1/미터). 붉은빛이 가장 먼저 사라지고 노란빛은 오래 간다(순수한 물의 흡수, 650nm와
// 600nm 사이, 575nm)
const EAT_WARM = 0.25;
const EAT_SUN = 0.077;
// 눈이 빛깔을 맞춘 거리(미터). 주인공 둔덕까지다
const FOCUS = 4;
// 바닥을 켜로 잘라 뒤에서 앞으로 찍는다. 이웃한 켜의 판 위 간격(픽셀)
const SLICE = 7;

// 가지형(사슴뿔 산호). 가지 지름(0.25~1.5센티), 곁가지 사이(가지 지름의 배수), 곁가지가 나가는 각(60~90도)
const TWIG = 0.012;
const NODE = 5;
const FORK = 75 * DEG;
// 탁상형. 판의 높이(미터 — 판이 넓든 좁든 바닥 위 0.43미터에 앉는다), 두께, 테의 가지 끝 사이
const LIFT = 0.43;
const PLATE = 0.07;
const RIM = 0.04;
// 스틸로포라. 가지의 지름(군체 지름에 대한 몫 — 사진에서 잰 비), 두 갈래로 갈라지는 마디 사이(가지 지름의
// 배수), 두 갈래가 벌어지는 각, 무더기의 높이(지름에 대한 몫 — 얕은 곳의 군체는 둥글다), 산호 구멍의 지름
// (0.85~1.2밀리), 군체의 가장 큰 지름(50센티)
const KNOB = 0.08;
const JOINT = 1.8;
const SPLIT = 50 * DEG;
const HEAP = 0.6;
const PORE = 0.001;
const HEAPED = 0.5;
// 붉은 부채산호. 폭(키에 대한 비), 그물눈(잔가지가 3~6밀리마다 나서 이어 붙는다), 끝가지와 밑동 줄기의 지름
// (끝가지 2~4밀리), 곁가지를 낼 수 있는 마디 사이(그물눈의 배수), 곁가지가 나가는 각, 가지가 부챗살 쪽으로
// 휘는 정도, 다른 가지에 닿은 끝이 그 가지에 이어 붙는 몫
const FAN_WIDE = 1.3;
const MESH = 0.0045;
const FAN_TIP = 0.003;
const FAN_STEM = 0.04;
const FAN_NODE = 1.6;
const FAN_FORK = 45 * DEG;
const PULL = 0.15;
const FUSE = 0.7;

// 판의 망점 한 칸. 이보다 가는 무늬는 망점에 녹는다
const CELL = 9;

// 산호의 빛깔. 공생조류와 색소가 군체마다 달라 같은 생장형도 빛깔이 여럿이다. 군체마다 제 씨앗으로 한 벌을
// 고른다. 통은 역할로 적는다 — warm은 가장 붉은 통, sun은 가장 노란 통, water는 가장 푸른 통, key는 가장 짙은 통
const TINTS = [
  // 가지형: 분홍, 황갈, 연어
  [[["warm", 0.9]], [["sun", 0.65], ["warm", 0.35], ["key", 0.12]], [["warm", 0.55], ["sun", 0.5]]],
  // 탁상형: 연어, 황갈, 분홍
  [[["warm", 0.55], ["sun", 0.5]], [["sun", 0.6], ["warm", 0.25], ["key", 0.12]], [["warm", 0.75], ["sun", 0.2]]],
  // 스틸로포라: [가지, 끝] — 크림에 분홍 끝, 분홍, 초록
  [[[["sun", 0.35], ["warm", 0.12]], [["warm", 0.75], ["water", 0.12]]], [[["warm", 0.55], ["sun", 0.2]], [["warm", 0.8]]], [[["sun", 0.45], ["water", 0.35]], [["sun", 0.5], ["water", 0.45]]]],
  // 붉은 부채산호: 빨강, 주홍, 검붉음
  [[["warm", 1]], [["warm", 0.9], ["sun", 0.35]], [["warm", 0.9], ["water", 0.25]]]
];

// 둔덕들. 첫째가 주인공이다. 가운데(x는 오른쪽, z는 눈앞으로, 미터), 발자국의 반지름, 높이, 겉의 굽이, 겉을
// 산 산호가 덮는 몫
const MOUNDS = [
  { x: 0.3, z: 3.6, rx: 1.5, rz: 1.1, tall: 2.0, lumps: [0.7, 2.1, 4.4], cover: 3.2 },
  { x: -4.6, z: 9.5, rx: 2.2, rz: 1.8, tall: 2.2, lumps: [1.9, 0.4, 2.8], cover: 0.8 },
  { x: 0.8, z: 14, rx: 3.2, rz: 2.4, tall: 2.6, lumps: [3.1, 1.2, 0.9], cover: 0.8 },
  { x: 6.5, z: 17, rx: 3.4, rz: 2.6, tall: 3.0, lumps: [5.0, 2.6, 1.7], cover: 0.8 }
];

// 이름 있는 군체. form은 0 가지형 · 1 탁상형 · 2 스틸로포라 · 3 붉은 부채산호. on은 [둔덕, 방위(도 — 0이 눈 쪽, 오른쪽이
// +), 한가운데에서 가장자리까지의 몫], at은 모래 위의 자리(x, z). y를 주면 둔덕 겉 대신 그 높이에 붙는다. 몫을
// 빼면 그 방위에서 둔덕 겉이 y에 닿는 자리에 붙는다. size는 지름(부채는 높이, 미터), dense는 가지형이 촘촘한
// 정도(파도를 받은 만큼), seed는 제 생김새를 뽑는 씨앗이다
const HEROES = [
  // 탁상형. 둔덕 옆구리에서 선반처럼 층층이 내민다 — 둔덕 겉이 판의 높이에 닿는 자리에 붙어, 판의 안쪽 끝이
  // 겉에 묻힌다. 눈(1.6미터)보다 낮은 판은 윗면을, 높은 판은 밑면을 보인다. 눈높이 가까이에는 두지 않는다 —
  // 옆에서 본 판은 한 줄 금이 된다
  { form: 1, on: [0, 72], y: 1.0, size: 1.7, seed: 11 },
  { form: 1, on: [0, 84], y: 0.45, size: 1.4, seed: 12 },
  { form: 1, on: [0, 12], y: 0.7, size: 1.1, seed: 13 },
  { form: 1, on: [0, 34], y: 1.95, size: 0.95, seed: 14 },
  { form: 1, on: [0, -22], y: 1.95, size: 1.05, seed: 15 },
  { form: 1, on: [0, 18], y: 2.12, size: 0.9, seed: 16 },
  { form: 1, on: [0, -74], y: 2.0, size: 1.3, seed: 17 },
  // 가지형. 판 사이와 머리에 작고 촘촘한 덤불로 선다
  { form: 0, on: [0, -45, 0.55], y: 1.75, size: 0.55, dense: 0.8, seed: 21 },
  { form: 0, on: [0, 2, 0.28], y: 2.02, size: 0.6, dense: 0.8, seed: 22 },
  { form: 0, on: [0, -12, 0.72], y: 1.45, size: 0.5, dense: 0.8, seed: 23 },
  { form: 0, on: [0, 46, 0.56], y: 1.82, size: 0.45, dense: 0.8, seed: 24 },
  { form: 0, on: [0, -62, 0.36], y: 2.0, size: 0.5, dense: 0.6, seed: 25 },
  { form: 0, on: [0, 18, 0.86], y: 0.98, size: 0.45, dense: 0.8, seed: 26 },
  // 스틸로포라. 머리에 둥근 무더기로 앉는다
  { form: 2, on: [0, -4, 0.18], size: 0.5, seed: 32 },
  // 붉은 부채산호. 둔덕 앞 왼쪽 모래에 크게 서서 파도를 마주 보고, 왼쪽 모래에 하나 더 선다
  { form: 3, at: [-0.95, 2.35], size: 1.0, seed: 30 },
  { form: 3, at: [-2.3, 4.2], size: 0.95, seed: 41 }
];
// 채우는 군체의 생장형 몫(가지형, 탁상형, 스틸로포라, 붉은 부채산호)과, 모래를 덮는 몫
const FILL = [0.55, 0.2, 0.25, 0];
const SAND = 0.02;
// 군체끼리 붙는 거리(두 군체의 반지름 합에 대한 몫). 1보다 작으면 가장자리가 서로 겹친다 — 산호는 이웃
// 군체 위로 자라 덮는다
const PACK = 0.4;
// 주인공 둔덕을 채울 때 판에 비친 두 원이 떨어지는 거리(반지름 합에 대한 몫). 1보다 작으면 조금씩 겹친다
const SNUG = 0.58;

const builds = keeper(3);
// 찍어 둔 한 장. 콘택트 시트와 썸네일은 작은 종이에 배색 여럿으로 찍으므로, 작은 종이의 것은 따로 더 많이 쥔다
const stills = keeper(2);
const smalls = keeper(10);

const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const unit = (p) => {
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / l, p[1] / l, p[2] / l];
};
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
// d에 수직인 두 축
function axesOf(d) {
  const helper = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(d, helper));
  return [u, cross(d, u)];
}
// d를 angle만큼, spin 쪽으로 기울인다
function tilt(d, angle, spin) {
  const [u, v] = axesOf(d);
  const side = add(add([0, 0, 0], u, Math.cos(spin)), v, Math.sin(spin));
  return unit(add(add([0, 0, 0], d, Math.cos(angle)), side, Math.sin(angle)));
}

// 여러 조각을 한 길에 모아 칠할 때는 조각을 모두 같은 방향으로 감는다. 방향이 엇갈리면 겹친 자리에서 감김이
// 서로 지워져 구멍이 난다
function piece(path, points) {
  shapes.polySubpath(path, shapes.signedArea(points) < 0 ? [...points].reverse() : points, true);
}

// 가지형(사슴뿔 산호) 군체. 줄기 몇이 바닥 한가운데서 비스듬히 올라 곧게 뻗고, 마디마다 곁가지를 60~90도로
// 낸다. 곁가지도 같은 규칙으로 자란다. 가지는 원기둥이라 끝까지 굵기가 같다. 군체는 폭의 절반 높이의 덤불로
// 자라고(높이 27~80센티에 길이 50~175센티), 그 둘레 밖으로 나가는 가지는 거기서 멎어 끝이 된다. 가지 끝은
// 새로 자라는 자리라 공생조류가 적어 하얗다. 파도를 세게 받는 군체는 작고 촘촘하다 — 곁가지 사이가 짧고
// 곁가지가 잦다
function branching(rng, diameter, hand, surge) {
  const radius = diameter / 2;
  const tall = diameter * 0.5;
  const node = TWIG * NODE * (1 - 0.4 * surge);
  const side = 0.5 + 0.3 * surge;
  const inside = ([x, y, z]) => y >= 0 && (x * x + z * z) / (radius * radius) + (y * y) / (tall * tall) <= 1;
  const segs = [];
  const tips = [];
  const queue = [];
  const trunks = rng.int(3, 5);
  for (let i = 0; i < trunks; i += 1) {
    const az = (i / trunks) * TAU + rng.float(-0.6, 0.6);
    const lean = rng.float(0.3, 0.9);
    queue.push({ p: [0, 0, 0], d: [Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az)] });
  }
  let head = 0;
  for (; head < queue.length && segs.length < 600; head += 1) {
    const { p, d } = queue[head];
    const length = node * rng.float(0.7, 1.3);
    const bend = rng.float(0, 0.25) * hand;
    const spin = rng.float(0, TAU);
    const lateral = rng.next() < side;
    const angle = FORK + rng.float(-15, 15) * DEG;
    const roll = rng.float(0, TAU);
    const q = add(p, d, length);
    if (!inside(q)) {
      tips.push({ p, d });
      continue;
    }
    segs.push([p, q]);
    // 줄기는 곧게 이어 가되 조금 휘고, 빛 쪽으로 조금 든다. 곁가지는 옆으로 나가 위로 휜다
    queue.push({ p: q, d: unit(add(tilt(d, bend, spin), [0, 1, 0], 0.1)) });
    if (lateral) queue.push({ p: q, d: unit(add(tilt(d, angle, roll), [0, 1, 0], 0.35)) });
  }
  // 다 자라지 못하고 멎은 가지도 끝이다
  for (; head < queue.length; head += 1) tips.push(queue[head]);
  return { segs, tips, tall };
}

// 탁상형 군체. 가는 줄기 위에 수평한 판이 앉는다. 판은 한가운데서 퍼지는 가지들이 갈라지며 짠
// 것이라, 테에는 가지 끝이 고른 간격으로 늘어선다. 윗면에는 25밀리가 안 되는 곁가지가 촘촘히 선다
function table(rng, diameter, hand, shelf) {
  const radius = diameter / 2;
  // 판은 넓든 좁든 바닥 위 같은 높이에 앉는다(자라며 판은 넓어지고 줄기는 굵어진다). 아주 작은 판만 낮다.
  // 둔덕 옆구리에 붙은 판은 줄기 없이 한쪽이 붙어 선반처럼 내민다
  const lift = (shelf ? 0.1 : Math.min(LIFT, diameter * 0.8)) * rng.float(0.94, 1.06);
  const count = Math.max(12, Math.round((TAU * radius) / RIM));
  const rim = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * TAU + rng.float(-0.4, 0.4) * (TAU / count);
    rim.push({ a, r: radius * (1 - rng.next() * 0.1 * (0.4 + hand)) });
  }
  return { radius, lift, rim, stalk: Math.max(0.03, radius * 0.12) };
}

// 스틸로포라(분홍 가지 산호) 군체. 한 밑동에서 굵고 뭉툭한 가지 몇이 비스듬히 올라, 마디마다 두 갈래로
// 갈라지며 둥근 무더기를 채운다(얕은 곳의 군체는 둥글고 가지가 굵다). 무더기 밖으로 나가려는 가지는 거기서 멎어
// 뭉툭한 끝이 된다. ends는 끝을 단 가지다 — 새로 자라는 끝은 분홍 색소가 짙다
function stylophora(rng, size, hand) {
  const diameter = Math.min(HEAPED, size);
  const radius = diameter / 2;
  const tall = diameter * HEAP;
  const thick = diameter * KNOB;
  const inside = ([x, y, z]) => y >= 0 && (x * x + z * z) / (radius * radius) + (y * y) / (tall * tall) <= 1;
  const segs = [];
  const ends = new Set();
  const queue = [];
  const trunks = rng.int(3, 4);
  for (let i = 0; i < trunks; i += 1) {
    const az = (i / trunks) * TAU + rng.float(-0.5, 0.5);
    const lean = rng.float(0.35, 0.8);
    queue.push({ p: [0, 0, 0], d: [Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az)], from: -1 });
  }
  for (let head = 0; head < queue.length && segs.length < 240; head += 1) {
    const { p, d, from } = queue[head];
    const q = add(p, d, thick * JOINT * rng.float(0.8, 1.2));
    if (!inside(q)) {
      if (from >= 0) ends.add(from);
      continue;
    }
    segs.push([p, q]);
    // 두 갈래는 어미 가지를 사이에 두고 벌어지며, 빛 쪽으로 조금 든다
    const roll = rng.float(0, TAU);
    const half = (SPLIT / 2) * rng.float(0.8, 1.2) * (1 + 0.3 * hand * rng.float(-1, 1));
    for (const turn of [roll, roll + Math.PI]) queue.push({ p: q, d: unit(add(tilt(d, half, turn), [0, 1, 0], 0.15)), from: segs.length - 1 });
  }
  return { segs, ends, tall, thick };
}

// 붉은 부채산호(그물 부채). 한 평면에 펼친 부채다. 굵고 짧은 줄기가 밑동 가까이에서 굵은 가지 몇으로 갈라져
// 부챗살처럼 퍼진다. 가지 끝은 밑동 아래 한 점에서 부챗살처럼 뻗는 쪽으로 휘고, 옆에 가지 하나가 들어설 틈
// (그물눈의 두 배)이 벌어지면 그쪽으로 곁가지를 낸다 — 부채가 넓어지는 만큼 가지가 늘어 그물눈이 고르다. 끝이
// 다른 가지에 그물눈보다 가까이 다가가면 대개 그 가지에 이어 붙어(문합) 그물을 닫고, 아니면 거기서 멎는다.
// 가지는 끝으로 갈수록 가늘다(갈라진 끝가지 수의 세제곱근). 평면은 파도가 밀고 당기는 방향을 마주 본다 — 작은
// 부채는 아무 쪽이나 보고, 클수록 반듯이 마주 본다
function seaFan(rng, height, gapAt, hand) {
  const wide = height * FAN_WIDE * rng.float(0.85, 1.15);
  const gap = Math.max(MESH, gapAt);
  const step = gap * 0.4;
  const ra = wide / 2;
  const cb = height * 0.55;
  const rb = height * 0.45;
  const trunk = height * 0.08;
  const focus = height * 0.12;
  const inside = (a, b) => b >= 0 && ((a / ra) ** 2 + ((b - cb) / rb) ** 2 <= 1 || (b < cb && Math.abs(a) < 0.06 * ra + 0.01));
  // 가지의 점을 칸에 담아 이웃을 찾는다
  const cells = new Map();
  const mark = (a, b, id) => {
    const k = (Math.floor(a / gap) + 4096) * 8192 + Math.floor(b / gap) + 4096;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(a, b, id);
  };
  const around = (a, b, reach, visit) => {
    const ca = Math.floor(a / gap);
    const cbb = Math.floor(b / gap);
    const span = Math.ceil(reach / gap);
    for (let i = ca - span; i <= ca + span; i += 1) {
      for (let k = cbb - span; k <= cbb + span; k += 1) {
        const list = cells.get((i + 4096) * 8192 + k + 4096);
        if (!list) continue;
        for (let n = 0; n < list.length; n += 3) visit(list[n], list[n + 1], list[n + 2]);
      }
    }
  };
  const a0 = [];
  const b0 = [];
  const a1 = [];
  const b1 = [];
  const parent = [];
  const fused = [];
  const grow = (a, b, c, d, from, joint) => {
    a0.push(a);
    b0.push(b);
    a1.push(c);
    b1.push(d);
    parent.push(from);
    fused.push(joint);
    return a0.length - 1;
  };
  const nodeOf = () => FAN_NODE * gap * rng.float(0.8, 1.2);
  // 갓 갈라진 두 가지는 갈래 곁에서 서로 밀어내기만 하고 멎지는 않는다 — kin은 그 짝, immune은 남은 걸음이다
  let tips = [{ a: 0, b: 0, ang: rng.float(-0.06, 0.06), since: 0, id: 0, kin: -1, immune: 0, seg: -1, node: nodeOf() }];
  let ids = 1;
  const spare = Math.ceil((1.6 * gap) / step);
  for (let round = 0; tips.length && round < Math.ceil((3 * height) / step); round += 1) {
    const next = [];
    for (const tip of tips) {
      const other = (id) => id !== tip.id && !(id === tip.kin && tip.immune > 0);
      // 부챗살 쪽으로 휘고(줄기는 곧게 선다), 붐비는 쪽을 비킨다
      const prefer = tip.b < trunk ? 0 : Math.atan2(tip.a, tip.b + focus);
      const bent = tip.ang + (prefer - tip.ang) * PULL + (rng.next() - 0.5) * 0.3 * hand;
      let da = Math.sin(bent);
      let db = Math.cos(bent);
      around(tip.a, tip.b, gap * 2, (a, b, id) => {
        if (id === tip.id) return;
        const d = Math.max(gap * 0.3, Math.hypot(tip.a - a, tip.b - b));
        if (d > gap * 2) return;
        da += ((tip.a - a) / (d * d)) * gap * 0.3;
        db += ((tip.b - b) / (d * d)) * gap * 0.3;
      });
      const ang = Math.atan2(da, db);
      const qa = tip.a + Math.sin(ang) * step;
      const qb = tip.b + Math.cos(ang) * step;
      // 가지는 밖으로만 자란다. 테두리에 닿거나 틈에 갇혀 안쪽으로 돌아서면 멎는다
      if (!inside(qa, qb) || Math.cos(ang - prefer) < 0) continue;
      let hit = null;
      let nearest = gap;
      around(qa, qb, gap, (a, b, id) => {
        if (!other(id)) return;
        const d = Math.hypot(qa - a, qb - b);
        if (d < nearest) {
          nearest = d;
          hit = [a, b];
        }
      });
      if (hit) {
        if (tip.seg >= 0 && rng.next() < FUSE) grow(tip.a, tip.b, hit[0], hit[1], tip.seg, true);
        continue;
      }
      const seg = grow(tip.a, tip.b, qa, qb, tip.seg, false);
      mark(qa, qb, tip.id);
      const one = { ...tip, a: qa, b: qb, ang, since: tip.since + step, seg, immune: tip.immune - 1 };
      if (one.since >= one.node && qb > trunk) {
        // 양옆의 틈을 잰다. 가지 하나가 들어설 만큼 벌어진 쪽으로 곁가지를 내고, 어미 가지는 반대쪽으로 조금
        // 비낀다. 틈이 없으면 곁가지 없이 자란다
        let left = gap * 3;
        let right = gap * 3;
        around(qa, qb, gap * 3, (a, b, id) => {
          if (id === tip.id) return;
          const d = Math.hypot(a - qa, b - qb);
          if (Math.cos(ang) * (a - qa) - Math.sin(ang) * (b - qb) < 0) left = Math.min(left, d);
          else right = Math.min(right, d);
        });
        if (Math.max(left, right) >= gap * 2) {
          const turn = (left > right ? -1 : 1) * FAN_FORK * rng.float(0.85, 1.15);
          next.push({ a: qa, b: qb, ang: ang + turn, since: 0, id: ids, kin: tip.id, immune: spare, seg, node: nodeOf() });
          one.kin = ids;
          one.immune = spare;
          ids += 1;
          one.ang = ang - turn * 0.2;
        }
        one.since = 0;
        one.node = nodeOf();
      }
      next.push(one);
    }
    tips = next;
  }
  // 굵기. 그 가지에서 갈라져 나간 끝가지 수의 세제곱근만큼 굵다. 이어 붙은 가지는 끝가지 굵기다
  const count = new Float32Array(a0.length);
  for (let s = a0.length - 1; s >= 0; s -= 1) {
    if (count[s] === 0) count[s] = 1;
    if (parent[s] >= 0 && !fused[s]) count[parent[s]] += count[s];
  }
  const widths = Array.from(count, (n, s) => (fused[s] ? FAN_TIP : Math.min(FAN_STEM, FAN_TIP * Math.cbrt(n))));
  // 둘레. 그물눈 사이로 물이 비치는 옅은 막이 깔린다
  const outline = [[0, 0]];
  for (let i = 0; i <= 48; i += 1) {
    const t = -0.1 * Math.PI + (i / 48) * 1.2 * Math.PI;
    const [a, b] = [Math.cos(t) * ra, cb + Math.sin(t) * rb];
    if (b >= trunk) outline.push([a, b]);
  }
  const turn = normalOf(rng) * 90 * DEG * Math.exp(-height / 0.35);
  return { a0, b0, a1, b1, widths, outline, height, wide, turn };
}

// 로그정규 분포의 지름
function diameterOf(rng, largest) {
  return Math.min(largest, Math.max(SMALLEST, MEDIAN * Math.exp(SPREAD * normalOf(rng))));
}

// 표준 정규 분포의 한 값
function normalOf(rng) {
  const u = Math.max(1e-9, rng.next());
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

// 둔덕의 높이. 옆이 가파르고 머리가 둥근 무더기에 낮은 굽이가 얹혀 울퉁불퉁하다. 발자국 밖은 0이다
function moundHeight(m, x, z) {
  const dx = (x - m.x) / m.rx;
  const dz = (z - m.z) / m.rz;
  const r = Math.hypot(dx, dz);
  if (r >= 1) return 0;
  const a = Math.atan2(dz, dx);
  const lump = 1 + 0.12 * r * Math.sin(3 * a + m.lumps[0]) + 0.07 * Math.sin(5 * a + m.lumps[1]) + 0.05 * Math.cos(9 * r + m.lumps[2]);
  return m.tall * Math.pow(1 - Math.pow(r, 2.5), 0.6) * lump;
}

// 둔덕의 한 방위에서 겉이 높이 y에 닿는 자리(한가운데에서 가장자리까지의 몫). 가장자리에서 안쪽으로 걸어
// 들어가며 처음 닿는 곳 — 그 방위를 향한 옆구리다
function flankAt(m, a, y) {
  for (let share = 1; share > 0; share -= 0.005) {
    if (moundHeight(m, m.x + Math.sin(a) * share * m.rx, m.z - Math.cos(a) * share * m.rz) >= y) return share;
  }
  return 0;
}

// 눈. 모래 위 EYE 높이에 떠서 LOOK만큼 내려다본다. 판의 한가운데가 눈이 향한 곳이다
function lens(width, height) {
  const focal = width / 2 / Math.tan(FOV / 2);
  const eye = EYE;
  const pitch = LOOK;
  const cos = Math.cos(pitch);
  const sin = Math.sin(pitch);
  const middle = height / 2;
  // 눈앞으로의 깊이. 한 점의 판 위 크기는 이것에 반비례한다
  const depth = (x, y, z) => Math.max(0.05, z * cos - (y - eye) * sin);
  const project = (x, y, z) => {
    const ahead = depth(x, y, z);
    return [width / 2 + (focal * x) / ahead, middle - (focal * ((y - eye) * cos + z * sin)) / ahead];
  };
  // 판의 한 줄(y)을 지나는 시선. 위로 드는 각, 바닥에 닿으면 그 거리와 물속을 지나는 길이
  const row = (y) => {
    const up = (middle - y) / focal;
    const dirY = up * cos - sin;
    const dirZ = up * sin + cos;
    const rise = Math.atan2(dirY, dirZ);
    if (dirY >= 0) return { rise, z: Infinity, path: Infinity };
    const t = eye / -dirY;
    return { rise, z: t * dirZ, path: t * Math.hypot(dirY, dirZ) };
  };
  return { width, height, focal, eye, pitch, horizon: middle - focal * Math.tan(pitch), depth, project, row };
}

// 산호초를 짓는다. 시간과 무관한 것은 모두 여기서 한 번 짓고 쥐고 있는다
function build(knobs, cam) {
  const { height, focal, eye, c, project } = cam;
  const rng = makeRng(ROLL);
  // 눈에서 한 점까지 물속을 지나는 길이
  const reachOf = (x, y, z) => Math.hypot(x, y - eye, z);

  // 바닥의 부채꼴. 판 아래 끝에 걸리는 바닥보다 조금 가까이부터, 대비가 FAINT로 떨어지는 거리까지
  const bottom = cam.row(height).z;
  const near = Math.min(bottom * 0.6, 0.3);
  const far = Math.log(1 / FAINT) / c;
  // 거리 z에서 판의 폭에 드는 바닥의 반폭. 내려다볼수록 앞으로의 깊이가 z보다 길어 넓게 든다
  const spread = Math.tan(FOV / 2) * 1.2;
  const lean = Math.cos(cam.pitch);
  const drop = eye * Math.sin(cam.pitch);
  const halfAt = (z) => spread * (z * lean + drop);
  const lift = (x, z) => {
    let top = 0;
    for (const m of MOUNDS) top = Math.max(top, moundHeight(m, x, z));
    return top;
  };

  // 군체끼리는 서로 파고들지 않는다
  const colonies = [];
  const grid = new Map();
  const fits = (x, z, reach) => {
    const gx = Math.floor(x / 0.5);
    const gz = Math.floor(z / 0.5);
    const span = Math.ceil((reach + 0.8) / 0.5);
    for (let i = gx - span; i <= gx + span; i += 1) {
      for (let k = gz - span; k <= gz + span; k += 1) {
        for (const other of grid.get(`${i},${k}`) || []) {
          if (Math.hypot(other.x - x, other.z - z) < (other.reach + reach) * PACK) return false;
        }
      }
    }
    return true;
  };
  const settle = (one) => {
    colonies.push(one);
    const key = `${Math.floor(one.x / 0.5)},${Math.floor(one.z / 0.5)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(one);
    return (Math.PI / 4) * one.diameter * one.diameter * (one.form === 3 ? 0.5 : 1);
  };
  const reachFor = (form, size) => size * (form === 3 ? 0.25 : 0.5);

  // 이름 있는 군체부터 제자리에 세운다. 둔덕 위의 탁상형은 둔덕 밖으로 판을 내민다. 채우는 군체는 그 둘레를
  // 비켜 앉는다
  const covered = MOUNDS.map(() => 0);
  for (const hero of HEROES) {
    let x;
    let z;
    let out = null;
    if (hero.on) {
      const [index, degrees, given] = hero.on;
      const m = MOUNDS[index];
      const a = degrees * DEG;
      const share = given ?? flankAt(m, a, hero.y);
      x = m.x + Math.sin(a) * share * m.rx;
      z = m.z - Math.cos(a) * share * m.rz;
      out = [Math.sin(a), -Math.cos(a)];
    } else {
      [x, z] = hero.at;
    }
    const y = hero.y ?? lift(x, z);
    settle({ kind: "colony", x, y, z, diameter: hero.size, form: hero.form, reach: reachFor(hero.form, hero.size), grow: hero.seed, out, dense: hero.dense ?? 0 });
  }

  // 빈 자리를 작은 군체로 채운다. 채우는 군체의 생장형은 FILL의 몫으로 뽑는다
  const pickForm = () => {
    let pick = rng.next();
    let form = 0;
    while (form < 3 && pick >= FILL[form]) pick -= FILL[form++];
    return form;
  };
  // 주인공 둔덕은 판 위에서 채운다. 겉에 흩되, 판에 비친 원이 이웃과 얼마만큼만 겹치는 자리에만 앉힌다 —
  // 보이는 겉이 고르게, 빈틈없이 덮인다(둔덕 겉은 산 산호가 90%를 넘게 덮기도 한다)
  const disks = new Map();
  const cellOf = (sx, sy) => `${Math.floor(sx / 40)},${Math.floor(sy / 40)}`;
  const footprint = (one) => {
    const lift0 = one.form === 1 ? LIFT : one.diameter * 0.3;
    const [sx, sy] = project(one.x, one.y + lift0, one.z);
    // 판은 얇아 옆에서 보면 가는 띠다. 판 밑과 위로 군체가 들어설 자리를 남긴다
    const share = one.form === 1 ? 0.35 : one.form === 3 ? 0.5 : 0.85;
    return [sx, sy, (one.diameter / 2) * (focal / cam.depth(one.x, one.y, one.z)) * share];
  };
  const mark = (disk) => {
    const key = cellOf(disk[0], disk[1]);
    if (!disks.has(key)) disks.set(key, []);
    disks.get(key).push(disk);
  };
  const free = ([sx, sy, pr]) => {
    const reach = Math.ceil((pr + 160) / 40);
    const cx = Math.floor(sx / 40);
    const cy = Math.floor(sy / 40);
    for (let i = cx - reach; i <= cx + reach; i += 1) {
      for (let k = cy - reach; k <= cy + reach; k += 1) {
        for (const [ox, oy, orad] of disks.get(`${i},${k}`) || []) {
          if (Math.hypot(ox - sx, oy - sy) < (orad + pr) * SNUG) return false;
        }
      }
    }
    return true;
  };
  for (const one of colonies) mark(footprint(one));
  const hero = MOUNDS[0];
  for (let tries = 0; tries < 12000; tries += 1) {
    // 눈을 등진 뒤쪽 반은 보이지 않으므로 채우지 않는다. 둔덕 밑동의 모래에도 무너져 내린 조각 위로 군체가 둘러
    // 자란다
    const r = Math.sqrt(rng.next()) * 1.08;
    const a = rng.float(-0.55, 0.55) * Math.PI;
    const size = Math.max(0.3, diameterOf(rng, 0.7));
    const pick = pickForm();
    const grow = rng.int(0, 0x7fffffff);
    const x = hero.x + Math.sin(a) * r * hero.rx;
    const z = hero.z - Math.cos(a) * r * hero.rz;
    const y = lift(x, z);
    // 판이 눈높이 가까이 걸리면(내려다보는 각이 8도가 안 되면) 옆에서 본 한 줄 금이 되므로, 그 자리에는
    // 가지형이 선다. 눈보다 높은 작은 판도 두지 않는다 — 올려다본 밑면은 폭에 사인(올려다보는 각)을 곱한
    // 높이라, 작은 판은 가는 띠가 된다. 밑면을 보이는 판은 이름 있는 큰 판뿐이다. 둔덕을 덮는 가지형은 파도를
    // 받아 작고 촘촘한 덤불이다
    const form = pick === 1 && y + 0.1 > eye - 0.14 * z ? 0 : pick;
    const one = { kind: "colony", x, y, z, diameter: size, form, reach: reachFor(form, size), grow, out: [Math.sin(a), -Math.cos(a)], dense: 0.7 };
    const disk = footprint(one);
    if (!free(disk)) continue;
    settle(one);
    mark(disk);
  }
  // 먼 둔덕은 겉을 제 몫만큼 덮을 때까지 채운다. 윤곽에 군체의 굴곡이 선다
  MOUNDS.slice(1).forEach((m, i) => {
    const index = i + 1;
    const area = Math.PI * m.rx * m.rz;
    for (let tries = 0; covered[index] < m.cover * area && tries < 4000; tries += 1) {
      const r = Math.sqrt(rng.next()) * 0.98;
      const a = rng.float(0, TAU);
      const size = diameterOf(rng, 0.6);
      const form = pickForm();
      const grow = rng.int(0, 0x7fffffff);
      const x = m.x + Math.sin(a) * r * m.rx;
      const z = m.z - Math.cos(a) * r * m.rz;
      if (!fits(x, z, reachFor(form, size))) continue;
      covered[index] += settle({ kind: "colony", x, y: lift(x, z), z, diameter: size, form, reach: reachFor(form, size), grow, out: [Math.sin(a), -Math.cos(a)] });
    }
  });
  // 모래 위에는 드문드문. 둔덕 밖 모래의 SAND만큼
  let onSand = 0;
  const sandWant = SAND * spread * (lean * (far * far - bottom * bottom) + 2 * drop * (far - bottom));
  for (let tries = 0; onSand < sandWant && tries < 3000; tries += 1) {
    const z = bottom + rng.next() * (far - bottom);
    const x = (rng.next() - 0.5) * 2 * halfAt(z);
    const size = diameterOf(rng, 0.35);
    const form = pickForm();
    const grow = rng.int(0, 0x7fffffff);
    if (lift(x, z) > 0 || !fits(x, z, reachFor(form, size))) continue;
    onSand += settle({ kind: "colony", x, y: 0, z, diameter: size, form, reach: reachFor(form, size), grow, out: null });
  }

  // 바닥의 켜. 뒤에서 앞으로, 판에서 고른 높이 간격이 되게 자른다. 켜마다 바위가 솟은 자리만 그 켜의 모래
  // 선 위로 채운다 — 가까운 켜가 먼 켜의 아래를 덮는다
  // 켜의 간격은 판 위에서 고르다. 모래 선이 판 아래 끝에 닿는 거리까지는 모래 높이로, 그보다 가까이는 등성이
  // 머리 높이로 잰다 — 가까이 보이는 것은 등성이 머리뿐이다
  const depths = [];
  const inner = 1 / Math.max(near, bottom);
  for (let u = 1 / far; u < inner; u += SLICE / (focal * eye)) depths.push(1 / u);
  const peak = Math.max(...MOUNDS.map((m) => m.tall));
  for (let u = inner; u <= 1 / near; u += SLICE / (focal * Math.max(0.2, eye - peak))) depths.push(1 / u);
  const slices = [];
  for (const z of depths) {
    const half = halfAt(z);
    const steps = 64;
    const shape = new Path2D();
    let run = null;
    let any = false;
    const close = () => {
      if (!run) return;
      const [x0] = run[0];
      const [x1] = run[run.length - 1];
      const points = run.map(([x, y]) => project(x, y, z));
      points.push(project(x1, 0, z), project(x0, 0, z));
      shapes.polySubpath(shape, points, true);
      any = true;
      run = null;
    };
    for (let i = 0; i <= steps; i += 1) {
      const x = -half + (2 * half * i) / steps;
      const y = lift(x, z);
      if (y > 0) {
        run ??= i > 0 ? [[x - (2 * half) / steps, 0]] : [];
        run.push([x, y]);
      } else if (run) {
        run.push([x, 0]);
        close();
      }
    }
    close();
    if (any) slices.push({ kind: "slice", z, shape });
  }

  // 먼 것부터 찍는다
  const items = [...slices, ...colonies];
  items.sort((a, b) => b.z - a.z);

  const bins = [];
  const nearOnes = [];
  for (const one of items) {
    const reach = one.kind === "slice" ? one.z : reachOf(one.x, one.y, one.z);
    const clear = Math.exp(-c * reach);
    const scale = one.kind === "slice" ? focal / one.z : focal / cam.depth(one.x, one.y, one.z);
    if (clear < DETAIL) {
      // 먼 것은 윤곽만 찍는다. 물빛에 묻혀 속은 보이지 않는다. 대비를 몇 켜로 끊어 켜마다 한 번에 찍는다
      const layer = Math.min(LAYERS - 1, Math.floor(((clear - FAINT) / (DETAIL - FAINT)) * LAYERS));
      bins[layer] ??= { shape: new Path2D(), clear: 0, reach: 0, n: 0 };
      if (one.kind === "slice") bins[layer].shape.addPath(one.shape);
      else {
        if ((one.diameter / 2) * scale < 0.5) continue;
        const [bx, by] = project(one.x, one.y, one.z);
        silhouette(bins[layer].shape, one, bx, by, scale, makeRng(one.grow >>> 0), cam, knobs);
      }
      bins[layer].clear += clear;
      bins[layer].reach += reach;
      bins[layer].n += 1;
      continue;
    }
    if (one.kind === "slice") {
      // 사이에 군체가 없고 빛깔이 거의 같은 이웃 켜는 한 번에 찍는다
      const last = nearOnes[nearOnes.length - 1];
      if (last && last.kind === "slice" && Math.abs(last.clear - clear) < 0.02) last.shape.addPath(one.shape);
      else nearOnes.push({ kind: "slice", clear, reach, shape: new Path2D(one.shape) });
    }
    else nearOnes.push({ ...shapeNear(one, clear, scale, makeRng(one.grow >>> 0), knobs, cam, project), reach });
  }
  const layers = bins.filter(Boolean).map((bin) => ({ shape: bin.shape, clear: bin.clear / bin.n, reach: bin.reach / bin.n }));
  return { colonies, layers, nearOnes };
}

// 먼 군체의 윤곽. 가지형은 가지 끝이 둥글게 모인 덤불, 탁상형은 줄기 위의 판, 스틸로포라는 뭉툭한 가지 끝이
// 둥글게 솟은 무더기, 부채산호는 파도의 방향을 마주 본 만큼 좁아진 부채다
function silhouette(path, one, bx, by, scale, bits, cam, knobs) {
  const r = (one.diameter / 2) * scale;
  if (one.form === 0) {
    const tall = one.diameter * 0.55 * scale;
    path.moveTo(bx - r, by);
    path.ellipse(bx, by, r, tall * 0.55, 0, Math.PI, TAU);
    const heads = bits.int(5, 8);
    for (let i = 0; i < heads; i += 1) {
      const a = Math.PI * (0.08 + (0.84 * (i + bits.float(0.25, 0.75))) / heads);
      const hx = bx - Math.cos(a) * r * 0.72;
      const hy = by - Math.sin(a) * tall * 0.72;
      shapes.circleSubpath(path, hx, hy, Math.max(0.5, r * bits.float(0.26, 0.4)));
    }
  } else if (one.form === 1) {
    const height = Math.min(LIFT, one.diameter * 0.8);
    const lift = height * scale;
    // 눈높이의 판도 윗면의 곁가지와 두께가 있어 한 줄 금이 되지는 않는다
    const flat = Math.max(0.5, r * 0.3, (r * Math.abs(cam.eye - one.y - height)) / one.z);
    path.moveTo(bx + r, by - lift);
    path.ellipse(bx, by - lift, r, flat + PLATE * scale, 0, 0, TAU);
    path.rect(bx - Math.max(0.5, r * 0.1), by - lift, Math.max(1, r * 0.2), lift);
  } else if (one.form === 2) {
    const tall = one.diameter * HEAP * scale;
    path.moveTo(bx - r, by);
    path.ellipse(bx, by, r, tall * 0.8, 0, Math.PI, TAU);
    const knobs = bits.int(4, 7);
    for (let i = 0; i < knobs; i += 1) {
      const a = Math.PI * (0.1 + (0.8 * (i + bits.float(0.25, 0.75))) / knobs);
      shapes.circleSubpath(path, bx - Math.cos(a) * r * 0.8, by - Math.sin(a) * tall * 0.8, Math.max(0.5, r * bits.float(0.18, 0.26)));
    }
  } else {
    const face = Math.max(0.15, Math.abs(Math.cos(knobs.swell * DEG)));
    const tall = one.diameter * scale;
    path.moveTo(bx + r * FAN_WIDE * face, by - tall * 0.5);
    path.ellipse(bx, by - tall * 0.52, r * FAN_WIDE * face, tall * 0.48, 0, 0, TAU);
    path.rect(bx - 0.6, by - tall * 0.1, 1.2, tall * 0.1);
  }
}

// 가까운 군체를 짓는다. 판에 찍을 모양까지 여기서 지어 두고 쥐고 있는다(부채산호는 제 평면의 좌표로)
function shapeNear(one, clear, scale, bits, knobs, cam, project) {
  const { focal, eye } = cam;
  const hand = knobs.hand;
  const [bx, by] = project(one.x, one.y, one.z);
  const tints = TINTS[one.form] || [[]];
  const out = { form: one.form, clear, x: one.x, y: one.y, z: one.z, bx, by, scale, diameter: one.diameter, dense: one.dense, tint: tints[one.grow % tints.length] };

  // 바닥의 그늘. 군체 밑의 바위나 모래에 앉는다
  const foot = (one.diameter / 2) * (one.form === 3 ? 0.35 : 0.85);
  out.shadow = new Path2D();
  const flat = Math.max(0.05, (eye - one.y) / one.z);
  out.shadow.ellipse(bx, by, foot * scale, Math.max(0.6, foot * scale * flat), 0, 0, TAU);

  if (one.form === 0) {
    const grown = branching(bits, one.diameter, hand, Math.max(knobs.surge, one.dense || 0));
    const at = ([x, y, z]) => project(one.x + x, one.y + y, one.z + z);
    // 앞뒤로 세 겹. 뒤의 가지가 먼저 찍히고 앞의 가지가 그 위를 덮는다
    const layers = [new Path2D(), new Path2D(), new Path2D()];
    const back = one.diameter / 2;
    for (const [p, q] of grown.segs) {
      const depth = (p[2] + q[2]) / 2;
      const layer = depth > back * 0.25 ? 0 : depth > -back * 0.25 ? 1 : 2;
      const [x1, y1] = at(p);
      const [x2, y2] = at(q);
      layers[layer].moveTo(x1, y1);
      layers[layer].lineTo(x2, y2);
    }
    // 망점 한 칸보다 가는 가지는 망점에 녹는다. 가는 가지는 칸만큼 굵게 찍어, 작은 군체는 덤불 덩어리로 읽힌다
    const width = Math.max(CELL * 0.9, Math.min(TWIG, one.diameter * 0.045) * scale);
    // 끝의 하얀 자리는 가지 끝 1.5센티다
    const tips = new Path2D();
    for (const { p, d } of grown.tips) {
      const [x1, y1] = at(add(p, d, -0.015));
      const [x2, y2] = at(p);
      tips.moveTo(x1, y1);
      tips.lineTo(x2, y2);
    }
    Object.assign(out, { layers, tips, width, top: by - grown.tall * scale * 1.05, bottom: by });
  } else if (one.form === 1) {
    const grown = table(bits, one.diameter, hand, Boolean(one.out));
    const lift = one.y + grown.lift;
    // 둔덕에 붙은 판은 한쪽에 붙어 판을 둔덕 밖으로 내민다
    const [ox, oz] = one.out ? [one.out[0] * grown.radius * 0.75, one.out[1] * grown.radius * 0.75] : [0, 0];
    const rim = grown.rim.map(({ a, r }) => [ox + Math.cos(a) * r, oz + Math.sin(a) * r]);
    const top = rim.map(([x, z]) => project(one.x + x, lift, one.z + z));
    const under = rim.map(([x, z]) => project(one.x + x, lift - PLATE, one.z + z));
    // 눈보다 낮은 판은 윗면이, 높은 판은 밑면이 보인다
    out.seeTop = lift < eye;
    out.plate = new Path2D();
    piece(out.plate, out.seeTop ? top : under);
    // 판의 두께. 내려다본 판은 앞쪽 테 밑으로, 올려다본 판은 앞쪽 테 위로 보인다
    out.under = new Path2D();
    for (let i = 0; i < top.length; i += 1) {
      const j = (i + 1) % top.length;
      piece(out.under, [top[i], top[j], under[j], under[i]]);
    }
    const stalkW = Math.max(1.5, grown.stalk * scale);
    const [sx, sy] = project(one.x, lift - PLATE, one.z);
    out.stalk = new Path2D();
    out.stalk.rect(bx - stalkW / 2, sy, stalkW, by - sy);
    // 판 윗면의 곁가지. 흰 끝이 윗면에 점점이 박힌다. 실물(곁가지 굵기 2.5~4.9밀리)대로면 망점에 녹으므로
    // 망점 한 칸 반보다 촘촘하게 찍지 않는다. 테에는 가지 끝이 늘어선다
    out.stipple = new Path2D();
    out.tips = new Path2D();
    if (out.seeTop) {
      const pitch = Math.max(0.02, (CELL * 1.5) / scale);
      const dot = Math.max(1.3, pitch * scale * 0.2);
      for (let u = -grown.radius; u <= grown.radius; u += pitch) {
        for (let v = -grown.radius; v <= grown.radius; v += pitch) {
          const pu = u + bits.float(-0.35, 0.35) * pitch;
          const pv = v + bits.float(-0.35, 0.35) * pitch;
          if (Math.hypot(pu, pv) > grown.radius * 0.88) continue;
          const [px, py] = project(one.x + ox + pu, lift, one.z + oz + pv);
          shapes.circleSubpath(out.stipple, px, py, dot);
        }
      }
      const tipR = Math.max(0.8, RIM * 0.2 * scale);
      for (const [x, y] of top) shapes.circleSubpath(out.tips, x, y, tipR);
    }
    // 판 밑의 그늘은 판만큼 넓다
    out.shadow = new Path2D();
    const [sx0, sy0] = project(one.x + ox, one.y, one.z + oz);
    out.shadow.ellipse(sx0, sy0, grown.radius * scale * 0.95, Math.max(0.6, grown.radius * scale * 0.95 * flat), 0, 0, TAU);
  } else if (one.form === 2) {
    const grown = stylophora(bits, one.diameter, hand);
    const at = ([x, y, z]) => project(one.x + x, one.y + y, one.z + z);
    // 앞뒤로 세 겹. 뒤의 가지가 먼저 찍히고 앞의 가지가 그 위를 덮는다. 끝을 단 가지는 따로 모아 분홍으로 덧찍는다
    const layers = [new Path2D(), new Path2D(), new Path2D()];
    const ends = [new Path2D(), new Path2D(), new Path2D()];
    const back = one.diameter / 2;
    // 산호 구멍. 실물(1밀리 남짓)대로면 망점에 녹으므로 망점 한 칸 반보다 촘촘하게 찍지 않는다
    const pits = [new Path2D(), new Path2D(), new Path2D()];
    const pitch = Math.max(PORE * 2, (CELL * 1.5) / scale);
    const dot = Math.max(1.3, pitch * scale * 0.18);
    const width = Math.max(CELL * 0.9, grown.thick * scale);
    grown.segs.forEach(([p, q], i) => {
      const depth = (p[2] + q[2]) / 2;
      const layer = depth > back * 0.25 ? 0 : depth > -back * 0.25 ? 1 : 2;
      const [x1, y1] = at(p);
      const [x2, y2] = at(q);
      layers[layer].moveTo(x1, y1);
      layers[layer].lineTo(x2, y2);
      if (grown.ends.has(i)) {
        ends[layer].moveTo(x1 + (x2 - x1) * 0.45, y1 + (y2 - y1) * 0.45);
        ends[layer].lineTo(x2, y2);
      }
      const length = Math.hypot(x2 - x1, y2 - y1);
      for (let t = bits.next() * pitch * scale; t < length; t += pitch * scale) {
        const side = bits.float(-0.3, 0.3) * width;
        const u = t / length;
        shapes.circleSubpath(pits[layer], x1 + (x2 - x1) * u - ((y2 - y1) / length) * side, y1 + (y2 - y1) * u + ((x2 - x1) / length) * side, dot);
      }
    });
    Object.assign(out, { layers, ends, pits, width, top: by - grown.tall * scale * 1.05, bottom: by });
  } else {
    // 부채는 제 평면의 좌표(미터)로 지어 두고, 찍을 때 평면을 판에 옮긴다. 그물눈은 망점 두 칸보다 잘게
    // 짓지 않는다. 가지는 굵기마다 한 길로 묶는다. 망점 한 칸의 반보다 가는 가지는 가장자리가 망점에 녹으므로 그만큼
    // 굵게 찍는다
    const fan = seaFan(bits, one.diameter, Math.max((CELL * 1.6) / scale, one.diameter / 30), hand);
    const bundles = new Map();
    for (let s = 0; s < fan.a0.length; s += 1) {
      const w = Math.round(Math.max(CELL * 0.6, fan.widths[s] * scale));
      if (!bundles.has(w)) bundles.set(w, new Path2D());
      bundles.get(w).moveTo(fan.a0[s], fan.b0[s]);
      bundles.get(w).lineTo(fan.a1[s], fan.b1[s]);
    }
    const sheet = new Path2D();
    piece(sheet, fan.outline);
    Object.assign(out, { fan, bundles: [...bundles], sheet });
  }
  return out;
}

// 산호초 한 장을 찍는다
function picture(S, page) {
  const { width, height, knobs } = page;

  // 통. 물은 가장 푸른 통, 산호는 남은 통 가운데 가장 붉은 통과 가장 노란 통으로 찍는다. 통이 둘이면
  // 산호는 한 통이다
  const inks = S.drums.map((drum) => drum.separation);
  const water = bluest(S.drums);
  const rest = S.drums.filter((drum) => drum.separation !== water);
  const warm = rest.length ? reddest(rest) : water;
  const sun = rest.length ? yellowest(rest) : water;
  const key = S.key;
  // 남은 통에 푸른 통이 또 있으면 먼 물을 한 번 더 짙게 한다
  const cool = rest.filter((drum) => {
    const [r, g, b] = rgbOf(drum.ink);
    return b - (r + g) / 2 > 0.2;
  });
  const depth = cool.length ? bluest(cool) : null;

  // 눈과 물
  const cam = lens(width, height);
  const { focal, horizon, project } = cam;
  const c = SIGHT / knobs.clear;
  cam.c = c;
  // 수면에서 꺾여 들어온 햇빛. 해는 앞쪽 왼편 하늘 천정에서 35도에 있다
  const zenith = Math.asin(Math.sin(35 * DEG) / WATER);
  const azimuth = -25 * DEG;
  const sun3 = [Math.sin(zenith) * Math.sin(azimuth), Math.cos(zenith), Math.sin(zenith) * Math.cos(azimuth)];

  // 물. 눈높이의 먼 물이 가장 짙고, 올려다볼수록 수면의 빛을 받아 옅다. 바닥은 모래가 밝고, 멀수록
  // 물빛에 묻힌다(대비가 e^-cd로 준다)
  const deep = knobs.deep;
  const top = Math.max(0.01, cam.row(0).rise);
  const far = deep * 0.95;
  const tone = (y, nearTone, upTone) => {
    const ray = cam.row(y);
    if (ray.path === Infinity) return far + (upTone - far) * Math.min(1, ray.rise / top);
    const k = Math.exp(-c * ray.path);
    return far * (1 - k) + nearTone * k;
  };
  const column = (sep, f) =>
    sep.draw((g) => {
      const gradient = g.createLinearGradient(0, 0, 0, height);
      const stops = 32;
      for (let i = 0; i <= stops; i += 1) {
        const y = (i / stops) * height;
        gradient.addColorStop(i / stops, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, f(y)))})`);
      }
      if (horizon > 0 && horizon < height) gradient.addColorStop(horizon / height, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, f(horizon)))})`);
      g.fillStyle = gradient;
      g.fillRect(0, 0, width, height);
    });
  column(water, (y) => tone(y, 0.06, deep * 0.55));
  if (depth) column(depth, (y) => tone(y, 0, deep * 0.1) * 0.55);
  // 모래는 햇빛을 받아 따뜻하다. 멀수록 물빛에 묻힌다
  if (sun !== water) column(sun, (y) => (y > horizon ? 0.14 * Math.exp(-c * cam.row(y).path) : 0.04));
  if (knobs.stain > 0) {
    const made = stainsFor(ROLL, knobs.stain, 0.8);
    soak(water, made.wash, width, height);
  }

  // 산호초. 시간과 무관한 것은 한 번 짓고 쥐고 있는다
  const key0 = [knobs.clear, knobs.swell, knobs.surge, knobs.hand].join(":");
  const reefNow = builds(key0, () => build(knobs, cam));

  const fill = (path) => (g) => g.fill(path);
  const stroke = (path, w) => (g) => {
    g.lineWidth = w;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke(path);
  };

  // 물빛 막. 산호와 바위는 종이까지 파내 제 빛깔로 찍고, 눈과 그 사이의 물을 막으로 덮는다. 멀수록 제
  // 빛깔은 옅어지고(대비 k의 0.7제곱) 막은 짙어져, 끝내 물빛과 하나가 된다. 제 빛깔을 흐리게 파내는 대신
  // 온전히 파내므로 윤곽이 망점에 녹지 않는다
  // 붉은빛은 물이 먼저 먹는다. 멀수록 붉은 통이 노란 통보다 빨리 옅어지고, 푸른 통은 대비만큼만 옅어진다
  // 눈은 둔덕에 빛깔을 맞춘다(수중 사진가가 물속에서 피사체까지의 거리에 화이트 밸런스를 맞추듯). 둔덕까지
  // 먹힌 붉은빛은 되살아나고, 그보다 먼 것만 더 먹힌다
  const ownOf = (k, r) => {
    const past = Math.max(0, r - FOCUS);
    const tones = [Math.pow(k, 0.7), Math.pow(k * Math.exp(-EAT_SUN * past), 0.7), Math.pow(k * Math.exp(-EAT_WARM * past), 0.7)];
    return (sep) => (sep === warm ? tones[2] : sep === sun ? tones[1] : tones[0]);
  };
  const veil = (path, k) => {
    stain([water], path, far * (1 - k));
    if (depth) stain([depth], path, far * 0.55 * (1 - k));
  };
  // 깊은 그늘. 햇빛이 닿지 않는 바위 틈과 판 밑은 붉은 통과 푸른 통을 짙게 겹치고 가장 짙은 통을 한 번 더
  // 얹는다
  const gloom = (path, own) => {
    stain([water], path, own(water));
    stain([warm], path, 0.75 * own(warm));
    if (depth) stain([depth], path, 0.6 * own(depth));
    if (key !== water && key !== warm) stain([key], path, 0.5 * own(key));
    if (sun !== warm) stain([sun], path, 0.2 * own(sun));
  };

  // 먼 것. 물빛에 묻힌 윤곽을 켜마다 한 번에, 먼 켜부터
  for (const layer of reefNow.layers) {
    const own = ownOf(layer.clear, layer.reach);
    carve(inks, fill(layer.shape), 1);
    stain([water], fill(layer.shape), own(water));
    if (depth) stain([depth], fill(layer.shape), 0.6 * own(depth));
    if (key !== water) stain([key], fill(layer.shape), 0.3 * own(key));
    stain([sun], fill(layer.shape), own(sun) * 0.2);
    stain([warm], fill(layer.shape), own(warm) * 0.2);
    veil(fill(layer.shape), layer.clear);
  }

  // 가까운 것. 먼 것부터. 군체는 제 빛깔 한 벌로 찍는다
  const roles = { warm, sun, water, key };
  const body = (path, tint, own, share = 1) => {
    for (const [role, amount] of tint) stain([roles[role]], path, amount * share * own(roles[role]));
  };
  let fans = 0;
  for (const one of reefNow.nearOnes) {
    const k = one.clear;
    const own = ownOf(k, one.reach);
    if (one.kind === "slice") {
      // 뼈대의 한 켜. 죽은 산호가 굳은 바위를 산호말(석회조류)이 덮어 보랏빛이다. 산 군체들 사이로만 드러나는
      // 틈이라 그늘이 깊다. 멀수록 물빛 막에 묻힌다
      carve(inks, fill(one.shape), 1);
      gloom(fill(one.shape), own);
      veil(fill(one.shape), k);
      continue;
    }
    // 판 밑은 그늘이 깊다
    const dusk = one.form === 1 ? 0.45 : 0.22;
    stain([key], fill(one.shadow), dusk * own(key));
    stain([water], fill(one.shadow), dusk * 0.6 * own(water));
    if (one.form === 0) {
      const shade = (g, amount) => {
        const gradient = g.createLinearGradient(0, one.top, 0, one.bottom);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, `rgba(0, 0, 0, ${amount})`);
        return gradient;
      };
      const whole = new Path2D();
      one.layers.forEach((layer, back) => {
        whole.addPath(layer);
        carve(inks, stroke(layer, one.width), 1);
        body(stroke(layer, one.width), one.tint, own);
        stain([key], stroke(layer, one.width), (0.3 - back * 0.12) * own(key));
        stain([water], (g) => {
          g.strokeStyle = shade(g, 0.5);
          stroke(layer, one.width)(g);
        }, own(water));
      });
      carve(inks, stroke(one.tips, one.width), 0.55);
      veil(stroke(whole, one.width), k);
    } else if (one.form === 1) {
      carve(inks, fill(one.stalk), 1);
      stain([key], fill(one.stalk), 0.75 * own(key));
      stain([water], fill(one.stalk), 0.6 * own(water));
      carve(inks, fill(one.under), 1);
      if (one.seeTop) {
        // 내려다본 판의 옆은 그늘이다
        stain([key], fill(one.under), 0.8 * own(key));
        stain([water], fill(one.under), 0.45 * own(water));
        stain([warm], fill(one.under), 0.2 * own(warm));
      } else {
        // 올려다본 판의 테는 새로 자라는 자리라 하얗다
        body(fill(one.under), one.tint, own, 0.3);
      }
      carve(inks, fill(one.plate), 1);
      if (one.seeTop) {
        // 윗면은 햇빛을 받아 제 빛깔이다
        body(fill(one.plate), one.tint, own);
        carve(inks, fill(one.stipple), 0.6);
        carve(inks, fill(one.tips), 0.6);
      } else {
        // 밑면은 햇빛이 닿지 않는 깊은 그늘이다. 어느 통으로 찍어도 밝은 테 밑의 어두운 판으로 읽힌다
        gloom(fill(one.plate), own);
      }
      const whole = new Path2D(one.plate);
      whole.addPath(one.under);
      whole.addPath(one.stalk);
      veil(fill(whole), k);
    } else if (one.form === 2) {
      // 스틸로포라. 가지는 제 빛깔이고 무더기의 아래로 갈수록 그늘이 진다. 뭉툭한 끝은 분홍 색소가 짙고, 산호
      // 구멍이 옅게 점점이 박힌다
      const [base, tip] = one.tint;
      const whole = new Path2D();
      one.layers.forEach((layer, back) => {
        whole.addPath(layer);
        carve(inks, stroke(layer, one.width), 1);
        body(stroke(layer, one.width), base, own);
        body(stroke(one.ends[back], one.width), tip, own);
        gloom((g) => {
          const gradient = g.createLinearGradient(0, one.top, 0, one.bottom);
          gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
          gradient.addColorStop(1, `rgba(0, 0, 0, ${0.35 + back * 0.1})`);
          g.strokeStyle = gradient;
          stroke(layer, one.width)(g);
        }, own);
        carve(inks, fill(one.pits[back]), 0.45);
      });
      veil(stroke(whole, one.width), k);
    } else {
      // 부채. 파도의 방향을 마주 보고 선다. 부채의 평면을 판에 옮기는 틀을 부채 가운데에서 재어 부채 전체에 쓴다
      fans += 1;
      const f = one.fan;
      const facing = knobs.swell * DEG + f.turn;
      const across = [Math.cos(facing), 0, -Math.sin(facing)];
      const lift = [0, 1, 0];
      const mid = f.height / 2;
      const center = add([one.x, one.y, one.z], lift, mid);
      const [ox, oy] = project(...center);
      const [ax, ay] = project(...add(center, across, mid));
      const [bx, by] = project(...add(center, lift, mid));
      const ea = [(ax - ox) / mid, (ay - oy) / mid];
      const eb = [(bx - ox) / mid, (by - oy) / mid];
      const matrix = new DOMMatrix([ea[0], ea[1], eb[0], eb[1], ox - eb[0] * mid, oy - eb[1] * mid]);
      const placed = (path) => {
        const out = new Path2D();
        out.addPath(path, matrix);
        return out;
      };
      // 그물은 망점에 녹지 않게 온톤으로 찍는다. 그물눈 사이로 물이 비치는 옅은 막이 깔린다
      const sheet = placed(one.sheet);
      carve(inks, fill(sheet), 0.2);
      body(fill(sheet), one.tint, own, 0.2);
      for (const [w, path] of one.bundles) {
        const net = placed(path);
        carve(inks, stroke(net, w), 1);
        body(stroke(net, w), one.tint, own);
        veil(stroke(net, w), k);
      }
    }
  }

  // 빛줄기. 수면의 물결이 모은 햇빛이 물속에서 흩어져 보인다. 모두 꺾인 해를 향해 모인다
  const rays = [];
  if (knobs.rays > 0) {
    const ahead = Math.max(0.02, sun3[2] * Math.cos(cam.pitch) - sun3[1] * Math.sin(cam.pitch));
    const vp = [width / 2 + (focal * sun3[0]) / ahead, height / 2 - (focal * (sun3[1] * Math.cos(cam.pitch) + sun3[2] * Math.sin(cam.pitch))) / ahead];
    const beams = makeRng((ROLL ^ 0x1b873593) >>> 0);
    const from = Math.atan2(height - vp[1], -vp[0] - width * 0.1);
    const to = Math.atan2(height - vp[1], width * 1.1 - vp[0]);
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      const base = to + (from - to) * ((i + beams.float(0.2, 0.8)) / count);
      const wide = beams.float(0.004, 0.014);
      const phase = beams.next();
      const glow = beams.float(0.5, 1);
      // 햇빛은 물결마다 모였다 흩어진다. 수심 4미터에서 ±94%, 29미터에서 ±10%다. 산호초의 깊이에 맞춰 ±60%로
      // 두고, 빛줄기마다 그 한때의 밝기를 준다
      const flick = (1 + 0.6 * Math.sin(TAU * phase)) / 1.6;
      const a = base;
      const reach = height * 1.3;
      const tri = new Path2D();
      tri.moveTo(vp[0], vp[1]);
      tri.lineTo(vp[0] + Math.cos(a - wide) * (reach - vp[1]) * 2, vp[1] + Math.sin(a - wide) * (reach - vp[1]) * 2);
      tri.lineTo(vp[0] + Math.cos(a + wide) * (reach - vp[1]) * 2, vp[1] + Math.sin(a + wide) * (reach - vp[1]) * 2);
      tri.closePath();
      rays.push({ tri, alpha: knobs.rays * glow * flick * 0.6 });
    }
    for (const ray of rays) {
      carve(inks, (g) => {
        const gradient = g.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.35)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        g.fillStyle = gradient;
        g.fill(ray.tri);
      }, ray.alpha);
    }
  }

  return { colonies: reefNow.colonies.length, mounds: MOUNDS.length, fans, horizon };
}

export const reef = {
  id: "reef",
  name: "REEF",
  about: "산호 둔덕 하나를 마주 본 한 장 — 탁상형이 층층이 판을 내밀고, 가지형 · 스틸로포라 · 붉은 부채산호가 둘러선다",
  model: "claude-opus-5-5",

  knobs: [
    { key: "deep", label: "DEEP", min: 0.3, max: 1, step: 0.05, value: 0.8, hint: "물의 짙기. 눈높이의 먼 물이 가장 짙고, 위로 수면에 가까울수록 옅다" },
    { key: "clear", label: "CLEAR", min: 12, max: 45, step: 1, value: 40, hint: "가로 시정(미터). 이 거리에서 산호가 물빛에 묻힌다. 가까운 산호도 이 비율로 옅어진다" },
    { key: "swell", label: "SWELL", min: 0, max: 90, step: 5, value: 35, hint: "파도가 바닥을 밀고 당기는 방향이 눈과 이루는 각(도). 부채산호는 이 방향을 마주 본다 — 0이면 부채가 정면을, 90이면 옆을 보인다" },
    { key: "surge", label: "SURGE", min: 0, max: 1, step: 0.05, value: 0.4, hint: "파도가 바닥을 밀었다 당기는 세기. 모래 위의 가지형이 받은 만큼 작고 촘촘하게 자란다" },
    { key: "rays", label: "RAYS", min: 0, max: 1, step: 0.05, value: 0.5, hint: "수면의 물결이 모은 햇빛 줄기. 0이면 없다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "가지와 테와 둘레가 손으로 오린 듯 흔들리는 정도" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.3, hint: "물이 얼룩덜룩한 정도" }
  ],

  // 산호초는 움직이지 않는 한 장이다. 제 종이에 한 번 찍어 쥐고 있다가, 장마다 인쇄기의 종이에 그대로 옮긴다 —
  // 장마다 바뀌는 것은 인쇄기의 망점과 판 어긋남뿐이다. 쥐는 열쇠에는 그림을 바꾸는 값을 모두 넣는다
  paint(S, R, page) {
    const { width, knobs } = page;
    const paper = S.drums[0].separation.canvas;
    const inks = S.drums.map((drum) => `${drum.ink}:${drum.role}`).join(",");
    const still = [knobs.deep, knobs.clear, knobs.swell, knobs.surge, knobs.rays, knobs.hand, knobs.stain, inks, paper.width, paper.height].join("|");
    const made = (paper.width < width ? smalls : stills)(still, () => {
      const own = new Map(
        S.drums.map((drum) => {
          const canvas = document.createElement("canvas");
          canvas.width = paper.width;
          canvas.height = paper.height;
          return [drum.separation, new Separation(drum.separation.role, canvas, width, page.height, paper.width / width)];
        })
      );
      const mine = { key: own.get(S.key), drums: S.drums.map((drum) => ({ ...drum, separation: own.get(drum.separation) })) };
      return { sketch: picture(mine, page), sheets: S.drums.map((drum) => own.get(drum.separation).canvas) };
    });
    S.drums.forEach((drum, i) =>
      drum.separation.draw((g) => {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(made.sheets[i], 0, 0);
      })
    );
    return made.sketch;
  },

  // 안내선. 소실선과, 군체와 둔덕의 수를 적는다
  guides(page, sketch) {
    if (!sketch) return [];
    return [
      { kind: "line", from: [0, sketch.horizon], to: [page.width, sketch.horizon], dash: true },
      { kind: "text", at: [page.margin, page.height - page.margin], text: `${sketch.colonies} COLONIES · ${sketch.mounds} MOUNDS` }
    ];
  }
};
