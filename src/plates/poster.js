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
    const { width, height, margin, palette, headline, t } = page;
    const noise = makeNoise(R);

    // 정지된 장이 아니라 아주 천천히 숨 쉬는 장이다. 모든 흔들림은 t에 대해 한 바퀴라
    // 마지막 프레임이 첫 프레임으로 그대로 이어진다.
    const turn = t * Math.PI * 2;
    const swing = (phase = 0) => Math.sin(turn + phase);
    const drift = (points, dx, dy) => points.map(([x, y]) => [x + dx, y + dy]);
    const rock = (points, cx, cy, angle) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return points.map(([x, y]) => {
        const px = x - cx;
        const py = y - cy;
        return [cx + px * cos - py * sin, cy + px * sin + py * cos];
      });
    };

    // 틀 — 위 모서리를 물고 나가는 띠, 아래를 채우는 블록
    const footTop = height * 0.87;
    S.key.block(0, 0, width, height * 0.024);
    S.body.block(-40, footTop, width + 80, height * 0.2, { corners: [height * 0.12, 0, 0, 0] });

    S.key.text(`RISO PICKUP — ${palette.label}`, margin, height * 0.094, { font: `500 13px ${MONO}`, track: 2.2 });

    // 제목
    const text = headline || `${palette.name}의 귀여운 배색`;
    const { size, lines } = fit(text, {
      font: (value) => `700 ${value}px ${DISPLAY}`,
      maxWidth: width - margin * 2,
      maxLines: 2,
      largest: 78,
      smallest: 42
    });

    const drumForLine = [S.key, S.body];
    const headTop = height * 0.2;
    lines.forEach((line, index) => {
      drumForLine[index % drumForLine.length].text(line, margin, headTop + index * (size + 14), {
        font: `700 ${size}px ${DISPLAY}`
      });
    });

    const ruleY = headTop + lines.length * (size + 14) - size * 0.36;
    S.key.line(
      shapes.wave(margin, ruleY, width - margin * 1.9, ruleY, {
        amplitude: 7,
        cycles: 11,
        noise,
        wobble: 2.4,
        offset: R.float(0, 50),
        phase: turn
      }),
      { w: 5 }
    );

    // 주인공. 어느 짜임이 나오든 큰 두 덩어리는 반드시 겹치게 놓는다.
    // 두 통이 엇갈린 자리에 생기는 초승달이 이 장의 요점이다.
    const heroTop = ruleY + 46;
    const heroBottom = height * 0.71;
    const cx = width * 0.5;
    const cy = (heroTop + heroBottom) / 2;
    const radius = (heroBottom - heroTop) * 0.48;

    const arrangement = R.pick(["sun", "cloud", "panel"]);
    if (arrangement === "sun") {
      const rays = shapes.burst(R, cx + 40, cy - 22, radius * 1.08, { spikes: R.int(10, 14), inner: R.float(0.6, 0.72) });
      S.body.shape(rock(rays, cx + 40, cy - 22, swing() * 0.045), { smooth: false });
      S.wash.shape(drift(shapes.blob(R, cx - 66, cy + 38, radius * 0.86, { lobes: 4, wobble: 0.16 }), swing(2.1) * 7, swing(0.8) * 5));
      S.key.line(shapes.spiral(cx + 118, cy + 84, 8, 52, 2.6), { w: 6 });
    } else if (arrangement === "cloud") {
      S.wash.shape(drift(shapes.blob(R, cx + 56, cy - 16, radius, { lobes: 6, wobble: 0.26, squash: 0.88 }), swing() * 9, swing(1.3) * 5));
      S.body.shape(drift(shapes.blob(R, cx - 60, cy + 34, radius * 0.92, { lobes: 5, wobble: 0.3, squash: 1.06 }), swing(2.4) * 8, swing(3.1) * 6));
      S.key.line(shapes.wave(cx - 134, cy + 150, cx + 108, cy + 150, { amplitude: 14, cycles: 3.2, noise, wobble: 3, phase: turn }), { w: 7 });
    } else {
      S.wash.shape(rock(shapes.patch(R, cx - 188, cy - 158, 340, 300, 9), cx, cy, swing() * 0.02));
      S.body.shape(drift(shapes.blob(R, cx + 108, cy + 92, radius * 0.7, { lobes: 5, wobble: 0.22 }), swing(1.7) * 8, swing(0.4) * 6));
      S.key.line(shapes.zigzag(cx - 150, cy + 174, cx + 36, cy + 174, 5, 14), { w: 6, smooth: false });
    }

    // 곁가지
    for (const [x, y] of scatter(R, 10, { x: margin, y: heroTop - 26, width: width - margin * 2, height: heroBottom - heroTop + 52 }, 112)) {
      const drum = R.pick([S.key, S.key, S.body, S.wash]);
      const scale = R.float(0.8, 1.35);

      // 곁가지는 저마다 다른 박자로 깜박이고 조금씩 뜬다
      const beat = R.float(0, Math.PI * 2);
      const tone = 0.58 + 0.42 * swing(beat);
      const bob = swing(beat) * 4;

      switch (R.pick(["sparkle", "drop", "leaf", "ring", "squiggle", "diamond"])) {
        case "sparkle":
          drum.draw((g) => { g.globalAlpha = tone; shapes.sparkle(g, x, y + bob, 15 * scale * (0.8 + 0.3 * swing(beat))); g.fill(); });
          break;
        case "drop":
          drum.shape(shapes.drop(R, x, y + bob, 17 * scale, R.float(-0.5, 0.5)), { tone });
          break;
        case "leaf":
          drum.shape(shapes.leaf(R, x, y + bob, 24 * scale, R.float(-1, 1)), { tone });
          break;
        case "ring":
          drum.line(shapes.blob(R, x, y + bob, 21 * scale, { lobes: 3, wobble: 0.05 }), { w: 5, close: true, tone });
          break;
        case "squiggle":
          drum.line(shapes.wave(x - 32 * scale, y + bob, x + 32 * scale, y + bob, { amplitude: 7 * scale, cycles: 2.2, noise, wobble: 2, offset: x, phase: turn }), { w: 4.5, tone });
          break;
        default:
          drum.draw((g) => { g.globalAlpha = tone; shapes.diamond(g, x, y + bob, 13 * scale); g.fill(); });
      }
    }

    // 통 자체를 종이에 올린다. 겹친 자리의 섞인 색이 배색표가 말로 못 하는 부분이다.
    const swatchY = height * 0.795;
    const swatchR = height * 0.048;
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
      sep.text("RISO GRAPHIC", margin, height - 66, { font: `700 21px ${MONO}`, track: 3 });
      sep.text(`SAMPLE SHEET · ${S.drums.length} DRUMS · ONE PASS EACH`, margin, height - 42, { font: `500 12px ${MONO}`, track: 2 });
    });
  }
};
