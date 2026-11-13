import { z } from "zod";

export interface GenerateJSONOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T, any, any>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMProvider {
  generateJSON<T>(opts: GenerateJSONOptions<T>): Promise<T>;
  streamText?(opts: { system: string; user: string }): ReadableStream<string>;
}
