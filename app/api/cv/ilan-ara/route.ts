import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Schemas from "@/lib/schemas";
import type { CvJobSearchResult, MatchedJobListing } from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface RawScrapedJob {
  baslik: string;
  sirket: string;
  lokasyon: string;
  kaynakSite: string;
  url: string;
  yayinTarihi: string | null;
}

const KeywordExtractSchema = z.object({
  birincilUnvan: z.string(),
  ikincilUnvan: z.string(),
  teknikAnahtarKelimeler: z.array(z.string()).default([]),
  adayKidemSeviyesi: z.string().default("Mid-Senior"),
});

const RankedJobsSchema = z.object({
  ilanlar: z
    .array(
      z.object({
        id: z.string(),
        baslik: z.string(),
        sirket: z.string(),
        lokasyon: z.string(),
        kaynakSite: z.string(),
        url: z.string(),
        yayinTarihi: z.string().nullable().default(null),
        uyumYuzdesi: z.number().min(0).max(100),
        nedenEslesiyor: z.string(),
        eslesenBeceriler: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

async function fetchLinkedInGuestJobs(
  keyword: string,
  location: string
): Promise<RawScrapedJob[]> {
  try {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
      keyword
    )}&location=${encodeURIComponent(location)}&start=0`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const jobs: RawScrapedJob[] = [];

    $(".base-card").each((_, el) => {
      const baslik = $(el).find(".base-search-card__title").text().trim();
      const sirket = $(el).find(".base-search-card__subtitle").text().trim();
      const lokasyon = $(el).find(".job-search-card__location").text().trim();
      const rawHref =
        $(el).find("a.base-card__full-link").attr("href") ||
        $(el).find("a").first().attr("href") ||
        "";
      const cleanUrl = rawHref.split("?")[0].trim();
      const tarih =
        $(el).find("time").attr("datetime") ||
        $(el).find("time").text().trim() ||
        null;

      if (baslik && cleanUrl) {
        jobs.push({
          baslik,
          sirket: sirket || "Kurumsal Şirket",
          lokasyon: lokasyon || location,
          kaynakSite: "LinkedIn",
          url: cleanUrl,
          yayinTarihi: tarih,
        });
      }
    });

    return jobs.slice(0, 8);
  } catch (err) {
    console.warn("LinkedIn guest job search uyarısı:", err);
    return [];
  }
}

async function fetchSecretCvJobs(keyword: string): Promise<RawScrapedJob[]> {
  try {
    const url = `https://www.secretcv.com/is-ilanlari?q=${encodeURIComponent(
      keyword
    )}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const jobs: RawScrapedJob[] = [];
    const seen = new Set<string>();

    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (
        href.includes("-is-ilanlari-") &&
        href.startsWith("https://www.secretcv.com/") &&
        text.length > 6 &&
        text.length < 120 &&
        !seen.has(href)
      ) {
        seen.add(href);
        const parts = href.replace("https://www.secretcv.com/", "").split("/");
        const companySlug = parts[0] || "Secretcv İlanı";
        const formattedCompany = companySlug
          .replace(/-\d+$/, "")
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        jobs.push({
          baslik: text,
          sirket: formattedCompany,
          lokasyon: "Türkiye",
          kaynakSite: "Secretcv",
          url: href,
          yayinTarihi: "Güncel",
        });
      }
    });

    return jobs.slice(0, 4);
  } catch {
    return [];
  }
}

async function fetchWebSearchJobs(
  keyword: string,
  location: string
): Promise<RawScrapedJob[]> {
  const provider = (process.env.SEARCH_PROVIDER || "none").toLowerCase();
  if (provider === "none") return [];

  const query = `(site:kariyer.net/is-ilani OR site:tr.indeed.com OR site:yenibiris.com) "${keyword}" "${location}"`;

  try {
    if (provider === "tavily" && process.env.TAVILY_API_KEY) {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "basic",
          max_results: 5,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((r: any) => {
        const site = r.url?.includes("kariyer.net")
          ? "Kariyer.net"
          : r.url?.includes("indeed")
          ? "Indeed"
          : r.url?.includes("yenibiris")
          ? "Yenibiris"
          : "Web İlanı";
        return {
          baslik: r.title || keyword,
          sirket: site + " İşvereni",
          lokasyon: location,
          kaynakSite: site,
          url: r.url,
          yayinTarihi: "Güncel",
        };
      });
    }

    if (provider === "serper" && process.env.SERPER_API_KEY) {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.SERPER_API_KEY,
        },
        body: JSON.stringify({ q: query, gl: "tr", hl: "tr", num: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.organic || []).map((r: any) => {
        const site = r.link?.includes("kariyer.net")
          ? "Kariyer.net"
          : r.link?.includes("indeed")
          ? "Indeed"
          : r.link?.includes("yenibiris")
          ? "Yenibiris"
          : "Web İlanı";
        return {
          baslik: r.title || keyword,
          sirket: site + " İşvereni",
          lokasyon: location,
          kaynakSite: site,
          url: r.link,
          yayinTarihi: "Güncel",
        };
      });
    }
  } catch {
    return [];
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "cv-ilan-ara");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { cvMetni, lokasyon = "Türkiye", ozelAramaTerimi } = await request.json();

    if (!cvMetni || String(cvMetni).trim().length < 40) {
      return NextResponse.json(
        { error: "İlan eşleştirmesi için geçerli bir CV metni gereklidir." },
        { status: 400 }
      );
    }

    // 1. Adım: CV'den en uygun arama terimlerini ve unvanları çıkar
    const kwInfo = await generateJSONWithRetry<
      z.infer<typeof KeywordExtractSchema>
    >({
      system:
        "Sen kıdemli bir teknik işe alım uzmanısın. Verilen CV metninden LinkedIn ve Kariyer.net üzerinde iş aramak için en uygun 1. ve 2. pozisyon unvanını ve en güçlü 4 teknik beceri anahtar kelimesini çıkar.",
      user: `CV Metni:\n<cv_metni>\n${String(cvMetni).substring(0, 5000)}\n</cv_metni>\n${
        ozelAramaTerimi ? `Kullanıcının Özel Tercihi: ${ozelAramaTerimi}` : ""
      }`,
      schema: KeywordExtractSchema,
      temperature: 0.1,
    });

    const primaryQuery = ozelAramaTerimi?.trim() || kwInfo.birincilUnvan;
    const secondaryQuery =
      kwInfo.ikincilUnvan ||
      kwInfo.teknikAnahtarKelimeler.slice(0, 2).join(" ");

    // 2. Adım: LinkedIn, Secretcv, Kariyer.net / Indeed kaynaklarından paralel canlı ilan çek
    const [liPrimary, liSecondary, secretCvList, webList] = await Promise.all([
      fetchLinkedInGuestJobs(primaryQuery, lokasyon),
      secondaryQuery && secondaryQuery !== primaryQuery
        ? fetchLinkedInGuestJobs(secondaryQuery, lokasyon)
        : Promise.resolve([]),
      fetchSecretCvJobs(primaryQuery),
      fetchWebSearchJobs(primaryQuery, lokasyon),
    ]);

    // URL bazlı tekilleştir
    const allScraped: RawScrapedJob[] = [];
    const seenUrls = new Set<string>();
    for (const item of [
      ...liPrimary,
      ...webList,
      ...liSecondary,
      ...secretCvList,
    ]) {
      if (item.url && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allScraped.push(item);
      }
    }

    // 3. Adım: Platform doğrudan arama linklerini hazırla (LinkedIn, Kariyer.net, Indeed, Secretcv, Yenibiris)
    const encodedRole = encodeURIComponent(primaryQuery);
    const encodedLoc = encodeURIComponent(lokasyon);
    const platformAramaLinkleri = [
      {
        platform: "LinkedIn İş İlanları",
        url: `https://www.linkedin.com/jobs/search/?keywords=${encodedRole}&location=${encodedLoc}`,
        aramaTerimi: primaryQuery,
      },
      {
        platform: "Kariyer.net",
        url: `https://www.kariyer.net/is-ilanlari?kw=${encodedRole}`,
        aramaTerimi: primaryQuery,
      },
      {
        platform: "Indeed Türkiye",
        url: `https://tr.indeed.com/jobs?q=${encodedRole}&l=${encodedLoc}`,
        aramaTerimi: primaryQuery,
      },
      {
        platform: "Secretcv",
        url: `https://www.secretcv.com/is-ilanlari?q=${encodedRole}`,
        aramaTerimi: primaryQuery,
      },
      {
        platform: "Yenibiris.com",
        url: `https://www.yenibiris.com/is-ilanlari?q=${encodedRole}`,
        aramaTerimi: primaryQuery,
      },
    ];

    let matchedListings: MatchedJobListing[] = [];

    if (allScraped.length > 0) {
      // Çekilen gerçek ilanları adayın CV'siyle karşılaştırıp uyum yüzdesi ve gerekçe üret
      const ranked = await generateJSONWithRetry<
        z.infer<typeof RankedJobsSchema>
      >({
        system: `Sen kıdemli bir kariyer koçusun. Sana adayın CV özeti ve iş ilanı sitelerinden (LinkedIn, Kariyer.net, Secretcv vb.) canlı çekilmiş gerçek iş ilanları listesi veriliyor.
Her ilanı adayın CV'si ile karşılaştırarak:
1. Gerçekçi bir "uyumYuzdesi" (0-100 arası),
2. Bu ilanın adayın CV'sindeki hangi deneyim/becerilerle neden eşleştiğini açıklayan Türkçe "nedenEslesiyor" (1-2 cümle),
3. Adayın CV'sinde bu ilanla örtüşen "eslesenBeceriler" dizisini üret.
İlanların url, baslik, sirket, lokasyon ve kaynakSite bilgilerini ASLA değiştirme. En yüksek uyumludan başlayarak en iyi 10 ilanı sırala.`,
        user: `Aday CV Metni:\n<cv_metni>\n${String(cvMetni).substring(0, 4500)}\n</cv_metni>\n\nCanlı Çekilen İş İlanları:\n${JSON.stringify(
          allScraped.slice(0, 12),
          null,
          2
        )}`,
        schema: RankedJobsSchema,
        temperature: 0.2,
      });

      matchedListings = ranked.ilanlar.sort(
        (a: MatchedJobListing, b: MatchedJobListing) =>
          b.uyumYuzdesi - a.uyumYuzdesi
      );
    }

    const result: CvJobSearchResult = {
      onerilenAramaTerimleri: [
        primaryQuery,
        ...(secondaryQuery ? [secondaryQuery] : []),
        ...kwInfo.teknikAnahtarKelimeler.slice(0, 4),
      ],
      adayKidemSeviyesi: kwInfo.adayKidemSeviyesi,
      ilanlar: matchedListings,
      platformAramaLinkleri,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("CV ile ilan eşleştirme hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "CV'niz ile eşleşen ilanlar çekilirken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
