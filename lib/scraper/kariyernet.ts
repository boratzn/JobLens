import * as cheerio from "cheerio";
import { ExtractedJobData } from "./jsonld";

export function parseKariyerNetHtml($: cheerio.CheerioAPI): ExtractedJobData {
  const baslik =
    $('[data-test="job-title"]').first().text().trim() ||
    $(".job-detail-info h1").first().text().trim() ||
    $("h1").first().text().trim();

  const sirketAdi =
    $('[data-test="company-name"]').first().text().trim() ||
    $(".company-name").first().text().trim();

  const lokasyon =
    $('[data-test="job-city"]').first().text().trim() ||
    $(".job-detail-info .city").first().text().trim();

  const descElement =
    $('[data-test="job-description"]').first().length > 0
      ? $('[data-test="job-description"]').first()
      : $(".job-detail").first().length > 0
      ? $(".job-detail").first()
      : $(".detail-content").first();

  const aciklama = descElement.text().replace(/\s+/g, " ").trim();

  const parts: string[] = [];
  if (baslik) parts.push(`Pozisyon: ${baslik}`);
  if (sirketAdi) parts.push(`Şirket: ${sirketAdi}`);
  if (lokasyon) parts.push(`Lokasyon: ${lokasyon}`);
  if (aciklama) parts.push(`\nİlan Detayları:\n${aciklama}`);

  return {
    baslik,
    sirketAdi,
    lokasyon,
    aciklama,
    hamMetin: parts.join("\n"),
  };
}
