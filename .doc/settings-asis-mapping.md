# SettingsView.vue ASIS 매핑 분석

> 작성일: 2026-02-10
> 대상: `frontend/src/renderer/src/views/admin/SettingsView.vue` (12개 섹션, 255+ 항목)
> ASIS 소스: `prev_kiosk/POSON_POS_SELF21/` (pos_config.ini, config.ini, Mdl_Main.bas)

---

## 파트 A: 구현된 설정 항목 (12개 섹션)

### A1. 판매 설정 (saleConfig) - 10항목

| 새 항목명(key)  | 명칭               | DB키                 | INI 파일       | INI 섹션/키              | VB6 변수   | 사용화면                                                             |
| --------------- | ------------------ | -------------------- | -------------- | ------------------------ | ---------- | -------------------------------------------------------------------- |
| openDay         | 영업 시작일        | sale.openDay         | pos_config.ini | [Sale] OpenDay           | (직접 INI) | Frm_Login, Frm_SaleFinish, Frm_SaleMain, Frm_UserChange              |
| finishDay       | 마감일             | sale.finishDay       | pos_config.ini | [Sale] Finish_Day        | (직접 INI) | Frm_Login, Frm_SaleFinish                                            |
| receiptSeq      | 전표 시퀀스        | sale.receiptSeq      | pos_config.ini | [Sale] S_JeonPyo         | (직접 INI) | Frm_Login                                                            |
| receiptNumber   | 전표번호           | sale.receiptNumber   | pos_config.ini | [Sale] St_Jeonpyo        | (직접 INI) | Frm_Login, Frm_SaleMain                                              |
| startPrice      | 시작 금액 (시재금) | sale.startPrice      | pos_config.ini | [Sale] Start_Price       | (직접 INI) | Frm_SaleFinish, Frm_UserChange                                       |
| dataDownloaded  | 마스터 데이터      | sale.dataDownloaded  | pos_config.ini | [Sale] DataDown          | (직접 INI) | INI전용                                                              |
| dataDownGoodsNo | 상품 다운로드 번호 | sale.dataDownGoodsNo | pos_config.ini | [Sale] DataDown_Goods_NO | (직접 INI) | Frm_Login, Frm_DownLoad                                              |
| beforTran       | 이전거래           | sale.beforTran       | pos_config.ini | [Sale] Befor_Tran        | (직접 INI) | Frm_Printer, Frm_UserChange, Frm_Trans, Frm_SaleFinish, Frm_SaleList |
| beforTranDec    | 이전거래 현금      | sale.beforTranDec    | pos_config.ini | [Sale] Befor_Tran_Dec    | (직접 INI) | Frm_UserChange, Frm_Trans, Frm_SaleFinish                            |
| beforTranCard   | 이전거래 카드      | sale.beforTranCard   | pos_config.ini | [Sale] Befor_Tran_Card   | (직접 INI) | Frm_SaleCard_VCAT_KIS, Frm_SaleCard_VCAT_KOVAN                       |

### A2. POS 환경설정 (posConfig) - 68항목

| 새 항목명(key)     | 명칭                   | DB키                   | INI 파일       | INI 섹션/키                    | VB6 변수                        | 사용화면                                                       |
| ------------------ | ---------------------- | ---------------------- | -------------- | ------------------------------ | ------------------------------- | -------------------------------------------------------------- |
| selfPosMode        | POS 모드               | pos.selfPosMode        | pos_config.ini | [Other] SelfPos_YN             | C_Config.Self_YN                | Frm_SaleMain, Frm_SelfKiosk                                    |
| serverMode         | 서버 연결              | pos.serverMode         | pos_config.ini | [Other] (커스텀)               | C_Config.Server_Mode            | Frm_SaleMain                                                   |
| processMethod      | 처리 방식              | pos.processMethod      | pos_config.ini | [Other] Process_Method         | C_Config.SLock_Use              | Frm_SaleMain                                                   |
| priceEditable      | 판매가 수정 허용       | pos.priceEditable      | pos_config.ini | [Other] Price_Edit             | C_Config.Price_Edit             | Frm_SaleMain                                                   |
| printVat           | 부가세 인쇄            | pos.printVat           | pos_config.ini | [Other] Print_VAT              | C_Config.Print_VAT              | Mdl_Printer.bas                                                |
| printBarcode       | 바코드 인쇄            | pos.printBarcode       | pos_config.ini | [Other] Print_Barcode          | C_Config.Print_Barcode          | Mdl_Printer.bas                                                |
| maxCashPrice       | 현금 최대금액          | pos.maxCashPrice       | pos_config.ini | [Other] HyeonGeumPrice         | C_Config.HyeonGeumPrice         | Frm_SaleMain                                                   |
| maxPrice           | 상품 최대금액          | pos.maxPrice           | pos_config.ini | [Other] MaxPrice               | C_Config.MaxPrice               | Frm_ProductSel, Frm_ProductUpdate, Frm_ScalePrice, frm_SelfKey |
| productSound       | 상품 소리              | pos.productSound       | pos_config.ini | [Other] Product_Sound          | C_Config.Product_Sound          | 46+ 폼 (전체)                                                  |
| orderCallEnabled   | 주문 호출              | pos.orderCallEnabled   | pos_config.ini | [Other] Order_Call_YN          | C_Config.Order_Call_YN          | Frm_SaleMain                                                   |
| errorLog           | 오류 로그 기록         | pos.errorLog           | pos_config.ini | [Other] Err_Write              | C_Config.Err_Write              | 전체                                                           |
| cashDrawOnScan     | 미등록 상품 현금함     | pos.cashDrawOnScan     | pos_config.ini | [Other] Product_CashOpen       | C_Config.Product_CashOpen       | Frm_SaleMain                                                   |
| bottomPrint        | 하단 문구 인쇄         | pos.bottomPrint        | pos_config.ini | [Other] Bott_Print             | C_Config.Bott_Print             | Frm_SaleMain                                                   |
| grouping           | 상품 그룹핑            | pos.grouping           | pos_config.ini | [Other] Grouping               | C_Config.Grouping               | Frm_SaleMain                                                   |
| memberReceiptPrint | 회원 미수 인쇄         | pos.memberReceiptPrint | pos_config.ini | [Other] MisuPrint              | C_Config.MisuPrint              | Frm_SaleFinish                                                 |
| offCardCheck       | 오프라인 카드 결제     | pos.offCardCheck       | pos_config.ini | [Other] OFF_CARD_Chk           | C_Config.OFF_CARD_Chk           | Frm_SaleMain, Frm_Trans                                        |
| offCardKeyUse      | 오프라인 카드 키       | pos.offCardKeyUse      | pos_config.ini | [Other] OFF_CARD_KEY_USE       | C_Config.OFF_CARD_KEY_USE       | Frm_SaleMain                                                   |
| minCardPrice       | 카드 최소금액          | pos.minCardPrice       | pos_config.ini | [Other] MIN_Card_Price         | C_Config.MIN_CARD_PRICE         | Frm_SaleMain                                                   |
| handCardEnabled    | 수기 카드 입력         | pos.handCardEnabled    | pos_config.ini | [Other] HAND_CARD_YN           | C_Config.HAND_CARD_YN           | Frm_SaleMain                                                   |
| totalQtyShow       | 수량 합계 표시         | pos.totalQtyShow       | pos_config.ini | [Other] Total_Qty_YN           | C_Config.Total_Qty_YN           | Frm_SaleMain                                                   |
| hotkeyCheck        | 단축키 사용            | pos.hotkeyCheck        | pos_config.ini | [Other] Hotkey_Chk             | C_Config.Hotkey_Chk             | Frm_SaleMain                                                   |
| hotkeyEnterUse     | Enter 단축키           | pos.hotkeyEnterUse     | pos_config.ini | [Other] HOTKEY_ENTER_USE       | C_Config.HOTKEY_ENTER_USE       | Frm_SaleMain                                                   |
| scanCop            | SCANCOP                | pos.scanCop            | pos_config.ini | [Other] SCANCOP                | C_Config.SCANCOP                | Frm_SaleMain                                                   |
| scanRealCheck      | 실시간 스캔 체크       | pos.scanRealCheck      | pos_config.ini | [Other] SCAN_REAL_Chk          | C_Config.SCAN_REAL_Chk          | Frm_SaleMain                                                   |
| allData            | 전체 자료              | pos.allData            | pos_config.ini | [Other] All_Data               | C_Config.All_Data               | Frm_SaleMain                                                   |
| rePoint            | 포인트 사용            | pos.rePoint            | pos_config.ini | [Other] Re_Point               | C_Config.Re_Point               | Frm_SaleMain                                                   |
| reTax              | 현금영수증 발행        | pos.reTax              | pos_config.ini | [Other] Re_Tax                 | C_Config.Re_Tax                 | Frm_SaleMain                                                   |
| reCashBack         | 캐시백                 | pos.reCashBack         | pos_config.ini | [Other] Re_CashBack            | C_Config.Re_CashBack            | Frm_SaleMain                                                   |
| slotAdd            | 슬롯 추가 (여백)       | pos.slotAdd            | pos_config.ini | [Other] Slot_Add               | C_Config.Slot_Add               | Frm_SaleMain                                                   |
| cutPosition        | 용지 절단 위치         | pos.cutPosition        | pos_config.ini | [Other] Cut_Position           | C_Config.Cut_Position           | Mdl_OPOS_Function.bas                                          |
| infoDeskEnabled    | 안내 데스크            | pos.infoDeskEnabled    | pos_config.ini | [Other] InfoDesk_YN            | C_Config.InfoDesk_YN            | Frm_SaleMain                                                   |
| infoDeskViewAll    | 안내 데스크 전체 보기  | pos.infoDeskViewAll    | pos_config.ini | [Other] InfoDesk_ViewAll       | C_Config.InfoDesk_ViewAll       | Frm_SaleMain                                                   |
| allFinish          | 전체 마감              | pos.allFinish          | pos_config.ini | [Other] All_Finish             | C_Config.All_Finish             | Frm_SaleMain                                                   |
| allFinishBak       | 마감 백업              | pos.allFinishBak       | pos_config.ini | [Other] All_Finish_BAK         | C_Config.All_Finish_BAK         | Frm_SaleMain                                                   |
| allFinishBakDef    | 마감 백업 기본값       | pos.allFinishBakDef    | pos_config.ini | [Other] All_Finish_BAK_Def     | C_Config.All_Finish_BAK_Def     | Frm_SaleMain                                                   |
| printerOffCheck    | 프린터 오프 체크       | pos.printerOffCheck    | pos_config.ini | [Other] Printer_OFF_Chk        | C_Config.Printer_Off_Chk        | Frm_SaleMain                                                   |
| eCardEnabled       | 전자카드               | pos.eCardEnabled       | pos_config.ini | [Other] eCard_YN               | C_Config.eCard_YN               | Frm_SaleMain                                                   |
| posMenu            | POS 메뉴               | pos.posMenu            | pos_config.ini | [Other] PosMenu                | C_Config.PosMenu                | Frm_SaleMain                                                   |
| cardTimerEnabled   | 카드 타이머            | pos.cardTimerEnabled   | pos_config.ini | [Other] CARD_Timer_YN          | C_Config.CARD_Timer_YN          | Frm_SaleCard_VCAT_KIS, Frm_SaleCard_VCAT_KOVAN                 |
| boryuEnabled       | 보류 기능              | pos.boryuEnabled       | pos_config.ini | [Other] f_Boryu_YN             | C_Config.f_Boryu_YN             | Frm_Login, Frm_SaleFinish                                      |
| boryuTranOpt       | 보류 거래 옵션         | pos.boryuTranOpt       | pos_config.ini | [Other] Boryu_Tran_Opt         | C_Config.Boryu_Tran_Opt         | Frm_SaleMain                                                   |
| saleFinishOpt      | 판매 마감 옵션         | pos.saleFinishOpt      | pos_config.ini | [Other] Sale_Finish_Opt        | C_Config.Sale_Finish_Opt        | Frm_SaleMain                                                   |
| dayFinishMsgOpt    | 일일 마감 메시지       | pos.dayFinishMsgOpt    | pos_config.ini | [Other] Day_F_Msg_Opt          | C_Config.Day_F_Msg_Opt          | Frm_Login                                                      |
| cardWavOpt         | 카드 소리              | pos.cardWavOpt         | pos_config.ini | [Other] Card_Wav_Opt           | C_Config.Card_Wav_Opt           | Frm_ProductReturn, Frm_SaleCard, Frm_SaleList, Frm_SaleMain    |
| cardView           | 카드 정보 표시         | pos.cardView           | pos_config.ini | [Other] Card_View              | C_Config.Card_View              | Frm_ProductReturn, Frm_SaleList                                |
| giftInputEnabled   | 상품권 입력            | pos.giftInputEnabled   | pos_config.ini | [Other] Gift_Input_YN          | C_Config.Gift_Input_YN          | Frm_SaleMain                                                   |
| giftBillEtc        | 상품권 기타 처리       | pos.giftBillEtc        | pos_config.ini | [Other] GIFT_BILL_ETC          | C_Config.GIFT_BILL_ETC          | Frm_SaleMain                                                   |
| pointBillPrint     | 포인트 영수증          | pos.pointBillPrint     | pos_config.ini | [Other] Point_Bill_Print_YN    | C_Config.Point_Bill_Print_YN    | Mdl_Printer.bas                                                |
| reTranBillPrint    | 재거래 영수증          | pos.reTranBillPrint    | pos_config.ini | [Other] reTranBill_Print_1_YN  | C_Config.reTranBill_Print_1_YN  | Mdl_Printer.bas                                                |
| noCvmBillPrint     | 비CVM 영수증           | pos.noCvmBillPrint     | pos_config.ini | [Other] noCVM_Bill_Print_YN    | C_Config.noCVM_Bill_Print_YN    | Mdl_Printer.bas                                                |
| bellEnabled        | 벨 사용                | pos.bellEnabled        | pos_config.ini | [Self] Bell                    | C_Config.Self_Bell              | Frm_SaleMain, Frm_SelfKiosk                                    |
| memberAddScreen    | 회원 추가 화면         | pos.memberAddScreen    | pos_config.ini | [Other] MEMBER_ADD_SCREEN_YN   | C_Config.MEMBER_ADD_SCREEN_YN   | Frm_SaleMain                                                   |
| jobFinishCashdraw  | 마감 시 현금함         | pos.jobFinishCashdraw  | pos_config.ini | [Other] Job_Finish_Cashdraw_YN | C_Config.Job_Finish_Cashdraw_YN | Frm_SaleMain                                                   |
| scaleDanwiPrint    | 저울 단위 인쇄         | pos.scaleDanwiPrint    | pos_config.ini | [Other] wSclae_Danwi_Print_YN  | C_Config.wSclae_Danwi_Print_YN  | Frm_SaleMain                                                   |
| scaleDanwiView     | 저울 단위 표시         | pos.scaleDanwiView     | pos_config.ini | [Other] wSclae_Danwi_View_YN   | C_Config.wSclae_Danwi_View_YN   | Frm_SaleMain                                                   |
| gradeMemo          | 등급 메모              | pos.gradeMemo          | pos_config.ini | [Other] Grade_Memo_YN          | C_Config.Grade_Memo_YN          | Frm_SaleMain                                                   |
| noBillMessage      | 무영수증 메시지        | pos.noBillMessage      | pos_config.ini | [Other] no_Bill_fMessage_YN    | C_Config.no_Bill_fMessage_YN    | Frm_SaleMain                                                   |
| noBillSound        | 무영수증 소리          | pos.noBillSound        | pos_config.ini | [Other] no_Bill_fSound_YN      | C_Config.no_Bill_fSound_YN      | Frm_SaleMain                                                   |
| noBillCusPoint     | 무영수증 포인트        | pos.noBillCusPoint     | pos_config.ini | [Other] no_Bill_CusPoint_YN    | C_Config.no_Bill_CusPoint_YN    | Frm_SaleList                                                   |
| gridSaleEx         | 판매 그리드 확장       | pos.gridSaleEx         | pos_config.ini | [Other] Grid_SaleEx            | C_Config.Grid_SaleEx            | Frm_SaleMain                                                   |
| masterDownEnabled  | 마스터 자동 다운       | pos.masterDownEnabled  | pos_config.ini | [Other] mDown_YN               | C_Config.mDown_YN               | Frm_Login                                                      |
| masterDownWeek     | 마스터 다운 주기 (주)  | pos.masterDownWeek     | pos_config.ini | [Other] mDown_Week             | C_Config.mDown_Week             | Frm_Login                                                      |
| proComp            | 상품 압축              | pos.proComp            | pos_config.ini | [Other] Pro_Comp               | C_Config.Pro_Comp               | Frm_SaleMain                                                   |
| newItemUpdate      | 신규상품 자동 업데이트 | pos.newItemUpdate      | pos_config.ini | [Other] New_Item_Update        | C_Config.New_Item_Update        | Frm_SaleMain                                                   |
| freeOpt            | 무료 처리              | pos.freeOpt            | pos_config.ini | [Other] Free_Opt               | C_Config.Free_Opt               | Frm_SaleMain                                                   |
| price11            | 11단가 사용            | pos.price11            | pos_config.ini | [Other] price_11_yn            | C_Config.Price_11_YN            | Frm_SaleMain                                                   |
| delay              | 지연시간 (ms)          | pos.delay              | pos_config.ini | [Other] Delay                  | C_Config.Delay                  | Frm_SaleMain                                                   |

### A3. 카드 결제 설정 (cardConfig) - 5항목

| 새 항목명(key)  | 명칭            | DB키                 | INI 파일       | INI 섹션/키            | VB6 변수            | 사용화면                   |
| --------------- | --------------- | -------------------- | -------------- | ---------------------- | ------------------- | -------------------------- |
| vanSelect       | VAN사 선택      | card.vanSelect       | pos_config.ini | [Card] VAN_Select      | VAN.Selected        | Frm_SaleMain               |
| signPadPort     | 서명패드 포트   | card.signPadPort     | pos_config.ini | [Card] SingPad_Port    | VAN.SingPad_Port    | Frm_SaleMain               |
| cashBackEnabled | 캐시백 사용     | card.cashBackEnabled | pos_config.ini | [Card] CashBack_YN     | VAN.CashBack_YN     | Frm_SaleMain, Frm_SelfCash |
| oCashScreen     | 현금영수증 화면 | card.oCashScreen     | pos_config.ini | [Card] OCash_Screen_YN | VAN.OCash_Screen_YN | Frm_SaleMain               |
| logDelete       | 로그 자동 삭제  | card.logDelete       | pos_config.ini | [Card] Log_Delete      | VAN.Log_Delete      | Frm_SaleMain               |

### A4. 단말기 설정 (terminalConfig) - 37항목

| 새 항목명(key)   | 명칭               | DB키                      | INI 파일       | INI 섹션/키                   | VB6 변수                    | 사용화면                    |
| ---------------- | ------------------ | ------------------------- | -------------- | ----------------------------- | --------------------------- | --------------------------- |
| terminalType     | 단말기 유형        | terminal.terminalType     | pos_config.ini | [Terminal] TerminalType       | Terminal.TerminalType       | Frm_SaleMain                |
| posNo            | POS 번호           | terminal.posNo            | pos_config.ini | [Terminal] PosNo              | Terminal.PosNo              | Frm_SaleMain                |
| adminPosNo       | 관리자 POS 번호    | terminal.adminPosNo       | pos_config.ini | [Terminal] AdminPosNo         | Terminal.AdminPosNo         | Frm_SaleMain                |
| cashDraw         | 현금함 사용        | terminal.cashDraw         | pos_config.ini | [Terminal] Cashdraw           | Terminal.CashDraw           | Frm_SaleMain                |
| touch            | 터치 사용          | terminal.touch            | pos_config.ini | [Terminal] Touch              | Terminal.Touch              | Frm_SaleMain, Frm_SelfKiosk |
| dual             | 이중 디스플레이    | terminal.dual             | pos_config.ini | [Terminal] Dual               | Terminal.Dual               | Frm_SaleMain                |
| dualType         | 이중 화면 유형     | terminal.dualType         | pos_config.ini | [Terminal] Dual_Type          | Terminal.Dual_Type          | Frm_SaleMain                |
| printer          | 프린터 종류        | terminal.printer          | pos_config.ini | [Terminal] Printer            | Terminal.Printer            | Frm_SaleMain                |
| printerPort      | 프린터 포트        | terminal.printerPort      | pos_config.ini | [Terminal] Printer_Port       | Terminal.Printer_Port       | Frm_SaleMain                |
| printerBps       | 프린터 통신속도    | terminal.printerBps       | pos_config.ini | [Terminal] Printer_Bps        | Terminal.Printer_Bps        | Frm_SaleMain                |
| scanName         | 스캐너 종류        | terminal.scanName         | pos_config.ini | [Terminal] Scan_Name          | Terminal.Scan_Name          | Frm_SaleMain                |
| scanPort         | 스캐너 포트        | terminal.scanPort         | pos_config.ini | [Terminal] Scan_Port          | Terminal.Scan_Port          | Frm_SaleMain                |
| handScanPort     | 핸드스캐너 포트    | terminal.handScanPort     | pos_config.ini | [Terminal] HandScan_Port      | Terminal.HandScan_Port      | Frm_SaleMain                |
| cdpName          | CDP 이름           | terminal.cdpName          | pos_config.ini | [Terminal] CDPName            | Terminal.CDPName            | Frm_SaleMain                |
| cdpLine          | CDP 라인 수        | terminal.cdpLine          | pos_config.ini | [Terminal] CDPLine            | Terminal.CDPLine            | Frm_SaleMain                |
| cdpType          | CDP 타입           | terminal.cdpType          | pos_config.ini | [Terminal] CDPType            | Terminal.CDPType            | Frm_SaleMain                |
| cdpPort          | CDP 포트           | terminal.cdpPort          | pos_config.ini | [Terminal] CDP_Port           | Terminal.CDP_Port           | Frm_SaleMain                |
| cdpBps           | CDP 통신속도       | terminal.cdpBps           | pos_config.ini | [Terminal] CDP_BPS            | Terminal.CDP_BPS            | Frm_SaleMain                |
| cdpCashYn        | CDP 현금함 사용    | terminal.cdpCashYn        | pos_config.ini | [Terminal] CDP_CASH_YN        | Terminal.CDP_CASH_YN        | Frm_SaleMain                |
| coinName         | 코인기 이름        | terminal.coinName         | pos_config.ini | [Terminal] Coin_Name          | Terminal.Coin_Name          | Frm_SaleMain                |
| coinPort         | 코인기 포트        | terminal.coinPort         | pos_config.ini | [Terminal] Coin_Port          | Terminal.Coin_Port          | Frm_SaleMain                |
| monitor          | 모니터 해상도      | terminal.monitor          | pos_config.ini | [Terminal] Moniter            | Terminal.Moniter            | Frm_SaleMain                |
| sMonitor         | 보조 모니터        | terminal.sMonitor         | pos_config.ini | [Terminal] S_Moniter          | Terminal.S_Moniter          | Frm_SaleMain                |
| msrPort          | MSR 포트           | terminal.msrPort          | pos_config.ini | [Terminal] MSR_Port           | Terminal.MSR_Port           | Frm_SaleMain                |
| msrBps           | MSR 통신속도       | terminal.msrBps           | pos_config.ini | [Terminal] MSR_BPS            | Terminal.MSR_BPS            | Frm_SaleMain                |
| suPyoPort        | 수표 포트          | terminal.suPyoPort        | pos_config.ini | [Terminal] SuPyo_Port         | Terminal.SuPyo_Port         | Frm_SaleMain                |
| printerCatUse    | CAT 단말기 사용    | terminal.printerCatUse    | pos_config.ini | [Terminal] Printer_CAT_USE    | Terminal.Printer_CAT_USE    | Frm_SaleMain                |
| catPort          | CAT 포트           | terminal.catPort          | pos_config.ini | [Terminal] CAT_Port           | Terminal.CAT_Port           | Frm_SaleMain                |
| catBps           | CAT 통신속도       | terminal.catBps           | pos_config.ini | [Terminal] CAT_BPS            | Terminal.CAT_BPS            | Frm_SaleMain                |
| scalePort        | 저울 포트          | terminal.scalePort        | pos_config.ini | [Terminal] CBO_ScalePort      | Terminal.CBO_ScalePort      | Frm_SaleMain                |
| printerSerialBps | 프린터 시리얼 속도 | terminal.printerSerialBps | pos_config.ini | [Terminal] Printer_Serial_Bps | Terminal.Printer_Serial_Bps | Frm_SaleMain                |
| bellYn           | 벨 사용            | terminal.bellYn           | pos_config.ini | [Terminal] Bell_YN            | Terminal.Bell_YN            | Frm_SaleMain                |
| bellType         | 벨 유형            | terminal.bellType         | pos_config.ini | [Terminal] Bell_Type          | Terminal.Bell_Type          | Frm_SaleMain                |
| bellComPort      | 벨 COM 포트        | terminal.bellComPort      | pos_config.ini | [Terminal] Bell_ComPort       | Terminal.Bell_ComPort       | Frm_SaleMain                |
| bellName         | 벨 이름            | terminal.bellName         | pos_config.ini | [Terminal] Bell_Name          | Terminal.Bell_Name          | Frm_SaleMain                |
| bellFid          | 벨 FID             | terminal.bellFid          | pos_config.ini | [Terminal] Bell_fID           | Terminal.Bell_fID           | Frm_SaleMain                |
| bellFidYn        | 벨 FID 사용        | terminal.bellFidYn        | pos_config.ini | [Terminal] Bell_fID_YN        | Terminal.Bell_fID_YN        | Frm_SaleMain                |
| bellLen          | 벨 길이            | terminal.bellLen          | pos_config.ini | [Terminal] Bell_LEN           | Terminal.Bell_LEN           | Frm_SaleMain                |

### A5. 화면 설정 (displayConfig) - 9항목

| 새 항목명(key)  | 명칭             | DB키                    | INI 파일       | INI 섹션/키              | VB6 변수                  | 사용화면     |
| --------------- | ---------------- | ----------------------- | -------------- | ------------------------ | ------------------------- | ------------ |
| enableSound     | 효과음 사용      | display.enableSound     | (신규)         | -                        | -                         | 전체         |
| enableAnimation | 애니메이션 사용  | display.enableAnimation | (신규)         | -                        | -                         | 전체         |
| saleView        | 매출내역 표시    | display.saleView        | pos_config.ini | [Other] SaleView         | C_Config.SaleView         | Frm_SaleMain |
| inPriView       | 입고가 표시      | display.inPriView       | pos_config.ini | [Other] InPriView        | C_Config.InPriView        | Frm_SaleMain |
| gridFix         | 그리드 고정      | display.gridFix         | pos_config.ini | [Other] Grid_Fix_YN      | C_Config.Grid_Fix_YN      | Frm_SaleMain |
| logoMinimize    | 로고 최소화      | display.logoMinimize    | pos_config.ini | [Other] Logo_Min_YN      | C_Config.Logo_Min_YN      | Frm_SaleMain |
| engEnabled      | 영문 모드        | display.engEnabled      | pos_config.ini | [Other] ENG_YN           | C_Config.ENG_YN           | Frm_SaleMain |
| dualPosTest     | 이중 POS 테스트  | display.dualPosTest     | pos_config.ini | [Other] Dual_Pos_TEST    | C_Config.Dual_Pos_TEST    | Frm_SaleMain |
| touchHotKeyOpt  | 터치 단축키 옵션 | display.touchHotKeyOpt  | pos_config.ini | [Other] Touch_HotKey_Opt | C_Config.Touch_HotKey_Opt | Frm_SaleMain |

### A6. 셀프POS 설정 (selfConfig) - 73항목

| 새 항목명(key)  | 명칭                 | DB키                 | INI 파일       | INI 섹션/키                | VB6 변수                     | 사용화면                                                                   |
| --------------- | -------------------- | -------------------- | -------------- | -------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| soundGuide      | 음성 안내            | self.soundGuide      | pos_config.ini | [Self] SoundGuide          | C_Config.Self_SoundGuide     | Mdl_Function.bas, Frm_SelfKiosk                                            |
| touchSound      | 터치 소리            | self.touchSound      | pos_config.ini | [Self] self_TouchSoundYN   | C_Config.self_TouchSoundYN   | Frm_SelfKiosk                                                              |
| cashEnabled     | 현금 결제            | self.cashEnabled     | pos_config.ini | [Self] self_Cash           | C_Config.self_Cash           | Frm_SaleMain, Frm_SelfAlarm, Frm_SelfCash, Frm_SelfKiosk, Frm_SelfSMSAdmin |
| cashPort        | 현금기 포트          | self.cashPort        | pos_config.ini | [Self] self_CashPort       | C_Config.self_CashPort       | Frm_SelfCash                                                               |
| cashSleep       | 현금기 대기시간      | self.cashSleep       | pos_config.ini | [Self] self_CashSleep      | C_Config.self_CashSleep      | Frm_SelfCash                                                               |
| cashGubun       | 현금 구분            | self.cashGubun       | pos_config.ini | [Self] self_CashGubun      | C_Config.self_CashGubun      | Frm_SelfCash                                                               |
| cardEnabled     | 카드 결제            | self.cardEnabled     | pos_config.ini | [Self] Self_Card           | C_Config.self_NoCardUse      | Frm_SelfKiosk                                                              |
| appCard         | 앱카드               | self.appCard         | pos_config.ini | [Self] self_AppCard        | C_Config.self_AppCard        | Frm_SaleCard                                                               |
| appleEnabled    | Apple Pay            | self.appleEnabled    | pos_config.ini | [Self] self_Apple          | C_Config.self_Apple          | Frm_SaleCard                                                               |
| mainPage        | 메인페이지 유형      | self.mainPage        | pos_config.ini | [Self] Self_MainPage       | C_Config.self_MainPage       | Frm_SelfKiosk, Frm_SaleMain                                                |
| userCallEnabled | 직원 호출            | self.userCallEnabled | pos_config.ini | [Self] Self_UserCall       | C_Config.Self_UserCall       | Frm_SaleMain, Frm_SelfAlarm                                                |
| kakaoEnabled    | 카카오 연동          | self.kakaoEnabled    | pos_config.ini | [Self] Self_Kakao          | C_Config.self_Kakao          | Frm_SelfKiosk                                                              |
| customerSelect  | 고객 선택            | self.customerSelect  | pos_config.ini | [Self] self_CusSelect      | C_Config.self_CusSelect      | Frm_SelfKiosk                                                              |
| cameraUse       | 카메라 사용          | self.cameraUse       | pos_config.ini | [Self] Self_CamUse         | C_Config.self_CamUse         | Frm_SelfKiosk                                                              |
| zeroEnabled     | 0원 결제             | self.zeroEnabled     | pos_config.ini | [Self] Self_Zero           | C_Config.Self_Zero           | Frm_SelfKiosk                                                              |
| smsAdmin        | SMS 관리자           | self.smsAdmin        | pos_config.ini | [Self] Self_SMSAdmin       | C_Config.self_SMSAdmin       | Frm_SelfSMSAdmin                                                           |
| reader          | 카드 리더 유형       | self.reader          | pos_config.ini | [Self] Self_Reader         | C_Config.self_Reader         | Frm_SelfKiosk                                                              |
| noAutoPoint     | 자동 포인트 미적용   | self.noAutoPoint     | pos_config.ini | [Self] self_NoAutoPoint    | C_Config.self_NoAutoPoint    | Frm_SelfKiosk                                                              |
| pointZero       | 포인트 0원           | self.pointZero       | pos_config.ini | [Self] self_PointZero      | C_Config.Self_PointZero      | Frm_SelfKiosk                                                              |
| pointHidden     | 포인트 숨기기        | self.pointHidden     | pos_config.ini | [Self] self_PointHidden    | C_Config.self_PointHidden    | Frm_SelfKiosk                                                              |
| pointSmsUse     | 포인트 SMS           | self.pointSmsUse     | pos_config.ini | [Self] Self_PointSMSUse    | C_Config.Self_PointSMSUse    | frm_SelfCusInfo                                                            |
| printAddress    | 주소 인쇄            | self.printAddress    | pos_config.ini | [Self] self_PrintAddress   | C_Config.self_PrintAddress   | Frm_SelfKiosk                                                              |
| printPhone      | 전화번호 인쇄        | self.printPhone      | pos_config.ini | [Self] self_PrintPhon      | C_Config.self_PrintPhon      | Frm_SelfKiosk                                                              |
| autoPrint       | 자동 인쇄            | self.autoPrint       | pos_config.ini | [Self] Self_AutoPrint      | C_Config.Self_AutoPrint      | Frm_SaleMain, frm_SelfPrint                                                |
| stoPrint        | 저장 인쇄            | self.stoPrint        | pos_config.ini | [Self] self_StoPrint       | C_Config.self_StoPrint       | Frm_SelfKiosk                                                              |
| noAutoGoods     | 자동 상품 비활성     | self.noAutoGoods     | pos_config.ini | [Self] Self_NoAutoGoods    | C_Config.Self_NoAutoGoods    | Frm_SelfKiosk                                                              |
| oneCancel       | 1건 취소             | self.oneCancel       | pos_config.ini | [Self] Self_OneCancel      | C_Config.Self_OneCancel      | Frm_SelfKiosk                                                              |
| zHotKey         | Z 단축키             | self.zHotKey         | pos_config.ini | [Self] Self_zHotKey        | C_Config.Self_zHotKey        | Frm_SelfKiosk                                                              |
| btInit          | BT 초기화            | self.btInit          | pos_config.ini | [Self] Self_BTInit         | C_Config.self_BTInit         | Frm_SelfKiosk                                                              |
| noCustomer      | 비회원 모드          | self.noCustomer      | pos_config.ini | [Self] self_NoCustomer     | C_Config.self_NoCustomer     | Frm_SelfKiosk                                                              |
| countYn         | 카운트 표시          | self.countYn         | pos_config.ini | [Self] self_CountYN        | C_Config.self_CountYN        | Frm_SelfKiosk, Frm_SaleMain                                                |
| startHotKey     | 시작 단축키          | self.startHotKey     | pos_config.ini | [Self] self_StartHotKey    | C_Config.self_StartHotKey    | Frm_SelfKiosk                                                              |
| cusNum4         | 고객번호 4자리       | self.cusNum4         | pos_config.ini | [Self] Self_CusNum4        | C_Config.Self_CusNum4        | Frm_SelfKiosk                                                              |
| noHyunYoung     | 현영 미사용          | self.noHyunYoung     | pos_config.ini | [Self] self_NoHyunYoung    | C_Config.self_NoHyunYoung    | Frm_SelfCash                                                               |
| oneHPUse        | 1원 사용             | self.oneHPUse        | pos_config.ini | [Self] self_OneHPUse       | C_Config.self_OneHPUse       | Frm_SelfCash                                                               |
| fiftyHPUse      | 50원 사용            | self.fiftyHPUse      | pos_config.ini | [Self] self_50HPUse        | C_Config.self_50HPUse        | Frm_SelfCash                                                               |
| tenThousandUse  | 만원권 사용          | self.tenThousandUse  | pos_config.ini | [Self] self_10000Use       | C_Config.self_10000Use       | Frm_SelfCash                                                               |
| priceUse        | 가격 표시            | self.priceUse        | pos_config.ini | [Self] self_PriceUse       | C_Config.self_PriceUse       | Frm_SelfKiosk                                                              |
| priceType       | 가격 유형            | self.priceType       | pos_config.ini | [Self] self_PriceType      | C_Config.self_PriceType      | Frm_SelfKiosk                                                              |
| mainBagSell     | 봉투 판매            | self.mainBagSell     | pos_config.ini | [Self] Self_MBagSell       | C_Config.Self_MBagSell       | Frm_SelfKiosk                                                              |
| startBag        | 시작 봉투            | self.startBag        | pos_config.ini | [Self] self_StartBag       | C_Config.self_StartBag       | Frm_SelfKiosk                                                              |
| lastBag         | 마지막 봉투          | self.lastBag         | pos_config.ini | [Self] self_LastBag        | C_Config.self_LastBag        | Frm_SelfKiosk                                                              |
| bagPort         | 봉투기 포트          | self.bagPort         | pos_config.ini | [Self] self_BagPort        | C_Config.self_BagPort        | Frm_SelfKiosk                                                              |
| bagJPPort       | 봉투기 JP 포트       | self.bagJPPort       | pos_config.ini | [Self] self_BagJPPort      | C_Config.self_BagJPPort      | Frm_SelfKiosk                                                              |
| jpYn            | 자판기 사용          | self.jpYn            | pos_config.ini | [Self] Self_JPYN           | C_Config.Self_JPYN           | Frm_SelfKiosk                                                              |
| icSiren         | IC 사이렌            | self.icSiren         | pos_config.ini | [Self] self_ICSiren        | C_Config.self_ICSiren        | Frm_SelfKiosk                                                              |
| scalePort       | 저울 포트            | self.scalePort       | pos_config.ini | [Self] Self_ScalePort      | C_Config.self_ScalePort      | Frm_SelfKiosk                                                              |
| scaleLimitG     | 저울 한도 (g)        | self.scaleLimitG     | pos_config.ini | [Self] Self_ScaleLimitG    | C_Config.Self_ScaleLimitG    | Frm_SelfKiosk                                                              |
| stlGoods        | STL 상품             | self.stlGoods        | pos_config.ini | [Self] STLGoods            | C_Config.Self_STLGoods       | Frm_SelfKiosk                                                              |
| stlNoGoods      | STL 비상품           | self.stlNoGoods      | pos_config.ini | [Self] STLNoGoods          | C_Config.Self_STLNoGoods     | Frm_SelfKiosk                                                              |
| stlGoodsNo      | STL 상품번호         | self.stlGoodsNo      | pos_config.ini | [Self] STLGoodsNo          | C_Config.self_STLGoodsNo     | Frm_SelfKiosk                                                              |
| stlSoundAdmin   | STL 사운드 관리      | self.stlSoundAdmin   | pos_config.ini | [Self] STLSoundAdmin       | C_Config.Self_STLSoundAdmin  | Frm_SelfKiosk                                                              |
| stlPort         | STL 포트             | self.stlPort         | pos_config.ini | [Self] STLPort             | C_Config.Self_STLPort        | Frm_SelfKiosk                                                              |
| bell            | 벨                   | self.bell            | pos_config.ini | [Self] Bell                | C_Config.Self_Bell           | Frm_SelfKiosk                                                              |
| autoOpenYn      | 자동 개점            | self.autoOpenYn      | pos_config.ini | [Self] Auto_Open_YN        | C_Config.Auto_Open_YN        | Frm_SelfKiosk                                                              |
| autoFinishYn    | 자동 마감            | self.autoFinishYn    | pos_config.ini | [Self] Auto_Finish_YN      | C_Config.Auto_finish_YN      | Frm_SelfKiosk                                                              |
| autoDay         | 자동 개점일          | self.autoDay         | pos_config.ini | [Self] Auto_Day            | C_Config.Auto_Day            | Frm_SelfKiosk                                                              |
| autoAP          | 오전/오후            | self.autoAP          | pos_config.ini | [Self] Auto_AP             | C_Config.Auto_AP             | Frm_SelfKiosk                                                              |
| autoHH          | 자동 시간 (시)       | self.autoHH          | pos_config.ini | [Self] Auto_HH             | C_Config.Auto_HH             | Frm_SelfKiosk                                                              |
| autoMM          | 자동 시간 (분)       | self.autoMM          | pos_config.ini | [Self] Auto_MM             | C_Config.auto_MM             | Frm_SelfKiosk                                                              |
| autoId          | 자동 로그인 ID       | self.autoId          | pos_config.ini | [Self] Auto_ID             | C_Config.Auto_ID             | Frm_SelfKiosk                                                              |
| autoPass        | 자동 로그인 비밀번호 | self.autoPass        | pos_config.ini | [Self] Auto_Pass           | C_Config.Auto_Pass           | Frm_SelfKiosk                                                              |
| cusAddUse       | 고객 추가 사용       | self.cusAddUse       | pos_config.ini | [Self] CusAddUse           | C_Config.Self_CusAddUse      | Frm_SaleMain                                                               |
| cusAlarmUse     | 고객 알림            | self.cusAlarmUse     | pos_config.ini | [Self] self_CusAlarmUse    | C_Config.self_CusAlarmUse    | Frm_SaleMain                                                               |
| cusAlarmTime    | 고객 알림 시간       | self.cusAlarmTime    | pos_config.ini | [Self] Self_CusAlarmTime   | C_Config.Self_CusAlarmTime   | Frm_SelfAlarm                                                              |
| snsGubun        | SNS 구분             | self.snsGubun        | pos_config.ini | [Self] self_SNSGubun       | Shop.self_SNSGubun (DB)      | Frm_SelfSMS                                                                |
| cashPhonNum     | 현금 전화번호        | self.cashPhonNum     | pos_config.ini | [Self] self_CashPhonNum    | C_Config.self_CashPhonNum    | Frm_SelfCash                                                               |
| cusTopMsg       | 상단 메시지          | self.cusTopMsg       | pos_config.ini | [Self] CusTopMsg           | C_Config.Self_CusTopMsg      | Frm_SaleMain                                                               |
| cusBtMsg1       | 하단 메시지 1        | self.cusBtMsg1       | pos_config.ini | [Self] CusBTMsg1           | C_Config.Self_CusBTMsg1      | Frm_SelfKiosk                                                              |
| cusBtMsg2       | 하단 메시지 2        | self.cusBtMsg2       | pos_config.ini | [Self] CusBTMsg2           | C_Config.Self_CusBTMsg2      | Frm_SelfKiosk                                                              |
| noBillCusPoint  | 무영수증 포인트      | self.noBillCusPoint  | pos_config.ini | [Self] no_Bill_CusPoint_YN | C_Config.no_Bill_CusPoint_YN | Frm_SelfKiosk                                                              |
| gifPath         | GIF 파일 경로        | self.gifPath         | pos_config.ini | [Self] Self_Gif            | C_Config.self_CardImg        | Frm_SelfKiosk                                                              |

### A7. 바코드/중량 설정 (barcodeConfig) - 6항목

| 새 항목명(key) | 명칭                 | DB키                   | INI 파일   | INI 섹션/키               | VB6 변수                  | 사용화면     |
| -------------- | -------------------- | ---------------------- | ---------- | ------------------------- | ------------------------- | ------------ |
| barCodeLen     | 바코드 자동부여 숫자 | barcode.barCodeLen     | config.ini | [Length] BarCodeLen       | sBarCodeLen (basCommon)   | Frm_SaleMain |
| scaleLen       | 중량상품 코드 길이   | barcode.scaleLen       | config.ini | [Length] ScaleLen         | sScaleLen (basCommon)     | Frm_SaleMain |
| scaleStartChar | 중량상품 시작문자    | barcode.scaleStartChar | (DB)       | S_Config.Scale_Start_Char | S_Config.Scale_Start_Char | Frm_SaleMain |
| scale18YN      | 18자리 중량 바코드   | barcode.scale18YN      | (DB)       | S_Config.Scale_18_YN      | S_Config.Scale_18_YN      | Frm_SaleMain |
| scalePriceCut  | 중량 가격 절사       | barcode.scalePriceCut  | (DB)       | S_Config.Scale_Price_Cut  | S_Config.Scale_Price_Cut  | Frm_SaleMain |
| weightPoint    | 중량 상품 포인트     | barcode.weightPoint    | (DB)       | S_Config.Weight_Point     | S_Config.Weight_Point     | Frm_SaleMain |

### A8. 수수료 설정 (commissionConfig) - 5항목

| 새 항목명(key) | 명칭              | DB키                | INI 파일   | INI 섹션/키     | VB6 변수   | 사용화면     |
| -------------- | ----------------- | ------------------- | ---------- | --------------- | ---------- | ------------ |
| card           | 카드 수수료 (%)   | commission.card     | config.ini | [SuSu] Card     | (직접 INI) | 관리프로그램 |
| point          | 포인트 수수료 (%) | commission.point    | config.ini | [SuSu] Point    | (직접 INI) | 관리프로그램 |
| cashBack       | 캐시백 수수료 (%) | commission.cashBack | config.ini | [SuSu] CashBack | (직접 INI) | 관리프로그램 |
| cash           | 현금 수수료 (%)   | commission.cash     | config.ini | [SuSu] Cash     | (직접 INI) | 관리프로그램 |
| cashRate       | 현금 비율 (%)     | commission.cashRate | config.ini | [SuSu] CashRate | (직접 INI) | 관리프로그램 |

### A9. 영수증 설정 (receiptConfig) - 17항목

| 새 항목명(key)  | 명칭              | DB키               | INI 파일       | INI 섹션/키          | VB6 변수              | 사용화면     |
| --------------- | ----------------- | ------------------ | -------------- | -------------------- | --------------------- | ------------ |
| shopName        | 매장명            | receipt.shopName   | pos_config.ini | [Receipt] ShopName   | Shop.OFFICE_NAME (DB) | Frm_SaleMain |
| shopNumber      | 사업자번호        | receipt.shopNumber | pos_config.ini | [Receipt] ShopNumber | Shop.Office_num (DB)  | Frm_SaleMain |
| address         | 주소              | receipt.address    | pos_config.ini | [Receipt] Address    | Shop.Address1 (DB)    | Frm_SaleMain |
| owner           | 대표자            | receipt.owner      | pos_config.ini | [Receipt] Owner      | Shop.Owner_Name (DB)  | Frm_SaleMain |
| tel             | 전화번호          | receipt.tel        | pos_config.ini | [Receipt] Tel        | Shop.Office_Tel1 (DB) | Frm_SaleMain |
| top1~top5       | 영수증 상단 1~5줄 | receipt.top1~5     | pos_config.ini | [Receipt] Top1~5     | (직접 INI)            | Frm_SaleMain |
| bottom1~bottom5 | 영수증 하단 1~5줄 | receipt.bottom1~5  | pos_config.ini | [Receipt] Buttom1~5  | (직접 INI)            | Frm_SaleMain |
| memMsg1         | 회원 메시지 1     | receipt.memMsg1    | pos_config.ini | [Mem_Msg] (직접)     | (직접 INI)            | Frm_SaleMain |
| memMsg2         | 회원 메시지 2     | receipt.memMsg2    | pos_config.ini | [Mem_Msg] (직접)     | (직접 INI)            | Frm_SaleMain |

### A10. 고객번호 키 설정 (customerConfig) - 4항목

| 새 항목명(key) | 명칭                   | DB키             | INI 파일   | INI 섹션/키        | VB6 변수   | 사용화면     |
| -------------- | ---------------------- | ---------------- | ---------- | ------------------ | ---------- | ------------ |
| cusNum1        | 고객번호 키 1 (기본:&) | customer.cusNum1 | config.ini | [Customer] CusNum1 | (직접 INI) | Frm_SaleMain |
| cusNum2        | 고객번호 키 2 (기본:#) | customer.cusNum2 | config.ini | [Customer] CusNum2 | (직접 INI) | Frm_SaleMain |
| cusNum3        | 고객번호 키 3 (기본:$) | customer.cusNum3 | config.ini | [Customer] CusNum3 | (직접 INI) | Frm_SaleMain |
| cusNum4        | 고객번호 키 4 (기본:%) | customer.cusNum4 | config.ini | [Customer] CusNum4 | (직접 INI) | Frm_SaleMain |

### A11. VAN 상세 설정 (vanDetailConfig) - 17항목

| 새 항목명(key) | 명칭                | DB키             | INI 파일       | INI 섹션/키         | VB6 변수         | 사용화면     |
| -------------- | ------------------- | ---------------- | -------------- | ------------------- | ---------------- | ------------ |
| danmalNo       | 단말기 번호         | van.danmalNo     | pos_config.ini | [VAN명] DANMALNO    | VAN.DanmalNo     | Frm_SaleMain |
| vanIp          | VAN 서버 IP         | van.vanIp        | pos_config.ini | [VAN명] IP          | VAN.IP           | Frm_SaleMain |
| vanPort        | VAN 서버 Port       | van.vanPort      | pos_config.ini | [VAN명] Port        | VAN.Port         | Frm_SaleMain |
| sNumber        | 사업자번호 (가맹점) | van.sNumber      | pos_config.ini | [VAN명] Snumber     | VAN.SNumber      | Frm_SaleMain |
| signPadBps     | 서명패드 BPS        | van.signPadBps   | pos_config.ini | [VAN명] SingPad_BPS | VAN.SingPad_BPS  | Frm_SaleMain |
| workingKey     | Working Key         | van.workingKey   | pos_config.ini | [VAN명] WorkingKey  | VAN.WorkingKey   | Frm_SaleMain |
| kcbIp          | KCB IP              | van.kcbIp        | pos_config.ini | [KCB] IP            | VAN.KCB_IP       | Frm_SaleMain |
| kcbPort        | KCB Port            | van.kcbPort      | pos_config.ini | [KCB] Port          | VAN.KCB_Port     | Frm_SaleMain |
| kcbDanmalNo    | KCB 단말번호        | van.kcbDanmalNo  | pos_config.ini | [KCB] DanmalNo      | VAN.KCB_DanmalNo | Frm_SaleMain |
| vanType        | VAN 구분            | van.vanType      | (신규)         | -                   | -                | -            |
| catId          | CAT ID              | van.catId        | (신규)         | -                   | -                | -            |
| serialNo       | 시리얼 번호         | van.serialNo     | (신규)         | -                   | -                | -            |
| approvalType   | 승인 방식           | van.approvalType | (신규)         | -                   | -                | -            |
| encryptYn      | 암호화 사용         | van.encryptYn    | (신규)         | -                   | -                | -            |
| ddcYn          | DDC 사용            | van.ddcYn        | (신규)         | -                   | -                | -            |
| signPadType    | 서명패드 타입       | van.signPadType  | (신규)         | -                   | -                | -            |
| icReaderType   | IC리더기 타입       | van.icReaderType | (신규)         | -                   | -                | -            |

### A12. 주방 프린터 설정 (kitchenConfig) - 4항목

| 새 항목명(key)   | 명칭              | DB키                     | INI 파일       | INI 섹션/키                 | VB6 변수                  | 사용화면                         |
| ---------------- | ----------------- | ------------------------ | -------------- | --------------------------- | ------------------------- | -------------------------------- |
| kitchenPrint     | 주방 프린터 사용  | kitchen.kitchenPrint     | pos_config.ini | [Terminal] KitchenPrint     | Terminal.KitchenPrint     | Frm_KitchenInfo, Mdl_Printer.bas |
| kitchenPrintPort | 프린터 포트       | kitchen.kitchenPrintPort | pos_config.ini | [Terminal] KitchenPrintPort | Terminal.KitchenPrintPort | Frm_KitchenInfo                  |
| kitchenPrintBps  | 프린터 속도 (BPS) | kitchen.kitchenPrintBps  | pos_config.ini | [Terminal] KitchenPrintBps  | Terminal.KitchenPrintBps  | Frm_KitchenInfo                  |
| kitchenSlotAdd   | 슬롯 추가         | kitchen.kitchenSlotAdd   | pos_config.ini | [Terminal] Kitchen_fontsize | Terminal.Kitchen_fontsize | Frm_KitchenInfo                  |

---

## 파트 B: 미구현 설정 항목 (ASIS에 있으나 SettingsView.vue에 없는 항목)

### B1. [Self21] 섹션 - 우선순위: 높음

| INI 섹션/키               | 명칭                 | VB6 변수                  | 설명                                    | 사용화면        |
| ------------------------- | -------------------- | ------------------------- | --------------------------------------- | --------------- |
| [Self21] self21_CountYN   | 수량변경버튼 미사용  | C_Config.self21_CountYN   | selfConfig.countYn과 별도 (21인치 전용) | Mdl_Main.bas    |
| [Self21] slef21_DCVisible | 회원할인 할인가 표시 | C_Config.slef21_DCVisible | 21인치 전용                             | frm_SelfCusInfo |
| [Self21] self_CusAddEtc   | 기타 회원가입 안내   | C_Config.self_CusAddEtc   | 21인치 전용                             | Frm_SelfAlarm   |

### B2. [Selfimg] 섹션 - 우선순위: 높음

| INI 섹션/키                   | 명칭                   | VB6 변수                     | 설명                             | 사용화면                                      |
| ----------------------------- | ---------------------- | ---------------------------- | -------------------------------- | --------------------------------------------- |
| [SelfImg] ScanUse             | 이미지판매 스캐너 사용 | C_Config.SelfImg_ScanNoUse   | 이미지 셀프판매 전용             | Mdl_Main.bas                                  |
| [SelfImg] onlyShop            | 매장전용주문 사용      | C_Config.SelfImg_onlyShop    | 이미지 셀프판매 전용             | Frm_SelfOrderList                             |
| [SelfImg] prepayment          | 선결제 사용            | C_Config.SelfImg_prepayment  | 이미지 셀프판매 전용             | Frm_ProductUpdate, Frm_SaleList, Frm_SaleMain |
| [SelfImg] selfImg_TableNoUse  | 테이블 번호 미사용     | (미사용)                     | INI에 존재하지만 코드에서 미참조 | -                                             |
| [SelfImg] selfImg_TableNumUse | 테이블 번호 사용       | C_Config.selfImg_TableNumUse | 이미지 셀프판매 전용             | Mdl_Main.bas                                  |
| [SelfImg] Selfimg_Startimg    | 시작화면 이미지 경로   | C_Config.Selfimg_Startimg    | 이미지 경로                      | Mdl_Main.bas                                  |
| [SelfImg] Selfimg_Orderimg    | 주문화면 이미지 경로   | C_Config.selfImg_Orderimg    | 이미지 경로                      | Mdl_Main.bas                                  |

### B3. [FaceCam] 섹션 - 우선순위: 중간

| INI 섹션/키           | 명칭                  | VB6 변수                     | 설명                  | 사용화면                               |
| --------------------- | --------------------- | ---------------------------- | --------------------- | -------------------------------------- |
| [FaceCam] Use         | FaceCam 사용여부      | C_Config.FaceCam_USE         | Self_YN=1일 때 강제 0 | Mdl_Main.bas                           |
| [FaceCam] TimeOut_Use | FaceCam 타임아웃 사용 | C_Config.FaceCam_TimeOut_USE |                       | Mdl_Main.bas                           |
| [FaceCam] Dealy       | FaceCam 딜레이(초)    | C_Config.FaceCam_Dealy       |                       | Frm_SaleMain, Frm_SaleCard_VCAT_SMT 등 |
| [FaceCam] TimeOut_Sec | FaceCam 타임아웃(초)  | C_Config.FaceCam_TimeOut_Sec | 기본값 120            | Mdl_Main.bas                           |

### B4. [Parking_DC] 섹션 - 우선순위: 낮음

| INI 섹션/키                | 명칭                  | VB6 변수               | 설명                  | 사용화면     |
| -------------------------- | --------------------- | ---------------------- | --------------------- | ------------ |
| [Parking_DC] GS_Parking_YN | 주차할인(GS파크) 사용 | C_Config.GS_Parking_YN | Self_YN=1일 때 강제 0 | Mdl_Main.bas |

### B5. [JaPan] 섹션 - 우선순위: 낮음

| INI 섹션/키            | 명칭              | VB6 변수   | 설명        | 사용화면 |
| ---------------------- | ----------------- | ---------- | ----------- | -------- |
| [JaPan] Auto_Open_YN   | 자판기 자동개방   | (직접 INI) | 자판기 연동 | INI전용  |
| [JaPan] jp_Port1       | 자판기 포트1      | (직접 INI) |             | INI전용  |
| [JaPan] jp_Port2       | 자판기 포트2      | (직접 INI) |             | INI전용  |
| [JaPan] jp_StoYN       | 자판기 재고사용   | (직접 INI) |             | INI전용  |
| [JaPan] jp_oneSell     | 자판기 단품판매   | (직접 INI) |             | INI전용  |
| [JaPan] jp_FirstPage   | 자판기 첫페이지   | (직접 INI) |             | INI전용  |
| [JaPan] jp_SellPriShow | 자판기 판매가표시 | (직접 INI) |             | INI전용  |

### B6. [POSON2_UPSS] 섹션 - 우선순위: 중간

| INI 섹션/키               | 명칭                  | VB6 변수                         | 설명 | 사용화면                       |
| ------------------------- | --------------------- | -------------------------------- | ---- | ------------------------------ |
| [POSON2_UPSS] USE         | UPS상품 판매정보 사용 | C_Config.POSON2_UPSS_USE         |      | Frm_SaleMain, Mdl_Function.bas |
| [POSON2_UPSS] SMS_USE     | UPS SMS 사용          | C_Config.POSON2_UPSS_SMS_USE     |      | Frm_SaleMain, Mdl_Function.bas |
| [POSON2_UPSS] MSG_USE     | UPS 메시지 사용       | C_Config.POSON2_UPSS_MSG_USE     |      | Mdl_Function.bas               |
| [POSON2_UPSS] Recv_Mobile | UPS 수신 모바일       | C_Config.POSON2_UPSS_Recv_Mobile |      | Mdl_Function.bas               |

### B7. [POSON2_Login] 섹션 - 우선순위: 중간

| INI 섹션/키           | 명칭              | VB6 변수               | 설명 | 사용화면     |
| --------------------- | ----------------- | ---------------------- | ---- | ------------ |
| [POSON2_Login] USE    | 자동로그인 사용   | C_Config.aLogin_USE    |      | Mdl_Main.bas |
| [POSON2_Login] sMoney | 자동로그인 시재금 | C_Config.aLogin_sMoney |      | Mdl_Main.bas |
| [POSON2_Login] ID     | 자동로그인 ID     | C_Config.aLogin_ID     |      | Mdl_Main.bas |

### B8. [POSON2_wSock] 섹션 - 우선순위: 낮음

| INI 섹션/키             | 명칭          | VB6 변수   | 설명        | 사용화면 |
| ----------------------- | ------------- | ---------- | ----------- | -------- |
| [POSON2_wSock] USE_YN   | 소켓통신 사용 | (직접 INI) |             | INI전용  |
| [POSON2_wSock] TCP_PORT | TCP 포트      | (직접 INI) | 기본값 9801 | INI전용  |

### B9. [Config] 섹션 - 우선순위: 중간

| INI 섹션/키             | 명칭                 | VB6 변수                | 설명                  | 사용화면     |
| ----------------------- | -------------------- | ----------------------- | --------------------- | ------------ |
| [Config] Screen_Hide_YN | 카드결제 화면 숨기기 | C_Config.Screen_Hide_YN | SelfINI_Path에서 읽음 | Mdl_Main.bas |

### B10. [Dual_Msg] 섹션 - 우선순위: 낮음

| INI 섹션/키                 | 명칭              | VB6 변수   | 설명       | 사용화면 |
| --------------------------- | ----------------- | ---------- | ---------- | -------- |
| [Dual_Msg] DTop0            | 듀얼 상단 메시지1 | (직접 INI) |            | Frm_Dual |
| [Dual_Msg] DTop0_Color      | 듀얼 상단 색상1   | (직접 INI) |            | Frm_Dual |
| [Dual_Msg] DTop1            | 듀얼 상단 메시지2 | (직접 INI) |            | Frm_Dual |
| [Dual_Msg] DTop1_Color      | 듀얼 상단 색상2   | (직접 INI) |            | Frm_Dual |
| [Dual_Msg] DButtom0~4_Color | 듀얼 하단 색상    | (직접 INI) | 5개 색상값 | Frm_Dual |

### B11. [Application] 섹션 (pos_config.ini) - 우선순위: 낮음

| INI 섹션/키                | 명칭        | VB6 변수   | 설명 | 사용화면 |
| -------------------------- | ----------- | ---------- | ---- | -------- |
| [Application] Pro_Name     | 프로그램명  | (직접 INI) |      | INI전용  |
| [Application] Font_Add     | 폰트추가    | (직접 INI) |      | INI전용  |
| [Application] Backup_Month | 백업 개월수 | (직접 INI) |      | INI전용  |

### B12. [UPSS] 섹션 - 우선순위: 낮음

| INI 섹션/키      | 명칭         | VB6 변수          | 설명 | 사용화면     |
| ---------------- | ------------ | ----------------- | ---- | ------------ |
| [UPSS] UPSS_YN   | UPS 사용여부 | C_Config.UPSS_USE |      | Mdl_Main.bas |
| [UPSS] DLL_Check | DLL 체크     | (직접 INI)        |      | INI전용      |

### B13. [Shop] 섹션 (INI) - 우선순위: 중간

| INI 섹션/키          | 명칭            | VB6 변수           | 설명                  | 사용화면        |
| -------------------- | --------------- | ------------------ | --------------------- | --------------- |
| [Shop] KitchenMsg1~5 | 주방 메시지 1~5 | Shop.kitchenMsg1~5 | pos_config.ini에 저장 | Frm_KitchenInfo |

### B14. [Self] 미구현 항목 - 우선순위: 중간

| INI 섹션/키          | 명칭                 | VB6 변수               | 설명          | 사용화면     |
| -------------------- | -------------------- | ---------------------- | ------------- | ------------ |
| [Self] Self_Startimg | 셀프 시작화면 이미지 | C_Config.Self_Startimg | 이미지 경로   | Mdl_Main.bas |
| [Self] self_TopImg   | 셀프 상단 이미지     | C_Config.self_TopImg   | 이미지 경로   | Mdl_Main.bas |
| [Self] self_Media21  | 셀프 미디어21        | C_Config.self_Media21  | 미디어 경로   | Mdl_Main.bas |
| [Self] self_Test21   | 셀프 테스트21        | C_Config.self_Test21   | 강제 0 설정됨 | Mdl_Main.bas |

### B15. config.ini [Application] 섹션 (관리프로그램) - 우선순위: 낮음

| INI 섹션/키           | 명칭                   | 설명                  | 비고              |
| --------------------- | ---------------------- | --------------------- | ----------------- |
| [Application] 76개 키 | 관리프로그램 전용 설정 | POS와 무관, 별도 관리 | 관리프로그램 전용 |

### B16. config.ini [BarCodePrint] 섹션 - 우선순위: 낮음

| INI 섹션/키             | 명칭               | 설명                         | 비고          |
| ----------------------- | ------------------ | ---------------------------- | ------------- |
| [BarCodePrint] 40+ 키   | 바코드 프린터 설정 | 프린터별 좌표/크기 설정 포함 | 하드웨어 종속 |
| [TTP-243], [SRP-770] 등 | 프린터별 상세 설정 | 하드웨어 종속                | 프린터 모델별 |

### B17. DB 기반 미구현 항목 (Office_User/POS_Set 테이블) - 우선순위: 중간

| DB 컬럼                       | 명칭                 | VB6 변수                | 설명                     | 사용화면     |
| ----------------------------- | -------------------- | ----------------------- | ------------------------ | ------------ |
| Office_User.Online_KEY        | 온라인 키            | Shop.Online_KEY         | S_Config_Call()에서 로딩 | Mdl_Main.bas |
| Office_User.eBill_sms_yn      | 전자영수증 SMS 사용  | Shop.SMS_YN             |                          | Mdl_Main.bas |
| Office_User.eBill_auto_sms_yn | 전자영수증 자동 SMS  | Shop.AUTO_SMS_YN        |                          | Mdl_Main.bas |
| Office_User.eBill_push_yn     | 전자영수증 푸시 사용 | Shop.Push_YN            |                          | Mdl_Main.bas |
| Office_User.en_use            | 고객정보 암호화 사용 | Shop.sCustmer_Encrypt   |                          | Mdl_Main.bas |
| Office_User.strBarcode_YN     | 문자바코드 사용      | Shop.sXBarcode_Use      |                          | Mdl_Main.bas |
| Office_User.selfPos_Hotkey1~4 | 셀프POS 핫키 1~4     | Shop.sSelfPos_Hotkey1~4 |                          | Mdl_Main.bas |
| Office_User.SMS_GUBUN         | SMS 구분             | Shop.self_SNSGubun      |                          | Mdl_Main.bas |
| POS_Set (130+ 컬럼)           | POS 설정 전체        | S_Config.\*             | 별도 분석 필요           | Mdl_Main.bas |

---

## 파트 C: INI 파일별 섹션 요약

### pos_config.ini (517줄)

| 섹션           | 키 수 | 매핑 상태    | 대상 섹션                             |
| -------------- | ----- | ------------ | ------------------------------------- |
| [Application]  | 5     | 미구현       | B11                                   |
| [Sale]         | 10    | **구현완료** | A1 saleConfig                         |
| [Receipt]      | 8     | **구현완료** | A9 receiptConfig                      |
| [Mem_Msg]      | 0     | **구현완료** | A9 receiptConfig (memMsg)             |
| [Dual_Msg]     | 7     | 미구현       | B10                                   |
| [DataBase]     | 6     | 별도관리     | DB 접속정보 (코드 하드코딩)           |
| [Terminal]     | 33    | **구현완료** | A4 terminalConfig + A12 kitchenConfig |
| [INI_Pass]     | 1     | 미구현       | 보안 설정                             |
| [Other]        | 60    | **구현완료** | A2 posConfig + A5 displayConfig       |
| [Card]         | 5     | **구현완료** | A3 cardConfig                         |
| [KSNET]~[KCP]  | VAN별 | **구현완료** | A11 vanDetailConfig                   |
| [Grid_*]       | 20+   | 불필요       | 그리드 컬럼폭 (UI 자동)               |
| [Sale_Color]   | 10    | 미구현       | UI 색상 (CSS 대체)                    |
| [UPSS]         | 2     | 미구현       | B12                                   |
| [FaceCam]      | 4     | 미구현       | B3                                    |
| [Parking_DC]   | 1     | 미구현       | B4                                    |
| [Self]         | 67    | **구현완료** | A6 selfConfig                         |
| [Backup]       | 1     | 미구현       | 내부 관리                             |
| [Shop]         | 3     | 미구현       | B13                                   |
| [JaPan]        | 7     | 미구현       | B5                                    |
| [Scale]        | 2     | 미구현       | 내부 관리                             |
| [POSON2_UPSS]  | 4     | 미구현       | B6                                    |
| [POSON2_Login] | 3     | 미구현       | B7                                    |
| [POSON2_wSock] | 2     | 미구현       | B8                                    |
| [Config]       | 2     | 미구현       | B9                                    |
| [Selfimg]      | 7     | 미구현       | B2                                    |
| [Self21]       | 3     | 미구현       | B1                                    |

### config.ini (1317줄)

| 섹션           | 키 수 | 매핑 상태    | 대상 섹션                  |
| -------------- | ----- | ------------ | -------------------------- |
| [Customer]     | 4     | **구현완료** | A10 customerConfig         |
| [Length]       | 2     | **구현완료** | A7 barcodeConfig           |
| [SuSu]         | 5     | **구현완료** | A8 commissionConfig        |
| [Application]  | 76    | 미구현       | B15 (관리프로그램 전용)    |
| [BarCodePrint] | 40+   | 미구현       | B16                        |
| 나머지         | 다수  | 불필요       | 프린터별/관리프로그램 전용 |

---

## 파트 D: 구현 우선순위 정리

### 높음 (selfConfig 관련, 즉시 구현 권장)

- B1: [Self21] 3항목 - 21인치 키오스크 전용 옵션
- B2: [Selfimg] 7항목 - 이미지 셀프판매 설정
- B14: [Self] 미구현 4항목 - 셀프 이미지 경로

### 중간 (기능 확장 시 구현)

- B3: [FaceCam] 4항목 - 안면인식 카메라
- B6: [POSON2_UPSS] 4항목 - UPS 상품 연동
- B7: [POSON2_Login] 3항목 - 자동 로그인
- B9: [Config] 1항목 - 화면 숨기기
- B13: [Shop] KitchenMsg 5항목 - 주방 메시지
- B17: DB 기반 항목 - 전자영수증, 암호화 등

### 낮음 (필요 시 구현)

- B4: [Parking_DC] 1항목
- B5: [JaPan] 7항목 - 자판기 연동
- B8: [POSON2_wSock] 2항목 - 소켓 통신
- B10: [Dual_Msg] 7항목 - 듀얼 모니터 메시지
- B11: [Application] 5항목
- B12: [UPSS] 2항목
- B15: config.ini [Application] 76항목 - 관리프로그램 전용
- B16: [BarCodePrint] 40+항목 - 바코드 프린터
