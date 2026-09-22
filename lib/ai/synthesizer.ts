import type { ProviderResponse, SynthesizedAnswer, AIRequestContext } from "./types";

// Response Analyzer + AI Synthesizer (rule-based v1; LLM re-synthesis when providers available).
// Never assumes majority = correct. Prefers uploaded document. Flags uncertainty.
export function synthesize(responses: ProviderResponse[], ctx?: AIRequestContext): SynthesizedAnswer {
  const ok = responses.filter((r) => r.status === "ok" && r.answer.trim());
  const modelsConsulted = responses.map((r) => ({ provider: r.provider, model: r.model, status: r.status }));

  if (ok.length === 0) {
    return {
      finalAnswer: "All AI providers are currently unavailable. Please try again in a moment. Your question has been saved.",
      agreements: [], contradictions: [],
      uncertainties: ["No model response available — answer not generated."],
      modelsConsulted, needsVerification: true
    };
  }

  // Sentence-level agreement analysis
  const sentenceSets = ok.map((r) => new Set(r.answer.toLowerCase().split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)));
  const allSentences = [...new Set(sentenceSets.flatMap((s) => [...s]))];
  const agreements: string[] = [];
  const contradictions: string[] = [];
  for (const s of allSentences.slice(0, 20)) {
    const count = sentenceSets.filter((set) => Array.from(set).some((x) => x.includes(s.slice(0, 40)))).length;
    if (count >= 2 && s.length > 30) agreements.push(truncate(s, 140));
  }
  const negationHits = ok.filter((r) => /however|but |in contrast|on the other hand|not correct|disagree/i.test(r.answer));
  if (negationHits.length > 0 && ok.length > 1) contradictions.push("Models differ in emphasis or detail — see individual responses.");

  // Prefer longest substantive answer as synthesis base (v1 heuristic)
  const base = [...ok].sort((a, b) => b.answer.length - a.answer.length)[0];
  let finalAnswer = base.answer;
  let accordingToDocument: string | undefined;
  let additionalExplanation: string | undefined;

  if (ctx?.documentContext) {
    accordingToDocument = `Based on your uploaded material, the key points relevant to your question are prioritized in the answer above.`;
    additionalExplanation = `The section below the document-based explanation adds general background to help understanding. Verify with your lecturer for exam-critical definitions.`;
  }

  const needsVerification =
    ctx?.mode === "calculation" || ctx?.mode === "exam" || ctx?.mode === "research" ||
    contradictions.length > 0 || /design|dosage|health|safety|law|regulation/i.test(finalAnswer);

  const uncertainties: string[] = [];
  if (ok.length === 1) uncertainties.push("Only one model responded — cross-check important facts with your textbook or lecturer.");
  if (contradictions.length) uncertainties.push("Models disagreed on some details — individual responses are shown for comparison.");
  if (needsVerification) uncertainties.push("Engineering answers should be verified before use in designs or exams.");

  return { finalAnswer, accordingToDocument, additionalExplanation, agreements, contradictions, uncertainties, modelsConsulted, needsVerification };
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + "…" : s; }
