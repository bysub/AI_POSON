# POSON 설정 항목 전체 목록

> 분석 기준: SettingsView.vue (공통 환경설정) + DevicesView.vue (기기 설정)
> 분석일: 2026-02-19
> DB: SystemSetting (공통) + DeviceSetting (기기별)

---

## 요약

| 구분          | 화면             | DB 테이블     | 탭 수  | 항목 수 |
| ------------- | ---------------- | ------------- | ------ | ------- |
| 공통 환경설정 | SettingsView.vue | SystemSetting | 6      | **102** |
| 기기별 설정   | DevicesView.vue  | DeviceSetting | 13     | **217** |
| **합계**      |                  |               | **19** | **319** |

---

## A. 공통 환경설정 (SettingsView.vue) — 102항목

> API: `GET/PUT /api/v1/settings/:category`
> 전 기기에서 공유하는 매장 공통 설정

### A-1. 판매 운영 (SALE) — 31항목

| #                           | 키                      | 제목                | 유형   | 설명                               |
| --------------------------- | ----------------------- | ------------------- | ------ | ---------------------------------- |
| **영업 관리**               |
| 1                           | sale.openDay            | 영업 시작일         | date   | 영업 시작일                        |
| 2                           | sale.finishDay          | 마감일              | date   | 마감일                             |
| 3                           | sale.receiptSeq         | 전표 시퀀스         | number | 전표 시퀀스 번호                   |
| 4                           | sale.receiptNumber      | 전표번호            | text   | 전표번호                           |
| 5                           | sale.startPrice         | 시재금              | number | 시재금 (0 이상)                    |
| 6                           | sale.beforTran          | 이전 거래           | text   | 이전 거래 설정                     |
| **가격/금액**               |
| 7                           | sale.maxPrice           | 최대 결제금액       | number | 기본 9,999,990                     |
| 8                           | sale.maxCashPrice       | 최대 현금금액       | number | 기본 9,999,990                     |
| 9                           | sale.delay              | 지연 설정           | number | 지연 설정값                        |
| **주방/테이블**             |
| 10                          | sale.kitchenCallEnabled | 주방 호출           | toggle | 주문 완료 시 주방으로 호출 전송    |
| 11                          | sale.tableSelectEnabled | 테이블 선택         | toggle | 주문 시 테이블 번호 선택 화면 표시 |
| 12                          | sale.tableCount         | 테이블 갯수         | number | 매장에 배치된 테이블 수            |
| **판매 옵션 (토글)**        |
| 13                          | sale.priceEditable      | 가격 수정 허용      | toggle | 판매 시 상품 가격 수정 가능        |
| 14                          | sale.productSound       | 상품 스캔 소리      | toggle | 상품 스캔/등록 시 효과음           |
| 15                          | sale.orderCallEnabled   | 주문 호출           | toggle | 주문 완료 시 호출 알림             |
| 16                          | sale.totalQtyShow       | 총 수량 표시        | toggle | 판매 화면에 총 수량 표시           |
| 17                          | sale.grouping           | 상품 그룹핑         | toggle | 동일 상품 자동 합산                |
| 18                          | sale.boryuEnabled       | 보류 기능           | toggle | 거래 보류 기능 사용                |
| 19                          | sale.infoDeskEnabled    | 안내데스크 모드     | toggle | 안내 데스크 모드 사용              |
| 20                          | sale.allFinish          | 전체 마감           | toggle | 전체 마감 기능 사용                |
| 21                          | sale.jobFinishCashdraw  | 마감시 현금함       | toggle | 업무 마감 시 현금함 열기           |
| 22                          | sale.freeOpt            | 무료 옵션           | toggle | 무료 상품 처리 옵션                |
| 23                          | sale.price11            | 3단 가격 표시       | toggle | 3단 가격 적용                      |
| 24                          | sale.engEnabled         | 영어 모드           | toggle | 영문 인터페이스 사용               |
| 25                          | sale.gridFix            | 그리드 고정         | toggle | 테이블 컬럼 너비 고정              |
| **데이터 전용 (UI 미노출)** |
| 26                          | sale.saleView           | 판매 화면 유형      | data   | 판매 화면 표시 모드                |
| 27                          | sale.gridSaleEx         | 그리드 확장         | data   | 판매 그리드 확장 모드              |
| 28                          | sale.boryuTranOpt       | 보류 전송 옵션      | data   | 보류 거래 전송 옵션                |
| 29                          | sale.infoDeskViewAll    | 안내데스크 전체보기 | data   | 안내 데스크 전체 보기              |
| 30                          | sale.saleFinishOpt      | 판매 마감 옵션      | data   | 판매 마감 옵션                     |
| 31                          | sale.dayFinishMsgOpt    | 일마감 메시지       | data   | 일마감 메시지 옵션                 |

※ sale.scancop (스캔 카피)도 saleConfig에 정의되어 있으나 UI 미노출 → 총 31항목

### A-2. 결제 정책 (PAYMENT) — 21항목

| #                  | 키                       | 제목               | 유형      | 설명                              |
| ------------------ | ------------------------ | ------------------ | --------- | --------------------------------- |
| **카드/결제 정책** |
| 1                  | payment.minCardPrice     | 카드 최소금액      | number    | 카드 결제 최소 금액 (0: 제한없음) |
| 2                  | payment.offCardCheck     | 오프라인 카드 결제 | toggle    | 서버 미연결 시 카드 결제 허용     |
| 3                  | payment.offCardKeyUse    | 오프라인 카드 키   | toggle    | 오프라인 카드 키 사용             |
| 4                  | payment.handCardEnabled  | 수기 카드 입력     | toggle    | 카드번호 직접 입력 허용           |
| 5                  | payment.cardTimerEnabled | 카드 타이머        | toggle    | 카드 결제 타임아웃 사용           |
| 6                  | payment.cardWavOpt       | 카드 결제 소리     | toggle    | 카드 결제 시 효과음               |
| 7                  | payment.cardView         | 카드 정보 표시     | toggle    | 카드 정보 화면 표시               |
| 8                  | payment.eCardEnabled     | 전자카드 사용      | toggle    | 전자카드 결제 사용                |
| 9                  | payment.noCvmBillPrint   | 비CVM 영수증       | toggle    | 비CVM 거래 영수증 출력            |
| **VAN/현금**       |
| 10                 | payment.cashBackEnabled  | 캐시백 사용        | toggle    | 카드 캐시백 기능 사용             |
| 11                 | payment.oCashScreen      | 현금영수증 화면    | toggle    | 현금영수증 입력 화면 표시         |
| **상품권**         |
| 12                 | payment.giftInputEnabled | 상품권 입력        | toggle    | 상품권 수기 입력 허용             |
| 13                 | payment.giftBillEtc      | 상품권 기타 처리   | toggle    | 상품권 기타 결제 처리             |
| **환불**           |
| 14                 | payment.rePoint          | 환불 포인트 재계산 | toggle    | 환불시 포인트 재계산              |
| 15                 | payment.reTax            | 환불 세금 재계산   | toggle    | 환불시 세금 재계산                |
| 16                 | payment.reCashBack       | 환불 캐시백 재계산 | toggle    | 환불시 캐시백 재계산              |
| **수수료**         |
| 17                 | payment.commCard         | 카드 수수료        | number(%) | 카드 수수료율                     |
| 18                 | payment.commPoint        | 포인트 수수료      | number(%) | 포인트 수수료율                   |
| 19                 | payment.commCashBack     | 캐시백 수수료      | number(%) | 캐시백 수수료율                   |
| 20                 | payment.commCash         | 현금 수수료        | number(%) | 현금 수수료율                     |
| 21                 | payment.commCashRate     | 현금 비율          | number(%) | 현금 비율                         |

### A-3. 출력 설정 (PRINT) — 9항목

| #   | 키                       | 제목             | 유형   | 설명                       |
| --- | ------------------------ | ---------------- | ------ | -------------------------- |
| 1   | print.printVat           | 부가세 인쇄      | toggle | 영수증에 부가세 정보 인쇄  |
| 2   | print.printBarcode       | 바코드 인쇄      | toggle | 영수증에 바코드 인쇄       |
| 3   | print.bottomPrint        | 하단 문구 인쇄   | toggle | 영수증 하단 문구 인쇄      |
| 4   | print.pointBillPrint     | 포인트 영수증    | toggle | 포인트 내역 영수증 인쇄    |
| 5   | print.reTranBillPrint    | 재거래 영수증    | toggle | 재거래 시 영수증 인쇄      |
| 6   | print.memberReceiptPrint | 회원 미수 인쇄   | toggle | 회원 미수 잔액 영수증 인쇄 |
| 7   | print.printerOffCheck    | 프린터 오프 체크 | toggle | 프린터 미연결 시 경고      |
| 8   | print.slotAdd            | 용지 슬롯 추가   | toggle | 영수증 슬롯(여백) 추가     |
| 9   | print.cutPosition        | 절단 위치        | select | 기본/위/아래               |

### A-4. 포인트/회원 (POINT) — 27항목

| #                                  | 키                     | 제목             | 유형   | 설명                       |
| ---------------------------------- | ---------------------- | ---------------- | ------ | -------------------------- |
| **포인트 기본**                    |
| 1                                  | point.salePoint        | 판매 포인트      | toggle | 판매 시 포인트 적립        |
| 2                                  | point.weightPoint      | 중량 상품 포인트 | select | 일반적립/미적립/별도적립률 |
| 3                                  | point.memberAddScreen  | 회원 추가 화면   | toggle | 판매 시 회원 등록 화면     |
| 4                                  | point.gradeMemo        | 등급 메모        | toggle | 회원 등급 메모 표시        |
| 5                                  | point.noBillMessage    | 무영수증 메시지  | toggle | 무영수증 시 메시지 표시    |
| 6                                  | point.noBillSound      | 무영수증 소리    | toggle | 무영수증 시 효과음         |
| 7                                  | point.noBillCusPoint   | 무영수증 포인트  | toggle | 무영수증 시 포인트 적용    |
| **고객 UI (키오스크) — 입력/선택** |
| 8                                  | point.selfCusTopMsg    | 상단 메시지      | text   | 키오스크 상단 표시 메시지  |
| 9                                  | point.selfCusBTMsg1    | 버튼 메시지 1    | text   | 키오스크 버튼 메시지 1     |
| 10                                 | point.selfCusBTMsg2    | 버튼 메시지 2    | text   | 키오스크 버튼 메시지 2     |
| 11                                 | point.selfCusSelect    | 고객 선택 방식   | select | 방식 0/1/2                 |
| 12                                 | point.selfReader       | ID 리더기 유형   | select | 미사용/바코드/RF           |
| 13                                 | point.selfStartHotKey  | 시작 핫키        | select | 미사용/사용                |
| 14                                 | point.selfPriceType    | 가격 표시 유형   | select | 기본/유형1/유형2           |
| 15                                 | point.selfCusAddEtc    | 고객추가 기타    | select | 미사용/사용                |
| **고객 UI (키오스크) — 토글**      |
| 16                                 | point.selfSoundGuide   | 음성 안내        | toggle | 음성 안내 사용             |
| 17                                 | point.selfCusNum4      | 회원번호 4자리   | toggle | 4자리 회원번호 입력        |
| 18                                 | point.selfNoCustomer   | 비회원 판매      | toggle | 비회원 판매 허용           |
| 19                                 | point.selfCusAddUse    | 고객 추가        | toggle | 고객 추가 기능 사용        |
| 20                                 | point.selfTouchSoundYN | 터치 소리        | toggle | 터치 시 효과음             |
| 21                                 | point.selfMainPage     | 메인페이지 표시  | toggle | 메인 페이지 표시           |
| 22                                 | point.selfBTInit       | 초기화 버튼      | toggle | 초기화 버튼 표시           |
| 23                                 | point.selfOneCancel    | 개별 취소        | toggle | 개별 상품 취소 버튼        |
| 24                                 | point.selfZHotKey      | Z 핫키           | toggle | Z 핫키 사용                |
| 25                                 | point.selfCountYN      | 계수 버튼        | toggle | 계수 버튼 표시             |
| 26                                 | point.selfPriceUse     | 가격 조정        | toggle | 가격 조정 기능 사용        |
| 27                                 | point.selfMainPage     | 메인페이지       | toggle | 메인 페이지 표시           |

### A-5. 바코드/중량 (BARCODE) — 5항목

| #   | 키                     | 제목                 | 유형   | 설명                             |
| --- | ---------------------- | -------------------- | ------ | -------------------------------- |
| 1   | barcode.barCodeLen     | 바코드 자동부여 숫자 | text   | 자동 생성 바코드 앞자리 (예: 95) |
| 2   | barcode.scaleLen       | 중량상품 코드 길이   | text   | 중량 바코드 상품코드 자릿수      |
| 3   | barcode.scaleStartChar | 중량상품 시작문자    | text   | 중량 바코드 시작 식별자 (예: 28) |
| 4   | barcode.scalePriceCut  | 중량 가격 절사       | select | 미사용/10원절사/100원절사        |
| 5   | barcode.scale18YN      | 18자리 중량 바코드   | toggle | 18자리 형식 사용 (기본: 13자리)  |

### A-6. 시스템 (SYSTEM) — 9항목

| #   | 키                       | 제목              | 유형   | 설명                             |
| --- | ------------------------ | ----------------- | ------ | -------------------------------- |
| 1   | system.masterDownWeek    | 마스터 다운 주기  | number | 마스터 데이터 다운로드 주기 (주) |
| 2   | system.backupPath        | 백업 경로         | text   | 데이터 백업 경로                 |
| 3   | system.errorLog          | 오류 로그 기록    | toggle | 시스템 오류 로그 자동 기록       |
| 4   | system.mdbCompact        | DB 자동 컴팩트    | toggle | 데이터베이스 자동 최적화         |
| 5   | system.masterDownEnabled | 마스터 자동 다운  | toggle | 마스터 데이터 자동 다운로드      |
| 6   | system.newItemUpdate     | 신규상품 업데이트 | toggle | 새 상품 자동 반영                |
| 7   | system.scanRealCheck     | 실시간 스캔 체크  | toggle | 스캔 데이터 실시간 검증          |
| 8   | system.logoMinimize      | 로고 최소화       | toggle | 상단 로고를 작은 크기로 표시     |
| 9   | system.screenHide        | 화면 숨김         | toggle | 작업표시줄 숨김 모드             |

---

## B. 기기별 설정 (DevicesView.vue) — 217항목

> API: `GET/PUT /api/v1/devices/:id/settings/:category`
> 기기 유형별 탭 구성: POS(6탭), KIOSK(8탭), KITCHEN(2탭)

### B-1. [공통] 터미널 HW (TERMINAL) — 30항목

모든 기기 유형(POS, KIOSK, KITCHEN)에서 사용

| #                    | 키                     | 제목             | 유형   | 설명                  |
| -------------------- | ---------------------- | ---------------- | ------ | --------------------- |
| **기본 정보**        |
| 1                    | terminal.terminalType  | 터미널 유형      | select | 0=일반POS, 1=셀프 등  |
| 2                    | terminal.posNo         | POS 번호         | text   | POS 고유 번호 (2자리) |
| 3                    | terminal.adminPosNo    | 관리자 POS번호   | text   | 관리자 POS 식별 번호  |
| **주변기기 토글**    |
| 4                    | terminal.cashDraw      | 캐시 드로워      | toggle | 현금함 사용           |
| 5                    | terminal.touch         | 터치스크린       | toggle | 터치 입력 사용        |
| 6                    | terminal.dual          | 듀얼 모니터      | toggle | 보조 모니터 사용      |
| 7                    | terminal.dualType      | 듀얼 유형        | select | 듀얼 모니터 유형      |
| **프린터**           |
| 8                    | terminal.printer       | 프린터           | select | 프린터 종류           |
| 9                    | terminal.printerPort   | 프린터 포트      | select | 프린터 연결 포트      |
| 10                   | terminal.printerBps    | 프린터 전송속도  | select | 프린터 BPS            |
| **스캐너**           |
| 11                   | terminal.scanName      | 스캐너 종류      | select | 스캐너 종류           |
| 12                   | terminal.scanPort      | 스캐너 포트      | select | 스캐너 연결 포트      |
| 13                   | terminal.handScanPort  | 핸드스캐너 포트  | select | 핸드 스캐너 포트      |
| **MSR (카드 리더)**  |
| 14                   | terminal.msrPort       | MSR 포트         | select | 카드 리더 포트        |
| 15                   | terminal.msrBps        | MSR 전송속도     | select | MSR BPS               |
| **고객표시기 (CDP)** |
| 16                   | terminal.cdpName       | CDP 이름         | text   | 고객표시기 이름       |
| 17                   | terminal.cdpPort       | CDP 포트         | select | 고객표시기 포트       |
| 18                   | terminal.cdpLine       | CDP 라인         | select | 고객표시기 라인 수    |
| 19                   | terminal.cdpType       | CDP 유형         | text   | 고객표시기 유형       |
| 20                   | terminal.cdpBps        | CDP 전송속도     | select | CDP BPS               |
| 21                   | terminal.cdpCashYN     | CDP 현금 표시    | toggle | 고객표시기 현금 표시  |
| **코인기**           |
| 22                   | terminal.coinName      | 코인기 종류      | select | 코인기 종류           |
| 23                   | terminal.coinPort      | 코인기 포트      | select | 코인기 포트           |
| **기타 하드웨어**    |
| 24                   | terminal.moniter       | 모니터 유형      | select | 메인 모니터 설정      |
| 25                   | terminal.sMoniter      | 보조 모니터 유형 | select | 서브 모니터 설정      |
| 26                   | terminal.printerCatUse | CAT 프린터       | toggle | CAT 프린터 사용       |
| 27                   | terminal.catPort       | CAT 포트         | select | CAT 프린터 포트       |
| 28                   | terminal.catBps        | CAT 전송속도     | select | CAT BPS               |
| 29                   | terminal.cboScalePort  | 저울 포트        | select | 전자저울 포트         |
| 30                   | terminal.supyoPort     | 수표 포트        | select | 수표조회기 포트       |

### B-2. [공통] VAN 결제 (VAN) — 9항목

POS, KIOSK에서 사용

| #   | 키              | 제목              | 유형   | 설명                   |
| --- | --------------- | ----------------- | ------ | ---------------------- |
| 1   | van.vanSelect   | VAN사 선택        | select | NICE/KSNET/KICC/KIS 등 |
| 2   | van.singPadPort | 서명패드 포트     | select | 서명패드 연결 포트     |
| 3   | van.logDelete   | 로그 삭제         | toggle | VAN 로그 자동 삭제     |
| 4   | van.vanIp       | VAN IP            | text   | VAN 서버 IP            |
| 5   | van.vanPort     | VAN 포트          | text   | VAN 서버 포트          |
| 6   | van.danmalNo    | 단말기 번호       | text   | VAN 단말기 번호(TID)   |
| 7   | van.snumber     | 시리얼 번호       | text   | 시리얼 번호            |
| 8   | van.singPadBps  | 서명패드 전송속도 | select | 서명패드 BPS           |
| 9   | van.usbYN       | USB 사용          | toggle | VAN USB 연결 사용      |

### B-3. [POS] 인쇄/출력 (POS_PRINT) — 76항목

POS 전용. 판매/정산/영수증 관련 세부 설정

| #   | 키                                | 제목                   | 설명                                  |
| --- | --------------------------------- | ---------------------- | ------------------------------------- |
| 1   | posPrint.settleCategoryPrint      | 정산 분류별 매출 출력  | 정산시 분류별 매출 출력               |
| 2   | posPrint.settleAmountPrint        | 정산 금액단위별 수량   | 정산시 금액 단위별 수량 출력          |
| 3   | posPrint.saleNewProduct           | 신상품 등록 가능       | 판매시 신상품 등록 가능               |
| 4   | posPrint.receiptProductOneLine    | 상품정보 1줄 표시      | 영수증에 상품정보 1줄 표시            |
| 5   | posPrint.exchangePassword         | 환전 비밀번호          | 환전 시 비밀번호 사용                 |
| 6   | posPrint.zeroPriceInput           | 0원 상품 입력          | 가격 0인 상품 POS에서 입력            |
| 7   | posPrint.discountNoPoint          | 할인상품 적립 안함     | 할인상품 포인트 적립 안함             |
| 8   | posPrint.weightNoPoint            | 중량상품 적립 안함     | 중량상품 포인트 적립 안함             |
| 9   | posPrint.saleCancelDisable        | 전체취소 비활성        | 판매시 전체취소 기능 사용 안함        |
| 10  | posPrint.slipNoPrint              | 전표번호 미출력        | 매출전표 번호 출력 안하기             |
| 11  | posPrint.deliveryDisable          | 배달기능 비활성        | 배달기능 사용안함                     |
| 12  | posPrint.holdReceiptPrint         | 보류 영수증 출력       | 보류시 보류 영수증 출력               |
| 13  | posPrint.cardNoDrawer             | 카드 시 금고 안열기    | 카드매출시 금고 열지 않음             |
| 14  | posPrint.cancelDetailPrint        | 취소 내역 출력         | 전체취소시 취소내역 출력(취소사유)    |
| 15  | posPrint.posNoCreditSale          | 외상 매출 불가         | POS 외상 매출 불가 설정               |
| 16  | posPrint.receiptBarcode           | 영수증 바코드          | 영수증에 바코드 표시                  |
| 17  | posPrint.receiptVat               | 영수증 부가세          | 영수증에 부가세 표시                  |
| 18  | posPrint.receiptBottleTotal       | 공병합계 표시          | 영수증에 공병합계 금액 표시           |
| 19  | posPrint.cashBackUse              | 캐쉬백 사용            | 캐쉬백 기능 사용                      |
| 20  | posPrint.noCostPriceShow          | 매입가 미표시          | 가격확인시 매입가 표시안함            |
| 21  | posPrint.barcodeGroupUse          | 바코드별 상품 묶기     | 바코드별 상품 묶기 사용               |
| 22  | posPrint.returnNoPassword         | 반품 비밀번호 미사용   | 반품시 비밀번호 사용안함              |
| 23  | posPrint.memberTotalHide          | 회원 구매금액 숨김     | 회원 총 구매금액 숨기기               |
| 24  | posPrint.cardReceiptDetail        | 카드 보관용 상세인쇄   | 카드매출시 보관용영수증 상세내역 인쇄 |
| 25  | posPrint.checkResponsePrint       | 수표 응답 인쇄         | 수표조회시 응답값 인쇄                |
| 26  | posPrint.deliveryPointAccrue      | 배달 포인트 적립       | 배달판매시 포인트 적립(미체크:입금시) |
| 27  | posPrint.discountNoCashback       | 할인상품 캐쉬백 안함   | 할인상품 캐쉬백 적립 안함             |
| 28  | posPrint.cashForceInput           | 받은돈 무조건 입력     | 현금처리시 받은돈 무조건 입력         |
| 29  | posPrint.archiveBarcodeNo         | 보관용 바코드 안함     | 보관용전표 바코드출력 안함            |
| 30  | posPrint.eSignArchiveNo           | 전자서명 보관전표 안함 | 전자서명시 보관용전표 출력안함        |
| 31  | posPrint.deliveryArchiveDouble    | 배달 보관전표 2장      | 배달보관용전표 2장 출력               |
| 32  | posPrint.reissueBarcodeNo         | 재발행 바코드 안함     | 영수증재발행시 바코드 출력안함        |
| 33  | posPrint.slipNoHide               | 전표번호 숨기기        | 판매화면 전표번호 숨기기              |
| 34  | posPrint.visitDeliveryArchive     | 내방배달 보관전표      | 내방배달시 보관용전표 출력            |
| 35  | posPrint.deliveryNoPayClose       | 배달미입금 마감불가    | 배달미입금시 마감불가                 |
| 36  | posPrint.closeOutstandingPrint    | 마감시 외상입금 출력   | 포스마감시 회원외상 입금내역 출력     |
| 37  | posPrint.overdueCustomerWarn      | 미수고객 경고창        | 미수고객 호출시 경고창 보여주기       |
| 38  | posPrint.holdNoShift              | 보류시 교대 불가       | 보류 뒤 미처리시 교대 불가            |
| 39  | posPrint.deliveryNoShift          | 배달미처리 교대 불가   | 배달 미처리시 교대 불가               |
| 40  | posPrint.receiptItemSeq           | 상품순번 출력          | 영수증에 상품순번 출력(2줄식)         |
| 41  | posPrint.cashOnlyNoReturn         | 현금전용 반품 불가     | 현금으로만 결제시 전표반품 불가       |
| 42  | posPrint.firstScanHoldMsg         | 스캔시 보류 메시지     | 첫 상품 스캔시 보류메세지 보여주기    |
| 44  | posPrint.scale18Barcode           | 18행 중량바코드        | 저울 18행 중량바코드 사용             |
| 45  | posPrint.holdReceiptDetail        | 보류 영수증 상세       | 보류 영수증 상세 출력                 |
| 46  | posPrint.cashReceiptAutoIssue     | 현금영수증 자진발급    | 현금영수증 자진발급 사용              |
| 47  | posPrint.costOverSellWarn         | 매입>판매 경고         | 판매시 매입액>판매액 경고창           |
| 48  | posPrint.saleMessageHide          | 판매메세지 숨김        | 판매메세지 숨기기                     |
| 49  | posPrint.disabledProductChange    | 중지상품 변경사용      | 판매시 사용중지상품 변경사용          |
| 50  | posPrint.deliveryArchiveSimple    | 배달 약식 출력         | 배달 보관용 전표 약식 출력            |
| 51  | posPrint.receiptNoOutstanding     | 미수금 출력 안함       | 영수증에 고객 미수금 출력 안함        |
| 52  | posPrint.deliveryNoPayReturn      | 배달미입금 반품 가능   | 배달 미입금 전표 반품 가능            |
| 53  | posPrint.deliverySaleType         | 배달판매 구분          | 배달판매구분(미체크:내방, 체크:전화)  |
| 54  | posPrint.salePriceCompare         | 가격비교 사용          | 판매 가격비교 사용                    |
| 57  | posPrint.categoryScaleInput       | 부류/저울 판매가 입력  | 부류/저울상품 판매가 입력 화면 사용   |
| 58  | posPrint.deliveryNotePrint        | 배달 비고란 출력       | 배달판매시 비고란 출력                |
| 59  | posPrint.barcodeCardPayScreen     | 바코드 카드결제 화면   | 바코드입력에서 카드/외상 결제 화면    |
| 60  | posPrint.cashChangeCardScreen     | 잔액 카드결제 화면     | 현금 결제 후 잔액 카드/외상 결제 화면 |
| 61  | posPrint.shortcutFixedPrice       | 단축키 고정판매가      | 단축키 부류/저울 상품 고정판매가      |
| 62  | posPrint.giftCashReceiptInclude   | 상품권 현금영수증 포함 | 상품권 결제시 현금영수증/캐쉬백 포함  |
| 63  | posPrint.giftPointInclude         | 상품권 포인트 포함     | 상품권 결제시 포인트 적립 포함        |
| 64  | posPrint.openShiftFiscalPrint     | 개점/교대 재정정보     | 개점/교대 등록시 재정정보 출력        |
| 65  | posPrint.deliverySeqPrint         | 배달 순번 출력         | 배달 판매 순번 출력 사용              |
| 66  | posPrint.deliveryReceiptManage    | 배달 영수증 관리       | 배달 판매 영수증 관리 사용            |
| 67  | posPrint.deliveryDriverReceipt    | 기사용 영수증 출력     | 배달 판매 기사용 영수증 출력          |
| 68  | posPrint.bulkPriceFit             | 벌크상품 합계 맞춤     | 벌크상품 판매가 합계 맞추기           |
| 69  | posPrint.cashbackQrPrint          | 캐쉬백 QR 인쇄         | 캐쉬백 적립 QR코드 인쇄               |
| 70  | posPrint.receiptPhoneMask         | 전화번호 마스킹        | 영수증 회원 전화번호 마스킹           |
| 71  | posPrint.shortcutNameProcess      | 단축키 마포이름        | 단축키 마포이름 처리 사용             |
| 72  | posPrint.eCouponNoReceipt         | e-쿠폰 영수증 안함     | e-쿠폰 사용 영수증 출력 안함          |
| 73  | posPrint.deliveryItemArchive      | 배달 개별상품 보관용   | 배달 개별상품 보관용영수증 출력       |
| 74  | posPrint.cashReceiptIdShow        | 현금영수증 고객표시    | 현금영수증 신분정보 고객모니터 표시   |
| 75  | posPrint.deliverySeqMemberReceipt | 배달순번 회원영수증    | 배달 순번 회원 구분 영수증 출력       |
| 76  | posPrint.receiptNameMask          | 회원명 마스킹          | 영수증 회원명 마스킹                  |
| 77  | posPrint.cardReturnNoDrawer       | 카드반품 돈통 안열기   | 카드매출 전표반품시 돈통 안열기       |
| 78  | posPrint.cardCardPayUse           | 카드+카드 결제         | 카드+카드 결제 사용                   |
| 79  | posPrint.deliveryArchiveNormal    | 배달 보관 일반설정     | 배달 보관 영수증 일반영수증 설정 적용 |

※ ASIS 43, 55, 56번은 스킵됨 (총 76항목)

### B-4. [POS] 판매설정 (POS_SALE) — 11항목

| #   | 키                             | 제목             | 유형   | 설명                              |
| --- | ------------------------------ | ---------------- | ------ | --------------------------------- |
| 1   | posSale.receiptDiscountDisplay | 영수증 할인 표시 | select | 영수증 할인 표시 방식             |
| 2   | posSale.totalRounding          | 합계 반올림      | select | 합계 반올림 방식                  |
| 3   | posSale.scaleRounding          | 저울 반올림      | select | 저울 가격 반올림                  |
| 4   | posSale.categoryPrintType      | 분류 출력 유형   | select | 분류별 출력 유형                  |
| 5   | posSale.deliveryPointRate      | 배달 포인트 비율 | number | 배달 포인트 적립률 (%)            |
| 6   | posSale.creditPointRate        | 외상 포인트 비율 | number | 외상 포인트 적립률 (%)            |
| 7   | posSale.minReceiptAmount       | 최소 영수증 금액 | number | 최소 영수증 발행 금액             |
| 8   | posSale.minPointAmount         | 최소 포인트 금액 | number | 최소 포인트 적립 금액             |
| 9   | posSale.cardNoSignAmount       | 카드 무서명 금액 | number | 서명 면제 기준 금액 (기본 50,000) |
| 10  | posSale.bcPartner              | BC 파트너스      | toggle | BC 파트너스 가맹점 여부           |
| 11  | posSale.creditMemoUse          | 외상결제 메모    | toggle | 판매>외상결제시 메모 기능 사용    |

### B-5. [POS] 정산/마감 (POS_SETTLE) — 27항목

| #                          | 키                             | 제목                 | 유형   | 설명                                   |
| -------------------------- | ------------------------------ | -------------------- | ------ | -------------------------------------- |
| **담당자 정산서 (13항목)** |
| 1                          | posSettle.staffBottleSales     | 공병 매출            | toggle | 담당자 정산서에 공병 매출 포함         |
| 2                          | posSettle.staffTaxExempt       | 과/면세 내역         | toggle | 담당자 정산서에 과/면세 내역 포함      |
| 3                          | posSettle.staffDiscount        | 할인 내역            | toggle | 담당자 정산서에 할인 내역 포함         |
| 4                          | posSettle.staffCancel          | 취소 내역            | toggle | 담당자 정산서에 취소 내역 포함         |
| 5                          | posSettle.staffCreditCard      | 신용카드 내역        | toggle | 담당자 정산서에 신용카드 내역 포함     |
| 6                          | posSettle.staffCashReceipt     | 현금영수증 내역      | toggle | 담당자 정산서에 현금영수증 내역 포함   |
| 7                          | posSettle.staffPrize           | 경품지급 내역        | toggle | 담당자 정산서에 경품지급 내역 포함     |
| 8                          | posSettle.staffCardByIssuer    | 매입사별 카드매출    | toggle | 담당자 정산서에 매입사별 카드매출 포함 |
| 9                          | posSettle.staffOutstanding     | 외상 입금 내역       | toggle | 담당자 정산서에 외상 입금 내역 포함    |
| 10                         | posSettle.staffDeliveryDeposit | 전배달 입금 내역     | toggle | 담당자 정산서에 전배달 입금 내역 포함  |
| 11                         | posSettle.staffEtcDiscount     | 기타 할인 내역       | toggle | 담당자 정산서에 기타 할인 내역 포함    |
| 12                         | posSettle.staffDeliveryCount   | 배달건수 출력        | toggle | 담당자 정산서에 배달건수 출력          |
| 13                         | posSettle.staffSettleReport    | 정산서 출력          | toggle | 담당자 정산서 출력                     |
| **마감 정산서 (10항목)**   |
| 14                         | posSettle.closeBottleSales     | 공병 매출            | toggle | 마감 정산서에 공병 매출 포함           |
| 15                         | posSettle.closeTaxExempt       | 과/면세 내역         | toggle | 마감 정산서에 과/면세 내역 포함        |
| 16                         | posSettle.closeDiscount        | 할인 내역            | toggle | 마감 정산서에 할인 내역 포함           |
| 17                         | posSettle.closeCancel          | 취소 내역            | toggle | 마감 정산서에 취소 내역 포함           |
| 18                         | posSettle.closeCreditCard      | 신용카드 내역        | toggle | 마감 정산서에 신용카드 내역 포함       |
| 19                         | posSettle.closeCashReceipt     | 현금영수증 내역      | toggle | 마감 정산서에 현금영수증 내역 포함     |
| 20                         | posSettle.closePrize           | 경품지급 내역        | toggle | 마감 정산서에 경품지급 내역 포함       |
| 21                         | posSettle.closeCardByIssuer    | 매입사별 카드매출    | toggle | 마감 정산서에 매입사별 카드매출 포함   |
| 22                         | posSettle.closeDeliveryCount   | 배달건수 출력        | toggle | 마감 정산서에 배달건수 출력            |
| 23                         | posSettle.closeSettleReport    | 정산서 출력          | toggle | 마감 정산서 출력                       |
| **영수증 메시지 (4항목)**  |
| 24                         | posSettle.receiptTopMsg        | 영수증 상단 메시지   | text   | 영수증 상단 표시 문구                  |
| 25                         | posSettle.receiptBottomMsg1    | 영수증 하단 메시지 1 | text   | 영수증 하단 문구 1                     |
| 26                         | posSettle.receiptBottomMsg2    | 영수증 하단 메시지 2 | text   | 영수증 하단 문구 2                     |
| 27                         | posSettle.receiptBottomMsg3    | 영수증 하단 메시지 3 | text   | 영수증 하단 문구 3                     |

### B-6. [POS] 영수증 (POS_RECEIPT) — 10항목

결제 유형별 영수증 출력 억제 설정

| #   | 키                               | 제목                  | 유형   | 설명                             |
| --- | -------------------------------- | --------------------- | ------ | -------------------------------- |
| 1   | posReceipt.receiptOffDelivery    | 배달시 출력 안함      | toggle | 배달(내방/전화)시 출력 안함      |
| 2   | posReceipt.receiptOffCredit      | 외상시 출력 안함      | toggle | 외상시 출력 안함                 |
| 3   | posReceipt.receiptOffPoint       | 포인트 사용 출력 안함 | toggle | 포인트 사용 출력 안함            |
| 4   | posReceipt.receiptOffGift        | 상품권 사용 출력 안함 | toggle | 상품권 사용 출력 안함            |
| 5   | posReceipt.receiptOffEcoupon     | e쿠폰 사용 출력 안함  | toggle | e쿠폰 사용 출력 안함             |
| 6   | posReceipt.receiptOffQrms        | QRMS 사용 출력 안함   | toggle | QRMS 사용시 출력 안함            |
| 7   | posReceipt.receiptOffCardOnce    | 카드 일시불 출력 안함 | toggle | 카드 일시불/OFF 결제시 출력 안함 |
| 8   | posReceipt.receiptOffCardInstall | 카드 할부 출력 안함   | toggle | 카드 할부 결제시 출력 안함       |
| 9   | posReceipt.receiptOffCashReceipt | 현금영수증 출력 안함  | toggle | 현금영수증 결제시 출력 안함      |
| 10  | posReceipt.receiptOffReturn      | 전표반품 출력 안함    | toggle | 전표반품시 출력 안함             |

### B-7. [KIOSK] 현금 결제 (SELF_CASH) — 10항목

| #   | 키                       | 제목             | 유형   | 설명                     |
| --- | ------------------------ | ---------------- | ------ | ------------------------ |
| 1   | selfCash.selfCash        | 현금 결제        | toggle | 현금 결제 사용           |
| 2   | selfCash.selfCashPort    | 현금기 포트      | select | 현금기 연결 포트         |
| 3   | selfCash.selfCashSleep   | 현금기 대기      | select | 현금기 대기 모드         |
| 4   | selfCash.selfCashPhonNum | 전화번호         | text   | 현금기 관련 전화번호     |
| 5   | selfCash.selfCashGubun   | 현금 구분        | select | 현금 결제 구분           |
| 6   | selfCash.selfNoHyunYoung | 실결제금액 숨김  | toggle | 실결제 금액 미표시       |
| 7   | selfCash.selfOneHPUse    | 1만원권 사용     | toggle | 현금기 1만원권 투입 허용 |
| 8   | selfCash.self50HPUse     | 5만원권 사용     | toggle | 현금기 5만원권 투입 허용 |
| 9   | selfCash.self10000Use    | 만원권 사용      | toggle | 만원권 사용 허용         |
| 10  | selfCash.selfNoCardUse   | 카드 결제 비활성 | toggle | 카드 결제 비활성화       |

### B-8. [KIOSK] 봉투/저울 (SELF_BAG) — 6항목

| #   | 키                      | 제목           | 유형   | 설명                   |
| --- | ----------------------- | -------------- | ------ | ---------------------- |
| 1   | selfBag.selfBagPort     | 봉투기 포트    | select | 봉투기 연결 포트       |
| 2   | selfBag.selfStartBag    | 시작시 봉투    | toggle | 시작 시 봉투 선택 화면 |
| 3   | selfBag.selfMBagSell    | 복수 봉투 판매 | toggle | 봉투 여러 장 판매      |
| 4   | selfBag.selfLastBag     | 마지막 봉투    | toggle | 마지막에 봉투 추가     |
| 5   | selfBag.selfScalePort   | 저울 포트      | select | 저울 연결 포트         |
| 6   | selfBag.selfScaleLimitG | 저울 한계 중량 | number | 저울 한계 중량 (g)     |

### B-9. [KIOSK] 자동 운영 (SELF_AUTO) — 8항목

| #   | 키                    | 제목           | 유형   | 설명                  |
| --- | --------------------- | -------------- | ------ | --------------------- |
| 1   | selfAuto.autoOpenYN   | 자동 개점      | toggle | 설정 시간에 자동 개점 |
| 2   | selfAuto.autoFinishYN | 자동 마감      | toggle | 설정 시간에 자동 마감 |
| 3   | selfAuto.autoDay      | 자동 운영 요일 | text   | 자동 운영 요일 설정   |
| 4   | selfAuto.autoAP       | AM/PM 구분     | select | 오전/오후 구분        |
| 5   | selfAuto.autoHH       | 시간           | select | 자동 운영 시간 (HH)   |
| 6   | selfAuto.autoMM       | 분             | select | 자동 운영 분 (MM)     |
| 7   | selfAuto.autoID       | 자동 ID        | text   | 자동 운영 ID          |
| 8   | selfAuto.autoPass     | 자동 비밀번호  | text   | 자동 운영 비밀번호    |

### B-10. [KIOSK] 포인트/알림 (SELF_POINT) — 11항목

| #   | 키                         | 제목              | 유형   | 설명                    |
| --- | -------------------------- | ----------------- | ------ | ----------------------- |
| 1   | selfPoint.selfNoAutoPoint  | 자동포인트 비활성 | toggle | 자동 포인트 적립 비활성 |
| 2   | selfPoint.selfPointZero    | 포인트 초기화     | toggle | 포인트 0원 초기화       |
| 3   | selfPoint.selfPointHidden  | 포인트 숨김       | toggle | 포인트 정보 미표시      |
| 4   | selfPoint.selfPointSMSUse  | 포인트 SMS        | toggle | 포인트 SMS 발송         |
| 5   | selfPoint.selfUserCall     | 직원 호출         | toggle | 직원 호출 기능 사용     |
| 6   | selfPoint.selfSMSAdmin     | 관리자 SMS        | toggle | 관리자에게 SMS 알림     |
| 7   | selfPoint.selfKakao        | 카카오 알림       | toggle | 카카오톡 알림 발송      |
| 8   | selfPoint.selfZero         | 제로 설정         | toggle | 제로 설정               |
| 9   | selfPoint.selfCusAlarmUse  | 고객 알람         | toggle | 고객 알람 사용          |
| 10  | selfPoint.selfCusAlarmTime | 고객 알람 시간    | select | 고객 알람 시간 설정     |
| 11  | selfPoint.selfSNSGubun     | SNS 구분          | select | SNS 알림 구분           |

### B-11. [KIOSK] 인쇄/출력 (SELF_PRINT) — 4항목

| #   | 키                         | 제목          | 유형   | 설명                     |
| --- | -------------------------- | ------------- | ------ | ------------------------ |
| 1   | selfPrint.selfAutoPrint    | 자동 출력     | toggle | 결제 후 자동 영수증 출력 |
| 2   | selfPrint.selfStoPrint     | 출력 중지     | toggle | 영수증 출력 중지         |
| 3   | selfPrint.selfPrintAddress | 주소 출력     | toggle | 영수증에 주소 출력       |
| 4   | selfPrint.selfPrintPhon    | 전화번호 출력 | toggle | 영수증에 전화번호 출력   |

### B-12. [KIOSK] 기타 (SELF_ETC) — 8항목

| #   | 키                      | 제목             | 유형   | 설명                    |
| --- | ----------------------- | ---------------- | ------ | ----------------------- |
| 1   | selfEtc.selfJPYN        | 일본 모드        | toggle | 동전교환 일본 모드      |
| 2   | selfEtc.selfBagJPPort   | 일본 봉투기 포트 | select | 일본 봉투기 포트        |
| 3   | selfEtc.selfNoAutoGoods | 자동상품 비활성  | toggle | 자동 상품 등록 비활성   |
| 4   | selfEtc.selfAppCard     | 앱카드           | toggle | 앱카드 결제 사용        |
| 5   | selfEtc.selfApple       | 애플페이         | toggle | Apple Pay 사용          |
| 6   | selfEtc.selfCamUse      | 카메라           | toggle | 카메라 사용             |
| 7   | selfEtc.selfICSiren     | IC 사이렌        | toggle | IC 사이렌 알림          |
| 8   | selfEtc.selfGif         | GIF 이미지       | text   | 완료 화면 GIF 파일 경로 |

### B-13. [KITCHEN] 주방 메시지 (KITCHEN) — 7항목

| #   | 키                       | 제목             | 유형   | 설명                  |
| --- | ------------------------ | ---------------- | ------ | --------------------- |
| 1   | kitchen.kitchenPrint     | 주방 프린터      | select | 주방 프린터 종류      |
| 2   | kitchen.kitchenPrintPort | 주방 프린터 포트 | select | 주방 프린터 포트      |
| 3   | kitchen.kitchenPrintBps  | 주방 프린터 속도 | select | 주방 프린터 BPS       |
| 4   | kitchen.kitchenFontsize  | 폰트 크기        | select | 주방 프린터 폰트 크기 |
| 5   | kitchen.kitchenMsg1      | 주방 메시지 1    | text   | 주방 표시 메시지 1    |
| 6   | kitchen.kitchenMsg2      | 주방 메시지 2    | text   | 주방 표시 메시지 2    |
| 7   | kitchen.kitchenMsg4      | 주방 메시지 4    | text   | 주방 표시 메시지 4    |

---

## C. 기기 유형별 탭 구성

### POS (6탭, 153항목)

| 탭        | API 카테고리 | 항목 수 |
| --------- | ------------ | ------- |
| 터미널 HW | TERMINAL     | 30      |
| VAN 결제  | VAN          | 9       |
| 인쇄/출력 | POS_PRINT    | 76      |
| 판매설정  | POS_SALE     | 11      |
| 정산/마감 | POS_SETTLE   | 27      |
| 영수증    | POS_RECEIPT  | 10      |

### KIOSK (8탭, 86항목)

| 탭          | API 카테고리 | 항목 수 |
| ----------- | ------------ | ------- |
| 터미널 HW   | TERMINAL     | 30      |
| VAN 결제    | VAN          | 9       |
| 현금 결제   | SELF_CASH    | 10      |
| 봉투/저울   | SELF_BAG     | 6       |
| 자동 운영   | SELF_AUTO    | 8       |
| 포인트/알림 | SELF_POINT   | 11      |
| 인쇄/출력   | SELF_PRINT   | 4       |
| 기타        | SELF_ETC     | 8       |

### KITCHEN (2탭, 37항목)

| 탭          | API 카테고리 | 항목 수 |
| ----------- | ------------ | ------- |
| 터미널 HW   | TERMINAL     | 30      |
| 주방 메시지 | KITCHEN      | 7       |

---

## D. 전체 통계

| 분류            | 토글    | 입력(text/number) | 선택(select) | 합계    |
| --------------- | ------- | ----------------- | ------------ | ------- |
| 공통 환경설정   | 68      | 22                | 12           | **102** |
| 기기 터미널     | 5       | 19                | 6            | 30      |
| 기기 VAN        | 2       | 4                 | 3            | 9       |
| POS 인쇄/출력   | 76      | 0                 | 0            | 76      |
| POS 판매설정    | 2       | 5                 | 4            | 11      |
| POS 정산/마감   | 23      | 4                 | 0            | 27      |
| POS 영수증      | 10      | 0                 | 0            | 10      |
| KIOSK 현금      | 6       | 1                 | 3            | 10      |
| KIOSK 봉투/저울 | 3       | 1                 | 2            | 6       |
| KIOSK 자동      | 2       | 3                 | 3            | 8       |
| KIOSK 포인트    | 8       | 0                 | 3            | 11      |
| KIOSK 인쇄      | 4       | 0                 | 0            | 4       |
| KIOSK 기타      | 6       | 1                 | 1            | 8       |
| KITCHEN         | 0       | 3                 | 4            | 7       |
| **합계**        | **215** | **63**            | **41**       | **319** |
