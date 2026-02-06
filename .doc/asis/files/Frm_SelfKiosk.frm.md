# Frm_SelfKiosk.frm 파일 분석

**파일 경로**: `prev_kiosk/POSON_POS_SELF21/Frm_SelfKiosk.frm`
**파일 크기**: ~4,700 lines
**역할**: 키오스크 메인 UI 폼 (Self-Service Kiosk Main Screen)
**분석일**: 2026-01-29

---

## 목차

1. [파일 개요](#1-파일-개요)
2. [UI 컨트롤 구조](#2-ui-컨트롤-구조)
3. [주요 함수 목록](#3-주요-함수-목록)
4. [이벤트 핸들러 분석](#4-이벤트-핸들러-분석)
5. [상태 관리 및 데이터 플로우](#5-상태-관리-및-데이터-플로우)
6. [타이머 및 자동화 로직](#6-타이머-및-자동화-로직)
7. [다른 Form과의 연동](#7-다른-form과의-연동)
8. [호출 관계](#8-호출-관계)
9. [마이그레이션 고려사항](#9-마이그레이션-고려사항)

---

## 1. 파일 개요

### 1.1 목적

POSON 키오스크 시스템의 메인 화면으로, 고객이 직접 상품을 선택하고 주문하는 핵심 UI를 제공합니다.

### 1.2 주요 역할

- **상품 카탈로그 표시**: 카테고리별 상품 그리드 뷰 (12개 아이템/페이지)
- **탭 메뉴 관리**: 최대 4개의 카테고리 탭 + 좌우 스크롤
- **주문 카트 관리**: VSFlexGrid를 사용한 주문 목록 표시
- **바코드 스캔 지원**: 스캐너 입력 처리
- **옵션 상품 처리**: 토핑, 사이즈 등 옵션 상품 관리
- **관리자 모드**: 더블클릭으로 진입 가능한 관리 패널

### 1.3 폼 특성

```vb
Begin VB.Form Frm_SelfKiosk
    BorderStyle     =   0  '없음 (전체화면)
    ClientHeight    =   28800
    ClientWidth     =   16200
    KeyPreview      =   -1  'True (키보드 이벤트 가로채기)
    ShowInTaskbar   =   0   'False (작업표시줄 숨김)
End
```

**키오스크 전용 설정**:

- 전체화면 모드 (BorderStyle = 0)
- 키보드 ESC 키로 프로그램 종료
- 작업표시줄에서 숨김
- 매우 큰 해상도 (16200 x 28800 twips ≈ 1080x1920 세로형 모니터)

---

## 2. UI 컨트롤 구조

### 2.1 레이아웃 구조

```
┌─────────────────────────────────────────────┐
│ imgStartPage (시작 화면)                     │  ← 초기 대기 화면
│    - "화면을 터치하세요"                      │
│    - imgStartDir (클릭 영역)                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Frame1 (메인 프레임)                         │
├─────────────────────────────────────────────┤
│ FrmTab (탭 영역) - Height: 1725              │
│  ┌────┬────┬────┬────┐                      │
│  │탭0 │탭1 │탭2 │탭3 │ [<] [>]             │
│  └────┴────┴────┴────┘                      │
│  - labSelfTab(0~3): MyLabel                 │
│  - imgSelfTabUP/Down: 탭 버튼 이미지         │
│  - imgleftTab, imgRightTab: 좌우 스크롤      │
├─────────────────────────────────────────────┤
│ FramTop (상품 그리드) - Height: 18270        │
│  ┌───────┬───────┬───────┬───────┐          │
│  │ 상품1 │ 상품2 │ 상품3 │ 상품4 │          │
│  │[이미지]│[이미지]│[이미지]│[이미지]│          │
│  │ 가격1 │ 가격2 │ 가격3 │ 가격4 │          │
│  ├───────┼───────┼───────┼───────┤          │
│  │ 상품5 │ 상품6 │ 상품7 │ 상품8 │          │
│  │[이미지]│[이미지]│[이미지]│[이미지]│          │
│  │ 가격5 │ 가격6 │ 가격7 │ 가격8 │          │
│  ├───────┼───────┼───────┼───────┤          │
│  │ 상품9 │상품10 │상품11 │상품12 │          │
│  │[이미지]│[이미지]│[이미지]│[이미지]│          │
│  │ 가격9 │가격10 │가격11 │가격12 │          │
│  └───────┴───────┴───────┴───────┘          │
│  - frmBG(0~11): 상품 프레임                  │
│  - Image1(0~11): 상품 이미지                 │
│  - txtSelfGoods(0~11): 상품명                │
│  - txtSelfPri(0~11): 가격                    │
│  - imgSoldOut(0~11): 품절 오버레이           │
│  - CmdGoodsSet(0~11): 상품설정 (관리자)      │
│  - cmd삭제(0~11): 상품삭제 (관리자)          │
│  - CmdSetOP(0~11): 옵션설정 (관리자)         │
│                                              │
│  [◀ 이전]                         [다음 ▶]  │
│  - imgLeft, imgRight: 페이지 네비게이션      │
├─────────────────────────────────────────────┤
│ framBottom (주문 목록 & 결제) - Height: 6900 │
│  ┌──────────────────────┬────────────────┐  │
│  │ fg21List (주문 목록)   │  총 수량: 3개  │  │
│  │ ┌──────────────────┐ │  총 금액:      │  │
│  │ │ 아메리카노 x2     │ │  15,000원     │  │
│  │ │ [-] 2 [+] [삭제]  │ │                │  │
│  │ │ 카페라떼 x1       │ │ [홈으로]      │  │
│  │ │ [옵션] [삭제]     │ │                │  │
│  │ └──────────────────┘ │ [결제하기]    │  │
│  │                       │                │  │
│  └──────────────────────┴────────────────┘  │
│  - fg21List: VSFlexGrid (20 columns)         │
│  - labTotalCnt: 총 수량                      │
│  - labTotalPri: 총 금액                      │
│  - imgHome: 처음으로 버튼                    │
│  - img결제: 결제하기 버튼                    │
│  - labHiddenOrder: "주문 상품이 없습니다"    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ pic관리자 (관리자 모드) - Visible: False     │
│  [상품선택] [상품추가] [판매가격] [판매메뉴] │
│  [주문상품] [주문분류] [주문취소] [원격지원] │
│  [판매내역] [현금반환] [프로그램닫기]        │
│  - lab상품선택, labGoodsAdd, labSlefPrice    │
│  - labSaleMenu, lab주문상품, lab주문분류     │
│  - lab주문취소, lab원격지원, lab판매내역     │
│  - lab현금, lab프로그램닫기, lab현금반환     │
└─────────────────────────────────────────────┘
```

### 2.2 주요 컨트롤 목록

#### 2.2.1 상품 디스플레이 (컨트롤 배열: 0~11)

| 컨트롤명                 | 타입    | 역할                         |
| ------------------------ | ------- | ---------------------------- |
| **frmBG(0~11)**          | Frame   | 상품 카드 배경 프레임        |
| **Image1(0~11)**         | Image   | 상품 이미지 (3750x3750)      |
| **txtSelfGoods(0~11)**   | TextBox | 상품명 (MultiLine, Disabled) |
| **txtSelfPri(0~11)**     | MyText  | 가격 표시 (예: "4,500원")    |
| **labSelfID(0~11)**      | Label   | 상품 ID (숨김)               |
| **labSelfBarcode(0~11)** | Label   | 바코드 (숨김)                |
| **imgSoldOut(0~11)**     | Image   | 품절 오버레이                |
| **imgbg(0~11)**          | Image   | 클릭 효과 배경               |

#### 2.2.2 탭 메뉴 (컨트롤 배열: 0~3)

| 컨트롤명                | 타입       | 역할                                   |
| ----------------------- | ---------- | -------------------------------------- |
| **labSelfTab(0~3)**     | MyLabel    | 탭 라벨 (예: "커피", "음료", "디저트") |
| **imgSelfTabUP(0~3)**   | PictureBox | 선택된 탭 이미지                       |
| **imgSelfTabDown(0~3)** | PictureBox | 선택 안된 탭 이미지                    |
| **imgleftTab**          | PictureBox | 왼쪽 스크롤 버튼                       |
| **imgRightTab**         | PictureBox | 오른쪽 스크롤 버튼                     |

#### 2.2.3 주문 목록 (VSFlexGrid)

```vb
fg21List (VSFlexGrid)
- Rows: 50 (초기)
- Cols: 20
- RowHeightMin: 930
- FontSize: 16, Bold

컬럼 구조:
[0]  체크      (250)
[1]  바코드    (1005, Hidden)
[2]  상품명    (4800) ← 주요 표시
[3]  금액      (1005, Hidden)
[4]  공백      (60)
[5]  감소버튼  (570) [−] 아이콘
[6]  수량      (825)
[7]  공백      (15)
[8]  증가버튼  (750) [+] 아이콘
[9]  할인합계  (1005, Hidden)
[10] 상품합계  (1650) ← 주요 표시
[11] 공백      (525)
[12] 삭제버튼  (1500) [×] 아이콘
[13] 상품ID    (Hidden)
[14] 옵션구분  (Hidden)
[15] 공백      (15)
[16] 옵션버튼  (1005) [옵션] 아이콘
[17] 옵션여부  (Hidden)
[18] 옵션바코드문자열 (Hidden)
[19] 원판매상품금액 (Hidden)
```

#### 2.2.4 하단 버튼

| 컨트롤명           | 타입       | 역할                          |
| ------------------ | ---------- | ----------------------------- |
| **labTotalCnt**    | MyLabel    | 총 수량 표시 (예: "5개")      |
| **labTotalPri**    | MyLabel    | 총 금액 표시 (예: "25,000원") |
| **imgHome**        | Image      | 처음으로 버튼                 |
| **img결제**        | Image      | 결제하기 버튼                 |
| **labHiddenOrder** | PictureBox | 빈 카트 메시지                |

#### 2.2.5 관리자 모드 (pic관리자)

```vb
pic관리자.Visible = False  ' 기본 숨김
lab관리자화면.DblClick → 비밀번호 입력 → pic관리자.Visible = True

관리 기능:
- lab상품선택: 상품 클릭하여 선택
- labGoodsAdd: 신규 상품 추가
- labSlefPrice: 가격표 출력
- labSaleMenu: POS 메뉴
- lab주문상품: 상품 등록
- lab주문분류: 탭 메뉴 설정
- lab주문취소: 주문 취소
- lab원격지원: 원격 지원 연결
- lab판매내역: 판매 내역 조회
- lab프로그램닫기: 프로그램 종료
- lab관리자닫기: 관리자 모드 종료
- lab현금반환: 현금 반환
```

### 2.3 숨김 컨트롤 (데이터 저장용)

```vb
labTabCode        ' 현재 선택된 탭 코드 (예: "T001")
labTabName        ' 현재 선택된 탭 이름 (예: "커피")
labGroupID        ' 상품 그룹 ID
FTabIndex         ' 탭 페이지 인덱스 (0, 1, 2...)
labPageIndex      ' 상품 페이지 번호 (1, 2, 3...)
labPageIndexS     ' 현재 페이지 시작 Index_Num
labPageIndexE     ' 현재 페이지 끝 Index_Num
labTest           ' 관리자 모드 토글 ("ON"/"OFF")
txt_Input         ' 바코드 스캐너 입력 (Left: -11000, 화면 밖)
```

---

## 3. 주요 함수 목록

### 3.1 초기화 함수

| 함수명           | 역할                           | 호출 시점        |
| ---------------- | ------------------------------ | ---------------- |
| **Form_Load**    | 폼 로드 시 초기 설정           | 폼 생성          |
| **Grid_Set**     | VSFlexGrid 초기화              | Form_Load        |
| **initAll**      | 전체 초기화 (탭 + 상품)        | Form_Load        |
| **initTab**      | 탭 메뉴 초기화                 | initAll          |
| **InitGoods**    | 상품 목록 초기화               | initAll, 탭 클릭 |
| **initmain**     | 메인 화면 초기화 (카트 비우기) | 홈 버튼          |
| **GoddsInfoIni** | 상품 정보 초기화               | 탭 클릭          |

### 3.2 상품 관리 함수

| 함수명             | 파라미터        | 반환 | 역할                           |
| ------------------ | --------------- | ---- | ------------------------------ |
| **ShowSelfDetail** | sSql: String    | void | SQL 결과로 상품 그리드 표시    |
| **GoodsReFlesh**   | sMove: String   | void | 다음/이전 페이지 상품 새로고침 |
| **subPageNext**    | -               | void | 다음 페이지로 이동             |
| **subPageBack**    | -               | void | 이전 페이지로 이동             |
| **MoveTabMenu**    | sIndex: Integer | void | 탭 스크롤 (0, 1, 2...)         |

### 3.3 주문 관리 함수

| 함수명           | 파라미터         | 반환 | 역할                       |
| ---------------- | ---------------- | ---- | -------------------------- |
| **addGoods**     | Index: Integer   | void | 상품 클릭 시 장바구니 추가 |
| **AddGoodsList** | Index: Integer   | void | 상품 추가 (옵션 체크 포함) |
| **addBarcode**   | sbarcode: String | void | 바코드 스캔으로 상품 추가  |
| **beforGoods**   | -                | void | 이전 주문 복원             |
| **subTotalSum**  | -                | void | 총 수량/금액 계산          |

### 3.4 이벤트 핸들러

| 함수명                      | 트리거           | 역할                          |
| --------------------------- | ---------------- | ----------------------------- |
| **Image1_Click**            | 상품 이미지 클릭 | 장바구니 추가                 |
| **labSelfTab_Click**        | 탭 클릭          | 카테고리 전환                 |
| **fg21List_Click**          | 그리드 클릭      | 수량 증감/삭제/옵션           |
| **img결제\_Click**          | 결제 버튼        | 주문 확정 → Frm_SelfOrderList |
| **imgHome_Click**           | 홈 버튼          | 초기화 + 시작 화면            |
| **lab관리자화면\_DblClick** | 더블클릭         | 관리자 모드 진입              |
| **txt_Input_KeyDown**       | 바코드 입력      | 스캐너 처리                   |

---

## 4. 이벤트 핸들러 분석

### 4.1 Form_Load() - 폼 초기화

**실행 흐름**:

```vb
Private Sub Form_Load()
    ' 1. 시작 이미지 설정
    If C_Config.SelfImg_StargPage <> "" Then
        imgStartDir.Picture = LoadPicture(C_Config.Selfimg_Startimg)
    End If

    ' 2. 레이아웃 설정
    Frame1.Top = 0
    Frame1.Left = 0
    labHiddenOrder.Top = 0
    labHiddenOrder.Left = 0
    imgStartPage.Top = 0

    FrmTab.Height = 1650
    FrmTab.Left = 0
    FrmTab.Top = 2700

    imgBotton.Top = -22320
    imgBotton.Left = 0

    txt_Input.Left = -11000  ' 화면 밖으로 (스캐너 전용)

    ' 3. 그리드 및 데이터 초기화
    Grid_Set
    initAll  ' → initTab → InitGoods

    ' 4. 관리자 모드 초기 상태
    labTest.Caption = "ON"
    labTest_Click  ' 관리 버튼 숨김

    ' 5. 이전 주문 복원
    If sState = "초기" Then
        ' 새 주문
    Else
        beforGoods  ' 이전 주문 목록 복원
    End If

    ' 6. 시작 화면 표시 여부
    If C_Config.SelfImg_StargPage = "0" And sState = "초기" Then
        imgStartPage.Visible = True
    Else
        imgStartPage.Visible = False
    End If

    ' 7. 스캔 모드 설정
    If C_Config.SelfImg_ScanNoUse = "1" Then
        Scan_Type = 8   ' 스캔 사용 안 함
    Else
        Scan_Type = 21  ' 스캔 사용
    End If

    ' 8. 오프라인 모드 표시
    If Connect_Gubun = 2 Then
        laboff.Caption = "서버 OFF"
        laboff.Visible = True
    End If
End Sub
```

**핵심 변수**:

- `kPosNo`: 포스 번호 (Terminal.PosNo)
- `TabCount`: 표시할 탭 개수 (기본 4)
- `MaxGoodsNum`: 한 페이지 상품 개수 (12)
- `sState`: 주문 상태 ("초기" / "복원")

### 4.2 labSelfTab_Click(Index) - 탭 클릭

```vb
Private Sub labSelfTab_Click(Index As Integer)
    Call Product_Sound("터치음.wav")

    ' 1. 탭 인덱스 계산
    id = CCur(FTabIndex.Caption) + Index

    ' 2. 선택된 탭 정보 저장
    labTabCode.Caption = Tabinfo(id).Code   ' 예: "T001"
    labTabName.Caption = labSelfTab(Index).Caption  ' 예: "커피"

    ' 3. 탭 UI 업데이트
    For i = 0 To TabCount - 1
        labSelfTab(i).BackColor = &HA2A2A2  ' 회색
        labSelfTab(i).ForeColor = vbWhite
        imgSelfTabUP(i).Visible = True
    Next i

    imgSelfTabUP(Index).Visible = False
    labSelfTab(Index).ForeColor = vbBlack
    labSelfTab(Index).BackColor = vbWhite  ' 선택된 탭은 흰색

    ' 4. 상품 목록 새로고침
    GoddsInfoIni  ' → labPageIndex = "1" → InitGoods
End Sub
```

**UI 효과**:

```
[커피]   [음료]   [디저트] [빵]
 ▲       ▼        ▼       ▼
흰배경   회색     회색    회색
검정글자  흰글자   흰글자  흰글자
```

### 4.3 Image1_Click(Index) - 상품 클릭

```vb
Private Sub Image1_Click(Index As Integer)
    Call Product_Sound("터치음.wav")

    ' 품절 체크
    If imgSoldOut(Index).Visible = True Then Exit Sub

    ' 상품 추가
    AddGoodsList Index
End Sub

Private Sub AddGoodsList(Index As Integer)
    ' 1. 옵션 상품 여부 확인
    SQL = "SELECT * FROM Group_SelfOP WHERE Self_ID=" & labSelfID(Index).Caption
    Set rs = DBCON.Execute(SQL)

    If rs.RecordCount = 0 Then
        ' 옵션 없음 → 수량만 증가
        With fg21List
            For i = 1 To .rows - 1
                If .TextMatrix(i, 13) = labSelfID(Index).Caption Then
                    tempindex = i
                    Exit For
                End If
            Next i

            If tempindex > 0 Then
                ' 이미 장바구니에 있음 → 수량 +1
                tempCnt = CCur(.TextMatrix(i, 6)) + 1
                .TextMatrix(i, 6) = tempCnt
                .TextMatrix(i, 10) = tempCnt * CCur(.TextMatrix(i, 3))
            Else
                ' 신규 추가
                addGoods Index
            End If
        End With
    Else
        ' 옵션 있음 → 옵션 선택 창 표시
        frm_SelfOpGoods.SetOpGoods labSelfID(Index).Caption, Index, "추가"
        frm_SelfOpGoods.Visible = True
    End If

    ' 2. 총계 갱신
    subTotalSum
End Sub
```

**흐름**:

```
상품 클릭
    ↓
옵션 있음?
    ↓ No
이미 카트에 있음?
    ↓ Yes          ↓ No
수량 +1         신규 추가
    ↓               ↓
총계 갱신 ←────────┘

    ↓ Yes (옵션 있음)
frm_SelfOpGoods 팝업
    ↓
옵션 선택 후 추가
    ↓
총계 갱신
```

### 4.4 fg21List_Click() - 장바구니 그리드 클릭

```vb
Private Sub fg21List_Click()
    With fg21List
        If .Row < 1 Then Exit Sub

        Select Case .Col
        Case 12  ' 삭제버튼
            Call Product_Sound("터치음.wav")
            .RemoveItem .Row
            If .rows = 1 Then labHiddenOrder.Visible = True

        Case 5  ' 감소버튼 [−]
            Call Product_Sound("터치음.wav")
            If .TextMatrix(.Row, 6) = "1" Then Exit Sub
            tempCnt = CCur(.TextMatrix(.Row, 6)) - 1
            .TextMatrix(.Row, 6) = tempCnt
            .TextMatrix(.Row, 10) = tempCnt * CCur(.TextMatrix(.Row, 3))

        Case 8  ' 증가버튼 [+]
            Call Product_Sound("터치음.wav")
            tempCnt = CCur(.TextMatrix(.Row, 6)) + 1
            .TextMatrix(.Row, 6) = tempCnt
            .TextMatrix(.Row, 10) = tempCnt * CCur(.TextMatrix(.Row, 3))

        Case 16  ' 옵션설정
            Call Product_Sound("터치음.wav")
            If .TextMatrix(.Row, 17) <> "" Then
                frm_SelfOpGoods.SetUpdate .TextMatrix(.Row, 13), _
                                          .TextMatrix(.Row, 14), .Row
                frm_SelfOpGoods.Visible = True
            End If
        End Select

        .Select 0, 0
    End With

    subTotalSum  ' 총계 갱신
End Sub
```

**그리드 컬럼 맵**:

```
[5]  [−]  감소
[6]  [3]  수량 표시
[8]  [+]  증가
[10] [15,000원] 합계
[12] [×]  삭제
[16] [옵션] 옵션 수정
```

### 4.5 img결제\_Click() - 주문 확정

```vb
Private Sub lab주문_Click()
    ' 1. 빈 카트 체크
    If fg21List.rows = 1 Then
        Frm_SelfAlarm.setState 4
        Frm_SelfAlarm.Show vbModal
        Exit Sub
    End If

    ' 2. 주문 방법 선택 (포장/매장)
    Frm_SelfOrderList.Top = 0
    Frm_SelfOrderList.Left = 0
    Frm_SelfOrderList.Show vbModal

    ' 3. 주문 데이터 전송
    With fg21List
        If Frm_SelfOrderList.OrderGubun <> "" Then
            ReDim OrderGoods(.rows - 2)

            For i = 1 To .rows - 1
                Cnt = .TextMatrix(i, 6)

                ' Frm_SaleMain으로 바코드 전송
                Frm_SaleMain.SetKioskBarcode .TextMatrix(i, 1), Cnt, ""

                ' 주문 정보 저장
                OrderGoods(i - 1).sID = .TextMatrix(i, 13)
                OrderGoods(i - 1).Cnt = Cnt
                OrderGoods(i - 1).sbarcode = .TextMatrix(i, 1)
                OrderGoods(i - 1).sName = .TextMatrix(i, 2)
                OrderGoods(i - 1).pri = CCur(.TextMatrix(i, 3))

                ' 옵션 상품 처리
                If .TextMatrix(i, 17) = "1" Then
                    OrderGoods(i - 1).sOPBarcods = .TextMatrix(i, 18)
                    OrderGoods(i - 1).sOPID = .TextMatrix(i, 14)
                    OrderGoods(i - 1).sOPYN = "1"

                    ' 옵션 바코드 분리 전송 (예: "OP001,OP002,OP003")
                    sData = Split(.TextMatrix(i, 18), ",")
                    For j = 0 To UBound(sData)
                        Frm_SaleMain.SetKioskBarcode sData(j), Cnt, "1"
                    Next j
                End If

                OrderGoods(i - 1).sMainPri = .TextMatrix(i, 19)
            Next i

            ' 4. 메인 폼으로 전환
            Unload Me
            Frm_SaleMain.frmdelay.Top = 30000
            Frm_SaleMain.selfState 2  ' 결제 진행 상태
        End If
    End With
End Sub
```

**주문 플로우**:

```
[결제하기] 클릭
    ↓
빈 카트 체크
    ↓ OK
Frm_SelfOrderList 팝업
    ↓
[포장] / [매장] 선택
    ↓
장바구니 데이터 → OrderGoods[] 배열
    ↓
Frm_SaleMain.SetKioskBarcode() 호출
    ↓ (메인 상품)
    ↓ (옵션 상품들)
    ↓
Frm_SelfKiosk 종료
    ↓
Frm_SaleMain 표시
    ↓
결제 처리
```

### 4.6 txt_Input_KeyDown() - 바코드 스캐너

```vb
Private Sub txt_Input_KeyDown(KeyCode As Integer, Shift As Integer)
    If KeyCode = 0 Then  ' 스캐너 입력 완료
        imgStartPage.Visible = False
        addBarcode Trim(txt_Input.Text)
    End If
End Sub

Private Sub addBarcode(sbarcode As String)
    ' 1. 바코드 검색
    SQL = "Select * FROM Goods Where Barcode='" & sbarcode & "' AND Goods_Use='1'"
    Set rs = DBCON.Execute(SQL)

    If rs.RecordCount <> 0 Then
        ' 2. 장바구니에 추가
        With fg21List
            .AddItem ""
            .TextMatrix(.rows - 1, 1) = rs!BARCODE
            .TextMatrix(.rows - 1, 2) = rs!G_Name

            If rs!Sale_Use = "0" Then
                .TextMatrix(.rows - 1, 3) = rs!Sell_Pri
            Else
                .TextMatrix(.rows - 1, 3) = rs!Sale_Sell
            End If

            .Cell(flexcpPicture, .rows - 1, 5) = ImageList.ListImages(1).Picture
            .TextMatrix(.rows - 1, 6) = "1"
            .Cell(flexcpPicture, .rows - 1, 8) = ImageList.ListImages(2).Picture
            .TextMatrix(.rows - 1, 10) = .TextMatrix(.rows - 1, 3)
            .Cell(flexcpPicture, .rows - 1, 12) = ImageList.ListImages(3).Picture
            .TextMatrix(.rows - 1, 13) = "Scan"

            labHiddenOrder.Visible = False
            subTotalSum
        End With
    Else
        ' 미등록 상품
        Frm_SelfAlarm.setState 2
        Frm_SelfAlarm.Show vbModal
        txt_Input.Text = ""
    End If
End Sub
```

**스캐너 동작**:

```
바코드 스캔
    ↓
txt_Input에 문자열 입력
    ↓
KeyCode = 0 이벤트
    ↓
Goods 테이블 검색
    ↓ 있음        ↓ 없음
장바구니 추가    에러 메시지
    ↓
시작 화면 숨김
```

### 4.7 관리자 모드 진입

```vb
Private Sub lab관리자화면_DblClick()
    Scan_Type = 99
    Frm_Password.Show vbModal

    If Pass_Chk = False Then
        Scan_Type = 21
        Exit Sub
    End If

    Call Product_Sound("관리자권한.wav")
    Scan_Type = 8
    pic관리자.Top = 0
    pic관리자.Left = 0
    pic관리자.Visible = True
    labTest_Click  ' 상품 설정 버튼 표시
End Sub

Private Sub lab관리자닫기_Click()
    pic관리자.Visible = False
    labTest.Caption = "ON"
    labTest_Click  ' 버튼 숨김
    Scan_Type = 21
End Sub

Private Sub labTest_Click()
    If labTest.Caption = "ON" Then
        labTest.Caption = "OFF"
        testValue = False
    Else
        labTest.Caption = "ON"
        testValue = True
    End If

    ' 모든 상품의 관리 버튼 표시/숨김
    For i = 0 To MaxGoodsNum - 1
        CmdGoodsSet(i).Visible = testValue    ' 상품설정
        cmd삭제(i).Visible = testValue        ' 상품삭제
        CmdSetOP(i).Visible = testValue       ' 옵션설정
        imgbg(i).Visible = testValue
    Next i
End Sub
```

**관리자 모드 UI**:

```
┌──────────────────────────────────┐
│ pic관리자 (전체 화면 오버레이)     │
├──────────────────────────────────┤
│ [상품선택] [상품추가] [판매가격]   │
│ [판매메뉴] [주문상품] [주문분류]   │
│ [주문취소] [원격지원] [판매내역]   │
│ [현금반환] [프로그램닫기]          │
│                    [관리자닫기]    │
└──────────────────────────────────┘
       ↓
각 상품 카드에 버튼 표시:
┌──────────────┐
│ [상품설정]    │ ← CmdGoodsSet
│ [옵션설정]    │ ← CmdSetOP
│ [이미지]      │
│ 아메리카노    │
│ 4,500원      │
│ [상품삭제]    │ ← cmd삭제
└──────────────┘
```

---

## 5. 상태 관리 및 데이터 플로우

### 5.1 전역 변수 (다른 Module에서 정의)

```vb
' 주문 데이터
Public OrderGoods() As OrderKiosk  ' 주문 상품 배열
Public sState As String            ' "초기" / "복원"

' DB 연결
Public Connect_Gubun As Integer    ' 1: SQL Server, 2: Access
Public DBCON As ADODB.Connection
Public DBCON1 As ADODB.Connection

' 키오스크 설정
Public kPosNo As String            ' 포스 번호
Public Scan_Type As Integer        ' 8: 스캔 없음, 21: 스캔 사용
Public testValue As Boolean        ' 관리자 모드 버튼 표시 여부
Public maxGoodsCount As Long       ' 총 상품 개수

' 사운드
Public Function Product_Sound(ByVal fileName As String)
```

### 5.2 탭 정보 구조체

```vb
Type TabMenuInfo
    Code As String    ' "T001", "T002"...
    name As String    ' "커피", "음료", "디저트"...
    Order As Integer  ' 정렬 순서
End Type

Public Tabinfo() As TabMenuInfo  ' 동적 배열
```

### 5.3 주문 상품 구조체

```vb
Type OrderKiosk
    sID As String         ' 상품 ID
    sbarcode As String    ' 바코드
    sName As String       ' 상품명
    pri As Long           ' 가격
    Cnt As Integer        ' 수량
    sOPYN As String       ' 옵션 여부 ("0"/"1")
    sOPID As String       ' 옵션 ID
    sOPBarcods As String  ' 옵션 바코드 목록 ("OP001,OP002,OP003")
    sMainPri As Long      ' 원 판매가
End Type

Public OrderGoods() As OrderKiosk
```

### 5.4 데이터베이스 스키마

#### 5.4.1 Group_SelfManage (상품 관리)

```sql
CREATE TABLE Group_SelfManage (
    SelfM_ID INT PRIMARY KEY,         -- 상품 관리 ID
    GroupID INT,                      -- 그룹 ID
    Barcode VARCHAR(50),              -- 상품 바코드
    TCODE VARCHAR(10),                -- 탭 코드
    View_YN CHAR(1),                  -- 표시 여부
    Index_Num INT,                    -- 정렬 순서
    MI_CODE VARCHAR(20),              -- 메뉴 코드
    Stock_YN CHAR(1),                 -- 재고 관리 여부
    OPCODE VARCHAR(50)                -- 옵션 코드
)
```

#### 5.4.2 Self_TabMenu (탭 메뉴)

```sql
CREATE TABLE Self_TabMenu (
    TCode VARCHAR(10) PRIMARY KEY,    -- 탭 코드
    TName VARCHAR(50),                -- 탭 이름
    TOrder INT,                       -- 정렬 순서
    Pos_No VARCHAR(10)                -- 포스 번호
)
```

#### 5.4.3 Group_SelfOP (옵션 상품)

```sql
CREATE TABLE Group_SelfOP (
    Self_ID INT,                      -- 상품 ID
    OP_Barcode VARCHAR(50),           -- 옵션 바코드
    OP_Name VARCHAR(100),             -- 옵션명
    OP_Price INT,                     -- 추가 가격
    OP_Order INT                      -- 정렬 순서
)
```

#### 5.4.4 Goods (상품 마스터)

```sql
CREATE TABLE Goods (
    Barcode VARCHAR(50) PRIMARY KEY,  -- 바코드
    G_Name VARCHAR(100),              -- 상품명
    Sec_GName VARCHAR(100),           -- 부상품명
    Sell_Pri INT,                     -- 판매가
    Sale_Use CHAR(1),                 -- 세일 사용
    Sale_Sell INT,                    -- 세일가
    Dir_img VARCHAR(255),             -- 이미지 파일명
    soldout_yn CHAR(1),               -- 품절 여부
    Goods_Use CHAR(1)                 -- 사용 여부
)
```

### 5.5 데이터 플로우

```
┌─────────────────────────────────────────────┐
│ Form_Load                                    │
├─────────────────────────────────────────────┤
│ 1. initTab() 실행                            │
│    ↓                                         │
│    SELECT Self_TabMenu                       │
│    WHERE pos_no = kPosNo                     │
│    ORDER BY TOrder ASC                       │
│    ↓                                         │
│    Tabinfo() 배열에 저장                      │
│    ↓                                         │
│    labSelfTab(0~3)에 탭명 표시                │
├─────────────────────────────────────────────┤
│ 2. labSelfTab_Click(0) 자동 실행             │
│    ↓                                         │
│    labTabCode = Tabinfo(0).Code              │
│    labTabName = Tabinfo(0).name              │
├─────────────────────────────────────────────┤
│ 3. InitGoods() 실행                          │
│    ↓                                         │
│    SELECT Group_SelfManage                   │
│    INNER JOIN Goods                          │
│    WHERE TCODE = labTabCode                  │
│      AND View_YN = '1'                       │
│    ORDER BY Index_Num ASC                    │
│    ↓                                         │
│    maxGoodsCount = rs.RecordCount            │
├─────────────────────────────────────────────┤
│ 4. GoodsReFlesh("Next") 실행                 │
│    ↓                                         │
│    SELECT TOP 12 * FROM (위 쿼리)             │
│    WHERE Index_Num > 0                       │
│    ORDER BY Index_Num ASC                    │
│    ↓                                         │
│    ShowSelfDetail(SQL) 실행                  │
│    ↓                                         │
│    For l = 0 To 11                           │
│       Image1(l).Picture = 이미지 로드         │
│       txtSelfGoods(l).Text = 상품명           │
│       txtSelfPri(l).Text = 가격               │
│       labSelfID(l).Caption = 상품ID (숨김)    │
│       labSelfBarcode(l) = 바코드 (숨김)       │
│       frmBG(l).Visible = True                │
│    Next l                                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 사용자 상호작용                               │
├─────────────────────────────────────────────┤
│ 상품 클릭 (Image1_Click)                     │
│    ↓                                         │
│    옵션 여부 확인                             │
│    SELECT * FROM Group_SelfOP                │
│    WHERE Self_ID = labSelfID(Index)          │
│    ↓                                         │
│    RecordCount = 0?                          │
│    ↓ Yes (옵션 없음)                         │
│    addGoods(Index)                           │
│    ↓                                         │
│    fg21List.AddItem ""                       │
│    TextMatrix(row, 1) = 바코드                │
│    TextMatrix(row, 2) = 상품명                │
│    TextMatrix(row, 3) = 가격                  │
│    TextMatrix(row, 6) = 수량 (1)              │
│    TextMatrix(row, 10) = 합계                 │
│    TextMatrix(row, 13) = 상품ID               │
│    ↓                                         │
│    subTotalSum() 호출                        │
│    ↓                                         │
│    labTotalCnt = "3개"                       │
│    labTotalPri = "15,000원"                  │
│                                              │
│    ↓ No (옵션 있음)                          │
│    frm_SelfOpGoods.Visible = True            │
│    ↓                                         │
│    사용자 옵션 선택                           │
│    ↓                                         │
│    fg21List.AddItem ""                       │
│    TextMatrix(row, 14) = 옵션ID               │
│    TextMatrix(row, 17) = "1" (옵션 있음)      │
│    TextMatrix(row, 18) = "OP001,OP002,OP003" │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 결제 프로세스                                 │
├─────────────────────────────────────────────┤
│ img결제_Click()                              │
│    ↓                                         │
│    Frm_SelfOrderList.Show vbModal            │
│    ↓                                         │
│    사용자 선택: [포장] / [매장]               │
│    ↓                                         │
│    For i = 1 To fg21List.rows - 1            │
│       OrderGoods(i-1).sbarcode = 바코드       │
│       OrderGoods(i-1).sName = 상품명          │
│       OrderGoods(i-1).pri = 가격              │
│       OrderGoods(i-1).Cnt = 수량              │
│       ↓                                      │
│       Frm_SaleMain.SetKioskBarcode(바코드)    │
│    Next i                                    │
│    ↓                                         │
│    Unload Me (Frm_SelfKiosk 종료)           │
│    ↓                                         │
│    Frm_SaleMain.selfState(2) 호출            │
│    ↓                                         │
│    Frm_SaleMain에서 결제 처리                 │
└─────────────────────────────────────────────┘
```

---

## 6. 타이머 및 자동화 로직

### 6.1 자동 화면 복귀

**주요 변수**: `sState`

```vb
' Form_Load에서 체크
If sState = "초기" Then
    ' 새 주문 시작
    labHiddenOrder.Visible = True
    fg21List.rows = 1
Else
    ' 이전 주문 복원 (결제 취소 등)
    beforGoods  ' OrderGoods[] → fg21List
End If
```

**복원 로직**:

```vb
Private Sub beforGoods()
    With fg21List
        For i = 0 To UBound(OrderGoods)
            .AddItem ""
            .TextMatrix(.rows - 1, 1) = OrderGoods(i).sbarcode
            .TextMatrix(.rows - 1, 2) = OrderGoods(i).sName
            .TextMatrix(.rows - 1, 3) = OrderGoods(i).pri
            .TextMatrix(.rows - 1, 6) = OrderGoods(i).Cnt
            .TextMatrix(.rows - 1, 10) = OrderGoods(i).Cnt * OrderGoods(i).pri
            .TextMatrix(.rows - 1, 13) = OrderGoods(i).sID

            ' 옵션 복원
            If OrderGoods(i).sOPYN = "1" Then
                .TextMatrix(.rows - 1, 14) = OrderGoods(i).sOPID
                .TextMatrix(.rows - 1, 17) = "1"
                .TextMatrix(.rows - 1, 18) = OrderGoods(i).sOPBarcods
            End If
        Next i
        labHiddenOrder.Visible = False
    End With
    subTotalSum
End Sub
```

### 6.2 사운드 피드백

모든 클릭 이벤트에서 사운드 재생:

```vb
Private Sub labSelfTab_Click(Index As Integer)
    Call Product_Sound("터치음.wav")  ' ← 터치 피드백
    ' ...
End Sub

Private Sub imgHome_Click()
    Call Product_Sound("터치음.wav")
    ' ...
End Sub

Private Sub imgStartPage_Click()
    Call Product_Sound("시작하기.wav")  ' ← 특별한 사운드
    ' ...
End Sub

Private Sub lab관리자화면_DblClick()
    Call Product_Sound("관리자권한.wav")  ' ← 관리자 진입
    ' ...
End Sub
```

### 6.3 이미지 캐싱

```vb
Private Sub ShowSelfDetail(sSql As String)
    ' ...
    Do Until rs.EOF
        dirimg = IIf(IsNull(rs!Dir_img), "", rs!Dir_img)

        If dirimg = "" Then
            loadPath = App.Path & "\SelfImage\준비중.jpg"
        Else
            loadPath = App.Path & "\SelfImage\" & dirimg
        End If

        ' 이미지 로드 (캐싱 로직 포함)
        Call Selfimage_load(loadPath, saveFilePath)

        If saveFilePath <> "" Then
            Image1(l).Picture = LoadPicture(saveFilePath)
            Image1(l).Tag = dirimg
        Else
            Image1(l).Picture = LoadPicture(App.Path & "\SelfImage\GoodsNo.gif")
        End If

        ' ...
    Loop
End Sub
```

**이미지 경로**:

- `App.Path & "\SelfImage\준비중.jpg"`: 기본 이미지
- `App.Path & "\SelfImage\GoodsNo.gif"`: 이미지 없음
- `App.Path & "\SelfImage\[상품이미지].jpg"`: 실제 상품 이미지

### 6.4 품절 처리

```vb
Private Sub ShowSelfDetail(sSql As String)
    ' ...
    sSoltOut = IIf(IsNull(rs!soldout_yn), 0, rs!soldout_yn)

    If sSoltOut = "1" Then
        imgSoldOut(l).Picture = ImageList.ListImages(5).Picture
        imgSoldOut(l).Visible = True  ' 품절 오버레이 표시
    End If
    ' ...
End Sub

Private Sub Image1_Click(Index As Integer)
    If imgSoldOut(Index).Visible = True Then Exit Sub  ' 클릭 차단
    AddGoodsList Index
End Sub
```

---

## 7. 다른 Form과의 연동

### 7.1 호출하는 Form 목록

| Form 이름             | 호출 방식    | 역할            | 호출 위치                             |
| --------------------- | ------------ | --------------- | ------------------------------------- |
| **Frm_SaleMain**      | 데이터 전송  | 메인 POS 화면   | lab주문\_Click                        |
| **frm_SelfGoods**     | vbModal      | 상품 등록/수정  | CmdGoodsSet_Click, lab주문상품\_Click |
| **frm_SelfOpGoods**   | Visible=True | 옵션 선택       | AddGoodsList, fg21List_Click          |
| **Frm_SelfOrderList** | vbModal      | 주문 방법 선택  | lab주문\_Click                        |
| **Frm_SelfAlarm**     | vbModal      | 알림 메시지     | 에러, 빈 카트 등                      |
| **frm_SelfAlarm2**    | vbModal      | 확인 메시지     | cmd삭제\_Click                        |
| **frm_SelfCancel**    | vbModal      | 주문 취소 확인  | imgHome_Click                         |
| **frm_SelfTabMenu**   | vbModal      | 탭 메뉴 설정    | lab주문분류\_Click                    |
| **Frm_Password**      | vbModal      | 관리자 비밀번호 | lab관리자화면\_DblClick               |
| **Frm_ProductUpdate** | vbModal      | 상품 관리       | labGoodsAdd_Click                     |
| **Frm_PriceTag**      | vbModal      | 가격표 출력     | labSlefPrice_Click                    |
| **Frm_SaleMenu**      | vbModal      | POS 메뉴        | labSaleMenu_Click                     |
| **Frm_SaleList**      | vbModal      | 판매 내역       | lab판매내역\_Click                    |
| **Frm_SaleFinish**    | vbModal      | 영업 마감       | lab종료\_Click                        |

### 7.2 Frm_SaleMain으로 데이터 전달

```vb
' Frm_SelfKiosk → Frm_SaleMain
Private Sub lab주문_Click()
    ' ...
    For i = 1 To fg21List.rows - 1
        Cnt = .TextMatrix(i, 6)

        ' 메인 상품 전송
        Frm_SaleMain.SetKioskBarcode .TextMatrix(i, 1), Cnt, ""

        ' 옵션 상품 전송
        If .TextMatrix(i, 17) = "1" Then
            sData = Split(.TextMatrix(i, 18), ",")  ' "OP001,OP002,OP003"
            For j = 0 To UBound(sData)
                Frm_SaleMain.SetKioskBarcode sData(j), Cnt, "1"
            Next j
        End If
    Next i

    ' 키오스크 종료
    Unload Me

    ' 결제 진행
    Frm_SaleMain.selfState 2
End Sub
```

**Frm_SaleMain.SetKioskBarcode() 시그니처**:

```vb
Public Sub SetKioskBarcode(sBarcode As String, _
                           sCnt As String, _
                           sOpYN As String)
```

### 7.3 frm_SelfOpGoods 옵션 창

```vb
' 새 옵션 추가
frm_SelfOpGoods.SetOpGoods labSelfID(Index).Caption, Index, "추가"
frm_SelfOpGoods.Visible = True

' 기존 옵션 수정
frm_SelfOpGoods.SetUpdate .TextMatrix(.Row, 13), _
                          .TextMatrix(.Row, 14), _
                          .Row
frm_SelfOpGoods.Visible = True
```

**frm_SelfOpGoods Public 메서드**:

```vb
Public Sub SetOpGoods(sSelfID As String, _
                      sIndex As Integer, _
                      sGubun As String)

Public Sub SetUpdate(sSelfID As String, _
                     sOPID As String, _
                     sRow As Long)
```

### 7.4 Frm_SelfOrderList 주문 방법

```vb
Frm_SelfOrderList.Top = 0
Frm_SelfOrderList.Left = 0
Frm_SelfOrderList.Show vbModal

If Frm_SelfOrderList.OrderGubun <> "" Then
    ' OrderGubun = "포장" Or "매장"
    ' ...
End If
```

**Frm_SelfOrderList Public 변수**:

```vb
Public OrderGubun As String  ' "포장", "매장", ""(취소)
```

---

## 8. 호출 관계

### 8.1 Form_Load 호출 체인

```
Form_Load
    ↓
Grid_Set (VSFlexGrid 초기화)
    ↓
initAll
    ↓
    ├─→ initTab
    │     ↓
    │     SQL: SELECT Self_TabMenu
    │     ↓
    │     Tabinfo() 배열 구축
    │     ↓
    │     MoveTabMenu(0)
    │     ↓
    │     labSelfTab_Click(0)
    │         ↓
    │         GoddsInfoIni
    │             ↓
    │             labPageIndex = "1"
    │             ↓
    │             InitGoods ←─────┐
    │                 ↓           │
    │                 SQL: SELECT Group_SelfManage
    │                 ↓
    │                 maxGoodsCount = rs.RecordCount
    │                 ↓
    │                 GoodsReFlesh("Next")
    │                     ↓
    │                     SQL: SELECT TOP 12 ...
    │                     ↓
    │                     ShowSelfDetail(SQL)
    │                         ↓
    │                         For l = 0 To 11
    │                             Image1(l).Picture = ...
    │                             txtSelfGoods(l).Text = ...
    │                             txtSelfPri(l).Text = ...
    │                         Next l
    │
    └─→ (다른 초기화 작업)
```

### 8.2 상품 클릭 플로우

```
Image1_Click(Index)
    ↓
품절 체크: imgSoldOut(Index).Visible?
    ↓ False
AddGoodsList(Index)
    ↓
SQL: SELECT * FROM Group_SelfOP WHERE Self_ID = ?
    ↓
    ├─→ RecordCount = 0 (옵션 없음)
    │     ↓
    │     fg21List 검색 (같은 상품 있는지)
    │     ↓
    │     ├─→ 있음: 수량 +1
    │     │     TextMatrix(i, 6) = tempCnt + 1
    │     │     TextMatrix(i, 10) = 합계
    │     │
    │     └─→ 없음: addGoods(Index)
    │             ↓
    │             fg21List.AddItem ""
    │             TextMatrix(row, 1~19) = ...
    │
    └─→ RecordCount > 0 (옵션 있음)
          ↓
          frm_SelfOpGoods.SetOpGoods(...)
          ↓
          frm_SelfOpGoods.Visible = True
          ↓
          사용자 옵션 선택 (HOT/ICE, 사이즈 등)
          ↓
          Public Sub AddOptionGoods(...) ' frm_SelfOpGoods에서 호출
          ↓
          fg21List.AddItem ""
          TextMatrix(row, 14) = 옵션ID
          TextMatrix(row, 17) = "1"
          TextMatrix(row, 18) = "OP001,OP002,OP003"
    ↓
subTotalSum
    ↓
    labTotalCnt = "5개"
    labTotalPri = "25,000원"
```

### 8.3 결제 플로우

```
img결제_Click()
    ↓
빈 카트 체크: fg21List.rows = 1?
    ↓ No
Frm_SelfOrderList.Show vbModal
    ↓
[포장] or [매장] 선택
    ↓
OrderGubun <> "" ?
    ↓ Yes
For i = 1 To fg21List.rows - 1
    ↓
    Frm_SaleMain.SetKioskBarcode(바코드, 수량, "")
    ↓
    OrderGoods(i-1).sbarcode = ...
    OrderGoods(i-1).Cnt = ...
    OrderGoods(i-1).pri = ...
    ↓
    옵션 있음?
    ↓ Yes
    sData = Split(옵션바코드문자열, ",")
    ↓
    For j = 0 To UBound(sData)
        Frm_SaleMain.SetKioskBarcode(sData(j), 수량, "1")
    Next j
Next i
    ↓
Unload Me (Frm_SelfKiosk 종료)
    ↓
Frm_SaleMain.selfState(2) 호출
    ↓
┌──────────────────────────────┐
│ Frm_SaleMain (메인 POS 화면)  │
├──────────────────────────────┤
│ Public Sub selfState(sIndex) │
│   Select Case sIndex          │
│     Case 2  ' 결제 진행       │
│       Call 결제화면표시()      │
│   End Select                  │
│ End Sub                       │
└──────────────────────────────┘
```

### 8.4 의존성 그래프

```
Frm_SelfKiosk
    ↓
    ├─→ Mdl_Function.bas
    │     └─→ Selfimage_load()
    │
    ├─→ Mdl_Main.bas
    │     ├─→ DBCON, DBCON1
    │     ├─→ Connect_Gubun
    │     ├─→ OrderGoods()
    │     ├─→ Tabinfo()
    │     └─→ C_Config (설정 구조체)
    │
    ├─→ DBConnection.bas
    │     └─→ SQL 실행
    │
    ├─→ Sound.bas
    │     └─→ Product_Sound()
    │
    ├─→ Frm_SaleMain.frm
    │     ├─→ SetKioskBarcode()
    │     └─→ selfState()
    │
    ├─→ frm_SelfGoods.frm
    │     └─→ SetTabInfo() (상품 등록)
    │
    ├─→ frm_SelfOpGoods.frm
    │     ├─→ SetOpGoods() (옵션 선택)
    │     └─→ SetUpdate() (옵션 수정)
    │
    ├─→ Frm_SelfOrderList.frm
    │     └─→ OrderGubun (포장/매장)
    │
    ├─→ Frm_SelfAlarm.frm
    │     ├─→ setState()
    │     └─→ setErrorMag()
    │
    └─→ frm_SelfTabMenu.frm
          └─→ 탭 메뉴 설정
```

---

## 9. 마이그레이션 고려사항

### 9.1 Vue 3 SFC 구조

**VB6 Frm_SelfKiosk.frm → Vue 3 KioskMainView.vue**

```vue
<template>
  <!-- 시작 화면 -->
  <div v-if="showStartScreen" class="start-screen" @click="hideStartScreen">
    <img :src="config.startImage" alt="터치하세요" />
    <div class="start-message">화면을 터치하세요</div>
  </div>

  <!-- 메인 화면 -->
  <div v-else class="kiosk-main">
    <!-- 탭 메뉴 -->
    <div class="tab-menu">
      <button v-if="showLeftScroll" class="tab-scroll-btn left" @click="scrollTabLeft">◀</button>

      <div class="tab-list">
        <button
          v-for="(tab, index) in visibleTabs"
          :key="tab.code"
          :class="['tab-item', { active: tab.code === selectedTabCode }]"
          @click="selectTab(tab)"
        >
          {{ tab.name }}
        </button>
      </div>

      <button v-if="showRightScroll" class="tab-scroll-btn right" @click="scrollTabRight">▶</button>
    </div>

    <!-- 상품 그리드 -->
    <div class="goods-grid">
      <div
        v-for="product in displayedProducts"
        :key="product.id"
        class="product-card"
        @click="addToCart(product)"
      >
        <div class="product-image-wrapper">
          <img :src="getProductImage(product.imageUrl)" :alt="product.name" class="product-image" />
          <div v-if="product.soldOut" class="sold-out-overlay">품절</div>
        </div>
        <div class="product-name">{{ product.name }}</div>
        <div class="product-price">{{ formatPrice(product.price) }}원</div>

        <!-- 관리자 모드 버튼 -->
        <div v-if="adminMode" class="admin-buttons">
          <button @click.stop="editProduct(product)">상품설정</button>
          <button @click.stop="editOptions(product)">옵션설정</button>
          <button @click.stop="deleteProduct(product)">상품삭제</button>
        </div>
      </div>

      <!-- 페이지 네비게이션 -->
      <button v-if="currentPage > 1" class="page-nav prev" @click="prevPage">◀ 이전</button>
      <button v-if="currentPage < totalPages" class="page-nav next" @click="nextPage">
        다음 ▶
      </button>
    </div>

    <!-- 주문 목록 -->
    <div class="cart-section">
      <div v-if="cartItems.length === 0" class="empty-cart">
        <p>주문 상품이 없습니다</p>
      </div>

      <div v-else class="cart-list">
        <div v-for="(item, index) in cartItems" :key="index" class="cart-item">
          <div class="item-name">{{ item.name }}</div>
          <div class="quantity-control">
            <button @click="decreaseQuantity(index)">−</button>
            <span>{{ item.quantity }}</span>
            <button @click="increaseQuantity(index)">+</button>
          </div>
          <div class="item-price">{{ formatPrice(item.price * item.quantity) }}원</div>
          <button v-if="item.hasOptions" @click="editItemOptions(index)">옵션</button>
          <button @click="removeItem(index)">삭제</button>
        </div>
      </div>

      <div class="cart-summary">
        <div class="total-quantity">총 수량: {{ totalQuantity }}개</div>
        <div class="total-price">총 금액: {{ formatPrice(totalPrice) }}원</div>
      </div>

      <div class="action-buttons">
        <button class="btn-home" @click="goHome">처음으로</button>
        <button class="btn-order" @click="proceedToOrder">결제하기</button>
      </div>
    </div>

    <!-- 관리자 패널 -->
    <AdminPanel v-if="showAdminPanel" @close="closeAdminPanel" @refresh="refreshProducts" />

    <!-- 옵션 선택 모달 -->
    <OptionSelectionModal
      v-if="showOptionModal"
      :product="selectedProduct"
      @confirm="addOptionsToCart"
      @cancel="closeOptionModal"
    />

    <!-- 주문 방법 선택 모달 -->
    <OrderTypeModal
      v-if="showOrderTypeModal"
      @select="confirmOrder"
      @cancel="closeOrderTypeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useKioskStore } from "@/stores/kiosk";
import { useCartStore } from "@/stores/cart";
import { useConfigStore } from "@/stores/config";
import AdminPanel from "@/components/kiosk/AdminPanel.vue";
import OptionSelectionModal from "@/components/kiosk/OptionSelectionModal.vue";
import OrderTypeModal from "@/components/kiosk/OrderTypeModal.vue";
import { playSound } from "@/utils/sound";

// Stores
const kioskStore = useKioskStore();
const cartStore = useCartStore();
const configStore = useConfigStore();
const router = useRouter();

// State
const showStartScreen = ref(true);
const selectedTabCode = ref("");
const currentPage = ref(1);
const tabScrollIndex = ref(0);
const adminMode = ref(false);
const showAdminPanel = ref(false);
const showOptionModal = ref(false);
const showOrderTypeModal = ref(false);
const selectedProduct = ref(null);

// Constants
const TABS_PER_VIEW = 4;
const PRODUCTS_PER_PAGE = 12;

// Computed
const { tabs, products, config } = storeToRefs(kioskStore);
const { items: cartItems, totalQuantity, totalPrice } = storeToRefs(cartStore);

const visibleTabs = computed(() => {
  const start = tabScrollIndex.value;
  const end = start + TABS_PER_VIEW;
  return tabs.value.slice(start, end);
});

const showLeftScroll = computed(() => tabScrollIndex.value > 0);
const showRightScroll = computed(() => {
  return tabScrollIndex.value + TABS_PER_VIEW < tabs.value.length;
});

const filteredProducts = computed(() => {
  return products.value.filter((p) => p.tabCode === selectedTabCode.value);
});

const totalPages = computed(() => {
  return Math.ceil(filteredProducts.value.length / PRODUCTS_PER_PAGE);
});

const displayedProducts = computed(() => {
  const start = (currentPage.value - 1) * PRODUCTS_PER_PAGE;
  const end = start + PRODUCTS_PER_PAGE;
  return filteredProducts.value.slice(start, end);
});

// Methods
const hideStartScreen = () => {
  playSound("start.wav");
  showStartScreen.value = false;
};

const selectTab = (tab) => {
  playSound("touch.wav");
  selectedTabCode.value = tab.code;
  currentPage.value = 1;
};

const scrollTabLeft = () => {
  playSound("touch.wav");
  if (tabScrollIndex.value > 0) {
    tabScrollIndex.value--;
  }
};

const scrollTabRight = () => {
  playSound("touch.wav");
  if (tabScrollIndex.value + TABS_PER_VIEW < tabs.value.length) {
    tabScrollIndex.value++;
  }
};

const prevPage = () => {
  playSound("touch.wav");
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  playSound("touch.wav");
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const addToCart = async (product) => {
  playSound("touch.wav");

  if (product.soldOut) return;

  // 옵션 상품인지 확인
  const hasOptions = await kioskStore.checkProductOptions(product.id);

  if (hasOptions) {
    selectedProduct.value = product;
    showOptionModal.value = true;
  } else {
    cartStore.addItem({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      quantity: 1,
      options: [],
    });
  }
};

const addOptionsToCart = (product, options) => {
  playSound("touch.wav");
  cartStore.addItem({
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    price: product.price,
    quantity: 1,
    options: options,
    hasOptions: true,
  });
  closeOptionModal();
};

const increaseQuantity = (index) => {
  playSound("touch.wav");
  cartStore.increaseQuantity(index);
};

const decreaseQuantity = (index) => {
  playSound("touch.wav");
  cartStore.decreaseQuantity(index);
};

const removeItem = (index) => {
  playSound("touch.wav");
  cartStore.removeItem(index);
};

const editItemOptions = (index) => {
  playSound("touch.wav");
  // TODO: 옵션 수정 모달
};

const goHome = () => {
  playSound("touch.wav");
  if (cartItems.value.length > 0) {
    // 취소 확인
    if (confirm("주문을 취소하시겠습니까?")) {
      cartStore.clearCart();
      showStartScreen.value = true;
    }
  } else {
    showStartScreen.value = true;
  }
};

const proceedToOrder = () => {
  playSound("touch.wav");

  if (cartItems.value.length === 0) {
    alert("주문 상품이 없습니다.");
    return;
  }

  showOrderTypeModal.value = true;
};

const confirmOrder = async (orderType) => {
  playSound("touch.wav");

  // 주문 데이터 준비
  const orderData = {
    orderType: orderType, // '포장' or '매장'
    items: cartItems.value.map((item) => ({
      barcode: item.barcode,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      options: item.options || [],
    })),
    totalQuantity: totalQuantity.value,
    totalPrice: totalPrice.value,
  };

  // 주문 저장
  await kioskStore.saveOrder(orderData);

  // 결제 화면으로 이동
  router.push({
    name: "payment",
    params: { orderData: JSON.stringify(orderData) },
  });

  closeOrderTypeModal();
};

const closeOptionModal = () => {
  showOptionModal.value = false;
  selectedProduct.value = null;
};

const closeOrderTypeModal = () => {
  showOrderTypeModal.value = false;
};

const getProductImage = (imageUrl) => {
  if (!imageUrl) return "/images/no-image.gif";
  return `/images/products/${imageUrl}`;
};

const formatPrice = (price) => {
  return price.toLocaleString("ko-KR");
};

// Lifecycle
onMounted(async () => {
  // 탭 및 상품 로드
  await kioskStore.loadTabs();
  await kioskStore.loadProducts();

  // 첫 번째 탭 선택
  if (tabs.value.length > 0) {
    selectedTabCode.value = tabs.value[0].code;
  }

  // 이전 주문 복원 (필요시)
  if (kioskStore.hasUnfinishedOrder) {
    await cartStore.restoreCart(kioskStore.unfinishedOrder);
    showStartScreen.value = false;
  }

  // 시작 화면 설정
  if (config.value.hideStartScreen) {
    showStartScreen.value = false;
  }
});

// 관리자 모드 (더블클릭)
const handleAdminAccess = () => {
  // TODO: 비밀번호 입력 모달
  adminMode.value = true;
  showAdminPanel.value = true;
};
</script>

<style scoped lang="scss">
.kiosk-main {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.tab-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #cfcfcf;
  height: 120px;

  .tab-scroll-btn {
    width: 50px;
    height: 70px;
    font-size: 24px;
    border: none;
    background: #fff;
    cursor: pointer;
    border-radius: 8px;

    &:hover {
      background: #e0e0e0;
    }
  }

  .tab-list {
    display: flex;
    gap: 1rem;
    flex: 1;
  }

  .tab-item {
    flex: 1;
    height: 90px;
    font-size: 20px;
    font-weight: bold;
    color: #fff;
    background: #5a5a5a;
    border: none;
    border-radius: 12px 12px 0 0;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: #fff;
      color: #000;
    }

    &:hover:not(.active) {
      background: #707070;
    }
  }
}

.goods-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  position: relative;
}

.product-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .product-image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    background: #f5f5f5;

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .sold-out-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 24px;
      font-weight: bold;
    }
  }

  .product-name {
    margin-top: 0.5rem;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    min-height: 40px;
  }

  .product-price {
    margin-top: 0.25rem;
    font-size: 18px;
    font-weight: bold;
    color: #0066cc;
    text-align: center;
  }

  .admin-buttons {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    button {
      padding: 0.25rem;
      font-size: 12px;
      border: 1px solid #ddd;
      background: #f9f9f9;
      cursor: pointer;

      &:hover {
        background: #e0e0e0;
      }
    }
  }
}

.page-nav {
  position: absolute;
  bottom: 1rem;
  padding: 1rem 2rem;
  font-size: 18px;
  font-weight: bold;
  border: none;
  background: #0066cc;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;

  &.prev {
    left: 1rem;
  }

  &.next {
    right: 1rem;
  }

  &:hover {
    background: #0052a3;
  }
}

.cart-section {
  height: 460px;
  background: #fff;
  border-top: 2px solid #ddd;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.empty-cart {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #999;
}

.cart-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.cart-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto auto;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  align-items: center;
  font-size: 18px;

  .item-name {
    font-weight: bold;
  }

  .quantity-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    button {
      width: 40px;
      height: 40px;
      font-size: 20px;
      border: 1px solid #ddd;
      background: #fff;
      cursor: pointer;

      &:hover {
        background: #f0f0f0;
      }
    }

    span {
      min-width: 30px;
      text-align: center;
      font-weight: bold;
    }
  }

  .item-price {
    font-weight: bold;
    color: #0066cc;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: #f9f9f9;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background: #e0e0e0;
    }
  }
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  margin: 1rem 0;
  font-size: 24px;
  font-weight: bold;

  .total-price {
    color: #cc0000;
  }
}

.action-buttons {
  display: flex;
  gap: 1rem;

  button {
    flex: 1;
    height: 80px;
    font-size: 24px;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;

    &.btn-home {
      background: #999;
      color: #fff;

      &:hover {
        background: #777;
      }
    }

    &.btn-order {
      background: #cc0000;
      color: #fff;

      &:hover {
        background: #aa0000;
      }
    }
  }
}

.start-screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  cursor: pointer;

  img {
    max-width: 80%;
    max-height: 70vh;
  }

  .start-message {
    margin-top: 2rem;
    font-size: 36px;
    font-weight: bold;
    color: #333;
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
```

### 9.2 Pinia Store 구조

```typescript
// stores/kiosk.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Tab, Product, Order } from "@/types/kiosk";
import { kioskApi } from "@/api/kiosk";

export const useKioskStore = defineStore("kiosk", () => {
  // State
  const tabs = ref<Tab[]>([]);
  const products = ref<Product[]>([]);
  const currentTabCode = ref("");
  const currentPage = ref(1);
  const unfinishedOrder = ref<Order | null>(null);

  // Getters
  const hasUnfinishedOrder = computed(() => !!unfinishedOrder.value);

  const currentTabProducts = computed(() => {
    return products.value.filter((p) => p.tabCode === currentTabCode.value);
  });

  // Actions
  async function loadTabs() {
    try {
      const response = await kioskApi.getTabs();
      tabs.value = response.data;
    } catch (error) {
      console.error("Failed to load tabs:", error);
    }
  }

  async function loadProducts() {
    try {
      const response = await kioskApi.getProducts();
      products.value = response.data;
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  }

  async function checkProductOptions(productId: number): Promise<boolean> {
    try {
      const response = await kioskApi.getProductOptions(productId);
      return response.data.length > 0;
    } catch (error) {
      console.error("Failed to check options:", error);
      return false;
    }
  }

  async function saveOrder(orderData: Order) {
    try {
      await kioskApi.saveOrder(orderData);
      unfinishedOrder.value = orderData;
    } catch (error) {
      console.error("Failed to save order:", error);
      throw error;
    }
  }

  return {
    // State
    tabs,
    products,
    currentTabCode,
    currentPage,
    unfinishedOrder,

    // Getters
    hasUnfinishedOrder,
    currentTabProducts,

    // Actions
    loadTabs,
    loadProducts,
    checkProductOptions,
    saveOrder,
  };
});

// stores/cart.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { CartItem } from "@/types/kiosk";

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);

  const totalQuantity = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const totalPrice = computed(() => {
    return items.value.reduce((sum, item) => {
      const optionsPrice = item.options?.reduce((optSum, opt) => optSum + opt.price, 0) || 0;
      return sum + (item.price + optionsPrice) * item.quantity;
    }, 0);
  });

  function addItem(item: CartItem) {
    // 옵션이 없는 상품은 기존 항목에 수량만 증가
    if (!item.hasOptions) {
      const existingItem = items.value.find((i) => i.barcode === item.barcode && !i.hasOptions);
      if (existingItem) {
        existingItem.quantity++;
        return;
      }
    }

    items.value.push({ ...item });
  }

  function increaseQuantity(index: number) {
    if (items.value[index]) {
      items.value[index].quantity++;
    }
  }

  function decreaseQuantity(index: number) {
    if (items.value[index] && items.value[index].quantity > 1) {
      items.value[index].quantity--;
    }
  }

  function removeItem(index: number) {
    items.value.splice(index, 1);
  }

  function clearCart() {
    items.value = [];
  }

  async function restoreCart(order: any) {
    items.value = order.items || [];
  }

  return {
    items,
    totalQuantity,
    totalPrice,
    addItem,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
    restoreCart,
  };
});
```

### 9.3 API 레이어

```typescript
// api/kiosk.ts
import { apiClient } from "./client";
import type { Tab, Product, ProductOption, Order } from "@/types/kiosk";

export const kioskApi = {
  // 탭 메뉴 조회
  getTabs: () =>
    apiClient.get<Tab[]>("/kiosk/tabs", {
      params: { posNo: localStorage.getItem("posNo") },
    }),

  // 상품 목록 조회
  getProducts: (tabCode?: string) =>
    apiClient.get<Product[]>("/kiosk/products", {
      params: {
        posNo: localStorage.getItem("posNo"),
        tabCode: tabCode,
      },
    }),

  // 상품 옵션 조회
  getProductOptions: (productId: number) =>
    apiClient.get<ProductOption[]>(`/kiosk/products/${productId}/options`),

  // 주문 저장
  saveOrder: (orderData: Order) => apiClient.post("/kiosk/orders", orderData),

  // 상품 이미지 URL
  getProductImageUrl: (imageName: string) => `/api/kiosk/images/products/${imageName}`,
};
```

### 9.4 주요 차이점 및 개선사항

| VB6                 | Vue 3                           | 개선 효과                  |
| ------------------- | ------------------------------- | -------------------------- |
| **Form 기반**       | **SFC (Single File Component)** | 템플릿, 로직, 스타일 분리  |
| **전역 변수**       | **Pinia Store**                 | 상태 관리 중앙화           |
| **ADODB.Recordset** | **REST API + Axios**            | 표준 HTTP 통신             |
| **VSFlexGrid**      | **Vue 반응형 배열**             | 간단한 `v-for` 렌더링      |
| **모달 (vbModal)**  | **조건부 렌더링**               | `v-if`, Teleport           |
| **PictureBox**      | **`<img>` + CDN**               | 이미지 최적화 (WebP, lazy) |
| **수동 UI 갱신**    | **반응형 바인딩**               | 자동 UI 동기화             |
| **타이머 없음**     | **자동 초기화**                 | setTimeout으로 유휴 감지   |
| **사운드 (\*.wav)** | **Web Audio API**               | HTML5 Audio                |
| **바코드 스캐너**   | **USB HID / Keyboard**          | 동일 (txt_Input 방식)      |
| **오프라인 대응**   | **Service Worker**              | PWA 캐싱                   |

### 9.5 기술 스택 권장사항

```yaml
Frontend:
  Framework: Vue 3 (Composition API + TypeScript)
  State: Pinia
  Router: Vue Router
  UI: Tailwind CSS or Vuetify
  Build: Vite
  PWA: vite-plugin-pwa

Backend:
  API: Node.js + Express or Nest.js
  ORM: Prisma or TypeORM
  DB: PostgreSQL (SQL Server 대체)
  Cache: Redis (이미지, 상품 캐싱)

DevOps:
  Container: Docker + Docker Compose
  CI/CD: GitHub Actions
  Deployment: AWS EC2 or Azure App Service
  Storage: AWS S3 (상품 이미지)

Hardware:
  Scanner: USB Barcode Scanner (Keyboard Wedge)
  Display: 1080x1920 Portrait Touchscreen
  Printer: ESC/POS Thermal Printer (영수증)
  Payment: VAN 단말기 연동 (KIS, NICE 등)
```

### 9.6 마이그레이션 우선순위

**Phase 1: 핵심 기능 (MVP)**

1. ✅ 탭 메뉴 표시
2. ✅ 상품 그리드 (이미지, 가격)
3. ✅ 장바구니 추가/삭제/수량 변경
4. ✅ 총계 계산
5. ✅ 주문 확정 → 결제 화면 이동

**Phase 2: 고급 기능**

1. 옵션 상품 (사이즈, 토핑)
2. 바코드 스캔
3. 품절 처리
4. 페이지네이션
5. 관리자 모드

**Phase 3: 운영 기능**

1. 오프라인 대응 (Service Worker)
2. 이미지 최적화 (WebP, lazy loading)
3. 사운드 피드백
4. 자동 초기화 (유휴 타이머)
5. 에러 처리 및 로깅

**Phase 4: 고도화**

1. A/B 테스트 (상품 배치 최적화)
2. 추천 알고리즘 (연관 상품)
3. 실시간 재고 연동
4. 모바일 주문 연동 (QR 코드)
5. 다국어 지원

---

## 결론

Frm_SelfKiosk.frm은 POSON 키오스크의 핵심 UI로, 다음과 같은 특징을 가집니다:

1. **복잡한 UI 구조**: 12개 상품 그리드 + VSFlexGrid 장바구니 + 탭 메뉴
2. **상태 관리**: 전역 변수 (`OrderGoods[]`, `Tabinfo[]`) 의존
3. **모달 연동**: 8개 이상의 서브 폼과 상호작용
4. **DB 중심**: SQL 직접 실행 (Group_SelfManage, Self_TabMenu, Goods 등)
5. **관리자 모드**: 더블클릭 + 비밀번호로 진입 가능한 숨김 기능

**마이그레이션 시 핵심 과제**:

- VSFlexGrid → Vue 반응형 배열 전환
- 모달 Form → 조건부 컴포넌트 (`v-if`)
- ADODB → REST API + Pinia Store
- 이미지 로딩 최적화 (12개 상품 x N페이지)
- 터치 최적화 (버튼 크기, 간격)

**Vue 3 전환의 이점**:

- 반응형 데이터 바인딩으로 UI 동기화 자동화
- 컴포넌트 분리로 유지보수성 향상
- PWA로 오프라인 대응 강화
- TypeScript로 타입 안정성 확보
- Vite 빌드 시스템으로 개발 속도 향상

**다음 분석 파일**: [frm_SelfGoods.frm.md](./frm_SelfGoods.frm.md) (상품 등록 화면)

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**작성자**: Claude Code Analysis System
