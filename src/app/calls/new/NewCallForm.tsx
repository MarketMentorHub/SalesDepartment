"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCallForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/calls/upload", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload fehlgeschlagen.");
        setPending(false);
        return;
      }
      router.push(`/calls/${data.id}`);
    } catch {
      setError("Netzwerkfehler beim Upload.");
      setPending(false);
    }
  }

  return (
    <form className="card" style={{ maxWidth: 640, marginTop: 16 }} onSubmit={onSubmit}>
      <label htmlFor="titel">Titel *</label>
      <input id="titel" name="titel" required placeholder="z.B. Erstgespräch Müller GmbH" />

      <label htmlFor="kunde">Kunde</label>
      <input id="kunde" name="kunde" placeholder="Firmenname / Ansprechpartner" />

      <label htmlFor="gespraechstyp">Gesprächstyp</label>
      <select id="gespraechstyp" name="gespraechstyp" defaultValue="ERSTGESPRAECH">
        <option value="ERSTGESPRAECH">Erstgespräch / Kaltakquise</option>
        <option value="CLOSING">Closing Call</option>
      </select>

      <label htmlFor="transkript">Transkript</label>
      <textarea
        id="transkript"
        name="transkript"
        rows={10}
        placeholder="Transkript hier einfügen … (oder unten eine Audiodatei wählen)"
      />

      <label htmlFor="audio">Audiodatei (optional)</label>
      <input id="audio" name="audio" type="file" accept="audio/*,video/*" />
      <p className="muted" style={{ fontSize: 13 }}>
        Wird nur transkribiert, wenn kein Transkript eingefügt wurde.
      </p>

      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 18 }}>
        {pending ? "Wird hochgeladen…" : "Call anlegen & analysieren"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
