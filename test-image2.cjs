const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 콘솔 로그 캡처
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 네트워크 요청 캡처
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  page.on('response', response => {
    if (response.url().includes('uploads')) {
      console.log('UPLOAD RESPONSE:', response.url(), response.status());
    }
  });

  try {
    // 1. 이미지 URL 직접 접근 테스트
    console.log('\n=== 이미지 직접 접근 테스트 ===');
    const imageUrl = 'http://localhost:3000/uploads/1770281073516-aef7dda5899e32ee.png';
    await page.goto(imageUrl);
    await page.screenshot({ path: 'screenshot-direct-image.png' });
    console.log('이미지 직접 접근 성공!');

    // 2. 로그인 후 카테고리 페이지 테스트
    console.log('\n=== 카테고리 페이지 테스트 ===');
    await page.goto('http://localhost:5173/#/admin/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:5173/#/admin/categories');
    await page.waitForTimeout(3000);

    // 3. 네트워크 요청 확인
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('uploads'), { timeout: 5000 }).catch(() => null),
      page.reload()
    ]);

    if (response) {
      console.log('이미지 응답:', response.status(), response.headers());
    } else {
      console.log('이미지 요청이 발생하지 않음!');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot-categories-final.png', fullPage: true });

    // 4. 페이지 내 이미지 상태 확인
    const imageInfo = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).map(img => ({
        src: img.src.substring(0, 100),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        error: img.src.includes('data:image/svg') ? 'fallback SVG' : 'ok'
      }));
    });
    console.log('\n이미지 정보:', JSON.stringify(imageInfo, null, 2));

  } catch (error) {
    console.error('에러:', error.message);
  } finally {
    await browser.close();
  }
})();
