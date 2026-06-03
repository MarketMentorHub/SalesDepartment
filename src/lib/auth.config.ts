import type { NextAuthConfig } from "next-auth";

// Edge-sichere Basiskonfiguration (KEINE Node-Abhängigkeiten wie argon2/Prisma).
// Wird vom Middleware und von der vollen Auth-Konfiguration gemeinsam genutzt.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Provider werden in auth.ts (Node-Runtime) ergänzt.
  providers: [],
  callbacks: {
    // Zugriffskontrolle fürs Middleware: was darf ohne Login erreicht werden?
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const oeffentlich =
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/calls/ingest");
      if (oeffentlich) return true;
      return Boolean(auth?.user); // sonst: Redirect zur Login-Seite
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
