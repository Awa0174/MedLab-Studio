import type { ExplainSection } from "@/components/ExplainSections";

export const RT_EXPLAIN: ExplainSection[] = [
  {
    title: "What is measured",
    paragraphs: [
      "Simple reaction time: press Space as soon as the panel lights up. Choice reaction time: press the arrow key matching the side of the stimulus. Each trial has a random foreperiod drawn uniformly between the configured minimum and maximum so the onset cannot be predicted.",
      "This is a measurement of the local user in this browser, not a simulation. The synthetic option generates ex-Gaussian data for comparison and testing.",
    ],
  },
  {
    title: "How time is taken",
    paragraphs: [
      "The stimulus element is switched on and the onset is stamped with performance.now() inside the requestAnimationFrame callback that precedes the frame showing it. The response is stamped in the keydown event. Reaction time is the difference.",
      "Before the block starts, the frame interval is measured over 40 animation frames and the timer resolution from the smallest positive step of performance.now(). Both enter the uncertainty budget.",
    ],
  },
  {
    title: "Validity rules",
    bullets: [
      "Anticipation: a response before the stimulus, or faster than the anticipation threshold (default 100 ms), is a guess and is excluded.",
      "Timeout: no response within the timeout is recorded as missing.",
      "Choice error: the wrong arrow key is recorded and excluded from the timing statistics.",
      "Outliers among valid trials are flagged with Tukey fences (1.5 × IQR) and reported both ways, never silently dropped.",
    ],
    paragraphs: [],
  },
  {
    title: "Statistics",
    bullets: [
      "Median and MAD are the primary descriptors because reaction times are right-skewed.",
      "Mean, SD and a t-based 95 % confidence interval of the mean are reported for comparison.",
      "The 95 % interval of the median comes from a seeded percentile bootstrap (2000 resamples).",
      "A linear trend over trial index exposes practice (negative slope) or fatigue (positive slope).",
      "Histogram bins follow the Freedman–Diaconis rule, rounded to a readable width.",
    ],
    paragraphs: [],
  },
  {
    title: "Uncertainty budget",
    paragraphs: [
      "Stimulus onset is quantised to the display refresh: uniform within one frame, standard uncertainty frame / √12 (≈ 4.8 ms at 60 Hz). Timer coarsening adds resolution / √12. Keyboard and OS input latency add a positive bias of a few milliseconds; display latency adds an unknown bias of roughly 5 to 30 ms.",
      "Consequence: absolute values are biased upward by an unknown amount, but differences between conditions measured on the same setup are much more reliable. The validation check compares the combined uncertainty with the between-trial spread.",
    ],
  },
  {
    title: "Limits",
    bullets: [
      "One participant, no control of arousal, attention or hand used; results describe this session only.",
      "Browser throttling in background tabs or a busy machine inflates reaction times.",
      "No photodiode verification of the display; the budget assumes a typical monitor.",
      "Not a clinical test of alertness or cognitive function.",
    ],
    paragraphs: [],
  },
  {
    title: "Verification",
    bullets: [
      "Descriptive statistics checked against hand-computed values for 1…10 (pytest).",
      "Ex-Gaussian simulation recovers mean ≈ μ + τ; a −1 ms/trial practice slope is recovered with p < 0.001.",
      "Anticipations, timeouts, choice errors and a 1.5 s outlier are counted correctly on a constructed dataset.",
      "Uncertainty components equal frame/√12 and resolution/√12 for given timing inputs.",
      "Same dataset twice yields the same result hash.",
    ],
    paragraphs: [],
  },
  {
    title: "Sources",
    bullets: [
      "Luce R.D. (1986). Response Times: Their Role in Inferring Elementary Mental Organization. Oxford University Press.",
      "Ratcliff R. (1993). Methods for dealing with reaction time outliers. Psychological Bulletin 114(3):510–532.",
      "Whelan R. (2008). Effective analysis of reaction time data. The Psychological Record 58:475–482.",
      "Bridges D., Pitiot A., MacAskill M.R., Peirce J.W. (2020). The timing mega-study: comparing a range of experiment generators, both lab-based and online. PeerJ 8:e9414.",
      "JCGM 100:2008 (GUM). Evaluation of measurement data – Guide to the expression of uncertainty in measurement.",
    ],
    paragraphs: [],
  },
];
