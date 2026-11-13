import * as cheerio from "cheerio";
import { ExtractedJobData } from "./jsonld";

export function parseLinkedInHtml($: cheerio.CheerioAPI): ExtractedJobData {
  const baslik =
    $(".top-card-layout__title").first().text().trim() ||
    $(".topcard__title").first().text().trim() ||
    $("h1").first().text().trim();

  const sirketAdi =
    $(".topcard__org-name-link").first().text().trim() ||
    $(".top-card-layout__first-sub-headline").first().text().trim();

  const lokasyon =
    $(".topcard__flavor--bullet").first().text().trim() ||
    $(".top-card-layout__second-sub-headline").first().text().trim();

  const descElement =
    $(".show-more-less-html__markup").first().length > 0
      ? $(".show-more-less-html__markup").first()
      : $(".description__text").first();

  const aciklama = descElement.text().replace(/\s+/g, " ").trim();

  const parts: string[] = [];
  if (baslik) parts.push(`Pozisyon: ${baslik}`);
  if (sirketAdi) parts.push(`Şirket: ${sirketAdi}`);
  if (lokasyon) parts.push(`Lokasyon: ${lokasyon}`);
  if (aciklama) parts.push(`\nİlan Açıklaması:\n${aciklama}`);

  return {
    baslik,
    sirketAdi,
    lokasyon,
    aciklama,
    hamMetin: parts.join("\n"),
  };
}
