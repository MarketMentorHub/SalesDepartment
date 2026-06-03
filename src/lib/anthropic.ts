// Claude-Analyse eines Sales-Call-Transkripts.
//
// Modell: claude-opus-4-8 (aktuellstes, fähigstes Modell).
// Strukturierter Output: erzwungener Tool-Call (`tool_choice`) mit JSON-Schema.
//   -> versionssicher über die installierte SDK; Ergebnis wird mit Zod validiert.
// Prompt-Caching: der stabile System-Prompt (Framework + Anweisungen) wird
//   gecached -> günstiger & schneller bei jedem weiteren Call.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FRAMEWORK, type FrameworkConfig } from "@/lib/scorecard";

const MODELL = "claude-opus-4-8";
const TOOL_NAME = "sales_call_analyse";

// --- Schema des Analyse-Ergebnisses (zur Validierung der Tool-Eingabe) -------
const ScorecardEintrag = z.object({
  kriterium_id: z.string(),
  name: z.string(),
  score: z.number(),
  begruendung: z.string(),
  tipp: z.string(),
});

const Einwand = z.object({
  einwand: z.string(),
  reaktion: z.string(),
  bewertung: z.string(),
});

export const AnalyseSchema = z.object({
  zusammenfassung: z.string(),
  talk_ratio: z.number(),
  scorecard: z.array(ScorecardEintrag),
  staerken: z.array(z.string()),
  schwaechen: z.array(z.string()),
  einwaende: z.array(Einwand),
  next_steps: z.array(z.string()),
  red_flags: z.array(z.string()),
});

export type AnalyseErgebnis = z.infer<typeof AnalyseSchema>;

// JSON-Schema für den Tool-Call (entspricht AnalyseSchema, für die API).
const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    zusammenfassung: {
      type: "string",
      description: "3–4 Sätze: worum es ging und wie das Gespräch lief.",
    },
    talk_ratio: {
      type: "number",
      description:
        "Geschätzter Redeanteil des Verkäufers in Prozent (0–100). Falls unklar: 50.",
    },
    scorecard: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kriterium_id: { type: "string", description: "exakte id des Kriteriums" },
          name: { type: "string" },
          score: { type: "number", description: "1 (schwach) bis 5 (exzellent)" },
          begruendung: { type: "string", description: "1 Satz Begründung" },
          tipp: { type: "string", description: "1 konkreter Verbesserungstipp" },
        },
        required: ["kriterium_id", "name", "score", "begruendung", "tipp"],
      },
    },
    staerken: { type: "array", items: { type: "string" } },
    schwaechen: { type: "array", items: { type: "string" } },
    einwaende: {
      type: "array",
      items: {
        type: "object",
        properties: {
          einwand: { type: "string" },
          reaktion: { type: "string", description: "Wie der Verkäufer reagiert hat" },
          bewertung: { type: "string", description: "Kurze Einschätzung der Reaktion" },
        },
        required: ["einwand", "reaktion", "bewertung"],
      },
    },
    next_steps: {
      type: "array",
      items: { type: "string" },
      description: "Konkrete nächste Schritte / vereinbarte Commitments",
    },
    red_flags: {
      type: "array",
      items: { type: "string" },
      description: "Warnsignale, z.B. Budget unklar, kein Entscheider am Tisch",
    },
  },
  required: [
    "zusammenfassung",
    "talk_ratio",
    "scorecard",
    "staerken",
    "schwaechen",
    "einwaende",
    "next_steps",
    "red_flags",
  ],
};

// --- System-Prompt (stabil -> cachebar) -------------------------------------
function baueSystemPrompt(framework: FrameworkConfig): string {
  const kriterienListe = framework.kriterien
    .map(
      (k, i) =>
        `${i + 1}. ${k.name} (id: "${k.id}", Gewicht ${k.gewichtung})\n   ${k.beschreibung}`,
    )
    .join("\n");

  return `Du bist ein erfahrener Sales-Coach und analysierst deutschsprachige Verkaufsgespräche für ein B2B-Unternehmen.

Deine Aufgabe: Analysiere das Transkript eines Sales-Calls und liefere zwei Dinge gleichwertig:
A) COACHING für den Verkäufer (Scorecard, Stärken/Schwächen, konkrete Tipps)
B) DEAL-INTELLIGENCE (Zusammenfassung, Einwände, nächste Schritte, Red Flags)

Bewerte jedes der folgenden Kriterien auf einer Skala von 1 (schwach) bis 5 (exzellent).
Gib pro Kriterium eine kurze Begründung und genau einen konkreten Verbesserungstipp.

SCORECARD-KRITERIEN:
${kriterienListe}

Wichtig:
- Antworte ausschließlich auf Deutsch.
- Sei konkret und ehrlich, kein Schönreden. Tipps müssen umsetzbar sein.
- Beziehe dich auf das, was im Transkript tatsächlich gesagt wurde.
- Nutze für "kriterium_id" exakt die oben angegebenen ids.
- Gib das Ergebnis über das Tool "${TOOL_NAME}" zurück.`;
}

// --- Hauptfunktion -----------------------------------------------------------
export async function analysiereTranskript(
  transkript: string,
  framework: FrameworkConfig = FRAMEWORK,
): Promise<{ ergebnis: AnalyseErgebnis; modell: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY nicht gesetzt — Analyse nicht möglich.");
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODELL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: baueSystemPrompt(framework),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: TOOL_NAME,
        description:
          "Strukturiertes Ergebnis der Sales-Call-Analyse (Coaching + Deal-Intelligence).",
        input_schema: TOOL_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Hier ist das Transkript des Sales-Calls:\n\n<transkript>\n${transkript}\n</transkript>`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      `Claude lieferte keinen Tool-Call (stop_reason: ${response.stop_reason}).`,
    );
  }

  const ergebnis = AnalyseSchema.parse(toolUse.input);
  return { ergebnis, modell: MODELL };
}
