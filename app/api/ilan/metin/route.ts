import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  JobAnalysisTextInputSchema,
  JobAnalysisSchema,
  JobAnalysis,
} from "@/lib/schemas";
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
    const rateLimit = await checkRateLimit(request.headers, "ilan-metin");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsedInput = JobAnalysisTextInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          error:
            parsedInput.error.issues[0]?.message ||
            "Lütfen geçerli bir ilan metni giriniz (en az 50 karakter).",
        },
        { status: 400 }
      );
    }

    const { metin, baslik, sirketAdi } = parsedInput.data;
    const anonymousId = await getAnonymousId();

    // LLM ile Analiz
    const jobAnalysis = await generateJSONWithRetry<JobAnalysis>({
      system: ILAN_ANALIZ_SYSTEM_PROMPT,
      user: createIlanAnalizUserPrompt(metin),
      schema: JobAnalysisSchema,
      temperature: 0.2,
    });

    // Kullanıcının elle girdiği başlık veya şirket adı varsa ve LLM boş bıraktıysa tamamla
    if (baslik && (!jobAnalysis.baslik || jobAnalysis.baslik === "Belirtilmemiş")) {
      jobAnalysis.baslik = baslik;
    }
    if (sirketAdi && (!jobAnalysis.sirketAdi || jobAnalysis.sirketAdi === "Belirtilmemiş")) {
      jobAnalysis.sirketAdi = sirketAdi;
    }

    // Veritabanına kaydet
    const record = await db.analysis.create({
      data: {
        anonymousId,
        url: null,
        urlHash: null,
        kaynakSite: "manuel",
        hamMetin: metin,
        jobAnalysis: jobAnalysis as any,
      },
    });

    return NextResponse.json({
      id: record.id,
      jobAnalysis,
      kaynakSite: "manuel",
      isCached: false,
    });
  } catch (error: any) {
    console.error("Metin analiz hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "İlan analiz edilirken bir sorun oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
