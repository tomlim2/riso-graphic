// 매질을 보는 판. 그림이 아니라 스크린 자체가 주인공이다.
//
// 세 통의 계조 띠를 나란히 놓고 그 아래에서 셋을 겹친다. 드럼마다 스크린 각도가 다르므로
// 겹친 자리에 로제트가 뜬다. 같은 각도로 두 판을 찍으면 무아레가 생기고, 그게 인쇄가 각도를
// 30도씩 벌려 온 이유다.
//
// 여기서 t는 장식이 아니라 계기다. 세로 침이 띠를 가로지르며 같은 커버리지를 세 통에서
// 동시에 짚어 준다. 한 자리에 세워 두고 보면 놓치는 것을, 지나가는 침이 훑어 준다.

import { DISPLAY, MONO } from "../type.js";

export const medium = {
  id: "medium",
  name: "MEDIUM",
  about: "스크린을 판단하는 자리. 통별 계조와 세 각도가 겹친 로제트, 훑고 가는 침",
  model: "claude-opus-5",

  paint(S, R, page) {
    const { width, height, margin, t } = page;

    S.key.block(0, 0, width, height * 0.024);
    S.key.text("THE SCREEN — TONE, ANGLE, ROSETTE", margin, height * 0.094, { font: `500 13px ${MONO}`, track: 2.2 });
    S.key.text("망점", margin, height * 0.176, { font: `700 68px ${DISPLAY}` });
    S.body.text("어떻게 도는가", margin + 148, height * 0.176, { font: `700 68px ${DISPLAY}` });

    const rowTop = height * 0.236;
    const rowHeight = height * 0.074;
    const gap = height * 0.02;
    const barX = margin + 108;
    const barWidth = width - margin - barX;

    S.drums.forEach((drum, index) => {
      const y = rowTop + index * (rowHeight + gap);
      drum.separation.ramp(barX, y, barWidth, rowHeight, { from: 0.02, to: 1, across: true });
      S.key.text(drum.role.toUpperCase(), margin, y + 26, { font: `700 15px ${MONO}`, track: 1.6 });
      S.key.text(`${drum.angle}°`, margin, y + 46, { font: `500 13px ${MONO}`, track: 1.2 });
      S.key.text(drum.ink.toUpperCase(), margin, y + 66, { font: `500 12px ${MONO}`, track: 1 });
    });

    // 침. 한 바퀴에 띠를 한 번 건넌다
    const rowsBottom = rowTop + S.drums.length * (rowHeight + gap) - gap;
    const needle = barX + t * barWidth;
    S.key.line([[needle, rowTop - 14], [needle, rowsBottom + 14]], { w: 2, tone: 0.9, smooth: false });
    S.key.text(`${Math.round(t * 100)}%`, needle, rowTop - 22, { font: `700 13px ${MONO}`, track: 1, align: "center" });

    // 셋을 같은 자리에 겹친다. 여기가 로제트가 뜨는 곳이다
    const stackTop = rowsBottom + height * 0.05;
    const stackHeight = height * 0.15;
    S.key.text("ALL DRUMS, ONE PATCH", margin, stackTop - 14, { font: `500 12px ${MONO}`, track: 2 });
    for (const drum of S.drums) {
      drum.separation.ramp(margin, stackTop, width - margin * 2, stackHeight, { from: 0.15, to: 0.95 });
    }

    // 같은 겹침을 단계로 끊어 본다. 연속 계조에서는 놓치는 자리가 여기서 보인다.
    // 침이 지나는 칸 하나만 종이까지 파내어, 어느 칸을 보고 있는지 말해 준다.
    const stepTop = stackTop + stackHeight + height * 0.04;
    const stepHeight = height * 0.076;
    const steps = 8;
    const stepWidth = (width - margin * 2) / steps;
    const lit = Math.min(steps - 1, Math.floor(t * steps));

    for (let i = 0; i < steps; i += 1) {
      const tone = (i + 1) / steps;
      for (const drum of S.drums) {
        drum.separation.block(margin + i * stepWidth, stepTop, stepWidth - 3, stepHeight, { tone });
      }
      S.key.text(`${Math.round(tone * 100)}`, margin + i * stepWidth, stepTop + stepHeight + 18, { font: `500 11px ${MONO}`, track: 1 });
    }

    for (const drum of S.drums) {
      drum.separation.knockout((sep) => {
        sep.block(margin + lit * stepWidth + 6, stepTop + 6, stepWidth - 15, 8);
      });
    }

    S.body.block(-40, height - 108, width + 80, 160, { corners: [110, 0, 0, 0] });
    S.body.knockout((sep) => {
      sep.text("RISO GRAPHIC · MEDIUM", margin, height - 52, { font: `700 18px ${MONO}`, track: 3 });
    });
  }
};
