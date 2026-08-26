# Human-style V2 STEP3 REPEAT/TERMINATE audit

Generated: 2026-08-26T02:30:05.074Z
**No code modified — trace only**

---

## 1. Human fixture 01 actual source sequence

- Master length: 1000, tail digit: 0
- Point values (low band) length: 503
- Code: **01** (저점,저점)
- **A. raw gaps:** length=50
- **B. buildLegacyCodeContentForCodeName gaps:** length=50
- **C. Code · 내용:** `2,1,2,2,1,1,2,1,1,5,1,2,1,2,4,5,2,3,4,1,9,1,1,1,2,1,1,1,2,2,4,2,1,2,3,2,1,1,3,1,2,1,2,2,1,2,1,1,4,1`
- **D. analyzeRecursivePatternFlow input:** identical gaps array
- **E. length:** 50
- **F. last 30:** 9,1,1,1,2,1,1,1,2,2,4,2,1,2,3,2,1,1,3,1,2,1,2,2,1,2,1,1,4,1

### G. Human-provided 01 match

- Expected length: 50, actual: 50
- **Exact match: YES**


---

## 2. STEP3 context (human fixture)

- STEP1=LOW STEP2=LOW_LOW FINAL=1
- pool=[0,1] recent=0→1
- 2-pool: **no repeat step** → pair on base master, pairCode=01, anchor=0
- liveRunLength=1

---

## 3. 01 → 10 Pattern detail

| Pattern | tail20 | 1중복 | leaf child | parent | naturalness | info score |
|---------|--------|-------|------------|--------|-------------|------------|
| oneDuplicate | 1,2,2,1,1,1,3,3,1,2,1,1,1,2,1 | hint=1 run=1 rel=at_hint_ceiling child=terminates | terminates | keep | cont=0.30 term=0.65 total=2.66 | 2.15 |
| oneBetween | 2,1,1,1,6,1,1,4,3,1,1,2,1,1 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 2.75 |
| commaAlpha_2_3 | 4,2,1,3,2,1,4 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 1.15 |
| plusAlpha_3_2 | 1,2 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.70 |
| plusAlpha_4_3 | 1,1,2 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.85 |
| plusAlpha_4_4 | 1,1 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.70 |
| threeOrMore | 5,4,5,3,4,9,4,3,3,4 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.75 |
| fiveOrMore | 5,5,9 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.45 |
| alphaPlus_3_2 | 1,2,3,1,1,1 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.75 |
| alphaPlus_4_3 | 3 | — | terminates | keep | cont=0.30 term=0.65 total=2.66 | 0.15 |

---

## 4. Recursive drill path

```
DEPTH 0
  source = STEP3 pair@01 0vs1
  input tail = [2,1,1,3,1,2,1,2,2,1,2,1,1,4,1]
  selectedPattern = oneBetween
  reason = oneBetween informativeness=2.75 tail=[2,1,1]
  informativenessScore = 2.75
  output tail = [2,1,1,1,6,1,1,4,3,1,1,2,1,1]
  top3 informativeness = oneBetween:2.75, oneDuplicate:2.15, commaAlpha_2_3:1.15
DEPTH 1
  source = STEP3 pair@01 0vs1 → oneBetween
  input tail = [2,1,1,1,6,1,1,4,3,1,1,2,1,1]
  selectedPattern = oneBetween
  reason = oneBetween informativeness=2.45 tail=[1,2,1]
  informativenessScore = 2.45
  output tail = [1,2,1]
  top3 informativeness = oneBetween:2.45, oneDuplicate:1.50, commaAlpha_2_3:0.70
DEPTH 2
  source = STEP3 pair@01 0vs1 → oneBetween → oneBetween
  input tail = [1,2,1]
  selectedPattern = oneBetween
  reason = oneBetween informativeness=2.15 tail=[1]
  informativenessScore = 2.15
  output tail = [1]
  top3 informativeness = oneBetween:2.15, oneDuplicate:1.20, commaAlpha_2_3:0.55
DEPTH 3
  source = STEP3 pair@01 0vs1 → oneBetween → oneBetween → oneBetween
  input tail = [1]
  selectedPattern = oneDuplicate
  reason = oneDuplicate informativeness=1.55 tail=[1]
  informativenessScore = 1.55
  output tail = [1]
  top3 informativeness = oneDuplicate:1.55, oneBetween:0.00, commaAlpha_2_3:0.00
LEAF (depth 4)
  source = STEP3 pair@01 0vs1 → oneBetween → oneBetween → oneBetween → oneDuplicate
  input tail = [1]
  liveRunLength = 1
  expectedHint = 1
  activeRun = 1
  relation = at_hint_ceiling
  childBehavior = terminates
  tailFlow phase = transition
  tailFlow label = 1중복 hint 1: run 1 = hint → 천장 도달
```

---

## 5. firstTerminationDepth

- depth=4 pattern=oneDuplicate
- relation=at_hint_ceiling hint=1 run=1
- childBehavior=terminates reason=oneDuplicate at_hint_ceiling

Chain: classifyOneDuplicateRunRelation → child=terminates → decideRepeatFromPattern → TERMINATE → pair picks digit 1

parentImplication=keep (**unused in decision**)

---

## 6–8. child→digit direct mapping & namespace

**YES** — `decideRepeatFromPattern`: terminates→TERMINATE, extends→REPEAT

parentImplication computed but not used in `evaluateSiblingPairByCodeContent`

| Question | Answer |
|----------|--------|
| A. STEP3 needs child/parent separation? | **YES** |
| B. terminates + flow supports 0 continuation → parent repeat possible? | **YES** (inferParentBranchImplication→keep when candidateMatchesCurrent) |
| C. Current code can express in decision? | **NO** |

---

## 9. 19/19 repeat TERMINATE

| tail | anchor | code | term pattern | relation | child | parent | decision |
|------|--------|------|--------------|----------|-------|--------|----------|
| …10858208 | 5 | 567 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …64455403 | 5 | 567 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …23464469 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …25283416 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …09732720 | 7 | 756 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …81802706 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …40388562 | 2 | 234 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …55642813 | 3 | 324 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …33944426 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …53954316 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …85955093 | 3 | 324 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …97038452 | 2 | 234 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …68612764 | 4 | 423 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …16865332 | 2 | 234 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …52469612 | 2 | 234 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …85869405 | 5 | 567 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …42293369 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …00652287 | 7 | 756 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |
| …60196198 | 6 | 657 | oneDuplicate | at_hint_ceiling | terminates | keep | TERMINATE |

Cause distribution:
- oneDuplicate at_hint_ceiling: 19

---

## 10. REPEAT reachable (broader search)

**Zero REPEAT** from evaluateCandidateRepeatByCodeContent across dataset.

---

## 11. Verdict: **CASE C** (data CASE A clear)

- **A:** 01 sequence matches human data
- **B:** drill path score-driven oneBetween×3→oneDuplicate (secondary)
- **C:** child terminates → digit TERMINATE bypasses parentImplication (**primary**)

---

## 12–14. Fix scope (design only)

Wire `inferParentBranchImplication` into STEP3 decision hierarchy (mirror STEP1/2). No weight/fixture changes.

Production V1: unchanged | STEP1/2: unchanged
