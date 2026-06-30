# GitHub Releases 자동 업데이트 — 최초 설정 가이드

CS E-Bid Analyzer는 **GitHub Releases + electron-updater**로 Windows 설치본을 배포·업데이트합니다.

**저장소:** https://github.com/Hataewoo/e_bid_program

## 1. GitHub 저장소 만들기

1. [GitHub](https://github.com) — 계정 **Hataewoo** 로그인
2. **New repository** 생성
   - Repository name: **`e_bid_program`**
   - Public 또는 Private 모두 가능
3. 생성 후 URL: `https://github.com/Hataewoo/e_bid_program`

> 이미 `package.json`의 `build.publish`가 위 저장소로 설정되어 있습니다.

## 2. 로컬 프로젝트를 GitHub에 올리기

```powershell
cd C:\cs_e_bid_program

git init
git add .
git commit -m "Initial commit — CS E-Bid Analyzer v1.0.0"

git remote add origin https://github.com/Hataewoo/e_bid_program.git
git branch -M main
git push -u origin main
```

> `.env`, `node_modules`, `release/` 등은 `.gitignore`에 포함되어 있어야 합니다.

## 3. 첫 Release 배포 (자동)

버전을 올린 뒤 **태그를 push**하면 `.github/workflows/release.yml`이 실행됩니다.

```powershell
# package.json version을 1.0.0 → 1.0.1 등으로 수정 후
git add package.json CHANGELOG.md
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

성공 시 GitHub **Releases** 페이지에 `CS E-Bid Analyzer-Setup-1.0.1-x64.exe`가 올라갑니다.

**첫 배포(v1.0.0):**

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## 4. 로컬에서 직접 Release 올리기 (선택)

GitHub Actions 대신 개발 PC에서 올릴 때:

1. [Personal Access Token](https://github.com/settings/tokens) 생성 — scope: `repo` (private 저장소인 경우)
2. PowerShell:

```powershell
$env:GH_TOKEN = "ghp_xxxxxxxxxxxx"
npm run release:publish
```

## 5. 전용 PC에서 업데이트 받기

1. GitHub Releases에서 Setup 설치 (또는 USB로 Setup EXE 복사)
2. 전용 PC에 **인터넷** 연결
3. 앱 → **Settings** → **앱 업데이트 (GitHub Releases)** → **업데이트 확인**
4. 새 버전이 있으면 **다운로드** → **지금 설치 후 재시작**

## 6. 주의사항

| 항목 | 설명 |
|------|------|
| **코드 서명 없음** | SmartScreen 경고는 그대로일 수 있음 |
| **버전 규칙** | `package.json`의 `version`과 Git 태그 `v1.0.1`이 일치해야 함 |
| **개발 모드** | `npm run dev`에서는 업데이트 확인 비활성 |
| **수동 배포** | GitHub 없이 Setup EXE만 복사하는 방식도 계속 가능 |

## 7. 문제 해결

| 증상 | 확인 |
|------|------|
| 업데이트 확인 실패 | 전용 PC에서 `https://github.com` 접속 가능한지 |
| Release workflow 실패 | Actions 탭 로그 · 저장소 Settings → Actions 활성화 |
| 404 on update | Releases에 Setup EXE가 올라가 있는지 · 태그 `v*` 존재 여부 |
| push 거부 | GitHub 로그인 · 저장소 생성 여부 · remote URL |

---

관련 파일:

- `electron/updater/app-updater.ts` — autoUpdater
- `.github/workflows/release.yml` — 태그 Release CI
- `package.json` — `build.publish`, `release:publish` 스크립트
