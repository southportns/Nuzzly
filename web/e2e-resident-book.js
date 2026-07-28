const { chromium } = require('playwright');

(async () => {
  const email = process.env.TEST_EMAIL || '123@mail.com';
  const password = process.env.TEST_PASSWORD || '密码123456';
  const base = process.env.BASE_URL || 'http://localhost:3001';

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => null),
    ]);

    // navigate to dashboard root
    await page.goto(base, { waitUntil: 'networkidle' });

    // extract sidebar username
    const sidebarName = await page.textContent('aside h2')
      .then((t) => (t || '').trim())
      .catch(() => null);

    // find owner card's crown span and then the owner's name element
    const crownHandle = await page.$("xpath=//span[contains(.,'户主') or contains(.,'👑 户主')]");
    let ownerName = null;
    if (crownHandle) {
      // ascend to the metadata container
      const meta = await crownHandle.evaluateHandle((el) => el.parentElement);
      // find previous sibling which should be the name div
      const nameDiv = await meta.evaluateHandle((m) => {
        let el = m.previousElementSibling;
        if (!el) return null;
        // find first div child that likely contains the name
        if (el.querySelector) {
          const d = el.querySelector('div');
          return d ? d.textContent : el.textContent;
        }
        return el.textContent;
      });
      ownerName = nameDiv ? (await nameDiv.jsonValue()).trim() : null;
    }

    console.log('SIDEBAR_NAME:', sidebarName);
    console.log('OWNER_NAME:', ownerName);

    // simple equality check
    const match = sidebarName && ownerName && sidebarName === ownerName;
    console.log('MATCH:', !!match);

    await browser.close();
    process.exit(match ? 0 : 2);
  } catch (e) {
    console.error('ERROR', e && e.message);
    await browser.close();
    process.exit(3);
  }
})();