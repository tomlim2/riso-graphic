// 겹침만 보는 판. 잎 한 장이 한 통이고, 잎이 서로 물린 자리마다 다른 색이 난다.
// 통 셋으로 낼 수 있는 색은 셋이 아니라, 겹치는 조합만큼이다.

import { DISPLAY, MONO } from "../type.js";
import * as shapes from "../shapes.js";

export const garden = {
  id: "garden",
  name: "GARDEN",
  about: "겹침만 본다. 통이 하나 늘면 색은 하나가 아니라 넷이 는다",

  paint(S, R, page) {
    const { width, height, margin } = page;

    S.wash.block(0, 0, width, height, { tone: 0.13 });
    S.key.block(0, 0, width, 26);
    S.key.text("OVERPRINT — WHERE THE DRUMS CROSS", margin, 104, { font: `500 13px ${MONO}`, track: 2.2 });

    // 한 자리에서 부챗살로 올라간다. 밑동을 모아 두면 잎은 위에서 저절로 물린다
    const rootX = width * 0.5;
    const rootY = height - 214;
    const stems = 13;

    const sprigs = [];
    for (let i = 0; i < stems; i += 1) {
      const spread = stems === 1 ? 0.5 : i / (stems - 1);
      const angle = -Math.PI * (0.88 - spread * 0.76) + R.float(-0.05, 0.05);
      const reach = R.float(300, 560);
      const tipX = rootX + Math.cos(angle) * reach * 0.86;
      const tipY = rootY + Math.sin(angle) * reach;
      sprigs.push({ angle, tipX, tipY, size: R.float(92, 168), drum: S.drums[i % S.drums.length].separation });
    }

    // 줄기부터 전부. 잎이 그 위에 앉아야 잎이 앞으로 온다
    for (const sprig of sprigs) {
      S.key.line(
        shapes.wave(rootX, rootY, sprig.tipX, sprig.tipY, { amplitude: R.float(10, 30), cycles: R.float(0.5, 0.9), steps: 40 }),
        { w: R.float(2.5, 5), tone: R.float(0.55, 0.9) }
      );
    }

    for (const sprig of sprigs) {
      sprig.drum.shape(shapes.leaf(R, sprig.tipX, sprig.tipY, sprig.size, sprig.angle, { thickness: R.float(0.32, 0.46) }));
    }

    // 곁잎. 줄기 중간에 작게 붙어 큰 잎 사이의 빈 곳을 메운다
    for (const sprig of sprigs) {
      if (!R.chance(0.7)) continue;
      const t = R.float(0.35, 0.7);
      const x = rootX + (sprig.tipX - rootX) * t;
      const y = rootY + (sprig.tipY - rootY) * t;
      const lean = sprig.angle + R.sign() * R.float(0.5, 1.1);
      R.pick(S.drums).separation.shape(shapes.leaf(R, x, y, R.float(38, 72), lean), { tone: R.float(0.7, 1) });
    }

    // 열매. 진한 통으로 몇 알만 — 잎 위에 올라가 또 한 번 겹친다
    for (let i = 0; i < 9; i += 1) {
      const sprig = R.pick(sprigs);
      const t = R.float(0.55, 1.05);
      S.key.disc(rootX + (sprig.tipX - rootX) * t, rootY + (sprig.tipY - rootY) * t, R.float(7, 17), { tone: R.float(0.8, 1) });
    }

    S.body.block(-40, height - 150, width + 80, 200, { corners: [120, 0, 0, 0] });
    S.body.knockout((sep) => {
      sep.text("한 통이 늘 때 색은 하나가 아니라 넷이 는다", margin, height - 82, { font: `700 30px ${DISPLAY}` });
      sep.text(`${S.drums.length} DRUMS · MULTIPLY`, margin, height - 50, { font: `500 12px ${MONO}`, track: 2 });
    });
  }
};
