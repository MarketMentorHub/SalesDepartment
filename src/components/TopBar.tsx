import Link from "next/link";
import { signOut } from "@/lib/auth";

export function TopBar({ name, role }: { name?: string | null; role?: string }) {
  return (
    <header className="topbar">
      <Link href="/calls" className="brand">
        MMH Sales <span>· Call-Analyse</span>
      </Link>
      <div className="row" style={{ alignItems: "center" }}>
        <span className="muted">
          {name}
          {role === "ADMIN" ? " · Admin" : ""}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn secondary" type="submit">
            Abmelden
          </button>
        </form>
      </div>
    </header>
  );
}
