// @ts-check
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const VIEWPORTS = [
  { width: 375, height: 667, label: "375" },
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
];

const ROUTES = [
  { path: "/transactions", label: "tx-list", isRootTab: true, hasFAB: true },
  { path: "/transactions/add/income", label: "tx-add-income", isRootTab: false, hasFAB: false },
  { path: "/transactions/add/expense", label: "tx-add-expense", isRootTab: false, hasFAB: false },
  { path: "/transactions/add/transfer", label: "tx-add-transfer", isRootTab: false, hasFAB: false },
  { path: "/transactions/history", label: "tx-history", isRootTab: false, hasFAB: false },
];

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

const issues = [];
const passes = [];

async function runTests() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const tag = `${route.path} @ ${vp.width}`;
      console.log(`\n--- Testing ${tag} ---`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      });

      const page = await context.newPage();
      const consoleErrors = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      page.on("pageerror", (err) => {
        consoleErrors.push(`PAGE ERROR: ${err.message}`);
      });

      try {
        await page.goto(`http://localhost:3000${route.path}`, {
          waitUntil: "networkidle",
          timeout: 20000,
        });
      } catch (e) {
        await page.goto(`http://localhost:3000${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
      }

      // Wait for client-side hydration
      await page.waitForTimeout(2000);

      // Screenshot
      const screenshotFile = path.join(
        SCREENSHOTS_DIR,
        `${route.label}-${vp.label}.png`
      );
      await page.screenshot({ path: screenshotFile, fullPage: false });
      console.log(`  Screenshot saved: ${screenshotFile}`);

      // ── 1. Console errors ──────────────────────────────────────────
      const realErrors = consoleErrors.filter(
        (e) =>
          !e.includes("service worker") &&
          !e.includes("ServiceWorker") &&
          !e.includes("Failed to load resource") &&
          !e.includes("favicon")
      );
      if (realErrors.length > 0) {
        for (const err of realErrors) {
          issues.push(`[${tag}] Console error: ${err.substring(0, 120)}`);
        }
      } else {
        passes.push(`[${tag}] No console errors`);
      }

      // ── 2. Header visible at top ────────────────────────────────────
      const headers = page.locator("header");
      const headerCount = await headers.count();

      // Check for duplicate headers
      if (headerCount > 1) {
        issues.push(`[${tag}] Duplicate AppHeader — found ${headerCount} <header> elements`);
      }

      const header = headers.first();
      const headerVisible = await header.isVisible().catch(() => false);
      if (!headerVisible) {
        issues.push(`[${tag}] Header not visible`);
      } else {
        const headerBox = await header.boundingBox();
        if (headerBox) {
          if (headerBox.y > 10) {
            issues.push(`[${tag}] Header not at top — y=${headerBox.y}`);
          } else {
            passes.push(`[${tag}] Header at top (y=${headerBox.y})`);
          }
          const headerH = Math.round(headerBox.height);
          if (headerH < 44 || headerH > 90) {
            issues.push(
              `[${tag}] Header height out of expected range: ${headerH}px (expected 44-90px)`
            );
          } else {
            passes.push(`[${tag}] Header height OK: ${headerH}px`);
          }
          if (headerCount === 1) {
            passes.push(`[${tag}] Single AppHeader (no duplicates)`);
          }
        }
      }

      // ── 3. BottomNav ───────────────────────────────────────────────
      // BottomNav is always rendered via root layout on all routes
      const bottomNav = page.locator("nav").first();
      const navVisible = await bottomNav.isVisible().catch(() => false);

      if (!navVisible) {
        issues.push(`[${tag}] BottomNav not visible`);
      } else {
        const navBox = await bottomNav.boundingBox();
        if (navBox) {
          const navBottom = Math.round(navBox.y + navBox.height);
          if (navBottom < vp.height - 30) {
            issues.push(
              `[${tag}] BottomNav not anchored to bottom — bottom edge=${navBottom}, viewport=${vp.height}`
            );
          } else {
            passes.push(`[${tag}] BottomNav anchored at bottom (bottom=${navBottom})`);
          }

          const navLinks = bottomNav.locator("a");
          const navCount = await navLinks.count();
          if (navCount !== 4) {
            issues.push(`[${tag}] Expected 4 nav tabs, found ${navCount}`);
          } else {
            passes.push(`[${tag}] 4 nav tabs present`);
          }
        }
      }

      // ── 4. FABExpandable on /transactions ──────────────────────────
      if (route.hasFAB) {
        const fab = page.locator('button[aria-label="Add"], button[aria-label="Close actions"]').first();
        const fabVisible = await fab.isVisible().catch(() => false);
        if (!fabVisible) {
          issues.push(`[${tag}] FABExpandable main button not visible`);
        } else {
          const fabBox = await fab.boundingBox();
          const navBox2 = await bottomNav.boundingBox();
          if (fabBox && navBox2) {
            const fabBottom = fabBox.y + fabBox.height;
            const navTop = navBox2.y;
            console.log(
              `  FAB: x=${Math.round(fabBox.x)}, y=${Math.round(fabBox.y)}, w=${Math.round(fabBox.width)}, h=${Math.round(fabBox.height)} | NavTop=${Math.round(navTop)}`
            );
            if (fabBottom > navTop + 2) {
              issues.push(
                `[${tag}] FABExpandable overlaps BottomNav — FAB bottom=${Math.round(fabBottom)}, nav top=${Math.round(navTop)}`
              );
            } else {
              passes.push(`[${tag}] FABExpandable above BottomNav`);
            }

            // Right edge within viewport
            const fabRight = fabBox.x + fabBox.width;
            if (fabRight < vp.width - 60) {
              issues.push(
                `[${tag}] FABExpandable not in bottom-right — right edge=${Math.round(fabRight)}, viewport=${vp.width}`
              );
            } else {
              passes.push(`[${tag}] FABExpandable in bottom-right`);
            }

            // Size ≥44px
            if (fabBox.width < 44 || fabBox.height < 44) {
              issues.push(
                `[${tag}] FABExpandable too small: ${Math.round(fabBox.width)}×${Math.round(fabBox.height)}px`
              );
            } else {
              passes.push(`[${tag}] FABExpandable size OK: ${Math.round(fabBox.width)}×${Math.round(fabBox.height)}px`);
            }
          }
        }
      }

      // ── 5. Tap targets ≥44×44px ────────────────────────────────────
      const smallTargets = [];
      const selectors = ["button", "a[href]"];
      for (const sel of selectors) {
        const elements = page.locator(sel);
        const count = await elements.count();
        for (let i = 0; i < count; i++) {
          const el = elements.nth(i);
          const visible = await el.isVisible().catch(() => false);
          if (!visible) continue;
          const box = await el.boundingBox();
          if (!box) continue;
          if (box.width === 0 || box.height === 0) continue;
          if (box.y < 0 || box.x < 0) continue;

          const ariaLabel =
            (await el.getAttribute("aria-label").catch(() => null)) || "";
          const text = (await el.textContent().catch(() => "")) || "";
          const labelStr = (ariaLabel || text).trim().substring(0, 50);

          if (box.width < 44 || box.height < 44) {
            smallTargets.push(
              `"${labelStr}" (${sel}) — ${Math.round(box.width)}×${Math.round(box.height)}px`
            );
          }
        }
      }
      if (smallTargets.length > 0) {
        for (const t of smallTargets) {
          issues.push(`[${tag}] Tap target too small: ${t}`);
        }
      } else {
        passes.push(`[${tag}] All tap targets ≥44×44px`);
      }

      // ── 6. No horizontal overflow ───────────────────────────────────
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      console.log(`  Overflow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
      if (scrollWidth > clientWidth) {
        issues.push(
          `[${tag}] Horizontal overflow — scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`
        );
      } else {
        passes.push(`[${tag}] No horizontal overflow`);
      }

      await context.close();
    }
  }

  await browser.close();
}

runTests()
  .then(() => {
    console.log("\n\n=== TRANSACTION MODULE MOBILE TEST RESULTS ===");
    console.log(`\nPASS (${passes.length}):`);
    passes.forEach((p) => console.log("  PASS:", p));
    console.log(`\nISSUES (${issues.length}):`);
    if (issues.length === 0) {
      console.log("  None");
    } else {
      issues.forEach((i) => console.log("  FAIL:", i));
    }
    console.log("=== END ===");
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
