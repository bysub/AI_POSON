-- ═══════════════════════════════════════════════════════════════
-- Settings Refinement Migration
-- 환경설정 정제화: 키 이동/재분류, 23탭 → 20탭
-- 총 변경: 136키 (31%), selfApple 삭제
-- ═══════════════════════════════════════════════════════════════

-- Phase 0: 백업 테이블 생성
CREATE TABLE IF NOT EXISTS system_settings_backup AS SELECT * FROM system_settings;
CREATE TABLE IF NOT EXISTS device_settings_backup AS SELECT * FROM device_settings;

-- ═══════════════════════════════════════════════════════════════
-- Phase 1: DeviceSetting → SystemSetting 이동 (29키)
-- 대표값: 첫 번째 KIOSK/POS 기기 값 사용
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1-1. KIOSK selfPoint 포인트정책(4키) → SystemSetting POINT
INSERT INTO system_settings (key, value, category, created_at, updated_at)
SELECT
  'point.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'POINT' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfPoint.selfNoAutoPoint', 'selfPoint.selfPointZero',
  'selfPoint.selfPointHidden', 'selfPoint.selfZero'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- 1-2. KIOSK selfPoint 알림(7키) → SystemSetting NOTIFICATION
INSERT INTO system_settings (key, value, category, created_at, updated_at)
SELECT
  'noti.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'NOTIFICATION' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfPoint.selfPointSMSUse', 'selfPoint.selfUserCall',
  'selfPoint.selfSMSAdmin', 'selfPoint.selfKakao',
  'selfPoint.selfCusAlarmUse', 'selfPoint.selfCusAlarmTime',
  'selfPoint.selfSNSGubun'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- 1-3. KIOSK selfPrint(4키) → SystemSetting PRINT
INSERT INTO system_settings (key, value, category, created_at, updated_at)
SELECT
  'print.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'PRINT' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfPrint.selfAutoPrint', 'selfPrint.selfStoPrint',
  'selfPrint.selfPrintAddress', 'selfPrint.selfPrintPhon'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- 1-4. KIOSK selfEtc 공통정책(2키) → SystemSetting (selfApple 삭제)
INSERT INTO system_settings (key, value, category, created_at, updated_at)
SELECT
  CASE
    WHEN split_part(ds.key, '.', 2) = 'selfNoAutoGoods' THEN 'sale.selfNoAutoGoods'
    WHEN split_part(ds.key, '.', 2) = 'selfAppCard' THEN 'payment.selfAppCard'
  END AS key,
  ds.value,
  CASE
    WHEN split_part(ds.key, '.', 2) = 'selfNoAutoGoods' THEN 'SALE'
    ELSE 'PAYMENT'
  END AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfEtc.selfNoAutoGoods', 'selfEtc.selfAppCard'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- selfApple 삭제 (applePayEnabled과 중복)
DELETE FROM device_settings WHERE key = 'selfEtc.selfApple';

-- 1-5. POS posPrint 공통영수증(12키) → SystemSetting PRINT
INSERT INTO system_settings (key, value, category, created_at, updated_at)
SELECT
  'print.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'PRINT' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'posPrint.receiptProductOneLine', 'posPrint.receiptBarcode',
  'posPrint.receiptVat', 'posPrint.receiptBottleTotal',
  'posPrint.receiptItemSeq', 'posPrint.receiptPhoneMask',
  'posPrint.receiptNameMask', 'posPrint.cashReceiptAutoIssue',
  'posPrint.cashReceiptIdShow', 'posPrint.saleMessageHide',
  'posPrint.noCostPriceShow', 'posPrint.memberTotalHide'
)
AND d.type = 'POS'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'POS' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Phase 2: SystemSetting → DeviceSetting 이동 (19키 × KIOSK 기기 수)
-- selfUI 19키를 각 KIOSK 기기의 DeviceSetting으로 복사
-- ═══════════════════════════════════════════════════════════════

INSERT INTO device_settings (device_id, key, value, category, created_at, updated_at)
SELECT
  d.id AS device_id,
  'selfUI.' || split_part(ss.key, '.', 2) AS key,
  ss.value,
  'SELF_UI' AS category,
  NOW(), NOW()
FROM system_settings ss
CROSS JOIN devices d
WHERE d.type = 'KIOSK'
AND ss.key IN (
  'point.selfSoundGuide', 'point.selfCusNum4', 'point.selfNoCustomer',
  'point.selfCusSelect', 'point.selfCusAddUse', 'point.selfCusAddEtc',
  'point.selfCusTopMsg', 'point.selfCusBTMsg1', 'point.selfCusBTMsg2',
  'point.selfTouchSoundYN', 'point.selfMainPage', 'point.selfBTInit',
  'point.selfOneCancel', 'point.selfZHotKey', 'point.selfCountYN',
  'point.selfStartHotKey', 'point.selfPriceUse', 'point.selfPriceType',
  'point.selfReader'
)
ON CONFLICT (device_id, key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Phase 3: DeviceSetting 내 prefix 변경 (88키)
-- ═══════════════════════════════════════════════════════════════

-- 3-1. selfAuto.* → selfUI.* (KIOSK, 8키)
UPDATE device_settings
SET key = 'selfUI.' || split_part(key, '.', 2),
    category = 'SELF_UI',
    updated_at = NOW()
WHERE key LIKE 'selfAuto.%'
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

-- 3-2. selfEtc.selfGif → selfUI.selfGif (KIOSK, 1키)
UPDATE device_settings
SET key = 'selfUI.selfGif',
    category = 'SELF_UI',
    updated_at = NOW()
WHERE key = 'selfEtc.selfGif'
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

-- 3-3. selfEtc HW 3키 → terminal.* (KIOSK)
UPDATE device_settings
SET key = 'terminal.' || split_part(key, '.', 2),
    category = 'TERMINAL',
    updated_at = NOW()
WHERE key IN ('selfEtc.selfJPYN', 'selfEtc.selfCamUse', 'selfEtc.selfICSiren')
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

-- 3-4. selfEtc.selfBagJPPort → selfBag.selfBagJPPort (KIOSK)
UPDATE device_settings
SET key = 'selfBag.selfBagJPPort',
    category = 'SELF_BAG',
    updated_at = NOW()
WHERE key = 'selfEtc.selfBagJPPort'
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

-- 3-5. posPrint 판매동작(44키) → posOp.* (POS)
UPDATE device_settings
SET key = 'posOp.' || split_part(key, '.', 2),
    category = 'POS_OPERATION',
    updated_at = NOW()
WHERE key IN (
  'posPrint.saleNewProduct', 'posPrint.exchangePassword', 'posPrint.zeroPriceInput',
  'posPrint.discountNoPoint', 'posPrint.weightNoPoint', 'posPrint.saleCancelDisable',
  'posPrint.cashBackUse', 'posPrint.barcodeGroupUse', 'posPrint.returnNoPassword',
  'posPrint.cashForceInput', 'posPrint.costOverSellWarn', 'posPrint.disabledProductChange',
  'posPrint.salePriceCompare', 'posPrint.categoryScaleInput', 'posPrint.shortcutFixedPrice',
  'posPrint.shortcutNameProcess', 'posPrint.bulkPriceFit', 'posPrint.posNoCreditSale',
  'posPrint.discountNoCashback', 'posPrint.cardNoDrawer', 'posPrint.cashOnlyNoReturn',
  'posPrint.cardReturnNoDrawer', 'posPrint.cardCardPayUse', 'posPrint.giftCashReceiptInclude',
  'posPrint.giftPointInclude', 'posPrint.deliveryPointAccrue', 'posPrint.barcodeCardPayScreen',
  'posPrint.cashChangeCardScreen', 'posPrint.deliveryDisable', 'posPrint.deliveryNoPayClose',
  'posPrint.deliveryNoPayReturn', 'posPrint.deliverySaleType', 'posPrint.deliveryNotePrint',
  'posPrint.deliverySeqPrint', 'posPrint.deliveryReceiptManage', 'posPrint.deliveryDriverReceipt',
  'posPrint.deliveryItemArchive', 'posPrint.deliverySeqMemberReceipt',
  'posPrint.holdNoShift', 'posPrint.holdReceiptPrint', 'posPrint.holdReceiptDetail',
  'posPrint.deliveryNoShift', 'posPrint.firstScanHoldMsg', 'posPrint.overdueCustomerWarn'
)
AND device_id IN (SELECT id FROM devices WHERE type = 'POS');

-- 3-6. posSale 11키 → posOp.* (POS)
UPDATE device_settings
SET key = 'posOp.' || split_part(key, '.', 2),
    category = 'POS_OPERATION',
    updated_at = NOW()
WHERE key LIKE 'posSale.%'
AND device_id IN (SELECT id FROM devices WHERE type = 'POS');

-- 3-7. posPrint 정산관련(10키) → posSettle.* (POS)
UPDATE device_settings
SET key = 'posSettle.' || split_part(key, '.', 2),
    category = 'POS_SETTLE',
    updated_at = NOW()
WHERE key IN (
  'posPrint.settleCategoryPrint', 'posPrint.settleAmountPrint',
  'posPrint.closeOutstandingPrint', 'posPrint.openShiftFiscalPrint',
  'posPrint.cashbackQrPrint', 'posPrint.scale18Barcode',
  'posPrint.archiveBarcodeNo', 'posPrint.eSignArchiveNo',
  'posPrint.reissueBarcodeNo', 'posPrint.receiptNoOutstanding'
)
AND device_id IN (SELECT id FROM devices WHERE type = 'POS');

-- 3-8. posPrint 인쇄전용(10키) → posReceipt.* (POS)
UPDATE device_settings
SET key = 'posReceipt.' || split_part(key, '.', 2),
    category = 'POS_RECEIPT',
    updated_at = NOW()
WHERE key IN (
  'posPrint.slipNoPrint', 'posPrint.slipNoHide',
  'posPrint.cancelDetailPrint', 'posPrint.cardReceiptDetail',
  'posPrint.checkResponsePrint', 'posPrint.eCouponNoReceipt',
  'posPrint.deliveryArchiveDouble', 'posPrint.deliveryArchiveSimple',
  'posPrint.deliveryArchiveNormal', 'posPrint.visitDeliveryArchive'
)
AND device_id IN (SELECT id FROM devices WHERE type = 'POS');

-- ═══════════════════════════════════════════════════════════════
-- Phase 4: 이동 완료된 원본 키 삭제
-- ═══════════════════════════════════════════════════════════════

-- 4-1. DeviceSetting에서 SystemSetting으로 이동한 원본 삭제
DELETE FROM device_settings WHERE key LIKE 'selfPoint.%'
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

DELETE FROM device_settings WHERE key LIKE 'selfPrint.%'
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

DELETE FROM device_settings WHERE key IN (
  'selfEtc.selfNoAutoGoods', 'selfEtc.selfAppCard'
)
AND device_id IN (SELECT id FROM devices WHERE type = 'KIOSK');

DELETE FROM device_settings WHERE key IN (
  'posPrint.receiptProductOneLine', 'posPrint.receiptBarcode',
  'posPrint.receiptVat', 'posPrint.receiptBottleTotal',
  'posPrint.receiptItemSeq', 'posPrint.receiptPhoneMask',
  'posPrint.receiptNameMask', 'posPrint.cashReceiptAutoIssue',
  'posPrint.cashReceiptIdShow', 'posPrint.saleMessageHide',
  'posPrint.noCostPriceShow', 'posPrint.memberTotalHide'
)
AND device_id IN (SELECT id FROM devices WHERE type = 'POS');

-- 4-2. SystemSetting에서 DeviceSetting으로 이동한 원본 삭제
DELETE FROM system_settings WHERE key IN (
  'point.selfSoundGuide', 'point.selfCusNum4', 'point.selfNoCustomer',
  'point.selfCusSelect', 'point.selfCusAddUse', 'point.selfCusAddEtc',
  'point.selfCusTopMsg', 'point.selfCusBTMsg1', 'point.selfCusBTMsg2',
  'point.selfTouchSoundYN', 'point.selfMainPage', 'point.selfBTInit',
  'point.selfOneCancel', 'point.selfZHotKey', 'point.selfCountYN',
  'point.selfStartHotKey', 'point.selfPriceUse', 'point.selfPriceType',
  'point.selfReader'
);

-- 4-3. 남은 구 카테고리 잔여 키 정리
DELETE FROM device_settings WHERE category IN (
  'POS_PRINT', 'POS_SALE', 'SELF_POINT', 'SELF_PRINT', 'SELF_AUTO', 'SELF_ETC'
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- Phase 5: 검증 쿼리
-- ═══════════════════════════════════════════════════════════════

-- 구 카테고리 잔여 확인 (0이어야 함)
SELECT 'OLD_CATEGORIES_REMAIN' AS check_name,
  COUNT(*) AS count
FROM device_settings
WHERE category IN ('POS_PRINT','SELF_POINT','SELF_PRINT','SELF_ETC','SELF_AUTO','POS_SALE');

-- SystemSetting 카테고리별 키 수
SELECT category, COUNT(*) AS key_count
FROM system_settings
GROUP BY category
ORDER BY category;

-- DeviceSetting 기기별 카테고리 키 수
SELECT d.type, ds.category, COUNT(*) AS key_count
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
GROUP BY d.type, ds.category
ORDER BY d.type, ds.category;
