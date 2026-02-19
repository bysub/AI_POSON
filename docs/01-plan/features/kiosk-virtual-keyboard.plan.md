# Plan: 키오스크 가상키보드 (Virtual Keyboard)

## 개요

키오스크 터치스크린 환경에서는 물리 키보드가 없으므로, `<input>` 포커스 시 자동으로 가상키보드를 표시한다.
글로벌 컴포넌트로 구현하여 모든 키오스크 뷰에서 일관된 입력 경험을 제공한다.

## 현재 동작 (AS-IS)

### 키오스크 input 사용 현황

| 뷰/컴포넌트             | input type | v-model            | 용도                | 비고         |
| ----------------------- | ---------- | ------------------ | ------------------- | ------------ |
| PointSelectView.vue:225 | `tel`      | `phoneInput`       | 휴대폰 번호 조회    | maxlength=11 |
| PointSelectView.vue:237 | `text`     | `memberName`       | 회원명 입력         | maxlength=20 |
| CashPayment.vue:205     | `tel`      | `cashReceiptPhone` | 현금영수증 전화번호 | 조건부 표시  |

### 기존 커스텀 입력 (가상키보드 불필요)

| 컴포넌트        | 방식               | 사용처                                                  |
| --------------- | ------------------ | ------------------------------------------------------- |
| NumberPad.vue   | 버튼 기반 숫자패드 | PointSelectView(전화번호), OrderConfirmView(테이블번호) |
| CashPayment.vue | 내장 숫자버튼      | 현금 금액 입력 (0-9, 00, 정확한 금액)                   |

### 문제점

- `PointSelectView`의 회원등록 모드에서 `<input type="tel">`, `<input type="text">`는 **직접 입력 방식**
- 터치스크린 전용 키오스크에는 물리 키보드가 없어 입력 불가
- OS 가상키보드(Windows On-Screen Keyboard)는 UX가 부적합하고 제어가 어려움
- `CashPayment`의 현금영수증 전화번호도 동일 문제

## 변경 목표 (TO-BE)

### 핵심 요구사항

1. **자동 호출**: 키오스크 뷰의 `<input>` 포커스 시 가상키보드 자동 표시
2. **자동 숨김**: 확인/취소 버튼, 또는 input 외부 클릭 시 키보드 숨김
3. **키보드 타입 자동 선택**: input type에 따라 적절한 레이아웃 표시
   - `type="tel"` / `type="number"` → 숫자 키보드
   - `type="text"` / `type="search"` → 한/영 풀 키보드
4. **키오스크 전용**: 관리자 페이지에서는 동작하지 않음 (물리 키보드 사용)

### 키보드 레이아웃

#### 숫자 키보드 (Number Pad)

```
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │
├─────┼─────┼─────┤
│  7  │  8  │  9  │
├─────┼─────┼─────┤
│ ←삭제│  0  │  확인 │
└─────┴─────┴─────┘
```

#### 한/영 풀 키보드

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ ㅂ│ ㅈ│ ㄷ│ ㄱ│ ㅅ│ ㅛ│ ㅕ│ ㅑ│ ㅐ│ ㅔ│
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ㅁ│ ㄴ│ ㅇ│ ㄹ│ ㅎ│ ㅗ│ ㅓ│ ㅏ│ ㅣ│   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│⇧  │ ㅋ│ ㅌ│ ㅊ│ ㅍ│ ㅠ│ ㅜ│ ㅡ│   │←삭제│
├───┴───┼───┴───┴───┴───┴───┼───┴───┼───┤
│한/영  │      스페이스       │  확인  │   │
└───────┴───────────────────┴───────┴───┘
```

- Shift(⇧): 쌍자음/이중모음 (ㅃㅉㄸㄲㅆ / ㅒㅖ)
- 한/영 토글: 한글 ↔ 영문 QWERTY 전환

### 구현 방식: Composable + Global Component

```
VirtualKeyboard.vue (전역 컴포넌트)
  ├── NumericKeyboard.vue (숫자 전용)
  └── FullKeyboard.vue (한/영 풀 키보드)

useVirtualKeyboard.ts (Composable)
  ├── focusin 이벤트 감지 → 키보드 표시
  ├── input type 판별 → 레이아웃 선택
  └── 키 입력 → 대상 input에 값 주입
```

**동작 흐름:**

1. `KioskLayout.vue`에 `<VirtualKeyboard />` 한 번만 배치
2. Composable이 document-level `focusin` 이벤트 리스닝
3. 포커스된 요소가 `<input>` (checkbox, radio 제외)이면 키보드 표시
4. 키보드 키 입력 → 현재 포커스된 input의 `value` 업데이트 + `input` 이벤트 dispatch (v-model 연동)
5. 확인/Enter → 키보드 숨김 + input blur
6. 관리자 레이아웃에서는 Composable 미사용

### data-keyboard 속성으로 세밀 제어

```html
<!-- 가상키보드 비활성화 (NumberPad 등 자체 입력 UI가 있는 경우) -->
<input data-keyboard="none" />

<!-- 키보드 타입 강제 지정 -->
<input data-keyboard="number" />
<input data-keyboard="full" />
```

## 영향 범위

### 신규 생성 파일

| 파일                                   | 설명                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `components/kiosk/VirtualKeyboard.vue` | 전역 가상키보드 컴포넌트 (NumericKeyboard + FullKeyboard 통합) |
| `composables/useVirtualKeyboard.ts`    | 포커스 감지 + 키보드 제어 로직                                 |

### 수정 파일

| 파일                                 | 변경 내용                                                  |
| ------------------------------------ | ---------------------------------------------------------- |
| `views/kiosk/KioskLayout.vue`        | `<VirtualKeyboard />` 컴포넌트 추가                        |
| `views/kiosk/PointSelectView.vue`    | 기존 input에 `data-keyboard` 속성 추가 (필요 시)           |
| `components/payment/CashPayment.vue` | 현금영수증 input에 `data-keyboard="number"` 추가 (필요 시) |

### 수정 불필요

- **백엔드**: 변경 없음
- **DB 스키마**: 변경 없음
- **관리자 뷰**: 영향 없음
- **NumberPad.vue**: 기존 컴포넌트 그대로 유지 (가상키보드와 독립)
- **기존 NumberPad 사용처**: `data-keyboard="none"` 불필요 (NumberPad는 `<input>` 아닌 버튼 기반)

## 구현 순서

1. `useVirtualKeyboard.ts` Composable 생성 — focusin 감지, 키보드 상태 관리, 키 입력 처리
2. `VirtualKeyboard.vue` 컴포넌트 생성 — 숫자/풀 키보드 UI 렌더링, 한/영 전환, Shift 처리
3. `KioskLayout.vue`에 가상키보드 컴포넌트 배치 + Composable 연결
4. PointSelectView / CashPayment의 기존 input과 연동 테스트
5. `data-keyboard` 속성 기반 예외 처리 (필요 시)

## 기술 고려사항

### 한글 조합 처리

- 브라우저 기본 IME를 사용하지 않으므로 **직접 한글 조합 로직 필요**
- 초성+중성+종성 조합 테이블 활용 (예: ㄱ+ㅏ→가, 가+ㄴ→간)
- 또는 경량 한글 조합 라이브러리 활용 검토

### v-model 연동

- 가상키보드에서 input value 변경 시 `InputEvent`를 dispatch해야 Vue의 v-model이 반응
- `el.value = newValue` 후 `el.dispatchEvent(new Event('input', { bubbles: true }))` 패턴

### 키보드 위치

- 화면 하단 고정 (키오스크 21인치 세로형 디스플레이 기준)
- 키보드가 input을 가리지 않도록 input 영역 자동 스크롤

### 성능

- document-level 이벤트 리스너 1개 (focusin)로 모든 input 감지
- 컴포넌트 lazy mount (키보드 비표시 시 DOM 미생성)

## 예상 작업량

- 신규 파일 2개 생성 (컴포넌트 + Composable)
- 기존 파일 1~3개 소규모 수정
- 한글 조합 로직이 핵심 복잡도 (약 200~300줄)
- 중규모 기능 (약 500~700줄 추가)
