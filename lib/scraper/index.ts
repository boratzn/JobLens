import * as cheerio from "cheerio";
import { normalizeJobUrl, NormalizedUrlResult } from "./normalize";
import { extractJsonLdJobPosting, ExtractedJobData } from "./jsonld";
import { parseKariyerNetHtml } from "./kariyernet";
import { parseLinkedInHtml } from "./linkedin";
import { parseIndeedHtml } from "./indeed";
import { parseSecretcvHtml, parseYenibirisHtml } from "./secretcv";
import { parseGenericHtml } from "./generic";
import { fetchWithBrowserFallback } from "./browser-fallback";

export interface ScrapeJobResult {
  normalized: NormalizedUrlResult;
  data: ExtractedJobData;
}

export class ScrapeError extends Error {
  needManualText: boolean;

  constructor(message: string, needManualText = true) {
    super(message);
    this.name = "ScrapeError";
    this.needManualText = needManualText;
  }
}

export async function scrapeJobUrl(rawUrl: string): Promise<ScrapeJobResult> {
  const normalized = normalizeJobUrl(rawUrl);

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Sec-Ch-Ua":
      '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Upgrade-Insecure-Requests": "1",
  };

  let html = "";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(normalized.normalizedUrl, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403 || response.status === 401 || response.status === 999) {
        throw new ScrapeError(
          `${normalized.kaynakSite} sitesi doğrudan erişimi engelledi (Giriş/Bot duvarı). Lütfen ilan metnini kopyalayıp metin alanına yapıştırınız.`
        );
      }
      throw new ScrapeError(
        `İlan sayfasına ulaşılamadı (HTTP ${response.status}). Lütfen linki kontrol ediniz veya metni doğrudan yapıştırınız.`
      );
    }

    html = await response.text();
  } catch (err: any) {
    if (err instanceof ScrapeError) throw err;
    if (err.name === "AbortError") {
      throw new ScrapeError(
        "İlan sitesi 12 saniye içinde yanıt vermedi (zaman aşımı). Lütfen ilan metnini kopyalayarak analiz ediniz."
      );
    }
    throw new ScrapeError(
      `İlan sayfası çekilirken bir hata oluştu: ${err.message}. Lütfen ilan metnini yapıştırınız.`
    );
  }

  let extractedData = parseHtmlContent(html, normalized.kaynakSite);

  // Eğer metin yetersizse ve Playwright fallback açıksa dene
  if (
    (!extractedData || extractedData.hamMetin.length < 300) &&
    process.env.ENABLE_PLAYWRIGHT_FALLBACK === "true"
  ) {
    const browserHtml = await fetchWithBrowserFallback(normalized.normalizedUrl);
    if (browserHtml) {
      const fallbackData = parseHtmlContent(browserHtml, normalized.kaynakSite);
      if (fallbackData && fallbackData.hamMetin.length > (extractedData?.hamMetin.length || 0)) {
        extractedData = fallbackData;
      }
    }
  }

  if (!extractedData || extractedData.hamMetin.length < 150) {
    throw new ScrapeError(
      "İlan içeriği korumalı veya dinamik olarak gizlenmiş görünüyor. Lütfen sayfa içeriğini kopyalayarak 'İlan Metnini Yapıştır' sekmesinden devam ediniz."
    );
  }

  return {
    normalized,
    data: extractedData,
  };
}

function parseHtmlContent(
  html: string,
  kaynakSite: string
): ExtractedJobData | null {
  const $ = cheerio.load(html);

  // 1. JSON-LD JobPosting kontrolü
  const jsonLdData = extractJsonLdJobPosting($);
  if (jsonLdData && jsonLdData.hamMetin.length >= 250) {
    return jsonLdData;
  }

  // 2. Siteye özel parser
  let siteData: ExtractedJobData;
  switch (kaynakSite) {
    case "kariyer.net":
      siteData = parseKariyerNetHtml($);
      break;
    case "linkedin":
      siteData = parseLinkedInHtml($);
      break;
    case "indeed":
      siteData = parseIndeedHtml($);
      break;
    case "secretcv":
      siteData = parseSecretcvHtml($);
      break;
    case "yenibiris":
      siteData = parseYenibirisHtml($);
      break;
    default:
      siteData = parseGenericHtml($);
      break;
  }

  if (siteData.hamMetin.length >= 200) {
    return siteData;
  }

  // 3. Generic fallback
  const genericData = parseGenericHtml($);
  return genericData.hamMetin.length >= (siteData?.hamMetin.length || 0)
    ? genericData
    : siteData;
}
