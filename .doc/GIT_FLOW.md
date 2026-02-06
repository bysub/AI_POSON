# Git Flow 브랜치 전략

## 브랜치 구조

```
main                    # 프로덕션 릴리스
├── develop             # 개발 통합 브랜치
│   ├── feature/*       # 기능 개발
│   └── bugfix/*        # 버그 수정
├── release/*           # 릴리스 준비
└── hotfix/*            # 긴급 수정
```

## 브랜치 명명 규칙

| 브랜치 타입 | 패턴                        | 예시                             |
| ----------- | --------------------------- | -------------------------------- |
| Feature     | `feature/{이슈번호}-{설명}` | `feature/42-payment-integration` |
| Bugfix      | `bugfix/{이슈번호}-{설명}`  | `bugfix/55-cart-total-error`     |
| Release     | `release/v{버전}`           | `release/v1.0.0`                 |
| Hotfix      | `hotfix/{이슈번호}-{설명}`  | `hotfix/60-payment-timeout`      |

## 워크플로우

### 1. Feature 개발

```bash
# develop에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/42-payment-integration

# 개발 후 커밋
git add .
git commit -m "feat(payment): VAN 결제 연동 구현"

# develop으로 PR 생성
git push -u origin feature/42-payment-integration
# GitHub에서 PR 생성 → 코드 리뷰 → Squash Merge
```

### 2. Release 준비

```bash
# develop에서 release 브랜치 생성
git checkout develop
git checkout -b release/v1.0.0

# 버전 업데이트, 버그 수정 등
git commit -m "chore: bump version to 1.0.0"

# main으로 머지 후 태그
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

# develop으로 백머지
git checkout develop
git merge release/v1.0.0
git push origin develop
```

### 3. Hotfix

```bash
# main에서 hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/60-payment-timeout

# 수정 후 커밋
git commit -m "fix(payment): 결제 타임아웃 오류 수정"

# main으로 머지 후 태그
git checkout main
git merge hotfix/60-payment-timeout
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin main --tags

# develop으로 백머지
git checkout develop
git merge hotfix/60-payment-timeout
git push origin develop
```

## 커밋 메시지 규칙 (Conventional Commits)

### 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Type

| Type       | 설명                         |
| ---------- | ---------------------------- |
| `feat`     | 새로운 기능 추가             |
| `fix`      | 버그 수정                    |
| `docs`     | 문서 변경                    |
| `style`    | 코드 포맷팅 (기능 변경 없음) |
| `refactor` | 리팩토링                     |
| `perf`     | 성능 개선                    |
| `test`     | 테스트 추가/수정             |
| `build`    | 빌드 시스템 변경             |
| `ci`       | CI 설정 변경                 |
| `chore`    | 기타 변경                    |
| `revert`   | 커밋 되돌리기                |

### Scope

| Scope      | 설명            |
| ---------- | --------------- |
| `frontend` | 프론트엔드 전체 |
| `backend`  | 백엔드 전체     |
| `electron` | Electron 관련   |
| `payment`  | 결제 모듈       |
| `auth`     | 인증/인가       |
| `api`      | API 관련        |
| `db`       | 데이터베이스    |
| `ui`       | UI 컴포넌트     |
| `i18n`     | 다국어          |
| `test`     | 테스트          |
| `ci`       | CI/CD           |
| `deps`     | 의존성          |
| `config`   | 설정            |

### 예시

```bash
# 기능 추가
feat(payment): 카드 결제 VAN 연동 구현

# 버그 수정
fix(cart): 장바구니 합계 계산 오류 수정

# 리팩토링
refactor(auth): JWT 토큰 갱신 로직 개선

# 성능 개선
perf(db): 상품 조회 쿼리 인덱스 최적화

# Breaking Change
feat(api)!: 주문 API 응답 형식 변경

BREAKING CHANGE: 주문 응답의 items 필드가 orderItems로 변경됨
```

## PR 규칙

1. **PR 제목**: 커밋 메시지 규칙과 동일
2. **리뷰어**: 최소 1명 필수
3. **CI 통과**: 모든 체크 통과 필수
4. **Squash Merge**: feature/bugfix 브랜치는 Squash Merge

## 보호된 브랜치

| 브랜치    | 직접 푸시 | PR 필수 | 리뷰 필수 | CI 통과 |
| --------- | --------- | ------- | --------- | ------- |
| `main`    | ❌        | ✅      | ✅        | ✅      |
| `develop` | ❌        | ✅      | ✅        | ✅      |
