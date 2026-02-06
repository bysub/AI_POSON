# 설정 파일 분석

## 1. 설정 파일 개요

### 1.1 주요 설정 파일

| 파일명         | 용도             | 위치               |
| -------------- | ---------------- | ------------------ |
| **config.ini** | 메인 설정 파일   | 프로그램 실행 경로 |
| FDIKPOS.INI    | FDIK VAN 설정    | 프로그램 실행 경로 |
| kicc.ini       | KICC VAN 설정    | 프로그램 실행 경로 |
| kftcpos.ini    | 금융결제원 설정  | 프로그램 실행 경로 |
| Vcat_Info.ini  | VCAT 단말기 정보 | 프로그램 실행 경로 |

### 1.2 INI 파일 접근 방식

```vb
' Moon_Function.dll 사용
mfun.READ_INI(Section, Key, FilePath)  ' 읽기
mfun.WRITE_INI(Section, Key, Value, FilePath)  ' 쓰기
```

## 2. config.ini 상세 구조

### 2.1 [Application] 섹션 - 프로그램 기본 설정

| 키           | 설명             | 예시값                             |
| ------------ | ---------------- | ---------------------------------- |
| FileName     | 파일명           | (빈값)                             |
| BasePicture  | 기본 배경 이미지 | (빈값)                             |
| Log          | 로그 사용 여부   | 1                                  |
| ProgramName  | 프로그램 이름    | 천우마트                           |
| FilePath     | 파일 경로        | (빈값)                             |
| HandyPath    | 핸디 터미널 경로 | C:\handy                           |
| PDAPath      | PDA 경로         | C:\Program Files\TIPS\FileTransfer |
| CMSPath      | CMS 경로         | C:\cms                             |
| Pos_Num      | POS 번호         | 1                                  |
| Server_Num   | 서버 번호        | E                                  |
| DPath        | 데이터 경로      | C:\Program Files\TIPS\T_Data       |
| Internet     | 인터넷 사용      | 1                                  |
| SMS          | SMS 사용         | 1                                  |
| Tran_YN      | 트랜잭션 여부    | 0                                  |
| Font_Add     | 폰트 추가        | 1                                  |
| PurChase     | 매입 기능        | 1                                  |
| Order        | 주문 기능        | 1                                  |
| Log_DEL_YN   | 로그 삭제 여부   | 1                                  |
| Log_DEL_DATE | 로그 삭제 일자   | 2018-12-12 16:20:27                |

### 2.2 [Server] 섹션 - 데이터베이스 서버 연결

| 키                | 설명                                  | 예시값         |
| ----------------- | ------------------------------------- | -------------- |
| Server_Info       | 서버 정보 구분                        | 2              |
| Server_State      | 서버 상태                             | 1              |
| **Server_IP**     | SQL Server IP                         | 192.168.10.48  |
| **Server_Fort**   | SQL Server 포트                       | 1433           |
| **Catalog**       | 데이터베이스 이름                     | TIPS           |
| **Server_UserID** | DB 사용자 ID                          | sa             |
| **Server_Pwd**    | DB 비밀번호                           | ****\*****     |
| Server_Type       | 서버 유형 (0: SQL Server, 1: LocalDB) | 0              |
| TServer_IP        | TIPS 서버 IP                          | 122.49.118.102 |
| TServer_Fort      | TIPS 서버 포트                        | 18971          |
| Host_IP           | 호스트 IP                             | 122.49.118.102 |
| Host_Fort         | 호스트 포트                           | 8674           |
| FTP_IP            | FTP 서버 IP                           | 122.49.118.102 |
| FTP_Fort          | FTP 포트                              | 8000           |
| WServer_IP        | 웹 서버 IP                            | 14.38.161.45   |
| WServer_Fort      | 웹 서버 포트                          | 18975          |

### 2.3 [Version_Info] 섹션 - 버전 관리

| 키             | 설명           | 예시값  |
| -------------- | -------------- | ------- |
| Sys_Gubun      | 시스템 구분    | 1       |
| Loc_Version    | 로컬 버전      | 1.1.184 |
| Svr_Version    | 서버 버전      | 1.1.184 |
| POP_Ver        | POP 버전       | 10000   |
| AS_CALL_chk    | AS 호출 체크   | 0       |
| Shop_First_chk | 매장 최초 체크 | 0       |

### 2.4 [BarCodePrint] 섹션 - 바코드/라벨 프린터

| 키           | 설명           | 예시값 |
| ------------ | -------------- | ------ |
| P_Fort       | 프린터 포트    | 8671   |
| H            | 라벨 높이      | 30     |
| W            | 라벨 너비      | 58     |
| PORT         | 시리얼 포트    | 5      |
| LABEL        | 라벨 유형      | 0      |
| LABELTYPE    | 라벨 타입      | 5      |
| GAP          | 라벨 간격      | 3      |
| BPS          | 전송속도       | 9600   |
| TTP243_Dealy | TTP-243 딜레이 | 600    |
| SRP770_Dealy | SRP-770 딜레이 | 300    |
| LKB30_Dealy  | LK-B30 딜레이  | 300    |
| LKP30_Dealy  | LK-P30 딜레이  | 300    |

### 2.5 [TTP-243] 섹션 - TTP-243 프린터 설정

| 키        | 설명             | 예시값 |
| --------- | ---------------- | ------ |
| GNAMEXY   | 상품명 좌표      | 45,25  |
| GNAMES    | 상품명 폰트      | K      |
| GNAMEH/V  | 상품명 폰트 크기 | 2,2    |
| BARCODEXY | 바코드 좌표      | 45,135 |
| BARCODES  | 바코드 타입      | 48     |
| PRICEXY   | 가격 좌표        | 195,85 |

### 2.6 [SRP-770] 섹션 - SRP-770 프린터 설정

| 키        | 설명        | 예시값 |
| --------- | ----------- | ------ |
| GNAMEXY   | 상품명 좌표 | 3,1    |
| GNAMES    | 상품명 폰트 | a      |
| BARCODEXY | 바코드 좌표 | 20,4   |
| BARCODEH  | 바코드 높이 | 20     |

### 2.7 [LK-B30], [LK-P30] 섹션 - LK 시리즈 프린터

각 라벨 프린터 모델별로 상세 설정 포함:

- 좌표 (XY)
- 폰트 (S)
- 회전 (R)
- 가로/세로 크기 (H/V)
- 볼드 (B)
- 밀도 (DENSITY)
- 속도 (SPEED)

### 2.8 [HT_Trans] 섹션 - 핸디 터미널 전송

| 키            | 설명        | 예시값     |
| ------------- | ----------- | ---------- |
| BCP_USE       | BCP 사용    | 1          |
| ALL_Tran      | 전체 전송   | 1          |
| Send_Date     | 전송 일자   | 2021-02-09 |
| BARCODE_Check | 바코드 체크 | 1          |

### 2.9 [Customer] 섹션 - 고객 설정

| 키      | 설명          | 예시값 |
| ------- | ------------- | ------ |
| CusNum1 | 고객번호 키 1 | 38     |
| CusNum2 | 고객번호 키 2 | 35     |
| CusNum3 | 고객번호 키 3 | 36     |
| CusNum4 | 고객번호 키 4 | 37     |

### 2.10 [Length] 섹션 - 길이 설정

| 키         | 설명           | 예시값 |
| ---------- | -------------- | ------ |
| BarCodeLen | 바코드 길이    | 95     |
| ScaleLen   | 중량 코드 길이 | 4      |

### 2.11 [SuSu] 섹션 - 수수료 설정

| 키       | 설명          | 예시값 |
| -------- | ------------- | ------ |
| Card     | 카드 수수료   | 0      |
| Point    | 포인트 수수료 | 0      |
| CashBack | 캐시백 수수료 | 0      |
| Cash     | 현금 수수료   | 0      |
| CashRate | 현금 비율     | 0      |

## 3. 프로그램 내 설정 구조체

### 3.1 Login 타입 (로그인 정보)

```vb
Type Login
    name As String        ' 판매자명
    id As String          ' 판매자 ID
    Pass As String        ' 비밀번호
    OpenNum As String     ' 개점번호
    Grant() As String     ' 권한 배열 (18개 항목)
    SALEMENU_PWD As String ' 판매메뉴 비밀번호
    Admin_Gubun As String  ' 관리자 구분 (0:일반, 1:관리자)
End Type
```

### 3.2 DB 타입 (데이터베이스 연결)

```vb
Type DB
    Type As Integer       ' 유형
    name As String        ' 사용자명
    Pass As String        ' 비밀번호
    IP As String          ' 서버 IP
    Port As String        ' 포트
    DataBase As String    ' 데이터베이스명
    Server_Type As String ' 서버 타입 (0: SQL Server, 1: LocalDB)
End Type
```

### 3.3 Shop 타입 (매장 정보)

```vb
Type Shop
    Ver As String         ' 버전
    Code As String        ' 매장 코드
    name As String        ' 상호명
    Number As String      ' 사업자 번호
    Address As String     ' 주소
    Owner As String       ' 대표자
    Tel As String         ' 전화번호
    Top1~5 As String      ' 영수증 상단 메시지 1~5
    Buttom1~5 As String   ' 영수증 하단 메시지 1~5
    MEM1~3 As String      ' 회원 판매 메시지
    Prn_Name As String    ' 프린터용 상호명

    ' 알림톡/SMS 설정
    SMS_ShopName As String
    Online_KEY As String
    SMS_YN As String
    AUTO_SMS_YN As String
    Push_YN As String

    ' 카카오/SNS 설정
    self_SNSGubun As String  ' 0: 문자, 1: 카카오
End Type
```

### 3.4 Terminal 타입 (단말기 설정)

```vb
Type Terminal
    Type As Integer        ' 단말기 유형
    PosNo As String * 2    ' POS 번호
    AdminPosNo As String   ' 관리 POS 번호
    CashDraw As Integer    ' 현금서랍 사용
    Touch As Integer       ' 터치 사용
    Dual As Integer        ' 듀얼 모니터 사용
    Printer As Integer     ' 프린터 유형
    PrinterPort As Integer ' 프린터 포트
    PrinterBps As Long     ' 프린터 속도
    PrinterGubun As Integer ' 프린터 구분 (0:병렬, 1:시리얼)
    ScanPort As Integer    ' 스캐너 포트
    CDPPort As Integer     ' CDP 포트
    CDPName As String      ' CDP 이름
    MSR_PORT As Integer    ' MSR 포트
    Moniter As Integer     ' 메인 모니터 해상도
    SMoniter As Integer    ' 서브 모니터 해상도

    ' 주방프린터
    kitchenPrint As Integer
    kitchenPrinterPort As Integer
    kitchenPrinterBps As Long

    ' 호출벨
    Bell_YN As String
    Bell_ComPort As Integer
End Type
```

### 3.5 C_Config 타입 (POS 환경설정)

```vb
Type C_Config
    ' 판매 설정
    Price_Edit As Integer      ' 판매시 가격 수정
    Product_CashOpen As Integer ' 미등록시 서랍 열림
    Product_Sound As Integer   ' 미등록 상품 소리

    ' 보안 설정
    SCAN_REAL_Chk As String    ' 상품 스캔시 확인
    OFF_CARD_Chk As String     ' 오프라인 카드 번호 입력
    MIN_CARD_PRICE As String   ' 카드 최소 금액

    ' 셀프POS 설정 (100+ 항목)
    Self_YN As String          ' 셀프POS 사용
    Self_Bell As String        ' 벨 안내
    Self_STLGoods As String    ' 신호등 사용
    self_ScalePort As String   ' 저울 포트
    self_Cash As String        ' 현금계수기 사용
    self_CashPort As String    ' 현금계수기 포트

    ' 카카오/알림 설정
    self_Kakao As String       ' 카카오 알림
    Self_UserCall As String    ' 관리자 호출

    ' 자동 설정
    Auto_Open_YN As String     ' 자동 개점
    Auto_ID As String          ' 자동 개점 ID
    Auto_Pass As String        ' 자동 개점 비밀번호
    Auto_finish_YN As String   ' 자동 폐점
End Type
```

### 3.6 S_Config 타입 (서버 환경설정)

```vb
Type S_Config
    Group_Print As Integer     ' 영수증 분류별 소계
    Group_Sel As Integer       ' 대분류/중분류 선택
    Money As Integer           ' 영수증 금액 소수점
    NewProduct As Integer      ' 판매시 신상품 등록
    PrintLine As Integer       ' 영수증 상품 1줄 표시
    Cash_Pass As Integer       ' 환불시 비밀번호

    ' VAN 설정
    CardVan_Use As Integer     ' VAN 사용
    VAN_name As String         ' VAN 이름
    VAN_ID As String           ' VAN ID
    VAN_Code As String         ' VAN 코드
    VAN_SSL As String          ' SSL 사용

    ' 포인트 설정
    Point_Chk As Integer       ' 포인트 사용
    Point_Rate As String       ' 포인트 적립률
    Point_Use_Min As String    ' 최소 사용 포인트

    ' 회원 설정
    Mem_DC_Use As Integer      ' 회원 할인 사용
    Mem_DC_Rate As String      ' 회원 할인율

    ' 재고/바코드 설정
    Scale_18_YN As String      ' 18자 중량 바코드
    Scale_PriceCut As Integer  ' 중량 가격 절사
End Type
```

## 4. VAN별 설정 파일

### 4.1 FDIKPOS.INI

```ini
[VAN]
MerchantID=상점ID
TerminalID=단말기ID
APIKey=API키
SSL=1
Timeout=30000
```

### 4.2 kicc.ini

```ini
[KICC]
TID=단말기ID
MID=가맹점ID
SIGNPAD_USE=1
SIGNPAD_PORT=COM3
```

### 4.3 kftcpos.ini

```ini
[KFTC]
BankCode=은행코드
AccountNo=계좌번호
```

### 4.4 Vcat_Info.ini

```ini
[VCAT]
ModelType=모델유형
SerialNo=시리얼번호
FirmwareVer=펌웨어버전
```

## 5. 설정 로드 로직

### 5.1 Mdl_Main.bas 설정 로드 함수

```vb
' Main.bas에서 호출
Public Sub Load_Config()
    INI_Path = App.Path & "\Config.ini"

    ' 서버 설정 로드
    DB.IP = mfun.READ_INI("Server", "Server_IP", INI_Path)
    DB.Port = mfun.READ_INI("Server", "Server_Fort", INI_Path)
    DB.DataBase = mfun.READ_INI("Server", "Catalog", INI_Path)
    DB.name = mfun.READ_INI("Server", "Server_UserID", INI_Path)
    DB.Pass = mfun.READ_INI("Server", "Server_Pwd", INI_Path)

    ' 버전 정보 로드
    Shop.Ver = mfun.READ_INI("Version_Info", "Loc_Version", INI_Path)

    ' 터미널 설정 로드
    Terminal.PosNo = mfun.READ_INI("Application", "Pos_Num", INI_Path)
    Terminal.PrinterPort = mfun.READ_INI("Terminal", "PrinterPort", INI_Path)
    ' ... 수백 개의 설정 항목 로드
End Sub
```

## 6. 마이그레이션 고려사항

### 6.1 환경 변수 기반 전환

INI 파일 → .env 파일 전환:

```env
# .env (Node.js)

# Database
DB_SERVER=192.168.10.48
DB_PORT=1433
DB_NAME=TIPS
DB_USER=sa
DB_PASSWORD=encrypted_password

# Application
APP_NAME=POSON_POS
APP_VERSION=2.0.0
LOG_ENABLED=true

# VAN Settings
VAN_PROVIDER=NICE
VAN_MERCHANT_ID=xxxx
VAN_TERMINAL_ID=xxxx

# Hardware
PRINTER_TYPE=serial
PRINTER_PORT=COM1
PRINTER_BAUDRATE=9600

SCANNER_PORT=COM2
CDP_PORT=COM3
```

### 6.2 설정 검증 스키마

```typescript
// config.schema.ts
import Joi from 'joi';

const configSchema = Joi.object({
    database: Joi.object({
        server: Joi.string().ip().required(),
        port: Joi.number().port().default(1433),
        name: Joi.string().required(),
        user: Joi.string().required(),
        password: Joi.string().required()
    }),
    terminal: Joi.object({
        posNo: Joi.string().length(2).required(),
        printerType: Joi.string().valid('parallel', 'serial', 'usb'),
        printerPort: Joi.number().min(1).max(20)
    }),
    van: Joi.object({
        provider: Joi.string().valid('NICE', 'KSNET', 'KICC', ...),
        merchantId: Joi.string().required(),
        terminalId: Joi.string().required()
    })
});
```

### 6.3 설정 관리 서비스

```typescript
// config.service.ts
class ConfigService {
  private config: AppConfig;

  async load(): Promise<void> {
    // 환경 변수에서 로드
    this.config = {
      database: {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT),
        // ...
      },
      // ...
    };

    // 검증
    await this.validate();
  }

  get<T>(key: string): T {
    return this.config[key];
  }

  async save(key: string, value: any): Promise<void> {
    // 설정 저장 (DB 또는 파일)
  }
}
```

### 6.4 민감 정보 암호화

```typescript
// 비밀번호, API 키 등 암호화 저장
import { createCipheriv, createDecipheriv } from "crypto";

class SecureConfig {
  private key: Buffer;
  private iv: Buffer;

  encrypt(text: string): string {
    const cipher = createCipheriv("aes-256-cbc", this.key, this.iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  decrypt(encrypted: string): string {
    const decipher = createDecipheriv("aes-256-cbc", this.key, this.iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
```
