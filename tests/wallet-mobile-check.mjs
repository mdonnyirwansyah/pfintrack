import { chromium } from "@playwright/test";
import { join, dirname } from "path";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VIEWPORTS = [
  { width: 375, height: 667, label: "375" },
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
];

const ROUTES = [
  { path: "/wallet", label: "wallet-list" },
  { path: "/wallet/add", label: "wallet-add" },
];

const SCREENSHOTS_DIR = join(__dirname, "screenshots");
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const issues = [];
const passes = [];

const browser = await chromium.launch({ headless: true });

for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    const tag = `[${route.path} @ ${vp.width}]`;

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
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`PAGE ERROR: ${err.message}`);
    });

    await page.goto(`http://localhost:3000${route.path}`, {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(1500);

    // Screenshot
    const screenshotFile = join(SCREENSHOTS_DIR, `${route.label}-${vp.label}.png`);
    await page.screenshot({ path: screenshotFile, fullPage: false });
    console.log(`SCREENSHOT: ${screenshotFile}`);

    // 1. Console errors
    const filteredErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("manifest") && !e.includes("sw.js")
    );
    if (filteredErrors.length > 0) {
      for (const err of filteredErrors) {
        issues.push(`${tag} Console error: ${err.substring(0, 120)}`);
      }
    } else {
      passes.push(`${tag} No console errors`);
    }

    // 2. Duplicate header check
    const headerCount = await page.locator("header").count();
    if (headerCount > 1) {
      issues.push(`${tag} DUPLICATE HEADER — found ${headerCount} <header> elements`);
    } else if (headerCount === 0) {
      issues.push(`${tag} No header element found`);
    } else {
      passes.push(`${tag} Single header OK`);
    }

    // 3. Header position + height
    const header = page.locator("header").first();
    const headerVisible = await header.isVisible();
    if (!headerVisible) {
      issues.push(`${tag} Header not visible`);
    } else {
      const hBox = await header.boundingBox();
      if (hBox) {
        console.log(`  Header: y=${hBox.y}, h=${hBox.height}`);
        if (hBox.y > 10) {
          issues.push(`${tag} Header not at top — y=${hBox.y}`);
        } else {
          passes.push(`${tag} Header at top (y=${hBox.y})`);
        }
        if (hBox.height < 44 || hBox.height > 90) {
          issues.push(`${tag} Header height unexpected: ${hBox.height}px`);
        } else {
          passes.push(`${tag} Header height OK: ${hBox.height}px`);
        }
      }
    }

    // 4. BottomNav
    const bottomNav = page.locator("nav").first();
    const navVisible = await bottomNav.isVisible();
    if (!navVisible) {
      issues.push(`${tag} BottomNav not visible`);
    } else {
      const navBox = await bottomNav.boundingBox();
      if (navBox) {
        const navBottom = navBox.y + navBox.height;
        console.log(`  BottomNav: y=${navBox.y}, h=${navBox.height}, bottom=${navBottom}`);
        if (navBottom < vp.height - 20) {
          issues.push(`${tag} BottomNav not at bottom — bottom=${navBottom}, viewport=${vp.height}`);
        } else {
          passes.push(`${tag} BottomNav anchored at bottom (bottom=${navBottom})`);
        }
        const tabCount = await bottomNav.locator("a").count();
        if (tabCount !== 4) {
          issues.push(`${tag} Expected 4 nav tabs, found ${tabCount}`);
        } else {
          passes.push(`${tag} BottomNav has 4 tabs`);
        }
      }
    }

    // 5. FAB (only on /wallet list)
    if (route.path === "/wallet") {
      const fab = page.locator('button[aria-label="Add wallet"]');
      const fabVisible = await fab.isVisible();
      if (!fabVisible) {
        issues.push(`${tag} FAB not visible`);
      } else {
        const fabBox = await fab.boundingBox();
        const navBox = await bottomNav.boundingBox();
        if (fabBox && navBox) {
          const fabBottom = fabBox.y + fabBox.height;
          const navTop = navBox.y;
          console.log(`  FAB: x=${fabBox.x}, y=${fabBox.y}, w=${fabBox.width}, h=${fabBox.height}, bottom=${fabBottom}, navTop=${navTop}`);
          if (fabBottom > navTop) {
            issues.push(`${tag} FAB overlaps BottomNav — FAB bottom=${fabBottom}, nav top=${navTop}`);
          } else {
            passes.push(`${tag} FAB above BottomNav (gap=${navTop - fabBottom}px)`);
          }
          const fabRight = fabBox.x + fabBox.width;
          if (fabRight < vp.width - 20) {
            issues.push(`${tag} FAB not in bottom-right — right=${fabRight}, viewport=${vp.width}`);
          } else {
            passes.push(`${tag} FAB in bottom-right (right=${fabRight})`);
          }
          if (fabBox.width < 44 || fabBox.height < 44) {
            issues.push(`${tag} FAB too small: ${fabBox.width}×${fabBox.height}px`);
          } else {
            passes.push(`${tag} FAB size OK: ${fabBox.width}×${fabBox.height}px`);
          }
        }
      }
    }

    // 6. Tap targets ≥44×44px
    for (const sel of ["button", "a[href]"]) {
      const elements = page.locator(sel);
      const count = await elements.count();
      for (let i = 0; i < count; i++) {
        const el = elements.nth(i);
        if (!(await el.isVisible())) continue;
        const box = await el.boundingBox();
        if (!box) continue;
        const label =
          (await el.getAttribute("aria-label")) ||
          (await el.textContent()) ||
          sel;
        const trimmedLabel = label?.trim().substring(0, 40) || sel;
        if (box.width < 44 || box.height < 44) {
          issues.push(
            `${tag} Tap target too small: "${trimmedLabel}" — ${Math.round(box.width)}×${Math.round(box.height)}px`
          );
        }
      }
    }

    // 7. Horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`  Overflow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    if (scrollWidth > clientWidth) {
      issues.push(`${tag} Horizontal overflow — scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    } else {
      passes.push(`${tag} No horizontal overflow`);
    }

    await context.close();
  }
}

await browser.close();

console.log("\n=== PASSES ===");
passes.forEach((p) => console.log("PASS:", p));
console.log("\n=== ISSUES ===");
if (issues.length === 0) {
  console.log("No issues found.");
} else {
  issues.forEach((i) => console.log("ISSUE:", i));
}
console.log(`\nSummary: ${passes.length} passes, ${issues.length} issues`);
