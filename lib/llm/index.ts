import { LLMProvider, GenerateJSONOptions } from "./types";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { cookies } from "next/headers";

export * from "./types";

export async function getLLMProvider(): Promise<LLMProvider> {
  try {
    const cookieStore = await cookies();
    const byokKey = cookieStore.get("byok_key")?.value?.trim();
    const byokProvider = cookieStore
      .get("byok_provider")
      ?.value?.trim()
      ?.toLowerCase();
    const byokModel = cookieStore.get("byok_model")?.value?.trim() || undefined;

    if (byokKey && byokKey.length > 10) {
      const decodedKey = decodeURIComponent(byokKey);
      const decodedModel = byokModel
        ? decodeURIComponent(byokModel)
        : undefined;
      if (byokProvider === "anthropic") {
        return new AnthropicProvider(decodedKey, decodedModel);
      }
      return new GeminiProvider(decodedKey, decodedModel);
    }
  } catch {
    // Request context dışında (ör. birim testleri) ortam değişkenlerine düşer
  }

  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();

  if (provider === "anthropic") {
    return new AnthropicProvider();
  }

  return new GeminiProvider();
}

/**
 * Zod doğrulama hatası durumunda 1 kez yeniden deneme destekli güvenli JSON üretim fonksiyonu
 */
export async function generateJSONWithRetry<T>(
  opts: GenerateJSONOptions<T>
): Promise<T> {
  const provider = await getLLMProvider();

  try {
    return await provider.generateJSON(opts);
  } catch (firstError: any) {
    console.warn("LLM ilk çağrıda hata verdi veya doğrulanamadı, yeniden deneniyor...", firstError.message);

    // Prompt'a hata uyarısı ekleyerek 1 kez tekrar dene
    const retryUserPrompt = `${opts.user}\n\nÖNEMLİ DÜZELTME NOTU: Bir önceki çıktın şema doğrulamasına takıldı veya şu hatayı verdi: ${firstError.message}. Lütfen yalnızca belirtilen şemaya ve kurallara harfiyen uygun bir JSON üret.`;

    return await provider.generateJSON({
      ...opts,
      user: retryUserPrompt,
    });
  }
}
