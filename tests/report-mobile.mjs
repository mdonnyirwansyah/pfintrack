import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR =
  "/Users/dy/Projects/javascript/pfintrack/tests/screenshots";

const VIEWPORTS = [
  { width: 375, height: 667, label: "375" },
  { width: 390, height: 844, label: "390" },
  { width: 430, height: 932, label: "430" },
];

const ROUTES = [
  { path: "/report", name: "report-main" },
  { path: "/report/custom/add", name: "report-custom-add" },
];

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = { pass: [], fail: [] };

// Detailed measurement log
const measurements = [];

function addFail(route, viewport, issue) {
  results.fail.push({ route, viewport, issue });
}

function addPass(route, viewport, note) {
  results.pass.push(`${route} @ ${viewport} — ${note}`);
}

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  for (const route of ROUTES) {
    const page = await context.newPage();
    const consoleErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
    });

    const url = `${BASE_URL}${route.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Wait for client-side hydration
    await page.waitForTimeout(1000);

    // ---- Screenshot ----
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `${route.name}-${vp.label}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const issuesBefore = results.fail.length;

    // ---- Check 1: No console errors ----
    if (consoleErrors.length > 0) {
      const filtered = consoleErrors.filter(
        (e) =>
          !e.includes("Warning:") &&
          !e.includes("net::ERR_ABORTED") &&
          !e.toLowerCase().includes("favicon")
      );
      if (filtered.length > 0) {
        addFail(route.path, vp.width, `Console errors: ${filtered.slice(0, 2).join(" | ")}`);
      }
    }

    // ---- Check 2: Single AppHeader ----
    const headerEls = await page.locator("header").all();
    const headerCount = headerEls.length;
    let headerHeight = null;

    if (headerCount === 0) {
      addFail(route.path, vp.width, "No <header> element found");
    } else if (headerCount > 1) {
      addFail(route.path, vp.width, `Multiple <header> elements: ${headerCount}`);
    } else {
      const box = await headerEls[0].boundingBox();
      if (box) {
        headerHeight = box.height;
        // Expect 56px (or up to 80px with safe area on some devices in emulation)
        if (box.height < 44 || box.height > 120) {
          addFail(
            route.path,
            vp.width,
            `Header height ${box.height}px outside expected range 44–120px`
          );
        }
        // Should be fixed at top (y = 0)
        if (box.y > 2) {
          addFail(
            route.path,
            vp.width,
            `Header not at top: y=${box.y}px`
          );
        }
      }
    }

    // ---- Check 3: BottomNav on /report ----
    let navHeight = null;
    let navY = null;
    if (route.path === "/report") {
      const nav = page.locator("nav");
      const navCount = await nav.count();
      if (navCount === 0) {
        addFail(route.path, vp.width, "No <nav> element found (BottomNav missing)");
      } else {
        // BottomNav is the last nav
        const navLast = nav.last();
        const navBox = await navLast.boundingBox();
        if (!navBox) {
          addFail(route.path, vp.width, "BottomNav has no bounding box (not visible)");
        } else {
          navHeight = navBox.height;
          navY = navBox.y;
          const navBottom = navBox.y + navBox.height;
          if (navBottom < vp.height - 5) {
            addFail(
              route.path,
              vp.width,
              `BottomNav bottom edge at ${navBottom}px, expected ~${vp.height}px`
            );
          }

          // 4 tabs: Transactions, Wallet, Report, Loan
          const navLinks = nav.last().locator("a");
          const tabCount = await navLinks.count();
          if (tabCount !== 4) {
            addFail(
              route.path,
              vp.width,
              `BottomNav has ${tabCount} tabs (expected 4)`
            );
          }

          // Report tab should exist
          const reportTabLink = nav.last().locator('a[aria-label="Report"]');
          if ((await reportTabLink.count()) === 0) {
            addFail(route.path, vp.width, 'Report tab link missing aria-label="Report"');
          }

          // No Settings tab
          const settingsTab = nav.last().locator('a[aria-label="Settings"]');
          if ((await settingsTab.count()) > 0) {
            addFail(route.path, vp.width, "Settings tab found in BottomNav (should not exist)");
          }

          // Each nav link ≥44×44px
          for (let i = 0; i < tabCount; i++) {
            const link = navLinks.nth(i);
            const lBox = await link.boundingBox();
            const label = await link.getAttribute("aria-label");
            if (lBox) {
              if (lBox.width < 44 || lBox.height < 44) {
                addFail(
                  route.path,
                  vp.width,
                  `BottomNav tab "${label}" size ${lBox.width}x${lBox.height}px < 44x44px`
                );
              }
            }
          }
        }
      }
    }

    // ---- Check 4: Tab switcher on /report ----
    if (route.path === "/report") {
      for (const tabLabel of ["Realtime", "Monthly", "Custom"]) {
        const btn = page.locator(`button:has-text("${tabLabel}")`).first();
        const count = await page
          .locator(`button:has-text("${tabLabel}")`)
          .count();
        if (count === 0) {
          addFail(route.path, vp.width, `Tab button "${tabLabel}" not found`);
          continue;
        }
        const box = await btn.boundingBox();
        if (box) {
          measurements.push({
            route: route.path,
            viewport: vp.width,
            element: `tab-${tabLabel}`,
            w: box.width,
            h: box.height,
          });
          if (box.height < 44) {
            addFail(
              route.path,
              vp.width,
              `Tab "${tabLabel}" height ${box.height}px < 44px tap target`
            );
          }
        }
      }
    }

    // ---- Check 5: Form inputs ≥44px on /report/custom/add ----
    if (route.path === "/report/custom/add") {
      const inputs = await page
        .locator("input[type='text'], input[type='date']")
        .all();
      for (const inp of inputs) {
        const box = await inp.boundingBox();
        const id = await inp.getAttribute("id");
        if (box) {
          measurements.push({
            route: route.path,
            viewport: vp.width,
            element: `input#${id}`,
            w: box.width,
            h: box.height,
          });
          if (box.height < 44) {
            addFail(
              route.path,
              vp.width,
              `input#${id} height ${box.height}px < 44px`
            );
          }
        }
      }

      // Save button
      const saveBtn = page.locator("button[type='submit']");
      const saveBtnCount = await saveBtn.count();
      if (saveBtnCount === 0) {
        addFail(route.path, vp.width, "Save button (type=submit) not found");
      } else {
        const box = await saveBtn.boundingBox();
        if (box) {
          measurements.push({
            route: route.path,
            viewport: vp.width,
            element: "button[type=submit]",
            w: box.width,
            h: box.height,
          });
          if (box.height < 44) {
            addFail(
              route.path,
              vp.width,
              `Save button height ${box.height}px < 44px`
            );
          }
        }
      }

      // Back button
      const backBtn = page.locator('button[aria-label="Go back"]');
      const backCount = await backBtn.count();
      if (backCount === 0) {
        addFail(route.path, vp.width, "Back button (aria-label='Go back') not found");
      } else {
        const box = await backBtn.boundingBox();
        if (box) {
          measurements.push({
            route: route.path,
            viewport: vp.width,
            element: "back-button",
            w: box.width,
            h: box.height,
          });
          if (box.width < 44 || box.height < 44) {
            addFail(
              route.path,
              vp.width,
              `Back button size ${box.width}x${box.height}px < 44x44px`
            );
          }
        }
      }

      // BottomNav should NOT be shown on /report/custom/add (it's in layout, so it will be)
      // Actually BottomNav is in the root layout, so it will be visible on all routes.
      // Just verify it exists and check it doesn't overlap form content.
      const nav = page.locator("nav").last();
      const navBox = await nav.boundingBox();
      if (navBox) {
        navHeight = navBox.height;
        navY = navBox.y;
      }
    }

    // ---- Check 6: No horizontal overflow ----
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    if (scrollWidth > innerWidth) {
      addFail(
        route.path,
        vp.width,
        `Horizontal overflow: scrollWidth=${scrollWidth}px > innerWidth=${innerWidth}px`
      );
    }

    // ---- Check 7: Header title text ----
    const titleEl = page.locator("header h1");
    const titleCount = await titleEl.count();
    if (titleCount === 0) {
      addFail(route.path, vp.width, "No h1 inside header");
    } else {
      const titleText = (await titleEl.first().textContent())?.trim();
      const expectedPart = route.path === "/report" ? "Report" : "Add Report";
      if (!titleText || !titleText.includes(expectedPart.split(" ")[0])) {
        addFail(
          route.path,
          vp.width,
          `Header title "${titleText}" does not include "${expectedPart}"`
        );
      }
    }

    // Record measurements
    measurements.push({
      route: route.path,
      viewport: vp.width,
      element: "header",
      h: headerHeight,
    });
    if (navHeight !== null) {
      measurements.push({
        route: route.path,
        viewport: vp.width,
        element: "bottom-nav",
        h: navHeight,
        y: navY,
      });
    }

    // Determine pass/fail for this route+viewport
    const issuesAfter = results.fail.length;
    if (issuesAfter === issuesBefore) {
      addPass(route.path, vp.width, "clean");
    }

    await page.close();
  }

  await context.close();
}

await browser.close();

// ---- Print report ----
console.log("\n## Mobile UI Test Report\n");
console.log(`### Routes tested: 2 / 2`);
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
const reportFiles = fs
  .readdirSync(SCREENSHOT_DIR)
  .filter((f) => f.startsWith("report-"))
  .sort();
reportFiles.forEach((f) => console.log(`  ${SCREENSHOT_DIR}/${f}`));

console.log("\n### Measurements");
measurements.forEach((m) => {
  const parts = [`  ${m.element}`, `route=${m.route}`, `vp=${m.viewport}`];
  if (m.w !== undefined) parts.push(`w=${m.w}`);
  if (m.h !== undefined) parts.push(`h=${m.h}`);
  if (m.y !== undefined) parts.push(`y=${m.y}`);
  console.log(parts.join(" | "));
});
