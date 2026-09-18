// 쥐고 있기. 다시 짓기 비싼 것 — 짠 조직, 구운 성운, 흐린 무늬 — 을 열쇠로 몇 벌 쥐고 있는다.
//
// 손잡이를 끄는 동안이 아니면 판은 프레임마다 같은 것을 다시 쓴다. 열쇠에는 그것을 짓는 데 든
// 값을 모두 넣는다. 빠진 값이 있으면 다른 설정의 것을 잘못 꺼내 쓴다. 한도를 넘으면 가장 먼저
// 쥔 것부터 놓는다.
//
// 쥐는 것은 찍는 결과를 바꾸지 않는다. 같은 열쇠면 같은 것이 나와야 하고, 무엇을 먼저 찍었느냐에
// 따라 달라지면 안 된다.

export function keeper(limit) {
  const held = new Map();
  return (key, make) => {
    if (!held.has(key)) {
      held.set(key, make());
      if (held.size > limit) held.delete(held.keys().next().value);
    }
    return held.get(key);
  };
}
