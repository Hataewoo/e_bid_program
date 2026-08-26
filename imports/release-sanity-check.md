# Release sanity check

Generated: 2026-08-26T02:38:36.852Z

## 1–3. UI path

| check | result |
|-------|--------|
| AnalysisV2Panel uses runHumanStyleV2(digits, masterNo) | YES |
| display.finalDigit === v2.finalDigit | YES (by construction) |
| STEP1→STEP2→STEP3 chain in UI | YES |
| Old simultaneous STEP3 selector in UI path | NONE |

UI entry: AnalysisMain → AnalysisV2PredictionPanel → runHumanStyleV2
Helper: getAnalysisV2DisplayValue → runHumanStyleV2 (same args)

## 4. 28 Master comparison

| tail | STEP1 | STEP2 | recent | method | decisionMethod | final | UI | match |
|------|-------|-------|--------|--------|----------------|-------|-----|-------|
| …42098591 | LOW | LOW_LOW | 1 | pair | pair:structural_parent_keep | 1 | 1 | OK |
| …10858208 | HIGH | HIGH_LOW | 5 | repeat | repeat:structural_parent_keep | 5 | 5 | OK |
| …64455403 | HIGH | HIGH_LOW | 5 | repeat | repeat:structural_parent_keep | 5 | 5 | OK |
| …23464469 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |
| …25283416 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |
| …06078600 | LOW | LOW_LOW | 0 | pair | pair:structural_parent_keep | 0 | 0 | OK |
| …09732720 | HIGH | HIGH_LOW | 7 | repeat | repeat:structural_parent_keep | 7 | 7 | OK |
| …76928498 | HIGH | HIGH_HIGH | 8 | pair | pair:structural_parent_keep | 8 | 8 | OK |
| …81802706 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |
| …40388562 | LOW | LOW_HIGH | 2 | repeat | repeat:structural_parent_keep | 2 | 2 | OK |
| …55642813 | LOW | LOW_HIGH | 3 | repeat | repeat:structural_parent_keep | 3 | 3 | OK |
| …68391228 | HIGH | HIGH_HIGH | 8 | pair | pair:structural_parent_keep | 8 | 8 | OK |
| …33944426 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |
| …53954316 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |
| …85955093 | LOW | LOW_HIGH | 3 | repeat | repeat:structural_parent_keep | 3 | 3 | OK |
| …97038452 | LOW | LOW_HIGH | 2 | repeat | repeat:structural_parent_keep | 2 | 2 | OK |
| …64861826 | HIGH | HIGH_HIGH | 8 | pair | pair:naturalness_termination_margin | 9 | 9 | OK |
| …68612764 | LOW | LOW_HIGH | 4 | repeat | repeat:structural_parent_keep | 4 | 4 | OK |
| …16865332 | LOW | LOW_HIGH | 2 | repeat | repeat:structural_parent_keep | 2 | 2 | OK |
| …48339320 | LOW | LOW_LOW | 0 | pair | pair:structural_parent_keep | 0 | 0 | OK |
| …64528291 | LOW | LOW_LOW | 1 | pair | pair:structural_parent_keep | 1 | 1 | OK |
| …40346009 | HIGH | HIGH_HIGH | 9 | pair | pair:structural_parent_keep | 9 | 9 | OK |
| …52469612 | LOW | LOW_HIGH | 2 | repeat | repeat:structural_parent_keep | 2 | 2 | OK |
| …28168088 | HIGH | HIGH_HIGH | 8 | pair | pair:structural_parent_keep | 8 | 8 | OK |
| …85869405 | HIGH | HIGH_LOW | 5 | repeat | repeat:structural_parent_keep | 5 | 5 | OK |
| …42293369 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |
| …00652287 | HIGH | HIGH_LOW | 7 | repeat | repeat:structural_parent_keep | 7 | 7 | OK |
| …60196198 | HIGH | HIGH_LOW | 6 | repeat | repeat:structural_parent_keep | 6 | 6 | OK |

**UI/path mismatches: 0/28**

## 5. V1 recommendations (28 masters)

V1 uses predictNextDigitStep — unchanged path. Sample V1 values logged above (column not compared to baseline tag).

## 9. Production V1 files

nextDigitEngine.ts, AnalysisPredictionPanel.tsx: no diff vs HEAD (V2-only changes elsewhere).

## 10. Runtime exception probes

- FAIL: empty master UI guard: Cannot read properties of undefined (reading 'id')
- FAIL: single digit low: Cannot read properties of undefined (reading 'id')

## Warnings (non-blocking)

- recent=final: 27/28
- repeat early win: 19/28
- random REPEAT/TERMINATE (prior audit): 76507 / 3435 — distribution note only
