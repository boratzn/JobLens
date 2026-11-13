import * as cheerio from "cheerio";
import { ExtractedJobData } from "./jsonld";

export function parseSecretcvHtml($: cheerio.CheerioAPI): ExtractedJobData {
  const baslik = $(".job-detail-title").first().text().trim() || $("h1").first().text().trim();
  const sirketAdi = $(".company-title").first().text().trim() || $(".company-name").first().text().trim();
  const lokasyon = $(".job-city").first().text().trim();
  const aciklama = $(".job-detail-content").first().text().replace(/\s+/g, " ").trim() ||
    $(".advert-detail").first().text().replace(/\s+/g, " ").trim();

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

export function parseYenibirisHtml($: cheerio.CheerioAPI): ExtractedJobData {
  const baslik = $(".job-title").first().text().trim() || $("h1").first().text().trim();
  const sirketAdi = $(".company-name").first().text().trim();
  const lokasyon = $(".job-location").first().text().trim();
  const aciklama = $(".job-description").first().text().replace(/\s+/g, " ").trim() ||
    $(".ilan-icerik").first().text().replace(/\s+/g, " ").trim();

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
