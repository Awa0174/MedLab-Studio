import { Outlet } from "react-router";
import { Sidebar } from "@/app/layout/Sidebar";
import { Header } from "@/app/layout/Header";
import { DisclaimerBanner } from "@/components/Disclaimer";

export function AppShell() {
  return (
    <div className="bg-bg text-fg flex h-full min-h-0">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <DisclaimerBanner />
        <main className="min-h-0 flex-1 overflow-auto" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
