/**
 * browser-human.js — Human Browser for AI Agents
 *
 * Stealth browser with residential proxies from 10+ countries.
 * Appears as iPhone 15 Pro or Desktop Chrome to every website.
 * Bypasses Cloudflare, DataDome, PerimeterX out of the box.
 *
 * Get credentials: https://humanbrowser.dev
 * Support: https://t.me/virixlabs
 *
 * Usage:
 *   const { launchHuman } = require('./browser-human');
 *   const { browser, page } = await launchHuman({ country: 'us' });
 */

const { chromium } = require('playwright');
require('dotenv').config();

// ─── COUNTRY CONFIGS ──────────────────────────────────────────────────────────

const COUNTRY_META = {
  ro: { locale: 'ro-RO', tz: 'Europe/Bucharest', lat: 44.4268, lon: 26.1025, lang: 'ro-RO,ro;q=0.9,en-US;q=0.8' },
  us: { locale: 'en-US', tz: 'America/New_York',  lat: 40.7128, lon: -74.006,  lang: 'en-US,en;q=0.9' },
  uk: { locale: 'en-GB', tz: 'Europe/London',     lat: 51.5074, lon: -0.1278,  lang: 'en-GB,en;q=0.9' },
  gb: { locale: 'en-GB', tz: 'Europe/London',     lat: 51.5074, lon: -0.1278,  lang: 'en-GB,en;q=0.9' },
  de: { locale: 'de-DE', tz: 'Europe/Berlin',     lat: 52.5200, lon: 13.4050,  lang: 'de-DE,de;q=0.9,en;q=0.8' },
  nl: { locale: 'nl-NL', tz: 'Europe/Amsterdam',  lat: 52.3676, lon: 4.9041,   lang: 'nl-NL,nl;q=0.9,en;q=0.8' },
  jp: { locale: 'ja-JP', tz: 'Asia/Tokyo',        lat: 35.6762, lon: 139.6503, lang: 'ja-JP,ja;q=0.9,en;q=0.8' },
  fr: { locale: 'fr-FR', tz: 'Europe/Paris',      lat: 48.8566, lon: 2.3522,   lang: 'fr-FR,fr;q=0.9,en;q=0.8' },
  ca: { locale: 'en-CA', tz: 'America/Toronto',   lat: 43.6532, lon: -79.3832, lang: 'en-CA,en;q=0.9' },
  au: { locale: 'en-AU', tz: 'Australia/Sydney',  lat: -33.8688, lon: 151.2093,lang: 'en-AU,en;q=0.9' },
  sg: { locale: 'en-SG', tz: 'Asia/Singapore',    lat: 1.3521,  lon: 103.8198, lang: 'en-SG,en;q=0.9' },
};

// ─── PROXY CONFIG ─────────────────────────────────────────────────────────────

function buildProxy(country = 'ro') {
  const c = country.toLowerCase();

  // Proxy config — use env vars (set manually or auto-fetched via getTrial())
  const PROXY_HOST = process.env.PROXY_HOST || '';
  const PROXY_PORT = process.env.PROXY_PORT || '13001';
  const PROXY_USER = process.env.PROXY_USER || '';
  const PROXY_PASS = process.env.PROXY_PASS || '';

  // Also support legacy env var names for backward compatibility
  const server   = process.env.PROXY_SERVER   || (PROXY_HOST ? `http://${PROXY_HOST}:${PROXY_PORT}` : '');
  const username = process.env.PROXY_USERNAME || PROXY_USER;
  const password = process.env.PROXY_PASSWORD || PROXY_PASS;

  if (!username || !password) {
    return null;
  }

  // Inject country code into username if needed
  // e.g. brd-customer-XXX-zone-YYY  →  brd-customer-XXX-zone-YYY-country-ro
  const hasCountry = username.includes('-country-');
  const finalUser = hasCountry
    ? username.replace(/-country-\w+/, `-country-${c}`)
    : username.includes('zone-') ? `${username}-country-${c}` : username;

  return { server, username: finalUser, password };
}

// ─── DEVICE PROFILES ─────────────────────────────────────────────────────────

function buildDevice(mobile, country = 'ro') {
  const meta = COUNTRY_META[country.toLowerCase()] || COUNTRY_META.ro;

  if (mobile) {
    return {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      locale: meta.locale,
      timezoneId: meta.tz,
      geolocation: { latitude: meta.lat, longitude: meta.lon, accuracy: 50 },
      colorScheme: 'light',
      extraHTTPHeaders: {
        'Accept-Language': meta.lang,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
      },
    };
  }

  return {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: meta.locale,
    timezoneId: meta.tz,
    geolocation: { latitude: meta.lat, longitude: meta.lon, accuracy: 50 },
    colorScheme: 'light',
    extraHTTPHeaders: {
      'Accept-Language': meta.lang,
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
  };
}

// ─── HUMAN BEHAVIOR ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function humanMouseMove(page, toX, toY) {
  const cp1x = toX + rand(-80, 80), cp1y = toY + rand(-60, 60);
  const cp2x = toX + rand(-50, 50), cp2y = toY + rand(-40, 40);
  const startX = rand(100, 300), startY = rand(200, 600);
  const steps = rand(12, 25);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(Math.pow(1-t,3)*startX + 3*Math.pow(1-t,2)*t*cp1x + 3*(1-t)*t*t*cp2x + t*t*t*toX);
    const y = Math.round(Math.pow(1-t,3)*startY + 3*Math.pow(1-t,2)*t*cp1y + 3*(1-t)*t*t*cp2y + t*t*t*toY);
    await page.mouse.move(x, y);
    await sleep(t < 0.2 || t > 0.8 ? rand(8, 20) : rand(2, 8));
  }
}

async function humanClick(page, x, y) {
  await humanMouseMove(page, x, y);
  await sleep(rand(50, 180));
  await page.mouse.down();
  await sleep(rand(40, 100));
  await page.mouse.up();
  await sleep(rand(100, 300));
}

async function humanType(page, selector, text) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  const box = await el.boundingBox();
  if (box) await humanClick(page, box.x + box.width / 2, box.y + box.height / 2);
  await sleep(rand(200, 500));
  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(rand(60, 220));
    if (Math.random() < 0.08) await sleep(rand(400, 900));
  }
  await sleep(rand(200, 400));
}

async function humanScroll(page, direction = 'down', amount = null) {
  const scrollAmount = amount || rand(200, 600);
  const delta = direction === 'down' ? scrollAmount : -scrollAmount;
  const vp = page.viewportSize();
  await humanMouseMove(page, rand(100, vp.width - 100), rand(200, vp.height - 200));
  const steps = rand(4, 10);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, delta / steps + rand(-5, 5));
    await sleep(rand(30, 80));
  }
  await sleep(rand(200, 800));
}

async function humanRead(page, minMs = 1500, maxMs = 4000) {
  await sleep(rand(minMs, maxMs));
  if (Math.random() < 0.3) await humanScroll(page, 'down', rand(50, 150));
}

// ─── LAUNCH ───────────────────────────────────────────────────────────────────

/**
 * Launch a human-like browser with residential proxy
 *
 * @param {Object}  opts
 * @param {string}  opts.country  - 'ro'|'us'|'uk'|'de'|'nl'|'jp'|'fr'|'ca'|'au'|'sg' (default: 'ro')
 * @param {boolean} opts.mobile   - iPhone 15 Pro (true) or Desktop Chrome (false). Default: true
 * @param {boolean} opts.useProxy - Enable residential proxy. Default: true
 * @param {boolean} opts.headless - Headless mode. Default: true
 *
 * @returns {{ browser, ctx, page, humanClick, humanType, humanScroll, humanRead, sleep, rand }}
 */
async function launchHuman(opts = {}) {
  const {
    country  = 'ro',
    mobile   = true,
    useProxy = true,
    headless = true,
  } = opts;

  // Auto-fetch trial credentials if no proxy is configured
  if (useProxy && !process.env.PROXY_USER && !process.env.PROXY_SERVER && !process.env.PROXY_USERNAME) {
    try {
      await getTrial();
    } catch (e) {
      console.warn('⚠️  Could not fetch trial credentials:', e.message);
      console.warn('   Get credentials at: https://humanbrowser.dev');
    }
  }

  const meta   = COUNTRY_META[country.toLowerCase()] || COUNTRY_META.ro;
  const device = buildDevice(mobile, country);
  const proxy  = useProxy ? buildProxy(country) : null;

  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
    ],
  });

  const ctxOpts = {
    ...device,
    ignoreHTTPSErrors: true,
    permissions: ['geolocation', 'notifications'],
  };
  if (proxy) ctxOpts.proxy = proxy;

  const ctx = await browser.newContext(ctxOpts);

  // Anti-detection overrides
  await ctx.addInitScript((m) => {
    Object.defineProperty(navigator, 'webdriver',          { get: () => false });
    Object.defineProperty(navigator, 'maxTouchPoints',     { get: () => 5 });
    Object.defineProperty(navigator, 'platform',           { get: () => m.mobile ? 'iPhone' : 'Win32' });
    Object.defineProperty(navigator, 'hardwareConcurrency',{ get: () => m.mobile ? 6 : 8 });
    Object.defineProperty(navigator, 'language',           { get: () => m.locale });
    Object.defineProperty(navigator, 'languages',          { get: () => [m.locale, 'en'] });
  }, { mobile, locale: meta.locale });

  const page = await ctx.newPage();

  return { browser, ctx, page, humanClick, humanMouseMove, humanType, humanScroll, humanRead, sleep, rand };
}

// ─── TRIAL ────────────────────────────────────────────────────────────────────

/**
 * Get free trial credentials from humanbrowser.dev
 * Fetches shared trial proxy (~100MB, Romania). Sets env vars automatically.
 *
 * Usage:
 *   const { launchHuman, getTrial } = require('./browser-human');
 *   await getTrial();               // sets PROXY_USER/PASS in process.env
 *   const { page } = await launchHuman();  // now uses trial credentials
 *
 * When trial runs out → throws { code: 'TRIAL_EXHAUSTED', cta_url: '...' }
 */
async function getTrial() {
  let https;
  try { https = require('https'); } catch { https = require('http'); }

  return new Promise((resolve, reject) => {
    const req = https.get('https://humanbrowser.dev/api/trial', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error || res.statusCode !== 200) {
            const err = new Error(data.error || 'Trial unavailable');
            err.code = 'TRIAL_UNAVAILABLE';
            err.cta_url = 'https://humanbrowser.dev';
            return reject(err);
          }
          // Auto-set env vars so launchHuman() picks them up
          process.env.PROXY_HOST = data.proxy_host;
          process.env.PROXY_PORT = data.proxy_port;
          process.env.PROXY_USER = data.proxy_user;
          process.env.PROXY_PASS = data.proxy_pass;

          console.log('🎉 Human Browser trial activated! (~100MB Romania residential IP)');
          console.log('   Upgrade at: https://humanbrowser.dev\n');
          resolve(data);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (e) => {
      const err = new Error('Could not reach humanbrowser.dev: ' + e.message);
      err.code = 'TRIAL_NETWORK_ERROR';
      reject(err);
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Trial request timed out')); });
  });
}

// ─── SHADOW DOM UTILITIES ─────────────────────────────────────────────────────

/**
 * Query an element inside shadow DOM (any depth).
 * Use when page.$() returns null but element is visible on screen.
 */
async function shadowQuery(page, selector) {
  return page.evaluate((sel) => {
    function q(root, s) {
      const el = root.querySelector(s); if (el) return el;
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const f = q(n.shadowRoot, s); if (f) return f; }
    }
    return q(document, sel);
  }, selector);
}

/**
 * Fill an input inside shadow DOM.
 * Uses native input setter to trigger React/Angular onChange properly.
 */
async function shadowFill(page, selector, value) {
  await page.evaluate(({ sel, val }) => {
    function q(root, s) {
      const el = root.querySelector(s); if (el) return el;
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const f = q(n.shadowRoot, s); if (f) return f; }
    }
    const el = q(document, sel);
    if (!el) throw new Error('shadowFill: not found: ' + sel);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: value });
}

/**
 * Click a button by its text label, searching through shadow DOM.
 */
async function shadowClickButton(page, buttonText) {
  await page.evaluate((text) => {
    function find(root) {
      for (const b of root.querySelectorAll('button')) if (b.textContent.trim() === text) return b;
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const f = find(n.shadowRoot); if (f) return f; }
    }
    const btn = find(document);
    if (!btn) throw new Error('shadowClickButton: not found: ' + text);
    btn.click();
  }, buttonText);
}

/**
 * Dump all inputs/buttons visible on page, including inside shadow roots.
 * Use for debugging when form elements aren't found.
 */
async function dumpInteractiveElements(page) {
  return page.evaluate(() => {
    const res = [];
    function collect(root) {
      for (const el of root.querySelectorAll('input,textarea,button,select,[contenteditable]')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0)
          res.push({ tag: el.tagName, name: el.name || '', id: el.id || '', type: el.type || '', text: el.textContent?.trim().slice(0, 25) || '', placeholder: el.placeholder?.slice(0, 25) || '' });
      }
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) collect(n.shadowRoot);
    }
    collect(document);
    return res;
  });
}

// ─── RICH TEXT EDITOR UTILITIES ───────────────────────────────────────────────

/**
 * Paste text into a Lexical/ProseMirror/Quill/Draft.js rich text editor.
 * Uses clipboard API — works where keyboard.type() and fill() fail.
 *
 * Common selectors:
 *   '[data-lexical-editor]'       — Reddit, Meta apps
 *   '.public-DraftEditor-content' — Draft.js (Twitter, Quora)
 *   '.ql-editor'                  — Quill
 *   '.ProseMirror'                — Linear, Confluence
 *   '[contenteditable="true"]'   — generic
 */
async function pasteIntoEditor(page, editorSelector, text) {
  const el = await page.$(editorSelector);
  if (!el) throw new Error('pasteIntoEditor: editor not found: ' + editorSelector);
  await el.click();
  await new Promise(r => setTimeout(r, 300));
  // Write to clipboard via execCommand (works in Playwright context)
  await page.evaluate((t) => {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }, text);
  await page.keyboard.press('Control+a');
  await new Promise(r => setTimeout(r, 100));
  await page.keyboard.press('Control+v');
  await new Promise(r => setTimeout(r, 500));
}

module.exports = {
  launchHuman, getTrial,
  humanClick, humanMouseMove, humanType, humanScroll, humanRead,
  shadowQuery, shadowFill, shadowClickButton, dumpInteractiveElements,
  pasteIntoEditor,
  sleep, rand, COUNTRY_META,
};

// ─── QUICK TEST ───────────────────────────────────────────────────────────────
if (require.main === module) {
  const country = process.argv[2] || 'ro';
  console.log(`🧪 Testing Human Browser — country: ${country.toUpperCase()}\n`);
  (async () => {
    const { browser, page } = await launchHuman({ country, mobile: true });
    await page.goto('https://ipinfo.io/json', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const info = JSON.parse(await page.textContent('body'));
    console.log(`✅ IP:      ${info.ip}`);
    console.log(`✅ Country: ${info.country} (${info.city})`);
    console.log(`✅ Org:     ${info.org}`);
    console.log(`✅ TZ:      ${info.timezone}`);
    await browser.close();
    console.log('\n🎉 Human Browser is ready.');
  })().catch(console.error);
}
