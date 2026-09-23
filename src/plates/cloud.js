// 구름. 땅에 서서 올려다본 한낮의 뭉게구름(적운) 밭. 언덕과 나무가 뒤따를 판의 하늘이다.
//
// 구름은 그리지 않는다. 기상학이 잰 규칙으로 짓는다.
//
//   바닥  적운의 바닥은 평평하고, 한 하늘의 구름은 모두 같은 높이에 바닥을 둔다. 같은 땅에서 오른
//         공기는 같은 높이(상승 응결 고도)에서 이슬점에 닿기 때문이다. 온대에서 500~1500미터다(BASE)
//   꼴    맑은 날의 적운(humilis)은 높이보다 폭이 넓다. 둘레는 프랙털이다 — 넓이 A와 둘레 P가
//         P ∝ √A^1.35를 따른다(Lovejoy 1982). 여기서는 거품 위에 거품을 세 겹으로 얹어 짓는다.
//         가장 넓은 자리는 바닥보다 조금 위에 있어 몸통이 바닥 밖으로 부풀어 나온다
//   크기  구름의 폭은 거듭제곱 분포를 따른다. 폭이 L인 구름의 수가 L^-1.66에 비례한다(Wood & Field
//         2011). 작은 구름이 많고 큰 구름은 드물다
//   덮개  하늘을 덮은 정도는 관측소가 쓰는 옥타로 센다. 하늘을 여덟으로 나눈 몫이다(OKTAS). 1~2는
//         조금, 3~4는 흩어짐, 5~7은 많음, 8은 흐림이다
//   원근  땅에 서서 지평선을 본다. 구름은 땅 위 어디에나 고르게 흩어지므로 멀수록 많다. 먼 구름일수록
//         작아지고 바닥이 지평선으로 내려앉으며 대기에 묻혀 옅다(HAZE). 바닥은 봉우리마다의 발자국 —
//         수평한 원판 — 을 올려다본 것이다. 높이 h의 원판을 d 떨어져 보면 h/d만큼 납작해지므로, 가까운
//         구름일수록 그늘진 바닥이 두껍게 보이고 햇빛 받은 몸통은 그 뒤로 가장자리만 내민다
//   빛    해는 왼쪽 위에 있다. 구름은 하늘을 파낸 종이다. 해를 등진 쪽은 몸통을 해 쪽으로 옮긴 꼴에
//         덮이지 않고 남은 자리이고, 그만큼 옅게 찍는다. 바닥은 그보다 짙게 찍는다. 그늘은 하늘빛을
//         받으므로 하늘과 같은 잉크로 찍는다
//   하늘  천정이 가장 짙고 지평선으로 갈수록 옅다
//   끓음  적운의 꼭대기는 끓어오른다. 거품마다 제 박자로 부풀었다 가라앉고, 한 바퀴에 정수 번이다
//
// 참고: 적운의 평평한 바닥과 상승 응결 고도, 구름 둘레의 프랙털 차원(Lovejoy 1982, Science 216),
// 구름 폭의 분포(Wood & Field 2011, J. Climate 24), 운량의 옥타(WMO).

import { makeRng, fieldSeed } from "../rng.js";
import * as shapes from "../shapes.js";
import { carve, stain } from "../night.js";
import { stainsFor, soak } from "../stains.js";

const TAU = Math.PI * 2;
// 폭의 분포. 폭이 L인 구름의 수가 L^-BETA에 비례한다
const BETA = 1.66;
const SMALLEST = 300;
const FARTHEST = 25000;
const MOST_CLOUDS = 220;

// 그늘을 뜨는 판. 구름마다 몸통을 그리고, 해 쪽으로 옮긴 몸통을 지워 해를 등진 가장자리만 남긴다
let shadeCanvas = null;

export const cloud = {
  id: "cloud",
  name: "CLOUD",
  about: "땅에서 올려다본 뭉게구름 밭 — 모두 같은 높이에 바닥을 둔다",
  model: "claude-opus-5",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "구름이 놓이는 자리와 꼴을 뽑는 씨앗. 종이의 롤은 그대로 둔다" },
    { key: "sky", label: "SKY", min: 0.3, max: 1, step: 0.05, value: 0.75, hint: "천정의 짙기. 지평선으로 갈수록 옅어진다" },
    { key: "oktas", label: "OKTAS", min: 0, max: 8, step: 1, value: 3, hint: "하늘을 덮은 구름의 몫. 관측소처럼 하늘을 여덟으로 나눈 몫(옥타)으로 센다. 1~2 조금, 3~4 흩어짐, 5~7 많음, 8 흐림" },
    { key: "size", label: "SIZE", min: 0.5, max: 5, step: 0.1, value: 2.4, hint: "가장 큰 구름의 폭(킬로미터). 가장 작은 구름은 300미터이고 그 사이를 거듭제곱 분포(L^-1.66)가 채운다" },
    { key: "base", label: "BASE", min: 500, max: 1500, step: 50, value: 1000, hint: "구름 바닥의 높이(미터). 모든 구름이 이 높이에 바닥을 둔다. 낮을수록 구름이 크고 가깝게 보인다" },
    { key: "shade", label: "SHADE", min: 0, max: 1, step: 0.05, value: 0.6, hint: "그늘의 짙기. 바닥이 가장 짙고, 해를 등진 쪽은 그 절반이다" },
    { key: "haze", label: "HAZE", min: 0, max: 1, step: 0.05, value: 0.5, hint: "먼 구름이 대기에 묻히는 정도. 0이면 지평선의 구름도 가까운 구름만큼 하얗다" },
    { key: "boil", label: "BOIL", min: 0, max: 1, step: 0.05, value: 0.4, hint: "꼭대기의 거품이 부풀었다 가라앉는 폭. 0이면 구름이 가만히 있다" },
    { key: "hand", label: "HAND", min: 0, max: 1, step: 0.05, value: 0.5, hint: "거품 가장자리가 손으로 오린 듯 흔들리는 정도" },
    { key: "stain", label: "STAIN", min: 0, max: 1, step: 0.05, value: 0.25, hint: "하늘이 얼룩덜룩한 정도. 0이면 하늘이 고르게 깔린다" },
    { key: "beat", label: "BEAT", min: 4, max: 48, step: 1, value: 16, hint: "한 바퀴를 몇 장으로 그리는가. 낮을수록 뚝뚝 끊긴다" }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;

    // 또박또박한 박자. 한 바퀴를 BEAT장으로 나누고 그 장의 시간으로만 그린다
    const beat = Math.max(1, Math.round(knobs.beat));
    const held = Math.floor(t * beat) / beat;

    const seed = fieldSeed(page, 0x4b1d2c3e);
    const layout = makeRng(seed);
    const cut = makeRng((seed ^ 0x2c1b3c6d) >>> 0);

    const inks = S.drums.map((drum) => drum.separation);
    const rest = inks.filter((sep) => sep !== S.key);

    // 하늘. 천정이 가장 짙고 지평선으로 갈수록 옅다
    const sky = knobs.sky;
    S.key.ramp(0, 0, width, height, { from: sky * 0.85, to: sky * 0.16 });
    S.wash.ramp(0, 0, width, height, { from: sky * 0.06, to: sky * 0.3 });
    if (S.body !== S.wash) S.body.ramp(0, 0, width, height, { from: sky * 0.3, to: sky * 0.08 });
    if (knobs.stain > 0) {
      const made = stainsFor(page.seed, knobs.stain, 0.8);
      soak(S.wash, made.wash, width, height);
      soak(S.body, made.body, width, height);
    }

    // 눈. 땅에 서서 지평선을 똑바로 본다. 화각은 60도이고 지평선은 판 높이의 78%에 있다 — 그 밑은
    // 언덕이 들어설 자리다
    const horizon = height * 0.78;
    const focal = width / 2 / Math.tan(Math.PI / 6);
    const baseH = knobs.base;
    // 바닥이 판 위 끝에서 20% 아래에 걸리는 구름부터 지평선께 25킬로미터까지. 그보다 가까운 구름은 머리
    // 위에 있어 판에는 회색 배만 매달린다
    const nearest = (focal * baseH) / (horizon - height * 0.2);

    // 구름을 하나씩 뽑아 하늘을 OKTAS만큼 덮을 때까지 늘어놓는다. 덮은 넓이는 구름마다 몸통과 바닥이
    // 판에 차지하는 네모의 6할로 어림한다
    const want = (knobs.oktas / 8) * width * horizon;
    const lo = Math.pow(SMALLEST, 1 - BETA);
    const hi = Math.pow(Math.max(SMALLEST, knobs.size * 1000), 1 - BETA);
    const clouds = [];
    let covered = 0;
    while (covered < want && clouds.length < MOST_CLOUDS) {
      // 땅 위에 고르게 흩어지므로 거리가 d인 구름의 수는 d에 비례한다
      const d = Math.sqrt(nearest * nearest + layout.next() * (FARTHEST * FARTHEST - nearest * nearest));
      const x = (layout.next() - 0.5) * 2 * d * Math.tan(Math.PI / 6) * 1.15;
      const span = Math.pow(lo + layout.next() * (hi - lo), 1 / (1 - BETA));
      const thick = span * layout.float(0.35, 0.6);
      const scale = focal / d;
      const wide = span * scale;
      const tall = thick * scale;
      // 바닥이 보이는 두께. 바닥의 앞 가장자리와 뒤 가장자리가 판에 앉는 높이의 차다
      const band = (focal * baseH * span) / (d * d);
      clouds.push({ d, x, span, thick, scale, wide, tall, band, seed: layout.int(0, 0x7fffffff) });
      covered += wide * 1.12 * (tall + band / 2) * 0.6;
    }
    // 먼 구름부터 찍는다. 가까운 구름이 먼 구름을 가린다
    clouds.sort((a, b) => b.d - a.d);

    const sunX = -0.55;
    const sunY = -0.84;

    // 구름마다 꼴을 짓는다. 윤곽은 한 번만 짓고 통마다 채운다
    const built = [];
    for (const one of clouds) {
      const cx = width / 2 + one.x * one.scale;
      const baseY = horizon - (focal * baseH) / one.d;
      if (one.wide < 3) continue;
      if (cx + one.wide < -width * 0.1 || cx - one.wide > width * 1.1) continue;

      // 거품. 몸통의 큰 봉우리들 위에 작은 거품, 그 위에 더 작은 거품. 봉우리는 가운데가 높다
      const bits = makeRng(one.seed >>> 0);
      const body = one.wide * 1.12;
      const lobes = Math.max(2, Math.min(5, Math.round(one.span / 700) + 1));
      const bubbles = [];
      const feet = [];
      const puff = (x, y, r, level) => {
        const k = bits.int(1, 2);
        const phase = bits.next();
        const swell = level > 0 ? 1 + knobs.boil * 0.12 * Math.sin(TAU * (k * held + phase)) : 1;
        bubbles.push({ x, y, r: r * swell, rest: r, level });
        return r * swell;
      };
      const reach = one.wide < 18 ? 0 : one.wide < 70 ? 1 : 2;
      for (let i = 0; i < lobes; i += 1) {
        const side = lobes === 1 ? 0 : i / (lobes - 1) - 0.5;
        const bell = 0.72 + 0.28 * Math.cos(side * Math.PI);
        const r0 = (one.tall / 1.3) * bell * bits.float(0.9, 1.1);
        const x0 = cx + side * (body - r0 * 1.2);
        const y0 = baseY - r0 * 0.3;
        const top = puff(x0, y0, r0, 0);
        // 봉우리는 바닥 평면이 자른 공이다. 공의 한가운데가 반지름의 0.3만큼 바닥 위에 있으므로 잘린 원 —
        // 발자국 — 의 반지름은 √(1 - 0.3²) ≈ 0.95배다. 평평한 판 위에 얹힌 솜뭉치처럼, 몸통이 바닥과 거의
        // 같은 폭으로 앉는다
        feet.push({ x: x0, r: r0 * 0.954 });
        if (reach < 1) continue;
        const buds = bits.int(2, 4);
        for (let j = 0; j < buds; j += 1) {
          const a = -Math.PI * (0.15 + (0.7 * (j + bits.float(0.2, 0.8))) / buds);
          // 거품은 봉우리 안에 반쯤 박힌다. 봉우리 가장자리에 걸치기만 하면 이웃 거품과 둘러서서 하늘
          // 한 조각을 가두고, 구름에 구멍이 난다
          const r1 = top * bits.float(0.38, 0.55);
          const out = top * bits.float(0.55, 0.72);
          const x1 = x0 + Math.cos(a) * out;
          const y1 = y0 + Math.sin(a) * out;
          const mid = puff(x1, y1, r1, 1);
          if (reach < 2) continue;
          const seeds = bits.int(1, 3);
          for (let m = 0; m < seeds; m += 1) {
            const b = -Math.PI * (0.15 + (0.7 * (m + bits.float(0.2, 0.8))) / seeds);
            puff(x1 + Math.cos(b) * mid * 0.7, y1 + Math.sin(b) * mid * 0.7, mid * bits.float(0.35, 0.5), 2);
          }
        }
      }
      // 몸통. 거품마다 손으로 오린 가장자리이고, 봉우리는 바닥에서 잘린다 — 바닥 밑으로 내려간 점을
      // 바닥까지 올린다. 작은 거품은 동그라미로 둔다. 오릴지는 부풀기 전의 크기로 정한다 — 부푼
      // 크기로 정하면 장마다 뽑는 수가 달라져 뒤 구름이 떨린다
      const shape = new Path2D();
      for (const bubble of bubbles) {
        if (bubble.level > 0 && bubble.rest < 6) {
          shapes.circleSubpath(shape, bubble.x, bubble.y, Math.max(0.5, bubble.r));
          continue;
        }
        const steps = Math.max(8, Math.min(20, Math.round(bubble.rest / 4)));
        const outline = shapes.blob(cut, bubble.x, bubble.y, bubble.r, { lobes: 5, wobble: 0.1 * knobs.hand, steps });
        shapes.splineSubpath(shape, bubble.level > 0 ? outline : outline.map(([x, y]) => [x, Math.min(y, baseY)]), true);
      }
      // 바닥. 봉우리마다의 발자국(수평한 원판)을 아래에서 올려다본 것이다. 원판의 높이가 h이고 d 떨어져
      // 있으면 h/d만큼 납작해진다. 봉우리를 따라 가장자리가 울퉁불퉁하다
      const squash = Math.min(1, baseH / one.d);
      const floor = new Path2D();
      for (const foot of feet) {
        floor.moveTo(foot.x + foot.r, baseY);
        floor.ellipse(foot.x, baseY, foot.r, Math.max(0.6, foot.r * squash), 0, 0, TAU);
      }
      // 구름 하나 — 몸통과 바닥을 한 번에 채운다. 따로 채우면 겹친 자리가 두 번 파인다
      const whole = new Path2D(shape);
      whole.addPath(floor);
      // 멀수록 대기에 묻힌다
      const far = Math.max(0, Math.min(1, (one.d - nearest) / (FARTHEST - nearest)));
      const mist = knobs.haze * 0.9 * Math.pow(far, 0.7);
      built.push({ cx, baseY, body, tall: one.tall, wide: one.wide, shape, floor, whole, clear: 1 - mist, shade: knobs.shade * (1 - mist) });
    }

    const fill = (path) => (g) => g.fill(path);
    const union = (list, pick) => {
      const path = new Path2D();
      for (const one of list) path.addPath(one[pick]);
      return path;
    };

    // 판에서 작게 보이는 먼 구름은 거리마다 묶어 한 번에 찍는다. 서로 겹칠 일이 드물고, 그늘은 바닥만 준다
    const small = built.filter((one) => one.wide < 36);
    const large = built.filter((one) => one.wide >= 36);
    const spread = Math.max(0.01, knobs.haze * 0.9);
    for (let bin = 0; bin < 4; bin += 1) {
      const group = small.filter((one) => Math.min(3, Math.floor(((1 - one.clear) * 4) / spread)) === bin);
      if (!group.length) continue;
      const clear = group.reduce((sum, one) => sum + one.clear, 0) / group.length;
      const shade = group.reduce((sum, one) => sum + one.shade, 0) / group.length;
      carve(inks, fill(union(group, "whole")), clear);
      if (shade > 0) {
        const floors = fill(union(group, "floor"));
        stain([S.key], floors, shade * 0.45);
        stain(rest, floors, shade * 0.2);
      }
    }

    // 큰 구름은 하나씩, 먼 것부터
    for (const one of large) {
      carve(inks, fill(one.whole), one.clear);
      if (!(one.shade > 0)) continue;

      // 해를 등진 쪽. 몸통을 그린 판에서 해 쪽으로 옮긴 몸통을 지우면 등진 가장자리만 남는다
      const shift = Math.max(1.5, one.tall * 0.14);
      const pad = Math.ceil(shift + 4);
      const left = Math.floor(one.cx - one.body - pad);
      const top = Math.floor(one.baseY - one.tall * 3 - pad);
      const w = Math.ceil(one.body * 2 + pad * 2);
      const h = Math.ceil(one.tall * 3 + pad * 2 + 4);
      shadeCanvas ??= document.createElement("canvas");
      if (shadeCanvas.width < w) shadeCanvas.width = w;
      if (shadeCanvas.height < h) shadeCanvas.height = h;
      const m = shadeCanvas.getContext("2d");
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.globalCompositeOperation = "source-over";
      m.clearRect(0, 0, w, h);
      m.fillStyle = "#000";
      m.setTransform(1, 0, 0, 1, -left, -top);
      m.fill(one.shape);
      m.globalCompositeOperation = "destination-out";
      m.setTransform(1, 0, 0, 1, -left + sunX * shift, -top + sunY * shift);
      m.fill(one.shape);
      const lay = (g) => g.drawImage(shadeCanvas, 0, 0, w, h, left, top, w, h);
      stain([S.key], lay, one.shade * 0.3);
      stain(rest, lay, one.shade * 0.14);

      // 바닥의 그늘. 하늘빛을 받아 하늘과 같은 잉크로 짙게 찍는다
      stain([S.key], fill(one.floor), one.shade * 0.45);
      stain(rest, fill(one.floor), one.shade * 0.2);
    }

    return { clouds: clouds.length, covered: covered / (width * horizon), horizon };
  },

  // 안내선. 지평선과, 구름이 덮은 몫을 적는다
  guides(page, sketch) {
    if (!sketch) return [];
    return [
      { kind: "line", from: [0, sketch.horizon], to: [page.width, sketch.horizon], dash: true },
      {
        kind: "text",
        at: [page.margin, page.height - page.margin],
        text: `${sketch.clouds} CLOUDS · ${(sketch.covered * 8).toFixed(1)} OKTAS`
      }
    ];
  }
};
