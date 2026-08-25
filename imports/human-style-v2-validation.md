# Human-style V2 tie-resolution validation

Generated: 2026-08-25T09:39:17.538Z
TIE_MARGIN_THRESHOLD: 0.08

## Verdict: **PASS**

## Human fixture
Expected: LOW → LOW_LOW → 0
Actual: LOW → LOW_LOW → 0
Match: YES

STEP1 tie: margin=0.0500 method=structural_decision uncertain=false structural=true reason=unique_deeper_keep

```
Human-style V2 state counterfactual — 1000 digits, tail=0

STEP1 — MainBand state counterfactual
branch: tail 0 · MainBand=LOW run ×1

candidate LOW (저점 [0~4]):
  state: continuation
  simulated S: [1,1,3,2,4,1,3,1,1,3,2,2,2,1,1,1,1,1,2,2,4,3,4,1,3,2,2,1,1,1,1,3,1,3,1,2,1,1,2,1,1,1,5,1,1,1,1,1,4,2,2,3,1,4,1,1,2,1,3,1,1,1,1,2,1,2,3,1,2,1,3,2,2,2,2,4,2,5,1,1,1,3,1,3,2,1,8,1,2,4,4,1,3,2,1,1,1,3,4,2,2,1,6,1,1,1,1,2,4,1,2,1,10,3,2,1,1,1,1,1,2,2,1,2,5,2,2,1,2,3,2,3,1,4,1,1,1,3,2,3,2,3,2,1,2,2,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,4,1,2,3,2,6,8,3,1,1,2,1,1,1,1,1,1,2,1,5,1,1,4,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,2,1,2,2,3,2,1,1,1,1,2,2,2,3,3,1,2,1,2,4,1,2,1,1,1,2,1,1,2,3,6,1,1,1,2,1,1,4,1,1,1,2,1,3,1,2,2]
  virtual: LOW continuation: S run 1→2 [1,1,3,2,4,1,3,1,1,3,2,2,2,1,1,1,1,1,2,2,4,3,4,1,3,2,2,1,1,1,1,3,1,3,1,2,1,1,2,1,1,1,5,1,1,1,1,1,4,2,2,3,1,4,1,1,2,1,3,1,1,1,1,2,1,2,3,1,2,1,3,2,2,2,2,4,2,5,1,1,1,3,1,3,2,1,8,1,2,4,4,1,3,2,1,1,1,3,4,2,2,1,6,1,1,1,1,2,4,1,2,1,10,3,2,1,1,1,1,1,2,2,1,2,5,2,2,1,2,3,2,3,1,4,1,1,1,3,2,3,2,3,2,1,2,2,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,4,1,2,3,2,6,8,3,1,1,2,1,1,1,1,1,1,2,1,5,1,1,4,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,2,1,2,2,3,2,1,1,1,1,2,2,2,3,3,1,2,1,2,4,1,2,1,1,1,2,1,1,2,3,6,1,1,1,2,1,1,4,1,1,1,2,1,3,1,2,1 → 1,1,3,2,4,1,3,1,1,3,2,2,2,1,1,1,1,1,2,2,4,3,4,1,3,2,2,1,1,1,1,3,1,3,1,2,1,1,2,1,1,1,5,1,1,1,1,1,4,2,2,3,1,4,1,1,2,1,3,1,1,1,1,2,1,2,3,1,2,1,3,2,2,2,2,4,2,5,1,1,1,3,1,3,2,1,8,1,2,4,4,1,3,2,1,1,1,3,4,2,2,1,6,1,1,1,1,2,4,1,2,1,10,3,2,1,1,1,1,1,2,2,1,2,5,2,2,1,2,3,2,3,1,4,1,1,1,3,2,3,2,3,2,1,2,2,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,4,1,2,3,2,6,8,3,1,1,2,1,1,1,1,1,1,2,1,5,1,1,4,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,2,1,2,2,3,2,1,1,1,1,2,2,2,3,3,1,2,1,2,4,1,2,1,1,1,2,1,1,2,3,6,1,1,1,2,1,1,4,1,1,1,2,1,3,1,2,2]
  future shape: oneBetween>oneBetween>oneBetween>oneBetween>leaf|dup=at_hint_ceiling|phase=transition
  childBehavior: terminates
  parentImplication: keep
  naturalness: cont=0.30 term=0.65 marker=0.00 alt=0.80 nested=0.70 penalty=0.10 total=2.03
  tie: delta=0.000 (neutral) disc=1.624
  structural: primary child=terminates→parent=keep | deeper child=terminates→parent=keep
  deeper@oneDuplicate: total=2.03 child=terminates parent=keep
  recursive path: oneBetween → oneBetween → oneBetween → oneBetween → leaf

candidate HIGH (고점 [5~9]):
  state: switch
  simulated S: [2,1,1,1,8,4,1,1,1,5,1,1,3,1,1,1,4,1,1,6,2,1,6,2,2,1,3,1,3,2,2,3,1,1,1,2,2,2,2,1,3,1,3,3,1,2,1,1,1,2,1,3,2,3,7,1,3,1,1,3,3,2,1,1,1,6,1,1,1,2,1,4,3,2,1,1,5,1,4,1,4,1,3,1,2,1,1,4,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,5,1,2,5,1,2,1,2,1,1,2,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,1,1,2,4,1,1,1,2,1,3,1,1,4,1,2,1,1,2,1,1,1,3,3,1,2,2,1,1,1,2,2,1,2,1,1,1,3,2,4,1,2,2,1,1,6,1,1,2,5,1,3,5,1,2,1,2,2,1,2,2,2,3,2,3,2,1,2,2,1,1,2,5,1,5,2,2,1,2,5,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,1,1,3,2,1,3,2,2,6,1,1,1,1,2,1,2,4,1,3,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1,1]
  virtual: LOW run ends at 1; HIGH switch start → [2,1,1,1,8,4,1,1,1,5,1,1,3,1,1,1,4,1,1,6,2,1,6,2,2,1,3,1,3,2,2,3,1,1,1,2,2,2,2,1,3,1,3,3,1,2,1,1,1,2,1,3,2,3,7,1,3,1,1,3,3,2,1,1,1,6,1,1,1,2,1,4,3,2,1,1,5,1,4,1,4,1,3,1,2,1,1,4,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,5,1,2,5,1,2,1,2,1,1,2,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,1,1,2,4,1,1,1,2,1,3,1,1,4,1,2,1,1,2,1,1,1,3,3,1,2,2,1,1,1,2,2,1,2,1,1,1,3,2,4,1,2,2,1,1,6,1,1,2,5,1,3,5,1,2,1,2,2,1,2,2,2,3,2,3,2,1,2,2,1,1,2,5,1,5,2,2,1,2,5,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,1,1,3,2,1,3,2,2,6,1,1,1,1,2,1,2,4,1,3,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1 → 2,1,1,1,8,4,1,1,1,5,1,1,3,1,1,1,4,1,1,6,2,1,6,2,2,1,3,1,3,2,2,3,1,1,1,2,2,2,2,1,3,1,3,3,1,2,1,1,1,2,1,3,2,3,7,1,3,1,1,3,3,2,1,1,1,6,1,1,1,2,1,4,3,2,1,1,5,1,4,1,4,1,3,1,2,1,1,4,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,5,1,2,5,1,2,1,2,1,1,2,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,1,1,2,4,1,1,1,2,1,3,1,1,4,1,2,1,1,2,1,1,1,3,3,1,2,2,1,1,1,2,2,1,2,1,1,1,3,2,4,1,2,2,1,1,6,1,1,2,5,1,3,5,1,2,1,2,2,1,2,2,2,3,2,3,2,1,2,2,1,1,2,5,1,5,2,2,1,2,5,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,1,1,3,2,1,3,2,2,6,1,1,1,1,2,1,2,4,1,3,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1,1]
  future shape: oneBetween>oneDuplicate>oneDuplicate>oneBetween>leaf|dup=none|phase=transition
  childBehavior: uncertain
  parentImplication: neutral
  naturalness: cont=0.30 term=0.60 marker=0.00 alt=0.80 nested=0.70 penalty=0.00 total=2.08
  tie: delta=0.000 (neutral) disc=1.637
  structural: primary child=uncertain→parent=neutral | deeper child=terminates→parent=neutral
  deeper@oneDuplicate: total=2.03 child=terminates parent=neutral
  recursive path: oneBetween → oneDuplicate → oneDuplicate → oneBetween → leaf

firstDiscriminatingPattern: oneDuplicate
tieResolution: margin=0.0500 threshold=0.08 method=structural_decision uncertain=false deeperDrill=true structural=true reason=unique_deeper_keep
winner: LOW (저점 [0~4])

STEP2 — SubBand state counterfactual
branch: 저점(0~4) · current 저점의 저점(0~1)

candidate LOW_LOW (저점의 저점(0~1)):
  state: continuation
  simulated S: [1,2,1,0,3,2,1,2,2,0,2,0,1,2,1,0,5,0,1,5,1,0,3,2,1,0,1,2,2,4,1,5,2,2,2,3,2,4,1,0,2,9,3,0,4,0,1,0,7,2,2,0,1,0,2,0,1,2,2,2,1,4,1,2,1,0,5,2,2,3,6,2,4,0,1,0,3,3,3,0,6,2,1,0,1,2,2,2,3,0,1,2,2,0,1,0,2,4,1,2]
  virtual: lowLow S′ continuation: run 1→2 [1,2,1,0,3,2,1,2,2,0,2,0,1,2,1,0,5,0,1,5,1,0,3,2,1,0,1,2,2,4,1,5,2,2,2,3,2,4,1,0,2,9,3,0,4,0,1,0,7,2,2,0,1,0,2,0,1,2,2,2,1,4,1,2,1,0,5,2,2,3,6,2,4,0,1,0,3,3,3,0,6,2,1,0,1,2,2,2,3,0,1,2,2,0,1,0,2,4,1,0 → 1,2,1,0,3,2,1,2,2,0,2,0,1,2,1,0,5,0,1,5,1,0,3,2,1,0,1,2,2,4,1,5,2,2,2,3,2,4,1,0,2,9,3,0,4,0,1,0,7,2,2,0,1,0,2,0,1,2,2,2,1,4,1,2,1,0,5,2,2,3,6,2,4,0,1,0,3,3,3,0,6,2,1,0,1,2,2,2,3,0,1,2,2,0,1,0,2,4,1,2]
  future shape: oneBetween>oneDuplicate>oneBetween>oneDuplicate>leaf|dup=at_hint_ceiling|phase=transition
  childBehavior: terminates
  parentImplication: keep
  naturalness: cont=0.30 term=0.65 marker=0.00 alt=0.80 nested=0.70 penalty=0.10 total=2.03
  tie: delta=0.000 (neutral) disc=1.624
  structural: primary child=terminates→parent=keep | deeper child=terminates→parent=keep
  deeper@oneBetween: total=2.03 child=terminates parent=keep
  recursive path: oneBetween → oneDuplicate → oneBetween → oneDuplicate → leaf

candidate LOW_HIGH (저점의 고점(2~4)):
  state: switch
  simulated S: [2,2,3,4,2,4,2,3,2,4,2,4,2,3,3,4,2,2,2,3,6,3,2,3,2,3,4,3,2,2,2,2,4,2,2,2,2,2,4,2,2,2,2,2,3,2,3,4,2,4,2,2,2,3,2,4,3,5,4,2,3,2,3,2,2,3,2,4,2,4,2,2,4,3,2,4,3,7,3,4,3,3,4,3,4,2,3,2,4,3,4,2,4,2,2,3,4,2,4,2,2,3,2,3,4,4,2,4,2,4,3,4,3,2,4,3,2,2,3,4,2,4,3,4,3,4,3,2,3,4,2,3,4,3,4,2,3,4,3,4,2,4,2,4,2,3,4,2,3,2,2,2,2,2,4,2,3,4,2,3,2,2,3,4,2,2,2,3,4,4,4,3,4,3,4,2,3,2,3,4,2,2,2,2,4,3,4,2,4,4,2,2,3,4,2,1]
  virtual: lowLow S′ ends at 1; lowHigh switch → [2,2,3,4,2,4,2,3,2,4,2,4,2,3,3,4,2,2,2,3,6,3,2,3,2,3,4,3,2,2,2,2,4,2,2,2,2,2,4,2,2,2,2,2,3,2,3,4,2,4,2,2,2,3,2,4,3,5,4,2,3,2,3,2,2,3,2,4,2,4,2,2,4,3,2,4,3,7,3,4,3,3,4,3,4,2,3,2,4,3,4,2,4,2,2,3,4,2,4,2,2,3,2,3,4,4,2,4,2,4,3,4,3,2,4,3,2,2,3,4,2,4,3,4,3,4,3,2,3,4,2,3,4,3,4,2,3,4,3,4,2,4,2,4,2,3,4,2,3,2,2,2,2,2,4,2,3,4,2,3,2,2,3,4,2,2,2,3,4,4,4,3,4,3,4,2,3,2,3,4,2,2,2,2,4,3,4,2,4,4,2,2,3,4,2 → 2,2,3,4,2,4,2,3,2,4,2,4,2,3,3,4,2,2,2,3,6,3,2,3,2,3,4,3,2,2,2,2,4,2,2,2,2,2,4,2,2,2,2,2,3,2,3,4,2,4,2,2,2,3,2,4,3,5,4,2,3,2,3,2,2,3,2,4,2,4,2,2,4,3,2,4,3,7,3,4,3,3,4,3,4,2,3,2,4,3,4,2,4,2,2,3,4,2,4,2,2,3,2,3,4,4,2,4,2,4,3,4,3,2,4,3,2,2,3,4,2,4,3,4,3,4,3,2,3,4,2,3,4,3,4,2,3,4,3,4,2,4,2,4,2,3,4,2,3,2,2,2,2,2,4,2,3,4,2,3,2,2,3,4,2,2,2,3,4,4,4,3,4,3,4,2,3,2,3,4,2,2,2,2,4,3,4,2,4,4,2,2,3,4,2,1]
  future shape: oneDuplicate>oneDuplicate>oneDuplicate>oneDuplicate>leaf|dup=at_hint_ceiling|phase=transition
  childBehavior: terminates
  parentImplication: neutral
  naturalness: cont=0.30 term=0.65 marker=0.00 alt=0.80 nested=0.70 penalty=0.10 total=2.03
  tie: delta=-0.100 (patternCompleted|structuralConflict|rel:none→at_hint_ceiling) disc=1.589
  structural: primary child=terminates→parent=neutral | deeper child=terminates→parent=neutral
  deeper@oneBetween: total=2.03 child=terminates parent=neutral
  recursive path: oneDuplicate → oneDuplicate → oneDuplicate → oneDuplicate → leaf

firstDiscriminatingPattern: oneBetween
tieResolution: margin=0.0000 threshold=0.08 method=structural_decision uncertain=false deeperDrill=true structural=true reason=unique_deeper_keep
winner: LOW_LOW (저점의 저점(0~1))

STEP3 — MasterDigit counterfactual (저점의 저점(0~1) only)
branch: 저점의 저점(0~1) · tail 0

candidate 0 (Master digit 0):
  virtual: Master+0 → code 01 gaps (50) 재생성
  future shape: oneDuplicate>oneDuplicate>oneBetween>oneDuplicate>leaf|dup=at_hint_ceiling|phase=transition
  childBehavior: terminates
  parentImplication: keep
  naturalness: cont=0.30 term=0.65 marker=0.00 alt=0.80 nested=0.70 penalty=0.10 total=2.03
  recursive path: oneDuplicate → oneDuplicate → oneBetween → oneDuplicate → leaf

candidate 1 (Master digit 1):
  virtual: Master+1 → code 01 gaps (50) 재생성
  future shape: oneBetween>oneBetween>oneBetween>oneDuplicate>leaf|dup=at_hint_ceiling|phase=transition
  childBehavior: terminates
  parentImplication: neutral
  naturalness: cont=0.30 term=0.65 marker=0.00 alt=0.80 nested=0.70 penalty=0.10 total=2.03
  recursive path: oneBetween → oneBetween → oneBetween → oneDuplicate → leaf

firstDiscriminatingPattern: oneDuplicate
winner: 0 (Master digit 0)

FINAL = 0
Human fixture: MATCH
V1 diagnostic: 0 (divergence: none)
```

## 28 Master

### STEP1 LOW/HIGH
- LOW: 11
- HIGH: 17

### STEP2
- LOW_LOW: 4
- HIGH_LOW: 12
- HIGH_HIGH: 5
- LOW_HIGH: 7

### FINAL digit
- 5: 12
- 8: 5
- 3: 4
- 0: 3
- 2: 3
- 1: 1

## Margin
| Step | avg | <0.1 |
|------|-----|------|
| STEP1 | 0.0074 | 28/28 |
| STEP2 | 0.0444 | 26/28 |
| STEP3 | 0.0170 | 27/28 |

## Tie-resolution stats
- STEP1 deeper drill: **28/28**
- STEP2 deeper drill: **23/28**
- STEP1 structural decision: **26/28**
- STEP2 structural decision: **16/28**
- STEP1 uncertain: **0/28**
- STEP2 uncertain: **2/28**

### STEP1 resolution methods
- structural_decision: 26
- deeper_discrimination: 2

### STEP2 resolution methods
- structural_decision: 16
- naturalness_total: 5
- deeper_discrimination: 5
- uncertain_fallback: 2

## firstDiscriminatingPattern
### STEP1
- oneDuplicate: 19
- oneBetween: 9

## Issues
- none

Production V1: unchanged
