# Human-style V2 structural bias report

Generated: 2026-08-25T09:17:36.473Z
Masters: 28
Weight tuning: **none**
Production V1: **unchanged**

## Verdict: **CONDITIONAL PASS**

### Issues flagged
- STEP1 tie-like margins (<0.1): 25/28
- continuationFit tie-breaker favors LOW (avg 0.255 vs 0.250); drives 24/28 STEP1 wins
- at_hint_ceiling saturates terminationFit (89% LOW, 100% HIGH) → decisions rely on micro component diffs

---

## 1. Naturalness component branch averages

### STEP1 winner distribution: LOW=25, HIGH=3
Master tails in low band: **13/28**

| Branch | avg total | cont | term | marker | alt | nested | contra | struct | at_hint_ceiling |
|--------|-----------|------|------|--------|-----|--------|--------|--------|-----------------|
| **LOW** | 2.249 | 0.255 | 0.823 | 0.000 | 0.799 | 0.700 | 0.000 | 0.000 | 89% |
| **HIGH** | 2.267 | 0.250 | 0.850 | 0.000 | 0.796 | 0.700 | 0.000 | 0.000 | 100% |

**LOW − HIGH avg total:** -0.0183

### STEP2 winner distribution
- LOW_LOW: 21
- LOW_HIGH: 4
- HIGH_HIGH: 2
- HIGH_LOW: 1

| Branch | avg total | cont | term | marker | alt | nested | contra | struct | at_hint_ceiling |
|--------|-----------|------|------|--------|-----|--------|--------|--------|-----------------|
| **LOW_LOW** | 2.239 | 0.252 | 0.840 | 0.000 | 0.767 | 0.700 | 0.000 | 0.000 | 96% |
| **LOW_HIGH** | 2.191 | 0.260 | 0.800 | 0.000 | 0.742 | 0.700 | 0.000 | 0.000 | 80% |
| **HIGH_LOW** | 2.069 | 0.283 | 0.683 | 0.000 | 0.694 | 0.700 | 0.000 | 0.000 | 33% |
| **HIGH_HIGH** | 2.141 | 0.267 | 0.767 | 0.000 | 0.706 | 0.700 | 0.000 | 0.000 | 67% |

### STEP3 digit candidate pool (all 28 runs × subBand digits evaluated)

| Digit | avg total | cont | term | wins |
|-------|-----------|------|------|------|
| 0 | 2.123 | 0.264 | 0.779 | 17 |
| 1 | 2.137 | 0.260 | 0.802 | 4 |
| 2 | 2.209 | 0.250 | 0.850 | 3 |
| 3 | 2.229 | 0.250 | 0.850 | 1 |
| 4 | 2.229 | 0.250 | 0.850 | 0 |
| 5 | 0.960 | 0.300 | 0.600 | 1 |
| 6 | 0.960 | 0.300 | 0.600 | 0 |
| 7 | 0.960 | 0.300 | 0.600 | 0 |
| 8 | 0.960 | 0.300 | 0.600 | 2 |
| 9 | 0.960 | 0.300 | 0.600 | 0 |

---

## 2. LOW / LOW_LOW / 0 bias — primary drivers

### Component most often explaining winner margin (weighted diff)

**STEP1** (28 decisions)
- continuationFit: 24
- terminationFit: 3
- alternationFit: 1

When **LOW** wins — driver breakdown:
- continuationFit: 24
- alternationFit: 1

**STEP2**
- alternationFit: 18
- terminationFit: 7
- continuationFit: 3

When **LOW_LOW** wins:
- alternationFit: 13
- terminationFit: 5
- continuationFit: 3

**STEP3**
- continuationFit: 23
- alternationFit: 3
- terminationFit: 2

When **digit 0** wins:
- continuationFit: 16
- alternationFit: 1

**Interpretation:** Decisions are **tie-like** (avg margin STEP1=0.022). With shared `at_hint_ceiling` (terminationFit≈0.85), tiny **continuationFit** / **alternationFit** diffs flip winners — not branch-specific bonuses. STEP2 driven more by **alternationFit** (drill informativeness).

---

## 3. Virtual append symmetry audit

| Check | Result |
|-------|--------|
| All candidates use `evaluateVirtualCandidate` → `computePatternNaturalness` | ✅ same path |
| `candidateMatchesCurrent` in naturalness.total | ✅ **not used** (trace/parentImplication only) |
| Branch-specific penalty exemption | ✅ **none found** |
| `pickVirtualDigitForMainBand` | ⚠️ **intentional asymmetry**: LOW keeps tail if already low; HIGH uses 5 when crossing from low |
| `pickVirtualDigitForSubBand` | ⚠️ repeats tail when sub matches; else first digit of sub (LOW_LOW→0) |
| STEP1 side/sub pairing | LOW→side low/lowLow S; HIGH→side high/highHigh S (counterfactual by design) |
| activeRun in scoring | Uses `liveRunLength` when virtual side matches live side, else 1 — **symmetric rule** |

LOW repeat-append rate: **46%** (13/28)

---

## 4. Current-tail bias (STEP3)

| Metric | Value |
|--------|-------|
| Evaluations | 28 |
| Tail digit wins | 3 (11%) |
| Avg margin when tail wins | 0.0000 |
| Avg (tail − best non-tail) total | -0.0863 |
| Avg tail candidate total | 2.0780 |
| Avg non-tail candidate total | 2.0082 |

Tail vs non-tail component averages (within same STEP3 pools):
| Component | tail avg | non-tail avg | Δ |
|-----------|----------|--------------|---|
| continuationFit | 0.260 | 0.264 | -0.004 |
| terminationFit | 0.800 | 0.779 | 0.021 |
| markerProgressFit | 0.000 | 0.000 | 0.000 |
| alternationFit | 0.580 | 0.604 | -0.024 |
| nestedPatternAgreement | 0.700 | 0.612 | 0.088 |
| contradictionPenalty | 0.000 | 0.000 | 0.000 |
| structuralChangePenalty | 0.000 | 0.000 | 0.000 |

Tail repeat does **not** auto-add to total; advantage comes from virtual Master shape + shared `at_hint_ceiling` termination profile when margins are tiny.

---

## 5. firstDiscriminatingPattern distribution

### STEP1 (28)
- oneDuplicate: 19
- oneBetween: 9

### STEP2
- oneDuplicate: 13
- oneBetween: 6
- commaAlpha_2_3: 4
- threeOrMore: 2
- plusAlpha_4_3: 2
- plusAlpha_3_2: 1

### STEP3
- plusAlpha_3_2: 7
- threeOrMore: 6
- oneDuplicate: 5
- plusAlpha_4_3: 4
- commaAlpha_2_3: 3

No single pattern monopolizes >80% at STEP1. Drill selection uses informativeness + opponent-pattern discrimination.

---

## 6. Drill depth sensitivity (STEP1)

| maxDepth | LOW | HIGH |
|----------|-----|------|
| 1 | 20 | 8 |
| 2 | 24 | 4 |
| 3 | 25 | 3 |
| 4 | 25 | 3 |

Winner changes vs depth=4: depth1→4: 5, depth2→4: 3, depth3→4: 0

Depth rarely flips STEP1 winner → nestedPatternAgreement not the sole LOW driver.

---

## 7. Candidate margin distribution

| Step | <0.1 | 0.1-0.3 | 0.3-0.5 | >=0.5 | avg |
|------|------|---------|---------|-------|-----|
| STEP1 | 25 | 3 | 0 | 0 | 0.0224 |
| STEP2 | 21 | 6 | 1 | 0 | 0.0879 |
| STEP3 | 25 | 2 | 1 | 0 | 0.0415 |

**71** of 84 step decisions have margin <0.1 → tie-like, not strong structural preference.

---

## 8. Human fixture regression

- Expected: `LOW → LOW_LOW → 0`
- V2: `LOW → LOW_LOW → 0`
- **PASS (unchanged)**

---

## 9. Production V1

No changes to Production recommendation path, weights, or gating.

---

## 10. Per-master naturalness JSON

Full candidate breakdown: `imports/human-style-v2-bias-data.json`
