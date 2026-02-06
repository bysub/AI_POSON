# VAN 결제 시스템 분석

## 1. 지원 VAN사 목록 (12개)

| VAN사       | 코드  | 폼 파일                     | DLL/OCX                            | 주요 기능          |
| ----------- | ----- | --------------------------- | ---------------------------------- | ------------------ |
| **NICE**    | NICE  | Frm_SaleCard_VCAT_NICE.frm  | NicePosV205.dll                    | 카드, 현금영수증   |
| **KSNET**   | KSNET | Frm_SaleCard_VCAT_KSNET.frm | KSNet_ADSL.dll, KSNet_Dongle.ocx   | 카드, 서명패드     |
| **KICC**    | KICC  | Frm_SaleCard_VCAT_KICC.frm  | KiccDSC.ocx, Kicc.dll              | 카드, 서명패드     |
| **KIS**     | KIS   | Frm_SaleCard_VCAT_KIS.frm   | KisCatSSL.dll, KisvanMS3.ocx       | 카드, BC로열티     |
| **SMARTRO** | SMT   | Frm_SaleCard_VCAT_SMT.frm   | SmartroSign.dll, SmtSndRcvVCAT.ocx | 카드, T-money, NFC |
| **FDIK**    | FDIK  | Frm_SaleCard_VCAT_FDIK.frm  | fdikpos43.dll                      | KMPS 인터넷 결제   |
| **JTNET**   | JTNET | Frm_SaleCard_VCAT_JTNET.frm | NCPOS.dll, JTNetSPL.dll            | 카드, 서명패드     |
| **KCP**     | KCP   | Frm_SaleCard_VCAT_KCP.frm   | KCPOCX.ocx                         | 카드               |
| **KOCES**   | KOCES | Frm_SaleCard_VCAT_KOCES.frm | -                                  | 카드               |
| **KOVAN**   | KOVAN | Frm_SaleCard_VCAT_KOVAN.frm | kovan_signpad.ocx                  | 카드, 서명패드     |
| **SPC**     | SPC   | Frm_SaleCard_VCAT_SPC.frm   | SPCNSecuCAT.ocx, SPCN_Dongle.ocx   | 카드               |
| **StarVAN** | SVK   | -                           | SvkPos.dll                         | 서명패드           |

## 2. VAN별 DLL/OCX 상세

### 2.1 NICE VAN

```
파일:
- NicePosV205.dll (메인 결제 DLL)
- libeay32_nice.dll (OpenSSL)
- main_nice.dll (보조 DLL)

함수:
Public Declare Function Pos_Send Lib "NicePosV205.dll" (
    ByRef strNiceIP As Byte,      ' VAN 서버 IP
    ByVal lngNicePort As Long,    ' VAN 서버 Port
    ByRef strSendData As Byte,    ' 전송 데이터
    ByRef strSendSignData As Byte,' 서명 데이터
    ByRef strReceveData As Byte   ' 응답 데이터
) As Long

설정 파일: NicePosVAN+.ini
```

### 2.2 KSNET VAN

```
파일:
- KSNet_ADSL.dll (메인 결제 DLL)
- KSNet_Dongle.ocx (동글 제어)

함수:
Public Declare Function ReqAppr Lib "KSNet_ADSL.dll" Alias "RequestApproval" (
    ByVal ipAddr As String,       ' VAN 서버 IP
    ByVal sPort As Integer,       ' VAN 서버 Port
    ByVal sMedia As Integer,      ' 매체 유형
    ByVal RequestMsg As String,   ' 요청 메시지
    ByVal RequestLen As Integer,  ' 요청 길이
    ByVal sRecvMsg As String,     ' 응답 메시지
    ByVal TimeOut As Integer,     ' 타임아웃
    ByVal options As Integer      ' 옵션
) As Long
```

### 2.3 KICC VAN

```
파일:
- KiccDSC.ocx (서명패드 제어)
- Kicc.dll / KiccPos.dll (결제 처리)

특징:
- OCX 컨트롤 기반
- 서명 데이터 이미지 변환

설정 파일: kicc.ini, KiccDllOption.ini
```

### 2.4 KIS VAN

```
파일:
- KisCatSSL.dll (SSL 통신)
- KisvanMS3.ocx (서명패드)
- KisvanMS32.dll (보조)
- libeay32KIS.dll / ssleay32KIS.dll (OpenSSL)

함수:
Public Declare Function VB_Kis_Approval Lib "KisCatSSL.dll" (
    ByRef SendData As Byte,
    ByVal SendLen As Long,
    ByVal signGubun As String,    ' 서명 구분
    ByRef imgData As Byte,        ' 서명 이미지
    ByVal imgSize As Long,
    ByRef RecvData As Byte
) As Long

Public Declare Function VB_Kis_RuleDownload Lib "KisCatSSL.dll" (
    ByRef SendData As Byte,
    ByVal SendLen As Long,
    ByVal FilePath As String,     ' 규칙 파일 경로
    ByRef RecvData As Byte
) As Long

특징:
- BC 로열티 연동 지원
- 규칙 파일 다운로드 기능
```

### 2.5 SMARTRO VAN

```
파일:
- SmartroSign.dll (메인)
- SmtSndRcvVCAT.ocx (통신 OCX)
- Dongle3X_SMARTRO.oca (동글)
- libeay32_smt.dll / ssleay32_smt.dll (OpenSSL)
- SmtSignOcx.ocx (서명패드)

함수:
' 기본 통신
Public Declare Function SMT_B_ConnSndRcv Lib "SmartroSign.dll" (
    ByVal sIP As String,
    ByVal nPort As Integer,
    ByVal sMSG As String,
    ByVal nLen As Integer,
    ByRef bResponse As Byte
) As Integer

' 동글 초기화
Public Declare Function SMT_Dongle_Initial Lib "SmartroSign.dll" (
    ByVal nFlag As Integer,
    ByRef sSignpadInfo As Byte
) As Integer

' 동글 시작/종료
Public Declare Function SMT_Dongle_Start Lib "SmartroSign.dll" (
    ByVal nPortNum As Integer,
    ByVal lBaud As Long
) As Integer
Public Declare Function SMT_Dongle_Stop Lib "SmartroSign.dll" () As Integer

' 서명 획득
Public Declare Function SMT_Get_Sign_Screen Lib "SmartroSign.dll" (
    ByVal sWorkKey As String,
    ByVal sKeyIdx As Byte,
    ByVal lAmt As Long,
    ByRef bSignData As Byte,
    ByRef bPadVersion As Byte,
    ByRef bHashData As Byte,
    ByVal sFilePath As String
) As Integer

' 키패드 입력
Public Declare Function SMT_Keypad_Input Lib "SmartroSign.dll" (
    ByRef bInputData As Byte,
    ByVal iFlag As Integer
) As Integer

' NFC 거래
Public Declare Function SMT_Ready_SaleTr Lib "SmartroSign.dll" (
    ByVal dwAmount As Long,
    ByVal ucpKey As String,
    ByVal ucKeyIndex As Byte,
    ByVal ucMember As String
) As Integer

' T-money 연동
Public Declare Function SMT_TMoney_PSamInfo Lib "SmartroSign.dll" ...
Public Declare Function SMT_TMoney_Balance Lib "SmartroSign.dll" ...
Public Declare Function SMT_TMoney_Pay Lib "SmartroSign.dll" ...
Public Declare Function SMT_TMoney_CANCEL_PURCHASE_DATA Lib "SmartroSign.dll" ...

' CashBee 연동
Public Declare Function SMT_CashBee_Balance Lib "SmartroSign.dll" ...
Public Declare Function SMT_CashBee_Pay Lib "SmartroSign.dll" ...
Public Declare Function SMT_CashBee_Load_Step1 Lib "SmartroSign.dll" ...
Public Declare Function SMT_CashBee_Load_Step2 Lib "SmartroSign.dll" ...
```

### 2.6 FDIK (KMPS) VAN

```
파일:
- fdikpos43.dll (메인)
- FDWebSignPad.ocx (웹 서명패드)
- POS4SignPAD_Ctl.dll / POS4SignPAD_View.dll (서명패드)

함수:
' 신용카드 승인
Public Declare Function FDIK_CreditAuth_Simple Lib "fdikpos43.dll" (
    ByVal in_terminal_number As String,
    ByVal in_sequence_number As String,
    ByVal in_pos_initial As String,
    ByVal in_temp_info As String,
    ByVal in_credit_info As String,
    ByVal in_credit_input_type As String,
    ByVal in_install_period As String,
    ByVal in_total_amount As String,
    ByVal in_service_amount As String,
    ByVal in_tax_amount As String,
    ByVal in_ocb_info As String,
    ByVal in_ocb_input_type As String,
    ByVal in_sign_compress_method As String,
    ByVal in_sign_mac As String,
    ByRef in_sign_data As Byte,
    ByVal out_print_flag As String,
    ByVal out_res_code As String,
    ByVal out_auth_number As String,
    ... ' 다수 출력 파라미터
) As Integer

' 신용카드 취소
Public Declare Function FDIK_CreditCancel_Simple Lib "fdikpos43.dll" ...

' OCB 포인트 적립
Public Declare Function FDIK_OCBSave_Simple Lib "fdikpos43.dll" ...

' OCB 포인트 사용
Public Declare Function FDIK_PointUse_Simple Lib "fdikpos43.dll" ...

' 현금영수증
Public Declare Function FDIK_CashReceiptAuth Lib "fdikpos43.dll" ...
Public Declare Function FDIK_CashReceiptCancelEx Lib "fdikpos43.dll" ...

' 수표 조회
Public Declare Function FDIK_Checks Lib "fdikpos43.dll" ...

' 네트워크 체크
Public Declare Function FDIK_Network Lib "fdikpos43.dll" ...

' 단말기 번호 읽기
Public Declare Function FDIK_ReadTerminalNumber Lib "fdikpos43.dll" ...

설정 파일: FDIKPOS.INI, fdikpos.dat
```

### 2.7 JTNET VAN

```
파일:
- NCPOS.dll (메인)
- JTNetSPL.dll (서명패드)

함수:
' 서명 획득
Public Declare Function NCPAD_SIGN Lib "JTNetSPL.dll" (
    ByVal nPort As Long,
    ByVal nMoney As Long,
    ByVal strMsg As String,
    ByVal strFileName As String,
    ByVal strRet As String
) As Integer

' PIN 입력
Public Declare Function NCPAD_PIN Lib "JTNetSPL.dll" (
    ByVal nPort As Long,
    ByVal nMoney As Long,
    ByVal strMsg As String,
    ByVal strRet As String
) As Integer

' 카드번호 암호화
Public Declare Function cryptCard Lib "NCPOS.dll" (
    ByVal i_Flag As Integer,      ' ENCRYPT/DECRYPT
    ByVal i_key_idx As Long,      ' 키 인덱스 (1~99)
    ByVal strTrack2 As String,    ' 카드번호+유효기간
    ByVal strRet As String        ' 결과
) As Integer

' 데이터 처리
Public Declare Function DataProcess Lib "NCPOS.dll" (
    ByVal strIp As String,
    ByVal lPort As Long,
    ByVal StrCard As String,
    ByVal strRet As String
) As Boolean
```

## 3. 결제 흐름

### 3.1 신용카드 승인 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   POS UI    │────>│  VAN DLL    │────>│  VAN Server │
│             │<────│             │<────│             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │ 1. 카드 리딩     │                    │
      │ 2. 금액 입력     │                    │
      │                   │ 3. 전문 생성      │
      │                   │ 4. 서명 획득      │
      │                   │ 5. 승인 요청 ───>│
      │                   │                    │ 6. 카드사 연동
      │                   │ 7. 응답 수신 <───│
      │ 8. 결과 표시     │                    │
      │ 9. 영수증 출력   │                    │
```

### 3.2 공통 승인 요청 데이터

```
승인 요청 전문:
- 단말기 번호 (Terminal ID)
- 거래 일련번호 (Sequence Number)
- POS 식별자 (POS Initial)
- 거래 유형 (승인/취소/조회)
- 카드 정보 (Track2 데이터)
- 카드 입력 방식 (스와이프/IC/키인)
- 할부 개월 (일시불: 00)
- 거래 금액 (총액/봉사료/부가세)
- 서명 데이터 (압축, 해시)

승인 응답 전문:
- 응답 코드 (0000: 정상)
- 승인 번호
- 승인 일시
- 카드사 코드/명
- 매입사 코드/명
- 가맹점 번호
- 메시지
```

### 3.3 현금영수증 흐름

```
1. 식별번호 입력 (휴대폰/카드)
2. 거래 유형 선택 (소득공제/지출증빙)
3. 금액 입력
4. VAN 전송
5. 국세청 연동
6. 승인번호 수신
7. 영수증 출력
```

## 4. 서명패드 연동

### 4.1 지원 서명패드

| 제조사  | 모델       | VAN   | 연동 방식 |
| ------- | ---------- | ----- | --------- |
| NICE    | -          | NICE  | DLL 내장  |
| KSNET   | Dongle     | KSNET | OCX       |
| KICC    | DSC        | KICC  | OCX       |
| KIS     | -          | KIS   | OCX       |
| SMARTRO | D250, D350 | SMT   | DLL       |
| FDIK    | SignPad    | FDIK  | OCX       |
| JTNET   | SPL        | JTNET | DLL       |
| StarVan | -          | SVK   | DLL       |
| KOVAN   | -          | KOVAN | OCX       |

### 4.2 서명 데이터 처리

```vb
' 서명 데이터 구조
- 좌표 데이터: X,Y 좌표 배열
- 압축 방식: LZ, RLE 등
- 이미지 변환: BMP 파일로 저장
- 해시값: 무결성 검증용

' 일반적인 처리 흐름
1. 서명패드 초기화
2. 서명 화면 표시 (금액 표시)
3. 서명 입력 대기
4. 서명 데이터 획득
5. 압축 및 해시 생성
6. 승인 요청에 포함
7. 이미지 파일 저장 (선택)
```

## 5. 보안 관련

### 5.1 카드 정보 암호화

```
- Track2 데이터 암호화
- PIN 블록 암호화
- 키 인덱스 관리 (1~99)
- 작업 키 (Working Key) 사용
```

### 5.2 SSL/TLS 통신

```
사용 라이브러리:
- libeay32.dll (OpenSSL)
- ssleay32.dll (OpenSSL)
- VAN별 커스텀 (libeay32_nice.dll 등)
```

### 5.3 PCI-DSS 준수 항목

```
- 카드번호 평문 저장 금지
- 로그에 민감정보 마스킹
- 네트워크 암호화 필수
- 정기 보안 업데이트
```

## 6. 설정 파일

| VAN     | 설정 파일                   | 주요 설정        |
| ------- | --------------------------- | ---------------- |
| NICE    | NicePosVAN+.ini             | 서버 IP/Port     |
| KSNET   | -                           | 코드 내장        |
| KICC    | kicc.ini, KiccDllOption.ini | 단말기 설정      |
| KIS     | KposSign.ini                | 서명패드 설정    |
| SMARTRO | -                           | 코드 내장        |
| FDIK    | FDIKPOS.INI, fdikpos.dat    | 단말기/거래 정보 |
| JTNET   | -                           | 코드 내장        |
| SPC     | SvkPosCfg.ini               | 서버 설정        |

## 7. 마이그레이션 전략

### 7.1 Strategy Pattern 적용

```javascript
// 결제 전략 인터페이스
interface PaymentStrategy {
  authorize(paymentData: PaymentRequest): Promise<PaymentResponse>;
  cancel(transactionId: string): Promise<CancelResponse>;
  refund(transactionId: string, amount: number): Promise<RefundResponse>;
  encrypt(data: string): string;
  decrypt(data: string): string;
}

// VAN별 구현
class NicePaymentStrategy implements PaymentStrategy { ... }
class KsnetPaymentStrategy implements PaymentStrategy { ... }
class KiccPaymentStrategy implements PaymentStrategy { ... }
// ... 12개 VAN 구현

// PaymentService
class PaymentService {
  private strategies: Map<string, PaymentStrategy>;

  async processPayment(vanCode: string, data: PaymentRequest) {
    const strategy = this.strategies.get(vanCode);
    return strategy.authorize(data);
  }
}
```

### 7.2 Circuit Breaker 패턴

```javascript
class VanCircuitBreaker {
  constructor(vanCode, options = {
    failureThreshold: 5,    // 5회 실패 시 Open
    successThreshold: 3,    // 3회 성공 시 Close
    timeout: 30000,         // 30초 타임아웃
    halfOpenRequests: 1     // Half-Open 상태 요청 수
  });

  async execute(requestFn) {
    switch (this.state) {
      case 'CLOSED':
        // 정상 요청
      case 'OPEN':
        // 즉시 실패 반환
      case 'HALF_OPEN':
        // 제한된 요청 허용
    }
  }
}
```

### 7.3 API 기반 전환

```
DLL 직접 호출 → REST API 연동

장점:
- 플랫폼 독립성
- 업데이트 용이
- 로깅/모니터링 개선

고려사항:
- VAN사 API 지원 확인 필요
- 일부 VAN은 여전히 DLL 필요할 수 있음
- 하이브리드 접근 (API + Native 모듈)
```
