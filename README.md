# CS E-Bid Analyzer

Windows용 전자입찰 분석 데스크톱 앱 (Electron + React + TypeScript). 레거시 MFC 프로그램 **전자입찰 누적카운트** 기능을 현대 스택으로 재구현합니다.

**Release 1.0.0** (2026-06-30) — NSIS 설치 패키지, Phase 1–5 closeout. 구현·검증 현황은 [STATUS.md](docs/STATUS.md), 게이트 감사는 [RELEASE-1.0.0-SIGNOFF.md](docs/RELEASE-1.0.0-SIGNOFF.md)를 참고하세요.

## 요구 사항

- Node.js 20+
- Windows 10/11 (x64)

## 빠른 시작

```bash
npm install
npm run dev          # Vite + Electron 개발 모드
npm run build:check  # lint + test + regression:gate + build
```

## 주요 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run test` | Vitest 전체 (**148** — unit **127** + integration **21**) |
| `npm run test:unit` | 유닛 테스트만 |
| `npm run test:integration` | IPC + SQLite + Research migration 통합 테스트 |
| `npm run test:e2e` | Playwright + Electron 스모크 (build 포함) |
| `npm run regression:gate` | 내장 회귀 게이트 (≥95%) |
| `npm run catalog:diagnose` | Verification DB + CV + Prediction 통합 진단 |
| `npm run test:coverage` | 커버리지 + threshold |
| `npm run build:check` | lint + test + regression:gate + build |
| `npm run build:prod:nsis` | Windows NSIS 설치 프로그램 빌드 |
| `npm run build:verify-packaging` | 패키징 준비 상태 확인 |
| `npm run format:check` | Prettier (`src` · `tests` · `electron`) |

**CI (GitHub Actions):** `push`/`pull_request` → lint · **format:check** · unit · integration · `regression:gate` · build · E2E (`windows-latest`). See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## 기능 개요

- **Master / Code** — CRUD, CSV·Excel·TXT 일괄 가져오기/보내기, 툴바 bulk import
- **Analysis** — STEP2/3 (Main IPC), 통계, 예측(휴리스틱), 배치 분석, 이력·Raw JSON
- **Code Value** — 페이지별 코드카운트 분석 (legacy-unverified 배너)
- **Statistics** — Frequency, Low/High, Distribution + 차트
- **Research** — 실험·가설·검증·Test Suite, Dashboard, catalog import
- **Settings** — DB 백업/복원, 헬스체크, auto-refresh, Web Worker, 패키징 확인
- **Menu Edit (P2-04)** — 사이드바 메뉴 순서 변경 (v1.0 범위)

## 문서

| 문서 | 설명 |
|------|------|
| [STATUS.md](docs/STATUS.md) | **구현·검증 현황 (기준 문서)** — v1.7.0 |
| [PRD.md](docs/PRD.md) | 제품 요구사항 — v1.0.0 |
| [TEST-CATALOG.md](docs/TEST-CATALOG.md) | TestCase 분류·목록·게이트 — v1.2.0 |
| [DEFINITION_OF_DONE.md](docs/DEFINITION_OF_DONE.md) | Phase별 완료 기준 · Release 1.0 Gate |
| [CHANGELOG.md](CHANGELOG.md) | 릴리스 노트 — **v1.0.0** |
| [RELEASE-1.0.0-SIGNOFF.md](docs/RELEASE-1.0.0-SIGNOFF.md) | Release 1.0 게이트 감사·deferral |
| [INSTALL-QA-CHECKLIST.md](docs/INSTALL-QA-CHECKLIST.md) | NSIS 설치 QA 체크리스트 |
| [RESEARCH_WORKSPACE.md](docs/RESEARCH_WORKSPACE.md) | Research 워크스페이스 정책 |
| [RE-PLAYBOOK.md](docs/RE-PLAYBOOK.md) | 레거시 관측 → Verification 등록 절차 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처 (Main/Renderer, IPC, engines) |
| [API.md](docs/API.md) | IPC API 레퍼런스 (51 invoke + 2 events) |
| [CS-E-Bid-Analyzer-사용법-v1.0.0.docx](docs/CS-E-Bid-Analyzer-사용법-v1.0.0.docx) | **상세 사용 설명서 (Word)** |

## 알려진 제한 (v1.0.0)

> 상세: [STATUS.md](docs/STATUS.md) §9 · [RELEASE-1.0.0-SIGNOFF.md](docs/RELEASE-1.0.0-SIGNOFF.md)

- **P0-13** — SRC-LEGACY verified catalog **0/100** (v1.1 deferral; DRAFT skeleton만 존재)
- **Prediction / CodeValue** — 구현됨; 레거시 1:1 미검증 (UI 배너 + SRC-BUILTIN @ 100%)
- **NSIS** — Setup EXE 빌드 ✅; clean VM **수동 install QA** 미서명
- **E2E** — 5 smoke tests (`npm run test:e2e`); `build:check`에는 미포함
- **Menu Edit** — 사이드바 reorder만; 전체 레거시 에디터 deferred
- **macOS / Linux** — 미지원

## 라이선스

Copyright © 2026 CS E-Bid Team
