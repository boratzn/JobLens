import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { CompanyInfoSchema, JobAnalysis } from "@/lib/schemas";
import { searchCompanyWeb } from "@/lib/search";
import { generateJSONWithRetry } from "@/lib/llm";
import {
  SIRKET_ARASTIRMA_SYSTEM_PROMPT,
  createSirketArastirmaUserPrompt,
} from "@/lib/prompts/sirket-arastirma";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "sirket-arastirma");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { analysisId } = await request.json();
    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId parametresi zorunludur." },
        { status: 400 }
      );
    }

    const analysis = await db.analysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "İlan analizi bulunamadı." },
        { status: 404 }
      );
    }

    // Eğer zaten şirket araştırması yapılmışsa önbellekten döndür
    if (analysis.companyInfo) {
      return NextResponse.json({
        companyInfo: analysis.companyInfo,
        isCached: true,
      });
    }

    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;
    const sirketAdi = jobAnalysis?.sirketAdi || "Belirtilmemiş Şirket";

    // Web araması yap
    const searchResults = await searchCompanyWeb(sirketAdi);

    // LLM ile şirket analizi
    const companyInfo = await generateJSONWithRetry({
      system: SIRKET_ARASTIRMA_SYSTEM_PROMPT,
      user: createSirketArastirmaUserPrompt(
        sirketAdi,
        analysis.hamMetin,
        searchResults
      ),
      schema: CompanyInfoSchema,
      temperature: 0.2,
    });

    // Veritabanını güncelle
    await db.analysis.update({
      where: { id: analysisId },
      data: {
        companyInfo: companyInfo as any,
      },
    });

    return NextResponse.json({
      companyInfo,
      isCached: false,
    });
  } catch (error: any) {
    console.error("Şirket araştırması hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Şirket bilgisi araştırılırken bir sorun oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
