const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const action = args[0];
  if (!action) {
    console.log('Usage: node pw.js <action> <tabId> [args...]');
    process.exit(1);
  }
  const tabId = args[1];
  if (!tabId) {
    console.error('Missing tabId');
    process.exit(1);
  }

  // Fetch tabs to get wsEndpoint
  const tabsResp = await fetch('http://localhost:9222/json/list');
  if (!tabsResp.ok) throw new Error('Browser not available at localhost:9222');
  const tabs = await tabsResp.json();
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) {
    console.error(`Tab ${tabId} not found. Available: ${tabs.map(t=>t.id).join(', ')}`);
    process.exit(1);
  }
  const browser = await playwright.chromium.connectOverCDP('http://localhost:9222');
  const allPages = browser.contexts().flatMap(c => c.pages());
  const tabIndex = tabs.filter(t => t.type === 'page').findIndex(t => t.id === tabId);
  const page = tabIndex >= 0 ? allPages[tabIndex] : allPages.find(p => p.url() === tab.url) || allPages[0];
  if (!page) throw new Error(`Could not find page for tab ${tabId}`);

  try {
    switch (action) {
      case 'snapshot':
        const safeId = String(tabId).replace(/[^A-Za-z0-9_-]/g, '');
        const pngPath = path.join(__dirname, `snapshot-${safeId}.png`);
        await page.screenshot({ path: pngPath, fullPage: true });
        console.log(`Snapshot saved: ${pngPath}`);
        break;
      case 'goto':
        const url = args[2];
        if (!url) throw new Error('Missing url');
        await page.goto(url, { waitUntil: 'networkidle' });
        console.log(`Navigated to ${url}`);
        break;
      case 'close-popup':
        await page.evaluate(() => {
          Array.from(document.querySelectorAll('[role="dialog"], .modal, .popup, [role="dialogue"]')).forEach(el => {
            el.remove?.() || (el.style.display = 'none');
            el.style.visibility = 'hidden';
          });
        });
        console.log('Popups closed');
        break;
      case 'scroll':
        const target = args[2];
        const dir = args[3] || 'down';
        const amount = parseInt(target, 10);
        if (!isNaN(amount) && amount >= 0 && amount <= 1e7) {
          const delta = dir === 'up' ? -amount : amount;
          await page.evaluate((d) => window.scrollBy(0, d), delta);
        } else {
          await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), target);
        }
        console.log(`Scrolled ${target} ${dir}`);
        break;
      case 'tweet':
        let text = args.slice(2).join(' ');
        if (!text) throw new Error('Missing text');
        // Try to open compose
        try {
          await page.click('[data-testid="tweetButtonInline"], [aria-label*="Tweet"], [data-testid="SideNav_NewTweet_Button"]', { timeout: 3000 });
        } catch (e) {
          console.log('Compose button not found, trying goto');
          await page.goto('https://x.com/compose/post');
        }
        // Wait for textbox
        await page.waitForSelector('div[role="textbox"][contenteditable="true"], div[data-testid="tweetTextarea_0"]', { timeout: 10000 });
        await page.fill('div[role="textbox"][contenteditable="true"]', text);
        await page.click('[data-testid="tweetButtonInline"]');
        console.log(`Tweet posted: ${text}`);
        break;
      case 'eval':
        const code = args.slice(2).join(' ');
        const result = await page.evaluate(code);
        console.log('Eval result:', result);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});