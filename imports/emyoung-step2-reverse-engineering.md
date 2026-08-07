# E-Myoung.exe STEP2 「내용」 역추적 노트 (2026-08-07)

## 대상 파일

- `c:\Users\USER\Desktop\이명전기\E-Myoung.exe` (671 KB, .NET/VB.NET, v1.1.34 계열)
- Master 00 정답: `src/shared/fixtures/legacy-code-content-expected.ts`

## exe에서 확인된 핵심 함수 (문자열 추출)

| 함수명 | 추정 역할 |
|--------|-----------|
| `load_grid_Code_Low_RS` | STEP2 Code 그리드 로드 (DB `em_Code`) |
| `SearchValue_Result_STEP2_Low` | **STEP2 Low 「내용」 계산 진입점** |
| `SearchValue_Result_STEP2_High` | STEP3 High 동일 |
| `SearchValue_Result_Between` | 마커 사이 count 배열 (`countBetweenMarkerRule` 대응) |
| `SearchValue_Result_Between_Five` / `_Six` | High(5~9)용 Between 변형 |
| `SearchValue_Result_Duplicat` | 연속 run 길이 (`collectValueRunLengths` / 1중복) |
| `SearchValue_Result_Duplicat_Array` | Duplicat 결과 배열 |
| `SearchValue_Result_LH` | Low/High 교차 |
| `SearchValue_Result_DetailGrid` | 세부구간 그리드 |
| `SearchValue_Result_DetailGrid_OverNumber` | DetailGrid + 임계값 |
| `Select_Array_Value` / `array_nValue` | 결과 int 배열 → 콤마 문자열 |
| `loadRs_CodeValue` | Code Value RS 로드 |

UI 그리드: `grid_Code_Low_Low`, `grid_Code_Low_High` (저점의 저점 / 저점의 고점 분리)

## 가설 A — 패턴 매칭 + gap (기존)

- S′ 토큰 세부구간(description) 겹침 매칭 + run gap
- **234만** 매칭 횟수(61) 일치, gap 값 **37/60**
- **기각 방향**: 단독으로는 13코드 불가

## 가설 B — SearchValue_Result_Between (신규, exe 이름 대응)

**「내용」= Point Values S′의 `sourceDigit` 열(또는 세부구간 PV)에 Code Values Between 규칙 적용 결과**

### 배열 **길이**가 legacy gap 개수와 일치하는 조합

| 코드 | need | stream / rule |
|------|------|----------------|
| **234** | 60 | `srcDigit` / `commaAlpha_2_3` |
| **24** | 52 | `srcDigit` or `lowHigh` / `alphaPlus_4_3` |
| **34** | 52 | 동左 |
| **43** | 52 | 동左 |
| **23** | 40 | `lowHigh` / `plusAlpha_3_2` |

### 값 일치 (최선)

| 코드 | 일치 |
|------|------|
| 234 | **45/60** (`srcDigit/commaAlpha_2_3`) |
| 43 | 36/52 |
| 24 | 29/52 |
| 34 | 27/52 |
| 10 | 22/49 (len only: `lowLow/oneDuplicate`) |

→ **길이는 맞지만 값 100% 일치 0코드**. 규칙 파라미터·스트림·코드별 분기가 추가로 있음.

### 234 srcDigit Between brute-force

- `markerMin=3, markerMax=4, countExact=2, pairsOnly=true` → **45/60** (기존 `commaAlpha_2_3`과 동일)
- marker/count 0~4 전 탐색으로 **60/60 달성 규칙 없음**

## 다음 단계

1. **ILSpy/dnSpy로 `SearchValue_Result_STEP2_Low` 디컴파일** (코드 분기·코드별 rule 매핑 확인)
2. `SearchValue_Result_Duplicat_Array` 와 Between **조합** 시험
3. `DetailGrid_OverNumber` — code digit → rule row index 매핑 가설
4. 코드별 레시피 확정 후 `legacyCodeContentEngine.ts`에 코드별 dispatch 구현

## 테스트 파일 (역추적용)

- `tests/shared/utils/legacyBetweenSrcDigit.test.ts`
- `tests/shared/utils/legacyPatternLengthProbe.test.ts`
- `tests/shared/utils/legacyPatternContentProbe.test.ts`
