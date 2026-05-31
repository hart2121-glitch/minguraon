# 협업 가이드

둘이 같은 리포에서 작업하므로, 충돌을 줄이기 위해 **기능별 브랜치 + PR** 흐름을 따른다.

## 핵심 규칙

1. **`main`에 직접 push 금지.** 모든 변경은 브랜치에서 PR로 머지한다.
2. **작업 시작 전 항상 최신화:**
   ```powershell
   git checkout main
   git pull origin main
   ```
3. **브랜치는 작게, 자주 머지한다.** 오래 묵힐수록 충돌이 커진다.
4. **한 브랜치 = 한 가지 일.** 기능과 무관한 변경을 섞지 않는다.

## 브랜치 네이밍

| 접두어 | 용도 | 예시 |
|--------|------|------|
| `feat/` | 새 기능 | `feat/spirit-gauge`, `feat/episode-2` |
| `fix/` | 버그 수정 | `fix/single-submit-skip` |
| `chore/` | 빌드·설정·문서 등 | `chore/deploy-config` |
| `refactor/` | 동작 변화 없는 구조 개선 | `refactor/scene-adapter` |

## 작업 흐름

```powershell
# 1. 최신 main에서 브랜치 생성
git checkout main
git pull origin main
git checkout -b feat/내-기능

# 2. 작업 + 커밋 (작은 단위로 자주)
git add -A
git commit -m "..."

# 3. 푸시
git push -u origin feat/내-기능

# 4. GitHub에서 Pull Request 생성 → 리뷰 → main으로 머지
#    (https://github.com/gyuch-an02/ryeongan 에서 "Compare & pull request")

# 5. 머지 후 로컬 정리
git checkout main
git pull origin main
git branch -d feat/내-기능
```

## 커밋 전 체크

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm run typecheck                  # 타입 체크
npm run build                      # 프로덕션 빌드 통과 확인
npx tsx scripts/smoke.ts           # 2인 플레이 종단 테스트 (서버 실행 중일 때)
```

## main 보호 (권장 설정)

리포 **Settings → Branches → Add branch ruleset**에서 `main`에 대해:
- **Require a pull request before merging** — main 직접 push 차단
- (선택) **Require status checks to pass** — CI 추가 시

이렇게 하면 실수로 main에 직접 push하는 일을 막을 수 있다.
