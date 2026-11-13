import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAnonymousId, ANONYMOUS_COOKIE_NAME } from "@/lib/anonymous";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const anonymousId = await getAnonymousId();
    const count = await db.analysis.count({
      where: { anonymousId },
    });

    return NextResponse.json({
      anonymousId,
      analysisCount: count,
    });
  } catch (error: any) {
    console.error("Oturum bilgisi alma hatası:", error);
    return NextResponse.json(
      { error: "Oturum bilgisi alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentId = await getAnonymousId();
    const body = await request.json();
    const targetId = String(body.targetAnonymousId || "").trim();
    const mergeExisting = body.mergeExisting !== false;

    if (!targetId || targetId.length < 8 || targetId.length > 64) {
      return NextResponse.json(
        { error: "Geçerli bir oturum / eşitleme kodu giriniz." },
        { status: 400 }
      );
    }

    if (mergeExisting && currentId && currentId !== targetId) {
      await db.analysis.updateMany({
        where: { anonymousId: currentId },
        data: { anonymousId: targetId },
      });
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: ANONYMOUS_COOKIE_NAME,
      value: targetId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    const totalCount = await db.analysis.count({
      where: { anonymousId: targetId },
    });

    return NextResponse.json({
      success: true,
      anonymousId: targetId,
      analysisCount: totalCount,
    });
  } catch (error: any) {
    console.error("Oturum eşitleme hatası:", error);
    return NextResponse.json(
      { error: "Oturum eşitlenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
