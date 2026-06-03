# MMH Sales Department

Interner Sales-Bereich der MMH unter `sales.mmh.capital`. Erstes Tool: **Sales-Call-Analyse**.
Konzept & Hintergrund: siehe [`KONZEPT.md`](./KONZEPT.md).

## Was es kann (MVP)

- **Login** für drei Nutzer (Stephen, Torben, Emilio = Admin). Jeder sieht nur
  seine eigenen Calls, der Admin sieht alle.
- **Calls reinbekommen** auf zwei Wegen:
  - **Browser-Upload**: Transkript einfügen oder Audiodatei hochladen.
  - **Ingest-API** für n8n (Aircall-Erstgespräche, Fathom-Closing-Calls).
- **Claude-Analyse** (Modell `claude-opus-4-8`) je Call:
  - Coaching: Scorecard (1–5) je Kriterium + Tipps, Stärken/Schwächen, Talk-Ratio.
  - Deal-Intelligence: Zusammenfassung, Einwände, nächste Schritte, Red Flags.
- **Transkription-Fallback** via OpenAI Whisper, falls mal Audio ohne Transkript kommt.

## Tech-Stack

Next.js 15 (App Router) · PostgreSQL · Prisma · Auth.js (Credentials, argon2) ·
Docker Compose · Caddy (automatisches HTTPS) · Anthropic SDK · OpenAI (Whisper).

## Lokal entwickeln

```bash
npm install
cp .env.example .env        # Werte ausfüllen (mind. DATABASE_URL, AUTH_SECRET, ANTHROPIC_API_KEY)
# Lokale Postgres nötig, oder nur die DB via Compose hochziehen:
docker compose up -d db
npx prisma db push          # Schema in die DB schreiben
npm run db:seed             # die 3 Accounts anlegen
npm run dev                 # http://localhost:3000
```

## Produktion auf dem VPS

Voraussetzungen: Docker + Docker Compose, DNS-A-Record
`sales.mmh.capital → Server-IP`, offene Ports 80/443.

```bash
cp .env.example .env        # Secrets setzen! (AUTH_SECRET, ANTHROPIC_API_KEY,
                            #  INGEST_API_KEY, SEED_*-Passwörter, POSTGRES_PASSWORD)
docker compose up -d --build

# Einmalig: Schema migrieren + Accounts anlegen
docker compose exec app npx prisma db push
docker compose exec app npm run db:seed
```

Danach ist das Tool unter `https://sales.mmh.capital` erreichbar (Caddy holt das
TLS-Zertifikat automatisch).

> **Secrets generieren:**
> `openssl rand -base64 32` (AUTH_SECRET) · `openssl rand -hex 24` (INGEST_API_KEY)

## n8n-Anbindung (Ingest-API)

```
POST https://sales.mmh.capital/api/calls/ingest
Header: X-API-Key: <INGEST_API_KEY>
Content-Type: application/json

{
  "titel": "Closing Call Müller GmbH",
  "kunde": "Müller GmbH",
  "owner_email": "torben@mmh.capital",
  "gespraechstyp": "CLOSING",        // oder "ERSTGESPRAECH"
  "quelle": "FATHOM",                // oder AIRCALL / ZOOM / N8N
  "transkript": "... voller Text ...",
  "gesprochen_am": "2026-06-03T10:00:00Z"
}
```

Antwort `202 Accepted` mit `{ id }`. Transkription (falls nötig) und Analyse
laufen asynchron — der Call taucht in der Liste auf und aktualisiert seinen Status.

> Hinweis: Reine `audio_url`-Verarbeitung (Download im Tool) ist noch nicht
> umgesetzt — vorerst aus n8n das **Transkript** mitliefern (Aircall & Fathom
> liefern es ohnehin).

## Scorecard-Kriterien anpassen

Die Bewertungskriterien stehen in [`src/lib/scorecard.ts`](./src/lib/scorecard.ts).
Kriterien ändern, `version` hochzählen, neu deployen — fertig. Keine DB-Migration nötig.
