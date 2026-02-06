# Mdl_API.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Mdl_API.bas`
**파일 크기**: 8.2KB
**역할**: Windows API 선언 및 시스템 제어
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [API 분류](#2-api-분류)
3. [주요 API 상세 분석](#3-주요-api-상세-분석)
4. [함수 분석](#4-함수-분석)
5. [하드웨어 연동](#5-하드웨어-연동)
6. [마이그레이션 고려사항](#6-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

Windows API 함수와 외부 DLL을 선언하여 시스템 레벨 기능, 하드웨어 제어, UI 커스터마이징을 수행하는 모듈입니다.

### 1.2 주요 역할

- **시스템 제어**: 파일 실행, 레지스트리 접근, 프로세스 관리
- **UI 커스터마이징**: 둥근 윈도우, ComboBox 확장
- **하드웨어 제어**: 동전 방출기, 저울, 보안 장치
- **입력 제어**: 마우스 이벤트, 키보드 훅
- **유틸리티**: Sleep, 바이트 문자열 처리

### 1.3 DLL 의존성

| DLL 파일             | 용도                   | 필수 여부 |
| -------------------- | ---------------------- | --------- |
| **shell32.dll**      | 파일 실행              | 필수      |
| **user32.dll**       | UI 제어, 마우스/키보드 | 필수      |
| **kernel32.dll**     | 시스템 기본 기능       | 필수      |
| **gdi32.dll**        | 그래픽 (둥근 윈도우)   | 필수      |
| **SCANCOP2.dll**     | 인식기 시스템          | 선택      |
| **VctCoinStdJo.dll** | 동전 방출기            | 선택      |
| **WinIo.dll**        | 하드웨어 직접 제어     | 선택      |

---

## 2. API 분류

### 2.1 파일 시스템 및 실행

```vb
' 파일 실행
Public Declare Function ShellExecute Lib "shell32.dll" Alias "ShellExecuteA" _
    (ByVal hwnd As Long, ByVal lpOperation As String, _
     ByVal lpFile As String, ByVal lpParameters As String, _
     ByVal lpDirectory As String, ByVal nShowCmd As Long) As Long

Public Const SW_SHOWNORMAL = 1
```

**용도**:

- 외부 프로그램 실행
- 문서 열기 (연결 프로그램 자동 선택)

**사용 예시**:

```vb
' 메모장 실행
ShellExecute 0, "open", "notepad.exe", "", "", SW_SHOWNORMAL

' 웹 브라우저로 URL 열기
ShellExecute 0, "open", "http://www.example.com", "", "", SW_SHOWNORMAL

' 파일 탐색기에서 폴더 열기
ShellExecute 0, "explore", "C:\temp", "", "", SW_SHOWNORMAL
```

### 2.2 UI 커스터마이징

```vb
' 둥근 윈도우 생성
Public Declare Function CreateRoundRectRgn Lib "gdi32" _
    (ByVal X1 As Long, ByVal Y1 As Long, ByVal X2 As Long, _
     ByVal Y2 As Long, ByVal X3 As Long, ByVal Y3 As Long) As Long

' 타원형 윈도우
Public Declare Function CreateEllipticRgn Lib "gdi32" _
    (ByVal X1 As Long, ByVal Y1 As Long, _
     ByVal X2 As Long, ByVal Y2 As Long) As Long
```

**사용 예시**:

```vb
' 폼을 둥근 모서리로 만들기
Private Sub Form_Load()
    Dim hRgn As Long
    hRgn = CreateRoundRectRgn(0, 0, Me.Width / Screen.TwipsPerPixelX, _
                               Me.Height / Screen.TwipsPerPixelY, 30, 30)
    SetWindowRgn Me.hwnd, hRgn, True
End Sub
```

### 2.3 하드웨어 제어 (동전 방출기)

```vb
' CM1 동전 방출기
Declare Function CoinOpen Lib "VctCoinStdJo" _
    (ByVal CoinPort As Integer) As Integer

Declare Function CoinClose Lib "VctCoinStdJo" () As Integer

Declare Function CoinOut Lib "VctCoinStdJo" _
    (ByVal Amount As Integer) As Integer
```

**반환값**:

- `0`: 성공
- `-1`: ACK 미수신
- `-2`: 입력금액 Error
- `-3`: 완료 메시지 LRC Error
- `-4`: 완료 메시지 Error
- `-5`: 부족 방출 금액

**사용 예시**:

```vb
' 동전 방출기 사용
If CoinOpen(1) = 0 Then  ' COM1 포트
    If CoinOut(500) = 0 Then  ' 500원 방출
        MsgBox "500원 방출 완료"
    Else
        MsgBox "방출 실패"
    End If
    CoinClose
End If
```

### 2.4 보안 장치 (SCANCOP II)

```vb
' 인식기 시스템
Declare Function ScanCop_Status Lib "SCANCOP2.dll" () As Integer
' 반환: 0=정상작동, 1=불법복제

Declare Function ScanCop_FuncVB Lib "SCANCOP2.dll" _
    (ByVal sInput As Long) As Integer
```

**기능 코드**:

```
1 = A 기능1회 + Green
2 = B 기능 연속 + Red
3 = C 기능
4 = D Green
5 = E Red
6 = F 기능 1회
7 = G 기능 연속
```

### 2.5 하드웨어 직접 제어 (WinIo)

```vb
' WinIo.dll - 포트 직접 제어
Declare Function InitializeWinIo Lib "WinIo.dll" () As Boolean
Declare Function ShutdownWinIo Lib "WinIo.dll" () As Boolean

Declare Function GetPortVal Lib "WinIo.dll" _
    (ByVal PortAddr As Integer, ByRef PortVal As Long, _
     ByVal bSize As Byte) As Boolean

Declare Function SetPortVal Lib "WinIo.dll" _
    (ByVal PortAddr As Integer, ByVal PortVal As Long, _
     ByVal bSize As Byte) As Boolean
```

**용도**:

- 병렬 포트 제어 (저울, 센서)
- 시리얼 포트 직접 제어

**주의사항**:

- Windows Vista 이상에서 드라이버 서명 필요
- 관리자 권한 필수

### 2.6 마우스 제어

```vb
' 마우스 커서 위치 이동
Declare Function SetCursorPos Lib "user32" _
    (ByVal x As Long, ByVal y As Long) As Long

' 마우스 이벤트 시뮬레이션
Public Declare Sub mouse_event Lib "user32" _
    (ByVal dwFlags As Long, ByVal dx As Long, ByVal dy As Long, _
     ByVal cButtons As Long, ByVal dwExtraInfo As Long)

Public Const MOUSEEVENTF_LEFTDOWN = 2
Public Const MOUSEEVENTF_LEFTUP = 4
```

**사용 예시**:

```vb
' 자동 클릭
SetCursorPos 100, 200
mouse_event MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0
mouse_event MOUSEEVENTF_LEFTUP, 0, 0, 0, 0
```

### 2.7 키보드 상태 확인

```vb
Public Declare Function GetAsyncKeyState Lib "user32" _
    (ByVal vKey As Long) As Integer
```

**사용 예시**:

```vb
' Ctrl 키가 눌렸는지 확인
If GetAsyncKeyState(vbKeyControl) And &H8000 Then
    MsgBox "Ctrl 키 눌림"
End If
```

### 2.8 윈도우 관리

```vb
Public Declare Function FindWindow Lib "user32" Alias "FindWindowA" _
    (ByVal lpClassName As String, ByVal lpWindowName As String) As Long

Public Declare Function SetForegroundWindow Lib "user32" _
    (ByVal hwnd As Long) As Long

Public Declare Function ShowWindow Lib "user32" _
    (ByVal hwnd As Long, ByVal nCmdShow As Long) As Long

Public Declare Function IsWindowVisible Lib "user32" _
    (ByVal hwnd As Long) As Long

Public Const SW_HIDE = 0
Public Const SW_NORMAL = 1
Public Const SW_MINIMIZE = 6
```

**사용 예시**:

```vb
' 메모장 찾아서 최소화
Dim hWnd As Long
hWnd = FindWindow(vbNullString, "제목 없음 - 메모장")
If hWnd <> 0 Then
    ShowWindow hWnd, SW_MINIMIZE
End If
```

### 2.9 ComboBox 확장

```vb
#If Win32 Then
    Public Declare Function SendMessage Lib "user32" Alias "SendMessageA" _
        (ByVal hwnd As Long, ByVal wMsg As Long, _
         ByVal wParam As Long, lParam As Long) As Long

    Public Declare Function MoveWindow Lib "user32" _
        (ByVal hwnd As Long, ByVal x As Long, ByVal y As Long, _
         ByVal nWidth As Long, ByVal nHeight As Long, _
         ByVal bRepaint As Long) As Long
#End If

Public Const CB_SETDROPPEDWIDTH = &H160
```

**사용 예시**:

```vb
' ComboBox 드롭다운 너비 조정
SendMessage Combo1.hwnd, CB_SETDROPPEDWIDTH, 300, 0
```

### 2.10 시스템 기능

```vb
' Sleep (대기)
Public Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)

' 64비트 파일 시스템 리다이렉션
Public Declare Function Wow64DisableWow64FsRedirection Lib "kernel32" _
    (ByRef oldvalue As Long) As Boolean

Public Declare Function Wow64RevertWow64FsRedirection Lib "kernel32" _
    (ByVal oldvalue As Long) As Boolean
```

**사용 예시**:

```vb
' 1초 대기
Sleep 1000

' 64비트 시스템에서 System32 폴더 접근
Dim oldValue As Long
If Wow64DisableWow64FsRedirection(oldValue) Then
    ' System32 폴더 작업
    Wow64RevertWow64FsRedirection oldValue
End If
```

---

## 3. 주요 API 상세 분석

### 3.1 ShellExecute

**시그니처**:

```vb
Public Declare Function ShellExecute Lib "shell32.dll" Alias "ShellExecuteA" _
    (ByVal hwnd As Long, ByVal lpOperation As String, _
     ByVal lpFile As String, ByVal lpParameters As String, _
     ByVal lpDirectory As String, ByVal nShowCmd As Long) As Long
```

**파라미터**:

- `hwnd`: 부모 윈도우 핸들 (0 = 없음)
- `lpOperation`: 작업 ("open", "print", "explore")
- `lpFile`: 파일 경로 또는 URL
- `lpParameters`: 명령줄 인수
- `lpDirectory`: 작업 디렉토리
- `nShowCmd`: 윈도우 표시 방법

**활용 예시**:

```vb
' PDF 파일 열기
ShellExecute 0, "open", "C:\report.pdf", "", "", SW_SHOWNORMAL

' 웹 페이지 열기
ShellExecute 0, "open", "http://www.example.com", "", "", SW_SHOWNORMAL

' 폴더 탐색
ShellExecute 0, "explore", "C:\temp", "", "", SW_SHOWNORMAL

' 프로그램 실행 (인수 포함)
ShellExecute 0, "open", "notepad.exe", "readme.txt", "C:\", SW_SHOWNORMAL
```

### 3.2 WinIo 하드웨어 제어

**초기화**:

```vb
If InitializeWinIo() = False Then
    MsgBox "WinIo 초기화 실패. 관리자 권한이 필요합니다."
    Exit Sub
End If
```

**포트 읽기**:

```vb
Dim portValue As Long
If GetPortVal(&H378, portValue, 1) Then  ' LPT1 포트
    Debug.Print "포트 값: " & portValue
End If
```

**포트 쓰기**:

```vb
' 병렬 포트에 값 쓰기
SetPortVal &H378, 255, 1  ' 모든 비트 ON
```

**종료**:

```vb
ShutdownWinIo
```

---

## 4. 함수 분석

### 4.1 PWDInputBox (비밀번호 입력창)

**시그니처**:

```vb
Public Function PWDInputBox(Prompt, Optional Title, Optional Default, _
                            Optional XPos, Optional YPos, _
                            Optional HelpFile, Optional Context) As String
```

**역할**:
InputBox를 후킹하여 비밀번호 입력 시 `*` 문자로 표시합니다.

**구현 원리**:

```vb
Private hHook As Long

Public Function NewProc(ByVal iCode As Long, ByVal wParam As Long, _
                        ByVal lParam As Long) As Long
    Dim RetVal
    Dim strClassName As String, lngBuffer As Long

    If iCode < 0 Then
        NewProc = CallNextHookEx(hHook, iCode, wParam, lParam)
        Exit Function
    End If

    strClassName = String$(256, " ")
    lngBuffer = 255

    If iCode = 5 Then  ' HCBT_ACTIVATE
        RetVal = GetClassName(wParam, strClassName, lngBuffer)
        If Left$(strClassName, RetVal) = "#32770" Then  ' 다이얼로그
            ' TextBox를 비밀번호 모드로 설정
            SendDlgItemMessage wParam, &H1324, &HCC, Asc("*"), &H0
        End If
    End If

    CallNextHookEx hHook, iCode, wParam, lParam
End Function

Public Function PWDInputBox(...) As String
    Dim iModHwnd As Long, iThreadID As Long

    iThreadID = GetCurrentThreadId
    iModHwnd = GetModuleHandle(vbNullString)

    ' 훅 설치
    hHook = SetWindowsHookEx(5, AddressOf NewProc, iModHwnd, iThreadID)

    ' InputBox 호출
    PWDInputBox = InputBox(Prompt, Title, Default, XPos, YPos, HelpFile, Context)

    ' 훅 제거
    UnhookWindowsHookEx hHook
End Function
```

**사용 예시**:

```vb
Dim password As String
password = PWDInputBox("비밀번호를 입력하세요", "로그인")
```

### 4.2 Mid_Byte (바이트 단위 문자열 자르기)

**시그니처**:

```vb
Public Function Mid_Byte(Cdata As String, P_Start As Integer, _
                         P_Len As Integer) As String
```

**역할**:
한글/영문 혼합 문자열을 바이트 단위로 자릅니다.

**구현**:

```vb
Public Function Mid_Byte(Cdata As String, P_Start As Integer, _
                         P_Len As Integer) As String
    Mid_Byte = StrConv(MidB(StrConv(Cdata, vbFromUnicode), P_Start, P_Len), _
                       vbUnicode)
End Function
```

**사용 예시**:

```vb
Dim str As String
str = "abc한글def"

' 일반 Mid는 문자 단위
Debug.Print Mid(str, 1, 5)  ' "abc한글"

' Mid_Byte는 바이트 단위
Debug.Print Mid_Byte(str, 1, 5)  ' "abc한" (한글은 2바이트)
```

---

## 5. 하드웨어 연동

### 5.1 동전 방출기 (CM1)

**초기화**:

```vb
If CoinOpen(1) <> 0 Then  ' COM1
    MsgBox "동전 방출기 연결 실패"
    Exit Sub
End If
```

**거스름돈 방출**:

```vb
Dim changeAmount As Integer
changeAmount = 1500  ' 1500원

' 500원 3개 방출
Dim result As Integer
result = CoinOut(changeAmount)

Select Case result
    Case 0
        MsgBox "방출 완료"
    Case -1
        MsgBox "ACK 미수신"
    Case -2
        MsgBox "입력금액 오류"
    Case -5
        MsgBox "동전 부족"
End Select

CoinClose
```

### 5.2 보안 장치 (SCANCOP II)

**불법 복제 체크**:

```vb
If ScanCop_Status() = 1 Then
    MsgBox "불법 복제 감지!"
    End  ' 프로그램 종료
End If
```

**LED 제어**:

```vb
' Green LED 켜기
ScanCop_FuncVB 4

' Red LED 켜기
ScanCop_FuncVB 5

' 비프음 1회
ScanCop_FuncVB 1
```

### 5.3 저울 (WinIo 사용)

**무게 읽기** (병렬 포트):

```vb
Public Function ReadScaleWeight() As Double
    Dim portValue As Long
    Dim weight As Double

    If InitializeWinIo() Then
        ' 데이터 포트 읽기 (0x378)
        If GetPortVal(&H378, portValue, 1) Then
            ' 무게 변환 (장비별 프로토콜에 따라 다름)
            weight = portValue / 10.0
        End If

        ShutdownWinIo
    End If

    ReadScaleWeight = weight
End Function
```

---

## 6. 마이그레이션 고려사항

### 6.1 Windows API → Node.js

대부분의 Windows API는 Node.js native 모듈이나 웹 API로 대체 가능합니다.

#### ShellExecute → child_process

**VB6**:

```vb
ShellExecute 0, "open", "notepad.exe", "", "", SW_SHOWNORMAL
```

**Node.js**:

```javascript
const { exec } = require("child_process");

// 프로그램 실행
exec("notepad.exe", (error, stdout, stderr) => {
  if (error) {
    console.error(`실행 오류: ${error}`);
    return;
  }
});

// URL 열기
const { shell } = require("electron");
shell.openExternal("http://www.example.com");
```

#### Sleep → setTimeout/async

**VB6**:

```vb
Sleep 1000  ' 1초 대기
```

**Node.js**:

```javascript
// Callback 방식
setTimeout(() => {
  console.log("1초 경과");
}, 1000);

// Promise 방식
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function example() {
  await sleep(1000);
  console.log("1초 경과");
}
```

#### 마우스 제어 → robotjs

**VB6**:

```vb
SetCursorPos 100, 200
mouse_event MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0
mouse_event MOUSEEVENTF_LEFTUP, 0, 0, 0, 0
```

**Node.js**:

```javascript
const robot = require("robotjs");

// 마우스 이동
robot.moveMouse(100, 200);

// 클릭
robot.mouseClick();

// 더블클릭
robot.mouseClick("left", true);
```

#### 윈도우 찾기 → Electron

**VB6**:

```vb
hWnd = FindWindow(vbNullString, "메모장")
SetForegroundWindow hWnd
```

**Electron**:

```javascript
const { BrowserWindow } = require("electron");

// 모든 윈도우 가져오기
const allWindows = BrowserWindow.getAllWindows();

// 제목으로 찾기
const targetWindow = allWindows.find((win) => win.getTitle() === "메모장");

if (targetWindow) {
  targetWindow.focus();
}
```

### 6.2 하드웨어 제어 → Node.js 시리얼 통신

#### 동전 방출기

**VB6**:

```vb
CoinOpen(1)
CoinOut(500)
CoinClose
```

**Node.js (SerialPort)**:

```javascript
const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");

const port = new SerialPort("COM1", { baudRate: 9600 });
const parser = port.pipe(new Readline({ delimiter: "\r\n" }));

// 동전 방출 명령 전송
function dispenseCoin(amount) {
  return new Promise((resolve, reject) => {
    const command = `DISPENSE:${amount}\r\n`;

    port.write(command, (err) => {
      if (err) {
        reject(err);
      }
    });

    parser.once("data", (data) => {
      if (data === "OK") {
        resolve();
      } else {
        reject(new Error(data));
      }
    });

    // 타임아웃 (5초)
    setTimeout(() => {
      reject(new Error("Timeout"));
    }, 5000);
  });
}

// 사용
dispenseCoin(500)
  .then(() => console.log("방출 완료"))
  .catch((err) => console.error("방출 실패:", err));
```

#### 저울 (시리얼 통신)

**Node.js**:

```javascript
class ScaleReader {
  constructor(portName) {
    this.port = new SerialPort(portName, { baudRate: 9600 });
    this.parser = this.port.pipe(new Readline({ delimiter: "\r\n" }));

    this.parser.on("data", (data) => {
      this.onWeightReceived(data);
    });
  }

  onWeightReceived(data) {
    // 프로토콜에 따라 파싱
    // 예: "W:1234.5g\r\n"
    const match = data.match(/W:([\d.]+)g/);
    if (match) {
      const weight = parseFloat(match[1]);
      this.emit("weight", weight);
    }
  }

  requestWeight() {
    this.port.write("READ\r\n");
  }
}

// 사용
const scale = new ScaleScaleReader("COM2");
scale.on("weight", (weight) => {
  console.log(`무게: ${weight}g`);
});

scale.requestWeight();
```

### 6.3 WinIo → 웹 시리얼 API (Chrome)

**Web Serial API** (Chrome 89+):

```javascript
// 포트 선택
const port = await navigator.serial.requestPort();

// 포트 열기
await port.open({ baudRate: 9600 });

// 읽기
const reader = port.readable.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  console.log("받은 데이터:", value);
}

// 쓰기
const writer = port.writable.getWriter();
const data = new Uint8Array([0x01, 0x02, 0x03]);
await writer.write(data);
writer.releaseLock();
```

### 6.4 보안 장치 대체

SCANCOP II 같은 하드웨어 보안 장치는 다음으로 대체:

**클라우드 라이센스 서버**:

```javascript
const axios = require("axios");

async function checkLicense() {
  try {
    const response = await axios.post("https://license-server.com/verify", {
      productKey: process.env.PRODUCT_KEY,
      hardwareId: getHardwareId(),
    });

    if (response.data.valid) {
      return true;
    } else {
      console.error("라이센스 무효:", response.data.reason);
      process.exit(1);
    }
  } catch (error) {
    console.error("라이센스 확인 실패:", error);
    process.exit(1);
  }
}

function getHardwareId() {
  const os = require("os");
  const crypto = require("crypto");

  // CPU, MAC 주소 등을 조합하여 고유 ID 생성
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  const data = JSON.stringify({ cpus, networkInterfaces });
  return crypto.createHash("sha256").update(data).digest("hex");
}
```

### 6.5 UI 커스터마이징 → CSS

**VB6 (둥근 윈도우)**:

```vb
hRgn = CreateRoundRectRgn(0, 0, 300, 200, 30, 30)
SetWindowRgn Me.hwnd, hRgn, True
```

**CSS**:

```css
.rounded-window {
  width: 300px;
  height: 200px;
  border-radius: 30px;
  overflow: hidden;
}
```

**Electron (프레임 없는 윈도우)**:

```javascript
const win = new BrowserWindow({
  width: 300,
  height: 200,
  frame: false,
  transparent: true,
  webPreferences: {
    nodeIntegration: true,
  },
});

win.loadFile("index.html");
```

```html
<!-- index.html -->
<style>
  body {
    background: transparent;
  }
  .window-content {
    background: white;
    border-radius: 30px;
    width: 100vw;
    height: 100vh;
  }
</style>

<div class="window-content">
  <!-- 컨텐츠 -->
</div>
```

### 6.6 비밀번호 입력 → HTML5

**VB6 (PWDInputBox)**:

```vb
password = PWDInputBox("비밀번호 입력")
```

**HTML5**:

```html
<input type="password" placeholder="비밀번호 입력" />
```

**React**:

```jsx
import React, { useState } from "react";

function PasswordInput() {
  const [password, setPassword] = useState("");

  return (
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="비밀번호 입력"
    />
  );
}
```

### 6.7 ComboBox 확장 → HTML Select

**VB6**:

```vb
SendMessage Combo1.hwnd, CB_SETDROPPEDWIDTH, 300, 0
```

**CSS**:

```css
select {
  width: 300px;
  max-width: none;
}
```

**React Select**:

```jsx
import Select from "react-select";

const options = [
  { value: "1", label: "옵션 1" },
  { value: "2", label: "옵션 2" },
];

<Select options={options} menuWidth={300} />;
```

### 6.8 API 매핑표

| VB6 API              | Node.js / Web       | 용도          |
| -------------------- | ------------------- | ------------- |
| **ShellExecute**     | child_process.exec  | 프로그램 실행 |
| **Sleep**            | setTimeout, Promise | 대기          |
| **SetCursorPos**     | robotjs.moveMouse   | 마우스 제어   |
| **FindWindow**       | BrowserWindow       | 윈도우 찾기   |
| **SendMessage**      | 불필요 (HTML/CSS)   | UI 제어       |
| **CoinOpen/CoinOut** | SerialPort          | 시리얼 통신   |
| **WinIo**            | Web Serial API      | 하드웨어 제어 |
| **ScanCop**          | 클라우드 라이센스   | 보안          |

---

## 7. 결론

Mdl_API.bas는 **Windows API 중앙 집중 모듈**로, 다음과 같은 특징이 있습니다:

1. **다양한 API**: 파일 시스템, UI, 하드웨어 제어
2. **DLL 의존성**: 외부 DLL에 강하게 의존
3. **플랫폼 종속성**: Windows 전용

마이그레이션 시 **Node.js native 모듈 + Web API** 조합으로 대부분의 기능을 대체할 수 있으며, 특히 **Electron + SerialPort + robotjs** 조합이 키오스크 환경에 적합합니다.

하드웨어 제어는 **Web Serial API**로 전환하여 크로스 플랫폼 호환성을 확보할 수 있습니다.

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
