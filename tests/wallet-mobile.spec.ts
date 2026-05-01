import { test, expect, chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

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

const issues: string[] = [];

async function runTests() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      });

      const page = await context.newPage();
      const consoleErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      page.on("pageerror", (err) => {
        consoleErrors.push(`PAGE ERROR: ${err.message}`);
      });

      await page.goto(`http://localhost:3000${route.path}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Wait a bit for client-side rendering
      await page.waitForTimeout(1500);

      const screenshotFile = path.join(
        SCREENSHOTS_DIR,
        `${route.label}-${vp.label}.png`
      );
      await page.screenshot({ path: screenshotFile, fullPage: false });
      console.log(`SCREENSHOT: ${screenshotFile}`);

      // ── 1. Console errors ──────────────────────────────────────────
      if (consoleErrors.length > 0) {
        for (const err of consoleErrors) {
          issues.push(
            `[${route.path} @ ${vp.width}] Console error: ${err}`
          );
        }
      }

      // ── 2. Header visible ──────────────────────────────────────────
      const header = page.locator("header").first();
      const headerVisible = await header.isVisible();
      if (!headerVisible) {
        issues.push(`[${route.path} @ ${vp.width}] Header not visible`);
      } else {
        const headerBox = await header.boundingBox();
        if (headerBox) {
          const headerTop = headerBox.y;
          if (headerTop > 10) {
            issues.push(
              `[${route.path} @ ${vp.width}] Header not at top — y=${headerTop}`
            );
          }
          // height should be ~56px (no safe area in test env)
          if (headerBox.height < 44 || headerBox.height > 80) {
            issues.push(
              `[${route.path} @ ${vp.width}] Header height unexpected: ${headerBox.height}px`
            );
          }
          console.log(
            `  Header: y=${headerTop}, h=${headerBox.height} — ${headerVisible ? "visible" : "HIDDEN"}`
          );
        }
      }

      // ── 3. BottomNav visible (only on root tabs) ───────────────────
      const isRootTab = !route.path.includes("/add") && !route.path.match(/\/\[|\/\w+\/\w+/);
      const bottomNav = page.locator("nav").first();
      const navVisible = await bottomNav.isVisible();

      if (isRootTab) {
        if (!navVisible) {
          issues.push(
            `[${route.path} @ ${vp.width}] BottomNav not visible on root tab`
          );
        } else {
          const navBox = await bottomNav.boundingBox();
          if (navBox) {
            const navBottom = navBox.y + navBox.height;
            if (navBottom < vp.height - 20) {
              issues.push(
                `[${route.path} @ ${vp.width}] BottomNav not anchored to bottom — bottom edge=${navBottom}, viewport=${vp.height}`
              );
            }
            console.log(
              `  BottomNav: y=${navBox.y}, h=${navBox.height}, bottom=${navBottom} — visible`
            );

            // Check 4 nav tabs
            const navLinks = bottomNav.locator("a");
            const navCount = await navLinks.count();
            if (navCount !== 4) {
              issues.push(
                `[${route.path} @ ${vp.width}] Expected 4 nav tabs, found ${navCount}`
              );
            }
          }
        }
      }

      // ── 4. FAB position (only on /wallet list) ─────────────────────
      if (route.path === "/wallet") {
        const fab = page.locator('button[aria-label="Add wallet"]');
        const fabVisible = await fab.isVisible();
        if (!fabVisible) {
          issues.push(`[${route.path} @ ${vp.width}] FAB not visible`);
        } else {
          const fabBox = await fab.boundingBox();
          const navBox = await bottomNav.boundingBox();
          if (fabBox && navBox) {
            const fabBottom = fabBox.y + fabBox.height;
            const navTop = navBox.y;
            // FAB bottom should be above nav top
            if (fabBottom > navTop) {
              issues.push(
                `[${route.path} @ ${vp.width}] FAB overlaps BottomNav — FAB bottom=${fabBottom}, nav top=${navTop}`
              );
            }
            // FAB should be in bottom-right quadrant
            const fabRight = fabBox.x + fabBox.width;
            if (fabRight < vp.width - 20) {
              issues.push(
                `[${route.path} @ ${vp.width}] FAB not in bottom-right — right edge=${fabRight}`
              );
            }
            console.log(
              `  FAB: x=${fabBox.x}, y=${fabBox.y}, w=${fabBox.width}, h=${fabBox.height}, bottom=${fabBottom}, navTop=${navTop}`
            );
          }
        }
      }

      // ── 5. Tap targets ≥44×44px ────────────────────────────────────
      const interactiveSelectors = [
        "button",
        'a[href]',
        'input[type="submit"]',
        'input[type="button"]',
      ];

      for (const sel of interactiveSelectors) {
        const elements = page.locator(sel);
        const count = await elements.count();
        for (let i = 0; i < count; i++) {
          const el = elements.nth(i);
          const visible = await el.isVisible();
          if (!visible) continue;
          const box = await el.boundingBox();
          if (!box) continue;
          const label = await el.getAttribute("aria-label") ||
            await el.textContent() ||
            sel;
          const trimmedLabel = label?.trim().substring(0, 40) || sel;
          if (box.width < 44 || box.height < 44) {
            issues.push(
              `[${route.path} @ ${vp.width}] Tap target too small: "${trimmedLabel}" — ${Math.round(box.width)}×${Math.round(box.height)}px`
            );
          }
        }
      }

      // ── 6. Horizontal overflow ─────────────────────────────────────
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      if (scrollWidth > clientWidth) {
        issues.push(
          `[${route.path} @ ${vp.width}] Horizontal overflow — scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`
        );
      }
      console.log(`  Overflow check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);

      await context.close();
    }
  }

  await browser.close();

  return issues;
}

runTests().then((issues) => {
  console.log("\n=== ISSUES FOUND ===");
  if (issues.length === 0) {
    console.log("No issues found.");
  } else {
    issues.forEach((i) => console.log("ISSUE:", i));
  }
  console.log("=== END ISSUES ===");
}).catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
