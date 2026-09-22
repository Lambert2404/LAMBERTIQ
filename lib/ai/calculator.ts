// Deterministic engineering calculation layer — never rely solely on LLM arithmetic.
export interface CalculationResult {
  given: string; formula: string; substitution: string;
  calculation: string; units: string; finalAnswer: string; explanation: string;
}

export function hydraulicRetentionTime(volume_m3: number, flow_m3_per_day: number): CalculationResult {
  if (flow_m3_per_day <= 0) throw new Error("Flow must be > 0");
  const hrt_days = volume_m3 / flow_m3_per_day;
  const hrt_hours = hrt_days * 24;
  return {
    given: `Volume V = ${volume_m3} m³, Flow Q = ${flow_m3_per_day} m³/day`,
    formula: "HRT = V / Q",
    substitution: `HRT = ${volume_m3} / ${flow_m3_per_day}`,
    calculation: `HRT = ${hrt_days.toFixed(3)} days = ${hrt_hours.toFixed(2)} hours`,
    units: "days (or hours)",
    finalAnswer: `HRT = ${hrt_days.toFixed(3)} days (${hrt_hours.toFixed(2)} h)`,
    explanation: "Hydraulic retention time is the average time water stays in the reactor. Longer HRT generally improves treatment but needs bigger tanks."
  };
}

export function organicLoadingRate(flow_m3_day: number, bod_mg_L: number, volume_m3: number): CalculationResult {
  const bod_kg_m3 = bod_mg_L / 1000;
  const load = (flow_m3_day * bod_kg_m3) / volume_m3;
  return {
    given: `Q = ${flow_m3_day} m³/day, BOD = ${bod_mg_L} mg/L, V = ${volume_m3} m³`,
    formula: "OLR = (Q × S₀) / V",
    substitution: `OLR = (${flow_m3_day} × ${bod_kg_m3}) / ${volume_m3}`,
    calculation: `OLR = ${load.toFixed(3)} kg BOD/m³·day`,
    units: "kg BOD/m³·day",
    finalAnswer: `OLR = ${load.toFixed(3)} kg BOD/m³·day`,
    explanation: "Organic loading rate measures food supplied per reactor volume. Typical activated sludge: 0.3–1.0 kg BOD/m³·day."
  };
}

export function flowConversion(value: number, from: "L/s" | "m3/day" | "m3/s", to: "L/s" | "m3/day" | "m3/s"): CalculationResult {
  const toM3s = from === "m3/s" ? value : from === "L/s" ? value / 1000 : value / 86400;
  const out = to === "m3/s" ? toM3s : to === "L/s" ? toM3s * 1000 : toM3s * 86400;
  return {
    given: `${value} ${from}`,
    formula: "m³/s base → target unit",
    substitution: `${value} ${from} = ${toM3s} m³/s`,
    calculation: `= ${out.toFixed(4)} ${to}`,
    units: to,
    finalAnswer: `${value} ${from} = ${out.toFixed(4)} ${to}`,
    explanation: "Flow conversions use 1 m³/s = 1000 L/s = 86400 m³/day."
  };
}
