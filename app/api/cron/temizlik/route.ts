import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Geçerli CRON_SECRET gereklidir." },
        { status: 401 }
      );
    }

    const now = new Date();

    // 1. Süresi dolmuş CV yüklemelerini sil (silinmeTarihi < now)
    const deletedCvUploads = await db.cvUpload.deleteMany({
      where: {
        silinmeTarihi: { lt: now },
      },
    });

    // 2. 90 günden eski analiz kayıtlarını sil
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedAnalyses = await db.analysis.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    // 3. Süresi geçmiş RateLimit kayıtlarını sil
    const deletedRateLimits = await db.rateLimit.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      deletedCvUploads: deletedCvUploads.count,
      deletedAnalyses: deletedAnalyses.count,
      deletedRateLimits: deletedRateLimits.count,
    });
  } catch (error: any) {
    console.error("Cron temizlik hatası:", error);
    return NextResponse.json(
      { error: "Temizlik işlemi sırasında hata oluştu: " + error.message },
      { status: 500 }
    );
  }
}
