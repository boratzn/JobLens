import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const anonymousId = await getAnonymousId();
    const latestCv = await db.cvUpload.findFirst({
      where: { anonymousId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        dosyaAdi: true,
        cvMetni: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      cv: latestCv || null,
    });
  } catch (error) {
    console.error("Aktif CV getirme hatası:", error);
    return NextResponse.json({ cv: null });
  }
}

export async function DELETE() {
  try {
    const anonymousId = await getAnonymousId();
    await db.cvUpload.deleteMany({
      where: { anonymousId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Aktif CV silme hatası:", error);
    return NextResponse.json(
      { error: "CV silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
