/**
 * Thin typed client over the backend. Types are generated from the FastAPI OpenAPI
 * document (see `npm run gen:api`), so request and response shapes have one source.
 */
import type { components, paths } from "@/api/schema";

export type Schemas = components["schemas"];
export type LabInfo = Schemas["LabInfo"];
export type HealthResponse = Schemas["HealthResponse"];
export type EcgSimulationRequest = Schemas["EcgSimulationRequest"];
export type EcgSimulationResponse = Schemas["EcgSimulationResponse"];
export type FilterStage =
  Schemas["BandpassFilter"] | Schemas["NotchFilter"] | Schemas["MovingAverageFilter"];
export type ExperimentCreate = Schemas["ExperimentCreate"];
export type ExperimentSummary = Schemas["ExperimentSummary"];
export type ExperimentDetail = Schemas["ExperimentDetail"];
export type RerunResult = Schemas["RerunResult"];
export type ValidationCheck = Schemas["ValidationCheck"];
export type Parameter = Schemas["Parameter"];
export type LabType = Schemas["LabType"];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    throw new ApiError(0, "Backend unreachable. Is the API running on 127.0.0.1:8000?", err);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    throw new ApiError(
      res.status,
      formatDetail(detail) ?? `${res.status} ${res.statusText}`,
      detail,
    );
  }
  return body as T;
}

function formatDetail(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc.slice(1).join(".") : "";
        return loc ? `${loc}: ${d.msg}` : String(d?.msg ?? "");
      })
      .join("; ");
  }
  return undefined;
}

type SimulatePath = paths["/api/labs/ecg/simulate"]["post"];
export type SimulateBody = SimulatePath["requestBody"]["content"]["application/json"];

export const api = {
  health: () => request<HealthResponse>("/health"),
  labs: () => request<LabInfo[]>("/labs"),
  ecg: {
    simulate: (body: SimulateBody) =>
      request<EcgSimulationResponse>("/labs/ecg/simulate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  experiments: {
    list: (labType?: LabType) =>
      request<ExperimentSummary[]>(`/experiments${labType ? `?lab_type=${labType}` : ""}`),
    get: (id: string) => request<ExperimentDetail>(`/experiments/${id}`),
    create: (body: ExperimentCreate) =>
      request<ExperimentDetail>("/experiments", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/experiments/${id}`, { method: "DELETE" }),
    rerun: (id: string) => request<RerunResult>(`/experiments/${id}/rerun`, { method: "POST" }),
  },
};
