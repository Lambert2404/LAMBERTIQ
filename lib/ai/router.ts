import { activeProviders } from "./manager";
import type { AIRequestContext, ProviderConfig } from "./types";
import { defaultProviderConfigs } from "./manager";

// Intelligent router: conserve free quotas — only escalate to multi-model when needed.
export function routeRequest(ctx: AIRequestContext, configs: ProviderConfig[] = defaultProviderConfigs): string[] {
  const active = activeProviders(configs).map((c) => c.id);
  if (active.length === 0) return [];
  const lastUser = [...ctx.messages].reverse().find((m) => m.role === "user")?.content || "";
  const text = lastUser.toLowerCase();
  const wordCount = lastUser.split(/\s+/).length;

  const isCalculation = ctx.needsCalculation || ctx.mode === "calculation" ||
    /calculate|computation|mass balance|energy balance|hydraulic|flow rate|retention time|bod|cod|convert|equation|solve/.test(text);
  const isImportant = ctx.mode === "exam" || ctx.mode === "research" || /exam|final|critical|design a|eia/.test(text);
  const isComplex = wordCount > 60 || ctx.mode === "teach" || ctx.mode === "document-qa" || (ctx.documentContext?.length || 0) > 500;
  const isSimple = wordCount < 15 && !isCalculation && !isImportant && !isComplex;

  if (isSimple) return active.slice(0, 1);                    // 1 model — save quota
  if (isCalculation) return active.filter((a) => ["gemini", "groq", "openrouter"].includes(a)).slice(0, 2); // reasoning-capable
  if (isImportant) return active.slice(0, Math.min(4, active.length)); // multi-model + synthesis
  if (isComplex) return active.slice(0, Math.min(3, active.length));
  return active.slice(0, Math.min(2, active.length));          // default: 2 for quality/cost balance
}
