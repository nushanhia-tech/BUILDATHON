import { useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { uploadPhoto } from "../../lib/storage";
import { errMsg, useToast } from "../../hooks/useToast";

/** Pick/capture photos and upload them to Supabase Storage. */
export function PhotoUpload({ value, onChange, max = 1, folder }: { value: string[]; onChange: (urls: string[]) => void; max?: number; folder: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const room = max - value.length;
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, Math.max(room, max === 1 ? 1 : 0))) urls.push(await uploadPhoto(f, folder));
      onChange(max === 1 ? urls.slice(0, 1) : [...value, ...urls].slice(0, max));
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {value.map((u) => (
          <div key={u} className="relative">
            <img src={u} alt={t("photo")} className="w-24 h-24 object-cover rounded-2xl border-2 border-line" />
            <button type="button" aria-label={t("delete")} onClick={() => onChange(value.filter((x) => x !== u))}
              className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-danger text-on-danger font-bold">✕</button>
          </div>
        ))}
      </div>
      {value.length < max && (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="min-h-16 rounded-2xl bg-soft text-primary font-bold border-2 border-dashed border-primary/40">
          {busy ? t("uploading") : t("addPhoto")}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" multiple={max > 1} className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
