import { useState } from "react";
import type { TlxRating } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { SliderField } from "@/components/ui/fields";
import { DEFAULT_TLX, TLX_SCALES, VARIANT_INFO } from "@/labs/hmi/defaults";

export function TlxForm({
  variant,
  onDone,
}: {
  variant: "A" | "B";
  onDone: (rating: TlxRating) => void;
}) {
  const [rating, setRating] = useState<TlxRating>({ ...DEFAULT_TLX });
  return (
    <div className="mx-auto w-full max-w-md">
      <h3 className="text-fg-strong text-sm font-semibold">
        Rate the workload of {VARIANT_INFO[variant].name}
      </h3>
      <p className="text-muted mb-3 text-xs">
        NASA-TLX style, each scale from 0 to 100. Answer for the block you just finished.
      </p>
      <div className="flex flex-col gap-3">
        {TLX_SCALES.map((s) => (
          <SliderField
            key={s.key}
            label={s.label}
            unit={`${s.low} → ${s.high}`}
            value={rating[s.key]}
            min={0}
            max={100}
            step={5}
            onChange={(v) => setRating((r) => ({ ...r, [s.key]: v }))}
          />
        ))}
      </div>
      <Button
        variant="primary"
        className="mt-4 w-full"
        onClick={() => onDone(rating)}
        data-testid="tlx-done"
      >
        Continue
      </Button>
    </div>
  );
}
