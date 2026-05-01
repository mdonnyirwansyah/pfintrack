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
  { path: "/wallet", label: "wallet-list" },
  { path: "/wallet/add", label: "wallet-add" },
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
      // Filter out known benign warnings (service worker, hydration timing, etc.)
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
      const header = page.locator("header").first();
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
          if (headerBox.height < 44 || headerBox.height > 90) {
            issues.push(
              `[${tag}] Header height out of expected range: ${Math.round(headerBox.height)}px (expected 44-90px incl. safe area)`
            );
          } else {
            passes.push(`[${tag}] Header height OK: ${Math.round(headerBox.height)}px`);
          }
        }
      }

      // ── 3. BottomNav on root tabs ───────────────────────────────────
      const isRootTab = route.path === "/wallet";
      const bottomNav = page.locator("nav").first();
      const navVisible = await bottomNav.isVisible().catch(() => false);

      if (isRootTab) {
        if (!navVisible) {
          issues.push(`[${tag}] BottomNav not visible on root tab`);
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

            // Check 4 nav tabs
            const navLinks = bottomNav.locator("a");
            const navCount = await navLinks.count();
            if (navCount !== 4) {
              issues.push(`[${tag}] Expected 4 nav tabs, found ${navCount}`);
            } else {
              passes.push(`[${tag}] 4 nav tabs present`);
            }
          }
        }
      } else {
        console.log(`  (BottomNav check skipped — not a root tab)`);
      }

      // ── 4. FAB position on /wallet ──────────────────────────────────
      if (route.path === "/wallet") {
        const fab = page.locator('button[aria-label="Add wallet"]');
        const fabVisible = await fab.isVisible().catch(() => false);
        if (!fabVisible) {
          issues.push(`[${tag}] FAB not visible`);
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
                `[${tag}] FAB overlaps BottomNav — FAB bottom=${Math.round(fabBottom)}, nav top=${Math.round(navTop)}`
              );
            } else {
              passes.push(`[${tag}] FAB above BottomNav (fabBottom=${Math.round(fabBottom)}, navTop=${Math.round(navTop)})`);
            }
            // FAB right edge should be within 4–20px from viewport right
            const fabRight = fabBox.x + fabBox.width;
            if (fabRight < vp.width - 60) {
              issues.push(
                `[${tag}] FAB not in bottom-right — right edge=${Math.round(fabRight)}, viewport width=${vp.width}`
              );
            } else {
              passes.push(`[${tag}] FAB in bottom-right (right=${Math.round(fabRight)})`);
            }

            // FAB size ≥44px
            if (fabBox.width < 44 || fabBox.height < 44) {
              issues.push(
                `[${tag}] FAB too small: ${Math.round(fabBox.width)}×${Math.round(fabBox.height)}px`
              );
            } else {
              passes.push(`[${tag}] FAB size OK: ${Math.round(fabBox.width)}×${Math.round(fabBox.height)}px`);
            }
          }
        }
      }

      // ── 5. Tap targets ≥44×44px ────────────────────────────────────
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
          // Skip elements that are purely decorative / off-screen
          if (box.width === 0 || box.height === 0) continue;
          if (box.y < 0 || box.x < 0) continue;

          const ariaLabel =
            (await el.getAttribute("aria-label").catch(() => null)) || "";
          const text = (await el.textContent().catch(() => "")) || "";
          const labelStr = (ariaLabel || text).trim().substring(0, 50);

          if (box.width < 44 || box.height < 44) {
            issues.push(
              `[${tag}] Tap target too small: "${labelStr}" (${sel}) — ${Math.round(box.width)}×${Math.round(box.height)}px`
            );
          }
        }
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
    console.log("\n\n=== TEST RESULTS ===");
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
