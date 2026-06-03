// Schützt alle App-Seiten: nur eingeloggte Nutzer kommen rein.
// Nutzt die edge-sichere Basiskonfiguration (ohne argon2/Prisma).
// Die Zugriffslogik steckt im `authorized`-Callback in auth.config.ts.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Alles außer statischen Assets durch das Middleware schicken.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
