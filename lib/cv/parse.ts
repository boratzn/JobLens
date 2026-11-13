import { extractText } from "unpdf";
import mammoth from "mammoth";

export interface ParsedCvResult {
  text: string;
  pageCount?: number;
}

export async function parseCvFile(
  fileBuffer: ArrayBuffer,
  fileName: string
): Promise<ParsedCvResult> {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    try {
      // unpdf ile doğrudan ArrayBuffer üzerinden metin çıkarımı (serverless uyumlu)
      const result = await extractText(fileBuffer);
      const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
      const clean = (text || "").trim();

      if (!clean || clean.length < 50) {
        throw new Error(
          "CV'nizin taranmış görsel değil, seçilebilir metin içerikli bir PDF olması gerekmektedir."
        );
      }

      return {
        text: clean,
        pageCount: result.totalPages,
      };
    } catch (err: any) {
      if (err.message?.includes("seçilebilir metin")) throw err;
      throw new Error(
        "PDF dosyası okunurken hata oluştu. Lütfen dosyanın bozuk olmadığından emin olun."
      );
    }
  }

  if (lowerName.endsWith(".docx")) {
    try {
      const buffer = Buffer.from(fileBuffer);
      const result = await mammoth.extractRawText({ buffer });
      const clean = (result.value || "").trim();

      if (!clean || clean.length < 50) {
        throw new Error(
          "Word (DOCX) dosyasından metin okunamadı veya dosya boş."
        );
      }

      return { text: clean };
    } catch (err: any) {
      if (err.message?.includes("Word (DOCX)")) throw err;
      throw new Error(
        "DOCX dosyası okunurken bir hata oluştu. Lütfen geçerli bir Word belgesi yükleyin."
      );
    }
  }

  throw new Error("Yalnızca PDF (.pdf) veya Word (.docx) formatı desteklenmektedir.");
}
