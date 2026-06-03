"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/calls",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail oder Passwort ist falsch.";
    }
    // signIn wirft bei Erfolg einen Redirect — den müssen wir durchlassen.
    throw error;
  }
}
