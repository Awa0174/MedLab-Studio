import { useState } from "react";
import type { ExperimentDetail, LabType } from "@/api/client";
import { useCreateExperiment } from "@/api/hooks";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/fields";

/**
 * Generic "save as experiment" dialog. `config` is the lab-specific request body that
 * the backend re-runs on load or rerun; the caller decides what happens after saving.
 */
export function SaveExperimentDialog({
  open,
  onOpenChange,
  labType,
  config,
  summary,
  defaultName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labType: LabType;
  config: Record<string, unknown>;
  summary: string;
  defaultName: string;
  onSaved: (created: ExperimentDetail) => void;
}) {
  const create = useCreateExperiment();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    const trimmed =
      name.trim() || `${defaultName} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const created = await create.mutateAsync({
      name: trimmed,
      lab_type: labType,
      description,
      config,
    });
    onOpenChange(false);
    setName("");
    setDescription("");
    onSaved(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Save experiment"
        description={`Stores the configuration, data, seed, model version and results locally. ${summary}.`}
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
          placeholder={defaultName}
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
