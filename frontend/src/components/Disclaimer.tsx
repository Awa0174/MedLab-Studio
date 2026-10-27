export const DISCLAIMER_SHORT =
  "Educational and research tool. Not a medical device. No diagnosis, no treatment decisions. Synthetic data.";

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="bg-warn/10 text-warn border-warn/30 flex items-center gap-2 border-b px-4 py-1.5 text-[11px] font-medium tracking-wide"
    >
      <span aria-hidden>⚠</span>
      <span>{DISCLAIMER_SHORT}</span>
    </div>
  );
}
