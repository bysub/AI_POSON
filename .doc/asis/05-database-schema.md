# 데이터베이스 스키마 분석

## 1. 데이터베이스 구성 개요

### 1.1 데이터베이스 시스템

| 구분            | 유형       | 용도          | 연결 방식        |
| --------------- | ---------- | ------------- | ---------------- |
| **Primary**     | SQL Server | 메인 운영 DB  | ADODB (SQLOLEDB) |
| **Fallback**    | MS Access  | 오프라인/백업 | Jet OLEDB 4.0    |
| **Transaction** | SQL Server | 트랜잭션 로그 | ADODB            |

### 1.2 연결 객체

```vb
' Mdl_Main.bas에서 정의된 전역 연결 객체
Public DBCON As ADODB.Connection   ' SQL Server 메인 연결
Public DBCON1 As ADODB.Connection  ' MS Access 연결
Public Tran_DB As ADODB.Connection ' 트랜잭션 전용 연결
Public rs As ADODB.Recordset       ' 공용 레코드셋
```

## 2. 테이블 구조

### 2.1 동적 생성 테이블 (월별)

`Mdl_Create_Table.bas`에서 월별로 동적 생성되는 테이블들:

#### LastST\_{YYYYMM} - 이월재고 테이블

```sql
CREATE TABLE LastSt_{YYYYMM} (
    [BarCode] NVARCHAR(40) NOT NULL PRIMARY KEY,
    [L_Code] NVARCHAR(3) DEFAULT (''),      -- 대분류 코드
    [L_Name] NVARCHAR(20) DEFAULT (''),     -- 대분류명
    [M_Code] NVARCHAR(3) DEFAULT (''),      -- 중분류 코드
    [M_Name] NVARCHAR(20) DEFAULT (''),     -- 중분류명
    [S_Code] NVARCHAR(3) DEFAULT (''),      -- 소분류 코드
    [S_Name] NVARCHAR(50) DEFAULT (''),     -- 소분류명
    [Office_Code] NVARCHAR(5) DEFAULT (''), -- 거래처 코드
    [Real_Sto] INT DEFAULT (0),             -- 실재고
    [Pur_Pri] DECIMAL(18,2) DEFAULT (0),    -- 매입단가
    [In_Pri] DECIMAL(18,2) DEFAULT (0),     -- 총매입
    [Sell_Pri] DECIMAL(18,2) DEFAULT (0),   -- 판매단가
    [In_SellPri] DECIMAL(18,2) DEFAULT (0), -- 총판매
    [In_TCNT] DECIMAL(18,0) DEFAULT (0),    -- 입고수량
    [In_TPRI] DECIMAL(18,2) DEFAULT (0),    -- 입고금액
    [Sa_TCNT] DECIMAL(18,0) DEFAULT (0),    -- 판매수량
    [Sa_TPRI] DECIMAL(18,2) DEFAULT (0)     -- 판매금액
)
```

#### SaD\_{YYYYMM} - 판매 상세 테이블

```sql
-- 판매 상세 데이터 저장 (일별 판매 내역)
-- 주요 필드: Barcode, Sale_Count, Tsell_Pri, Tsell_repri
```

#### SaT\_{YYYYMM} - 판매 총계 테이블

```sql
-- 판매 총계 데이터 저장 (일별 집계)
```

#### InD\_{YYYYMM} - 입고 상세 테이블

```sql
-- 입고 상세 데이터 저장
-- 주요 필드: Barcode, In_Count, In_Pri
```

#### InT\_{YYYYMM} - 입고 총계 테이블

```sql
-- 입고 총계 데이터 저장
-- 주요 필드: In_Date, TTPur_Pri, TFPur_Pri, TSell_Pri, Profit_Pri
```

#### StSetD\_{YYYYMM} - 재고조정 테이블

```sql
-- 재고 조정 데이터 저장
-- 주요 필드: Barcode, StSet_Count, In_Pri
```

#### DF\_{YYYYMM} - 일계 테이블

```sql
-- 일일 마감 데이터
-- 주요 필드: Sale_Date, TTPur_Pri, TPur_Pri, TProfit_Pri, TProfit_Rate
```

### 2.2 마스터 테이블

#### Goods - 상품 마스터

```sql
-- 상품 기본 정보
- BarCode       : 바코드 (PK)
- L_Code/L_Name : 대분류
- M_Code/M_Name : 중분류
- S_Code/S_Name : 소분류
- Bus_Code      : 거래처 코드
- PUR_PRI       : 매입가
- SELL_PRI      : 판매가
- BOX_USE       : 박스 사용 여부
- PACK_USE      : 팩 사용 여부
- BARCODE1      : 박스 상품 개별 바코드
- OBTAIN        : 박스당 수량
```

#### Bundle - 묶음상품 테이블

```sql
-- 묶음/세트 상품 구성
- P_BARCODE     : 부모 상품 바코드
- C_BARCODE     : 자식 상품 바코드
- G_COUNT       : 구성 수량
```

#### Office_Manage - 거래처 관리

```sql
-- 거래처 정보
- Office_Code   : 거래처 코드
- Office_Name   : 거래처명
- Office_Use    : 사용 여부 (1=사용)
- Office_Sec    : 거래처 구분
```

#### SdD_Total - 반품 상세 테이블

```sql
-- 반품 내역 저장
- Barcode       : 상품 바코드
- Ds_Date       : 반품 일자
- Ds_Count      : 반품 수량
- TSell_Pri     : 반품 금액
```

#### Stock_Discard - 재고 폐기 테이블

```sql
-- 폐기/소비 재고 관리
- Barcode       : 상품 바코드
- SD_DATE       : 폐기 일자
- SD_COUNT      : 폐기 수량
- SD_SellPri    : 폐기 금액
- DEL_YN        : 삭제 여부 ('0'=미삭제)
```

### 2.3 회원/고객 테이블

#### Customer (추정)

```sql
-- 회원 정보 관리
- MEM_CODE      : 회원 코드
- MEM_NAME      : 회원명
- MEM_HP        : 휴대폰 번호
- MEM_POINT     : 적립 포인트
- MEM_GRADE     : 회원 등급
```

### 2.4 결제/정산 테이블

#### Card Transaction (카드 거래 로그)

```sql
-- 카드 결제 내역
- Card_Sql 변수에 저장되는 쿼리로 처리
```

#### Tax Receipt (현금영수증)

```sql
-- 현금영수증 발급 내역
- Tax_Sql 변수에 저장되는 쿼리로 처리
```

#### CashBag (캐시백)

```sql
-- 캐시백/포인트 거래 내역
- CashBag_Sql, CashBag_Sql1 변수로 처리
```

## 3. 시스템 테이블 조회

### 3.1 테이블 존재 확인

```sql
-- sysobjects에서 테이블 존재 확인
SELECT Count(*) FROM sysobjects
WHERE xtype='U' AND name = '{Table_Name}'
```

### 3.2 인덱스 존재 확인

```sql
-- sysindexes에서 인덱스 확인
SELECT Count(*) FROM sysindexes
WHERE name = '{Index_Name}'
```

### 3.3 저장 프로시저 확인

```sql
-- SP 존재 확인
SELECT count(*) cnt FROM sysobjects
WHERE (xtype='p' or xtype='pc') AND id=object_id('MM_Table_Create')
```

## 4. 데이터 처리 패턴

### 4.1 이월재고 계산 로직

`sub이월테이블데이터`에서 복잡한 이월재고 계산:

```sql
-- 이월재고 = 전월재고 - 판매수량 - 반품수량 + 입고수량 + 재고조정 - 폐기수량
Last_STO = ISNULL(B.Last_STO,0)
         - ISNULL(C.SaD_Count,0)     -- 판매
         - ISNULL(SD.SdD_Count,0)    -- 반품
         + ISNULL(D.InD_Count,0)     -- 입고
         + ISNULL(E.StSet_Count,0)   -- 재고조정
         - ISNULL(F.BP_SaD_Count,0)  -- 박스/팩 판매
         - ISNULL(SDF.BP_SdD_Count,0)-- 박스/팩 반품
         + ISNULL(G.BP_InD_Count,0)  -- 박스/팩 입고
         - ISNULL(Q.SD_COUNT,0)      -- 폐기
         - ISNULL(W.BP_SD_Count,0)   -- 박스/팩 폐기
```

### 4.2 매입가/판매가 평균 계산

```sql
-- 매입단가 = 총매입금액 / 총입고수량
매입단가 = CASE
    WHEN (In_TCNT + InD_Count + BP_InD_Count) <> 0
    THEN ABS((In_TTPRI + InD_Pri + BP_InD_Pri) / (In_TCNT + InD_Count + BP_InD_Count))
    ELSE 0
END

-- 판매단가 = 총판매금액 / 총판매수량
판매단가 = CASE
    WHEN (Sa_TCNT + SaD_Count + SdD_Count + BP_SaD_Count + BP_SdD_Count) <> 0
    THEN ABS((Sa_TTPRI + SaD_Pri + SdD_Pri + BP_SaD_Pri + BP_SdD_Pri) /
             (Sa_TCNT + SaD_Count + SdD_Count + BP_SaD_Count + BP_SdD_Count))
    ELSE 0
END
```

### 4.3 매입 갱신 로직

`sub매입갱신`에서 일별 매입 정보 갱신:

```sql
UPDATE DF_{YYYYMM} SET
    TTPur_Pri = ISNULL(과세매입,0),
    TFPur_Pri = ISNULL(면세매입,0),
    TPur_Pri = ISNULL(매입금액,0),
    TPSell_Pri = ISNULL(매입판매금액,0),
    TProfit_Pri = ISNULL(매입마진이익,0),
    TProfit_Rate = ISNULL(매입마진이율,0),
    -- ... 추가 필드
FROM DF_{YYYYMM} A
LEFT JOIN (
    SELECT In_Date,
           Sum(TTPur_Pri) '과세매입',
           Sum(TFPur_Pri) '면세매입',
           -- ... 집계 쿼리
    FROM InT_{YYYYMM}
    WHERE In_Date = '{날짜}'
    GROUP BY In_Date
) B ON A.Sale_Date = B.In_Date
```

## 5. 연결 설정

### 5.1 SQL Server 연결 문자열

```vb
' DBConnection.bas
ConnStr = "Provider=SQLOLEDB;" & _
          "Data Source=" & Server_IP & "," & Port & ";" & _
          "Initial Catalog=" & Catalog & ";" & _
          "User ID=" & UserID & ";" & _
          "Password=" & Password
```

### 5.2 MS Access 연결 문자열

```vb
' DBConnection.bas
ConnStr = "Provider=Microsoft.Jet.OLEDB.4.0;" & _
          "Data Source=" & DBPath & ";" & _
          "Jet OLEDB:Database Password=" & Password
```

## 6. 트랜잭션 관리

### 6.1 트랜잭션 상태 변수

```vb
Public DB_TRAN As Integer  ' 0: 트랜잭션 시작 안됨, 1: 트랜잭션 시작됨
```

### 6.2 트랜잭션 로그 테이블

```vb
' Tran_DB 연결을 통해 별도 트랜잭션 로그 관리
' Tran_Log_Write: 로그 기록
' Tran_Log_Send: 로그 전송
```

## 7. 데이터 무결성

### 7.1 연결 상태 확인

```vb
Public Connect_Gubun As Integer  ' DB 연결 구분
' 1: SQL Server 연결됨
' 0: 오프라인 (Access DB 사용)
```

### 7.2 장애 대응

1. **Primary 실패**: SQL Server 연결 실패 시 Access DB로 자동 전환
2. **오프라인 모드**: 네트워크 단절 시 로컬 Access DB 사용
3. **데이터 동기화**: 온라인 복구 시 `Tran_Log_Send`로 미동기화 데이터 전송

## 8. 인코딩 및 데이터 타입

### 8.1 문자열 인코딩

- VB6 내부: Unicode (16-bit)
- DB 저장: NVARCHAR (Unicode)
- 레거시 호환: EUC-KR (일부 외부 연동)

### 8.2 주요 데이터 타입 매핑

| VB6 타입 | SQL Server 타입 | 용도      |
| -------- | --------------- | --------- |
| String   | NVARCHAR        | 문자열    |
| Long     | INT             | 정수      |
| Currency | DECIMAL(18,2)   | 금액      |
| Integer  | SMALLINT        | 작은 정수 |
| Boolean  | BIT             | 참/거짓   |

## 9. 마이그레이션 고려사항

### 9.1 테이블 명명 규칙 표준화

- 월별 테이블 → 파티셔닝 또는 단일 테이블 + 날짜 인덱스
- 한글 컬럼명 → 영문 표준화

### 9.2 관계형 무결성 강화

- FK 제약조건 추가 (현재 암묵적 관계)
- CASCADE 규칙 정의

### 9.3 인덱스 전략

- 검색 빈도 높은 컬럼: BarCode, Sale_Date, MEM_CODE
- 복합 인덱스: (Sale_Date, BarCode), (MEM_CODE, Sale_Date)

### 9.4 쿼리 최적화

- 동적 SQL 문자열 연결 → 파라미터화된 쿼리
- 복잡한 LEFT JOIN 체인 → CTE 또는 임시 테이블 활용
