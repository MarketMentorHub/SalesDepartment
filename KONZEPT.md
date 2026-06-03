# MMH Sales Department — Konzept

> Interner Bereich für das Sales-Team der MMH. Läuft unter `sales.mmh.capital`.
> Dieses Dokument hält den Stand des Brainstormings fest und dient als Referenz
> für die Umsetzung. Stand: 2026-06-03.

## 1. Ziel & Scope

Interner, eingeloggter Arbeitsbereich für das Sales-Team. Wird schrittweise
ausgebaut. **Erstes und einziges Tool jetzt:** die **Sales-Call-Analyse**.
KPIs / Dashboard kommen später (Architektur ist darauf vorbereitet).

### Nutzer (Start)
- **Stephen** (mit „ph")
- **Torben**
- **Emilio** (emilio@mmh.capital) — Admin

Login per Web. Jeder eigener Account mit Rolle (`user` / `admin`).

## 2. Architektur (Überblick)

- **Hosting:** eigener VPS / Server (nicht Vercel etc.)
- **Domain:** `sales.mmh.capital` (Subdomain), Tool-Wurzel im Verzeichnis `Sales/`
- **Stack:**
  - **Next.js** — Full-Stack: UI + API-Routes + Auth in einem.
    Spätere KPIs/Dashboard kommen als weitere Seiten dazu.
  - **PostgreSQL** — Datenhaltung.
  - **Docker Compose** — App + Postgres.
  - **Caddy** als Reverse Proxy → automatisches HTTPS für die Subdomain.
  - **Auth.js (NextAuth)** — Credentials-Login, Passwörter mit **argon2** gehasht,
    Accounts in der DB, `role`-Feld für spätere Admin-/KPI-Trennung.

### Aufgabenteilung
- **n8n = Klempnerei:** zieht Aufnahmen aus der Quelle (Zoom/Fathom/tl;dv),
  transkribiert ggf. und schiebt das Ergebnis per API ins Tool.
- **Das Tool = Hirn + Anzeige:** speichert Calls, lässt **Claude** die strukturierte
  Analyse rechnen, zeigt Scorecard + Deal-Intel + Transkript.
- Analyse bewusst **im Tool** (nicht in n8n), damit Prompts/Kriterien im Code
  versioniert und schnell iteriert werden können.

## 3. Call-Input

Beide Wege werden unterstützt:
1. **Manueller Upload** im Browser (Audio/Video oder fertiges Transkript).
2. **Automatisch via n8n** über die Ingest-API.

### Transkription (Fallback-Logik)
- Ist ein **Transkript** vorhanden → direkt verwenden.
- Sonst → Audio via **OpenAI Whisper** transkribieren.
- Sprache: **Deutsch** (Transkription & Prompts darauf optimiert).

## 4. Analyse-Output (was Claude pro Call liefert)

Zwei gleichwertige Blöcke:

### A) Coaching (für den Verkäufer)
- **Scorecard** je Kriterium: Score 1–5 + kurze Begründung + 1 konkreter Tipp
- Stärken / Schwächen des Gesprächs
- **Talk-to-Listen-Ratio**

### B) Deal-Intelligence (für den Deal)
- Kurz-Zusammenfassung (3–4 Sätze)
- Erkannte **Einwände** + wie darauf reagiert wurde
- Konkrete **nächste Schritte / Commitments**
- **Red Flags** (Budget unklar, kein Entscheider am Tisch, …)

### Scorecard-Kriterien (generisch, später anpassbar)
Als JSON-Config im Code, getrieben von `name` / `beschreibung` / `gewichtung`.
Default-Kriterien zum Start (von Emilio später zu verfeinern):
1. Rapport & Gesprächseinstieg
2. Bedarfsanalyse / Discovery
3. Einwandbehandlung
4. Nächste Schritte / Verbindlichkeit
5. Abschlussorientierung

Speicherung als JSON → Kriterien änderbar ohne DB-Migration; später ggf. im UI editierbar.

## 5. Berechtigungen

- **User** (Stephen, Torben): sehen **nur ihre eigenen** Calls.
- **Admin** (Emilio): sieht **alle** Calls.

## 6. Datenmodell (Entwurf)

```
users      id, name, email, password_hash, role
calls      id, owner_id, titel, kunde, quelle, status,
           audio_pfad, transkript, dauer, gesprochen_am, created_at
analyses   id, call_id, framework_version, scorecard(JSON),
           zusammenfassung, talk_ratio, einwaende(JSON),
           next_steps(JSON), red_flags(JSON), gesamt_score, modell, created_at
```

- `quelle` = `upload` | `n8n` | (später) `zoom` / `fathom`
- `status` = `neu` → `transkribiert` → `analysiert` → `fehler`

## 7. n8n-Vertrag (Ingest-API)

```
POST https://sales.mmh.capital/api/calls/ingest
Header: X-API-Key: <geheim>
Body:  {
  "titel":        "string",
  "kunde":        "string",
  "owner_email":  "string",   // ordnet den Call einem Nutzer zu
  "transkript":   "string?",  // optional; wenn fehlt, wird audio_url transkribiert
  "audio_url":    "string?",
  "gesprochen_am":"ISO-8601"
}
```
→ Antwort sofort `202 Accepted`; Transkription (falls nötig) und Analyse laufen
asynchron. Der Call erscheint mit `status` in der Liste und aktualisiert sich.

## 8. Seiten / UI-Flows

1. **Login**
2. **Call-Liste** — Tabelle: Datum, Kunde, Besitzer, Score, Status
3. **Call-Detail** — Transkript (links), Scorecard + Deal-Intel (rechts)
4. **Neuer Call** — Upload-Button + Drag & Drop
5. *(später)* **Dashboard / KPIs**

## 9. MVP-Umfang

1. Repo-Scaffold: Next.js + Postgres + Docker Compose + Caddy
2. Login mit den 3 Accounts (argon2, Rollen)
3. Call-Liste + Call-Detail
4. Ingest-API (API-Key) **und** Browser-Upload (Audio/Transkript)
5. Claude-Analyse-Pipeline mit generischer Kriterien-Config + Whisper-Fallback

## 10. Offene Punkte / später zu klären

- Welches Aufnahme-Tool nutzt ihr (Zoom / Fathom / tl;dv)? → ggf. direkte Quelle
  statt Umweg über n8n. (An dieser Umgebung hängt bereits ein Meeting-Recording-Tool.)
- Echte Scorecard-Kriterien von Emilio (ersetzen die Defaults).
- KPIs / Dashboard-Inhalte (Phase 2).
