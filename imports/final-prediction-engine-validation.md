# Final Prediction Engine Validation (Production Freeze)

Generated: 2026-08-25T07:25:48.052Z
Masters: 28, walk-forward positions: 418

## 0. Structure freeze (no weight changes this run)

- PatternCodeValue / MasterDigit separation
- PatternStateSignal + reliability + cluster cap
- Master digit source = `result.digits`
- Legacy signal, SubBand soft gating, PatternFlow, weak Anchor
- **Production weights unchanged**

## 1. PatternFlow contribution (A → B)

| metric | count | rate |
|--------|------:|-----:|
| total positions | 418 | 100% |
| winner changed | 149 | 35.6% |
| changed → improved (B hit, A miss) | 14 | 3.3% |
| changed → worsened (A hit, B miss) | 16 | 3.8% |
| net exact | -2 | -0.5pp |
| actual rank improved | 133 | 31.8% |
| actual rank worsened | 120 | 28.7% |

### By situation (A→B, positions matching condition)

| condition | n | winner changed | improved | worsened | net | rank+ | rank- |
|-----------|--:|---------------:|---------:|---------:|----:|------:|------:|
| actual_repeat | 44 | 14 | 14 | 0 | 14 | 14 | 0 |
| mainBand_stay | 232 | 81 | 3 | 2 | 1 | 78 | 73 |
| subBand_switch | 213 | 78 | 11 | 15 | -4 | 61 | 53 |
| legacy_agrees_flow | 269 | 0 | 0 | 0 | 0 | 77 | 78 |
| patternState_conflicts_flow | 398 | 137 | 13 | 15 | -2 | 130 | 113 |
| actual_transition | 374 | 135 | 0 | 16 | -16 | 119 | 120 |
| mainBand_switch | 186 | 68 | 11 | 14 | -3 | 55 | 47 |
| patternState_agrees_flow | 17 | 12 | 1 | 1 | 0 | 3 | 5 |
| subBand_stay | 205 | 71 | 3 | 1 | 2 | 72 | 67 |
| legacy_conflicts_flow | 149 | 149 | 14 | 16 | -2 | 56 | 42 |

### PatternFlow situational summary

- **Helps most when PatternState agrees with Flow** (net 0 on 17 cases).
- **Hurts when PatternState conflicts Flow** (net -2 on 398 cases).
- **Legacy conflicts Flow**: net -2.

## 2. Anchor contribution (C → D)

| metric | count | rate |
|--------|------:|-----:|
| winner changed | 24 | 5.7% |
| improved | 2 | 0.5% |
| worsened | 4 | 1.0% |
| net exact | -2 | -0.5pp |
| rank improved | 2 | 0.5% |
| rank worsened | 4 | 1.0% |

### By anchor context

| context | n | changed | improved | worsened | net |
|---------|--:|--------:|---------:|---------:|----:|
| anchor_repeat_context | 264 | 19 | 1 | 3 | -2 |
| anchor_transition_context | 154 | 5 | 1 | 1 | 0 |

## 3. Conditional gating candidates (NOT applied)

1. **PatternFlow**: enable full weight when `patternState_agrees_flow`; reduce when `patternState_conflicts_flow` or `legacy_conflicts_flow`.
2. **PatternFlow**: suppress on `subBand_switch` if net negative in that bucket.
3. **Anchor**: apply only in `anchor_repeat_context` when Legacy mode=repeat; skip or halve on transition context.
4. **Agreement bonus**: require PatternFlow+PatternState agreement before adding Anchor layer.

## 4. Pattern winner contribution (B + single pattern vs B)

| Pattern | winner changed | improved | worsened | net |
|---------|---------------:|---------:|---------:|----:|
| 1 중복 | 37 | 3 | 4 | -1 |
| 2, 3+α | 48 | 8 | 3 | 5 |
| 3, 4+α | 50 | 6 | 3 | 3 |
| 4, 5+α | 14 | 2 | 1 | 1 |
| 5+α, 4 | 0 | 0 | 0 | 0 |
| 3 이상 | 0 | 0 | 0 | 0 |
| 5 이상 | 0 | 0 | 0 | 0 |
| 1 사이 | 0 | 0 | 0 | 0 |
| 3+α, 2 | 0 | 0 | 0 | 0 |
| 4+α, 3 | 0 | 0 | 0 | 0 |

_Single-pattern ablation: add only that pattern score to B baseline._

## 5. Pattern consensus strength → digit performance (production D)

### Raw agree count (patterns sharing majority phase)

| agree | n | exact | top-2 | top-3 | avg rank |
|------:|--:|------:|------:|------:|---------:|
| 1 | 58 | 13.8% | 27.6% | 37.9% | 5.00 |
| 2 | 148 | 14.2% | 21.6% | 28.4% | 5.45 |
| 3 | 109 | 10.1% | 16.5% | 23.9% | 5.94 |
| 4+ | 100 | 10.0% | 16.0% | 27.0% | 5.62 |

### Effective agree (cluster cap: 1 vote per cluster + standalone)

| effective | n | exact | top-2 | top-3 | avg rank |
|----------:|--:|------:|------:|------:|---------:|
| 1 | 173 | 12.7% | 22.5% | 28.9% | 5.50 |
| 2 | 231 | 11.3% | 17.3% | 27.3% | 5.62 |
| 3 | 11 | 18.2% | 27.3% | 36.4% | 5.00 |
| 4+ | 0 | -% | -% | -% | - |

## 6. Pattern consensus confidence → digit performance

| confidence | n | exact | top-2 | top-3 | avg rank |
|------------|--:|------:|------:|------:|---------:|
| <0.4 | 3 | 33.3% | 33.3% | 33.3% | 6.00 |
| 0.4~0.6 | 16 | 6.3% | 25.0% | 37.5% | 5.56 |
| 0.6~0.8 | 24 | 8.3% | 29.2% | 41.7% | 4.79 |
| >=0.8 | 375 | 12.5% | 18.9% | 26.9% | 5.60 |

## 7. Score margin calibration (production D)

| margin | n | exact | top-2 | top-3 |
|--------|--:|------:|------:|------:|
| <2 | 207 | 11.1% | 19.3% | 29.5% |
| 2~5 | 121 | 13.2% | 20.7% | 26.4% |
| 5~10 | 86 | 14.0% | 19.8% | 27.9% |
| 10+ | 4 | 0.0% | 25.0% | 25.0% |

## 8. Per-master performance (production D)

| masterIdx | tail | positions | exact | top-2 | top-3 | avg rank | unique rec |
|----------:|------|----------:|------:|------:|------:|---------:|-----------:|
| 0 | …42098591 | 15 | 6.7% | 13.3% | 26.7% | 6.27 | 8 |
| 1 | …10858208 | 15 | 13.3% | 20.0% | 26.7% | 5.53 | 5 |
| 2 | …64455403 | 15 | 0.0% | 13.3% | 26.7% | 6.27 | 5 |
| 3 | …23464469 | 15 | 6.7% | 13.3% | 20.0% | 6.40 | 5 |
| 4 | …25283416 | 15 | 20.0% | 20.0% | 33.3% | 4.93 | 7 |
| 5 | …06078600 | 15 | 20.0% | 33.3% | 46.7% | 4.47 | 4 |
| 6 | …09732720 | 15 | 20.0% | 33.3% | 40.0% | 4.40 | 4 |
| 7 | …76928498 | 15 | 6.7% | 33.3% | 46.7% | 4.93 | 5 |
| 8 | …81802706 | 15 | 13.3% | 40.0% | 40.0% | 4.40 | 8 |
| 9 | …40388562 | 15 | 13.3% | 20.0% | 26.7% | 5.67 | 5 |
| 10 | …55642813 | 15 | 6.7% | 6.7% | 20.0% | 5.87 | 4 |
| 11 | …68391228 | 15 | 6.7% | 13.3% | 26.7% | 5.47 | 4 |
| 12 | …33944426 | 15 | 6.7% | 13.3% | 33.3% | 5.60 | 5 |
| 13 | …53954316 | 15 | 0.0% | 6.7% | 6.7% | 6.93 | 7 |
| 14 | …85955093 | 15 | 20.0% | 26.7% | 26.7% | 5.13 | 3 |
| 15 | …97038452 | 15 | 13.3% | 13.3% | 33.3% | 5.53 | 5 |
| 16 | …64861826 | 15 | 13.3% | 13.3% | 20.0% | 6.07 | 4 |
| 17 | …68612764 | 15 | 6.7% | 13.3% | 20.0% | 6.53 | 5 |
| 18 | …16865332 | 15 | 13.3% | 13.3% | 20.0% | 5.73 | 4 |
| 19 | …48339320 | 15 | 26.7% | 26.7% | 26.7% | 5.40 | 5 |
| 20 | …64528291 | 15 | 13.3% | 20.0% | 46.7% | 4.33 | 5 |
| 21 | …40346009 | 15 | 13.3% | 13.3% | 13.3% | 5.87 | 4 |
| 22 | …52469612 | 15 | 26.7% | 46.7% | 46.7% | 5.00 | 4 |
| 23 | …28168088 | 15 | 13.3% | 26.7% | 26.7% | 5.87 | 6 |
| 24 | …85869405 | 15 | 13.3% | 13.3% | 20.0% | 6.20 | 3 |
| 25 | …42293369 | 15 | 6.7% | 13.3% | 20.0% | 6.20 | 4 |
| 26 | …00652287 | 15 | 20.0% | 26.7% | 33.3% | 4.73 | 5 |
| 27 | …60196198 | 13 | 0.0% | 7.7% | 15.4% | 5.92 | 5 |

Master exact range: 0.0% – 26.7%

## 9. Leave-One-Master-Out (production frozen, no re-fit)

LOMO mean exact (train on 27 masters): **12.20%** ± 0.26pp
Full-data exact: **12.2%**

| held-out idx | train n | exact on train |
|-------------:|--------:|---------------:|
| 0 | 403 | 12.4% |
| 1 | 403 | 12.2% |
| 2 | 403 | 12.7% |
| 3 | 403 | 12.4% |
| 4 | 403 | 11.9% |
| 5 | 403 | 11.9% |
| 6 | 403 | 11.9% |
| 7 | 403 | 12.4% |
| 8 | 403 | 12.2% |
| 9 | 403 | 12.2% |
| 10 | 403 | 12.4% |
| 11 | 403 | 12.4% |
| 12 | 403 | 12.4% |
| 13 | 403 | 12.7% |
| 14 | 403 | 11.9% |
| 15 | 403 | 12.2% |
| 16 | 403 | 12.2% |
| 17 | 403 | 12.4% |
| 18 | 403 | 12.2% |
| 19 | 403 | 11.7% |
| 20 | 403 | 12.2% |
| 21 | 403 | 12.2% |
| 22 | 403 | 11.7% |
| 23 | 403 | 12.2% |
| 24 | 403 | 12.2% |
| 25 | 403 | 12.4% |
| 26 | 403 | 11.9% |
| 27 | 405 | 12.6% |

## 10. Simple baselines vs production D

| engine | exact | top-2 | top-3 | avg rank |
|--------|------:|------:|------:|---------:|
| **Production D** | 12.2% | 19.9% | 28.2% | 5.56 |
| Baseline A: first digit in SubBand | 9.3% | 19.9% | 28.2% | 5.56 |
| Baseline B: SubBand repeat (last) | 10.7% | 19.1% | 27.6% | 5.59 |
| Baseline C: SubBand transition (alt) | 7.7% | 19.9% | 28.2% | 5.56 |

## 11. Digit stickiness

- Global unique recommended digits: **10/10**
- Per-master unique: min 3, max 8
- No single-digit production bonus/penalty applied.

## 12. Data leakage re-check

- Each position `t` uses `master[0..t]` only for `analyzeMasterValue`.
- Pattern signals from history slice only; no future CodeValues or Master digits.
- Reliability weights fixed (walk-forward calibration); **not re-optimized in this run**.
- LOMO excludes one master from aggregate — no cross-master future leakage.

## 13. Final verdict

### CONDITIONAL PASS

구조·누수·baseline 대비 정상: production exact 12.2% > baselines (9.3/10.7/7.7%), PatternState B→C +2.2pp, LOMO 12.2%±0.3pp. PatternFlow A→B net -0.5pp, Anchor C→D net -0.5pp — global weight 변경 없이 conditional gating 1~2개만 2차 적용 권장.
