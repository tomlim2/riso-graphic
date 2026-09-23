// 안내선. 판이 제 뼈대를 내놓으면(plate.guides) 한 장 위에 겹쳐 그린다. 축이 어디를 지나는지, 무엇이
// 어느 점을 붙박이로 늘고 주는지는 찍힌 그림만 봐서는 잡히지 않는다.
//
// 인쇄된 픽셀에는 손대지 않는다. 다른 캔버스에 그려 위에 얹을 뿐이라 PNG로 저장한 장에도,
// 콘택트 시트에도 나오지 않는다. 자리는 찍힌 종이와 같은 1080칸이고, 굵기와 글자만 화면에
// 걸린 크기로 되돌려 종이가 작게 걸려도 가늘어지지 않는다.
const GUIDE_INK = "rgba(18, 110, 200, 0.9)";
const GUIDE_HOT = "#e8256b";

// 판이 제 뼈대를 내놓지 않으면 종이의 것만 짚는다 — 여백과 한가운데
export const paperGuides = ({ width, height, margin }) => [
  { kind: "path", points: [[margin, margin], [width - margin, margin], [width - margin, height - margin], [margin, height - margin]], dash: true },
  { kind: "cross", at: [width / 2, height / 2], r: 16 }
];

// 판을 지은 모델. 판이 제 이름표(plate.model)를 달고 있으면, 어느 판이든 종이 왼쪽 위 여백에 적는다
export const modelGuides = (plate, { margin }) =>
  plate.model ? [{ kind: "text", at: [margin, margin / 2], text: `MODEL · ${plate.model.toUpperCase()}` }] : [];

// 글자는 종이 빛깔로 한 번 두르고 찍는다. 밤하늘 위에서도, 흰빛 위에서도 읽힌다
function label(g, text, x, y, ink, k) {
  g.strokeStyle = "rgba(252, 251, 249, 0.9)";
  g.lineWidth = 3 * k;
  g.setLineDash([]);
  g.strokeText(text, x, y);
  g.fillStyle = ink;
  g.fillText(text, x, y);
}

// 종이(sheet) 위에 겹칠 캔버스(layer)를 받는다. 자리는 종이의 칸(size)이다
export function createGuides(sheet, layer, size) {
  layer.width = size.width;
  layer.height = size.height;
  let laid = []; // 지금 겹쳐 놓은 안내선. 걸린 크기가 바뀌면 이대로 다시 그린다

  // 겹쳐 놓을 자리. 종이가 가운데 걸려 있으므로 그 자리를 그대로 받아 온다
  function overlay() {
    const paper = sheet.getBoundingClientRect();
    const desk = sheet.parentElement.getBoundingClientRect();
    layer.style.left = `${paper.left - desk.left}px`;
    layer.style.top = `${paper.top - desk.top}px`;
    layer.style.width = `${paper.width}px`;
    layer.style.height = `${paper.height}px`;
    // 화면의 1px이 종이의 몇 칸인가. 굵기와 글자를 이만큼 키워야 걸린 크기 그대로 보인다
    return layer.width / (paper.width || layer.width);
  }

  function draw(list) {
    laid = list;
    layer.hidden = list.length === 0;
    if (!list.length) return;
    const k = overlay();
    const g = layer.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, layer.width, layer.height);
    g.lineJoin = "round";
    g.textBaseline = "middle";
    g.font = `600 ${Math.round(11 * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    for (const mark of list) {
      const ink = mark.hot ? GUIDE_HOT : GUIDE_INK;
      const r = (mark.r ?? 4) * k;
      g.strokeStyle = ink;
      g.fillStyle = ink;
      g.lineWidth = (mark.hot ? 1.6 : 1.1) * k;
      g.setLineDash(mark.dash ? [7 * k, 5 * k] : []);
      g.beginPath();
      if (mark.kind === "line") {
        g.moveTo(mark.from[0], mark.from[1]);
        g.lineTo(mark.to[0], mark.to[1]);
        g.stroke();
      } else if (mark.kind === "path") {
        mark.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.stroke();
      } else if (mark.kind === "ring") {
        g.arc(mark.at[0], mark.at[1], r, 0, Math.PI * 2);
        g.stroke();
      } else if (mark.kind === "cross") {
        const [x, y] = mark.at;
        g.moveTo(x - r, y);
        g.lineTo(x + r, y);
        g.moveTo(x, y - r);
        g.lineTo(x, y + r);
        g.stroke();
      } else if (mark.kind === "dot") {
        const [x, y] = mark.at;
        if (mark.ring) {
          g.setLineDash([4 * k, 4 * k]);
          g.arc(x, y, mark.ring * k, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          g.setLineDash([]);
        }
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x, y, r + 2.5 * k, 0, Math.PI * 2);
        g.strokeStyle = "rgba(252, 251, 249, 0.9)";
        g.lineWidth = 1.5 * k;
        g.stroke();
      }
      // 이름표는 점의 오른쪽에. lift는 위로 얼마나 띄울지다 — 음수면 아래로 내려가, 가까이 붙은
      // 점들의 이름표가 서로 겹치지 않는다. 선과 윤곽에는 이름표를 달 점이 없다
      if (mark.kind === "text") label(g, mark.text, mark.at[0], mark.at[1], ink, k);
      else if (mark.label && mark.at) {
        const lift = (mark.lift ?? (mark.ring ? mark.ring + 8 : 0)) * k;
        label(g, mark.label, mark.at[0] + r + 8 * k, mark.at[1] - lift, ink, k);
      }
    }
  }

  return {
    draw,
    // 걸린 크기가 바뀌면 선 굵기와 글자도 따라가야 한다. 지금 걸린 것을 다시 그린다
    refit() {
      if (!layer.hidden) draw(laid);
    }
  };
}
