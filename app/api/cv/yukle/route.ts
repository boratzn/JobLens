import { NextResponse } from "next/server";
import { parseCvFile } from "@/lib/cv/parse";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kvkkOnay = formData.get("kvkkOnay");

    if (kvkkOnay !== "true") {
      return NextResponse.json(
        {
          error:
            "CV analizi yapabilmek için KVKK aydınlatma metnini onaylamanız gerekmektedir.",
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Lütfen bir CV dosyası seçiniz." },
        { status: 400 }
      );
    }

    const maxMb = parseInt(process.env.MAX_CV_SIZE_MB || "4", 10);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `Dosya boyutu çok büyük. Lütfen en fazla ${maxMb} MB boyutunda bir dosya yükleyiniz.`,
        },
        { status: 400 }
      );
    }

    // Dosya belleğe okunur, asla diske yazılmaz
    const arrayBuffer = await file.arrayBuffer();
    const parsed = await parseCvFile(arrayBuffer, file.name);

    return NextResponse.json({
      success: true,
      text: parsed.text,
      fileName: file.name,
      pageCount: parsed.pageCount,
    });
  } catch (error: any) {
    console.error("CV yükleme hatası:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "CV dosyası işlenirken bir sorun oluştu. Lütfen dosyanızı kontrol ediniz.",
      },
      { status: 500 }
    );
  }
}
