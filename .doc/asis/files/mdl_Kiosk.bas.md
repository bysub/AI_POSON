# mdl_Kiosk.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/mdl_Kiosk.bas`
**파일 크기**: 4.5KB
**역할**: 키오스크 전용 비즈니스 로직 모듈
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [Type 정의](#2-type-정의)
3. [전역 변수](#3-전역-변수)
4. [함수 목록](#4-함수-목록)
5. [주요 함수 상세 분석](#5-주요-함수-상세-분석)
6. [호출 관계](#6-호출-관계)
7. [마이그레이션 고려사항](#7-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

키오스크 전용 비즈니스 로직을 관리하는 모듈로, 주문 데이터 구조, 이미지 처리, 온스크린 키보드 제어 등 키오스크에 특화된 기능을 제공합니다.

### 1.2 주요 역할

- **주문 데이터 구조 정의**: OrderKiosk Type을 통한 주문 정보 관리
- **옵션 상품 관리**: OPGoods Type을 통한 옵션 정보 관리
- **이미지 처리**: Nanumi.ImagePlus를 이용한 이미지 리사이징
- **온스크린 키보드**: 터치스크린 환경을 위한 가상 키보드 호출

### 1.3 버전 정보

```vb
'6.0.3 21터치 키오스크
```

- 버전: 6.0.3
- 대상: 21인치 터치스크린 키오스크

### 1.4 코드 구조

```
Option Explicit
    ↓
Type 정의 (OPGoods, OrderKiosk)
    ↓
Public 변수 선언
    ↓
Public Sub/Function 구현
    ├─ Selfimage_load (이미지 리사이징)
    └─ sub키보드 (온스크린 키보드)
```

---

## 2. Type 정의

### 2.1 OPGoods (옵션 상품)

```vb
Private Type OPGoods
    sOPID As String      ' 옵션번호
    sbarcode As String   ' 바코드
End Type
```

**용도**: 주문 상품에 추가되는 옵션 정보를 저장

**필드 설명**:
| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| **sOPID** | String | 옵션 고유 번호 | "OP001" |
| **sbarcode** | String | 옵션 바코드 | "8801234567890" |

**사용 시나리오**:

```
메인 메뉴: 햄버거 (바코드: 1234567890)
    ↓
옵션 선택:
    - 치즈 추가 (sOPID: "OP001", sbarcode: "8801234567891")
    - 베이컨 추가 (sOPID: "OP002", sbarcode: "8801234567892")
```

**접근 제한**: `Private Type`으로 선언되어 이 모듈 내에서만 사용 가능

### 2.2 OrderKiosk (주문 데이터)

```vb
Type OrderKiosk
    sID As String           ' 상품 ID
    Cnt As Integer          ' 수량
    sName As String         ' 상품명
    sbarcode As String      ' 바코드
    pri As Long             ' 가격
    sOPBarcods As String    ' 옵션 바코드들 (복수)
    sOPID As String         ' 옵션 ID들
    sOPYN As String         ' 옵션상품 유무
    sMainPri As String      ' 메인상품가격

    'OPGoods() As OPGoods   ' 옵션바코드 (주석 처리됨)
End Type
```

**용도**: 키오스크에서 선택된 주문 상품의 전체 정보를 저장

**필드 상세 분석**:

| 필드명         | 타입    | 설명             | 예시 값           | 비고           |
| -------------- | ------- | ---------------- | ----------------- | -------------- |
| **sID**        | String  | 상품 고유 ID     | "G001"            | Primary Key    |
| **Cnt**        | Integer | 주문 수량        | 2                 | 1 이상         |
| **sName**      | String  | 상품명           | "불고기버거 세트" | UI 표시용      |
| **sbarcode**   | String  | 상품 바코드      | "1234567890"      | POS 연동       |
| **pri**        | Long    | 최종 가격        | 8500              | 옵션 포함 가격 |
| **sOPBarcods** | String  | 옵션 바코드 목록 | "OP001,OP002"     | 쉼표로 구분    |
| **sOPID**      | String  | 옵션 ID 목록     | "1,2,5"           | 쉼표로 구분    |
| **sOPYN**      | String  | 옵션 존재 여부   | "Y" / "N"         | Flag           |
| **sMainPri**   | String  | 메인 상품 원가   | "7000"            | 옵션 제외 가격 |

**데이터 흐름 예시**:

```
1. 사용자가 "불고기버거 세트" 선택
   ↓
   OrderKiosk 생성:
   sID = "G001"
   sName = "불고기버거 세트"
   sbarcode = "1234567890"
   sMainPri = "7000"
   sOPYN = "N"
   Cnt = 1
   pri = 7000

2. 사용자가 "치즈 추가" 옵션 선택
   ↓
   OrderKiosk 업데이트:
   sOPYN = "Y"
   sOPID = "OP001"
   sOPBarcods = "8801234567891"
   pri = 7000 + 500 = 7500

3. 사용자가 "베이컨 추가" 옵션 추가 선택
   ↓
   OrderKiosk 업데이트:
   sOPID = "OP001,OP002"
   sOPBarcods = "8801234567891,8801234567892"
   pri = 7000 + 500 + 1000 = 8500

4. 수량 2개로 변경
   ↓
   OrderKiosk 업데이트:
   Cnt = 2
   (pri는 단가 유지)
```

**주석 처리된 필드**:

```vb
'OPGoods() As OPGoods   ' 옵션바코드
```

- 원래는 배열로 옵션을 관리하려 했으나 구현 변경
- 현재는 `sOPBarcods`와 `sOPID`에 쉼표로 구분된 문자열로 저장
- Type 내에 동적 배열을 사용할 수 없는 VB6 제약사항 때문

---

## 3. 전역 변수

### 3.1 Public 변수

```vb
Public OPGoodsNum As Integer      ' 옵션수
Public OrderGoods() As OrderKiosk ' 주문 상품 배열
```

#### 3.1.1 OPGoodsNum

**타입**: Integer
**용도**: 현재 선택된 옵션의 개수

**사용 예시**:

```vb
' 옵션 추가 시
OPGoodsNum = OPGoodsNum + 1

' 옵션 초기화 시
OPGoodsNum = 0

' 옵션 개수 확인
If OPGoodsNum > 0 Then
    ' 옵션이 있는 경우 처리
End If
```

**값 범위**: 0 ~ n (일반적으로 10개 이내)

#### 3.1.2 OrderGoods()

**타입**: OrderKiosk의 동적 배열
**용도**: 장바구니 역할 - 주문된 상품 목록을 저장

**배열 관리**:

```vb
' 배열 초기화
ReDim OrderGoods(0)

' 상품 추가
ReDim Preserve OrderGoods(UBound(OrderGoods) + 1)
OrderGoods(UBound(OrderGoods)).sID = "G001"
OrderGoods(UBound(OrderGoods)).sName = "불고기버거"

' 배열 순회
Dim i As Integer
For i = 0 To UBound(OrderGoods)
    Debug.Print OrderGoods(i).sName
Next i
```

**인덱스 구조**:

```
OrderGoods(0) = 첫 번째 주문 상품
OrderGoods(1) = 두 번째 주문 상품
OrderGoods(2) = 세 번째 주문 상품
...
OrderGoods(n) = n번째 주문 상품
```

### 3.2 주석 처리된 코드

파일 내에는 사용하지 않는 초기화 함수들이 주석 처리되어 있습니다:

```vb
'Public Sub initOrderGood()
'    OrderGood.Cnt = 0
'    OrderGood.pri = 0
'    OrderGood.OrderSEQ = -1
'    OrderGood.sBarcode = ""
'    OrderGood.sName = ""
'End Sub

'Public Sub initOrderList()
'Dim i As Integer
'    For i = 0 To 99
'        OrderKioskList(i).OrderSEQ = 0
'        OrderKioskList(i).sBarcode = ""
'        OrderKioskList(i).sName = ""
'        OrderKioskList(i).Cnt = 0
'        OrderKioskList(i).pri = 0
'    Next i
'End Sub
```

**주석 처리 이유 추정**:

1. 초기 설계에서는 고정 배열(0 To 99) 사용
2. 동적 배열로 변경하면서 초기화 방식 변경
3. 호출하는 곳에서 직접 ReDim으로 처리하도록 수정

---

## 4. 함수 목록

### 4.1 Public 함수

| 함수명             | 반환 타입  | 파라미터 | 역할                    |
| ------------------ | ---------- | -------- | ----------------------- |
| **Selfimage_load** | Sub (void) | 6개      | 이미지 리사이징 및 저장 |
| **sub키보드**      | Sub (void) | 없음     | 온스크린 키보드 실행    |

---

## 5. 주요 함수 상세 분석

### 5.1 Selfimage_load (이미지 리사이징)

**시그니처**:

```vb
Public Sub Selfimage_load(
    Img_Path As String,
    ByRef saveFilePath As String,
    Optional img_size As Integer = 250,
    Optional ftpAddr As String = ""
)
```

**역할**:
원본 이미지를 지정된 크기로 리사이징하여 임시 폴더에 저장. 키오스크 UI에서 상품 이미지를 표시하기 위해 사용됩니다.

**파라미터 상세**:

| 파라미터         | 타입    | In/Out | 필수 | 기본값 | 설명                     |
| ---------------- | ------- | ------ | ---- | ------ | ------------------------ |
| **Img_Path**     | String  | In     | 필수 | -      | 원본 이미지 경로         |
| **saveFilePath** | String  | Out    | 필수 | -      | 저장된 파일 경로 (ByRef) |
| **img_size**     | Integer | In     | 선택 | 250    | 리사이징 크기 (px)       |
| **ftpAddr**      | String  | In     | 선택 | ""     | FTP 주소 (로그용)        |

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. 임시 파일 경로 생성                │
│    App.Path & "\SelfImage\temp_image.JPG"│
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. Nanumi.ImagePlus 객체 생성        │
│    CreateObject("Nanumi.ImagePlus")  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. 원본 이미지 로드                  │
│    objImage.OpenImageFile Img_Path  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. 이미지 속성 설정                  │
│    - OverWrite = True                │
│    - ImageFormat = "JPG"             │
│    - Quality = 100                   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 5. 크기 조정 (img_size > 0인 경우)   │
│    - KeepAspect = False              │
│    - ChangeSize img_size, img_size   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 6. 파일 저장                         │
│    objImage.SaveFile strSaveFileName │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 7. 객체 해제 및 경로 반환            │
│    saveFilePath = strSaveFileName    │
└─────────────────────────────────────┘
```

**코드 분석**:

```vb
Public Sub Selfimage_load(Img_Path As String, ByRef saveFilePath As String, Optional img_size As Integer = 250, Optional ftpAddr As String = "")
    Dim objImage As Nanumi.ImagePlus
    Dim strSaveFileName As String

    Dim er_num As Long
    Dim er_con As String
    On Error GoTo err

    ' ===== 1. 임시 파일 경로 생성 =====
    strSaveFileName = App.Path & "\SelfImage\temp_image.JPG"

    ' ===== 2. Nanumi.ImagePlus COM 객체 생성 =====
    Set objImage = CreateObject("Nanumi.ImagePlus")

    ' ===== 3. 원본 이미지 로드 =====
    objImage.OpenImageFile Img_Path

    ' ===== 4. 이미지 저장 옵션 설정 =====
    objImage.OverWrite = True        ' 파일 덮어쓰기 허용
    objImage.ImageFormat = "JPG"     ' JPEG 형식으로 저장
    objImage.Quality = 100           ' 최고 품질 (1~100)

    ' ===== 5. 크기 조정 =====
    If img_size > 0 Then
        objImage.KeepAspect = False          ' 비율 무시 (정사각형으로)
        objImage.ChangeSize img_size, img_size   ' 크기 변경
    End If

    ' ===== 6. 파일 저장 =====
    objImage.SaveFile strSaveFileName

    ' ===== 7. 객체 해제 =====
    objImage.Dispose
    Set objImage = Nothing

    ' ===== 8. 저장 경로 반환 (ByRef) =====
    saveFilePath = strSaveFileName

    Exit Sub

err:
    ' ===== 에러 처리 =====
    er_num = err.Number
    er_con = err.Description

    ' 원래는 로그 기록 (현재 주석 처리)
    'Call wSMS_LOG_Write("item_image_load" & vbTab & ftpAddr & vbTab & er_num & vbTab & Replace(er_con, vbCrLf, Space(1)) & vbTab & img_path)

    ' 마우스 커서 복구
    Screen.MousePointer = 1  ' 기본 화살표
End Sub
```

**Nanumi.ImagePlus 속성**:

| 속성명          | 타입    | 값    | 설명                             |
| --------------- | ------- | ----- | -------------------------------- |
| **OverWrite**   | Boolean | True  | 기존 파일 덮어쓰기 허용          |
| **ImageFormat** | String  | "JPG" | 저장 형식 (JPG/GIF/BMP/PNG/TIFF) |
| **Quality**     | Integer | 100   | JPEG 품질 (1~100)                |
| **KeepAspect**  | Boolean | False | 비율 유지 여부                   |

**사용 예시**:

```vb
' 예시 1: 기본 크기 (250x250)로 리사이징
Dim savedPath As String
Call Selfimage_load("C:\images\product001.jpg", savedPath)
' savedPath = "C:\POSON\SelfImage\temp_image.JPG"

' 예시 2: 사용자 지정 크기 (300x300)
Call Selfimage_load("C:\images\product002.png", savedPath, 300)

' 예시 3: 크기 조정 없이 형식만 변환
Call Selfimage_load("C:\images\product003.bmp", savedPath, 0)
```

**문제점 및 개선 사항**:

1. **고정된 임시 파일명**

   ```vb
   strSaveFileName = App.Path & "\SelfImage\temp_image.JPG"
   ```

   - 항상 같은 파일명 사용
   - 동시에 여러 이미지 처리 시 충돌 가능
   - 개선: UUID 또는 타임스탬프 사용

2. **에러 로그 미작동**

   ```vb
   'Call wSMS_LOG_Write(...)  ' 주석 처리됨
   ```

   - 에러 발생 시 추적 불가
   - 개선: 로그 시스템 활성화

3. **폴더 존재 확인 없음**
   - `\SelfImage` 폴더가 없으면 에러
   - 개선: 폴더 생성 로직 추가

### 5.2 sub키보드 (온스크린 키보드)

**시그니처**:

```vb
Public Sub sub키보드()
```

**역할**:
Windows 온스크린 키보드(OSK.exe)를 실행하여 터치스크린 환경에서 문자 입력을 지원합니다.

**실행 흐름**:

```
┌─────────────────────────────────────┐
│ 1. OSK.exe 경로 설정                 │
│    C:\Windows\system32\osk.exe      │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. WMI_OS 호출 (OS 정보 확인)        │
│    - wOS_Name: Windows 버전명        │
│    - wOS_Bit: 32-bit / 64-bit       │
│    - wOS_Ver: 버전 번호              │
└─────────────────────────────────────┘
                ↓
        ┌───────┴───────┐
        │  OS 비트 확인  │
        └───────┬───────┘
        ↓               ↓
   [64-bit]        [32-bit]
        ↓               ↓
┌─────────────┐  ┌─────────────┐
│ 3a. WOW64    │  │ 3b. 직접    │
│ 리다이렉션    │  │ 실행        │
│ 해제          │  │             │
└─────────────┘  └─────────────┘
        ↓               ↓
┌─────────────┐  ┌─────────────┐
│ 4a. OSK 실행 │  │ 4b. OSK 실행│
│ (ShellExecute)│ │ (ShellExecute)│
└─────────────┘  └─────────────┘
        ↓               ↓
┌─────────────┐  ┌─────────────┐
│ 5a. 리다이렉션│ │ 5b. 완료    │
│ 복구          │  │             │
└─────────────┘  └─────────────┘
```

**코드 분석**:

```vb
Public Sub sub키보드()
    Dim OSK_Path As String
    Dim i_pos As Integer

    Dim oValue As Long
    Dim isD As Boolean
    On Error GoTo err

    ' ===== 1. OSK.exe 경로 설정 =====
    OSK_Path = "C:\Windows\system32\osk.exe"
    i_pos = InStrRev(OSK_Path, "\")  ' 마지막 백슬래시 위치

    ' ===== 2. OS 정보 확인 =====
    Dim wOS_Name As String
    Dim wOS_Bit As String
    Dim wOS_Ver As String

    If WMI_OS(wOS_Name, wOS_Bit, wOS_Ver) = True Then
        wOS_Name = Replace(wOS_Name, Chr(0), "")
        wOS_Bit = Replace(wOS_Bit, Chr(0), "")
        wOS_Ver = Replace(wOS_Ver, Chr(0), "")
    End If

    ' ===== 3. 64비트 OS 처리 =====
    If wOS_Bit = "64-bit" Or wOS_Bit = "64비트" Then

        ' 3a. WOW64 파일 시스템 리다이렉션 해제
        isD = Wow64DisableWow64FsRedirection(oValue)

        If isD Then
            ' 4a. OSK 실행 (실제 system32 경로)
            ShellExecute &H0, "open", OSK_Path, vbNullString, Left(OSK_Path, i_pos - 1), SW_SHOWNORMAL

            ' 5a. 리다이렉션 복구
            Wow64RevertWow64FsRedirection (isD)
        Else
            ' 리다이렉션 해제 실패
            MsgBox "Wow64DisableWow64FsRedirection Fail", vbCritical + vbSystemModal, Enterprise
        End If

    ' ===== 3b. 32비트 OS 처리 =====
    Else
        ' 파일 존재 확인
        If Dir$(OSK_Path) <> "" Then
            ' 4b. OSK 직접 실행
            ShellExecute &H0, "open", OSK_Path, vbNullString, Left(OSK_Path, i_pos - 1), SW_SHOWNORMAL
        Else
            MsgBox OSK_Path & " 파일이 존재하지 않습니다.", vbCritical + vbSystemModal, Enterprise
        End If
    End If

    Exit Sub

err:
    MsgBox "[lab키보드_Click] : " & err.Number & Chr(13) & "[오류내용] : " & err.Description
End Sub
```

**주요 개념 설명**:

#### 5.2.1 WOW64 파일 시스템 리다이렉션

**문제 상황**:

- 64비트 Windows에서 32비트 프로그램(VB6) 실행 시
- `C:\Windows\system32` 접근이 자동으로 `C:\Windows\SysWOW64`로 리다이렉션됨
- OSK.exe는 system32에만 존재 → 찾을 수 없음

**해결 방법**:

```vb
' 리다이렉션 일시 해제
isD = Wow64DisableWow64FsRedirection(oValue)

' OSK.exe 실행 (이제 실제 system32 접근 가능)
ShellExecute ...

' 리다이렉션 복구
Wow64RevertWow64FsRedirection (isD)
```

#### 5.2.2 ShellExecute API

```vb
ShellExecute(
    &H0,                          ' hwnd: 부모 윈도우 핸들 (0 = 없음)
    "open",                       ' lpOperation: 동작 ("open", "print" 등)
    OSK_Path,                     ' lpFile: 실행할 파일
    vbNullString,                 ' lpParameters: 파라미터 (없음)
    Left(OSK_Path, i_pos - 1),   ' lpDirectory: 작업 디렉토리
    SW_SHOWNORMAL                 ' nShowCmd: 창 표시 방식
)
```

**창 표시 방식 (nShowCmd)**:
| 상수 | 값 | 설명 |
|------|-----|------|
| SW_HIDE | 0 | 숨김 |
| SW_SHOWNORMAL | 1 | 일반 크기 |
| SW_SHOWMINIMIZED | 2 | 최소화 |
| SW_SHOWMAXIMIZED | 3 | 최대화 |

#### 5.2.3 OS 정보 확인

```vb
If WMI_OS(wOS_Name, wOS_Bit, wOS_Ver) = True Then
    ' wOS_Name: "Microsoft Windows 10 Pro"
    ' wOS_Bit: "64-bit" 또는 "64비트"
    ' wOS_Ver: "10.0.19041"
End If
```

**사용 이유**:

- 64비트 OS 여부에 따라 실행 방식 분기
- 32비트 OS에서는 리다이렉션 처리 불필요

**사용 예시**:

```vb
' 예시 1: 로그인 화면에서 호출
Private Sub cmdShowKeyboard_Click()
    Call sub키보드()
End Sub

' 예시 2: TextBox 포커스 시 자동 호출
Private Sub txtPhoneNumber_GotFocus()
    Call sub키보드()
End Sub

' 예시 3: 버튼 이미지로 표시
Private Sub imgKeyboard_Click()
    Call sub키보드()
End Sub
```

**키보드 종료**:

- OSK.exe는 별도 프로세스로 실행
- 사용자가 직접 닫기 버튼 클릭
- 또는 프로세스 종료 API 사용 가능

**문제점 및 개선 사항**:

1. **중복 실행 방지 없음**
   - 버튼을 여러 번 누르면 여러 개 실행됨
   - 개선: 이미 실행 중인지 확인

   ```vb
   If IsOSKRunning() = False Then
       Call sub키보드()
   End If
   ```

2. **프로세스 관리 없음**
   - 실행 후 핸들을 저장하지 않음
   - 종료 제어 불가
   - 개선: 프로세스 핸들 저장

3. **에러 메시지 하드코딩**

   ```vb
   MsgBox "[lab키보드_Click] : " & err.Number
   ```

   - "lab키보드\_Click"은 호출한 폼의 이벤트 핸들러명
   - 공통 함수인데 특정 폼 이름 포함
   - 개선: 일반적인 메시지로 수정

---

## 6. 호출 관계

### 6.1 이 파일이 호출하는 함수/API

| 함수/API명                         | 정의 위치               | 역할                 |
| ---------------------------------- | ----------------------- | -------------------- |
| **CreateObject**                   | VB6 내장                | COM 객체 생성        |
| **WMI_OS**                         | Mdl_Function.bas (추정) | OS 정보 확인         |
| **Wow64DisableWow64FsRedirection** | kernel32.dll            | 파일 리다이렉션 해제 |
| **Wow64RevertWow64FsRedirection**  | kernel32.dll            | 리다이렉션 복구      |
| **ShellExecute**                   | shell32.dll             | 프로그램 실행        |

### 6.2 이 파일을 호출하는 곳

| 호출 위치 (추정)   | 함수           | 사용 목적        |
| ------------------ | -------------- | ---------------- |
| **Frm_Main.frm**   | Selfimage_load | 상품 이미지 표시 |
| **Frm_Menu.frm**   | Selfimage_load | 메뉴 이미지 로드 |
| **Frm_Login.frm**  | sub키보드      | 로그인 시 키보드 |
| **Frm_Search.frm** | sub키보드      | 검색 시 키보드   |

### 6.3 호출 그래프

```
mdl_Kiosk.bas
    │
    ├─ Selfimage_load
    │   ├─→ CreateObject("Nanumi.ImagePlus")
    │   │   └─→ Nanumi.dll (외부 COM)
    │   └─→ Screen.MousePointer (VB6 내장)
    │
    └─ sub키보드
        ├─→ WMI_OS (Mdl_Function.bas)
        ├─→ Wow64DisableWow64FsRedirection (kernel32.dll)
        ├─→ ShellExecute (shell32.dll)
        └─→ Wow64RevertWow64FsRedirection (kernel32.dll)

외부에서 호출:
    Frm_Main.frm ──→ Selfimage_load
    Frm_Menu.frm ──→ Selfimage_load
    Frm_Login.frm ──→ sub키보드
    Frm_Search.frm ──→ sub키보드
```

### 6.4 데이터 흐름

```
[사용자가 상품 선택]
        ↓
┌──────────────────────┐
│ Frm_Main.frm          │
│ - 상품 클릭 이벤트    │
└──────────────────────┘
        ↓
┌──────────────────────┐
│ OrderGoods() 배열      │
│ - 새 항목 추가         │
│ - OrderKiosk 타입     │
└──────────────────────┘
        ↓
┌──────────────────────┐
│ Selfimage_load        │
│ - 상품 이미지 리사이징│
└──────────────────────┘
        ↓
┌──────────────────────┐
│ PictureBox 표시       │
│ - temp_image.JPG 로드│
└──────────────────────┘

[사용자가 문자 입력 필요]
        ↓
┌──────────────────────┐
│ TextBox_GotFocus      │
└──────────────────────┘
        ↓
┌──────────────────────┐
│ sub키보드()           │
│ - OSK.exe 실행        │
└──────────────────────┘
        ↓
┌──────────────────────┐
│ 온스크린 키보드 표시  │
└──────────────────────┘
```

---

## 7. 마이그레이션 고려사항

### 7.1 현대 웹 스택 전환

#### 7.1.1 OrderKiosk Type → TypeScript Interface

**VB6**:

```vb
Type OrderKiosk
    sID As String
    Cnt As Integer
    sName As String
    sbarcode As String
    pri As Long
    sOPBarcods As String
    sOPID As String
    sOPYN As String
    sMainPri As String
End Type

Public OrderGoods() As OrderKiosk
```

**TypeScript**:

```typescript
// types/order.ts
export interface OrderItem {
  id: string; // sID
  quantity: number; // Cnt
  name: string; // sName
  barcode: string; // sbarcode
  price: number; // pri
  optionBarcodes: string[]; // sOPBarcods → 배열로
  optionIds: string[]; // sOPID → 배열로
  hasOptions: boolean; // sOPYN → boolean
  basePrice: number; // sMainPri → number
}

export interface Option {
  id: string; // sOPID
  barcode: string; // sbarcode
  name: string; // 추가
  price: number; // 추가
}

export interface Cart {
  items: OrderItem[];
  totalPrice: number;
  totalQuantity: number;
}
```

**Vue 3 Composition API (Pinia Store)**:

```typescript
// stores/cart.ts
import { defineStore } from "pinia";
import type { OrderItem, Cart } from "@/types/order";

export const useCartStore = defineStore("cart", {
  state: (): Cart => ({
    items: [],
    totalPrice: 0,
    totalQuantity: 0,
  }),

  getters: {
    itemCount: (state) => state.items.length,
    isEmpty: (state) => state.items.length === 0,
  },

  actions: {
    addItem(item: OrderItem) {
      // 같은 상품 + 같은 옵션이면 수량만 증가
      const existingIndex = this.items.findIndex(
        (i) =>
          i.id === item.id &&
          JSON.stringify(i.optionIds.sort()) === JSON.stringify(item.optionIds.sort()),
      );

      if (existingIndex !== -1) {
        this.items[existingIndex].quantity += item.quantity;
      } else {
        this.items.push(item);
      }

      this.calculateTotals();
    },

    removeItem(index: number) {
      this.items.splice(index, 1);
      this.calculateTotals();
    },

    updateQuantity(index: number, quantity: number) {
      if (quantity <= 0) {
        this.removeItem(index);
      } else {
        this.items[index].quantity = quantity;
        this.calculateTotals();
      }
    },

    clearCart() {
      this.items = [];
      this.totalPrice = 0;
      this.totalQuantity = 0;
    },

    calculateTotals() {
      this.totalPrice = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
  },
});
```

**Vue Component 사용 예시**:

```vue
<!-- components/CartView.vue -->
<script setup lang="ts">
import { useCartStore } from "@/stores/cart";
import type { OrderItem } from "@/types/order";

const cartStore = useCartStore();

const addToCart = (item: OrderItem) => {
  cartStore.addItem(item);
};

const removeFromCart = (index: number) => {
  cartStore.removeItem(index);
};
</script>

<template>
  <div class="cart">
    <h2>장바구니 ({{ cartStore.itemCount }})</h2>

    <div v-if="cartStore.isEmpty" class="empty">장바구니가 비어있습니다.</div>

    <div v-else>
      <div v-for="(item, index) in cartStore.items" :key="index" class="cart-item">
        <span>{{ item.name }}</span>
        <span>{{ item.quantity }}개</span>
        <span>{{ item.price.toLocaleString() }}원</span>
        <button @click="removeFromCart(index)">삭제</button>
      </div>

      <div class="total">
        <strong>합계: {{ cartStore.totalPrice.toLocaleString() }}원</strong>
      </div>
    </div>
  </div>
</template>
```

#### 7.1.2 Selfimage_load → Canvas API / Image Processing

**문제점**:

- VB6: Nanumi.ImagePlus (외부 COM 컴포넌트)
- 브라우저: 직접 이미지 처리 필요

**해결책 1: Canvas API (클라이언트 측)**

```typescript
// utils/imageProcessor.ts
export async function resizeImage(file: File, maxSize: number = 250): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      // 정사각형으로 리사이즈 (KeepAspect = False)
      canvas.width = maxSize;
      canvas.height = maxSize;

      // 이미지 그리기
      ctx?.drawImage(img, 0, 0, maxSize, maxSize);

      // Blob으로 변환 (JPEG, 품질 100%)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas to Blob failed"));
          }
        },
        "image/jpeg",
        1.0, // 품질 100%
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// 사용 예시
async function handleImageUpload(file: File) {
  try {
    const resizedBlob = await resizeImage(file, 250);
    const formData = new FormData();
    formData.append("image", resizedBlob, "temp_image.jpg");

    // 서버에 업로드
    await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("Image processing failed:", error);
  }
}
```

**해결책 2: Sharp (서버 측, Node.js)**

```typescript
// server/utils/imageProcessor.ts
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export async function resizeAndSaveImage(inputPath: string, size: number = 250): Promise<string> {
  const outputDir = path.join(process.cwd(), "uploads", "resized");
  const outputPath = path.join(outputDir, "temp_image.jpg");

  // 디렉토리 생성 (없으면)
  await fs.mkdir(outputDir, { recursive: true });

  // 이미지 리사이징
  await sharp(inputPath)
    .resize(size, size, {
      fit: "fill", // KeepAspect = False와 동일
      position: "center",
    })
    .jpeg({ quality: 100 })
    .toFile(outputPath);

  return outputPath;
}

// Express Route
import express from "express";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/temp/" });

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const resizedPath = await resizeAndSaveImage(req.file.path, 250);

    res.json({
      success: true,
      path: `/uploads/resized/temp_image.jpg`,
    });
  } catch (error) {
    res.status(500).json({ error: "Image processing failed" });
  }
});

export default router;
```

**비교표**:

| 기능          | VB6 (Nanumi.ImagePlus) | Canvas API       | Sharp (Node.js) |
| ------------- | ---------------------- | ---------------- | --------------- |
| **실행 위치** | 클라이언트             | 클라이언트       | 서버            |
| **의존성**    | COM 컴포넌트           | 브라우저 내장    | npm 패키지      |
| **성능**      | 중간                   | 느림 (큰 이미지) | 빠름            |
| **품질**      | 높음                   | 중간             | 매우 높음       |
| **비율 유지** | KeepAspect             | fit 옵션         | fit 옵션        |
| **포맷 지원** | JPG/GIF/BMP/PNG        | JPG/PNG/WebP     | 거의 모든 포맷  |

**권장 사항**:

- **키오스크 환경**: Canvas API (오프라인 동작 가능)
- **서버 환경**: Sharp (고성능, 안정적)
- **하이브리드**: 작은 이미지는 Canvas, 큰 이미지는 Sharp

#### 7.1.3 sub키보드 → Virtual Keyboard

**VB6**:

```vb
Public Sub sub키보드()
    ' Windows OSK.exe 실행
    ShellExecute &H0, "open", "C:\Windows\system32\osk.exe", ...
End Sub
```

**해결책 1: HTML5 Input Type (모바일 자동 키보드)**

```vue
<!-- components/TouchInput.vue -->
<template>
  <input
    type="text"
    inputmode="text"
    autocomplete="off"
    @focus="onFocus"
    v-model="value"
    :placeholder="placeholder"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  placeholder?: string;
}>();

const value = ref("");

const onFocus = () => {
  // 모바일에서는 자동으로 키보드 표시됨
  // 태블릿/키오스크에서는 추가 처리 필요
};
</script>
```

**inputmode 속성**:

```html
<!-- 숫자 키패드 -->
<input type="text" inputmode="numeric" />

<!-- 전화번호 -->
<input type="tel" inputmode="tel" />

<!-- 이메일 -->
<input type="email" inputmode="email" />

<!-- URL -->
<input type="url" inputmode="url" />

<!-- 일반 텍스트 -->
<input type="text" inputmode="text" />
```

**해결책 2: 커스텀 가상 키보드 (순수 HTML/CSS/JS)**

```vue
<!-- components/VirtualKeyboard.vue -->
<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const isVisible = ref(false);

const koreanLayout = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
];

const englishLayout = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const numberLayout = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0", "00", "."],
];

const currentLayout = ref<"korean" | "english" | "number">("korean");

const layout = computed(() => {
  switch (currentLayout.value) {
    case "korean":
      return koreanLayout;
    case "english":
      return englishLayout;
    case "number":
      return numberLayout;
  }
});

const onKeyClick = (key: string) => {
  emit("update:modelValue", props.modelValue + key);
};

const onBackspace = () => {
  emit("update:modelValue", props.modelValue.slice(0, -1));
};

const onClear = () => {
  emit("update:modelValue", "");
};

const onSpace = () => {
  emit("update:modelValue", props.modelValue + " ");
};

const show = () => {
  isVisible.value = true;
};

const hide = () => {
  isVisible.value = false;
};

defineExpose({ show, hide });
</script>

<template>
  <transition name="slide-up">
    <div v-if="isVisible" class="virtual-keyboard">
      <!-- 레이아웃 전환 버튼 -->
      <div class="keyboard-header">
        <button @click="currentLayout = 'korean'">한글</button>
        <button @click="currentLayout = 'english'">영문</button>
        <button @click="currentLayout = 'number'">숫자</button>
      </div>

      <!-- 키 배열 -->
      <div class="keyboard-body">
        <div v-for="(row, rowIndex) in layout" :key="rowIndex" class="keyboard-row">
          <button
            v-for="(key, keyIndex) in row"
            :key="keyIndex"
            @click="onKeyClick(key)"
            class="key"
          >
            {{ key }}
          </button>
        </div>

        <!-- 특수 키 -->
        <div class="keyboard-row">
          <button @click="onSpace" class="key key-space">스페이스</button>
          <button @click="onBackspace" class="key key-backspace">←</button>
          <button @click="onClear" class="key key-clear">지우기</button>
          <button @click="hide" class="key key-close">닫기</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.virtual-keyboard {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #2c3e50;
  padding: 20px;
  z-index: 9999;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

.keyboard-header {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.keyboard-header button {
  flex: 1;
  padding: 15px;
  font-size: 18px;
  background: #34495e;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.keyboard-header button:active {
  background: #1abc9c;
}

.keyboard-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  justify-content: center;
}

.key {
  min-width: 60px;
  height: 60px;
  font-size: 24px;
  background: #ecf0f1;
  border: 2px solid #bdc3c7;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s;
}

.key:active {
  background: #3498db;
  color: white;
  transform: scale(0.95);
}

.key-space {
  flex: 2;
}

.key-backspace,
.key-clear,
.key-close {
  background: #e74c3c;
  color: white;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
```

**사용 예시**:

```vue
<!-- views/LoginView.vue -->
<script setup lang="ts">
import { ref } from "vue";
import VirtualKeyboard from "@/components/VirtualKeyboard.vue";

const phoneNumber = ref("");
const keyboard = ref<InstanceType<typeof VirtualKeyboard>>();

const showKeyboard = () => {
  keyboard.value?.show();
};
</script>

<template>
  <div class="login">
    <input
      type="text"
      v-model="phoneNumber"
      @focus="showKeyboard"
      placeholder="전화번호를 입력하세요"
      readonly
    />

    <VirtualKeyboard ref="keyboard" v-model="phoneNumber" />
  </div>
</template>
```

**해결책 3: 외부 라이브러리 (vue-virtual-keyboard)**

```bash
npm install vue-virtual-keyboard
```

```vue
<script setup lang="ts">
import { ref } from "vue";
import VueVirtualKeyboard from "vue-virtual-keyboard";

const inputValue = ref("");
</script>

<template>
  <div>
    <input v-model="inputValue" @focus="$refs.keyboard.show()" />

    <VueVirtualKeyboard
      ref="keyboard"
      v-model="inputValue"
      :layouts="['korean', 'english', 'numeric']"
    />
  </div>
</template>
```

**Windows OSK.exe vs 웹 가상 키보드 비교**:

| 항목              | Windows OSK.exe      | 웹 가상 키보드      |
| ----------------- | -------------------- | ------------------- |
| **플랫폼 독립성** | Windows만            | 모든 OS/브라우저    |
| **커스터마이징**  | 불가능               | 완전히 가능         |
| **디자인 통일**   | OS 스타일            | 앱 스타일 적용 가능 |
| **언어 지원**     | OS 설정 의존         | 직접 구현           |
| **반응 속도**     | 느림 (프로세스 실행) | 빠름 (DOM)          |
| **메모리 사용**   | 높음 (별도 프로세스) | 낮음                |
| **오프라인**      | 가능                 | 가능 (PWA)          |

**권장 사항**:

1. **Windows 키오스크**: 터치 키보드 API 사용

   ```javascript
   if (navigator.virtualKeyboard) {
     navigator.virtualKeyboard.overlaysContent = true;
     navigator.virtualKeyboard.show();
   }
   ```

2. **크로스 플랫폼 키오스크**: 커스텀 가상 키보드 구현
   - 디자인 통일성
   - 브랜드 컬러 적용
   - 특수 키 추가 가능

3. **모바일/태블릿**: HTML5 inputmode 속성 사용
   - 기본 OS 키보드 활용
   - 최적화된 UX

### 7.2 아키텍처 변경

#### 7.2.1 VB6 아키텍처

```
┌─────────────────────────────────────┐
│        Frm_Main.frm                 │
│     (UI + 비즈니스 로직)             │
└────────────┬────────────────────────┘
             │
             │ 직접 호출
             ↓
┌─────────────────────────────────────┐
│       mdl_Kiosk.bas                 │
│  - OrderGoods() 전역 변수           │
│  - Selfimage_load                   │
│  - sub키보드                        │
└─────────────────────────────────────┘
```

**문제점**:

- UI와 로직 분리 안 됨
- 전역 변수 남용
- 테스트 불가능
- 재사용성 낮음

#### 7.2.2 현대 웹 아키텍처 (Layered)

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (Vue Components + Composables)   │
│  - CartView.vue                     │
│  - MenuView.vue                     │
│  - VirtualKeyboard.vue              │
└────────────┬────────────────────────┘
             │
             │ Pinia Store
             ↓
┌─────────────────────────────────────┐
│          State Management           │
│         (Pinia Stores)              │
│  - useCartStore()                   │
│  - useMenuStore()                   │
│  - useAuthStore()                   │
└────────────┬────────────────────────┘
             │
             │ API Calls
             ↓
┌─────────────────────────────────────┐
│          Service Layer              │
│     (Business Logic Services)       │
│  - orderService.ts                  │
│  - imageService.ts                  │
│  - paymentService.ts                │
└────────────┬────────────────────────┘
             │
             │ HTTP/REST
             ↓
┌─────────────────────────────────────┐
│           API Layer                 │
│      (Express REST API)             │
│  - /api/orders                      │
│  - /api/menu                        │
│  - /api/images                      │
└────────────┬────────────────────────┘
             │
             │ SQL
             ↓
┌─────────────────────────────────────┐
│         Data Layer                  │
│       (Database + ORM)              │
│  - SQL Server                       │
│  - TypeORM / Prisma                 │
└─────────────────────────────────────┘
```

**장점**:

- 각 레이어 독립적
- 테스트 용이
- 재사용성 높음
- 유지보수 쉬움

#### 7.2.3 실제 코드 예시

**Service Layer**:

```typescript
// services/orderService.ts
import type { OrderItem, Cart } from "@/types/order";

export class OrderService {
  private apiUrl = "/api/orders";

  async createOrder(cart: Cart): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.items,
        totalPrice: cart.totalPrice,
      }),
    });

    if (!response.ok) {
      throw new Error("Order creation failed");
    }

    const data = await response.json();
    return data.orderId;
  }

  async getOrderStatus(orderId: string): Promise<string> {
    const response = await fetch(`${this.apiUrl}/${orderId}`);
    const data = await response.json();
    return data.status;
  }
}

export const orderService = new OrderService();
```

**Pinia Store (State Management)**:

```typescript
// stores/cart.ts
import { defineStore } from "pinia";
import { orderService } from "@/services/orderService";

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [],
    totalPrice: 0,
  }),

  actions: {
    async checkout() {
      try {
        const orderId = await orderService.createOrder({
          items: this.items,
          totalPrice: this.totalPrice,
          totalQuantity: this.items.length,
        });

        this.clearCart();
        return orderId;
      } catch (error) {
        console.error("Checkout failed:", error);
        throw error;
      }
    },
  },
});
```

**Vue Component (Presentation)**:

```vue
<!-- components/CheckoutButton.vue -->
<script setup lang="ts">
import { useCartStore } from "@/stores/cart";
import { useRouter } from "vue-router";

const cartStore = useCartStore();
const router = useRouter();

const handleCheckout = async () => {
  try {
    const orderId = await cartStore.checkout();
    router.push(`/payment/${orderId}`);
  } catch (error) {
    alert("결제에 실패했습니다.");
  }
};
</script>

<template>
  <button @click="handleCheckout" :disabled="cartStore.isEmpty" class="checkout-button">
    결제하기 ({{ cartStore.totalPrice.toLocaleString() }}원)
  </button>
</template>
```

### 7.3 기능별 전환 요약

| VB6 기능              | 현대 웹 스택         | 구현 위치               |
| --------------------- | -------------------- | ----------------------- |
| **OrderKiosk Type**   | TypeScript Interface | types/order.ts          |
| **OrderGoods() 배열** | Pinia Store          | stores/cart.ts          |
| **Selfimage_load**    | Canvas API / Sharp   | utils/imageProcessor.ts |
| **sub키보드**         | VirtualKeyboard.vue  | components/             |
| **OPGoodsNum**        | Computed Property    | Pinia Getter            |

### 7.4 마이그레이션 우선순위

1. **Phase 1: 데이터 구조 정의** (1일)
   - TypeScript 인터페이스 작성
   - Type validation 추가

2. **Phase 2: State Management** (2일)
   - Pinia Store 구현
   - Cart, Menu, Auth Store

3. **Phase 3: UI Components** (3일)
   - 가상 키보드 컴포넌트
   - 장바구니 UI
   - 메뉴 선택 UI

4. **Phase 4: Image Processing** (1일)
   - Canvas API 구현
   - 또는 Sharp 서버 사이드 처리

5. **Phase 5: 통합 테스트** (1일)
   - E2E 테스트
   - 실제 키오스크 디바이스 테스트

**총 예상 기간**: 8일

---

## 8. 결론

mdl_Kiosk.bas는 POSON_POS_SELF21의 키오스크 전용 로직을 담당하는 핵심 모듈입니다:

### 8.1 주요 역할

1. **주문 데이터 구조 정의**: OrderKiosk Type으로 표준화된 주문 정보 관리
2. **이미지 처리**: 상품 이미지 리사이징 (Nanumi.ImagePlus)
3. **입력 지원**: 터치스크린 환경을 위한 온스크린 키보드

### 8.2 특징

- **간결함**: 164줄의 작은 코드
- **명확한 책임**: 키오스크 전용 기능만 포함
- **COM 의존성**: Nanumi.ImagePlus 외부 컴포넌트 사용
- **Windows 특화**: OSK.exe, WOW64 API 사용

### 8.3 마이그레이션 핵심

1. **데이터 구조**: Type → TypeScript Interface
2. **상태 관리**: 전역 배열 → Pinia Store
3. **이미지 처리**: COM → Canvas API / Sharp
4. **가상 키보드**: OSK.exe → Vue Component

### 8.4 권장 기술 스택

- **프론트엔드**: Vue 3 + TypeScript + Pinia
- **이미지 처리**: Canvas API (클라이언트) + Sharp (서버)
- **가상 키보드**: 커스텀 Vue Component
- **상태 관리**: Pinia Store (Vuex 대체)

마이그레이션 시 가장 중요한 것은 **키오스크 UX의 연속성**을 유지하면서 **현대적 아키텍처**로 전환하는 것입니다. 특히 터치 인터페이스의 반응성과 이미지 로딩 속도가 핵심 성능 지표입니다.

**다음 분석 파일**: [Frm_Main.frm.md](./Frm_Main.frm.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
