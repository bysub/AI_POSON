# ASIS VB6 설정 관리 - INI vs DB 분류 전체 목록

> 작성일: 2026-02-19
> 목적: ASIS 레거시 시스템에서 INI 파일로 관리하는 설정과 DB로 관리하는 설정을 분류
> 소스: `prev_kiosk/POSON_POS_SELF21/pos_config.ini`, `config.ini`, VB6 Type 정의

---

## 전체 현황 요약

| 저장소               | 파일/테이블 | 성격                          | 섹션/컬럼 수 | 키/필드 수        | VB6 Type                |
| -------------------- | ----------- | ----------------------------- | ------------ | ----------------- | ----------------------- |
| **pos_config.ini**   | 로컬 INI    | POS 런타임 설정               | 75 섹션      | 516+ 키           | C_Config, Terminal, VAN |
| **config.ini**       | 로컬 INI    | 관리프로그램(PosManager) 전용 | 85+ 섹션     | 1317줄            | (관리프로그램)          |
| **DB: POS_Set[101]** | 서버 DB     | 서버 동기화 업무 규칙         | 1 테이블     | 78+ 값(쉼표 구분) | S_Config                |
| **DB: Office_User**  | 서버 DB     | 매장 기본 정보                | 1 테이블     | 40+ 컬럼          | Shop                    |

### 설정 흐름도

```
App Start
  +-- INI_Load() --> pos_config.ini (로컬)
  |   +-- [DataBase] --> DB 연결 정보
  |   +-- [Terminal] --> Terminal 타입 (50+ 필드)
  |   +-- [Other],[Sale],[Receipt]... --> C_Config 타입 (300+ 필드)
  |   +-- [Self] --> C_Config.Self_* (67+ 키)
  |   +-- [Card],[KSNET],[KIS]... --> VAN 타입 (20+ 필드)
  |   +-- [FaceCam],[JaPan],[Selfimg],[Self21] --> C_Config.*
  |
  +-- S_Config_Call() --> 서버 DB (DB 연결 후)
      +-- Office_User --> Shop 타입 (40+ 필드)
      +-- POS_Set[101] --> S_Config 타입 (쉼표 구분 78값)
```

---

## A. INI 관리 설정 (pos_config.ini) - POS 런타임

> 로컬 파일에 저장. 기기마다 개별 파일 존재. 앱 시작 시 INI_Load()로 로딩

### A-1. [Application] - 애플리케이션 정보 (5키)

| #   | INI 키                  | VB6 변수 | 설명                   | 기본값       | 성격 |
| --- | ----------------------- | -------- | ---------------------- | ------------ | ---- |
| 1   | Pro_Name                | -        | 프로그램명             | POSON        | 공통 |
| 2   | Pro_Buttom              | -        | 하단 텍스트            | CopyRight... | 공통 |
| 3   | Font_Add                | -        | 폰트 추가              | 1            | 공통 |
| 4   | SALE_POINTUSE_UPDATE_YN | -        | 포인트 업데이트 플래그 | 0            | 공통 |
| 5   | Backup_Month            | -        | 백업 주기(월)          | 6            | 공통 |

### A-2. [Sale] - 판매 운영 (10키)

| #   | INI 키          | VB6 변수   | 설명                   | 기본값     | 성격   |
| --- | --------------- | ---------- | ---------------------- | ---------- | ------ |
| 1   | OpenDay         | (직접 INI) | 영업 시작일            | 날짜       | 기기별 |
| 2   | S_JeonPyo       | (직접 INI) | 전표 시퀀스            | 1          | 기기별 |
| 3   | St_Jeonpyo      | (직접 INI) | 전표번호               | 타임스탬프 | 기기별 |
| 4   | Befor_Tran      | (직접 INI) | 이전거래 합계          | 0          | 기기별 |
| 5   | DataDown        | (직접 INI) | 마스터 데이터 다운로드 | 1          | 공통   |
| 6   | Finish_Day      | (직접 INI) | 마감일                 | 날짜       | 기기별 |
| 7   | Befor_Tran_Dec  | (직접 INI) | 이전거래 차감          | 0          | 기기별 |
| 8   | Befor_Tran_Card | (직접 INI) | 이전거래 카드          | 0          | 기기별 |
| 9   | Start_Price     | (직접 INI) | 시재금                 | 0          | 기기별 |
| 10  | INOUT_Chk       | (직접 INI) | 입출 체크              | 1          | 기기별 |

### A-3. [Receipt] - 영수증 정보 (9키)

| #   | INI 키            | VB6 변수   | 설명          | 기본값   | 성격 |
| --- | ----------------- | ---------- | ------------- | -------- | ---- |
| 1   | ShopName          | (직접 INI) | 매장명        | -        | 공통 |
| 2   | ShopNumber        | (직접 INI) | 사업자번호    | -        | 공통 |
| 3   | Address           | (직접 INI) | 주소          | -        | 공통 |
| 4   | Owner             | (직접 INI) | 대표자명      | -        | 공통 |
| 5   | Tel               | (직접 INI) | 전화번호      | -        | 공통 |
| 6   | ShopName_Color    | (직접 INI) | 매장명 색상   | 8421440  | 공통 |
| 7   | Top5              | (직접 INI) | 상단 여백     | (빈값)   | 공통 |
| 8   | Buttom5           | (직접 INI) | 하단 여백     | (빈값)   | 공통 |
| 9   | NewShopName_Color | (직접 INI) | 새매장명 색상 | 16777215 | 공통 |

### A-4. [DataBase] - DB 연결 (6키)

| #   | INI 키   | VB6 변수 | 설명                 | 기본값        | 성격 |
| --- | -------- | -------- | -------------------- | ------------- | ---- |
| 1   | DBType   | -        | DB 유형              | 0             | 공통 |
| 2   | IP       | -        | DB 서버 IP           | 192.168.10.48 | 공통 |
| 3   | UserName | -        | DB 사용자 (암호화)   | (암호화값)    | 공통 |
| 4   | Pass     | -        | DB 비밀번호 (암호화) | (암호화값)    | 공통 |
| 5   | Port     | -        | DB 포트              | 1433          | 공통 |
| 6   | DB_NAME  | -        | DB 이름              | TIPS          | 공통 |

### A-5. [Terminal] - 터미널 하드웨어 (42키)

| #   | INI 키             | VB6 변수                    | 설명                | 기본값 | 성격   |
| --- | ------------------ | --------------------------- | ------------------- | ------ | ------ |
| 1   | TerminalType       | Terminal.Type               | 기기 종류           | 0      | 기기별 |
| 2   | PosNo              | Terminal.PosNo              | POS 번호            | 01     | 기기별 |
| 3   | AdminPosNo         | Terminal.AdminPosNo         | 관리자 POS번호      | z      | 기기별 |
| 4   | Cashdraw           | Terminal.CashDraw           | 캐시드로워          | 1      | 기기별 |
| 5   | Touch              | Terminal.Touch              | 터치스크린          | 1      | 기기별 |
| 6   | Dual               | Terminal.Dual               | 듀얼 모니터         | 1      | 기기별 |
| 7   | Dual_Type          | Terminal.Dual_Type          | 듀얼 유형           | 0      | 기기별 |
| 8   | Printer            | Terminal.Printer            | 프린터 종류         | 4      | 기기별 |
| 9   | Printer_Port       | Terminal.PrinterPort        | 프린터 포트         | 3      | 기기별 |
| 10  | Printer_Serial_Bps | Terminal.PrinterBps         | 프린터 전송속도     | 9600   | 기기별 |
| 11  | Scan_Name          | Terminal.ScanName           | 스캐너 종류         | 1      | 기기별 |
| 12  | Scan_Port          | Terminal.ScanPort           | 스캐너 포트         | 0      | 기기별 |
| 13  | HandScan_Port      | Terminal.HandScan_Port      | 핸드스캐너 포트     | 0      | 기기별 |
| 14  | MSR_Port           | Terminal.MSR_PORT           | 카드리더 포트       | 0      | 기기별 |
| 15  | MSR_BPS            | Terminal.MSR_BPS            | 카드리더 전송속도   | 9600   | 기기별 |
| 16  | CDPName            | Terminal.CDPName            | 고객표시기명        | -      | 기기별 |
| 17  | CDP_Port           | Terminal.CDPPort            | 고객표시기 포트     | 0      | 기기별 |
| 18  | CDPLine            | Terminal.CDPLine            | 고객표시기 라인     | 1      | 기기별 |
| 19  | CDPType            | Terminal.CDPType            | 고객표시기 종류     | -      | 기기별 |
| 20  | CDP_BPS            | Terminal.CDP_BPS            | 고객표시기 전송속도 | 9600   | 기기별 |
| 21  | CDP_CASH_YN        | Terminal.CDP_CASH_YN        | CDP 현금표시        | 0      | 기기별 |
| 22  | Coin_Name          | Terminal.CoinName           | 동전교환기 종류     | 0      | 기기별 |
| 23  | Coin_Port          | Terminal.CoinPort           | 동전교환기 포트     | 0      | 기기별 |
| 24  | Moniter            | Terminal.Moniter            | 메인 모니터         | 0      | 기기별 |
| 25  | S_Moniter          | Terminal.SMoniter           | 서브 모니터         | 0      | 기기별 |
| 26  | Printer_CAT_USE    | Terminal.Printer_CAT_USE    | CAT 프린터 사용     | 0      | 기기별 |
| 27  | CAT_Port           | Terminal.CAT_PORT           | CAT 포트            | 0      | 기기별 |
| 28  | CAT_BPS            | Terminal.CAT_BPS            | CAT 전송속도        | 38400  | 기기별 |
| 29  | CBO_ScalePort      | Terminal.CBO_ScalePort      | 저울 포트           | 1      | 기기별 |
| 30  | SuPyo_Port         | Terminal.SuPyo_Port         | 수표 포트           | 0      | 기기별 |
| 31  | KitchenPrint       | Terminal.kitchenPrint       | 주방프린터 종류     | 4      | 기기별 |
| 32  | KitchenPrintPort   | Terminal.kitchenPrinterPort | 주방프린터 포트     | 7      | 기기별 |
| 33  | KitchenPrintBps    | Terminal.kitchenPrinterBps  | 주방프린터 전송속도 | 9600   | 기기별 |
| 34  | Kitchen_fontsize   | Terminal.Kitchen_fontsize   | 주방 폰트크기       | 0      | 기기별 |
| 35  | Bell_YN            | Terminal.Bell_YN            | 벨 사용             | 0      | 기기별 |
| 36  | Bell_Type          | Terminal.Bell_Type          | 벨 종류             | 0      | 기기별 |
| 37  | Bell_ComPort       | Terminal.Bell_ComPort       | 벨 COM포트          | 0      | 기기별 |
| 38  | Bell_Name          | Terminal.Bell_Name          | 벨 이름             | 0      | 기기별 |
| 39  | Bell_fID           | Terminal.Bell_fID           | 벨 시설ID           | 0      | 기기별 |
| 40  | Bell_fID_YN        | Terminal.Bell_fID_YN        | 벨 시설ID 사용      | 0      | 기기별 |
| 41  | Bell_LEN           | Terminal.Bell_LEN           | 벨 번호 길이        | 0      | 기기별 |
| 42  | Printer_Bps        | Terminal.PrinterBps         | 프린터 속도 (중복)  | (빈값) | 기기별 |

### A-6. [Other] - POS 업무 설정 (76키)

| #   | INI 키                 | VB6 변수                        | 설명                      | 기본값  |
| --- | ---------------------- | ------------------------------- | ------------------------- | ------- |
| 1   | Process_Method         | C_Config.SLock_Use              | 화면잠금 사용             | 0       |
| 2   | Price_Edit             | C_Config.Price_Edit             | 가격 수정 허용            | 0       |
| 3   | Print_VAT              | C_Config.Print_VAT              | 부가세 출력               | 1       |
| 4   | Print_Barcode          | C_Config.Print_Barcode          | 바코드 출력               | 1       |
| 5   | Err_Write              | C_Config.Err_Write              | 에러 로깅                 | 1       |
| 6   | Product_CashOpen       | C_Config.Product_CashOpen       | 상품 등록시 캐시드로워    | 1       |
| 7   | Bott_Print             | C_Config.Bott_Print             | 하단 합계 출력            | 1       |
| 8   | Shop_Chk               | -                               | 매장 체크                 | 0       |
| 9   | Hotkey_Chk             | -                               | 핫키 체크                 | 0       |
| 10  | HyeonGeumPrice         | C_Config.HyeonGeumPrice         | 최대 현금금액             | 9999990 |
| 11  | MaxPrice               | C_Config.MaxPrice               | 최대 결제금액             | 9999990 |
| 12  | SCANCOP                | C_Config.SCANCOP                | 스캔 복사                 | 0       |
| 13  | All_Data               | -                               | 전체 데이터               | 0       |
| 14  | SaleView               | C_Config.SaleView               | 판매화면 타입             | 1       |
| 15  | InPriView              | C_Config.InPriView              | 매입가 표시               | 1       |
| 16  | Grouping               | C_Config.Grouping               | 상품 그룹핑               | 0       |
| 17  | MisuPrint              | C_Config.MisuPrint              | 미수 출력                 | 1       |
| 18  | Re_Point               | C_Config.Re_Point               | 환불시 포인트 재계산      | 0       |
| 19  | Re_Tax                 | C_Config.Re_Tax                 | 환불시 세금 재계산        | 0       |
| 20  | Re_CashBack            | C_Config.Re_CashBack            | 환불시 캐시백 재계산      | 0       |
| 21  | Slot_Add               | C_Config.Slot_Add               | 용지 슬롯                 | 1       |
| 22  | Cut_Position           | C_Config.Cut_Position           | 절단 위치                 | 0       |
| 23  | InfoDesk_YN            | C_Config.InfoDesk_YN            | 안내데스크 모드           | 0       |
| 24  | InfoDesk_ViewAll       | C_Config.InfoDesk_ViewAll       | 안내데스크 전체보기       | 1       |
| 25  | All_Finish             | C_Config.All_Finish             | 전체 마감                 | 1       |
| 26  | price_11_yn            | C_Config.Price_11_YN            | 3단 가격 표시             | 0       |
| 27  | ENG_YN                 | C_Config.ENG_YN                 | 영어 모드                 | 0       |
| 28  | Grid_Fix_YN            | C_Config.Grid_Fix_YN            | 그리드 고정               | 0       |
| 29  | Printer_OFF_Chk        | C_Config.Printer_Off_Chk        | 프린터 오프라인 체크      | 0       |
| 30  | SCAN_REAL_Chk          | C_Config.SCAN_REAL_Chk          | 바코드 실시간 체크        | 0       |
| 31  | OFF_CARD_Chk           | C_Config.OFF_CARD_Chk           | 오프라인 카드 사용        | 1       |
| 32  | MIN_Card_Price         | C_Config.MIN_CARD_PRICE         | 최소 카드결제 금액        | 0       |
| 33  | HOTKEY_ENTER_USE       | C_Config.HOTKEY_ENTER_USE       | 핫키 엔터 사용            | 0       |
| 34  | HAND_CARD_YN           | C_Config.HAND_CARD_YN           | 수동 카드입력             | 0       |
| 35  | GIFT_BILL_ETC          | C_Config.GIFT_BILL_ETC          | 상품권 출력 기타          | 0       |
| 36  | MEMBER_ADD_SCREEN_YN   | C_Config.MEMBER_ADD_SCREEN_YN   | 회원 추가 화면            | 0       |
| 37  | Job_Finish_Cashdraw_YN | C_Config.Job_Finish_Cashdraw_YN | 마감시 캐시드로워         | 0       |
| 38  | noCVM_Bill_Print_YN    | C_Config.noCVM_Bill_Print_YN    | 비CVM 영수증 출력         | 0       |
| 39  | OFF_CARD_KEY_USE       | C_Config.OFF_CARD_KEY_USE       | 오프라인 카드키           | 1       |
| 40  | Product_Sound          | C_Config.Product_Sound          | 상품 스캔 소리            | 1       |
| 41  | Delay                  | C_Config.Delay                  | 지연 설정                 | 0       |
| 42  | eCard_YN               | C_Config.eCard_YN               | 전자카드 사용             | 1       |
| 43  | Logo_Min_YN            | C_Config.Logo_Min_YN            | 로고 최소화               | 1       |
| 44  | All_Finish_BAK         | -                               | 전체마감 백업             | 1       |
| 45  | All_Finish_BAK_Def     | -                               | 전체마감 백업 기본값      | 1       |
| 46  | PosMenu                | -                               | POS 메뉴 사용             | 1       |
| 47  | Dual_Pos_TEST          | -                               | 듀얼POS 테스트            | 0       |
| 48  | Total_Qty_YN           | C_Config.Total_Qty_YN           | 총 수량 표시              | 0       |
| 49  | MDB_Compact_YN         | C_Config.MDB_Compact_YN         | DB 자동 컴팩트            | 0       |
| 50  | CARD_Timer_YN          | C_Config.CARD_Timer_YN          | 카드 타이머               | 0       |
| 51  | f_Boryu_YN             | C_Config.f_Boryu_YN             | 보류 사용                 | 0       |
| 52  | Touch_HotKey_Opt       | C_Config.Touch_HotKey_Opt       | 터치 핫키 옵션            | 0       |
| 53  | Boryu_Tran_Opt         | C_Config.Boryu_Tran_Opt         | 보류 거래 옵션            | 0       |
| 54  | Day_F_Msg_Opt          | C_Config.Day_F_Msg_Opt          | 일마감 메시지 옵션        | 0       |
| 55  | Sale_Finish_Opt        | C_Config.Sale_Finish_Opt        | 판매 마감 옵션            | 0       |
| 56  | Card_Wav_Opt           | C_Config.Card_Wav_Opt           | 카드 결제 소리            | 0       |
| 57  | Card_View              | C_Config.Card_View              | 카드 표시                 | 0       |
| 58  | Gift_Input_YN          | C_Config.Gift_Input_YN          | 상품권 입력               | 0       |
| 59  | reTranBill_Print_1_YN  | C_Config.reTranBill_Print_1_YN  | 재거래 영수증 출력        | 0       |
| 60  | wSclae_Danwi_Print_YN  | -                               | 저울 단위 출력            | 0       |
| 61  | wSclae_Danwi_View_YN   | -                               | 저울 단위 표시            | 0       |
| 62  | Grade_Memo_YN          | C_Config.Grade_Memo_YN          | 등급 메모                 | 0       |
| 63  | Order_Call_YN          | C_Config.Order_Call_YN          | 주문 호출                 | 0       |
| 64  | Point_Bill_Print_YN    | C_Config.Point_Bill_Print_YN    | 포인트 영수증 출력        | 1       |
| 65  | no_Bill_fMessage_YN    | C_Config.no_Bill_fMessage_YN    | 무영수증 메시지           | 0       |
| 66  | no_Bill_fSound_YN      | C_Config.no_Bill_fSound_YN      | 무영수증 소리             | 0       |
| 67  | SelfPos_YN             | C_Config.Self_YN                | **셀프 모드 ON/OFF**      | 1       |
| 68  | Grid_SaleEx            | C_Config.Grid_SaleEx            | 판매 그리드 확장          | 0       |
| 69  | mDown_YN               | C_Config.mDown_YN               | 마스터 다운로드 사용      | 1       |
| 70  | mDown_Week             | C_Config.mDown_Week             | 다운로드 주기(주)         | 2       |
| 71  | no_Bill_CusPoint_YN    | C_Config.no_Bill_CusPoint_YN    | 무영수증 포인트           | 0       |
| 72  | Pro_Comp               | -                               | 프로그램 압축             | 0       |
| 73  | New_Item_Update        | C_Config.New_Item_Update        | 신규상품 업데이트         | 0       |
| 74  | Free_Opt               | C_Config.Free_Opt               | 무료 옵션                 | 0       |
| 75  | DataDown_Goods_NO      | -                               | 상품 데이터 다운로드 번호 | 1       |

### A-7. [Card] - VAN 공통 설정 (5키)

| #   | INI 키          | VB6 변수            | 설명            | 기본값 | 성격   |
| --- | --------------- | ------------------- | --------------- | ------ | ------ |
| 1   | VAN_Select      | VAN.Selected        | VAN사 선택      | 4      | 기기별 |
| 2   | SingPad_Port    | VAN.SingPad_Port    | 서명패드 포트   | 0      | 기기별 |
| 3   | CashBack_YN     | VAN.CashBack_YN     | 캐시백 사용     | 1      | 공통   |
| 4   | OCash_Screen_YN | VAN.OCash_Screen_YN | 온라인현금 화면 | 0      | 공통   |
| 5   | Log_Delete      | (직접)              | 로그 삭제       | 1      | 공통   |

### A-8. VAN사별 섹션 (13개 VAN - 총 60+ 키)

| VAN사   | INI 섹션  | 키 수 | 주요 키                                                    |
| ------- | --------- | ----- | ---------------------------------------------------------- |
| KSNET   | [KSNET]   | 7     | IP, Port, DANMALNO, Port_chk, SingPad_BPS, USB_YN, Snumber |
| KIS     | [KIS]     | 3     | SNUMBER, Pos_Number(암호화), DANMALNO(암호화)              |
| KMPS    | [KMPS]    | 3     | SNUMBER, DANMALNO, Port_chk                                |
| SMARTRO | [SMARTRO] | 4     | IP, Port, DANMALNO, Snumber                                |
| StarVAN | [StarVAN] | 2     | DANMALNO, Snumber                                          |
| NICE    | [NICE]    | 5     | IP, Port, DANMALNO, Dll_Chk, Snumber                       |
| JTNet   | [JTNet]   | 3     | IP, Port, DANMALNO                                         |
| KICC    | [KICC]    | 5     | IP, Port, DANMALNO, SingPad_BPS, SingCall_Type             |
| KCB     | [KCB]     | 3     | DANMALNO, Use, Snumber                                     |
| KOVAN   | [KOVAN]   | 5     | IP, Port, DANMALNO(암호화), Dll_Chk, Snumber               |
| KOCES   | [KOCES]   | 4     | IP, Port, DANMALNO, SingPad_Name                           |
| KCP     | [KCP]     | 4     | IP, Port, DANMALNO, Dll_Chk                                |
| KFTC    | [KFTC]    | 4     | IP, DANMALNO, Point, SeqNo                                 |

> **성격 분류**: IP/Port = 공통(VAN사 제공), DANMALNO/Snumber = 기기별(가맹점 단말기 고유)

### A-9. [Self] - 셀프 키오스크 전용 (73키)

#### 현금 결제 (10키)

| #   | INI 키           | VB6 변수                  | 설명               | 기본값 |
| --- | ---------------- | ------------------------- | ------------------ | ------ |
| 1   | self_Cash        | C_Config.self_Cash        | 현금 결제 사용     | 1      |
| 2   | self_CashPort    | C_Config.self_CashPort    | 현금기 COM포트     | 0      |
| 3   | self_CashSleep   | C_Config.self_CashSleep   | 현금기 대기시간    | 0      |
| 4   | self_CashPhonNum | C_Config.self_CashPhonNum | 현금기 연락처      | -      |
| 5   | self_CashGubun   | C_Config.self_CashGubun   | 현금기 종류        | 1      |
| 6   | self_NoHyunYoung | C_Config.self_NoHyunYoung | 실결제금액 숨김    | 0      |
| 7   | self_OneHPUse    | C_Config.self_OneHPUse    | 1만원권 사용       | 0      |
| 8   | self_50HPUse     | C_Config.self_50HPUse     | 5만원권 사용       | 0      |
| 9   | self_10000Use    | C_Config.self_10000Use    | 만원권 사용        | 0      |
| 10  | Self_Card        | C_Config.self_NoCardUse   | 카드 결제 비활성화 | 0      |

#### 봉투/저울 (6키)

| #   | INI 키           | VB6 변수                  | 설명             | 기본값 |
| --- | ---------------- | ------------------------- | ---------------- | ------ |
| 1   | self_BagPort     | C_Config.self_BagPort     | 봉투 감지 포트   | 0      |
| 2   | self_StartBag    | C_Config.self_StartBag    | 시작시 봉투 표시 | 0      |
| 3   | Self_MBagSell    | C_Config.Self_MBagSell    | 복수 봉투 판매   | 1      |
| 4   | self_LastBag     | C_Config.self_LastBag     | 마지막 봉투      | 1      |
| 5   | Self_ScalePort   | C_Config.self_ScalePort   | 저울 COM포트     | 0      |
| 6   | Self_ScaleLimitG | C_Config.Self_ScaleLimitG | 저울 무게 한도   | 0      |

#### STL 보안태그 (6키)

| #   | INI 키        | VB6 변수                    | 설명              | 기본값 |
| --- | ------------- | --------------------------- | ----------------- | ------ |
| 1   | STLGoods      | C_Config.Self_STLGoods      | STL 상품 등록     | 0      |
| 2   | STLNoGoods    | C_Config.Self_STLNoGoods    | STL 미등록 상품   | 0      |
| 3   | STLGoodsNo    | C_Config.self_STLGoodsNo    | STL 상품번호      | 0      |
| 4   | STLSoundAdmin | C_Config.Self_STLSoundAdmin | STL 관리자 알림음 | 0      |
| 5   | STLPort       | C_Config.Self_STLPort       | STL COM포트       | -      |
| 6   | Bell          | C_Config.Self_Bell          | 셀프 벨           | 0      |

#### 고객 인터페이스 (13키)

| #   | INI 키              | VB6 변수                   | 설명                | 기본값 |
| --- | ------------------- | -------------------------- | ------------------- | ------ |
| 1   | SoundGuide          | C_Config.Self_SoundGuide   | 음성 안내           | 1      |
| 2   | Self_CusNum4        | C_Config.Self_CusNum4      | 회원번호 4자리      | 1      |
| 3   | self_NoCustomer     | C_Config.self_NoCustomer   | 비회원 판매 허용    | 0      |
| 4   | self_CusSelect      | C_Config.self_CusSelect    | 고객 선택 방식      | 1      |
| 5   | CusAddUse           | C_Config.CusAddUse         | 고객 추가 사용      | 0      |
| 6   | Self_CusAddEtc      | C_Config.Self_CusAddEtc    | 고객 추가 기타      | 0      |
| 7   | CusTopMsg           | C_Config.Self_CusTopMsg    | 고객 상단 메시지    | (빈값) |
| 8   | CusBTMsg1           | C_Config.Self_CusBTMsg1    | 고객 버튼 메시지1   | (빈값) |
| 9   | CusBTMsg2           | C_Config.Self_CusBTMsg2    | 고객 버튼 메시지2   | (빈값) |
| 10  | self_TouchSoundYN   | C_Config.self_TouchSoundYN | 터치 소리           | 1      |
| 11  | self_CusAlarmUse    | C_Config.self_CusAlarmUse  | 고객 알람 사용      | 1      |
| 12  | Self_CusAlarmTime   | C_Config.Self_CusAlarmTime | 고객 알람 시간      | 0      |
| 13  | no_Bill_CusPoint_YN | -                          | 무영수증 고객포인트 | 0      |

#### 자동 운영 (8키)

| #   | INI 키         | VB6 변수                | 설명           | 기본값 |
| --- | -------------- | ----------------------- | -------------- | ------ |
| 1   | Auto_Open_YN   | C_Config.Auto_Open_YN   | 자동 개점      | 0      |
| 2   | Auto_Finish_YN | C_Config.Auto_finish_YN | 자동 마감      | 0      |
| 3   | Auto_Day       | C_Config.Auto_Day       | 자동 운영 날짜 | 날짜   |
| 4   | Auto_AP        | C_Config.Auto_AP        | AM/PM          | 0      |
| 5   | Auto_HH        | C_Config.Auto_HH        | 시             | 00     |
| 6   | Auto_MM        | C_Config.auto_MM        | 분             | 00     |
| 7   | Auto_ID        | C_Config.Auto_ID        | 자동 로그인 ID | 1      |
| 8   | Auto_Pass      | C_Config.Auto_Pass      | 자동 로그인 PW | 1      |

#### 포인트/알림 (11키)

| #   | INI 키           | VB6 변수                  | 설명              | 기본값 |
| --- | ---------------- | ------------------------- | ----------------- | ------ |
| 1   | self_NoAutoPoint | C_Config.self_NoAutoPoint | 자동포인트 비활성 | 0      |
| 2   | self_PointZero   | C_Config.self_PointZero   | 포인트 초기화     | 0      |
| 3   | self_PointHidden | C_Config.self_PointHidden | 포인트 숨김       | 0      |
| 4   | Self_PointSMSUse | C_Config.Self_PointSMSUse | 포인트 SMS        | 0      |
| 5   | Self_UserCall    | C_Config.Self_UserCall    | 직원호출          | 0      |
| 6   | Self_SMSAdmin    | C_Config.Self_SMSAdmin    | 관리자 SMS        | 1      |
| 7   | Self_Kakao       | C_Config.Self_Kakao       | 카카오 알림       | 1      |
| 8   | Self_Zero        | C_Config.Self_Zero        | 제로클릭 알림     | 1      |
| 9   | self_SNSGubun    | C_Config.self_SNSGubun    | SNS 구분          | 0      |
| 10  | Self_CamUse      | C_Config.Self_CamUse      | 카메라 사용       | 1      |
| 11  | self_ICSiren     | C_Config.self_ICSiren     | IC 사이렌         | 0      |

#### UI/화면 (9키)

| #   | INI 키           | VB6 변수                  | 설명             | 기본값 |
| --- | ---------------- | ------------------------- | ---------------- | ------ |
| 1   | Self_MainPage    | C_Config.self_MainPage    | 메인페이지 표시  | 1      |
| 2   | Self_BTInit      | C_Config.self_BTInit      | 초기화 버튼 표시 | 1      |
| 3   | Self_OneCancel   | C_Config.Self_OneCancel   | 개별취소 버튼    | 1      |
| 4   | Self_zHotKey     | C_Config.Self_zHotKey     | Z핫키 사용       | 1      |
| 5   | self_CountYN     | C_Config.self_CountYN     | 계수버튼 표시    | 1      |
| 6   | self_StartHotKey | C_Config.self_StartHotKey | 시작 핫키        | 0      |
| 7   | self_PriceUse    | C_Config.self_PriceUse    | 가격 조정 사용   | 0      |
| 8   | self_PriceType   | C_Config.self_PriceType   | 가격 유형        | 0      |
| 9   | Self_Reader      | C_Config.self_Reader      | ID 리더기 유형   | 2      |

#### 인쇄/출력 (4키)

| #   | INI 키            | VB6 변수                   | 설명          | 기본값 |
| --- | ----------------- | -------------------------- | ------------- | ------ |
| 1   | Self_AutoPrint    | C_Config.Self_AutoPrint    | 자동 출력     | 0      |
| 2   | self_StoPrint     | C_Config.self_StoPrint     | 출력 중지     | 0      |
| 3   | self_PrintAddress | C_Config.self_PrintAddress | 주소 출력     | 0      |
| 4   | self_PrintPhon    | C_Config.self_PrintPhon    | 전화번호 출력 | 0      |

#### 기타 셀프 (6키)

| #   | INI 키           | VB6 변수                  | 설명                | 기본값 |
| --- | ---------------- | ------------------------- | ------------------- | ------ |
| 1   | Self_JPYN        | C_Config.Self_JPYN        | 일본 모드(동전교환) | 0      |
| 2   | self_BagJPPort   | C_Config.self_BagJPPort   | JP 봉투 포트        | 0      |
| 3   | Self_NoAutoGoods | C_Config.Self_NoAutoGoods | 자동상품 비활성     | 0      |
| 4   | self_AppCard     | C_Config.self_AppCard     | 앱카드 사용         | 0      |
| 5   | self_Apple       | C_Config.self_Apple       | 애플페이            | 0      |
| 6   | Self_Gif         | C_Config.Self_Gif         | GIF 파일 경로       | -      |

### A-10. [FaceCam] - 안면인식 전용 (4키)

| #   | INI 키      | VB6 변수                     | 설명          | 기본값 |
| --- | ----------- | ---------------------------- | ------------- | ------ |
| 1   | Use         | C_Config.FaceCam_USE         | 안면인식 사용 | 0      |
| 2   | TimeOut_Use | C_Config.FaceCam_TimeOut_USE | 타임아웃 사용 | 0      |
| 3   | Dealy       | C_Config.FaceCam_Dealy       | 지연시간(초)  | 1      |
| 4   | TimeOut_Sec | C_Config.FaceCam_TimeOut_Sec | 타임아웃(초)  | 120    |

### A-11. [JaPan] - 자판기 전용 (7키)

| #   | INI 키         | VB6 변수    | 설명          | 기본값 |
| --- | -------------- | ----------- | ------------- | ------ |
| 1   | Auto_Open_YN   | (JaPan전용) | 자동 개점     | 0      |
| 2   | jp_Port1       | (JaPan전용) | 자판기 포트1  | 0      |
| 3   | jp_Port2       | (JaPan전용) | 자판기 포트2  | 0      |
| 4   | jp_StoYN       | (JaPan전용) | 재고관리      | 0      |
| 5   | jp_oneSell     | (JaPan전용) | 단일상품 판매 | 0      |
| 6   | jp_FirstPage   | (JaPan전용) | 첫페이지      | 0      |
| 7   | jp_SellPriShow | (JaPan전용) | 판매가 표시   | 0      |

### A-12. [Selfimg] - 이미지셀프 전용 (6키)

| #   | INI 키              | VB6 변수      | 설명              | 기본값 |
| --- | ------------------- | ------------- | ----------------- | ------ |
| 1   | ScanUse             | (Selfimg전용) | 스캔 사용         | 0      |
| 2   | onlyShop            | (Selfimg전용) | 매장전용 판매     | 0      |
| 3   | prepayment          | (Selfimg전용) | 선결제 사용       | 1      |
| 4   | selfImg_TableNoUse  | (Selfimg전용) | 테이블번호 미사용 | 0      |
| 5   | selfImg_TableNumUse | (Selfimg전용) | 테이블숫자 사용   | 0      |
| 6   | self_SNSGubun       | (Selfimg전용) | SNS 구분 (중복)   | 0      |

### A-13. [Self21] - 21인치셀프 전용 (3키)

| #   | INI 키           | VB6 변수     | 설명                 | 기본값 |
| --- | ---------------- | ------------ | -------------------- | ------ |
| 1   | Self21_CountYN   | (Self21전용) | 계수 사용            | 0      |
| 2   | slef21_DCVisible | (Self21전용) | 할인 표시            | 0      |
| 3   | self_CusAddEtc   | (Self21전용) | 고객추가 기타 (중복) | 0      |

### A-14. [Dual_Msg] - 듀얼 모니터 메시지 (7키)

| #   | INI 키           | 설명              | 기본값        |
| --- | ---------------- | ----------------- | ------------- |
| 1   | DTop0            | 듀얼 상단 메시지0 | (환영 문구)   |
| 2   | DTop0_Color      | 상단0 색상        | 32896         |
| 3   | DTop1            | 듀얼 상단 메시지1 | (이용 안내)   |
| 4   | DTop1_Color      | 상단1 색상        | 32896         |
| 5   | DButtom0_Color   | 하단 색상0        | 255           |
| 6   | DButtom1_Color~3 | 하단 색상1~3      | 255,255,16384 |
| 7   | DButtom4_Color   | 하단 색상4        | 65280         |

### A-15. [POSON2_*] - POSON2 통합 기능 (9키)

| #   | 섹션           | INI 키      | VB6 변수                         | 설명            | 기본값 |
| --- | -------------- | ----------- | -------------------------------- | --------------- | ------ |
| 1   | [POSON2_UPSS]  | USE         | C_Config.POSON2_UPSS_USE         | UPS 사용        | 0      |
| 2   | [POSON2_UPSS]  | SMS_USE     | C_Config.POSON2_UPSS_SMS_USE     | SMS 알림        | 0      |
| 3   | [POSON2_UPSS]  | MSG_USE     | C_Config.POSON2_UPSS_MSG_USE     | 메시지 알림     | 1      |
| 4   | [POSON2_UPSS]  | Recv_Mobile | C_Config.POSON2_UPSS_Recv_Mobile | 수신 번호       | (빈값) |
| 5   | [POSON2_Login] | USE         | C_Config.aLogin_USE              | 자동로그인 사용 | 0      |
| 6   | [POSON2_Login] | sMoney      | C_Config.aLogin_sMoney           | 시재금          | 0      |
| 7   | [POSON2_Login] | ID          | C_Config.aLogin_ID               | 로그인 ID       | (빈값) |
| 8   | [POSON2_wSock] | USE_YN      | (직접)                           | 웹소켓 사용     | 0      |
| 9   | [POSON2_wSock] | TCP_PORT    | (직접)                           | TCP 포트        | 9801   |

### A-16. 색상/폰트/UI 설정 (16키)

| #   | 섹션            | INI 키      | 설명                | 기본값      |
| --- | --------------- | ----------- | ------------------- | ----------- |
| 1   | [Sale_Color]    | Default_YN  | 기본색 사용여부     | 2           |
| 2   | [Sale_Color]    | Param1~5    | 판매화면 색상 1~5   | 각종 색상값 |
| 3   | [Sale_Color]    | NewParam1~5 | 새판매화면 색상 1~5 | 각종 색상값 |
| 4   | [Sale_MEMColor] | Param1      | 회원 색상           | 0           |
| 5   | [Sale_MEMColor] | NewParam1   | 새 회원 색상        | 0           |
| 6   | [Sale_Font]     | Font        | 폰트명              | 굴림        |
| 7   | [Sale_Font]     | FontSize    | 폰트크기            | 14          |
| 8   | [NewSale_Font]  | Font        | 새폰트명            | 굴림        |
| 9   | [NewSale_Font]  | FontSize    | 새폰트크기          | 11          |

### A-17. 기타 섹션 (18키)

| #   | 섹션          | INI 키         | 설명           | 기본값    |
| --- | ------------- | -------------- | -------------- | --------- |
| 1   | [INI_Pass]    | DelKey         | 삭제 키        | 0         |
| 2   | [Backup]      | Path           | 백업 경로      | I:\       |
| 3   | [Update_Data] | Convert_chk    | 변환 체크      | 1         |
| 4   | [Option]      | Manual_YN      | 수동 모드      | 1         |
| 5   | [MEMBER_ADD]  | Tax_Option     | 세금 옵션      | 1         |
| 6   | [Product_Add] | Update_Option  | 업데이트 옵션  | 1         |
| 7   | [Product_Add] | Customer_Code  | 거래처 코드    | 10002     |
| 8   | [Product_Add] | Customer_Name  | 거래처명       | (한글)    |
| 9   | [Product_Add] | Group_Code     | 그룹 코드      | 00-00-000 |
| 10  | [Product_Add] | Group_Name     | 그룹명         | (한글)    |
| 11  | [Product_Add] | Branch_Rate    | 분류 세율      | 0         |
| 12  | [Tag_Print]   | Size_Print     | 태그 인쇄 크기 | 1         |
| 13  | [Tag_Print]   | Danwi_Print    | 단위 인쇄      | 1         |
| 14  | [Tag_Print]   | NRP_Print      | NRP 인쇄       | 1         |
| 15  | [Tag_Print]   | Feed_Cnt       | 피드 수        | 4         |
| 16  | [shop_chk]    | TT_yn          | 매장 체크      | 1         |
| 17  | [Config]      | Screen_Hide_YN | 화면 숨김      | 0         |
| 18  | [Shop]        | KitchenMsg1~4  | 주방 메시지    | 1,2,4     |

### A-18. [Grid_*] - 그리드 컬럼폭 (20+ 섹션, ~100키)

| 섹션                        | 설명                | 비고      |
| --------------------------- | ------------------- | --------- |
| [Grid_Sale]                 | 판매 그리드         | 48 컬럼폭 |
| [Grid_Sale_Touch]           | 터치 판매 그리드    | 51 컬럼폭 |
| [NewGrid_Sale_Touch]        | 새 터치 판매 그리드 | 65 컬럼폭 |
| [Grid_Member]               | 회원 그리드         | 24 컬럼폭 |
| [Grid_Product]              | 상품 그리드         | 6 컬럼폭  |
| [Grid_ProductSale]          | 상품판매 그리드     | 7 컬럼폭  |
| [Grid_ProductSel]           | 상품선택 그리드     | 7 컬럼폭  |
| [Grid_Trans]                | 거래 그리드         | 7 컬럼폭  |
| [Grid_ProductReturn]        | 반품 그리드         | 23 컬럼폭 |
| [Grid_ProductReturn_Detail] | 반품상세 그리드     | 16 컬럼폭 |
| [Grid_SaleList]             | 매출목록 그리드     | 40 컬럼폭 |
| [Grid_SaleList_Detail]      | 매출상세 그리드     | 16 컬럼폭 |
| [Grid_TranCancel]           | 거래취소 그리드     | 18 컬럼폭 |
| [Grid_SaleFinish]           | 마감 그리드         | 2 컬럼폭  |
| [Grid_CustomerList]         | 고객목록 그리드     | 9 컬럼폭  |
| [Grid_GroupList]            | 그룹목록 그리드     | 8 컬럼폭  |
| [Grid_LMSList]              | LMS 그리드          | 3 컬럼폭  |
| [Grid_Card]                 | 카드 그리드         | 3 컬럼폭  |
| [Grid_Dual]                 | 듀얼 그리드         | 6 컬럼폭  |
| [Grid_Msg]                  | 메시지 그리드       | 5 컬럼폭  |
| [Grid_Media]                | 매체 그리드         | 4 컬럼폭  |
| [Grid_CDP]                  | CDP 그리드          | 5 컬럼폭  |
| [Grid_Respite]              | 미수 그리드         | 8 컬럼폭  |
| [Grid_Respite_Detail]       | 미수상세 그리드     | 47 컬럼폭 |
| [Grid_GiftTicket]           | 상품권 그리드       | 6 컬럼폭  |
| [Grid_Gift]                 | 상품권 그리드       | 3 컬럼폭  |
| [Grid_appCard]              | 앱카드 그리드       | 5 컬럼폭  |
| [Grid_ChangeUser]           | 사용자변경 그리드   | 2 컬럼폭  |
| [Grid_GoodsList]            | 상품목록 그리드     | 6 컬럼폭  |

> **마이그레이션 불필요**: VB6 그리드 컬럼폭 --> Vue/CSS로 대체

### A-19. 기타 참조 섹션

| 섹션          | 설명                 | 키 수 |
| ------------- | -------------------- | ----- |
| [Server_Menu] | 관리프로그램 경로    | 2     |
| [UPSS]        | UPS 기본             | 2     |
| [Parking_DC]  | 주차할인             | 1     |
| [SPC]         | SPC 관련             | 1     |
| [Scale]       | 저울                 | 2     |
| [update]      | 버전 업데이트 플래그 | 2     |

---

## B. DB 관리 설정 (POS_Set[101]) - S_Config

> 서버 DB에 저장. POS_Set 테이블의 101번 레코드에 쉼표 구분 문자열로 78개 값 저장
> S_Config_Call() 함수로 로딩. **전 기기에서 공유**하는 업무 규칙

### B-1. 출력/인쇄 관련 (12필드)

| 인덱스 | VB6 변수                   | 설명               | 기본값 |
| ------ | -------------------------- | ------------------ | ------ |
| [0]    | S_Config.Group_Print       | 그룹별 출력        | 0      |
| [3]    | S_Config.PrintLine         | 출력 라인(1/2줄)   | 0      |
| [11]   | S_Config.Boryu_Print       | 보류 출력          | 0      |
| [15]   | S_Config.Print_Barcode     | 바코드 출력        | 1      |
| [16]   | S_Config.Print_VAT         | 부가세 출력        | 1      |
| [17]   | S_Config.Bott_Print        | 하단 합계 출력     | 0      |
| [23]   | S_Config.Card_Detail       | 카드 상세 출력     | 0      |
| [24]   | S_Config.SuPyo_Print       | 수표 출력          | 0      |
| [28]   | S_Config.Print_ShopBarcode | 매장바코드 출력    | 0      |
| [29]   | S_Config.Print_SignJeonpyo | 서명패드 전표 출력 | 0      |
| [30]   | S_Config.TranJeonpyo2_YN   | 반품 전표 2매      | 0      |
| [53]   | S_Config.Seq_Print         | 순차 출력          | 0      |

### B-2. 판매/업무 규칙 (22필드)

| 인덱스 | VB6 변수                  | 설명                 | 기본값 |
| ------ | ------------------------- | -------------------- | ------ |
| [1]    | S_Config.Money            | 금액 표시            | 0      |
| [2]    | S_Config.NewProduct       | 신규상품             | 0      |
| [4]    | S_Config.Cash_Pass        | 현금 비밀번호        | 1      |
| [5]    | S_Config.Price_Zero       | 0원 판매 허용        | 0      |
| [8]    | S_Config.CancelAll        | 전체취소             | 0      |
| [9]    | S_Config.JeonPyo          | 전표 사용            | 0      |
| [10]   | S_Config.Tran             | 거래 사용            | 0      |
| [12]   | S_Config.Card_CashOpen    | 카드시 캐시드로워    | 1      |
| [13]   | S_Config.CancelAll_Bigo   | 전체취소 비고        | 0      |
| [14]   | S_Config.No_Credit        | 외상 불가            | 1      |
| [19]   | S_Config.InPriView        | 매입가 표시          | 1      |
| [20]   | S_Config.Grouping         | 상품 그룹핑          | 0      |
| [21]   | S_Config.BanPum_PassChk   | 반품 비밀번호        | 0      |
| [22]   | S_Config.MEMPrice_Chk     | 회원 한도 체크       | 0      |
| [27]   | S_Config.HyeonGeum_Chk    | 현금 처리시 강제입력 | 0      |
| [32]   | S_Config.Jeonpyo_HiddenYN | 전표번호 숨김        | 0      |
| [33]   | S_Config.InTran_JeonpyoYN | 입금 전표 사용       | 0      |
| [46]   | S_Config.Finish_TranChk   | 마감 거래 불가       | 0      |
| [54]   | S_Config.BanPum_Chk       | 반품 전표 확인       | 0      |
| [55]   | S_Config.BoryuMsg_View    | 보류 메시지 표시     | 0      |
| [57]   | S_Config.Boryu_Detail     | 보류 상세 표시       | 0      |
| [65]   | S_Config.Goods_Use        | 판매시 재고 사용     | 0      |

### B-3. 포인트/회원 관련 (14필드)

| 인덱스        | VB6 변수                    | 설명               | 기본값 |
| ------------- | --------------------------- | ------------------ | ------ |
| [6]           | S_Config.Sale_Point         | 판매 포인트        | 0      |
| [7]           | S_Config.Weight_Point       | 중량 포인트        | 0      |
| [18]          | VAN.CashBack_YN             | 캐시백 사용        | 1      |
| [25]          | S_Config.Tran_Point         | 거래 포인트        | 0      |
| [26]          | S_Config.Sale_CashbackPoint | 캐시백 포인트 적립 | 0      |
| [45]          | S_Config.Tran_Pointchk      | 반품 포인트 체크   | 0      |
| [47]          | S_Config.MEM_DecList_YN     | 회원 차감 목록     | 0      |
| [48]          | S_Config.MEM_DecList_Msg    | 회원 차감 메시지   | 0      |
| [49]          | S_Config.Dec_PointChk       | 차감 포인트 체크   | 0      |
| [50]          | S_Config.Dec_PointPer       | 차감 포인트율      | 0      |
| [245]         | S_Config.DEC_MEMO_Chk       | 차감 메모 체크     | 0      |
| POS_Count     | S_Config.POS_Count          | POS 대수           | 99     |
| Tran_PointPer | S_Config.Tran_PointPer      | 거래 포인트율      | 100    |
| Dec_PointPer  | S_Config.Dec_PointPer       | 차감 포인트율      | 100    |

### B-4. 럭키유저/이벤트 (11필드)

| 인덱스 | VB6 변수             | 설명               | 기본값 |
| ------ | -------------------- | ------------------ | ------ |
| [34]   | S_Config.LU_Chk      | 럭키유저 체크      | 0      |
| [35]   | S_Config.LU_Per      | 럭키유저 확률      | 0      |
| [36]   | S_Config.LU_Point    | 럭키유저 포인트    | 0      |
| [37]   | S_Config.LU_CardPer  | 럭키유저 카드 확률 | 0      |
| [38]   | S_Config.LU_SPoint   | 럭키유저 S포인트   | 0      |
| [39]   | S_Config.LU_MinPrice | 럭키유저 최소금액  | 0      |
| [40]   | S_Config.LU_Sound    | 럭키유저 소리      | 0      |
| [41]   | S_Config.LU_Print    | 럭키유저 출력      | 0      |
| [42]   | S_Config.LU_Opt1     | 럭키유저 옵션1     | 0      |
| [43]   | S_Config.LU_Opt2     | 럭키유저 옵션2     | 0      |
| [44]   | S_Config.LU_Price    | 럭키유저 금액      | 0      |

### B-5. 바코드/저울 (4필드)

| 인덱스 | VB6 변수                  | 설명               | 기본값 |
| ------ | ------------------------- | ------------------ | ------ |
| [31]   | S_Config.Resend_BarcodeYN | 재전송 바코드      | 0      |
| [56]   | S_Config.Scale_18_YN      | 18자리 저울 바코드 | 0      |
| [102]  | S_Config.Group_Sel        | 그룹 선택(대/중)   | 0      |

### B-6. 금액/세금/메시지 (15필드)

| 인덱스    | VB6 변수                    | 설명                  | 기본값 |
| --------- | --------------------------- | --------------------- | ------ |
| [51]      | S_Config.Change_Type        | 거스름돈 유형         | 0      |
| [52]      | S_Config.Change_Auto        | 거스름돈 자동         | 0      |
| [58]      | S_Config.Min_PrintYN        | 최소금액 출력         | 0      |
| [59]      | S_Config.Min_PointYN        | 최소금액 포인트       | 0      |
| [60]      | S_Config.Min_Price1         | 최소금액1             | 0      |
| [61]      | S_Config.Min_Price2         | 최소금액2             | 0      |
| [62]      | S_Config.Tax_Auto           | 세금 자동발행         | 0      |
| [63]      | S_Config.Profit_Msg         | 이익 메시지           | 0      |
| [64]      | S_Config.SaleMsg_YN         | 판매 메시지           | 0      |
| [237]     | S_Config.Tax_Gubun_View     | 세금 구분 표시        | 0      |
| [241]     | S_Config.POS_Smoney         | POS 준비금            | 0      |
| [242]     | S_Config.FACE_ADD_Point_Chk | 안면인식 포인트 체크  | 0      |
| [243]     | S_Config.FACE_ADD_Point     | 안면인식 포인트       | 0      |
| [252-256] | S_Config.SalePrice_MSG\*    | 판매금액 메시지 (5종) | 0      |

---

## C. DB 관리 설정 (Office_User) - Shop

> 서버 DB의 Office_User 테이블. 매장 기본 정보. **전 기기에서 공유**

### C-1. 매장 기본 정보 (10필드)

| DB 컬럼      | VB6 변수              | 설명          | 성격 |
| ------------ | --------------------- | ------------- | ---- |
| OFFICE_NAME  | Shop.name             | 매장명        | 공통 |
| office_num   | Shop.Number           | 사업자번호    | 공통 |
| owner_name   | Shop.Owner            | 대표자명      | 공통 |
| office_tel1  | Shop.Tel              | 전화번호      | 공통 |
| address1+2   | Shop.Address          | 주소          | 공통 |
| sto_cd       | Shop.Code             | 매장코드      | 공통 |
| version      | Shop.Ver              | 버전          | 공통 |
| OFFICE_NAME2 | Shop.Prn_Name         | 출력용 매장명 | 공통 |
| Online_KEY   | Shop.Online_KEY       | 온라인 키     | 공통 |
| en_use       | Shop.sCustmer_Encrypt | 고객 암호화   | 공통 |

### C-2. SMS/푸시 설정 (6필드)

| DB 컬럼           | VB6 변수         | 설명        | 성격 |
| ----------------- | ---------------- | ----------- | ---- |
| eBill_sms_yn      | Shop.SMS_YN      | SMS 사용    | 공통 |
| eBill_auto_sms_yn | Shop.AUTO_SMS_YN | 자동 SMS    | 공통 |
| eBill_push_yn     | Shop.Push_YN     | 푸시 사용   | 공통 |
| eBill_push_title  | Shop.Push_title  | 푸시 제목   | 공통 |
| eBill_push_msg    | Shop.Push_msg    | 푸시 메시지 | 공통 |
| eBill_push_link   | Shop.Push_link   | 푸시 링크   | 공통 |

### C-3. 바코드/셀프/주방 (8필드)

| DB 컬럼         | VB6 변수              | 설명            | 성격     |
| --------------- | --------------------- | --------------- | -------- |
| strBarcode_YN   | Shop.sXBarcode_Use    | 확장바코드      | 공통     |
| selfPos_Hotkey1 | Shop.sSelfPos_Hotkey1 | 셀프 핫키 1     | 셀프전용 |
| selfPos_Hotkey2 | Shop.sSelfPos_Hotkey2 | 셀프 핫키 2     | 셀프전용 |
| selfPos_Hotkey3 | Shop.sSelfPos_Hotkey3 | 셀프 핫키 3     | 셀프전용 |
| selfPos_Hotkey4 | Shop.sSelfPos_Hotkey4 | 셀프 핫키 4     | 셀프전용 |
| SMS_GUBUN       | Shop.self_SNSGubun    | SNS 구분        | 셀프전용 |
| kitchenMsg1~5   | Shop.kitchenMsg1~5    | 주방 메시지 1~5 | 주방전용 |

---

## D. INI 관리 설정 (config.ini) - 관리 프로그램 전용

> PosManager.EXE 전용. POS 런타임과 무관. 마이그레이션 시 별도 관리 프로그램 관련

### D-1. 관리프로그램 기본 설정 (76키)

| 섹션          | 주요 키                                                      | 설명              | 항목 수 |
| ------------- | ------------------------------------------------------------ | ----------------- | ------- |
| [Application] | ProgramName, DPath, Internet, SMS, BP_YN, PurChase, Order... | 관리프로그램 설정 | 76      |
| [Main]        | Status, Left, Top, Width, Height                             | 창 위치/크기      | 5       |

### D-2. 서버/버전 (22키)

| 섹션           | 주요 키                                                     | 설명               | 항목 수 |
| -------------- | ----------------------------------------------------------- | ------------------ | ------- |
| [Server]       | Server_IP, Server_Fort, Catalog, UserID, Pwd, TServer_IP... | DB 연결 + 원격서버 | 15      |
| [Version_Info] | Sys_Gubun, Loc_Version, Svr_Version, POP_Ver...             | 버전 정보          | 7       |

### D-3. POS에서도 참조하는 항목 (11키)

| 섹션       | 키         | 설명             | POS에서의 용도 |
| ---------- | ---------- | ---------------- | -------------- |
| [Customer] | CusNum1~4  | 고객표시기 포트  | CDP 통신       |
| [Length]   | BarCodeLen | 바코드 길이      | 바코드 스캔    |
| [Length]   | ScaleLen   | 저울 길이        | 저울 바코드    |
| [SuSu]     | Card       | 카드 수수료율    | 수수료 계산    |
| [SuSu]     | Point      | 포인트 수수료율  | 수수료 계산    |
| [SuSu]     | CashBack   | 캐시백 수수료율  | 수수료 계산    |
| [SuSu]     | Cash       | 현금 수수료율    | 수수료 계산    |
| [SuSu]     | CashRate   | 현금 수수료 비율 | 수수료 계산    |

### D-4. 바코드 프린터 (200+ 키)

| 섹션                                | 설명                    | 항목 수  |
| ----------------------------------- | ----------------------- | -------- |
| [BarCodePrint]                      | 바코드 프린터 공통 설정 | 43       |
| [TTP-243], [TTP-24323], [TTP-24330] | TTP 프린터 모델별 좌표  | 각 15~20 |
| [SRP-770], [SRP-77030], [SRP-77023] | SRP 프린터 모델별 좌표  | 각 15~25 |
| [LK-B30], [LK-B3023], [LK-B3030]    | LK-B 프린터 모델별 좌표 | 각 20~30 |
| [LK-P30], [LK-P3023], [LK-P3030]    | LK-P 프린터 모델별 좌표 | 각 20~25 |
| [G53030], [G530ETC3]                | G5 프린터 모델별 좌표   | 각 25~40 |
| [Price*]                            | 가격표 크기별 좌표      | 각 5     |
| [TTP-243ETC1], [SRP-770ETC1/3]      | 확장 라벨 좌표          | 각 30~40 |
| [BarCodePrint_LabelType_*]          | 라벨 유형별 설정        | 각 15    |

### D-5. 관리프로그램 화면별 옵션 (50+ 키)

| 섹션                       | 설명                | 항목 수 |
| -------------------------- | ------------------- | ------- |
| [Han_Edit]                 | 상품 편집 옵션      | 11      |
| [HT_Trans]                 | 데이터 전송         | 7       |
| [WEBSMS_Sett]              | 웹 SMS 설정         | 8       |
| [fgTaxPrintBatch]          | 세금계산서 일괄출력 | 4       |
| [frmSettlementList_Option] | 정산목록 옵션       | 5       |
| [Finish_Print]             | 마감 출력           | 1       |
| [GoodsInformality]         | 상품비정규          | 1       |
| [Quick_OPT]                | 빠른 옵션           | 1       |
| [frmStockOutManage3]       | 출고관리            | 5       |
| [PurchaseChk]              | 매입 체크           | 3       |
| [PurchaseOrd]              | 매입 주문           | 1       |
| [Goods_Man]                | 상품 관리           | 2       |
| [기타 10+ 섹션]            | 각종 화면 옵션      | 각 1~3  |

---

## 전체 통계 요약

### 저장소별 항목 수

| 저장소                    | 설정 유형                               | 키/필드 수 | 성격                  |
| ------------------------- | --------------------------------------- | ---------- | --------------------- |
| **pos_config.ini**        | POS 업무 설정                           | ~75        | 공통+기기별 혼재      |
| **pos_config.ini**        | 터미널 HW                               | ~42        | 기기별                |
| **pos_config.ini**        | VAN 결제                                | ~65        | 공통(IP)+기기별(단말) |
| **pos_config.ini**        | 셀프 전용                               | ~73        | 기기별                |
| **pos_config.ini**        | 기타 기기(FaceCam+JaPan+Selfimg+Self21) | ~20        | 기기별                |
| **pos_config.ini**        | 듀얼/POSON2/색상/폰트                   | ~32        | 기기별                |
| **pos_config.ini**        | 매장정보/영수증/DB접속                  | ~21        | 공통                  |
| **pos_config.ini**        | 기타(백업,옵션,태그 등)                 | ~18        | 혼재                  |
| **pos_config.ini**        | Grid 컬럼폭 (UI)                        | ~100       | 기기별(VB6전용)       |
| **DB: POS_Set[101]**      | 업무규칙 (S_Config)                     | ~78        | **매장 공통**         |
| **DB: Office_User**       | 매장정보 (Shop)                         | ~24        | **매장 공통**         |
| **config.ini**            | 관리프로그램                            | ~350       | PosManager 전용       |
|                           |                                         |            |                       |
| **INI 합계 (POS 런타임)** |                                         | **~446**   |                       |
| **DB 합계**               |                                         | **~102**   |                       |
| **관리프로그램 (제외)**   |                                         | **~350**   |                       |
| **POS 런타임 총합계**     |                                         | **~548**   |                       |

### 마이그레이션 대상 분류

| 분류                      | 항목 수 | TOBE 저장 위치     | 비고              |
| ------------------------- | ------- | ------------------ | ----------------- |
| 매장 공통 설정            | ~100    | DB (SystemSetting) | INI+DB 통합       |
| 기기별 설정               | ~200    | DB (DeviceSetting) | INI에서 DB로 이전 |
| VB6 전용 (Grid 등)        | ~100    | **제외**           | Vue/CSS 대체      |
| 관리프로그램              | ~350    | **제외**           | 별도 관리         |
| 운영 데이터 (날짜/시퀀스) | ~10     | DB (Order 등)      | 별도 테이블       |

---

_문서 끝_
