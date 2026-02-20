const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. 로그인 페이지로 이동
    console.log('1. 로그인 페이지로 이동...');
    await page.goto('http://localhost:5173/#/admin/login');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot-1-login.png', fullPage: true });

    // 2. 로그인
    console.log('2. 로그인 중...');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot-2-after-login.png', fullPage: true });

    // 3. 카테고리 페이지로 이동
    console.log('3. 카테고리 페이지로 이동...');
    await page.goto('http://localhost:5173/#/admin/categories');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot-3-categories.png', fullPage: true });

    // 4. 콘솔 에러 확인
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });

    // 5. 이미지 요소 확인
    const images = await page.$$('img');
    console.log(`이미지 요소 수: ${images.length}`);

    // 6. 이미지 로드 상태 확인
    const imageStatus = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).map(img => ({
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
    });
    console.log('이미지 상태:', JSON.stringify(imageStatus, null, 2));

    // 7. CSP 확인
    const cspMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.content : 'Not found';
    });
    console.log('CSP:', cspMeta);

    console.log('테스트 완료!');
  } catch (error) {
    console.error('에러 발생:', error);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
