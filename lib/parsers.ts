// Server-side document text extraction: PDF / DOCX / PPTX / TXT. No client keys or binaries exposed.

export async function extractText(filename: string, buffer: Buffer): Promise<{ parser: string; text: string }> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return { parser: "pdf-parse", text: await parsePdf(buffer).catch((e) => `[PDF parse failed: ${e.message}]`) };
  if (ext === "docx") return { parser: "mammoth", text: await parseDocx(buffer).catch((e) => `[DOCX parse failed: ${e.message}]`) };
  if (ext === "pptx") return { parser: "jszip-pptx", text: await parsePptx(buffer).catch((e) => `[PPTX parse failed: ${e.message}]`) };
  if (["txt", "md", "csv"].includes(ext)) return { parser: "text", text: buffer.toString("utf8") };
  throw new Error("Unsupported file type. Use PDF, DOCX, PPTX or TXT.");
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const mod = (await import("pdf-parse")) as any;
  const PDFParse = mod?.PDFParse ?? mod?.default?.PDFParse;
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result?.text || "") as string;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value || "";
}

async function parsePptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default as any;
  const zip = await JSZip.loadAsync(buffer);
  const slides: string[] = [];
  const files = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => {
    const na = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
    const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
    return na - nb;
  });
  for (const f of files) {
    const xml = await zip.files[f].async("text");
    slides.push(extractXmlText(xml));
  }
  return slides.filter(Boolean).join("\n\n");
}

function extractXmlText(xml: string): string {
  const texts: string[] = [];
  for (const m of xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)) texts.push(m[1]);
  return texts.join(" ").trim();
}

// Chunking with overlap for retrieval windowing.
export function chunkText(text: string, size = 1800, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

// Keyword-overlap retrieval (BM25-lite). Deterministic, free, offline-capable.
export function retrieveChunks(
  chunks: { id: string; text: string }[],
  query: string,
  k = 3
): { id: string; text: string; score: number }[] {
  const qTokens = query.toLowerCase().split(/[^a-z0-9+]+/).filter((t) => t.length > 2);
  const scored = chunks.map((c, idx) => {
    const tokens = c.text.toLowerCase().split(/[^a-z0-9+]+/);
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
    let score = 0;
    for (const t of qTokens) score += (counts.get(t) || 0) / Math.log(2 + tokens.length); // tf-normalized
    score += 0.001 / (1 + idx); // slight position bonus (intros may matter)
    return { id: c.id, text: c.text, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k).filter((s) => s.score > 0);
}