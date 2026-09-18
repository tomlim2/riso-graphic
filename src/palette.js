// Riso prints with spot inks, not with process colour: a drum per colour, two or three
// passes, and nothing mixed before it reaches the paper. So a palette here is a short
// list of inks. The order is not the printing order — the press sorts the drums by
// lightness itself — but it decides which ink a two-drum run leaves out: the last.

// The paper is a plain white uncoated stock. It adds no colour of its own, so the inks land
// as themselves and an overlap is decided by the inks alone. A perfectly flat white reads as
// a screen, though, so screen.js dusts it with a faint darker tooth in PAPER_SHADE.
export const PAPER = "#fcfbf9";
export const PAPER_SHADE = "#e9e7e2";

export const PALETTES = [
  { name: "노랑 × 하늘 × 안개", label: "GOLD × SKY × MIST", inks: ["#f4c430", "#00a8e8", "#cfd4db"] },
  { name: "물빛 × 파랑 × 레몬", label: "AQUA × BLUE × LEMON", inks: ["#f3d512", "#00b4d8", "#3782d1"] },
  { name: "머스터드 × 레몬 × 청록", label: "MUSTARD × LEMON × TEAL", inks: ["#f4e73a", "#eec110", "#0096c7"] },
  { name: "하늘 × 노랑 × 민트", label: "SKY × GOLD × MINT", inks: ["#f4c430", "#63d6c1", "#00a8e8"] },
  { name: "레몬 × 물빛 × 코랄", label: "LEMON × AQUA × CORAL", inks: ["#eed534", "#00b4d8", "#ff6f59"] },
  { name: "노랑 × 주황 × 하늘", label: "GOLD × ORANGE × SKY", inks: ["#f3ce28", "#2cbae8", "#fb8500"] },
  { name: "노랑 × 산호 × 하늘", label: "GOLD × CORAL × SKY", inks: ["#f4c430", "#35b7e8", "#ff5a60"] },
  { name: "빨강 × 호박 × 물빛", label: "RED × AMBER × AQUA", inks: ["#ffb703", "#00b4d8", "#e63946"] },
  { name: "물빛 × 노랑 × 분홍", label: "AQUA × GOLD × PINK", inks: ["#f4c430", "#1fbbdb", "#ed45a1"] }
];

// Two drums instead of three. Dropping the last ink is what a two-colour run of the same
// design actually is, so the poster keeps its layout and loses one pass.
export function inksFor(palette, count) {
  return palette.inks.slice(0, Math.max(1, Math.min(count, palette.inks.length)));
}

// An ink as red, green and blue from 0 to 1. The shader wants it so, and the plates that pick
// drums by colour (src/drums.js) measure it so.
export const rgbOf = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

export function luminance(hex) {
  const v = parseInt(hex.slice(1), 16);
  return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
}
