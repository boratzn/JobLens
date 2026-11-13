import * as cheerio from "cheerio";
import { ExtractedJobData } from "./jsonld";

export function parseIndeedHtml($: cheerio.CheerioAPI): ExtractedJobData {
  const baslik =
    $(".jobsearch-JobInfoHeader-title").first().text().trim() ||
    $("h1").first().text().trim();

  const sirketAdi =
    $('[data-testid="inlineHeader-companyName"]').first().text().trim() ||
    $(".jobsearch-CompanyInfoContainer").first().text().trim();

  const lokasyon =
    $('[data-testid="job-location"]').first().text().trim() ||
    $('[data-testid="inlineHeader-companyLocation"]').first().text().trim();

  const descElement = $("#jobDescriptionText");
  const aciklama = descElement.text().replace(/\s+/g, " ").trim();

  const parts: string[] = [];
  if (baslik) parts.push(`Pozisyon: ${baslik}`);
  if (sirketAdi) parts.push(`Şirket: ${sirketAdi}`);
  if (lokasyon) parts.push(`Lokasyon: ${lokasyon}`);
  if (aciklama) parts.push(`\nİlan Detayı:\n${aciklama}`);

  return {
    baslik,
    sirketAdi,
    lokasyon,
    aciklama,
    hamMetin: parts.join("\n"),
  };
}
