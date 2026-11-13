import { redirect } from "next/navigation";

// No landing page in Phase 1. proxy.ts sends signed-out visitors to /login.
export default function Home() {
  redirect("/tickets");
}
