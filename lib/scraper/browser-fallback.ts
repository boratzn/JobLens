export async function fetchWithBrowserFallback(
  url: string
): Promise<string | null> {
  if (process.env.ENABLE_PLAYWRIGHT_FALLBACK !== "true") {
    return null;
  }

  try {
    // Dinamik içe aktarma: Paketler isteğe bağlı olduğundan derleme aşamasında hata vermemesi için
    // dinamik Function çağrısı kullanılır.
    const importChromium = new Function('return import("@sparticuz/chromium")');
    const importPlaywright = new Function('return import("playwright-core")');

    const chromiumModule = await importChromium();
    const playwrightModule = await importPlaywright();

    const chromium = chromiumModule.default || chromiumModule;
    const playwright = playwrightModule.default || playwrightModule;

    const executablePath = await chromium.executablePath();
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "tr-TR",
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const content = await page.content();
    await browser.close();

    return content;
  } catch (error) {
    console.warn("Playwright fallback scraping başarısız oldu:", error);
    return null;
  }
}
