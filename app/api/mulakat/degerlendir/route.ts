import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { PracticeFeedbackSchema } from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";
import {
  PRATIK_DEGERLENDIRME_SYSTEM_PROMPT,
  createPratikDegerlendirmePrompt,
} from "@/lib/prompts/mulakat";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request.headers, "mulakat-pratik");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { soru, ornekCevap, kullaniciCevabi, gecmisDiyalog } =
      await request.json();

    if (!soru || !kullaniciCevabi || kullaniciCevabi.trim().length < 10) {
      return NextResponse.json(
        { error: "Lütfen en az 10 karakterden oluşan bir cevap yazınız." },
        { status: 400 }
      );
    }

    const feedback = await generateJSONWithRetry({
      system: PRATIK_DEGERLENDIRME_SYSTEM_PROMPT,
      user: createPratikDegerlendirmePrompt(
        soru,
        ornekCevap || "",
        kullaniciCevabi,
        Array.isArray(gecmisDiyalog) ? gecmisDiyalog : undefined
      ),
      schema: PracticeFeedbackSchema,
      temperature: 0.25,
    });

    return NextResponse.json({
      feedback,
    });
  } catch (error: any) {
    console.error("Pratik değerlendirme hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Cevabınız değerlendirilirken bir sorun oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
