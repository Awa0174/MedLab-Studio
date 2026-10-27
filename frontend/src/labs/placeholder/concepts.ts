/**
 * Concept notes for laboratories that are not implemented yet. They describe what the lab
 * will model, which questions it answers and what it will reuse from the platform.
 */
export interface LabConcept {
  goal: string;
  questions: string[];
  models: string[];
  reuses: string[];
  firstMilestone: string[];
}

export const LAB_CONCEPTS: Record<string, LabConcept> = {
  imaging: {
    goal: "A medical image viewer with classic filters and transparent segmentation algorithms on synthetic and public datasets.",
    questions: [
      "How do smoothing, sharpening and edge filters change an image, and what is lost?",
      "How do threshold, region-growing and watershed segmentation compare on the same image?",
      "How is segmentation quality measured (Dice, IoU) against a reference mask?",
    ],
    models: [
      "Gaussian/median/bilateral filters",
      "Otsu threshold, region growing, watershed",
      "Dice and IoU metrics",
    ],
    reuses: [
      "Experiment model with parameters and seeds",
      "Validation checks",
      "Chart and panel components",
    ],
    firstMilestone: [
      "Load PNG/TIFF images",
      "Window/level and zoom",
      "Threshold segmentation with Dice score",
    ],
  },
  "digital-twin": {
    goal: "A simplified electrical model of cardiac tissue: excitation spreads over a 2D grid of coupled cells.",
    questions: [
      "How does conduction velocity depend on coupling and excitability?",
      "What causes re-entry in a 2D sheet?",
      "How does a pacing site change the activation map?",
    ],
    models: [
      "Aliev–Panfilov two-variable model",
      "Finite-difference diffusion on a grid",
      "Activation-time maps",
    ],
    reuses: ["Seeded simulations", "Time-series charts from the ECG lab", "Experiment persistence"],
    firstMilestone: [
      "2D Aliev–Panfilov simulation",
      "Playback with activation map",
      "Pseudo-ECG from the sheet",
    ],
  },
  wearable: {
    goal: "Import or simulate accelerometer and pulse data and inspect it on live dashboards.",
    questions: [
      "How are steps and activity classes derived from acceleration?",
      "How do motion artefacts corrupt a pulse signal?",
      "Which sampling rates are sufficient for which features?",
    ],
    models: ["Synthetic gait acceleration", "PPG-like pulse signal", "Motion artefact injection"],
    reuses: [
      "ECG filters and R-peak detector",
      "Noise models",
      "Signal charts with cursor measurement",
    ],
    firstMilestone: [
      "CSV import with unit metadata",
      "Three-axis time-series dashboard",
      "Step counter with validation",
    ],
  },
  pharmacokinetics: {
    goal: "Simulate drug concentration over time with compartment models and explore dosing regimens.",
    questions: [
      "How do half-life, clearance and volume of distribution shape the curve?",
      "When does a repeated dose reach steady state?",
      "How sensitive is the peak concentration to each parameter?",
    ],
    models: [
      "One-compartment IV bolus and oral absorption",
      "Two-compartment model",
      "Superposition for repeated dosing",
    ],
    reuses: [
      "Experiment model",
      "Parameter sensitivity tooling",
      "Validation against closed-form solutions",
    ],
    firstMilestone: [
      "One-compartment model with analytic check",
      "Multiple dosing",
      "Sensitivity sweep",
    ],
  },
  surgical: {
    goal: "Interactive training scenarios for surgical process steps and instrument recognition.",
    questions: [
      "Which step sequences are valid for a procedure?",
      "How quickly and how reliably are instruments recognised?",
      "How are process deviations detected and reported?",
    ],
    models: ["Process graph of surgical phases", "Scenario scripting", "3D instrument scenes"],
    reuses: ["Reaction-time statistics", "HMI error logging", "Experiment persistence"],
    firstMilestone: [
      "Phase model for one procedure",
      "Step checklist scenario",
      "Timing and error capture",
    ],
  },
  microscopy: {
    goal: "Detect, segment and count cells in microscopy images and compare classical with learned methods.",
    questions: [
      "How does a threshold-based method compare with a trained model?",
      "Where do the models fail, and why?",
      "How are precision, recall and F1 computed for object detection?",
    ],
    models: [
      "Blob detection (LoG/DoG)",
      "Watershed instance segmentation",
      "Small U-Net with documented train/val/test split",
    ],
    reuses: [
      "Imaging viewer and filters",
      "Metrics and validation checks",
      "Experiment comparison",
    ],
    firstMilestone: [
      "Synthetic cell images with ground truth",
      "Blob detection with counts",
      "Precision/recall report",
    ],
  },
  regulatory: {
    goal: "Structure regulatory requirements for software as a medical device and trace them to evidence.",
    questions: [
      "Which MDR, IEC 62304 and ISO 14971 requirements apply to a given software class?",
      "How does a requirement trace to design, tests and risk controls?",
      "What is missing before a submission?",
    ],
    models: ["Requirements matrix", "Source register", "Traceability graph"],
    reuses: ["Experiment metadata as evidence", "Validation checks as test evidence"],
    firstMilestone: ["Requirement catalogue", "Source links", "Coverage view"],
  },
  "reaction-time": {
    goal: "Run reaction-time experiments in the browser and analyse latencies honestly, including timing limits.",
    questions: [
      "What is the distribution of simple and choice reaction times?",
      "How large is the browser's own timing uncertainty?",
      "Which statistics describe the spread and outliers correctly?",
    ],
    models: [
      "Simple and choice reaction tasks",
      "performance.now() timing with display-refresh uncertainty",
      "Robust statistics",
    ],
    reuses: ["Experiment model", "Statistics shared with the HMI lab"],
    firstMilestone: ["Simple reaction task", "Latency distribution chart", "Uncertainty statement"],
  },
  hmi: {
    goal: "Compare two variants of a medical user interface and measure errors, speed and cognitive load.",
    questions: [
      "Which layout leads to fewer operating errors?",
      "How does task time differ between variants?",
      "How is subjective load (e.g. NASA-TLX) captured and compared?",
    ],
    models: ["Task scripts with expected actions", "Error taxonomy", "A/B comparison statistics"],
    reuses: ["Reaction-time statistics", "Experiment comparison", "Design system components"],
    firstMilestone: [
      "Two interface variants",
      "Task runner with error capture",
      "Comparison report",
    ],
  },
};
