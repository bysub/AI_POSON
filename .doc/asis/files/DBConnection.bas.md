# DBConnection.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/DBConnection.bas`
**파일 크기**: 8.2KB
**역할**: 데이터베이스 연결 관리 모듈 (SQL Server, Access DB, Transaction Server)
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [전역 변수 및 상수](#2-전역-변수-및-상수)
3. [함수 목록](#3-함수-목록)
4. [주요 함수 상세 분석](#4-주요-함수-상세-분석)
5. [DB 연결 방법](#5-db-연결-방법)
6. [에러 처리 방식](#6-에러-처리-방식)
7. [호출 관계](#7-호출-관계)
8. [마이그레이션 고려사항](#8-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

POSON POS 시스템의 데이터베이스 연결을 전담하는 모듈로, SQL Server, Access DB, 트랜잭션 서버 연결을 관리합니다.

### 1.2 주요 역할

- **SQL Server 연결**: 메인 DB 및 LocalDB 연결
- **Access DB 연결**: Fallback 로컬 DB 연결 (MDB 파일)
- **트랜잭션 서버 연결**: 별도 트랜잭션 DB 서버 연결
- **연결 해제**: Connection 객체 정리
- **트랜잭션 로그 관리**: 실패한 쿼리 로그 저장 및 재전송

### 1.3 코드 구조

```
DBConnection.bas
    ├── 연결 함수
    │   ├── AdoConnectDB()          - 메인 SQL Server 연결
    │   ├── T_AdoConnectDB()        - 트랜잭션 서버 연결
    │   └── MDBConnect_DB()         - Access DB 연결
    │
    ├── 연결 해제
    │   └── AdoDisconnect()         - Connection 해제
    │
    └── 트랜잭션 관리
        ├── Tran_Connect()          - 트랜잭션 서버 연결
        ├── Tran_Execute()          - 쿼리 실행
        ├── Tran_Log_Write()        - 로그 기록
        └── Tran_Log_Send()         - 로그 재전송
```

### 1.4 지원하는 DB 타입

| DB 타입                     | Provider                | 용도             |
| --------------------------- | ----------------------- | ---------------- |
| **SQL Server 2008+**        | SQLOLEDB                | 메인 운영 DB     |
| **SQL Server 2012 LocalDB** | SQLNCLI11               | 로컬 개발/테스트 |
| **Access 2000-2003**        | Microsoft.Jet.OLEDB.4.0 | Fallback 로컬 DB |

---

## 2. 전역 변수 및 상수

### 2.1 이 파일에서 정의하는 변수

없음 (모든 변수는 Mdl_Main.bas에서 정의)

### 2.2 외부에서 사용하는 전역 변수

```vb
' Mdl_Main.bas에서 정의
Public DBcon As ADODB.Connection        ' 메인 SQL Server 연결
Public DBcon1 As ADODB.Connection       ' Access DB 연결
Public Tran_DB As ADODB.Connection      ' 트랜잭션 서버 연결
Public T_server As ADODB.Connection     ' TIPS 서버 연결

' DB 설정 구조체
Public DB As Type_DB                    ' 메인 DB 설정
Public Trans As Type_DB                 ' 트랜잭션 DB 설정
Public TIPS_SERVER As Type_Tips         ' TIPS 서버 설정
```

**Type_DB 구조체**:

```vb
Type Type_DB
    Name As String          ' 사용자 ID
    Pass As String          ' 비밀번호
    IP As String            ' 서버 IP
    Port As String          ' 포트 번호
    DataBase As String      ' DB 이름
    DB As String            ' DB 이름 (별칭)
    Server_Type As String   ' 0: SQL Server, 1: LocalDB
    Use_YN As String        ' 사용 여부
    Chk As Boolean          ' 연결 상태
End Type
```

---

## 3. 함수 목록

### 3.1 Public 함수

| 함수명             | 반환 타입  | 파라미터 개수 | 역할                 |
| ------------------ | ---------- | ------------- | -------------------- |
| **AdoConnectDB**   | Boolean    | 7             | 메인 SQL Server 연결 |
| **T_AdoConnectDB** | Boolean    | 7             | 트랜잭션 서버 연결   |
| **MDBConnect_DB**  | Boolean    | 2-3           | Access DB 연결       |
| **AdoDisconnect**  | Sub (void) | 1             | Connection 해제      |
| **Tran_Connect**   | Sub (void) | 0             | 트랜잭션 서버 연결   |
| **Tran_Execute**   | Sub (void) | 2             | 트랜잭션 쿼리 실행   |
| **Tran_Log_Write** | Sub (void) | 3             | 트랜잭션 로그 기록   |
| **Tran_Log_Send**  | Sub (void) | 1             | 로그 파일 재전송     |

### 3.2 Private 함수

없음 (모든 함수가 Public)

---

## 4. 주요 함수 상세 분석

### 4.1 AdoConnectDB()

**시그니처**:

```vb
Public Function AdoConnectDB(
    ByVal sDB As ADODB.Connection,   ' Connection 객체
    ByVal USERID As String,           ' 사용자 ID
    ByVal sPass As String,            ' 비밀번호
    ByVal sIP As String,              ' 서버 IP
    ByVal sPort As String,            ' 포트 번호
    ByVal DB_Name As String,          ' DB 이름
    ByRef Er_Str As String            ' 에러 메시지 (출력)
) As Boolean
```

**역할**:
메인 SQL Server 또는 LocalDB에 연결합니다. 서버 타입(DB.Server_Type)에 따라 연결 문자열을 동적으로 생성합니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 기존 연결 확인 및 종료            │
│    If sDB.state = adStateOpen       │
│       sDB.Close                      │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. 연결 옵션 설정                    │
│    ConnectionTimeout = 5초           │
│    CursorLocation = adUseClient     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. 포트 번호 검증 및 포맷팅          │
│    "1433" → ",1433"                 │
│    "" → ""                          │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ 4a. LocalDB  │  │ 4b. SQL      │
│ Server_Type=1│  │ Server_Type=0│
│ SQLNCLI11    │  │ SQLOLEDB     │
└──────────────┘  └──────────────┘
        ↓               ↓
┌─────────────────────────────────────┐
│ 5. 연결 성공 시 True 반환            │
│    AdoConnectDB = True              │
└─────────────────────────────────────┘
```

**코드 분석**:

```vb
Public Function AdoConnectDB(ByVal sDB As ADODB.Connection, ByVal USERID As String, ByVal sPass As String, _
                             ByVal sIP As String, ByVal sPort As String, ByVal DB_Name As String, ByRef Er_Str As String) As Boolean

    On Error GoTo DB_ERR

    ' ===== 1. 기존 연결 종료 =====
    If sDB.state = adStateOpen Then sDB.Close

    ' ===== 2. 연결 옵션 설정 =====
    sDB.ConnectionTimeout = 5       ' 타임아웃 5초 (기본 15초)
    sDB.CursorLocation = adUseClient ' 클라이언트 측 커서

    ' ===== 3. 포트 번호 포맷팅 =====
    If Trim(sPort) <> "" Then
        If IsNumeric(sPort) = False Then
            sPort = ""              ' 숫자가 아니면 무시
        Else
            sPort = "," & sPort     ' "1433" → ",1433"
        End If
    Else
        sPort = ""
    End If

    ' ===== 4. 서버 타입별 연결 =====
    If DB.Server_Type = "1" Then
        ' 4a. SQL Server 2012 LocalDB
        sDB.Open "Provider=SQLNCLI11;" & _
                 "Data Source=(localdb)\v11.0;" & _
                 "Integrated Security=SSPI;"

        sDB.Execute ("USE " & DB_Name)

    Else
        ' 4b. 일반 SQL Server
        sDB.Open "Provider=SQLOLEDB;Data Source=" & sIP & sPort & ";Initial Catalog=" & DB_Name & "; " & _
                " User Id=" & USERID & ";Password=" & sPass & ";"
    End If

    AdoConnectDB = True
    Exit Function

DB_ERR:
    Er_Str = err.Description & "(" & err.Number & ")"
    AdoConnectDB = False
    Exit Function
End Function
```

**파라미터 상세**:

- **sDB**: 연결할 Connection 객체 (ByVal이지만 객체는 참조로 전달)
- **USERID**: SQL 인증 사용자 ID (LocalDB에서는 무시)
- **sPass**: SQL 인증 비밀번호 (LocalDB에서는 무시)
- **sIP**: 서버 IP 주소 또는 호스트명
- **sPort**: 포트 번호 (예: "1433", 비어있으면 기본 포트)
- **DB_Name**: 데이터베이스 이름
- **Er_Str**: 에러 발생 시 에러 메시지 저장 (ByRef)

**반환값**:

- **True**: 연결 성공
- **False**: 연결 실패 (Er_Str에 에러 메시지 저장)

**주요 로직**:

1. **연결 타임아웃 5초**

   ```vb
   sDB.ConnectionTimeout = 5
   ```

   - 기본값 15초를 5초로 단축
   - 키오스크 환경에서 빠른 실패 처리

2. **클라이언트 커서 사용**

   ```vb
   sDB.CursorLocation = adUseClient
   ```

   - 서버 부하 감소
   - 연결 끊김 후에도 레코드셋 유지

3. **LocalDB 지원**
   ```vb
   If DB.Server_Type = "1" Then
       sDB.Open "Provider=SQLNCLI11;Data Source=(localdb)\v11.0;Integrated Security=SSPI;"
       sDB.Execute ("USE " & DB_Name)
   ```

   - SQL Server 2012 Express LocalDB 지원
   - Windows 통합 인증 사용

---

### 4.2 T_AdoConnectDB()

**시그니처**:

```vb
Public Function T_AdoConnectDB(
    ByVal DB As ADODB.Connection,    ' Connection 객체
    ByVal USERID As String,           ' 사용자 ID
    ByVal sPass As String,            ' 비밀번호
    ByVal sIP As String,              ' 서버 IP
    ByVal sPort As String,            ' 포트 번호
    ByVal DB_Name As String,          ' DB 이름
    ByRef Er_Str As String            ' 에러 메시지 (출력)
) As Boolean
```

**역할**:
트랜잭션 서버(TIPS 서버)에 연결합니다. AdoConnectDB()와 유사하지만, 연결 실패 시 자동으로 재시도를 차단하는 플래그(Conn_Fail_YN)를 설정합니다.

**AdoConnectDB()와의 차이점**:

| 항목             | AdoConnectDB | T_AdoConnectDB            |
| ---------------- | ------------ | ------------------------- |
| **대상**         | 메인 DB 서버 | 트랜잭션 서버 (TIPS)      |
| **LocalDB 지원** | O            | X                         |
| **실패 시 처리** | 즉시 반환    | Conn_Fail_YN 플래그 설정  |
| **재시도 차단**  | 없음         | 플래그 체크로 재시도 방지 |

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 연결 실패 플래그 확인             │
│    If TIPS_SERVER.Conn_Fail_YN = 1  │
│       Exit Function (재시도 차단)    │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. POSON 연결 설정 확인              │
│    If POSON_CONN_YN <> "1"          │
│       Exit Function                  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. SQL Server 연결 (LocalDB 제외)   │
│    Provider=SQLOLEDB                │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
    ┌──────┐        ┌──────┐
    │ 성공 │        │ 실패 │
    └──────┘        └──────┘
        ↓               ↓
    True        Conn_Fail_YN = 1
                    False
```

**코드 분석**:

```vb
Public Function T_AdoConnectDB(ByVal DB As ADODB.Connection, ByVal USERID As String, ByVal sPass As String, _
                             ByVal sIP As String, ByVal sPort As String, ByVal DB_Name As String, ByRef Er_Str As String) As Boolean

    On Error GoTo DB_ERR

    ' ===== 1. 연결 실패 플래그 확인 =====
    If TIPS_SERVER.Conn_Fail_YN = 1 Then Exit Function
    If TIPS_SERVER.POSON_CONN_YN <> "1" Then Exit Function

    ' ===== 2. 기존 연결 종료 =====
    If DB.state = adStateOpen Then DB.Close

    ' ===== 3. 연결 옵션 설정 =====
    DB.ConnectionTimeout = 5
    DB.CursorLocation = adUseClient

    ' ===== 4. 포트 번호 포맷팅 =====
    If Trim(sPort) <> "" Then
        If IsNumeric(sPort) = False Then
            sPort = ""
        Else
            sPort = "," & sPort
        End If
    Else
        sPort = ""
    End If

    ' ===== 5. SQL Server 연결 (LocalDB 미지원) =====
    DB.Open "Provider=SQLOLEDB;Data Source=" & sIP & sPort & ";Initial Catalog=" & DB_Name & "; " & _
            " User Id=" & USERID & ";Password=" & sPass & ";"

    T_AdoConnectDB = True
    Exit Function

DB_ERR:
    Er_Str = err.Description & "(" & err.Number & ")"
    T_AdoConnectDB = False

    ' ===== 6. 연결 실패 플래그 설정 =====
    TIPS_SERVER.Conn_Fail_YN = 1
    Exit Function
End Function
```

**주요 차이점**:

1. **연결 실패 플래그 체크**

   ```vb
   If TIPS_SERVER.Conn_Fail_YN = 1 Then Exit Function
   ```

   - 이전에 연결 실패했으면 재시도하지 않음
   - 네트워크 부하 감소

2. **연결 실패 시 플래그 설정**
   ```vb
   DB_ERR:
       TIPS_SERVER.Conn_Fail_YN = 1
   ```

   - 실패 시 플래그를 1로 설정하여 다음 호출 차단

---

### 4.3 MDBConnect_DB()

**시그니처**:

```vb
Public Function MDBConnect_DB(
    ByVal DB As ADODB.Connection,    ' Connection 객체
    ByVal DbNm As String,             ' MDB 파일 경로
    Optional ByVal PassWd As String   ' DB 비밀번호 (선택)
) As Boolean
```

**역할**:
Microsoft Access 데이터베이스(.mdb 파일)에 연결합니다. SQL Server 연결 실패 시 Fallback DB로 사용됩니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 이미 연결되어 있는지 확인         │
│    If DB.state = adStateOpen        │
│       Exit Function (중복 방지)     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. 클라이언트 커서 설정              │
│    CursorLocation = adUseClient     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. Access DB 연결                   │
│    Provider=MSDataShape             │
│    DATA PROVIDER=Jet.OLEDB.4.0      │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
    ┌──────┐        ┌──────┐
    │ 성공 │        │ 실패 │
    │ True │        │MsgBox│
    └──────┘        └──────┘
```

**코드 분석**:

```vb
Public Function MDBConnect_DB(ByVal DB As ADODB.Connection, ByVal DbNm$, Optional ByVal PassWd$) As Boolean
    On Error GoTo DB_ERR

    ' ===== 1. 중복 연결 방지 =====
    If DB.state = adStateOpen Then Exit Function

    ' ===== 2. 클라이언트 커서 설정 =====
    DB.CursorLocation = adUseClient

    ' ===== 3. Access DB 연결 =====
    DB.Open "Provider=MSDataShape; DATA PROVIDER=Microsoft.Jet.OLEDB.4.0;" _
                    & "Data Source=" & DbNm & ";JET OLEDB:DataBase PassWord=" & PassWd & ";"

    ' 주석 처리된 대체 연결 문자열:
    ' DB.Open "PROVIDER=MSDataShape;Driver={Microsoft Access Driver (*.mdb)};Dbq=TipsPos_Local.mdb;" & _
    '         "DefaultDir=" & App.Path & "\Data\" & ";Uid=Admin;pwd=" & PassWd

    MDBConnect_DB = True
    Exit Function

DB_ERR:
    MsgBox err.Description
    Screen.MousePointer = 0
    Exit Function
End Function
```

**파라미터 상세**:

- **DB**: 연결할 Connection 객체
- **DbNm**: MDB 파일의 전체 경로 (예: `C:\Data\TipsPos_Local.mdb`)
- **PassWd**: 데이터베이스 비밀번호 (Optional, 기본값 "")

**반환값**:

- **True**: 연결 성공
- **False**: 연결 실패 (암묵적, Exit Function으로 인해)

**주요 특징**:

1. **MSDataShape Provider 사용**

   ```vb
   Provider=MSDataShape; DATA PROVIDER=Microsoft.Jet.OLEDB.4.0
   ```

   - 계층적 레코드셋 지원
   - Access 2000-2003 호환

2. **중복 연결 방지**

   ```vb
   If DB.state = adStateOpen Then Exit Function
   ```

   - 이미 연결되어 있으면 아무 작업도 하지 않음
   - 에러가 아닌 정상 종료

3. **비밀번호 선택적**
   ```vb
   Optional ByVal PassWd As String
   ```

   - 비밀번호 없는 MDB도 지원

---

### 4.4 AdoDisconnect()

**시그니처**:

```vb
Public Sub AdoDisconnect(
    ByVal DB As ADODB.Connection     ' Connection 객체
)
```

**역할**:
ADODB.Connection 객체를 안전하게 종료하고 메모리에서 해제합니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 연결 상태 확인                    │
│    If DB.state <> 1 (adStateOpen)   │
│       Exit Sub                       │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. 연결 종료                         │
│    DB.Close                          │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. 객체 메모리 해제                  │
│    Set DB = Nothing                  │
└─────────────────────────────────────┘
```

**코드 분석**:

```vb
Public Sub AdoDisconnect(ByVal DB As ADODB.Connection)
    ' ===== 1. 연결 상태 확인 =====
    If DB.state <> 1 Then Exit Sub  ' 1 = adStateOpen

    ' ===== 2. 연결 종료 =====
    DB.Close

    ' ===== 3. 메모리 해제 =====
    Set DB = Nothing
End Sub
```

**주요 특징**:

1. **안전한 종료**

   ```vb
   If DB.state <> 1 Then Exit Sub
   ```

   - 이미 닫힌 연결을 다시 닫으려 하지 않음

2. **메모리 누수 방지**
   ```vb
   Set DB = Nothing
   ```

   - VB6에서 객체 메모리 명시적 해제

**사용 예**:

```vb
' 프로그램 종료 시
Call AdoDisconnect(DBcon)
Call AdoDisconnect(DBcon1)
Call AdoDisconnect(Tran_DB)
```

---

### 4.5 Tran_Connect()

**시그니처**:

```vb
Public Sub Tran_Connect()
```

**역할**:
트랜잭션 서버에 연결을 시도하고 연결 상태를 `Trans.Chk` 플래그에 저장합니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 이미 연결되어 있는지 확인         │
│    If Trans.Chk = False             │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. T_AdoConnectDB() 호출             │
│    Tran_DB, Trans 설정 전달          │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
    ┌──────┐        ┌──────┐
    │ 성공 │        │ 실패 │
    └──────┘        └──────┘
        ↓               ↓
  Trans.Chk=True  Trans.Chk=False
```

**코드 분석**:

```vb
Public Sub Tran_Connect()
Dim Er_Str As String
On Error GoTo err

    ' ===== 1. 연결 상태 확인 =====
    If Trans.Chk = False Then
        ' ===== 2. 트랜잭션 서버 연결 시도 =====
        If T_AdoConnectDB(Tran_DB, Trans.Name, Trans.Pass, Trans.IP, Trans.Port, Trans.DB, Er_Str) Then
            Trans.Chk = True
        Else
            Trans.Chk = False
        End If
    End If

    Exit Sub
err:
    Trans.Chk = False
End Sub
```

**주요 특징**:

1. **연결 캐싱**

   ```vb
   If Trans.Chk = False Then
   ```

   - 이미 연결되어 있으면 재연결하지 않음

2. **전역 플래그 사용**
   ```vb
   Trans.Chk = True/False
   ```

   - 다른 함수에서 연결 상태 확인 가능

---

### 4.6 Tran_Execute()

**시그니처**:

```vb
Public Sub Tran_Execute(
    Query As String,        ' 실행할 SQL 쿼리
    Fail_Date As String     ' 실패 시 로그 기록용 타임스탬프
)
```

**역할**:
트랜잭션 서버에 쿼리를 실행하고, 실패 시 로그 파일에 기록합니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 쿼리 유효성 확인                  │
│    If Query <> ""                   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. Tran_DB.Execute(Query)           │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
    ┌──────┐        ┌──────┐
    │ 성공 │        │ 실패 │
    └──────┘        └──────┘
        ↓               ↓
      종료      Trans.Chk=False
                Tran_Log_Write()
```

**코드 분석**:

```vb
Public Sub Tran_Execute(Query As String, Fail_Date As String)

On Error GoTo err

    ' ===== 1. 쿼리 유효성 확인 =====
    If Query <> "" Then
        ' ===== 2. 쿼리 실행 =====
        Tran_DB.Execute (Query)

        ' 성공 로그는 주석 처리됨
        ' Call Tran_Log_Write(Query, Fail_Date, 1)
    End If

    Exit Sub
err:
    ' ===== 3. 에러 처리 =====
    Trans.Chk = False       ' 연결 실패 플래그 설정

    ' ===== 4. 실패 쿼리 로그 기록 =====
    Call Tran_Log_Write(Query, Fail_Date, 0)
End Sub
```

**파라미터 상세**:

- **Query**: 실행할 SQL 쿼리 (INSERT, UPDATE, DELETE 등)
- **Fail_Date**: 로그 기록용 타임스탬프 (예: `"2026-01-29 14:30:15"`)

**주요 특징**:

1. **에러 시 자동 로그 기록**

   ```vb
   err:
       Call Tran_Log_Write(Query, Fail_Date, 0)
   ```

   - 실패한 쿼리를 `Trans_List.Log` 파일에 저장
   - 나중에 재전송 가능

2. **연결 상태 플래그 갱신**
   ```vb
   Trans.Chk = False
   ```

   - 쿼리 실행 실패 시 연결 끊김으로 간주

---

### 4.7 Tran_Log_Write()

**시그니처**:

```vb
Public Sub Tran_Log_Write(
    Query As String,        ' 로그에 기록할 쿼리
    Fail_Date As String,    ' 타임스탬프
    Gubun As Integer        ' 0: 실패 로그, 1: 성공 로그
)
```

**역할**:
트랜잭션 쿼리 실행 결과를 로그 파일에 기록합니다.

**로그 파일 경로**:

- **실패 로그**: `App.Path\Tran_Log\Trans_List.Log`
- **성공 로그**: `App.Path\Tran_Log\OK\YYYY-MM-DD.Log`

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 사용 여부 확인                    │
│    If Trans.Use_YN <> "1"           │
│       Exit Sub                       │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. 쿼리 유효성 확인                  │
│    If Query = ""                    │
│       Exit Sub                       │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. 폴더 생성 (없으면)                │
│    \Tran_Log                         │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ Gubun = 1    │  │ Gubun = 0    │
│ (성공)       │  │ (실패)       │
└──────────────┘  └──────────────┘
        ↓               ↓
    \OK\날짜.Log  Trans_List.Log
        ↓               ↓
┌─────────────────────────────────────┐
│ 4. 로그 기록                         │
│    F.WriteLine W_Str                │
└─────────────────────────────────────┘
```

**코드 분석**:

```vb
Public Sub Tran_Log_Write(Query As String, Fail_Date As String, Gubun As Integer)
Dim F_Path, FF_Path As String
On Error GoTo err

    ' ===== 1. 사용 여부 확인 =====
    If Trans.Use_YN <> "1" Then Exit Sub

    ' ===== 2. 쿼리 유효성 확인 =====
    If Query = "" Then Exit Sub

    ' ===== 3. FileSystemObject 생성 =====
    Set FS = CreateObject("Scripting.FileSystemObject")

    F_Path = App.Path & "\Tran_Log"

    ' ===== 4. 폴더 생성 =====
    If FS.FolderExists(F_Path) = False Then
        FS.CreateFolder (F_Path)
    End If

    ' ===== 5. 로그 타입별 처리 =====
    If Gubun = 1 Then
        ' 성공 로그
        W_Str = Fail_Date & "|" & Query & "|" & Format(Now, "YYYY-MM-DD HH:MM:SS")

        F_Path = F_Path & "\OK"

        If FS.FolderExists(F_Path) = False Then
            FS.CreateFolder (F_Path)
        End If

        FF_Path = F_Path & "\" & Format(Frm_SaleMain.Lbl_SaleDate.Caption, "yyyy-mm-dd") & ".Log"
    Else
        ' 실패 로그
        W_Str = Fail_Date & "|" & Query

        FF_Path = F_Path & "\" & "Trans_List.Log"
    End If

    ' ===== 6. 파일 생성 (없으면) =====
    If FS.FileExists(FF_Path) = False Then
        FS.CreateTextFile (FF_Path)
    End If

    ' ===== 7. 로그 기록 =====
    Set F = FS.OpenTextFile(FF_Path, ForAppending, TristateFalse)
    F.WriteLine W_Str
    F.Close

    Set FS = Nothing

    Exit Sub
err:
End Sub
```

**로그 포맷**:

**실패 로그** (Gubun = 0):

```
2026-01-29 14:30:15|INSERT INTO Sales VALUES (...)
```

**성공 로그** (Gubun = 1):

```
2026-01-29 14:30:15|INSERT INTO Sales VALUES (...)|2026-01-29 14:32:20
```

(원래 시간 | 쿼리 | 성공 시간)

---

### 4.8 Tran_Log_Send()

**시그니처**:

```vb
Public Sub Tran_Log_Send(
    Log_Path As String      ' 로그 폴더 경로
)
```

**역할**:
`Trans_List.Log` 파일에 저장된 실패한 쿼리를 읽어서 트랜잭션 서버에 재전송합니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. Trans_List.Log 파일 확인          │
│    If 파일 없음 → Exit               │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. 로그 파일 읽기                    │
│    F.ReadAll → 전체 내용             │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. 원본 로그 파일 삭제               │
│    FS.DeleteFile FF_Path            │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. 각 라인 파싱                      │
│    Split(내용, vbCrLf)               │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 5. 첫 번째 쿼리에서 DB 연결 시도     │
│    Call Tran_Connect                │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ Trans.Chk=   │  │ Trans.Chk=   │
│ True         │  │ False        │
└──────────────┘  └──────────────┘
        ↓               ↓
  Tran_Execute()  Tran_Log_Write()
    (재전송)         (다시 기록)
```

**코드 분석**:

```vb
Public Sub Tran_Log_Send(Log_Path As String)
Dim tmp_str() As String
Dim Tmp_Str_Line() As String
Dim Tmp_Str_all As String
Dim i As Long
Dim Tran_Chk As Boolean
Dim F_Path, FF_Path As String

On Error GoTo err
    Tran_Chk = False

    Set FS = CreateObject("Scripting.FileSystemObject")

    F_Path = Log_Path

    ' ===== 1. 폴더 확인 =====
    If FS.FolderExists(F_Path) = False Then
        FS.CreateFolder (F_Path)
    End If

    FF_Path = F_Path & "\" & "Trans_List.Log"

    ' ===== 2. 파일 존재 확인 =====
    If FS.FileExists(FF_Path) = False Then
        ' 파일 없음 → 종료
    Else
        ' ===== 3. 로그 파일 읽기 =====
        Set F = FS.OpenTextFile(FF_Path, ForReading)
        Tmp_Str_all = F.ReadAll
        F.Close

        ' ===== 4. 원본 파일 삭제 =====
        FS.DeleteFile FF_Path

        ' ===== 5. 각 라인 처리 =====
        If Tmp_Str_all <> "" Then
            Tmp_Str_Line = Split(Tmp_Str_all, vbCrLf)

            For i = 0 To UBound(Tmp_Str_Line) - 1
                If Tmp_Str_Line(i) <> "" Then
                    tmp_str = Split(Tmp_Str_Line(i), "|")

                    If UBound(tmp_str) = 1 Then
                        tmp_str(1) = Trim(tmp_str(1))

                        If tmp_str(1) <> "" Then
                            ' ===== 6. 첫 번째 쿼리에서 DB 연결 =====
                            If i = 0 Then
                                Call Tran_Connect
                            End If

                            ' ===== 7. 연결 상태에 따라 처리 =====
                            If Trans.Chk = True Then
                                ' 재전송 성공
                                Call Tran_Execute(Replace(tmp_str(1), vbCrLf, ""), tmp_str(0))
                            Else
                                ' 재전송 실패 → 다시 로그 기록
                                Call Tran_Log_Write(Replace(tmp_str(1), vbCrLf, ""), tmp_str(0), 0)
                            End If
                        End If
                    End If
                End If
            Next i
        End If
    End If

    Exit Sub
err:
End Sub
```

**주요 특징**:

1. **Read-Delete-Process 패턴**

   ```vb
   F.ReadAll
   FS.DeleteFile FF_Path
   ' 이후 처리
   ```

   - 먼저 파일을 읽고 삭제한 후 처리
   - 처리 중 새로운 실패 발생 시 다시 기록 가능

2. **지연 연결**

   ```vb
   If i = 0 Then
       Call Tran_Connect
   ```

   - 첫 번째 쿼리 처리 시에만 연결 시도
   - 불필요한 연결 시도 방지

3. **재실패 시 재로깅**
   ```vb
   If Trans.Chk = True Then
       Call Tran_Execute(...)  ' 재전송
   Else
       Call Tran_Log_Write(..., 0)  ' 다시 기록
   ```

   - 재전송 실패 시 다시 로그에 기록
   - 데이터 손실 방지

---

## 5. DB 연결 방법

### 5.1 SQL Server 연결

**일반 SQL Server**:

```vb
Provider=SQLOLEDB;
Data Source=192.168.1.100,1433;
Initial Catalog=TipsPos;
User Id=sa;
Password=1234;
```

**SQL Server 2012 LocalDB**:

```vb
Provider=SQLNCLI11;
Data Source=(localdb)\v11.0;
Integrated Security=SSPI;
```

**연결 옵션**:

```vb
DB.ConnectionTimeout = 5        ' 타임아웃 5초
DB.CursorLocation = adUseClient ' 클라이언트 커서
```

### 5.2 Access DB 연결

**연결 문자열**:

```vb
Provider=MSDataShape;
DATA PROVIDER=Microsoft.Jet.OLEDB.4.0;
Data Source=C:\Data\TipsPos_Local.mdb;
JET OLEDB:DataBase PassWord=1234;
```

**지원 버전**:

- Access 2000
- Access 2002 (XP)
- Access 2003

### 5.3 연결 흐름도

```
Main.bas: Sub Main()
    ↓
┌─────────────────────────────────────┐
│ AdoConnectDB(DBcon, ...)            │
│ → SQL Server 메인 DB 연결           │
└─────────────────────────────────────┘
    ↓ 실패
┌─────────────────────────────────────┐
│ MDBConnect_DB(DBcon1, ...)          │
│ → Access DB Fallback 연결           │
└─────────────────────────────────────┘
    ↓ 실패
┌─────────────────────────────────────┐
│ 오프라인 모드                        │
│ Conn_MDB = 1                        │
└─────────────────────────────────────┘

별도로 트랜잭션 서버 연결:
┌─────────────────────────────────────┐
│ Tran_Connect()                      │
│ → T_AdoConnectDB(Tran_DB, ...)      │
└─────────────────────────────────────┘
```

---

## 6. 에러 처리 방식

### 6.1 에러 핸들링 패턴

**공통 패턴**:

```vb
Public Function AdoConnectDB(...) As Boolean
    On Error GoTo DB_ERR

    ' 정상 로직

    AdoConnectDB = True
    Exit Function

DB_ERR:
    Er_Str = err.Description & "(" & err.Number & ")"
    AdoConnectDB = False
    Exit Function
End Function
```

### 6.2 에러 메시지 형식

```
에러 설명문 (에러 번호)
```

**예시**:

```
[DBNETLIB][ConnectionOpen (Connect()).]SQL Server가 없거나 액세스가 거부되었습니다. (-2147467259)
```

### 6.3 함수별 에러 처리

| 함수               | 에러 시 반환   | 에러 메시지    | 추가 동작               |
| ------------------ | -------------- | -------------- | ----------------------- |
| **AdoConnectDB**   | False          | Er_Str (ByRef) | 없음                    |
| **T_AdoConnectDB** | False          | Er_Str (ByRef) | Conn_Fail_YN = 1        |
| **MDBConnect_DB**  | False (암묵적) | MsgBox 표시    | Screen.MousePointer = 0 |
| **AdoDisconnect**  | (void)         | 에러 무시      | 없음                    |
| **Tran_Execute**   | (void)         | 로그 기록      | Trans.Chk = False       |
| **Tran_Log_Write** | (void)         | 에러 무시      | 없음                    |
| **Tran_Log_Send**  | (void)         | 에러 무시      | 없음                    |

### 6.4 에러 복구 전략

**1단계: SQL Server**

```vb
If AdoConnectDB(DBcon) = False Then
    ' 2단계로 이동
End If
```

**2단계: Access DB**

```vb
If MDBConnect_DB(DBcon1) = False Then
    ' 3단계로 이동
End If
```

**3단계: 오프라인 모드**

```vb
Conn_MDB = 1
Frm_Main.Show  ' 제한된 기능으로 실행
```

---

## 7. 호출 관계

### 7.1 이 파일이 호출하는 함수

| 함수명                                         | 정의 위치 | 역할             |
| ---------------------------------------------- | --------- | ---------------- |
| **err.Description**                            | VB6 내장  | 에러 메시지      |
| **err.Number**                                 | VB6 내장  | 에러 코드        |
| **CreateObject("Scripting.FileSystemObject")** | VB6 내장  | 파일 시스템 접근 |
| **Format()**                                   | VB6 내장  | 날짜/시간 포맷팅 |

### 7.2 이 파일의 함수를 호출하는 곳

**AdoConnectDB**:

- `Main.bas`: Sub Main() - 프로그램 시작 시
- `Mdl_Main.bas`: 재연결 로직

**T_AdoConnectDB**:

- `DBConnection.bas`: Tran_Connect()
- `Mdl_Function.bas`: TIPS 서버 연결
- `MDI_Kakao.bas`: 카카오 연동

**MDBConnect_DB**:

- `Main.bas`: Sub Main() - Fallback DB
- `Mdl_Function.bas`: 카드 결제 로컬 DB
- `Mdl_Main.bas`: 재연결 로직

**AdoDisconnect**:

- `Mdl_Main.bas`: 프로그램 종료 시 (주석 처리됨)

**Tran_Connect**:

- `DBConnection.bas`: Tran_Log_Send()

**Tran_Execute**:

- `DBConnection.bas`: Tran_Log_Send()

**Tran_Log_Write**:

- `DBConnection.bas`: Tran_Execute(), Tran_Log_Send()

**Tran_Log_Send**:

- 타이머 이벤트 또는 수동 호출 (추정)

### 7.3 호출 그래프

```
[프로그램 시작]
    ↓
Main.bas: Sub Main()
    ↓
    ├─→ AdoConnectDB(DBcon, ...)
    │       ↓ (실패 시)
    └─→ MDBConnect_DB(DBcon1, ...)

[판매 처리]
    ↓
Frm_SaleMain.frm
    ↓
Mdl_Function.bas
    ↓
    ├─→ AdoConnectDB(DBcon, ...)
    ├─→ T_AdoConnectDB(T_server, ...)
    └─→ MDBConnect_DB(DBCON1, ...)

[트랜잭션 처리]
    ↓
Tran_Connect()
    ↓
T_AdoConnectDB(Tran_DB, ...)
    ↓
Tran_Execute(Query, Fail_Date)
    ↓ (실패 시)
Tran_Log_Write(Query, Fail_Date, 0)

[로그 재전송]
    ↓
Tran_Log_Send(Log_Path)
    ↓
    ├─→ Tran_Connect()
    ├─→ Tran_Execute(...)
    └─→ Tran_Log_Write(...) (재실패 시)

[프로그램 종료]
    ↓
AdoDisconnect(DBcon)
AdoDisconnect(DBcon1)
AdoDisconnect(Tran_DB)
```

### 7.4 의존성 다이어그램

```
DBConnection.bas
    ↓
    ├─→ ADODB.Connection (참조)
    │   └─→ Microsoft ActiveX Data Objects 2.8 Library
    │
    ├─→ Scripting.FileSystemObject
    │   └─→ Microsoft Scripting Runtime
    │
    ├─→ Mdl_Main.bas (전역 변수)
    │   ├─→ DBcon, DBcon1, Tran_DB
    │   ├─→ DB, Trans, TIPS_SERVER
    │   └─→ Conn_MDB
    │
    └─→ Frm_SaleMain.frm
        └─→ Lbl_SaleDate.Caption (로그 파일명 생성용)
```

---

## 8. 마이그레이션 고려사항

### 8.1 mssql 패키지로 전환

**VB6 → Node.js + mssql**

**VB6 AdoConnectDB**:

```vb
Public Function AdoConnectDB(...) As Boolean
    sDB.Open "Provider=SQLOLEDB;Data Source=" & sIP & sPort & ...
    AdoConnectDB = True
End Function
```

**Node.js mssql**:

```javascript
// config/database.js
import sql from "mssql";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // Azure SQL 필수
    trustServerCertificate: true, // 로컬 개발용
    connectTimeout: 5000, // 5초 타임아웃
    requestTimeout: 30000, // 30초 타임아웃
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

export async function connectDB() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log("Connected to SQL Server");
    }
    return pool;
  } catch (error) {
    console.error("DB Connection Error:", error.message);
    throw error;
  }
}

export async function disconnectDB() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("Disconnected from SQL Server");
    }
  } catch (error) {
    console.error("DB Disconnect Error:", error.message);
  }
}

export { sql };
```

### 8.2 기능 매핑 테이블

| VB6 기능              | mssql 패키지          | 비고                      |
| --------------------- | --------------------- | ------------------------- |
| **AdoConnectDB**      | `sql.connect(config)` | Connection Pool 자동 관리 |
| **T_AdoConnectDB**    | 별도 config 객체      | 다중 DB 연결 지원         |
| **MDBConnect_DB**     | 제거                  | Access DB 불필요          |
| **AdoDisconnect**     | `pool.close()`        | 명시적 해제               |
| **ConnectionTimeout** | `connectTimeout`      | ms 단위                   |
| **CursorLocation**    | 불필요                | 자동 처리                 |
| **Provider=SQLOLEDB** | 제거                  | Node.js TDS 드라이버      |
| **On Error GoTo**     | `try-catch`           | 현대적 에러 처리          |
| **ByRef Er_Str**      | 제거                  | 예외 객체 사용            |

### 8.3 Connection Pool 사용

**VB6의 문제점**:

```vb
' 매번 새 연결 생성
AdoConnectDB(DBcon, ...)
' ...
sDB.Close
```

- 연결 생성/종료 오버헤드
- 동시 연결 수 관리 어려움

**mssql 패키지의 해결책**:

```javascript
// Connection Pool 자동 관리
const pool = await sql.connect(config);

// 요청마다 풀에서 연결 재사용
const result = await pool
  .request()
  .input("id", sql.Int, 123)
  .query("SELECT * FROM Products WHERE id = @id");

// 연결 자동 반환 (close() 불필요)
```

**Pool 설정**:

```javascript
pool: {
    max: 10,                    // 최대 연결 수
    min: 0,                     // 최소 유지 연결 수
    idleTimeoutMillis: 30000,   // 유휴 연결 타임아웃
}
```

### 8.4 트랜잭션 처리 개선

**VB6 Tran_Execute**:

```vb
Public Sub Tran_Execute(Query As String, Fail_Date As String)
    On Error GoTo err

    Tran_DB.Execute (Query)
    Exit Sub

err:
    Trans.Chk = False
    Call Tran_Log_Write(Query, Fail_Date, 0)
End Sub
```

**Node.js Transaction + Queue**:

```javascript
// utils/transactionQueue.js
import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";

class TransactionQueue extends EventEmitter {
  constructor(pool) {
    super();
    this.pool = pool;
    this.logPath = path.join(process.cwd(), "logs", "transactions");
    this.failedLogFile = path.join(this.logPath, "failed.jsonl");
  }

  async execute(query, params = {}) {
    try {
      const result = await this.pool
        .request()
        .input("params", sql.NVarChar, JSON.stringify(params))
        .query(query);

      // 성공 로그 (선택적)
      // await this.logSuccess(query, params);

      return result;
    } catch (error) {
      console.error("Transaction failed:", error.message);

      // 실패 로그 기록
      await this.logFailure(query, params, error.message);

      throw error;
    }
  }

  async logFailure(query, params, errorMessage) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      query,
      params,
      error: errorMessage,
    };

    await fs.mkdir(this.logPath, { recursive: true });
    await fs.appendFile(this.failedLogFile, JSON.stringify(logEntry) + "\n");
  }

  async retryFailed() {
    try {
      const content = await fs.readFile(this.failedLogFile, "utf-8");
      const lines = content.trim().split("\n");

      if (lines.length === 0) return;

      // 원본 파일 삭제
      await fs.unlink(this.failedLogFile);

      // 각 실패한 쿼리 재시도
      for (const line of lines) {
        if (!line) continue;

        const { query, params } = JSON.parse(line);

        try {
          await this.execute(query, params);
          console.log("Retry successful:", query.substring(0, 50));
        } catch (error) {
          // 재실패 시 다시 로그 기록
          await this.logFailure(query, params, error.message);
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Retry failed:", error.message);
      }
    }
  }
}

export default TransactionQueue;
```

**사용 예**:

```javascript
// server.js
import { connectDB } from "./config/database.js";
import TransactionQueue from "./utils/transactionQueue.js";

const pool = await connectDB();
const txQueue = new TransactionQueue(pool);

// 트랜잭션 실행
try {
  await txQueue.execute("INSERT INTO Sales (ProductId, Quantity) VALUES (@pid, @qty)", {
    pid: 123,
    qty: 2,
  });
} catch (error) {
  // 로그에 자동 기록됨
}

// 주기적 재시도 (예: 1시간마다)
setInterval(
  () => {
    txQueue.retryFailed();
  },
  60 * 60 * 1000,
);
```

### 8.5 LocalDB 대체

**VB6 LocalDB**:

```vb
If DB.Server_Type = "1" Then
    sDB.Open "Provider=SQLNCLI11;Data Source=(localdb)\v11.0;Integrated Security=SSPI;"
End If
```

**현대 스택 대체안**:

**Option 1: Docker SQL Server**

```yaml
# docker-compose.yml
version: "3.8"
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: Y
      SA_PASSWORD: YourStrong!Passw0rd
      MSSQL_PID: Express
    ports:
      - "1433:1433"
    volumes:
      - mssql-data:/var/opt/mssql
volumes:
  mssql-data:
```

**Option 2: SQLite (간단한 로컬 DB)**

```javascript
// 오프라인 모드용
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
  filename: "./data/local.db",
  driver: sqlite3.Database,
});
```

### 8.6 에러 처리 개선

**VB6 에러 처리**:

```vb
On Error GoTo DB_ERR

' 로직

DB_ERR:
    Er_Str = err.Description & "(" & err.Number & ")"
    AdoConnectDB = False
```

**Node.js 현대적 에러 처리**:

```javascript
// utils/errorHandler.js
class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "DatabaseError";
    this.originalError = originalError;
    this.code = originalError?.code;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// 사용 예
try {
  await pool.request().query("SELECT * FROM Users");
} catch (error) {
  if (error.code === "ETIMEOUT") {
    throw new DatabaseError("DB connection timeout", error);
  } else if (error.code === "ELOGIN") {
    throw new DatabaseError("DB authentication failed", error);
  } else {
    throw new DatabaseError("DB operation failed", error);
  }
}
```

### 8.7 Fallback 전략 개선

**VB6 Fallback**:

```
SQL Server → Access DB → 오프라인 모드
```

**현대 스택 Fallback**:

```javascript
// services/dbFallback.js
import { connectDB } from "../config/database.js";
import { openCache } from "../config/cache.js";

class DBFallback {
  constructor() {
    this.primaryPool = null;
    this.cacheDB = null;
    this.isOnline = false;
  }

  async connect() {
    try {
      // 1차: Primary SQL Server
      this.primaryPool = await connectDB();
      this.isOnline = true;
      console.log("Connected to primary DB");
    } catch (error) {
      console.warn("Primary DB failed, using cache:", error.message);

      try {
        // 2차: Cache DB (SQLite/Redis)
        this.cacheDB = await openCache();
        this.isOnline = false;
        console.log("Running in offline mode");
      } catch (cacheError) {
        throw new Error("All DB connections failed");
      }
    }
  }

  async query(sql, params) {
    if (this.isOnline) {
      return await this.primaryPool.request().query(sql);
    } else {
      // Cache에서 읽기 전용
      return await this.cacheDB.all(sql);
    }
  }

  async reconnect() {
    try {
      this.primaryPool = await connectDB();
      this.isOnline = true;

      // 캐시에 쌓인 변경사항 동기화
      await this.syncCache();
    } catch (error) {
      console.error("Reconnect failed:", error.message);
    }
  }

  async syncCache() {
    // 캐시 DB의 변경사항을 Primary DB로 전송
    // (Tran_Log_Send() 로직과 유사)
  }
}

export default new DBFallback();
```

### 8.8 연결 문자열 보안

**VB6 (평문 저장)**:

```ini
; Config.ini
[SQL]
IP=192.168.1.100
Port=1433
UserID=sa
Password=1234  ; 평문!
```

**Node.js (환경 변수 + 암호화)**:

```bash
# .env (gitignore에 포함)
DB_SERVER=192.168.1.100
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_NAME=TipsPos
DB_ENCRYPT=true
```

```javascript
// config/database.js
import dotenv from "dotenv";
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  // ...
};
```

### 8.9 성능 개선

**VB6 성능 문제**:

1. 매 쿼리마다 연결 생성/종료
2. 타임아웃 5초 (너무 짧음)
3. 클라이언트 커서로 인한 메모리 사용

**mssql 패키지 개선**:

```javascript
// Connection Pool로 재사용
const pool = await sql.connect(config);

// 적절한 타임아웃
connectTimeout: 5000,   // 연결: 5초
requestTimeout: 30000,  // 쿼리: 30초

// Prepared Statement (SQL Injection 방지 + 성능)
const ps = new sql.PreparedStatement(pool);
ps.input('id', sql.Int);
await ps.prepare('SELECT * FROM Users WHERE id = @id');
const result = await ps.execute({ id: 123 });
await ps.unprepare();
```

### 8.10 모니터링 및 로깅

**VB6 (텍스트 파일 로그)**:

```vb
F.WriteLine Fail_Date & "|" & Query
```

**Node.js (구조화된 로깅)**:

```javascript
// utils/logger.js
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: "logs/db-error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/db-combined.log",
    }),
  ],
});

// 사용 예
logger.error("DB query failed", {
  query: "SELECT * FROM Users",
  params: { id: 123 },
  error: error.message,
  code: error.code,
});
```

---

## 9. 결론

DBConnection.bas는 POSON POS 시스템의 핵심 데이터베이스 연결 모듈로, 다음과 같은 역할을 수행합니다:

### 9.1 주요 기능

1. **다중 DB 지원**: SQL Server, LocalDB, Access DB
2. **Fallback 전략**: 연결 실패 시 자동 대체
3. **트랜잭션 로깅**: 실패한 쿼리 저장 및 재전송
4. **연결 관리**: 연결 생성, 유지, 해제

### 9.2 설계 특징

- **견고성**: 3단계 Fallback (SQL → Access → 오프라인)
- **안정성**: 에러 처리 및 로그 기록
- **유연성**: LocalDB 및 원격 서버 모두 지원

### 9.3 마이그레이션 권장사항

| 항목              | 권장 방법                        |
| ----------------- | -------------------------------- |
| **DB 드라이버**   | `mssql` 패키지 (Node.js)         |
| **연결 관리**     | Connection Pool 사용             |
| **Fallback**      | SQLite/Redis 캐시 + 동기화       |
| **트랜잭션 로그** | JSONL 파일 + Queue 시스템        |
| **LocalDB**       | Docker SQL Server 또는 Azure SQL |
| **Access DB**     | 완전 제거 (불필요)               |
| **에러 처리**     | try-catch + 구조화된 로깅        |
| **보안**          | 환경 변수 + TLS 암호화           |

### 9.4 다음 분석 파일

- **Mdl_Main.bas**: 전역 변수 및 DB 설정 구조체
- **Mdl_Function.bas**: DB 쿼리 실행 함수들
- **Frm_Login.frm**: 로그인 및 인증 로직

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
