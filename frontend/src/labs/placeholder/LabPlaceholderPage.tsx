import { Link, useParams } from "react-router";
import { getLab, PHASE_LABELS } from "@/labs/registry";
import { LAB_CONCEPTS } from "@/labs/placeholder/concepts";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function LabPlaceholderPage() {
  const { labId } = useParams();
  const lab = getLab(labId);
  if (!lab) return <NotFoundPage />;
  const concept = LAB_CONCEPTS[lab.id];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-faint font-mono text-xs">
            {String(lab.number).padStart(2, "0")}
          </span>
          <Badge tone="neutral">planned</Badge>
          <Badge tone="accent">{PHASE_LABELS[lab.phase] ?? `Phase ${lab.phase}`}</Badge>
        </div>
        <h1 className="text-fg-strong text-2xl font-semibold tracking-tight">{lab.name}</h1>
        <p className="text-muted mt-1 text-sm">{lab.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lab.domains.map((d) => (
            <span key={d} className="text-faint bg-surface-2 rounded px-1.5 py-0.5 text-[11px]">
              {d}
            </span>
          ))}
        </div>
      </div>

      {concept ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="md:col-span-2">
            <PanelHeader title="Concept" />
            <PanelBody className="text-sm">{concept.goal}</PanelBody>
          </Panel>
          <ConceptList title="Research questions" items={concept.questions} />
          <ConceptList title="Models and methods" items={concept.models} />
          <ConceptList title="Reuses from the platform" items={concept.reuses} />
          <ConceptList title="First milestone" items={concept.firstMilestone} />
        </div>
      ) : null}

      <p className="text-faint mt-6 text-xs">
        This laboratory is a placeholder. The{" "}
        <Link to="/labs/ecg" className="text-accent underline">
          ECG Signal Lab
        </Link>{" "}
        is the first fully usable module.
      </p>
    </div>
  );
}

function ConceptList({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <PanelBody>
        <ul className="text-fg list-disc space-y-1 pl-4 text-sm">
          {items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      </PanelBody>
    </Panel>
  );
}
