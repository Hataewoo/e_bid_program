# Reverse Engineering Playbook

| 항목 | 내용 |
|------|------|
| **문서명** | RE-PLAYBOOK — 레거시 역분석 실행 절차 |
| **버전** | 1.0.0 |
| **작성일** | 2026-06-30 |
| **대상** | Reverse Engineering Engineer, QA, Developer |
| **관련 문서** | [RESEARCH_WORKSPACE.md](./RESEARCH_WORKSPACE.md), [TEST-CATALOG.md](./TEST-CATALOG.md), [STATUS.md](./STATUS.md), [PRD.md](./PRD.md) §26 |

---

## 1. 목적

레거시 MFC **전자입찰 누적카운트** 프로그램의 입·출력을 **추측 없이** 관측하고, CS E-Bid Analyzer **Research** 워크스페이스에 기록한 뒤, **Verification** 및 **Test Catalog**로 자동 검증 가능한 형태까지 올리는 **표준 절차**를 정의한다.

### 핵심 원칙

| # | 원칙 | 금지 |
|---|------|------|
| 1 | 레거시 출력은 **눈으로 본 값**만 기록 | 계산기·추측으로 expected 작성 |
| 2 | 증거(스크린샷) 없이 PASS 승격 금지 | 스크린샷 없는 `SRC-LEGACY` |
| 3 | Compare → Hypothesis → Verification 순서 | Verification만 먼저 쌓기 |
| 4 | 알고리즘 구현은 Verification PASS 이후 | FAIL 상태에서 엔진 “감” 수정 |
| 5 | Test Case ID는 [TEST-CATALOG.md](./TEST-CATALOG.md) 규칙 준수 | 임의 이름만 사용 |

---

## 2. 역할 & 산출물

| 역할 | 책임 | 산출물 |
|------|------|--------|
| **Observer** | 레거시 프로그램 실행·캡처 | 스크린샷, 관측 메모 |
| **Recorder** | Research Experiment 입력 | Inputs / Legacy Outputs |
| **Analyst** | Diff 분석·가설 작성 | Hypothesis, Comparison |
| **Verifier** | Verification·Catalog 등록 | Verification DB, TEST-CATALOG 행 |
| **Developer** | PASS된 규칙만 코드화 | 엔진 PR + regression fixture |

---

## 3. 준비물

### 3.1 소프트웨어

- 레거시 전자입찰 프로그램 (Windows)
- CS E-Bid Analyzer (`npm run dev` 또는 설치 빌드)
- 스크린샷 도구 (Win+Shift+S 등)

### 3.2 CS E-Bid 사전 설정

1. **Master** — 관측에 쓸 Master 00~99 데이터 등록 (또는 Admin import)
2. **Code** — 레거시와 동일한 Code 테이블 구성
3. **Research** — 사이드바 → **Research** (`/research`)
4. (선택) **Settings → DB 백업** — 대량 입력 전 백업

### 3.3 관측 기록 템플릿 (메모장)

```
[관측 ID] OBS-YYYYMMDD-NN
레거시 버전:
Master No:
Master Value (원문):
Code (해당 시):
Legacy STEP2:
Legacy STEP3:
Legacy Statistics:
Legacy Prediction:
스크린샷 파일명:
관측자 / 일시:
```

---

## 4. 전체 흐름 (한 장 요약)

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ ① 레거시 관측 │ → │ ② Experiment 기록 │ → │ ③ Verification 등록 │
│  + 스크린샷   │    │  Inputs/Outputs  │    │  + TEST-CATALOG   │
└──────────────┘    └────────┬────────┘    └────────┬─────────┘
                             │                       │
                             ▼                       ▼
                    ┌─────────────────┐    ┌──────────────────┐
                    │ ④ Compare/Diff  │    │ ⑤ Test Suite 실행 │
                    │  + Hypothesis   │    │  Pass Rate ≥95%  │
                    └─────────────────┘    └──────────────────┘
```

**게이트:** P0-13 (Pass Rate ≥95%) 충족 전까지 Prediction/CodeValue를 “레거시 동등”으로 표기하지 않는다. ([STATUS.md](./STATUS.md) §3)

---

## 5. Phase A — 레거시 프로그램 관측

### 5.1 관측 시나리오 선택

| 우선순위 | 시나리오 | TEST-CATALOG Category | 목표 건수 (Phase 1) |
|----------|----------|----------------------|---------------------|
| 1 | Master Value 숫자열 → STEP2/3 | `CAT-STEP2`, `CAT-STEP3` | ≥40 |
| 2 | Statistics 요약 문자열 | `CAT-STAT` | ≥20 |
| 3 | 포맷·경계 (쉼표, 공백, 빈값) | `CAT-EDGE` | ≥15 |
| 4 | CodeValue 통계 | `CAT-CV` | ≥10 |
| 5 | Prediction | `CAT-PRED` | ≥10 |
| 6 | Master 00~99 sweep | `CAT-BATCH` | 100 (장기) |

### 5.2 관측 절차 (체크리스트)

1. [ ] 레거시 프로그램과 CS E-Bid **Code/Master** 구성이 동일한지 확인
2. [ ] **Master No** 고정 (예: `01`)
3. [ ] **Master Value** 입력 — 레거시에 표시된 **원문 그대로** 메모 (공백·쉼표 포함)
4. [ ] 분석 실행 후 **STEP2, STEP3, Statistics, Prediction** 각각 **복사 가능한 텍스트**로 기록
5. [ ] 결과 화면 **스크린샷** (입력값 + 출력값이 함께 보이게)
6. [ ] 동일 입력을 **두 번** 실행해 결과가 재현되는지 확인 (불일치 시 추가 캡처)
7. [ ] 메모장 템플릿(§3.3) 작성 → `OBS-*` ID 부여

### 5.3 기록 시 주의

| 항목 | Do | Don't |
|------|-----|-------|
| Master Value | 레거시 입력창에 보이는 그대로 | 숫자만 정제해서 기록 (정제는 CS E-Bid 엔진 담당) |
| 빈 필드 | 빈 문자열 `""` 명시 | null/생략으로 혼동 |
| Statistics | 레거시 한 줄 문자열 **전체** | 요약 재작성 |
| Prediction | 레거시 표시값 그대로 | Analysis 휴리스틱 결과 복사 |

---

## 6. Phase B — Research Experiment 기록

**경로:** Sidebar → **Research** → 실험 선택/생성

### 6.1 Experiment 생성 (Experiments 탭)

| 필드 | 예시 | 비고 |
|------|------|------|
| name | `Legacy — Master 01 STEP2/3 baseline` | TEST-CATALOG 이름과 맞출 것 |
| date | 관측일 | |
| version | 레거시 프로그램 버전 | |
| description | `OBS-20260630-01, TC-STEP2-010` | OBS ID + TC ID |
| status | `Draft` | Compare 후 자동 갱신 |

**Naming convention:**

```
Legacy — {field focus} — Master {NN} [{optional note}]
예: Legacy — Statistics — Master 05 [10 digits]
```

### 6.2 Inputs 기록 (Inputs 탭)

최소 필드:

| fieldKey | fieldValue | 필수 |
|----------|------------|------|
| `masterNo` | `01` | ✅ |
| `masterValue` | 레거시에 입력한 원문 | ✅ |
| `code` | (해당 시) | 선택 |

**Save Inputs** 클릭.

### 6.3 Legacy Outputs 기록 (Outputs 탭 — Legacy Program 열)

| fieldKey | source | 값 |
|----------|--------|-----|
| `step2` | legacy | 관측값 |
| `step3` | legacy | 관측값 |
| `statistics` | legacy | 관측 한 줄 문자열 |
| `prediction` | legacy | 관측값 |
| `memo` | legacy | OBS ID, 스크린샷 파일명 |

**Save Outputs** 클릭.

### 6.4 Our Program 열 (Outputs — 우측)

| 정책 | 설명 |
|------|------|
| **기본** | 수동 입력만 (레거시와 비교할 때 우리 앱 결과) |
| **Draft 제안** | “분석 엔진으로 채우기”는 **참고용 초안** — 저장 전 diff 확인 필수 ([RESEARCH_WORKSPACE.md](./RESEARCH_WORKSPACE.md) §9) |

레거시 관측 **직후**에는 Our Program을 비워 두어도 된다.

### 6.5 Screenshots (Screenshots 탭)

1. **Upload** — §5.2에서 캡처한 PNG/JPG
2. **Caption** — `OBS-20260630-01, Master 01, step2=01234`

### 6.6 Comparison (Differences 탭)

1. Our Program 값이 있으면 입력 후 **Run Comparison**
2. Diff 유형 기록: Match / Digit Difference / Length Difference 등
3. status → `Verified` 또는 `Failed`

### 6.7 Hypothesis (Hypotheses 탭) — 선택

관측 패턴이 반복될 때만:

```
Title: STEP2 = digits 0-4 in order from masterValue
Description: (근거: Experiment #3, #7, #12 동일 패턴)
Confidence: 80  (관측 건수에 비례)
Verified: false  (Verification PASS 전까지)
```

---

## 7. Phase C — Verification 등록

Verification은 **자동 회귀 테스트**의 원천 데이터다. Experiment legacy output → Verification expected로 승격한다.

### 7.1 UI 등록 (Verification 탭)

| 필드 | 내용 |
|------|------|
| name | `TC-STEP2-010 Legacy Master 01` |
| inputData | JSON (아래 §7.2) |
| expectedResult | JSON **subset** (검증할 필드만) |
| experimentId | (선택) 연결 Experiment |

**분석 엔진 실행** 버튼:

- `actualResult` 자동 채움
- expected와 subset 비교 → PASS/FAIL 메시지

**Save** 클릭.

### 7.2 JSON 형식 (표준)

**inputData** (문자열로 저장):

```json
{
  "masterNo": "01",
  "masterValue": "0123456789"
}
```

**expectedResult** — 검증할 필드만 포함 (subset match):

```json
{
  "step2": "01234",
  "step3": "56789"
}
```

Statistics만 검증할 때:

```json
{
  "statistics": "자릿수: 10 | Low: 50% | High: 50% | 최빈값: 0"
}
```

> 엔진은 `step2`, `step3`, `statistics`, `prediction`, `memo`를 생성한다. expected에 있는 키만 비교한다. (`engineVerification.ts` → `evaluateVerificationMatch`)

### 7.3 Test Case ID 부여

[TEST-CATALOG.md](./TEST-CATALOG.md) §1.4:

```
TC-{CAT}-{NNN}
예: TC-STEP2-010, TC-STAT-015, TC-EDGE-003
```

Verification `name` 필드에 TC ID를 **반드시** 포함한다.

### 7.4 Bulk JSON / CSV import (Catalog pipeline)

여러 건을 한 번에 등록·갱신:

1. Research → **Test Suite** 탭
2. **중복 처리** — `건너뛰기` (신규만) 또는 `덮어쓰기` (동일 `TC-*` ID 갱신)
3. **Catalog 가져오기 (JSON/CSV)** — 파일 선택
4. 템플릿: `src/shared/fixtures/legacy-verification-catalog.template.json` / `.csv`
5. **Run All** — Pass Rate 확인

**JSON bundle 형식:**

```json
{
  "formatVersion": "1.0",
  "catalogVersion": "2026-06-30",
  "cases": [
    {
      "catalogId": "TC-STEP2-010",
      "name": "TC-STEP2-010 Legacy Master 01",
      "source": "SRC-LEGACY",
      "category": "CAT-STEP2",
      "version": "2026-06-30",
      "masterNo": "01",
      "masterValue": "0123456789",
      "expectedResult": "{\"step2\":\"01234\",\"step3\":\"56789\"}",
      "legacyEvidence": "OBS-20260630-01"
    }
  ]
}
```

**단순 배열** (`[{ name, inputData, expectedResult }]`)도 지원.

**CSV:** 헤더 `catalogId,name,version,source,category,masterNo,masterValue,step2,step3,statistics,...`  
또는 `expectedResult` 단일 컬럼.

**Catalog 내보내기:** Test Suite → **Catalog JSON/CSV 내보내기** → Git/백업 → TEST-CATALOG §5 표와 동기화.

**구현:** `src/shared/utils/verificationImport.ts` — 파싱, 중복 정책(`skip`|`update`), `_catalog` 메타 저장.

### 7.5 Experiment → Verification 승격 절차

| Step | Action |
|------|--------|
| 1 | Experiment Legacy Outputs 확정 |
| 2 | Inputs에서 `masterNo`, `masterValue` JSON 생성 |
| 3 | Legacy Outputs에서 검증 필드만 골라 expected JSON 생성 |
| 4 | Verification 저장 + TC ID를 TEST-CATALOG §5 표에 추가 |
| 5 | Test Suite **Run All** → FAIL이면 expected 오류 vs 엔진 오류 조사 |
| 6 | PASS 후 Hypothesis `verified: true` (선택) |

---

## 8. Phase D — Test Suite & CI 검증

### 8.1 실행 방법

| 방법 | 경로 |
|------|------|
| Built-in regression (10건) | Test Suite → **내장 회귀 테스트** |
| DB Verification 전체 | Test Suite → **Run All** |
| 헬스체크 | Settings → **헬스체크 실행** |
| CLI | `npm run test` |

### 8.2 Pass Rate 기준

| 범위 | Gate |
|------|------|
| Built-in fixture | ≥95% (CI) |
| Full legacy catalog (Phase 1 목표) | ≥95% |
| P0-13 릴리스 | ≥95% on **SRC-LEGACY** ≥100건 |

### 8.3 FAIL 시 대응

```
FAIL
 ├─ expected가 레거시와 다름? → Experiment·스크린샷 재확인 → expected 수정
 ├─ Code 테이블 불일치?       → Master/Code sync 후 재실행
 ├─ 엔진 버그?                → Issue (label: P1-legacy-verify) → 엔진 수정
 └─ Prediction/CV?            → STATUS §3: 미검증 유지 or legacy 케이스 추가
```

Test Suite 하단 **Failure diagnostics** 블록과 Export CSV/XLSX로 팀 공유.

---

## 9. Master 00~99 Sweep (Phase 1 목표)

### 9.1 배치 관측 순서

1. Master No `00` ~ `99` 순차 (또는 diff 많은 번호 우선)
2. 각 Master당 **대표 masterValue 1~3개** (짧은/긴/포맷)
3. Experiment 1개 = Master No 1개 baseline (최소 STEP2/3)

### 9.2 Catalog 등록표 (TEST-CATALOG §5.3)

| masterNo | TC ID | OBS ID | STEP2 | STEP3 | STAT | PRED | Status |
|----------|-------|--------|-------|-------|------|------|--------|
| 00 | TC-… | OBS-… | ✓ | ✓ | | | PASS |
| 01 | | | | | | | DRAFT |
| … | | | | | | | |

100행 채우기 전까지 P0-13 **미충족**으로 간주.

---

## 10. 증거 & 감사 추적

| 산출물 | 보관 위치 | 필수 |
|--------|-----------|------|
| 스크린샷 | Research Screenshots + 파일 시스템 | ✅ SRC-LEGACY |
| Experiment export | Research toolbar → JSON | 권장 |
| TEST-CATALOG 행 | `docs/TEST-CATALOG.md` | ✅ |
| GitHub Issue | Template: **Test Case** | FAIL 추적 시 |

Export JSON 백업 주기: **주 1회** 또는 대량 import 전후.

---

## 11. 금지 & 예외

### 11.1 절대 금지 (PRD §2.4, RESEARCH_WORKSPACE §9)

1. 레거시 소스 코드 참조
2. Verification expected를 Analysis 휴리스틱 출력으로 **대체**
3. FAIL 무시하고 Hypothesis `verified: true`
4. 스크린샷 없이 “대충 맞는 것 같음” PASS

### 11.2 허용되는 예외

| 상황 | 처리 |
|------|------|
| Our Program 아직 없음 | Legacy만 기록 → Verification은 legacy expected로 진행 |
| 레거시 Prediction 불명확 | `CAT-PRED` DRAFT, 릴리스에서 ⚠️ heuristic |
| 동일 TC 중복 import | name 중복 check; Test Suite sample load 참고 |

---

## 12. 빠른 참조 — 앱 메뉴

| 작업 | 메뉴 |
|------|------|
| Master/Code 준비 | MASTER, CODE |
| 실험 기록 | Research → Experiments / Inputs / Outputs |
| 자동 엔진 비교 | Research → Verification → 분석 엔진 실행 |
| 대량 테스트 | Research → Test Suite |
| 분석 실행 (우리 앱) | Analysis |
| 상태 확인 | Settings → 헬스체크 |

---

## 13. Definition of Done (관측 1건)

한 건의 레거시 관측이 **완료**되려면:

- [ ] OBS ID + 스크린샷
- [ ] Experiment (Inputs + Legacy Outputs) 저장
- [ ] Verification 등록 (TC ID 포함)
- [ ] TEST-CATALOG 표에 행 추가
- [ ] Test Suite Run → 해당 건 PASS (또는 FAIL 이슈 등록)

---

## 14. 다음 단계 (Phase 1-4 이후)

- 레거시 관측 데이터로 §5.3 skeleton expected 채우기 ([Phase 1-4](./DEFINITION_OF_DONE.md))
- CI regression gate on legacy catalog
- `RE-PLAYBOOK` → `RE-PLAYBOOK.en.md` (i18n, Phase 4)

---

## 부록 A — 샘플 Verification 1건 (복사용)

```json
{
  "name": "TC-STEP2-010 Legacy Master 01 digits 0-9",
  "inputData": "{\"masterNo\":\"01\",\"masterValue\":\"0123456789\"}",
  "expectedResult": "{\"step2\":\"01234\",\"step3\":\"56789\"}"
}
```

## 부록 B — 관련 파일 (코드)

| 용도 | 경로 |
|------|------|
| 내장 regression | `src/shared/fixtures/engine-regression-cases.json` |
| 샘플 import | `src/shared/fixtures/sample-verification-cases.json` |
| Catalog import 템플릿 | `src/shared/fixtures/legacy-verification-catalog.template.{json,csv}` |
| Master 00–99 skeleton | `src/shared/fixtures/legacy-master-skeleton-00-99.{json,csv}` |
| Skeleton builder | `src/shared/utils/legacyMasterCatalogSkeleton.ts` |
| Catalog import/export | `src/shared/utils/verificationImport.ts` |
| 엔진 검증 | `src/shared/utils/engineVerification.ts` |
| Suite runner | `src/shared/utils/verificationSuite.ts` |
| Research store | `src/features/research/stores/research-store.ts` |

---

*문서 변경 시 [STATUS.md](./STATUS.md) §7 Documentation Index를 함께 갱신한다.*
