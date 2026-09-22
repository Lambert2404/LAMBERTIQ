export const DEPARTMENTS = [
  "Environmental Engineering", "Computer Science", "Information Technology",
  "Software Engineering", "Civil Engineering", "Electrical Engineering",
  "Mechanical Engineering", "Business", "Accounting", "Economics",
  "Mathematics", "Statistics"
];

export const ENV_ENGINEERING_SUBJECTS: { group: string; subjects: string[] }[] = [
  { group: "Core Environmental Engineering", subjects: ["Principles of Environmental Engineering", "Environmental Chemistry", "Environmental Biology", "Environmental Microbiology", "Environmental Engineering Mathematics", "Environmental Engineering Hydraulics", "Fluid Mechanics", "Environmental Engineering Laboratory", "Environmental Engineering Design", "Environmental Health", "Environmental Risk Assessment"] },
  { group: "Water", subjects: ["Water Supply Engineering", "Drinking Water Treatment", "Water Quality", "Water Treatment Plant Design", "Water Distribution Systems", "Hydrology", "Surface Water Pollution", "Groundwater", "Water Quality Modelling"] },
  { group: "Wastewater", subjects: ["Wastewater Engineering", "Wastewater Collection Systems", "Domestic Wastewater Treatment", "Industrial Wastewater Treatment", "Biological Treatment", "Physical-Chemical Treatment", "Sludge Treatment", "Sludge Disposal", "Wastewater Treatment Plant Design"] },
  { group: "Air Pollution", subjects: ["Air Pollution", "Air Quality", "Atmospheric Pollution", "Emission Sources", "Air Pollution Control", "Atmospheric Dispersion", "Indoor Air Quality", "Air Quality Monitoring"] },
  { group: "Solid & Hazardous Waste", subjects: ["Solid Waste Management", "Integrated Solid Waste Management", "Municipal Waste", "Industrial Waste", "Hazardous Waste", "Medical Waste", "Recycling", "Composting", "Landfill Design", "Waste-to-Energy"] },
  { group: "Soil & Groundwater", subjects: ["Soil Pollution", "Groundwater Pollution", "Contaminant Transport", "Site Remediation", "Soil and Groundwater Monitoring", "Environmental Geology"] },
  { group: "Environmental Management", subjects: ["Environmental Impact Assessment (EIA)", "Environmental Auditing", "Environmental Management Systems", "ISO 14001", "Environmental Policy", "Environmental Law", "Occupational Health and Safety", "Environmental Risk Management", "Climate Change", "Sustainability", "Environmental Management"] },
  { group: "Engineering Mathematics & Science", subjects: ["Calculus", "Differential Equations", "Statistics", "Probability", "Physics", "Chemistry", "Biology", "Numerical Methods", "Engineering Mathematics"] }
];

// Smart recommendations: weak topic -> related topics
export const RECOMMENDATION_MAP: Record<string, string[]> = {
  "Water Treatment": ["Water Quality", "Coagulation", "Flocculation", "Sedimentation", "Filtration", "Disinfection"],
  "Wastewater Engineering": ["Activated Sludge", "Biological Treatment", "Sludge Treatment", "Hydraulics"],
  "Air Pollution Control": ["Atmospheric Dispersion", "Emission Sources", "Air Quality Monitoring"]
};

export function recommendFor(weakTopic: string): string[] {
  return RECOMMENDATION_MAP[weakTopic] || ["Revision Mode", "Quiz Mode", "Ask Tutor"];
}
