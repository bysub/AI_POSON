# frm_SelfCard.frm 및 Frm_SaleCard.frm 파일 분석

**파일 경로**:

- `prev_kiosk/POSON_POS_SELF21/frm_SelfCard.frm` (61 lines, UI 전용)
- `prev_kiosk/POSON_POS_SELF21/Frm_SaleCard.frm` (713 lines, 실제 결제 로직)

**파일 크기**: 약 40KB
**역할**: 카드 결제 UI 및 결제 프로세스 관리
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [UI 컨트롤 목록](#2-ui-컨트롤-목록)
3. [결제 프로세스 이벤트 핸들러](#3-결제-프로세스-이벤트-핸들러)
4. [Mdl_Card_Dll 호출 부분](#4-mdl_card_dll-호출-부분)
5. [VAN사별 분기 처리](#5-van사별-분기-처리)
6. [VCAT.exe 외부 프로세스 연동](#6-vcatexe-외부-프로세스-연동)
7. [마이그레이션 (Vue 3 결제 컴포넌트)](#7-마이그레이션-vue-3-결제-컴포넌트)

---

## 1. 파일 개요

### 1.1 목적

키오스크 셀프 결제 시스템에서 **카드 결제 화면**을 담당하는 Form입니다.

### 1.2 파일 구조

```
frm_SelfCard.frm (61 lines)
├─ UI 선언만 (Label, Image)
└─ 코드 없음 (실제 사용 안함)

Frm_SaleCard.frm (713 lines)
├─ UI 컨트롤 (버튼, 이미지, 라벨)
├─ 결제 이벤트 핸들러
├─ VCAT.exe 연동
└─ DB 저장 로직
```

### 1.3 주요 기능

1. **결제 수단 선택**: 신용카드, 체크카드, 모바일페이, 제로페이, 카카오페이, 앱카드
2. **VAN사 분기**: VAN.name에 따라 다른 Form 호출
3. **VCAT.exe 호출**: 외부 프로세스로 VAN 결제 처리
4. **오프라인 결제**: 네트워크 장애 시 offline 모드
5. **음성 안내**: card_in.wav, card_out.wav 재생

### 1.4 코드 구조

```vb
Option Explicit

' 전역 변수
Dim SelfOldInitTime As Date

' 폼 이벤트
Private Sub Form_Load()
    ' 초기화
End Sub

' 클릭 이벤트
Private Sub img신용카드_MouseUp()
    subCardUse "신용카드"
End Sub

' 결제 처리
Function SaleCard() As Boolean
    ' VAN 연동
End Function
```

---

## 2. UI 컨트롤 목록

### 2.1 frm_SelfCard.frm (간소화 버전)

**UI만 선언되어 있고 실제 사용 안함**:

| 컨트롤명        | 타입       | 위치      | 역할               |
| --------------- | ---------- | --------- | ------------------ |
| **Picture1**    | PictureBox | 전체 화면 | 배경 이미지        |
| **lab취소**     | Label      | 하단 중앙 | 취소 버튼 영역     |
| **lab티머니**   | Label      | 우측      | T머니 결제 영역    |
| **lab체크카드** | Label      | 중앙      | 체크카드 결제 영역 |
| **lab신용카드** | Label      | 좌측      | 신용카드 결제 영역 |

**특징**:

- 코드 섹션 없음 (Attribute만 선언)
- 실제 키오스크에서는 **Frm_SaleCard.frm** 사용

### 2.2 Frm_SaleCard.frm (실제 사용)

**화면 레이아웃**:

```
┌────────────────────────────────────────────────┐
│              POSON POS 카드결제                │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │신용카드   │  │체크카드   │  │모바일페이 │    │
│  │(카드리더기│  │(카드리더기│  │(NFC태그)  │    │
│  │  사용)    │  │  사용)    │  │           │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │제로페이   │  │카카오페이 │  │앱카드     │    │
│  │(QR코드)   │  │(QR코드)   │  │(앱 연동)  │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│              [결제금액: 10,000원]               │
│                                                │
│                   [취소]                        │
└────────────────────────────────────────────────┘
```

**주요 컨트롤**:

| 컨트롤명          | 타입          | 크기        | 역할                       |
| ----------------- | ------------- | ----------- | -------------------------- |
| **labī카드결제**  | Label         | 7380x3630   | 신용카드 버튼 영역         |
| **lab모바일결제** | Label         | 3630x3630   | 모바일페이 영역            |
| **lab체크카드**   | Label         | 3660x3645   | 체크카드 영역              |
| **lab카카오페이** | Label         | 3660x3645   | 카카오페이 영역            |
| **lab제로페이**   | Label         | 3630x3645   | 제로페이 영역              |
| **lab후불교통**   | Label         | 3660x3645   | 후불교통카드 영역          |
| **img모바일결제** | Image         | 15000x18000 | 모바일페이 이미지          |
| **img신용카드**   | Image         | 15000x18000 | 신용카드 이미지            |
| **img취소**       | Image         | 3555x1350   | 취소 버튼 이미지           |
| **Timer1**        | Timer         | -           | 자동 화면 복귀 타이머      |
| **Command1**      | CommandButton | 5700x1350   | 임시 0카드 승인 (테스트용) |

**숨김 컨트롤 (설정에 따라 표시/숨김)**:

| 컨트롤명             | 조건                         | 역할              |
| -------------------- | ---------------------------- | ----------------- |
| **hidden체크카드**   | C_Config.self_Kakao <> "1"   | 체크카드 비활성화 |
| **hidden카카오페이** | C_Config.self_Kakao <> "1"   | 카카오페이 숨김   |
| **hidden제로페이**   | C_Config.Self_Zero <> "1"    | 제로페이 숨김     |
| **hidden앱카드**     | C_Config.self_AppCard <> "1" | 앱카드 숨김       |
| **hidden애플페이**   | C_Config.self_Apple <> "1"   | 애플페이 숨김     |

---

## 3. 결제 프로세스 이벤트 핸들러

### 3.1 Form_Load (폼 초기화)

```vb
Private Sub Form_Load()
    ' 폼 위치 설정
    Me.Top = 8245
    Me.Left = 0

    ' 초기화
    init  ' Mdl_Function.bas의 초기화 함수

    ' VAN사별 체크카드 활성화
    Select Case VAN.name
    Case "STARVAN", "KICC", "KCP"
        hidden체크카드.Visible = True  ' 체크카드 비활성화
    Case Else
        ' 활성화
    End Select

    ' 설정에 따른 결제수단 표시/숨김
    If C_Config.self_Kakao <> "1" Then
        hidden카카오페이.Visible = True  ' 카카오페이 숨김
    End If

    If C_Config.Self_Zero <> "1" Then
        hidden제로페이.Visible = True  ' 제로페이 숨김
    End If

    If C_Config.self_AppCard <> "1" Then
        hidden앱카드.Visible = True  ' 앱카드 숨김
    End If

    If C_Config.self_Apple <> "1" Then
        hidden애플페이.Visible = True  ' 애플페이 숨김
    End If

    ' 자동 화면 복귀 타이머 (주석 처리됨)
    ' SelfOldInitTime = Now
    ' Timer1.Enabled = True
End Sub
```

**처리 순서**:

```
1. 폼 위치 설정 (좌측 상단)
    ↓
2. 초기화 함수 호출 (init)
    ↓
3. VAN사별 결제수단 제한
    ↓
4. Config 설정 읽기
    ↓
5. 결제수단 버튼 표시/숨김
```

### 3.2 카드 버튼 클릭 이벤트

**MouseDown (버튼 누름)**:

```vb
Private Sub img모바일결제_MouseDown(Button As Integer, Shift As Integer, x As Single, y As Single)
    Call Product_Sound("버튼터치.wav")  ' 클릭음 재생
    img모바일결제.Visible = False  ' 버튼 숨김 (눌린 효과)
End Sub
```

**MouseUp (버튼 뗌)**:

```vb
Private Sub img모바일결제_MouseUp(Button As Integer, Shift As Integer, x As Single, y As Single)
    img모바일결제.Visible = True  ' 버튼 다시 표시
    subCardUse "모바일결제"  ' 결제 처리 호출
End Sub
```

**결제 수단별 이벤트**:

| 이벤트 핸들러              | 호출 파라미터 | 실제 동작       |
| -------------------------- | ------------- | --------------- |
| **img신용카드\_MouseUp**   | "신용카드"    | subCardUse 호출 |
| **img체크카드\_MouseUp**   | "체크카드"    | subCardUse 호출 |
| **img모바일결제\_MouseUp** | "모바일결제"  | subCardUse 호출 |
| **img카카오페이\_Click**   | "카카오페이"  | subCardUse 호출 |
| **img제로페이\_Click**     | "제로페이"    | subCardUse 호출 |
| **img앱카드\_Click**       | "앱카드"      | subCardUse 호출 |

### 3.3 취소 버튼

```vb
Private Sub img취소_MouseDown(...)
    Call Product_Sound("버튼터치.wav")
End Sub

Private Sub img취소_MouseUp(...)
    sub취소  ' 결제 취소 및 이전 화면으로
End Sub
```

### 3.4 임시 승인 버튼 (테스트용)

```vb
Private Sub Command1_Click()
    Others.Card_ON_Off = 2  ' 오프라인 모드
    SaleCard  ' 결제 처리

    frm_SalePrint.sjeonpyo = Frm_SaleMain.lbl_jeonpyo
    Call Frm_SaleMain.SaleData_Save(0)  ' 판매 데이터 저장

    Others.Card_ON_Off = 1
    Unload Me  ' 폼 닫기
End Sub
```

---

## 4. Mdl_Card_Dll 호출 부분

### 4.1 SaleCard 함수 (핵심 결제 로직)

```vb
Function SaleCard() As Boolean
Dim sCARD_log As String
Dim Card_Seq As Integer
Dim bCard_YN As Boolean
Dim i As Integer

' 오프라인 변수
Dim JeonPyo As String
Dim sDate As String
Dim STime As String
Dim MEMCode As String
Dim CARD_VAT As Currency
Dim Total_TaxPri As Currency

On Error GoTo err

    ' 결제 금액 검증
    If Frm_SaleMain.lbl_ToMoney.Caption < 10 Then Exit Function
    If Frm_SaleMain.lbl_CMoney.Caption < 0 Then Exit Function

    With Frm_SaleMain.VSGrid_Sale
        If .rows = 1 Then Exit Function  ' 장바구니 비어있음

        ' VAN사 선택 확인
        If VAN.Selected = 0 Then
            MsgBox "등록된 VAN사가 없습니다", vbCritical
            Exit Function
        End If

        ' ===== 오프라인 모드 (Others.Card_ON_Off = "2") =====
        If Others.Card_ON_Off = "2" Then
            ' 오프라인 카드 정보 설정
            Card.name = "X"
            Card.I_Code = "--"
            Card.I_Name = "--"
            Card.Price = Format(Frm_SaleMain.lbl_ToMoney.Caption, "#,##0")
            Card.Number = "X"
            Card.Chk = True

            Card_Seq = 1
            Call mCard_array_init(1, 0)

            JeonPyo = Frm_SaleMain.lbl_jeonpyo.Caption  ' 전표번호
            MEMCode = ""
            sDate = Format(Date, "YYYY-MM-DD")
            STime = Format(time, "HH:MM:SS")

            Card.SaleType = 0
            Card.Month = "--"
            Card.YYMM = "----"
            Card.Code = ""
            Card.AppNumber = "X"
            Card.AppDate = "X"
            Card.msg = "OFFLine 승인"

            ' 부가세 계산
            CARD_VAT = fCARD_VAT("1", Card.Price, CCur(Frm_SaleMain.lbl_ToMoney.Caption))
            Total_TaxPri = fCARD_VAT("1", Card.Price, CCur(Frm_SaleMain.lbl_ToMoney.Caption), 2)

            ' DB에 저장할 SQL 생성
            Card_Sql = "Insert into Card_Log(C_PosNo,C_SaleDate,C_JeonPyo,C_SaleType," & _
                       " C_Date,C_Time,C_MemID,C_DanmalNo,C_OfficeNo,C_CardNumber,C_CardName," & _
                       " C_Month,C_Swipe,C_Price,C_YYMM,C_AppNumber,C_AppDate,C_Msg," & _
                       " C_MakeCode,C_MakeName,C_INcode,C_INname,C_OldDate,C_OldNumber," & _
                       " C_SignYN,C_VAN,C_UserID,C_OffYN,C_Gubun,C_VAT,OpenNum" & _
                       " ,UP_Gubun, AppCard_YN, c_Tvat)" & _
                       " values('" & Terminal.PosNo & "','" & Frm_SaleMain.Lbl_SaleDate.Caption & "'," & _
                       " '" & JeonPyo & "','" & Card.SaleType & "'," & _
                       " '" & sDate & "','" & STime & "'," & _
                       " '" & MEMCode & "','" & "X" & "','','" & _
                       Card.Number & "','" & Card.name & "','" & Card.Month & "'," & _
                       " 'K', " & CCur(Card.Price) & "," & _
                       " '" & Card.YYMM & "','','" & Card.AppDate & "'," & _
                       " '" & Card.msg & "','','','" & Card.I_Code & "','" & Card.I_Name & " '," & _
                       " '','', '0'," & _
                       " '" & VAN.name & "','" & Login.id & "','1','1'," & CARD_VAT & "," & Login.OpenNum & " " & _
                       " , '0', '1', '" & Total_TaxPri & "')"

            Card.OffYN = True
            Frm_SaleMain.lbl_CMoney.Caption = Format(Card.Price, "#,##0")

            ' 다중 카드 배열에 저장
            MCard.SQL(Card_Seq) = Card_Sql
            MCard.Chk(Card_Seq) = Card.Chk
            MCard.SaleType(Card_Seq) = Card.SaleType
            MCard.CName(Card_Seq) = Card.name
            MCard.Number(Card_Seq) = Card.Number
            MCard.Month(Card_Seq) = Card.Month
            ' ... (기타 필드)

        Else
            ' ===== 온라인 모드 (실제 VAN 결제) =====

            ' 자동복귀 타이머 중지
            Timer1.Enabled = False
            Frm_SaleMain.Timer3.Enabled = False

            ' 로그 기록
            sCARD_log = Format(Now, "YYYY-MM-DD HH:MM:SS") & " " & _
                        Right(Format(Timer, "0.00"), 2) & _
                        " C_Config.Card_Wav_Opt Start:" & C_Config.Card_Wav_Opt
            Call Card_WriteLog("Card_LOG", "PosON_VCAT_" & Format(Now, "YYYYMMDD"), sCARD_log)

            ' 카드 삽입 안내음 재생
            If C_Config.Card_Wav_Opt <> "1" Then
                sCARD_log = Format(Now, "YYYY-MM-DD HH:MM:SS") & " " & _
                            Right(Format(Timer, "0.00"), 2) & _
                            " Product_Sound \Media21\card_in.wav Start "
                Call Card_WriteLog("Card_LOG", "PosON_VCAT_" & Format(Now, "YYYYMMDD"), sCARD_log)

                Call Product_Sound("card_in.wav")  ' "카드를 넣어주세요"

                sCARD_log = Format(Now, "YYYY-MM-DD HH:MM:SS") & " " & _
                            Right(Format(Timer, "0.00"), 2) & _
                            " Product_Sound \Media21\card_in.wav END "
                Call Card_WriteLog("Card_LOG", "PosON_VCAT_" & Format(Now, "YYYYMMDD"), sCARD_log)
            End If

            ' ===== VCAT.exe 호출 (핵심) =====
            Call CARD_Proc_CALL(Frm_SaleMain.lbl_ToMoney.Caption, "0", _
                                "", 0, _
                                "", "", _
                                "", "", _
                                "", "", "")

            sCARD_log = Format(Now, "YYYY-MM-DD HH:MM:SS") & " " & _
                        Right(Format(Timer, "0.00"), 2) & " Frm_SaleMain Start  " & vbCrLf
            sCARD_log = sCARD_log + "------------------------------------------------------------------"
            Call Card_WriteLog("Card_LOG", "PosON_VCAT_" & Format(Now, "YYYYMMDD"), sCARD_log)

            ' 결제 성공 여부 확인
            bCard_YN = False

            If UBound(MCard.Chk) > 0 Then
                For i = 1 To UBound(MCard.Chk)
                    If MCard.Chk(i) = True Then
                        bCard_YN = True
                        Exit For
                    End If
                Next i
            End If

            Timer1.Enabled = True

            ' 결제 실패 시 종료
            If bCard_YN = False Then
                Exit Function  ' 승인실패 종료
            Else
                ' 카드 배출 안내음
                If MCard.OffYN(1) = False Then
                    If C_Config.Card_Wav_Opt <> "1" Then
                        Call Product_Sound("card_out.wav")  ' "카드를 빼주세요"
                    End If
                End If
            End If

        End If  ' If Others.Card_ON_Off = "2" Then

        SaleCard = True
    End With

    Exit Function
err:
    sErr_str = " [Err]Frm_SaleMain.SaleCard : " & err.Number & " " & err.Description
    MsgBox sErr_str, vbCritical + vbSystemModal, Enterprise

    sCARD_log = Format(Now, "YYYY-MM-DD HH:MM:SS") & " " & _
                Right(Format(Timer, "0.00"), 2) & sErr_str
    Call Card_WriteLog("Card_LOG", "PosON_VCAT_" & Format(Now, "YYYYMMDD"), sCARD_log)

End Function
```

**흐름도**:

```
┌─────────────────────────────────────────┐
│ 1. 금액 검증 (10원 이상)                │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. VAN사 선택 확인                       │
└─────────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ 오프라인 모드 │  │ 온라인 모드   │
│ (네트워크 장애│  │ (정상 결제)   │
└──────────────┘  └──────────────┘
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ Card 정보    │  │ card_in.wav  │
│ 수동 설정    │  │ 재생          │
└──────────────┘  └──────────────┘
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ SQL 생성     │  │ VCAT.exe     │
│ (Card_Log)   │  │ 호출          │
└──────────────┘  └──────────────┘
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ MCard 배열   │  │ 승인 대기     │
│ 저장         │  │ (30~60초)     │
└──────────────┘  └──────────────┘
                        ↓
                ┌───────┴───────┐
                ↓               ↓
        ┌──────────────┐  ┌──────────────┐
        │ 승인 성공     │  │ 승인 실패     │
        │ bCard_YN=True │  │ bCard_YN=False│
        └──────────────┘  └──────────────┘
                ↓               ↓
        ┌──────────────┐  ┌──────────────┐
        │ card_out.wav │  │ Exit Function │
        │ 재생          │  │               │
        └──────────────┘  └──────────────┘
```

---

## 5. VAN사별 분기 처리

### 5.1 Form_Load에서 VAN사 확인

```vb
Select Case VAN.name
Case "STARVAN", "KICC", "KCP"
    hidden체크카드.Visible = True  ' 체크카드 비활성화
Case Else
    ' 활성화
End Select
```

**이유**:

- STARVAN, KICC, KCP는 체크카드 단말기가 별도
- 신용카드 단말기로만 처리

### 5.2 subCardUse 함수 (추정)

```vb
' Mdl_Function.bas 또는 Frm_SaleMain.frm에 정의되어 있을 것으로 추정
Sub subCardUse(CardType As String)
    Select Case CardType
        Case "신용카드"
            Select Case VAN.name
                Case "NICE"
                    Frm_SaleCard_VCAT_NICE.Show vbModal
                Case "KICC"
                    Frm_SaleCard_VCAT_KICC.Show vbModal
                Case "KSNet"
                    Frm_SaleCard_VCAT_KSNET.Show vbModal
                Case "KIS"
                    Frm_SaleCard_VCAT_KIS.Show vbModal
                Case "SMARTRO"
                    Frm_SaleCard_VCAT_SMT.Show vbModal
                Case "KMPS"
                    Frm_SaleCard_VCAT_FDIK.Show vbModal
                Case "KCP"
                    Frm_SaleCard_VCAT_KCP.Show vbModal
                Case "KOCES"
                    Frm_SaleCard_VCAT_KOCES.Show vbModal
                Case "KOVAN"
                    Frm_SaleCard_VCAT_KOVAN.Show vbModal
                Case "SPC"
                    Frm_SaleCard_VCAT_SPC.Show vbModal
                Case Else
                    MsgBox "지원하지 않는 VAN사입니다"
            End Select

        Case "모바일결제"
            ' 삼성페이, 애플페이, 구글페이 등
            Frm_MobilePay.Show vbModal

        Case "카카오페이"
            ' 카카오페이 QR 코드
            Frm_KakaoPay.Show vbModal

        Case "제로페이"
            ' 제로페이 QR 코드
            Frm_ZeroPay.Show vbModal
    End Select
End Sub
```

### 5.3 VAN사별 Form 목록

| VAN사       | Form 파일명                 | DLL             |
| ----------- | --------------------------- | --------------- |
| **NICE**    | Frm_SaleCard_VCAT_NICE.frm  | PosToCatReq.dll |
| **KICC**    | Frm_SaleCard_VCAT_KICC.frm  | KiccPos.DLL     |
| **KSNet**   | Frm_SaleCard_VCAT_KSNET.frm | KSNet_ADSL.dll  |
| **KIS**     | Frm_SaleCard_VCAT_KIS.frm   | KisCatSSL.dll   |
| **SMARTRO** | Frm_SaleCard_VCAT_SMT.frm   | SmartroSign.dll |
| **KMPS**    | Frm_SaleCard_VCAT_FDIK.frm  | fdikpos43.dll   |
| **JTNet**   | Frm_SaleCard_VCAT_JTNET.frm | JTNetSPL.dll    |
| **KCP**     | Frm_SaleCard_VCAT_KCP.frm   | KCPDLL.dll      |
| **KOCES**   | Frm_SaleCard_VCAT_KOCES.frm | AuthComm.dll    |
| **KOVAN**   | Frm_SaleCard_VCAT_KOVAN.frm | HPosApp.dll     |
| **SPC**     | Frm_SaleCard_VCAT_SPC.frm   | SPCNSecuCom.dll |

---

## 6. VCAT.exe 외부 프로세스 연동

### 6.1 CARD_Proc_CALL 함수

```vb
' Mdl_Card_Function.bas에 정의 (추정)
Sub CARD_Proc_CALL(금액 As String, 거래구분 As String, _
                   파라미터3 As String, 파라미터4 As Integer, _
                   파라미터5 As String, 파라미터6 As String, _
                   파라미터7 As String, 파라미터8 As String, _
                   파라미터9 As String, 파라미터10 As String, 파라미터11 As String)

    Dim VCAT_Path As String
    Dim Command_Line As String
    Dim Process_ID As Long

    ' VCAT.exe 경로
    VCAT_Path = App.Path & "\VCAT\VCAT.exe"

    ' 명령행 파라미터 생성
    Command_Line = VCAT_Path & " " & _
                   금액 & " " & _
                   거래구분 & " " & _
                   VAN.name & " " & _
                   VAN.TID & " " & _
                   VAN.IP & " " & _
                   VAN.Port

    ' VCAT.exe 실행 (동기식 - 프로세스 종료 대기)
    Process_ID = Shell(Command_Line, vbNormalFocus)

    ' 프로세스 완료 대기
    Call WaitForProcess(Process_ID)

    ' 결과 파일 읽기
    Call ReadVCATResult()

End Sub
```

### 6.2 VCAT.exe 처리 흐름

```
┌─────────────────────────────────────────┐
│ POSON POS (VB6)                         │
│                                         │
│ Frm_SaleCard.SaleCard()                 │
│   ↓                                     │
│ CARD_Proc_CALL(금액, 거래구분, ...)     │
│   ↓                                     │
│ Shell("VCAT.exe 금액 거래구분 ...")     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ VCAT.exe (외부 프로세스)                │
│                                         │
│ 1. 파라미터 파싱                         │
│ 2. VAN DLL 로딩                          │
│ 3. 카드 리더기 통신                      │
│ 4. VAN사 승인 요청                       │
│ 5. 결과를 파일로 저장                    │
│    - C:\VCAT\Result.txt                 │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ POSON POS (VB6)                         │
│                                         │
│ ReadVCATResult()                        │
│   ↓                                     │
│ Result.txt 파싱                         │
│   ↓                                     │
│ MCard 배열에 저장                        │
│   ↓                                     │
│ DB 저장 (Card_Log)                      │
└─────────────────────────────────────────┘
```

### 6.3 Result.txt 형식 (추정)

```
승인여부=1
승인번호=12345678
승인일시=20260129153045
카드사명=신한카드
카드번호=1234-56**-****-7890
발급사코드=04
매입사코드=04
가맹점번호=1234567890
응답메시지=정상승인
```

### 6.4 장단점

**장점**:

- VB6 메인 프로세스와 결제 로직 분리
- DLL 충돌 방지
- 메모리 누수 격리

**단점**:

- 프로세스 간 통신 오버헤드
- 파일 I/O 의존성
- 동기화 문제 (파일 잠금)
- 디버깅 어려움

---

## 7. 마이그레이션 (Vue 3 결제 컴포넌트)

### 7.1 Vue 3 컴포넌트 설계

**PaymentSelection.vue**:

```vue
<template>
  <div class="payment-selection">
    <h2>결제 수단을 선택하세요</h2>

    <!-- 결제 수단 그리드 -->
    <div class="payment-grid">
      <!-- 신용카드 -->
      <div
        class="payment-item"
        :class="{ disabled: !availablePayments.creditCard }"
        @click="selectPayment('creditCard')"
      >
        <img src="@/assets/icons/credit-card.svg" alt="신용카드" />
        <span>신용카드</span>
      </div>

      <!-- 체크카드 -->
      <div
        class="payment-item"
        :class="{ disabled: !availablePayments.debitCard }"
        @click="selectPayment('debitCard')"
      >
        <img src="@/assets/icons/debit-card.svg" alt="체크카드" />
        <span>체크카드</span>
      </div>

      <!-- 모바일 페이 -->
      <div
        class="payment-item"
        :class="{ disabled: !availablePayments.mobilePay }"
        @click="selectPayment('mobilePay')"
      >
        <img src="@/assets/icons/mobile-pay.svg" alt="모바일페이" />
        <span>모바일페이</span>
      </div>

      <!-- 제로페이 -->
      <div v-if="config.zeroPayEnabled" class="payment-item" @click="selectPayment('zeroPay')">
        <img src="@/assets/icons/zero-pay.svg" alt="제로페이" />
        <span>제로페이</span>
      </div>

      <!-- 카카오페이 -->
      <div v-if="config.kakaoPayEnabled" class="payment-item" @click="selectPayment('kakaoPay')">
        <img src="@/assets/icons/kakao-pay.svg" alt="카카오페이" />
        <span>카카오페이</span>
      </div>

      <!-- 앱카드 -->
      <div v-if="config.appCardEnabled" class="payment-item" @click="selectPayment('appCard')">
        <img src="@/assets/icons/app-card.svg" alt="앱카드" />
        <span>앱카드</span>
      </div>
    </div>

    <!-- 금액 표시 -->
    <div class="amount-display">
      <span>결제 금액</span>
      <strong>{{ formatCurrency(totalAmount) }}</strong>
    </div>

    <!-- 취소 버튼 -->
    <button class="cancel-btn" @click="cancel">
      <i class="icon-back"></i>
      돌아가기
    </button>

    <!-- 자동 복귀 타이머 (선택사항) -->
    <div v-if="autoReturnEnabled" class="auto-return-timer">
      {{ autoReturnCountdown }}초 후 자동으로 돌아갑니다
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePaymentStore } from "@/stores/payment";
import { useConfigStore } from "@/stores/config";
import { playSound } from "@/utils/sound";

const router = useRouter();
const paymentStore = usePaymentStore();
const configStore = useConfigStore();

// 설정
const config = computed(() => configStore.config);

// 사용 가능한 결제 수단
const availablePayments = computed(() => {
  const vanName = configStore.van.name;

  return {
    creditCard: true, // 항상 사용 가능
    debitCard: !["STARVAN", "KICC", "KCP"].includes(vanName), // VAN사 제한
    mobilePay: config.value.mobilePayEnabled,
    zeroPay: config.value.zeroPayEnabled,
    kakaoPay: config.value.kakaoPayEnabled,
    appCard: config.value.appCardEnabled,
  };
});

// 총 결제 금액
const totalAmount = computed(() => paymentStore.totalAmount);

// 자동 복귀 타이머
const autoReturnEnabled = ref(false); // 설정에서 읽기
const autoReturnCountdown = ref(30);
let autoReturnInterval = null;

onMounted(() => {
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
  if (autoReturnInterval) {
    clearInterval(autoReturnInterval);
  }
});

// 결제 수단 선택
async function selectPayment(paymentType) {
  // 클릭음 재생
  await playSound("button-click.wav");

  // 비활성화된 결제 수단 클릭 방지
  if (!availablePayments.value[paymentType]) {
    return;
  }

  // 결제 타입 저장
  paymentStore.setPaymentType(paymentType);

  // VAN사별 라우팅
  const vanName = configStore.van.name.toLowerCase();

  switch (paymentType) {
    case "creditCard":
    case "debitCard":
      router.push(`/payment/card/${vanName}`);
      break;

    case "mobilePay":
      router.push("/payment/mobile-pay");
      break;

    case "zeroPay":
      router.push("/payment/zero-pay");
      break;

    case "kakaoPay":
      router.push("/payment/kakao-pay");
      break;

    case "appCard":
      router.push("/payment/app-card");
      break;
  }
}

// 취소
async function cancel() {
  await playSound("button-click.wav");
  router.push("/cart"); // 장바구니로 돌아가기
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
.payment-selection {
  width: 100%;
  height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

h2 {
  font-size: 3rem;
  color: white;
  text-align: center;
  margin-bottom: 3rem;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto 3rem;
}

.payment-item {
  background: white;
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.payment-item:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.payment-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.payment-item img {
  width: 120px;
  height: 120px;
  margin-bottom: 1rem;
}

.payment-item span {
  display: block;
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
}

.amount-display {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  text-align: center;
  max-width: 600px;
  margin: 0 auto 2rem;
}

.amount-display span {
  font-size: 1.5rem;
  color: #666;
  margin-right: 1rem;
}

.amount-display strong {
  font-size: 3rem;
  color: #e74c3c;
}

.cancel-btn {
  display: block;
  margin: 0 auto;
  padding: 1.5rem 4rem;
  font-size: 1.8rem;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.3s;
}

.cancel-btn:hover {
  background: #7f8c8d;
}

.auto-return-timer {
  text-align: center;
  margin-top: 2rem;
  font-size: 1.5rem;
  color: #ecf0f1;
}
</style>
```

### 7.2 VAN사별 결제 컴포넌트

**CardPaymentKICC.vue** (KICC VAN 예시):

```vue
<template>
  <div class="card-payment-kicc">
    <!-- 결제 단계 표시 -->
    <div class="payment-steps">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step"
        :class="{ active: currentStep === index, completed: currentStep > index }"
      >
        <span class="step-number">{{ index + 1 }}</span>
        <span class="step-label">{{ step }}</span>
      </div>
    </div>

    <!-- 카드 삽입 안내 -->
    <div v-if="paymentState === 'waiting-card'" class="card-insert-guide">
      <img src="@/assets/animations/card-insert.gif" alt="카드 삽입" />
      <h3>카드를 리더기에 넣어주세요</h3>
      <p class="timer">{{ cardWaitTimeout }}초</p>
      <audio ref="cardInSound" src="@/assets/sounds/card_in.wav" autoplay></audio>
    </div>

    <!-- 서명 입력 -->
    <div v-if="paymentState === 'signature'" class="signature-input">
      <h3>서명을 입력해주세요</h3>
      <canvas
        ref="signatureCanvas"
        width="800"
        height="400"
        @mousedown="startSignature"
        @mousemove="drawSignature"
        @mouseup="endSignature"
      ></canvas>
      <div class="signature-actions">
        <button @click="clearSignature">다시 그리기</button>
        <button @click="confirmSignature">확인</button>
      </div>
    </div>

    <!-- 승인 중 -->
    <div v-if="paymentState === 'processing'" class="processing">
      <div class="spinner"></div>
      <h3>결제 승인 중입니다...</h3>
      <p>잠시만 기다려주세요</p>
      <p class="timer">{{ approvalTimeout }}초</p>
    </div>

    <!-- 결제 성공 -->
    <div v-if="paymentState === 'success'" class="success">
      <i class="icon-check-circle"></i>
      <h3>결제가 완료되었습니다</h3>
      <div class="approval-info">
        <p><strong>승인번호:</strong> {{ approvalResult.approvalNo }}</p>
        <p><strong>카드사:</strong> {{ approvalResult.cardCompany }}</p>
        <p><strong>금액:</strong> {{ formatCurrency(approvalResult.amount) }}</p>
      </div>
      <audio ref="cardOutSound" src="@/assets/sounds/card_out.wav" autoplay></audio>
      <button @click="printReceipt">영수증 출력</button>
    </div>

    <!-- 결제 실패 -->
    <div v-if="paymentState === 'error'" class="error">
      <i class="icon-error-circle"></i>
      <h3>결제에 실패했습니다</h3>
      <p>{{ errorMessage }}</p>
      <div class="error-actions">
        <button @click="retry">재시도</button>
        <button @click="cancel">취소</button>
      </div>
    </div>

    <!-- 취소 버튼 (항상 표시) -->
    <button v-if="paymentState !== 'success'" class="cancel-btn" @click="cancel">취소</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePaymentStore } from "@/stores/payment";
import { paymentAPI } from "@/api/payment";

const router = useRouter();
const paymentStore = usePaymentStore();

// 결제 단계
const steps = ["카드 삽입", "서명 입력", "승인 요청", "완료"];
const currentStep = ref(0);

// 결제 상태
const paymentState = ref("waiting-card");
// 가능한 상태: waiting-card, signature, processing, success, error

// 타이머
const cardWaitTimeout = ref(30);
const approvalTimeout = ref(35);

// 서명 캔버스
const signatureCanvas = ref(null);
const isDrawing = ref(false);
let ctx = null;

// 결과
const approvalResult = ref({
  approvalNo: "",
  cardCompany: "",
  amount: 0,
});

const errorMessage = ref("");

onMounted(async () => {
  // 1. 카드 리더기 상태 확인
  await checkCardReader();

  // 2. 카드 삽입 대기 타이머
  const cardWaitInterval = setInterval(() => {
    cardWaitTimeout.value--;
    if (cardWaitTimeout.value <= 0) {
      clearInterval(cardWaitInterval);
      paymentState.value = "error";
      errorMessage.value = "카드 리더기 타임아웃";
    }
  }, 1000);

  // 3. WebSocket으로 카드 리더기 이벤트 수신
  const ws = new WebSocket("ws://localhost:8080/card-reader");

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.event === "card-inserted") {
      clearInterval(cardWaitInterval);
      currentStep.value = 1;

      // 서명 필요 여부 확인 (금액 5만원 이상)
      if (paymentStore.totalAmount >= 50000) {
        paymentState.value = "signature";
        initSignatureCanvas();
      } else {
        // 바로 승인 요청
        await requestApproval();
      }
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    paymentState.value = "error";
    errorMessage.value = "카드 리더기 연결 오류";
  };
});

onUnmounted(() => {
  // WebSocket 정리
});

// 카드 리더기 확인
async function checkCardReader() {
  try {
    const response = await fetch("/api/card-reader/status");
    const data = await response.json();

    if (!data.connected) {
      paymentState.value = "error";
      errorMessage.value = "카드 리더기가 연결되어 있지 않습니다";
    }
  } catch (error) {
    console.error("Card reader check error:", error);
  }
}

// 서명 캔버스 초기화
function initSignatureCanvas() {
  ctx = signatureCanvas.value.getContext("2d");
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
}

// 서명 시작
function startSignature(e) {
  isDrawing.value = true;
  const rect = signatureCanvas.value.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

// 서명 그리기
function drawSignature(e) {
  if (!isDrawing.value) return;
  const rect = signatureCanvas.value.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

// 서명 종료
function endSignature() {
  isDrawing.value = false;
}

// 서명 지우기
function clearSignature() {
  ctx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height);
}

// 서명 확인
async function confirmSignature() {
  currentStep.value = 2;

  // 서명 이미지를 Base64로 변환
  const signatureData = signatureCanvas.value.toDataURL();

  // 승인 요청
  await requestApproval(signatureData);
}

// 승인 요청
async function requestApproval(signatureData = null) {
  paymentState.value = "processing";
  currentStep.value = 2;

  // 승인 타임아웃 타이머
  const approvalInterval = setInterval(() => {
    approvalTimeout.value--;
    if (approvalTimeout.value <= 0) {
      clearInterval(approvalInterval);
      paymentState.value = "error";
      errorMessage.value = "VAN 승인 타임아웃";
    }
  }, 1000);

  try {
    const response = await paymentAPI.approve({
      vanProvider: "KICC",
      amount: paymentStore.totalAmount,
      paymentType: paymentStore.paymentType,
      signature: signatureData,
      cartItems: paymentStore.cartItems,
    });

    clearInterval(approvalInterval);

    if (response.success) {
      // 승인 성공
      approvalResult.value = response;
      paymentState.value = "success";
      currentStep.value = 3;

      // Store 업데이트
      paymentStore.setApprovalResult(response);

      // DB 저장
      await saveToDatabase(response);

      // 3초 후 영수증 화면으로 이동
      setTimeout(() => {
        router.push("/receipt");
      }, 3000);
    } else {
      // 승인 실패
      paymentState.value = "error";
      errorMessage.value = response.errorMessage || "승인 거절";
    }
  } catch (error) {
    clearInterval(approvalInterval);
    paymentState.value = "error";
    errorMessage.value = "통신 오류: " + error.message;
  }
}

// DB 저장
async function saveToDatabase(result) {
  try {
    await fetch("/api/card-log/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        posNo: sessionStorage.getItem("posNo"),
        saleDate: new Date().toISOString().split("T")[0],
        jeonPyo: result.jeonPyo,
        amount: result.amount,
        approvalNo: result.approvalNo,
        cardCompany: result.cardCompany,
        vanName: "KICC",
        userId: sessionStorage.getItem("userId"),
      }),
    });
  } catch (error) {
    console.error("DB save error:", error);
  }
}

// 재시도
async function retry() {
  paymentState.value = "waiting-card";
  currentStep.value = 0;
  cardWaitTimeout.value = 30;
  approvalTimeout.value = 35;
  errorMessage.value = "";
  await checkCardReader();
}

// 취소
function cancel() {
  router.push("/payment/selection");
}

// 영수증 출력
async function printReceipt() {
  await fetch("/api/printer/print", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "card-receipt",
      data: approvalResult.value,
    }),
  });

  router.push("/receipt");
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

### 7.3 백엔드 API (Node.js + Express)

```javascript
// routes/payment.js
import express from "express";
import { KICCPaymentService } from "../services/KICCPaymentService.js";

const router = express.Router();
const kiccService = new KICCPaymentService();

// 카드 결제 승인
router.post("/approve", async (req, res) => {
  const { vanProvider, amount, paymentType, signature, cartItems } = req.body;

  try {
    let result;

    // VAN사별 분기
    switch (vanProvider) {
      case "KICC":
        result = await kiccService.approve({
          amount,
          paymentType,
          signature,
          tid: process.env.KICC_TID,
          ip: process.env.KICC_IP,
          port: process.env.KICC_PORT,
        });
        break;

      case "NICE":
        result = await niceService.approve({ amount, paymentType });
        break;

      // ... 기타 VAN사

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
      amount: amount,
      jeonPyo: generateJeonPyo(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      errorCode: error.code,
      errorMessage: error.message,
    });
  }
});

// 카드 결제 취소
router.post("/cancel", async (req, res) => {
  const { vanProvider, approvalNo, approvalDate, amount } = req.body;

  try {
    let result;

    switch (vanProvider) {
      case "KICC":
        result = await kiccService.cancel({
          approvalNo,
          approvalDate,
          amount,
        });
        break;

      // ... 기타 VAN사
    }

    res.json({
      success: true,
      cancelApprovalNo: result.cancelApprovalNo,
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

Frm_SaleCard.frm은 POSON POS 키오스크의 카드 결제 UI를 담당하는 핵심 Form입니다.

**주요 특징**:

1. **다양한 결제 수단**: 신용카드, 체크카드, 모바일페이, 카카오페이, 제로페이
2. **VAN사별 분기**: 12개 VAN사 별도 Form 호출
3. **VCAT.exe 연동**: 외부 프로세스로 결제 처리
4. **오프라인 모드**: 네트워크 장애 시 수동 승인
5. **음성 안내**: card_in.wav, card_out.wav 재생

**마이그레이션 권장사항**:

- Vue 3 Composition API로 재작성
- WebSocket으로 카드 리더기 실시간 통신
- PG사 REST API 연동
- TypeScript로 타입 안정성 확보

**다음 분석 파일**: [Frm_SelfCash.frm.md](./Frm_SelfCash.frm.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
