import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  JobAnalysisUrlInputSchema,
  JobAnalysisSchema,
  JobAnalysis,
} from "@/lib/schemas";
import { scrapeJobUrl, ScrapeError } from "@/lib/scraper";
import { generateJSONWithRetry } from "@/lib/llm";
import {
  ILAN_ANALIZ_SYSTEM_PROMPT,
  createIlanAnalizUserPrompt,
} from "@/lib/prompts/ilan-analiz";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "ilan-analiz");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsedInput = JobAnalysisUrlInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: "Lütfen geçerli bir iş ilanı linki giriniz." },
        { status: 400 }
      );
    }

    const { url, force } = parsedInput.data;
    const anonymousId = await getAnonymousId();

    // 1. İlan linkini tara ve normalize et
    let scraped;
    try {
      scraped = await scrapeJobUrl(url);
    } catch (scrapeErr: any) {
      if (scrapeErr instanceof ScrapeError) {
        return NextResponse.json(
          {
            error: scrapeErr.message,
            needManualText: scrapeErr.needManualText,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        {
          error:
            "İlan sayfası okunamadı. Lütfen ilan metnini yapıştırarak devam ediniz.",
          needManualText: true,
        },
        { status: 422 }
      );
    }

    // 2. Daha önce analiz edilmiş mi kontrolü
    if (!force) {
      try {
        const existing = await db.analysis.findFirst({
          where: {
            urlHash: scraped.normalized.urlHash,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existing) {
          const job = existing.jobAnalysis as unknown as JobAnalysis;
          return NextResponse.json({
            alreadyAnalyzed: true,
            existingId: existing.id,
            jobTitle: job?.baslik || "İş İlanı",
            sirketAdi: job?.sirketAdi || existing.kaynakSite,
            createdAt: existing.createdAt.toISOString(),
            kaynakSite: existing.kaynakSite,
            message:
              "Bu ilan linki daha önce analiz edilmiş. Mevcut analizi açabilir veya Geçmiş Analizler sayfanıza göz atabilirsiniz.",
          });
        }
      } catch (dbErr) {
        console.warn("Önbellek arama hatası:", dbErr);
      }
    }

    // 3. LLM ile İlan Analizi
    const jobAnalysis = await generateJSONWithRetry<JobAnalysis>({
      system: ILAN_ANALIZ_SYSTEM_PROMPT,
      user: createIlanAnalizUserPrompt(scraped.data.hamMetin),
      schema: JobAnalysisSchema,
      temperature: 0.2,
    });

    // 4. Veritabanına kaydet
    const record = await db.analysis.create({
      data: {
        anonymousId,
        url: scraped.normalized.normalizedUrl,
        urlHash: scraped.normalized.urlHash,
        kaynakSite: scraped.normalized.kaynakSite,
        hamMetin: scraped.data.hamMetin,
        jobAnalysis: jobAnalysis as any,
      },
    });

    return NextResponse.json({
      id: record.id,
      jobAnalysis,
      kaynakSite: scraped.normalized.kaynakSite,
      isCached: false,
    });
  } catch (error: any) {
    console.error("İlan analizi hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "İlan analiz edilirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
