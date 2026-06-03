// Ingest-API für n8n (und perspektivisch Aircall/Fathom-Pipelines).
//
//   POST /api/calls/ingest
//   Header: X-API-Key: <INGEST_API_KEY>
//   Body (JSON): siehe Schema unten
//
// Antwortet sofort mit 202; Transkription (falls nötig) + Analyse laufen async.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Quelle, Gespraechstyp, Status } from "@prisma/client";
import { verarbeiteCall } from "@/lib/analyze-call";

const ingestSchema = z
  .object({
    titel: z.string().min(1),
    kunde: z.string().optional(),
    owner_email: z.string().email(),
    transkript: z.string().optional(),
    audio_url: z.string().url().optional(),
    gespraechstyp: z.nativeEnum(Gespraechstyp).optional(),
    quelle: z.nativeEnum(Quelle).optional(),
    gesprochen_am: z.string().datetime().optional(),
  })
  .refine((d) => d.transkript || d.audio_url, {
    message: "Entweder 'transkript' oder 'audio_url' muss gesetzt sein.",
  });

export async function POST(req: NextRequest) {
  // 1. API-Key prüfen.
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.INGEST_API_KEY || apiKey !== process.env.INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Body validieren.
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 3. Nutzer zuordnen.
  const owner = await prisma.user.findUnique({
    where: { email: data.owner_email },
  });
  if (!owner) {
    return NextResponse.json(
      { error: `Kein Nutzer mit E-Mail ${data.owner_email}` },
      { status: 422 },
    );
  }

  // Hinweis: audio_url-Download ist im MVP noch nicht implementiert — wenn nur
  // eine URL kommt, sollte die n8n-Pipeline vorerst das Transkript mitliefern.
  if (!data.transkript && data.audio_url) {
    return NextResponse.json(
      {
        error:
          "audio_url-Verarbeitung folgt noch. Bitte vorerst 'transkript' mitliefern.",
      },
      { status: 422 },
    );
  }

  // 4. Call anlegen.
  const call = await prisma.call.create({
    data: {
      titel: data.titel,
      kunde: data.kunde,
      ownerId: owner.id,
      transkript: data.transkript,
      quelle: data.quelle ?? Quelle.N8N,
      gespraechstyp: data.gespraechstyp ?? Gespraechstyp.ERSTGESPRAECH,
      gesprochenAm: data.gesprochen_am ? new Date(data.gesprochen_am) : null,
      status: Status.NEU,
    },
  });

  // 5. Analyse async anstoßen (nicht awaiten).
  void verarbeiteCall(call.id);

  return NextResponse.json({ id: call.id, status: "accepted" }, { status: 202 });
}
