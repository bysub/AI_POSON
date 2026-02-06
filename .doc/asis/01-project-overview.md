# POSON_POS_SELF21 프로젝트 분석 개요

## 1. 프로젝트 기본 정보

| 항목            | 내용                           |
| --------------- | ------------------------------ |
| **프로젝트명**  | POS_Client (POSON2_Self21.exe) |
| **개발 언어**   | Visual Basic 6.0               |
| **개발사**      | (주)문도시스템 / 데일리테크POS |
| **버전**        | 6.0.8                          |
| **대상 플랫폼** | Windows 32-bit (x86)           |

## 2. 코드베이스 규모

| 파일 유형        | 파일 수 | 총 라인 수     | 설명                               |
| ---------------- | ------- | -------------- | ---------------------------------- |
| **모듈(.bas)**   | 26개    | ~31,000 라인   | 공통 함수, API 선언, 비즈니스 로직 |
| **폼(.frm)**     | 152개   | ~269,000 라인  | UI 화면 및 이벤트 처리             |
| **클래스(.cls)** | 4개     | -              | JSON 파싱, 모니터 관리 등          |
| **합계**         | 182개   | ~300,000+ 라인 | -                                  |

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      POSON_POS_SELF21                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   UI Layer  │  │  Business   │  │     Hardware Layer      │  │
│  │  (152 Forms)│  │   Logic     │  │  (Printer, Scanner,     │  │
│  │             │  │  (Modules)  │  │   MSR, CDP, Scale)      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────┴────────────────┴──────────────────────┴─────────────┐ │
│  │                     Data Access Layer                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │ SQL Server  │  │   Access    │  │   INI Files        │ │ │
│  │  │  (ADODB)    │  │   (MDB)     │  │  (Configuration)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  External Integration                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │ 12 VANs  │ │  KaKao   │ │   SMS    │ │   FTP/HTTP   │  │ │
│  │  │ Payment  │ │ Alimtalk │ │ Service  │ │   Upload     │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 4. 주요 기능 영역

### 4.1 판매 관리 (Sales)

- **메인 판매 화면** (Frm_SaleMain.frm) - 1.6MB, 핵심 판매 로직
- 상품 등록, 가격 조회, 수량 입력
- 바코드 스캔, MSR 카드 리딩
- 할인/할증 처리
- 영수증 출력

### 4.2 셀프 키오스크 (Self Kiosk)

- **키오스크 메인** (Frm_SelfKiosk.frm) - 173KB
- 터치스크린 기반 UI
- 카테고리/상품 선택
- 옵션 선택 (frm_SelfOpGoods.frm)
- 주문 완료/결제

### 4.3 결제 처리 (Payment)

- **12개 VAN사 연동**:
  - NICE, KSNET, KICC, KIS, KOCES, KOVAN
  - SMARTRO(SMT), SPC, FDIK, JTNET, KCP
- 신용카드, 현금영수증, OCB 포인트
- 전자서명 패드 연동

### 4.4 회원 관리 (Membership)

- 회원 등록/조회/수정
- 포인트 적립/사용
- 회원 등급별 할인
- 미수금 관리

### 4.5 재고/매입 관리 (Inventory)

- 입출고 관리
- 매입 관리 (Frm_PurchaseManage.frm - 491KB)
- 재고 현황 조회
- 상품 마스터 관리

### 4.6 정산/보고서 (Settlement)

- 일/월 마감 정산
- 판매 내역 조회
- 세금계산서 발행
- Excel 내보내기

## 5. 외부 연동

### 5.1 데이터베이스

| 유형       | 용도      | 기술            |
| ---------- | --------- | --------------- |
| SQL Server | 메인 DB   | ADODB, SQLOLEDB |
| MS Access  | 로컬 백업 | Jet OLEDB 4.0   |

### 5.2 결제사 (VAN)

| VAN사   | DLL/OCX                          | 주요 기능            |
| ------- | -------------------------------- | -------------------- |
| NICE    | NicePosV205.dll                  | 신용카드, 현금영수증 |
| KSNET   | KSNet_ADSL.dll, KSNet_Dongle.ocx | 카드 승인            |
| KICC    | KiccDSC.ocx, Kicc.dll            | 카드, 서명패드       |
| KIS     | KisCatSSL.dll, KisvanMS3.ocx     | 카드, BC로열티       |
| SMARTRO | SmartroSign.dll, SmtSignOcx.ocx  | 카드, NFC, T-money   |
| FDIK    | fdikpos43.dll                    | KMPS 인터넷 결제     |
| JTNET   | NCPOS.dll, JTNetSPL.dll          | 카드, 서명패드       |
| KCP     | KCPOCX.ocx                       | 카드 결제            |
| KOCES   | -                                | 카드 결제            |
| KOVAN   | kovan_signpad.ocx                | 카드, 서명패드       |
| SPC     | SPCNSecuCAT.ocx, SPCN_Dongle.ocx | 카드 결제            |

### 5.3 하드웨어

| 장치             | 연결        | 용도        |
| ---------------- | ----------- | ----------- |
| 영수증 프린터    | 병렬/시리얼 | 영수증 출력 |
| 바코드 스캐너    | 시리얼      | 상품 스캔   |
| MSR 리더기       | 시리얼      | 카드 리딩   |
| CDP (고객표시기) | 시리얼      | 가격 표시   |
| 저울             | 시리얼      | 중량 계산   |
| 서명패드         | 시리얼/USB  | 전자서명    |
| 현금서랍         | 프린터 연동 | 현금 보관   |

### 5.4 외부 서비스

| 서비스        | 용도          | 프로토콜  |
| ------------- | ------------- | --------- |
| 카카오 알림톡 | 주문 알림     | HTTP REST |
| SMS           | 문자 발송     | HTTP      |
| FTP           | 데이터 동기화 | FTP       |
| TIPS 서버     | 본사 연동     | TCP/IP    |

## 6. 설정 파일 구조

### 6.1 config.ini 주요 섹션

- `[Application]` - 프로그램 기본 설정
- `[Server]` - DB 서버 연결 정보
- `[Version_Info]` - 버전 관리
- `[BarCodePrint]` - 바코드 프린터 설정
- `[HT_Trans]` - 핸디 터미널 전송 설정
- 기타 100+ 설정 항목

### 6.2 기타 INI 파일

| 파일          | 용도             |
| ------------- | ---------------- |
| FDIKPOS.INI   | FDIK VAN 설정    |
| kicc.ini      | KICC VAN 설정    |
| kftcpos.ini   | 금융결제원 설정  |
| Vcat_Info.ini | VCAT 단말기 정보 |

## 7. 프로그램 진입점

```vb
' Main.bas - Sub Main()
Sub Main()
    ' 1. 중복 실행 방지
    If App.PrevInstance Then Exit

    ' 2. INI 파일 로드 (Config.ini)
    SIniFile = App.Path & "\Config.ini"

    ' 3. DB 연결 시도
    If adoConnectDB(DBcon) = False Then
        ' SQL Server 실패 시 Access DB로 폴백
        If MDBConnect_DB(DBcon1, C_DBPath, C_Pass) = False Then
            ' 완전 실패
        End If
    End If

    ' 4. 로그인 화면 표시
    Frm_Login.Show vbModal
End Sub
```

## 8. 기술 부채 및 마이그레이션 고려사항

### 8.1 주요 기술 부채

1. **VB6 언어 제약**: 최신 .NET Framework 미지원
2. **전역 변수 남용**: 모듈 간 결합도 높음
3. **하드코딩된 값**: 상수, 경로, 메시지 등
4. **에러 처리 일관성 부족**: On Error GoTo 패턴 혼재
5. **코드 중복**: 유사 로직 반복 (특히 VAN별 폼)
6. **문자 인코딩**: EUC-KR 기반

### 8.2 마이그레이션 우선순위

1. **높음**: Mdl_Main.bas (전역 상태), DBConnection.bas (DB 연결)
2. **중간**: Mdl_Card_Dll.bas (결제), Mdl_Printer.bas (출력)
3. **낮음**: UI 폼 (개별 화면)

## 9. 문서 구조

| 파일                         | 내용                     |
| ---------------------------- | ------------------------ |
| `01-project-overview.md`     | 프로젝트 개요 (본 문서)  |
| `02-modules-analysis.md`     | 모듈(.bas) 상세 분석     |
| `03-forms-analysis.md`       | 폼(.frm) 상세 분석       |
| `04-payment-systems.md`      | VAN 결제 시스템 분석     |
| `05-database-schema.md`      | 데이터베이스 스키마 분석 |
| `06-hardware-integration.md` | 하드웨어 연동 분석       |
| `07-configuration.md`        | 설정 파일 분석           |
| `files/*.md`                 | 개별 파일 상세 분석      |
