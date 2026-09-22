import { runProviders } from "@/lib/ai/manager";
import { routeRequest } from "@/lib/ai/router";
import { synthesize } from "@/lib/ai/synthesizer";
import { systemPrompt } from "@/lib/prompts";
import { getCache, setCache, cacheKey } from "@/lib/guard";
import { getProviderConfigs, recordAIRequest } from "@/lib/db";
import type { AIRequestContext, ChatMessage, SynthesizedAnswer, ProviderResponse } from "@/lib/ai/types";

// Deterministic offline fallback for Document Q&A — no AI keys needed.
function offlineDocAnswer(doc: string, question: string): string {
  const qTokens = question.toLowerCase().split(/[^a-z0-9+]+/).filter((t) => t.length > 2);
  const sentences = doc.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const hits = sentences.filter((s) => qTokens.some((t) => s.toLowerCase().includes(t)));
  const chosen = (hits.length ? hits : sentences).slice(0, 4);
  return `**According to your document:**\n\n${chosen.join("\n\n")}\n\n> AI providers were unavailable, so this is a direct extract from your uploaded material. Re-ask when models are online for a fuller explanation.`;
}

export interface EnginePayload {
  final: string;
  synthesis: SynthesizedAnswer;
  responses: ProviderResponse[];
}

// Shared core for /api/chat and document Q&A. Logs usage to DB for analytics.
export async function runChat(ctx: AIRequestContext, opts?: { userId?: string; cacheTtl?: number }): Promise<EnginePayload> {
  const ck = cacheKey({ m: ctx.messages.slice(-6), mode: ctx.mode, lang: ctx.language, sub: ctx.subject, doc: (ctx.documentContext || "").slice(0, 200) });
  const cached = getCache(ck);
  if (cached) return cached as EnginePayload;

  const configs = getProviderConfigs();
  const providerIds = routeRequest(ctx, configs);
  const sys: ChatMessage = { role: "system", content: systemPrompt(ctx.mode, ctx.language, ctx.subject, ctx.documentContext) };
  const full = [sys, ...ctx.messages];
  const responses = await runProviders(providerIds, full, configs);
  const synth = synthesize(responses, ctx);

  if (synth.finalAnswer.startsWith("All AI providers") && ctx.documentContext) {
    const lastUser = [...ctx.messages].reverse().find((m) => m.role === "user")?.content || "";
    synth.finalAnswer = offlineDocAnswer(ctx.documentContext, lastUser);
  }
  const payload: EnginePayload = { final: synth.finalAnswer, synthesis: synth, responses };
  setCache(ck, payload, opts?.cacheTtl ?? 600);

  if (opts?.userId) {
    // best-effort analytics; never blocks the answer
    try { recordAIRequest(opts.userId, ctx.mode, responses, synth.finalAnswer); } catch { /* ignored */ }
  }
  return payload;
}