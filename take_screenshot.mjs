import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto("http://localhost:9091", { waitUntil: "domcontentloaded", timeout: 30000 });
  // Screenshot splash
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: "screenshot_splash.png" });
  console.log("Splash screenshot saved");
  // Launch app
  await page.evaluate(() => {
    document.getElementById("apiKeyInput").value = "AAPK_demo_key";
    document.getElementById("launchBtn").click();
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: "screenshot.png" });
  console.log("App screenshot saved");
  // Check AGOL publish elements
  const publishBtn = await page.locator("#publishBtn").count();
  const agolUser = await page.locator("#agolUser").count();
  const agolSwitch = await page.locator("#agolSwitch").count();
  console.log(`AGOL elements - publishBtn:${publishBtn} agolUser:${agolUser} agolSwitch:${agolSwitch}`);
  await browser.close();
}
run();
