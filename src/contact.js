// 콘택트 시트. 여러 장을 작게 찍어 한 대지에 나란히 붙인다. 어느 장이 이 배색에서 무너지는지,
// 루프가 어디서 비는지를 한눈에 보는 자리다.
//
// 칸마다 인쇄기로 작게 찍어 대지에 옮겨 붙인다. 인쇄기의 종이가 이 동안 칸 크기로 줄어들지만,
// 콘택트 시트가 펼쳐진 동안에는 그 종이가 걸려 있지 않다.

export const GRID_SCALE = 1 / 3;

const COLUMNS = 3;
const GUTTER = 14; // 칸 사이
const CAPTION = 26; // 칸 아래 이름표 자리까지 더한 세로 틈

// cells는 { label, mark }를 지닌 칸들이다. printCell(cell)은 그 칸을 인쇄기의 종이(sheet)에
// GRID_SCALE로 찍는다. 붙인 칸의 수를 돌려준다
export function layContact(board, sheet, cells, printCell, size) {
  const columns = Math.min(COLUMNS, cells.length);
  const rows = Math.ceil(cells.length / columns);
  const cellWidth = Math.round(size.width * GRID_SCALE);
  const cellHeight = Math.round(size.height * GRID_SCALE);

  board.width = columns * (cellWidth + GUTTER);
  board.height = rows * (cellHeight + CAPTION);
  const out = board.getContext("2d");
  // 대지와 이름표는 책상의 빛깔을 따른다(styles.css의 --desk · --on-desk). 시스템의 밝음 · 어둠을 따라 바뀐다
  const style = getComputedStyle(board);
  const desk = style.getPropertyValue("--desk").trim() || "#000";
  const label = style.getPropertyValue("--on-desk").trim() || "#fff";
  out.fillStyle = desk;
  out.fillRect(0, 0, board.width, board.height);

  cells.forEach((cell, index) => {
    printCell(cell);
    const x = (index % columns) * (cellWidth + GUTTER) + GUTTER / 2;
    const y = Math.floor(index / columns) * (cellHeight + CAPTION) + GUTTER / 2;
    out.drawImage(sheet, x, y);

    out.fillStyle = label;
    out.globalAlpha = cell.mark ? 1 : 0.55;
    out.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    out.fillText(cell.label, x, y + cellHeight + 14);
    out.globalAlpha = 1;
  });

  return cells.length;
}
