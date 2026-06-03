import { auth } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { NewCallForm } from "./NewCallForm";

export default async function NewCallPage() {
  const session = await auth();
  return (
    <>
      <TopBar name={session?.user?.name} role={session?.user?.role} />
      <main className="container">
        <h1>Neuer Call</h1>
        <p className="muted">
          Füge ein fertiges Transkript ein (z.B. aus Aircall oder Fathom) oder
          lade eine Audiodatei hoch — dann transkribiert das Tool sie selbst.
        </p>
        <NewCallForm />
      </main>
    </>
  );
}
