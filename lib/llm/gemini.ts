import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateJSONOptions, LLMProvider } from "./types";
import { z } from "zod";

const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

function cleanGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(cleanGeminiSchema);
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "$schema" || key === "default") continue;
    if (key === "type" && Array.isArray(val)) {
      const nonNull = val.find((t: any) => t !== "null") || "string";
      out.type = nonNull;
      out.nullable = true;
    } else {
      out[key] = cleanGeminiSchema(val);
    }
  }
  return out;
}

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.modelName =
      modelName || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  }

  async generateJSON<T>(opts: GenerateJSONOptions<T>): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "GEMINI_API_KEY bulunamadı. Lütfen ortam değişkenlerini kontrol edin."
      );
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const timeoutMs = opts.timeoutMs || 50000;

    // Timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Gemini API yanıt süresi 50 saniyeyi aştı. Lütfen tekrar deneyiniz."
          )
        );
      }, timeoutMs);
    });

    const executionPromise = (async () => {
      let geminiSchema: any;
      if (opts.schema) {
        try {
          const rawOpenApi = (z as any).toJSONSchema
            ? (z as any).toJSONSchema(opts.schema, { target: "openApi3" })
            : (opts.schema as any).toJSONSchema
            ? (opts.schema as any).toJSONSchema({ target: "openApi3" })
            : undefined;
          geminiSchema = cleanGeminiSchema(rawOpenApi);
        } catch (schemaErr) {
          console.warn(
            "Schema conversion warning, proceeding without strict responseSchema:",
            schemaErr
          );
        }
      }

      const modelsToTry = [
        this.modelName,
        ...FALLBACK_MODELS.filter((m) => m !== this.modelName),
      ];

      let lastError: any = null;

      for (const currentModel of modelsToTry) {
        try {
          const modelConfig: any = {
            model: currentModel,
            systemInstruction: opts.system,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: opts.temperature ?? 0.2,
              maxOutputTokens: opts.maxTokens ?? 8192,
            },
          };

          if (geminiSchema && Object.keys(geminiSchema).length > 0) {
            modelConfig.generationConfig.responseSchema = geminiSchema;
          }

          const model = genAI.getGenerativeModel(modelConfig);

          const response = await model.generateContent(opts.user);
          const text = response.response.text();
          if (!text) {
            throw new Error("Gemini API'den boş yanıt alındı.");
          }

          const parsedJson = JSON.parse(text);
          return opts.schema ? opts.schema.parse(parsedJson) : (parsedJson as T);
        } catch (err: any) {
          lastError = err;
          const isModelUnavailable =
            err.message?.includes("404") ||
            err.message?.includes("not found") ||
            err.message?.includes("503") ||
            err.message?.includes("high demand") ||
            err.message?.includes("no longer available");

          if (isModelUnavailable && currentModel !== modelsToTry[modelsToTry.length - 1]) {
            console.warn(
              `[Gemini] ${currentModel} kullanılamadı (${err.message.substring(0, 80)}...). Alternatif model deneniyor...`
            );
            continue;
          }

          throw err;
        }
      }

      throw lastError || new Error("Gemini modelleri çağrılamadı.");
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }
}


