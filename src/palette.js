// Riso prints with spot inks, not with process colour: a drum per colour, two or three
// passes, and nothing mixed before it reaches the paper. So a palette here is a short
// list of inks in the order they are laid down, lightest drum first.

// Riso paper is never white. A warm uncoated stock is what makes the inks read as ink.
export const PAPER = "#f3efe4";
export const PAPER_SHADE = "#e4dfd0";

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

// The ink an element asked for, clamped to what is on the press today.
export function inkIndex(wanted, inks) {
  return Math.min(wanted, inks.length - 1);
}

export function luminance(hex) {
  const v = parseInt(hex.slice(1), 16);
  return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
}
