import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ThemeProvider } from "@/app/theme";
import { AppShell } from "@/app/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LabPlaceholderPage } from "@/labs/placeholder/LabPlaceholderPage";

// Lab pages pull in ECharts; load them on demand so the dashboard stays light.
const EcgLabPage = lazy(() =>
  import("@/labs/ecg/EcgLabPage").then((m) => ({ default: m.EcgLabPage })),
);
const ReactionTimeLabPage = lazy(() =>
  import("@/labs/reaction-time/ReactionTimeLabPage").then((m) => ({
    default: m.ReactionTimeLabPage,
  })),
);
const HmiLabPage = lazy(() =>
  import("@/labs/hmi/HmiLabPage").then((m) => ({ default: m.HmiLabPage })),
);
const ExperimentsPage = lazy(() =>
  import("@/experiments/ExperimentsPage").then((m) => ({ default: m.ExperimentsPage })),
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } },
});

function Loading() {
  return <div className="text-muted p-6 text-sm">Loading…</div>;
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={250}>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="labs/ecg" element={<EcgLabPage />} />
                  <Route path="labs/reaction-time" element={<ReactionTimeLabPage />} />
                  <Route path="labs/hmi" element={<HmiLabPage />} />
                  <Route path="labs/:labId" element={<LabPlaceholderPage />} />
                  <Route path="experiments" element={<ExperimentsPage />} />
                  <Route path="overview" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
