import {
  CloudflareAdapter, GeminiAdapter, GroqAdapter,
  HuggingFaceAdapter, MicrosoftAdapter, MistralAdapter, OpenRouterAdapter
} from "./providers/adapters";
import type { AIProviderAdapter, ProviderConfig, ProviderResponse, ChatMessage } from "./types";

// Default registry — in production this is loaded from DB (ai_providers + ai_models tables)
// and editable in Admin Dashboard. Quotas/models are dynamic, never hard-coded as final truth.
export const defaultProviderConfigs: ProviderConfig[] = [
  { id: "gemini",      model: process.env.GEMINI_MODEL || "gemini-1.5-flash", enabled: true, priority: 1, freeTier: true, dailyLimit: 1500, requestsUsed: 0 },
  { id: "groq",        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", enabled: true, priority: 2, freeTier: true, dailyLimit: 14400, requestsUsed: 0 },
  { id: "openrouter",  model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free", enabled: true, priority: 3, freeTier: true, dailyLimit: 200, requestsUsed: 0 },
  { id: "mistral",     model: process.env.MISTRAL_MODEL || "mistral-small-latest", enabled: true, priority: 4, freeTier: true, dailyLimit: 500, requestsUsed: 0 },
  { id: "huggingface", model: process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3", enabled: true, priority: 5, freeTier: true, dailyLimit: 1000, requestsUsed: 0 },
  { id: "cloudflare",  model: process.env.CF_MODEL || "@cf/meta/llama-3.1-8b-instruct", enabled: true, priority: 6, freeTier: true, dailyLimit: 10000, requestsUsed: 0 },
  { id: "microsoft",   model: process.env.MS_COPILOT_MODEL || "gpt-4o", enabled: true, priority: 4, freeTier: false, dailyLimit: 500, requestsUsed: 0 },
];

const adapters: Record<string, AIProviderAdapter> = {};
for (const a of [new GeminiAdapter(), new GroqAdapter(), new OpenRouterAdapter(), new MistralAdapter(), new HuggingFaceAdapter(), new CloudflareAdapter(), new MicrosoftAdapter()]) {
  adapters[a.id] = a;
}

/** Register a NEW provider without rewriting the app — just add an adapter + config. */
export function registerProvider(adapter: AIProviderAdapter, config: ProviderConfig) {
  adapters[adapter.id] = adapter;
  const i = defaultProviderConfigs.findIndex((c) => c.id === adapter.id);
  if (i >= 0) defaultProviderConfigs[i] = config; else defaultProviderConfigs.push(config);
}

export function getAdapter(id: string) { return adapters[id]; }

export function activeProviders(configs: ProviderConfig[] = defaultProviderConfigs) {
  return configs.filter((c) => c.enabled && adapters[c.id]?.isConfigured()).sort((a, b) => a.priority - b.priority);
}

/** Fan-out with fallback: try providers in priority order, collect all results. */
export async function runProviders(
  ids: string[], messages: ChatMessage[], configs: ProviderConfig[] = defaultProviderConfigs
): Promise<ProviderResponse[]> {
  const results: ProviderResponse[] = [];
  for (const id of ids) {
    const adapter = adapters[id];
    const cfg = configs.find((c) => c.id === id);
    if (!adapter || !cfg?.enabled) {
      results.push({ provider: id, model: cfg?.model || "—", answer: "", responseTimeMs: 0, status: "skipped" });
      continue;
    }
    if (cfg.requestsUsed >= cfg.dailyLimit) {
      results.push({ provider: id, model: cfg.model, answer: "", responseTimeMs: 0, status: "skipped", error: "Daily quota reached" });
      continue;
    }
    const t0 = Date.now();
    try {
      const r = await adapter.complete(messages, { model: cfg.model });
      results.push({ responseTimeMs: Date.now() - t0, ...r, provider: id, model: cfg.model });
      if (r.status === "ok") cfg.requestsUsed += 1; else cfg.lastError = r.error;
    } catch (e: any) {
      cfg.lastError = e.message;
      results.push({ provider: id, model: cfg.model, answer: "", responseTimeMs: Date.now() - t0, status: "error", error: "Provider failed" });
    }
  }
  return results;
}
