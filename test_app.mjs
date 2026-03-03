/**
 * Automated test for the Arity x Nordstrom Rack app using Playwright.
 * Tests both API Key mode and Demo Data mode.
 */
import { chromium } from "playwright";

const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : "http://localhost:9092";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  let passed = 0, failed = 0;

  function ok(name) { passed++; console.log(`  PASS: ${name}`); }
  function fail(name, err) { failed++; console.log(`  FAIL: ${name} — ${err}`); }

  // =============================================
  // SUITE 1: API KEY MODE
  // =============================================
  console.log("\n========== SUITE 1: API KEY MODE ==========");
  {
    const page = await browser.newPage();
    try {
      console.log("[1.1] Page loads");
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      const title = await page.title();
      title.includes("Arity") ? ok("Title") : fail("Title", title);

      console.log("[1.2] Splash elements");
      (await page.locator("#splash").isVisible()) ? ok("Splash visible") : fail("Splash", "not visible");
      (await page.locator("#launchBtn").count() > 0) ? ok("Launch btn in DOM") : fail("Launch btn", "missing");
      (await page.locator("#demoBtn").count() > 0) ? ok("Demo btn in DOM") : fail("Demo btn", "missing");
      (await page.locator("#apiKeyInput").isVisible()) ? ok("API key input") : fail("API key input", "missing");

      console.log("[1.3] Launch with API key");
      await page.evaluate(() => { document.getElementById("apiKeyInput").value = "AAPK_test_key_123"; });
      await sleep(300);
      await page.evaluate(() => document.getElementById("launchBtn").click());
      await sleep(2000);
      (await page.locator("#splash").evaluate(el => el.classList.contains("hidden"))) ? ok("Splash hidden") : fail("Splash hide", "visible");
      (await page.locator("#mainApp").evaluate(el => !el.classList.contains("hidden"))) ? ok("Main app shown") : fail("Main app", "hidden");

      console.log("[1.4] Demo mode chip hidden in API key mode");
      (await page.locator("#modeChip").evaluate(el => el.classList.contains("hidden"))) ? ok("DEMO chip hidden") : fail("DEMO chip", "visible");

      console.log("[1.5] Panel elements");
      (await page.locator("#storeSelect").isVisible()) ? ok("Store select") : fail("Store select", "missing");
      (await page.locator("#analyzeBtn").isVisible()) ? ok("Analyze btn") : fail("Analyze btn", "missing");
      const opts = await page.locator("#storeSelect calcite-option").count();
      opts === 21 ? ok(`Store options: ${opts}`) : fail("Store options", opts);

      console.log("[1.6] Enrichment & layer controls in DOM");
      (await page.locator("#chkDemo").count() > 0) ? ok("Enrichment checkboxes") : fail("Checkboxes", "missing");
      (await page.locator("#heatSwitch").count() > 0) ? ok("Heat switch") : fail("Heat switch", "missing");
      (await page.locator("#agolSwitch").count() > 0) ? ok("AGOL switch") : fail("AGOL switch", "missing");
      (await page.locator("#publishBtn").count() > 0) ? ok("Publish btn") : fail("Publish btn", "missing");

      console.log("[1.7] Results hidden before analysis");
      (await page.locator("#resultsBox").evaluate(el => el.classList.contains("hidden"))) ? ok("Results hidden") : fail("Results", "visible");

      console.log("[1.8] Demo notice hidden in API key mode");
      (await page.locator("#demoNotice").evaluate(el => el.classList.contains("hidden"))) ? ok("Demo notice hidden") : fail("Demo notice", "visible");

      await page.screenshot({ path: "test_apikey_mode.png" });
      ok("Screenshot: test_apikey_mode.png");
    } catch (err) { fail("Suite 1 error", err.message); }
    await page.close();
  }

  // =============================================
  // SUITE 2: DEMO DATA MODE
  // =============================================
  console.log("\n========== SUITE 2: DEMO DATA MODE ==========");
  {
    const page = await browser.newPage();
    try {
      console.log("[2.1] Load page");
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(1000);

      console.log("[2.2] Launch with Demo Data (no API key)");
      await page.evaluate(() => document.getElementById("demoBtn").click());
      await sleep(2500);
      (await page.locator("#splash").evaluate(el => el.classList.contains("hidden"))) ? ok("Splash hidden") : fail("Splash hide", "visible");
      (await page.locator("#mainApp").evaluate(el => !el.classList.contains("hidden"))) ? ok("Main app shown") : fail("Main app", "hidden");

      console.log("[2.3] DEMO MODE chip visible");
      (await page.locator("#modeChip").evaluate(el => !el.classList.contains("hidden"))) ? ok("DEMO chip visible") : fail("DEMO chip", "hidden");

      console.log("[2.4] Demo notice visible in enrichment section");
      (await page.locator("#demoNotice").evaluate(el => !el.classList.contains("hidden"))) ? ok("Demo notice visible") : fail("Demo notice", "hidden");

      console.log("[2.5] Map container renders");
      (await page.locator("#viewDiv").isVisible()) ? ok("Map visible") : fail("Map", "not visible");

      console.log("[2.6] Store dropdown works");
      const opts = await page.locator("#storeSelect calcite-option").count();
      opts === 21 ? ok(`Store options: ${opts}`) : fail("Store options", opts);

      console.log("[2.7] Check no critical JS errors");
      const errors = [];
      page.on("pageerror", err => errors.push(err.message));
      await sleep(2000);
      const critical = errors.filter(e => !e.toLowerCase().includes("api") && !e.toLowerCase().includes("token") && !e.toLowerCase().includes("failed to fetch"));
      critical.length === 0 ? ok("No critical JS errors") : fail("JS errors", critical.join("; "));

      console.log("[2.8] Verify mock data function in source");
      const hasMockFn = await page.evaluate(() => {
        const scripts = document.querySelectorAll("script:not([src])");
        return Array.from(scripts).some(s => s.textContent.includes("generateMockData"));
      });
      hasMockFn ? ok("generateMockData in source") : fail("generateMockData", "not found");

      await page.screenshot({ path: "test_demo_mode.png" });
      ok("Screenshot: test_demo_mode.png");
    } catch (err) { fail("Suite 2 error", err.message); }
    await page.close();
  }

  // =============================================
  // SUITE 3: DEMO MODE ANALYSIS (simulate store analysis)
  // =============================================
  console.log("\n========== SUITE 3: DEMO ANALYSIS ==========");
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      console.log("[3.1] Launch in demo mode");
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(1500);
      await page.evaluate(() => document.getElementById("demoBtn").click());
      await sleep(3000);
      ok("App launched in demo mode");

      console.log("[3.2] Select a store and trigger analysis");
      // Select first store (id=1, Downtown LA)
      await page.evaluate(() => {
        const sel = document.getElementById("storeSelect");
        sel.value = "1";
        sel.dispatchEvent(new Event("calciteSelectChange"));
      });
      await sleep(500);

      // Click analyze
      await page.evaluate(() => {
        document.getElementById("analyzeBtn").disabled = false;
        document.getElementById("analyzeBtn").click();
      });
      await sleep(4000);

      console.log("[3.3] Results section visible after analysis");
      const resultsVisible = await page.locator("#resultsBox").evaluate(el => !el.classList.contains("hidden"));
      resultsVisible ? ok("Results visible") : fail("Results", "still hidden");

      console.log("[3.4] Score content populated");
      const scoreHTML = await page.locator("#scoreContent").innerHTML();
      (scoreHTML.length > 50 && scoreHTML.includes("score")) ? ok("Score rendered") : fail("Score content", `length=${scoreHTML.length}`);

      console.log("[3.5] Demographics content populated with mock data");
      const demoHTML = await page.locator("#demoContent").innerHTML();
      (demoHTML.length > 50 && demoHTML.includes("stat-card")) ? ok("Demographics rendered") : fail("Demographics", `length=${demoHTML.length}`);

      console.log("[3.6] Traffic content populated");
      const trafficHTML = await page.locator("#trafficContent").innerHTML();
      (trafficHTML.length > 50) ? ok("Traffic rendered") : fail("Traffic", `length=${trafficHTML.length}`);

      console.log("[3.7] Recommendations content populated");
      const recsHTML = await page.locator("#recsContent").innerHTML();
      (recsHTML.length > 50 && recsHTML.includes("rec")) ? ok("Recommendations rendered") : fail("Recommendations", `length=${recsHTML.length}`);

      await page.screenshot({ path: "test_demo_analysis.png" });
      ok("Screenshot: test_demo_analysis.png");
    } catch (err) { fail("Suite 3 error", err.message); }
    await page.close();
  }

  await browser.close();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`TOTAL: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log(`${"=".repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
