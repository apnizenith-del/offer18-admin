import { getSessionAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getSessionAdmin();
  if (!s) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex">
      <aside className="w-20 lg:w-64 border-r border-white/10 p-3">
        <div className="text-sm font-semibold px-2 py-3">CC</div>
        <nav className="mt-4 space-y-1 text-sm">
          <Nav href="/dashboard" label="Dashboard" />
          <Nav href="/offers" label="Offers" />
          <Nav href="/offers/new" label="Create Offer" />
        </nav>
      </aside>

      <main className="flex-1">
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4">
          <div className="text-sm text-white/70">Command Center</div>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm px-3 py-1 rounded-lg bg-white/5 border border-white/10">
              Logout
            </button>
          </form>
        </header>
        <div className="p-4">{children}</div>
      </main>

      <div className="hidden xl:block w-[420px] border-l border-white/10 bg-white/5">
        <div className="p-4 text-sm text-white/70">Inspector</div>
        <div className="p-4 text-white/60 text-sm">
          Select a row to view details, notes, logs.
        </div>
      </div>
    </div>
  );
}

function Nav({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block rounded-xl px-3 py-2 hover:bg-white/5 border border-transparent hover:border-white/10"
    >
      {label}
    </a>
  );
}
