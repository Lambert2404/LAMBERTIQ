import type { AIProviderAdapter, ChatMessage } from "../types";

function toPrompt(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
}

async function postJSON(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body), signal: ctrl.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error?.message || `HTTP ${res.status}`);
    return data as any;
  } finally { clearTimeout(t); }
}

/** Google Gemini (free tier). Env: GEMINI_API_KEY */
export class GeminiAdapter implements AIProviderAdapter {
  readonly id = "gemini";
  readonly defaultModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  isConfigured() { return !!process.env.GEMINI_API_KEY; }
  async complete(messages: ChatMessage[], opts?: { model?: string }) {
    const model = opts?.model || this.defaultModel;
    try {
      const data = await postJSON(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {}, { contents: [{ parts: [{ text: toPrompt(messages) }] }] });
      const answer = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "No response.";
      return { model, answer, status: "ok" as const };
    } catch (e: any) { return { model, answer: "", status: "error" as const, error: e.message }; }
  }
}

/** Groq (free tier, fast inference). Env: GROQ_API_KEY */
export class GroqAdapter implements AIProviderAdapter {
  readonly id = "groq";
  readonly defaultModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  isConfigured() { return !!process.env.GROQ_API_KEY; }
  async complete(messages: ChatMessage[], opts?: { model?: string }) {
    const model = opts?.model || this.defaultModel;
    try {
      const data = await postJSON("https://api.groq.com/openai/v1/chat/completions",
        { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        { model, messages });
      return { model, answer: data?.choices?.[0]?.message?.content || "No response.", status: "ok" as const, tokensUsed: data?.usage?.total_tokens };
    } catch (e: any) { return { model, answer: "", status: "error" as const, error: e.message }; }
  }
}

/** OpenRouter (free models available). Env: OPENROUTER_API_KEY */
export class OpenRouterAdapter implements AIProviderAdapter {
  readonly id = "openrouter";
  readonly defaultModel = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
  isConfigured() { return !!process.env.OPENROUTER_API_KEY; }
  async complete(messages: ChatMessage[], opts?: { model?: string }) {
    const model = opts?.model || this.defaultModel;
    try {
      const data = await postJSON("https://openrouter.ai/api/v1/chat/completions",
        { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "HTTP-Referer": "https://lambertiq.education", "X-Title": "LAMBERTIQ" },
        { model, messages });
      return { model, answer: data?.choices?.[0]?.message?.content || "No response.", status: "ok" as const, tokensUsed: data?.usage?.total_tokens };
    } catch (e: any) { return { model, answer: "", status: "error" as const, error: e.message }; }
  }
}

/** Mistral (free tier / La Plateforme). Env: MISTRAL_API_KEY */
export class MistralAdapter implements AIProviderAdapter {
  readonly id = "mistral";
  readonly defaultModel = process.env.MISTRAL_MODEL || "mistral-small-latest";
  isConfigured() { return !!process.env.MISTRAL_API_KEY; }
  async complete(messages: ChatMessage[], opts?: { model?: string }) {
    const model = opts?.model || this.defaultModel;
    try {
      const data = await postJSON("https://api.mistral.ai/v1/chat/completions",
        { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
        { model, messages });
      return { model, answer: data?.choices?.[0]?.message?.content || "No response.", status: "ok" as const, tokensUsed: data?.usage?.total_tokens };
    } catch (e: any) { return { model, answer: "", status: "error" as const, error: e.message }; }
  }
}

/** Hugging Face Inference API. Env: HUGGINGFACE_API_KEY */
export class HuggingFaceAdapter implements AIProviderAdapter {
  readonly id = "huggingface";
  readonly defaultModel = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
  isConfigured() { return !!process.env.HUGGINGFACE_API_KEY; }
  async complete(messages: ChatMessage[], opts?: { model?: string }) {
    const model = opts?.model || this.defaultModel;
    try {
      const data = await postJSON(`https://api-inference.huggingface.co/models/${model}`,
        { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        { inputs: toPrompt(messages), parameters: { max_new_tokens: 800, return_full_text: false } }, 60000);
      const answer = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text || JSON.stringify(data).slice(0, 2000);
      return { model, answer: answer || "No response.", status: "ok" as const };
    } catch (e: any) { return { model, answer: "", status: "error" as const, error: e.message }; }
  }
}

/** Cloudflare Workers AI. Env: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN */
export class CloudflareAdapter implements AIProviderAdapter {
  readonly id = "cloudflare";
  readonly defaultModel = process.env.CF_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  isConfigured() { return !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_API_TOKEN; }
  async complete(messages: ChatMessage[], opts?: { model?: string }) {
    const model = opts?.model || this.defaultModel;
    try {
      const data = await postJSON(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
        { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
        { messages });
      return { model, answer: data?.result?.response || "No response.", status: "ok" as const };
    } catch (e: any) { return { model, answer: "", status: "error" as const, error: e.message }; }
  }
}
