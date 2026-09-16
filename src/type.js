// 글자 재기. 캔버스에서 폭을 알려면 컨텍스트가 있어야 하는데, 판을 짜는 동안에는 아직
// 어느 분판에 얹을지 정해지지 않았을 수 있다. 재기 전용 컨텍스트를 하나 두고 쓴다.

const scratch = document.createElement("canvas").getContext("2d");

export const DISPLAY = '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Helvetica Neue", system-ui, sans-serif';
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function measure(text, font, track = 0) {
  scratch.font = font;
  if (!track) return scratch.measureText(text).width;
  let total = 0;
  for (const character of text) total += scratch.measureText(character).width + track;
  return total - track;
}

// 폭을 넘기면 줄을 바꾼다. 넘기는 낱말 하나가 줄보다 길면 낱말 안에서 끊는다.
// 한글은 띄어쓰기 없이도 길게 이어지므로 그쪽이 오히려 흔한 경우다.
export function wrap(text, font, maxWidth) {
  scratch.font = font;
  const lines = [];
  let line = "";

  const flush = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (scratch.measureText(word).width > maxWidth) {
      flush();
      let piece = "";
      for (const character of word) {
        if (piece && scratch.measureText(piece + character).width > maxWidth) {
          lines.push(piece);
          piece = character;
        } else {
          piece += character;
        }
      }
      line = piece;
      continue;
    }

    const candidate = line ? `${line} ${word}` : word;
    if (line && scratch.measureText(candidate).width > maxWidth) {
      flush();
      line = word;
    } else {
      line = candidate;
    }
  }
  flush();

  return lines.length ? lines : [""];
}

// 판이 글자에 맞춰 내려온다. 글자를 판에 맞춰 자르지 않는다.
// 정해진 줄 수 안에 들어오는 가장 큰 크기가 이긴다.
export function fit(text, options) {
  const { font, maxWidth, maxLines = 2, largest = 84, smallest = 44, step = 3 } = options;
  let last = null;

  for (let size = largest; size >= smallest; size -= step) {
    const lines = wrap(text, font(size), maxWidth);
    last = lines;
    if (lines.length <= maxLines) return { size, lines };
  }

  // 가장 작은 판에서도 넘치면 거기서 자른다. 그 크기에서 실제로 끊긴 줄을 쓴다
  return { size: smallest, lines: last.slice(0, maxLines) };
}
