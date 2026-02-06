# Mdl_Printer.bas 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Mdl_Printer.bas`
**파일 크기**: 490KB
**역할**: OPOS 프린터 제어 및 영수증 출력
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [전역 변수 및 상수](#2-전역-변수-및-상수)
3. [함수 목록](#3-함수-목록)
4. [주요 함수 상세 분석](#4-주요-함수-상세-분석)
5. [영수증 포맷 구조](#5-영수증-포맷-구조)
6. [바코드 및 QR 코드](#6-바코드-및-qr-코드)
7. [에러 처리](#7-에러-처리)
8. [마이그레이션 고려사항](#8-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

OPOS(OLE for Retail POS) 프린터를 제어하여 다양한 형태의 영수증, 주문서, 리포트를 출력하는 모듈입니다.

### 1.2 주요 역할

- **영수증 출력**: 판매 영수증, 반품 영수증, 재발행 영수증
- **주문서 출력**: 키오스크 주문서, 주방 출력물
- **리포트 출력**: 마감 리포트, 판매 내역, 회원 정보
- **바코드/QR 출력**: 전표번호 바코드, 모바일 쿠폰 QR
- **텍스트 포맷팅**: 42컬럼 기준 정렬, 폰트 크기 제어

### 1.3 함수 개수

총 **63개**의 Public 함수가 정의되어 있으며, 크게 다음과 같이 분류됩니다:

| 카테고리        | 함수 수 | 예시                                                  |
| --------------- | ------- | ----------------------------------------------------- |
| **기본 영수증** | 10개    | Print_Title, Print_Header, Print_Detail               |
| **결제 관련**   | 8개     | Print_Card, Print_AppCash, Print_AppCashBag           |
| **주문 관련**   | 7개     | Bill_OrderPrint, Bill_kitchenPrint, Orderchk          |
| **반품/취소**   | 6개     | BillReturn_Print, Trans_Cancel_Print, CancelAll_Print |
| **리포트**      | 12개    | Magam_Print, Sale_DD_Print, INOUT_ListPrint           |
| **회원/포인트** | 8개     | Print_Member, MEM_Misu_Print, Point_Print             |
| **기타**        | 12개    | Print_Barcode, Tag_Print, CDP_MEG                     |

---

## 2. 전역 변수 및 상수

### 2.1 전역 변수

```vb
Public sTranEachData() As String   ' 거래 리스트 개별 데이터
Public lTranEachNum As Long        ' 거래 리스트 개별 아이템 개수

Public sTranTotalData() As String  ' 거래 리스트 합계 데이터
Public lTranTotalNum As Long       ' 거래 리스트 합계 줄 개수
Public lTranPrintTotalNum As Long  ' 거래 리스트 합계 아이템 개수

Public lTransSeq As Long           ' 거래 판매 순번
Public g_iFormGubun As Integer     ' 폼 호출시 구분 0:SaleMain, 1:SaleList
Public g_bFormClose As Boolean     ' 폼 닫 기능유무 0:닫지않음 1:닫음

Public sCustomer_Gubun As String   ' 회원 적립 구분
```

**용도**:

- 프린터 출력 버퍼 관리
- 거래 데이터 임시 저장
- 출력 상태 추적

---

## 3. 함수 목록

### 3.1 핵심 함수 분류 (10개 선별)

| 함수명               | 라인수 | 역할                          | 중요도 |
| -------------------- | ------ | ----------------------------- | ------ |
| **Bill_Print**       | ~600줄 | 판매 영수증 출력 (메인)       | ★★★★★  |
| **BillReturn_Print** | ~300줄 | 반품 영수증 출력              | ★★★★★  |
| **Print_Detail**     | ~430줄 | 상품 상세 출력 (DC 로직 포함) | ★★★★★  |
| **Bill_OrderPrint**  | ~70줄  | 키오스크 주문서 출력          | ★★★★   |
| **Print_Card**       | ~170줄 | 카드 승인 정보 출력           | ★★★★   |
| **Magam_Print**      | ~370줄 | 마감 리포트 출력              | ★★★    |
| **Print_Barcode**    | ~85줄  | 바코드 출력                   | ★★★    |
| **Print_Member**     | ~150줄 | 회원 정보 출력                | ★★★    |
| **Print_Total**      | ~155줄 | 합계 금액 출력                | ★★★★   |
| **CDP_MEG**          | ~110줄 | 고객 디스플레이 메시지        | ★★     |

---

## 4. 주요 함수 상세 분석

### 4.1 Print_Title (타이틀 출력)

**시그니처**:

```vb
Public Sub Print_Title(ByVal F_Num As Integer)
```

**역할**:
영수증 종류에 따라 타이틀을 출력합니다.

**파라미터**:

- `F_Num`: 영수증 타입 (0~33)

**주요 타이틀 타입**:

```vb
Case 0:  "<영    수    증>"
Case 1:  "<현금 영수 증표>"
Case 2:  "<거래 영표 재발행>"
Case 8:  "<상품권>" (설정값으로 변경 가능)
Case 13: "-<<카드 승인 내역>>-"
Case 30: "<주  문  서>" 또는 "*포장주문서*"
Case 33: "<현금환불증>" (6.0.1)
```

**출력 형식**:

```vb
sPrintData = Prn_Align(1) & Prn_FontSize(40)  ' 중앙정렬, 40폰트
sPrintData = sPrintData & "<영    수    증>"
Call PosPrinterPrintText(sPrintData & vbCr)
```

**영어 지원**:

```vb
If C_Config.ENG_YN = "1" Then
    sPrintData = sPrintData & "<R E C E I P T>"
Else
    sPrintData = sPrintData & "<영    수    증>"
End If
```

---

### 4.2 Print_Detail (상품 상세 출력)

**시그니처**:

```vb
Public Sub Print_Detail(PrintLine As Integer)
```

**역할**:
판매 상품 목록을 출력하며, DC(할인) 로직을 포함합니다.

**파라미터**:

- `PrintLine`: 0=1라인, 1=2라인 (바코드 포함)

**출력 형식 (42컬럼 기준)**:

```
------------------------------------------
품 명                 단가   수량     금액
------------------------------------------
*사과                1,000      2    2,000
   [할인금액]          500      2    1,000
------------------------------------------
```

**핵심 로직**:

1. **부가세 마킹**:

```vb
If .TextMatrix(i, 4) = "0" Then
    VAT_Mark = "*"  ' 과세상품
ElseIf .TextMatrix(i, 4) = "1" Then
    VAT_Mark = ""   ' 면세상품
End If
```

2. **할인 표시 방식** (4가지 옵션):

```vb
' S_Config.Sale_View 설정값
' 0: 원가/할인가 모두 표시
' 1: 할인가만 표시
' 2: 할인금액 별도 표시
' 3: 할인율 표시
' 4: 할인적용가만 표시
```

3. **저울 상품 처리**:

```vb
If .TextMatrix(i, 46) = "1" Then  ' 저울상품
    If C_Config.wSclae_Danwi_Print_YN = "1" Then
        Product.Cnt = Product.Cnt & "g"
    End If
End If
```

4. **컬럼 길이 조정**:

```vb
If C_Config.Price_11_YN = "1" Then
    Cut1 = 10: Cut2 = 10  ' 11자리 금액
    Cut_Qty = 7
Else
    Cut1 = 7: Cut2 = 9
    Cut_Qty = 5
End If
```

---

### 4.3 Bill_Print (메인 영수증 출력)

**시그니처**:

```vb
Public Sub Bill_Print(ByVal M1 As String, ByVal M2 As String,
                      pjeonpyo As String, Optional StoPrint As Integer = 0)
```

**역할**:
전체 영수증을 출력하는 메인 함수입니다.

**파라미터**:

- `M1`: 날짜 (YYYY-MM-DD)
- `M2`: 시간 (HH:MM:SS)
- `pjeonpyo`: 전표번호
- `StoPrint`: 0=일반, 1=간이영수증

**출력 순서**:

```
1. Print_Title(0)              → "<영수증>"
2. Print_Header(M1, M2)        → 점포명, 사업자번호, 주소
3. Print_Jeonpyo(pjeonpyo)     → 전표번호
4. Print_Detail(PrintLine)     → 상품 목록
5. Print_VAT(dc1, dc2, eDC)    → 부가세 정보
6. Print_Total()               → 합계 금액
7. 결제수단 출력               → 카드/현금/상품권
8. Print_Member(...)           → 회원 정보
9. Print_Barcode(pjeonpyo)     → 전표번호 바코드
10. Print_Buttom()             → 하단 메시지
11. 용지 자르기                → PosPrinterCutPaper(100)
```

**결제수단 출력 예시**:

```vb
' 카드 결제
If CCur(Frm_SaleMain.lbl_ToCard.Caption) <> 0 Then
    Call PosPrinterPrintText("카 드:" & Format(...) & vbCr)
End If

' 현금 결제
If CCur(Frm_SaleMain.lbl_ToCash.Caption) <> 0 Then
    Call PosPrinterPrintText("현 금:" & Format(...) & vbCr)
End If

' 상품권
If Product.Gift <> 0 Then
    Call PosPrinterPrintText("상품권:" & Format(...) & vbCr)
End If
```

**중요 플래그**:

```vb
If S_Config.Print_1 = 1 Then  ' 영수증 출력 설정
    ' 출력 진행
End If

If S_Config.Print_Cut = 1 Then  ' 자동 컷팅 설정
    Call PosPrinterCutPaper(100)
End If
```

---

### 4.4 Bill_OrderPrint (주문서 출력)

**시그니처**:

```vb
Public Sub Bill_OrderPrint(pjeonpyo As String, sOrderNum As String)
```

**역할**:
키오스크 주문서를 출력합니다.

**출력 형식**:

```
        *포장주문서*      (또는 <주문서>)
        ===============================
        매장명: 천도시스템
        주문번호: 001
        주문시간: 2026-01-29 14:30
        ===============================
        [상품 목록]
        김치찌개 x 1
        공기밥 x 2
        ===============================
        합계: 15,000원
        ===============================
```

**주방 출력 연동**:

```vb
Private Sub Bill_kitchenPrint(pjeonpyo As String, sOrderNum As String)
    ' 주방 프린터로 동일 내용 출력
    ' Terminal.Kitchen_Print_YN = "1" 일 때
End Sub
```

---

### 4.5 Print_Barcode (바코드 출력)

**시그니처**:

```vb
Public Sub Print_Barcode(ByVal M1 As String)
```

**역할**:
전표번호를 바코드로 출력합니다.

**바코드 형식**:

```vb
' OPOS 바코드 명령어
sPrintData = Chr(27) + "|1B" + M1  ' 1D 바코드 (Code 128)
Call PosPrinterPrintText(sPrintData)
```

**바코드 타입**:

- `|1B`: Code 128 (기본)
- `|2B`: Code 39
- `|3B`: EAN-13

**출력 조건**:

```vb
If S_Config.Barcode_Print = 1 Then
    Call Print_Barcode(JeonPyo)
End If
```

---

### 4.6 Print_Card (카드 승인 정보)

**시그니처**:

```vb
Public Sub Print_Card(JeonPyo As String, M1 As String, M2 As String,
                      M3 As String, M4 As String, M5 As String, ...)
```

**역할**:
카드 승인 내역을 출력합니다.

**출력 정보**:

```
------------------------------------------
카드사: 신한카드
카드번호: 1234-****-****-5678
승인번호: 12345678
승인금액: 25,000원
승인일시: 2026-01-29 14:30
가맹점번호: 123456789
------------------------------------------
```

**파라미터**:

- `M1`: 카드사명
- `M2`: 카드번호
- `M3`: 승인번호
- `M4`: 승인금액
- `M5`: 가맹점번호

---

### 4.7 Magam_Print (마감 리포트)

**시그니처**:

```vb
Public Sub Magam_Print(Total_Str As String, Card_Str As String,
                       Cash_Str As String, Gift_Data As Variant, ...)
```

**역할**:
일일 마감 리포트를 출력합니다.

**출력 항목**:

```
===========================================
           일일 마감 리포트
===========================================
영업일자: 2026-01-29
마감시간: 23:59
-------------------------------------------
[판매 내역]
총 판매건수: 120건
총 판매금액: 1,200,000원

[결제수단별]
카드 결제: 800,000원 (80건)
현금 결제: 300,000원 (30건)
상품권: 100,000원 (10건)

[부가세]
과세금액: 1,000,000원
면세금액: 200,000원
부가세: 100,000원

[할인]
총 할인액: 50,000원
-------------------------------------------
담당자: 홍길동
===========================================
```

---

### 4.8 BillReturn_Print (반품 영수증)

**시그니처**:

```vb
Public Sub BillReturn_Print(pjeonpyo As String, DBCC As Connection,
                            VS_List As VSFlexGrid,
                            VS_List_Detail As VSFlexGrid,
                            BE_TPOINT As Currency)
```

**역할**:
반품 처리 시 반품 영수증을 출력합니다.

**출력 형식**:

```
        <반품 영수증>
        ===============================
        원 전표번호: 20260129001
        반품일시: 2026-01-29 15:30
        ===============================
        [반품 상품]
        사과 x 2      -2,000원
        ===============================
        반품 합계: -2,000원
        ===============================
        환불 방법: 신용카드
        환불 금액: 2,000원
        ===============================
```

**DB 연동**:

```vb
SQL = "SELECT * FROM sales_detail WHERE jeonpyo = '" & pjeonpyo & "'"
Set rs = DBCC.Execute(SQL)
```

---

### 4.9 Print_Total (합계 출력)

**시그니처**:

```vb
Public Sub Print_Total()
```

**역할**:
영수증 하단에 합계 금액을 출력합니다.

**출력 형식**:

```vb
' 할인 표시
If .lbl_ToDC.Caption <> 0 Then
    Call PosPrinterPrintText("D/C:" & Format(...) & vbCr)
End If

' 합계
Call PosPrinterPrintText("Total:" & Format(...) & vbCr)

' 상품권 할인
If Product.TO_GifePrice <> 0 Then
    Call PosPrinterPrintText("Gift:" & Format(...) & vbCr)
End If

' 받은 금액
Call PosPrinterPrintText("받은금액:" & Format(...) & vbCr)

' 거스름돈
Call PosPrinterPrintText("거스름돈:" & Format(...) & vbCr)
```

---

### 4.10 CDP_MEG (고객 디스플레이)

**시그니저**:

```vb
Public Sub CDP_MEG()
```

**역할**:
고객용 폴(Customer Display Pole)에 환영 메시지를 표시합니다.

**출력 형식**:

```vb
' VFD 제어 명령어
sPrintData = Chr(27) + Chr(27) + "LS" + S_Config.CDP_Msg1
Call VFDPrinterPrintText(sPrintData)

sPrintData = Chr(27) + Chr(27) + "LS" + S_Config.CDP_Msg2
Call VFDPrinterPrintText(sPrintData)
```

**활용**:

- 환영 메시지 표시
- 상품 가격 표시
- 합계 금액 표시

---

## 5. 영수증 포맷 구조

### 5.1 기본 레이아웃 (42컬럼)

```
┌──────────────────────────────────────────┐
│         <영    수    증>                  │ ← Print_Title
├──────────────────────────────────────────┤
│ 천도시스템                                │
│ 사업자번호: 123-45-67890                  │ ← Print_Header
│ 주소: 서울시 강남구                       │
│ 대표: 홍길동     전화번호: 02-1234-5678   │
│                                          │
│ POS:01    판매: 김철수                    │
│ 일 시:2026-01-29    14:30:15             │
├──────────────────────────────────────────┤
│ 전표번호:20260129001                      │ ← Print_Jeonpyo
├──────────────────────────────────────────┤
│ 품 명                 단가   수량     금액 │
├──────────────────────────────────────────┤
│ *사과                1,000      2    2,000│ ← Print_Detail
│ 바나나               1,500      1    1,500│
│    [할인금액]          500      2    1,000│
├──────────────────────────────────────────┤
│ 과세금액:                          2,500│ ← Print_VAT
│ 부가세:                              250│
├──────────────────────────────────────────┤
│ D/C:                                1,000│ ← Print_Total
│ Total:                              2,500│
│ 카 드:                              2,500│
├──────────────────────────────────────────┤
│ 회원명: 홍길동                            │ ← Print_Member
│ 회원번호: 1234567890                      │
│ 적립포인트: 250P                          │
├──────────────────────────────────────────┤
│     |||||||||||||||||||||||||||||||      │ ← Print_Barcode
│     20260129001                          │
├──────────────────────────────────────────┤
│ 감사합니다. 또 방문해 주세요.             │ ← Print_Buttom
└──────────────────────────────────────────┘
```

### 5.2 정렬 함수

```vb
' Prn_Align (Mdl_OPOS_Function.bas에 정의됨)
Prn_Align(0)  → 왼쪽 정렬
Prn_Align(1)  → 중앙 정렬
Prn_Align(2)  → 오른쪽 정렬

' Prn_FontSize
Prn_FontSize(0)   → 기본 크기
Prn_FontSize(20)  → 2배 크기
Prn_FontSize(40)  → 4배 크기
```

### 5.3 문자열 자르기

```vb
' mfun.STr_Cut (Mdl_Function.bas)
Product.name = mfun.STr_Cut("긴상품명", 18)  ' 18바이트로 자르기

' LenB를 사용한 정확한 길이 계산
LenB(StrConv(Product.name, vbFromUnicode))
```

---

## 6. 바코드 및 QR 코드

### 6.1 바코드 출력 (Code 128)

```vb
Public Sub Print_Barcode(ByVal M1 As String)
    Dim sPrintData As String

    ' 중앙 정렬
    sPrintData = Prn_Align(1)

    ' 바코드 출력 (OPOS ESC/POS 명령)
    sPrintData = sPrintData & Chr(27) + "|1B" + M1

    Call PosPrinterPrintText(sPrintData & vbCr)

    ' 바코드 하단에 텍스트 출력
    sPrintData = Prn_Align(1) & M1
    Call PosPrinterPrintText(sPrintData & vbCr)
End Sub
```

**OPOS 바코드 명령어**:

```
Chr(27) + "|1B" + 데이터  → Code 128
Chr(27) + "|2B" + 데이터  → Code 39
Chr(27) + "|3B" + 데이터  → EAN-13
```

### 6.2 QR 코드 출력

QR 코드는 카카오페이 연동 시 사용됩니다:

```vb
' QR 코드 생성 (MDI_Kakao.bas 참조)
' 실제 출력은 별도 모듈에서 처리
```

---

## 7. 에러 처리

### 7.1 공통 에러 처리 패턴

모든 함수에 다음 패턴이 적용됩니다:

```vb
Public Sub Print_Title(ByVal F_Num As Integer)
On Error GoTo err
    ' 함수 본문
    Exit Sub
err:
    MsgBox "[오류코드] : " & err.Number & Chr(13) & _
           "[오류내용] : " & err.Description
End Sub
```

### 7.2 프린터 에러 처리

```vb
' PosPrinterPrintText 함수 내부 (Mdl_OPOS_Function.bas)
If Terminal.PrinterGubun = 0 Then  ' OPOS
    If OPosPrint.Claimed = False Then
        MsgBox "프린터가 연결되지 않았습니다."
        Exit Function
    End If
End If
```

### 7.3 주요 에러 케이스

| 에러 코드   | 원인               | 해결 방법        |
| ----------- | ------------------ | ---------------- |
| -2147467259 | 프린터 연결 끊김   | 프린터 재연결    |
| 13          | 타입 불일치        | 데이터 형식 확인 |
| 9           | 배열 범위 초과     | 배열 크기 확인   |
| 5           | 프로시저 호출 오류 | 파라미터 확인    |

---

## 8. 마이그레이션 고려사항

### 8.1 OPOS → ESC/POS 전환

**현재 (VB6 + OPOS)**:

```vb
' OPOS 객체 사용
Set OPosPrint = New OPOSPOSPrinter
OPosPrint.Open "DeviceName"
OPosPrint.ClaimDevice 1000
OPosPrint.DeviceEnabled = True
OPosPrint.PrintNormal PTR_S_RECEIPT, "Hello"
```

**마이그레이션 (Node.js + ESC/POS)**:

```javascript
// ESC/POS 직접 제어
const escpos = require("escpos");
const device = new escpos.USB();
const printer = new escpos.Printer(device);

device.open(function () {
  printer.font("a").align("ct").size(2, 2).text("영수증").cut().close();
});
```

### 8.2 웹 브라우저 프린터 API

**Web Bluetooth 프린터**:

```javascript
// Bluetooth 프린터 연결
async function connectPrinter() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
  const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");

  // ESC/POS 명령어 전송
  const encoder = new TextEncoder();
  await characteristic.writeValue(encoder.encode("\x1b\x40")); // 초기화
  await characteristic.writeValue(encoder.encode("Hello\n"));
}
```

### 8.3 영수증 템플릿 엔진

**VB6 방식** (하드코딩):

```vb
sPrintData = "품 명" & Space(18 - LenB(StrConv("품 명", vbFromUnicode)))
sPrintData = sPrintData & "단가" & Space(7 - LenB(StrConv("단가", vbFromUnicode)))
```

**현대적 방식** (템플릿 엔진):

```javascript
// Handlebars 템플릿
const template = `
{{#align 'center'}}
{{#fontSize 2}}
<영수증>
{{/fontSize}}
{{/align}}

{{#align 'left'}}
{{storeName}}
사업자번호: {{bizNo}}
{{/align}}

{{#each products}}
{{name}}  {{qty}} x {{price}} = {{total}}
{{/each}}

합계: {{totalAmount}}
`;

const data = {
  storeName: "천도시스템",
  bizNo: "123-45-67890",
  products: [
    { name: "사과", qty: 2, price: 1000, total: 2000 },
    { name: "바나나", qty: 1, price: 1500, total: 1500 },
  ],
  totalAmount: 3500,
};

const receipt = Handlebars.compile(template)(data);
printer.print(receipt);
```

### 8.4 바코드/QR 생성

**VB6 OPOS**:

```vb
sPrintData = Chr(27) + "|1B" + "20260129001"  ' Code 128
```

**Node.js**:

```javascript
// JsBarcode 라이브러리
const JsBarcode = require("jsbarcode");
const { createCanvas } = require("canvas");

const canvas = createCanvas();
JsBarcode(canvas, "20260129001", {
  format: "CODE128",
  width: 2,
  height: 50,
});

// Canvas를 ESC/POS 비트맵으로 변환
const bitmap = canvasToBitmap(canvas);
printer.image(bitmap);
```

**QR 코드**:

```javascript
const QRCode = require("qrcode");

// QR 생성
const qrData = await QRCode.toDataURL("20260129001");

// ESC/POS QR 명령
printer.qrcode("20260129001", "H", 8);
```

### 8.5 영수증 미리보기 (웹)

**React 컴포넌트**:

```jsx
import React from "react";
import "./Receipt.css";

function ReceiptPreview({ data }) {
  return (
    <div className="receipt-paper">
      <div className="receipt-header">
        <h2>{data.storeName}</h2>
        <p>사업자번호: {data.bizNo}</p>
        <p>{data.address}</p>
      </div>

      <div className="receipt-items">
        {data.products.map((item, idx) => (
          <div key={idx} className="receipt-item">
            <span>{item.name}</span>
            <span>
              {item.qty} x {item.price}
            </span>
            <span>{item.total}</span>
          </div>
        ))}
      </div>

      <div className="receipt-total">
        <strong>합계: {data.totalAmount}원</strong>
      </div>

      <Barcode value={data.billNo} />
    </div>
  );
}

export default ReceiptPreview;
```

**CSS (영수증 스타일)**:

```css
.receipt-paper {
  width: 302px; /* 80mm */
  font-family: "Courier New", monospace;
  font-size: 12px;
  padding: 10px;
  background: white;
  border: 1px solid #ccc;
}

.receipt-header {
  text-align: center;
  border-bottom: 1px dashed #000;
  padding-bottom: 10px;
}

.receipt-item {
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
}
```

### 8.6 클라우드 프린팅

**Google Cloud Print (대체 솔루션)**:

```javascript
// PrintNode API
const PrintNode = require("printnode");

const client = new PrintNode.HTTP(new PrintNode.HTTP.ApiKey("YOUR_API_KEY"));

// 프린터 목록 조회
const printers = await client.printers();

// 인쇄 작업 생성
await client.createPrintJob(printers[0].id, {
  title: "영수증",
  contentType: "pdf_base64",
  content: pdfBase64,
  source: "KIOSK",
});
```

### 8.7 함수 매핑표

| VB6 함수                | 현대 스택             | 비고                   |
| ----------------------- | --------------------- | ---------------------- |
| **Bill_Print**          | printReceipt(data)    | 템플릿 엔진 사용       |
| **Print_Barcode**       | barcodeLib.generate() | JsBarcode, node-qrcode |
| **Print_Detail**        | renderProductList()   | React 컴포넌트         |
| **Print_Card**          | printCardApproval()   | API 응답 → 템플릿      |
| **Magam_Print**         | generateDailyReport() | PDF 생성 가능          |
| **PosPrinterPrintText** | printer.text()        | ESC/POS 라이브러리     |
| **PosPrinterCutPaper**  | printer.cut()         | ESC/POS 명령           |

### 8.8 권장 아키텍처

```
┌─────────────┐
│  키오스크    │ (React/Vue)
│  웹앱        │
└──────┬──────┘
       │ HTTP/WebSocket
       ↓
┌─────────────┐
│  프린트     │ (Node.js)
│  서버       │
└──────┬──────┘
       │ USB/Bluetooth/Network
       ↓
┌─────────────┐
│  ESC/POS    │ (80mm 프린터)
│  프린터     │
└─────────────┘
```

**프린트 서버 API**:

```javascript
// Express 서버
app.post("/print/receipt", async (req, res) => {
  const { billNo, products, totalAmount } = req.body;

  try {
    const template = loadTemplate("receipt.hbs");
    const receipt = template(req.body);

    await printer.print(receipt);
    await printer.cut();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 9. 결론

Mdl_Printer.bas는 POSON POS 시스템의 **핵심 출력 모듈**로, 다음과 같은 특징이 있습니다:

1. **복잡한 로직**: 63개의 함수, 할인 처리, 부가세 계산 등
2. **다양한 출력**: 영수증, 주문서, 리포트, 바코드
3. **OPOS 의존성**: OPOS 프린터 드라이버에 강하게 의존
4. **하드코딩된 포맷**: 42컬럼 기준, 문자열 조작

마이그레이션 시 **템플릿 엔진 + ESC/POS 직접 제어** 방식으로 전환하여 유지보수성을 크게 개선할 수 있습니다.

**다음 분석 파일**: [MDI_Kakao.bas.md](./MDI_Kakao.bas.md)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
