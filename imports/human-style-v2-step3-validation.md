# Human-style V2 STEP3 sequential validation

Generated: 2026-08-26T02:36:12.550Z

## Verdict: **CONDITIONAL PASS**

## Human fixture
Expected STEP1/2: LOW → LOW_LOW (regression only)
Actual: LOW → LOW_LOW → **0**
STEP3 method: pair
```
STEP3 sequential selection (저점의 저점(0~1))
pool = [0,1]
recent order: 0 → 1
pair anchor = 0, other = 1
pairCode = 01
pair path: 01 gaps(50) → oneBetween → oneBetween → oneBetween → oneDuplicate → leaf | child=terminates parent=keep deeper=keep method=structural_parent_keep → REPEAT
pair structural: child=terminates parent=keep → REPEAT (structural_parent_keep)
pairDecision = 0
method = pair
FINAL = 0
```

## 28 Master STEP3

| tail | STEP1 | STEP2 | pool | recent order | repeat cand | repeat dec | pair anchor | final | method |
|------|-------|-------|------|--------------|-------------|------------|-------------|-------|--------|
| …42098591 | LOW | LOW_LOW | [0,1] | 1→0 | — | — | 1 | 1 | pair |
| …10858208 | HIGH | HIGH_LOW | [5,6,7] | 5→7→6 | 5 | REPEAT | — | 5 | repeat |
| …64455403 | HIGH | HIGH_LOW | [5,6,7] | 5→6→7 | 5 | REPEAT | — | 5 | repeat |
| …23464469 | HIGH | HIGH_LOW | [5,6,7] | 6→5→7 | 6 | REPEAT | — | 6 | repeat |
| …25283416 | HIGH | HIGH_LOW | [5,6,7] | 6→5→7 | 6 | REPEAT | — | 6 | repeat |
| …06078600 | LOW | LOW_LOW | [0,1] | 0→1 | — | — | 0 | 0 | pair |
| …09732720 | HIGH | HIGH_LOW | [5,6,7] | 7→5→6 | 7 | REPEAT | — | 7 | repeat |
| …76928498 | HIGH | HIGH_HIGH | [8,9] | 8→9 | — | — | 8 | 8 | pair |
| …81802706 | HIGH | HIGH_LOW | [5,6,7] | 6→7→5 | 6 | REPEAT | — | 6 | repeat |
| …40388562 | LOW | LOW_HIGH | [2,3,4] | 2→3→4 | 2 | REPEAT | — | 2 | repeat |
| …55642813 | LOW | LOW_HIGH | [2,3,4] | 3→2→4 | 3 | REPEAT | — | 3 | repeat |
| …68391228 | HIGH | HIGH_HIGH | [8,9] | 8→9 | — | — | 8 | 8 | pair |
| …33944426 | HIGH | HIGH_LOW | [5,6,7] | 6→5→7 | 6 | REPEAT | — | 6 | repeat |
| …53954316 | HIGH | HIGH_LOW | [5,6,7] | 6→5→7 | 6 | REPEAT | — | 6 | repeat |
| …85955093 | LOW | LOW_HIGH | [2,3,4] | 3→4→2 | 3 | REPEAT | — | 3 | repeat |
| …97038452 | LOW | LOW_HIGH | [2,3,4] | 2→4→3 | 2 | REPEAT | — | 2 | repeat |
| …64861826 | HIGH | HIGH_HIGH | [8,9] | 8→9 | — | — | 8 | 9 | pair |
| …68612764 | LOW | LOW_HIGH | [2,3,4] | 4→2→3 | 4 | REPEAT | — | 4 | repeat |
| …16865332 | LOW | LOW_HIGH | [2,3,4] | 2→3→4 | 2 | REPEAT | — | 2 | repeat |
| …48339320 | LOW | LOW_LOW | [0,1] | 0→1 | — | — | 0 | 0 | pair |
| …64528291 | LOW | LOW_LOW | [0,1] | 1→0 | — | — | 1 | 1 | pair |
| …40346009 | HIGH | HIGH_HIGH | [8,9] | 9→8 | — | — | 9 | 9 | pair |
| …52469612 | LOW | LOW_HIGH | [2,3,4] | 2→4→3 | 2 | REPEAT | — | 2 | repeat |
| …28168088 | HIGH | HIGH_HIGH | [8,9] | 8→9 | — | — | 8 | 8 | pair |
| …85869405 | HIGH | HIGH_LOW | [5,6,7] | 5→6→7 | 5 | REPEAT | — | 5 | repeat |
| …42293369 | HIGH | HIGH_LOW | [5,6,7] | 6→5 | 6 | REPEAT | — | 6 | repeat |
| …00652287 | HIGH | HIGH_LOW | [5,6,7] | 7→5→6 | 7 | REPEAT | — | 7 | repeat |
| …60196198 | HIGH | HIGH_LOW | [5,6,7] | 6→5→7 | 6 | REPEAT | — | 6 | repeat |

## Stats
- final digit distribution: 0:2, 1:2, 2:4, 3:2, 4:1, 5:3, 6:7, 7:2, 8:3, 9:2
- method: pair:9, repeat:19
- recent digit = final: **27/28** (96.4%)
- repeat REPEAT (early win): **19/28**
- repeat TERMINATE (eliminate): **0/28**
- pair decisions: **9/28**

Production V1: unchanged
STEP1/STEP2: unchanged
