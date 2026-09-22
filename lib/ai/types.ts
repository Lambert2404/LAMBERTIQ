// LAMBERTIQ Multi-AI core types — provider-agnostic, extensible.
export type StudyMode =
  | "ask" | "teach" | "explain-simply" | "exam" | "quiz"
  | "calculation" | "revision" | "document-qa" | "research";

export type Language = "en" | "sw";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequestContext {
  messages: ChatMessage[];
  mode: StudyMode;
  language: Language;
  subject?: string;
  documentContext?: string;
  needsCalculation?: boolean;
}

export interface ProviderResponse {
  provider: string;
  model: string;
  answer: string;
  responseTimeMs: number;
  tokensUsed?: number;
  status: "ok" | "error" | "skipped";
  error?: string;
  confidence?: number;
}

export interface SynthesizedAnswer {
  finalAnswer: string;
  accordingToDocument?: string;
  additionalExplanation?: string;
  agreements: string[];
  contradictions: string[];
  uncertainties: string[];
  calculationSteps?: CalcStep[];
  modelsConsulted: { provider: string; model: string; status: string }[];
  needsVerification: boolean;
}

export interface CalcStep {
  label: "Given Data" | "Formula" | "Substitution" | "Calculation" | "Units" | "Final Answer" | "Explanation";
  content: string;
}

export interface AIProviderAdapter {
  readonly id: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  complete(prompt: ChatMessage[], opts?: { model?: string }): Promise<Omit<ProviderResponse, "provider" | "responseTimeMs">>;
}

// Registry entry — admin-configurable, DB-backed in production.
export interface ProviderConfig {
  id: string;
  model: string;
  enabled: boolean;
  priority: number;      // lower = tried first
  freeTier: boolean;
  dailyLimit: number;
  requestsUsed: number;
  lastError?: string;
}
