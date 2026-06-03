"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { authenticate } from "./actions";

function LoginForm() {
  const [errorMessage, formAction, pending] = useActionState(
    authenticate,
    undefined,
  );
  const callbackUrl = useSearchParams().get("callbackUrl") || "/calls";

  return (
    <form action={formAction} className="card" style={{ width: 360 }}>
      <h1 style={{ marginTop: 0 }}>
        MMH Sales <span className="muted">Login</span>
      </h1>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label htmlFor="email">E-Mail</label>
      <input id="email" name="email" type="email" required autoFocus />
      <label htmlFor="password">Passwort</label>
      <input id="password" name="password" type="password" required />
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 18, width: "100%" }}>
        {pending ? "Anmelden…" : "Anmelden"}
      </button>
      {errorMessage && <p className="error">{errorMessage}</p>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
