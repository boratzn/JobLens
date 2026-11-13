import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Schemas from "@/lib/schemas";
import {
  InterviewSetSchema,
  JobAnalysis,
  CompanyInfo,
  InterviewSet,
  SoruSchema,
  SenaryoSoruSchema,
  MaasPazarlik,
} from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";
import {
  MULAKAT_SYSTEM_PROMPT,
  createMulakatCategoryPrompt,
} from "@/lib/prompts/mulakat";
import { z } from "zod";

const FallbackMaasPazarlikSchema = z.object({
  stratejiOzeti: z.string(),
  beklentiSorusuCevaplari: z
    .array(
      z.object({
        senaryo: z.string(),
        ornekCevap: z.string(),
      })
    )
    .default([]),
  pazarlikTaktikleri: z.array(z.string()).default([]),
  yanHakMuzakeresi: z.array(z.string()).default([]),
  kacinilacakHatalar: z.array(z.string()).default([]),
});

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "mulakat-sorulari");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { analysisId, kategori, dahaFazla, cvMetni } = body;

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

    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;
    const companyInfo = analysis.companyInfo as unknown as CompanyInfo | null;
    const existingSet = (analysis.interviewSet as unknown as InterviewSet) || {
      teknik: [],
      davranissal: [],
      senaryolu: [],
      sirketeOzel: [],
      adayinSoracaklari: [],
    };

    // Eğer dahaFazla istenmediyse ve önceden üretilmişse hemen döndür
    if (
      !dahaFazla &&
      existingSet.teknik?.length > 0 &&
      (!kategori || kategori === "tumu")
    ) {
      return NextResponse.json({
        interviewSet: existingSet,
        isCached: true,
      });
    }

    // Tek bir kategori mi istendi?
    if (kategori === "maasPazarlik") {
      const activeMaasSchema =
        Schemas.MaasPazarlikSchema || FallbackMaasPazarlikSchema;
      const maasResult = await generateJSONWithRetry<MaasPazarlik>({
        system: MULAKAT_SYSTEM_PROMPT,
        user: `Lütfen aşağıdaki pozisyon ve şirket için Maaş ve Pazarlık Hazırlık Rehberini (MaasPazarlikSchema) üret:\nPozisyon: ${jobAnalysis.baslik}\nŞirket: ${jobAnalysis.sirketAdi}\nSeviye: ${jobAnalysis.pozisyonSeviyesi}\nÇalışma Şekli: ${jobAnalysis.calismaSekli}\nYan Haklar: ${jobAnalysis.yanHaklar.join(", ")}\nKesin rakam uydurmadan strateji, 3 farklı senaryo için örnek yanıt, pazarlık taktikleri ve yan hak müzakere maddeleri üret.`,
        schema: activeMaasSchema,
        temperature: 0.3,
      });

      const updatedSet: InterviewSet = {
        ...existingSet,
        maasPazarlik: maasResult,
      };

      await db.analysis.update({
        where: { id: analysisId },
        data: { interviewSet: updatedSet as any },
      });

      return NextResponse.json({
        kategori,
        maasPazarlik: maasResult,
        interviewSet: updatedSet,
      });
    }

    if (kategori && kategori !== "tumu") {
      let adet = 4;
      let targetSchema: z.ZodType<any>;

      if (kategori === "teknik") {
        adet = 6;
        targetSchema = z.object({ sorular: z.array(SoruSchema) });
      } else if (kategori === "davranissal") {
        adet = 5;
        targetSchema = z.object({ sorular: z.array(SoruSchema) });
      } else if (kategori === "senaryolu") {
        adet = 4;
        targetSchema = z.object({ sorular: z.array(SenaryoSoruSchema) });
      } else if (kategori === "sirketeOzel") {
        adet = 4;
        targetSchema = z.object({ sorular: z.array(SoruSchema) });
      } else {
        // adayinSoracaklari
        adet = 5;
        targetSchema = z.object({
          sorular: z.array(
            z.object({ soru: z.string(), nedenIyi: z.string() })
          ),
        });
      }

      const categoryResult = await generateJSONWithRetry<{ sorular: any[] }>({
        system: MULAKAT_SYSTEM_PROMPT,
        user: createMulakatCategoryPrompt(
          kategori,
          adet,
          jobAnalysis,
          companyInfo,
          cvMetni
        ),
        schema: targetSchema,
        temperature: 0.3,
      });

      const updatedCategoryItems = dahaFazla
        ? [...((existingSet as any)[kategori] || []), ...categoryResult.sorular]
        : categoryResult.sorular;

      const updatedSet: InterviewSet = {
        ...existingSet,
        [kategori]: updatedCategoryItems,
      };

      await db.analysis.update({
        where: { id: analysisId },
        data: { interviewSet: updatedSet as any },
      });

      return NextResponse.json({
        kategori,
        sorular: updatedCategoryItems,
        interviewSet: updatedSet,
      });
    }

    // Tüm set üretimi (Varsayılan adetler: teknik 5, davranışsal 4, senaryolu 3, şirkete özel 3, adayın soracakları 3)
    const prompt = `
Lütfen aşağıdaki pozisyon ve şirket için mülakat hazırlık setini InterviewSet şemasına uygun tek bir JSON olarak üret:
Pozisyon: ${jobAnalysis.baslik}
Şirket: ${jobAnalysis.sirketAdi}
Seviye: ${jobAnalysis.pozisyonSeviyesi}
Teknik Beceriler: ${jobAnalysis.teknikBeceriler.join(", ")}
Zorunlu Nitelikler: ${jobAnalysis.zorunluNitelikler.map((n) => n.ad).join(", ")}
${companyInfo ? `Şirket Kültürü: ${companyInfo.sirketKulturu.join(", ")}` : ""}
${cvMetni ? `\nAday CV Özeti:\n${cvMetni.substring(0, 1500)}` : ""}

İstenen Adetler:
- teknik: 5 soru (en kritik teknik ve mimari konulardan)
- davranissal: 4 soru (STAR formatında detaylı örnek cevaplarla)
- senaryolu: 3 vaka/kriz sorusu
- sirketeOzel: 3 soru
- adayinSoracaklari: 3 akıllıca soru
- maasPazarlik: Pozisyon ve seviyeye özel maaş beklentisi sorusu stratejisi, 3 senaryolu örnek cevap, pazarlık taktikleri ve yan hak müzakere maddeleri.
`;

    const generatedSet = await generateJSONWithRetry({
      system: MULAKAT_SYSTEM_PROMPT,
      user: prompt,
      schema: InterviewSetSchema,
      temperature: 0.3,
    });

    await db.analysis.update({
      where: { id: analysisId },
      data: {
        interviewSet: generatedSet as any,
      },
    });

    return NextResponse.json({
      interviewSet: generatedSet,
      isCached: false,
    });
  } catch (error: any) {
    console.error("Mülakat soruları hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Mülakat soruları üretilirken bir sorun oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
