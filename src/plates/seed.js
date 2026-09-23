// 민들레 씨. 씨송이(갓털 공) 하나가 가늘고 긴 꽃대 끝에 서서 하늘에 떠 있다. 비율과 결은 그림책과
// 표지의 민들레를 따른다 — 작은 씨송이, 씨송이 지름의 30분의 1로 가는 꽃대, 하나하나 흰 별로 보이는
// 갓털, 가운데의 작은 갈색 씨 뭉치.
//
// 씨는 그리지 않는다. 식물이 씨를 짓는 규칙과 실물의 치수로 짓는다.
//
//   씨송이 꽃턱(받침)에 씨가 공처럼 둘러 박힌다. 자리는 해바라기 씨와 같은 잎차례를 따른다 — 씨마다
//          황금각(137.5°)씩 돌아가며 놓여, 어느 두 씨도 한 줄로 서지 않고 공 전체에 고르게 퍼진다
//   씨 하나 꽃턱에 박힌 씨(수과) 4밀리, 그 위로 가는 부리 8.5밀리, 부리 끝에 갓털. 갓털은 지름 13.8밀리의
//          원판으로 털이 100가닥쯤 한 점에서 퍼진다. 털 한 가닥은 16마이크로미터이고 갓털의 90%가 빈
//          자리다 — 그 빈 자리로 빠져나간 바람이 갓털 위에 떨어져 뜬 소용돌이 고리를 만들어 씨를
//          띄운다(Cummins 외, Nature 2018). 갓털은 털이 부리 끝 쪽으로 30도 들린 얕은 우산이다 — 공의
//          가장자리에서 옆으로 보이는 갓털이 바깥을 향한 부채가 되어, 공의 둘레가 털 술처럼 삐죽하다
//   찍기   갓털은 하늘을 파낸 종이다. 갓털 하나는 털 사이로 하늘이 비치는 옅은 원판이고, 원판을 하나씩
//          따로 옅게 파내 겹친 자리가 밝아진다 — 이웃 갓털이 맞물린 렌즈 꼴이 공 전체에 격자를 그린다.
//          털과 부리는 그 위에 종이까지 파낸 또렷한 선이다. 망점은 판을 9픽셀 칸으로 찍으므로 그보다 가는
//          것을 옅게 찍으면 망점 속에 녹는다. 판화는 번지는 계조가 아니라 겹쳐 찍은 납작한 면과 또렷한
//          선으로 찍는다. 꽃턱은 어둡게, 가운데 모인 씨는 갓털 너머로 옅게 비친다.
//          꽃대는 손으로 오린 띠로, 공 밖에서는 옅은 통과 짙은 통을 겹쳐 초록을 내고 해를 등진 쪽에 납작한
//          그늘이 앉는다. 공 안에서는 갓털 너머로 옅게 비친다
//
// 참고: 민들레 갓털의 털 수와 지름, 빈 자리의 몫, 떨어져 뜬 소용돌이 고리(Cummins 외, Nature 562, 2018),
// 잎차례의 황금각(Vogel 1979).

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { meteorInks } from "../drums.js";
import { carve, stain } from "../night.js";
import { stainsFor, soak } from "../stains.js";

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// 실물의 치수(밀리)
const RECEPTACLE = 3;
const ACHENE = 4;
const BEAK = 8.5;
const PAPPUS = 13.8 / 2;
// 씨송이 전체의 반지름. 꽃턱에서 갓털 가장자리까지
const HEAD = RECEPTACLE + ACHENE + BEAK + PAPPUS * 0.6;

export const seed = {
  id: "seed",
  name: "SEED",
  about: "민들레 씨송이 — 황금각으로 둘러 박힌 씨, 털 100가닥의 갓털",
  model: "claude-opus-5",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "털의 흔들림과 줄기의 휨을 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { key: "dark", label: "DARK", min: 0.3, max: 1, step: 0.05, value: 1, hint: "하늘의 짙기. 위가 짙고 아래로 옅어진다. 갓털은 이 하늘을 파낸 자리다" },
    { key: "size", label: "SIZE", min: 0.2, max: 0.7, step: 0.01, value: 0.3, hint: "씨송이의 지름. 판 폭에 대한 비율이다. 씨송이 안의 치수는 모두 실물의 비례를 따른다" },
    { key: "seeds", label: "SEEDS", min: 30, max: 220, step: 1, value: 52, hint: "씨송이에 박힌 씨의 수. 황금각으로 돌아가며 공에 고르게 놓인다" },
    { key: "filaments", label: "FILAMENTS", min: 12, max: 140, step: 1, value: 48, hint: "갓털 하나의 털 수. 실물은 100가닥쯤이지만 그대로 찍으면 공이 흰 원판이 된다. 절반쯤이면 갓털 하나하나가 촘촘한 솔 같은 흰 별로 서고, 이웃 별과 격자로 맞물리며 그 사이로 하늘이 비친다" },
    { key: "gone", label: "GONE", min: 0, max: 0.9, step: 0.05, value: 0, hint: "바람이 이미 떼어 간 씨의 몫. 오른쪽 위부터 비고, 빈 자리엔 꽃턱이 드러난다" },
    { key: "sway", label: "SWAY", min: 0, max: 1, step: 0.05, value: 0.4, hint: "씨송이가 줄기 위에서 흔들리는 폭. 0이면 가만히 선다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "털이 붓으로 그은 듯 고르지 않은 정도 — 간격이 몰리고, 길이가 들쭉날쭉하고 몇 올은 끊겨 짧으며, 조금씩 휜다. 0이면 자로 잰 바퀴살이다" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.35, hint: "바탕이 얼룩덜룩한 정도" },
    { key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 16, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊긴다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 또박또박한 박자. 한 바퀴를 BEAT장으로 나누고 그 장의 시간으로만 그린다
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;

    const seedRoll = fieldSeed(page, 0x7a3d9e51);
    const layout = makeRng(seedRoll);
    const inks = S.drums.map((drum) => drum.separation);
    const { glowInk } = meteorInks(S.drums, S.key);

    // 하늘. 위가 짙고 지평선 쪽으로 옅어진다
    const dark = knobs.dark;
    S.key.ramp(0, 0, width, height, { from: dark * 0.8, to: dark * 0.18 });
    S.wash.ramp(0, 0, width, height, { from: dark * 0.08, to: dark * 0.16 });
    if (S.body !== S.wash) S.body.ramp(0, 0, width, height, { from: dark * 0.32, to: dark * 0.08 });
    if (knobs.stain > 0) {
      const made = stainsFor(page.seed, knobs.stain, 0.6);
      soak(S.wash, made.wash, width, height);
      soak(S.body, made.body, width, height);
    }

    // 치수. 씨송이의 지름이 판 폭의 SIZE배가 되게 1밀리를 정한다
    const mm = (width * knobs.size) / (HEAD * 2);
    const line = Math.max(1.2, mm * 0.14);

    // 줄기와 씨송이. 씨송이는 판 가운데 위쪽에 있고, 가늘고 긴 꽃대가 판 아래 밖에서 조금 휘며 올라와
    // 받친다. 흔들림은 꽃대의 뿌리를 축으로 돈다
    const headX = width * 0.5;
    const headY = height * 0.36;
    const rootX = width * 0.56;
    const rootY = height * 1.08;
    const lean = knobs.sway * 0.035 * Math.sin(TAU * held);
    const turn = (x, y) => {
      const dx = x - rootX;
      const dy = y - rootY;
      return [rootX + dx * Math.cos(lean) - dy * Math.sin(lean), rootY + dx * Math.sin(lean) + dy * Math.cos(lean)];
    };
    const [cx, cy] = turn(headX, headY);

    // 꽃대. 꽃턱 한가운데까지 올라가 씨송이를 받친다. 굵기는 씨송이 지름의 30분의 1이다 — 실물(3~5밀리)
    // 보다 가늘다. 씨송이는 멀리서 보면 털이 퍼져 더 커 보이므로, 그림책과 표지의 민들레가 이 비율로
    // 그려진다. 선으로 긋지 않고 손으로 오린 띠다. 짓기만 해 두고 갓털 다음에 찍는다 — 갓털은 90%가 빈
    // 자리라 그 너머로 꽃대가 비친다
    const stemInk = glowInk || S.wash;
    const stalk = makeRng((seedRoll ^ 0x1d4e5f6a) >>> 0);
    const bend = stalk.float(0.03, 0.07) * width * (stalk.next() < 0.5 ? -1 : 1);
    const stemWide = Math.max(2, (HEAD * 2 * mm) / 30);
    const wobble = stemWide * 0.1 * knobs.hand;
    const edgeL = [];
    const edgeR = [];
    const edgeS = [];
    for (let i = 0; i <= 28; i += 1) {
      const s = i / 28;
      const x = headX + (rootX - headX) * s + Math.sin(Math.PI * s) * bend;
      const y = headY + (rootY - headY) * s;
      edgeL.push(turn(x - stemWide / 2 + (stalk.next() - 0.5) * wobble, y));
      edgeR.push(turn(x + stemWide / 2 + (stalk.next() - 0.5) * wobble, y));
      edgeS.push(turn(x + stemWide / 6 + (stalk.next() - 0.5) * wobble, y));
    }
    const band = (a, b) => (g) => {
      g.beginPath();
      shapes.polySubpath(g, [...a, ...b.slice().reverse()], true);
      g.fill();
    };

    // 씨송이의 씨. 황금각으로 돌아가며 공에 고르게 놓는다. 바람이 부는 쪽 둘레(뚜껑 모양의 자리)는
    // GONE만큼 이미 비었다 — 뚜껑의 넓이가 공 겉넓이의 GONE배가 되는 각까지다
    const count = Math.round(knobs.seeds);
    const wind = [0.78, -0.42, 0.46];
    const windLen = Math.hypot(...wind);
    const toward = wind.map((v) => v / windLen);
    const bare = 1 - 2 * knobs.gone;
    const hand = knobs.hand;
    const cup = (30 * Math.PI) / 180;
    const heads = [];
    for (let i = 0; i < count; i += 1) {
      const z = 1 - (2 * i + 1) / count;
      const ring = Math.sqrt(Math.max(0, 1 - z * z));
      const a = i * GOLDEN;
      const d = [ring * Math.cos(a), ring * Math.sin(a), z];
      // 비었든 아니든 같은 수를 뽑는다. 그래야 GONE을 돌려도 남은 씨의 꼴이 그대로다
      const jitter = layout.next();
      const spin = layout.float(0, TAU);
      if (d[0] * toward[0] + d[1] * toward[1] + d[2] * toward[2] > bare) continue;
      heads.push({ d, jitter, spin });
    }
    // 뒤쪽 씨부터. 앞쪽 갓털이 뒤쪽을 덮는다
    heads.sort((p, q) => p.d[2] - q.d[2]);

    // 공 위의 한 점(밀리)을 판에. 정면에서 본다
    const at = (x, y) => turn(headX + x * mm, headY + y * mm);
    // 갓털마다 원판과 털을 따로 짓는다. 원판은 털 끝을 이은 윤곽이다
    const tufts = [];
    const raysFront = new Path2D();
    const raysBack = new Path2D();
    const beaks = new Path2D();
    const seedsDark = new Path2D();
    for (const one of heads) {
      const [dx, dy, dz] = one.d;
      const root = RECEPTACLE;
      const tip = RECEPTACLE + ACHENE + BEAK;
      // 씨(수과)와 부리
      const [ax, ay] = at(dx * root, dy * root);
      const [bx, by] = at(dx * (root + ACHENE), dy * (root + ACHENE));
      const [tx, ty] = at(dx * tip, dy * tip);
      if (dz > 0) {
        const [ex, ey] = at(dx * (root + 2.5), dy * (root + 2.5));
        seedsDark.moveTo(ax, ay);
        seedsDark.lineTo(ex, ey);
      }
      beaks.moveTo(bx, by);
      beaks.lineTo(tx, ty);
      // 갓털. 부리에 수직인 원판에 털이 퍼지고, 부리 쪽으로 조금 오목하다. 원판의 두 축을 부리에 수직으로 잡는다
      const helper = Math.abs(dz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      let u = [dy * helper[2] - dz * helper[1], dz * helper[0] - dx * helper[2], dx * helper[1] - dy * helper[0]];
      const uLen = Math.hypot(...u);
      u = u.map((v) => v / uLen);
      const v = [dy * u[2] - dz * u[1], dz * u[0] - dx * u[2], dx * u[1] - dy * u[0]];
      const fibre = dz < 0 ? raysBack : raysFront;
      const rim = [];
      const strands = Math.round(knobs.filaments);
      const bits = makeRng((seedRoll ^ Math.imul(Math.floor(one.jitter * 1e6) + 1, 0x9e3779b1)) >>> 0);
      // 털은 붓으로 그은 결이다. 간격이 몰리고 벌어지며, 길이가 들쭉날쭉하고 몇 올은 끊겨 짧고, 조금씩
      // 휜다. 그래서 갓털의 가장자리가 너덜너덜하고 공의 둘레가 깃털처럼 삐죽하다. 모두 HAND를 따른다
      for (let k = 0; k < strands; k += 1) {
        const angle = one.spin + (k / strands) * TAU + (bits.next() - 0.5) * (TAU / strands) * 1.6 * hand;
        const broken = bits.next() < 0.2 * hand ? 0.55 : 1;
        const length = PAPPUS * broken * (1 - bits.next() * 0.45 * hand);
        const bend = (bits.next() - 0.5) * 0.16 * hand;
        const flat = Math.cos(cup) * length;
        const rise = Math.sin(cup) * length;
        const ex = dx * (tip + rise) + (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * flat;
        const ey = dy * (tip + rise) + (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * flat;
        const end = at(ex, ey);
        const mx = (tx + end[0]) / 2 - (end[1] - ty) * bend;
        const my = (ty + end[1]) / 2 + (end[0] - tx) * bend;
        fibre.moveTo(tx, ty);
        fibre.quadraticCurveTo(mx, my, end[0], end[1]);
        rim.push(end);
      }
      tufts.push({ rim, back: dz < 0 });
    }
    const stroke = (path, width) => (g) => {
      g.lineWidth = width;
      g.lineCap = "round";
      g.stroke(path);
    };

    // 갓털. 판화로 찍는다 — 한 겹씩 따로 찍고, 번지는 계조를 쓰지 않는다.
    //
    //   원판  갓털 하나는 털 사이로 하늘이 비치는 옅은 원판이다. 털 끝을 이은 윤곽을 하나씩 따로 옅게
    //         파낸다. 원판이 겹친 자리는 겹친 만큼 더 파여 밝아지므로, 이웃 갓털이 맞물린 렌즈 꼴이 공 전체에
    //         격자를 그린다. 뒤쪽 원판은 더 옅다
    //   털    털은 원판 위에 종이까지 파낸 또렷한 선이다. 망점은 판을 9픽셀 칸으로 찍으므로 그보다 가는
    //         것을 옅게 찍으면 망점 속에 녹는다 — 종이로 파낸 자리만 망점을 거치지 않는다. 털이 모이는
    //         갓털의 한가운데는 흰 별점이 된다
    //   부리  꽃턱에서 갓털의 한가운데로 뻗는 흰 바퀴살
    const disc = (points) => (g) => {
      g.beginPath();
      shapes.polySubpath(g, points, true);
      g.fill();
    };
    for (const tuft of tufts) if (tuft.back) carve(inks, disc(tuft.rim), 0.2);
    for (const tuft of tufts) if (!tuft.back) carve(inks, disc(tuft.rim), 0.36);
    carve(inks, stroke(raysBack, line), 0.7);
    carve(inks, stroke(beaks, Math.max(1.2, mm * 0.3)), 0.9);
    carve(inks, stroke(raysFront, line), 1);

    // 꽃대. 공 밖에서는 바탕을 종이까지 파내고 찍는다 — 어두운 바탕에 겹쳐 찍으면 배색에 따라 묻힌다.
    // 옅은 통에 가장 짙은 통을 겹쳐 초록을 낸다(리소는 초록 잉크 없이 겹쳐서 초록을 낸다). 해를 등진
    // 오른쪽 3분의 1에는 짙은 통을 한 번 더 겹쳐 두 색의 납작한 면이 된다. 공 안에서는 갓털 너머로
    // 비치므로 옅게만 찍는다
    const ball = HEAD * mm;
    const inside = (paint) => (g) => {
      g.save();
      g.beginPath();
      g.arc(cx, cy, ball, 0, TAU);
      g.clip();
      paint(g);
      g.restore();
    };
    const outside = (paint) => (g) => {
      g.save();
      g.beginPath();
      g.rect(0, 0, width, height);
      g.arc(cx, cy, ball, 0, TAU);
      g.clip("evenodd");
      paint(g);
      g.restore();
    };
    const stemBand = band(edgeL, edgeR);
    const stemShade = band(edgeS, edgeR);
    carve(inks, outside(stemBand), 1);
    stain([stemInk], outside(stemBand), 0.8);
    stain([S.key], outside(stemBand), 0.3);
    stain([S.key], outside(stemShade), 0.3);
    stain([stemInk], inside(stemBand), 0.3);
    stain([S.key], inside(stemBand), 0.12);

    // 꽃턱과 씨. 꽃턱(반지름 3밀리)에 수과가 박혀 가운데에 모인다. 성긴 갓털 너머로 비치므로 맨 위에
    // 찍는다. 앞쪽 씨만, 꽃턱 밖으로 드러난 2.5밀리만 보인다 — 나머지는 앞 갓털의 밑동에 가린다. 꽃턱은
    // 따뜻한 통을 짙게, 가장 짙은 통을 옅게 겹쳐 연한 갈색이고, 씨는 가장 짙은 통을 짙게 겹쳐 그보다
    // 어두운 가시로 둘러난다
    const core = (g) => {
      g.beginPath();
      g.arc(cx, cy, RECEPTACLE * mm, 0, TAU);
      g.fill();
    };
    const spikes = stroke(seedsDark, 0.5 * mm);
    const warm = glowInk && glowInk !== S.key ? glowInk : null;
    if (warm) stain([warm], spikes, 0.55);
    stain([S.key], spikes, 0.7);
    carve(inks, core, 1);
    if (warm) stain([warm], core, 0.7);
    stain([S.key], core, 0.28);

    return { count: heads.length, total: count, cx, cy, radius: HEAD * mm };
  },

  // 안내선. 씨송이의 둘레와, 남은 씨의 수를 적는다
  guides(page, sketch) {
    if (!sketch) return [];
    return [
      { kind: "dot", at: [sketch.cx, sketch.cy], r: 4, ring: sketch.radius },
      { kind: "text", at: [page.margin, page.height - page.margin], text: `${sketch.count} / ${sketch.total} SEEDS` }
    ];
  }
};
