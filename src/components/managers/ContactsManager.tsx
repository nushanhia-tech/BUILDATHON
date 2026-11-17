import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useRealtime } from "../../hooks/useRealtime";
import { useToast } from "../../hooks/useToast";
import { phoneDigits, waLink } from "../../lib/geo";
import { speak } from "../../lib/tts";
import type { Contact, LinkLevel } from "../../lib/types";
import { Badge, Empty, Field, Sheet, Spinner, Toggle } from "../ui/Bits";
import { BigButton } from "../ui/BigButton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PhotoUpload } from "../ui/PhotoUpload";
import { useNames } from "./useNames";
import { Icon } from "../ui/Icon";

export function useContacts(userId: string) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("is_sos", { ascending: false })
      .order("name");
    setContacts((data ?? []) as Contact[]);
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtime("contacts", () => void load(), {
    filter: `user_id=eq.${userId}`,
  });
  return { contacts, reload: load };
}

export function ContactsManager({
  userId,
  actor,
  level = "full",
  highlight,
}: {
  userId: string;
  actor: "user" | "family";
  level?: LinkLevel;
  highlight?: string | null;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const { contacts, reload } = useContacts(userId);
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get("category") || "all");
  const [edit, setEdit] = useState<Partial<Contact> | null>(null);
  const [del, setDel] = useState<Contact | null>(null);
  const names = useNames((contacts ?? []).map((c) => c.added_by));
  const hlRef = useRef<HTMLLIElement>(null);
  const canAdd = actor === "user" || level !== "view";
  const canEdit = actor === "user" || level === "full";

  useEffect(() => {
    if (!highlight || !contacts) return;
    const c = contacts.find((x) => x.id === highlight);
    if (c) {
      hlRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      speak(`${c.name}. ${c.relation ?? ""}`);
    }
  }, [highlight, contacts]);

  if (!contacts) return <Spinner />;
  const pending = contacts.filter((c) => c.needs_confirmation);
  const confirm = async (c: Contact, ok: boolean) => {
    const { error } = ok
      ? await supabase
          .from("contacts")
          .update({ needs_confirmation: false })
          .eq("id", c.id)
      : await supabase.from("contacts").delete().eq("id", c.id);
    if (error) toast(error.message, "error");
    else void reload();
  };
  const remove = async () => {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", del!.id);
    setDel(null);
    if (error) toast(error.message, "error");
    else void reload();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("category")}
      >
        {["all", ...CONTACT_CATEGORIES].map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={category === k}
            className={`min-h-14 rounded-full px-4 ${category === k ? "bg-primary text-on-primary" : "bg-soft"}`}
            onClick={() => setCategory(k)}
          >
            {k === "all"
              ? t("all")
              : `${CATEGORY_ICONS[k]} ${t(`cat_${k}` as never)}`}
          </button>
        ))}
      </div>
      {actor === "user" &&
        pending.map((c) => (
          <div
            key={c.id}
            role="alert"
            className="card p-4 border-l-8 border-warn flex flex-col gap-3"
          >
            <p className="font-bold">
              {t("familyAddedContact", {
                who: names[c.added_by ?? ""] ?? t("someone"),
              })}
            </p>
            <p className="text-[1.2rem]">
              <Icon
                name="user"
                size={18}
                className="inline-block align-[-0.25em] mr-1.5"
              />
              {c.name} · {c.relation} · {c.phone}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <BigButton
                variant="surface"
                label={t("rejectItem")}
                onClick={() => void confirm(c, false)}
              />
              <BigButton
                variant="success"
                label={t("confirmItem")}
                onClick={() => void confirm(c, true)}
              />
            </div>
          </div>
        ))}
      {contacts.filter((c) => actor === "family" || !c.needs_confirmation)
        .length === 0 ? (
        <Empty text={t("noContacts")} icon="📇" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {contacts
            .filter(
              (c) =>
                (actor === "family" || !c.needs_confirmation) &&
                (category === "all" || (c.category || "family") === category),
            )
            .map((c) => (
              <li
                key={c.id}
                ref={c.id === highlight ? hlRef : undefined}
                className={`card p-4 flex flex-col gap-3 ${c.id === highlight ? "ring-4 ring-primary" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt=""
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="w-20 h-20 rounded-full bg-soft grid place-items-center text-3xl font-bold text-primary"
                      aria-hidden="true"
                    >
                      {c.name[0]}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[1.3rem]">{c.name}</p>
                    <p className="text-muted">{c.speciality || c.relation}</p>
                    <p className="text-sm text-muted">{c.notes}</p>
                    <div className="flex flex-wrap gap-1">
                      {c.is_sos && (
                        <Badge tone="danger">
                          <Icon
                            name="sos"
                            size={18}
                            className="inline-block align-[-0.25em] mr-1.5"
                          />
                          SOS
                        </Badge>
                      )}
                      {c.needs_confirmation && (
                        <Badge tone="warn">{t("pendingApprovalBadge")}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <BigButton
                    variant="success"
                    label={t("call")}
                    href={`tel:${phoneDigits(c.phone)}`}
                    ariaLabel={`${t("call")} ${c.name}`}
                  />
                  {c.whatsapp ? (
                    <BigButton
                      variant="soft"
                      label={t("whatsapp")}
                      href={waLink(c.phone, "")}
                      ariaLabel={`WhatsApp ${c.name}`}
                    />
                  ) : (
                    <span />
                  )}
                </div>
                {c.address && (
                  <BigButton
                    variant="soft"
                    label={t("openMap")}
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                  />
                )}
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEdit(c)}
                      className="flex-1 min-h-12 rounded-2xl bg-soft font-semibold"
                    >
                      <Icon
                        name="edit"
                        size={18}
                        className="inline-block align-[-0.25em] mr-1.5"
                      />
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDel(c)}
                      className="flex-1 min-h-12 rounded-2xl bg-soft text-danger font-semibold"
                    >
                      <Icon
                        name="trash"
                        size={18}
                        className="inline-block align-[-0.25em] mr-1.5"
                      />
                      {t("delete")}
                    </button>
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
      {canAdd && (
        <BigButton
          variant="surface"
          label={t("addContact")}
          onClick={() =>
            setEdit({
              name: "",
              phone: "",
              relation: "",
              whatsapp: true,
              is_sos: false,
            })
          }
        />
      )}
      {edit && (
        <ContactForm
          userId={userId}
          initial={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            void reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(del)}
        danger
        body={`${t("confirmDelete")} (${del?.name})`}
        onOk={remove}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}

function ContactForm({
  userId,
  initial,
  onClose,
  onSaved,
}: {
  userId: string;
  initial: Partial<Contact>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [c, setC] = useState(initial);
  const [photo, setPhoto] = useState<string[]>(
    initial.photo_url ? [initial.photo_url] : [],
  );
  const save = async () => {
    if (!c.name?.trim() || !c.phone?.trim()) return;
    const row = {
      category: c.category || "family",
      speciality: c.speciality || null,
      address: c.address || null,
      notes: c.notes || null,
      is_favourite: !!c.is_favourite,
      name: c.name.trim(),
      relation: c.relation?.trim() || null,
      phone: c.phone.trim(),
      whatsapp: c.whatsapp ?? true,
      is_sos: c.is_sos ?? false,
      photo_url: photo[0] ?? null,
    };
    const { error } = initial.id
      ? await supabase.from("contacts").update(row).eq("id", initial.id)
      : await supabase.from("contacts").insert({ ...row, user_id: userId });
    if (error) toast(error.message, "error");
    else {
      toast(t("saved"), "success");
      onSaved();
    }
  };
  return (
    <Sheet
      open
      title={initial.id ? t("edit") : t("addContact")}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <PhotoUpload value={photo} onChange={setPhoto} folder="contacts" />
        <Field label={t("name")}>
          <input
            value={c.name ?? ""}
            onChange={(e) => setC({ ...c, name: e.target.value })}
          />
        </Field>
        <Field label={t("category")}>
          <select
            value={c.category || "family"}
            onChange={(e) => setC({ ...c, category: e.target.value })}
          >
            {CONTACT_CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {t(`cat_${k}` as never)}
              </option>
            ))}
          </select>
        </Field>
        {(["speciality", "address", "notes"] as const).map((k) => (
          <Field key={k} label={t(k)}>
            <input
              value={c[k] || ""}
              onChange={(e) => setC({ ...c, [k]: e.target.value })}
            />
          </Field>
        ))}
        <Toggle
          label={t("favourite")}
          checked={!!c.is_favourite}
          onChange={(v) => setC({ ...c, is_favourite: v })}
        />
        <Field label={t("relation")}>
          <input
            value={c.relation ?? ""}
            onChange={(e) => setC({ ...c, relation: e.target.value })}
          />
        </Field>
        <Field label={t("phone")}>
          <input
            type="tel"
            value={c.phone ?? ""}
            onChange={(e) => setC({ ...c, phone: e.target.value })}
          />
        </Field>
        <Toggle
          label={t("hasWhatsapp")}
          checked={c.whatsapp ?? true}
          onChange={(v) => setC({ ...c, whatsapp: v })}
        />
        <Toggle
          label={t("isSos")}
          checked={c.is_sos ?? false}
          onChange={(v) => setC({ ...c, is_sos: v })}
        />
        <BigButton label={t("save")} icon="💾" onClick={save} />
      </div>
    </Sheet>
  );
}

export const CONTACT_CATEGORIES = [
  "family",
  "doctor",
  "hospital",
  "pharmacy",
  "neighbour",
  "caregiver",
  "volunteer",
  "other",
] as const;
const CATEGORY_ICONS: Record<string, string> = {
  family: "👨‍👩‍👦",
  doctor: "🩺",
  hospital: "🏥",
  pharmacy: "💊",
  neighbour: "🏘️",
  caregiver: "♡",
  volunteer: "🙋",
  other: "📇",
};
