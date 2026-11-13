import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";
import * as Schemas from "@/lib/schemas";
import type { JobAnalysis } from "@/lib/schemas";

const FallbackApplicationTrackerSchema = z.object({
  durum: z
    .enum(["inceleniyor", "basvuruldu", "mulakat", "teklif", "red"])
    .default("inceleniyor"),
  mulakatTarihi: z.string().nullable().default(null),
  notlar: z.string().default(""),
  guncellenmeTarihi: z.string().default(() => new Date().toISOString()),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const anonymousId = await getAnonymousId();

    const analyses = await db.analysis.findMany({
      where: { anonymousId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        kaynakSite: true,
        createdAt: true,
        jobAnalysis: true,
        cvUploads: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            id: true,
            dosyaAdi: true,
            cvMatch: true,
            createdAt: true,
          },
        },
        _count: {
          select: { cvUploads: true },
        },
      },
    });

    return NextResponse.json({ analyses });
  } catch (error: any) {
    console.error("Geçmiş getirme hatası:", error);
    return NextResponse.json(
      { error: "Geçmiş analizler yüklenemedi." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, durum, mulakatTarihi, notlar } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id zorunludur" }, { status: 400 });
    }

    const analysis = await db.analysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analiz bulunamadı." },
        { status: 404 }
      );
    }

    const currentJob = (analysis.jobAnalysis as unknown as JobAnalysis) || ({} as JobAnalysis);
    const currentTracker = currentJob.basvuruTakip || {
      durum: "inceleniyor",
      mulakatTarihi: null,
      notlar: "",
    };

    const activeTrackerSchema =
      Schemas.ApplicationTrackerSchema || FallbackApplicationTrackerSchema;

    const updatedTracker = activeTrackerSchema.parse({
      durum: durum !== undefined ? durum : currentTracker.durum,
      mulakatTarihi:
        mulakatTarihi !== undefined
          ? mulakatTarihi
          : currentTracker.mulakatTarihi,
      notlar: notlar !== undefined ? notlar : currentTracker.notlar,
      guncellenmeTarihi: new Date().toISOString(),
    });

    const updatedJobAnalysis: JobAnalysis = {
      ...currentJob,
      basvuruTakip: updatedTracker,
    };

    await db.analysis.update({
      where: { id },
      data: {
        jobAnalysis: updatedJobAnalysis as any,
      },
    });

    return NextResponse.json({
      success: true,
      basvuruTakip: updatedTracker,
    });
  } catch (error: any) {
    console.error("Başvuru takip güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Başvuru durumu güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const anonymousId = await getAnonymousId();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id zorunludur" }, { status: 400 });
    }

    const deleted = await db.analysis.deleteMany({
      where: {
        id,
        anonymousId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Analiz bulunamadı veya yetkiniz yok." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Geçmiş silme hatası:", error);
    return NextResponse.json(
      { error: "Kayıt silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
