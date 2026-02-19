# ASIS 매입~판매 비즈니스 플로우 분석

> **분석 기준**: VB6 레거시 소스 (POSON_POS, POSON_POS_SELF21, POSON_Common)
> **분석일**: 2026-02-19
> **참조 포맷**: migration-plan-v2.md UC-001 Main Flow

---

## 1. 전체 비즈니스 사이클 개요

```
[매입] → [상품등록] → [판매] → [결제] → [정산/마감]
  │          │           │         │          │
  ▼          ▼           ▼         ▼          ▼
거래처     Goods       POS/KIOSK  VAN 12사   일계/Z리포트
입고DB     마스터       SaD/SaT   카드/현금   DF 테이블
InD/InT    테이블      테이블     현금영수증  이월재고
```

### 핵심 DB 테이블 (월별 동적 생성)

| 테이블            | 용도                  | 명명 규칙              |
| ----------------- | --------------------- | ---------------------- |
| `SaT_{YYYYMM}`    | 판매 총계 (전표 단위) | Sale_Num(PK), 40+ 컬럼 |
| `SaD_{YYYYMM}`    | 판매 상세 (상품 단위) | Sale_Num+Sale_Seq(PK)  |
| `InT_{YYYYMM}`    | 입고 총계             | In_Date 기준 집계      |
| `InD_{YYYYMM}`    | 입고 상세             | Barcode+In_Date+In_Seq |
| `LastSt_{YYYYMM}` | 이월재고              | BarCode(PK), Real_Sto  |
| `DF_{YYYYMM}`     | 일계 (일일 정산)      | Sale_Date(PK)          |
| `StSetD_{YYYYMM}` | 재고조정              | Barcode, StSet_Count   |

### 마스터 테이블 (상시)

| 테이블          | 용도           | PK                  |
| --------------- | -------------- | ------------------- |
| `Goods`         | 상품 마스터    | BarCode             |
| `Office_Manage` | 거래처         | Office_Code         |
| `Bundle`        | 묶음/세트 상품 | P_Barcode+C_Barcode |
| `Stock_Discard` | 폐기 재고      | Barcode+SD_DATE     |
| `SdD_Total`     | 반품 상세      | Barcode+Ds_Date     |
| `HOT_KEY`       | 상품 단축키    | H_Code+H_INDEX      |

---

## 2. POS 모드 (C_Config.Self_YN = "0")

### UC-P01: 매입 (Purchase/Receiving)

| 항목              | 내용                                                        |
| ----------------- | ----------------------------------------------------------- |
| **Actor**         | 관리자 (Admin_Gubun = "1")                                  |
| **Precondition**  | POS 로그인 완료, 거래처 등록 완료                           |
| **Postcondition** | 입고 데이터 저장, 재고 자동 증가                            |
| **관련 폼**       | Frm_PurchaseManage, Frm_PurchaseList, Frm_PurchaseExcelCall |

**Main Flow:**

1. 관리자가 매입 관리 화면(Frm_PurchaseManage)을 연다
2. 거래처를 선택한다 (`Office_Manage` 테이블 조회)
3. 매입일자, 매입유형(정상/반품/누락/재고조정)을 선택한다
4. 상품을 바코드 스캔 또는 검색으로 추가한다 (`Goods` 테이블 조회)
5. 각 상품의 매입단가(Pur_Pri)와 수량(In_Count)을 입력한다
6. 시스템이 입고금액을 계산한다: `In_Pri = Pur_Pri × In_Count`
7. (박스 상품인 경우) BOX_USE='1'이면 OBTAIN 수량을 자동 적용한다
8. 관리자가 매입을 확정한다
9. 시스템이 `InD_{YYYYMM}` (입고 상세)에 INSERT한다
10. 시스템이 `InT_{YYYYMM}` (입고 총계)를 UPDATE한다
11. 시스템이 `LastSt_{YYYYMM}` (이월재고)의 Real_Sto를 증가시킨다
12. (선택) 매입 영수증을 출력한다 (Mdl_Printer)

**Alternative Flow:**

| 단계 | 조건                  | 대체 흐름                                      |
| ---- | --------------------- | ---------------------------------------------- |
| 4a   | 엑셀 대량 매입        | Frm_PurchaseExcelCall로 일괄 입력              |
| 5a   | 기존 상품이 아닌 경우 | Frm_Purchase_New_Product에서 신규 등록 후 매입 |
| 8a   | 매입 취소             | 재고 감소 (decrement), InD 삭제                |

**이월재고 계산 공식:**

```
Real_Sto = 전월이월
         - 판매수량(SaD_Count)
         - 반품수량(SdD_Count)
         + 입고수량(InD_Count)
         + 재고조정(StSet_Count)
         - 폐기수량(SD_COUNT)
         - 박스판매(BP_SaD_Count)
         + 박스입고(BP_InD_Count)
```

---

### UC-P02: 상품 등록/관리

| 항목              | 내용                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| **Actor**         | 관리자                                                               |
| **Precondition**  | POS 로그인 완료                                                      |
| **Postcondition** | Goods 마스터 테이블에 상품 등록                                      |
| **관련 폼**       | Frm_ProductUpdate, Frm_ProductSale, Frm_ProductPrice, Frm_ProductKey |

**Main Flow:**

1. 관리자가 상품 등록 화면(Frm_ProductUpdate)을 연다
2. 바코드, 상품명, 대/중/소 분류코드를 입력한다
3. 매입단가(PUR_PRI)와 판매가(SELL_PRI)를 설정한다
4. 거래처 코드(Bus_Code)를 할당한다
5. (선택) 박스/팩 상품이면 BOX_USE='1', BARCODE1(박스 바코드), OBTAIN(수량) 설정
6. (선택) 묶음상품이면 Bundle 테이블에 자식 상품 등록
7. 시스템이 `Goods` 테이블에 INSERT한다
8. (선택) 판매 화면 단축키를 HOT_KEY 테이블에 등록한다

---

### UC-P03: POS 판매

| 항목              | 내용                                     |
| ----------------- | ---------------------------------------- |
| **Actor**         | 판매원 (캐셔)                            |
| **Precondition**  | POS 개점 완료 (OpenNum 발급)             |
| **Postcondition** | 판매 데이터 저장, 재고 차감, 영수증 출력 |
| **관련 폼**       | Frm_SaleMain (~16,000줄), Frm_SaleFinish |

**Main Flow:**

1. 판매원이 POS 판매 화면(Frm_SaleMain)에 진입한다
2. 시스템이 영업일(Openday)을 결정한다 (새벽 4시 기준으로 전일/당일 구분)
3. 시스템이 월별 동적 테이블 존재를 확인하고 없으면 자동 생성한다
4. 시스템이 하드웨어를 초기화한다 (CDP 표시기, 스캐너, MSR 리더기)
5. 판매원이 상품 바코드를 스캔한다 (또는 핫키/검색으로 선택)
6. 시스템이 `Goods` 테이블에서 상품 정보를 조회한다
7. 시스템이 판매 그리드에 상품을 추가한다 (바코드, 상품명, 단가, 수량)
8. (박스 상품) BOX_USE='1'이면 수량을 OBTAIN 기준으로 자동 계산한다
9. (반복) 5~8단계를 추가 상품에 대해 반복한다
10. (선택) 회원 카드/휴대폰으로 회원 할인을 적용한다 (`MEM_SalePrice()`)
11. (선택) 금액 할인 또는 비율 할인을 적용한다
12. 시스템이 총금액을 계산한다: `소계 - 할인 + 봉사료(CMS)`
13. 판매원이 결제 수단을 선택한다 (현금/카드/포인트/상품권)
14. 결제를 처리한다 → **UC-P04 참조**
15. 시스템이 `SaT_{YYYYMM}` (판매 총계)에 INSERT한다
16. 시스템이 `SaD_{YYYYMM}` (판매 상세)에 각 상품별로 INSERT한다
17. 시스템이 `LastSt_{YYYYMM}`의 Real_Sto를 차감한다
18. 시스템이 영수증을 출력한다 (Mdl_Printer)
19. (현금 결제 시) 서랍이 자동 개방된다 (`Product_CashOpen=1`)

**Alternative Flow:**

| 단계 | 조건                              | 대체 흐름                             |
| ---- | --------------------------------- | ------------------------------------- |
| 5a   | 저울 상품 (SellPos_Weight_YN='1') | 저울에서 중량 수신, 수량 = 중량(100g) |
| 9a   | 상품 반품 (Sale_Count < 0)        | 음수 입력 → `SdD_{YYYYMM}` 반품 기록  |
| 13a  | DB 연결 실패                      | Access MDB로 자동 전환, Tran_Log 기록 |

**판매 전표번호(Sale_Num) 생성 규칙:**

```
Sale_Num = POS번호(2자리) + 년월일(8자리) + 시분초(6자리) + 순번(5자리)
예: "01202501151430200001" (17~21자리)
```

---

### UC-P04: 결제 처리

| 항목              | 내용                                              |
| ----------------- | ------------------------------------------------- |
| **Actor**         | 판매원 / 시스템                                   |
| **Precondition**  | 판매 상품 확정, 총금액 계산 완료                  |
| **Postcondition** | 결제 승인, 거래 로그 저장                         |
| **관련 폼**       | Frm*SaleCard_VCAT*\*.frm (12개 VAN), Frm_SaleCash |

**Main Flow (카드 결제):**

1. 시스템이 설정된 VAN사를 확인한다 (VAN_SELECT)
2. 해당 VAN 결제 폼을 로드한다 (예: Frm_SaleCard_VCAT_NICE)
3. 고객이 카드를 리딩한다 (MSR 스와이프 / IC칩 삽입 / 수기 입력)
4. 시스템이 할부 개월을 선택한다 ('00'=일시불 ~ '12')
5. 시스템이 승인 요청 전문을 생성한다
   - 단말기번호(TID), 거래일련번호, POS 식별자
   - 카드 정보(Track2), 입력방식(스와이프/IC/키인)
   - 거래금액(총액/봉사료/부가세)
6. (5만원 이상) 서명패드에서 전자서명을 획득한다
7. VAN DLL을 호출하여 VAN 서버로 전송한다 (`Pos_Send()` 등)
8. 카드사로부터 승인/거절 응답을 수신한다
9. 승인 성공 시 승인번호, 카드사명, 매입사명을 저장한다
10. `CARD_TRAN` 테이블에 거래 로그를 INSERT한다
11. `SaT_{YYYYMM}.Card_Pri`를 UPDATE한다
12. 카드 영수증을 출력한다

**Main Flow (현금 결제):**

1. 판매원이 받은 금액을 입력한다
2. 시스템이 거스름돈을 계산한다
3. `SaT_{YYYYMM}.Cash_Pri`를 UPDATE한다
4. (선택) 현금영수증을 발급한다
   - 식별번호 입력 (휴대폰/사업자번호)
   - 거래유형 선택 (소득공제/지출증빙)
   - VAN 전송 → 국세청 연동 → 승인번호 수신
5. 현금 서랍을 개방한다 (`usb_io_output()`)

**지원 VAN 12사:**

| VAN     | DLL                    | 특이사항              |
| ------- | ---------------------- | --------------------- |
| NICE    | NicePosV205.dll        | SSL 통신              |
| KSNET   | KSNet_ADSL.dll         | TCP/IP                |
| KICC    | Kicc.dll + KiccDSC.ocx | OCX 컨트롤            |
| KIS     | KisCatSSL.dll          | BC 로열티             |
| SMARTRO | SmartroSign.dll        | NFC, T-money, CashBee |
| FDIK    | fdikpos43.dll          | 현금영수증 특화       |
| JTNET   | NCPOS.dll              | 서명패드              |
| KCP     | KCPOCX.ocx             | OCX                   |
| KOCES   | API 방식               | -                     |
| KOVAN   | kovan_signpad.ocx      | 서명패드 OCX          |
| SPC     | SPCNSecuCAT.ocx        | OCX                   |
| StarVAN | StarVAN.ocx            | OCX                   |

---

### UC-P05: 정산/마감

| 항목              | 내용                                      |
| ----------------- | ----------------------------------------- |
| **Actor**         | 관리자                                    |
| **Precondition**  | 당일 영업 완료                            |
| **Postcondition** | 일계 생성, Z리포트 출력, 마감 플래그 설정 |
| **관련 폼**       | Frm_SettlementManage, Frm_SaleList        |

**Main Flow:**

1. 관리자가 정산 화면(Frm_SettlementManage)을 연다
2. 시스템이 `SaT_{YYYYMM}`에서 당일 판매를 집계한다
   - 총 판매액, 할인액, 결제수단별 금액 (현금/카드/포인트)
3. 시스템이 `InT_{YYYYMM}`에서 당일 매입을 집계한다
   - 과세 매입액, 면세 매입액, 총 매입액
4. 시스템이 마진을 계산한다
   - `TProfit_Pri = 총판매액 - 총매입액`
   - `TProfit_Rate = (TProfit_Pri / 총판매액) × 100`
5. 시스템이 `DF_{YYYYMM}` (일계 테이블)에 정산 데이터를 INSERT한다
6. 시스템이 거래처별 정산을 수행한다 (`OFFICE_Settlement`)
7. 시스템이 마감 플래그를 설정한다
   - `SaT_{YYYYMM}.Close_YN = '1'`
   - `SaD_{YYYYMM}.Close_YN = '1'`
   - `InT_{YYYYMM}.Close_YN = '1'`
8. 시스템이 Z리포트를 출력한다 (Mdl_Printer)
   - 상품별/분류별/거래처별 판매 내역
   - 결제수단별 집계
   - 반품/폐기 집계
   - 마진 분석
9. 시스템이 다음 영업일 준비를 완료한다 (새 OpenNum 발급)

---

## 3. KIOSK 모드 (C_Config.Self_YN = "1")

### UC-K01: 키오스크 주문

| 항목              | 내용                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Actor**         | 고객                                                                                                                                |
| **Precondition**  | 키오스크 대기 화면 표시                                                                                                             |
| **Postcondition** | 주문 완료, 결제 처리, 주방 전송                                                                                                     |
| **관련 폼**       | Frm_SelfKiosk (~4,700줄), frm_SelfGoods, frm_SelfOpGoods, Frm_SelfOrderList, Frm_SelfCash, frm_SelfCard, frm_SelfPrint, Frm_SelfEnd |

**Main Flow:**

1. 고객이 대기 화면(imgStartPage)을 터치한다
   - `Frm_SelfKiosk.Form_Load()` → `initAll()` → `initTab()` + `InitGoods()`
   - 해상도: 1080×1920 (세로형 터치 모니터)

2. 시스템이 카테고리 탭을 표시한다 (최대 4개 + 좌우 스크롤)
   - `labSelfTab(0~3)`: 카테고리명 (예: 커피, 음료, 디저트)
   - DB: `SELECT * FROM Goods WHERE L_Code = '{탭코드}' ORDER BY Index_Num`

3. 고객이 카테고리를 선택한다
   - `labSelfTab_Click(Index)` → `ShowSelfDetail(SQL)`
   - 해당 카테고리의 상품 12개를 그리드에 표시

4. 고객이 상품을 선택한다 (`Image1_Click(Index)`)
   - 상품 이미지 터치 → `addGoods(Index)` 호출
   - 품절 상품: `imgSoldOut(i).Visible = True`, 선택 불가

5. (옵션 상품인 경우) 옵션 선택 모달이 표시된다
   - `frm_SelfGoods.Show vbModal` 또는 `frm_SelfOpGoods.Show vbModal`
   - 사이즈(S/M/L), 토핑, 샷 추가 등 선택
   - 옵션 데이터: `OrderKiosk.sOPBarcods`에 저장

6. 시스템이 상품을 장바구니(fg21List)에 추가한다
   - VSFlexGrid 20컬럼: 바코드, 상품명, 단가, [-] 수량 [+], 합계, [×], 옵션
   - `subTotalSum()` → 총 수량/총 금액 업데이트

7. (반복) 고객이 추가 상품을 선택한다 (2~6단계 반복)
   - 페이지 네비게이션: `imgLeft`/`imgRight` (이전/다음 12개)
   - 탭 스크롤: `imgleftTab`/`imgRightTab`

8. 고객이 장바구니에서 수량을 조정한다
   - `fg21List_Click()` → Col 5([-] 감소), Col 8([+] 증가), Col 12([×] 삭제)
   - 수량 변경 시 합계 자동 재계산

9. 고객이 "결제하기" 버튼(img결제)을 터치한다
   - `Frm_SelfOrderList.Show vbModal` → 주문 최종 확인 화면

10. 고객이 결제 수단을 선택한다 (카드/현금)

11. (카드 결제) 시스템이 VAN 결제를 처리한다
    - `frm_SelfCard.Show vbModal` → VAN DLL 호출
    - 카드 리딩 → 승인 요청 → 승인 수신
    - 결제 프로세스는 POS와 동일 (UC-P04 참조)

12. (현금 결제) 고객이 현금을 투입한다
    - `Frm_SelfCash.Show vbModal`
    - 투입 금액 입력 → 거스름돈 계산 → 반환

13. 시스템이 판매 데이터를 DB에 저장한다
    - `SaT_{YYYYMM}`, `SaD_{YYYYMM}` INSERT
    - `LastSt_{YYYYMM}` 재고 차감

14. 시스템이 영수증을 출력한다 (Mdl_Printer)

15. 시스템이 주문을 주방으로 전송한다 (네트워크/DB 폴링)

16. 완료 화면(frm_SelfPrint)이 표시된다
    - 완료 애니메이션 GIF + 음성 안내
    - "승인완료되었습니다.wav" / "현금완료되었습니다.wav"

17. 30초 카운트다운 후 대기 화면으로 자동 복귀한다
    - `Frm_SelfEnd.Show` → `Frm_SelfKiosk.initmain()` (장바구니 초기화)

**Alternative Flow:**

| 단계 | 조건                 | 대체 흐름                                            |
| ---- | -------------------- | ---------------------------------------------------- |
| 4a   | 상품이 품절인 경우   | `imgSoldOut` 오버레이 표시, 선택 불가                |
| 5a   | 옵션이 없는 상품     | 옵션 모달 건너뛰고 바로 장바구니 추가                |
| 10a  | 바코드 스캔          | `txt_Input_KeyDown` → `addBarcode()` 호출            |
| 11a  | VAN 타임아웃         | 자동 재시도, 실패 시 에러 메시지                     |
| 11b  | 카드 잔액 부족       | "잔액 부족" 메시지, 결제 수단 재선택                 |
| 12a  | 네트워크 장애 (현금) | Access MDB 오프라인 모드, 동기화 대기열              |
| 12b  | 네트워크 장애 (카드) | "카드 결제 불가" 메시지, 현금 결제 안내              |
| 1a   | 관리자 진입          | `lab관리자화면_DblClick` → 비밀번호 입력 → 관리 패널 |

---

### KIOSK 관리자 모드 (pic관리자)

**진입**: 관리자 영역 더블클릭 → 비밀번호 입력

**기능 목록:**

| 버튼            | 기능                    |
| --------------- | ----------------------- |
| lab상품선택     | 상품 클릭하여 선택/편집 |
| labGoodsAdd     | 신규 상품 추가          |
| labSlefPrice    | 가격표 출력             |
| labSaleMenu     | POS 판매 메뉴           |
| lab주문상품     | 상품 등록 관리          |
| lab주문분류     | 탭 메뉴 설정            |
| lab주문취소     | 주문 취소 처리          |
| lab원격지원     | 원격 지원 연결          |
| lab판매내역     | 판매 내역 조회          |
| lab현금반환     | 현금 반환 처리          |
| lab프로그램닫기 | 프로그램 종료           |

---

## 4. POS vs KIOSK 비교

| 항목          | POS (Self_YN=0)           | KIOSK (Self_YN=1)           |
| ------------- | ------------------------- | --------------------------- |
| **Actor**     | 판매원 (캐셔)             | 고객 (셀프)                 |
| **메인 폼**   | Frm_SaleMain (~16,000줄)  | Frm_SelfKiosk (~4,700줄)    |
| **상품 선택** | 바코드 스캔 + 핫키 + 검색 | 터치 그리드 (12개/페이지)   |
| **카테고리**  | 대/중/소 분류 트리        | 탭 4개 + 좌우 스크롤        |
| **옵션**      | 수동 입력                 | 모달 UI (frm_SelfGoods)     |
| **할인**      | 관리자 수동/회원 자동     | 사전 설정된 가격만          |
| **결제**      | 현금+카드+포인트+상품권   | 카드+현금                   |
| **영수증**    | 필수 출력                 | 자동 출력                   |
| **서랍**      | 현금 결제 시 자동 개방    | 해당 없음                   |
| **매입**      | Frm_PurchaseManage        | 불가 (POS에서만)            |
| **정산**      | Frm_SettlementManage      | 불가 (POS에서만)            |
| **해상도**    | 1024×768 (가로)           | 1080×1920 (세로)            |
| **대기화면**  | 없음 (항상 판매 화면)     | imgStartPage (터치 대기)    |
| **자동 복귀** | 없음                      | 30초 카운트다운 후 대기화면 |
| **주방 전송** | 수동/자동                 | 자동                        |
| **관리자**    | 메뉴 기반 전체 접근       | 더블클릭 → 제한된 관리      |
| **하드웨어**  | CDP+스캐너+MSR+저울+서랍  | 터치모니터+카드리더         |

---

## 5. 데이터 흐름도

### 매입 → 재고 → 판매 데이터 흐름

```
[거래처]                    [상품 마스터]
Office_Manage               Goods
    │                         │
    ▼                         ▼
[매입 입고]              [이월재고]
InD_{YYYYMM}  ─────→    LastSt_{YYYYMM}
InT_{YYYYMM}              │  Real_Sto ↑ (입고 시 증가)
                           │  Real_Sto ↓ (판매 시 감소)
                           │  Real_Sto ↓ (폐기/반품 시 감소)
                           │
    ┌──────────────────────┘
    ▼
[판매]                   [결제]
SaD_{YYYYMM}  ────→     CARD_TRAN (카드)
SaT_{YYYYMM}             TAX (현금영수증)
    │                     CashBag (포인트)
    │
    ▼
[정산/마감]
DF_{YYYYMM}
    │
    ▼
[Z리포트 출력]
```

### 회원 데이터 흐름

```
[회원 등록]
CUSTOMER_INFO (MEM_CODE, MEM_GRADE, CUS_POINT)
    │
    ├── 판매 시 회원 조회 → MEM_SalePrice() 할인 적용
    ├── 포인트 적립 → CUS_POINT ↑
    ├── 포인트 사용 → CUS_POINT ↓ → CUSTOMER_POINT_HISTORY
    └── 생일 포인트 → MEM_PointADD()
```

---

## 6. 핵심 VB6 타입 정의 (Mdl_Main.bas)

```vb
Type Product           ' 판매 상품 정보
    Barcode As String  ' 바코드 (PK)
    name As String     ' 상품명
    Dnaga As String    ' 매입단가 (PUR_PRI)
    Price As String    ' 판매가 (SELL_PRI)
    Cnt As String      ' 수량
    L_Code As String   ' 대분류
    M_Code As String   ' 중분류
    S_Code As String   ' 소분류
    BOX_USE As String  ' 박스 여부
    OBTAIN As String   ' 박스당 수량
End Type

Type OrderKiosk        ' 키오스크 주문 정보 (mdl_Kiosk.bas)
    sID As String      ' 상품 ID
    Cnt As Integer     ' 수량
    sName As String    ' 상품명
    sbarcode As String ' 바코드
    pri As Long        ' 가격
    sOPBarcods As String ' 옵션 바코드
    sOPYN As String    ' 옵션 여부
    sMainPri As String ' 원 판매가
End Type
```

---

## 7. 마이그레이션 매핑

| VB6 ASIS                    | Vue 3 TOBE                    | 비고           |
| --------------------------- | ----------------------------- | -------------- |
| Frm_SaleMain                | SalesRegisterView.vue         | POS 판매       |
| Frm_SelfKiosk               | MenuView.vue + CartView.vue   | 키오스크       |
| Frm_PurchaseManage          | PurchaseRegisterView.vue      | 매입           |
| Frm_ProductUpdate           | ProductsView.vue              | 상품 관리      |
| Frm_SettlementManage        | DashboardView.vue (정산 탭)   | 정산           |
| Frm*SaleCard_VCAT*\*        | PaymentService (Strategy)     | 12 VAN → 4 VAN |
| InD/InT/SaD/SaT (월별)      | Purchase/Order (단일 테이블)  | Prisma 모델    |
| LastSt (이월재고)           | PurchaseProduct.stock         | 재고 필드      |
| Goods (마스터)              | Product + Category (M:N)      | 정규화         |
| Office_Manage               | Supplier                      | 거래처         |
| Mdl_Printer                 | Electron IPC → ESC/POS        | 프린터 서비스  |
| pos_config.ini / DB POS_Set | SystemSetting + DeviceSetting | 2계층 설정     |
