/**
 * 이명전기 스크린샷 Values 역추적 — countBetweenMarkers 가설 검증
 */
import {
  countBetweenMarkers,
  collectOneBetweenFromSequence,
  collectAdjacentFrontWhenBackExact,
} from '../src/shared/utils/analysisEngine.ts';

const LEGACY = {
  oneBetween: [1,3,1,4,5,3,1,1,1,1,1,4,1,1,1,1,1,2,1,8,1,2,1,3,2,4,1,2,1,3,2,4,4,1,6,3,3,1,6,1,1,1,3,1,3,2,1,1,1,1,2,1,1,1,2,4,5,1,2,1,1,3,1,1,1,1],
  alphaPlus_3_2: [1,3,4,2,2,2,1,1,1,1,1,3,1,3,2,1,1,1,2,1,1,1,3,1,1,1,1,1,1,1,3,2,1,2,1,2,1,1],
  alphaPlus_4_3: [1,1,1,2,1,2,3,4,1,1,2,2,2,2,1,2],
};

// 대화에서 언급된 Master 00 노란 줄 시작부 (교차 run 길이)
const YELLOW_SAMPLE = [1,2,1,1,1,3,2,4,1,3,1,1];

function eq(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function tryRules(S, label) {
  const rules = {
    '1사이 count(1,>=2)': countBetweenMarkers(S, 1, 2),
    '1사이 count(1,>=3)': countBetweenMarkers(S, 1, 3),
    '1사이 triplet→1': collectOneBetweenFromSequence(S),
    '1사이 triplet→left': (() => {
      const out = [];
      for (let i = 1; i < S.length - 1; i++) {
        const l = S[i-1], m = S[i], r = S[i+1];
        if (m === 1 && l >= 2 && r >= 2) out.push(l);
      }
      return out;
    })(),
    '3+a,2 count(3,>=2)': countBetweenMarkers(S, 3, 2),
    '3+a,2 count(2,>=3)': countBetweenMarkers(S, 2, 3),
    '3+a,2 adj front>=3 back=2': collectAdjacentFrontWhenBackExact(S, 3, 2),
    '4+a,3 count(4,>=3)': countBetweenMarkers(S, 4, 3),
    '4+a,3 count(3,>=4)': countBetweenMarkers(S, 3, 4),
    '4+a,3 adj front>=4 back=3': collectAdjacentFrontWhenBackExact(S, 4, 3),
  };
  console.log(`\n=== ${label} (len=${S.length}) ===`);
  for (const [name, arr] of Object.entries(rules)) {
    console.log(`${name}: [${arr.join(',')}]`);
  }
}

tryRules(YELLOW_SAMPLE, 'YELLOW_SAMPLE');

console.log('\n=== Legacy length compare ===');
console.log('1 사이 legacy len:', LEGACY.oneBetween.length);
console.log('3+α,2 legacy len:', LEGACY.alphaPlus_3_2.length);
console.log('4+α,3 legacy len:', LEGACY.alphaPlus_4_3.length);
