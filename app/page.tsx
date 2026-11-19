import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginPage from "./login/page";

// The site root is the login page. Signed-in users go straight to their tickets.
export default async function Home(props: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // An error in the URL (e.g. no_profile) means /tickets already sent them back here.
  const { error } = await props.searchParams;
  if (user && !error) redirect("/tickets");
  return LoginPage(props);
}
