import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/TopBar";
import { formatDatum, statusLabel, gespraechstypLabel } from "@/lib/format";

// Immer frisch laden (Status ändert sich, während Analysen laufen).
export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const session = await auth();
  const istAdmin = session?.user?.role === "ADMIN";

  // Admin sieht alle Calls, alle anderen nur ihre eigenen.
  const calls = await prisma.call.findMany({
    where: istAdmin ? {} : { ownerId: session?.user?.id },
    include: { owner: { select: { name: true } }, analyse: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <TopBar name={session?.user?.name} role={session?.user?.role} />
      <main className="container">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h1>Sales-Calls</h1>
          <Link href="/calls/new" className="btn">
            + Neuer Call
          </Link>
        </div>

        <div className="card" style={{ padding: 0, marginTop: 16 }}>
          {calls.length === 0 ? (
            <p className="muted" style={{ padding: 20 }}>
              Noch keine Calls. Lade oben rechts den ersten hoch — oder lass n8n
              welche reinschieben.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Titel / Kunde</th>
                  <th>Typ</th>
                  {istAdmin && <th>Besitzer</th>}
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/calls/${c.id}`}>
                        {formatDatum(c.gesprochenAm ?? c.createdAt)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/calls/${c.id}`}>{c.titel}</Link>
                      {c.kunde && (
                        <div className="muted" style={{ fontSize: 13 }}>
                          {c.kunde}
                        </div>
                      )}
                    </td>
                    <td className="muted">
                      {gespraechstypLabel(c.gespraechstyp)}
                    </td>
                    {istAdmin && <td className="muted">{c.owner.name}</td>}
                    <td className="score">
                      {c.analyse?.gesamtScore != null
                        ? `${c.analyse.gesamtScore.toFixed(1)} / 5`
                        : "–"}
                    </td>
                    <td>
                      <span className={`badge ${c.status.toLowerCase()}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
