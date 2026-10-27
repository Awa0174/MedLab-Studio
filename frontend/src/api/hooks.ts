import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  ExperimentCreate,
  HmiDataset,
  LabType,
  ReactionDataset,
  ReactionSimulationRequest,
} from "@/api/client";

export const queryKeys = {
  health: ["health"] as const,
  labs: ["labs"] as const,
  experiments: (labType?: LabType) => ["experiments", labType ?? "all"] as const,
  experiment: (id: string) => ["experiment", id] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    refetchInterval: 15_000,
    retry: 0,
  });
}

export function useExperiments(labType?: LabType) {
  return useQuery({
    queryKey: queryKeys.experiments(labType),
    queryFn: () => api.experiments.list(labType),
  });
}

export function useExperiment(id: string | null) {
  return useQuery({
    queryKey: queryKeys.experiment(id ?? ""),
    queryFn: () => api.experiments.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExperimentCreate) => api.experiments.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] }),
  });
}

export function useDeleteExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.experiments.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] }),
  });
}

export function useRerunExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.experiments.rerun(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ["experiments"] });
      void qc.invalidateQueries({ queryKey: queryKeys.experiment(id) });
    },
  });
}

export function useSimulateReaction() {
  return useMutation({
    mutationFn: (body: ReactionSimulationRequest) => api.reaction.simulate(body),
  });
}

export function useAnalyzeReaction() {
  return useMutation({ mutationFn: (body: ReactionDataset) => api.reaction.analyze(body) });
}

export function useHmiTasks(seed: number, n: number) {
  return useQuery({ queryKey: ["hmi", "tasks", seed, n], queryFn: () => api.hmi.tasks(seed, n) });
}

export function useAnalyzeHmi() {
  return useMutation({ mutationFn: (body: HmiDataset) => api.hmi.analyze(body) });
}
