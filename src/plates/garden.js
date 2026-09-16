// 겹침만 보는 판. 잎 한 장이 한 통이고, 잎이 서로 물린 자리마다 다른 색이 난다.
// 통 셋으로 낼 수 있는 색은 셋이 아니라, 겹치는 조합만큼이다.
//
// 밑동을 한 자리에 모아 부챗살로 올린다. 그러면 위에서 잎이 저절로 물린다. 흩어 놓으면
// 각자 예쁜 잎이 될 뿐, 이 판이 보여주려는 것은 사라진다.

import * as shapes from "../shapes.js";

export const garden = {
  id: "garden",
  name: "GARDEN",
  about: "겹침만 본다. 통이 하나 늘면 색은 하나가 아니라 넷이 는다",

  knobs: [
    { key: "stems", label: "STEMS", min: 3, max: 24, step: 1, value: 13 },
    { key: "reach", label: "REACH", min: 0.2, max: 0.75, step: 0.01, value: 0.44 },
    { key: "leaf", label: "LEAF", min: 40, max: 260, step: 5, value: 130 },
    { key: "sway", label: "SWAY", min: 0, max: 0.14, step: 0.005, value: 0.045 },
    { key: "side", label: "SIDE", min: 0, max: 1, step: 0.05, value: 0.7 },
    { key: "berries", label: "BERRIES", min: 0, max: 24, step: 1, value: 9 }
  ],

  paint(S, R, page) {
    const { width, height, t, knobs } = page;
    const { stems, leaf: leafSize, side, berries } = knobs;

    // 바람. 줄기마다 박자를 조금씩 어긋나게 주면 한 덩어리로 흔들리지 않는다
    const turn = t * Math.PI * 2;

    S.wash.block(0, 0, width, height, { tone: 0.13 });
    S.key.block(0, 0, width, 26);

    const rootX = width * 0.5;
    const rootY = height * 0.83;
    const span = height * knobs.reach;

    const sprigs = [];
    for (let i = 0; i < stems; i += 1) {
      const spread = stems === 1 ? 0.5 : i / (stems - 1);
      const sway = Math.sin(turn + i * 0.55) * knobs.sway;
      const angle = -Math.PI * (0.88 - spread * 0.76) + R.float(-0.05, 0.05) + sway;
      const reach = span * R.float(0.72, 1.32);
      sprigs.push({
        angle,
        tipX: rootX + Math.cos(angle) * reach * 0.86,
        tipY: rootY + Math.sin(angle) * reach,
        size: leafSize * R.float(0.72, 1.28),
        drum: S.drums[i % S.drums.length].separation
      });
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
      const along = R.float(0.35, 0.7);
      const lean = sprig.angle + R.sign() * R.float(0.5, 1.1);
      const size = leafSize * R.float(0.3, 0.55);
      const tone = R.float(0.7, 1);
      const drum = R.pick(S.drums).separation;
      if (!R.chance(side)) continue;

      drum.shape(
        shapes.leaf(R, rootX + (sprig.tipX - rootX) * along, rootY + (sprig.tipY - rootY) * along, size, lean),
        { tone }
      );
    }

    // 열매. 진한 통으로 몇 알만 — 잎 위에 올라가 또 한 번 겹친다
    for (let i = 0; i < berries; i += 1) {
      const sprig = R.pick(sprigs);
      const along = R.float(0.55, 1.05);
      S.key.disc(rootX + (sprig.tipX - rootX) * along, rootY + (sprig.tipY - rootY) * along, R.float(7, 17), { tone: R.float(0.8, 1) });
    }

    // 바닥을 받치는 블록. 글자는 없다 — 움직이는 그림 위의 잔글씨는 아무것도 말하지 않는다
    S.body.block(-40, height - 128, width + 80, 180, { corners: [110, 0, 0, 0] });
  }
};
