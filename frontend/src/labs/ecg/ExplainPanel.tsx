import { CollapsibleSection } from "@/components/ui/Collapsible";
import { ECG_EXPLAIN } from "@/labs/ecg/explain";

export function ExplainPanel() {
  return (
    <div className="flex flex-col">
      {ECG_EXPLAIN.map((section, i) => (
        <CollapsibleSection key={section.title} title={section.title} defaultOpen={i === 0}>
          {section.paragraphs.map((p) => (
            <p key={p} className="mb-2 last:mb-0">
              {p}
            </p>
          ))}
          {section.bullets ? (
            <ul className="list-disc space-y-1 pl-4">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </CollapsibleSection>
      ))}
    </div>
  );
}
