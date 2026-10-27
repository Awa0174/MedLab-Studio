import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-fg-strong text-xl font-semibold">Page not found</h1>
      <p className="text-muted mt-2 text-sm">This route does not exist in MedLab Studio.</p>
      <Link to="/" className="text-accent mt-4 inline-block text-sm underline">
        Back to overview
      </Link>
    </div>
  );
}
