// Browser-Upload eines Calls (eingeloggte Nutzer).
//
//   POST /api/calls/upload  (multipart/form-data)
//   Felder: titel, kunde?, gespraechstyp?, transkript? ODER audio (File)
//
// Speichert eine Audiodatei lokal (UPLOAD_DIR) oder übernimmt ein Transkript,
// legt den Call an und stößt die Analyse an.
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Quelle, Gespraechstyp, Status } from "@prisma/client";
import { verarbeiteCall } from "@/lib/analyze-call";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const titel = String(form.get("titel") || "").trim();
  const kunde = String(form.get("kunde") || "").trim() || null;
  const gespraechstypRaw = String(form.get("gespraechstyp") || "");
  const transkriptRaw = String(form.get("transkript") || "").trim();
  const audio = form.get("audio");

  if (!titel) {
    return NextResponse.json({ error: "Titel fehlt" }, { status: 400 });
  }
  if (!transkriptRaw && !(audio instanceof File && audio.size > 0)) {
    return NextResponse.json(
      { error: "Bitte ein Transkript einfügen oder eine Audiodatei hochladen." },
      { status: 400 },
    );
  }

  const gespraechstyp =
    gespraechstypRaw === "CLOSING"
      ? Gespraechstyp.CLOSING
      : Gespraechstyp.ERSTGESPRAECH;

  // Audiodatei (falls vorhanden) lokal ablegen.
  let audioPfad: string | null = null;
  if (audio instanceof File && audio.size > 0) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(audio.name) || ".audio";
    const safeName = `${randomUUID()}${ext}`;
    audioPfad = path.join(UPLOAD_DIR, safeName);
    const bytes = Buffer.from(await audio.arrayBuffer());
    await fs.writeFile(audioPfad, bytes);
  }

  const call = await prisma.call.create({
    data: {
      titel,
      kunde,
      ownerId: session.user.id,
      transkript: transkriptRaw || null,
      audioPfad,
      quelle: Quelle.UPLOAD,
      gespraechstyp,
      status: Status.NEU,
    },
  });

  void verarbeiteCall(call.id);

  return NextResponse.json({ id: call.id, status: "accepted" }, { status: 202 });
}
