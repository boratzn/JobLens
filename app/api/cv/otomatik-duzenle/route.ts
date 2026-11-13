import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Schemas from "@/lib/schemas";
import type {
  JobAnalysis,
  CvMatch,
  AutoEditedCvResult,
} from "@/lib/schemas";
import { generateJSONWithRetry } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FallbackAutoEditedCvResultSchema = z.object({
  yeniCvMetni: z.string(),
  uygulananDegisiklikler: z
    .array(
      z.object({
        bolum: z.string(),
        yapilanIslem: z.string(),
        etki: z.string(),
      })
    )
    .default([]),
  eklenenAnahtarKelimeler: z.array(z.string()).default([]),
  yeniCvMatch: Schemas.CvMatchSchema,
});

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(
      request.headers,
      "cv-otomatik-duzenle"
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message || "İstek limiti aşıldı." },
        { status: 429 }
      );
    }

    const { analysisId, cvUploadId } = await request.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId parametresi zorunludur." },
        { status: 400 }
      );
    }

    const anonymousId = await getAnonymousId();

    const analysis = await db.analysis.findUnique({
      where: { id: analysisId },
      include: {
        cvUploads: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "İlan analizi bulunamadı." },
        { status: 404 }
      );
    }

    const targetCv =
      (cvUploadId
        ? analysis.cvUploads.find((c) => c.id === cvUploadId)
        : null) || analysis.cvUploads[0];

    if (!targetCv || !targetCv.cvMetni) {
      return NextResponse.json(
        { error: "Düzenlenecek yüklü bir CV bulunamadı." },
        { status: 404 }
      );
    }

    const jobAnalysis = analysis.jobAnalysis as unknown as JobAnalysis;
    const oldMatch = targetCv.cvMatch as unknown as CvMatch | null;

    const systemPrompt = `
Sen kıdemli bir İK Direktörü, ATS (Applicant Tracking System) optimizasyon uzmanı ve profesyonel CV yazarısın.

GÖREVİN:
Adayın mevcut CV metnini ("cvMetni") ve önceki analizde tespit edilen eksiklikleri/önerileri alarak; hedef iş ilanına (%85+ uyum yakalayacak şekilde) CV'yi BAŞTAN SONA OTOMATİK OLARAK YENİDEN YAZMAK ("yeniCvMetni") ve bu yeni CV'nin güncel uyum analizini ("yeniCvMatch") hesaplamaktır.

KRİTİK KURALLAR:
1. ASLA YALAN ŞİRKET, OKUL VEYA TARİH UYDURMA: Adayın gerçek şirketlerini, rollerini, tarihlerini ve projelerini koru.
2. ZAYIF CÜMLELERİ GÜÇLENDİR: Önceki CV'deki pasif ifadeleri ("...üzerinde çalıştım", "...yaptım") güçlü eylem fiilleri, STAR tekniği ve etki odaklı profesyonel ifadelerle otomatik olarak değiştir.
3. ATS ANAHTAR KELİMELERİNİ ENTEGRE ET: Hedef ilandaki anahtar kelimelerden adayın mevcut deneyimiyle örtüşenleri "Özet (Summary)", "Deneyim (Experience)" ve "Teknik Beceriler (Skills)" bölümlerine doğal ve ATS dostu biçimde yerleştir.
4. "yeniCvMetni" alanı, doğrudan indirilebilecek veya başvuruda kullanılabilecek temiz, düzenli, başlıkları net ayrılmış tam CV metni olmalıdır.
5. "uygulananDegisiklikler" dizisinde hangi bölümde neyi nasıl iyileştirdiğini maddeler halinde açıkla.
6. "yeniCvMatch" alanında, oluşturduğun bu yeni CV'nin ilana göre güncel skorunu (önceki skordan anlamlı ölçüde daha yüksek ve gerçekçi) ve kalan ufak tavsiyeleri üret.
`;

    const userPrompt = `
HEDEF İLAN BİLGİLERİ:
Pozisyon: ${jobAnalysis.baslik} (${jobAnalysis.sirketAdi})
Seviye: ${jobAnalysis.pozisyonSeviyesi}
Zorunlu Nitelikler: ${jobAnalysis.zorunluNitelikler.map((n) => n.ad).join(", ")}
Teknik Beceriler: ${jobAnalysis.teknikBeceriler.join(", ")}
ATS Anahtar Kelimeleri: ${jobAnalysis.anahtarKelimeler.join(", ")}

${
  oldMatch
    ? `ÖNCEKİ CV SKORU: %${oldMatch.uyumSkoru}
ÖNCEKİ DÜZENLEME ÖNERİLERİ (Bunların tamamını yeni CV metnine uygula):
${JSON.stringify(oldMatch.duzenlemeler, null, 2)}
EKSİK ANAHTAR KELİMELER: ${oldMatch.eksikAnahtarKelimeler.join(", ")}`
    : ""
}

ADAYIN MEVCUT CV METNİ:
<cv_metni>
${targetCv.cvMetni.substring(0, 9000)}
</cv_metni>

Lütfen AutoEditedCvResultSchema formatında (yeniCvMetni, uygulananDegisiklikler, eklenenAnahtarKelimeler, yeniCvMatch) JSON üret.
`;

    const activeSchema =
      Schemas.AutoEditedCvResultSchema || FallbackAutoEditedCvResultSchema;

    const result = await generateJSONWithRetry<AutoEditedCvResult>({
      system: systemPrompt,
      user: userPrompt,
      schema: activeSchema,
      temperature: 0.25,
    });

    const retentionDays = parseInt(process.env.CV_RETENTION_DAYS || "30", 10);
    const silinmeTarihi = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    );

    const cleanBaseName = targetCv.dosyaAdi.replace(/^Otomatik_Optimize_/i, "");
    const newFileName = `Otomatik_Optimize_${cleanBaseName}`;

    const newCvUpload = await db.cvUpload.create({
      data: {
        analysisId,
        anonymousId,
        dosyaAdi: newFileName,
        cvMetni: result.yeniCvMetni,
        cvMatch: result.yeniCvMatch as any,
        silinmeTarihi,
      },
    });

    return NextResponse.json({
      cvUploadId: newCvUpload.id,
      cvMatch: result.yeniCvMatch,
      cvMetni: result.yeniCvMetni,
      dosyaAdi: newCvUpload.dosyaAdi,
      uygulananDegisiklikler: result.uygulananDegisiklikler,
      eklenenAnahtarKelimeler: result.eklenenAnahtarKelimeler,
      previousCv: {
        id: targetCv.id,
        dosyaAdi: targetCv.dosyaAdi,
        createdAt: targetCv.createdAt.toISOString(),
        cvMatch: oldMatch,
      },
    });
  } catch (error: any) {
    console.error("Otomatik CV düzenleme hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "CV'niz otomatik düzenlenirken bir hata oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
