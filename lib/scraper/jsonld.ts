import * as cheerio from "cheerio";

export interface ExtractedJobData {
  baslik?: string;
  sirketAdi?: string;
  lokasyon?: string;
  aciklama?: string;
  hamMetin: string;
}

export function extractJsonLdJobPosting($: cheerio.CheerioAPI): ExtractedJobData | null {
  let result: ExtractedJobData | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (result) return;
    try {
      const content = $(el).text().trim();
      if (!content) return;
      const parsed = JSON.parse(content);

      const items = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
        ? parsed["@graph"]
        : [parsed];

      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          const baslik = item.title || item.name;
          let sirketAdi: string | undefined;
          if (typeof item.hiringOrganization === "string") {
            sirketAdi = item.hiringOrganization;
          } else if (item.hiringOrganization && typeof item.hiringOrganization.name === "string") {
            sirketAdi = item.hiringOrganization.name;
          }

          let lokasyon: string | undefined;
          if (item.jobLocation) {
            const loc = item.jobLocation;
            if (loc.address) {
              lokasyon = [
                loc.address.addressLocality,
                loc.address.addressRegion,
                loc.address.addressCountry,
              ]
                .filter(Boolean)
                .join(", ");
            }
          }

          // HTML description'ı düz metne çevir
          const descHtml = item.description || "";
          const $desc = cheerio.load(descHtml);
          const aciklama = $desc.text().trim();

          const parts: string[] = [];
          if (baslik) parts.push(`Pozisyon / Başlık: ${baslik}`);
          if (sirketAdi) parts.push(`Şirket: ${sirketAdi}`);
          if (lokasyon) parts.push(`Lokasyon: ${lokasyon}`);
          if (item.employmentType) parts.push(`Çalışma Şekli: ${item.employmentType}`);
          if (aciklama) parts.push(`\nİlan Detayı:\n${aciklama}`);

          result = {
            baslik,
            sirketAdi,
            lokasyon,
            aciklama,
            hamMetin: parts.join("\n"),
          };
          break;
        }
      }
    } catch {
      // JSON parse hatası olursa devam et
    }
  });

  return result;
}
