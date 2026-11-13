import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";
import { checkRateLimit } from "@/lib/rate-limit";
import { CvMatchSchema, JobAnalysis } from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";
import {
  CV_KARSILASTIR_SYSTEM_PROMPT,
  createCvKarsilastirUserPrompt,
} from "@/lib/prompts/cv-karsilastir";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "cv-karsilastir");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { analysisId, cvMetni, dosyaAdi } = await request.json();

    if (!analysisId || !cvMetni) {
      return NextResponse.json(
        { error: "analysisId ve cvMetni alanları zorunludur." },
        { status: 400 }
      );
    }

    const anonymousId = await getAnonymousId();

    const analysis = await db.analysis.findUnique({
      where: { id: analysisId },
      include: {
        cvUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "İlan analizi bulunamadı." },
        { status: 404 }
      );
    }

    const previousCvRecord = analysis.cvUploads[0] || null;
    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;

    // LLM ile CV Karşılaştırma
    const cvMatch = await generateJSONWithRetry({
      system: CV_KARSILASTIR_SYSTEM_PROMPT,
      user: createCvKarsilastirUserPrompt(cvMetni, jobAnalysis),
      schema: CvMatchSchema,
      temperature: 0.2,
    });

    const retentionDays = parseInt(process.env.CV_RETENTION_DAYS || "30", 10);
    const silinmeTarihi = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    );

    // CvUpload kaydı oluştur (yalnızca çıkarılan metin saklanır, dosya saklanmaz)
    const cvUpload = await db.cvUpload.create({
      data: {
        analysisId,
        anonymousId,
        dosyaAdi: dosyaAdi || "ozgecmis.pdf",
        cvMetni,
        cvMatch: cvMatch as any,
        silinmeTarihi,
      },
    });

    return NextResponse.json({
      cvUploadId: cvUpload.id,
      cvMatch,
      cvMetni,
      dosyaAdi: cvUpload.dosyaAdi,
      silinmeTarihi: silinmeTarihi.toISOString(),
      previousCv: previousCvRecord
        ? {
            id: previousCvRecord.id,
            dosyaAdi: previousCvRecord.dosyaAdi,
            createdAt: previousCvRecord.createdAt.toISOString(),
            cvMatch: previousCvRecord.cvMatch,
          }
        : null,
    });
  } catch (error: any) {
    console.error("CV karşılaştırma hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "CV karşılaştırılırken bir sorun oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
