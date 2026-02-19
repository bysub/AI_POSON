# Design: 키오스크 가상키보드

## 컴포넌트 구조

```
KioskLayout.vue
  ├── <RouterView />
  └── <VirtualKeyboard />   ← 전역 배치 (1회)

composables/useVirtualKeyboard.ts  ← 싱글톤 상태 + 한글 조합 로직
components/kiosk/VirtualKeyboard.vue  ← 키보드 UI
```

## 핵심 설계

### 1. 포커스 기반 자동 호출

- document-level `focusin` 이벤트 리스닝
- 대상: `<input>` (checkbox, radio, hidden 제외)
- `data-keyboard` 속성으로 세밀 제어:
  - `none`: 비활성화
  - `number`: 숫자 키보드 강제
  - `full`: 풀 키보드 강제
- 미지정 시 input type으로 자동 판별: `tel`/`number` → 숫자, 나머지 → 풀

### 2. 키보드 레이아웃

**숫자 키보드**: 3x4 그리드 (1-9, ⌫, 0, 확인)
**풀 키보드**: 4행 (한글 3벌식/영문 QWERTY + 기능키)

### 3. 한글 조합 엔진 (HangulComposer)

**상태 머신**: EMPTY → CHO → CHO_JUNG → CHO_JUNG_JONG

| 현재 상태     | 입력            | 동작                     |
| ------------- | --------------- | ------------------------ |
| EMPTY         | 자음            | → CHO (초성 표시)        |
| EMPTY         | 모음            | → 모음 직접 출력         |
| CHO           | 모음            | → CHO_JUNG (조합 음절)   |
| CHO           | 자음            | → 이전 초성 확정, 새 CHO |
| CHO_JUNG      | 자음(종성 가능) | → CHO_JUNG_JONG          |
| CHO_JUNG      | 자음(ㄸㅃㅉ)    | → 음절 확정, 새 CHO      |
| CHO_JUNG      | 모음(복합 가능) | → 복합 중성 (ㅘ,ㅙ 등)   |
| CHO_JUNG_JONG | 자음(복합 가능) | → 복합 종성 (ㄳ,ㄵ 등)   |
| CHO_JUNG_JONG | 자음(복합 불가) | → 음절 확정, 새 CHO      |
| CHO_JUNG_JONG | 모음            | → 종성 분리, 새 CHO_JUNG |

### 4. v-model 연동

```
input.value = baseText + composingChar
→ dispatchEvent(new Event('input', { bubbles: true }))
→ Vue v-model 자동 반영
```

키보드 버튼에 `@mousedown.prevent` → input 포커스 유지

### 5. 영향 범위

| 파일                                   | 변경                               |
| -------------------------------------- | ---------------------------------- |
| `composables/useVirtualKeyboard.ts`    | **신규** - 싱글톤 상태 + 한글 조합 |
| `components/kiosk/VirtualKeyboard.vue` | **신규** - 키보드 UI               |
| `layouts/KioskLayout.vue`              | **수정** - VirtualKeyboard 추가    |
