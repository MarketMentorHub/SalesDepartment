import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMH Sales Department",
  description: "Interner Sales-Bereich der MMH — Call-Analyse & mehr.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
