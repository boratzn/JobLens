import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Schemas from "@/lib/schemas";
import type {
  CoverLetter,
  JobAnalysis,
  CompanyInfo,
  InterviewSet,
} from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";
import { ONYAZI_SYSTEM_PROMPT, createOnYaziUserPrompt } from "@/lib/prompts/onyazi";

const FallbackCoverLetterSchema = z.object({
  ton: z.enum(["kurumsal", "samimi", "iddiali"]).default("kurumsal"),
  konuBasligi: z.string(),
  icerik: z.string(),
  vurgulananNitelikler: z.array(z.string()).default([]),
  ipucu: z.string(),
  tutarlilikKontrolu: z
    .object({
      uyumluMu: z.boolean().default(true),
      dogrulananDetaylar: z.array(z.string()).default([]),
      uyarilar: z.array(z.string()).default([]),
    })
    .optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "onyazi-uret");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const {
      analysisId,
      ton = "kurumsal",
      ekNotlar,
      cvMetni: bodyCvMetni,
    } = await request.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId zorunludur." },
        { status: 400 }
      );
    }

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

    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;
    const companyInfo = analysis.companyInfo as unknown as CompanyInfo | null;
    const cvMetni = bodyCvMetni || analysis.cvUploads[0]?.cvMetni || null;

    const validTon: "kurumsal" | "samimi" | "iddiali" =
      ton === "samimi" || ton === "iddiali" ? ton : "kurumsal";

    const activeSchema = Schemas.CoverLetterSchema || FallbackCoverLetterSchema;

    const onYazi = await generateJSONWithRetry<CoverLetter>({
      system: ONYAZI_SYSTEM_PROMPT,
      user: createOnYaziUserPrompt(
        jobAnalysis,
        validTon,
        companyInfo,
        cvMetni,
        ekNotlar
      ),
      schema: activeSchema,
      temperature: 0.35,
    });

    const existingSet = (analysis.interviewSet as unknown as InterviewSet) || {
      teknik: [],
      davranissal: [],
      senaryolu: [],
      sirketeOzel: [],
      adayinSoracaklari: [],
    };

    const updatedSet: InterviewSet = {
      ...existingSet,
      onYazi,
    };

    await db.analysis.update({
      where: { id: analysisId },
      data: {
        interviewSet: updatedSet as any,
      },
    });

    return NextResponse.json({
      onYazi,
    });
  } catch (error: any) {
    console.error("Ön yazı üretme hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Ön yazı üretilirken bir sorun oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { analysisId, onYazi } = await request.json();

    if (!analysisId || !onYazi) {
      return NextResponse.json(
        { error: "analysisId ve onYazi zorunludur." },
        { status: 400 }
      );
    }

    const activeSchema = Schemas.CoverLetterSchema || FallbackCoverLetterSchema;
    const parsedOnYazi = activeSchema.parse(onYazi);

    const analysis = await db.analysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analiz bulunamadı." },
        { status: 404 }
      );
    }

    const existingSet = (analysis.interviewSet as unknown as InterviewSet) || {
      teknik: [],
      davranissal: [],
      senaryolu: [],
      sirketeOzel: [],
      adayinSoracaklari: [],
    };

    const updatedSet: InterviewSet = {
      ...existingSet,
      onYazi: parsedOnYazi,
    };

    await db.analysis.update({
      where: { id: analysisId },
      data: {
        interviewSet: updatedSet as any,
      },
    });

    return NextResponse.json({
      onYazi: parsedOnYazi,
    });
  } catch (error: any) {
    console.error("Ön yazı kaydetme hatası:", error);
    return NextResponse.json(
      { error: "Ön yazı kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
