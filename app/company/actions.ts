"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";
import { checkPhones } from "@/lib/phone";

export type ContactState = { error: string } | { success: string } | null;

// Any signed-in user can update their own contact numbers. The column grant
// (migration 0005) only allows full_name/phone/phone2, so company and role stay put.
export async function updateMyContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const { supabase, profile } = await requireProfile();
  const phones = checkPhones(formData.get("phone"), formData.get("phone2"));
  if ("error" in phones) return phones;

  const { error } = await supabase
    .from("profiles")
    .update({ phone: phones.phone, phone2: phones.phone2 })
    .eq("id", profile.id);
  if (error) return { error: "Couldn't save your numbers. Please try again." };

  revalidatePath("/company");
  return { success: "Contact numbers saved." };
}
