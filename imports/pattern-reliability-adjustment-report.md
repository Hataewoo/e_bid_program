# Pattern Reliability 1차 Production 조정 — 완료 보고

Generated: 2026-08-25 (post-adjustment walk-forward re-run)

---

## 1. Pattern reliability weight 최종값

`src/shared/utils/digitPredictionWeights.ts` — `PATTERN_RELIABILITY`:

| UI | field | multiplier | 근거 |
|----|-------|----------:|------|
| 3,4+α | `plusAlpha_3_2` | **1.00** | phase 88.2%, walk-forward TOP |
| 1중복 | `oneDuplicate` | **0.72** | phase 100%, coverage 15.6% → 과대 가중 방지 |
| 2,3+α | `commaAlpha_2_3` | **0.72** | phase 73.2% |
| 4,5+α | `plusAlpha_4_3` | **0.55** | phase 76.0% |
| 4+α,3 | `alphaPlus_4_3` | **0.35** | phase 100%, coverage 3.1% |
| 1사이 | `oneBetween` | **0.28** | rare, band switch |
| 3+α,2 | `alphaPlus_3_2` | **0.08** | phase 42.9% |
| 5+α,4 | `plusAlpha_4_4` | **0.05** | 거의 미발화 |
| 3이상 | `threeOrMore` | **0.03** | phase logic 수정 후에도 digit 기여 최소 유지 |
| 5이상 | `fiveOrMore` | **0.03** | 동일 |

Digit scoring: `contribution = confidence × PATTERN_RELIABILITY × patternSignal(4.0) × clusterDiminish`

---

## 2. `3이상` / `5이상` phase 로직 수정

**수정함** — `inferCountThresholdPhase()` (`patternPredictionSignals.ts`)

기존: `run < threshold` → 거의 항상 **repeat** (phase acc 4.4%)

수정 후 (sequence 구조만 사용, 빈도 하드코딩 없음):

| tail 상태 | 판정 |
|-----------|------|
| `run ≥ threshold` | transition (임계 충족) |
| `run === 1`, 단일 token | transition |
| `run === 1`, run길이 2..threshold-1 인코딩 | repeat (약) |
| `run + 1 ≥ threshold` | transition (임계 직전) |
| 그 외 building | repeat (약, confidence ≤ 0.5) |

**After phase accuracy**: 3이상 **85.7%** (was 4.4%), 5이상 **77.6%** (was 3.4%)

Digit scoring weight는 아직 **0.03** — held-out에서 skill 확인 전 강한 positive 금지.

---

## 3. Redundancy cluster 구성

```ts
betweenMarker: commaAlpha_2_3, plusAlpha_3_2, plusAlpha_4_3,
               plusAlpha_4_4, alphaPlus_3_2, alphaPlus_4_3

countThreshold: threeOrMore, fiveOrMore
```

---

## 4. Cluster cap 방식

동일 cluster + 동일 `predictedPhase` 내:

```text
1st signal: 100%
2nd:        50%
3rd:        25%
4th+:       12.5% …
```

`CLUSTER_DIMINISHING_FACTOR = 0.5`, reliability×confidence 순으로 rank 후 적용.

---

## 5. Legacy 조정값

| param | before | after |
|-------|-------:|------:|
| `legacy` | 1.5 | **1.35** |
| `legacyAbsoluteCap` | 22 | **19** |

Walk-forward: anchor=8 Legacy-alone=final **68/72 → 58/72** (독점 완화).

---

## 6. Confidence 수정 방식

`calibratePatternConfidence()`:

- `threeOrMore` / `fiveOrMore`: cap **0.25** (run-length → high conf 역방향 제거)
- `alphaPlus_3_2`, `plusAlpha_4_4`: cap 0.35 / 0.30
- reliability < 0.15: cap **0.20**
- 10패턴 간 phase agreement < 35%: ×0.75 penalty
- agreement > 75%: ×1.05 (max 0.95)

Runtime walk-forward lookup **없음** — 현재 state만 사용.

---

## 7. Pattern별 before/after 성능

| pattern | phase acc BEFORE | phase acc AFTER | avg conf AFTER |
|---------|----------------:|----------------:|---------------:|
| 3,4+α | 88.2% | 88.2% | 0.85 |
| 1중복 | 100% | 100% | 0.55 |
| 2,3+α | 73.2% | 73.2% | 0.83 |
| 4,5+α | 76.0% | 76.0% | 0.84 |
| **3이상** | **4.4%** | **85.7%** | 0.20 |
| **5이상** | **3.4%** | **77.6%** | 0.20 |
| 3+α,2 | 42.9% | 42.9% | 0.21 |

Aggregate model phase: 41.1% → **81.2%** (naive best baseline gap: -49.3pp → **-9.2pp**)

---

## 8. Ablation A/B/C/D (418 positions)

| layer | exact | top-2 | top-3 | avg rank |
|-------|------:|------:|------:|---------:|
| **A** Main+Sub+Legacy | 11.0% | 19.9% | 28.0% | 5.57 |
| **B** A+PatternFlow | 10.5% | 19.9% | 28.2% | 5.57 |
| **C** B+10Pattern(reliability) | **12.7%** | 19.9% | 28.2% | **5.55** |
| **D** C+Anchor+Agreement | 12.2% | 19.9% | 28.2% | 5.56 |

→ **PatternState(C)가 largest lift** (+1.7pp vs A). PatternFlow 단독(B)은 A 대비 -0.5pp.

---

## 9. 전체 digit 성능 before/after

| metric | BEFORE | AFTER | Δ |
|--------|-------:|------:|--:|
| exact hit | 11.7% | **12.2%** | **+0.5pp** |
| top-2 | 19.9% | 19.9% | 0 |
| top-3 | 28.2% | 28.2% | 0 |
| avg rank | 5.56 | 5.56 | ~0 |
| unique winners | 10 | 10 | — |

Legacy conflict: B(Legacy✗ Pattern✓) **29→62**, A **15→14** (Pattern consensus 유효성 증가).

---

## 10. Validation split (Master 단위 70/30)

- Calibration: first **19/28** masters
- Validation: last **9/28** masters (weights 변경 없이 평가)

| split | positions | exact | top-2 | avg rank |
|-------|----------:|------:|------:|---------:|
| validation only | 133 | **15.0%** | 21.8% | 5.50 |
| full | 418 | 12.2% | 19.9% | 5.56 |

Validation exact > full — 과적합 징후 없음 (동일 418에서 weight 튜닝 안 함).

---

## 11. Digit 고착 재발 여부

- unique winners: **10/10** 유지
- anchor=8 lowHigh→2: **34.6% → 23.1%** (2 고착 완화)
- anchor=8 Legacy-alone=final: **68/72 → 58/72**
- Pattern value → digit 직접 매핑 **없음** (invariant tests 통과)

---

## 12. 대표 추천 3건 score provenance

### Case 1 — `514271607…` pos 19 (actual next **1**, winner **4**)

```
MainBand +10 | SubBand +18 | Legacy +1.0 | PatternFlow +2.3
10PatternState +5.2 | Anchor +0.4 | Agreement +6 | Total 42.8
```

Pattern cluster cap 적용 후 10Pattern 기여 축소; Agreement는 Legacy+Flow+Pattern 합의.

### Case 2 — `6464512350` (actual **8**, winner **3**)

```
MainBand +10 | SubBand +18 | Legacy +1.4 | PatternFlow +4.4
10PatternState +0.0 | Anchor +0.8 | Total 34.5
```

Pattern 신호 약함 → SubBand+PatternFlow+Legacy 주도.

### Case 3 — Master 03 mid-seq (actual **9**, winner **2**)

```
MainBand +10 | SubBand +18 | Legacy +1.4 | PatternFlow +4.4
10PatternState +0.0 | Total 34.5
```

---

## 13. 전체 테스트 결과

**350/350 passed** (vitest run after changes)

재검증 명령:

```bash
npx vite-node --config scripts/vite-node.config.ts scripts/pattern-predictive-validation.ts
npx vite-node --config scripts/vite-node.config.ts scripts/walkforward-anchor-study.ts
```

상세 walk-forward: [`imports/pattern-predictive-validation.md`](pattern-predictive-validation.md)  
Anchor study: [`imports/walkforward-anchor-study.md`](walkforward-anchor-study.md)

---

## 다음 단계 제안 (weight 2차 — validation split 기준)

1. **3이상/5이상 reliability** — validation masters에서 phase skill > 0 확인 후 0.03 → 0.15~0.25 단계적 상향 (digit weight는 별도).
2. **3,4+α cluster 대표** — between-marker 6개 중 reliability 상위 2개만 full, 나머지 diminishing 유지.
3. **Legacy** — validation B>A 유지 시 cap 19 → 17 추가 검토; 제거하지 않음.
4. **patternSignal 4.0 유지** — ablation C가 lift 주인; global increase 금지.
5. **Anchor+Agreement(D)** — C 대비 exact -0.5pp; agreement bonus 조건 강화 검토.

---

**원칙 준수**: Pattern → phase/state only → Master sequence evidence → digit 0~9. 빈도 학습 없음.
