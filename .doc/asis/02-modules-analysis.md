# 모듈(.bas) 파일 분석

## 1. 모듈 파일 목록 (26개)

| 파일명                  | 라인 수 | 주요 역할                       | 중요도 |
| ----------------------- | ------- | ------------------------------- | ------ |
| **Mdl_Main.bas**        | ~8,500  | 전역 변수, 타입 정의, 핵심 상수 | ★★★★★  |
| **Mdl_Function.bas**    | ~4,100  | 공통 유틸리티 함수              | ★★★★★  |
| **Mdl_Printer.bas**     | ~12,500 | 영수증/라벨 프린터 출력         | ★★★★☆  |
| **Mdl_Card_Dll.bas**    | ~2,300  | VAN 결제 DLL 선언               | ★★★★☆  |
| **DBConnection.bas**    | ~320    | DB 연결 관리                    | ★★★★★  |
| Mdl_API.bas             | ~210    | Windows API 선언                | ★★★☆☆  |
| Mdl_OPOS_Function.bas   | ~850    | OPOS 프린터 제어                | ★★★☆☆  |
| Mdl_Create_Table.bas    | ~600    | 테이블 생성 스크립트            | ★★☆☆☆  |
| Mdl_QRMS.bas            | ~460    | QR 코드 관련                    | ★★☆☆☆  |
| Mdl_Push_SMS.bas        | ~280    | SMS/Push 발송                   | ★★★☆☆  |
| Mdl_Regedit.bas         | ~35     | 레지스트리 접근                 | ★☆☆☆☆  |
| Mdl_SendKey.bas         | ~49     | 키보드 이벤트 전송              | ★☆☆☆☆  |
| Mdl_VCAT_Msg.bas        | ~820    | VCAT 단말기 메시지              | ★★★☆☆  |
| Main.bas                | ~57     | 프로그램 진입점                 | ★★★★★  |
| basCommon.bas           | ~210    | 공통 함수                       | ★★☆☆☆  |
| MDI_Kakao.bas           | ~200    | 카카오 알림톡 연동              | ★★★☆☆  |
| mdl_Kiosk.bas           | ~165    | 키오스크 전용 함수              | ★★★☆☆  |
| Dual_API.bas            | ~280    | 듀얼 모니터 API                 | ★★☆☆☆  |
| Code_Decode.bas         | ~31     | 인코딩/디코딩                   | ★☆☆☆☆  |
| JSON.bas                | ~450    | JSON 파싱                       | ★★★☆☆  |
| slock.bas               | ~53     | 보안 락                         | ★★☆☆☆  |
| mega.bas                | ~230    | 저울 연동                       | ★★☆☆☆  |
| mega_856E.bas           | ~330    | 저울 연동 (856E 모델)           | ★★☆☆☆  |
| basWENET_winhttp.bas    | ~140    | WinHTTP 통신                    | ★★★☆☆  |
| bas_StringEncrypter.bas | ~23     | 문자열 암호화                   | ★★☆☆☆  |
| mdKeyBoard.bas          | ~285    | 키보드 후킹                     | ★★☆☆☆  |

## 2. 핵심 모듈 상세 분석

### 2.1 Main.bas - 프로그램 진입점

```vb
' 위치: prev_kiosk/POSON_POS_SELF21/Main.bas
' 라인: 57줄
' 역할: 프로그램 시작점, 초기화

' 주요 상수
Public Const Enterprise = "(주)문도데일리시스템"

' 전역 변수
Public User_Name As String  ' 판매자 명
Public SIniFile As String   ' INI파일 경로

' 진입점
Sub Main()
    ' 중복 실행 체크
    If App.PrevInstance Then Exit

    ' INI 파일 경로 설정
    SIniFile = App.Path & "\Config.ini"

    ' DB 연결 (SQL Server → Access 폴백)
    If adoConnectDB(DBcon) = False Then
        If MDBConnect_DB(DBcon1, C_DBPath, C_Pass) = False Then
            ' 연결 실패 처리
        End If
    End If

    ' 로그인 화면 표시
    Frm_Login.Show vbModal
End Sub
```

### 2.2 DBConnection.bas - 데이터베이스 연결

```vb
' 위치: prev_kiosk/POSON_POS_SELF21/DBConnection.bas
' 라인: 326줄
' 역할: DB 연결 관리

' SQL Server 연결 함수
Public Function AdoConnectDB(
    ByVal sDB As ADODB.Connection,
    ByVal USERID As String,
    ByVal sPass As String,
    ByVal sIP As String,
    ByVal sPort As String,
    ByVal DB_Name As String,
    ByRef Er_Str As String
) As Boolean
    ' Provider: SQLOLEDB
    ' 연결 타임아웃: 5초
    ' 커서 위치: Client-side

    sDB.Open "Provider=SQLOLEDB;Data Source=" & sIP & sPort & _
             ";Initial Catalog=" & DB_Name & _
             ";User Id=" & USERID & ";Password=" & sPass & ";"
End Function

' Access MDB 연결 함수
Public Function MDBConnect_DB(
    ByVal DB As ADODB.Connection,
    ByVal DbNm$,
    Optional ByVal PassWd$
) As Boolean
    ' Provider: Microsoft.Jet.OLEDB.4.0
    ' MSDataShape 사용
End Function

' 트랜잭션 로그 관리
Public Sub Tran_Log_Write(Query, Fail_Date, Gubun)
    ' 로그 파일: \Tran_Log\Trans_List.Log
    ' 실패한 쿼리 저장 및 재시도 메커니즘
End Sub
```

### 2.3 Mdl_Main.bas - 전역 상태 관리

```vb
' 위치: prev_kiosk/POSON_POS_SELF21/Mdl_Main.bas
' 라인: ~8,500줄
' 역할: 전역 변수, 타입 정의, 핵심 상수

'========================================
' 상수 정의
'========================================
Public Const Enterprise = "(주)데일리테크POS"
Public Const S_Pass_CARD = "ABC9730357"  ' 보안 비밀번호
Public Const S_masterKey = "xodlfvhtm1705"

'========================================
' 전역 DB 연결 객체
'========================================
Public DBCON As ADODB.Connection   ' SQL Server
Public DBCON1 As ADODB.Connection  ' Access
Public rs As ADODB.Recordset
Public Tran_DB As ADODB.Connection ' 트랜잭션 DB

'========================================
' 전역 상태 변수
'========================================
Public SQL As String
Public DB_TRAN As Integer      ' 트랜잭션 상태 (0:미시작, 1:진행중)
Public Connect_Gubun As Integer ' DB 연결 구분

'========================================
' 타입 정의 - 로그인 정보
'========================================
Type Login
    name As String       ' 판매자명
    id As String        ' 판매자 ID
    Pass As String      ' 비밀번호
    OpenNum As String   ' 개점번호
    Grant() As String   ' 권한 배열 (18개 항목)
    Admin_Gubun As String ' 관리자 구분 (0:일반, 1:관리자)
End Type

'========================================
' 타입 정의 - DB 설정
'========================================
Type DB
    Type As Integer     ' 타입
    name As String      ' 사용자명
    Pass As String      ' 비밀번호
    IP As String        ' 서버 IP
    Port As String      ' 포트
    DataBase As String  ' DB명
    Server_Type As String ' 0:SQL Server, 1:LocalDB
End Type

'========================================
' 타입 정의 - 매장 정보
'========================================
Type Shop
    Ver As String       ' 버전
    Code As String      ' 매장 코드
    name As String      ' 상호명
    Number As String    ' 사업자 번호
    Address As String   ' 주소
    Owner As String     ' 대표자
    Tel As String       ' 전화번호
    Top1~5 As String    ' 영수증 상단 메시지
    Buttom1~5 As String ' 영수증 하단 메시지
    MEM1~3 As String    ' 회원 판매 메시지
    ' ... 50+ 추가 필드
End Type

'========================================
' 타입 정의 - 터미널 설정
'========================================
Type Terminal
    Type As Integer         ' 단말기 타입
    PosNo As String * 2     ' POS 번호
    AdminPosNo As String    ' 관리 POS 번호
    CashDraw As Integer     ' 서랍 사용
    Touch As Integer        ' 터치 사용
    Dual As Integer         ' 듀얼 모니터
    Printer As Integer      ' 프린터 종류
    PrinterPort As Integer  ' 프린터 포트
    PrinterBps As Long      ' 프린터 전송속도
    ScanPort As Integer     ' 스캐너 포트
    CDPPort As Integer      ' CDP 포트
    MSR_PORT As Integer     ' MSR 포트
    ' ... 30+ 추가 필드
End Type

'========================================
' 타입 정의 - POS 환경설정
'========================================
Type C_Config
    Price_Edit As Integer       ' 가격 수정 허용
    Err_Write As Integer        ' 에러 로그 기록
    Product_CashOpen As Integer ' 서랍 자동 열림
    Product_Sound As Integer    ' 상품 소리
    HyeonGeumPrice As String    ' 최대 금액 제한
    ' ... 100+ 추가 필드
End Type

'========================================
' 타입 정의 - 상품 정보
'========================================
Type Product
    CODE As String      ' 상품 코드
    name As String      ' 상품명
    Barcode As String   ' 바코드
    Dnaga As String     ' 단가
    Price As String     ' 가격
    Cnt As String       ' 수량
    ' ... 20+ 추가 필드
End Type
```

### 2.4 Mdl_Function.bas - 공통 유틸리티

```vb
' 위치: prev_kiosk/POSON_POS_SELF21/Mdl_Function.bas
' 라인: ~4,100줄
' 역할: 공통 유틸리티 함수

'========================================
' Windows API 선언
'========================================
' INI 파일 읽기/쓰기
Public Declare Function WritePrivateProfileString Lib "kernel32" ...
Public Declare Function GetPrivateProfileString Lib "kernel32" ...

' 타이머
Public Declare Function SetTimer Lib "user32" ...
Public Declare Function KillTimer Lib "user32" ...

' USB I/O (현관문 제어)
Declare Function usb_io_init Lib "uio32.dll" ...
Declare Function usb_io_output Lib "uio32.dll" ...

'========================================
' UI 관련 함수
'========================================
' 텍스트 전체 선택
Public Sub TXT_SelectAll(txt_name As Control)

' 그리드 컬럼 크기 설정
Public Sub subColSize_Set(sGubun, iCol, lDefault, sGridName, VSFlex)

' 그리드 컬럼 숨김 처리
Public Sub Grid_Col_Hidden_Refresh(VsGrid, sec_name)

' VSFlexGrid 초기화
Public Sub ps_fgInit(fgTEMP As VSFlexGrid, Optional iCNT)

' 버튼 라운딩
Public Sub Button_Rounding(Control_Name As Control)

' 폼 라운딩
Public Sub Form_Rounding(Form_Name As Form)

'========================================
' 시리얼 통신 함수
'========================================
' CDP (고객표시기) 열기
Public Function CDP_MSCOMM_Open() As Boolean

' 스캐너 열기
Public Function SCAN_MSCOMM_Open() As Boolean

' 핸드 스캐너 열기
Public Function SCAN_HandMSCOMM_Open() As Boolean

' MSR 리더기 열기
Public Function MSR_MSCOMM_Open() As Boolean

'========================================
' 회원 관련 함수
'========================================
' 회원 할인 가격 계산
Public Function MEM_SalePrice(Sale_Date, P_Price, BARCODE, Cus_Class)
    ' 일괄할인 / 개별품목 할인 처리
    ' 회원 등급별 (일반/실버/골드/VIP/기타) 가격 적용
End Function

' 회원 생일 포인트 추가
Public Function MEM_PointADD(Sale_Date, Bir_Date, MEMCode, toPrice)

'========================================
' 기타 유틸리티
'========================================
' 프로그램 재시작
Public Sub reStarting_PG(ByVal PG_Name As String)

' 미디어 플레이어 크기 조정
Public Sub Player_Size(Cnt As Integer)
```

### 2.5 Mdl_Card_Dll.bas - VAN 결제 DLL 선언

```vb
' 위치: prev_kiosk/POSON_POS_SELF21/Mdl_Card_Dll.bas
' 라인: ~2,300줄
' 역할: 12개 VAN사 DLL/함수 선언

'========================================
' NICE VAN
'========================================
Public Declare Function Pos_Send Lib "NicePosV205.dll" (
    ByRef strNiceIP As Byte,
    ByVal lngNicePort As Long,
    ByRef strSendData As Byte,
    ByRef strSendSignData As Byte,
    ByRef strReceveData As Byte
) As Long

'========================================
' KIS VAN
'========================================
Public Declare Function VB_Kis_Approval Lib "KisCatSSL.dll" (
    ByRef SendData As Byte,
    ByVal SendLen As Long,
    ByVal signGubun As String,
    ByRef imgData As Byte,
    ByVal imgSize As Long,
    ByRef RecvData As Byte
) As Long

Public Declare Function VB_Kis_RuleDownload Lib "KisCatSSL.dll" ...

'========================================
' KSNET VAN
'========================================
Public Declare Function ReqAppr Lib "KSNet_ADSL.dll" Alias "RequestApproval" (
    ByVal ipAddr As String,
    ByVal sPort As Integer,
    ByVal sMedia As Integer,
    ByVal RequestMsg As String,
    ByVal RequestLen As Integer,
    ByVal sRecvMsg As String,
    ByVal TimeOut As Integer,
    ByVal options As Integer
) As Long

'========================================
' SMARTRO VAN
'========================================
Public Declare Function SMT_B_ConnSndRcv Lib "SmartroSign.dll" ...
Public Declare Function SMT_Dongle_Initial Lib "SmartroSign.dll" ...
Public Declare Function SMT_Get_Sign_Screen Lib "SmartroSign.dll" ...
Public Declare Function SMT_Keypad_Input Lib "SmartroSign.dll" ...

' T-money 연동
Public Declare Function SMT_TMoney_Balance Lib "SmartroSign.dll" ...
Public Declare Function SMT_TMoney_Pay Lib "SmartroSign.dll" ...

' CashBee 연동
Public Declare Function SMT_CashBee_Balance Lib "SmartroSign.dll" ...
Public Declare Function SMT_CashBee_Pay Lib "SmartroSign.dll" ...

'========================================
' FDIK (KMPS) VAN
'========================================
Public Declare Function FDIK_CreditAuth_Simple Lib "fdikpos43.dll" ...
Public Declare Function FDIK_CreditCancel_Simple Lib "fdikpos43.dll" ...
Public Declare Function FDIK_OCBSave_Simple Lib "fdikpos43.dll" ...
Public Declare Function FDIK_CashReceiptAuth Lib "fdikpos43.dll" ...

'========================================
' JTNET VAN
'========================================
Public Declare Function NCPAD_SIGN Lib "JTNetSPL.dll" ...
Public Declare Function NCPAD_PIN Lib "JTNetSPL.dll" ...
Public Declare Function DataProcess Lib "NCPOS.dll" ...
Public Declare Function cryptCard Lib "NCPOS.dll" ...

'========================================
' KICC VAN
'========================================
' KiccDSC.ocx, Kicc.dll 사용
' KReqSign, KReqSignA 함수

'========================================
' 기타 VAN (KCP, KOCES, KOVAN, SPC)
'========================================
' 각 VAN별 OCX 컨트롤 사용
```

### 2.6 Mdl_Printer.bas - 영수증/라벨 출력

```vb
' 위치: prev_kiosk/POSON_POS_SELF21/Mdl_Printer.bas
' 라인: ~12,500줄
' 역할: 영수증, 라벨, 바코드 출력

'========================================
' 영수증 출력 관련
'========================================
' 타이틀 출력 (영수증 헤더)
Public Sub Print_Title(ByVal F_Num As Integer)
    ' 0: 영수증, 1: 외상 영수증, 2: 반품 영수증
    ' 13: 카드 매출 전표, 14: 카드 취소 전표
    ' 15: 현금영수증 발행, 16: 현금영수증 취소
    ' 30: 주방주문서 ...
End Sub

' 헤더 출력 (매장 정보)
Public Sub Print_Header(sDate, STime)
    ' 상호명, 사업자번호, 주소, 대표자, 전화번호
End Sub

' 상단 메시지 출력
Public Sub Print_Top()

' 전표번호 출력
Public Sub Print_Jeonpyo(ByVal JeonPyo As String)

' 상품 내역 출력
Public Sub Print_Detail(PrintLine As Integer)
    ' 1줄/2줄 출력 옵션
    ' 품명, 단가, 수량, 금액

' 합계 출력
Public Sub Print_Total()

' 결제 정보 출력
Public Sub Print_PayInfo()

' 하단 메시지 출력
Public Sub Print_Bottom()

'========================================
' 프린터 제어 함수
'========================================
' ESC/POS 명령어
Public Function Prn_Align(iAlign As Integer) As String
    ' 0: 좌측, 1: 중앙, 2: 우측
End Function

Public Function Prn_FontSize(iSize As Integer) As String
    ' 폰트 크기 설정

Public Function Prn_Cut() As String
    ' 용지 절단

Public Function Prn_CashDraw() As String
    ' 현금 서랍 열기

'========================================
' 바코드 라벨 출력
'========================================
' 지원 프린터: TTP-243, SRP-770, LK-B30, LK-P30 등
Public Sub BarCodePrint_TTP243(...)
Public Sub BarCodePrint_SRP770(...)
Public Sub BarCodePrint_LKB30(...)
```

## 3. 모듈 간 의존성

```
Main.bas
    └── DBConnection.bas (DB 연결)
        └── Mdl_Main.bas (전역 타입/변수)
            ├── Mdl_Function.bas (유틸리티)
            ├── Mdl_Card_Dll.bas (결제 DLL)
            ├── Mdl_Printer.bas (출력)
            └── 기타 모듈들
```

## 4. 마이그레이션 시 고려사항

### 4.1 Mdl_Main.bas

- **전역 상태 → 싱글톤 서비스/Store**: Pinia 또는 Context로 전환
- **타입 정의 → TypeScript Interface**: Login, Shop, Terminal 등
- **상수 → 환경 변수**: 보안 키, 서버 정보

### 4.2 DBConnection.bas

- **ADODB → Node.js mssql**: SQL Server 연결
- **Access MDB → 제거 또는 SQLite**: 로컬 백업용
- **트랜잭션 로그 → Winston 로거**: 구조화된 로깅

### 4.3 Mdl_Function.bas

- **Windows API → Node.js 네이티브**: INI 파일 → JSON 설정
- **MSComm → SerialPort 패키지**: 시리얼 통신
- **회원 함수 → Service Layer**: 비즈니스 로직 분리

### 4.4 Mdl_Card_Dll.bas

- **DLL 호출 → REST API**: VAN사 API 연동
- **서명패드 → 웹 Canvas**: 전자서명
- **Strategy Pattern 적용**: VAN별 구현 분리
