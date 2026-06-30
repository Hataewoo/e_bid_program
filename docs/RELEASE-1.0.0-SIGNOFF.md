# Release 1.0.0 Sign-off — CS E-Bid Analyzer

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.0.0 |
| **기준일** | 2026-06-30 |
| **대상 버전** | `1.0.0` (`package.json`) |
| **게이트 기준** | [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) §Release 1.0.0 Gate |

> 본 문서는 Release 1.0.0 Gate 항목별 자동화·문서·수동 QA 상태를 기록한다.  
> **코드로 해결 불가**한 항목은 명시적 **deferral(연기)** 로 1.0.0 출시를 차단하지 않는다.

---

## Gate checklist

| # | Gate item | Status | Evidence / notes |
|---|-----------|--------|------------------|
| G1 | Phase 1–3 automation complete | ✅ | Playbook, catalog import, regression gate, IPC, CI, NSIS build scripts — [STATUS.md](./STATUS.md) §2–3 |
| G2 | P0-13 legacy catalog (≥100 SRC-LEGACY verified) | 🔶 **Deferred → v1.1** | Pipeline ready; 100 DRAFT skeleton only (0/100 SRC-LEGACY). Requires legacy user JSON — cannot fabricate in repo |
| G3 | NSIS installer QA sign-off | 🔶 **Partial** | Automated: `build:prod:nsis` + `build:verify-packaging` ✅. **Manual:** [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) §1–4 (clean VM) — PO/QA sign-off pending |
| G4 | PO sign-off Prediction / CodeValue | 🔶 **Explicit deferral** | Phase 1-6/1-7 policy: heuristic Prediction + CodeValue **legacy-unverified** with UI banners. SRC-BUILTIN suites 12/12 @ 100% each |
| G5 | `CHANGELOG.md` published | ✅ | [CHANGELOG.md](../CHANGELOG.md) — v1.0.0 published 2026-06-30 |

---

## Phase 4 DoD closeout (Release 1.0 prerequisites)

| Item | Status | Notes |
|------|--------|-------|
| UI i18n ≥ 90% | ✅ | Admin import modals, Program Info, layout chrome, error/busy overlays wired to `messages.ts` (ko/en). Residual: locale name `"한국어"` in Settings, parser error lines from file content |
| P2-04 Menu Edit scope | ✅ **Decided** | **v1.0 scope = sidebar nav reorder only** (`Sidebar` DnD + reset). Full legacy MFC menu editor **deferred post-1.0** |

---

## Phase 5 closeout

All Phase 5 items ✅ — see [STATUS.md](./STATUS.md) v1.7.0 §Phase 5.

---

## Automated release gate (developer PC)

```text
npm run build:check   # lint + 148 tests + regression:gate + build
npm run format:check
npm run build:verify-packaging   # after build:prod:nsis
```

| Check | 2026-06-30 |
|-------|------------|
| `build:check` | ✅ |
| Tests | **148** (127 unit + 21 integration) |
| `regression:gate` | 18/18 @ 100% |
| `catalog:diagnose` | 43/43 @ 100% (current DB) |
| CI (7 gates) | lint · format:check · unit · integration · regression · build · e2e |

---

## Explicit deferrals (accepted for 1.0.0)

1. **P0-13** — Legacy TestCase catalog verification until legacy export data is provided.
2. **Prediction** — Heuristic; not legacy-verified (banner + policy in STATUS §2).
3. **CodeValue stats** — Implemented; legacy unverified (SRC-BUILTIN @ 100%).
4. **NSIS manual install QA** — Setup EXE builds; human QA on clean Windows VM.
5. **Menu Edit (L02)** — Sidebar reorder only; full editor deferred.
6. **macOS / Linux** — Not supported.

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering | — | 2026-06-30 | Automation gates green |
| Product Owner | _pending_ | — | Prediction/CodeValue deferral acknowledged |
| QA (NSIS) | _pending_ | — | [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) |

---

*Next review: v1.1 planning — P0-13 legacy import, NSIS QA completion, PO formal sign-off.*
