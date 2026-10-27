import labsJson from "@shared/labs.json";

export type LabStatus = "available" | "planned";

export interface LabInfo {
  id: string;
  number: number;
  name: string;
  tagline: string;
  description: string;
  domains: string[];
  status: LabStatus;
  phase: number;
}

export const LABS: LabInfo[] = (labsJson as { labs: LabInfo[] }).labs;

export function getLab(id: string | undefined): LabInfo | undefined {
  return LABS.find((lab) => lab.id === id);
}

export function labPath(lab: Pick<LabInfo, "id">): string {
  return `/labs/${lab.id}`;
}

export const PHASE_LABELS: Record<number, string> = {
  0: "Phase 0 · Platform foundation",
  1: "Phase 1 · ECG Signal Lab",
  2: "Phase 2 · Reaction Time & HMI",
  3: "Phase 3 · Sensors & Pharmacokinetics",
  4: "Phase 4 · Imaging & Microscopy",
  5: "Phase 5 · Advanced labs",
};
