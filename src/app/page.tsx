import { redirect } from "next/navigation";

// Einstieg: direkt zur Call-Liste (Middleware leitet ggf. zum Login um).
export default function Home() {
  redirect("/calls");
}
