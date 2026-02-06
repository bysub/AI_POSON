# Main.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Main.bas`
**파일 크기**: 1.5KB
**역할**: 프로그램 진입점 (Entry Point)
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [전역 변수 및 상수](#2-전역-변수-및-상수)
3. [함수 목록](#3-함수-목록)
4. [주요 함수 상세 분석](#4-주요-함수-상세-분석)
5. [호출 관계](#5-호출-관계)
6. [마이그레이션 고려사항](#6-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

VB6 애플리케이션의 진입점(Entry Point)으로, 프로그램 시작 시 최초로 실행되는 코드를 포함합니다.

### 1.2 주요 역할

- 프로그램 중복 실행 방지
- 설정 파일(Config.ini) 초기화
- 데이터베이스 연결 시도 (SQL Server → Access DB)
- 초기 화면 표시 (로그인 또는 메인 화면)

### 1.3 코드 구조

```
Option Explicit
    ↓
전역 변수/상수 정의
    ↓
Sub Main()
    ↓
프로그램 시작
```

---

## 2. 전역 변수 및 상수

### 2.1 상수

```vb
Public Const Enterprise = "(주)천도시스템"
```

**용도**:

- 회사명 표시
- 메시지 박스 타이틀
- 에러 메시지 출처 표시

**사용 위치**:

- MsgBox 타이틀
- 에러 다이얼로그

### 2.2 전역 변수

```vb
Public User_Name As String  ' 판매자 명
Public SIniFile As String   ' INI파일 경로
```

#### User_Name

- **타입**: String
- **용도**: 로그인한 사용자명 저장
- **초기화**: Frm_Login에서 설정
- **사용**: 판매 기록, 로그 기록, 권한 확인

#### SIniFile

- **타입**: String
- **용도**: Config.ini 파일의 전체 경로
- **초기화**: `App.Path & "\Config.ini"`
- **사용**: 설정 읽기/쓰기

---

## 3. 함수 목록

### 3.1 Public 함수

| 함수명   | 반환 타입  | 파라미터 | 역할            |
| -------- | ---------- | -------- | --------------- |
| **Main** | Sub (void) | 없음     | 프로그램 진입점 |

---

## 4. 주요 함수 상세 분석

### 4.1 Sub Main()

**시그니처**:

```vb
Sub Main()
```

**역할**:
프로그램 최초 실행 시 호출되는 진입점. VB6 프로젝트 속성에서 "Startup Object"로 지정됨.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 중복 실행 확인                    │
│    If App.PrevInstance Then         │
│       MsgBox "이미 실행중입니다."    │
│       End                            │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. 마우스 커서 변경                  │
│    Screen.MousePointer = 11 (대기)  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. Config.ini 경로 설정              │
│    SIniFile = App.Path & "\Config.ini"│
│    Call FileExists(SIniFile, 1)     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. DB 연결 시도 (SQL Server)         │
│    If adoConnectDB(DBcon) = False   │
└─────────────────────────────────────┘
        ↓ 실패              ↓ 성공
┌───────────────┐   ┌───────────────┐
│ 5a. Access DB  │   │ 5b. SQL 연결  │
│ 연결 시도      │   │ 성공          │
│ MDBConnect_DB  │   │               │
└───────────────┘   └───────────────┘
        ↓                   ↓
┌───────────────┐   ┌───────────────┐
│ 6a. 양쪽 실패  │   │ 6b. 로그인    │
│ Frm_Main.Show │   │ Frm_Login.Show│
│ (오프라인)     │   │ (정상 모드)   │
└───────────────┘   └───────────────┘
```

**코드 분석**:

```vb
Sub Main()
    Dim MDB_Path As String
    Dim MDB_Pass As String

    ' ===== 1. 중복 실행 방지 =====
    If App.PrevInstance Then
       MsgBox "이미 실행중입니다.", vbCritical + vbSystemModal, Enterprise
       End   ' 프로그램 종료
    End If

    ' ===== 2. 대기 커서 표시 =====
    Screen.MousePointer = 11  ' hourglass

    ' ===== 3. 설정 파일 경로 =====
    SIniFile = App.Path & "\Config.ini"
    Call FileExists(SIniFile, 1)  ' 파일 존재 확인 또는 생성

    ' ===== 4. 로컬 변수 초기화 =====
    MDB_Path = App.Path
    MDB_Pass = ""

    ' ===== 5. SQL Server 연결 시도 =====
    If adoConnectDB(DBcon) = False Then
        ' SQL Server 연결 실패
        MsgBox "서버 연결 실패.......!!!!" & Chr(13) & "로컬 연결 시도합니다.", _
               vbCritical + vbSystemModal, "(주)천도시스템"

        ' ===== 6. Access DB 연결 시도 (Fallback) =====
        If MDBConnect_DB(DBcon1, C_DBPAth, C_Pass) = False Then
            ' Access DB도 실패
            MsgBox "로컬 DB도 없습니다.", vbCritical + vbSystemModal, Enterprise
            Conn_MDB = 1  ' 서버, 로컬 연결 실패 플래그
            Frm_Main.Show  ' 오프라인 모드로 메인 화면 표시
            Exit Sub
        Else
            ' Access DB 연결 성공
            Screen.MousePointer = 0  ' 기본 커서
            Connect_type = 2  ' Access DB 연결 타입
            Frm_Login.Show vbModal  ' 로그인 화면
        End If
    Else
        ' SQL Server 연결 성공
        Screen.MousePointer = 0
        Connect_type = 1  ' SQL Server 연결 타입

        If Conn_MDB = 1 Then
            Frm_Main.Show  ' 이전에 DB 연결 실패했던 경우
        Else
            Frm_Login.Show vbModal  ' 정상 로그인 화면
        End If
    End If
End Sub
```

**사용된 전역 변수** (다른 Module에서 정의):

- `DBcon`: SQL Server 연결 객체 (ADODB.Connection)
- `DBcon1`: Access DB 연결 객체 (ADODB.Connection)
- `C_DBPAth`: Access DB 파일 경로
- `C_Pass`: Access DB 비밀번호
- `Conn_MDB`: DB 연결 상태 플래그
- `Connect_type`: 연결 타입 (1=SQL, 2=Access)

**주요 로직**:

1. **중복 실행 방지**

   ```vb
   If App.PrevInstance Then
       MsgBox "이미 실행중입니다."
       End
   End If
   ```

   - VB6의 `App.PrevInstance` 속성 사용
   - 이미 실행 중이면 경고 후 프로그램 종료

2. **Fallback DB 전략**

   ```
   SQL Server 시도
       ↓ 실패
   Access DB 시도
       ↓ 실패
   오프라인 모드 (Frm_Main)
   ```

3. **모달 vs 모달리스**
   ```vb
   Frm_Login.Show vbModal   ' 모달: 로그인 필수
   Frm_Main.Show            ' 모달리스: 오프라인 모드
   ```

---

## 5. 호출 관계

### 5.1 이 파일이 호출하는 함수

| 함수명             | 정의 위치        | 역할                     |
| ------------------ | ---------------- | ------------------------ |
| **FileExists**     | Mdl_Function.bas | 파일 존재 확인 또는 생성 |
| **adoConnectDB**   | DBConnection.bas | SQL Server 연결          |
| **MDBConnect_DB**  | DBConnection.bas | Access DB 연결           |
| **Frm_Login.Show** | Frm_Login.frm    | 로그인 화면 표시         |
| **Frm_Main.Show**  | Frm_Main.frm     | 메인 화면 표시           |

### 5.2 호출 그래프

```
Main.bas (Sub Main)
    ↓
    ├─→ FileExists(SIniFile, 1)
    │   └─→ Mdl_Function.bas
    │
    ├─→ adoConnectDB(DBcon)
    │   └─→ DBConnection.bas
    │       └─→ SQL Server 연결
    │
    ├─→ MDBConnect_DB(DBcon1, C_DBPAth, C_Pass)
    │   └─→ DBConnection.bas
    │       └─→ Access DB 연결
    │
    ├─→ Frm_Login.Show vbModal
    │   └─→ Frm_Login.frm
    │       └─→ 사용자 인증
    │
    └─→ Frm_Main.Show
        └─→ Frm_Main.frm
            └─→ 메인 업무 화면
```

### 5.3 의존성

**직접 의존**:

- `Mdl_Function.bas`: FileExists 함수
- `DBConnection.bas`: DB 연결 함수들
- `Frm_Login.frm`: 로그인 화면
- `Frm_Main.frm`: 메인 화면

**간접 의존** (전역 변수를 통해):

- `Mdl_Main.bas`: DBcon, DBcon1 등 전역 변수 정의
- `config.ini`: 설정 파일

---

## 6. 마이그레이션 고려사항

### 6.1 현대 웹 스택 전환

**VB6 Main.bas → Node.js + Express**

```javascript
// server.js (Node.js)
import express from "express";
import { connectDB } from "./config/database.js";
import logger from "./utils/logger.js";

const app = express();

// 프로그램 시작
async function main() {
  try {
    // 1. 설정 로드
    await loadConfig();

    // 2. DB 연결
    await connectDB();

    // 3. Express 서버 시작
    app.listen(3000, () => {
      logger.info("Server started on port 3000");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);

    // Fallback: Read-only 모드
    startReadOnlyMode();
  }
}

main();
```

### 6.2 기능별 전환 매핑

| VB6 기능                | 현대 스택    | 비고               |
| ----------------------- | ------------ | ------------------ |
| **App.PrevInstance**    | Process 관리 | PM2, Cluster 모듈  |
| **Screen.MousePointer** | CSS cursor   | 클라이언트 측 처리 |
| **Config.ini**          | .env + JSON  | 환경 변수          |
| **adoConnectDB**        | mssql 패키지 | Connection Pool    |
| **MDBConnect_DB**       | 불필요       | Access 제거        |
| **Frm_Login.Show**      | JWT 인증     | REST API           |
| **vbModal**             | 불필요       | SPA 라우팅         |

### 6.3 중복 실행 방지

**VB6**:

```vb
If App.PrevInstance Then
    MsgBox "이미 실행중입니다."
    End
End If
```

**Node.js (PM2)**:

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'poson-pos',
    script: './server.js',
    instances: 1,  // 단일 인스턴스
    exec_mode: 'fork'
  }]
}
```

**브라우저 (키오스크 모드)**:

```javascript
// 키오스크 모드에서는 단일 탭 강제
if (sessionStorage.getItem("kioskSession")) {
  alert("이미 실행 중입니다.");
  window.close();
} else {
  sessionStorage.setItem("kioskSession", "active");
}
```

### 6.4 DB 연결 전략

**VB6 Fallback**:

```
SQL Server → Access DB → 오프라인
```

**현대 스택**:

```javascript
// Retry with exponential backoff
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await sql.connect(config);
      logger.info("DB connected");
      return;
    } catch (err) {
      logger.warn(`DB connection attempt ${i + 1} failed`);
      await sleep(Math.pow(2, i) * 1000);
    }
  }

  // Fallback: Read-only cache
  logger.error("DB connection failed, starting cache mode");
  startCacheMode();
}
```

### 6.5 초기 화면 전환

**VB6**:

```vb
Frm_Login.Show vbModal  ' 모달 로그인
```

**Vue 3**:

```javascript
// router/index.js
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/login",
      component: () => import("@/views/LoginView.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/main",
      component: () => import("@/views/MainView.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = store.getters.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/login");
  } else {
    next();
  }
});
```

---

## 7. 결론

Main.bas는 POSON_POS_SELF21의 프로그램 진입점으로, 단순하지만 중요한 역할을 수행합니다:

1. **중복 실행 방지**: 키오스크에서 필수
2. **DB 연결 관리**: Fallback 전략으로 안정성 확보
3. **초기 화면 라우팅**: 연결 상태에 따른 분기

마이그레이션 시 이 로직은 **서버 초기화 (server.js)**와 **클라이언트 라우팅 (Vue Router)**으로 분리되어야 하며, DB 연결은 **Connection Pool + Retry** 전략으로 대체하는 것이 권장됩니다.

**다음 분석 파일**: [DBConnection.bas.md](./DBConnection.bas.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
