/**
 * Automated test for the Arity x Nordstrom Rack app using Playwright.
 * Run: npx playwright test test_app.mjs  OR  node test_app.mjs
 */
import { chromium } from "playwright";

const BASE_URL = "http://localhost:9090";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let passed = 0, failed = 0;

  function ok(name) { passed++; console.log(`  PASS: ${name}`); }
  function fail(name, err) { failed++; console.log(`  FAIL: ${name} — ${err}`); }

  try {
    // ---- TEST 1: Page loads ----
    console.log("\n[Test 1] Page loads correctly");
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const title = await page.title();
    title.includes("Arity") ? ok("Title contains Arity") : fail("Title", title);

    // ---- TEST 2: Splash screen visible ----
    console.log("[Test 2] Splash screen displayed");
    const splash = await page.locator("#splash").isVisible();
    splash ? ok("Splash visible") : fail("Splash visibility", "not visible");

    const mainHidden = await page.locator("#mainApp").evaluate(el => el.classList.contains("hidden"));
    mainHidden ? ok("Main app hidden initially") : fail("Main app hidden", "visible");

    // ---- TEST 3: API key input exists ----
    console.log("[Test 3] API key input functional");
    const apiInput = page.locator("#apiKeyInput");
    const inputVisible = await apiInput.isVisible();
    inputVisible ? ok("API key input visible") : fail("API key input", "not visible");

    // ---- TEST 4: Launch with dummy key ----
    console.log("[Test 4] Launch button hides splash");
    // Calcite web components need shadow DOM input targeting
    await page.evaluate(() => {
      const el = document.getElementById("apiKeyInput");
      el.value = "AAPK_test_dummy_key_12345";
    });
    await sleep(500);
    await page.evaluate(() => document.getElementById("launchBtn").click());
    await sleep(2000);

    const splashHidden = await page.locator("#splash").evaluate(el => el.classList.contains("hidden"));
    splashHidden ? ok("Splash hidden after launch") : fail("Splash hide", "still visible");

    const mainVisible = await page.locator("#mainApp").evaluate(el => !el.classList.contains("hidden"));
    mainVisible ? ok("Main app visible after launch") : fail("Main app visibility", "hidden");

    // ---- TEST 5: Map container exists ----
    console.log("[Test 5] Map container rendered");
    const viewDiv = await page.locator("#viewDiv").isVisible();
    viewDiv ? ok("Map container visible") : fail("Map container", "not visible");

    // ---- TEST 6: Panel elements exist ----
    console.log("[Test 6] Right panel elements");
    const storeSelect = await page.locator("#storeSelect").isVisible();
    storeSelect ? ok("Store selector visible") : fail("Store selector", "not visible");

    const radiusSelect = await page.locator("#radiusSelect").isVisible();
    radiusSelect ? ok("Radius selector visible") : fail("Radius selector", "not visible");

    const analyzeBtn = await page.locator("#analyzeBtn").isVisible();
    analyzeBtn ? ok("Analyze button visible") : fail("Analyze button", "not visible");

    // ---- TEST 7: Store options populated ----
    console.log("[Test 7] Store dropdown populated");
    const optionCount = await page.locator("#storeSelect calcite-option").count();
    optionCount > 10 ? ok(`Store options: ${optionCount} (including placeholder)`) : fail("Store options count", optionCount);

    // ---- TEST 8: Geoenrichment checkboxes exist in DOM ----
    console.log("[Test 8] Enrichment variable checkboxes (DOM check)");
    const chkDemoExists = await page.locator("#chkDemo").count() > 0;
    const chkIncomeExists = await page.locator("#chkIncome").count() > 0;
    const chkSpendingExists = await page.locator("#chkSpending").count() > 0;
    (chkDemoExists && chkIncomeExists && chkSpendingExists) ? ok("All enrichment checkboxes in DOM") : fail("Checkboxes", "missing from DOM");

    // ---- TEST 9: Layer controls exist in DOM ----
    console.log("[Test 9] Layer control switches (DOM check)");
    const heatSwitchExists = await page.locator("#heatSwitch").count() > 0;
    const storeVisExists = await page.locator("#storeVis").count() > 0;
    (heatSwitchExists && storeVisExists) ? ok("Layer switches in DOM") : fail("Layer switches", "missing from DOM");

    // ---- TEST 10: Custom location switch ----
    console.log("[Test 10] Custom location mode switch");
    const customSwitch = await page.locator("#customSwitch").isVisible();
    customSwitch ? ok("Custom location switch visible") : fail("Custom switch", "not visible");

    // ---- TEST 11: Results initially hidden ----
    console.log("[Test 11] Results section initially hidden");
    const resultsHidden = await page.locator("#resultsBox").evaluate(el => el.classList.contains("hidden"));
    resultsHidden ? ok("Results hidden before analysis") : fail("Results visibility", "not hidden");

    // ---- TEST 12: No console errors (check for critical JS errors) ----
    console.log("[Test 12] Checking for critical JS errors");
    const errors = [];
    page.on("pageerror", err => errors.push(err.message));
    await sleep(3000);
    // Filter out API key errors (expected with dummy key)
    const critical = errors.filter(e => !e.includes("api") && !e.includes("token") && !e.includes("API"));
    critical.length === 0 ? ok("No critical JS errors") : fail("JS errors", critical.join("; "));

    // ---- TEST 13: Screenshot ----
    console.log("[Test 13] Taking screenshot");
    await page.screenshot({ path: "test_screenshot.png", fullPage: false });
    ok("Screenshot saved as test_screenshot.png");

  } catch (err) {
    fail("Unexpected error", err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log(`${"=".repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
