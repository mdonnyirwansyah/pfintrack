import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "/Users/dy/Projects/javascript/pfintrack/tests/screenshots";

const VIEWPORTS = [
  { width: 375, height: 667, label: "375" },
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
];

const ROUTES = [
  { path: "/report", name: "report-main" },
  { path: "/report/custom/add", name: "report-custom-add" },
];

interface IssueEntry {
  route: string;
  viewport: number;
  issue: string;
}

async function runTests() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: { pass: string[]; fail: IssueEntry[] } = { pass: [], fail: [] };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    const consoleErrors: Record<string, string[]> = {};

    for (const route of ROUTES) {
      const page = await context.newPage();
      const errors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        errors.push(`[pageerror] ${err.message}`);
      });

      const url = `${BASE_URL}${route.path}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Extra wait for client-side hydration
      await page.waitForTimeout(800);

      const screenshotPath = path.join(
        SCREENSHOT_DIR,
        `${route.name}-${vp.label}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const routeKey = `${route.path} @ ${vp.width}`;
      consoleErrors[routeKey] = errors;

      // ---- Check 1: No console errors ----
      if (errors.length > 0) {
        results.fail.push({
          route: route.path,
          viewport: vp.width,
          issue: `Console errors: ${errors.slice(0, 3).join(" | ")}`,
        });
      }

      // ---- Check 2: Single AppHeader, height ~56px ----
      const headers = await page.locator("header").all();
      if (headers.length === 0) {
        results.fail.push({ route: route.path, viewport: vp.width, issue: "No header found" });
      } else if (headers.length > 1) {
        results.fail.push({ route: route.path, viewport: vp.width, issue: `Multiple headers found: ${headers.length}` });
      } else {
        const headerBox = await headers[0].boundingBox();
        if (headerBox) {
          const visibleHeight = headerBox.height;
          // Header uses height: var(--header-height) = 56px + paddingTop for safe area
          if (visibleHeight < 44 || visibleHeight > 120) {
            results.fail.push({
              route: route.path,
              viewport: vp.width,
              issue: `Header height unexpected: ${visibleHeight}px (expected ~56px)`,
            });
          } else {
            // Pass noted later
          }
        }
      }

      // ---- Check 3: BottomNav visibility (only on /report, not /report/custom/add) ----
      const bottomNav = page.locator("nav").last();
      const navBox = await bottomNav.boundingBox();
      const isRootTab = route.path === "/report";

      if (isRootTab) {
        if (!navBox) {
          results.fail.push({ route: route.path, viewport: vp.width, issue: "BottomNav not found" });
        } else {
          // Should be at bottom of viewport
          const navBottom = navBox.y + navBox.height;
          if (navBottom < vp.height - 10) {
            results.fail.push({
              route: route.path,
              viewport: vp.width,
              issue: `BottomNav not pinned to bottom: navBottom=${navBottom}px, viewport=${vp.height}px`,
            });
          }
          // Check Report tab is active (has nav-active color or aria)
          const reportTab = page.locator('nav a[aria-label="Report"]');
          const tabCount = await reportTab.count();
          if (tabCount === 0) {
            results.fail.push({ route: route.path, viewport: vp.width, issue: 'Report tab not found in BottomNav' });
          }
          // Check 4 tabs total
          const allTabs = page.locator('nav a');
          const totalTabs = await allTabs.count();
          if (totalTabs !== 4) {
            results.fail.push({
              route: route.path,
              viewport: vp.width,
              issue: `BottomNav tab count: ${totalTabs} (expected 4)`,
            });
          }
        }
      }

      // ---- Check 4: Tab buttons on /report ----
      if (route.path === "/report") {
        const tabButtons = page.locator('button[style*="brand"]').or(
          page.locator('.rounded-full button, div > button')
        );
        // Check specific tab text
        for (const tabLabel of ["Realtime", "Monthly", "Custom"]) {
          const tabBtn = page.locator(`button:has-text("${tabLabel}")`);
          const count = await tabBtn.count();
          if (count === 0) {
            results.fail.push({
              route: route.path,
              viewport: vp.width,
              issue: `Tab button "${tabLabel}" not found`,
            });
          } else {
            const box = await tabBtn.first().boundingBox();
            if (box) {
              if (box.height < 44) {
                results.fail.push({
                  route: route.path,
                  viewport: vp.width,
                  issue: `Tab "${tabLabel}" height ${box.height}px < 44px tap target`,
                });
              }
              if (box.width < 44) {
                results.fail.push({
                  route: route.path,
                  viewport: vp.width,
                  issue: `Tab "${tabLabel}" width ${box.width}px < 44px tap target`,
                });
              }
            }
          }
        }
      }

      // ---- Check 5: Interactive elements ≥44×44px on /report/custom/add ----
      if (route.path === "/report/custom/add") {
        const inputs = await page.locator("input, button[type='submit']").all();
        for (const el of inputs) {
          const box = await el.boundingBox();
          if (box) {
            const tag = await el.evaluate((e) => e.tagName.toLowerCase());
            const type = await el.getAttribute("type");
            const id = await el.getAttribute("id");
            if (box.height < 44) {
              results.fail.push({
                route: route.path,
                viewport: vp.width,
                issue: `${tag}[type=${type}][id=${id}] height ${box.height}px < 44px`,
              });
            }
          }
        }

        // Back button in header
        const backBtn = page.locator('button[aria-label="Go back"]');
        const backCount = await backBtn.count();
        if (backCount === 0) {
          results.fail.push({ route: route.path, viewport: vp.width, issue: 'Back button not found in header' });
        } else {
          const box = await backBtn.boundingBox();
          if (box && (box.width < 44 || box.height < 44)) {
            results.fail.push({
              route: route.path,
              viewport: vp.width,
              issue: `Back button ${box.width}x${box.height}px < 44x44px`,
            });
          }
        }
      }

      // ---- Check 6: No horizontal overflow ----
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        results.fail.push({
          route: route.path,
          viewport: vp.width,
          issue: `Horizontal overflow: scrollWidth=${scrollWidth}px > viewport=${vp.width}px`,
        });
      }

      // ---- Check 7: Verify title in header ----
      const expectedTitle = route.path === "/report" ? "Report" : "Add Report";
      const titleEl = page.locator("header h1");
      const titleCount = await titleEl.count();
      if (titleCount === 0) {
        results.fail.push({ route: route.path, viewport: vp.width, issue: "Header h1 title not found" });
      } else {
        const titleText = await titleEl.first().textContent();
        if (!titleText?.includes(expectedTitle.split(" ")[0])) {
          results.fail.push({
            route: route.path,
            viewport: vp.width,
            issue: `Header title mismatch: "${titleText}" vs expected "${expectedTitle}"`,
          });
        }
      }

      // Mark as pass if no issues were added for this route+viewport
      const hasFailForThis = results.fail.some(
        (f) => f.route === route.path && f.viewport === vp.width
      );
      if (!hasFailForThis) {
        results.pass.push(`${route.path} @ ${vp.width} — clean`);
      }

      await page.close();
    }

    await context.close();
  }

  await browser.close();

  // ---- Print report ----
  console.log("\n## Mobile UI Test Report\n");
  console.log(`### Routes tested: ${ROUTES.length} / 2`);
  console.log(`### Viewports: 375, 390, 430\n`);

  if (results.pass.length > 0) {
    console.log("### Pass");
    results.pass.forEach((p) => console.log(`- ${p}`));
  }

  if (results.fail.length > 0) {
    console.log("\n### Fail");
    results.fail.forEach((f) =>
      console.log(`- ${f.route} @ ${f.viewport} — ${f.issue}`)
    );
  } else {
    console.log("\n### No failures detected");
  }

  console.log("\n### Screenshots");
  console.log(SCREENSHOT_DIR);

  // List screenshot files
  const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.startsWith("report-"));
  files.sort().forEach((f) => console.log(`  ${SCREENSHOT_DIR}/${f}`));

  // Additional detail: header heights, nav positions per route/viewport
  console.log("\n### Detail Measurements");
  return { pass: results.pass, fail: results.fail };
}

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
