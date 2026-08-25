# Analysis V2 UI path verification

Generated: 2026-08-25T09:44:15.214Z

| tail | V1 | V2 STEP1 | V2 STEP2 | V2 final | UI display | match |
|------|-----|----------|----------|----------|------------|-------|
| …42098591 | 5 | LOW | LOW_LOW | 0 | 0 | OK |
| …10858208 | 2 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …64455403 | 3 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …23464469 | 9 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …25283416 | 3 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …06078600 | 7 | LOW | LOW_LOW | 1 | 1 | OK |
| …09732720 | 0 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …76928498 | 7 | HIGH | HIGH_HIGH | 8 | 8 | OK |
| …81802706 | 2 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …40388562 | 8 | LOW | LOW_HIGH | 3 | 3 | OK |
| …55642813 | 1 | LOW | LOW_HIGH | 2 | 2 | OK |
| …68391228 | 2 | HIGH | HIGH_HIGH | 8 | 8 | OK |
| …33944426 | 4 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …53954316 | 4 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …85955093 | 5 | LOW | LOW_HIGH | 2 | 2 | OK |
| …97038452 | 9 | LOW | LOW_HIGH | 3 | 3 | OK |
| …64861826 | 1 | HIGH | HIGH_HIGH | 8 | 8 | OK |
| …68612764 | 8 | LOW | LOW_HIGH | 3 | 3 | OK |
| …16865332 | 1 | LOW | LOW_HIGH | 2 | 2 | OK |
| …48339320 | 7 | LOW | LOW_LOW | 0 | 0 | OK |
| …64528291 | 5 | LOW | LOW_LOW | 0 | 0 | OK |
| …40346009 | 0 | HIGH | HIGH_HIGH | 8 | 8 | OK |
| …52469612 | 8 | LOW | LOW_HIGH | 3 | 3 | OK |
| …28168088 | 8 | HIGH | HIGH_HIGH | 8 | 8 | OK |
| …85869405 | 1 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …42293369 | 2 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …00652287 | 0 | HIGH | HIGH_LOW | 5 | 5 | OK |
| …60196198 | 4 | HIGH | HIGH_LOW | 5 | 5 | OK |

Mismatches: **0/28**

Production V1 path: unchanged (predictNextDigitStep only for V1 column)
V2 UI path: getAnalysisV2DisplayValue → runHumanStyleV2(result.digits, result.masterNo)