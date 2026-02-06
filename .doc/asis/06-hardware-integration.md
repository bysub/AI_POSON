# 하드웨어 연동 분석

## 1. 하드웨어 구성 개요

### 1.1 지원 장치 목록

| 장치                 | 용도                 | 연결 방식       | 관련 모듈        |
| -------------------- | -------------------- | --------------- | ---------------- |
| **영수증 프린터**    | 영수증/주문서 출력   | 병렬/시리얼     | Mdl_Printer.bas  |
| **바코드 스캐너**    | 상품 바코드 읽기     | 시리얼 (RS-232) | Mdl_Function.bas |
| **MSR 리더기**       | 카드 마그네틱 스트립 | 시리얼          | Mdl_Function.bas |
| **CDP (고객표시기)** | 고객용 가격 표시     | 시리얼          | Mdl_Function.bas |
| **저울 (Scale)**     | 중량 상품 측정       | 시리얼          | Mdl_Main.bas     |
| **전자서명패드**     | 카드 서명 입력       | USB/시리얼      | VAN별 모듈       |
| **현금서랍**         | 현금 보관            | 프린터 연동     | Mdl_Printer.bas  |
| **주방프린터**       | 주문서 출력          | 시리얼/병렬     | Mdl_Printer.bas  |
| **호출벨**           | 고객 호출            | 시리얼          | Terminal 설정    |
| **현금계수기**       | 현금 자동 계수       | 시리얼          | C_Config 설정    |
| **봉투판매기**       | 자동 봉투 판매       | 시리얼          | C_Config 설정    |

### 1.2 터미널 설정 구조체

```vb
' Mdl_Main.bas - Terminal Type
Type Terminal
    Type As Integer           ' 단말기 유형
    PosNo As String * 2       ' 포스번호
    AdminPosNo As String      ' 관리포스번호

    ' 프린터 설정
    Printer As Integer        ' 프린터 유형
    PrinterPort As Integer    ' 시리얼 프린터 포트
    PrinterBps As Long        ' 시리얼 전송속도 (9600,19200,57600)
    PrinterGubun As Integer   ' 프린터 구분 (0:병렬, 1:시리얼)

    ' 스캐너 설정
    ScanName As Integer       ' 스캔 유형
    ScanPort As Integer       ' 스캔 포트
    HandScan_Port As Integer  ' 핸디스캐너 포트

    ' CDP 설정
    CDPName As String         ' CDP 이름
    CDPPort As Integer        ' CDP 포트
    CDPLine As Integer        ' CDP 라인수
    CDPType As String         ' CDP 타입 (한글/영문)
    CDP_BPS As String         ' CDP 전송속도
    CDP_CASH_YN As String     ' CDP에 현금 영수 표시

    ' MSR 설정
    MSR_PORT As Integer       ' MSR 포트
    MSR_BPS As String         ' MSR 전송속도

    ' 저울 설정
    CBO_ScalePort As Integer  ' 저울 시리얼 포트

    ' 호출벨 설정
    Bell_YN As String         ' 호출벨 사용 여부
    Bell_Type As String       ' 호출벨 타입 (0:직접입력, 1:장비연동)
    Bell_ComPort As Integer   ' 호출벨 COM 포트
    Bell_Name As String       ' 호출벨 종류

    ' 주방프린터 설정
    kitchenPrint As Integer
    kitchenPrinterPort As Integer
    kitchenPrinterBps As Long
    kitchenPrinterGubun As Integer

    ' 원본프린터 설정
    OrgPrint As Integer
    OrgPrinterPort As Integer
    OrgPrinterBps As Long
    OrgPrinterGubun As Integer
End Type
```

## 2. 영수증 프린터

### 2.1 프린터 출력 함수

```vb
' Mdl_Printer.bas - 주요 출력 함수
Public Sub Print_Title(ByVal F_Num As Integer)
    ' 영수증 타이틀 출력
    ' F_Num 값에 따라 다양한 영수증 유형 지원
End Sub

Public Sub Print_Header(sDate As String, STime As String)
    ' 매장 정보 헤더 출력
End Sub

Public Sub Print_Detail(PrintLine As Integer)
    ' 상품 상세 내역 출력
End Sub

Public Sub PosPrinterPrintText(text As String)
    ' 실제 프린터 출력 명령
End Sub
```

### 2.2 영수증 유형 (Print_Title F_Num)

| F_Num | 영수증 유형        | 용도               |
| ----- | ------------------ | ------------------ |
| 0     | 영 수 증 / RECEIPT | 일반 판매 영수증   |
| 1     | 단사 구매 전표     | 외상 판매          |
| 2     | 상품 전표 복사본   | 재출력             |
| 3     | 상품 입금 확인     | 입금 확인          |
| 4     | 추가 출-입고       | 추가 입출고        |
| 5     | 회원 단사 입금     | 회원 외상 입금     |
| 6     | 환불 영수증        | 환불 처리          |
| 7     | 상품 구매 전표     | 구매 영수증        |
| 8     | 상품 교환권        | 상품권/교환권      |
| 9     | 반 품 증           | 반품 영수증        |
| 10    | 일매출 정산서      | 일일 정산          |
| 11    | 월매출 정산서      | 월간 정산          |
| 12    | 상품 교환 영수증   | 교환 처리          |
| 13    | 카드 승인 내역     | 카드 결제          |
| 14    | 카드 취소 내역     | 카드 취소          |
| 15    | 현금영수증승인     | 현금영수증 발급    |
| 16    | 현금영수증취소     | 현금영수증 취소    |
| 17    | OK CASHBAG         | 캐시백 포인트      |
| 18    | 반 품 교 환 증     | 반품 교환          |
| 21    | 회원 포인트 조회   | 포인트 조회        |
| 26    | 회 원 등 록        | 회원 등록          |
| 27    | 개점/폐점 확인     | 영업 상태          |
| 30    | 주 문 서           | 주문서 (배달/매장) |
| 31    | 주방 주문서        | 주방 출력용        |
| 32    | 재고 영수증        | 재고 확인          |
| 33    | 현금기환전         | 현금계수기 환전    |

### 2.3 프린터 제어 명령

```vb
' ESC/POS 명령어 래퍼 함수
Function Prn_Align(align As Integer) As String
    ' 0: 왼쪽, 1: 가운데, 2: 오른쪽
End Function

Function Prn_FontSize(size As Integer) As String
    ' 폰트 크기 설정 (0: 기본, 40: 2배)
End Function

Function Prn_LineGap(gap As Integer) As String
    ' 라인 간격 설정
End Function
```

### 2.4 라벨 프린터

지원 모델:

- TTP-243
- SRP-770
- LK-B30
- LK-P30

```vb
' 라벨 프린터 전용 함수
Sub LabelPrint_TTP243(...)    ' TTP-243 전용
Sub LabelPrint_SRP770(...)    ' SRP-770 전용
Sub LabelPrint_LKB30(...)     ' LK-B30 전용
Sub LabelPrint_LKP30(...)     ' LK-P30 전용
```

## 3. 바코드 스캐너

### 3.1 스캐너 연결 초기화

```vb
' Mdl_Function.bas - 스캐너 초기화
Public Function Scanner_MSCOMM_Open() As Boolean
    With Frm_SaleMain
        If .MSComm1.PortOpen = True Then Exit Function

        .MSComm1.CommPort = Terminal.ScanPort
        .MSComm1.settings = "9600,N,8,1"
        .MSComm1.Handshaking = "0"
        .MSComm1.RThreshold = 1
        .MSComm1.InputLen = 1
        .MSComm1.InBufferSize = 1024
        .MSComm1.RTSEnable = True
        .MSComm1.PortOpen = True
        .MSComm1.InBufferCount = 0
    End With
End Function
```

### 3.2 스캔 타입

```vb
' Mdl_Main.bas
Public Scan_Type As Integer
' 0: 판매
' 1: 재고확인
' 2: 반품등록
' 3: 상품조회
' 4: 반품의
' 5: 회원입력
' 6: 페이스캠
' 15: 관리자용 바코드스캔
```

## 4. CDP (고객표시기)

### 4.1 CDP 연결 초기화

```vb
' Mdl_Function.bas - CDP 초기화
Public Function CDP_MSCOMM_Open() As Boolean
    With Frm_SaleMain
        If .MSComm.PortOpen = True Then Exit Function

        .MSComm.CommPort = Terminal.CDPPort

        ' 샤인비 ST-71 모델 특수 설정
        If Terminal.CDPName = "샤인비 ST-71(시리얼_2)" Then
            .MSComm.settings = Terminal.CDP_BPS & ",O,8,1"
        Else
            .MSComm.settings = Terminal.CDP_BPS & ",N,8,1"
        End If

        .MSComm.InputLen = 0
        .MSComm.PortOpen = True
    End With
End Function
```

### 4.2 지원 CDP 모델

| 모델명       | 통신 설정  | 비고           |
| ------------ | ---------- | -------------- |
| 샤인비 ST-71 | Odd Parity | 특수 설정 필요 |
| 표준 CDP     | No Parity  | 기본 설정      |

## 5. MSR 리더기

### 5.1 MSR 설정

```vb
' Terminal 구조체 내 MSR 설정
MSR_PORT As Integer   ' MSR 포트 번호
MSR_BPS As String     ' 전송 속도
```

### 5.2 카드 읽기 처리

```vb
' 카드 유형별 처리
' - 신용카드 Track2 데이터 파싱
' - 현금IC카드 처리
' - 회원카드 처리
```

## 6. 저울 (Scale)

### 6.1 저울 설정

```vb
' Terminal 설정
Terminal.CBO_ScalePort  ' 저울 시리얼 포트

' C_Config 설정
C_Config.self_ScalePort       ' 셀프POS 저울 포트
C_Config.Self_ScaleLimitG     ' 최대 허용 중량

' S_Config 설정
S_Config.Scale_18_YN          ' 18자 중량 바코드 사용
S_Config.Scale_PriceCut       ' 중량 상품 금액 절사
S_Config.Weight_Point         ' 중량 상품 포인트 적립방식
```

### 6.2 중량 바코드 타입

```vb
' Mdl_Main.bas - ScaleCode 타입
Type ScaleCode
    ' 중량 바코드 파싱 규칙
    ' 18자 바코드: 상품코드 + 중량 + 가격
End Type
```

## 7. 전자서명패드

### 7.1 VAN별 서명패드 연동

| VAN사   | 서명패드 DLL/OCX  | 기능           |
| ------- | ----------------- | -------------- |
| NICE    | -                 | 별도 연동      |
| KSNET   | KSNet_Dongle.ocx  | 서명 캡처      |
| KICC    | KiccDSC.ocx       | 서명 캡처      |
| KIS     | KisvanMS3.ocx     | 서명 캡처      |
| SMARTRO | SmtSignOcx.ocx    | 서명 캡처, NFC |
| JTNET   | JTNetSPL.dll      | 서명 캡처      |
| KOVAN   | kovan_signpad.ocx | 서명 캡처      |
| SPC     | -                 | 별도 연동      |

## 8. 현금서랍

### 8.1 현금서랍 제어

```vb
' Terminal 설정
Terminal.CashDraw As Integer  ' 현금서랍 사용 여부

' 현금서랍 열기 명령
' 프린터를 통해 ESC/POS 명령으로 제어
' CHR(27) + CHR(112) + CHR(0) + CHR(25) + CHR(250)
```

## 9. 호출벨

### 9.1 호출벨 설정

```vb
' Terminal 구조체
Bell_YN As String       ' 호출벨 사용 여부 (0:미사용, 1:사용)
Bell_Type As String     ' 호출벨 타입 (0:직접입력, 1:장비연동)
Bell_ComPort As Integer ' 호출벨 COM 포트
Bell_Name As String     ' 호출벨 종류 (예: 현대 U7)
Bell_fID As String      ' 호출벨 매장번호
Bell_fID_YN As String   ' 매장번호 사용 여부
Bell_LEN As String      ' 주문번호 자리수 (0:3자리, 1:4자리)
```

## 10. 주방프린터

### 10.1 주방프린터 설정

```vb
' Terminal 구조체
kitchenPrint As Integer           ' 주방프린터 사용
kitchenPrinterPort As Integer     ' 시리얼 포트
kitchenPrinterBps As Long         ' 전송속도
kitchenPrinterGubun As Integer    ' 프린터 구분 (0:병렬, 1:시리얼)
kitchenSlot_Add As String         ' 프린터 슬롯
Kitchen_fontsize As String        ' 주문서 폰트 크기
```

### 10.2 주방 메시지 설정

```vb
' Shop 구조체
kitchenMsg1 As String    ' 주방 메시지 1
kitchenMsg2 As String    ' 주방 메시지 2
kitchenMsg3 As String    ' 주방 메시지 3
kitchenMsg4 As String    ' 주방 메시지 4
kitchenMsg5 As String    ' 주방 메시지 5
```

## 11. 셀프 키오스크 전용 하드웨어

### 11.1 셀프POS 하드웨어 설정

```vb
' C_Config 구조체 - 셀프POS 전용
Self_STLYN As String        ' 신호등 사용 여부
Self_STLPort As String      ' 신호등 포트 (261~289)
Self_STLGoods As String     ' 상품등록시 신호등 사용
Self_STLNoGoods As String   ' 미등록상품에 신호등 사용
self_STLGoodsNo As String   ' 판매제한상품에 신호등 사용
Self_STLSoundAdmin As String ' 관리자호출시 소리사용

self_ScalePort As String    ' 셀프 저울 포트
Self_ScaleLimitG As String  ' 최대 허용 중량

self_BagPort As String      ' 봉투판매기 포트
self_BagJPPort As String    ' 종이 봉투기 포트
self_StartBag As String     ' 시작화면 봉투판매상태

self_Cash As String         ' 현금계수기 사용
self_CashPort As String     ' 현금계수기 포트
self_CashSleep As String    ' 현금계수기 슬립타임
self_CashPhonNum As String  ' 현금계수기 문의 연락처
self_CashGubun As String    ' 현금계수기 종류 (0:기본, 1:뉴플러스)

self_Reader As String       ' 카드리더 종류 (0:하나시스, 1:세종시스, 2:스타)
self_CamUse As String       ' 캠 사용 여부
self_ICSiren As String      ' IC카드 삽입시 알림음
```

## 12. 시리얼 통신 설정

### 12.1 MSComm 컨트롤 속성

| 속성         | 설명                                            | 기본값       |
| ------------ | ----------------------------------------------- | ------------ |
| CommPort     | COM 포트 번호                                   | 설정별 상이  |
| Settings     | 통신 설정 (보레이트,패리티,데이터비트,스톱비트) | "9600,N,8,1" |
| Handshaking  | 핸드셰이킹                                      | 0 (없음)     |
| RThreshold   | 수신 이벤트 임계값                              | 1            |
| InputLen     | 입력 버퍼 길이                                  | 0 또는 1     |
| InBufferSize | 입력 버퍼 크기                                  | 1024         |
| RTSEnable    | RTS 활성화                                      | True         |

### 12.2 보레이트 설정

| 장치   | 기본 속도   | 지원 속도          |
| ------ | ----------- | ------------------ |
| 스캐너 | 9600        | 9600               |
| CDP    | 설정별 상이 | 9600, 19200        |
| 프린터 | 9600        | 9600, 19200, 57600 |
| 저울   | 9600        | 9600               |

## 13. 마이그레이션 고려사항

### 13.1 웹 기반 전환 전략

| 현재 연동 방식   | 전환 방안                           |
| ---------------- | ----------------------------------- |
| VB6 MSComm       | WebSerial API / Node.js serial port |
| 병렬 포트 프린터 | USB/네트워크 프린터                 |
| 직접 DLL 호출    | REST API / WebSocket 래퍼           |
| ActiveX OCX      | 웹 기반 SDK 또는 브릿지 서비스      |

### 13.2 Node.js 하드웨어 라이브러리

| 용도           | 추천 패키지                  |
| -------------- | ---------------------------- |
| 시리얼 통신    | serialport                   |
| ESC/POS 프린터 | escpos, node-thermal-printer |
| 바코드 스캐너  | hid (USB HID)                |
| 저울           | serialport (프로토콜 구현)   |

### 13.3 Electron 기반 키오스크

```javascript
// Electron + serialport 예시
const SerialPort = require("serialport");

// 스캐너 연결
const scanner = new SerialPort("/dev/ttyUSB0", {
  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
});

// 프린터 연결
const printer = new SerialPort("/dev/ttyUSB1", {
  baudRate: 19200,
});
```

### 13.4 하드웨어 추상화 레이어

```typescript
// 하드웨어 인터페이스 표준화
interface IHardwareDevice {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

interface IPrinter extends IHardwareDevice {
  print(data: string): Promise<void>;
  cut(): Promise<void>;
  openCashDrawer(): Promise<void>;
}

interface IScanner extends IHardwareDevice {
  onScan(callback: (barcode: string) => void): void;
}

interface IScale extends IHardwareDevice {
  getWeight(): Promise<number>;
}
```
