# STEP3 CASE C validation

Generated: 2026-08-26T02:36:03.442Z

## 01 fixture (pair path)

| field | before | after |
|-------|--------|-------|
| child | terminates | terminates |
| parent | keep (ignored) | keep |
| decision | TERMINATE | **REPEAT** |
| method | child direct map | structural_parent_keep |
| FINAL | 1 | **0** |

drill path (unchanged): `oneBetween → oneBetween → oneBetween → oneDuplicate → leaf`

## 3-pool 19 repeat evaluations

| master | child | parent | decision | reason |
|--------|-------|--------|----------|--------|
| …10858208 | terminates | keep | REPEAT | structural_parent_keep |
| …64455403 | terminates | keep | REPEAT | structural_parent_keep |
| …23464469 | terminates | keep | REPEAT | structural_parent_keep |
| …25283416 | terminates | keep | REPEAT | structural_parent_keep |
| …09732720 | terminates | keep | REPEAT | structural_parent_keep |
| …81802706 | terminates | keep | REPEAT | structural_parent_keep |
| …40388562 | terminates | keep | REPEAT | structural_parent_keep |
| …55642813 | terminates | keep | REPEAT | structural_parent_keep |
| …33944426 | terminates | keep | REPEAT | structural_parent_keep |
| …53954316 | terminates | keep | REPEAT | structural_parent_keep |
| …85955093 | terminates | keep | REPEAT | structural_parent_keep |
| …97038452 | terminates | keep | REPEAT | structural_parent_keep |
| …68612764 | terminates | keep | REPEAT | structural_parent_keep |
| …16865332 | terminates | keep | REPEAT | structural_parent_keep |
| …52469612 | terminates | keep | REPEAT | structural_parent_keep |
| …85869405 | terminates | keep | REPEAT | structural_parent_keep |
| …42293369 | terminates | keep | REPEAT | structural_parent_keep |
| …00652287 | terminates | keep | REPEAT | structural_parent_keep |
| …60196198 | terminates | keep | REPEAT | structural_parent_keep |

REPEAT=19 TERMINATE=0 uncertain=0

## Random 20k reachability

REPEAT=76507 TERMINATE=3435 uncertain flag=0
