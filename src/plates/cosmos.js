// 망원경으로 들여다본 우주.
//
// 현미경의 시야는 밝고 망원경의 시야는 어둡다. 둥근 틀(src/roundel.js) 안을 짙게 깔고, 빛나는
// 것은 전부 파낸다. 흰 잉크가 없고 곱하기는 어둡게만 만들기 때문이다. JELLY의 물과 같은 방식이다.
//
// 통은 밝기가 아니라 색으로 나눈다. 노란 통을 하늘에 깔면 파랑과 곱해져 밤이 초록이 된다. 그래서
// 노랗지 않은 통만 밤이 되어 하늘을 깔고, 노란 통은 빛이 되어 빛나는 자리에만 얹는다.
//
//   하늘    밤의 통을 모두 깐다. 그중 가장 진한 통을 가장 짙게
//   은하수  시야를 비스듬히 가로지르는 띠. 밤을 흐릿하게 파내 밝히고, 중심 쪽에는 빛의 통을 옅게
//           얹는다. 띠를 따라 길게 늘인 잡음의 능선이 먼지 골짜기가 되어 가장 진한 통을 도로
//           얹는다. 띠 안에는 아주 작은 별이 별 구름으로 뭉쳐 빽빽하다
//   성운    밤의 통을 구름 모양으로 파내 옅게 밝히고, 가장 진한 통을 한 번 더 파낸 자리는 남은 밤의
//           색으로 빛난다. 빛의 통을 얹은 자리는 따뜻한 가스가 된다. 가는 먼지 줄기는 가장 진한 통을
//           도로 얹는다
//   은하    기운 원반에 로그 나선 팔을 감는다. 원반을 파내고, 팔은 가장 진한 통을 더 파내 푸르게
//           둔다. 한가운데는 희고 그 둘레에 빛의 통을 얹어 노랗다. 실제 나선 은하가 그렇다. 팔을 따라
//           뭉친 별 무리는 밝게, 팔의 안쪽 가장자리를 따라 먼지 띠가 진하게 지나간다
//   별      크기가 거듭제곱으로 퍼진다. 작은 것이 아주 많고 큰 것은 드물다. 흰 별은 밤의 통을 다
//           파내고, 노란 별은 거기에 빛의 통을 얹고, 푸른 별은 가장 진한 통만 파낸다. 가장 밝은 별에는
//           경통 안의 거미발이 만드는 회절 십자가 선다. 십자는 모두 같은 방향이다 — 같은 망원경을
//           지난 빛이므로
//
// 움직임은 별마다 따로다. 저마다 박자가 다르게 반짝이고, 대기가 흔들려 제자리에서 조금씩 떤다.
// 성운과 은하는 움직이지 않는다. 박자는 모두 한 바퀴에 정수 번이다.
//
// 은하수와 성운과 은하는 픽셀마다 계산하는 무늬라 작은 캔버스에 한 번 구워 두고 늘려 찍는다. 롤과
// 모양이 같으면 다시 굽지 않는다. 별은 언제나 같은 수만큼 뽑고, STARS와 MILKY는 그중 몇을 찍을지만
// 정한다. 은하수의 자리와 별은 다른 것을 다 뽑은 뒤에 뽑아, 은하수를 더해도 나머지 자리가 그대로다.

import { makeRng, makeNoise2, fieldSeed } from "../rng.js";
import { circleSubpath } from "../shapes.js";
import { keeper } from "../keep.js";
import { roundel } from "../roundel.js";
import { SCOPE_KNOBS, dim } from "../scope.js";
import { nightAndLight } from "../drums.js";
import { floodNight, carve, stain } from "../night.js";

const TAU = Math.PI * 2;
const MOST_STARS = 800;
const MOST_CROWD = 1400;
const BAND_SIZE = 220;
const NEBULA_SIZE = 160;
const GALAXY_SIZE = 200;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

const ease = (a, b, x) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

// 가우스 분포 하나. 언제나 두 번 뽑는다
function gauss(rng) {
  const a = 1 - rng.next();
  const b = rng.next();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(TAU * b);
}

function fbm(noise, x, y, octaves) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o += 1) {
    sum += amp * noise(x * f, y * f);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

// 알파만 담은 작은 캔버스 여러 장을 한 번에 굽는다. sample은 칸마다 채널 값의 배열을 낸다
function bake(size, channels, sample) {
  const pixels = Array.from({ length: channels }, () => new Uint8ClampedArray(size * size * 4));
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < size; i += 1) {
      const values = sample(i, j);
      const at = (j * size + i) * 4 + 3;
      for (let c = 0; c < channels; c += 1) pixels[c][at] = values[c] * 255;
    }
  }
  return pixels.map((data) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").putImageData(new ImageData(data, size, size), 0, 0);
    return canvas;
  });
}

// 구운 것은 몇 벌 쥐고 있는다. 손잡이를 오가도 다시 굽지 않게
const keep = keeper(6);

// 성운. 흐름을 한 번 비튼 잡음으로 구름을 짓고, 가장자리는 잡음을 따라 들쭉날쭉 사라진다.
// 채널은 넷이다 — 빛(밤을 파냄), 따뜻한 가스(빛의 통을 얹음), 차가운 가스(가장 진한 통을 더
// 파냄), 먼지(가장 진한 통을 도로 얹음)
function nebulaFor(seed, cloud) {
  return keep(`nebula|${seed}|${cloud.x}|${cloud.y}|${cloud.r}`, () => {
    const rng = makeRng((seed ^ 0x2f8f1c3d) >>> 0);
    const flow = makeNoise2(rng);
    const body = makeNoise2(rng);
    const tint = makeNoise2(rng);
    const span = cloud.r * 2.4;
    const x0 = cloud.x - cloud.r * 1.2;
    const y0 = cloud.y - cloud.r * 1.2;
    const images = bake(NEBULA_SIZE, 4, (i, j) => {
      const x = x0 + ((i + 0.5) / NEBULA_SIZE) * span;
      const y = y0 + ((j + 0.5) / NEBULA_SIZE) * span;
      const px = x / 190;
      const py = y / 190;
      const qx = fbm(flow, px + 3.1, py + 7.7, 3);
      const qy = fbm(flow, px + 8.3, py + 2.8, 3);
      const v = fbm(body, px + 2.6 * qx, py + 2.6 * qy, 5);
      const d = Math.hypot(x - cloud.x, (y - cloud.y) * 1.15) / cloud.r;
      const fall = 1 - ease(0.25, 1.1, d + (v - 0.5) * 1.1);
      const glow = clamp01((v - 0.36) * 2.4) * fall;
      const warm = clamp01((fbm(tint, px * 1.7 + 5, py * 1.7, 4) - 0.5) * 3.2 + glow - 0.45) * fall;
      const cool = clamp01((fbm(tint, px * 1.4 - 4, py * 1.4 + 9, 4) - 0.5) * 3.2 + glow - 0.55) * fall;
      const ridge = 1 - Math.abs(fbm(body, px * 2.3 + 11, py * 2.3 - 3, 4) * 2 - 1);
      const dust = clamp01((ridge - 0.78) * 5) * ease(0.15, 0.5, glow);
      return [glow, warm, cool, dust];
    });
    return { images, box: { x: x0, y: y0, span } };
  });
}

// 은하수. 시야 전체를 덮는 한 장이다. 띠를 가로지르는 방향으로 가우스처럼 짙고, 띠를 따라서는
// 중심 쪽이 더 밝다. 채널은 셋이다 — 빛(밤을 파냄), 중심의 따뜻한 빛(빛의 통을 얹음), 먼지 골짜기
// (가장 진한 통을 도로 얹음). 골짜기는 띠를 따라 길게 늘인 잡음의 능선이라 띠와 나란히 흐른다
function bandFor(seed, band, cx, cy, ring) {
  return keep(`band|${seed}|${cx}|${cy}|${ring}`, () => {
    const rng = makeRng((seed ^ 0x1b873593) >>> 0);
    const clouds = makeNoise2(rng);
    const rift = makeNoise2(rng);
    const cos = Math.cos(band.angle);
    const sin = Math.sin(band.angle);
    const span = ring * 2;
    const images = bake(BAND_SIZE, 3, (i, j) => {
      const dx = ((i + 0.5) / BAND_SIZE) * span - ring;
      const dy = ((j + 0.5) / BAND_SIZE) * span - ring;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos - band.offset;
      const across = v / band.width;
      const profile = Math.exp(-(across * across));
      const core = (u - band.core) / ring;
      const lumps = fbm(clouds, u / 120 + 3, v / 120 + 5, 4);
      const glow = clamp01(profile * (0.35 + 0.9 * (lumps - 0.3)) * (0.6 + 0.5 * Math.exp(-((core / 0.9) ** 2))));
      const warm = clamp01(Math.exp(-((across / 0.7) ** 2)) * Math.exp(-((core / 0.45) ** 2)) * (0.4 + lumps) * 0.9);
      const ridge = 1 - Math.abs(fbm(rift, u / 260 + 1, v / 70 + 7, 4) * 2 - 1);
      const lane = clamp01((ridge - 0.72) * 3.5) * Math.exp(-(((across - band.rift) / 0.55) ** 2));
      const patches = clamp01((fbm(rift, u / 150 - 4, v / 90 + 2, 3) - 0.6) * 3) * profile;
      return [glow, warm, clamp01(lane + patches * 0.8)];
    });
    return { images, box: { x: cx - ring, y: cy - ring, span } };
  });
}

// 은하. 기운 원반의 좌표로 옮겨 나선 팔과 가운데 부푼 곳을 잰다. 가운데는 기울여도 덜 눌린다.
// 채널은 다섯이다 — 원반의 빛, 흰 한가운데를 두른 노란 테, 팔, 뭉친 별 무리, 먼지 띠
function galaxyFor(seed, disk) {
  return keep(`galaxy|${seed}|${disk.x}|${disk.y}|${disk.r}|${disk.tilt}|${disk.arms}`, () => {
    const rng = makeRng((seed ^ 0x6d2b79f5) >>> 0);
    const lumps = makeNoise2(rng);
    const half = disk.r * 1.15;
    const cos = Math.cos(disk.pa);
    const sin = Math.sin(disk.pa);
    const pitch = Math.tan(0.3);
    const images = bake(GALAXY_SIZE, 5, (i, j) => {
      const dx = ((i + 0.5) / GALAXY_SIZE) * 2 * half - half;
      const dy = ((j + 0.5) / GALAXY_SIZE) * 2 * half - half;
      const u = (dx * cos + dy * sin) / disk.r;
      const w = (-dx * sin + dy * cos) / disk.r;
      const v = w / disk.tilt;
      const r = Math.hypot(u, v);
      const wind = disk.arms * (Math.atan2(v, u) * disk.spin - Math.log(Math.max(r, 0.03)) / pitch) + disk.phase;
      const arm = Math.pow(0.5 + 0.5 * Math.cos(wind), 3);
      const clump = fbm(lumps, u * 5 + 7, v * 5 + 3, 3);
      const plate = Math.exp(-r / 0.42) * (1 - ease(0.72, 1.02, r));
      const bulge = Math.exp(-((Math.hypot(u, w / Math.max(disk.tilt, 0.6)) / 0.14) ** 2));
      const glow = clamp01(bulge * 1.3 + plate * (0.2 + 1.3 * arm * (0.55 + 0.9 * clump)));
      const halo = clamp01(bulge * 1.5) * (1 - clamp01(bulge ** 3 * 1.4));
      const arms = clamp01(plate * 1.6 * arm * (0.5 + clump)) * (1 - bulge);
      const knots = clamp01((clump - 0.58) * 4) * arm * clamp01(plate * 2.2) * (1 - bulge);
      const lane = Math.pow(0.5 + 0.5 * Math.cos(wind - 0.9), 8) * clamp01(plate * 2.5) * (1 - bulge) * 0.9;
      return [glow, halo, arms, knots, lane];
    });
    return { images, box: { x: disk.x - half, y: disk.y - half, span: half * 2 } };
  });
}

// 구운 무늬 한 장을 제자리에 늘려 찍는다. hollow면 그만큼 파낸다
function lay(sep, image, box, alpha, hollow) {
  if (!sep) return;
  const paint = (g) => {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "low";
    g.drawImage(image, box.x, box.y, box.span, box.span);
  };
  (hollow ? carve : stain)([sep], paint, alpha);
}

// 회절 십자 하나. 가운데가 굵고 끝으로 가는 마름모 둘
function spikes(g, x, y, length, width, angle) {
  for (const a of [angle, angle + Math.PI / 2]) {
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    g.moveTo(x + ax * length, y + ay * length);
    g.lineTo(x - ay * width, y + ax * width);
    g.lineTo(x - ax * length, y - ay * length);
    g.lineTo(x + ay * width, y - ax * width);
    g.closePath();
  }
}

export const cosmos = {
  id: "cosmos",
  name: "COSMOS",
  about: "망원경으로 들여다본 우주. 은하수가 가로지르고 성운이 번지고 은하가 기울어 있고, 별이 저마다 반짝인다",

  knobs: [
    { key: "field", label: "FIELD", min: 0, max: 199, step: 1, value: 0, hint: "하늘의 씨앗. 종이의 롤은 그대로 두고 은하수와 성운과 은하와 별의 자리만 다시 뽑는다" },
    { key: "stars", label: "STARS", min: 0, max: 800, step: 10, value: 320, hint: "별의 수" },
    { key: "spikes", label: "SPIKES", min: 0, max: 16, step: 1, value: 6, hint: "회절 십자를 세울 밝은 별의 수" },
    { key: "twinkle", label: "TWINKLE", min: 0, max: 1, step: 0.05, value: 0.5, hint: "별이 저마다 반짝이고 떠는 정도" },
    { key: "milky", label: "MILKY", min: 0, max: 1, step: 0.05, value: 0.7, hint: "은하수의 짙기. 흐릿한 빛과 별 구름과 먼지 골짜기" },
    { key: "nebula", label: "NEBULA", min: 0, max: 1, step: 0.05, value: 0.75, hint: "성운이 얼마나 밝게 번지는지" },
    { key: "galaxy", label: "GALAXY", min: 0, max: 0.3, step: 0.01, value: 0.2, hint: "은하의 크기. 0이면 없다" },
    { key: "tilt", label: "TILT", min: 0.2, max: 1, step: 0.05, value: 0.45, hint: "은하 원반이 얼마나 기울었는지. 1이면 정면이다" },
    { key: "arms", label: "ARMS", min: 1, max: 4, step: 1, value: 2, hint: "나선 팔의 수" },
    { key: "dark", label: "DARK", min: 0.4, max: 1, step: 0.05, value: 0.9, hint: "하늘이 얼마나 어두운지" }
  ],
  scope: SCOPE_KNOBS,

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const turn = t * TAU;
    const cx = width / 2;
    const cy = height / 2;
    const ring = width * knobs.frame;

    // 자리는 제 씨앗으로 뽑는다. FIELD는 잉크와 종이결을 건드리지 않고 하늘만 다시 뽑는다.
    // 굽는 일은 따로 굴린 난수로 하므로, 구운 것이 있든 없든 여기서 뽑는 수는 같다
    const seed = fieldSeed(page, 0x6c8e9cf5);
    const layout = makeRng(seed);

    // 성운과 은하는 시야의 서로 반대쪽에 선다
    const side = layout.float(0, TAU);
    const reach = layout.float(0.12, 0.32);
    const cloud = { x: cx + Math.cos(side) * ring * reach, y: cy + Math.sin(side) * ring * reach, r: ring * layout.float(0.62, 0.8) };
    const across = side + Math.PI + layout.float(-0.6, 0.6);
    const out = layout.float(0.38, 0.52);
    const disk = {
      x: cx + Math.cos(across) * ring * out,
      y: cy + Math.sin(across) * ring * out,
      r: width * knobs.galaxy,
      tilt: knobs.tilt,
      arms: knobs.arms,
      pa: layout.float(0, Math.PI),
      spin: layout.chance(0.5) ? 1 : -1,
      phase: layout.float(0, TAU)
    };
    const spider = layout.float(0, Math.PI / 2);

    const stars = Array.from({ length: MOST_STARS }, () => {
      const angle = layout.float(0, TAU);
      const dist = Math.sqrt(layout.next()) * ring;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        size: 2 + 7 * layout.next() ** 6,
        kind: layout.next(),
        beat: layout.int(1, 3),
        phase: layout.float(0, TAU),
        wobble: layout.int(1, 2),
        drift: layout.float(0, TAU)
      };
    }).slice(0, knobs.stars);

    // 은하수의 자리와 띠 안의 작은 별. 다른 것을 다 뽑은 뒤에 뽑는다. 별의 여섯에 넷은 별 구름에
    // 뭉치고 나머지는 띠를 따라 고르게 흩어진다
    const band = {
      angle: layout.float(0, Math.PI),
      offset: layout.float(-0.25, 0.25) * ring,
      width: ring * layout.float(0.26, 0.36),
      core: layout.float(-0.45, 0.45) * ring,
      rift: layout.float(-0.3, 0.3),
      clouds: Array.from({ length: 7 }, () => ({
        u: layout.float(-1, 1) * ring,
        v: layout.float(-0.5, 0.5),
        spread: layout.float(0.12, 0.3) * ring
      }))
    };
    const bandCos = Math.cos(band.angle);
    const bandSin = Math.sin(band.angle);
    const crowd = Array.from({ length: MOST_CROWD }, () => {
      const roll = layout.next();
      const cloud = band.clouds[layout.int(0, band.clouds.length - 1)];
      const spread = layout.float(-1.1, 1.1);
      const ga = gauss(layout);
      const gb = gauss(layout);
      const clumped = roll < 0.6;
      const u = clumped ? cloud.u + ga * cloud.spread : spread * ring;
      const v = (clumped ? cloud.v * band.width + gb * cloud.spread * 0.5 : gb * band.width * 0.8) + band.offset;
      return {
        x: cx + u * bandCos - v * bandSin,
        y: cy + u * bandSin + v * bandCos,
        size: 1.5 + 1.3 * layout.next() ** 3,
        kind: layout.next(),
        beat: layout.int(1, 3),
        phase: layout.float(0, TAU)
      };
    })
      .slice(0, Math.round(MOST_CROWD * knobs.milky))
      .filter((star) => Math.hypot(star.x - cx, star.y - cy) < ring);

    const { night, deepest, light } = nightAndLight(S.drums);
    const [glowInk, otherInk] = light;

    // 하늘. 밤의 통을 모두 깔고, 가장 진한 통을 가장 짙게
    const dark = knobs.dark;
    floodNight(night, deepest, dark);

    // 은하수. 흐릿한 빛, 중심의 따뜻한 빛, 먼지 골짜기
    const milky = knobs.milky;
    if (milky > 0) {
      const { images, box } = bandFor(seed, band, cx, cy, ring);
      const [glow, warm, dust] = images;
      for (const sep of night) lay(sep, glow, box, milky * (sep === deepest ? 0.8 : 0.55), true);
      if (glowInk) {
        for (const sep of night) lay(sep, warm, box, milky * 0.35, true);
        lay(glowInk, warm, box, milky * 0.55, false);
      }
      lay(deepest, dust, box, milky * 0.85, false);
    }

    // 성운
    const neb = knobs.nebula;
    if (neb > 0) {
      const { images, box } = nebulaFor(seed, cloud);
      const [glow, warm, cool, dust] = images;
      for (const sep of night) lay(sep, glow, box, neb * (sep === deepest ? 1.15 : 0.9), true);
      lay(deepest, cool, box, neb, true);
      if (glowInk) {
        for (const sep of night) lay(sep, warm, box, neb * 0.9, true);
        lay(glowInk, warm, box, neb * 0.85, false);
      }
      lay(otherInk, cool, box, neb * 0.6, false);
      lay(deepest, dust, box, neb * 0.8, false);
    }

    // 은하
    if (disk.r > 0) {
      const { images, box } = galaxyFor(seed, disk);
      const [glow, halo, arms, knots, lane] = images;
      for (const sep of night) lay(sep, glow, box, 1, true);
      lay(deepest, arms, box, 1, true);
      lay(glowInk, halo, box, 0.9, false);
      for (const sep of night) lay(sep, knots, box, 1, true);
      lay(otherInk || glowInk, knots, box, 0.5, false);
      lay(deepest, lane, box, 0.85, false);
    }

    // 별. 저마다 박자가 다르게 반짝이고, 제자리에서 조금씩 떤다
    const shimmer = knobs.twinkle;
    const lit = stars.map((star) => {
      const pulse = 1 + shimmer * 0.45 * Math.sin(turn * star.beat + star.phase);
      const shake = shimmer * 1.2;
      return {
        x: star.x + Math.cos(turn * star.wobble + star.drift) * shake,
        y: star.y + Math.sin(turn * star.wobble + star.drift * 1.7) * shake,
        r: star.size * pulse,
        pulse,
        star
      };
    });

    // 은하수의 작은 별. 조금만 반짝이고 조금만 떤다
    const dust = crowd.map((star) => {
      const pulse = 1 + shimmer * 0.35 * Math.sin(turn * star.beat + star.phase);
      const shake = shimmer * 0.6;
      return {
        x: star.x + Math.cos(turn * star.beat + star.phase) * shake,
        y: star.y + Math.sin(turn * star.beat + star.phase * 1.7) * shake,
        r: star.size * pulse,
        star
      };
    });

    // 밝은 별 둘레의 번짐. 가장 진한 통만 옅게 파낸다
    const bright = lit.filter((s) => s.star.size > 3.2);
    if (bright.length) {
      carve([deepest], (g) => {
        for (const s of bright) {
          const halo = g.createRadialGradient(s.x, s.y, s.r * 0.8, s.x, s.y, s.r * 3.2);
          halo.addColorStop(0, "rgba(0, 0, 0, 0.5)");
          halo.addColorStop(1, "rgba(0, 0, 0, 0)");
          g.fillStyle = halo;
          g.beginPath();
          g.arc(s.x, s.y, s.r * 3.2, 0, TAU);
          g.fill();
        }
      });
    }

    // 별의 몸. 흰 별은 밤의 통을 다 파내고, 노란 별은 거기에 빛의 통을 얹고, 푸른 별은 가장 진한
    // 통만 파낸다
    const discs = (list) => (g) => {
      g.beginPath();
      for (const s of list) {
        circleSubpath(g, s.x, s.y, s.r);
      }
      g.fill();
    };
    const warm = lit.filter((s) => s.star.kind >= 0.55 && s.star.kind < 0.8);
    const pale = [...lit.filter((s) => s.star.kind < 0.8), ...dust.filter((s) => s.star.kind < 0.75)];
    carve([deepest], discs([...lit, ...dust]));
    if (pale.length) carve(night.filter((sep) => sep !== deepest), discs(pale));
    if (glowInk && warm.length) stain([glowInk], discs(warm), 0.9);

    // 회절 십자. 가장 밝은 별 몇에만, 모두 같은 방향으로
    const crossed = [...lit].sort((a, b) => b.star.size - a.star.size).slice(0, knobs.spikes);
    if (crossed.length) {
      carve(night, (g) => {
        g.beginPath();
        for (const s of crossed) spikes(g, s.x, s.y, s.star.size * (4.5 + 3 * s.pulse), Math.max(1.6, s.star.size * 0.3), spider);
        g.fill();
      });
    }

    // 시야 가장자리. 다 그린 뒤에 가장 진한 통으로 한 켜 눌러, 가장자리의 별과 가스까지 함께 죽인다
    dim(deepest, page, ring, knobs.vignette);

    roundel(S, page, ring);
  }
};
