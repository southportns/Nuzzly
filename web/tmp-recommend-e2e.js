const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('response', resp => {
    if (resp.url().includes('/api/ai/recommend')) {
      console.log('RESPONSE', resp.status(), resp.url());
    }
  });
  page.on('console', msg => console.log('CONSOLE', msg.text()));

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input#email', 'text@mail.com');
  await page.fill('input#password', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('after login:', page.url());

  // AI page
  await page.goto('http://localhost:3000/ai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.click('text=智能推荐');
  await page.waitForTimeout(1500);

  // Select pet
  await page.click('text=选择要推荐的宠物…');
  await page.waitForTimeout(500);
  const firstOption = await page.$('div[role="listbox"] button');
  if (firstOption) await firstOption.click();

  // Fill query and submit
  const queryInput = await page.$('input[placeholder*="例如"]');
  if (queryInput) await queryInput.fill('肠胃敏感');

  await page.click('button:has-text("获取智能推荐")');
  await page.waitForSelector('text=分析结果', { timeout: 60000 });
  await page.waitForTimeout(2000);
  console.log('after recommend:', page.url());

  // Expand evidence of first card
  const expandBtn = await page.$('button:has-text("推荐依据")');
  console.log('expandBtn found:', !!expandBtn);
  if (expandBtn) {
    const btnText = await expandBtn.textContent();
    console.log('expandBtn text:', btnText);
    await expandBtn.click();
    await page.waitForTimeout(1500);
  }

  // Find evidence section by text
  const evidenceText = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.includes('统计权重分解'));
    return headings.map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 100), parent: el.parentElement?.className?.slice(0, 100) }));
  });
  console.log('EVIDENCE TEXT:', evidenceText);

  // Check auth state
  const authState = await page.evaluate(async () => {
    const keys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'));
    const values = keys.reduce((acc, k) => ({ ...acc, [k]: localStorage.getItem(k)?.slice(0, 50) }), {});
    return { keys, values };
  });
  console.log('AUTH STATE:', authState);

  await page.screenshot({ path: 'tmp-ai-recommend-result.png', fullPage: true });
  console.log('screenshot saved');

  await browser.close();
})();
