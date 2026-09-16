// 배색 이름을 제목으로 세운 한 장. 글자, 녹아웃, 큰 덩어리의 겹침을 한꺼번에 본다.

import { makeNoise } from "../rng.js";
import { DISPLAY, MONO, fit } from "../type.js";
import * as shapes from "../shapes.js";

// 겹치지 않게 흩는다. 장식이 제 위에 또 앉으면 덩어리로 보인다.
function scatter(R, count, bounds, spacing) {
  const placed = [];
  let guard = count * 40;
  while (placed.length < count && guard-- > 0) {
    const x = R.float(bounds.x, bounds.x + bounds.width);
    const y = R.float(bounds.y, bounds.y + bounds.height);
    if (placed.every((p) => Math.hypot(p[0] - x, p[1] - y) > spacing)) placed.push([x, y]);
  }
  return placed;
}

export const poster = {
  id: "poster",
  name: "POSTER",
  about: "제목과 큰 덩어리. 글자는 진한 통에, 바닥 글씨는 녹아웃으로",

  paint(S, R, page) {
    const { width, height, margin, palette, headline } = page;
    const noise = makeNoise(R);

    // 틀 — 위 모서리를 물고 나가는 띠, 아래를 채우는 블록
    S.key.block(0, 0, width, 26);
    S.body.block(-40, height - 148, width + 80, 200, { corners: [130, 0, 0, 0] });

    S.key.text(`RISO PICKUP — ${palette.label}`, margin, 104, { font: `500 13px ${MONO}`, track: 2.2 });

    // 제목
    const text = headline || `${palette.name}의 귀여운 배색`;
    const { size, lines } = fit(text, {
      font: (value) => `700 ${value}px ${DISPLAY}`,
      maxWidth: width - margin * 2,
      maxLines: 2,
      largest: 84,
      smallest: 44
    });

    const drumForLine = [S.key, S.body];
    lines.forEach((line, index) => {
      drumForLine[index % drumForLine.length].text(line, margin, 224 + index * (size + 16), {
        font: `700 ${size}px ${DISPLAY}`
      });
    });

    const ruleY = 224 + lines.length * (size + 16) - 30;
    S.key.line(
      shapes.wave(margin, ruleY, width - margin * 1.9, ruleY, {
        amplitude: 7,
        cycles: 11,
        noise,
        wobble: 2.4,
        offset: R.float(0, 50)
      }),
      { w: 5 }
    );

    // 주인공. 어느 짜임이 나오든 큰 두 덩어리는 반드시 겹치게 놓는다.
    // 두 통이 엇갈린 자리에 생기는 초승달이 이 장의 요점이다.
    const heroTop = ruleY + 64;
    const heroBottom = 872;
    const cx = width * 0.5;
    const cy = (heroTop + heroBottom) / 2;
    const radius = 214;

    const arrangement = R.pick(["sun", "cloud", "panel"]);
    if (arrangement === "sun") {
      S.body.shape(shapes.burst(R, cx + 46, cy - 26, radius * 1.08, { spikes: R.int(10, 14), inner: R.float(0.6, 0.72) }), { smooth: false });
      S.wash.shape(shapes.blob(R, cx - 74, cy + 44, radius * 0.86, { lobes: 4, wobble: 0.16 }));
      S.key.line(shapes.spiral(cx + 132, cy + 96, 8, 58, 2.6), { w: 6 });
    } else if (arrangement === "cloud") {
      S.wash.shape(shapes.blob(R, cx + 62, cy - 18, radius, { lobes: 6, wobble: 0.26, squash: 0.88 }));
      S.body.shape(shapes.blob(R, cx - 68, cy + 40, radius * 0.92, { lobes: 5, wobble: 0.3, squash: 1.06 }));
      S.key.line(shapes.wave(cx - 150, cy + 168, cx + 120, cy + 168, { amplitude: 16, cycles: 3.2, noise, wobble: 3 }), { w: 7 });
    } else {
      S.wash.shape(shapes.patch(R, cx - 210, cy - 180, 380, 340, 9));
      S.body.shape(shapes.blob(R, cx + 122, cy + 104, radius * 0.7, { lobes: 5, wobble: 0.22 }));
      S.key.line(shapes.zigzag(cx - 168, cy + 196, cx + 40, cy + 196, 5, 15), { w: 6, smooth: false });
    }

    // 곁가지
    for (const [x, y] of scatter(R, 11, { x: margin, y: heroTop - 30, width: width - margin * 2, height: heroBottom - heroTop + 60 }, 118)) {
      const drum = R.pick([S.key, S.key, S.body, S.wash]);
      const scale = R.float(0.8, 1.35);

      switch (R.pick(["sparkle", "drop", "leaf", "ring", "squiggle", "diamond"])) {
        case "sparkle":
          drum.draw((g) => { shapes.sparkle(g, x, y, 15 * scale); g.fill(); });
          break;
        case "drop":
          drum.shape(shapes.drop(R, x, y, 17 * scale, R.float(-0.5, 0.5)));
          break;
        case "leaf":
          drum.shape(shapes.leaf(R, x, y, 24 * scale, R.float(-1, 1)));
          break;
        case "ring":
          drum.line(shapes.blob(R, x, y, 21 * scale, { lobes: 3, wobble: 0.05 }), { w: 5, close: true });
          break;
        case "squiggle":
          drum.line(shapes.wave(x - 32 * scale, y, x + 32 * scale, y, { amplitude: 7 * scale, cycles: 2.2, noise, wobble: 2, offset: x }), { w: 4.5 });
          break;
        default:
          drum.draw((g) => { shapes.diamond(g, x, y, 13 * scale); g.fill(); });
      }
    }

    // 통 자체를 종이에 올린다. 겹친 자리의 섞인 색이 배색표가 말로 못 하는 부분이다.
    const swatchY = 966;
    const swatchR = 54;
    S.drums.forEach((drum, index) => {
      const x = margin + swatchR + index * swatchR * 1.42;
      drum.separation.shape(shapes.blob(R, x, swatchY, swatchR, { lobes: 3, wobble: 0.045 }));
    });

    const listX = margin + swatchR * 1.42 * S.drums.length + swatchR + 46;
    S.drums.forEach((drum, index) => {
      const y = swatchY - (S.drums.length - 1) * 13 + index * 26;
      drum.separation.disc(listX, y - 5, 7);
      S.key.text(drum.ink.toUpperCase(), listX + 20, y, { font: `500 17px ${MONO}`, track: 1.4 });
    });

    // 바닥 글씨는 흰 잉크가 아니다. 블록 자신에게서 파낸 자리에 종이가 드러난 것이다.
    S.body.knockout((sep) => {
      sep.text("RISO GRAPHIC", margin, height - 74, { font: `700 21px ${MONO}`, track: 3 });
      sep.text(`SAMPLE SHEET · ${S.drums.length} DRUMS · ONE PASS EACH`, margin, height - 48, { font: `500 12px ${MONO}`, track: 2 });
    });
  }
};
