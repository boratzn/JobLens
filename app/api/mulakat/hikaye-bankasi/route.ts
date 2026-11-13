import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Schemas from "@/lib/schemas";
import type {
  StarStoryBank,
  JobAnalysis,
  InterviewSet,
} from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";
import {
  HIKAYE_BANKASI_SYSTEM_PROMPT,
  createHikayeBankasiPrompt,
} from "@/lib/prompts/mulakat";
import { z } from "zod";

const FallbackStarStorySchema = z.object({
  id: z.string().default("story-1"),
  baslik: z.string(),
  sirketVeyaProje: z.string(),
  durum: z.string(),
  gorev: z.string(),
  eylem: z.string(),
  sonuc: z.string(),
  yetkinlikler: z.array(z.string()).default([]),
  eslesenSorular: z.array(z.string()).default([]),
});

const FallbackStarStoryBankSchema = z.object({
  hikayeler: z.array(FallbackStarStorySchema).default([]),
});

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "hikaye-bankasi");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { analysisId, cvMetni: bodyCvMetni } = await request.json();

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

    const cvMetni = bodyCvMetni || analysis.cvUploads[0]?.cvMetni;
    if (!cvMetni || cvMetni.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "STAR Hikâye Bankası oluşturmak için önce CV sekmesinden CV'nizi yüklemelisiniz.",
        },
        { status: 400 }
      );
    }

    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;
    const existingSet = (analysis.interviewSet as unknown as InterviewSet) || {
      teknik: [],
      davranissal: [],
      senaryolu: [],
      sirketeOzel: [],
      adayinSoracaklari: [],
    };

    const davranissalSorular = (existingSet.davranissal || []).map(
      (s) => s.soru
    );

    const activeBankSchema =
      Schemas.StarStoryBankSchema || FallbackStarStoryBankSchema;

    const result = await generateJSONWithRetry<StarStoryBank>({
      system: HIKAYE_BANKASI_SYSTEM_PROMPT,
      user: createHikayeBankasiPrompt(cvMetni, jobAnalysis, davranissalSorular),
      schema: activeBankSchema,
      temperature: 0.3,
    });

    const updatedSet: InterviewSet = {
      ...existingSet,
      hikayeBankasi: result.hikayeler,
    };

    await db.analysis.update({
      where: { id: analysisId },
      data: {
        interviewSet: updatedSet as any,
      },
    });

    return NextResponse.json({
      hikayeBankasi: result.hikayeler,
      interviewSet: updatedSet,
    });
  } catch (error: any) {
    console.error("Hikâye bankası üretme hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "STAR Hikâye Bankası oluşturulurken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { analysisId, hikayeBankasi } = await request.json();

    if (!analysisId || !Array.isArray(hikayeBankasi)) {
      return NextResponse.json(
        { error: "analysisId ve hikayeBankasi dizisi zorunludur." },
        { status: 400 }
      );
    }

    const activeStorySchema =
      Schemas.StarStorySchema || FallbackStarStorySchema;
    const parsedStories = z.array(activeStorySchema).parse(hikayeBankasi);

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
      hikayeBankasi: parsedStories,
    };

    await db.analysis.update({
      where: { id: analysisId },
      data: {
        interviewSet: updatedSet as any,
      },
    });

    return NextResponse.json({
      hikayeBankasi: parsedStories,
    });
  } catch (error: any) {
    console.error("Hikâye bankası güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Hikâye bankası kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
