import { Link, useLocation } from "react-router";
import { useTheme } from "@/app/theme";
import { useHealth } from "@/api/hooks";
import { getLab } from "@/labs/registry";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

function useBreadcrumb(): string[] {
  const { pathname } = useLocation();
  if (pathname === "/") return ["Overview"];
  if (pathname.startsWith("/experiments")) return ["Workspace", "Experiments"];
  const match = /^\/labs\/([^/]+)/.exec(pathname);
  if (match) {
    const lab = getLab(match[1]);
    return ["Laboratory", lab ? lab.name : "Unknown lab"];
  }
  return ["Not found"];
}

export function Header() {
  const crumbs = useBreadcrumb();
  const { theme, toggle } = useTheme();
  const health = useHealth();
  const online = health.isSuccess;

  return (
    <header className="bg-surface border-border flex h-12 shrink-0 items-center gap-4 border-b px-4">
      <Link
        to="/"
        className="text-fg-strong text-sm font-bold tracking-[0.18em] uppercase md:hidden"
      >
        MedLab
      </Link>
      <nav aria-label="Breadcrumb" className="text-muted flex min-w-0 items-center gap-1.5 text-xs">
        {crumbs.map((c, i) => (
          <span
            key={c}
            className={cn("truncate", i === crumbs.length - 1 && "text-fg font-medium")}
          >
            {i > 0 ? <span className="text-faint mr-1.5">/</span> : null}
            {c}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      <div
        className="flex items-center gap-2 text-xs"
        title={online ? `API v${health.data?.version}` : "Backend unreachable"}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            online ? "bg-ok" : health.isPending ? "bg-warn" : "bg-danger",
          )}
          aria-hidden
        />
        <span className="text-muted font-mono">
          {online ? `api 127.0.0.1:8000` : health.isPending ? "connecting…" : "api offline"}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        {theme === "dark" ? "☾ Dark" : "☀ Light"}
      </Button>
    </header>
  );
}
