import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { useOptionalUserSettings } from "../hooks/useUserSettings";
import { PageHeader, Field, Sheet, Empty } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { PhotoUpload } from "../components/ui/PhotoUpload";
import { useContacts } from "../components/managers/ContactsManager";
import { speak } from "../lib/tts";
import { useRows, VoiceClip, PrivateAudio } from "./shared";
interface Person {
  id: string;
  name: string;
  relation: string;
  photo_urls: string[];
  voice_url: string;
  note: string;
  birthday: string;
  contact_id: string;
}
export default function Gallery({
  userId,
  canEdit = true,
}: {
  userId?: string;
  canEdit?: boolean;
}) {
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast(),
    settings = useOptionalUserSettings();
  const uid = userId || profile!.id;
  const { rows, reload, error } = useRows<Person>("gallery_people", uid);
  const { contacts } = useContacts(uid);
  const [edit, setEdit] = useState<Partial<Person> | null>(null),
    [selected, setSelected] = useState<Person | null>(null),
    [slide, setSlide] = useState(0),
    [game, setGame] = useState(false),
    [answer, setAnswer] = useState(""),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit?.name?.trim()) return;
    setBusy(true);
    const r = edit.id
      ? await supabase.from("gallery_people").update(edit).eq("id", edit.id)
      : await supabase.from("gallery_people").insert({ ...edit, user_id: uid });
    setBusy(false);
    if (r.error) toast(r.error.message, "error");
    else {
      setEdit(null);
      void reload();
    }
  };
  const person = rows[index % Math.max(1, rows.length)];
  return (
    <div className="grid gap-4">
      <PageHeader title={t("galleryTitle")} icon="🖼️" />
      {error && <p role="alert">{error}</p>}
      {canEdit && (
        <BigButton
          label={t("add")}
          onClick={() =>
            setEdit({
              name: "",
              relation: "",
              photo_urls: [],
              voice_url: "",
              note: "",
            })
          }
        />
      )}
      {(userId ||
        settings
          ?.features("family_gallery")
          .some((f) => f.key === "memory_game")) &&
        rows.length >= 3 && (
          <BigButton
            variant="soft"
            label={t("memoryGame")}
            onClick={() => setGame(!game)}
          />
        )}
      {game && person && (
        <section className="card p-5 grid gap-3">
          <h2>{t("galleryTitle")}</h2>
          <img
            src={person.photo_urls[0] || "/icon.svg"}
            alt={t("galleryTitle")}
            className="w-full h-60 object-contain rounded-3xl"
          />
          {[person, ...rows.filter((p) => p.id !== person.id).slice(0, 2)]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <BigButton
                variant="soft"
                key={p.id}
                label={p.name}
                onClick={() =>
                  setAnswer(
                    p.id === person.id ? t("memoryGood") : t("tryAgainGentle"),
                  )
                }
              />
            ))}
          <p role="status">{answer}</p>
          <BigButton
            label={t("next")}
            onClick={() => {
              setIndex(index + 1);
              setAnswer("");
            }}
          />
        </section>
      )}
      {!rows.length && <Empty text={t("empty")} />}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((p) => (
          <div key={p.id} className="card p-3">
            <button
              className="w-full text-left"
              onClick={() => {
                setSelected(p);
                setSlide(0);
                speak(
                  t("gallerySpeak", { relation: p.relation, name: p.name }),
                  { force: true },
                );
              }}
            >
              <img
                src={p.photo_urls[0] || "/icon.svg"}
                alt={p.name}
                className="w-full aspect-square object-cover rounded-2xl"
              />
              <strong className="block text-xl mt-2">{p.name}</strong>
              <span>{p.relation}</span>
            </button>
            {canEdit && (
              <button
                className="min-h-12 text-primary"
                onClick={() => setEdit(p)}
              >
                ✏️ {t("edit")}
              </button>
            )}
          </div>
        ))}
      </div>
      {selected && (
        <Sheet open title={selected.name} onClose={() => setSelected(null)}>
          <img
            src={selected.photo_urls[slide] || "/icon.svg"}
            alt={selected.name}
            className="w-full max-h-[50vh] object-contain rounded-3xl"
          />
          {selected.photo_urls.length > 1 && (
            <BigButton
              variant="soft"
              label={t("nextPhoto")}
              onClick={() => setSlide((slide + 1) % selected.photo_urls.length)}
            />
          )}
          <h2 className="text-2xl font-bold">
            {selected.name} · {selected.relation}
          </h2>
          <p>{selected.note}</p>
          <BigButton
            label={t("readAloud")}
            onClick={() =>
              speak(
                t("gallerySpeak", {
                  name: selected.name,
                  relation: selected.relation,
                }) +
                  ". " +
                  (selected.note || ""),
                { force: true },
              )
            }
          />
          {selected.voice_url &&
            (userId ||
              settings
                ?.features("family_gallery")
                .some((f) => f.key === "gallery_voice")) && (
              <PrivateAudio path={selected.voice_url} />
            )}
          {contacts?.find((c) => c.id === selected.contact_id) && (
            <BigButton
              label={t("call")}
              href={`tel:${contacts.find((c) => c.id === selected.contact_id)!.phone}`}
            />
          )}
        </Sheet>
      )}
      {edit && (
        <Sheet open title={t("edit")} onClose={() => setEdit(null)}>
          <div className="grid gap-3">
            <PhotoUpload
              value={edit.photo_urls || []}
              onChange={(v) => setEdit({ ...edit, photo_urls: v })}
              folder="gallery"
              max={8}
            />
            {(["name", "relation", "note", "birthday"] as const).map((k) => (
              <Field key={k} label={t(k === "note" ? "relationNote" : k)}>
                <input
                  type={k === "birthday" ? "date" : "text"}
                  value={edit[k] || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, [k]: e.target.value || null })
                  }
                />
              </Field>
            ))}
            <Field label={t("contacts")}>
              <select
                value={edit.contact_id || ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    contact_id: e.target.value || null,
                  } as Partial<Person>)
                }
              >
                <option value="">—</option>
                {contacts?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <VoiceClip
              value={edit.voice_url || ""}
              onChange={(v) => setEdit({ ...edit, voice_url: v })}
            />
            <BigButton label={t("save")} disabled={busy} onClick={save} />
            {edit.id && (
              <BigButton
                variant="danger"
                label={t("delete")}
                onClick={async () => {
                  if (!confirm(t("confirmDelete"))) return;
                  const r = await supabase
                    .from("gallery_people")
                    .delete()
                    .eq("id", edit.id!);
                  if (r.error) toast(r.error.message, "error");
                  else {
                    setEdit(null);
                    void reload();
                  }
                }}
              />
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
