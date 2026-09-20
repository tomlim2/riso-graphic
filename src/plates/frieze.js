// 프리즈. 띠 장식이다.
//
// 건축에서 기둥 위를 두르는 띠를 프리즈라 한다. 장식 도감(오언 존스, 마이어)의 띠 장식 판을 보면 셋이
// 한결같다 — 굵기가 고른 선 하나가 한 칸의 규칙대로 꺾이며 이어지고, 띠의 위아래를 가는 줄(레일)이 잡아
// 주며, 먹이 아니라 사이의 빈 곳이 무늬를 읽게 한다. 그래서 이 판은 덩어리가 아니라 선으로 그린다.
//
// 띠의 대칭은 일곱 가지뿐이다(프리즈 군). GROUP이 그 일곱을 고른다.
//
//   HOP         밀기만 한다. 가장 단순한 반복
//   STEP        반 칸 밀고 위아래를 뒤집는다(미끄럼 거울). 발자국처럼 엇갈린다
//   SIDLE       좌우를 뒤집는다. 칸마다 마주 본다
//   JUMP        위아래를 뒤집어 겹친다. 물에 비친 듯하다
//   SPIN HOP    180° 돌린다. 카드 무늬다
//   SPIN SIDLE  미끄럼 거울과 180°를 함께 쓴다
//   SPIN JUMP   거울을 다 쓴다. 가장 꽉 찬 것이다
//
// 칸 하나를 작은 캔버스에 한 번 그리고, 군이 정한 대로 밀고 뒤집어 줄을 채운다 — 만화경이 쐐기를 돌리고
// 뒤집던 방법 그대로다. 문양은 칸의 왼쪽 가운데에서 나와 오른쪽 가운데로 빠지므로, 뒤집어 붙여도 이웃
// 칸과 선이 이어진다.
//
//   MEANDER    줄기에서 올라간 띠가 한 바퀴 감겨 드는 그리스 자물쇠 무늬
//   FRET       성가퀴처럼 오르내리는 띠
//   GUILLOCHE  두 가닥이 서로를 감으며 지나가고 감긴 자리마다 둥근 눈이 남는다
//   ANTHEMION  줄기에서 잎 일곱이 부채처럼 펴지는 인동무늬
//   EGG        달걀과 살이 번갈아 오는 난설 무늬
//   SCROLL     굽이치다 끝이 안으로 말리는 물결 소용돌이
//   CHAIN      반원 둘이 위아래로 걸리는 고리 사슬
//   TOOTH      직선으로만 꺾이는 톱니
//   BEAD       가운데 줄에 구슬이 꿰인다. 아스트라갈이다
//   GLASS   만화경과 같은 색유리 조각(src/glass.js). 선 대신 덩어리인 유일한 칸이다
//
// 줄은 판을 덮도록 여러 겹이고, 넓은 줄과 좁은 줄이 번갈아 온다 — 도감의 한 장처럼. 줄마다 통 하나를
// 잡고 넷에 하나는 이웃 통에도 조금 비껴 찍어, 겹친 자리에서 제3의 색이 난다. 이웃한 줄은 반대로 흐른다.
// 흐르는 거리는 한 바퀴에 되풀이 단위의 정수 배라 되감기는 자리가 없다.

import { makeRng, fieldSeed } from "../rng.js";
import { KINDS, piece } from "../glass.js";

const TAU = Math.PI * 2;
const MOST_ROWS = 8;
const MOST_PIECES = 8; // GLASS 칸에 드는 조각의 끝값
const MOTIFS = ["MEANDER", "FRET", "GUILLOCHE", "ANTHEMION", "EGG", "SCROLL", "CHAIN", "TOOTH", "BEAD", "GLASS"];

// 일곱 프리즈 군. 칸 하나를 어떻게 붙이는가다. 한 벌은 [칸 수, 좌우, 위아래]이고, 칸 수는 옮겨 놓을
// 자리(칸 너비의 배수), 좌우와 위아래는 뒤집을지다. period는 무늬가 되풀이되는 칸 수다
const GROUPS = [
  { name: "HOP", period: 1, stamps: [[0, 1, 1]] },
  { name: "STEP", period: 2, stamps: [[0, 1, 1], [1, 1, -1]] },
  { name: "SIDLE", period: 2, stamps: [[0, 1, 1], [2, -1, 1]] },
  { name: "JUMP", period: 1, stamps: [[0, 1, 1], [0, 1, -1]] },
  { name: "SPIN HOP", period: 2, stamps: [[0, 1, 1], [2, -1, -1]] },
  { name: "SPIN SIDLE", period: 2, stamps: [[0, 1, 1], [1, 1, -1], [2, -1, -1], [1, -1, 1]] },
  { name: "SPIN JUMP", period: 2, stamps: [[0, 1, 1], [0, 1, -1], [2, -1, 1], [2, -1, -1]] }
];

// 칸을 그릴 캔버스. 통마다 하나씩 두고 줄마다 다시 쓴다
const cells = [];
function cellCanvas(index, width, height) {
  let canvas = cells[index];
  if (!canvas) {
    canvas = document.createElement("canvas");
    cells[index] = canvas;
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return canvas;
}

// 꺾인 줄 하나를 긋는다. 점은 칸의 좌표다 — x는 0에서 칸 너비, y는 줄 가운데가 0이다
function stroke(g, points) {
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) g.lineTo(x, y);
  g.stroke();
}

// 문양 하나를 칸에 그린다. 어느 것이든 왼쪽 가운데(0,0)에서 나와 오른쪽 가운데(w,0)로 빠진다 — 그래야
// 좌우로든 위아래로든 뒤집어 붙여도 이웃 칸과 선이 이어진다. 도감의 띠가 그렇듯 줄기(스파인)가 칸을
// 가로지르고 그 위로 문양이 자란다.
//
// high는 줄기에서 레일까지의 높이, wide는 선의 굵기다. 자물쇠 무늬는 모눈 위에 그린다 — 선과 빈칸이
// 같은 너비여야 무늬가 읽힌다. 그래서 칸살(u)을 잡고 그 배수로만 꺾는다
function motif(g, kind, w, high, wide, phase) {
  const spine = () => stroke(g, [[0, 0], [w, 0]]);
  switch (kind) {
    case "MEANDER": {
      // 그리스 자물쇠 무늬. 줄기에서 올라간 띠가 한 바퀴 감겨 들어간다. 칸살은 선 굵기의 두 배다
      const u = Math.max(wide * 2, high / 2);
      const hu = w / 6;
      spine();
      stroke(g, [[hu, 0], [hu, -u * 2], [hu * 5, -u * 2], [hu * 5, -u], [hu * 2.5, -u]]);
      break;
    }
    case "FRET": {
      // 성가퀴처럼 오르내리는 띠. 오른 자리와 내린 자리의 너비가 같다
      const u = Math.max(wide * 2, high * 0.9);
      stroke(g, [[0, 0], [w * 0.15, 0], [w * 0.15, -u], [w * 0.5, -u], [w * 0.5, u], [w * 0.85, u], [w * 0.85, 0], [w, 0]]);
      break;
    }
    case "GUILLOCHE": {
      // 두 가닥이 서로를 감으며 지나간다. 감긴 자리마다 둥근 눈이 남는다
      for (const way of [1, -1]) {
        const points = [];
        for (let i = 0; i <= 20; i += 1) {
          const at = i / 20;
          points.push([w * at, way * Math.sin(at * TAU) * high * 0.75]);
        }
        stroke(g, points);
      }
      g.beginPath();
      g.arc(w * 0.25, 0, high * 0.3, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(w * 0.75, 0, high * 0.3, 0, TAU);
      g.stroke();
      break;
    }
    case "ANTHEMION": {
      // 인동무늬. 줄기에서 잎이 부채처럼 펴지고, 밑동 양옆으로 소용돌이가 감긴다. 잎은 일곱이다
      spine();
      const fronds = 7;
      for (let k = 0; k < fronds; k += 1) {
        const a = Math.PI + (Math.PI * (k + 0.5)) / fronds;
        const long = high * (0.55 + 0.45 * Math.sin((Math.PI * (k + 0.5)) / fronds));
        stroke(g, [[w * 0.5, 0], [w * 0.5 + Math.cos(a) * long * 0.9, Math.sin(a) * long]]);
      }
      for (const way of [-1, 1]) {
        g.beginPath();
        g.arc(w * (0.5 + way * 0.3), -high * 0.2, high * 0.2, 0, TAU);
        g.stroke();
      }
      break;
    }
    case "EGG": {
      // 달걀과 살. 둥근 것과 뾰족한 것이 번갈아 온다
      spine();
      g.beginPath();
      g.ellipse(w * 0.5, -high * 0.45, w * 0.22, high * 0.45, 0, 0, TAU);
      g.stroke();
      for (const at of [0.05, 0.95]) {
        stroke(g, [[w * at, -high * 0.9], [w * at, -high * 0.1]]);
      }
      break;
    }
    case "SCROLL": {
      // 물결 소용돌이. 한 마디에 한 번 굽이치고 끝이 안으로 말린다
      const points = [];
      for (let i = 0; i <= 20; i += 1) {
        const at = i / 20;
        points.push([w * at, -Math.sin(at * Math.PI) * high * 0.85]);
      }
      stroke(g, points);
      const curl = [];
      for (let i = 0; i <= 12; i += 1) {
        const a = Math.PI * 1.4 * (i / 12);
        const r = high * 0.32 * (1 - i / 18);
        curl.push([w * 0.5 + Math.cos(a + Math.PI) * r, -high * 0.5 + Math.sin(a + Math.PI) * r]);
      }
      stroke(g, curl);
      break;
    }
    case "CHAIN":
      // 고리 사슬. 반원 둘이 위아래로 걸린다
      g.beginPath();
      g.arc(w * 0.25, 0, Math.min(w * 0.25, high), Math.PI, 0);
      g.stroke();
      g.beginPath();
      g.arc(w * 0.75, 0, Math.min(w * 0.25, high), 0, Math.PI);
      g.stroke();
      break;
    case "TOOTH":
      // 톱니. 직선으로만 꺾인다
      stroke(g, [[0, 0], [w * 0.25, -high], [w * 0.5, 0], [w * 0.75, high], [w, 0]]);
      break;
    default: {
      // 아스트라갈. 가운데 줄에 구슬이 꿰인다. 구슬은 박자를 따라 조금 부푼다
      spine();
      for (const at of [0.25, 0.75]) {
        g.beginPath();
        g.arc(w * at, 0, Math.min(high * 0.6, w * 0.12) * (0.85 + 0.15 * Math.sin(phase + at * TAU)), 0, TAU);
        g.fill();
      }
    }
  }
}

export const frieze = {
  id: "frieze",
  name: "FRIEZE",
  about: "띠 장식. 굵기가 고른 선이 칸의 규칙대로 꺾이며 판을 두른다",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "문양과 줄을 뽑는 씨앗. 종이의 롤은 그대로 두고 띠만 다시 뽑는다" },
    { key: "group", label: "GROUP", min: 0, max: 6, step: 1, value: 1, hint: "띠의 대칭. 0 HOP · 1 STEP · 2 SIDLE · 3 JUMP · 4 SPIN HOP · 5 SPIN SIDLE · 6 SPIN JUMP. 같은 문양이 규칙만 바뀌어 다른 띠가 된다" },
    { key: "motif", label: "MOTIF", min: 0, max: 10, step: 1, value: 0, hint: "칸에 드는 문양. 0이면 줄마다 섞어 도감의 한 장처럼 된다. 1 MEANDER · 2 FRET · 3 GUILLOCHE · 4 ANTHEMION · 5 EGG · 6 SCROLL · 7 CHAIN · 8 TOOTH · 9 BEAD · 10 GLASS" },
    { key: "rows", label: "ROWS", min: 1, max: MOST_ROWS, step: 1, value: 5, hint: "판을 덮는 줄의 수. 넓은 줄과 좁은 줄이 번갈아 온다" },
    { key: "cell", label: "CELL", min: 0.06, max: 0.4, step: 0.01, value: 0.16, hint: "칸의 너비. 판 폭에 대한 비율이다" },
    { key: "weight", label: "WEIGHT", min: 0.02, max: 0.2, step: 0.005, value: 0.07, hint: "선의 굵기. 줄 높이에 대한 비율이다. 굵을수록 빈 곳이 줄어 무늬가 막힌다" },
    { key: "rails", label: "RAILS", min: 0, max: 2, step: 1, value: 1, hint: "띠의 위아래를 잡는 가는 줄의 수. 0이면 문양만 남는다" },
    { key: "drift", label: "DRIFT", min: 0, max: 3, step: 1, value: 1, hint: "띠가 한 바퀴에 흐르는 되풀이 수. 정수라 되감기는 자리가 없다. 이웃한 줄은 반대로 흐른다. 0이면 서 있다" },
    { key: "tint", label: "TINT", min: 0.3, max: 1, step: 0.05, value: 0.9, hint: "얼마나 진하게 찍을지" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const turn = t * TAU;
    const group = GROUPS[Math.min(GROUPS.length - 1, Math.max(0, Math.round(knobs.group)))];
    const rows = Math.round(knobs.rows);
    const cellWidth = width * knobs.cell;
    const picked = Math.round(knobs.motif);

    // 줄과 문양은 제 씨앗으로 뽑는다. FIELD는 잉크와 종이결을 건드리지 않는다. 언제나 줄의 끝값만큼
    // 뽑고, ROWS는 그중 몇을 쓸지만 정한다
    const layout = makeRng(fieldSeed(page, 0x9e3779b9));
    const bands = Array.from({ length: MOST_ROWS }, (_, row) => ({
      shift: layout.next(),
      kind: MOTIFS[layout.int(0, MOTIFS.length - 1)],
      tall: row % 2 === 0 ? 1 : layout.float(0.45, 0.62), // 넓은 줄과 좁은 줄이 번갈아 온다
      glass: Array.from({ length: MOST_PIECES }, () => ({
        kind: layout.pick(KINDS),
        seed: Math.floor(layout.next() * 4294967296) >>> 0,
        x: layout.float(0.22, 0.78), // 칸 안에 머문다. 잘린 유리는 띠가 아니라 사고로 보인다
        y: layout.float(-0.3, 0.3),
        size: layout.float(0.6, 1.4),
        tone: layout.float(0.6, 1),
        tilt: layout.float(0, TAU),
        laps: layout.int(1, 2),
        phase: layout.float(0, TAU)
      }))
    }));

    // 줄의 자리. 넓은 줄과 좁은 줄의 몫을 나눠 판을 꽉 채운다
    const share = bands.slice(0, rows).reduce((sum, band) => sum + band.tall, 0);
    let top = 0;
    const laid = bands.slice(0, rows).map((band, row) => {
      const tall = (height * band.tall) / share;
      const middle = top + tall / 2;
      top += tall;
      const step = group.period * cellWidth;
      // 이웃한 줄은 반대로 흐른다. 흐르는 거리가 되풀이 단위의 정수 배라 t=1은 t=0과 같은 장이다
      const way = row % 2 === 0 ? 1 : -1;
      const shift = ((band.shift * step + way * Math.round(knobs.drift) * step * t) % step) - step;
      return { band, row, tall, middle, step, shift, kind: picked > 0 ? MOTIFS[picked - 1] : band.kind };
    });

    const drums = S.drums;
    const canvasWidth = Math.max(2, Math.ceil(cellWidth));

    drums.forEach((drum, index) => {
      for (const row of laid) {
        const mine = row.row % drums.length === index;
        const echo = drums.length > 1 && (row.row + 1) % drums.length === index && row.band.shift < 0.4;
        if (!mine && !echo) continue;

        // 칸 하나를 그린다. 원점은 칸의 왼쪽, 줄의 한가운데다
        const canvasHeight = Math.max(4, Math.ceil(row.tall));
        const canvas = cellCanvas(index, canvasWidth, canvasHeight);
        const g = canvas.getContext("2d");
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.translate(echo ? row.tall * 0.03 : 0, canvas.height / 2);
        g.fillStyle = "#000";
        g.strokeStyle = "#000";
        g.lineCap = "butt";
        g.lineJoin = "miter";
        g.globalAlpha = Math.min(1, knobs.tint * (mine ? 1 : 0.8));

        const wide = Math.max(1.2, row.tall * knobs.weight);
        const rails = Math.round(knobs.rails);
        // 레일. 띠의 위아래를 잡는다. 칸 너비를 넘겨 그어 이웃 칸과 이어진다
        for (let k = 0; k < rails; k += 1) {
          const at = row.tall * (0.5 - 0.05 - k * 0.07);
          g.lineWidth = wide * (k === 0 ? 0.8 : 0.45);
          stroke(g, [[-1, -at], [cellWidth + 1, -at]]);
          stroke(g, [[-1, at], [cellWidth + 1, at]]);
        }

        // 문양이 오르내릴 수 있는 높이. 레일 안쪽으로 선 굵기만큼 물러선다
        g.lineWidth = wide;
        const high = Math.max(2, row.tall * (0.5 - 0.08 - rails * 0.06) - wide * 0.6);
        if (row.kind === "GLASS") {
          // 유일하게 덩어리로 그리는 칸. 조각은 칸 안에서 제 작은 고리를 돈다. 도는 수가 정수라 루프가 닫힌다
          for (const p of row.band.glass) {
            const spun = turn * p.laps + p.phase;
            g.globalAlpha = Math.min(1, p.tone * knobs.tint * (mine ? 1 : 0.8));
            piece(
              g,
              p.kind,
              p.seed,
              p.x * cellWidth + Math.cos(spun) * high * 0.12,
              p.y * row.tall + Math.sin(spun) * high * 0.12,
              high * 0.42 * p.size,
              p.tilt + Math.sin(spun) * 0.3
            );
          }
        } else {
          motif(g, row.kind, cellWidth, high, wide, turn + row.row);
        }

        // 붙인다. 군이 정한 대로 밀고 뒤집어 줄을 채운다
        const times = Math.ceil(width / row.step) + 2;
        drum.separation.draw((sheet) => {
          for (let k = 0; k < times; k += 1) {
            for (const [dx, sx, sy] of group.stamps) {
              sheet.save();
              sheet.translate(row.shift + k * row.step + dx * cellWidth, row.middle);
              sheet.scale(sx, sy);
              sheet.drawImage(canvas, 0, -canvas.height / 2);
              sheet.restore();
            }
          }
        });
      }
    });

    // 이 장의 뼈대. 안내선이 판을 다시 계산하지 않고 이 장이 쓴 자리를 그대로 본다
    return {
      group: group.name,
      cellWidth,
      laid: laid.map((row) => ({ middle: row.middle, tall: row.tall, step: row.step, shift: row.shift, kind: row.kind }))
    };
  },

  // 안내선. 줄의 한가운데와 무늬가 되풀이되는 자리를 보여 준다
  guides(page, sketch) {
    if (!sketch) return [];
    const { width } = page;
    const marks = [];
    for (const row of sketch.laid) {
      marks.push({ kind: "line", from: [0, row.middle], to: [width, row.middle], dash: true });
      for (let x = row.shift; x <= width; x += row.step) {
        if (x >= 0) marks.push({ kind: "line", from: [x, row.middle - row.tall * 0.5], to: [x, row.middle + row.tall * 0.5], dash: true });
      }
    }
    const kinds = [...new Set(sketch.laid.map((row) => row.kind))].join(" · ");
    marks.push({
      kind: "text",
      at: [page.margin, page.height - page.margin],
      text: `${sketch.group} · ${kinds} · CELL ${Math.round(sketch.cellWidth)}PX · REPEAT ${Math.round(sketch.laid[0] ? sketch.laid[0].step : 0)}PX`
    });
    return marks;
  }
};
