# NSIS Install QA Checklist — CS E-Bid Analyzer v1.0.0

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.0.0 (Phase 3-5) |
| **기준일** | 2026-06-30 |
| **대상 빌드** | `npm run build:prod:nsis` |
| **설치 파일** | `release/CS E-Bid Analyzer-Setup-1.0.0-x64.exe` |
| **언팩 디렉터리** | `release/win-unpacked/` (스모크용, 설치 QA와 별도) |

> **목적:** Windows NSIS 설치본에 대한 수동 QA 절차.  
> 자동화된 E2E(`npm run test:e2e`)와 병행하되, **실제 설치·userData·바로가기**는 본 체크리스트로 검증한다.

---

## 0. 빌드 게이트 (자동 — CI/개발 PC)

`npm run build:prod:nsis` 실행 전/중에 아래가 통과해야 한다.

| # | 항목 | 명령 / 기준 | 2026-06-30 |
|---|------|-------------|------------|
| B1 | Lint + format | `npm run lint` · `npm run format:check` (`src` · `tests` · `electron`) | ✅ |
| B2 | Unit + integration | `npm run test` — **148** passed | ✅ |
| B3 | Regression gate | `npm run regression:gate` — **18/18 @ 100%** | ✅ |
| B4 | Production build | `tsc && vite build` | ✅ |
| B5 | Packaging prep | `npm run prepare:packaging` — Prisma engine + `prisma/dev.db` | ✅ |
| B6 | electron-builder | `electron-builder --win --x64` | ✅ |
| B7 | 산출물 존재 | `release/CS E-Bid Analyzer-Setup-1.0.0-x64.exe` | ✅ |
| B8 | Block map | `release/CS E-Bid Analyzer-Setup-1.0.0-x64.exe.blockmap` | ✅ |

**빌드 환경 (참고):** Windows 10.0.26200 · Node 20+ · electron-builder 26.15.3 · Electron 36.4.0

**권장 추가 (릴리스 전):** 깨끗한 Windows 10/11 x64 VM에서 B1–B7 재실행.

---

## 1. 사전 준비 (QA 담당자)

| # | 항목 | Pass | Fail | N/A | 메모 |
|---|------|:----:|:----:|:---:|------|
| P1 | Windows 10/11 x64 (권장: **클린 VM** 또는 테스트 전용 계정) | ☐ | ☐ | ☐ | |
| P2 | 이전 버전 **CS E-Bid Analyzer** 제거(재설치 시나리오) | ☐ | ☐ | ☐ | |
| P3 | `%APPDATA%\CS E-Bid Analyzer` 백업 또는 삭제(초기 설치 시나리오) | ☐ | ☐ | ☐ | userData |
| P4 | 샘플 import 파일 준비: `tests/e2e/fixtures/e2e-masters.csv` | ☐ | ☐ | ☐ | master 88 |
| P5 | 설치 파일 무결성 — 빌드 PC에서 생성한 Setup EXE 사용 | ☐ | ☐ | ☐ | |

---

## 2. 설치 (NSIS Wizard)

설치 파일: `release\CS E-Bid Analyzer-Setup-1.0.0-x64.exe`

| # | 단계 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| I1 | Setup 실행 | UAC/스마트스크린 후 설치 마법사 표시 (oneClick **아님**) | ☐ | ☐ | |
| I2 | 설치 경로 변경 | 디렉터리 선택 가능 | ☐ | ☐ | `allowToChangeInstallationDirectory` |
| I3 | 설치 완료 | 오류 없이 Finish | ☐ | ☐ | |
| I4 | 바탕화면 바로가기 | **CS E-Bid Analyzer** 생성 | ☐ | ☐ | |
| I5 | 시작 메뉴 바로가기 | 동일 이름으로 생성 | ☐ | ☐ | |
| I6 | 프로그램 추가/제거 | 목록에 **CS E-Bid Analyzer 1.0.0** 등록 | ☐ | ☐ | |

---

## 3. 최초 실행

| # | 항목 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| L1 | 바로가기로 실행 | 창 제목 **CS E-Bid Analyzer**, 크래시 없음 | ☐ | ☐ | |
| L2 | 툴바 DB 상태 | `DB: 연결됨 (N)` — N > 0 (시드 데이터) | ☐ | ☐ | |
| L3 | userData DB | `%APPDATA%\CS E-Bid Analyzer\database.db` 생성 | ☐ | ☐ | 최초 실행 시 템플릿 복사 |
| L4 | 로그 파일 | Settings → 로그 경로에 `logs\app.log` 표시 | ☐ | ☐ | |
| L5 | 프로그램 정보 | 툴바 **프로그램 정보** — 버전 **1.0.0** | ☐ | ☐ | |

---

## 4. 핵심 스모크 (Install → Import → Analyze → Export → Health)

E2E 스모크(`tests/e2e/smoke.e2e.test.ts`)와 동일 흐름.

### 4.1 Import

| # | 단계 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| S1 | **데이터 일괄 가져오기** 클릭 | 모달 표시 | ☐ | ☐ | |
| S2 | `e2e-masters.csv` 선택 | 파싱 완료, 미리보기 1건 (master **88**) | ☐ | ☐ | |
| S3 | **DB에 적용** | 모달 닫힘, 툴바 DB 카운트 증가 | ☐ | ☐ | |
| S4 | MASTER 화면 | master **88** 데이터 존재 (그리드 또는 선택) | ☐ | ☐ | |

### 4.2 Analyze

| # | 단계 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| S5 | 사이드바 **Analysis** | Analysis 화면 표시 | ☐ | ☐ | |
| S6 | **Load** | `Master N건 로드됨` 상태 | ☐ | ☐ | |
| S7 | **Analyze** | `분석 완료`, 상태바 **자릿수: N** (N > 0) | ☐ | ☐ | |

### 4.3 Export

| # | 단계 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| S8 | **Export** | `analysis-XX.json` 다운로드/저장 | ☐ | ☐ | |
| S9 | JSON 내용 | `totalCount` > 0, `masterNo` 일치 | ☐ | ☐ | |

### 4.4 Health check

| # | 단계 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| S10 | **Settings** → **헬스체크 실행** | **헬스체크 통과** 메시지 | ☐ | ☐ | |
| S11 | 상세 로그 | 내장 회귀 항목 OK 표시 | ☐ | ☐ | |

---

## 5. 부가 기능 (선택, P1)

| # | 항목 | 기대 결과 | Pass | Fail | N/A | 메모 |
|---|------|-----------|:----:|:----:|:---:|------|
| O1 | Settings **DB 백업** | `.db` 파일 저장 대화상자 | ☐ | ☐ | ☐ | |
| O2 | Settings **DB 복원** | 확인 후 DB 교체 | ☐ | ☐ | ☐ | |
| O3 | Master **CSV보내기** | 저장 대화상자 + 파일 생성 | ☐ | ☐ | ☐ | |
| O4 | Research **Test Suite** | 실행 후 결과 표시 | ☐ | ☐ | ☐ | |
| O5 | 테마 전환 | 다크/라이트 전환 | ☐ | ☐ | ☐ | |
| O6 | 단축키 | Ctrl+Shift+I import, F2/Ctrl+S Master | ☐ | ☐ | ☐ | |

---

## 6. 제거 · 재설치

| # | 단계 | 기대 결과 | Pass | Fail | 메모 |
|---|------|-----------|:----:|:----:|------|
| U1 | 프로그램 추가/제거 → 제거 | 오류 없이 완료 | ☐ | ☐ | |
| U2 | userData | 제거 후에도 `%APPDATA%\CS E-Bid Analyzer` **유지** (데이터 보존 정책 확인) | ☐ | ☐ | 의도된 동작인지 PO 확인 |
| U3 | 재설치 후 실행 | 이전 userData로 DB 연결 또는 빈 DB 정책 확인 | ☐ | ☐ | |
| U4 | 바로가기 | 재설치 후 바로가기 정상 | ☐ | ☐ | |

---

## 7. 알려진 제한 (실패 ≠ 버그일 수 있음)

| 항목 | 설명 |
|------|------|
| 코드 서명 | 현재 **기본 Electron 아이콘**, 상용 코드 서명 인증서 미적용 → SmartScreen 경고 가능 |
| Prediction / CodeValue | 레거시 미검증 — [STATUS.md](./STATUS.md) §4 |
| i18n | ~30% — 일부 UI 한국어 고정 |
| P0-13 | SRC-LEGACY 100건 검증 미충족 |

---

## 8. 결함 기록

| ID | 체크 # | 심각도 | 요약 | 재현 | 이슈 |
|----|--------|--------|------|------|------|
| | | P0/P1/P2 | | | |

---

## 9. 서명 (Sign-off)

| 역할 | 이름 | 날짜 | 결과 |
|------|------|------|------|
| QA | | | ☐ Pass · ☐ Fail · ☐ Pass with exceptions |
| Dev | | | |
| PO | | | |

**Pass 기준:** §4 필수 항목(S1–S11) **전부 Pass**, §2·§3 치명적 Fail 없음.

---

## 부록 A — 빠른 명령

```powershell
# 빌드 (개발 PC)
cd C:\cs_e_bid_program
npm run build:prod:nsis

# 산출물 확인
dir release\*.exe

# 패키징 준비만 검증
npm run build && npm run build:verify-packaging
```

## 부록 B — userData 경로

| OS | 경로 |
|----|------|
| Windows | `%APPDATA%\CS E-Bid Analyzer\` |
| DB | `%APPDATA%\CS E-Bid Analyzer\database.db` |
| Logs | `%APPDATA%\CS E-Bid Analyzer\logs\app.log` |

---

*관련: [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) Phase 3 · [CHANGELOG.md](../CHANGELOG.md) v1.0.0 draft*
