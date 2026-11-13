import * as cheerio from "cheerio";
import { ExtractedJobData } from "./jsonld";

export function parseGenericHtml($: cheerio.CheerioAPI): ExtractedJobData {
  const ogTitle = $('meta[property="og:title"]').attr("content") || $("title").text();
  const ogDesc =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  // Gereksiz etiketleri temizle
  $("script, style, noscript, nav, footer, header, svg, iframe, form, button").remove();

  // Olası ilan kapsayıcılarını öncelikle dene
  const selectors = [
    "main",
    "article",
    '[class*="job-description"]',
    '[class*="job-detail"]',
    '[class*="jobDescription"]',
    '[class*="advert"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    ".content",
    "#content",
  ];

  let bodyText = "";
  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      const text = el.text().replace(/\s+/g, " ").trim();
      if (text.length > 250) {
        bodyText = text;
        break;
      }
    }
  }

  if (!bodyText) {
    bodyText = $("body").text().replace(/\s+/g, " ").trim();
  }

  const parts: string[] = [];
  if (ogTitle) parts.push(`Başlık: ${ogTitle.trim()}`);
  if (ogDesc && !bodyText.includes(ogDesc.trim())) parts.push(`Özet: ${ogDesc.trim()}`);
  if (bodyText) parts.push(`\nMetin:\n${bodyText}`);

  return {
    baslik: ogTitle.trim(),
    hamMetin: parts.join("\n"),
  };
}
