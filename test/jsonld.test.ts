import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { extractJsonLdJobPosting } from "@/lib/scraper/jsonld";

describe("JSON-LD Scraper", () => {
  it("script tag içindeki JobPosting nesnesini ayrıştırır", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            "title": "Full Stack Developer",
            "description": "<p>Node.js ve React bilen yazılımcı arıyoruz.</p>",
            "hiringOrganization": {
              "@type": "Organization",
              "name": "Acme Teknoloji"
            },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "addressLocality": "İstanbul",
                "addressCountry": "TR"
              }
            },
            "employmentType": "FULL_TIME"
          }
          </script>
        </head>
        <body>Sayfa içeriği</body>
      </html>
    `;

    const $ = cheerio.load(html);
    const result = extractJsonLdJobPosting($);

    expect(result).not.toBeNull();
    expect(result?.baslik).toBe("Full Stack Developer");
    expect(result?.sirketAdi).toBe("Acme Teknoloji");
    expect(result?.lokasyon).toContain("İstanbul");
    expect(result?.hamMetin).toContain("Node.js ve React bilen yazılımcı arıyoruz");
  });
});
