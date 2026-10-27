import type { ExplainSection } from "@/components/ExplainSections";

export const HMI_EXPLAIN: ExplainSection[] = [
  {
    title: "What is compared",
    paragraphs: [
      "Two interface variants of an infusion-pump settings screen solve the same seeded task set: set an infusion rate, a volume to be infused, a bolus dose, and acknowledge a named alarm. Variant A is a classic form with free-text entry and sticky unit selectors; Variant B is a guarded single-field entry with a keypad, visible range and explicit confirmation.",
      "Measured per task: completion time, number of interactions, the submitted field, value and unit, and the classified operating errors. After each variant block a NASA-TLX style rating captures subjective load.",
    ],
  },
  {
    title: "Error taxonomy",
    bullets: [
      "wrong_field: the value went into a different field than instructed.",
      "unit_error: the unit differs from the instruction; a value that is correct in the other unit is flagged as exactly that.",
      "decimal_error: the value is the target times 10, 100, 0.1 or 0.01 (misplaced or dropped decimal point).",
      "out_of_range: outside the allowed range of the field.",
      "premature_confirm: confirmed without a value or alarm.",
      "wrong_alarm: a different alarm was acknowledged.",
      "timeout: no submission within the allowed time.",
      "wrong_value: any other mismatch beyond the tolerance.",
    ],
    paragraphs: [
      "Classification runs in the backend with the same rules for both variants, so the comparison does not depend on the interface's own feedback.",
    ],
  },
  {
    title: "Why Variant A produces errors",
    bullets: [
      "A comma typed as a decimal separator is dropped: 12,5 becomes 125 (decimal error).",
      "Unit selectors keep their previous setting, so a rate can be applied in mL/min without noticing (unit error).",
      "Three fields on one screen invite entry into the wrong row (wrong field).",
      "Alarm buttons are numbered with the alarm name in small print (wrong alarm).",
      "Apply works with an empty form (premature confirm).",
    ],
    paragraphs: [],
  },
  {
    title: "Statistics",
    bullets: [
      "Task times: median and MAD per variant; Welch t-test and Mann-Whitney U for the difference; Cohen's d and Cliff's delta as effect sizes; bootstrap CI of the median difference.",
      "Error and success rates: Fisher's exact test on tasks with at least one error.",
      "TLX overall is the unweighted mean of the six scales.",
    ],
    paragraphs: [],
  },
  {
    title: "Limits",
    bullets: [
      "One participant and one variant order: learning and order effects are confounded with the variant. Repeat with the opposite order (BA) to counterbalance.",
      "Tasks are short and artificial; real device use involves interruptions, gloves, alarms under stress and far more training.",
      "Timing starts when the task is shown and ends at submission; reading the instruction is included.",
      "The p-values describe this session only and are not evidence about users in general.",
    ],
    paragraphs: [],
  },
  {
    title: "Verification",
    bullets: [
      "Error classification is unit-tested for decimal, unit, wrong-field, out-of-range, premature, timeout and alarm cases.",
      "A constructed dataset with a slower, error-prone Variant A yields the expected summaries and a large median difference.",
      "Task catalogue and schedule are reproducible from the seed.",
      "Experiment rerun reproduces the identical result hash.",
    ],
    paragraphs: [],
  },
  {
    title: "Sources",
    bullets: [
      "Hart S.G., Staveland L.E. (1988). Development of NASA-TLX: results of empirical and theoretical research. Advances in Psychology 52:139–183.",
      "IEC 62366-1:2015. Medical devices – Application of usability engineering to medical devices.",
      "ISMP (2009). Proceedings from the ISMP summit on the use of smart infusion pumps.",
      "Nielsen J. (1994). Usability Engineering. Morgan Kaufmann.",
      "Reason J. (1990). Human Error. Cambridge University Press.",
    ],
    paragraphs: [],
  },
];
