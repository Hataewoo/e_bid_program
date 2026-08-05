/** prefix 직후 다음 숫자 빈도 (pattern graph 등에서 공유) */
export function countNextDigitsAfterPrefix(
  masterDigits: string,
  prefix: string,
): { counts: Map<number, number>; totalMatches: number } {
  const counts = new Map<number, number>();
  if (!masterDigits || prefix.length === 0) {
    return { counts, totalMatches: 0 };
  }

  let totalMatches = 0;
  const limit = masterDigits.length - prefix.length;
  for (let i = 0; i < limit; i += 1) {
    let matched = true;
    for (let j = 0; j < prefix.length; j += 1) {
      if (masterDigits[i + j] !== prefix[j]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;

    const nextChar = masterDigits[i + prefix.length];
    if (nextChar === undefined) continue;

    const digit = Number(nextChar);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;

    totalMatches += 1;
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }

  return { counts, totalMatches };
}
