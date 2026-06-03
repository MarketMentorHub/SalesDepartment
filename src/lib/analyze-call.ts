// Verarbeitungs-Pipeline für einen Call:
//   1. Transkript sicherstellen (vorhandenes nehmen, sonst Whisper-Fallback)
//   2. Claude-Analyse rechnen
//   3. Ergebnis + Gesamtscore speichern, Status aktualisieren
//
// Läuft asynchron (fire-and-forget) nach dem Anlegen eines Calls. Fehler
// landen im Feld `fehler` + Status FEHLER, damit man sie im UI sieht.
import { prisma } from "@/lib/db";
import { Status } from "@prisma/client";
import { transkribiereAudio } from "@/lib/transcription";
import { analysiereTranskript, type AnalyseErgebnis } from "@/lib/anthropic";
import { FRAMEWORK } from "@/lib/scorecard";

// Gewichteter Gesamtscore (1–5) aus der Scorecard.
function berechneGesamtScore(ergebnis: AnalyseErgebnis): number | null {
  const gewichtById = new Map(
    FRAMEWORK.kriterien.map((k) => [k.id, k.gewichtung]),
  );
  let summe = 0;
  let gewichtSumme = 0;
  for (const e of ergebnis.scorecard) {
    const g = gewichtById.get(e.kriterium_id) ?? 1;
    summe += e.score * g;
    gewichtSumme += g;
  }
  if (gewichtSumme === 0) return null;
  return Math.round((summe / gewichtSumme) * 10) / 10;
}

export async function verarbeiteCall(callId: string): Promise<void> {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return;

  try {
    // 1. Transkript sicherstellen.
    let transkript = call.transkript?.trim() || "";
    if (!transkript) {
      if (!call.audioPfad) {
        throw new Error("Weder Transkript noch Audiodatei vorhanden.");
      }
      transkript = await transkribiereAudio(call.audioPfad);
      await prisma.call.update({
        where: { id: callId },
        data: { transkript, status: Status.TRANSKRIBIERT },
      });
    }

    // 2. Analyse.
    const { ergebnis, modell } = await analysiereTranskript(transkript);
    const gesamtScore = berechneGesamtScore(ergebnis);

    // 3. Speichern (Analyse upserten + Status setzen).
    await prisma.analyse.upsert({
      where: { callId },
      create: {
        callId,
        frameworkVersion: FRAMEWORK.version,
        scorecard: ergebnis.scorecard,
        zusammenfassung: ergebnis.zusammenfassung,
        talkRatio: ergebnis.talk_ratio,
        einwaende: ergebnis.einwaende,
        nextSteps: ergebnis.next_steps,
        redFlags: ergebnis.red_flags,
        staerken: ergebnis.staerken,
        schwaechen: ergebnis.schwaechen,
        gesamtScore,
        modell,
      },
      update: {
        frameworkVersion: FRAMEWORK.version,
        scorecard: ergebnis.scorecard,
        zusammenfassung: ergebnis.zusammenfassung,
        talkRatio: ergebnis.talk_ratio,
        einwaende: ergebnis.einwaende,
        nextSteps: ergebnis.next_steps,
        redFlags: ergebnis.red_flags,
        staerken: ergebnis.staerken,
        schwaechen: ergebnis.schwaechen,
        gesamtScore,
        modell,
      },
    });

    await prisma.call.update({
      where: { id: callId },
      data: { status: Status.ANALYSIERT, fehler: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[analyze-call] Call ${callId} fehlgeschlagen:`, message);
    await prisma.call.update({
      where: { id: callId },
      data: { status: Status.FEHLER, fehler: message },
    });
  }
}
