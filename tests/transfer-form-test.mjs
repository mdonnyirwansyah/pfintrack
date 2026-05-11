import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';

const ROUTE = 'http://localhost:3456/transactions/add/transfer';
const SCREENSHOTS_DIR = '/Users/dy/Projects/javascript/pfintrack/tests/screenshots';
const VIEWPORTS = [
  { width: 375, height: 812, label: '375' },
  { width: 390, height: 812, label: '390' },
  { width: 430, height: 812, label: '430' },
];

await mkdir(SCREENSHOTS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

const results = [];

for (const vp of VIEWPORTS) {
  console.log(`\n=== Testing viewport ${vp.width}x${vp.height} ===`);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Collect uncaught exceptions
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(ROUTE, { waitUntil: 'networkidle', timeout: 30000 });

  // Additional short wait for any client-side rendering
  await page.waitForTimeout(800);

  // Screenshot: full page
  const screenshotFile = path.join(SCREENSHOTS_DIR, `transfer-form-${vp.label}.png`);
  await page.screenshot({ path: screenshotFile, fullPage: true });
  console.log(`  Screenshot saved: ${screenshotFile}`);

  // ---- Horizontal overflow check ----
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`  scrollWidth=${scrollWidth}, innerWidth=${vp.width}, overflow=${overflow}`);

  // ---- Tap-target size check ----
  // Interactive elements: buttons, inputs, selects, textareas, anchors with href, [role=button]
  const tapViolations = await page.evaluate(() => {
    const MIN = 44;
    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[role="button"]',
      '[role="tab"]',
      '[role="option"]',
      '[role="combobox"]',
      '[role="listbox"]',
    ];

    const violations = [];

    for (const sel of selectors) {
      const els = Array.from(document.querySelectorAll(sel));
      for (const el of els) {
        // Skip hidden elements
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        const w = Math.round(rect.width);
        const h = Math.round(rect.height);

        if (w < MIN || h < MIN) {
          // Get a useful identifier
          const id = el.id ? `#${el.id}` : '';
          const cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).join('.')
            : '';
          const tag = el.tagName.toLowerCase();
          const text = el.textContent?.trim().slice(0, 40) || '';
          const type = el.getAttribute('type') || '';
          violations.push({
            selector: `${tag}${id}${cls}`,
            type,
            text,
            width: w,
            height: h,
          });
        }
      }
    }
    return violations;
  });

  // ---- Header check ----
  const headerInfo = await page.evaluate(() => {
    // Look for header element
    const header = document.querySelector('header') ||
                   document.querySelector('[data-testid="header"]') ||
                   document.querySelector('nav:first-of-type');
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    return { tag: header.tagName, height: Math.round(rect.height), top: Math.round(rect.top) };
  });

  // ---- BottomNav check ----
  const bottomNavInfo = await page.evaluate(() => {
    const nav = document.querySelector('nav:last-of-type') ||
                document.querySelector('[data-testid="bottom-nav"]');
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    return { tag: nav.tagName, height: Math.round(rect.height), bottom: Math.round(window.innerHeight - rect.bottom) };
  });

  results.push({
    viewport: vp.label,
    screenshotFile,
    consoleErrors,
    pageErrors,
    overflow,
    scrollWidth,
    tapViolations,
    headerInfo,
    bottomNavInfo,
  });

  await context.close();
}

await browser.close();

// ---- Print Report ----
console.log('\n\n========================================');
console.log('   TRANSFER FORM MOBILE TEST REPORT');
console.log('========================================\n');

for (const r of results) {
  console.log(`--- Viewport ${r.viewport}px ---`);
  console.log(`  Screenshot : ${r.screenshotFile}`);

  // Console errors
  if (r.consoleErrors.length === 0 && r.pageErrors.length === 0) {
    console.log('  Console    : No errors');
  } else {
    if (r.consoleErrors.length > 0) {
      console.log(`  Console Errors (${r.consoleErrors.length}):`);
      r.consoleErrors.forEach((e) => console.log(`    - ${e}`));
    }
    if (r.pageErrors.length > 0) {
      console.log(`  Page Errors (${r.pageErrors.length}):`);
      r.pageErrors.forEach((e) => console.log(`    - ${e}`));
    }
  }

  // Overflow
  if (r.overflow) {
    console.log(`  Overflow   : FAIL (scrollWidth=${r.scrollWidth} > ${r.viewport})`);
  } else {
    console.log(`  Overflow   : OK (scrollWidth=${r.scrollWidth})`);
  }

  // Header
  if (r.headerInfo) {
    const hOk = r.headerInfo.height >= 50 && r.headerInfo.height <= 70;
    console.log(`  Header     : ${hOk ? 'OK' : 'CHECK'} height=${r.headerInfo.height}px top=${r.headerInfo.top}px`);
  } else {
    console.log('  Header     : Not detected');
  }

  // BottomNav
  if (r.bottomNavInfo) {
    console.log(`  BottomNav  : Detected height=${r.bottomNavInfo.height}px`);
  } else {
    console.log('  BottomNav  : Not detected');
  }

  // Tap violations
  if (r.tapViolations.length === 0) {
    console.log('  Tap Targets: All >= 44x44px');
  } else {
    console.log(`  Tap Targets: ${r.tapViolations.length} VIOLATION(S)`);
    r.tapViolations.forEach((v) => {
      console.log(`    [FAIL] ${v.selector} type="${v.type}" text="${v.text}" => ${v.width}x${v.height}px`);
    });
  }

  console.log('');
}

console.log('========================================');
console.log('Screenshots saved:');
results.forEach((r) => console.log(`  ${r.screenshotFile}`));
console.log('========================================\n');
