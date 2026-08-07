/** 2323(ABAB)·2111(연속)·6667(연속 run) 형태 방지 */
export function wouldFormRepetitivePattern(prefix: string, digit: number): boolean {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return true;
  const ch = String(digit);
  const next = prefix + ch;

  let streak = 1;
  for (let i = next.length - 2; i >= 0; i -= 1) {
    if (next[i] === ch) streak += 1;
    else break;
  }
  if (streak >= 2) return true;

  if (next.length >= 4) {
    const tail = next.slice(-4);
    if (tail[0] === tail[2] && tail[1] === tail[3] && tail[0] !== tail[1]) return true;
  }

  if (next.length >= 3) {
    const tail3 = next.slice(-3);
    if (tail3[0] === tail3[1] && tail3[1] === tail3[2]) return true;
  }

  return false;
}
