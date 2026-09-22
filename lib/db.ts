import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { DEPARTMENTS, ENV_ENGINEERING_SUBJECTS } from "@/data/curriculum";

const DB_PATH = path.join(process.cwd(), "data", "lambertiq.db");
let db: DatabaseSync | null = null;
let seeded = false;

// Throws from next-auth if used outside a request scope.
export interface UserRow {
  id: string; email: string; name: string | null;
  passwordHash: string; role: string; plan: string; createdAt: string;
}

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    try { db.exec("PRAGMA journal_mode = WAL;"); } catch { /* ignored */ }
    migrate(db);
  }
  return db;
}

function migrate(d: DatabaseSync) {
  d.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT,
    password_hash TEXT NOT NULL, role TEXT DEFAULT 'student', plan TEXT DEFAULT 'free',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS departments(id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS subjects(id TEXT PRIMARY KEY, department_id TEXT NOT NULL REFERENCES departments(id), name TEXT NOT NULL, grp TEXT);
  CREATE TABLE IF NOT EXISTS topics(id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES subjects(id), name TEXT NOT NULL, difficulty TEXT);
  CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, mode TEXT DEFAULT 'ask', subject TEXT, language TEXT DEFAULT 'en', created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
  CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, filename TEXT NOT NULL, parser TEXT, text TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS document_chunks(id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), chunk_index INTEGER NOT NULL, text TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
  CREATE TABLE IF NOT EXISTS ai_providers(
    id TEXT PRIMARY KEY, model TEXT, enabled INTEGER DEFAULT 1, priority INTEGER DEFAULT 9,
    free_tier INTEGER DEFAULT 1, daily_limit INTEGER DEFAULT 500, requests_used INTEGER DEFAULT 0, last_error TEXT
  );
  CREATE TABLE IF NOT EXISTS ai_models(id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, model TEXT NOT NULL, status TEXT DEFAULT 'active');
  CREATE TABLE IF NOT EXISTS ai_requests(id TEXT PRIMARY KEY, user_id TEXT, mode TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS ai_responses(id TEXT PRIMARY KEY, request_id TEXT NOT NULL, provider TEXT NOT NULL, model TEXT, answer TEXT, response_time_ms INTEGER, status TEXT, error TEXT);
  CREATE INDEX IF NOT EXISTS idx_airesp_req ON ai_responses(request_id);
  CREATE TABLE IF NOT EXISTS synthesized_answers(id TEXT PRIMARY KEY, request_id TEXT NOT NULL, final_answer TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY, user_id TEXT, subject TEXT, topic TEXT, difficulty TEXT, language TEXT DEFAULT 'en', created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS quiz_questions(id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL REFERENCES quizzes(id), qtype TEXT NOT NULL, question TEXT NOT NULL, options TEXT, answer TEXT NOT NULL, qorder INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS idx_qq_quiz ON quiz_questions(quiz_id);
  CREATE TABLE IF NOT EXISTS quiz_attempts(id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL, user_id TEXT NOT NULL, score REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS study_progress(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT, topic TEXT, score REAL, study_time_min INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')));
  CREATE INDEX IF NOT EXISTS idx_sp_user ON study_progress(user_id);
  CREATE TABLE IF NOT EXISTS study_plans(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, items TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS question_bank(id TEXT PRIMARY KEY, department TEXT, subject TEXT, topic TEXT, difficulty TEXT, qtype TEXT, question TEXT NOT NULL, options TEXT, answer TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS system_settings(key TEXT PRIMARY KEY, value TEXT);
  `);
}

export function seed() {
  getDb();
  if (seeded) return;
  seeded = true;
  const d = getDb();
  const count = <T>(t: string) => (d.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as any).c;

  if (count("departments") === 0) {
    for (const name of DEPARTMENTS) d.prepare("INSERT INTO departments(id,name) VALUES(?,?)").run(randId(), name);
  }
  const depId = (d.prepare("SELECT id FROM departments WHERE name=?").get("Environmental Engineering") as any)?.id;
  if (depId && count("subjects") === 0) {
    for (const g of ENV_ENGINEERING_SUBJECTS) {
      const sid = randId();
      const ins = d.prepare("INSERT INTO subjects(id,department_id,name,grp) VALUES(?,?,?,?)");
      for (const s of g.subjects) ins.run(randId(), depId, s, g.group);
    }
  }
  if (count("ai_providers") === 0) {
    const seedProviders = [
      ["gemini", "gemini-1.5-flash", 1, true, 1500], ["groq", "llama-3.1-8b-instant", 2, true, 14400],
      ["openrouter", "meta-llama/llama-3.1-8b-instruct:free", 3, true, 200], ["mistral", "mistral-small-latest", 4, true, 500],
      ["huggingface", "mistralai/Mistral-7B-Instruct-v0.3", 5, true, 1000], ["cloudflare", "@cf/meta/llama-3.1-8b-instruct", 6, true, 10000]
    ];
    for (const [id, model, pr, free, lim] of seedProviders) {
      d.prepare("INSERT INTO ai_providers(id,model,enabled,priority,free_tier,daily_limit) VALUES(?,?,1,?,?,?)").run(id, model, pr, free ? 1 : 0, lim);
    }
  }
  if (count("question_bank") === 0) seedQuestionBank(d);
  if (count("system_settings") === 0) {
    const ins = d.prepare("INSERT INTO system_settings(key,value) VALUES(?,?)");
    ins.run("FREE_DAILY_LIMIT", process.env.FREE_DAILY_LIMIT || "20");
    ins.run("PREMIUM_DAILY_LIMIT", process.env.PREMIUM_DAILY_LIMIT || "200");
    ins.run("ADMIN_DAILY_LIMIT", process.env.ADMIN_DAILY_LIMIT || "1000");
    ins.run("DEFAULT_LANGUAGE", "en");
  }
  if (count("users") === 0) {
    const adminPw = process.env.ADMIN_PASSWORD || "admin123";
    const studentPw = process.env.STUDENT_PASSWORD || "student123";
    d.prepare("INSERT INTO users(id,email,name,password_hash,role,plan) VALUES(?,?,?,?,?,?)").run(randId(), "admin@lambertiq.education", "LAMBERTIQ Admin", bcrypt.hashSync(adminPw, 10), "admin", "admin");
    d.prepare("INSERT INTO users(id,email,name,password_hash,role,plan) VALUES(?,?,?,?,?,?)").run(randId(), "student@lambertiq.education", "Demo Student", bcrypt.hashSync(studentPw, 10), "student", "free");
  }
}

function seedQuestionBank(d: DatabaseSync) {
  const qs = [
    ["Environmental Engineering", "Wastewater Engineering", "Activated Sludge", "Medium", "qa", "What is activated sludge?", null,
     "A mixture of microorganisms (bacteria, protozoa) and organic matter cultivated in an aerated tank to biologically treat wastewater by consuming organic pollutants."],
    ["Environmental Engineering", "Water Quality", "BOD & COD", "Easy", "qa", "Define BOD (Biochemical Oxygen Demand).", null,
     "BOD is the amount of dissolved oxygen consumed by microorganisms while decomposing organic matter in water — a measure of organic pollution."],
    ["Environmental Engineering", "Wastewater Engineering", "Activated Sludge", "Medium", "mcq", "The hydraulic retention time (HRT) of a 500 m³ aeration tank receiving 1000 m³/day is:",
     JSON.stringify(["0.5 days", "1 day", "2 days", "5 days"]), "0.5 days"],
    ["Environmental Engineering", "Water Treatment", "Coagulation", "Easy", "mcq", "The main purpose of coagulation in water treatment is to:",
     JSON.stringify(["Disinfect water", "Destabilise suspended particles so they clump", "Remove dissolved salts", "Increase pH"]), "Destabilise suspended particles so they clump"],
    ["Environmental Engineering", "Environmental Management", "EIA", "Easy", "tf", "Environmental Impact Assessment (EIA) is a process of evaluating the likely environmental impacts of a proposed project before it is approved.",
     null, "True"],
    ["Environmental Engineering", "Air Pollution", "Control Technologies", "Medium", "qa", "Name two common air pollution control technologies for particulate matter.",
     null, "Cyclones / cyclonic separators and baghouse fabric filters (also: electrostatic precipitators, wet scrubbers)."],
  ];
  const ins = d.prepare("INSERT INTO question_bank(id,department,subject,topic,difficulty,qtype,question,options,answer) VALUES(?,?,?,?,?,?,?,?,?)");
  for (const q of qs) ins.run(randId(), ...q);
}

// ---- helpers ----
export function randId() {
  return randomUUID();
}

export function saveMessage(userId: string, role: string, content: string, mode = "ask", language = "en") {
  let conv = scalar<{ id: string }>("SELECT id FROM conversations WHERE user_id=? AND mode=?", userId, mode);
  if (!conv) {
    const id = randId();
    run("INSERT INTO conversations(id,user_id,mode,language) VALUES(?,?,?,?)", id, userId, mode, language);
    conv = { id };
  }
  run("INSERT INTO messages(id,conversation_id,role,content) VALUES(?,?,?,?)", randId(), conv.id, role, content.slice(0, 20000));
  return conv.id;
}

export function scalar<T = any>(sql: string, ...params: any[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}
export function all<T = any>(sql: string, ...params: any[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}
export function run(sql: string, ...params: any[]): void {
  getDb().prepare(sql).run(...params);
}

export const findUserByEmail = (email: string): UserRow | undefined =>
  scalar<UserRow>("SELECT id,email,name,password_hash as passwordHash,role,plan,created_at as createdAt FROM users WHERE email=?", email);

export const getUserById = (id: string): UserRow | undefined =>
  scalar<UserRow>("SELECT id,email,name,password_hash as passwordHash,role,plan,created_at as createdAt FROM users WHERE id=?", id);

export function ensureDepartment(name: string): string {
  const row = scalar<{ id: string }>("SELECT id FROM departments WHERE name=?", name);
  if (row) return row.id;
  const id = randId(); run("INSERT INTO departments(id,name) VALUES(?,?)", id, name); return id;
}
export function ensureSubject(departmentId: string, name: string, grp?: string): string {
  const row = scalar<{ id: string }>("SELECT id FROM subjects WHERE department_id=? AND name=?", departmentId, name);
  if (row) return row.id;
  const id = randId(); run("INSERT INTO subjects(id,department_id,name,grp) VALUES(?,?,?,?)", id, departmentId, name, grp || null); return id;
}
export function ensureTopic(subjectId: string, name: string, difficulty?: string): string {
  const row = scalar<{ id: string }>("SELECT id FROM topics WHERE subject_id=? AND name=?", subjectId, name);
  if (row) return row.id;
  const id = randId(); run("INSERT INTO topics(id,subject_id,name,difficulty) VALUES(?,?,?,?)", id, subjectId, name, difficulty || null); return id;
}

export function getProviderConfigs() {
  seed();
  const rows = all<{ id: string; model: string | null; enabled: number; priority: number; free_tier: number; daily_limit: number; requests_used: number; last_error: string | null }>("SELECT id,model,enabled,priority,free_tier,daily_limit,requests_used,last_error FROM ai_providers ORDER BY priority");
  return rows.map((r) => ({
    id: r.id, model: r.model || "", enabled: !!r.enabled, priority: r.priority,
    freeTier: !!r.free_tier, dailyLimit: r.daily_limit, requestsUsed: r.requests_used, lastError: r.last_error || undefined
  }));
}

export function recordAIRequest(userId: string | null, mode: string, responses: { provider: string; model: string; answer: string; responseTimeMs: number; status: string; error?: string }[], finalAnswer: string) {
  const reqId = randId();
  run("INSERT INTO ai_requests(id,user_id,mode) VALUES(?,?,?)", reqId, userId || "anonymous", mode);
  const ins = getDb().prepare("INSERT INTO ai_responses(id,request_id,provider,model,answer,response_time_ms,status,error) VALUES(?,?,?,?,?,?,?,?)");
  for (const r of responses) ins.run(randId(), reqId, r.provider, r.model, r.answer.slice(0, 8000) || "", Math.round(r.responseTimeMs), r.status, r.error || null);
  run("INSERT INTO synthesized_answers(id,request_id,final_answer) VALUES(?,?,?)", randId(), reqId, finalAnswer.slice(0, 16000));
  return reqId;
}

export function bumpProviderUsage(providerId: string, ok: boolean, lastError?: string) {
  getDb().prepare("UPDATE ai_providers SET requests_used = requests_used + CASE WHEN ? THEN 1 ELSE 0 END, last_error=? WHERE id=?")
    .run(ok ? 1 : 0, lastError || null, providerId);
}

export function chatStats(userId: string) {
  const n = scalar<{ n: number }>("SELECT COUNT(*) n FROM ai_requests WHERE user_id=?", userId)?.n || 0;
  const time = scalar<{ t: number }>("SELECT SUM(study_time_min) t FROM study_progress WHERE user_id=?", userId)?.t || 0;
  const avg = scalar<{ a: number }>("SELECT AVG(score) a FROM quiz_attempts WHERE user_id=?", userId)?.a;
  const streak = (() => {
    const days = new Set<string>();
    for (const r of all<{ created_at: string }>("SELECT created_at FROM quiz_attempts WHERE user_id=?", userId))
      days.add(r.created_at.slice(0, 10));
    let s = 0; const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  })();
  return { questions: n, studyTime: time, avgScore: avg ? Math.round(avg) : null, streak };
}