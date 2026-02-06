# 폼(.frm) 파일 분석

## 1. 폼 파일 통계

- **총 폼 수**: 152개
- **총 라인 수**: ~269,000줄
- **평균 폼 크기**: ~1,770줄

## 2. 폼 카테고리 분류

### 2.1 판매/메인 (Sales) - 15개

| 폼 파일                 | 크기                    | 역할                  |
| ----------------------- | ----------------------- | --------------------- |
| **Frm_SaleMain.frm**    | 1.6MB (1,681,290 bytes) | 메인 판매 화면 (핵심) |
| Frm_SaleList.frm        | 318KB                   | 판매 내역 조회        |
| Frm_SaleFinish.frm      | 218KB                   | 판매 완료/마감        |
| Frm_ProductSale.frm     | 39KB                    | 상품 판매 입력        |
| Frm_ProductReturn.frm   | 224KB                   | 반품/환불 처리        |
| Frm_ProductPrice.frm    | 26KB                    | 상품 가격 조회        |
| Frm_ProductUpdate.frm   | 101KB                   | 상품 정보 수정        |
| Frm_ProductSel.frm      | 34KB                    | 상품 선택             |
| Frm_ProductZero.frm     | 13KB                    | 재고 0 상품           |
| Frm_ProductKey.frm      | 8KB                     | 상품 단축키           |
| Frm_SaleMenu.frm        | 14KB                    | 판매 메뉴             |
| Frm_SaleUserSelect.frm  | 9KB                     | 판매자 선택           |
| Frm_SaleList_Search.frm | 45KB                    | 판매 검색             |
| Frm_SaleDD.frm          | 47KB                    | 배달 판매             |
| frm_SalePrint.frm       | 4KB                     | 판매 출력             |

### 2.2 셀프 키오스크 (Self Kiosk) - 25개

| 폼 파일                 | 크기  | 역할               |
| ----------------------- | ----- | ------------------ |
| **Frm_SelfKiosk.frm**   | 174KB | 키오스크 메인 화면 |
| Frm_SelfCash.frm        | 120KB | 현금 결제          |
| frm_SelfOpGoods.frm     | 126KB | 옵션 상품 선택     |
| frm_SelfGoods.frm       | 61KB  | 상품 목록          |
| frm_SelfKey.frm         | 51KB  | 키패드 입력        |
| Frm_SelfKey2.frm        | 91KB  | 키패드 입력 v2     |
| frm_SelfCusAdd.frm      | 73KB  | 고객 등록          |
| frm_SelfCusInfo.frm     | 16KB  | 고객 정보          |
| Frm_SelfOrderList.frm   | 13KB  | 주문 목록          |
| frm_SelfOrder.frm       | 16KB  | 주문 처리          |
| frm_SelfTable.frm       | 8KB   | 테이블 선택        |
| frm_SelfPrint.frm       | 9KB   | 출력               |
| Frm_SelfGoodsSearch.frm | 14KB  | 상품 검색          |
| frm_SelfKeyName.frm     | 13KB  | 이름 입력          |
| frm_SelfCashManage.frm  | 40KB  | 현금 관리          |
| frm_SelfCard.frm        | 2KB   | 카드 결제          |
| frm_SelfCancel.frm      | 4KB   | 취소 처리          |
| frm_SelfAddCus.frm      | 1KB   | 고객 추가          |
| Frm_SelfAlarm.frm       | 12KB  | 알람               |
| frm_SelfAlarm2.frm      | 4KB   | 알람 v2            |
| frmSelf_TabMenu.frm     | 30KB  | 탭 메뉴            |
| Frm_SelfAdmin.frm       | 2KB   | 관리자 모드        |
| Frm_SelfEnd.frm         | 1KB   | 종료               |
| Frm_SelfSMS.frm         | 30KB  | SMS 발송           |
| Frm_SelfSMSAdmin.frm    | 21KB  | SMS 관리자         |

### 2.3 결제 처리 (Payment) - 35개

#### 카드 결제 (VAN별)

| 폼 파일                     | VAN사    | 크기  |
| --------------------------- | -------- | ----- |
| Frm_SaleCard.frm            | 기본     | 23KB  |
| Frm_SaleCard_VCAT_NICE.frm  | NICE     | 86KB  |
| Frm_SaleCard_VCAT_KSNET.frm | KSNET    | 87KB  |
| Frm_SaleCard_VCAT_KICC.frm  | KICC     | 88KB  |
| Frm_SaleCard_VCAT_KIS.frm   | KIS      | 98KB  |
| Frm_SaleCard_VCAT_SMT.frm   | SMARTRO  | 104KB |
| Frm_SaleCard_VCAT_FDIK.frm  | FDIK     | 88KB  |
| Frm_SaleCard_VCAT_JTNET.frm | JTNET    | 89KB  |
| Frm_SaleCard_VCAT_KCP.frm   | KCP      | 85KB  |
| Frm_SaleCard_VCAT_KOCES.frm | KOCES    | 87KB  |
| Frm_SaleCard_VCAT_KOVAN.frm | KOVAN    | 89KB  |
| Frm_SaleCard_VCAT_SPC.frm   | SPC      | 81KB  |
| Frm_SaleCardOffline.frm     | 오프라인 | 20KB  |

#### 세금계산서 (VAN별)

| 폼 파일                | VAN사   | 크기  |
| ---------------------- | ------- | ----- |
| Frm_Tax.frm            | 기본    | 262KB |
| Frm_TAX_VCAT_NICE.frm  | NICE    | 82KB  |
| Frm_TAX_VCAT_KSNET.frm | KSNET   | 62KB  |
| Frm_TAX_VCAT_KICC.frm  | KICC    | 81KB  |
| Frm_TAX_VCAT_KIS.frm   | KIS     | 73KB  |
| Frm_TAX_VCAT_SMT.frm   | SMARTRO | 69KB  |
| Frm_TAX_VCAT_FDIK.frm  | FDIK    | 65KB  |
| Frm_TAX_VCAT_JTNET.frm | JTNET   | 69KB  |
| Frm_TAX_VCAT_KCP.frm   | KCP     | 64KB  |
| Frm_TAX_VCAT_KOCES.frm | KOCES   | 65KB  |
| Frm_TAX_VCAT_KOVAN.frm | KOVAN   | 61KB  |
| Frm_TAX_VCAT_SPC.frm   | SPC     | 59KB  |

#### 기타 결제

| 폼 파일                  | 역할                |
| ------------------------ | ------------------- |
| Frm_Card_Money.frm       | 카드/현금 복합 결제 |
| Frm_CardSel.frm          | 카드 선택           |
| Frm_CardONOFF.frm        | 카드 온/오프라인    |
| Frm_Card_Dec.frm         | 카드 승인 취소      |
| frm_halbu.frm            | 할부 선택           |
| Frm_CashBag.frm          | 캐시백 (379KB)      |
| Frm_CashBagInput.frm     | 캐시백 입력         |
| Frm_CashBag_VCAT_SMT.frm | SMT 캐시백          |

### 2.4 회원 관리 (Membership) - 12개

| 폼 파일                 | 크기  | 역할           |
| ----------------------- | ----- | -------------- |
| Frm_Member.frm          | 27KB  | 회원 조회      |
| Frm_MemberADD.frm       | 68KB  | 회원 등록      |
| Frm_MEMBER_SALELIST.frm | 33KB  | 회원 판매 내역 |
| Frm_MemInput.frm        | 61KB  | 회원 입력      |
| Frm_MemTSearch.frm      | 123KB | 회원 검색      |
| Frm_CustomerList.frm    | 25KB  | 고객 목록      |
| Frm_rPoint.frm          | 9KB   | 포인트 조회    |
| Frm_rPoint_Return.frm   | 8KB   | 포인트 반환    |
| Frm_Misu.frm            | 8KB   | 미수금 관리    |
| Frm_Gift.frm            | 19KB  | 상품권         |
| Frm_GiftTicket.frm      | 17KB  | 상품권 발행    |
| Frm_Lucky.frm           | 5KB   | 경품 추첨      |

### 2.5 상품/재고 관리 (Inventory) - 20개

| 폼 파일                      | 크기  | 역할             |
| ---------------------------- | ----- | ---------------- |
| **Frm_PurchaseManage.frm**   | 492KB | 매입 관리 (핵심) |
| Frm_PurchaseList.frm         | 108KB | 매입 목록        |
| Frm_PurchaseExcelCall.frm    | 74KB  | 매입 Excel 호출  |
| Frm_Purchase_New_Product.frm | 13KB  | 신규 상품 매입   |
| Frm_GoodsList.frm            | 49KB  | 상품 목록        |
| frmGoodsList.frm             | 54KB  | 상품 목록 v2     |
| frmGoodsManage.frm           | 99KB  | 상품 관리        |
| Frm_GOODS_MESSAGE_SEL.frm    | 12KB  | 상품 메시지      |
| Frm_GroupList.frm            | 34KB  | 분류 목록        |
| Frm_InOutput.frm             | 25KB  | 입출고           |
| Frm_In_History.frm           | 17KB  | 입고 이력        |
| Frm_StockList.frm            | 230KB | 재고 목록        |
| Frm_StockUse.frm             | 56KB  | 재고 사용        |
| Frm_PriceTag.frm             | 66KB  | 가격표           |
| Frm_ScalePrice.frm           | 16KB  | 저울 가격        |
| frm_Scale.frm                | 152KB | 저울 연동        |
| Frm_BranchCode.frm           | 52KB  | 분류 코드        |
| Frm_BranchSearch.frm         | 39KB  | 분류 검색        |
| frmOfficeList.frm            | 23KB  | 거래처 목록      |
| frmOfficeManage.frm          | 49KB  | 거래처 관리      |

### 2.6 정산/보고서 (Settlement) - 8개

| 폼 파일                  | 크기  | 역할      |
| ------------------------ | ----- | --------- |
| Frm_SettlementManage.frm | 135KB | 정산 관리 |
| Frm_Trans.frm            | 210KB | 거래 내역 |
| Frm_TransPrint.frm       | 30KB  | 거래 출력 |
| Frm_TransOrder.frm       | 31KB  | 주문 거래 |
| Frm_TransPDA.frm         | 25KB  | PDA 거래  |
| Frm_TransSale.frm        | 6KB   | 판매 거래 |
| Frm_TranCall.frm         | 19KB  | 거래 호출 |
| Frm_TranCancel.frm       | 39KB  | 거래 취소 |

### 2.7 시스템/설정 (System) - 15개

| 폼 파일                | 크기  | 역할             |
| ---------------------- | ----- | ---------------- |
| Frm_Login.frm          | 103KB | 로그인           |
| Frm_Password.frm       | 14KB  | 비밀번호         |
| Frm_UserChange.frm     | 153KB | 사용자 변경      |
| Frm_DownLoad.frm       | 182KB | 데이터 다운로드  |
| Frm_Remote.frm         | 11KB  | 원격 제어        |
| Frm_LockInfo.frm       | 31KB  | 잠금 정보        |
| Frm_Dual.frm           | 60KB  | 듀얼 모니터      |
| Frm_Calendar.frm       | 36KB  | 달력             |
| Frm_Calendar_popup.frm | 13KB  | 달력 팝업        |
| Frm_Message.frm        | 19KB  | 메시지           |
| Frm_Comm_Msgbox.frm    | 5KB   | 공통 메시지박스  |
| Frm_GridColHidden.frm  | 13KB  | 그리드 컬럼 숨김 |
| Frm_Bill_Edit.frm      | 8KB   | 영수증 편집      |
| Frm_Pname2ND.frm       | 5KB   | 품명 2차         |
| Frm_AppCard.frm        | 5KB   | 앱 카드          |

### 2.8 외부 연동 (Integration) - 10개

| 폼 파일                  | 크기  | 역할            |
| ------------------------ | ----- | --------------- |
| Frm_BaedalList.frm       | 25KB  | 배달 목록       |
| Frm_eCouponUse.frm       | 116KB | e-쿠폰 사용     |
| Frm_cSMS_Tran.frm        | 25KB  | SMS 전송        |
| Frm_LMSList.frm          | 14KB  | LMS 목록        |
| Frm_KTFC_Tax.frm         | 18KB  | 금융결제원 세금 |
| Frm_TaxInput.frm         | 57KB  | 세금 입력       |
| Frm_TaxCancel_Select.frm | 3KB   | 세금 취소 선택  |
| Frm_VCAT_SuPyo_Check.frm | 134KB | 수표 조회       |
| Frm_Respite.frm          | 69KB  | 외상 관리       |
| Frm_Respite_POS.frm      | 6KB   | POS 외상        |

## 3. 핵심 폼 상세 분석

### 3.1 Frm_SaleMain.frm - 메인 판매 화면

```
크기: 1.6MB (1,681,290 bytes)
.frx 바이너리: 2.5MB

주요 컨트롤:
- VSFlexGrid (VSGrid_Sale): 판매 상품 그리드
- MSComm (1, HandScan, MSR): 시리얼 통신
- Timer (여러 개): 자동 기능
- Windows Media Player: 광고 재생

주요 이벤트:
- Form_Load(): 초기화
- VSGrid_Sale_Click(): 상품 선택
- MSComm1_OnComm(): 스캐너 입력
- Timer1_Timer(): 시간 체크
- 키보드 단축키 (F1~F12)

핵심 기능:
- 상품 바코드 스캔
- 가격/수량 입력
- 결제 진행
- 영수증 출력
- 회원 조회/적용
```

### 3.2 Frm_SelfKiosk.frm - 셀프 키오스크

```
크기: 174KB (173,815 bytes)
.frx 바이너리: 730KB (이미지 포함)

UI 구조:
┌─────────────────────────────────────┐
│         시작 화면 (imgStartPage)      │
├─────────────────────────────────────┤
│  카테고리 탭 (FrmTab)                 │
├─────────────────────────────────────┤
│                                     │
│    상품 그리드 (이미지 + 가격)        │
│                                     │
├─────────────────────────────────────┤
│  하단 버튼 (주문/취소/결제)           │
└─────────────────────────────────────┘

주요 컨트롤:
- MyLabel (HoonControl): 커스텀 라벨
- PictureBox: 상품 이미지
- Frame: 레이아웃 컨테이너
- Label: 가격/수량 표시

이벤트 흐름:
1. 시작 화면 터치
2. 카테고리 선택
3. 상품 선택
4. 옵션 선택 (옵션 있는 경우)
5. 수량 입력
6. 결제 진행
7. 완료 화면
```

### 3.3 Frm*SaleCard_VCAT*\*.frm - VAN 결제 폼

```
공통 구조 (12개 VAN 동일):
- 약 85~100KB
- 카드번호 입력
- 할부 선택
- 서명 패드 연동
- 승인 요청/응답 처리

VAN별 차이점:
- DLL/OCX 호출 방식
- 전문 포맷
- 서명 데이터 처리
- 에러 코드 해석

리팩토링 필요:
- 공통 로직 추출 → BasePaymentForm
- Strategy Pattern 적용
- 전문 포맷터 분리
```

## 4. UI 컴포넌트 라이브러리

| 컴포넌트        | OCX 파일            | 용도               |
| --------------- | ------------------- | ------------------ |
| VSFlexGrid      | vsflex8l.ocx        | 데이터 그리드      |
| MyLabel         | HoonControl.ocx     | 커스텀 라벨        |
| ImageList       | MSCOMCTL.OCX        | 이미지 목록        |
| ListView        | MSCOMCTL.OCX        | 리스트뷰           |
| TreeView        | MSCOMCTL.OCX        | 트리뷰             |
| TabStrip        | TABCTL32.OCX        | 탭 컨트롤          |
| SSTab           | TABCTL32.OCX        | 탭 컨트롤          |
| MSComm          | MSCOMM32.OCX        | 시리얼 통신        |
| Winsock         | MSWINSCK.OCX        | 네트워크 통신      |
| CommonDialog    | COMDLG32.OCX        | 파일/색상 대화상자 |
| MonthView       | MSCOMCT2.OCX        | 달력               |
| DTPicker        | MSCOMCT2.OCX        | 날짜 선택          |
| MCI             | MCI32.OCX           | 미디어 재생        |
| Inet            | MSINET.OCX          | 인터넷 통신        |
| Gif89           | Gif89.dll           | GIF 이미지         |
| NanumiImagePlus | NanumiImagePlus.dll | 이미지 처리        |

## 5. 폼 간 호출 관계

```
Frm_Login
    │
    ├── Frm_SaleMain (메인)
    │       │
    │       ├── Frm_Member (회원)
    │       ├── Frm_ProductSel (상품선택)
    │       ├── Frm_SaleCard_VCAT_* (카드결제)
    │       ├── Frm_Tax (현금영수증)
    │       ├── Frm_CashBag (캐시백)
    │       ├── Frm_ProductReturn (반품)
    │       ├── Frm_SaleList (판매내역)
    │       └── Frm_SaleFinish (마감)
    │
    └── Frm_SelfKiosk (키오스크)
            │
            ├── frm_SelfGoods (상품)
            ├── frm_SelfOpGoods (옵션)
            ├── Frm_SelfCash (현금)
            ├── frm_SelfCard (카드)
            └── Frm_SelfOrderList (주문목록)
```

## 6. 마이그레이션 시 고려사항

### 6.1 대형 폼 분할

- **Frm_SaleMain.frm (1.6MB)**: 5~10개 컴포넌트로 분할
  - SaleHeader.vue (상단 정보)
  - ProductGrid.vue (상품 그리드)
  - PaymentPanel.vue (결제 패널)
  - MemberPanel.vue (회원 정보)
  - ActionButtons.vue (기능 버튼)

### 6.2 VAN 결제 폼 통합

- 12개 → 1개 PaymentModal.vue
- VAN별 로직 → Strategy Pattern
- 공통 UI + VAN별 어댑터

### 6.3 키오스크 폼 재설계

- 터치 최적화 UI
- 반응형 그리드
- 애니메이션/트랜지션
- 다국어 지원

### 6.4 컴포넌트 매핑

| VB6 컴포넌트 | Vue 3 대체                   |
| ------------ | ---------------------------- |
| VSFlexGrid   | AG Grid Community            |
| MSComm       | SerialPort (Node.js)         |
| Timer        | setInterval / Vue Composable |
| PictureBox   | img 태그                     |
| MyLabel      | 커스텀 Label 컴포넌트        |
| SSTab        | Tailwind Tabs                |
| CommonDialog | HTML5 File Input             |
