import Anthropic from "@anthropic-ai/sdk";
import { GenerateJSONOptions, LLMProvider } from "./types";
import { zodToJsonSchema } from "zod-to-json-schema";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.modelName =
      modelName || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  }

  async generateJSON<T>(opts: GenerateJSONOptions<T>): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY bulunamadı. Lütfen ortam değişkenlerini kontrol edin."
      );
    }

    const anthropic = new Anthropic({ apiKey: this.apiKey });
    const timeoutMs = opts.timeoutMs || 50000;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Anthropic API yanıt süresi 50 saniyeyi aştı. Lütfen tekrar deneyiniz."
          )
        );
      }, timeoutMs);
    });

    const executionPromise = (async () => {
      const toolName = "submit_structured_result";
      const schemaObj = zodToJsonSchema(opts.schema as any, {
        target: "openApi3",
      }) as Record<string, any>;
      delete schemaObj.$schema;

      const response = await anthropic.messages.create({
        model: this.modelName,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
        tools: [
          {
            name: toolName,
            description: "Yapılandırılmış JSON çıktısını teslim etme aracı",
            input_schema: schemaObj as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: toolName },
      } as any);

      const toolUseBlock = response.content.find((c) => c.type === "tool_use");
      if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
        throw new Error("Anthropic yanıtında beklenen JSON aracı bulunamadı.");
      }

      return opts.schema.parse(toolUseBlock.input);
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }
}
