# Frm_SelfCash.frm 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Frm_SelfCash.frm`
**파일 크기**: 약 150KB (3,777 lines)
**역할**: 현금 결제 UI 및 지폐/동전 입출금기 연동
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [UI 컨트롤 목록](#2-ui-컨트롤-목록)
3. [거스름돈 계산 로직](#3-거스름돈-계산-로직)
4. [지폐/동전 입출금기 연동](#4-지폐동전-입출금기-연동)
5. [현금영수증 연동](#5-현금영수증-연동)
6. [에러 처리 및 예외 상황](#6-에러-처리-및-예외-상황)
7. [마이그레이션](#7-마이그레이션)

---

## 1. 파일 개요

### 1.1 목적

키오스크 셀프 결제 시스템에서 **현금 결제 화면**을 담당하며, 지폐/동전 입출금기와 RS-232 시리얼 통신으로 연동합니다.

### 1.2 주요 역할

1. **현금 입금 처리**: 지폐(5만원, 1만원, 5천원, 1천원) 및 동전(500원, 100원) 입금
2. **거스름돈 계산**: 입금액 - 결제금액 = 거스름돈
3. **거스름돈 출금**: 지폐/동전 출금기로 거스름돈 배출
4. **현금영수증 발행**: 국세청 연동 (선택사항)
5. **에러 처리**: 지폐 걸림, 동전 부족, 통신 오류 등

### 1.3 지원 기기

- **입출금기 타입 0** (C_Config.self_CashGubun = 0): 일반형 지폐/동전 입출금기
  - COM Port: 19200 bps, N, 8, 1
  - 제조사: (미상)

- **입출금기 타입 1** (C_Config.self_CashGubun = 1): 원형 입출금기
  - COM Port: 9600 bps, N, 8, 1
  - 제조사: (미상)

### 1.4 코드 구조

```vb
Option Explicit

' 전역 변수
Public SelfMEMTaxGubun As String    ' 현금영수증 구분 (소득공제/지출증빙)
Public SelfMEMTaxNumber As String   ' 현금영수증 번호 (주민번호/사업자번호)
Public SelfCC_Chk As Boolean        ' 현금영수증 발행 확인
Public self_MoneyChk As Boolean     ' 현금영수증 거스름돈 확인
Dim SelfOldInitTime As Date         ' 자동 화면복귀 시간

' 폼 이벤트
Private Sub Form_Activate()
    ' 입출금기 초기화
End Sub

' 입금 처리
Private Function funInputCash() As Boolean
    ' 입금 대기
End Function

' 거스름돈 처리
Private Function funCashTotalPro() As Boolean
    ' 거스름돈 계산 및 출금
End Function

' 현금영수증 발행
Private Sub cmd현금영수증_Click()
    ' 국세청 API 호출
End Sub
```

---

## 2. UI 컨트롤 목록

### 2.1 화면 레이아웃

```
┌────────────────────────────────────────────────┐
│              POSON POS 현금결제                │
│                                                │
│  총 금액:        10,000원 (파란색)              │
│  투입 금액:       8,000원 (검은색)              │
│  거스름돈:        2,000원 (빨간색)              │
│                                                │
│ ┌──────────────────────────────────────────┐ │
│ │  지폐/동전을 넣어주세요                    │ │
│ │                                            │ │
│ │  [현금 입금 중...]                         │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │   1     │  │   2     │  │   3     │      │
│  │         │  │         │  │         │      │
│  └─────────┘  └─────────┘  └─────────┘      │
│                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │   4     │  │   5     │  │   6     │      │
│  │         │  │         │  │         │      │
│  └─────────┘  └─────────┘  └─────────┘      │
│                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │   7     │  │   8     │  │   9     │      │
│  │         │  │         │  │         │      │
│  └─────────┘  └─────────┘  └─────────┘      │
│                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │   취소  │  │   0     │  │   확인  │      │
│  │         │  │         │  │         │      │
│  └─────────┘  └─────────┘  └─────────┘      │
│                                                │
│             [현금영수증 발급하기]               │
│                                                │
│  타이머: [10]초 후 자동으로 돌아갑니다          │
└────────────────────────────────────────────────┘
```

### 2.2 주요 컨트롤

| 컨트롤명             | 타입   | 역할                                  |
| -------------------- | ------ | ------------------------------------- |
| **Frame1(0)**        | Frame  | 메인 화면 프레임                      |
| **Frame1(1)**        | Frame  | 숫자 입력 프레임 (현금영수증 번호)    |
| **Frame1(2)**        | Frame  | 현금영수증 발급 확인 프레임           |
| **Frame1(3)**        | Frame  | 메시지 표시 프레임                    |
| **lab총금액**        | Label  | 결제 금액 표시 (파란색)               |
| **lab투입금액**      | Label  | 입금액 표시 (검은색)                  |
| **lab거스름돈**      | Label  | 거스름돈 표시 (빨간색)                |
| **txt전화번호**      | Label  | 전화번호/사업자번호 입력              |
| **숫자버튼(0)~(10)** | Label  | 숫자 키패드 (0~9, 010)                |
| **lab취소**          | Label  | 취소 버튼                             |
| **cmd현금영수증**    | Label  | 현금영수증 발급 버튼                  |
| **labTimer3**        | Label  | 자동 복귀 타이머 표시                 |
| **Timer1**           | Timer  | 입금 처리 타이머                      |
| **Timer2**           | Timer  | 거스름돈 처리 타이머                  |
| **Timer3**           | Timer  | 자동 복귀 타이머 (1초마다 카운트다운) |
| **MSComm1**          | MSComm | 입출금기 통신 (타입 0)                |
| **MSComm2**          | MSComm | 입출금기 통신 (타입 1)                |

### 2.3 이미지 컨트롤

| 컨트롤명                | 역할                   |
| ----------------------- | ---------------------- |
| **img숫자버튼(0)~(10)** | 숫자 키패드 이미지     |
| **img취소**             | 취소 버튼 이미지       |
| **img현금영수증**       | 현금영수증 버튼 이미지 |
| **img거스름돈**         | 거스름돈 애니메이션    |

---

## 3. 거스름돈 계산 로직

### 3.1 거스름돈 계산 공식

```vb
거스름돈 = 투입금액 - 총금액

If 거스름돈 >= 0 Then
    ' 정상 결제
    ' 거스름돈 출금
Else
    ' 금액 부족
    ' 추가 입금 대기
End If
```

### 3.2 subCashMoneyNow (입금액 계산)

```vb
Private Sub subCashMoneyNow()
Dim sCash As String
On Error GoTo err

    ' 입금액 계산 (16진수 -> 10진수)
    sCash = DataCashInfo.data1 & DataCashInfo.Data0
    sCash = CDbl("&H" & sCash)
    sCash = Format(sCash & "00", "#,##0")

    ' 입금액 업데이트
    If sCash <> lab투입금액.Caption Then
        lab투입금액.Caption = sCash
        WriteLog "투입금액 : " & sCash

        ' 거스름돈 계산
        lab거스름돈.Caption = Format(CCur(lab투입금액.Caption) - CCur(lab총금액.Caption), "#,##0")
        WriteLog "거스름돈 : " & lab거스름돈.Caption

        ' 음수인 경우 0으로 표시
        If CCur(lab거스름돈.Caption) < 0 Then
            lab거스름돈.Caption = "0"
        End If

        ' 충분한 금액이 입금되면 거스름돈 처리
        If CCur(lab투입금액.Caption) >= CCur(lab총금액.Caption) Then
            Call Product_Sound("입금완료.wav")
            ' 거스름돈 출금 처리
            Call funChangeMoneyPro()
        End If
    End If

    Exit Sub
err:
    MsgBox "[Events] : subCashMoneyNow " & vbCrLf & _
           "[에러코드] : " & err.Number & Chr(13) & _
           "[에러내용] :  " & err.Description, vbCritical, Enterprise
End Sub
```

### 3.3 funCashTotalPro (총 처리 로직)

```vb
Private Function funCashTotalPro() As Boolean
    Select Case C_Config.self_CashGubun
    Case 0
        subCashMoneyNow  ' 타입 0 입출금기
    Case 1
        subCashMoneyNowOne  ' 타입 1 입출금기
    End Select

    ' 투입금액이 총금액과 같거나 크면 완료
    If CCur(lab투입금액.Caption) >= CCur(lab총금액.Caption) Then
        funCashTotalPro = True
    End If
End Function
```

### 3.4 거스름돈 출금 로직 (추정)

```vb
Private Sub funChangeMoneyPro()
Dim ChangeMoney As Currency
Dim Count_50000 As Integer  ' 5만원 지폐 수
Dim Count_10000 As Integer  ' 1만원 지폐 수
Dim Count_5000 As Integer   ' 5천원 지폐 수
Dim Count_1000 As Integer   ' 1천원 지폐 수
Dim Count_500 As Integer    ' 500원 동전 수
Dim Count_100 As Integer    ' 100원 동전 수

    ChangeMoney = CCur(lab거스름돈.Caption)

    ' 5만원권 계산
    Count_50000 = Int(ChangeMoney / 50000)
    ChangeMoney = ChangeMoney Mod 50000

    ' 1만원권 계산
    Count_10000 = Int(ChangeMoney / 10000)
    ChangeMoney = ChangeMoney Mod 10000

    ' 5천원권 계산
    Count_5000 = Int(ChangeMoney / 5000)
    ChangeMoney = ChangeMoney Mod 5000

    ' 1천원권 계산
    Count_1000 = Int(ChangeMoney / 1000)
    ChangeMoney = ChangeMoney Mod 1000

    ' 500원 동전 계산
    Count_500 = Int(ChangeMoney / 500)
    ChangeMoney = ChangeMoney Mod 500

    ' 100원 동전 계산
    Count_100 = Int(ChangeMoney / 100)
    ChangeMoney = ChangeMoney Mod 100

    ' 100원 미만 버림 (10원, 1원은 처리 안함)
    If ChangeMoney > 0 Then
        WriteLog "100원 미만 금액 버림: " & ChangeMoney
    End If

    ' 입출금기로 출금 명령 전송
    Call SendChangeCommand(Count_50000, Count_10000, Count_5000, Count_1000, Count_500, Count_100)

    ' 출금 완료 대기
    Timer2.Enabled = True
End Sub
```

**거스름돈 예시**:

```
총금액:      10,000원
투입금액:    50,000원
거스름돈:    40,000원

출금:
- 10,000원 x 4장 = 40,000원
```

---

## 4. 지폐/동전 입출금기 연동

### 4.1 RS-232 시리얼 통신

**MSComm1 설정 (타입 0)**:

```vb
Public Sub SetCashPort()
On Error GoTo err
    Select Case C_Config.self_CashGubun
    Case 0
        MSComm1.CommPort = C_Config.self_CashPort  ' COM 포트 번호 (예: 3)
        MSComm1.settings = "19200,N,8,1"           ' 19200 bps, No Parity, 8 bits, 1 stop bit
        MSComm1.InputLen = 1                       ' 1 byte씩 읽기
        MSComm1.InputMode = comInputModeBinary     ' Binary 모드
        MSComm1.PortOpen = True                    ' 포트 열기
        WriteLog "입출금기 포트오픈 성공"

    Case 1
        If MSComm2.PortOpen = False Then
            MSComm2.CommPort = C_Config.self_CashPort
            MSComm2.settings = "9600,N,8,1"        ' 9600 bps
            MSComm2.InputLen = 1
            MSComm2.InputMode = comInputModeBinary
            MSComm2.PortOpen = True
        End If
        WriteLog "입출금기 포트오픈 성공"
    End Select

    Exit Sub
err:
    WriteLog "입출금기 포트오픈 실패"
End Sub
```

### 4.2 명령 프로토콜

**입금 상태 조회 (0x02 0x02 0x41 0x01 0x03 0x47)**:

```vb
Private Function ReturnCashInfo() As Boolean
Dim rbuf As Variant
Dim i As Integer
Dim j As Integer
Dim CashInfos() As Variant
On Error GoTo err

    ' 에러 확인
    If GetCashError() = False Then
        Exit Function
    End If

    ' 입금 상태 조회 명령 전송
    MSComm1.Output = Chr$(&H2) & Chr$(&H2) & Chr$(&H41) & Chr$(&H1) & Chr$(&H3) & Chr$(&H47)

    WriteLog "입금요청 송신"

    MSComm1.InBufferCount = 0
    ReDim Preserve CashInfos(29)

    labMSG.Caption = "지폐와 동전을 넣어 주세요"

    Do
        DoEvents
        If MSComm1.InBufferCount > 0 Then
            rbuf = MSComm1.Input
            For i = 0 To UBound(rbuf)
                If j = 30 Then
                    j = 0
                    WriteLog "데이터 수신초과"
                End If
                CashInfos(j) = rbuf(i)
                j = j + 1
            Next i

            If j = 29 Then  ' 전체 데이터 수신 완료 (29 bytes)
                j = 0
                MSComm1.InBufferCount = 0

                ' 데이터 파싱
                For i = 0 To UBound(CashInfos)
                    Dim tempS As String
                    tempS = DecToJinsu(str(CashInfos(i)))
                    SetCashData i, CashInfos(i), tempS
                Next i

                ' 에러 확인
                If GetCashError() = False Then Exit Function

                ' 입금액 처리
                bTemp = funCashTotalPro()

                If bTemp = False Then
                    ' 추가 입금 요청
                    MSComm1.Output = Chr$(&H2) & Chr$(&H1) & Chr$(&H40) & Chr$(&H3) & Chr$(&H44)
                    Sleep (200)
                Else
                    WriteLog "입금요청 완료"
                    labMSG.Caption = "투입이 완료되었습니다."
                    Exit Function
                End If
            End If
        End If  ' end buffer
    Loop

    Exit Function
err:
    MsgBox "[Event] ReturnCashInfo : " & err.Number & Chr(13) & "[에러내용] :  " & err.Description
End Function
```

**프로토콜 구조 (추정)**:

```
[요청]
STX (0x02) | LEN (0x02) | CMD (0x41) | DATA (0x01) | ETX (0x03) | CHK (0x47)

[응답] (29 bytes)
Byte 0~1:   투입 금액 (High, Low)
Byte 2~3:   5만원 지폐 수
Byte 4~5:   1만원 지폐 수
Byte 6~7:   5천원 지폐 수
Byte 8~9:   1천원 지폐 수
Byte 10~11: 500원 동전 수
Byte 12~13: 100원 동전 수
Byte 14:    상태 플래그 1 (입금 완료, 지폐 걸림 등)
Byte 15:    상태 플래그 2 (거스름돈 부족 등)
Byte 16:    에러 플래그 (센서 이상, 모터 이상 등)
Byte 17~28: 기타 정보
```

### 4.3 데이터 파싱

**DecToJinsu (16진수 → 2진수 변환)**:

```vb
Private Function DecToJinsu(Value As String) As String
Dim t As Double, i As Integer
Dim str As String, c As Integer
Dim HexNum As String
Dim intNum As Variant
Dim tempS As String

On Error GoTo err

    HexNum = Trim(Value)
    intNum = CDbl("&H" & HexNum)  ' 16진수를 10진수로 변환
    intNum = Dec2Hex(Trim(HexNum))

    If intNum = "" Then intNum = 0
    intNum = CDbl("&H" & intNum)

    t = intNum

    ' 2진수 변환
    str = ""
    Do
        c = t Mod 2
        t = t \ 2
        str = str & c & IIf(t > 0, "", "")
    Loop Until t = 0

    tempS = str

    ' 8자리로 맞추기 (부족한 자리는 0 채움)
    For i = Len(tempS) To 7
        tempS = tempS & "0"
    Next i

    DecToJinsu = tempS

    Exit Function
err:
    MsgBox "[Event] DecToJinsu : " & err.Number & Chr(13) & "[에러내용] :  " & err.Description
End Function
```

**GetCashInfo (비트 값 조회)**:

```vb
' 추정 코드
Function GetCashInfo(byteIndex As Integer, bitIndex As Integer) As String
    Dim byteValue As String
    Dim bitString As String

    ' 해당 바이트의 2진수 문자열 가져오기
    bitString = DecToJinsu(DataCashInfo(byteIndex))

    ' 특정 비트 값 반환 (0-based index)
    GetCashInfo = Mid(bitString, bitIndex + 1, 1)
End Function

' 사용 예시
If GetCashInfo(14, 0) = 1 Then  ' 14번 바이트의 0번 비트
    WriteLog "입금완료 플래그 활성"
End If

If GetCashInfo(16, 0) = "1" Then  ' 16번 바이트의 0번 비트
    WriteLog "센서 이상"
End If
```

### 4.4 상태 및 에러 플래그

**Byte 14 (상태 플래그 1)**:

| Bit | 의미              |
| --- | ----------------- |
| 0   | 입금완료 플래그   |
| 1   | 지폐 입금 중      |
| 2   | 동전1호기 입금 중 |
| 3   | 동전2호기 입금 중 |
| 4   | 입금거부 발생     |
| 5   | 대기              |
| 6   | 거래진행 중       |
| 7   | 초기화 완료       |

**Byte 15 (상태 플래그 2)**:

| Bit | 의미                    |
| --- | ----------------------- |
| 0   | 거스름돈 부족           |
| 1   | 천원권 거스름돈 부족    |
| 2   | 동전1호기 거스름돈 부족 |
| 3   | 동전2호기 거스름돈 부족 |
| 4   | 초기화 필요             |
| 5   | 천원권 잔량 없음        |
| 6   | 오백원 잔량 없음        |
| 7   | 백원 잔량 없음          |

**Byte 16 (에러 플래그)**:

| Bit | 의미           |
| --- | -------------- |
| 0   | 센서 이상      |
| 1   | 모터 이상      |
| 2   | 지폐 이상      |
| 3   | 예약           |
| 4   | 예약           |
| 5   | 예약           |
| 6   | 동전1호기 이상 |
| 7   | 동전2호기 이상 |

### 4.5 에러 처리

```vb
Private Function GetCashError() As Boolean
Dim Result As Boolean
Dim sMSG As String
On Error GoTo err

    Frm_SelfCash.self_MoneyChk = False
    If MSComm1.PortOpen = False Then Exit Function

    Result = True

    ' 센서 이상
    If GetCashInfo(16, 0) = "1" Then
        WriteLog "센서 이상"
        Result = False
        sMSG = "센서 오류발생"
    End If

    ' 모터 이상
    If GetCashInfo(16, 1) = "1" Then
        WriteLog "모터 이상"
        Result = False
        sMSG = sMSG + " 모터 오류발생"
    End If

    ' 지폐 이상
    If GetCashInfo(16, 2) = "1" Then
        WriteLog "지폐 이상"
        Result = False
        sMSG = sMSG + " 지폐 오류발생"
    End If

    ' 동전1호기 이상
    If GetCashInfo(16, 6) = "1" Then
        WriteLog "동전1호기 이상"
        Result = False
        sMSG = sMSG + " 동전1호기 오류발생"
    End If

    ' 동전2호기 이상
    If GetCashInfo(16, 7) = "1" Then
        WriteLog "동전2호기 이상"
        Result = False
        sMSG = sMSG + " 동전2호기 오류발생"
    End If

    GetCashError = Result
    Frm_SelfCash.self_MoneyChk = Result

    If sMSG <> "" Then
        subChangeError sMSG, "기기오류"
    End If

    Exit Function
err:
    MsgBox "[Events] : GetCashError " & vbCrLf & _
           "[에러코드] : " & err.Number & Chr(13) & _
           "[에러내용] :  " & err.Description, vbCritical, Enterprise
End Function
```

---

## 5. 현금영수증 연동

### 5.1 현금영수증 발급 프로세스

```
┌─────────────────────────────────────────┐
│ 1. 사용자가 "현금영수증 발급하기" 클릭   │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. Frame1(1) 표시 (전화번호 입력 화면)  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. 숫자 키패드로 전화번호 입력           │
│    (010-1234-5678 형식)                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. "확인" 버튼 클릭                      │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 5. Frame1(2) 표시 (발급 확인 화면)      │
│    "현금영수증을 발급 하시겠습니까?"     │
└─────────────────────────────────────────┘
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ 일반결제      │  │ 현금영수증   │
│ (발급 안함)   │  │ (발급 함)    │
└──────────────┘  └──────────────┘
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ 결제 완료     │  │ VAN사 API    │
│              │  │ 호출          │
└──────────────┘  └──────────────┘
                        ↓
                ┌──────────────┐
                │ 현금영수증    │
                │ 승인번호 수신 │
                └──────────────┘
                        ↓
                ┌──────────────┐
                │ 영수증 출력   │
                └──────────────┘
```

### 5.2 전화번호 입력 UI

**숫자 키패드 클릭 이벤트**:

```vb
Private Sub 숫자버튼_Click(Index As Integer)
    Call Product_Sound("버튼터치.wav")

    ' 최대 11자리 (010-1234-5678)
    If Len(txt전화번호.Caption) >= 11 Then
        MsgBox "전화번호는 최대 11자리입니다", vbCritical
        Exit Sub
    End If

    ' 숫자 추가
    If Index = 10 Then
        ' "010" 버튼
        txt전화번호.Caption = "010"
    Else
        txt전화번호.Caption = txt전화번호.Caption & Index
    End If
End Sub

Private Sub lab취소_Click()
    Call Product_Sound("버튼터치.wav")

    ' 마지막 글자 삭제 (백스페이스)
    If Len(txt전화번호.Caption) > 0 Then
        txt전화번호.Caption = Left(txt전화번호.Caption, Len(txt전화번호.Caption) - 1)
    End If
End Sub
```

### 5.3 현금영수증 발급

```vb
Private Sub cmd현금영수증_Click()
On Error GoTo err
Dim sTemp As String

    Call Product_Sound("버튼터치.wav")
    WriteLog "현금영수증 발급"

    Timer3.Enabled = False
    labTimer3.Caption = ""

    ' 구분 확인 (소득공제/지출증빙)
    If SelfMEMTaxGubun = "" Then
        MsgBox "구분 선택이 필요합니다", vbCritical, Me.Caption
        Exit Sub
    End If

    ' 전화번호 확인
    If txt전화번호.Caption = "" Then
        MsgBox "전화번호를 입력해 주세요", vbCritical, Me.Caption
        Exit Sub
    End If

    SelfMEMTaxNumber = txt전화번호.Caption

    ' 전표번호 저장
    sTemp = Frm_SaleMain.lbl_jeonpyo.Caption

    ' 현금 결제 처리 (Frm_SaleMain에서)
    Frm_SaleMain.subSelfCashPro "현금영수증," & _
                                 CCur(lab총금액.Caption) & "," & _
                                 CCur(lab투입금액.Caption) & "," & _
                                 CCur(lab거스름돈.Caption) & ""

    If SelfCC_Chk = True Then
        ' 전표번호 로그
        Frm_SelfCash.Cash_WriteLog "CashLog", "PosON_Cash_" & Format(Now, "YYYYMMDD"), "전표 : " & sTemp
        Unload Me
    End If

    Exit Sub
err:
    MsgBox "[Events] : cmd현금영수증_Click " & vbCrLf & _
           "[에러코드] : " & err.Number & Chr(13) & _
           "[에러내용] :  " & err.Description, vbCritical, Enterprise
End Sub
```

### 5.4 VAN사 현금영수증 API 호출 (추정)

```vb
' Frm_SaleMain.subSelfCashPro 내부에서 호출 (추정)
Function IssueCashReceipt(TaxGubun As String, TaxNumber As String, Amount As Currency) As Boolean
Dim Result As Boolean
Dim ApprovalNo As String

On Error GoTo err

    ' VAN사별 분기
    Select Case VAN.name
        Case "NICE"
            ' NICE 현금영수증 API
            Result = NICE_CashReceipt(TaxGubun, TaxNumber, Amount, ApprovalNo)

        Case "KICC"
            ' KICC 현금영수증 API
            Result = KICC_CashReceipt(TaxGubun, TaxNumber, Amount, ApprovalNo)

        Case "KMPS"
            ' KMPS 현금영수증 API (FDIK_CashReceiptAuth)
            Result = FDIK_CashReceiptAuth_Call(TaxGubun, TaxNumber, Amount, ApprovalNo)

        Case Else
            MsgBox "현금영수증을 지원하지 않는 VAN사입니다"
            Result = False
    End Select

    If Result = True Then
        WriteLog "현금영수증 승인번호: " & ApprovalNo

        ' DB 저장
        Call SaveCashReceiptToDB(TaxGubun, TaxNumber, Amount, ApprovalNo)
    Else
        MsgBox "현금영수증 발급에 실패했습니다"
    End If

    IssueCashReceipt = Result

    Exit Function
err:
    MsgBox "[IssueCashReceipt] " & err.Description
    IssueCashReceipt = False
End Function
```

### 5.5 DB 저장 (Card_Log 테이블)

```sql
INSERT INTO Card_Log (
    C_PosNo, C_SaleDate, C_JeonPyo, C_SaleType,
    C_Date, C_Time, C_MemID,
    C_Price, C_AppNumber, C_AppDate,
    C_Msg, C_VAN, C_UserID,
    C_CashReceipt_Gubun, C_CashReceipt_Number, C_CashReceipt_ApprovalNo
)
VALUES (
    '001',                          -- POS 번호
    '2026-01-29',                   -- 판매일자
    '20260129001',                  -- 전표번호
    '3',                            -- 거래구분 (3=현금영수증)
    '2026-01-29', '15:30:45',       -- 승인일시
    '',                             -- 회원ID
    10000,                          -- 금액
    '12345678',                     -- 승인번호
    '2026-01-29',                   -- 승인일자
    '정상승인',                     -- 메시지
    'KICC',                         -- VAN사
    'admin',                        -- 사용자ID
    '1',                            -- 구분 (1=소득공제, 2=지출증빙)
    '01012345678',                  -- 전화번호/사업자번호
    '12345678'                      -- 현금영수증 승인번호
)
```

---

## 6. 에러 처리 및 예외 상황

### 6.1 주요 에러 상황

| 에러 상황          | 원인                     | 처리 방법      |
| ------------------ | ------------------------ | -------------- |
| **센서 이상**      | 지폐/동전 감지 센서 고장 | 관리자 호출    |
| **모터 이상**      | 지폐/동전 이송 모터 고장 | 관리자 호출    |
| **지폐 걸림**      | 지폐가 이송 경로에 걸림  | 관리자 호출    |
| **거스름돈 부족**  | 거스름돈 지폐/동전 부족  | 잔돈 보충 필요 |
| **통신 오류**      | RS-232 케이블 단선       | 케이블 확인    |
| **포트 오픈 실패** | COM 포트 사용 중         | POS 재시작     |

### 6.2 에러 메시지 표시

```vb
Private Sub subChangeError(sMSG As String, sTitle As String)
    Frame1(3).Visible = True
    Frame1(3).Top = 0

    labMSG1.Caption = sTitle
    labMSG2.Caption = sMSG

    WriteLog "에러 메시지: " & sTitle & " - " & sMSG

    ' 5초 후 자동으로 메인 화면으로 돌아가기
    Timer4.Enabled = True
    Timer4.Tag = "5"
End Sub

Private Sub Timer4_Timer()
    Timer4.Tag = Val(Timer4.Tag) - 1

    If Val(Timer4.Tag) <= 0 Then
        Timer4.Enabled = False
        Frame1(3).Visible = False
        Unload Me  ' 폼 닫기
    End If
End Sub
```

### 6.3 거스름돈 부족 처리

```vb
Private Function funCashNow() As Boolean
Dim Result As Boolean
Dim sMSG As String
Dim lMSG1 As Long  ' 천원권 부족
Dim lMSG2 As Long  ' 오백원 부족
Dim lMSG3 As Long  ' 백원 부족

On Error GoTo err

    Result = True

    ' 천원권 거스름돈 확인
    WriteLog "천원권 거스름돈 요구수량 : " & DataCashInfo.data11 & " 수량 : " & DataCashInfo.data8
    If DataCashInfo.data11 <> DataCashInfo.data8 Then
        Result = False
        lMSG1 = CCur(DataCashInfo.data11) - CCur(DataCashInfo.data8)
    End If

    If lMSG1 <> 0 Then
        WriteLog ("천원권 잔량부족 " & lMSG1)
        sMSG = "천원짜리 동전 " & lMSG1 & "개 부족합니다."
        Result = False
    End If

    ' 오백원 거스름돈 확인
    WriteLog "오백원 거스름돈 요구수량 : " & DataCashInfo.Data12 & " 수량 : " & DataCashInfo.data9
    If DataCashInfo.Data12 <> DataCashInfo.data9 Then
        Result = False
        lMSG2 = CCur(DataCashInfo.Data12) - CCur(DataCashInfo.data9)
    End If

    If lMSG2 <> 0 Then
        WriteLog (OneString & "잔량부족 " & lMSG2)
        sMSG = sMSG + OneString & "짜리 동전  " & lMSG2 & "개 부족합니다."
        Result = False
    End If

    ' 백원 거스름돈 확인
    WriteLog "백원 거스름돈 요구수량 : " & DataCashInfo.Data13 & " 수량 : " & DataCashInfo.data10
    If DataCashInfo.Data13 <> DataCashInfo.data10 Then
        Result = False
        lMSG3 = CCur(DataCashInfo.Data13) - CCur(DataCashInfo.data10)
    End If

    If lMSG3 <> 0 Then
        WriteLog ("100원잔량부족 " & lMSG3)
        sMSG = sMSG + " 100원짜리 동전  " & lMSG3 & "개 부족합니다."
        Result = False
    End If

    If sMSG <> "" Then
        WriteLog sMSG
        labMSG.Caption = sMSG
        subChangeError sMSG, "거스름돈 부족"
    End If

    funCashNow = Result

    Exit Function
err:
    MsgBox "[Events] : funCashNow " & vbCrLf & _
           "[에러코드] : " & err.Number & Chr(13) & _
           "[에러내용] :  " & err.Description, vbCritical, Enterprise
End Function
```

---

## 7. 마이그레이션

### 7.1 Vue 3 현금 결제 컴포넌트

**CashPayment.vue**:

```vue
<template>
  <div class="cash-payment">
    <!-- 금액 표시 -->
    <div class="amount-display">
      <div class="amount-row">
        <span class="label">총 금액:</span>
        <strong class="amount total">{{ formatCurrency(totalAmount) }}</strong>
      </div>
      <div class="amount-row">
        <span class="label">투입 금액:</span>
        <strong class="amount inserted">{{ formatCurrency(insertedAmount) }}</strong>
      </div>
      <div class="amount-row">
        <span class="label">거스름돈:</span>
        <strong class="amount change">{{ formatCurrency(changeAmount) }}</strong>
      </div>
    </div>

    <!-- 입금 안내 -->
    <div v-if="paymentState === 'waiting-cash'" class="cash-insert-guide">
      <img src="@/assets/animations/cash-insert.gif" alt="현금 투입" />
      <h3>지폐와 동전을 넣어주세요</h3>
      <p class="timer">{{ cashWaitTimeout }}초</p>
    </div>

    <!-- 거스름돈 출금 중 -->
    <div v-if="paymentState === 'dispensing-change'" class="dispensing">
      <div class="spinner"></div>
      <h3>거스름돈을 출금하고 있습니다...</h3>
      <p>잠시만 기다려주세요</p>
    </div>

    <!-- 결제 완료 -->
    <div v-if="paymentState === 'success'" class="success">
      <i class="icon-check-circle"></i>
      <h3>결제가 완료되었습니다</h3>
      <div class="change-info">
        <p><strong>거스름돈:</strong> {{ formatCurrency(changeAmount) }}</p>
        <p>거스름돈을 받아가세요</p>
      </div>
      <button @click="issueCashReceipt">현금영수증 발급하기</button>
      <button @click="completePayment">영수증 출력</button>
    </div>

    <!-- 에러 -->
    <div v-if="paymentState === 'error'" class="error">
      <i class="icon-error-circle"></i>
      <h3>오류가 발생했습니다</h3>
      <p>{{ errorMessage }}</p>
      <button @click="retry">재시도</button>
      <button @click="cancel">취소</button>
    </div>

    <!-- 취소 버튼 -->
    <button v-if="paymentState !== 'success'" class="cancel-btn" @click="cancel">취소</button>

    <!-- 자동 복귀 타이머 -->
    <div v-if="autoReturnEnabled" class="auto-return-timer">
      {{ autoReturnCountdown }}초 후 자동으로 돌아갑니다
    </div>

    <!-- 현금영수증 입력 모달 -->
    <CashReceiptModal
      v-if="showCashReceiptModal"
      @confirm="confirmCashReceipt"
      @cancel="closeCashReceiptModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePaymentStore } from "@/stores/payment";
import { cashMachineAPI } from "@/api/cashMachine";
import CashReceiptModal from "@/components/CashReceiptModal.vue";

const router = useRouter();
const paymentStore = usePaymentStore();

// 상태
const paymentState = ref("waiting-cash");
// 가능한 상태: waiting-cash, dispensing-change, success, error

// 금액
const totalAmount = computed(() => paymentStore.totalAmount);
const insertedAmount = ref(0);
const changeAmount = computed(() => Math.max(0, insertedAmount.value - totalAmount.value));

// 타이머
const cashWaitTimeout = ref(60);
const autoReturnCountdown = ref(30);
const autoReturnEnabled = ref(true);

// 에러
const errorMessage = ref("");

// 현금영수증
const showCashReceiptModal = ref(false);

// WebSocket 연결
let ws = null;
let autoReturnInterval = null;

onMounted(async () => {
  // 1. WebSocket 연결 (입출금기 실시간 통신)
  ws = new WebSocket("ws://localhost:8080/cash-machine");

  ws.onopen = () => {
    console.log("Cash machine WebSocket connected");

    // 입금 시작 명령 전송
    ws.send(
      JSON.stringify({
        command: "start-deposit",
        amount: totalAmount.value,
      }),
    );
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.event) {
      case "cash-inserted":
        // 현금 투입 이벤트
        insertedAmount.value = data.insertedAmount;

        // 충분한 금액이 투입되면 거스름돈 출금
        if (insertedAmount.value >= totalAmount.value) {
          paymentState.value = "dispensing-change";
          requestChangeDispensing();
        }
        break;

      case "change-dispensed":
        // 거스름돈 출금 완료
        paymentState.value = "success";
        break;

      case "error":
        // 에러 발생
        paymentState.value = "error";
        errorMessage.value = data.message;
        break;
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    paymentState.value = "error";
    errorMessage.value = "입출금기 연결 오류";
  };

  // 2. 자동 복귀 타이머
  if (autoReturnEnabled.value) {
    autoReturnInterval = setInterval(() => {
      autoReturnCountdown.value--;
      if (autoReturnCountdown.value <= 0) {
        cancel();
      }
    }, 1000);
  }
});

onUnmounted(() => {
  if (ws) {
    ws.close();
  }
  if (autoReturnInterval) {
    clearInterval(autoReturnInterval);
  }
});

// 거스름돈 출금 요청
async function requestChangeDispensing() {
  try {
    const response = await cashMachineAPI.dispenseChange({
      changeAmount: changeAmount.value,
    });

    if (!response.success) {
      paymentState.value = "error";
      errorMessage.value = response.errorMessage || "거스름돈 출금 실패";
    }
  } catch (error) {
    paymentState.value = "error";
    errorMessage.value = "통신 오류: " + error.message;
  }
}

// 현금영수증 발급
function issueCashReceipt() {
  showCashReceiptModal.value = true;
}

// 현금영수증 확인
async function confirmCashReceipt(taxGubun, taxNumber) {
  showCashReceiptModal.value = false;

  try {
    const response = await cashMachineAPI.issueCashReceipt({
      taxGubun: taxGubun, // '1'=소득공제, '2'=지출증빙
      taxNumber: taxNumber, // 전화번호 또는 사업자번호
      amount: totalAmount.value,
      jeonPyo: paymentStore.jeonPyo,
    });

    if (response.success) {
      alert(`현금영수증 발급 완료\n승인번호: ${response.approvalNo}`);

      // Store 업데이트
      paymentStore.setCashReceiptInfo(response);

      // 영수증 출력
      completePayment();
    } else {
      alert("현금영수증 발급 실패: " + response.errorMessage);
    }
  } catch (error) {
    alert("통신 오류: " + error.message);
  }
}

// 현금영수증 모달 닫기
function closeCashReceiptModal() {
  showCashReceiptModal.value = false;
}

// 결제 완료
async function completePayment() {
  // 영수증 출력
  await cashMachineAPI.printReceipt({
    type: "cash-receipt",
    data: {
      totalAmount: totalAmount.value,
      insertedAmount: insertedAmount.value,
      changeAmount: changeAmount.value,
      jeonPyo: paymentStore.jeonPyo,
    },
  });

  router.push("/receipt");
}

// 재시도
function retry() {
  paymentState.value = "waiting-cash";
  insertedAmount.value = 0;
  errorMessage.value = "";
  cashWaitTimeout.value = 60;
  autoReturnCountdown.value = 30;

  // WebSocket 재연결
  if (ws) {
    ws.close();
  }
  onMounted();
}

// 취소
function cancel() {
  if (ws) {
    ws.send(
      JSON.stringify({
        command: "cancel-deposit",
      }),
    );
    ws.close();
  }
  router.push("/payment/selection");
}

// 통화 포맷
function formatCurrency(amount) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}
</script>

<style scoped>
/* 스타일 생략 */
</style>
```

### 7.2 백엔드 API (Node.js + Express)

```javascript
// routes/cashMachine.js
import express from "express";
import { SerialPort } from "serialport";
import { WebSocketServer } from "ws";

const router = express.Router();

// 입출금기 시리얼 포트 연결
const cashMachine = new SerialPort({
  path: "/dev/ttyUSB0", // Linux (Windows는 COM3 등)
  baudRate: 19200,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
});

// WebSocket 서버 (실시간 통신)
const wss = new WebSocketServer({ port: 8080, path: "/cash-machine" });

wss.on("connection", (ws) => {
  console.log("Cash machine WebSocket connected");

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    switch (data.command) {
      case "start-deposit":
        // 입금 시작 명령 전송
        cashMachine.write(Buffer.from([0x02, 0x02, 0x41, 0x01, 0x03, 0x47]));

        // 입금 상태 폴링 시작
        startDepositPolling(ws);
        break;

      case "cancel-deposit":
        // 입금 취소
        cashMachine.write(Buffer.from([0x02, 0x01, 0x40, 0x03, 0x44]));
        stopDepositPolling();
        break;
    }
  });
});

// 입금 상태 폴링
let depositInterval = null;

function startDepositPolling(ws) {
  depositInterval = setInterval(() => {
    // 입출금기로부터 상태 읽기
    cashMachine.once("data", (data) => {
      // 데이터 파싱
      const insertedAmount = parseInsertedAmount(data);
      const errorCode = parseErrorCode(data);

      if (errorCode !== 0) {
        // 에러 발생
        ws.send(
          JSON.stringify({
            event: "error",
            message: getErrorMessage(errorCode),
          }),
        );
        stopDepositPolling();
      } else {
        // 입금 금액 전송
        ws.send(
          JSON.stringify({
            event: "cash-inserted",
            insertedAmount: insertedAmount,
          }),
        );
      }
    });

    // 상태 조회 명령 전송
    cashMachine.write(Buffer.from([0x02, 0x02, 0x41, 0x01, 0x03, 0x47]));
  }, 500); // 0.5초마다 폴링
}

function stopDepositPolling() {
  if (depositInterval) {
    clearInterval(depositInterval);
    depositInterval = null;
  }
}

// 데이터 파싱 함수들
function parseInsertedAmount(data) {
  // Byte 0~1: 투입 금액 (High, Low)
  const high = data[0];
  const low = data[1];
  return ((high << 8) | low) * 100; // 100원 단위
}

function parseErrorCode(data) {
  // Byte 16: 에러 플래그
  return data[16];
}

function getErrorMessage(errorCode) {
  const bit0 = errorCode & 0x01; // 센서 이상
  const bit1 = errorCode & 0x02; // 모터 이상
  const bit2 = errorCode & 0x04; // 지폐 이상
  const bit6 = errorCode & 0x40; // 동전1호기 이상
  const bit7 = errorCode & 0x80; // 동전2호기 이상

  if (bit0) return "센서 오류";
  if (bit1) return "모터 오류";
  if (bit2) return "지폐 걸림";
  if (bit6) return "동전1호기 오류";
  if (bit7) return "동전2호기 오류";

  return "알 수 없는 오류";
}

// 거스름돈 출금
router.post("/dispense-change", async (req, res) => {
  const { changeAmount } = req.body;

  try {
    // 거스름돈 계산
    const bills = calculateChange(changeAmount);

    // 출금 명령 전송
    const command = buildDispenseCommand(bills);
    cashMachine.write(command);

    // 출금 완료 대기
    await waitForDispenseComplete();

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      errorMessage: error.message,
    });
  }
});

// 거스름돈 계산
function calculateChange(amount) {
  const bills = {
    b50000: Math.floor(amount / 50000),
    b10000: Math.floor((amount % 50000) / 10000),
    b5000: Math.floor((amount % 10000) / 5000),
    b1000: Math.floor((amount % 5000) / 1000),
    c500: Math.floor((amount % 1000) / 500),
    c100: Math.floor((amount % 500) / 100),
  };

  return bills;
}

// 출금 명령 생성
function buildDispenseCommand(bills) {
  // 프로토콜에 맞게 명령 생성 (입출금기 제조사별 상이)
  const command = Buffer.alloc(20);
  command[0] = 0x02; // STX
  command[1] = 0x10; // LEN
  command[2] = 0x42; // CMD (출금)
  command[3] = bills.b50000; // 5만원
  command[4] = bills.b10000; // 1만원
  command[5] = bills.b5000; // 5천원
  command[6] = bills.b1000; // 1천원
  command[7] = bills.c500; // 500원
  command[8] = bills.c100; // 100원
  command[19] = 0x03; // ETX

  // 체크섬 계산 (XOR)
  let checksum = 0;
  for (let i = 1; i < 19; i++) {
    checksum ^= command[i];
  }
  command[18] = checksum;

  return command;
}

// 출금 완료 대기
function waitForDispenseComplete() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("출금 타임아웃"));
    }, 30000); // 30초

    cashMachine.once("data", (data) => {
      clearTimeout(timeout);

      // 출금 완료 확인
      if (data[2] === 0x00) {
        resolve();
      } else {
        reject(new Error("출금 실패"));
      }
    });
  });
}

// 현금영수증 발급
router.post("/issue-cash-receipt", async (req, res) => {
  const { taxGubun, taxNumber, amount, jeonPyo } = req.body;

  try {
    // VAN사 API 호출 (예: KICC)
    const result = await kiccService.issueCashReceipt({
      taxGubun,
      taxNumber,
      amount,
      jeonPyo,
    });

    res.json({
      success: true,
      approvalNo: result.approvalNo,
      approvalDate: result.approvalDate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      errorMessage: error.message,
    });
  }
});

export default router;
```

---

## 8. 결론

Frm_SelfCash.frm은 POSON POS 키오스크의 현금 결제 화면을 담당하는 핵심 Form입니다.

**주요 특징**:

1. **지폐/동전 입출금기 연동**: RS-232 시리얼 통신
2. **거스름돈 자동 계산**: 투입금액 - 총금액
3. **현금영수증 발급**: VAN사 API 연동
4. **에러 처리**: 센서 이상, 지폐 걸림, 거스름돈 부족 등
5. **자동 화면 복귀**: 30초 타이머

**마이그레이션 권장사항**:

- WebSocket으로 입출금기 실시간 통신
- Vue 3 Composition API로 재작성
- Node.js + SerialPort 라이브러리로 백엔드 구현
- 에러 처리 강화 (Retry 로직, 관리자 알림)

**다음 분석 파일**: 없음 (완료)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
