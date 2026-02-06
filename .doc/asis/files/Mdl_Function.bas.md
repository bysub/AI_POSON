# Mdl_Function.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Mdl_Function.bas`
**파일 크기**: 162KB (4,398 lines)
**역할**: 공통 유틸리티 함수 모듈
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [전역 변수 및 상수](#2-전역-변수-및-상수)
3. [함수 목록](#3-함수-목록)
4. [핵심 유틸리티 함수 상세 분석](#4-핵심-유틸리티-함수-상세-분석)
5. [함수 카테고리별 분류](#5-함수-카테고리별-분류)
6. [호출 관계 및 의존성](#6-호출-관계-및-의존성)
7. [마이그레이션 고려사항](#7-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

POSON POS 시스템의 공통 유틸리티 함수 모음으로, 파일 처리, UI 제어, 하드웨어 통신, 데이터 변환, 로깅 등 다양한 기능을 제공합니다.

### 1.2 주요 역할

- **파일 시스템**: INI 파일 읽기/쓰기, 파일 존재 확인, 로그 파일 생성
- **UI 제어**: 그리드 초기화, 컨트롤 스타일링, 메시지박스
- **하드웨어 통신**: 프린터, 스캐너, CDP, MSR, 동전 투입기 제어
- **데이터 처리**: 날짜/시간 변환, 문자열 처리, 세금 계산
- **회원/결제**: 회원가격, 포인트, 카드/현금 VAT 계산
- **외부 연동**: TIPS 서버 연결, 원격 제어, UPSS 연동

### 1.3 코드 구조

```
Mdl_Function.bas
    ↓
Option Explicit
    ↓
전역 변수/상수 (INI, Timer, USB 등)
    ↓
Windows API 선언 (kernel32.dll, user32.dll 등)
    ↓
약 60개의 Public Sub/Function
```

---

## 2. 전역 변수 및 상수

### 2.1 INI 파일 관련

```vb
Public sTemp As String * 255
Public lRet As Long

Public Declare Function WritePrivateProfileString Lib "kernel32" _
Alias "WritePrivateProfileStringA" (...)

Public Declare Function GetPrivateProfileString Lib "kernel32" _
Alias "GetPrivateProfileStringA" (...)
```

**용도**:

- Windows INI 파일 읽기/쓰기
- Config.ini 설정 관리
- Grid 컬럼 크기 저장

### 2.2 그리드 및 데이터 구조

```vb
Public sGridColFile As String    ' Grid 컬럼 숨김 정보
Public sGridFile As String       ' Grid 크기 정보
Public sGoods(5) As String       ' 상품 검색 조건
Public sBranch(7) As String      ' 분류코드 검색 조건
Public sScale_Use As String      ' 저울 사용 여부
```

### 2.3 타이머 및 USB I/O

```vb
Public lngTimerID As Long

Public Declare Function SetTimer Lib "user32" (...)
Public Declare Function KillTimer Lib "user32" (...)

' x4.45 신호등 제어 (USB I/O)
Declare Function usb_io_init Lib "uio32.dll" (...)
Declare Function usb_io_output Lib "uio32.dll" (...)
Declare Function usb_io_reset Lib "uio32.dll" (...)
```

**용도**:

- 타이머 이벤트 제어 (자동 로그아웃 등)
- USB 신호등 제어 (키오스크 상태 표시)

---

## 3. 함수 목록

### 3.1 Public 함수/프로시저 전체 목록 (알파벳/기능순)

| 번호 | 함수명                           | 반환 타입 | 주요 파라미터           | 역할                         |
| ---- | -------------------------------- | --------- | ----------------------- | ---------------------------- |
| 1    | **Button_Rounding**              | Sub       | Control_Name            | 버튼 모서리 둥글게 처리      |
| 2    | **CARD_Proc_CALL**               | Sub       | JeonPyo, CType          | 카드 결제 처리               |
| 3    | **Card_Pub_init**                | Sub       | -                       | 카드 전역변수 초기화         |
| 4    | **Card_WriteLog**                | Sub       | F_Name, SaleDate, W_Str | 카드 로그 기록               |
| 5    | **CASH_Proc_CALL**               | Sub       | JeonPyo, CType          | 현금영수증 처리              |
| 6    | **Cash_Pub_init**                | Sub       | -                       | 현금영수증 초기화            |
| 7    | **CDP_MSCOMM_Open**              | Function  | -                       | 고객 디스플레이 포트 열기    |
| 8    | **cMsgbox**                      | Function  | sTEXT, button_cnt       | 커스텀 메시지박스            |
| 9    | **Control_Close**                | Sub       | -                       | 모든 통신 포트 닫기          |
| 10   | **customer_info_rPoint_auto_yn** | Sub       | mem_code, igubun        | 적립금 자동사용 여부         |
| 11   | **Customer_Area_Gubun**          | Function  | sCUS_CODE               | 회원 지역 구분               |
| 12   | **CustomerName_Marking**         | Function  | org_name                | 회원명 마스킹 (개인정보)     |
| 13   | **Error_Log**                    | Sub       | sDate, Form_Name, ...   | 에러 로그 기록               |
| 14   | **fCARD_VAT**                    | Function  | sGubun, CPrice, TPrice  | 카드 VAT 계산                |
| 15   | **fCASH_VAT**                    | Function  | sGubun, CPrice, TPrice  | 현금영수증 VAT 계산          |
| 16   | **FileExists**                   | Sub       | INI_FilePath, FileType  | **파일 존재 확인 또는 생성** |
| 17   | **Folder_File_Delete**           | Function  | sFolder_Path            | 폴더 삭제                    |
| 18   | **Form_Rounding**                | Sub       | Form_Name               | 폼 모서리 둥글게             |
| 19   | **GOODS_LastDate_Sql**           | Function  | JeonPyo, Gubun          | 상품 최종일자 SQL 생성       |
| 20   | **Grid_Col_Hidden_Refresh**      | Sub       | VsGrid, sec_name        | 그리드 컬럼 숨김 로드        |
| 21   | **GS_Parking_Proc**              | Sub       | sType, sPri             | GS 주차 연동                 |
| 22   | **InBufferCount_Del**            | Sub       | -                       | 스캐너 버퍼 클리어           |
| 23   | **InD_Log_Seq**                  | Function  | -                       | 입고 로그 시퀀스             |
| 24   | **initLab**                      | Sub       | templab                 | 라벨 초기화                  |
| 25   | **IsNum**                        | Function  | strTemp                 | 숫자 여부 확인               |
| 26   | **Jeonpyo_SEQ_Check**            | Function  | Sale_Num                | 전표번호 9999 초과 체크      |
| 27   | **LOG_Folder_LIST**              | Function  | sType                   | 로그 폴더 정리               |
| 28   | **LowByte**                      | Function  | wParam                  | 하위 바이트 추출             |
| 29   | **Lucky_Num**                    | Function  | Sale_Date               | 행운번호 이벤트 여부         |
| 30   | **MainFrom_Unload**              | Sub       | bre_YN                  | 메인폼 종료 처리             |
| 31   | **mCard_array_init**             | Sub       | iSize, init_gubun       | 다중카드 배열 초기화         |
| 32   | **mCard_Grid_Init**              | Sub       | oForm, cGrid            | 카드 그리드 초기화           |
| 33   | **MegaLock_856E_Chk**            | Function  | E_CODE, E_Str           | 메가락 856E 체크             |
| 34   | **MegaLock_Chk**                 | Function  | E_CODE, E_Str           | 메가락 855B 체크             |
| 35   | **MEM_PointADD**                 | Function  | Sale_Date, Bir_Date     | 생일 포인트 적립             |
| 36   | **MEM_SalePrice**                | Function  | Sale_Date, P_Price, ... | 회원가격 계산                |
| 37   | **Mem_PointSum**                 | Function  | Point_P, Point_C, ...   | 회원등급별 포인트            |
| 38   | **MSR_MSCOMM_Open**              | Function  | -                       | MSR(카드리더) 포트 열기      |
| 39   | **MyIP**                         | Function  | -                       | 외부 IP 조회                 |
| 40   | **Office_Block_Check**           | Function  | -                       | 사업자번호 차단 체크         |
| 41   | **Player_Size**                  | Sub       | Cnt                     | **듀얼모니터 플레이어 크기** |
| 42   | **Point_Per**                    | Function  | Sale_Date, MEM_Point    | 포인트 추가 적립             |
| 43   | **POS_State**                    | Sub       | -                       | **POS 상태 업데이트**        |
| 44   | **POSON_UPSS_CHECK**             | Function  | sbarcode                | UPSS(회수상품) 체크          |
| 45   | **Printer_Check**                | Function  | Reg_Addr                | **프린터 상태 확인**         |
| 46   | **Product_Sound**                | Sub       | Wav_File                | **상품 스캔 음성 재생**      |
| 47   | **ps_fgInit**                    | Sub       | fgTEMP, iCNT            | VSFlexGrid 초기화            |
| 48   | **ps_SizeCboHight**              | Sub       | frm, cbo                | 콤보박스 높이 조정           |
| 49   | **ps_SizeCboWidth**              | Sub       | frm, cbo                | 콤보박스 너비 조정           |
| 50   | **Pur_Auto_Check**               | Function  | in_num                  | 자동 입고 여부               |
| 51   | **reStarting_PG**                | Sub       | PG_Name                 | 프로그램 재시작              |
| 52   | **SaleData_WriteLog**            | Sub       | F_Name, W_Str, SaleDate | 판매 로그 기록               |
| 53   | **SAT_Trnas_Seq**                | Function  | Sale_Date               | 배달 시퀀스 생성             |
| 54   | **SCAN_HandMSCOMM_Open**         | Function  | -                       | 핸드 스캐너 포트 열기        |
| 55   | **SCAN_MSCOMM_Open**             | Function  | -                       | **테이블 스캐너 포트 열기**  |
| 56   | **Seetrol_Remote_Connect**       | Sub       | -                       | 원격 지원 연결               |
| 57   | **Self_WriteLog**                | Sub       | F_Name, SaleDate, W_Str | 셀프 POS 로그                |
| 58   | **Seller_Start_Number**          | Function  | nDATE, Sel_Jeonpyo      | 판매자 시작 전표번호         |
| 59   | **ServerVersion_INIWrite**       | Sub       | Ver                     | 서버 버전 INI 기록           |
| 60   | **ShopUse_Data_Proc**            | Function  | sDate, sOpen_num        | 자가소비 데이터              |
| 61   | **SLock_Chk**                    | Function  | E_CODE, E_Str           | SLock 동글 체크              |
| 62   | **STLON**                        | Sub       | Index                   | 신호등 제어                  |
| 63   | **STLOff**                       | Sub       | -                       | 신호등 끄기                  |
| 64   | **subColSize_Set**               | Sub       | sGubun, iCol, ...       | 그리드 컬럼 크기 설정        |
| 65   | **Supyo_Proc_CALL**              | Sub       | -                       | 수표 처리                    |
| 66   | **Table_Chk**                    | Sub       | TName                   | 판매 테이블 생성 체크        |
| 67   | **Tax_VAT1**                     | Function  | Tax_Pri                 | 부가세 계산                  |
| 68   | **TAX_CCUR**                     | Function  | T_SalePri, ...          | 세금 비율 계산               |
| 69   | **TEXTBOX_SELECT_ALL**           | Sub       | txt                     | 텍스트박스 전체 선택         |
| 70   | **TimerProc**                    | Sub       | hwnd, uMsg, ...         | 타이머 콜백                  |
| 71   | **TIPS_Server_Connect**          | Sub       | Sale_Date, Open_Chk     | **TIPS 서버 연결**           |
| 72   | **total_TAX_CCUR**               | Function  | T_SalePri, ...          | 전체 세금 계산               |
| 73   | **TXT_SelectAll**                | Sub       | txt_name                | 텍스트 전체 선택             |
| 74   | **UF_RegularExText**             | Function  | sValue                  | 정규식 텍스트 변환           |
| 75   | **VAN_Init**                     | Sub       | -                       | VAN 변수 초기화              |
| 76   | **VSGRID_SizeLoad**              | Sub       | Grd, LData, sData       | **그리드 크기 로드**         |
| 77   | **VSGRID_SizeSave**              | Sub       | Grd, LData, sData       | 그리드 크기 저장             |
| 78   | **Week_Number**                  | Function  | P_Week                  | 요일 문자 → 숫자             |

---

## 4. 핵심 유틸리티 함수 상세 분석

### 4.1 FileExists (파일 존재 확인 또는 생성)

**시그니처**:

```vb
Public Sub FileExists(ByVal INI_FilePath As String, ByVal FileType As Integer)
```

**역할**:
Main.bas에서 호출되어 Config.ini 파일의 존재를 확인하고, 없으면 백업에서 복사합니다.

**파라미터**:

- `INI_FilePath`: 확인할 INI 파일 경로
- `FileType`:
  - `1` = INI 파일 (없으면 백업에서 복사)
  - `기타` = 일반 파일 (없으면 에러 메시지)

**코드 분석**:

```vb
Public Sub FileExists(ByVal INI_FilePath As String, ByVal FileType As Integer)
On Error GoTo err

    Set FS = CreateObject("Scripting.FileSystemObject")

    If FS.FileExists(INI_FilePath) = False Then
        If FileType = 1 Then
            ' INI 백업에서 복사
            FS.CopyFile App.Path & "\INI_BackUP\Pos_Config.INI", App.Path & "\"
        Else
            MsgBox INI_FilePath & " 경로에 파일이 존재하지 않습니다.!!!!", vbCritical + vbSystemModal, Enterprise
        End If
    End If

    Set FS = Nothing
    Exit Sub
err:
    MsgBox "[에러코드] : " & err.Number & Chr(13) & "[에러내용] : " & err.Description
End Sub
```

**사용 예시** (Main.bas):

```vb
SIniFile = App.Path & "\Config.ini"
Call FileExists(SIniFile, 1)  ' Config.ini 확인 또는 복구
```

**특징**:

- FileSystemObject 사용 (VB6의 COM 객체)
- FileType=1일 때만 자동 복구 (INI_BackUP 폴더 필요)
- 프로그램 시작 시 필수 설정 파일 확보

---

### 4.2 Player_Size (듀얼모니터 플레이어 크기 조정)

**시그니처**:

```vb
Public Sub Player_Size(Cnt As Integer)
```

**역할**:
듀얼 모니터의 동영상 플레이어를 최대화 또는 기본 크기로 조정합니다.

**파라미터**:

- `Cnt`:
  - `0` = 최대화 (전체 화면)
  - `1` = 기본 크기 (모니터 해상도에 따라 다름)

**코드 분석**:

```vb
Public Sub Player_Size(Cnt As Integer)
    If Cnt = 0 Then  ' 최대화
        Frm_Dual.Player.Top = 0
        Frm_Dual.Player.Left = 0
        Frm_Dual.Player.Width = Frm_Dual.Width
        Frm_Dual.Player.Height = Frm_Dual.Height

        Frm_Dual.lbl_Back.BackColor = vbBlack
        Frm_Dual.lbl_Back.Width = Frm_Dual.Width
        Frm_Dual.lbl_Back.Height = Frm_Dual.Height

        Frm_Dual.VSGrid_Dual.Visible = False

        Dual_Size = 0
    Else  ' 기본 크기
        Frm_Dual.lbl_Back.Width = 1
        Frm_Dual.lbl_Back.Height = 1
        Frm_Dual.lbl_Back.BackColor = &HCC9829

        If Terminal.SMoniter = "0" Then
            ' 1024x768 해상도
            Frm_Dual.Player.Top = 765
            Frm_Dual.Player.Left = 6090
            Frm_Dual.Player.Width = 5775
            Frm_Dual.Player.Height = 5820
        Else
            ' 1280x1024 해상도
            Frm_Dual.Player.Top = 990
            Frm_Dual.Player.Left = 7800
            Frm_Dual.Player.Width = 7380
            Frm_Dual.Player.Height = 7410
        End If

        Frm_Dual.VSGrid_Dual.Visible = True
        Dual_Size = 1
    End If
End Sub
```

**용도**:

- 고객용 모니터에서 광고 동영상 재생
- 구매 내역 표시와 전환
- 키오스크 모드에서 중요

---

### 4.3 Product_Sound (상품 스캔 음성 재생)

**시그니처**:

```vb
Public Sub Product_Sound(Wav_File As String)
```

**역할**:
바코드 스캔 시 음성 피드백을 재생합니다.

**파라미터**:

- `Wav_File`: 재생할 WAV 파일명 (예: "터치음.wav")

**코드 분석**:

```vb
Public Sub Product_Sound(Wav_File As String)
On Error GoTo err

    ' 터치음 설정 체크
    If C_Config.self_TouchSoundYN = "0" Then
        If C_Config.self_Media21 = "" Then
            If Wav_File = "터치음.wav" Then Exit Sub
        End If
    End If

    ' 파일 경로 설정
    If C_Config.self_Media21 = "" Then
        Wav_File = App.Path & "\Media21\(21)" & Wav_File
    Else
        Wav_File = C_Config.self_Media21 & "(21)" & Wav_File
    End If

    ' x.4.45 셀프결제에서 음성안내 사용안함 처리
    If C_Config.Self_YN = "1" And C_Config.Self_SoundGuide = "0" Then Exit Sub

    If Dir(Wav_File) = "" Then Exit Sub

    ' MMControl로 재생
    Frm_SaleMain.MMControl.Command = "Close"
    Frm_SaleMain.MMControl.FileName = Wav_File
    Frm_SaleMain.MMControl.Command = "Open"
    Frm_SaleMain.MMControl.Command = "Play"
    Exit Sub
err:
    MsgBox "[에러코드] : " & err.Number & Chr(13) & "[에러내용] : " & err.Description
End Sub
```

**사용 예시**:

```vb
Call Product_Sound("바코드인식.wav")
Call Product_Sound("취소.wav")
Call Product_Sound("터치음.wav")
```

**특징**:

- MMControl ActiveX 컨트롤 사용
- 셀프 모드에서 음성 안내 On/Off 가능
- 커스텀 미디어 폴더 지원

---

### 4.4 POS_State (POS 상태 업데이트)

**시그니처**:

```vb
Public Sub POS_State()
```

**역할**:
DB 연결 상태에 따라 판매 테이블명을 설정하고 화면을 업데이트합니다.

**코드 분석**:

```vb
Public Sub POS_State()
Dim sDate As String

    ' 전표 재로드
    Call Frm_SaleMain.JeonPyo_Load

    If Connect_Gubun = 1 Or Connect_Gubun = 3 Then
        ' SQL Server 연결 (ON)
        sDate = Left(Format(Frm_SaleMain.Lbl_SaleDate.Caption, "YYYYMMDD"), 6)
        SAD_Table = "SAD_" & sDate
        SAT_Table = "SAT_" & sDate

        Frm_SaleMain.lbl_Net.Caption = "ON"
        Frm_SaleMain.lbl_NetSelf.Caption = "서버:ON"
        Frm_SaleMain.lbl_NetSelf.ForeColor = vbBlack
        Frm_SaleMain.lbl_NetSelf.Visible = False

    ElseIf Connect_Gubun = 2 Then
        ' Access DB 연결 (OFF)
        SAD_Table = "SAD_YYYYMM"
        SAT_Table = "SAT_YYYYMM"

        Frm_SaleMain.lbl_Net.Caption = "OFF"
        Frm_SaleMain.lbl_NetSelf.Caption = "서버:OFF"
        Frm_SaleMain.lbl_NetSelf.ForeColor = vbRed
        Frm_SaleMain.lbl_NetSelf.Visible = True
    End If

    Call Frm_SaleMain.BaeDal_Count      ' 배달 건수
    Call Frm_SaleMain.BaeDalCall_Count  ' 전화주문 건수

    ' x.6.1 셀프 핫키 로드
    If C_Config.Self_YN = "1" Then
        Frm_SaleMain.selfHodtKeyLoad
    End If
End Sub
```

**특징**:

- `Connect_Gubun`: 1=SQL Server, 2=Access, 3=SQL Server(예비)
- 테이블명 동적 생성 (SAT_202601, SAD_202601)
- 오프라인 모드 시각적 표시

---

### 4.5 SCAN_MSCOMM_Open (테이블 스캐너 포트 열기)

**시그니처**:

```vb
Public Function SCAN_MSCOMM_Open() As Boolean
```

**역할**:
테이블형 바코드 스캐너의 시리얼 포트를 엽니다.

**코드 분석**:

```vb
Public Function SCAN_MSCOMM_Open() As Boolean
On Error GoTo err
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
        Scan_Open = True
    End With

    Exit Function
err:
    MsgBox "[Event] : (SCAN_MSCOMM_Open) " & vbCrLf & "[에러코드] : " & err.Number & Chr(13) & "[에러내용] : " & err.Description, vbCritical
End Function
```

**특징**:

- MSComm ActiveX 컨트롤 사용 (VB6 시리얼 통신)
- 9600 bps, No Parity, 8 data bits, 1 stop bit
- RThreshold=1: 1바이트 수신 시 이벤트 발생

**관련 함수**:

- `SCAN_HandMSCOMM_Open()`: 핸드 스캐너
- `MSR_MSCOMM_Open()`: 카드 리더
- `CDP_MSCOMM_Open()`: 고객 디스플레이

---

### 4.6 Printer_Check (프린터 상태 확인)

**시그니처**:

```vb
Public Function Printer_Check(Optional ByVal Reg_Addr As Long = 379) As Boolean
```

**역할**:
영수증 프린터의 상태를 확인합니다 (병렬 포트 또는 시리얼 포트).

**파라미터**:

- `Reg_Addr`: 병렬 포트 레지스터 주소 (기본값: 0x379)

**코드 분석 (병렬 프린터)**:

```vb
If Terminal.PrinterGubun = 0 Then  ' 병렬포트
    ' Winio.dll로 포트 읽기
    If p_chk = 1 Then
        If InitializeWinIo = False Then
            Printer_Check = False
            Exit Function
        End If
    End If

    Result = GetPortVal(Val("&H379"), PortVal, 1)

    If Result = False Then
        Printer_Check = False
        Exit Function
    Else
        ' 프린터 타입별 상태 비트 체크
        If Terminal.Printer = 1 Then  ' EPSON TM 시리즈
            If Mid(CStr(Hex(LowByte(PortVal))), 1, 1) = "D" Or _
               Mid(CStr(Hex(LowByte(PortVal))), 1, 1) = "5" Or _
               Mid(CStr(Hex(LowByte(PortVal))), 1, 1) = "1" Then
                Printer_Check = True
            Else
                Printer_Check = False
            End If
        Else  ' ELLIX 20P
            If Mid(CStr(Hex(LowByte(PortVal))), 1, 1) = "D" Or _
               ... Or _
               Mid(CStr(Hex(LowByte(PortVal))), 1, 1) = "9" Then
                Printer_Check = True
            End If
        End If
    End If
End If
```

**코드 분석 (시리얼 프린터)**:

```vb
Else  ' 시리얼 포트
    With Frm_SaleMain.MSCom_Printer
        If .PortOpen = False Then
            .CommPort = Terminal.PrinterPort
            .settings = Terminal.PrinterBps & ",n,8,1"
            .Handshaking = 0
            .RThreshold = 0
            .InputLen = 1
            .PortOpen = True
        End If

        Call Buffer_Clear

        ' GS r 명령으로 상태 확인
        If Terminal.Printer = 3 Then  ' P300
            .Output = Chr$(&H1D) & Chr$(&H72) & Chr$(&H0)
        ElseIf Terminal.Printer = 6 Then  ' IBM 4610-TF7
            .Output = Chr$(&H1D) & Chr$(&H72) & Chr$(&H2)
        Else  ' EPSON 시리얼
            .Output = Chr$(&H1D) & Chr$(&H72) & Chr$(&H1)
        End If

        sTime = Now
        Do
            DoEvents
            If .InBufferCount > 0 Then
                buffer = .Input
                Exit Do
            End If

            NTime = Now
            If Abs(DateDiff("s", NTime, sTime)) >= 2 Then buffer = 4: Exit Do
        Loop

        Select Case buffer
            Case 0, Chr$(0): Printer_Check = True
            Case 1, 2, 3, 4: Printer_Check = False
        End Select
    End With
End If
```

**특징**:

- 병렬 포트: WinIO.dll로 하드웨어 직접 접근
- 시리얼 포트: ESC/POS 명령 (GS r n)
- 2초 타임아웃

---

### 4.7 VSGRID_SizeLoad (그리드 크기 로드)

**시그니처**:

```vb
Public Sub VSGRID_SizeLoad(ByVal Grd As Control, ByVal LData As String, ByVal sData As String)
```

**역할**:
INI 파일에서 그리드 컬럼 너비를 로드하거나 기본값을 설정합니다.

**파라미터**:

- `Grd`: VSFlexGrid 컨트롤
- `LData`: INI 섹션명 (예: "Grid_SaleDD0")
- `sData`: INI 키명

**코드 분석**:

```vb
Public Sub VSGRID_SizeLoad(ByVal Grd As Control, ByVal LData As String, ByVal sData As String)
Dim i As Integer
Dim Grid_Width As String
Dim Col_Width() As String

    With Grd
        ReDim Col_Width(.Cols - 1)
        Grid_Width = mfun.READ_INI(LData, sData, INI_Path)

        If Grid_Width = "" Then
            ' 기본값 설정
            Select Case LData
                Case "Grid_Cal": Grid_Width = "2175,2235,2220,2175,2130,2160,1005"
                Case "Grid_SaleDD0": Grid_Width = "585,780,1275,1440,1455,975,975,1170,1470,1020,1530,1005"
                Case "NewGrid_Sale_Touch"
                    If Terminal.Touch = 0 Then
                        If Terminal.Moniter = "0" Then
                            Grid_Width = "465,2000,5300,2340,5535,..."  ' 1024x768
                        Else
                            Grid_Width = "465,2000,8800,2340,5535,..."  ' 1280x1024
                        End If
                    End If
                Case "NewGrid_Dual"
                    If Terminal.SMoniter = "0" Then
                        Grid_Width = "350,1005,2700,1060,550,1060"
                    Else
                        Grid_Width = "350,1005,4250,1060,550,1060"
                    End If
            End Select
        End If

        Col_Width1 = Split(Grid_Width, ",")
        ReDim Preserve Col_Width1(.Cols - 1)

        For i = 0 To .Cols - 1
            If Col_Width(i) <> "" Then
                .ColWidth(i) = Col_Width(i)
            Else
                .ColWidth(i) = 1000
            End If
        Next i
    End With
End Sub
```

**특징**:

- 해상도별 기본값 (1024x768, 1280x1024)
- 터치/비터치 모드별 레이아웃
- 동적 컬럼 수 대응

---

### 4.8 TIPS_Server_Connect (TIPS 서버 연결)

**시그니처**:

```vb
Public Sub TIPS_Server_Connect(Sale_Date As String, Open_Chk As Boolean, sMaster_Flag As String, sDeal_ID As String)
```

**역할**:
TIPS 통합 관리 서버에 접속하여 POS 정보를 전송하고 옵션을 수신합니다.

**파라미터**:

- `Sale_Date`: 판매일자
- `Open_Chk`: True면 접속 로그 기록
- `sMaster_Flag`: 마스터 키 여부
- `sDeal_ID`: 딜러 ID

**코드 분석**:

```vb
Public Sub TIPS_Server_Connect(Sale_Date As String, Open_Chk As Boolean, ...)
Dim T_server As ADODB.Connection
Dim T_RS As ADODB.Recordset
On Error GoTo err

    If mfun.Internet_Chk = True Then
        Set T_server = New ADODB.Connection
        Set T_RS = New ADODB.Recordset

        If T_AdoConnectDB(T_server, TIPS_SERVER.USERID, TIPS_SERVER.UserPass, ...) Then
            ' 1. 매장 정보 임시 테이블 저장
            SQL = "Insert Into Temp_OfficeUSer(Office_Code, Office_Name, ...) "
            SQL = SQL + "values('" & Shop.Code & "', ...)"
            T_server.Execute (SQL)

            ' 2. 접속 로그 기록 (Open_Chk=True 일 때)
            If Open_Chk = True Then
                SQL = "Insert Into Pos_ConnectLog(Sto_CD, Pos_No, Ver, ...) "
                SQL = SQL + "values('" & Shop.Code & "', '" & Terminal.PosNo & "', ...)"
                T_server.Execute (SQL)
            End If

            ' 3. 서버 옵션 가져오기
            SQL = "Select LoginSlow_YN, ProductSlow_YN, ... "
            SQL = SQL + "From Pos_Option Where Sto_CD='" & Shop.Code & "' ..."
            Set T_RS = T_server.Execute(SQL)

            If T_RS.RecordCount > 0 Then
                T_Opt(0) = T_RS(0)  ' 로그인 속도향상
                T_Opt(1) = T_RS(1)  ' 상품 속도향상
                T_Opt(2) = T_RS(2)  ' 회원 속도향상
                ...
            End If

            T_RS.Close: Set T_RS = Nothing
            T_server.Close: Set T_server = Nothing
        End If
    End If
End Sub
```

**전송 정보**:

- 매장 정보 (코드, 이름, 사업자번호, 주소, 전화번호)
- POS 정보 (번호, 버전, 제품키, IP 주소)
- 하드웨어 정보 (프린터, 스캐너, CDP, 동전투입기, VAN)
- OS 정보 (이름, 비트, 버전)
- 셀프 POS 여부

**수신 정보** (T_Opt 배열):

- 각종 속도향상 옵션 (로그인, 상품, 회원, 카드, ...)
- 기능 가능 여부 (수정, 마감, 재전송, 반품, ...)

---

### 4.9 MEM_SalePrice (회원가격 계산)

**시그니처**:

```vb
Public Function MEM_SalePrice(Sale_Date As String, P_Price As Currency, BARCODE As String, Cus_Class As String) As String
```

**역할**:
회원등급과 설정에 따라 특별가격을 계산합니다.

**파라미터**:

- `Sale_Date`: 판매일자
- `P_Price`: 원가
- `BARCODE`: 상품 바코드
- `Cus_Class`: 회원등급 (1:일반, 2:실버, 3:골드, 4:VIP, 5:기타)

**코드 분석**:

```vb
Public Function MEM_SalePrice(...) As String
Dim M_chk As Boolean
Dim RS2 As ADODB.Recordset
Dim MEM_PPri As Currency
Dim MEM_SPri As Currency

    If S_Config.MEM_Gubun = "1" Then  ' 일부상품
        ' 기간 체크
        If S_Config.MEM_Type = "1" Then  ' 항상
            M_chk = True
        ElseIf S_Config.MEM_Type = "2" Then  ' 요일
            If S_Config.MEM_Week = Weekday(Sale_Date) Then
                M_chk = True
            End If
        ElseIf S_Config.MEM_Type = "3" Then  ' 기간지정
            If Sale_Date >= S_Config.MEM_SDate And Sale_Date <= S_Config.MEM_EDate Then
                M_chk = True
            End If
        End If

        If M_chk = True Then
            ' DB에서 회원가 조회
            SQL = "Select C_Barcode, C_SalePur, C_SaleSell, "
            SQL = SQL + "Nor_YN, Nor_Pri, Sil_YN, Sil_Pri, ... "
            SQL = SQL + "From Customer_Sale Where C_Barcode='" & BARCODE & "' And C_Gubun='1'"
            Set RS2 = DBCON.Execute(SQL)

            If RS2.RecordCount = 1 Then
                MEM_PPri = IIf(IsNull(RS2!C_SalePur), 0, RS2!C_SalePur)
                MEM_SPri = IIf(IsNull(RS2!C_SaleSell), 0, RS2!C_SaleSell)

                ' 등급별 가격 적용
                Select Case Cus_Class
                    Case 1: ' 일반
                        If IIf(IsNull(RS2!Nor_YN), "0", RS2!Nor_YN) = "1" Then
                            MEM_SPri = RS2!Nor_Pri
                        End If
                    Case 2: ' 실버
                        If RS2!Sil_YN = "1" Then MEM_SPri = RS2!Sil_Pri
                    Case 3: ' 골드
                        If RS2!Gld_YN = "1" Then MEM_SPri = RS2!Gld_Pri
                    Case 4: ' VIP
                        If RS2!Vip_YN = "1" Then MEM_SPri = RS2!Vip_Pri
                    Case 5: ' 기타
                        If RS2!Etc_YN = "1" Then MEM_SPri = RS2!Etc_Pri
                End Select

                If P_Price > MEM_SPri And MEM_SPri <> 0 Then
                    MEM_SalePrice = MEM_PPri & "," & MEM_SPri
                Else
                    MEM_SalePrice = ""
                End If
            End If
        End If

    ElseIf S_Config.MEM_Gubun = "2" Then  ' 전품목
        If S_Config.MEM_Per > 0 Then
            ' 기간 체크 후 할인율 적용
            If M_chk = True Then
                MEM_SalePrice = Fix((P_Price * CCur(S_Config.MEM_Per)) / 100)

                ' 끝자리 절사
                If Right(MEM_SalePrice, 1) > 0 Then
                    MEM_SalePrice = MEM_SalePrice - Right(MEM_SalePrice, 1)
                End If
            End If
        End If
    End If
End Function
```

**반환값**:

- `""`: 할인 없음
- `"1000,900"`: 원가 1000원, 회원가 900원

---

### 4.10 Tax_VAT1 (부가세 계산)

**시그니처**:

```vb
Public Function Tax_VAT1(Tax_Pri As Currency) As Currency
```

**역할**:
판매 그리드에서 과세 상품이 있을 경우 부가세를 계산합니다.

**코드 분석**:

```vb
Public Function Tax_VAT1(Tax_Pri As Currency) As Currency
Dim i As Integer
Dim Tax_chk As Boolean

    Tax_VAT1 = 0
    Tax_chk = False

    With Frm_SaleMain.VSGrid_Sale
        For i = 1 To .rows - 1
            ' 과세(4="1") + 정상판매(34="-") 체크
            If .TextMatrix(i, 4) = "1" And .TextMatrix(i, 34) = "-" Then
                Tax_chk = True
                Exit For
            End If
        Next i

        If Tax_chk = False Then
            Tax_VAT1 = 0
        Else
            ' 부가세 = (과세금액 / 1.1) * 0.1
            Tax_VAT1 = Format((Tax_Pri / 1.1) * 0.1, "0")
        End If
    End With
End Function
```

**특징**:

- 과세 상품이 하나라도 있으면 계산
- 공급가액 = 과세금액 / 1.1
- 부가세 = 공급가액 \* 0.1

---

### 4.11 Card_WriteLog (카드 로그 기록)

**시그니처**:

```vb
Public Sub Card_WriteLog(F_Name As String, SaleDate As String, W_Str As String)
```

**역할**:
카드 결제 통신 로그를 파일로 기록합니다.

**코드 분석**:

```vb
Public Sub Card_WriteLog(F_Name As String, SaleDate As String, W_Str As String)
Dim F_Path As String
On Error Resume Next

    Set FS = CreateObject("Scripting.FileSystemObject")

    F_Path = App.Path & "\" & F_Name

    ' 폴더 생성
    If FS.FolderExists(F_Path) = False Then
        FS.CreateFolder (F_Path)
    End If

    F_Path = F_Path & "\" & SaleDate & ".log"

    ' 파일 생성
    If FS.FileExists(F_Path) = False Then
        FS.CreateTextFile (F_Path)
    End If

    ' 추가 모드로 쓰기
    Set F = FS.OpenTextFile(F_Path, ForAppending, TristateFalse)
    F.WriteLine W_Str
    F.Close

    Set FS = Nothing
End Sub
```

**사용 예시**:

```vb
Call Card_WriteLog("CARD_LOG", "20260129", "승인요청: 10000원")
Call Card_WriteLog("CARD_LOG", "20260129", "승인응답: OK 12345678")
```

**로그 구조**:

```
App.Path\CARD_LOG\20260129.log
App.Path\KIS\20260129.log
App.Path\Supyo_Log\20260129.log
```

---

### 4.12 Error_Log (에러 로그 기록)

**시그니처**:

```vb
Public Sub Error_Log(sDate As String, Form_Name As String, Pro_Sub As String,
                     Error_Code As String, Error_Con As String,
                     param1 As String, param2 As String, Param3 As String)
```

**역할**:
상세한 에러 정보를 구조화된 형식으로 로그 파일에 기록합니다.

**코드 분석**:

```vb
Public Sub Error_Log(...)
Dim err_str As String
On Error GoTo err

    Set FS = CreateObject("Scripting.FileSystemObject")

    F_Path = App.Path & "\Error_Log"
    If FS.FolderExists(F_Path) = False Then
        FS.CreateFolder (F_Path)
    End If

    F_Path = F_Path & "\" & Format(sDate, "yyyy-mm-dd") & ".Log"
    If FS.FileExists(F_Path) = False Then
        FS.CreateTextFile (F_Path)
    End If

    Set F = FS.OpenTextFile(F_Path, ForAppending, TristateFalse)

    err_str = "----------------------------------------" & vbCrLf
    err_str = err_str + "판매날짜 : " & Format(sDate, "yyyy-mm-dd") & vbCrLf
    err_str = err_str + "발생시간 : " & Format(Now, "yyyy-mm-dd hh:mm:ss") & vbCrLf
    err_str = err_str + "Form_Name : " & Form_Name & vbCrLf
    err_str = err_str + "Event : " & Pro_Sub & vbCrLf
    err_str = err_str + "Error_Code : " & Error_Code & vbCrLf
    err_str = err_str + "Error_Content : " & Error_Con & vbCrLf
    err_str = err_str + "Param1 : " & param1 & vbCrLf
    err_str = err_str + "Param2 : " & param2 & vbCrLf
    err_str = err_str + "Param3 : " & Param3 & vbCrLf
    err_str = err_str + "----------------------------------------" & vbCrLf

    F.WriteLine err_str
    F.Close

    Set FS = Nothing
End Sub
```

**사용 예시**:

```vb
Call Error_Log(Format(Now, "yyyy-mm-dd"), "Frm_SaleMain", "VSGrid_Sale_DblClick", _
               Err.Number, Err.Description, "Row=5", "Col=3", "Barcode=123456")
```

---

### 4.13 Control_Close (모든 통신 포트 닫기)

**시그니처**:

```vb
Public Sub Control_Close()
```

**역할**:
프로그램 종료 시 모든 하드웨어 통신 포트를 안전하게 닫습니다.

**코드 분석**:

```vb
Public Sub Control_Close()
On Error GoTo err

    ' 프린터 포트
    If Terminal.PrinterGubun = 0 Then  ' 병렬포트
        Call ShutdownWinIo
    Else
        If Frm_SaleMain.MSCom_Printer.PortOpen = True Then
            Frm_SaleMain.MSCom_Printer.PortOpen = False
        End If
    End If

    ' 고객 디스플레이
    If Frm_SaleMain.MSComm.PortOpen = True Then
        Frm_SaleMain.MSComm.PortOpen = False
        DISP_Open = False
    End If

    ' 테이블 스캐너
    If Frm_SaleMain.MSComm1.PortOpen = True Then
        Frm_SaleMain.MSComm1.PortOpen = False
        Scan_Open = False
    End If

    ' 핸드 스캐너
    If Frm_SaleMain.MSCom_HandScan.PortOpen = True Then
        Frm_SaleMain.MSCom_HandScan.PortOpen = False
    End If

    ' 카드 리더 (MSR)
    If Frm_SaleMain.MSCom_MSR.PortOpen = True Then
        Frm_SaleMain.MSCom_MSR.PortOpen = False
    End If

    ' 동전 투입기
    If Coin_Open = True Then
        Call Frm_SaleMain.Coin_PortClose
    End If
End Sub
```

**호출 시점**:

- Frm_SaleMain Unload 이벤트
- 프로그램 강제 종료 전

---

### 4.14 STLON / STLOff (USB 신호등 제어)

**시그니처**:

```vb
Public Sub STLON(Index As Integer)
Public Sub STLOff()
```

**역할**:
키오스크 상태를 고객에게 시각적으로 알리는 USB 신호등을 제어합니다.

**파라미터 (STLON)**:

- `0`: 정상작동 (녹색)
- `1`: 직원호출 (노란색 깜빡임)
- `2`: 관리자호출 (빨간색 + 부저)
- `3`: 관리자호출 알람
- `4`: 판매 스캔 (녹색 깜빡임)
- `5`: 음성안내 (부저)
- `-4`: 직원대기 (꺼짐)

**코드 분석**:

```vb
Public Sub STLON(Index As Integer)
Dim SelectID As Integer
Dim Result As Boolean
On Error GoTo err

    If C_Config.Self_STLYN = "0" Then Exit Sub
    SelectID = "&h" & C_Config.Self_STLPort

    Select Case Index
    Case 0  ' 정상작동
        STLOff
        Result = usb_io_output(SelectID, 0, 5, 0, 0, 0)

    Case 1  ' 직원호출 (노란불 깜빡임)
        STLOff
        Result = usb_io_output(SelectID, 0, 2, 0, 0, 0)

    Case 2  ' 관리자호출 (빨간불 + 부저)
        STLOff
        If C_Config.Self_STLSoundAdmin = "1" Then
            Result = usb_io_output(SelectID, 0, 1, 0, 0, 0)  ' 부저
        End If
        Result = usb_io_output(SelectID, 5, 4, 0, 0, 0)  ' 빨간불
        Result = usb_io_output(SelectID, 5, 2, 0, 0, 0)

    Case 3  ' 관리자호출 알람
        Result = usb_io_output(SelectID, 5, 2, 0, 0, 0)

    Case 4  ' 판매 스캔
        If C_Config.Self_STLGoods = 0 Then Exit Sub
        Result = usb_io_output(SelectID, 0, 4, 0, 0, 0)

    Case 5  ' 음성안내 부저
        Result = usb_io_output(SelectID, 0, 1, 0, 0, 0)

    Case -4  ' 직원대기
        Result = usb_io_output(SelectID, 0, -4, 0, 0, 0)
    End Select

    If Result = False Then
        MsgBox "작동오류 : 장치의 연결을 확인하세요", vbCritical, "STLON"
        C_Config.Self_STLYN = "0"
    End If
End Sub

Public Sub STLOff()
Dim SelectID As Integer
Dim Result As Boolean
    If C_Config.Self_STLYN = "0" Then Exit Sub
    SelectID = "&h" & C_Config.Self_STLPort
    Result = usb_io_output(SelectID, 0, 0, 0, 0, 0)
End Sub
```

**특징**:

- uio32.dll 사용 (USB I/O 제어)
- 셀프 키오스크 전용
- 관리자 호출 시 부저 옵션

---

### 4.15 POSON_UPSS_CHECK (회수상품 체크)

**시그니처**:

```vb
Public Function POSON_UPSS_CHECK(sbarcode As String) As Integer
```

**역할**:
식품의약품안전처 UPSS(위해식품판매차단시스템) 연동 - 회수대상 상품 판매 차단

**반환값**:

- `-1`: 에러
- `0`: 정상 판매 가능
- `1`: 판매 불가
- `2`: 회수 완료 처리

**코드 분석**:

```vb
Public Function POSON_UPSS_CHECK(sbarcode As String) As Integer
Dim UPSS_MDB_Path As String
Dim UPSS_DB As ADODB.Connection
Dim UPSS_RS As ADODB.Recordset
Dim UPSS_check As Boolean

    POSON_UPSS_CHECK = -1

    ' Access DB 연결
    UPSS_MDB_Path = App.Path & "\data\Tipos_Upss.mdb"
    UPSS_MDB_Pass = "xodlfvhtm0945"

    Set UPSS_DB = New ADODB.Connection
    If MDBConnect_DB(UPSS_DB, UPSS_MDB_Path, UPSS_MDB_Pass) = False Then
        Call cMsgbox("POSON2 UPSS DB 연결 실패", "1", "")
        Exit Function
    End If

    ' 상품조회 (회수 및 판매중단완료가 아닌 것만)
    SQL = "SELECT TOP 1 * FROM UPSS_REPORT "
    SQL = SQL + "WHERE Brcd = '" & sbarcode & "' "
    SQL = SQL + "AND Dspth_Yn = 'Y' AND Managt_Cd <> '1' "
    SQL = SQL + "ORDER BY Doc_No DESC, Doc_Seq DESC "
    Set UPSS_RS = UPSS_DB.Execute(SQL)

    If Not UPSS_RS.EOF Then
        UPSS_check = True
        UPSS_DATA(0) = UPSS_RS!Instt_Cd       ' 기관코드
        UPSS_DATA(1) = UPSS_RS!Instt_Nm       ' 기관명
        UPSS_DATA(2) = UPSS_RS!Doc_No         ' 문서번호
        UPSS_DATA(3) = UPSS_RS!Doc_Seq        ' 문서순번
        UPSS_DATA(4) = UPSS_RS!Report_Ty_Nm   ' 회수여부
        UPSS_DATA(5) = UPSS_RS!Prduct_Nm      ' 상품명
        UPSS_DATA(6) = UPSS_RS!Brcd           ' 바코드
        UPSS_DATA(7) = UPSS_RS!MnFctur_Date   ' 제조일자
        UPSS_DATA(8) = UPSS_RS!Distb_Tm_Lmt   ' 유통기한
        UPSS_DATA(9) = UPSS_RS!Rtrbl_Resn_Nm  ' 회수사유명
        UPSS_DATA(10) = UPSS_RS!Dspth_Date    ' 회수일시
    End If
    UPSS_RS.Close

    ' 화면 처리
    If UPSS_check = True Then
        Scan_Chk = True
        frm_POSON_UPSS_1080.Show vbModal  ' 사용자 선택 (판매/폐기/회수완료)
        Scan_Chk = False

        ' 결과 기록
        UPSS_DB.BeginTrans
        SQL = "INSERT INTO UPSS_RESULT (Log_Date, Instt_Cd, ..., Sale_Gubn) "
        SQL = SQL + "VALUES('" & Format(Now, "YYYYMMDDHHMMSS") & "', ..., '" & UPSS_rtn & "')"
        UPSS_DB.Execute (SQL)

        If UPSS_rtn = 2 Then  ' 회수완료 선택 시
            SQL = "UPDATE upss_Report SET Managt_Cd = '1', ..."
            SQL = SQL + "WHERE Instt_Cd = '" & UPSS_DATA(0) & "' ..."
            UPSS_DB.Execute (SQL)
        End If

        UPSS_DB.CommitTrans

        ' SMS 알림 (설정 시)
        If Connect_Gubun = 1 And C_Config.POSON2_UPSS_SMS_USE = "1" Then
            Call POSON2_UPPPS_SMS_SEND(sbarcode, UPSS_rtn)
        End If

        UPSS_DB.Close

        POSON_UPSS_CHECK = UPSS_rtn  ' 0:판매 1:판매중지 2:회수완료
    Else
        POSON_UPSS_CHECK = 0
    End If
End Function
```

**특징**:

- 식약처 연동 (별도 Access DB)
- 모달 다이얼로그로 처리 방법 선택
- SMS 알림 옵션
- 로컬 DB에 처리 이력 저장

---

## 5. 함수 카테고리별 분류

### 5.1 파일 및 로그 처리 (12개)

| 함수명                  | 역할                         |
| ----------------------- | ---------------------------- |
| FileExists              | INI 파일 존재 확인 또는 생성 |
| Card_WriteLog           | 카드 로그 기록               |
| SaleData_WriteLog       | 판매 로그 기록               |
| Error_Log               | 에러 로그 구조화 기록        |
| Self_WriteLog           | 셀프 POS 로그                |
| Folder_File_Delete      | 폴더 삭제                    |
| LOG_Folder_LIST         | 로그 폴더 정리               |
| VSGRID_SizeSave         | 그리드 크기 저장             |
| VSGRID_SizeLoad         | 그리드 크기 로드             |
| subColSize_Set          | 컬럼 크기 설정               |
| Grid_Col_Hidden_Refresh | 컬럼 숨김 로드               |
| ServerVersion_INIWrite  | 서버 버전 INI 기록           |

### 5.2 UI 제어 (10개)

| 함수명             | 역할                     |
| ------------------ | ------------------------ |
| ps_fgInit          | VSFlexGrid 초기화        |
| Player_Size        | 듀얼모니터 플레이어 크기 |
| Button_Rounding    | 버튼 모서리 둥글게       |
| Form_Rounding      | 폼 모서리 둥글게         |
| ps_SizeCboWidth    | 콤보박스 너비 조정       |
| ps_SizeCboHight    | 콤보박스 높이 조정       |
| cMsgbox            | 커스텀 메시지박스        |
| TXT_SelectAll      | 텍스트 전체 선택         |
| TEXTBOX_SELECT_ALL | 텍스트박스 전체 선택     |
| initLab            | 라벨 초기화              |

### 5.3 하드웨어 통신 (12개)

| 함수명               | 역할                         |
| -------------------- | ---------------------------- |
| CDP_MSCOMM_Open      | 고객 디스플레이 포트 열기    |
| SCAN_MSCOMM_Open     | 테이블 스캐너 포트 열기      |
| SCAN_HandMSCOMM_Open | 핸드 스캐너 포트 열기        |
| MSR_MSCOMM_Open      | 카드 리더 포트 열기          |
| InBufferCount_Del    | 스캐너 버퍼 클리어           |
| Printer_Check        | 프린터 상태 확인             |
| Control_Close        | 모든 통신 포트 닫기          |
| Product_Sound        | 상품 스캔 음성 재생          |
| STLON                | USB 신호등 켜기              |
| STLOff               | USB 신호등 끄기              |
| LowByte              | 하위 바이트 추출 (포트 읽기) |
| TimerProc            | 타이머 콜백                  |

### 5.4 회원 관련 (8개)

| 함수명                       | 역할                 |
| ---------------------------- | -------------------- |
| MEM_SalePrice                | 회원가격 계산        |
| MEM_PointADD                 | 생일 포인트 적립     |
| Point_Per                    | 포인트 추가 적립     |
| Mem_PointSum                 | 회원등급별 포인트    |
| Customer_Area_Gubun          | 회원 지역 구분       |
| CustomerName_Marking         | 회원명 마스킹        |
| customer_info_rPoint_auto_yn | 적립금 자동사용      |
| Lucky_Num                    | 행운번호 이벤트 여부 |

### 5.5 결제 관련 (10개)

| 함수명          | 역할                 |
| --------------- | -------------------- |
| CARD_Proc_CALL  | 카드 결제 처리       |
| CASH_Proc_CALL  | 현금영수증 처리      |
| Supyo_Proc_CALL | 수표 처리            |
| fCARD_VAT       | 카드 VAT 계산        |
| fCASH_VAT       | 현금영수증 VAT 계산  |
| Tax_VAT1        | 부가세 계산          |
| TAX_CCUR        | 세금 비율 계산       |
| total_TAX_CCUR  | 전체 세금 계산       |
| VAN_Init        | VAN 변수 초기화      |
| Card_Pub_init   | 카드 전역변수 초기화 |

### 5.6 데이터 처리 (8개)

| 함수명             | 역할                    |
| ------------------ | ----------------------- |
| Week_Number        | 요일 문자 → 숫자        |
| IsNum              | 숫자 여부 확인          |
| UF_RegularExText   | 정규식 텍스트 변환      |
| Table_Chk          | 판매 테이블 생성 체크   |
| GOODS_LastDate_Sql | 상품 최종일자 SQL       |
| InD_Log_Seq        | 입고 로그 시퀀스        |
| SAT_Trnas_Seq      | 배달 시퀀스 생성        |
| Jeonpyo_SEQ_Check  | 전표번호 9999 초과 체크 |

### 5.7 외부 연동 (8개)

| 함수명                 | 역할                 |
| ---------------------- | -------------------- |
| TIPS_Server_Connect    | TIPS 서버 연결       |
| Office_Block_Check     | 사업자번호 차단 체크 |
| MyIP                   | 외부 IP 조회         |
| Seetrol_Remote_Connect | 원격 지원 연결       |
| POSON_UPSS_CHECK       | UPSS 회수상품 체크   |
| GS_Parking_Proc        | GS 주차 연동         |
| SLock_Chk              | SLock 동글 체크      |
| MegaLock_Chk           | 메가락 체크          |

### 5.8 시스템 제어 (7개)

| 함수명              | 역할                 |
| ------------------- | -------------------- |
| POS_State           | POS 상태 업데이트    |
| reStarting_PG       | 프로그램 재시작      |
| MainFrom_Unload     | 메인폼 종료 처리     |
| Seller_Start_Number | 판매자 시작 전표번호 |
| ShopUse_Data_Proc   | 자가소비 데이터      |
| Pur_Auto_Check      | 자동 입고 여부       |
| mCard_array_init    | 다중카드 배열 초기화 |

---

## 6. 호출 관계 및 의존성

### 6.1 주요 호출 관계

```
Main.bas (Sub Main)
    ↓
    ├─→ FileExists(SIniFile, 1)
    │       └─→ Mdl_Function.bas
    │
Frm_SaleMain (Form_Load)
    ↓
    ├─→ CDP_MSCOMM_Open()
    ├─→ SCAN_MSCOMM_Open()
    ├─→ MSR_MSCOMM_Open()
    ├─→ Printer_Check()
    ├─→ ps_fgInit(VSGrid_Sale)
    ├─→ VSGRID_SizeLoad(VSGrid_Sale, "NewGrid_Sale_Touch", "")
    ├─→ TIPS_Server_Connect(Sale_Date, True, ...)
    ├─→ POS_State()
    └─→ Player_Size(1)

Frm_SaleMain (상품 스캔)
    ↓
    ├─→ POSON_UPSS_CHECK(Barcode)
    ├─→ MEM_SalePrice(Sale_Date, Price, Barcode, Cus_Class)
    ├─→ Product_Sound("바코드인식.wav")
    └─→ STLON(4)

Frm_SaleMain (결제)
    ↓
    ├─→ Tax_VAT1(Total_Price)
    ├─→ fCARD_VAT("", Card_Price, Total_Price)
    ├─→ CARD_Proc_CALL(JeonPyo, "0", ...)
    └─→ Card_WriteLog("CARD_LOG", Sale_Date, Log_Str)

Frm_SaleMain (Form_Unload)
    ↓
    └─→ Control_Close()
```

### 6.2 의존 Module

**직접 의존**:

- `Mdl_Main.bas`: 전역 변수 (Shop, Terminal, S_Config, ...)
- `Mdl_API.bas`: Windows API 선언 (Sleep, CreateRoundRectRgn, ...)
- `Mdl_Common.bas`: 공통 함수 (mfun.READ_INI, mfun.WRITE_INI, ...)
- `DBConnection.bas`: DB 연결 (DBCON, DBCON1, MDBConnect_DB, ...)

**간접 의존**:

- `Config.ini`: 설정 파일
- `Tipos_Upss.mdb`: UPSS 로컬 DB
- `Media21\*.wav`: 음성 파일
- `uio32.dll`: USB I/O DLL
- `WinIO.sys`: 병렬 포트 드라이버

### 6.3 외부 라이브러리

| DLL/OCX                    | 용도         | 함수                                               |
| -------------------------- | ------------ | -------------------------------------------------- |
| kernel32.dll               | Windows 기본 | GetPrivateProfileString, WritePrivateProfileString |
| user32.dll                 | Windows UI   | SetTimer, KillTimer, MoveWindow, SendMessage       |
| uio32.dll                  | USB I/O      | usb_io_init, usb_io_output, usb_io_reset           |
| WinIO.dll                  | 포트 접근    | InitializeWinIo, GetPortVal, ShutdownWinIo         |
| Scripting.FileSystemObject | 파일 시스템  | FileExists, CreateFolder, OpenTextFile             |
| ADODB 2.8                  | 데이터베이스 | Connection, Recordset                              |
| MSComm 6.0                 | 시리얼 통신  | MSComm 컨트롤                                      |
| VSFlexGrid 8.0             | 그리드       | VSFlexGrid 컨트롤                                  |
| MMControl 6.0              | 멀티미디어   | MMControl (WAV 재생)                               |

---

## 7. 마이그레이션 고려사항

### 7.1 파일 시스템 → 현대 스택

**VB6 FileSystemObject**:

```vb
Set FS = CreateObject("Scripting.FileSystemObject")
If FS.FileExists(INI_FilePath) = False Then
    FS.CopyFile App.Path & "\INI_BackUP\Pos_Config.INI", App.Path & "\"
End If
```

**Node.js (fs 모듈)**:

```javascript
import fs from "fs/promises";
import path from "path";

async function fileExists(iniFilePath, fileType) {
  try {
    await fs.access(iniFilePath);
  } catch (err) {
    if (fileType === 1) {
      const backupPath = path.join(__dirname, "INI_BackUP", "Pos_Config.INI");
      await fs.copyFile(backupPath, iniFilePath);
    } else {
      throw new Error(`파일이 존재하지 않습니다: ${iniFilePath}`);
    }
  }
}
```

**특징**:

- `fs/promises` 사용 (async/await)
- `try-catch` 에러 처리
- 경로는 `path.join()` 사용

---

### 7.2 INI 파일 → 환경변수 + JSON

**VB6 INI**:

```vb
lRet = GetPrivateProfileString("Terminal", "PosNo", "", sTemp, Len(sTemp), INI_Path)
PosNo = Trim(Left(sTemp, lRet))
```

**현대 스택 (dotenv + JSON)**:

```javascript
// .env
DATABASE_HOST=localhost
DATABASE_PORT=1433

// config/terminal.json
{
  "posNo": "001",
  "printer": {
    "type": "serial",
    "port": "COM1",
    "bps": 9600
  }
}

// config/index.js
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const terminal = JSON.parse(fs.readFileSync('./config/terminal.json', 'utf8'));

export default {
    database: {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT)
    },
    terminal
};
```

**장점**:

- `.env` 파일은 Git에서 제외 (민감정보 보호)
- JSON은 구조화된 설정
- 타입 안정성 (TypeScript 사용 시)

---

### 7.3 하드웨어 통신 → Web API + 드라이버

**VB6 시리얼 통신 (MSComm)**:

```vb
.MSComm1.CommPort = Terminal.ScanPort
.MSComm1.settings = "9600,N,8,1"
.MSComm1.PortOpen = True
```

**현대 스택 옵션**:

#### (1) Node.js serialport

```javascript
import { SerialPort } from "serialport";

const scanner = new SerialPort({
  path: "/dev/ttyS0", // Linux
  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
});

scanner.on("data", (data) => {
  console.log("Scanned:", data.toString());
  // WebSocket으로 브라우저에 전송
  io.emit("barcode", data.toString());
});
```

#### (2) Web Serial API (브라우저)

```javascript
// 사용자 권한 요청 필요
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 9600 });

const reader = port.readable.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log("Scanned:", new TextDecoder().decode(value));
}
```

**주의**:

- Web Serial API는 HTTPS 필수
- 키오스크 환경에서는 Node.js + WebSocket 권장

---

### 7.4 프린터 → ESC/POS + 클라우드 인쇄

**VB6 병렬 포트**:

```vb
Result = GetPortVal(Val("&H379"), PortVal, 1)
If Mid(CStr(Hex(LowByte(PortVal))), 1, 1) = "D" Then
    Printer_Check = True
End If
```

**현대 스택**:

#### (1) USB 프린터 (node-escpos)

```javascript
import escpos from "escpos";

const device = new escpos.USB();
const printer = new escpos.Printer(device);

device.open(() => {
  printer
    .font("a")
    .align("ct")
    .style("bu")
    .size(1, 1)
    .text("영수증")
    .text("합계: 10,000원")
    .cut()
    .close();
});
```

#### (2) 네트워크 프린터

```javascript
const device = new escpos.Network("192.168.1.100", 9100);
```

#### (3) 클라우드 인쇄 (Star CloudPRNT)

```javascript
await fetch('https://printer.example.com/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        printerMac: '00:11:62:XX:XX:XX',
        receipt: {
            items: [...],
            total: 10000
        }
    })
});
```

---

### 7.5 그리드 → Vue 3 + AG-Grid

**VB6 VSFlexGrid**:

```vb
Public Sub ps_fgInit(fgTEMP As VSFlexGrid, Optional iCNT As Integer = 0)
    With fgTEMP
        .Appearance = flexFlat
        .ScrollBars = flexScrollBarBoth
        .FocusRect = flexFocusNone
        .HighLight = flexHighlightAlways
        .Editable = flexEDNone
        .AllowBigSelection = False
        .AllowUserResizing = flexResizeNone
        .SelectionMode = flexSelectionByRow
        .RowHeight(0) = 400
        .RowHeightMin = 320
        .ColWidthMin = 300
    End With
End Sub
```

**Vue 3 + AG-Grid**:

```vue
<script setup>
import { AgGridVue } from "ag-grid-vue3";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const gridOptions = {
  columnDefs: [
    { field: "barcode", headerName: "바코드", width: 150 },
    { field: "name", headerName: "상품명", width: 300 },
    { field: "price", headerName: "가격", width: 100, type: "numericColumn" },
  ],
  defaultColDef: {
    resizable: false,
    sortable: false,
    editable: false,
    suppressMovable: true,
  },
  rowSelection: "single",
  rowHeight: 40,
  headerHeight: 50,
  suppressHorizontalScroll: false,
};
</script>

<template>
  <ag-grid-vue
    class="ag-theme-alpine"
    style="width: 100%; height: 500px;"
    :columnDefs="gridOptions.columnDefs"
    :defaultColDef="gridOptions.defaultColDef"
    :rowData="salesItems"
    :rowSelection="gridOptions.rowSelection"
  />
</template>
```

**장점**:

- 반응형 UI
- 가상 스크롤 (대량 데이터)
- 필터/정렬 내장

---

### 7.6 음성 재생 → Web Audio API

**VB6 MMControl**:

```vb
Frm_SaleMain.MMControl.Command = "Close"
Frm_SaleMain.MMControl.FileName = Wav_File
Frm_SaleMain.MMControl.Command = "Open"
Frm_SaleMain.MMControl.Command = "Play"
```

**JavaScript (HTML5 Audio)**:

```javascript
const audio = new Audio("/media/barcode-beep.wav");
audio.play().catch((err) => console.error("Audio play failed:", err));
```

**Vue 3 Composable**:

```javascript
// composables/useSound.js
import { ref } from 'vue';

export function useSound() {
    const audioCache = new Map();

    const playSound = (filename) => {
        let audio = audioCache.get(filename);
        if (!audio) {
            audio = new Audio(`/media/${filename}`);
            audioCache.set(filename, audio);
        }
        audio.currentTime = 0;
        audio.play();
    };

    return { playSound };
}

// 사용
<script setup>
import { useSound } from '@/composables/useSound';
const { playSound } = useSound();

function onBarcodeScanned() {
    playSound('barcode-beep.wav');
}
</script>
```

---

### 7.7 로그 → Winston + 구조화 로깅

**VB6 로그**:

```vb
Public Sub Error_Log(sDate As String, Form_Name As String, ...)
    err_str = "판매날짜 : " & sDate & vbCrLf
    err_str = err_str + "Form_Name : " & Form_Name & vbCrLf
    F.WriteLine err_str
End Sub
```

**Winston (Node.js)**:

```javascript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "pos-kiosk" },
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// 사용
logger.error("결제 실패", {
  saleDate: "2026-01-29",
  formName: "SaleMain",
  event: "onPaymentClick",
  errorCode: err.code,
  errorMessage: err.message,
  param1: "CardPrice=10000",
  param2: "JeonPyo=202601290001",
});
```

**구조화된 로그 예시**:

```json
{
  "timestamp": "2026-01-29T14:23:45.123Z",
  "level": "error",
  "service": "pos-kiosk",
  "saleDate": "2026-01-29",
  "formName": "SaleMain",
  "event": "onPaymentClick",
  "errorCode": "E_CARD_TIMEOUT",
  "errorMessage": "카드 승인 타임아웃",
  "param1": "CardPrice=10000",
  "param2": "JeonPyo=202601290001",
  "stack": "Error: 카드 승인 타임아웃\n at CardService.approve..."
}
```

**장점**:

- 로그 검색/분석 용이
- ELK Stack (Elasticsearch + Logstash + Kibana) 연동 가능
- 타임스탬프 자동 추가

---

### 7.8 UPSS 연동 → REST API

**VB6 (Access DB)**:

```vb
Set UPSS_DB = New ADODB.Connection
If MDBConnect_DB(UPSS_DB, UPSS_MDB_Path, UPSS_MDB_Pass) = False Then
    Exit Function
End If

SQL = "SELECT TOP 1 * FROM UPSS_REPORT WHERE Brcd = '" & sbarcode & "' ..."
Set UPSS_RS = UPSS_DB.Execute(SQL)
```

**현대 스택 (REST API)**:

```javascript
// server.js (Express)
app.get('/api/upss/check/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;

        const result = await db.query(`
            SELECT TOP 1 *
            FROM UPSS_REPORT
            WHERE Brcd = @barcode
              AND Dspth_Yn = 'Y'
              AND Managt_Cd <> '1'
            ORDER BY Doc_No DESC, Doc_Seq DESC
        `, { barcode });

        if (result.recordset.length > 0) {
            res.json({
                isRecalled: true,
                data: result.recordset[0]
            });
        } else {
            res.json({ isRecalled: false });
        }
    } catch (err) {
        logger.error('UPSS 조회 실패', { error: err });
        res.status(500).json({ error: 'UPSS 조회 실패' });
    }
});

// client (Vue 3)
<script setup>
import { ref } from 'vue';
import axios from 'axios';

const checkUPSS = async (barcode) => {
    try {
        const { data } = await axios.get(`/api/upss/check/${barcode}`);

        if (data.isRecalled) {
            // 모달 표시
            showRecallDialog(data.data);
        }
    } catch (err) {
        console.error('UPSS 체크 실패:', err);
    }
};
</script>
```

---

### 7.9 신호등 → WebSocket + IoT

**VB6 USB I/O**:

```vb
Result = usb_io_output(SelectID, 0, 5, 0, 0, 0)  ' 녹색
```

**현대 스택 (Node.js + Johnny-Five)**:

```javascript
// server.js (Node.js)
import { Board, Led } from 'johnny-five';
import { Server } from 'socket.io';

const board = new Board();

board.on('ready', () => {
    const greenLED = new Led(13);
    const yellowLED = new Led(12);
    const redLED = new Led(11);

    io.on('connection', (socket) => {
        socket.on('signal', (index) => {
            switch (index) {
                case 0: // 정상작동
                    redLED.off();
                    yellowLED.off();
                    greenLED.on();
                    break;
                case 1: // 직원호출
                    greenLED.off();
                    redLED.off();
                    yellowLED.blink(500);
                    break;
                case 2: // 관리자호출
                    greenLED.off();
                    yellowLED.off();
                    redLED.on();
                    // 부저 울리기
                    buzzer.play({ song: 'C4 D4 E4' });
                    break;
            }
        });
    });
});

// client (Vue 3)
<script setup>
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

function callStaff() {
    socket.emit('signal', 1);  // 노란불
}

function callAdmin() {
    socket.emit('signal', 2);  // 빨간불 + 부저
}
</script>
```

**장점**:

- WebSocket으로 실시간 제어
- 웹 기반으로 원격 모니터링 가능

---

### 7.10 전역 변수 → Pinia Store

**VB6 전역 변수**:

```vb
Public sGridColFile As String
Public sGridFile As String
Public sGoods(5) As String
```

**Vue 3 + Pinia**:

```javascript
// stores/grid.js
import { defineStore } from "pinia";

export const useGridStore = defineStore("grid", {
  state: () => ({
    colFile: "",
    file: "",
    goods: Array(5).fill(""),
  }),
  actions: {
    setColFile(value) {
      this.colFile = value;
    },
    loadGridSizes(gridName) {
      const config = JSON.parse(localStorage.getItem(`grid_${gridName}`));
      return config || this.getDefaultSizes(gridName);
    },
    saveGridSizes(gridName, sizes) {
      localStorage.setItem(`grid_${gridName}`, JSON.stringify(sizes));
    },
  },
});

// 사용
<script setup>
  import {useGridStore} from '@/stores/grid'; const gridStore = useGridStore(); const gridSizes =
  gridStore.loadGridSizes('NewGrid_Sale_Touch');
</script>;
```

---

## 8. 결론

Mdl_Function.bas는 POSON POS 시스템의 **유틸리티 함수 라이브러리**로, 약 78개의 Public 함수/프로시저를 제공합니다. 주요 특징:

1. **다양한 기능**: 파일 I/O, UI 제어, 하드웨어 통신, 데이터 변환, 로깅
2. **하드웨어 의존성**: MSComm, WinIO, USB I/O 등 레거시 기술 사용
3. **VB6 스타일**: COM 객체, Windows API, ActiveX 컨트롤
4. **외부 연동**: TIPS 서버, UPSS, 원격 지원, GS 주차

마이그레이션 시 고려사항:

- **하드웨어 통신**: serialport (Node.js) 또는 Web Serial API로 대체
- **파일 시스템**: fs/promises, dotenv, JSON 설정
- **UI 컨트롤**: Vue 3 + AG-Grid, HTML5 Audio
- **로깅**: Winston으로 구조화된 로그
- **상태 관리**: Pinia Store로 전역 변수 대체
- **외부 연동**: REST API, WebSocket

**다음 분석 파일**: [DBConnection.bas.md](./DBConnection.bas.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
