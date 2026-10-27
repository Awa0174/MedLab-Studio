import { useState } from "react";
import { useNavigate } from "react-router";
import type { EcgSimulationRequest } from "@/api/client";
import { useCreateExperiment } from "@/api/hooks";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/fields";
import { useEcgStore } from "@/labs/ecg/store";

export function SaveExperimentDialog({
  open,
  onOpenChange,
  config,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: EcgSimulationRequest;
  summary: string;
}) {
  const navigate = useNavigate();
  const create = useCreateExperiment();
  const loadExperiment = useEcgStore((s) => s.loadExperiment);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    const trimmed = name.trim() || `ECG ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const created = await create.mutateAsync({
      name: trimmed,
      lab_type: "ecg",
      description,
      config,
    });
    loadExperiment({ id: created.id, name: created.name, resultHash: created.result_hash }, config);
    onOpenChange(false);
    setName("");
    setDescription("");
    navigate(`/labs/ecg?experiment=${created.id}`, { replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Save experiment"
        description={`Stores the current configuration, seed, model version and results locally. ${summary}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={create.isPending}
              data-testid="save-experiment-confirm"
            >
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="e.g. 72 bpm, mains hum, notch + band-pass"
          autoFocus
        />
        <TextField
          label="Description"
          value={description}
          onChange={setDescription}
          multiline
          placeholder="Hypothesis, observations, notes"
        />
        {create.error ? <p className="text-danger text-xs">{create.error.message}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
