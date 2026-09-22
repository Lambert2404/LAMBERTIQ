import { NextRequest, NextResponse } from "next/server";
import { hydraulicRetentionTime, organicLoadingRate, flowConversion } from "@/lib/ai/calculator";

// Deterministic engineering solver API: /api/calc?type=hrt&v=500&q=1000
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  try {
    const type = p.get("type");
    if (type === "hrt") {
      const v = Number(p.get("v")); const q = Number(p.get("q"));
      return NextResponse.json(hydraulicRetentionTime(v, q));
    }
    if (type === "olr") {
      const q = Number(p.get("q")); const bod = Number(p.get("bod")); const v = Number(p.get("v"));
      return NextResponse.json(organicLoadingRate(q, bod, v));
    }
    if (type === "flow") {
      const val = Number(p.get("value"));
      const from = (p.get("from") || "L/s") as any; const to = (p.get("to") || "m3/day") as any;
      return NextResponse.json(flowConversion(val, from, to));
    }
    return NextResponse.json({ error: "Unknown type. Use hrt | olr | flow." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
