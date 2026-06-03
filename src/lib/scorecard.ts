// Generische Scorecard-Konfiguration.
// Die Kriterien treiben sowohl den Claude-Prompt als auch die Anzeige.
// Hier sind die Default-Kriterien hinterlegt — Emilio kann sie später verfeinern,
// ohne dass eine DB-Migration nötig wird (Scorecard wird als JSON gespeichert).

export type Kriterium = {
  id: string;
  name: string;
  beschreibung: string;
  gewichtung: number; // relatives Gewicht für den Gesamtscore
};

export type FrameworkConfig = {
  version: string;
  kriterien: Kriterium[];
};

// Beim Ändern der Kriterien die Version hochzählen, damit man später
// nachvollziehen kann, gegen welche Kriterien ein Call bewertet wurde.
export const FRAMEWORK: FrameworkConfig = {
  version: "default-2026-06",
  kriterien: [
    {
      id: "rapport",
      name: "Rapport & Gesprächseinstieg",
      beschreibung:
        "Wurde eine vertrauensvolle Atmosphäre geschaffen? Klarer, sympathischer Einstieg, aktives Zuhören.",
      gewichtung: 1,
    },
    {
      id: "discovery",
      name: "Bedarfsanalyse / Discovery",
      beschreibung:
        "Wurden die Situation, Probleme und Ziele des Kunden mit guten, offenen Fragen herausgearbeitet?",
      gewichtung: 2,
    },
    {
      id: "einwandbehandlung",
      name: "Einwandbehandlung",
      beschreibung:
        "Wie souverän wurde auf Einwände und Bedenken eingegangen? Wurden sie aufgegriffen statt übergangen?",
      gewichtung: 2,
    },
    {
      id: "next_steps",
      name: "Nächste Schritte / Verbindlichkeit",
      beschreibung:
        "Wurde ein konkreter, verbindlicher nächster Schritt vereinbart (Termin, Angebot, Entscheidung)?",
      gewichtung: 1.5,
    },
    {
      id: "abschluss",
      name: "Abschlussorientierung",
      beschreibung:
        "Wurde zielgerichtet auf einen Abschluss bzw. die nächste Stufe im Sales-Prozess hingearbeitet?",
      gewichtung: 1.5,
    },
  ],
};
