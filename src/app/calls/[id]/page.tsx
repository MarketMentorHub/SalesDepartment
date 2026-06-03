import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/TopBar";
import {
  formatDatum,
  statusLabel,
  gespraechstypLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

type ScorecardEintrag = {
  kriterium_id: string;
  name: string;
  score: number;
  begruendung: string;
  tipp: string;
};
type Einwand = { einwand: string; reaktion: string; bewertung: string };

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const istAdmin = session?.user?.role === "ADMIN";

  const call = await prisma.call.findUnique({
    where: { id },
    include: { owner: { select: { name: true } }, analyse: true },
  });
  if (!call) notFound();

  // Berechtigung: eigene Calls, Admin sieht alle.
  if (!istAdmin && call.ownerId !== session?.user?.id) {
    redirect("/calls");
  }

  const a = call.analyse;
  const scorecard = (a?.scorecard as ScorecardEintrag[] | undefined) ?? [];
  const einwaende = (a?.einwaende as Einwand[] | undefined) ?? [];
  const nextSteps = (a?.nextSteps as string[] | undefined) ?? [];
  const redFlags = (a?.redFlags as string[] | undefined) ?? [];
  const staerken = (a?.staerken as string[] | undefined) ?? [];
  const schwaechen = (a?.schwaechen as string[] | undefined) ?? [];

  const laeuftNoch = call.status === "NEU" || call.status === "TRANSKRIBIERT";

  return (
    <>
      <TopBar name={session?.user?.name} role={session?.user?.role} />
      {/* Solange noch verarbeitet wird: Seite alle 5s neu laden. */}
      {laeuftNoch && (
        <meta httpEquiv="refresh" content="5" />
      )}
      <main className="container">
        <a href="/calls" className="muted">
          ← zurück zur Liste
        </a>
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}
        >
          <h1 style={{ marginBottom: 0 }}>{call.titel}</h1>
          <span className={`badge ${call.status.toLowerCase()}`}>
            {statusLabel(call.status)}
          </span>
        </div>
        <p className="muted">
          {call.kunde ? `${call.kunde} · ` : ""}
          {gespraechstypLabel(call.gespraechstyp)} · {call.owner.name} ·{" "}
          {formatDatum(call.gesprochenAm ?? call.createdAt)}
          {a?.gesamtScore != null && (
            <>
              {" · "}
              <strong className="score">
                Score {a.gesamtScore.toFixed(1)} / 5
              </strong>
            </>
          )}
        </p>

        {call.status === "FEHLER" && (
          <div className="card" style={{ borderColor: "#3a1d1d", marginTop: 8 }}>
            <strong style={{ color: "var(--bad)" }}>Analyse fehlgeschlagen</strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              {call.fehler}
            </p>
          </div>
        )}

        {laeuftNoch && (
          <div className="card" style={{ marginTop: 8 }}>
            <p className="muted" style={{ margin: 0 }}>
              Wird gerade verarbeitet… (Seite aktualisiert sich automatisch)
            </p>
          </div>
        )}

        <div className="grid-2" style={{ marginTop: 16 }}>
          {/* Linke Spalte: Transkript */}
          <section className="card">
            <h2>Transkript</h2>
            {call.transkript ? (
              <pre className="transkript">{call.transkript}</pre>
            ) : (
              <p className="muted">Noch kein Transkript.</p>
            )}
          </section>

          {/* Rechte Spalte: Analyse */}
          <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {a ? (
              <>
                <div className="card">
                  <h2>Zusammenfassung</h2>
                  <p>{a.zusammenfassung}</p>
                  {a.talkRatio != null && (
                    <p className="muted" style={{ marginBottom: 0 }}>
                      Redeanteil Verkäufer: ~{Math.round(a.talkRatio)}%
                    </p>
                  )}
                </div>

                <div className="card">
                  <h2>Coaching-Scorecard</h2>
                  {scorecard.map((s) => (
                    <div
                      key={s.kriterium_id}
                      style={{
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <strong>{s.name}</strong>
                        <span className="score">{s.score} / 5</span>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {s.begruendung}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        💡 {s.tipp}
                      </div>
                    </div>
                  ))}
                  {staerken.length > 0 && (
                    <>
                      <h3 style={{ fontSize: 14, marginBottom: 4 }}>Stärken</h3>
                      <ul className="clean">
                        {staerken.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {schwaechen.length > 0 && (
                    <>
                      <h3 style={{ fontSize: 14, marginBottom: 4 }}>Schwächen</h3>
                      <ul className="clean">
                        {schwaechen.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div className="card">
                  <h2>Deal-Intelligence</h2>
                  {einwaende.length > 0 && (
                    <>
                      <h3 style={{ fontSize: 14, marginBottom: 4 }}>Einwände</h3>
                      {einwaende.map((e, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <strong>{e.einwand}</strong>
                          <div className="muted" style={{ fontSize: 13 }}>
                            Reaktion: {e.reaktion}
                          </div>
                          <div style={{ fontSize: 13 }}>{e.bewertung}</div>
                        </div>
                      ))}
                    </>
                  )}
                  {nextSteps.length > 0 && (
                    <>
                      <h3 style={{ fontSize: 14, marginBottom: 4 }}>Nächste Schritte</h3>
                      <ul className="clean">
                        {nextSteps.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {redFlags.length > 0 && (
                    <>
                      <h3 style={{ fontSize: 14, marginBottom: 4, color: "var(--warn)" }}>
                        Red Flags
                      </h3>
                      <ul className="clean">
                        {redFlags.map((x, i) => (
                          <li key={i} style={{ color: "var(--warn)" }}>
                            {x}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </>
            ) : (
              !laeuftNoch &&
              call.status !== "FEHLER" && (
                <div className="card">
                  <p className="muted">Noch keine Analyse vorhanden.</p>
                </div>
              )
            )}
          </section>
        </div>
      </main>
    </>
  );
}
