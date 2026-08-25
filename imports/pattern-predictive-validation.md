# Pattern CodeValue Predictive Validation (Walk-forward)

Generated: 2026-08-25T07:18:04.061Z
Masters: 28, min history: 12

## 1. Walk-forward method (no data leakage)

- Each position `t`: `historyT = master[0..t]` only — **no future digits**.
- `analyzeMasterValue("00", historyT)` recomputed fresh per position (no cached full-sequence analysis).
- Pattern prediction: `computePatternStateSignals(resultT, "", subBand)` at time t.
- Ground truth: compare Pattern CodeValue sequence at t vs t+1 (`actualPhaseFromTransition`).
- Next digit evaluation: actual = `master[t+1]`; BASE = totalScore − patternSignalsScore.
- Frequency / global counts **not** used in prediction decisions.

## 2. Pattern key mapping (UI 10 patterns)

| # | UI label | patternKey | field |
|---|----------|------------|-------|
| 1 | 1 중복 | `1 중복` | `oneDuplicate` |
| 2 | 2, 3+α | `2, 3+α` | `commaAlpha_2_3` |
| 3 | 3, 4+α | `3, 4+α` | `plusAlpha_3_2` |
| 4 | 4, 5+α | `4, 5+α` | `plusAlpha_4_3` |
| 5 | 5+α, 4 | `5+α, 4` | `plusAlpha_4_4` |
| 6 | 3 이상 | `3 이상` | `threeOrMore` |
| 7 | 5 이상 | `5 이상` | `fiveOrMore` |
| 8 | 1 사이 | `1 사이` | `oneBetween` |
| 9 | 3+α, 2 | `3+α, 2` | `alphaPlus_3_2` |
| 10 | 4+α, 3 | `4+α, 3` | `alphaPlus_4_3` |

## 3. Total prediction positions: **418**
Positions with ≥1 pattern signal: **415** (99.3%)

## 4. Per-pattern performance

| pattern | cases | coverage | phase acc | repeat prec | trans prec | run acc | band acc | avg conf |
|---------|------:|---------:|----------:|------------:|-----------:|--------:|---------:|---------:|
| 1 중복 | 418 | 15.6% | 100.0% | -% | 100.0% | 100.0% | 94.7% | 0.55 |
| 2, 3+α | 418 | 60.8% | 73.2% | 0.0% | 82.0% | 73.2% | 78.6% | 0.83 |
| 3, 4+α | 418 | 45.0% | 88.2% | 0.0% | 90.9% | 88.2% | 79.4% | 0.85 |
| 4, 5+α | 418 | 31.8% | 76.0% | -% | 76.0% | 76.0% | 88.0% | 0.84 |
| 5+α, 4 | 418 | 0.0% | -% | -% | -% | -% | -% | 0.00 |
| 3 이상 | 418 | 85.6% | 85.7% | 15.4% | 97.4% | 85.7% | 80.2% | 0.20 |
| 5 이상 | 418 | 45.0% | 77.6% | 13.3% | 100.0% | 77.6% | 74.1% | 0.20 |
| 1 사이 | 418 | 0.2% | 100.0% | -% | 100.0% | 100.0% | 100.0% | 0.86 |
| 3+α, 2 | 418 | 17.9% | 42.9% | -% | 42.9% | 42.9% | 85.7% | 0.21 |
| 4+α, 3 | 418 | 3.1% | 100.0% | -% | 100.0% | 100.0% | 0.0% | 0.86 |

## 5. Confusion matrices (phase)

### 1 중복

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 0 |
| pred transition | 0 | 19 |
| pred totals | 0 | 19 |
| actual totals | 0 | 19 |

### 2, 3+α

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 6 |
| pred transition | 9 | 41 |
| pred totals | 6 | 50 |
| actual totals | 9 | 47 |

### 3, 4+α

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 1 |
| pred transition | 3 | 30 |
| pred totals | 1 | 33 |
| actual totals | 3 | 31 |

### 4, 5+α

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 0 |
| pred transition | 6 | 19 |
| pred totals | 0 | 25 |
| actual totals | 6 | 19 |

### 5+α, 4

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 0 |
| pred transition | 0 | 0 |
| pred totals | 0 | 0 |
| actual totals | 0 | 0 |

### 3 이상

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 2 | 11 |
| pred transition | 2 | 76 |
| pred totals | 13 | 78 |
| actual totals | 4 | 87 |

### 5 이상

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 2 | 13 |
| pred transition | 0 | 43 |
| pred totals | 15 | 43 |
| actual totals | 2 | 56 |

### 1 사이

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 0 |
| pred transition | 0 | 1 |
| pred totals | 0 | 1 |
| actual totals | 0 | 1 |

### 3+α, 2

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 0 |
| pred transition | 4 | 3 |
| pred totals | 0 | 7 |
| actual totals | 4 | 3 |

### 4+α, 3

|  | actual repeat | actual transition |
|--|--------------:|------------------:|
| pred repeat | 0 | 0 |
| pred transition | 0 | 1 |
| pred totals | 0 | 1 |
| actual totals | 0 | 1 |

## 6. Confidence calibration (phase accuracy by bucket)

### 1 중복
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 0 | -% |
| 0.4~0.6 | 19 | 100.0% |
| 0.6~0.8 | 0 | -% |
| >=0.8 | 0 | -% |

### 2, 3+α
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 0 | -% |
| 0.4~0.6 | 1 | 0.0% |
| 0.6~0.8 | 8 | 12.5% |
| >=0.8 | 47 | 85.1% |

### 3, 4+α
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 0 | -% |
| 0.4~0.6 | 1 | 0.0% |
| 0.6~0.8 | 0 | -% |
| >=0.8 | 33 | 90.9% |

### 4, 5+α
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 0 | -% |
| 0.4~0.6 | 0 | -% |
| 0.6~0.8 | 0 | -% |
| >=0.8 | 25 | 76.0% |

### 3 이상
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 91 | 85.7% |
| 0.4~0.6 | 0 | -% |
| 0.6~0.8 | 0 | -% |
| >=0.8 | 0 | -% |

### 5 이상
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 58 | 77.6% |
| 0.4~0.6 | 0 | -% |
| 0.6~0.8 | 0 | -% |
| >=0.8 | 0 | -% |

### 3+α, 2
| bucket | n | phase accuracy |
|--------|--:|---------------:|
| <0.4 | 7 | 42.9% |
| 0.4~0.6 | 0 | -% |
| 0.6~0.8 | 0 | -% |
| >=0.8 | 0 | -% |

## 7. Tail length diagnostic (phase accuracy, default prod=12 unchanged)

| pattern | tail=6 | tail=8 | tail=12 | tail=16 | tail=24 | best |
|---------|-------:|-------:|--------:|--------:|--------:|------|
| 1 중복 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **6** |
| 2, 3+α | 73.2% | 73.2% | 73.2% | 73.2% | 73.2% | **6** |
| 3, 4+α | 88.2% | 88.2% | 88.2% | 88.2% | 88.2% | **6** |
| 4, 5+α | 76.0% | 76.0% | 76.0% | 76.0% | 76.0% | **6** |
| 5+α, 4 | -% | -% | -% | -% | -% | **6** |
| 3 이상 | 85.7% | 85.7% | 85.7% | 85.7% | 85.7% | **6** |
| 5 이상 | 77.6% | 77.6% | 77.6% | 77.6% | 77.6% | **6** |
| 1 사이 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **6** |
| 3+α, 2 | 42.9% | 42.9% | 42.9% | 42.9% | 42.9% | **6** |
| 4+α, 3 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **6** |

## 8. Pattern agreement (same prediction %)

Top redundant pairs (same phase prediction):

| pair | n | same% | both correct% | opposite% |
|------|--:|------:|--------------:|----------:|
| 2, 3+α × 3+α, 2 | 75 | 100.0% | 4.0% | 0.0% |
| 2, 3+α × 3, 4+α | 131 | 100.0% | 14.5% | 0.0% |
| 2, 3+α × 4, 5+α | 99 | 100.0% | 9.1% | 0.0% |
| 3, 4+α × 4, 5+α | 88 | 100.0% | 8.0% | 0.0% |
| 3, 4+α × 3+α, 2 | 48 | 100.0% | 6.3% | 0.0% |
| 4, 5+α × 3+α, 2 | 58 | 100.0% | 5.2% | 0.0% |
| 3 이상 × 5 이상 | 188 | 85.6% | 23.9% | 14.4% |
| 3, 4+α × 3 이상 | 188 | 75.0% | 11.7% | 25.0% |
| 4, 5+α × 3 이상 | 133 | 71.4% | 12.0% | 28.6% |
| 2, 3+α × 5 이상 | 99 | 67.7% | 16.2% | 32.3% |
| 2, 3+α × 3 이상 | 221 | 64.7% | 11.3% | 35.3% |
| 3, 4+α × 5 이상 | 50 | 58.0% | 16.0% | 42.0% |
| 3 이상 × 3+α, 2 | 75 | 44.0% | 2.7% | 56.0% |

### Suggested redundancy groups (observation only)

- **Group Run/marker cluster**: `1 중복`, `3 이상`, `5 이상` — often agree on repeat during run extension.
- **Group Between-marker cluster**: `2,3+α`, `3,4+α`, `4,5+α`, `5+α,4`, `3+α,2`, `4+α,3` — high mutual same-prediction when marker progress similar.
- **Group SubBand switch**: `1 사이` — bandBehavior switch signal; partially independent from run-cluster.

## 9. TOP 3 patterns (by reliability candidate)

- **3 이상** — phaseAcc 85.7%, skill -4.7pp, reliability 0.449
- **3, 4+α** — phaseAcc 88.2%, skill -2.2pp, reliability 0.354
- **1 중복** — phaseAcc 100.0%, skill 9.6pp, reliability 0.294

## 10. BOTTOM 3 patterns

- **3+α, 2** — phaseAcc 42.9%, skill -47.6pp, reliability 0.000
- **5+α, 4** — phaseAcc 0.0%, skill -90.4pp, reliability 0.000
- **1 사이** — phaseAcc 100.0%, skill 9.6pp, reliability 0.029

## 11. BASE vs +10PATTERN (final Master digit, current weights unchanged)

| metric | BASE | +10PATTERN | delta |
|--------|-----:|-----------:|------:|
| exact hit | 11.2% | 12.2% | 1.0pp |
| avg rank (lower better) | 5.57 | 5.56 | -0.01 |
| top-2 hit | 19.9% | 19.9% | 0.0pp |
| top-3 hit | 28.2% | 28.2% | 0.0pp |
| avg winner margin | 3.74 | 3.03 | — |
| unique winners | 10 | 10 | — |
| winner changed by +10P | — | 45 | improved 8, worsened 4 |

## 12. Legacy vs 10Pattern conflict (phase direction)

| case | count | description |
|------|------:|-------------|
| A | 14 | Legacy direction OK, 10Pattern consensus wrong |
| B | 62 | Legacy wrong, 10Pattern consensus OK |
| C | 29 | both OK |
| D | 6 | both wrong |
| E | 62 | Legacy≠Pattern and Pattern matched actual |
| total evaluated | 111 | |

## 13. Naive baselines vs aggregated pattern phase

| baseline | phase accuracy |
|----------|---------------:|
| Model (10 patterns, when fired) | 81.2% |
| Persistence (predict same as at t) | 81.2% |
| Always repeat | 9.6% |
| Always transition | 90.4% |

Aggregated skill vs best naive baseline: **-9.2 pp**

## 14. Reliability weights (APPLIED to production)

```
score contribution = confidence × PATTERN_RELIABILITY × patternSignal × clusterDiminish
clusterDiminish = 0.5^n within cluster+phase (n=0,1,2…)
```

| pattern | field | reliability |
|---------|-------|------------:|
| 1 중복 | `oneDuplicate` | 0.72 |
| 2, 3+α | `commaAlpha_2_3` | 0.72 |
| 3, 4+α | `plusAlpha_3_2` | 1.00 |
| 4, 5+α | `plusAlpha_4_3` | 0.55 |
| 5+α, 4 | `plusAlpha_4_4` | 0.05 |
| 3 이상 | `threeOrMore` | 0.03 |
| 5 이상 | `fiveOrMore` | 0.03 |
| 1 사이 | `oneBetween` | 0.28 |
| 3+α, 2 | `alphaPlus_3_2` | 0.08 |
| 4+α, 3 | `alphaPlus_4_3` | 0.35 |

Legacy weight: 1.35 (cap 19)
Pattern signal cap per digit: 20

Redundancy clusters:
- betweenMarker: commaAlpha_2_3, plusAlpha_3_2, plusAlpha_4_3, plusAlpha_4_4, alphaPlus_3_2, alphaPlus_4_3
- countThreshold: threeOrMore, fiveOrMore

## 15. Before vs After digit performance (full 418 positions)

| metric | BEFORE | AFTER | delta |
|--------|-------:|------:|------:|
| exact hit | 11.7% | 12.2% | 0.5pp |
| top-2 hit | 19.9% | 19.9% | -0.0pp |
| top-3 hit | 28.2% | 28.2% | 0.0pp |
| avg rank | 5.56 | 5.56 | -0.00 |
| unique winners | 10 | 10 | — |

### 3이상 / 5이상 phase improvement

| pattern | BEFORE phase acc | AFTER phase acc |
|---------|-----------------:|----------------:|
| 3 이상 | 4.4% | 85.7% |
| 5 이상 | 3.4% | 77.6% |

## 16. Ablation A/B/C/D (full walk-forward)

| layer | exact | top-2 | top-3 | avg rank |
|-------|------:|------:|------:|---------:|
| A (MainBand+SubBand+Legacy) | 11.0% | 19.9% | 28.0% | 5.57 |
| B (A+PatternFlow) | 10.5% | 19.9% | 28.2% | 5.57 |
| C (B+reliability-adjusted 10Pattern) | 12.7% | 19.9% | 28.2% | 5.55 |
| D (C+Anchor (+agreement)) | 12.2% | 19.9% | 28.2% | 5.56 |

## 17. Validation split (masters only — no weight change at eval)

Calibration masters: first 19 / 28
Validation masters: last 9 / 28

| split | positions | exact | top-2 | top-3 | avg rank | unique winners |
|-------|----------:|------:|------:|------:|---------:|---------------:|
| validation (9 masters) | 133 | 15.0% | 21.8% | 27.8% | 5.50 | 10 |
| full | 418 | 12.2% | 19.9% | 28.2% | 5.56 | 10 |

## 18. Next-step proposals (if validation split underperforms)

1. If validation exact ≪ calibration — reduce patternSignal further; do not re-tune on validation.
2. Monitor 3이상/5이상 phase acc post logic fix; raise reliability only if skill > 0 on held-out masters.
3. Legacy conflict: compare Case A/B vs BEFORE before further Legacy cuts.

## 19. Legacy weight adjustment proposals (previous §15 — superseded)

_See §14–18 for applied changes._
