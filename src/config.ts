import "dotenv/config";

export interface RenderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

export function loadConfig(): RenderConfig {
  const apiKey = readEnv("ZAI_API_KEY") ?? "";
  return {
    apiKey,
    baseUrl: readEnv("ZAI_BASE_URL") ?? "https://api.z.ai/api/paas/v4",
    model: readEnv("ZAI_MODEL") ?? "glm-5.1",
    maxTokens: Number(readEnv("ZAI_MAX_TOKENS") ?? 400),
    temperature: 0,
  };
}
