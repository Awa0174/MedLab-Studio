import { ExplainSections } from "@/components/ExplainSections";
import { ECG_EXPLAIN } from "@/labs/ecg/explain";

export function ExplainPanel() {
  return <ExplainSections sections={ECG_EXPLAIN} />;
}
