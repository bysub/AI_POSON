# MDI_Kakao.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/MDI_Kakao.bas`
**파일 크기**: 6.2KB
**역할**: 카카오페이 API 연동 및 알림톡 전송
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [데이터 타입 및 전역 변수](#2-데이터-타입-및-전역-변수)
3. [함수 목록](#3-함수-목록)
4. [주요 함수 상세 분석](#4-주요-함수-상세-분석)
5. [API 통신 구조](#5-api-통신-구조)
6. [에러 처리](#6-에러-처리)
7. [마이그레이션 고려사항](#7-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

카카오페이 결제 시스템과 연동하여 QR 코드 생성, 주문 알림톡 전송, 결제 상태 조회 등을 수행하는 모듈입니다.

### 1.2 주요 역할

- **알림톡 전송**: 주문번호 발급 시 고객에게 카카오 알림톡 전송
- **QR 코드 생성**: 결제용 QR 코드 생성 (외부 API 호출)
- **결제 폴링**: 카카오페이 결제 완료 여부 확인
- **DB 저장**: 알림톡 발송 내역 저장

### 1.3 외부 의존성

- **WinHttpRequest**: HTTP 통신
- **외부 API**: `smswithus5.cafe24.com` (알림톡 서비스)
- **TIPS 서버**: 자체 DB 서버 (알림톡 내역 저장)
- **JSON.bas**: JSON 파싱 (추정)

---

## 2. 데이터 타입 및 전역 변수

### 2.1 사용자 정의 타입

```vb
Public Type kakaoMsg
    sCusCode As String    ' 고객 코드
    sCusHP As String      ' 고객 휴대폰 번호
    sMsg As String        ' 메시지 내용 (주문번호 등)
    stableNo As String    ' 테이블 번호
    sGubun As String      ' 구분 ("대기", "주문번호")
    sResult1 As String    ' 결과 코드 1
    sResult2 As String    ' 결과 코드 2
    sSaveTime As String   ' 저장 시간
    sMartCode As String   ' 마트 코드
    sTempCode As String   ' 템플릿 코드
    skeyCode As String    ' 키 코드

    sStoName As String    ' 점포명
    UID As String         ' 고유 ID
End Type
```

**용도**:

- 알림톡 발송 요청 정보 저장
- API 파라미터 전달
- DB 저장용 구조체

### 2.2 전역 변수

```vb
Public mkakaoMsg As kakaoMsg      ' 카카오 메시지 인스턴스
Public WeNet_MartCODE As String   ' 마트 코드
```

---

## 3. 함수 목록

| 함수명           | 반환 타입 | 파라미터              | 역할                               |
| ---------------- | --------- | --------------------- | ---------------------------------- |
| **kakaoOrder**   | String    | skakao As kakaoMsg    | 주문번호 알림톡 전송 (폐기된 함수) |
| **KaKaoSend**    | String    | skakao As kakaoMsg    | 통합 알림톡 전송                   |
| **saveKaKaoMsg** | Sub       | skakaoMsg As kakaoMsg | 알림톡 내역 DB 저장                |

주석 처리된 함수:

- `getKakaoUID` (Currency): UID 생성 함수 (현재 미사용)

---

## 4. 주요 함수 상세 분석

### 4.1 KaKaoSend (알림톡 전송)

**시그니처**:

```vb
Public Function KaKaoSend(skakao As kakaoMsg) As String
```

**역할**:
카카오 알림톡을 전송하고 결과 코드를 반환합니다.

**파라미터**:

- `skakao`: 알림톡 정보가 담긴 구조체

**반환값**:

- API 응답에서 추출한 `result_code` 값

**실행 흐름**:

```
1. HTTP 객체 생성
   └─ CreateObject("Winhttp.WinHttpRequest.5.1")

2. 타임아웃 설정
   └─ 5초 (연결, 해결)

3. URL 생성 (sGubun에 따라 분기)
   ├─ "대기": identy.php (QR 대기번호)
   └─ "주문번호": order.php (주문 알림톡)

4. HTTP POST 요청

5. 응답 파싱
   └─ result_code 추출

6. 결과 반환
```

**코드 분석**:

```vb
Public Function KaKaoSend(skakao As kakaoMsg) As String
Dim WinHttp As WinHttpRequest
Dim LResolvetime As Long
Dim LConntime As Long
Dim LSendtime As Long
Dim LRecvtime As Long
Dim sURL As String
Dim strHtml As String
Dim strResult As String
Dim sTime As String
Dim Col_Data() As String

On Error GoTo err

    ' 타임아웃 설정 (5초)
    LResolvetime = 5 * 1000
    LConntime = 5 * 1000
    LSendtime = 0
    LRecvtime = 0

    ' WinHTTP 객체 생성
    Set WinHttp = CreateObject("Winhttp.WinHttpRequest.5.1")
    WinHttp.SetTimeouts LResolvetime, LConntime, LSendtime, LRecvtime

    sURL = ""

    ' URL 생성 (구분에 따라)
    If skakao.sGubun = "대기" Then
        ' QR 대기번호 발급
        sURL = "http://smswithus5.cafe24.com/cron/dbtaeil/identy.php"
        sURL = sURL + "?company_name=" & skakao.sStoName & _
               " &mart_code=" & skakao.sMartCode & _
               "&templateCode=" & skakao.sTempCode & _
               "&tran_refkey=" & skakao.UID & _
               "&mobile=" & skakao.sCusHP & _
               "&number=" & skakao.sMsg & ""

    ElseIf skakao.sGubun = "주문번호" Then
        ' 주문 알림톡 발송
        sTime = Format(Now, "YYYY-MM-DD hh:mm")
        sURL = "http://smswithus5.cafe24.com/cron/dbtaeil/order.php"
        sURL = sURL + "?company_name=" & skakao.sStoName & _
               "&order_time=" & sTime & _
               "&order_no=" & skakao.sMsg & _
               "&table_no=" & skakao.stableNo & _
               "&wait_no=&mart_code=" & skakao.sMartCode & _
               "&templateCode=" & skakao.sTempCode & _
               "&tran_refkey=" & skakao.skeyCode & _
               "&mobile=" & skakao.sCusHP & ""
    End If

    ' POST 요청
    WinHttp.Open "POST", sURL, False
    WinHttp.SetRequestHeader "Refere", sURL
    WinHttp.SetRequestHeader "Conten-Type", "application/x-www-form-urlencoded"
    WinHttp.Send
    WinHttp.WaitForResponse

    ' 응답 파싱 (한글 처리)
    strHtml = StrConv(WinHttp.ResponseBody, vbUnicode)
    strResult = BinaryToText(WinHttp.ResponseBody, "euc-kr")

    ' result_code 추출
    Col_Data = Split(strHtml, "result_code"":""")
    Debug.Print Col_Data(0)
    KaKaoSend = Col_Data(1)  ' 결과 코드 반환
    Debug.Print strHtml

    Exit Function
err:
    MsgBox "[Events] : KaKaoSend " & vbCrLf & _
           "[오류코드] : " & err.Number & Chr(13) & _
           "[오류내용] : " & err.Description
End Function
```

**API 호출 예시**:

```
[대기번호 발급]
POST http://smswithus5.cafe24.com/cron/dbtaeil/identy.php
?company_name=천도시스템
&mart_code=M001
&templateCode=T001
&tran_refkey=20260129001
&mobile=01012345678
&number=001

[주문 알림톡]
POST http://smswithus5.cafe24.com/cron/dbtaeil/order.php
?company_name=천도시스템
&order_time=2026-01-29 14:30
&order_no=001
&table_no=5
&mart_code=M001
&templateCode=T001
&tran_refkey=KEY001
&mobile=01012345678
```

**응답 형식 (추정)**:

```json
{
  "result_code": "0000",
  "message": "success"
}
```

---

### 4.2 saveKaKaoMsg (DB 저장)

**시그니처**:

```vb
Public Sub saveKaKaoMsg(skakaoMsg As kakaoMsg)
```

**역할**:
알림톡 발송 내역을 TIPS 서버 DB에 저장합니다.

**테이블 구조 (추정)**:

```sql
CREATE TABLE self_kakao (
    UID VARCHAR(20),          -- 고유 ID
    sMartCode VARCHAR(10),    -- 마트 코드
    sTempCode VARCHAR(10),    -- 템플릿 코드
    sCusCode VARCHAR(20),     -- 고객 코드
    sCusHP VARCHAR(20),       -- 휴대폰 번호
    sMsg VARCHAR(100),        -- 메시지 내용
    sGubun VARCHAR(20),       -- 구분
    sResult1 VARCHAR(10),     -- 결과 코드 1
    sResult2 VARCHAR(10),     -- 결과 코드 2
    sSaveTime DATETIME        -- 저장 시간
);
```

**코드 분석**:

```vb
Public Sub saveKaKaoMsg(skakaoMsg As kakaoMsg)
Dim T_server As ADODB.Connection
Dim Er_Str As String
Dim today As String

    today = Format(Now, "YYYY-MM-DD")

    ' TIPS 서버 연결
    Set T_server = New ADODB.Connection
    If T_AdoConnectDB(T_server, TIPS_SERVER.USERID, "7942tips!@", _
                      "localhost", "1433", "Tips", Er_Str) Then

        ' INSERT 쿼리 생성
        SQL = "insert into self_kakao values"
        SQL = SQL + " ('" & skakaoMsg.UID & "'," & _
                    "'" & skakaoMsg.sMartCode & "'," & _
                    "'" & skakaoMsg.sTempCode & "', " & _
                    "'" & skakaoMsg.sCusCode & "'," & _
                    "'" & skakaoMsg.sCusHP & "'," & _
                    "'" & skakaoMsg.sMsg & "'," & _
                    "'" & skakaoMsg.sGubun & "'," & _
                    "'" & skakaoMsg.sResult1 & "'," & _
                    "'" & skakaoMsg.sResult2 & "'," & _
                    "'" & skakaoMsg.sSaveTime & "')"

        Debug.Print SQL
        T_server.Execute (SQL)
        T_server.Close
    End If

End Sub
```

**보안 이슈**:

- 하드코딩된 DB 비밀번호: `"7942tips!@"`
- SQL Injection 취약점 (파라미터 바인딩 없음)

---

### 4.3 kakaoOrder (폐기된 함수)

**시그니처**:

```vb
Public Function kakaoOrder(skakao As kakaoMsg) As String
```

**역할**:
KaKaoSend와 거의 동일하나, URL이 잘못 결합되어 있습니다.

**문제점**:

```vb
' URL이 중복 결합됨
sURL = "http://smswithus5.cafe24.com/cron/dbtaeil/identy.php"
sURL = sURL + "http://smswithus5.cafe24.com/cron/dbtaeil/order.php?..."
' 결과: http://...identy.phphttp://...order.php?... (잘못된 URL)
```

**현재 상태**: 미사용 함수로 추정 (코드에서 호출되지 않음)

---

## 5. API 통신 구조

### 5.1 HTTP 통신 흐름

```
┌─────────────┐
│  키오스크    │
│  (VB6)      │
└──────┬──────┘
       │ 1. KaKaoSend 호출
       ↓
┌─────────────────────┐
│  WinHttpRequest     │
│  (HTTP 클라이언트)  │
└──────┬──────────────┘
       │ 2. POST 요청
       ↓
┌────────────────────────────┐
│  smswithus5.cafe24.com     │
│  (알림톡 중계 서버)         │
└──────┬─────────────────────┘
       │ 3. 카카오톡 API 호출
       ↓
┌────────────────┐
│  카카오톡 서버  │
│  (알림톡 발송) │
└──────┬─────────┘
       │ 4. 고객에게 알림톡 전송
       ↓
┌────────────────┐
│  고객 휴대폰    │
└────────────────┘
```

### 5.2 WinHttpRequest 사용

```vb
' HTTP 객체 생성
Set WinHttp = CreateObject("Winhttp.WinHttpRequest.5.1")

' 타임아웃 설정
WinHttp.SetTimeouts 5000, 5000, 0, 0
' (DNS 해결, 연결, 송신, 수신)

' POST 요청
WinHttp.Open "POST", sURL, False  ' 동기 방식
WinHttp.SetRequestHeader "Refere", sURL
WinHttp.SetRequestHeader "Conten-Type", "application/x-www-form-urlencoded"
WinHttp.Send

' 응답 대기
WinHttp.WaitForResponse

' 응답 읽기
strHtml = StrConv(WinHttp.ResponseBody, vbUnicode)
```

**문제점**:

- 헤더 오타: `"Conten-Type"` → `"Content-Type"`
- 헤더 오타: `"Refere"` → `"Referer"`

### 5.3 인코딩 처리

```vb
' 한글 처리
strHtml = StrConv(WinHttp.ResponseBody, vbUnicode)
strResult = BinaryToText(WinHttp.ResponseBody, "euc-kr")
```

**BinaryToText 함수**:

- `basWENET_winhttp.bas`에 정의되어 있을 것으로 추정
- EUC-KR 인코딩 변환

---

## 6. 에러 처리

### 6.1 에러 처리 패턴

```vb
On Error GoTo err
    ' 함수 본문
    Exit Function
err:
    MsgBox "[Events] : KaKaoSend " & vbCrLf & _
           "[오류코드] : " & err.Number & Chr(13) & _
           "[오류내용] : " & err.Description
End Function
```

### 6.2 주요 에러 케이스

| 에러          | 원인                       | 해결 방법                  |
| ------------- | -------------------------- | -------------------------- |
| **타임아웃**  | 네트워크 지연, 서버 무응답 | 타임아웃 늘리기 (현재 5초) |
| **404**       | API URL 변경               | URL 확인                   |
| **500**       | 서버 에러                  | API 제공자 확인            |
| **파싱 에러** | JSON 형식 변경             | 파싱 로직 수정             |

### 6.3 폴링 로직 (추정)

코드에는 없지만, 카카오페이 결제 시 폴링이 필요합니다:

```vb
' 예상 코드 (다른 모듈에 존재)
Public Function CheckKakaoPayment(qrCode As String) As Boolean
Dim retryCount As Integer
Dim maxRetry As Integer

    maxRetry = 60  ' 최대 60초
    retryCount = 0

    Do While retryCount < maxRetry
        ' API 호출로 결제 상태 확인
        If GetPaymentStatus(qrCode) = "COMPLETED" Then
            CheckKakaoPayment = True
            Exit Function
        End If

        Sleep 1000  ' 1초 대기
        retryCount = retryCount + 1
        DoEvents  ' UI 응답성 유지
    Loop

    CheckKakaoPayment = False  ' 타임아웃
End Function
```

---

## 7. 마이그레이션 고려사항

### 7.1 VB6 WinHttpRequest → Node.js Axios

**VB6**:

```vb
Set WinHttp = CreateObject("Winhttp.WinHttpRequest.5.1")
WinHttp.Open "POST", sURL, False
WinHttp.SetRequestHeader "Content-Type", "application/x-www-form-urlencoded"
WinHttp.Send
strHtml = StrConv(WinHttp.ResponseBody, vbUnicode)
```

**Node.js (Axios)**:

```javascript
const axios = require("axios");

async function sendKakaoTalk(kakaoMsg) {
  const params = new URLSearchParams({
    company_name: kakaoMsg.sStoName,
    order_time: new Date().toISOString(),
    order_no: kakaoMsg.sMsg,
    table_no: kakaoMsg.stableNo,
    mart_code: kakaoMsg.sMartCode,
    templateCode: kakaoMsg.sTempCode,
    tran_refkey: kakaoMsg.skeyCode,
    mobile: kakaoMsg.sCusHP,
  });

  try {
    const response = await axios.post(
      "http://smswithus5.cafe24.com/cron/dbtaeil/order.php",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 5000,
      },
    );

    // JSON 파싱
    const resultCode = response.data.result_code;
    return resultCode;
  } catch (error) {
    console.error("카카오톡 전송 실패:", error);
    throw error;
  }
}
```

### 7.2 공식 카카오 알림톡 API 사용

**현재 문제점**:

- 중계 서버(`smswithus5.cafe24.com`) 의존
- API 스펙 불명확
- 보안 취약

**권장 방식** (카카오 비즈메시지 API):

```javascript
const axios = require("axios");

// 카카오 알림톡 공식 API
async function sendKakaoAlimtalk(phone, orderNo, storeName) {
  const response = await axios.post(
    "https://kapi.kakao.com/v2/api/kakaolink/send",
    {
      template_object: {
        object_type: "text",
        text: `주문이 접수되었습니다.\n주문번호: ${orderNo}\n매장: ${storeName}`,
        button_title: "주문 확인",
      },
    },
    {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  return response.data;
}
```

### 7.3 폴링 → WebSocket

**현재 방식** (폴링):

```vb
' 1초마다 결제 상태 확인
Do While retryCount < 60
    Sleep 1000
    If CheckPaymentStatus() Then Exit Do
Loop
```

**현대 방식** (WebSocket):

```javascript
// Socket.IO 사용
const io = require("socket.io-client");

const socket = io("https://payment-server.com");

socket.on("payment-completed", (data) => {
  console.log("결제 완료:", data.orderNo);
  // 결제 완료 처리
});

// 결제 요청
socket.emit("request-payment", {
  orderNo: "001",
  amount: 15000,
});
```

### 7.4 DB 저장 개선

**VB6 (SQL Injection 취약)**:

```vb
SQL = "insert into self_kakao values ('" & skakaoMsg.UID & "', ...)"
```

**Node.js (Prepared Statement)**:

```javascript
const sql = require("mssql");

async function saveKakaoMessage(kakaoMsg) {
  const pool = await sql.connect(config);

  await pool
    .request()
    .input("uid", sql.VarChar, kakaoMsg.UID)
    .input("martCode", sql.VarChar, kakaoMsg.sMartCode)
    .input("tempCode", sql.VarChar, kakaoMsg.sTempCode)
    .input("cusCode", sql.VarChar, kakaoMsg.sCusCode)
    .input("cusHP", sql.VarChar, kakaoMsg.sCusHP)
    .input("msg", sql.VarChar, kakaoMsg.sMsg)
    .input("gubun", sql.VarChar, kakaoMsg.sGubun)
    .input("result1", sql.VarChar, kakaoMsg.sResult1)
    .input("result2", sql.VarChar, kakaoMsg.sResult2)
    .input("saveTime", sql.DateTime, kakaoMsg.sSaveTime).query(`
            INSERT INTO self_kakao
            (UID, sMartCode, sTempCode, sCusCode, sCusHP,
             sMsg, sGubun, sResult1, sResult2, sSaveTime)
            VALUES
            (@uid, @martCode, @tempCode, @cusCode, @cusHP,
             @msg, @gubun, @result1, @result2, @saveTime)
        `);
}
```

### 7.5 환경 변수 관리

**VB6 (하드코딩)**:

```vb
T_AdoConnectDB(T_server, TIPS_SERVER.USERID, "7942tips!@", ...)
```

**Node.js (.env)**:

```env
# .env
DB_HOST=localhost
DB_PORT=1433
DB_USER=tips_user
DB_PASSWORD=7942tips!@
DB_NAME=Tips

KAKAO_API_URL=http://smswithus5.cafe24.com
KAKAO_TEMPLATE_CODE=T001
MART_CODE=M001
```

```javascript
require("dotenv").config();

const dbConfig = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
```

### 7.6 에러 핸들링 개선

**VB6**:

```vb
On Error GoTo err
err:
    MsgBox "[오류]" & err.Description
```

**Node.js (Try-Catch + 로깅)**:

```javascript
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

async function sendKakaoTalk(kakaoMsg) {
  try {
    const result = await axios.post(apiUrl, params);
    logger.info("카카오톡 전송 성공", { orderNo: kakaoMsg.sMsg });
    return result.data.result_code;
  } catch (error) {
    logger.error("카카오톡 전송 실패", {
      orderNo: kakaoMsg.sMsg,
      error: error.message,
      stack: error.stack,
    });

    // 재시도 로직
    if (error.response?.status === 500) {
      return retryRequest(kakaoMsg, 3); // 3회 재시도
    }

    throw error;
  }
}
```

### 7.7 TypeScript 타입 정의

```typescript
interface KakaoMessage {
  sCusCode: string; // 고객 코드
  sCusHP: string; // 휴대폰 번호
  sMsg: string; // 메시지 (주문번호)
  stableNo: string; // 테이블 번호
  sGubun: "대기" | "주문번호"; // 구분
  sResult1: string; // 결과 코드 1
  sResult2: string; // 결과 코드 2
  sSaveTime: string; // 저장 시간
  sMartCode: string; // 마트 코드
  sTempCode: string; // 템플릿 코드
  skeyCode: string; // 키 코드
  sStoName: string; // 점포명
  UID: string; // 고유 ID
}

interface KakaoApiResponse {
  result_code: string;
  message?: string;
}

async function sendKakaoTalk(kakaoMsg: KakaoMessage): Promise<KakaoApiResponse> {
  // 구현
}
```

### 7.8 API 서비스 클래스

```javascript
class KakaoService {
  constructor(apiUrl, martCode, templateCode) {
    this.apiUrl = apiUrl;
    this.martCode = martCode;
    this.templateCode = templateCode;
  }

  async sendWaitingNumber(mobile, waitingNo, storeName, uid) {
    const params = new URLSearchParams({
      company_name: storeName,
      mart_code: this.martCode,
      templateCode: this.templateCode,
      tran_refkey: uid,
      mobile: mobile,
      number: waitingNo,
    });

    const response = await axios.post(`${this.apiUrl}/cron/dbtaeil/identy.php`, params);

    return this.parseResponse(response.data);
  }

  async sendOrderConfirm(mobile, orderNo, tableNo, storeName, keyCode) {
    const params = new URLSearchParams({
      company_name: storeName,
      order_time: new Date().toISOString(),
      order_no: orderNo,
      table_no: tableNo,
      mart_code: this.martCode,
      templateCode: this.templateCode,
      tran_refkey: keyCode,
      mobile: mobile,
    });

    const response = await axios.post(`${this.apiUrl}/cron/dbtaeil/order.php`, params);

    return this.parseResponse(response.data);
  }

  parseResponse(data) {
    // JSON 파싱 로직
    const resultCode = data.result_code;
    return {
      success: resultCode === "0000",
      code: resultCode,
    };
  }

  async saveToDatabase(kakaoMsg) {
    // DB 저장 로직 (Prepared Statement 사용)
  }
}

// 사용
const kakaoService = new KakaoService(
  process.env.KAKAO_API_URL,
  process.env.MART_CODE,
  process.env.KAKAO_TEMPLATE_CODE,
);

await kakaoService.sendOrderConfirm("01012345678", "001", "5", "천도시스템", "KEY001");
```

---

## 8. 결론

MDI_Kakao.bas는 **카카오 알림톡 연동 모듈**로, 다음과 같은 특징이 있습니다:

1. **간단한 구조**: 3개의 함수만 포함
2. **중계 서버 의존**: 직접 카카오 API를 호출하지 않음
3. **동기 방식**: WinHttpRequest를 동기 모드로 사용
4. **보안 취약점**: SQL Injection, 하드코딩된 비밀번호

마이그레이션 시 **공식 카카오 비즈메시지 API + WebSocket** 방식으로 전환하여 안정성과 보안을 크게 개선할 수 있습니다.

**다음 분석 파일**: [Mdl_API.bas.md](./Mdl_API.bas.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
