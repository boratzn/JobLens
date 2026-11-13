import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAnonymousId } from "@/lib/anonymous";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anonymousId = await getAnonymousId();

    const record = await db.cvUpload.findFirst({
      where: {
        id,
        anonymousId,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "CV kaydı bulunamadı veya yetkiniz yok." },
        { status: 404 }
      );
    }

    await db.cvUpload.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "CV verileriniz kalıcı olarak silindi.",
    });
  } catch (error: any) {
    console.error("CV silme hatası:", error);
    return NextResponse.json(
      { error: "CV silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
