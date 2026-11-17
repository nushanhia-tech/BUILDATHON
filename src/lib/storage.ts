import { supabase } from "./supabase";

/** Resize big phone photos before upload (keeps Storage free-tier friendly). */
async function shrink(file: File | Blob, maxSide = 1280): Promise<Blob> {
  if (!(file.type || "").startsWith("image/") || file.type === "image/svg+xml")
    return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 600_000) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) =>
      c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85),
    );
  } catch {
    return file;
  }
}

/** Upload to the public `photos` bucket under the caller's folder. Returns the public URL. */
export async function uploadPhoto(
  file: File | Blob,
  folder: string,
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? "anon";
  const isImage = (file.type || "").startsWith("image/");
  const body = isImage ? await shrink(file) : file;
  const ext = isImage
    ? body.type === "image/jpeg"
      ? "jpg"
      : file.type.split("/")[1] || "jpg"
    : file.type.includes("webm")
      ? "webm"
      : file.type.includes("mp4")
        ? "m4a"
        : "bin";
  const path =
    folder === "stories"
      ? `images/${crypto.randomUUID()}.${ext}`
      : `${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(folder === "stories" ? "story-images" : "photos")
    .upload(path, body, { contentType: body.type || file.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage
    .from(folder === "stories" ? "story-images" : "photos")
    .getPublicUrl(path).data.publicUrl;
}
