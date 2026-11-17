"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function addNote(formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const { error } = await supabase.from("notes").insert({ content });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
