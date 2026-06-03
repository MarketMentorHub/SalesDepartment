// Kleine Anzeige-Helfer.

export function formatDatum(d: Date | null | undefined): string {
  if (!d) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function statusLabel(status: string): string {
  switch (status) {
    case "NEU":
      return "In Warteschlange";
    case "TRANSKRIBIERT":
      return "Transkribiert";
    case "ANALYSIERT":
      return "Analysiert";
    case "FEHLER":
      return "Fehler";
    default:
      return status;
  }
}

export function gespraechstypLabel(typ: string): string {
  return typ === "CLOSING" ? "Closing Call" : "Erstgespräch";
}
