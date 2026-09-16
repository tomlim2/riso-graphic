// 매질을 보는 판. 그림이 아니라 스크린 자체가 주인공이다.
//
// 세 통의 계조 띠를 나란히 놓고, 그 아래에서 셋을 겹친다. 드럼마다 스크린 각도가 다르기
// 때문에 겹친 자리에 로제트가 뜬다. 같은 각도로 두 판을 찍으면 무아레가 생기고, 그게 인쇄가
// 각도를 30도씩 벌려 온 이유다. CELL을 끌어 보면 그 벌어짐이 무엇을 하는지 바로 보인다.

import { DISPLAY, MONO } from "../type.js";

export const medium = {
  id: "medium",
  name: "MEDIUM",
  about: "스크린을 판단하는 자리. 통별 계조 띠와 세 각도가 겹친 로제트",

  paint(S, R, page) {
    const { width, height, margin } = page;

    S.key.block(0, 0, width, 26);
    S.key.text("THE SCREEN — TONE, ANGLE, ROSETTE", margin, 104, { font: `500 13px ${MONO}`, track: 2.2 });
    S.key.text("망점", margin, 210, { font: `700 78px ${DISPLAY}` });
    S.body.text("어떻게 도는가", margin + 168, 210, { font: `700 78px ${DISPLAY}` });

    // 통마다 한 줄. 0에서 1까지, 점이 자라서 붙을 때까지
    const rowTop = 300;
    const rowHeight = 96;
    const gap = 30;
    const barX = margin + 108;
    const barWidth = width - margin - barX;

    S.drums.forEach((drum, index) => {
      const y = rowTop + index * (rowHeight + gap);
      drum.separation.ramp(barX, y, barWidth, rowHeight, { from: 0.02, to: 1, across: true });
      S.key.text(drum.role.toUpperCase(), margin, y + 34, { font: `700 15px ${MONO}`, track: 1.6 });
      S.key.text(`${drum.angle}°`, margin, y + 56, { font: `500 13px ${MONO}`, track: 1.2 });
      S.key.text(drum.ink.toUpperCase(), margin, y + 78, { font: `500 12px ${MONO}`, track: 1 });
    });

    // 셋을 같은 자리에 겹친다. 여기가 로제트가 뜨는 곳이다
    const stackTop = rowTop + S.drums.length * (rowHeight + gap) + 54;
    const stackHeight = 250;
    S.key.text("ALL DRUMS, ONE PATCH", margin, stackTop - 18, { font: `500 12px ${MONO}`, track: 2 });
    for (const drum of S.drums) {
      drum.separation.ramp(margin, stackTop, width - margin * 2, stackHeight, { from: 0.15, to: 0.95 });
    }

    // 같은 겹침을 단계로 끊어 본다. 연속 계조에서는 놓치는 자리가 여기서 보인다
    const stepTop = stackTop + stackHeight + 46;
    const steps = 8;
    const stepWidth = (width - margin * 2) / steps;
    for (let i = 0; i < steps; i += 1) {
      const tone = (i + 1) / steps;
      for (const drum of S.drums) {
        drum.separation.block(margin + i * stepWidth, stepTop, stepWidth - 3, 104, { tone });
      }
      S.key.text(`${Math.round(tone * 100)}`, margin + i * stepWidth, stepTop + 124, { font: `500 11px ${MONO}`, track: 1 });
    }

    S.body.block(-40, height - 108, width + 80, 160, { corners: [110, 0, 0, 0] });
    S.body.knockout((sep) => {
      sep.text("RISO GRAPHIC · MEDIUM", margin, height - 52, { font: `700 18px ${MONO}`, track: 3 });
    });
  }
};
