// Transkriptions-Fallback via OpenAI Whisper.
//
// Hintergrund (für Emilio): Aircall (Erstgespräche) und Fathom (Closing Calls)
// liefern bereits ein fertiges Transkript — das schieben wir direkt rein und
// brauchen Whisper gar nicht. Whisper ist nur der Notnagel, falls mal eine
// reine Audiodatei OHNE Transkript ankommt (z.B. manueller Upload). Dann
// schickt das Tool die Datei an OpenAI Whisper und bekommt den Text zurück.
import fs from "node:fs";
import OpenAI from "openai";

export function whisperVerfuegbar(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function transkribiereAudio(audioPfad: string): Promise<string> {
  if (!whisperVerfuegbar()) {
    throw new Error(
      "OPENAI_API_KEY nicht gesetzt — Audio kann nicht transkribiert werden. " +
        "Bitte ein fertiges Transkript mitliefern oder den Key konfigurieren.",
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPfad),
    model: "whisper-1",
    language: "de", // Sales-Calls laufen auf Deutsch
  });

  return result.text;
}
