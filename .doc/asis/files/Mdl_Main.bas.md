# Mdl_Main.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Mdl_Main.bas`
**파일 크기**: 337KB (7,624 lines)
**역할**: 전역 변수, 타입 정의, 환경설정 관리
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [전역 변수 및 상수](#2-전역-변수-및-상수)
3. [Type 정의 목록](#3-type-정의-목록)
4. [함수 목록](#4-함수-목록)
5. [주요 함수 상세 분석](#5-주요-함수-상세-분석)
6. [DB 연결 객체](#6-db-연결-객체)
7. [호출 관계 및 의존성](#7-호출-관계-및-의존성)
8. [마이그레이션 고려사항](#8-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

POSON POS 시스템의 핵심 모듈로, 전역 변수, 타입 정의, 환경설정 로직을 담당합니다.

### 1.2 주요 역할

- **전역 변수 관리**: 200개 이상의 Public 변수 선언
- **Type 정의**: 17개의 사용자 정의 타입 (Login, DB, Shop, Terminal 등)
- **환경설정 로드**: S_Config_Call() - DB에서 설정 읽기
- **라이선스 검증**: SKey_App() - 제품 키 인증

### 1.3 파일 특징

- **초대형 모듈**: 7,624 라인 (VB6 프로젝트에서 가장 큰 파일)
- **중앙 저장소**: 모든 폼과 모듈이 참조하는 전역 데이터 허브
- **설정 중심**: 200개 이상의 설정 옵션 관리

---

## 2. 전역 변수 및 상수

### 2.1 상수

```vb
Public Const Enterprise = "(주)천도시스템"
Public Const S_Pass_CARD = "ABC9730357"     ' 1.3.33 카드 패스워드
Public Const S_masterKey = "xodlfvhtm1705"  ' 마스터 키
```

**용도**:

- `Enterprise`: 회사명 표시 (에러 메시지, MsgBox 타이틀)
- `S_Pass_CARD`: 카드 결제 인증 키
- `S_masterKey`: 시스템 마스터 키 (암호화/복호화)

### 2.2 DB 연결 객체

```vb
Public DBCON As ADODB.Connection   ' SQL Server 연결
Public DBCON1 As ADODB.Connection  ' Access DB 연결
Public rs As ADODB.Recordset       ' 공용 레코드셋
Public Tran_DB As ADODB.Connection ' 트랜잭션 전용 연결
```

**사용 패턴**:

```vb
' SQL Server 우선, 실패 시 Access DB
If adoConnectDB(DBCON) = False Then
    MDBConnect_DB(DBCON1, C_DBPath, C_Pass)
End If
```

### 2.3 주요 전역 변수 (선별)

#### 2.3.1 판매 관련

```vb
Public P_SaleDate As String        ' 판매일자
Public P_Date As String            ' 전표일자
Public P_Time As String            ' 전표시간
Public SAD_Table As String         ' 판매 테이블명
Public SAT_Table As String         ' 판매 테이블명
```

#### 2.3.2 스캐너 및 입력장치

```vb
Public Scan_Type As Integer        ' 스캔 타입 (0:판매, 1:반품확인, 2:대표상품...)
Public Scan_Chk As Boolean         ' 현재 스캔중 체크
Public PScan_Chk As Boolean        ' 시스템 메시지창 떠있을 때 스캔 금지
```

#### 2.3.3 화면 및 UI

```vb
Public Sl_Width As Long            ' 그리드뷰 폭 Width(픽셀)
Public Sl_Height As Long           ' 그리드뷰 높이 Height(픽셀)
Public Dual_Chk As Boolean         ' 듀얼 모니터 체크
Public Dual_Size As Integer        ' 듀얼 모니터 해상도(0:최대크기,1:기본크기)
```

#### 2.3.4 결제 관련

```vb
Public Card_Sql As String          ' 카드 승인시 사용 쿼리문
Public Tax_Sql As String           ' 현금 영수증 승인시 사용 쿼리문
Public CashBag_Sql As String       ' 캐시백 승인시 사용 쿼리문
Public CashBag_Sql1 As String      ' 원카드 캐시백 승인시 사용 쿼리문
```

#### 2.3.5 회원 관련

```vb
Public MEM_Gubun As Integer        ' 0:판매(회원검색), 1:적립(캐시백포인트), 2:현금영수증(단순), 3:e-coupon, 4:부여회원검색, 5:전표재발행검색
Public MEM_Input As String         ' [회원번호입력] 입력값
Public bMEM_Check As Boolean       ' x.3.20-3 회원 체크
```

#### 2.3.6 반품 관련

```vb
Public Return_Chk As Boolean       ' 대표상품 체크 여부
Public Return_Gubun As Boolean     ' 대표상품 구분(false:적립금,true:대표상품)
Public Return_Call As Boolean      ' 대표상품 판매호출여부
```

#### 2.3.7 셀프 POS 관련 (x.4.45 이후)

```vb
Public sSelfCard_Gubun As String           ' 셀프결제 카드(1:IC카드, 2:앱카드)
Public sSelfCard_SoundGubun As String      ' 벨이거나 셀프결제(1:IC카드, 2:무통장입금)
Public bSelfPrint_YN As Boolean            ' x.4.45 셀프프린트 출력여부
Public SelfINI_Path As String              ' x.4.45 셀프설정 경로
```

#### 2.3.8 UPSS (중고상품 판매관리) - NEW_x.0.1

```vb
Public objUPSS As Object                   ' 중고상품 판매관리(UPSSClient.dll)
Public UPSS_DATA(10) As String
Public UPSS_rtn As Integer
Public UPSS_qty As Long
Public UPSS_qty_unit As String
```

#### 2.3.9 기타 플래그

```vb
Public DB_TRAN As Integer          ' 트랜잭션 확인 변수(0:트랜잭션 시작안됨,1:트랜잭션 시작됨)
Public Connect_Gubun As Integer    ' DB연결 구분
Public Lucky_YN As Boolean         ' 행운권 당첨여부
Public Edit_Mode As Boolean        ' 2009-07-20 상품 수정모드 여부
```

---

## 3. Type 정의 목록

### 3.1 Type 정의 개요

| Type 명             | 라인 수   | 필드 수 | 역할                     |
| ------------------- | --------- | ------- | ------------------------ |
| **Login**           | 288-319   | 9       | 판매자 정보 및 권한      |
| **DB**              | 322-331   | 7       | 데이터베이스 연결 정보   |
| **Shop**            | 334-408   | 50+     | POS 점포 정보            |
| **Terminal**        | 411-484   | 35+     | 단말기 설정              |
| **C_Config**        | 487-791   | 100+    | 클라이언트 환경설정      |
| **S_Config**        | 794-1093  | 150+    | 서버 환경설정            |
| **Points**          | 1097-1119 | 20      | 포인트 설정              |
| **Member**          | 1122-1136 | 7       | 회원번호 자릿수 정의     |
| **ScaleCode**       | 1139-1143 | 2       | 저울 코드                |
| **VAN**             | 1145-1174 | 15      | VAN 결제 정보            |
| **Cash**            | 1177-1188 | 9       | 현금영수증               |
| **Card**            | 1191-1213 | 15      | 신용카드                 |
| **OK1**             | 1216-1230 | 11      | 캐시백 (원카드)          |
| **OK**              | 1233-1247 | 10      | 캐시백                   |
| **Product**         | 1250-1289 | 30+     | 상품 및 판매 정보        |
| **Others**          | 1292-1295 | 2       | 기타 설정                |
| **Trans**           | 1300-1308 | 7       | 회원사 연동              |
| **QRMS**            | 1311-1317 | 5       | QR 코드 인쇄             |
| **MCard**           | 1321-1339 | 12      | 복수 카드 결제 (x.4.37)  |
| **Card_OrgData**    | 1363-1377 | 9       | 카드 원본 데이터         |
| **Cash_OrgData**    | 1379-1393 | 9       | 현금 원본 데이터         |
| **CashBag_OrgData** | 1395-1406 | 8       | 캐시백 원본 데이터       |
| **VCAT**            | 1414-1452 | 20+     | VAN CAT 설정             |
| **STL**             | 1459-1461 | 1       | 셀프 스탠드 라이트       |
| **AutoBag**         | 1468-1477 | 7       | 자동봉투기 (x.4.45)      |
| **DataCashInfo**    | 1480-1500 | 18      | 자동현금기 정보 (x.4.49) |

### 3.2 주요 Type 상세 분석

#### 3.2.1 Login Type

```vb
Type Login
    name As String            ' 판매자명
    id As String              ' 판매자 아이디
    Pass As String            ' 판매자 비밀번호
    OpenNum As String         ' 오픈번호
    Grant() As String         ' 권한별 사용(배열 0-17)
    SALEMENU_PWD As String    ' x.3.2 판매메뉴 비밀번호
    SALEMENU_USE As String    ' 판매메뉴 사용여부
    Admin_Gubun As String     ' 관리자구분(0:일반,1:관리자)
End Type
```

**Grant 배열 인덱스**:

```
(0)  정가변경/할인금액 사용
(1)  전체취소 사용
(2)  단품상품 사용
(3)  세트상품 사용
(4)  대표상품 사용
(5)  금액직접 사용
(6)  상품% 할인 사용
(7)  상품전% 할인 사용
(8)  소계직접 사용
(9)  상품 단가변경 사용
(10) 외상입금 사용
(11) 외상정산 사용
(12) 현금외상입금 사용
(13) 카드외상입금 사용
(14) 임시상품 사용
(15) 탁송상품 사용
(16) 상품수정 사용
(17) 상품삭제 사용
```

#### 3.2.2 DB Type

```vb
Type DB
    Type As Integer           ' 연결타입
    name As String            ' 사용자명
    Pass As String            ' 패스워드
    IP As String              ' 서버IP
    Port As String            ' 포트
    DataBase As String        ' DB명
    Server_Type As String     ' x.4.49 (0:SQL SERVER, 1:SQL 2012 LOCALDB)
End Type
```

#### 3.2.3 Shop Type (일부)

```vb
Type Shop
    Ver As String             ' 버전 정보
    Code As String            ' 점포 코드
    name As String            ' 상호명
    Number As String          ' 사업자 번호
    Address As String         ' 주소
    Owner As String           ' 대표자
    Tel As String             ' 전화
    Top1-5 As String          ' 영수증 윗부분 메시지
    Buttom1-5 As String       ' 하단 메시지
    MEM1-3 As String          ' 회원판매메시지
    Prn_Name As String        ' 프린터 용지 상호명

    ' x.4.18_3 SMS 및 전자영수증
    SMS_ShopName As String
    Online_KEY As String
    SMS_YN As String
    AUTO_SMS_YN As String
    aOS_Url As String
    iOS_Url As String
    SMS_Content As String

    ' x.4.18_3 Push 알림
    Push_YN As String
    Push_title As String
    Push_msg As String
    Push_link As String

    ' x.4.45 셀프 POS 핫키
    sSelfPos_Hotkey1-4 As String
    sSelfPos_Hotkey1Name-4Name As String

    ' x.8 SNS 구분
    self_SNSGubun As String   ' 0:전화, 1:카카오
End Type
```

#### 3.2.4 Terminal Type (일부)

```vb
Type Terminal
    Type As Integer           ' 단말기 타입
    PosNo As String * 2       ' POS 번호 (2자리 고정)
    AdminPosNo As String      ' 관리자POS번호
    CashDraw As Integer       ' 돈통 사용여부
    Touch As Integer          ' 터치 사용여부
    Dual As Integer           ' 듀얼 사용여부
    Printer As Integer        ' 프린터 타입

    ' 통신 포트 설정
    PrinterPort As Integer
    PrinterBps As Long
    PrinterGubun As Integer   ' 0:패러럴, 1:시리얼
    HandScan_Port As Integer
    MSR_PORT As Integer
    SuPyo_Port As Integer

    ' CDP (Customer Display Pole)
    CDPName As String
    CDPPort As Integer
    CDPLine As Integer
    CDPType As String

    ' 듀얼 모니터
    Dual_Type As Integer      ' (일반화,이미지)
    Img_Path As String

    ' 해상도
    Moniter As Integer        ' 메인 (0:1024*768, 1:1280*1024)
    SMoniter As Integer       ' 서브 (0:800*600, 1:1024*768)

    ' x.6.1 주방프린터
    kitchenPrint As Integer
    kitchenPrinterPort As Integer
    kitchenPrinterBps As Long
    kitchenPrinterGubun As Integer
    kitchenSlot_Add As String

    ' poson2 x.0.3 벨 시스템
    Bell_YN As String         ' 0:미사용, 1:사용
    Bell_Type As String       ' 0:키보드입력, 1:통신연동
    Bell_ComPort As Integer
    Bell_Name As String
    Bell_fID As String
    Bell_fID_YN As String
    Bell_LEN As String        ' 주문번호 자릿수
End Type
```

#### 3.2.5 C_Config Type (클라이언트 설정 - 일부)

```vb
Type C_Config
    Price_Edit As Integer     ' 판매시 가격 수정
    Err_Write As Integer      ' 에러 로그 출력 여부
    Product_CashOpen As Integer
    Product_Sound As Integer
    Shop_Chk As Integer
    Hotkey_Chk As Integer
    Key_Tabel As String
    HyeonGeumPrice As String
    MaxPrice As String

    ' 2008-05-27
    Re_Point As String
    Re_Tax As String
    Re_CashBack As String
    Slot_Add As String
    Delay As String
    Cut_Position As String

    InfoDesk_YN As String
    InfoDesk_ViewAll As String

    ' 셀프 POS 설정 (4.45)
    Self_YN As String         ' 0:미사용, 1:사용
    Self_Bell As String
    Self_STLGoods As String
    Self_STLNoGoods As String
    self_STLGoodsNo As String
    Self_STLSoundAdmin As String
    Self_STLPort As String
    Self_STLYN As String
    Self_SoundGuide As String
    self_ScalePort As String
    self_BagPort As String
    Self_ScaleLimitG As String

    ' 4.48 추가 옵션
    Self_OneCancel As String
    Self_zHotKey As String
    self_NoCustomer As String
    self_CountYN As String

    ' 4.49 현금거치기 추가옵션
    self_Cash As String
    self_CashPort As String
    self_CashSleep As String
    self_CashPhonNum As String
    self_NoCardUse As String
    self_MainPage As String

    ' 4.50 자동봉투기
    Self_JPYN As String
    self_BagJPPort As String
    self_NoGoodsList As String
    self_LastBag As String

    ' x.4.53 자동오픈 설정
    Auto_Open_YN As String
    Auto_ID As String
    Auto_Pass As String
    Auto_finish_YN As String
    Auto_Day As String
    Auto_AP As String
    Auto_HH As String
    auto_MM As String
    Auto_DayHHMM As String

    ' 4.5.1
    Self_UserCall As String
    self_Kakao As String
    Self_Zero As String
    self_SMSAdmin As String
    self_Reader As String

    ' NEW_x.0.1 poson upss
    POSON2_UPSS_USE As String
    POSON2_UPSS_SMS_USE As String
    POSON2_UPSS_Recv_Mobile As String
    POSON2_UPSS_MSG_USE As String

    ' NEW_x.0.2 회원 관련
    Self_CusTopMsg As String
    Self_CusAddUse As String
    Self_CusBTMsg1 As String
    Self_CusBTMsg2 As String
End Type
```

#### 3.2.6 S_Config Type (서버 설정 - 일부)

```vb
Type S_Config
    Group_Print As Integer
    Group_Sel As Integer
    Money As Integer
    NewProduct As Integer
    PrintLine As Integer
    Cash_Pass As Integer
    Pack As Integer
    Price_Zero As Integer
    Sale_Point As Integer
    Weight_Point As Integer
    CancelAll As Integer
    JeonPyo As Integer
    Tran As Integer
    Boryu_Print As Integer
    Card_CashOpen As Integer

    ' 생일 이벤트
    Bir_Msg1 As String
    Bir_Msg2 As String
    Bir_PAdd As Currency

    ' 사은품 설정
    Gift_Chk As String
    Gift_SDate As String
    Gift_EDate As String
    Gift_Price As Currency
    Gift_Msg1-3 As String
    Gift_CntYN As String
    Gift_MAXCnt As String

    ' 적립 플러스
    PPlus_Chk As String
    PPlus_Type As String
    PPlus_Week As String
    PPlus_SDate As String
    PPlus_EDate As String
    PPlus_Per As Currency
    mem_appcard_check As String

    ' 회원 할인
    MEM_Chk As String
    MEM_Type As String
    MEM_Week As String
    MEM_SDate As String
    MEM_EDate As String
    MEM_Gubun As String
    MEM_Per As Currency
    MEM_PointGubun As String

    ' 포인트 설정
    Default_Point As Currency
    Min_Point As Currency
    POS_Count As Integer

    ' 행운권 당첨
    LU_Chk As String
    LU_Type As String
    LU_Week() As String
    LU_SDate As String
    LU_EDate As String
    LU_Num() As String
    LU_Msg1-2 As String
    LU_Opt1-2 As String
    LU_Price As Currency

    ' x.4.54 판매금액 메시지
    SalePrice_MSG_YN As String
    SalePrice_MSG_SDATE As String
    SalePrice_MSG_EDATE As String
    SalePrice_MSG_gSALE_YN As String

    ' x.5.2 포인트몰 포인트
    RMoney_Point_YN As String
    RMoney_Point_dnawi As String
    RMoney_Rtn_YN As String

    ' 4.4.45 셀프결제 OFF시 옵션
    OFF_Bill_Opt() As String
End Type
```

#### 3.2.7 VAN Type

```vb
Type VAN
    Selected As String        ' 선택 VAN사
    name As String            ' VAN사명
    IP As String              ' 서버IP
    Port As String            ' 포트
    DanmalNo As String        ' 단말기 번호
    SNumber As String * 6     ' 거래 일련번호 (6자리 고정)
    SingPad_Port As String    ' 싸인패드 포트
    CashBack_YN As String
    WorkingKey As String      ' SMARTRO/KIS용
    WorkingKeyIndex As String
    SingPad_BPS As String
    SingCall_Type As String   ' x.3.3 KICC 싸인 호출 방식
    USB_YN As String

    ' KFTC
    Product_Number As String
    POINT_Val As String
    SeqNo As String

    ' 한국캐피탈 (현금영수증)
    KCB_IP As String
    KCB_Port As String
    KCB_DanmalNo As String
    KCB_Use As String
    OCash_Screen_YN As String
End Type
```

#### 3.2.8 VCAT Type (VAN CAT 단말기)

```vb
Type VCAT
    FILE_PATH As String
    IP As String
    Port As String
    MSR_PORT As String
    MSR_BPS As String
    SignPad_PORT As String
    SignPad_BPS As String
    SignPad_USE As String
    TimeOut_Sec As String
    Sign_Gubun As String
    SMT_Wait_Sec As String

    ' 각 VAN사별 경로
    NICE_VCAT_PATH As String
    KOCES_VCAT_PATH As String
    SPC_VCAT_PATH As String
    KICC_VCAT_PATH As String
    KICC_MSR_PATH As String
    KMPS_VCAT_PATH As String
    KMPS_BizNO As String
    KICC_WinHttpTimeout As String
    KIS_VCAT_PATH As String

    ' x.4.42
    DEF_VAN As String

    ' x.4.46
    STAR_VCAT_PATH As String
End Type
```

---

## 4. 함수 목록

### 4.1 Public/Private 함수

| 함수명            | 타입             | 라인 | 반환    | 역할                   |
| ----------------- | ---------------- | ---- | ------- | ---------------------- |
| **SKey_App**      | Private Function | 2483 | Boolean | 제품 키 인증           |
| **Pos_Config**    | Sub              | 2525 | void    | 마스터 데이터 다운로드 |
| **S_Config_Call** | Public Sub       | 5596 | void    | 서버 환경설정 로드     |

---

## 5. 주요 함수 상세 분석

### 5.1 Private Function SKey_App() As Boolean

**시그니처**:

```vb
Private Function SKey_App() As Boolean
```

**역할**:
제품 라이선스 키를 레지스트리에서 읽어와 검증합니다.

**코드 흐름**:

```
┌─────────────────────────────────┐
│ 1. 레지스트리에서 Pkey, Skey 읽기 │
│    GetRegKeyValue()              │
└─────────────────────────────────┘
               ↓
┌─────────────────────────────────┐
│ 2. Skey 복호화                   │
│    DeCoder(sKey, Code_FF2)      │
└─────────────────────────────────┘
               ↓
┌─────────────────────────────────┐
│ 3. Pkey 형식 검증                │
│    - 길이: 19자                  │
│    - 형식: XXXXX-XXXXX-XXXXX-XXX │
│    - Split("-") → 4개 파트       │
└─────────────────────────────────┘
               ↓
┌─────────────────────────────────┐
│ 4. Pkey에서 Skey 재생성          │
│    In_Key = Skey_Load(PPKey())  │
└─────────────────────────────────┘
               ↓
┌─────────────────────────────────┐
│ 5. 복호화된 Skey와 비교          │
│    If In_Key = sKey Then        │
│       SKey_App = True           │
└─────────────────────────────────┘
```

**코드 분석**:

```vb
Private Function SKey_App() As Boolean
Dim PKey As String
Dim sKey As String
Dim PPKey() As String
Dim i As Integer
Dim In_Key As String

On Error GoTo err
    ' 1. 레지스트리 읽기
    PKey = mfun.GetRegKeyValue(REG_KEY, REG_SUBKEY, "Pkey", REG_SZ)
    sKey = mfun.GetRegKeyValue(REG_KEY, REG_SUBKEY, "Skey", REG_SZ)

    ' 2. 복호화
    sKey = DeCoder(sKey, Code_FF2)

    Pos_Pkey = PKey
    Pos_Skey = sKey

    If PKey = "" Or sKey = "" Then Exit Function

    ' 3. Pkey 형식 검증
    If Len(PKey) <> 19 Then Exit Function

    PPKey = Split(PKey, "-")
    If UBound(PPKey) <> 3 Then Exit Function

    ' 각 파트가 숫자인지 확인
    For i = 0 To UBound(PPKey)
        If IsNumeric(PPKey(i)) = False Then Exit Function
    Next i

    ' 4. Pkey에서 Skey 재생성
    In_Key = mfun.Skey_Load(PPKey())

    ' 5. 비교
    If In_Key <> sKey Then Exit Function

    SKey_App = True
    Exit Function

err:
    MsgBox "[에러코드]: " & Err.Number & Chr(13) & _
           "[에러내용]: " & Err.Description
End Function
```

**사용 위치**:

- 프로그램 시작 시 라이선스 검증
- Main.bas의 Sub Main()에서 호출 가능

**마이그레이션 시 고려사항**:

- 레지스트리 대신 **환경 변수** 또는 **암호화된 파일** 사용
- 하드웨어 기반 인증 (MAC 주소, CPU ID) 추가 고려
- 클라우드 기반 라이선스 서버 연동

---

### 5.2 Sub Pos_Config()

**시그니처**:

```vb
Sub Pos_Config()
```

**역할**:
서버 DB(DBCON)에서 마스터 데이터를 읽어 로컬 DB(DBCON1)에 동기화합니다.

**동기화 테이블**:

1. **Office_User** - 점포 정보
2. **Pos_Set** - 환경설정
3. **기타 마스터 테이블들** (코드에서 계속 이어짐)

**코드 흐름**:

```
┌──────────────────────────────┐
│ 1. Office_User 동기화         │
│    Server → Local             │
├──────────────────────────────┤
│ DBCON1.BeginTrans            │
│ Delete From Office_User      │
│ Select * From Office_User    │
│ Insert into Office_User ...  │
│ DBCON1.CommitTrans           │
└──────────────────────────────┘
               ↓
┌──────────────────────────────┐
│ 2. Pos_Set 동기화             │
│    Server → Local             │
├──────────────────────────────┤
│ DBCON1.BeginTrans            │
│ Delete From Pos_Set          │
│ Select * From Pos_Set        │
│ Insert into Pos_Set ...      │
│ DBCON1.CommitTrans           │
└──────────────────────────────┘
               ↓
┌──────────────────────────────┐
│ 3. 기타 마스터 테이블         │
│    (상품, 회원, 카테고리 등)  │
└──────────────────────────────┘
```

**코드 샘플** (Office_User 부분):

```vb
Sub Pos_Config()
On Error GoTo err

    ' =========================================
    ' Office_User (점포정보)
    ' =========================================
    DBCON1.BeginTrans
    DB_TRAN = 1

    SQL = "Delete From Office_User"
    DBCON1.Execute (SQL)

    SQL = "Select * From Office_User"
    Set rs = DBCON.Execute(SQL)

    If Not rs.EOF Then
        Do Until rs.EOF
            SQL = "Insert into Office_User(" & _
                  "Sto_CD, Office_Name, Office_Num, Owner_Name, " & _
                  "Owner_Jumin, Uptae, JongMok, Program_Name, " & _
                  "Office_Tel1, Office_Tel2, Office_Mobile1, " & _
                  "Office_Mobile2, Office_Fax, Zip_Code, " & _
                  "Address1, Address2, Credit_IP, Credit_Port, " & _
                  "Credit_PID, Cash_IP, Cash_Port, Cash_Comp_CD, " & _
                  "Cash_PID, Cred_Cash_IP, Cred_Cash_Port, " & _
                  "Cred_Cash_ID, HomePage, Bigo, Write_Date, " & _
                  "Edit_Date, Writer, Editor, Office_Pwd, Version, " & _
                  "Shop_Area, Shop_Size, OFFICE_NAME2, SEETROL_FILENAME" & _

                  ' x.4.18_3 SMS 및 전자영수증
                  ", Online_KEY, eBill_sms_yn, eBill_auto_sms_yn, " & _
                  "eBill_aos_Url, eBill_ios_Url, eBill_sms_content, " & _
                  "eBill_push_yn, eBill_push_title, eBill_push_msg, " & _
                  "eBill_push_link, eBill_push_noti_img_url, " & _
                  "eBill_push_content_img_url, eBill_push_content, " & _
                  "eBill_push_content_mode " & _

                  ' x.4.33
                  ", en_use " & _

                  ' x.4.45 셀프 POS 핫키
                  ", SelfPos_HotKey1, SelfPos_Hotkey2, SelfPos_Hotkey3, " & _
                  "SelfPos_Hotkey4, SelfPos_Hotkey5, SelfPos_Hotkey6 " & _

                  ' x.4.49
                  ", strBarcode_YN, Goods_Unit_YN " & _

                  ' x.4.50
                  ", ind_expired_yn, ind_expired_gubun, ind_expired_state_edit_use " & _

                  ' poson2 x.0.3
                  ", SEETROL_Gubun " & _

                  ' x.8 SNS 구분
                  ", SMS_GUBUN " & _

                  ' x.6.8
                  ", WeNet_MartCODE) "

            SQL = SQL + " Values(" & _
                  "'" & rs!sto_cd & "', '" & rs!OFFICE_NAME & "', " & _
                  "'" & rs!office_num & "', '" & rs!Owner_Name & "', " & _
                  "'" & rs!Owner_Jumin & "', '" & rs!Uptae & "', " & _
                  "'" & rs!JongMok & "', '" & rs!Program_Name & "', " & _
                  "'" & rs!Office_Tel1 & "', '" & rs!Office_Tel2 & "', " & _
                  "'" & rs!Office_Mobile1 & "', '" & rs!Office_Mobile2 & "', " & _
                  "'" & rs!Office_Fax & "', '" & rs!Zip_Code & "', " & _
                  "'" & rs!Address1 & "', '" & rs!ADDRESS2 & "', " & _
                  "'" & rs!Credit_IP & "', '" & rs!Credit_PID & "', " & _
                  "'" & rs!Cash_IP & "', '" & rs!Cash_Port & "', " & _
                  "'" & rs!Cash_Comp_CD & "', '" & rs!Cash_PID & "', " & _
                  "'" & rs!Cred_Cash_IP & "', '" & rs!Cred_Cash_Port & "', " & _
                  "'" & rs!Cred_Cash_ID & "', '" & rs!Cash_IP & "', " & _
                  "'" & rs!HomePage & "', '" & rs!bigo & "', " & _
                  "'" & rs!Write_Date & "', '" & rs!Edit_Date & "', " & _
                  "'" & rs!Writer & "', '" & rs!Editor & "', " & _
                  "'" & rs!Office_pwd & "', '" & rs!Version & "', " & _
                  "'" & IIf(IsNull(rs!Shop_Area), "도시", rs!Shop_Area) & "', " & _
                  IIf(IsNull(rs!shop_size), "30", rs!shop_size) & ", " & _
                  "'" & IIf(IsNull(rs!OFFICE_NAME2), "", rs!OFFICE_NAME2) & "', " & _
                  "'" & IIf(IsNull(rs!SEETROL_FILENAME), "tipos-1", rs!SEETROL_FILENAME) & "', " & _

                  ' ... 이하 x.4.18_3, x.4.33, x.4.45, x.4.49, x.4.50 필드들 ...

                  ")"

            DBCON1.Execute (SQL)
            Call ServerVersion_INIWrite(IIf(IsNull(rs!Version), "", rs!Version))

            rs.MoveNext
        Loop
    End If
    rs.Close

    DBCON1.CommitTrans

    ' =========================================
    ' Pos_Set (환경설정)
    ' =========================================
    DBCON1.BeginTrans
    DB_TRAN = 1

    SQL = "Delete From Pos_Set"
    DBCON1.Execute (SQL)

    SQL = "Select * From Pos_Set"
    Set rs = DBCON.Execute(SQL)
    ' ... (이하 동일한 패턴)

err:
    If DB_TRAN = 1 Then
        DBCON1.RollbackTrans
        DB_TRAN = 0
    End If
    ' 에러 처리
End Sub
```

**주요 특징**:

1. **트랜잭션 사용**: BeginTrans → Execute → CommitTrans
2. **전체 삭제 후 삽입**: Delete → Insert (동기화 방식)
3. **Null 처리**: IIf(IsNull(rs!Field), "기본값", rs!Field)
4. **버전별 필드 추가**: x.4.18_3, x.4.45, x.4.49 등 주석으로 구분

**문제점**:

- **SQL Injection 취약**: 파라미터화 쿼리 미사용
- **대량 데이터 처리 비효율**: 한 건씩 Insert
- **에러 처리 미흡**: RollbackTrans만 수행

---

### 5.3 Public Sub S_Config_Call()

**시그니처**:

```vb
Public Sub S_Config_Call()
```

**역할**:
로컬 DB(DBCON1)에서 환경설정을 읽어 전역 변수(Shop, S_Config, C_Config 등)에 로드합니다.

**코드 흐름**:

```
┌──────────────────────────────┐
│ 1. Office_User 읽기           │
│    → Shop Type에 할당         │
└──────────────────────────────┘
               ↓
┌──────────────────────────────┐
│ 2. Pos_Set 읽기               │
│    → S_Config Type에 할당     │
└──────────────────────────────┘
               ↓
┌──────────────────────────────┐
│ 3. 기타 설정 테이블 읽기      │
│    (Points, Member, VAN 등)  │
└──────────────────────────────┘
```

**코드 샘플**:

```vb
Public Sub S_Config_Call()
Dim S_Code As String
Dim M_Code As String
' ... 변수 선언 ...

On Error GoTo err

    ' ========================================
    ' 1. Office_User (점포 정보)
    ' ========================================
    SQL = "Select Office_Name, Office_num, owner_name, office_tel1, " & _
          "address1, address2, version, Sto_CD, OFFICE_NAME2, " & _
          "SEETROL_FILENAME, Online_KEY, eBill_sms_yn, " & _
          "eBill_auto_sms_yn, eBill_aos_Url, eBill_ios_Url, " & _
          "eBill_sms_content, eBill_push_yn, eBill_push_title, " & _
          "eBill_push_msg, eBill_push_link, eBill_push_noti_img_url, " & _
          "eBill_push_content_img_url, eBill_push_content, " & _
          "eBill_push_content_mode, en_use, strBarcode_YN, " & _
          "SelfPos_HotKey1, SelfPos_HotKey2, selfPos_Hotkey3, " & _
          "selfPos_Hotkey4, ind_expired_yn, ind_expired_gubun, " & _
          "ind_expired_state_edit_use, SEETROL_Gubun, SMS_GUBUN, " & _
          "WeNet_MartCODE From Office_User"

    Set rs = DBCON1.Execute(SQL)

    If rs.RecordCount = 0 Then
        ' 기본값 설정
        Shop.sSEETROL_FILENAME = "tipos-1"
        Shop.sSEETROL_Gubun = "0"
    Else
        ' Shop Type에 값 할당
        Shop.name = rs!OFFICE_NAME
        Shop.Number = rs!office_num
        Shop.Owner = IIf(IsNull(rs!Owner_Name), "", rs!Owner_Name)
        Shop.Tel = IIf(IsNull(rs!Office_Tel1), "", rs!Office_Tel1)
        Shop.Address = IIf(IsNull(rs!Address1), "", rs!Address1) & " " & _
                       Chr(0) & IIf(IsNull(rs!ADDRESS2), "", rs!ADDRESS2)
        Shop.Ver = IIf(IsNull(rs!Version), "", rs!Version)
        Shop.Code = IIf(IsNull(rs!sto_cd), "", rs!sto_cd)

        ' x.4.18_3 SMS 및 전자영수증
        Shop.Online_KEY = IIf(IsNull(rs!Online_KEY), "", rs!Online_KEY)
        Shop.SMS_YN = IIf(IsNull(rs!eBill_sms_yn), "0", rs!eBill_sms_yn)
        Shop.AUTO_SMS_YN = IIf(IsNull(rs!eBill_auto_sms_yn), "0", rs!eBill_auto_sms_yn)
        Shop.aOS_Url = IIf(IsNull(rs!eBill_aos_Url), "", rs!eBill_aos_Url)
        Shop.iOS_Url = IIf(IsNull(rs!eBill_ios_Url), "", rs!eBill_ios_Url)
        Shop.SMS_Content = IIf(IsNull(rs!eBill_sms_content), "", rs!eBill_sms_content)

        Shop.Push_YN = IIf(IsNull(rs!eBill_push_yn), "0", rs!eBill_push_yn)
        Shop.Push_title = IIf(IsNull(rs!eBill_push_title), "", rs!eBill_push_title)
        Shop.Push_msg = IIf(IsNull(rs!eBill_push_msg), "", rs!eBill_push_msg)
        ' ... 이하 Push 관련 필드들 ...

        ' 기본값 설정
        If Shop.Push_title = "" Then Shop.Push_title = "전자영수증"
        If Shop.Push_msg = "" Then Shop.Push_msg = "[상호명]의 영수증"
        If Shop.Push_link = "" Then Shop.Push_link = "/page/off_sat_m"
        ' ... 이하 기본값들 ...

        ' x.4.33 고객정보 암호화
        Shop.sCustmer_Encrypt = IIf(IsNull(rs!en_use), "0", rs!en_use)

        ' x.4.49 바코드
        Shop.sXBarcode_Use = IIf(IsNull(rs!strBarcode_YN), "0", rs!strBarcode_YN)

        ' x.4.45 셀프 POS 핫키
        Shop.sSelfPos_Hotkey1 = IIf(IsNull(rs!selfPos_Hotkey1), "", rs!selfPos_Hotkey1)
        Shop.sSelfPos_Hotkey2 = IIf(IsNull(rs!selfPos_Hotkey2), "", rs!selfPos_Hotkey2)
        Shop.sSelfPos_Hotkey3 = IIf(IsNull(rs!selfPos_Hotkey3), "", rs!selfPos_Hotkey3)
        Shop.sSelfPos_Hotkey4 = IIf(IsNull(rs!selfPos_Hotkey4), "", rs!selfPos_Hotkey4)

        ' x.4.50
        Shop.s_ind_expired_state_edit_use = IIf(IsNull(rs!ind_expired_state_edit_use), "0", rs!ind_expired_state_edit_use)

        ' x.8 SNS 구분
        Shop.self_SNSGubun = IIf(IsNull(rs!SMS_GUBUN), "0", rs!SMS_GUBUN)
    End If
    rs.Close

    ' ========================================
    ' 2. Pos_Set (환경설정)
    ' ========================================
    SQL = "Select * From POS_Set"
    Set rs = DBCON1.Execute(SQL)

    If rs.RecordCount = 0 Then
        ' 기본값 설정
        S_Config.Group_Print = 1
        S_Config.Group_Sel = 1
        S_Config.Money = 1
        S_Config.NewProduct = 1
        ' ... 이하 기본값들 ...
    Else
        ' rs에서 읽어서 S_Config에 할당
        ' (코드가 매우 길어서 생략)
    End If
    rs.Close

    ' ========================================
    ' 3. 기타 설정 테이블들
    ' ========================================
    ' Points, Member, VAN, VCAT 등 로드
    ' (계속 이어짐...)

Exit Sub
err:
    MsgBox "S_Config_Call Error: " & Err.Description
End Sub
```

**주요 특징**:

1. **Null 안전 처리**: IIf(IsNull(...), 기본값, 실제값)
2. **기본값 보장**: RecordCount = 0일 때 기본값 설정
3. **버전별 필드 추가**: x.4.18_3, x.4.45, x.4.49 등 주석
4. **전역 변수 초기화**: Shop, S_Config, C_Config 등

**호출 위치**:

- 프로그램 시작 시 (Main.bas)
- 설정 변경 후 재로드 시

---

## 6. DB 연결 객체

### 6.1 연결 객체 정의

```vb
Public DBCON As ADODB.Connection   ' SQL Server (메인)
Public DBCON1 As ADODB.Connection  ' Access DB (로컬)
Public rs As ADODB.Recordset       ' 공용 레코드셋
Public Tran_DB As ADODB.Connection ' 트랜잭션 전용
```

### 6.2 사용 패턴

#### 6.2.1 DBCON (SQL Server)

```vb
' Main.bas에서 연결
If adoConnectDB(DBCON) = True Then
    ' 서버 연결 성공
    Connect_type = 1
Else
    ' 서버 연결 실패 → DBCON1로 Fallback
End If
```

**용도**:

- 실시간 마스터 데이터 조회
- 판매 데이터 업로드
- 회원 정보 조회

#### 6.2.2 DBCON1 (Access DB)

```vb
' Fallback 연결
If MDBConnect_DB(DBCON1, C_DBPath, C_Pass) = True Then
    ' 로컬 DB 연결 성공
    Connect_type = 2
End If
```

**용도**:

- 오프라인 모드 운영
- 마스터 데이터 캐싱
- 로컬 판매 데이터 임시 저장

#### 6.2.3 Tran_DB (트랜잭션 전용)

```vb
' 별도 연결로 트랜잭션 처리
Tran_DB.BeginTrans
' ... 작업 ...
Tran_DB.CommitTrans
```

**용도**:

- 복잡한 트랜잭션 처리
- DBCON과 독립적인 작업

### 6.3 연결 전략

```
프로그램 시작
    ↓
┌─────────────────┐
│ DBCON 연결 시도  │ (SQL Server)
│ adoConnectDB()  │
└─────────────────┘
    ↓ 성공         ↓ 실패
┌─────────────────┐ ┌─────────────────┐
│ 온라인 모드     │ │ DBCON1 연결 시도 │
│ Connect_type=1  │ │ MDBConnect_DB() │
└─────────────────┘ └─────────────────┘
                        ↓ 성공    ↓ 실패
                    ┌──────────┐ ┌──────────┐
                    │오프라인모드│ │ 에러 종료 │
                    │Connect_  │ │          │
                    │type=2    │ │          │
                    └──────────┘ └──────────┘
```

---

## 7. 호출 관계 및 의존성

### 7.1 호출 그래프

```
Mdl_Main.bas
    ├─ Main.bas
    │   └─ Sub Main()
    │       └─ S_Config_Call() 호출
    │
    ├─ Frm_Login.frm
    │   └─ Form_Load()
    │       └─ S_Config_Call() 호출
    │
    ├─ Frm_Main.frm
    │   ├─ 전역 변수 참조 (Shop, S_Config, C_Config)
    │   └─ DBCON, DBCON1 사용
    │
    ├─ Mdl_Function.bas
    │   └─ 각종 함수에서 전역 변수 참조
    │
    └─ 모든 Form/Module
        └─ Type 정의 참조 (Login, Card, Cash, Product 등)
```

### 7.2 의존성 분석

#### 7.2.1 Mdl_Main.bas가 의존하는 모듈

```
Mdl_Main.bas
    ↓ 참조
├─ Moon_Function.dll (mfun, msub)
│   ├─ GetRegKeyValue()
│   ├─ Skey_Load()
│   └─ DeCoder()
│
├─ UPSSClient.dll (objUPSS)
│   └─ 중고상품 판매관리
│
└─ ADODB (ADO 2.8)
    ├─ Connection
    └─ Recordset
```

#### 7.2.2 Mdl_Main.bas를 의존하는 모듈

```
전체 프로젝트
    ↓ 참조
Mdl_Main.bas
    ├─ 전역 변수 (200개+)
    ├─ Type 정의 (17개)
    └─ 함수 (3개)
```

**의존 모듈 예시**:

- Frm_Sale.frm → Shop, S_Config, Product, Card, Cash
- Frm_Member.frm → Member, Points, MEM_Gubun
- Frm_Card.frm → Card, VAN, VCAT
- Frm*Self.frm → C_Config.Self*_, Terminal.Bell\__

### 7.3 순환 참조 위험

**현재 구조**:

```
모든 Module/Form → Mdl_Main.bas (전역 변수)
    ↓
Mdl_Main.bas → Moon_Function.dll
    ↓
Moon_Function.dll → ?
```

**문제점**:

- 순환 참조 가능성 있음
- 전역 변수 과다 사용으로 디버깅 어려움

---

## 8. 마이그레이션 고려사항

### 8.1 전역 변수 제거

**VB6 전역 변수**:

```vb
Public Shop As Shop
Public S_Config As S_Config
Public C_Config As C_Config
Public DBCON As ADODB.Connection
```

**Node.js + TypeScript**:

```typescript
// config/AppConfig.ts
export class AppConfig {
  private static instance: AppConfig;

  public shop: ShopConfig;
  public serverConfig: ServerConfig;
  public clientConfig: ClientConfig;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  private async loadConfig() {
    this.shop = await this.loadShopConfig();
    this.serverConfig = await this.loadServerConfig();
    this.clientConfig = await this.loadClientConfig();
  }
}

// 사용
import { AppConfig } from "@/config/AppConfig";
const config = AppConfig.getInstance();
console.log(config.shop.name);
```

**Vue 3 (Pinia Store)**:

```typescript
// stores/config.ts
import { defineStore } from 'pinia';

export const useConfigStore = defineStore('config', {
    state: () => ({
        shop: {} as ShopConfig,
        serverConfig: {} as ServerConfig,
        clientConfig: {} as ClientConfig,
    }),

    actions: {
        async loadConfig() {
            const response = await api.get('/config');
            this.shop = response.data.shop;
            this.serverConfig = response.data.serverConfig;
            this.clientConfig = response.data.clientConfig;
        },
    },

    getters: {
        shopName: (state) => state.shop.name,
        isSelfMode: (state) => state.clientConfig.self_YN === '1',
    },
});

// 컴포넌트에서 사용
<script setup lang="ts">
import { useConfigStore } from '@/stores/config';
const configStore = useConfigStore();
</script>

<template>
    <div>{{ configStore.shopName }}</div>
</template>
```

### 8.2 Type 정의 전환

**VB6 Type**:

```vb
Type Shop
    Ver As String
    Code As String
    name As String
    Number As String
    Address As String
    Owner As String
    Tel As String
End Type
```

**TypeScript Interface**:

```typescript
// types/Shop.ts
export interface Shop {
  ver: string;
  code: string;
  name: string;
  number: string;
  address: string;
  owner: string;
  tel: string;

  // x.4.18_3 SMS
  onlineKey: string;
  smsYN: "0" | "1";
  autoSmsYN: "0" | "1";
  aosUrl: string;
  iosUrl: string;
  smsContent: string;

  // x.4.18_3 Push
  pushYN: "0" | "1";
  pushTitle: string;
  pushMsg: string;
  pushLink: string;
  pushNotiImgUrl: string;
  pushContentImgUrl: string;
  pushContent: string;
  pushContentMode: "text" | "html";

  // x.4.45 Self POS Hotkey
  selfPosHotkey1: string;
  selfPosHotkey2: string;
  selfPosHotkey3: string;
  selfPosHotkey4: string;

  selfPosHotkey1Name: string;
  selfPosHotkey2Name: string;
  selfPosHotkey3Name: string;
  selfPosHotkey4Name: string;

  // x.8 SNS
  selfSNSGubun: "0" | "1"; // 0:전화, 1:카카오
}

// Zod 스키마 (런타임 검증)
import { z } from "zod";

export const ShopSchema = z.object({
  ver: z.string(),
  code: z.string(),
  name: z.string().min(1),
  number: z.string().regex(/^\d{3}-\d{2}-\d{5}$/),
  address: z.string(),
  owner: z.string(),
  tel: z.string(),
  onlineKey: z.string(),
  smsYN: z.enum(["0", "1"]),
  autoSmsYN: z.enum(["0", "1"]),
  // ... 이하 필드들 ...
});

export type ShopValidated = z.infer<typeof ShopSchema>;
```

### 8.3 DB 연결 전환

**VB6 ADODB**:

```vb
Public DBCON As ADODB.Connection
Public DBCON1 As ADODB.Connection

' 연결
If adoConnectDB(DBCON) = False Then
    MDBConnect_DB(DBCON1, C_DBPath, C_Pass)
End If
```

**Node.js (mssql + Connection Pool)**:

```typescript
// config/database.ts
import sql from "mssql";

const sqlConfig: sql.config = {
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function connectDB(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  try {
    pool = await sql.connect(sqlConfig);
    console.log("SQL Server connected");
    return pool;
  } catch (err) {
    console.error("SQL Server connection failed:", err);
    throw err;
  }
}

export async function query<T>(queryString: string, params?: Record<string, any>): Promise<T[]> {
  const pool = await connectDB();
  const request = pool.request();

  // 파라미터 바인딩
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  const result = await request.query(queryString);
  return result.recordset as T[];
}

// 사용
import { query } from "@/config/database";

interface Shop {
  office_name: string;
  office_num: string;
}

const shops = await query<Shop>(
  "SELECT office_name, office_num FROM Office_User WHERE sto_cd = @stoCD",
  { stoCD: "00001" },
);
```

**Access DB 제거**:

- Access DB(DBCON1)는 제거
- 로컬 캐싱은 **Redis** 또는 **SQLite** 사용

```typescript
// cache/LocalCache.ts
import { Level } from "level";

const db = new Level("./cache", { valueEncoding: "json" });

export async function cacheShopConfig(shop: Shop) {
  await db.put("shop:config", shop);
}

export async function getCachedShopConfig(): Promise<Shop | null> {
  try {
    return await db.get("shop:config");
  } catch (err) {
    return null;
  }
}
```

### 8.4 환경설정 로드 전환

**VB6 S_Config_Call()**:

```vb
Public Sub S_Config_Call()
    SQL = "Select * From Office_User"
    Set rs = DBCON1.Execute(SQL)

    If Not rs.EOF Then
        Shop.name = rs!OFFICE_NAME
        Shop.Number = rs!office_num
        ' ... 100줄 이상의 할당 코드 ...
    End If
    rs.Close
End Sub
```

**Node.js (Service Layer)**:

```typescript
// services/ConfigService.ts
import { query } from "@/config/database";
import { Shop, ShopSchema } from "@/types/Shop";

export class ConfigService {
  async loadShopConfig(): Promise<Shop> {
    const rows = await query<any>(
      `SELECT
                office_name, office_num, owner_name, office_tel1,
                address1, address2, version, sto_cd, office_name2,
                seetrol_filename, online_key, ebill_sms_yn,
                ebill_auto_sms_yn, ebill_aos_url, ebill_ios_url,
                ebill_sms_content, ebill_push_yn, ebill_push_title,
                ebill_push_msg, ebill_push_link, ebill_push_noti_img_url,
                ebill_push_content_img_url, ebill_push_content,
                ebill_push_content_mode, en_use, str_barcode_yn,
                self_pos_hotkey1, self_pos_hotkey2, self_pos_hotkey3,
                self_pos_hotkey4, ind_expired_state_edit_use,
                seetrol_gubun, sms_gubun, wenet_mart_code
            FROM Office_User`,
    );

    if (rows.length === 0) {
      throw new Error("Shop config not found");
    }

    const raw = rows[0];

    // 카멜케이스 변환 + 기본값 처리
    const shop: Shop = {
      ver: raw.version || "",
      code: raw.sto_cd || "",
      name: raw.office_name || "",
      number: raw.office_num || "",
      address: `${raw.address1 || ""} ${raw.address2 || ""}`.trim(),
      owner: raw.owner_name || "",
      tel: raw.office_tel1 || "",

      onlineKey: raw.online_key || "",
      smsYN: raw.ebill_sms_yn || "0",
      autoSmsYN: raw.ebill_auto_sms_yn || "0",
      aosUrl: raw.ebill_aos_url || "",
      iosUrl: raw.ebill_ios_url || "",
      smsContent: raw.ebill_sms_content || this.getDefaultSmsContent(),

      pushYN: raw.ebill_push_yn || "0",
      pushTitle: raw.ebill_push_title || "전자영수증",
      pushMsg: raw.ebill_push_msg || "[상호명]의 영수증",
      pushLink: raw.ebill_push_link || "/page/off_sat_m",
      pushNotiImgUrl: raw.ebill_push_noti_img_url || this.getDefaultNotiImgUrl(raw.sto_cd),
      pushContentImgUrl: raw.ebill_push_content_img_url || this.getDefaultContentImgUrl(raw.sto_cd),
      pushContent: raw.ebill_push_content || "[상호명]의 영수증 내용",
      pushContentMode: raw.ebill_push_content_mode || "text",

      selfPosHotkey1: raw.self_pos_hotkey1 || "",
      selfPosHotkey2: raw.self_pos_hotkey2 || "",
      selfPosHotkey3: raw.self_pos_hotkey3 || "",
      selfPosHotkey4: raw.self_pos_hotkey4 || "",

      selfPosHotkey1Name: "",
      selfPosHotkey2Name: "",
      selfPosHotkey3Name: "",
      selfPosHotkey4Name: "",

      selfSNSGubun: raw.sms_gubun || "0",
    };

    // Zod 검증
    return ShopSchema.parse(shop);
  }

  private getDefaultSmsContent(): string {
    return "앱 설치 주소\n안드로이드:[안드로이드url]\n애플:[애플url]";
  }

  private getDefaultNotiImgUrl(stoCD: string): string {
    return `http://14.38.161.45:8080/image/${stoCD}/noti_receipt.jpg`;
  }

  private getDefaultContentImgUrl(stoCD: string): string {
    return `http://14.38.161.45:8080/image/${stoCD}/receipt.jpg`;
  }
}
```

**API 엔드포인트**:

```typescript
// routes/config.ts
import express from "express";
import { ConfigService } from "@/services/ConfigService";

const router = express.Router();
const configService = new ConfigService();

router.get("/shop", async (req, res) => {
  try {
    const shop = await configService.loadShopConfig();
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 8.5 라이선스 검증 전환

**VB6 SKey_App()**:

```vb
Private Function SKey_App() As Boolean
    PKey = mfun.GetRegKeyValue(REG_KEY, REG_SUBKEY, "Pkey", REG_SZ)
    sKey = mfun.GetRegKeyValue(REG_KEY, REG_SUBKEY, "Skey", REG_SZ)
    sKey = DeCoder(sKey, Code_FF2)
    ' ... 검증 로직 ...
End Function
```

**Node.js (환경 변수 + JWT)**:

```typescript
// services/LicenseService.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";

export class LicenseService {
  private static readonly SECRET = process.env.LICENSE_SECRET || "default-secret";

  /**
   * 라이선스 검증
   */
  public static verifyLicense(licenseKey: string): boolean {
    try {
      const decoded = jwt.verify(licenseKey, this.SECRET) as {
        stoCD: string;
        expiryDate: string;
        features: string[];
      };

      // 만료일 확인
      const expiry = new Date(decoded.expiryDate);
      if (expiry < new Date()) {
        return false;
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * 하드웨어 ID 생성 (MAC 주소 기반)
   */
  public static getHardwareID(): string {
    const os = require("os");
    const networkInterfaces = os.networkInterfaces();

    for (const name in networkInterfaces) {
      const iface = networkInterfaces[name];
      for (const addr of iface) {
        if (!addr.internal && addr.mac !== "00:00:00:00:00:00") {
          return crypto.createHash("sha256").update(addr.mac).digest("hex").substring(0, 16);
        }
      }
    }

    throw new Error("Hardware ID not found");
  }

  /**
   * 라이선스 생성 (관리자용)
   */
  public static generateLicense(stoCD: string, expiryDate: Date, features: string[]): string {
    const payload = {
      stoCD,
      expiryDate: expiryDate.toISOString(),
      features,
      hardwareID: this.getHardwareID(),
    };

    return jwt.sign(payload, this.SECRET, { expiresIn: "365d" });
  }
}

// 미들웨어
export function licenseMiddleware(req: Request, res: Response, next: NextFunction) {
  const licenseKey = process.env.LICENSE_KEY;

  if (!licenseKey || !LicenseService.verifyLicense(licenseKey)) {
    return res.status(403).json({ error: "Invalid or expired license" });
  }

  next();
}
```

**사용**:

```typescript
// server.ts
import express from "express";
import { licenseMiddleware } from "@/services/LicenseService";

const app = express();

// 모든 API에 라이선스 체크 적용
app.use("/api", licenseMiddleware);

app.listen(3000);
```

---

## 9. 결론

Mdl_Main.bas는 POSON POS 시스템의 **중앙 저장소**로, 다음과 같은 역할을 수행합니다:

### 9.1 핵심 역할

1. **전역 변수 관리**: 200개 이상의 변수
2. **Type 정의**: 17개의 사용자 정의 타입
3. **환경설정 로드**: S_Config_Call()
4. **DB 연결 관리**: DBCON, DBCON1
5. **라이선스 검증**: SKey_App()

### 9.2 마이그레이션 전략

1. **전역 변수 제거**: Singleton + Pinia Store
2. **Type 정의 전환**: TypeScript Interface + Zod
3. **DB 연결**: Connection Pool + Parameterized Query
4. **환경설정**: Service Layer + REST API
5. **라이선스**: 환경 변수 + JWT + 하드웨어 ID

### 9.3 주의사항

- **전역 변수 의존도 높음**: 모든 모듈이 참조
- **순환 참조 위험**: 디펜던시 관리 필요
- **SQL Injection 취약**: 파라미터화 쿼리로 전환 필수
- **Type Safety 부족**: TypeScript로 타입 안전성 확보

**다음 분석 파일**: [DBConnection.bas.md](./DBConnection.bas.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
