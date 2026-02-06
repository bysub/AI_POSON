# Mdl_Card_Dll.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Mdl_Card_Dll.bas`
**파일 크기**: 90KB (1,439 lines)
**역할**: 결제 VAN사 DLL 인터페이스 모듈
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [DLL 로딩 메커니즘](#2-dll-로딩-메커니즘)
3. [VAN사별 함수 목록](#3-van사별-함수-목록)
4. [주요 VAN사 상세 분석](#4-주요-van사-상세-분석)
5. [결제 승인/취소/환불 흐름](#5-결제-승인취소환불-흐름)
6. [에러 처리](#6-에러-처리)
7. [마이그레이션 고려사항](#7-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

한국의 12개 VAN(Value Added Network)사 결제 단말기 DLL과의 통신을 담당하는 핵심 모듈입니다.

### 1.2 주요 역할

- **VAN사 DLL API 선언**: Public Declare Function으로 외부 DLL 함수 연결
- **결제 승인/취소**: 신용카드, 체크카드, 상품권, 포인트 결제 처리
- **현금영수증**: 현금 결제 시 국세청 연동
- **전자서명**: SignPad 장비를 통한 고객 서명 수집
- **암호화**: 카드번호, PIN 번호 암호화

### 1.3 지원 VAN사 (12개)

1. **NICE** - NICE정보통신
2. **KICC** - 한국정보통신
3. **KFTC** - 금융결제원
4. **KIS** - 한국정보통신
5. **KSNet** - KSNET
6. **SMARTRO** - 스마트로
7. **KMPS** - 한국모바일결제서비스
8. **StarVan** - 스타밴
9. **JTNet** (구 NCVAN) - JT친구
10. **KCB** - 한국신용평가정보
11. **KOVAN** - 코밴
12. **KOCES** - 한국정보통신
13. **KCP** - KCP
14. **SPC** - SPC네트웍스

### 1.4 코드 구조

```
Option Explicit
    ↓
VAN사별 DLL Declare (Public)
    ↓
Helper Functions (Public)
    ↓
Error Handling Functions
```

---

## 2. DLL 로딩 메커니즘

### 2.1 VB6 DLL 연동 방식

**Public Declare Function** 문법:

```vb
Public Declare Function [함수명] Lib "[DLL명]" _
    (ByVal [파라미터] As [타입], ...) As [반환타입]
```

**예시 - NICE VAN**:

```vb
Public Declare Function ReqToCat Lib "PosToCatReq.dll" _
    (ByVal iPort As Long, _
     ByVal iBoud As Long, _
     ByVal SenBuf As String, _
     ByRef RecvBuf As Byte) As Long
```

### 2.2 DLL 배포 구조

```
POSON_POS_SELF21/
├── Mdl_Card_Dll.bas          (이 파일)
├── NICE/
│   └── PosToCatReq.dll       (128KB)
├── KICC/
│   ├── KiccPos.DLL
│   └── Kicc.dll
├── KSNet/
│   ├── KSNet_ADSL.dll
│   └── KSNet_Dongle.ocx
├── SMARTRO/
│   ├── SmartroSign.dll
│   ├── libeay32_smt.dll      (OpenSSL)
│   └── ssleay32_smt.dll
├── KMPS/
│   └── fdikpos43.dll
├── KFTC/
│   └── kftcpos.dll
└── ... (기타 VAN사 DLL들)
```

### 2.3 런타임 로딩 vs 컴파일 타임 로딩

**VB6 Declare 방식 (컴파일 타임)**:

- DLL이 없으면 프로그램 시작 실패
- 모든 VAN사 DLL을 항상 배포해야 함

**개선 방안 (LoadLibrary 방식)**:

```vb
' 런타임 동적 로딩 (코드에는 없지만 권장)
Dim hDll As Long
Dim pFunc As Long

hDll = LoadLibrary("PosToCatReq.dll")
If hDll <> 0 Then
    pFunc = GetProcAddress(hDll, "ReqToCat")
    If pFunc <> 0 Then
        ' 함수 호출
    End If
    FreeLibrary hDll
End If
```

---

## 3. VAN사별 함수 목록

### 3.1 NICE (NICE정보통신)

**DLL**: `PosToCatReq.dll` (128KB, v2.0.1.4)

| 함수명       | 기능                 | 반환값        |
| ------------ | -------------------- | ------------- |
| **ReqToCat** | CAT 단말기 승인 요청 | Long (0=성공) |
| **ReqStop**  | 승인 중단            | Long          |

**시그니처**:

```vb
Public Declare Function ReqToCat Lib "PosToCatReq.dll" _
    (ByVal iPort As Long, _         ' COM 포트 번호 (1~4)
     ByVal iBoud As Long, _         ' 통신 속도 (9600, 115200)
     ByVal SenBuf As String, _      ' 전문 (최대 1024 bytes)
     ByRef RecvBuf As Byte) As Long ' 응답 (Byte Array)
```

**사용 예시**:

```vb
Dim SendData As String
Dim RecvData(1024) As Byte
Dim Result As Long

SendData = "거래구분|금액|카드번호|..."
Result = ReqToCat(1, 115200, SendData, RecvData(0))

If Result = 0 Then
    ' 승인 성공
Else
    ' 오류 처리
End If
```

### 3.2 KICC (한국정보통신)

**DLL**: `KiccPos.DLL`, `Kicc.dll` (v3.3, 2014-08-13)

| 함수명         | 기능             | 반환값        |
| -------------- | ---------------- | ------------- |
| **KLoad**      | 단말기 초기화    | Long (0=성공) |
| **KUnLoad**    | 단말기 해제      | void          |
| **KApproval**  | 카드 승인/취소   | Long          |
| **KReqSign**   | 서명 요청        | Long          |
| **KReqSignA**  | 서명 요청 (고급) | Long          |
| **KSaveToBmp** | 서명 이미지 저장 | Long          |
| **KGetSign**   | 서명 데이터 조회 | Long          |
| **KGetCardNo** | 카드번호 조회    | Long          |

**시그니처**:

```vb
Public Declare Function KLoad Lib "KiccPos.DLL" _
    (ByVal pPort As Long, _        ' COM 포트
     ByVal pBaud As Long, _        ' BPS
     ByVal pErrMsg As String) As Long

Public Declare Function KApproval Lib "KiccPos.DLL" _
    (ByVal ReqType As Long, _      ' 0=승인, 1=취소
     ByVal ReqMsg As String, _     ' 요청 전문
     ByVal ReqMsgLen As Long, _
     ByVal Sign As String, _       ' 서명 데이터
     ByVal Emv As String, _        ' EMV 데이터
     ByVal ResType As Long, _
     ByVal ResMsg As String, _     ' 응답 전문
     ByVal ErrMsg As String, _
     ByVal KiccIP As String, _     ' VAN IP
     ByVal KiccPort As Long, _     ' VAN Port
     ByVal Secure As Long, _       ' SSL 사용 여부
     ByVal RID As String, _
     ByVal trno As String) As Long
```

**초기화 흐름**:

```vb
Sub KICC_epconnect()
    Dim sErr As String * 4096
    Dim i As Long

    If Kicc_connect_chk = False Then
        i = KLoad(Val(VAN.SingPad_Port), Val(VAN.SingPad_BPS), sErr)
        If i >= 0 Then
            Kicc_connect_chk = True
            KReqReset  ' 단말기 리셋
        Else
            MsgBox "KICC_epconnect : " & sErr
            Kicc_connect_chk = False
        End If
    End If
End Sub
```

### 3.3 KFTC (금융결제원)

**DLL**: `kftcpos.dll`, `kftcwebapi.dll`, `kftcpos.ini`

| 함수명             | 기능           | 반환값 |
| ------------------ | -------------- | ------ |
| **KFTC_POS_TRANS** | 거래 처리      | Long   |
| **CallPosSetPath** | INI 경로 설정  | void   |
| **CallPosSetKey**  | 암호화 키 설정 | void   |

**시그니처**:

```vb
Public Declare Function KFTC_POS_TRANS Lib "kftcpos.dll" _
    (ByVal FC As Long, _           ' Function Code
     ByVal lpPOSInData As Long, _  ' 입력 구조체 포인터
     ByVal lpPOSOutData As Long) As Long  ' 출력 구조체 포인터
```

**에러 코드**:

```vb
Public Function KFTC_Error(ByVal Err_i As Integer) As String
    Select Case Err_i
        Case 1:  emsg = "Time Out"
        Case 2:  emsg = "전문서 구조 안됨"
        Case 3:  emsg = "통신 오류(데이터 오류)"
        Case 4:  emsg = "회선오류(TCP/IP)"
        Case 5:  emsg = "EOT 미수신"
        Case 6:  emsg = "인가된 통신 번호 확인"
        Case 7:  emsg = "PinPad 또는 수표조회기 Reading Time Out"
        Case 8:  emsg = "회선오류(PORT Open Error)"
        Case 9:  emsg = "장치 연결 안됨"
        Case 10: emsg = "장치 드라이버 오류"
        Case 11: emsg = "데이터 길이 오류"
        Case 12: emsg = "서명데이터 길이 오류(DEL오류)"
        Case 13: emsg = "서명패드에서 취소버튼 누름"
        Case 15: emsg = "일반 전자지갑에서 캐시비 거래 요청 시 오류"
        Case 19: emsg = "전자지갑기 Error"
        Case 20: emsg = "서명패드 Com Port Open 오류"
        Case 21: emsg = "키패드 초기화 오류"
    End Select
End Function
```

### 3.4 KSNet

**DLL**: `KSNet_ADSL.dll`, `KSNet_Dongle.ocx` (v240)

| 함수명      | 기능      | 반환값 |
| ----------- | --------- | ------ |
| **ReqAppr** | 승인 요청 | Long   |

**시그니처**:

```vb
Public Declare Function ReqAppr Lib "KSNet_ADSL.dll" Alias "RequestApproval" _
    (ByVal ipAddr As String, _     ' VAN IP
     ByVal sPort As Integer, _     ' VAN Port
     ByVal sMedia As Integer, _    ' 통신 매체 (0=전화, 1=ADSL)
     ByVal RequestMsg As String, _ ' 요청 전문
     ByVal RequestLen As Integer, _
     ByVal sRecvMsg As String, _   ' 응답 전문
     ByVal TimeOut As Integer, _   ' 타임아웃 (초)
     ByVal options As Integer) As Long
```

**에러 메시지**:

```vb
Public Function KSNET_ERR_MESSAGE(ecode As String) As String
    Select Case ecode
        Case "ZA": sFail = "STX 수신 오류"
        Case "ZB": sFail = "ETX 수신 오류"
        Case "ZC": sFail = "LRC 오류"
        Case "ZD": sFail = "단말기 MODE 오류"
        Case "ZE": sFail = "함수 호출 값 틀림"
        Case "ZF": sFail = "어플리케이션 송신 길이 오류"
        Case "ZG": sFail = "어플리케이션과 수신 길이 불일치"
        Case "ZH": sFail = "데이터 수신 오류"
        Case "ZI": sFail = "데이터 송신 오류"
        Case "ZJ": sFail = "데이터 응답 오류"
        Case "ZK": sFail = "데이터 작성과 응답 시간 초과"
    End Select
End Function
```

### 3.5 SMARTRO (스마트로)

**DLL**: `SmartroSign.dll`, `libeay32_smt.dll`, `ssleay32_smt.dll`, `SmtSignOcx.ocx`

| 함수명                  | 기능             | 반환값  |
| ----------------------- | ---------------- | ------- |
| **SMT_B_ConnSndRcv**    | 승인 (일반)      | Integer |
| **SMT_S_ConnSndRcv**    | 승인 (5500 포트) | Integer |
| **SMT_N_ConnSndRcv**    | 승인 (5801 포트) | Integer |
| **SMT_Dongle_Initial**  | 동글 초기화      | Integer |
| **SMT_Dongle_Start**    | 동글 시작        | Integer |
| **SMT_Get_Sign_Screen** | 서명 화면 표시   | Integer |
| **SMT_Keypad_Input**    | 키패드 입력      | Integer |
| **SMT_TMoney_Balance**  | T머니 잔액 조회  | Integer |
| **SMT_CashBee_Pay**     | 캐시비 결제      | Integer |

**T머니/캐시비 지원**:

```vb
' T머니 SAM ID
Public Declare Function SMT_TMoney_PSamInfo Lib "SmartroSign.dll" _
    (ByRef ucpData As Byte, _
     ByVal iLength As Integer, _
     ByVal ucpSendData As String, _
     ByVal iTimeout As Integer) As Integer

' 잔액 조회
Public Declare Function SMT_TMoney_Balance Lib "SmartroSign.dll" _
    (ByRef ucpData As Byte, _
     ByVal iLength As Integer, _
     ByVal ucpSendData As String, _
     ByVal iTimeout As Integer) As Integer

' 결제
Public Declare Function SMT_TMoney_Pay Lib "SmartroSign.dll" _
    (ByRef ucpData As Byte, _
     ByVal iLength As Integer, _
     ByVal ucpSendData As String) As Integer
```

### 3.6 KMPS (한국모바일결제서비스)

**DLL**: `fdikpos43.dll`, `POS4SignPAD_Ctl.dll`, `POS4SignPAD_View.dll`

**주요 함수**:

- `FDIK_CreditAuth_Simple`: 신용카드 승인
- `FDIK_CreditCancel_Simple`: 신용카드 취소
- `FDIK_OCBSave_Simple`: OCB 포인트 적립
- `FDIK_PointUse_Simple`: 포인트 사용
- `FDIK_CashReceiptAuth`: 현금영수증 발행
- `FDIK_Checks`: 수표조회

**시그니처 예시**:

```vb
Public Declare Function FDIK_CreditAuth_Simple Lib "fdikpos43.dll" _
    (ByVal in_terminal_number As String, _    ' 단말기번호
     ByVal in_sequence_number As String, _    ' 거래일련번호
     ByVal in_pos_initial As String, _        ' POS 초기값
     ByVal in_temp_info As String, _          ' 임시정보
     ByVal in_credit_info As String, _        ' 신용카드정보
     ByVal in_credit_input_type As String, _  ' 입력구분
     ByVal in_install_period As String, _     ' 할부개월
     ByVal in_total_amount As String, _       ' 총금액
     ByVal in_service_amount As String, _     ' 봉사료
     ByVal in_tax_amount As String, _         ' 세금
     ByVal in_ocb_info As String, _           ' OCB카드정보
     ByVal in_ocb_input_type As String, _
     ByVal in_sign_compress_method As String, _
     ByVal in_sign_mac As String, _
     ByRef in_sign_data As Byte, _            ' 서명 데이터
     ByVal out_print_flag As String, _        ' 출력 플래그
     ByVal out_res_code As String, _          ' 응답코드
     ByVal out_auth_number As String, _       ' 승인번호
     ByVal out_auth_date As String, _         ' 승인일시
     ByVal out_member_number As String, _
     ByVal out_ddc_flag As String, _
     ByVal out_ddc_number As String, _
     ByVal out_res_msg As String, _           ' 응답메시지
     ByVal out_card_name As String, _         ' 카드사명
     ByVal out_issuer_code As String, _       ' 발급사코드
     ByVal out_issuer_name As String, _
     ByVal out_acquirer_code As String, _     ' 매입사코드
     ByVal out_acquirer_name As String, _
     ByVal out_gift_cash As String, _
     ByVal out_notice As String, _
     ByVal out_ocb_res_code As String, _
     ByVal out_ocb_customer_name As String, _
     ByVal out_ocb_add_point As String, _
     ByVal out_ocb_save_point As String, _
     ByVal out_ocb_usable_point As String, _
     ByVal out_broad_msg As String) As Integer
```

### 3.7 기타 VAN사 요약

| VAN사       | DLL             | 주요 함수           | 비고       |
| ----------- | --------------- | ------------------- | ---------- |
| **KIS**     | KisCatSSL.dll   | VB_Kis_Approval     | SSL 통신   |
| **StarVan** | SvkPos.dll      | svk_POS, svk_DONGLE | v4.0.0     |
| **JTNet**   | JTNetSPL.dll    | NCPAD_SIGN          | 구 NCVAN   |
| **KCB**     | HostDll.dll     | CashTran_TFunc      | 현금영수증 |
| **KOVAN**   | HPosApp.dll     | Kovan_Send2         | -          |
| **KOCES**   | AuthComm.dll    | AuthRequest         | -          |
| **KCP**     | KCPDLL.dll      | KCPDataProcPos      | PEAL 버전  |
| **SPC**     | SPCNSecuCom.dll | SPCNRequestApproval | -          |

---

## 4. 주요 VAN사 상세 분석

### 4.1 NICE VAN - CAT 단말기 통신

**특징**:

- RS-232 시리얼 통신
- 고정 전문 형식
- 35초 타임아웃

**전문 구조**:

```
STX(1) + 거래구분(2) + 금액(9) + 카드번호(암호화) + ... + ETX(1) + LRC(1)
```

**사용 흐름**:

```vb
Const CAT_WAIT_SEC = 35  ' 35초 대기

Dim SendBuf As String
Dim RecvBuf(1024) As Byte
Dim Result As Long

' 1. 전문 생성
SendBuf = MakeCATMessage(금액, 카드번호, ...)

' 2. 승인 요청
Result = ReqToCat(1, 115200, SendBuf, RecvBuf(0))

' 3. 결과 처리
If Result = 0 Then
    Dim ResponseData As String
    ResponseData = ByteArrayToString(RecvBuf)

    ' 승인번호 추출
    ApprovalNo = Mid(ResponseData, 50, 12)
Else
    ' 타임아웃 또는 오류
    If Result = -1 Then
        MsgBox "통신 오류"
    ElseIf Result = -2 Then
        MsgBox "단말기 응답 없음"
    End If
End If

' 4. 거래 중단 (필요시)
Call ReqStop
```

### 4.2 KICC - 통합 결제 솔루션

**특징**:

- TCP/IP 통신 지원
- EMV IC칩 카드 지원
- 서명패드 통합
- 모바일 페이 지원

**초기화**:

```vb
' 1. DLL 로드 및 연결
i = KLoad(COM포트, BPS, 에러메시지)

' 2. 서명 요청
i = KReqSignA(TID, 금액, X좌표, Y좌표, _
              상단메시지, 통화코드, 화면메시지, 에러메시지)

' 3. 승인 요청
i = KApproval(요청타입, 요청전문, 길이, _
              서명데이터, EMV데이터, 응답타입, _
              응답전문, 에러메시지, _
              VAN_IP, VAN_PORT, SSL여부, RID, TRNO)

' 4. 서명 이미지 저장
i = KSaveToBmp("C:\sign.bmp", BMP타입, 에러메시지)

' 5. 연결 해제
KUnLoad
```

**승인 전문 예시**:

```
0200승인요청
├─ Field 0: MTI (Message Type Indicator)
├─ Field 2: 카드번호 (암호화)
├─ Field 3: 처리코드 (00=승인, 20=취소)
├─ Field 4: 거래금액
├─ Field 11: STAN (거래일련번호)
├─ Field 22: POS Entry Mode
├─ Field 25: 서비스조건코드
├─ Field 41: TID
└─ Field 55: EMV 데이터
```

**응답 전문**:

```
0210승인응답
├─ Field 38: 승인번호
├─ Field 39: 응답코드 (00=승인)
├─ Field 48: 카드사명, 가맹점번호
└─ Field 63: 추가정보
```

### 4.3 KFTC - 금융공동망

**특징**:

- 표준 금융 전문 사용
- 체크카드 전용
- 은행 직접 연결

**거래 흐름**:

```vb
' 1. INI 경로 설정
Call CallPosSetPath(App.Path & "\kftcpos.ini")

' 2. 암호화 키 설정
Call CallPosSetKey(A, B, C)

' 3. 입력 구조체 생성
Dim InData As KFTC_INPUT_STRUCT
InData.거래구분 = "0200"
InData.금액 = "000000010000"
InData.카드번호 = "1234567890123456"
' ... 기타 필드

' 4. 거래 요청
Dim OutData As KFTC_OUTPUT_STRUCT
Dim Result As Long

Result = KFTC_POS_TRANS(FC_APPROVAL, VarPtr(InData), VarPtr(OutData))

' 5. 결과 확인
If Result = 0 Then
    If OutData.응답코드 = "00" Then
        ' 승인 성공
        승인번호 = OutData.승인번호
    Else
        ' 승인 거절
        MsgBox OutData.응답메시지
    End If
Else
    ' 통신 오류
    MsgBox KFTC_Error(Result)
End If
```

### 4.4 SMARTRO - T머니/캐시비 통합

**특징**:

- 교통카드 결제 지원
- NFC 리더기 통합
- 다중 결제수단 (카드, T머니, 캐시비, 모바일페이)

**T머니 결제 흐름**:

```vb
' 1. 동글 초기화
Dim SignPadInfo(256) As Byte
i = SMT_Dongle_Initial(1, SignPadInfo(0))

' 2. SAM ID 조회
Dim SAM_ID(100) As Byte
i = SMT_TMoney_PSamInfo(SAM_ID(0), 100, "", 30)

' 3. 잔액 조회
Dim BalanceData(100) As Byte
i = SMT_TMoney_Balance(BalanceData(0), 100, "", 30)

' 잔액 파싱
CardBalance = CLng(Fu_Read_Name(BalanceData, 4))

If CardBalance < 거래금액 Then
    MsgBox "잔액 부족"
    Exit Sub
End If

' 4. 결제
Dim PayData(200) As Byte
Dim SendData As String
SendData = MakeTMoneyPayMessage(금액, SAM_ID, ...)

i = SMT_TMoney_Pay(PayData(0), 200, SendData)

' 5. 결과 처리
If i = 0 Then
    ' 승인 성공
    ApprovalNo = Mid(Fu_Read_Name(PayData, 20), 1, 12)
Else
    ' 실패
    MsgBox "T머니 결제 실패"
End If
```

**캐시비 결제**:

```vb
' 1. SAM ID 조회
i = SMT_CashBee_Get_SAMID(SAM_ID(0), 100, "", 30)

' 2. 잔액 조회
i = SMT_CashBee_Balance(BalanceData(0), 100, "", 30)

' 3. 결제
i = SMT_CashBee_Pay(PayData(0), 200, SendData, 30)
```

### 4.5 KMPS - OCB 포인트 통합

**특징**:

- OK캐쉬백(OCB) 포인트 적립/사용
- 현금영수증 동시 발행
- 수표 조회 지원

**OCB 적립**:

```vb
Dim Result As Integer

Result = FDIK_OCBSave_Simple( _
    단말기번호, 거래일련번호, POS초기값, _
    임시정보, OCB카드번호, 입력구분, _
    포인트카드타입, 금액, 거래구분, _
    상품코드, 현금영수증구분, _
    출력플래그, 응답코드, 승인번호, _
    승인일시, 응답메시지, 카드명, _
    발급사코드, 발급사명, 매입사코드, _
    매입사명, 고객명, 적립포인트, _
    누적포인트, 사용가능포인트, 메시지, _
    현금영수증응답코드, 현금영수증승인번호, 현금영수증메시지)

If Result = 1 Then
    ' 성공
    MsgBox "OCB 적립: " & 적립포인트 & "P" & vbCrLf & _
           "누적: " & 누적포인트 & "P"
Else
    ' 실패
    MsgBox KMPS_Err("OCB적립", Result)
End If
```

**포인트 사용**:

```vb
Result = FDIK_PointUse_Simple( _
    단말기번호, 거래일련번호, POS초기값, _
    임시정보, OCB카드번호, 입력구분, _
    포인트카드타입, 사용금액, 비밀번호, _
    거래구분, 상품코드, _
    출력플래그, 응답코드, 승인번호, _
    승인일시, 응답메시지, 카드명, _
    발급사코드, 발급사명, 매입사코드, _
    매입사명, 고객명, 차감포인트, _
    누적포인트, 사용가능포인트, 메시지)
```

---

## 5. 결제 승인/취소/환불 흐름

### 5.1 일반적인 승인 프로세스

```
┌─────────────────────────────────────────────────┐
│ 1. 거래 시작                                     │
│    - 금액 확정                                   │
│    - VAN사 선택                                  │
│    - 거래일련번호 생성 (Snumber_Add)             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. 카드 정보 입력                                │
│    - MSR (Magnetic Stripe Reader) 리더기         │
│    - IC칩 리더기                                 │
│    - 수기 입력                                   │
│    - NFC (T머니, 캐시비, 모바일페이)             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. 카드번호 암호화                               │
│    - VAN사별 암호화 함수 사용                    │
│    - 예: cryptCard_KCP(ENCRYPT, CardNo, EncData) │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. 서명 입력 (필요시)                            │
│    - SignPad 연결 (RS-232)                       │
│    - 서명 데이터 수집                            │
│    - 이미지 저장 (BMP)                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. VAN사 승인 요청                               │
│    - 전문 생성                                   │
│    - DLL 함수 호출                               │
│    - 타임아웃 처리 (보통 30~60초)                │
└─────────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐     ┌───────────────┐
│ 6a. 승인 성공 │     │ 6b. 승인 거절 │
│ - 승인번호    │     │ - 거절 사유   │
│ - 매입사      │     │ - 재시도 여부 │
│ - 거래일시    │     └───────────────┘
└───────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│ 7. 영수증 출력                                   │
│    - 고객용 영수증                               │
│    - 가맹점용 영수증                             │
│    - 서명란 (필요시)                             │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│ 8. DB 저장                                       │
│    - 거래 내역                                   │
│    - 승인번호                                    │
│    - 카드사 정보                                 │
└─────────────────────────────────────────────────┘
```

### 5.2 거래 취소 프로세스

```
┌─────────────────────────────────────────────────┐
│ 1. 원거래 조회                                   │
│    - 승인번호로 검색                             │
│    - 승인일시 확인                               │
│    - 거래금액 확인                               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. 취소 가능 여부 확인                           │
│    - 당일 취소 가능 여부                         │
│    - 부분 취소 가능 여부                         │
│    - 이미 취소된 거래인지 확인                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. VAN사 취소 요청                               │
│    - 원승인번호                                  │
│    - 원승인일시                                  │
│    - 취소금액                                    │
└─────────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐     ┌───────────────┐
│ 4a. 취소 성공 │     │ 4b. 취소 실패 │
│ - 취소승인번호│     │ - 실패 사유   │
└───────────────┘     │ - VAN사 연락  │
        ↓              └───────────────┘
┌─────────────────────────────────────────────────┐
│ 5. DB 업데이트                                   │
│    - 거래 상태 = 취소                            │
│    - 취소승인번호                                │
│    - 취소일시                                    │
└─────────────────────────────────────────────────┘
```

### 5.3 환불 프로세스 (익일 취소)

```
┌─────────────────────────────────────────────────┐
│ 1. 환불 요청 접수                                │
│    - 고객 확인 (카드 재제시)                     │
│    - 원거래 조회                                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. VAN사 환불 요청                               │
│    - 거래구분 = "환불"                           │
│    - 원승인번호, 원승인일시                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. 환불 승인                                     │
│    - 환불승인번호 발급                           │
│    - 정산 시 처리 (3~7일)                        │
└─────────────────────────────────────────────────┘
```

### 5.4 거래일련번호 관리

**Snumber_Add 함수**:

```vb
Public Sub Snumber_Add()
On Error GoTo err

    If VAN.Name = "KMPS" Then
        ' KMPS는 000001~000999 순환
        If CCur(VAN.SNumber) + 1 >= 1000 Then
            VAN.SNumber = "000001"
        Else
            VAN.SNumber = Format(VAN.SNumber + 1, "000000")
        End If

    ElseIf VAN.Name = "KIS" Or VAN.Name = "STARVAN" Then
        ' KIS, STARVAN은 000001~009999 순환
        If CCur(VAN.SNumber) + 1 >= 10000 Then
            VAN.SNumber = "000001"
        Else
            VAN.SNumber = Format(VAN.SNumber + 1, "000000")
        End If

    Else
        ' 기타 VAN사는 000001~999999 순환
        If CCur(VAN.SNumber) + 1 >= 1000000 Then
            VAN.SNumber = "000001"
        Else
            VAN.SNumber = Format(VAN.SNumber + 1, "000000")
        End If
    End If

    ' INI 파일에 저장
    mfun.WRITE_INI VAN.Name, "Snumber", VAN.SNumber, INI_Path

    Exit Sub
err:
    MsgBox err.Description & "[Snumber_Add]"
End Sub
```

**저장 위치**: `Config.ini`

```ini
[KICC]
Snumber=000123

[NICE]
Snumber=001456

[KSNet]
Snumber=000789
```

---

## 6. 에러 처리

### 6.1 KMPS 에러 함수

```vb
Public Function KMPS_Err(Gubun As String, nRet As Integer) As String
Dim Str_Err As String

    ' 주석 처리된 에러 코드 (실제로는 사용 안함)
    ' Select Case Gubun
    '     Case "FD_PinPADService":
    '         Select Case nRet
    '             Case -1:  Str_Err = "통신 포트를 열지 못함"
    '             Case -2:  Str_Err = "키패드 초기화 요청 전송 실패"
    '             ...

    KMPS_Err = Str_Err
End Function
```

### 6.2 StarVan 에러 함수

```vb
Public Function StarVan_Err(nRet As Integer) As String
    Select Case nRet
        Case -1: StarVan_Err = "[POS 요청 전문 오류]POS REQ Msg type Error"
        Case -2: StarVan_Err = "[VAN 응답 전문 오류]VAN REP Msg type Error"
        Case -3: StarVan_Err = "[비밀번호 입력 필요]"
        Case -4: StarVan_Err = "[전자서명 입력 필요]"

        Case -9: StarVan_Err = "[통신 오류]EOT recv error(미완료 거래 처리)"
        Case -10: StarVan_Err = "[EOT 미수신 처리]R_tran 처리 완료"

        Case -15: StarVan_Err = "[통신 오류]ENQ recv error"
        Case -16: StarVan_Err = "[통신 오류]ACK recv error"
        Case -17: StarVan_Err = "[데이터 수신 오류]DATA recv error"
        Case -21: StarVan_Err = "[데이터 전송 오류]Send error"

        Case -22: StarVan_Err = "[통신 오류]Socket Select Error"
        Case -23: StarVan_Err = "[VAN TimeOut]Socket Select TimeOut"
        Case -24: StarVan_Err = "[통신 오류]Socket Recv Error"

        Case -26: StarVan_Err = "[소켓 생성 실패]Socket Error"
        Case -27: StarVan_Err = "[소켓 연결 실패]Connect Error"

        Case -31: StarVan_Err = "[데이터 암호화 오류]RSA_Padding Error"
        Case -32: StarVan_Err = "[데이터 암호화 오류]RSA Error"

        Case -33: StarVan_Err = "[단말기 정보다운로드 거래 필요]"

        Case -41: StarVan_Err = "[ComPort Open Error]"
        Case -42: StarVan_Err = "[SignPad 연결 오류]"
        Case -43: StarVan_Err = "[SignPad Send 오류]"
        Case -44: StarVan_Err = "[SignPad Recv 오류]"
        Case -45: StarVan_Err = "[SignPad Recv Data 오류]"
        Case -46: StarVan_Err = "[SignPad Recv TimeOut]"
        Case -47: StarVan_Err = "[SignPad NAK 수신]"
        Case -48: StarVan_Err = "[암호화키 등록필요]"
    End Select
End Function
```

### 6.3 KFTC 에러 함수

앞서 섹션 3.3에서 설명한 `KFTC_Error` 함수 참조

### 6.4 KSNet 에러 함수

앞서 섹션 3.4에서 설명한 `KSNET_ERR_MESSAGE` 함수 참조

---

## 7. 마이그레이션 고려사항

### 7.1 현대 웹 스택 전환

**VB6 DLL → REST API Gateway**

```javascript
// Node.js + Express 통합 결제 게이트웨이

import express from "express";
import { paymentGateway } from "./services/PaymentGateway.js";

const app = express();

// 통합 결제 API
app.post("/api/payment/approve", async (req, res) => {
  const { vanProvider, amount, cardInfo, installment } = req.body;

  try {
    // VAN사별 라우팅
    let result;
    switch (vanProvider) {
      case "NICE":
        result = await paymentGateway.nice.approve(amount, cardInfo);
        break;
      case "KICC":
        result = await paymentGateway.kicc.approve(amount, cardInfo);
        break;
      case "KSNet":
        result = await paymentGateway.ksnet.approve(amount, cardInfo);
        break;
      default:
        throw new Error("Unsupported VAN provider");
    }

    // 성공 응답
    res.json({
      success: true,
      approvalNo: result.approvalNo,
      approvalDate: result.approvalDate,
      cardCompany: result.cardCompany,
      merchantNo: result.merchantNo,
    });
  } catch (error) {
    // 에러 응답
    res.status(400).json({
      success: false,
      errorCode: error.code,
      errorMessage: error.message,
    });
  }
});

// 취소 API
app.post("/api/payment/cancel", async (req, res) => {
  const { vanProvider, approvalNo, approvalDate, amount } = req.body;

  try {
    const result = await paymentGateway[vanProvider.toLowerCase()].cancel({
      approvalNo,
      approvalDate,
      amount,
    });

    res.json({
      success: true,
      cancelApprovalNo: result.cancelApprovalNo,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      errorCode: error.code,
      errorMessage: error.message,
    });
  }
});
```

### 7.2 VAN사 통합 서비스 클래스

```javascript
// services/PaymentGateway.js

class NicePaymentService {
  constructor(config) {
    this.ip = config.ip;
    this.port = config.port;
    this.tid = config.tid;
  }

  async approve(amount, cardInfo) {
    // NICE VAN 전문 생성
    const message = this.buildApprovalMessage(amount, cardInfo);

    // TCP 소켓 통신
    const response = await this.sendToVan(message);

    // 응답 파싱
    return this.parseResponse(response);
  }

  async cancel(cancelInfo) {
    const message = this.buildCancelMessage(cancelInfo);
    const response = await this.sendToVan(message);
    return this.parseResponse(response);
  }

  async sendToVan(message) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.connect(this.port, this.ip, () => {
        client.write(message);
      });

      client.on("data", (data) => {
        resolve(data.toString());
        client.destroy();
      });

      client.on("error", (err) => {
        reject(err);
      });

      client.setTimeout(35000); // 35초 타임아웃
      client.on("timeout", () => {
        client.destroy();
        reject(new Error("VAN timeout"));
      });
    });
  }
}

class KICCPaymentService {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.tid = config.tid;
    this.apiKey = config.apiKey;
  }

  async approve(amount, cardInfo) {
    // KICC REST API 호출
    const response = await fetch(`${this.apiUrl}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({
        tid: this.tid,
        amount: amount,
        cardNo: this.encrypt(cardInfo.cardNo),
        expiry: cardInfo.expiry,
        installment: cardInfo.installment,
      }),
    });

    return await response.json();
  }

  encrypt(data) {
    // AES-256 암호화
    const cipher = crypto.createCipheriv("aes-256-cbc", this.apiKey, iv);
    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }
}

// PaymentGateway 싱글톤
export const paymentGateway = {
  nice: new NicePaymentService(config.nice),
  kicc: new KICCPaymentService(config.kicc),
  ksnet: new KSNetPaymentService(config.ksnet),
  // ... 기타 VAN사
};
```

### 7.3 Vue 3 결제 컴포넌트

```vue
<!-- PaymentModal.vue -->
<template>
  <div class="payment-modal">
    <h2>결제 수단 선택</h2>

    <!-- VAN사 선택 -->
    <div class="van-selector">
      <button
        v-for="van in availableVans"
        :key="van.code"
        @click="selectVan(van)"
        :class="{ active: selectedVan === van.code }"
      >
        {{ van.name }}
      </button>
    </div>

    <!-- 카드 입력 -->
    <div v-if="paymentStep === 'card-input'">
      <h3>카드 정보 입력</h3>

      <!-- MSR 리더기 대기 -->
      <div v-if="waitingForCard" class="card-reader">
        <i class="icon-card-reader"></i>
        <p>카드를 리더기에 넣어주세요</p>
        <p class="timer">{{ cardReadTimeout }}초</p>
      </div>

      <!-- 수기 입력 -->
      <div v-else>
        <input v-model="cardNo" placeholder="카드번호 16자리" maxlength="16" />
        <input v-model="expiry" placeholder="유효기간 (YYMM)" maxlength="4" />
        <select v-model="installment">
          <option value="00">일시불</option>
          <option value="02">2개월</option>
          <option value="03">3개월</option>
          <!-- ... -->
        </select>
      </div>
    </div>

    <!-- 서명 입력 -->
    <div v-if="paymentStep === 'signature'">
      <h3>서명 입력</h3>
      <SignaturePad ref="signaturePad" @complete="onSignatureComplete" />
    </div>

    <!-- 승인 중 -->
    <div v-if="paymentStep === 'processing'">
      <div class="loading-spinner"></div>
      <p>결제 승인 중...</p>
      <p class="timeout">{{ approvalTimeout }}초</p>
    </div>

    <!-- 결과 -->
    <div v-if="paymentStep === 'result'">
      <div v-if="approvalResult.success" class="success">
        <i class="icon-check"></i>
        <h3>결제 승인 완료</h3>
        <p>승인번호: {{ approvalResult.approvalNo }}</p>
        <p>카드사: {{ approvalResult.cardCompany }}</p>
        <button @click="printReceipt">영수증 출력</button>
      </div>

      <div v-else class="error">
        <i class="icon-error"></i>
        <h3>결제 실패</h3>
        <p>{{ approvalResult.errorMessage }}</p>
        <button @click="retry">재시도</button>
        <button @click="cancel">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { usePaymentStore } from "@/stores/payment";

const paymentStore = usePaymentStore();

const availableVans = ref([
  { code: "NICE", name: "NICE정보통신" },
  { code: "KICC", name: "KICC" },
  { code: "KSNet", name: "KSNET" },
]);

const selectedVan = ref("NICE");
const paymentStep = ref("card-input");
const waitingForCard = ref(true);
const cardReadTimeout = ref(30);
const approvalTimeout = ref(35);

const cardNo = ref("");
const expiry = ref("");
const installment = ref("00");

const approvalResult = ref({
  success: false,
  approvalNo: "",
  cardCompany: "",
  errorMessage: "",
});

// 카드 리더기 이벤트 리스너
let cardReaderInterval;
onMounted(() => {
  // WebSocket 또는 HTTP 폴링으로 카드 리더기 데이터 수신
  cardReaderInterval = setInterval(() => {
    checkCardReader();
  }, 500);
});

onUnmounted(() => {
  clearInterval(cardReaderInterval);
});

async function checkCardReader() {
  try {
    const response = await fetch("/api/card-reader/status");
    const data = await response.json();

    if (data.cardDetected) {
      cardNo.value = data.cardNo;
      expiry.value = data.expiry;
      waitingForCard.value = false;

      // 자동으로 승인 진행
      await approvePayment();
    }
  } catch (error) {
    console.error("Card reader error:", error);
  }
}

async function approvePayment() {
  paymentStep.value = "processing";

  try {
    const response = await fetch("/api/payment/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vanProvider: selectedVan.value,
        amount: paymentStore.totalAmount,
        cardInfo: {
          cardNo: cardNo.value,
          expiry: expiry.value,
          installment: installment.value,
        },
      }),
    });

    const result = await response.json();

    approvalResult.value = result;
    paymentStep.value = "result";

    if (result.success) {
      // 결제 성공 시 store 업데이트
      paymentStore.setApprovalInfo(result);
    }
  } catch (error) {
    approvalResult.value = {
      success: false,
      errorMessage: "통신 오류: " + error.message,
    };
    paymentStep.value = "result";
  }
}

function selectVan(van) {
  selectedVan.value = van.code;
}

function retry() {
  paymentStep.value = "card-input";
  cardNo.value = "";
  expiry.value = "";
}

function cancel() {
  // 결제 취소 로직
  paymentStore.reset();
  emit("close");
}

function printReceipt() {
  // 영수증 출력
  window.print();
}
</script>
```

### 7.4 PG사 통합 대안

**직접 VAN 연동 대신 PG사 이용**:

| PG사             | 장점                     | 단점        |
| ---------------- | ------------------------ | ----------- |
| **토스페이먼츠** | REST API, 웹훅, 간편결제 | 수수료 높음 |
| **나이스페이**   | 다양한 결제수단, 안정성  | 레거시 API  |
| **KG이니시스**   | 오래된 역사, 높은 점유율 | 복잡한 인증 |
| **KCP**          | B2B 특화, 법인카드 강점  | 문서 부족   |

**토스페이먼츠 예시**:

```javascript
// Toss Payments SDK
import { loadTossPayments } from "@tosspayments/payment-sdk";

const tossPayments = await loadTossPayments(clientKey);

// 결제 요청
const payment = tossPayments.payment({
  amount: 10000,
  orderId: "ORDER_20260129_001",
  orderName: "아메리카노 2잔",
  customerName: "홍길동",
  successUrl: "https://example.com/success",
  failUrl: "https://example.com/fail",
});

await payment.requestPayment("카드");
```

### 7.5 마이그레이션 로드맵

**Phase 1 - 분석 및 설계 (2개월)**

- [ ] 현재 VAN사 사용 현황 파악
- [ ] 거래량 분석
- [ ] REST API 설계
- [ ] DB 스키마 재설계

**Phase 2 - 통합 게이트웨이 개발 (3개월)**

- [ ] Node.js 백엔드 구축
- [ ] VAN사별 어댑터 구현
- [ ] 에러 핸들링 로직
- [ ] 트랜잭션 관리
- [ ] 로깅 및 모니터링

**Phase 3 - 프론트엔드 개발 (2개월)**

- [ ] Vue 3 결제 컴포넌트
- [ ] 카드 리더기 연동
- [ ] 서명패드 연동
- [ ] 영수증 출력

**Phase 4 - 테스트 (2개월)**

- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] VAN사별 테스트 환경 구축
- [ ] 부하 테스트

**Phase 5 - 배포 및 모니터링 (1개월)**

- [ ] 스테이징 배포
- [ ] 프로덕션 배포
- [ ] 실시간 모니터링
- [ ] 에러 알림 설정

---

## 8. 결론

Mdl_Card_Dll.bas는 POSON POS 시스템의 핵심 결제 모듈로, 12개 VAN사와의 통합을 담당합니다.

**주요 특징**:

1. **다양한 VAN사 지원**: NICE, KICC, KFTC 등 12개 VAN사 DLL API 통합
2. **복잡한 전문 처리**: 각 VAN사별 고유 전문 형식 지원
3. **보안**: 카드번호 암호화, 서명 데이터 보호
4. **에러 핸들링**: VAN사별 에러 코드 관리

**마이그레이션 권장사항**:

- **단기**: PG사 (토스페이먼츠, 나이스페이) 이용으로 빠른 전환
- **장기**: 직접 VAN 연동 REST API 게이트웨이 구축

**다음 분석 파일**: [frm_SelfCard.frm.md](./frm_SelfCard.frm.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
