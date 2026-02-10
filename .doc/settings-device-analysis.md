# VB6 ASIS 환경설정 - 공통/기기별 분류 분석

> 작성일: 2026-02-10
> 목적: 환경설정 재설계를 위한 ASIS 설정 항목의 **공통 vs 기기별** 분류
> ASIS 소스: `prev_kiosk/POSON_POS_SELF21/`
> 분석 범위: pos_config.ini, config.ini, Mdl_Main.bas (Type 정의 + INI_Load + S_Config_Call)

---

## 목차

1. [데이터 소스 개요](#1-데이터-소스-개요)
2. [공통 설정 (전 기기 공유)](#2-공통-설정)
3. [기기별 설정](#3-기기별-설정)
   - 3.1 터미널 하드웨어 (전 기기 개별)
   - 3.2 셀프 키오스크 전용
   - 3.3 주방 디스플레이 전용
   - 3.4 안면인식(FaceCam) 전용
   - 3.5 자판기(JaPan) 전용
   - 3.6 이미지셀프(Selfimg) 전용
   - 3.7 21인치셀프(Self21) 전용
   - 3.8 듀얼 모니터 전용
   - 3.9 POSON2 통합 기능
4. [VAN 결제 설정](#4-van-결제-설정)
5. [서버 설정 (DB: POS_Set)](#5-서버-설정-db-pos_set)
6. [매장 정보 (DB: Office_User)](#6-매장-정보-db-office_user)
7. [관리 프로그램 전용 (config.ini)](#7-관리-프로그램-전용)
8. [기기 모드 전환 로직](#8-기기-모드-전환-로직)
9. [새 설정 시스템 설계 권고](#9-새-설정-시스템-설계-권고)

---

## 1. 데이터 소스 개요

### 1.1 설정 저장소 구조

| 저장소               | 파일/테이블 | 성격                           | 항목 수            | VB6 Type                |
| -------------------- | ----------- | ------------------------------ | ------------------ | ----------------------- |
| **pos_config.ini**   | 로컬 INI    | POS 런타임 설정                | 516+ 키, 75 섹션   | C_Config, Terminal, VAN |
| **config.ini**       | 로컬 INI    | 관리 프로그램(PosManager) 설정 | 1317줄, 85+ 섹션   | (관리 프로그램)         |
| **DB: POS_Set[101]** | 서버 DB     | 서버 동기화 업무 규칙          | 78+ 값 (쉼표 구분) | S_Config                |
| **DB: Office_User**  | 서버 DB     | 매장 기본 정보                 | 40+ 컬럼           | Shop                    |

### 1.2 VB6 Type 정의 (Mdl_Main.bas)

| Type       | 필드 수 | 로딩 방식                                  | 위치            |
| ---------- | ------- | ------------------------------------------ | --------------- |
| `C_Config` | 300+    | INI_Load() → pos_config.ini                | Lines 487-791   |
| `Terminal` | 50+     | INI_Load() → pos_config.ini [Terminal]     | Lines 411-484   |
| `S_Config` | 130+    | S_Config_Call() → DB POS_Set               | Lines 794-980   |
| `Shop`     | 40+     | S_Config_Call() → DB Office_User           | Lines 340-408   |
| `VAN`      | 20+     | INI_Load() → pos_config.ini [Card]/[VAN명] | Lines 1130-1174 |

### 1.3 설정 로딩 흐름

```
App Start
  └→ INI_Path = App.Path & "\POS_CONFIG.INI"
     └→ INI_Load()
        ├→ [DataBase] → DB 연결 정보
        ├→ [Terminal] → Terminal 타입
        ├→ [Other],[Sale],[Receipt]... → C_Config 타입
        ├→ [Self] → C_Config.Self_* (67+ 키)
        ├→ [FaceCam],[JaPan],[Selfimg],[Self21] → C_Config.*
        └→ [Card],[KSNET],[KIS]... → VAN 타입
     └→ S_Config_Call()  (DB 연결 후)
        ├→ Office_User → Shop 타입
        └→ POS_Set[101] → S_Config 타입 (쉼표 구분 78값)
```

---

## 2. 공통 설정 (전 기기 공유)

> 기기 종류와 무관하게 모든 POS/키오스크에서 사용하는 설정

### 2.1 판매 운영 (INI: [Sale])

| INI 키      | VB6 변수   | 설명                   | 기본값     | 사용 화면                 |
| ----------- | ---------- | ---------------------- | ---------- | ------------------------- |
| OpenDay     | (직접 INI) | 영업 시작일            | 날짜       | Frm_Login, Frm_SaleFinish |
| S_JeonPyo   | (직접 INI) | 전표 시퀀스            | 1          | Frm_Login                 |
| St_Jeonpyo  | (직접 INI) | 전표번호               | 타임스탬프 | Frm_Login, Frm_SaleMain   |
| Befor_Tran  | (직접 INI) | 이전거래 합계          | 0          | Frm_Trans, Frm_SaleFinish |
| DataDown    | (직접 INI) | 마스터 데이터 다운로드 | 1          | INI전용                   |
| Finish_Day  | (직접 INI) | 마감일                 | 날짜       | Frm_SaleFinish            |
| Start_Price | (직접 INI) | 시재금                 | 0          | Frm_SaleFinish            |
| INOUT_Chk   | (직접 INI) | 입출 체크              | 1          | Frm_SaleFinish            |

### 2.2 영수증 정보 (INI: [Receipt])

| INI 키         | VB6 변수   | 설명        | 기본값  |
| -------------- | ---------- | ----------- | ------- |
| ShopName       | (직접 INI) | 매장명      | -       |
| ShopNumber     | (직접 INI) | 사업자번호  | -       |
| Address        | (직접 INI) | 주소        | -       |
| Owner          | (직접 INI) | 대표자명    | -       |
| Tel            | (직접 INI) | 전화번호    | -       |
| ShopName_Color | (직접 INI) | 매장명 색상 | 8421440 |
| Top5           | (직접 INI) | 상단 여백   | (빈값)  |
| Buttom5        | (직접 INI) | 하단 여백   | (빈값)  |

### 2.3 POS 업무 설정 (INI: [Other])

| INI 키                 | VB6 변수                        | 설명                   | 기본값  | 사용 화면      |
| ---------------------- | ------------------------------- | ---------------------- | ------- | -------------- |
| Price_Edit             | C_Config.Price_Edit             | 가격 수정 허용         | 0       | Frm_SaleMain   |
| Err_Write              | C_Config.Err_Write              | 에러 로깅              | 1       | 전체           |
| Product_Sound          | C_Config.Product_Sound          | 상품 스캔 소리         | 1       | Frm_SaleMain   |
| Product_CashOpen       | C_Config.Product_CashOpen       | 상품 등록시 캐시드로워 | 1       | Frm_SaleMain   |
| MaxPrice               | C_Config.MaxPrice               | 최대 결제금액          | 9999990 | Frm_SaleMain   |
| HyeonGeumPrice         | C_Config.HyeonGeumPrice         | 최대 현금금액          | 9999990 | Frm_SaleMain   |
| SaleView               | C_Config.SaleView               | 판매화면 타입          | 1       | Frm_SaleMain   |
| MisuPrint              | C_Config.MisuPrint              | 미수 출력              | 1       | Frm_SaleMain   |
| Re_Point               | C_Config.Re_Point               | 환불시 포인트 재계산   | 0       | Frm_Trans      |
| Re_Tax                 | C_Config.Re_Tax                 | 환불시 세금 재계산     | 0       | Frm_Trans      |
| Re_CashBack            | C_Config.Re_CashBack            | 환불시 캐시백 재계산   | 0       | Frm_Trans      |
| Slot_Add               | C_Config.Slot_Add               | 용지 슬롯              | 1       | Frm_Printer    |
| Cut_Position           | C_Config.Cut_Position           | 절단 위치              | 0       | Frm_Printer    |
| All_Finish             | C_Config.All_Finish             | 전체 마감              | 1       | Frm_SaleFinish |
| ENG_YN                 | C_Config.ENG_YN                 | 영어 모드              | 0       | Frm_SaleMain   |
| Grid_Fix_YN            | C_Config.Grid_Fix_YN            | 그리드 고정            | 0       | Frm_SaleMain   |
| Printer_OFF_Chk        | C_Config.Printer_Off_Chk        | 프린터 오프라인 체크   | 0       | Frm_Printer    |
| SCAN_REAL_Chk          | C_Config.SCAN_REAL_Chk          | 바코드 실시간 체크     | 0       | Frm_SaleMain   |
| OFF_CARD_Chk           | C_Config.OFF_CARD_Chk           | 오프라인 카드 사용     | 1       | Frm_SaleCard   |
| MIN_Card_Price         | C_Config.MIN_CARD_PRICE         | 최소 카드결제 금액     | 0       | Frm_SaleCard   |
| HOTKEY_ENTER_USE       | C_Config.HOTKEY_ENTER_USE       | 핫키 엔터 사용         | 0       | Frm_SaleMain   |
| HAND_CARD_YN           | C_Config.HAND_CARD_YN           | 수동 카드입력          | 0       | Frm_SaleCard   |
| OFF_CARD_KEY_USE       | C_Config.OFF_CARD_KEY_USE       | 오프라인 카드키        | 1       | Frm_SaleCard   |
| GIFT_BILL_ETC          | C_Config.GIFT_BILL_ETC          | 상품권 출력 기타       | 0       | Frm_SaleMain   |
| MEMBER_ADD_SCREEN_YN   | C_Config.MEMBER_ADD_SCREEN_YN   | 회원 추가 화면         | 0       | Frm_Member     |
| Job_Finish_Cashdraw_YN | C_Config.Job_Finish_Cashdraw_YN | 마감시 캐시드로워      | 0       | Frm_SaleFinish |
| noCVM_Bill_Print_YN    | C_Config.noCVM_Bill_Print_YN    | 비CVM 영수증 출력      | 0       | Frm_SaleCard   |
| eCard_YN               | C_Config.eCard_YN               | 전자카드 사용          | 1       | Frm_SaleCard   |
| Logo_Min_YN            | C_Config.Logo_Min_YN            | 로고 최소화            | 1       | Frm_SaleMain   |
| Total_Qty_YN           | C_Config.Total_Qty_YN           | 총 수량 표시           | 0       | Frm_SaleMain   |
| MDB_Compact_YN         | C_Config.MDB_Compact_YN         | DB 자동 컴팩트         | 0       | 시스템         |
| CARD_Timer_YN          | C_Config.CARD_Timer_YN          | 카드 타이머            | 0       | Frm_SaleCard   |
| f_Boryu_YN             | C_Config.f_Boryu_YN             | 보류 사용              | 0       | Frm_SaleMain   |
| Touch_HotKey_Opt       | C_Config.Touch_HotKey_Opt       | 터치 핫키 옵션         | 0       | Frm_SaleMain   |
| Boryu_Tran_Opt         | C_Config.Boryu_Tran_Opt         | 보류 거래 옵션         | 0       | Frm_SaleMain   |
| Day_F_Msg_Opt          | C_Config.Day_F_Msg_Opt          | 일마감 메시지 옵션     | 0       | Frm_SaleFinish |
| Sale_Finish_Opt        | C_Config.Sale_Finish_Opt        | 판매 마감 옵션         | 0       | Frm_SaleFinish |
| Card_Wav_Opt           | C_Config.Card_Wav_Opt           | 카드 결제 소리         | 0       | Frm_SaleCard   |
| Card_View              | C_Config.Card_View              | 카드 표시              | 0       | Frm_SaleCard   |
| Gift_Input_YN          | C_Config.Gift_Input_YN          | 상품권 입력            | 0       | Frm_SaleMain   |
| reTranBill_Print_1_YN  | C_Config.reTranBill_Print_1_YN  | 재거래 영수증 출력     | 0       | Frm_Trans      |
| Grade_Memo_YN          | C_Config.Grade_Memo_YN          | 등급 메모              | 0       | Frm_SaleMain   |
| Order_Call_YN          | C_Config.Order_Call_YN          | 주문 호출              | 0       | Frm_SaleMain   |
| Point_Bill_Print_YN    | C_Config.Point_Bill_Print_YN    | 포인트 영수증 출력     | 1       | Frm_SaleMain   |
| no_Bill_fMessage_YN    | C_Config.no_Bill_fMessage_YN    | 무영수증 메시지        | 0       | Frm_SaleMain   |
| no_Bill_fSound_YN      | C_Config.no_Bill_fSound_YN      | 무영수증 소리          | 0       | Frm_SaleMain   |
| no_Bill_CusPoint_YN    | C_Config.no_Bill_CusPoint_YN    | 무영수증 포인트        | 0       | Frm_SaleMain   |
| Grid_SaleEx            | C_Config.Grid_SaleEx            | 판매 그리드 확장       | 0       | Frm_SaleMain   |
| InfoDesk_YN            | C_Config.InfoDesk_YN            | 안내데스크 모드        | 0       | Frm_SaleMain   |
| InfoDesk_ViewAll       | C_Config.InfoDesk_ViewAll       | 안내데스크 전체보기    | 1       | Frm_SaleMain   |
| Price_11_YN            | C_Config.Price_11_YN            | 3단 가격 표시          | 0       | Frm_SaleMain   |
| SCANCOP                | C_Config.SCANCOP                | 스캔 복사              | 0       | Frm_SaleMain   |
| Process_Method         | C_Config.SLock_Use              | 화면잠금 사용          | 0       | Frm_SaleMain   |
| Delay                  | C_Config.Delay                  | 지연 설정              | 1       | Frm_SaleMain   |
| mDown_YN               | C_Config.mDown_YN               | 마스터 다운로드 사용   | 1       | Frm_DownLoad   |
| mDown_Week             | C_Config.mDown_Week             | 다운로드 주기(주)      | 2       | Frm_DownLoad   |
| New_Item_Update        | C_Config.New_Item_Update        | 신규상품 업데이트      | 0       | Frm_DownLoad   |
| Free_Opt               | C_Config.Free_Opt               | 무료 옵션              | 0       | Frm_SaleMain   |

### 2.4 색상 설정 (INI: [Sale_Color], [Sale_MEMColor])

| INI 키                 | 설명                | 기본값             |
| ---------------------- | ------------------- | ------------------ |
| Default_YN             | 기본색 사용여부     | 2                  |
| Param1~5               | 판매화면 색상 1~5   | 16711680,0,0,0,255 |
| NewParam1~5            | 새판매화면 색상 1~5 | 16711680,0,0,0,255 |
| [Sale_MEMColor] Param1 | 회원 색상           | 0                  |

### 2.5 폰트 설정 (INI: [Sale_Font], [NewSale_Font])

| INI 키   | 설명     | 기본값                  |
| -------- | -------- | ----------------------- |
| Font     | 폰트명   | 기본폰트                |
| FontSize | 폰트크기 | 14 (Sale), 11 (NewSale) |

### 2.6 애플리케이션 정보 (INI: [Application])

| INI 키       | 설명          | 기본값       |
| ------------ | ------------- | ------------ |
| Pro_Name     | 프로그램명    | POSON        |
| Pro_Buttom   | 하단 텍스트   | CopyRight... |
| Font_Add     | 폰트 추가     | 1            |
| Backup_Month | 백업 주기(월) | 6            |

### 2.7 기타 공통 (INI: 기타 섹션)

| INI 섹션      | INI 키         | 설명           | 기본값 |
| ------------- | -------------- | -------------- | ------ |
| [INI_Pass]    | DelKey         | 삭제 키        | 0      |
| [Backup]      | Path           | 백업 경로      | I:\    |
| [Update_Data] | Convert_chk    | 변환 체크      | 1      |
| [Option]      | Manual_YN      | 수동 모드      | 1      |
| [MEMBER_ADD]  | Tax_Option     | 세금 옵션      | 1      |
| [Product_Add] | Update_Option  | 업데이트 옵션  | 1      |
| [Tag_Print]   | Size_Print     | 태그 인쇄 크기 | 1      |
| [shop_chk]    | TT_yn          | 매장 체크      | 1      |
| [Config]      | Screen_Hide_YN | 화면 숨김      | 0      |

---

## 3. 기기별 설정

### 3.1 터미널 하드웨어 (INI: [Terminal]) - **모든 기기 개별 설정**

> 기기마다 다른 하드웨어 구성을 가지므로 **기기별 개별 값**

| INI 키             | VB6 변수                    | 설명                | 기본값 | 비고      |
| ------------------ | --------------------------- | ------------------- | ------ | --------- |
| terminaltype       | Terminal.Type               | 기기 종류           | 0      | 0=일반POS |
| PosNo              | Terminal.PosNo              | POS 번호            | 01     | 2자리     |
| AdminPosNo         | Terminal.AdminPosNo         | 관리자 POS번호      | z      |           |
| cashdraw           | Terminal.CashDraw           | 캐시드로워          | 1      | 0/1       |
| touch              | Terminal.Touch              | 터치스크린          | 1      | 0/1       |
| dual               | Terminal.Dual               | 듀얼 모니터         | 1      | 0/1       |
| dual_type          | Terminal.Dual_Type          | 듀얼 유형           | 0      |           |
| printer            | Terminal.Printer            | 프린터 종류         | 4      |           |
| Printer_Port       | Terminal.PrinterPort        | 프린터 포트         | 3      |           |
| Printer_Serial_Bps | Terminal.PrinterBps         | 프린터 전송속도     | 9600   |           |
| scan_Name          | Terminal.ScanName           | 스캐너 종류         | 1      |           |
| scan_port          | Terminal.ScanPort           | 스캐너 포트         | 0      | COM포트   |
| HandScan_Port      | Terminal.HandScan_Port      | 핸드스캐너 포트     | 0      |           |
| MSR_Port           | Terminal.MSR_PORT           | 카드리더 포트       | 0      |           |
| MSR_BPS            | Terminal.MSR_BPS            | 카드리더 전송속도   | 9600   |           |
| cdpname            | Terminal.CDPName            | 고객표시기명        | -      |           |
| cdp_port           | Terminal.CDPPort            | 고객표시기 포트     | 0      |           |
| cdpline            | Terminal.CDPLine            | 고객표시기 라인     | 1      |           |
| cdptype            | Terminal.CDPType            | 고객표시기 종류     | -      |           |
| CDP_BPS            | Terminal.CDP_BPS            | 고객표시기 전송속도 | 9600   |           |
| CDP_CASH_YN        | Terminal.CDP_CASH_YN        | CDP 현금표시        | 0      |           |
| coin_Name          | Terminal.CoinName           | 동전교환기 종류     | 0      |           |
| Coin_port          | Terminal.CoinPort           | 동전교환기 포트     | 0      |           |
| moniter            | Terminal.Moniter            | 메인 모니터         | 0      |           |
| s_moniter          | Terminal.SMoniter           | 서브 모니터         | 0      |           |
| Printer_CAT_USE    | Terminal.Printer_CAT_USE    | CAT 프린터 사용     | 0      |           |
| CAT_Port           | Terminal.CAT_PORT           | CAT 포트            | 0      |           |
| CAT_BPS            | Terminal.CAT_BPS            | CAT 전송속도        | 38400  |           |
| CBO_ScalePort      | Terminal.CBO_ScalePort      | 저울 포트           | 1      |           |
| SuPyo_Port         | Terminal.SuPyo_Port         | 수표 포트           | 0      |           |
| KitchenPrint       | Terminal.kitchenPrint       | 주방프린터 종류     | 4      |           |
| KitchenPrintPort   | Terminal.kitchenPrinterPort | 주방프린터 포트     | 7      |           |
| KitchenPrintBps    | Terminal.kitchenPrinterBps  | 주방프린터 전송속도 | 9600   |           |
| Kitchen_fontsize   | Terminal.Kitchen_fontsize   | 주방 폰트크기       | 0      |           |
| Bell_YN            | Terminal.Bell_YN            | 벨 사용             | 0      |           |
| Bell_Type          | Terminal.Bell_Type          | 벨 종류             | 0      |           |
| Bell_ComPort       | Terminal.Bell_ComPort       | 벨 COM포트          | 0      |           |
| Bell_Name          | Terminal.Bell_Name          | 벨 이름             | 0      |           |
| Bell_fID           | Terminal.Bell_fID           | 벨 시설ID           | 0      |           |
| Bell_fID_YN        | Terminal.Bell_fID_YN        | 벨 시설ID 사용      | 0      |           |
| Bell_LEN           | Terminal.Bell_LEN           | 벨 번호 길이        | 0      |           |

### 3.2 셀프 키오스크 전용 (INI: [Self]) - **67+ 키**

> `C_Config.Self_YN = "1"` 일 때만 활성화. Self_YN="0"이면 일부 강제 비활성화됨

#### 3.2.1 핵심 모드

| INI 키                | VB6 변수         | 설명             | 기본값 |
| --------------------- | ---------------- | ---------------- | ------ |
| (→[Other] SelfPos_YN) | C_Config.Self_YN | 셀프 모드 ON/OFF | 1      |

#### 3.2.2 현금 결제

| INI 키           | VB6 변수                  | 설명               | 기본값 | 사용 화면     |
| ---------------- | ------------------------- | ------------------ | ------ | ------------- |
| self_Cash        | C_Config.self_Cash        | 현금 결제 사용     | 1      | Frm_SelfCash  |
| self_CashPort    | C_Config.self_CashPort    | 현금기 COM포트     | 0      | Frm_SelfCash  |
| self_CashSleep   | C_Config.self_CashSleep   | 현금기 대기시간    | 0      | Frm_SelfCash  |
| self_CashPhonNum | C_Config.self_CashPhonNum | 현금기 연락처      | -      | Frm_SelfCash  |
| self_CashGubun   | C_Config.self_CashGubun   | 현금기 종류        | 1      | Frm_SelfCash  |
| self_NoHyunYoung | C_Config.self_NoHyunYoung | 실결제금액 숨김    | 0      | Frm_SelfCash  |
| self_OneHPUse    | C_Config.self_OneHPUse    | 1만원권 사용       | 0      | Frm_SelfCash  |
| self_50HPUse     | C_Config.self_50HPUse     | 5만원권 사용       | 0      | Frm_SelfCash  |
| self_10000Use    | C_Config.self_10000Use    | 만원권 사용        | 0      | Frm_SelfCash  |
| Self_Card        | C_Config.self_NoCardUse   | 카드 결제 비활성화 | 0      | Frm_SelfKiosk |

#### 3.2.3 봉투/저울

| INI 키           | VB6 변수                  | 설명             | 기본값 | 사용 화면     |
| ---------------- | ------------------------- | ---------------- | ------ | ------------- |
| self_BagPort     | C_Config.self_BagPort     | 봉투 감지 포트   | 0      | Frm_SelfKiosk |
| self_StartBag    | C_Config.self_StartBag    | 시작시 봉투 표시 | 0      | Frm_SelfKiosk |
| Self_MBagSell    | C_Config.Self_MBagSell    | 복수 봉투 판매   | 1      | Frm_SelfKiosk |
| self_LastBag     | C_Config.self_LastBag     | 마지막 봉투      | 1      | Frm_SelfKiosk |
| Self_ScalePort   | C_Config.self_ScalePort   | 저울 COM포트     | 0      | frm_Scale     |
| Self_ScaleLimitG | C_Config.Self_ScaleLimitG | 저울 무게 한도   | 0      | frm_Scale     |

#### 3.2.4 STL(Security Tag Line)

| INI 키        | VB6 변수                    | 설명              | 기본값 |
| ------------- | --------------------------- | ----------------- | ------ |
| STLGoods      | C_Config.Self_STLGoods      | STL 상품 등록     | 0      |
| STLNoGoods    | C_Config.Self_STLNoGoods    | STL 미등록 상품   | 0      |
| STLGoodsNo    | C_Config.self_STLGoodsNo    | STL 상품번호      | 0      |
| STLSoundAdmin | C_Config.Self_STLSoundAdmin | STL 관리자 알림음 | 0      |
| STLPort       | C_Config.Self_STLPort       | STL COM포트       | -      |
| Bell          | C_Config.Self_Bell          | 셀프 벨           | 0      |

#### 3.2.5 고객 인터페이스

| INI 키            | VB6 변수                   | 설명              | 기본값 | 사용 화면          |
| ----------------- | -------------------------- | ----------------- | ------ | ------------------ |
| SoundGuide        | C_Config.Self_SoundGuide   | 음성 안내         | 1      | Frm_SelfKiosk      |
| Self_CusNum4      | C_Config.Self_CusNum4      | 회원번호 4자리    | 1      | Frm_SelfKiosk      |
| self_NoCustomer   | C_Config.self_NoCustomer   | 비회원 판매 허용  | 0      | frm_SelfNoCustomer |
| self_CusSelect    | C_Config.self_CusSelect    | 고객 선택 방식    | 1      | Frm_SelfKiosk      |
| CusAddUse         | C_Config.CusAddUse         | 고객 추가 사용    | 0      | frm_SelfCusAdd     |
| Self_CusAddEtc    | C_Config.Self_CusAddEtc    | 고객 추가 기타    | 0      | frm_SelfCusAdd     |
| CusTopMsg         | C_Config.Self_CusTopMsg    | 고객 상단 메시지  | (빈값) | Frm_SelfKiosk      |
| CusBTMsg1         | C_Config.Self_CusBTMsg1    | 고객 버튼 메시지1 | (빈값) | Frm_SelfKiosk      |
| CusBTMsg2         | C_Config.Self_CusBTMsg2    | 고객 버튼 메시지2 | (빈값) | Frm_SelfKiosk      |
| self_TouchSoundYN | C_Config.self_TouchSoundYN | 터치 소리         | 1      | Frm_SelfKiosk      |

#### 3.2.6 자동 운영 (무인 모드)

| INI 키         | VB6 변수                | 설명           | 기본값 |
| -------------- | ----------------------- | -------------- | ------ |
| Auto_Open_YN   | C_Config.Auto_Open_YN   | 자동 개점      | 0      |
| Auto_Finish_YN | C_Config.Auto_finish_YN | 자동 마감      | 0      |
| Auto_Day       | C_Config.Auto_Day       | 자동 운영 날짜 | 날짜   |
| Auto_AP        | C_Config.Auto_AP        | AM/PM          | 0      |
| Auto_HH        | C_Config.Auto_HH        | 시             | 00     |
| Auto_MM        | C_Config.auto_MM        | 분             | 00     |
| Auto_ID        | C_Config.Auto_ID        | 자동 로그인 ID | 1      |
| Auto_Pass      | C_Config.Auto_Pass      | 자동 로그인 PW | 1      |

> **주의**: `Self_YN="0"`이면 `Auto_finish_YN` 강제 "0" (Line 5169)

#### 3.2.7 포인트/알림

| INI 키            | VB6 변수                   | 설명              | 기본값 |
| ----------------- | -------------------------- | ----------------- | ------ |
| self_NoAutoPoint  | C_Config.self_NoAutoPoint  | 자동포인트 비활성 | 0      |
| self_PointZero    | C_Config.self_PointZero    | 포인트 초기화     | 0      |
| self_PointHidden  | C_Config.self_PointHidden  | 포인트 숨김       | 0      |
| Self_PointSMSUse  | C_Config.Self_PointSMSUse  | 포인트 SMS        | 0      |
| Self_UserCall     | C_Config.Self_UserCall     | 직원호출          | 0      |
| Self_SMSAdmin     | C_Config.Self_SMSAdmin     | 관리자 SMS        | 1      |
| Self_Kakao        | C_Config.Self_Kakao        | 카카오 알림       | 1      |
| Self_Zero         | C_Config.Self_Zero         | 제로클릭 알림     | 1      |
| self_CusAlarmUse  | C_Config.self_CusAlarmUse  | 고객 알람 사용    | 1      |
| Self_CusAlarmTime | C_Config.Self_CusAlarmTime | 고객 알람 시간    | 0      |
| self_SNSGubun     | C_Config.self_SNSGubun     | SNS 구분          | 0      |

#### 3.2.8 UI/화면

| INI 키           | VB6 변수                  | 설명             | 기본값 |
| ---------------- | ------------------------- | ---------------- | ------ |
| Self_MainPage    | C_Config.self_MainPage    | 메인페이지 표시  | 1      |
| Self_BTInit      | C_Config.self_BTInit      | 초기화 버튼 표시 | 1      |
| Self_OneCancel   | C_Config.Self_OneCancel   | 개별취소 버튼    | 1      |
| Self_zHotKey     | C_Config.Self_zHotKey     | Z핫키 사용       | 1      |
| self_CountYN     | C_Config.self_CountYN     | 계수버튼 표시    | 1      |
| self_StartHotKey | C_Config.self_StartHotKey | 시작 핫키        | 0      |
| self_PriceUse    | C_Config.self_PriceUse    | 가격 조정 사용   | 0      |
| self_PriceType   | C_Config.self_PriceType   | 가격 유형        | 0      |
| Self_Reader      | C_Config.self_Reader      | ID 리더기 유형   | 2      |

#### 3.2.9 인쇄/출력

| INI 키            | VB6 변수                   | 설명          | 기본값 |
| ----------------- | -------------------------- | ------------- | ------ |
| Self_AutoPrint    | C_Config.Self_AutoPrint    | 자동 출력     | 0      |
| self_StoPrint     | C_Config.self_StoPrint     | 출력 중지     | 0      |
| self_PrintAddress | C_Config.self_PrintAddress | 주소 출력     | 0      |
| self_PrintPhon    | C_Config.self_PrintPhon    | 전화번호 출력 | 0      |

#### 3.2.10 기타 셀프

| INI 키           | VB6 변수                  | 설명                | 기본값 |
| ---------------- | ------------------------- | ------------------- | ------ |
| Self_JPYN        | C_Config.Self_JPYN        | 일본 모드(동전교환) | 0      |
| self_BagJPPort   | C_Config.self_BagJPPort   | JP 봉투 포트        | 0      |
| Self_NoAutoGoods | C_Config.Self_NoAutoGoods | 자동상품 비활성     | 0      |
| self_AppCard     | C_Config.self_AppCard     | 앱카드 사용         | 0      |
| self_Apple       | C_Config.self_Apple       | 애플페이            | 0      |
| Self_CamUse      | C_Config.Self_CamUse      | 카메라 사용         | 1      |
| self_ICSiren     | C_Config.self_ICSiren     | IC 사이렌           | 0      |
| Self_Gif         | C_Config.Self_Gif         | GIF 파일 경로       | -      |
| Self_NoGoodsList | (직접)                    | 미판매 상품 목록    | -      |

### 3.3 주방 디스플레이 전용

> Terminal 하드웨어 설정의 Kitchen 계열 + Shop 메시지

| 설정 위치    | 키               | VB6 변수                    | 설명                |
| ------------ | ---------------- | --------------------------- | ------------------- |
| [Terminal]   | KitchenPrint     | Terminal.kitchenPrint       | 주방프린터 종류     |
| [Terminal]   | KitchenPrintPort | Terminal.kitchenPrinterPort | 주방프린터 포트     |
| [Terminal]   | KitchenPrintBps  | Terminal.kitchenPrinterBps  | 주방프린터 전송속도 |
| [Terminal]   | Kitchen_fontsize | Terminal.Kitchen_fontsize   | 주방 폰트크기       |
| [Shop] (INI) | KitchenMsg1      | Shop.kitchenMsg1            | 주방 메시지 1       |
| [Shop] (INI) | KitchenMsg2      | Shop.kitchenMsg2            | 주방 메시지 2       |
| [Shop] (INI) | KitchenMsg4      | Shop.kitchenMsg4            | 주방 메시지 4       |

> 사용 화면: `Frm_KitchenInfo.frm`

### 3.4 안면인식(FaceCam) 전용 (INI: [FaceCam])

| INI 키      | VB6 변수                     | 설명          | 기본값 | 사용 화면    |
| ----------- | ---------------------------- | ------------- | ------ | ------------ |
| Use         | C_Config.FaceCam_USE         | 안면인식 사용 | 0      | Frm_SaleMain |
| TimeOut_Use | C_Config.FaceCam_TimeOut_USE | 타임아웃 사용 | 0      | Frm_SaleMain |
| Dealy       | C_Config.FaceCam_Dealy       | 지연시간(초)  | 1      | Frm_SaleMain |
| TimeOut_Sec | C_Config.FaceCam_TimeOut_Sec | 타임아웃(초)  | 120    | Frm_SaleMain |

> S_Config (DB)에도 관련 설정: `FACE_ADD_Point_Chk`, `FACE_ADD_Point`

### 3.5 자판기(JaPan) 전용 (INI: [JaPan])

| INI 키         | VB6 변수    | 설명          | 기본값 |
| -------------- | ----------- | ------------- | ------ |
| Auto_Open_YN   | (JaPan전용) | 자동 개점     | 0      |
| jp_Port1       | (JaPan전용) | 자판기 포트1  | 0      |
| jp_Port2       | (JaPan전용) | 자판기 포트2  | 0      |
| jp_StoYN       | (JaPan전용) | 재고관리      | 0      |
| jp_oneSell     | (JaPan전용) | 단일상품 판매 | 0      |
| jp_FirstPage   | (JaPan전용) | 첫페이지      | 0      |
| jp_SellPriShow | (JaPan전용) | 판매가 표시   | 0      |

### 3.6 이미지셀프(Selfimg) 전용 (INI: [Selfimg])

| INI 키              | VB6 변수      | 설명              | 기본값 |
| ------------------- | ------------- | ----------------- | ------ |
| ScanUse             | (Selfimg전용) | 스캔 사용         | 0      |
| onlyShop            | (Selfimg전용) | 매장전용 판매     | 0      |
| prepayment          | (Selfimg전용) | 선결제 사용       | 1      |
| selfImg_TableNoUse  | (Selfimg전용) | 테이블번호 미사용 | 0      |
| selfImg_TableNumUse | (Selfimg전용) | 테이블숫자 사용   | 0      |
| self_SNSGubun       | (Selfimg전용) | SNS 구분 (중복)   | 0      |

### 3.7 21인치셀프(Self21) 전용 (INI: [Self21])

| INI 키           | VB6 변수     | 설명                 | 기본값 |
| ---------------- | ------------ | -------------------- | ------ |
| Self21_CountYN   | (Self21전용) | 계수 사용            | 0      |
| slef21_DCVisible | (Self21전용) | 할인 표시            | 0      |
| self_CusAddEtc   | (Self21전용) | 고객추가 기타 (중복) | 0      |

### 3.8 듀얼 모니터 전용 (INI: [Dual_Msg])

| INI 키           | 설명              | 기본값                  |
| ---------------- | ----------------- | ----------------------- |
| DTop0            | 듀얼 상단 메시지0 | 쇼핑을 시작하시려면...  |
| DTop0_Color      | 상단0 색상        | 32896                   |
| DTop1            | 듀얼 상단 메시지1 | 이용약관...             |
| DTop1_Color      | 상단1 색상        | 32896                   |
| DButtom0_Color~4 | 하단 색상 0~4     | 255,255,255,16384,65280 |

> `Terminal.Dual = 1`이고 `Terminal.Dual_Type`에 따라 활성화

### 3.9 POSON2 통합 기능

#### 3.9.1 UPS 무정전 관리 (INI: [POSON2_UPSS])

| INI 키      | VB6 변수                         | 설명        | 기본값 |
| ----------- | -------------------------------- | ----------- | ------ |
| USE         | C_Config.POSON2_UPSS_USE         | UPS 사용    | 0      |
| SMS_USE     | C_Config.POSON2_UPSS_SMS_USE     | SMS 알림    | 0      |
| MSG_USE     | C_Config.POSON2_UPSS_MSG_USE     | 메시지 알림 | 1      |
| Recv_Mobile | C_Config.POSON2_UPSS_Recv_Mobile | 수신 번호   | (빈값) |

#### 3.9.2 자동 로그인 (INI: [POSON2_Login])

| INI 키 | VB6 변수               | 설명            | 기본값 |
| ------ | ---------------------- | --------------- | ------ |
| USE    | C_Config.aLogin_USE    | 자동로그인 사용 | 0      |
| sMoney | C_Config.aLogin_sMoney | 시재금          | 0      |
| ID     | C_Config.aLogin_ID     | 로그인 ID       | (빈값) |

#### 3.9.3 웹소켓 (INI: [POSON2_wSock])

| INI 키   | VB6 변수 | 설명        | 기본값 |
| -------- | -------- | ----------- | ------ |
| USE_YN   | (직접)   | 웹소켓 사용 | 0      |
| TCP_PORT | (직접)   | TCP 포트    | 9801   |

---

## 4. VAN 결제 설정

### 4.1 공통 VAN 설정 (INI: [Card])

| INI 키          | VB6 변수            | 설명            | 기본값 |
| --------------- | ------------------- | --------------- | ------ |
| VAN_Select      | VAN.Selected        | VAN사 선택      | 4      |
| SingPad_Port    | VAN.SingPad_Port    | 서명패드 포트   | 0      |
| CashBack_YN     | VAN.CashBack_YN     | 캐시백 사용     | 1      |
| OCash_Screen_YN | VAN.OCash_Screen_YN | 온라인현금 화면 | 0      |
| Log_Delete      | (직접)              | 로그 삭제       | 1      |

### 4.2 VAN사별 설정 (12개 VAN)

> 각 VAN사마다 공통 구조: IP/Port(공통값), DANMALNO/Snumber(기기별 값)

| VAN사   | INI 섹션  | IP(공통)          | Port(공통) | DANMALNO(기기별) | Snumber(기기별) |
| ------- | --------- | ----------------- | ---------- | ---------------- | --------------- |
| KSNET   | [KSNET]   | 210.181.28.137    | 9562       | O                | O               |
| KIS     | [KIS]     | -                 | -          | O(암호화)        | O               |
| KMPS    | [KMPS]    | -                 | -          | O                | O               |
| SMARTRO | [SMARTRO] | 211.192.50.244    | 5801       | O                | O               |
| StarVAN | [StarVAN] | -                 | -          | O                | O               |
| NICE    | [NICE]    | 211.33.136.2      | 7709       | O                | O               |
| JTNet   | [JTNet]   | 211.48.96.28      | 11025      | O                | -               |
| KICC    | [KICC]    | 203.233.72.21     | 15700      | O                | -               |
| KCB     | [KCB]     | -                 | -          | O                | O               |
| KOVAN   | [KOVAN]   | 203.231.12.152    | 10902      | O(암호화)        | O               |
| KOCES   | [KOCES]   | 211.192.167.38    | 10015      | O                | -               |
| KCP     | [KCP]     | 203.238.36.152    | 9976       | O                | -               |
| KFTC    | [KFTC]    | www.kftcvan.or.kr | -          | O                | SeqNo           |

> **분류**: IP/Port는 **공통**(VAN사에서 제공), DANMALNO/Snumber는 **기기별**(가맹점 단말기마다 고유)

### 4.3 VAN별 추가 설정

| VAN사 | 추가 키                    | 설명                    | 성격   |
| ----- | -------------------------- | ----------------------- | ------ |
| KSNET | SingPad_BPS, USB_YN        | 서명패드 속도, USB      | 기기별 |
| KIS   | Pos_Number                 | POS 번호(암호화)        | 기기별 |
| KICC  | SingPad_BPS, SingCall_Type | 서명패드 속도, 호출방식 | 기기별 |
| NICE  | Dll_Chk                    | DLL 체크                | 공통   |
| KOVAN | Dll_Chk                    | DLL 체크                | 공통   |
| KCP   | Dll_Chk                    | DLL 체크                | 공통   |
| KOCES | SingPad_Name               | 서명패드 모델명         | 기기별 |

---

## 5. 서버 설정 (DB: POS_Set[101]) - S_Config

> 서버 DB에 저장되어 **전 기기에서 공유**하는 업무 규칙 (130+ 필드)

### 5.1 주요 S_Config 필드 (POS_Set[101] 인덱스)

| 인덱스  | VB6 변수                | 설명              | 기본값 | 성격 |
| ------- | ----------------------- | ----------------- | ------ | ---- |
| [0]     | S_Config.Group_Print    | 그룹별 출력       | 0      | 공통 |
| [1]     | S_Config.Money          | 금액 표시         | 0      | 공통 |
| [2]     | S_Config.NewProduct     | 신규상품          | 0      | 공통 |
| [3]     | S_Config.PrintLine      | 출력 라인(1/2줄)  | 0      | 공통 |
| [4]     | S_Config.Cash_Pass      | 현금 비밀번호     | 1      | 공통 |
| [5]     | S_Config.Price_Zero     | 0원 판매 허용     | 0      | 공통 |
| [6]     | S_Config.Sale_Point     | 판매 포인트       | 0      | 공통 |
| [7]     | S_Config.Weight_Point   | 중량 포인트       | 0      | 공통 |
| [8]     | S_Config.CancelAll      | 전체취소          | 0      | 공통 |
| [9]     | S_Config.JeonPyo        | 전표 사용         | 0      | 공통 |
| [10]    | S_Config.Tran           | 거래 사용         | 0      | 공통 |
| [11]    | S_Config.Boryu_Print    | 보류 출력         | 0      | 공통 |
| [12]    | S_Config.Card_CashOpen  | 카드시 캐시드로워 | 1      | 공통 |
| [13]    | S_Config.CancelAll_Bigo | 전체취소 비고     | 0      | 공통 |
| [14]    | S_Config.No_Credit      | 외상 불가         | 1      | 공통 |
| [15]    | S_Config.Print_Barcode  | 바코드 출력       | 1      | 공통 |
| [16]    | S_Config.Print_VAT      | 부가세 출력       | 1      | 공통 |
| [17]    | S_Config.Bott_Print     | 하단 합계 출력    | 0      | 공통 |
| [18]    | VAN.CashBack_YN         | 캐시백 사용       | 1      | 공통 |
| [19]    | S_Config.InPriView      | 매입가 표시       | 1      | 공통 |
| [20]    | S_Config.Grouping       | 상품 그룹핑       | 0      | 공통 |
| [21]    | S_Config.BanPum_PassChk | 반품 비밀번호     | 0      | 공통 |
| [22]    | S_Config.MEMPrice_Chk   | 회원 한도 체크    | 0      | 공통 |
| [23]    | S_Config.Card_Detail    | 카드 상세 출력    | 0      | 공통 |
| [24]    | S_Config.SuPyo_Print    | 수표 출력         | 0      | 공통 |
| [25]    | S_Config.Tran_Point     | 거래 포인트       | 0      | 공통 |
| [26-78] | (다양)                  | 기타 업무 규칙    | 다양   | 공통 |

### 5.2 별도 컬럼 S_Config

| DB 컬럼       | VB6 변수               | 설명             | 기본값 |
| ------------- | ---------------------- | ---------------- | ------ |
| [102]         | S_Config.Group_Sel     | 그룹 선택(대/중) | 0      |
| POS_Count     | S_Config.POS_Count     | POS 대수         | 99     |
| Tran_PointPer | S_Config.Tran_PointPer | 거래 포인트율    | 100    |
| Dec_PointPer  | S_Config.Dec_PointPer  | 차감 포인트율    | 100    |

### 5.3 S_Config 추가 필드 (인덱스 26+)

| 인덱스    | VB6 변수                     | 설명                  |
| --------- | ---------------------------- | --------------------- |
| [26]      | S_Config.Sale_CashbackPoint  | 캐시백 포인트 적립    |
| [27]      | S_Config.HyeonGeum_Chk       | 현금 처리시 강제입력  |
| [28]      | S_Config.Print_ShopBarcode   | 매장바코드 출력       |
| [29]      | S_Config.Print_SignJeonpyo   | 서명패드 전표 출력    |
| [30]      | S_Config.TranJeonpyo2_YN     | 반품 전표 2매         |
| [31]      | S_Config.Resend_BarcodeYN    | 재전송 바코드         |
| [32]      | S_Config.Jeonpyo_HiddenYN    | 전표번호 숨김         |
| [33]      | S_Config.InTran_JeonpyoYN    | 입금 전표 사용        |
| [34-41]   | S*Config.LU*\*               | 럭키유저 설정 8종     |
| [42-44]   | S_Config.LU_Opt1/2, LU_Price | 럭키유저 옵션         |
| [45]      | S_Config.Tran_Pointchk       | 반품 포인트 체크      |
| [46]      | S_Config.Finish_TranChk      | 마감 거래 불가        |
| [47-48]   | S_Config.MEM_DecList_YN/Msg  | 회원 차감 목록/메시지 |
| [49-50]   | S_Config.Dec_PointChk/Per    | 차감 포인트 체크      |
| [51-53]   | S*Config.Change*\*/Seq_Print | 거스름돈/순차출력     |
| [54]      | S_Config.BanPum_Chk          | 반품 전표 확인        |
| [55]      | S_Config.BoryuMsg_View       | 보류 메시지 표시      |
| [56]      | S_Config.Scale_18_YN         | 18자리 저울 바코드    |
| [57]      | S_Config.Boryu_Detail        | 보류 상세 표시        |
| [58-61]   | S*Config.Min*\*              | 최소금액 출력/포인트  |
| [62]      | S_Config.Tax_Auto            | 세금 자동발행         |
| [63]      | S_Config.Profit_Msg          | 이익 메시지           |
| [64]      | S_Config.SaleMsg_YN          | 판매 메시지           |
| [65]      | S_Config.Goods_Use           | 판매시 재고 사용      |
| [237]     | S_Config.Tax_Gubun_View      | 세금 구분 표시        |
| [241]     | S_Config.POS_Smoney          | POS 준비금            |
| [242-243] | S*Config.FACE_ADD_Point*\*   | 안면인식 포인트       |
| [245]     | S_Config.DEC_MEMO_Chk        | 차감 메모 체크        |
| [252-256] | S*Config.SalePrice_MSG*\*    | 판매금액 메시지       |

---

## 6. 매장 정보 (DB: Office_User) - Shop

> 서버 DB에 저장되어 **전 기기에서 공유**

| DB 컬럼           | VB6 변수                | 설명            | 성격         |
| ----------------- | ----------------------- | --------------- | ------------ |
| OFFICE_NAME       | Shop.name               | 매장명          | 공통         |
| office_num        | Shop.Number             | 사업자번호      | 공통         |
| owner_name        | Shop.Owner              | 대표자명        | 공통         |
| office_tel1       | Shop.Tel                | 전화번호        | 공통         |
| address1+2        | Shop.Address            | 주소            | 공통         |
| sto_cd            | Shop.Code               | 매장코드        | 공통         |
| version           | Shop.Ver                | 버전            | 공통         |
| OFFICE_NAME2      | Shop.Prn_Name           | 출력용 매장명   | 공통         |
| Online_KEY        | Shop.Online_KEY         | 온라인 키       | 공통         |
| eBill_sms_yn      | Shop.SMS_YN             | SMS 사용        | 공통         |
| eBill_auto_sms_yn | Shop.AUTO_SMS_YN        | 자동 SMS        | 공통         |
| eBill_push_yn     | Shop.Push_YN            | 푸시 사용       | 공통         |
| eBill_push_title  | Shop.Push_title         | 푸시 제목       | 공통         |
| eBill_push_msg    | Shop.Push_msg           | 푸시 메시지     | 공통         |
| eBill_push_link   | Shop.Push_link          | 푸시 링크       | 공통         |
| en_use            | Shop.sCustmer_Encrypt   | 고객 암호화     | 공통         |
| strBarcode_YN     | Shop.sXBarcode_Use      | 확장바코드      | 공통         |
| selfPos_Hotkey1~4 | Shop.sSelfPos_Hotkey1~4 | 셀프 핫키 1~4   | **셀프전용** |
| SMS_GUBUN         | Shop.self_SNSGubun      | SNS 구분        | **셀프전용** |
| kitchenMsg1~5     | Shop.kitchenMsg1~5      | 주방 메시지 1~5 | **주방전용** |

---

## 7. 관리 프로그램 전용 (config.ini)

> POS 런타임과 무관. PosManager.EXE에서만 사용

| 섹션              | 주요 키                            | 설명                  | 항목 수  |
| ----------------- | ---------------------------------- | --------------------- | -------- |
| [Application]     | ProgramName, DPath, Internet...    | 관리프로그램 설정     | 76       |
| [Server]          | Server_IP, Server_Fort, Catalog... | DB 연결 정보          | 15       |
| [Version_Info]    | Sys_Gubun, Loc_Version...          | 버전 정보             | 7        |
| [BarCodePrint]    | PORT, B_Name, H, W...              | 바코드 프린터 공통    | 40+      |
| [TTP-243] 등 15종 | GNAMEXY, BARCODEXY...              | 각 프린터 모델별 좌표 | 각 15~30 |
| [HT_Trans]        | BCP_USE, ALL_Tran...               | 데이터 전송           | 7        |
| [WEBSMS_Sett]     | USE, Option(0~7)...                | 웹 SMS 설정           | 8        |
| [Customer]        | CusNum1~4                          | 고객표시기 포트       | 4        |
| [Length]          | BarCodeLen, ScaleLen               | 바코드/저울 길이      | 2        |
| [SuSu]            | Card, Point, CashBack...           | 수수료율              | 5        |

> **POS 관련 유일한 항목**: [Customer], [Length], [SuSu] 만 POS에서도 참조 가능

---

## 8. 기기 모드 전환 로직

### 8.1 Self_YN 제어 흐름

```
INI_Load() 에서:
  C_Config.Self_YN = READ_INI("Other", "SelfPos_YN", INI_Path)

  If Self_YN = "1" Then
    → [Self] 섹션 67+ 키 전부 로딩
    → [FaceCam] 4키 로딩
    → 자동 운영 설정 로딩 (Auto_Open/Finish)
  Else (Self_YN = "0")
    → Self_STLYN = "0"     (STL 강제 비활성)
    → Self_STLPort = "0"   (STL 포트 초기화)
    → Self_Bell = "0"      (셀프 벨 비활성)
    → Self_STLSoundAdmin = "0" (알림음 비활성)
    → self_ScalePort = "0"  (저울 비활성)
    → Auto_finish_YN = "0"  (자동마감 비활성)
  End If
```

### 8.2 폼별 분기

| 조건          | POS 모드 (Self_YN=0)    | 셀프 모드 (Self_YN=1) |
| ------------- | ----------------------- | --------------------- |
| 초기화        | `NewLoad`               | `selfNewLoad`         |
| 관리자 진입   | 일반 관리자 화면        | `subSelfAdmin()`      |
| 세금번호 처리 | `MEM_TAXnumber_CALL2()` | 비활성                |
| UI            | 전체 기능 표시          | 간소화된 키오스크 UI  |
| 결제          | 전 결제수단             | 현금+카드 제한        |

### 8.3 상품별 기기 제어 (DB)

| DB 필드                 | 설명                    | 사용                |
| ----------------------- | ----------------------- | ------------------- |
| Goods.SelfPos_bSell_YN  | 셀프에서 판매 가능 여부 | Self_YN=1일 때 체크 |
| Goods.SelfPos_Weight_YN | 셀프에서 저울 필수 여부 | Self_YN=1일 때 체크 |

---

## 9. 새 설정 시스템 설계 권고

### 9.1 설정 계층 구조 제안

```
설정
├── 1. 매장 설정 (매장 공통) ─── DB 저장, 전 기기 공유
│   ├── 매장 기본 정보 (매장명, 사업자번호, 주소, 대표자...)
│   ├── 영수증 정보 (상호, 하단 문구...)
│   ├── 결제 정책 (캐시백, 최소카드금액, 외상...)
│   ├── 포인트 정책 (적립율, 최소포인트, 럭키유저...)
│   ├── 출력 정책 (바코드출력, 부가세출력, 그룹출력...)
│   └── SMS/푸시 설정 (SMS사용, 자동SMS, 카카오...)
│
├── 2. 기기 설정 (기기별 개별) ─── 로컬 저장, 기기마다 다름
│   ├── 기기 식별 (POS번호, 기기유형, 관리자POS번호)
│   ├── 하드웨어 연결
│   │   ├── 프린터 (종류, 포트, 전송속도)
│   │   ├── 스캐너 (종류, 포트)
│   │   ├── 카드리더 (포트, 전송속도)
│   │   ├── 고객표시기 (종류, 포트, 라인)
│   │   ├── 캐시드로워 (사용여부)
│   │   ├── 저울 (포트)
│   │   └── 기타 (동전교환기, 벨, CAT)
│   ├── VAN 결제 단말
│   │   ├── VAN사 선택
│   │   ├── 가맹점번호 (DANMALNO)
│   │   ├── 단말기번호 (Snumber)
│   │   └── 서명패드 (포트, 전송속도)
│   └── DB 연결 (IP, 포트, 사용자, 비밀번호)
│
├── 3. 기기유형별 설정 ─── 해당 유형일 때만 표시
│   ├── 셀프 키오스크 (Self_YN=1)
│   │   ├── 현금 결제 (현금기 포트, 종류, 권종 설정...)
│   │   ├── 봉투/저울 (봉투 포트, 저울 한도...)
│   │   ├── 고객 UI (음성안내, 터치소리, 메시지...)
│   │   ├── 자동 운영 (자동개점/마감, 시간, 로그인...)
│   │   ├── 포인트/알림 (SMS, 카카오, 직원호출...)
│   │   └── 인쇄 (자동출력, 주소/전화 출력...)
│   ├── 주방 디스플레이
│   │   ├── 주방 프린터 (종류, 포트, 폰트크기)
│   │   └── 주방 메시지 (1~5)
│   ├── 안면인식 (FaceCam)
│   │   └── 카메라 (사용, 타임아웃, 포인트적립)
│   ├── 자판기 (JaPan)
│   │   └── 자판기 설정 (포트, 재고, 단일판매...)
│   ├── 이미지셀프 (Selfimg)
│   │   └── 이미지셀프 설정 (스캔, 선결제, 테이블...)
│   ├── 21인치셀프 (Self21)
│   │   └── 21인치 설정 (계수, 할인표시...)
│   └── 듀얼 모니터
│       └── 듀얼 메시지 (상단/하단 문구, 색상)
│
└── 4. 운영 설정 (POS 기본 운영) ─── 로컬+서버 혼합
    ├── 판매 운영 (영업일, 전표, 시재금...)
    ├── UI 설정 (그리드, 색상, 폰트, 핫키...)
    ├── 오프라인 설정 (오프라인카드, 프린터체크...)
    └── 시스템 (에러로깅, DB컴팩트, 백업...)
```

### 9.2 항목 수 요약

| 분류                         | 항목 수  | 저장 위치                  |
| ---------------------------- | -------- | -------------------------- |
| 매장 공통 설정               | ~100     | DB (POS_Set + Office_User) |
| 기기 하드웨어 설정           | ~50      | 로컬 (기기별 설정 파일)    |
| VAN 결제 설정                | ~30      | 로컬 (기기별) + DB (공통)  |
| 셀프 키오스크 전용           | ~70      | 로컬 (기기별 설정 파일)    |
| 주방 디스플레이 전용         | ~10      | 로컬 + DB                  |
| 안면인식 전용                | ~6       | 로컬 + DB                  |
| 자판기 전용                  | ~7       | 로컬                       |
| 이미지셀프 전용              | ~6       | 로컬                       |
| 21인치셀프 전용              | ~3       | 로컬                       |
| 듀얼 모니터 전용             | ~9       | 로컬                       |
| POS 운영 설정                | ~60      | 로컬 (INI)                 |
| 관리 프로그램 전용           | ~150     | config.ini (제외 가능)     |
| **합계 (관리프로그램 제외)** | **~350** |                            |

### 9.3 신규 시스템에서 제외 가능한 항목

| 범주                      | 제외 사유                          | 항목 수 |
| ------------------------- | ---------------------------------- | ------- |
| Grid\_\* 섹션 (20+)       | VB6 그리드 컬럼폭 → Vue에서 불필요 | ~60     |
| config.ini 관리프로그램   | 별도 프로그램 → 미마이그레이션     | ~150    |
| 바코드 프린터 모델별 좌표 | 레거시 프린터 모델 → 신규 드라이버 | ~200    |
| Sale_Color/MEMColor       | VB6 RGB 색상 → CSS/Tailwind 대체   | ~12     |
| update 플래그             | 버전별 마이그레이션 플래그         | ~2      |

---

_문서 끝_
